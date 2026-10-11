import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MUTATION_EXPORT_LIMIT,MUTATION_EXPORT_ERROR,mutationExportFixture,mutationExportHeader,mutationExportProjection} from './mutation-export-budget.mjs';

// The application modules and every SQL statement run unchanged in workerd.
// Only this test entry observes native D1/R2 and interleaves an explicitly
// synthetic concurrent writer or an acknowledgment loss after native COMMIT.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap();
 const observe=async(stage,details={})=>{
  const response=await env.MUTATION_EXPORT_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({stage,...details})});
  if(!response.ok)throw Error('Synthetic mutation export observation failed');
  if(response.headers.get('X-Synthetic-Lost-Ack')==='1')throw Error('Synthetic acknowledgment lost after native COMMIT');
 };
 const wrap=(native,sql)=>{const statement={bind(...values){return wrap(native.bind(...values),sql)},async first(...args){const result=await native.first(...args);if(sql.includes(' AS storage_probe'))await observe('storage_probe',{encoding:result?.storage_probe});return result;},all(...args){return native.all(...args)},run(...args){return native.run(...args)},raw(...args){return native.raw(...args)}};statements.set(statement,{native,sql});return statement;};
 const DB={prepare(sql){return wrap(env.DB.prepare(sql),sql)},async batch(rows){
  const commit=statements.get(rows[0]).sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(commit)await observe('commit_before');
  const result=await env.DB.batch(rows.map(row=>statements.get(row).native));
  if(commit)await observe('commit_after',{changes:result[0].meta.changes});
  return result;
 }};
 const BUCKET={async get(...args){await observe('r2_get');return env.BUCKET.get(...args)},async head(...args){await observe('r2_head');return env.BUCKET.head(...args)},async list(...args){await observe('r2_list');return env.BUCKET.list(...args)},async put(key,...args){await observe('r2_put',{key});return env.BUCKET.put(key,...args)},async delete(key){await observe('r2_delete',{key});return env.BUCKET.delete(key)},createMultipartUpload(...args){return env.BUCKET.createMultipartUpload(...args)},resumeMultipartUpload(...args){return env.BUCKET.resumeMultipartUpload(...args)}};
 return withEnv({...env,DB,BUCKET},()=>app.fetch(request,{...env,DB,BUCKET},ctx));
}};
`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const utf8=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const independent=new Set(['customers','articles','notices','leads','companyEvents']);
const withoutEnvelope=({viewer:_,mutationResult:__,...state})=>state;
const publicationPrefix='mutation-publication-';
const ordered=state=>Object.fromEntries(Object.entries(state).map(([key,value])=>[key,Object.hasOwn(mapping,key)?[...value].sort((a,b)=>a.id.localeCompare(b.id)):value]));

export async function assertNativeMutationExportBudget({moduleRoot,coreFilename='core.mjs',serverRoot:providedServerRoot,expectLegacyUnchecked=false,sourceRevision=null,progress=false}={}){
 const started=performance.now(),root=fileURLToPath(new URL('../',import.meta.url)),generated=moduleRoot||root+'work',serverRoot=providedServerRoot||root+'dist/server';
 const stage=(name,details={})=>{const event={stage:name,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(3)),...details};if(typeof progress==='function')progress(event);else if(progress)console.error('Native mutation export progress: '+JSON.stringify(event));};stage('start');
 const core=await import(pathToFileURL(join(generated,coreFilename)).href),ops=await import(pathToFileURL(join(generated,'operations.mjs')).href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>hash(moduleFiles.map(file=>file+'\0'+hash(readFileSync(join(serverRoot,file)))).join('\n')),originalBuiltHash=builtHash();
 const fixtureFiles=[coreFilename,'operations.mjs'],fixtureHashes=()=>Object.fromEntries(fixtureFiles.map(file=>[file,hash(readFileSync(join(generated,file)))])),originalFixtureHashes=fixtureHashes();
 const helperFiles=['runtime-mutation-export-budget.mjs','mutation-export-budget.mjs'],helperHashes=()=>Object.fromEntries(helperFiles.map(file=>[file,hash(readFileSync(root+'tests/'+file))])),originalHelperHashes=helperHashes();
 stage('modules_bound',{builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash});
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-mutation-export-budget-')),at='2026-10-11T20:00:00.000Z',secret='SYNTHETIC PRIVATE MUTATION EXPORT '+randomUUID();
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-mutation-member-'+role,user_id:'synthetic-mutation-user-'+role,email:'synthetic-mutation-'+role+'@example.test',name:role==='admin'?'Fiktiv skribent Å😀 "citat" \\':'Annan fiktiv skribent',role:role==='other'?'admin':role,owner:'',active:1})),actor=accounts[0];
 const actorIdentity={id:actor.user_id,name:actor.name};
 let db,bucket,ready,tables,trace=[],requests=0,loseAck=false,lostAcks=0,interleave=null,races=0,revocations=0,budgetRaces=0,draftRaces=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__mutation_export_budget_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'mutation-export-budget'},r2Buckets:{BUCKET:'mutation-export-budget'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{MUTATION_EXPORT_OBSERVER:async request=>{
  const event=await request.json();trace.push(event);if(interleave)await interleave(event);
  if(event.stage==='commit_after'&&event.changes===1&&loseAck){loseAck=false;lostAcks++;return new Response(null,{status:204,headers:{'X-Synthetic-Lost-Ack':'1'}});}
  return new Response(null,{status:204});
 }}});
 stage('miniflare_constructed');
 const insert=(table,row)=>{const columns=Object.keys(row);return db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind(...columns.map(column=>row[column]));};
 const seedCollections=async(space,state)=>{const q=[];for(const[name,table]of Object.entries(mapping))for(const row of state[name])q.push(insert(table,{id:row.id,space,...(independent.has(name)?{}:{customer_id:row.customerId}),...(name==='orders'?{deal_id:row.dealId}:{}),data:JSON.stringify(row)}));if(q.length)await db.batch(q);};
 // Full raw-table hashes keep large fixtures bounded in memory. Counts and
 // outside/private hashes prove that the sentinels actually remain positive.
 const snapshot=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>{
  const rows=(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results;
  const outside=rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');
  const privateRows=table==='crm_drafts'?rows.filter(row=>!row.id.startsWith(publicationPrefix)):rows;
  return[table,{count:rows.length,sha256:hash(JSON.stringify(rows)),outsideSha256:hash(JSON.stringify(outside)),privateSha256:hash(JSON.stringify(privateRows))}];
 }))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async row=>{const object=await bucket.get(row.key);return[row.key,{size:object.size,sha256:hash(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const preserve=(before,after,{draft=false}={})=>{
  for(const table of tables){assert.equal(after.tables[table].outsideSha256,before.tables[table].outsideSha256,table+' outside/account sentinel');if(table==='crm_drafts'&&draft)assert.equal(after.tables[table].privateSha256,before.tables[table].privateSha256,table+' unrelated raw private sentinel');else if(['crm_members','crm_drafts','crm_files',...tables.filter(name=>name.startsWith('outlook_'))].includes(table))assert.deepEqual(after.tables[table],before.tables[table],table+' private/account/file sentinel');}
  assert.deepEqual(after.r2,before.r2,'All native R2 bytes and metadata survive');
 };
 const seed=async sized=>{
  for(const table of ['crm_mutations','crm_events','crm_meetings','crm_tasks','crm_orders','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events'])await db.prepare('DELETE FROM '+table+' WHERE space=?').bind('demo').run();
  await db.prepare('DELETE FROM crm_drafts WHERE space=? AND id LIKE ?').bind('demo',publicationPrefix+'%').run();
  await db.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').bind(sized.state.version,'SYNTHETIC-UNCHANGED',JSON.stringify(sized.state.settings),'demo').run();await seedCollections('demo',sized.state);
 };
 const call=async(path,{body,account=actor,lost=false,gate=null}={})=>{
  assert.equal(interleave,null);trace=[];loseAck=lost;interleave=gate;requests++;const url=new URL(path,ready);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email,'Accept-Encoding':'identity',...(body===undefined?{}:{'Content-Type':'application/json',Origin:url.origin})},...(body===undefined?{}:{body:JSON.stringify(body)})}),text=await response.text();let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,headers:response.headers,trace:[...trace]};}finally{loseAck=false;interleave=null;}
 };
 const post=(type,data,{id=randomUUID(),version=9,expectedRecord,account=actor,lost=false,gate=null}={})=>call('/api/crm',{body:{space:'demo',version,requestId:id,type,data,...(expectedRecord?{expectedRecord}:{})},account,lost,gate});
 const fixture=(target,options={})=>mutationExportFixture(core,{target,actor:actorIdentity,space:'demo',...options});
 const noR2=events=>assert.equal(events.filter(event=>event.stage.startsWith('r2_')).length,0,'Ordinary mutation never reads, stages or deletes R2');
 const denied=async(sized,type=sized.type||'note',options={})=>{
  await seed(sized);const before=await snapshot(),response=await post(type,sized.data,{expectedRecord:sized.expectedRecord,...options});
  assert.equal(response.status,400,response.data?.error);assert.deepEqual(response.data,{error:MUTATION_EXPORT_ERROR});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.trace.length,0,'Byte overflow stops before probe, native transaction and R2');assert.deepEqual(await snapshot(),before,'Overflow preserves every raw byte/count in all 18 tables and R2');return response;
 };
 const saved=async(sized,type,response,id,before,{draft=false}={})=>{
  assert.equal(response.status,200,response.data?.error);assert.equal(response.headers.get('cache-control'),'no-store');noR2(response.trace);assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);
  const state=withoutEnvelope(response.data),oldEventIds=new Set(sized.state.events.map(row=>row.id)),events=state.events.filter(row=>!oldEventIds.has(row.id));assert.equal(events.length,type==='customer'?2:1);
  for(const event of events){assert.deepEqual(event.actor,actorIdentity);assert.match(event.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(event.at).toISOString(),event.at);assert.equal(event.at.length,24);}
  const projection=mutationExportProjection(core,sized.state,{type,data:sized.data,space:'demo',actor:actorIdentity,timestamp:events[0].at}),expected=projection.state;
  const expectedAdded=expected.events.filter(row=>!oldEventIds.has(row.id));for(let i=0;i<expectedAdded.length;i++)expectedAdded[i].id=events.find(row=>row.text===expectedAdded[i].text)?.id||events[i].id;
  const oldTaskIds=new Set(sized.state.tasks.map(row=>row.id)),addedTasks=state.tasks.filter(row=>!oldTaskIds.has(row.id)),expectedTasks=expected.tasks.filter(row=>!oldTaskIds.has(row.id));assert.equal(addedTasks.length,expectedTasks.length);for(let i=0;i<expectedTasks.length;i++)expectedTasks[i].id=addedTasks[i].id;
  assert.deepEqual(ordered(state),ordered(expected),'Native final state matches independent manual projection, preserving all original history and Unicode');assert.equal(utf8(mutationExportHeader(state,{space:'demo'})),sized.projection.bytes,'Native committed header matches independent final-version UTF-8 oracle');
  const after=await snapshot();preserve(before,after,{draft});
  const receipts=(await db.prepare('SELECT * FROM crm_mutations WHERE space=?').bind('demo').all()).results;assert.equal(receipts.length,1);assert.equal(receipts[0].id,id);assert.equal(receipts[0].user_id,actor.user_id);assert.equal(receipts[0].request_hash,hash(JSON.stringify({type,data:sized.data})));assert.deepEqual(JSON.parse(receipts[0].result_json),response.data.mutationResult,'Native ledger preserves actor, input hash and actual result IDs');assert.ok(events.some(event=>event.id===response.data.mutationResult.eventId));
  if(draft){const row=await db.prepare('SELECT archived,revision FROM crm_drafts WHERE space=? AND user_id=? AND id=?').bind('demo',actor.user_id,sized.data.draft.id).first();assert.deepEqual(row,{archived:1,revision:sized.data.draft.revision+1});}
  return{state,after};
 };
 const copies=async(state,expectedBytes)=>{
  const before=await snapshot(),data=await call('/api/crm?space=demo');assert.equal(data.status,200);assert.deepEqual(withoutEnvelope(data.data),state);
  const json=await call('/api/crm/backup?space=demo');assert.equal(json.status,200,json.data?.error);assert.equal(json.data.format,'magnussons-crm-backup-1');assert.deepEqual(json.data.files,[]);assert.deepEqual(json.data.state,state);
  const stream=await call('/api/crm/backup?space=demo&format=stream');assert.equal(stream.status,200);assert.equal(stream.headers.get('cache-control'),'no-store');const lines=stream.text.trimEnd().split('\n'),header=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(lines.length,2);assert.equal(header.type,'header');assert.equal(header.format,'magnussons-crm-backup-2');assert.deepEqual(header.state,state);assert.deepEqual(header.files,[]);assert.equal(Buffer.byteLength(lines[0]),expectedBytes);assert.deepEqual(end,{type:'end',files:0,bytes:0,sha256:hash(lines[0])});assert.equal(Number(stream.headers.get('Content-Length')),Buffer.byteLength(stream.text));
  for(const response of [data,json,stream])assert.ok(!response.text.includes(secret),'Private raw drafts and Outlook secrets never enter public CRM/export response');assert.deepEqual(await snapshot(),before,'Genuine data/JSON/native NDJSON exports preserve all raw rows and R2');
 };
 const draft=async(sized,type)=>{
  const id=publicationPrefix+randomUUID(),kind=type==='customer_note'?'note':'followup',context=type==='customer_note'?sized.state.customers[0].id:sized.state.tasks[0].id;
  const response=await call('/api/crm/drafts',{body:{space:'demo',id,kind,context,revision:0,requestId:randomUUID(),title:'Fiktivt privat införandeunderlag',data:{values:structuredClone(sized.data),privateText:secret}}});assert.equal(response.status,200,response.data?.error);assert.equal(response.data.archived,false);assert.equal(response.data.revision,1);sized.data.draft={id,revision:response.data.revision};
  const otherRead=await call('/api/crm/drafts?space=demo&id='+id,{account:accounts[1]});assert.equal(otherRead.status,200);assert.deepEqual(otherRead.data,[]);return response.data;
 };
 const report={nativeMutationExportBudget:true,legacyUnchecked:expectLegacyUnchecked,sourceRevision,headerByteLimit:MUTATION_EXPORT_LIMIT,requests:0,rawTables:0,builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash,cases:[],denied:0,exactAccepted:0,lostAcknowledgments:0,casRaces:0,actorRevocations:0,budgetRaces:0,draftRaces:0,positivePrivateAccountsOutlookAndR2:true,hostedProductionWriteVerified:false,independentPersonnelAcceptance:false};
 try{
  stage('before_d1_binding');db=await mf.getD1Database('DB');stage('after_d1_binding');bucket=await mf.getR2Bucket('BUCKET');stage('after_r2_binding');ready=await mf.ready;stage('listener_ready');
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  stage('migrations_done');
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);report.rawTables=tables.length;
  const outside=core.emptyState(),owner=outside.settings.owners[0],customerId='synthetic-outside-customer',dealId='synthetic-outside-deal';
  outside.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv bevarad kund',owner})];outside.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Fiktiv bevarad affär'})];
  outside.orders=[core.OrderSchema.parse({id:'synthetic-outside-order',customerId,dealId,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat underlag'})];outside.tasks=[core.TaskSchema.parse({id:'synthetic-outside-task',customerId,dealId,owner,title:'Fiktiv bevarad uppgift',due:'2026-11-01'})];outside.meetings=[core.MeetingSchema.parse({id:'synthetic-outside-meeting',customerId,owner,title:'Fiktivt bevarat möte',date:'2026-11-01',time:'10:00',duration:30})];outside.events=[{id:'synthetic-outside-event',customerId,dealId:'',text:'Fiktiv bevarad historik',at,kind:'note'}];outside.articles=[ops.ArticleSchema.parse({id:'synthetic-outside-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];outside.notices=[ops.NoticeSchema.parse({id:'synthetic-outside-notice',title:'Fiktiv notis',audience:'team',at})];outside.leads=[ops.LeadSchema.parse({id:'synthetic-outside-lead',name:'Fiktivt prospekt',source:'synthetic'})];outside.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-outside-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const space of ['live','demo'])await insert('crm_spaces',{id:space,version:9,write_token:'SYNTHETIC-UNCHANGED',settings:JSON.stringify(outside.settings)}).run();await seedCollections('live',outside);
  for(const account of accounts)await insert('crm_members',account).run();
  for(const space of ['live','demo'])for(const account of accounts.slice(0,2))await insert('crm_drafts',{space,user_id:account.user_id,id:'mutation-private-'+account.id,kind:'note',context:customerId,revision:3,request_id:randomUUID(),title:'Fiktivt privat utkast',data:' {"text":"'+secret+'"}\n',archived:0,updated_at:at}).run();
  await insert('crm_mutations',{space:'live',id:randomUUID(),result_json:' {"sentinel":"private"}\n',user_id:actor.user_id,request_hash:'0'.repeat(64)}).run();
  for(const account of accounts.slice(0,2)){await insert('outlook_connections',{user_id:account.user_id,microsoft_id:'synthetic-ms-'+account.id,email:account.email,tokens:secret,last_sync:at,status:'error',sync_note:secret,lock_until:0,revision:7}).run();for(const shared of [0,1])await insert('outlook_items',{id:'mutation-export-mail-'+account.id+'-'+shared,user_id:account.user_id,kind:'mail',data:' {"body":"'+secret+'"}\n',customer_id:customerId,deal_id:'',shared,happened_at:at,seen_at:at}).run();await insert('outlook_oauth_states',{hash:'mutation-export-oauth-'+account.id,user_id:account.user_id,verifier:secret,expires:1999999999000}).run();}
  const file={id:'synthetic-outside-file',name:'synthetic-private.bin',kind:'document',version:'v1',size:5,at,uploadedBy:actor.user_id};await bucket.put('mutation-export-source-object',new Uint8Array([0,1,255,13,10]),{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'outside-data-export'}});await insert('crm_files',{id:file.id,space:'live',customer_id:customerId,object_key:'mutation-export-source-object',data:JSON.stringify(file)}).run();await bucket.put('mutation-export-private-r2',new TextEncoder().encode(secret+'\n\0 Å😀'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private-sentinel'}});
  const baseline=await snapshot();for(const table of tables)assert.ok(baseline.tables[table].count>0,'Positive native sentinel in '+table);assert.equal(Object.keys(baseline.r2).length,2);
  stage('positive_sentinels',{rawTables:tables.length,r2Objects:Object.keys(baseline.r2).length});
  if(expectLegacyUnchecked){
   const sized=fixture(MUTATION_EXPORT_LIMIT+1),beforeBytes=utf8(mutationExportHeader(sized.state,{space:'demo'}));assert.ok(beforeBytes<MUTATION_EXPORT_LIMIT);await seed(sized);stage('baseline_seeded',{beforeHeaderBytes:beforeBytes});const before=await snapshot();stage('before_baseline_stream');const exportable=await call('/api/crm/backup?space=demo&format=stream');stage('after_baseline_stream',{status:exportable.status});assert.equal(exportable.status,200);assert.equal(Buffer.byteLength(exportable.text.split('\n')[0]),beforeBytes);assert.deepEqual(JSON.parse(exportable.text.split('\n')[0]).state,sized.state);assert.deepEqual(await snapshot(),before);const id=randomUUID(),response=await post('note',sized.data,{id}),result=await saved(sized,'note',response,id,before);stage('baseline_note_committed',{status:response.status});
   const exported=await call('/api/crm/backup?space=demo&format=stream');assert.equal(exported.status,400);assert.deepEqual(exported.data,{error:'CRM-data och filförteckning får vara högst 16 MB.'});assert.deepEqual(await snapshot(),result.after);
   report.cases.push({type:'note',status:200,beforeHeaderBytes:beforeBytes,beforeBackupStatus:200,committedHeaderBytes:sized.projection.bytes,persistedEvents:result.state.events.length,reexportStatus:400,reexportError:exported.data.error});
  }else{
   for(const layout of ['cjk','emoji']){
    const over=fixture(MUTATION_EXPORT_LIMIT+1,{layout});await denied(over);report.denied++;report.cases.push({type:'note',layout,status:400,projectedHeaderBytes:over.projection.bytes,beforeCommit:true});
    const exact=fixture(MUTATION_EXPORT_LIMIT,{layout});await seed(exact);const before=await snapshot(),id=randomUUID(),response=await post('note',exact.data,{id}),result=await saved(exact,'note',response,id,before);await copies(result.state,MUTATION_EXPORT_LIMIT);
    const replay=await post('note',exact.data,{id,version:0});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);assert.deepEqual(replay.data,response.data);assert.deepEqual(await snapshot(),result.after);report.exactAccepted++;
    const second=await post('note',{...exact.data,text:'Fiktiv senare anteckning'},{version:result.state.version});assert.equal(second.status,400);assert.deepEqual(second.data,{error:MUTATION_EXPORT_ERROR});assert.equal(second.trace.length,0);assert.deepEqual(await snapshot(),result.after);report.denied++;
    report.cases.push({type:'note',layout,status:200,committedHeaderBytes:MUTATION_EXPORT_LIMIT,threeExportFormatsValid:true,exactReplayNoWrites:true,laterGrowthDenied:true});
   }
   for(const type of ['customer_note','follow_up']){
    const over=fixture(MUTATION_EXPORT_LIMIT+1,{type});await seed(over);const privateRecord=await draft(over,type),before=await snapshot(),rejected=await post(type,over.data);assert.equal(rejected.status,400);assert.deepEqual(rejected.data,{error:MUTATION_EXPORT_ERROR});assert.equal(rejected.trace.length,0);assert.deepEqual(await snapshot(),before);const privateRead=await call('/api/crm/drafts?space=demo&id='+privateRecord.id);assert.equal(privateRead.status,200);assert.deepEqual(privateRead.data,[privateRecord]);assert.deepEqual(await snapshot(),before);report.denied++;
    const exact=fixture(MUTATION_EXPORT_LIMIT,{type});await seed(exact);await draft(exact,type);const exactBefore=await snapshot(),id=randomUUID(),response=await post(type,exact.data,{id}),result=await saved(exact,type,response,id,exactBefore,{draft:true});await copies(result.state,MUTATION_EXPORT_LIMIT);const replay=await post(type,exact.data,{id,version:0});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);assert.deepEqual(replay.data,response.data);assert.deepEqual(await snapshot(),result.after);report.exactAccepted++;
    report.cases.push({type,status:400,projectedHeaderBytes:MUTATION_EXPORT_LIMIT+1,privateUnarchivedDraftPreserved:true,exactStatus:200,committedHeaderBytes:MUTATION_EXPORT_LIMIT,privateDraftAndSharedPublicationAtomic:true,exactReplayNoWrites:true});
   }
   const edited=fixture(MUTATION_EXPORT_LIMIT+1,{type:'customer'});await denied(edited,'customer');report.denied++;report.cases.push({type:'customer',status:400,generatedAudits:2,projectedHeaderBytes:edited.projection.bytes,beforeCommit:true});
   const budgetEntry=fixture(MUTATION_EXPORT_LIMIT,{type:'customer_note'});await seed(budgetEntry);await draft(budgetEntry,'customer_note');let expectedBudgetRace;
   const budgetChanged=await post('customer_note',budgetEntry.data,{gate:async event=>{if(event.stage==='commit_before'&&!budgetRaces){budgetRaces++;const shortest=budgetEntry.state.events.reduce((left,right)=>left.text.length<=right.text.length?left:right),grown=structuredClone(shortest);assert.ok(grown.text.length<50000);grown.text+='H';await db.prepare('UPDATE crm_events SET data=? WHERE space=? AND id=?').bind(JSON.stringify(grown),'demo',grown.id).run();await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();expectedBudgetRace=await snapshot();}}});
   assert.equal(budgetChanged.status,400);assert.deepEqual(budgetChanged.data,{error:MUTATION_EXPORT_ERROR});assert.equal(budgetRaces,1);assert.deepEqual(budgetChanged.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);noR2(budgetChanged.trace);assert.deepEqual(await snapshot(),expectedBudgetRace,'Safe retry measures the new final revision and competing growth before a second commit; private draft remains unchanged');report.denied++;report.safeRetryRemeasuresChangedBudget=true;
   const draftEntry=fixture(20000,{type:'customer_note'});await seed(draftEntry);await draft(draftEntry,'customer_note');let expectedDraftRace;
   const draftChanged=await post('customer_note',draftEntry.data,{gate:async event=>{if(event.stage==='commit_before'&&!draftRaces){draftRaces++;await db.prepare('UPDATE crm_drafts SET revision=revision+1 WHERE space=? AND user_id=? AND id=?').bind('demo',actor.user_id,draftEntry.data.draft.id).run();expectedDraftRace=await snapshot();}}});
   assert.equal(draftChanged.status,409);assert.equal(draftRaces,1);assert.deepEqual(draftChanged.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);noR2(draftChanged.trace);assert.deepEqual(await snapshot(),expectedDraftRace,'A private draft revision changed before COMMIT prevents the shared write, event, successor task, archive and receipt');report.privateDraftCommitRaceDenied=true;
   const small=fixture(20000);await seed(small);const before=await snapshot(),id=randomUUID(),lost=await post('note',small.data,{id,lost:true});assert.equal(lost.status,503);assert.equal(lostAcks,1);assert.equal(lost.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);noR2(lost.trace);const committed=await snapshot();preserve(before,committed);const replay=await post('note',small.data,{id,version:0});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);const state=withoutEnvelope(replay.data);assert.equal(state.version,10);assert.equal(state.events.length,small.state.events.length+1);assert.deepEqual(await snapshot(),committed);report.smallLostAcknowledgmentThenReplay=true;
   for(const options of [{account:accounts[1]},{data:{...small.data,text:'Fiktiv annan avsikt'}}]){const result=await post('note',options.data||small.data,{id,version:0,account:options.account||actor});assert.equal(result.status,409);assert.equal(result.trace.length,0);assert.deepEqual(await snapshot(),committed);}
   for(const account of accounts.filter(row=>['reader','production','print','warehouse'].includes(row.role))){const beforeRole=await snapshot(),result=await post('note',small.data,{account,version:10});assert.equal(result.status,403);assert.equal(result.trace.length,0);assert.deepEqual(await snapshot(),beforeRole);}report.actualReceiptActorHashResultAndRole=true;
   // Keep the actual completed lost-ACK receipt and event. A synthetic
   // concurrent writer grows the persisted header above the new first-write
   // budget; exact replay must still return that previously committed result.
   const padding=fixture(MUTATION_EXPORT_LIMIT),shortest=padding.state.events.reduce((left,right)=>left.text.length<=right.text.length?left:right);assert.ok(shortest.text.length<50000);shortest.text+='H';
   await db.batch(padding.state.events.map(row=>db.prepare('INSERT INTO crm_events(id,space,customer_id,data)VALUES(?,?,?,?) ON CONFLICT(space,id) DO UPDATE SET data=excluded.data').bind(row.id,'demo',row.customerId,JSON.stringify(row))));await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();
   const grown=await call('/api/crm?space=demo');assert.equal(grown.status,200);const grownHeaderBytes=utf8(mutationExportHeader(withoutEnvelope(grown.data),{space:'demo'}));assert.ok(grownHeaderBytes>MUTATION_EXPORT_LIMIT);const historicalBefore=await snapshot(),historical=await post('note',small.data,{id,version:0});assert.equal(historical.status,200);assert.deepEqual(historical.data.mutationResult,replay.data.mutationResult);assert.equal(historical.trace.length,0);assert.deepEqual(await snapshot(),historicalBefore);report.completedOversizedReplay={status:200,persistedHeaderBytes:grownHeaderBytes,syntheticConcurrentGrowth:true,originalNativeReceiptPreserved:true};
   await seed(small);let expectedRace;const raced=await post('note',small.data,{gate:async event=>{if(event.stage==='commit_before'){races++;await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();expectedRace=await snapshot();}}});assert.equal(raced.status,409);assert.equal(races,1);assert.deepEqual(raced.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);assert.deepEqual(await snapshot(),expectedRace);report.casZeroPreservesAllRows=true;
   await seed(small);let expectedRevocation;const revoked=await post('note',small.data,{gate:async event=>{if(event.stage==='commit_before'){revocations++;await db.prepare('UPDATE crm_members SET active=0 WHERE id=?').bind(actor.id).run();expectedRevocation=await snapshot();}}});assert.equal(revoked.status,403);assert.equal(revocations,1);assert.deepEqual(revoked.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);assert.deepEqual(await snapshot(),expectedRevocation);report.nativeCommitActorRevocationDenied=true;
  }
  assert.equal(builtHash(),originalBuiltHash,'Every actual built application module remains byte-for-byte unchanged');assert.deepEqual(fixtureHashes(),originalFixtureHashes);assert.deepEqual(helperHashes(),originalHelperHashes);report.fixtureModulesSha256=originalFixtureHashes;report.helperModulesSha256=originalHelperHashes;report.requests=requests;report.lostAcknowledgments=lostAcks;report.casRaces=races;report.actorRevocations=revocations;report.budgetRaces=budgetRaces;report.draftRaces=draftRaces;report.elapsedSeconds=Number(((performance.now()-started)/1000).toFixed(3));return report;
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Native harness leaves the actual built modules intact even on failure');assert.deepEqual(fixtureHashes(),originalFixtureHashes);assert.deepEqual(helperHashes(),originalHelperHashes);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native ordinary mutation export budget: '+JSON.stringify(await assertNativeMutationExportBudget()));
