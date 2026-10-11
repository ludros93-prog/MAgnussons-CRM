import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join,dirname,relative,resolve,sep} from 'node:path';
import ts from 'typescript';
import {mutationExportFixture,mutationExportAction,mutationExportHeader,mutationExportProjection} from './mutation-export-budget.mjs';

// All application modules and SQL run unchanged in an actual workerd HTTP
// listener with native D1/R2. Only this isolated test entry observes COMMIT,
// injects an independent synthetic writer, or loses the ACK after real COMMIT.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap();
 const observe=async(stage,details={})=>{
  const response=await env.MUTATION_HISTORY_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({stage,...details})});
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

const HISTORY_LIMIT=50000;
const HISTORY_ERROR='Ändringen skulle göra CRM-historiken för stor för dataexport (högst 50 000 händelser). Inga uppgifter från ändringen har sparats. Bevara ditt underlag och kontakta administratören.';

async function runNativeMutationHistoryExportBudget({moduleRoot,coreFilename='core.mjs',serverRoot:providedServerRoot,expectLegacyUnchecked=false,sourceRevision=null,progress=false}={}){
 const started=performance.now(),root=fileURLToPath(new URL('../',import.meta.url)),generated=moduleRoot||root+'work',serverRoot=providedServerRoot||root+'dist/server';
 const stage=(name,details={})=>{const event={stage:name,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(3)),...details};if(typeof progress==='function')progress(event);else if(progress)console.error('Native mutation history progress: '+JSON.stringify(event));};stage('start');
 const core=await import(pathToFileURL(join(generated,coreFilename)).href),ops=await import(pathToFileURL(join(generated,'operations.mjs')).href),restoreCore=await import(pathToFileURL(join(generated,'crm-restore.mjs')).href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>hash(moduleFiles.map(file=>file+'\0'+hash(readFileSync(join(serverRoot,file)))).join('\n')),originalBuiltHash=builtHash();
 const fixtureFiles=[coreFilename,'operations.mjs','crm-restore.mjs'],fixtureHashes=()=>Object.fromEntries(fixtureFiles.map(file=>[file,hash(readFileSync(join(generated,file)))])),originalFixtureHashes=fixtureHashes();
 const helperFiles=['runtime-mutation-history-export-budget.mjs','mutation-export-budget.mjs'],helperHashes=()=>Object.fromEntries(helperFiles.map(file=>[file,hash(readFileSync(root+'tests/'+file))])),originalHelperHashes=helperHashes();
 stage('modules_bound',{builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash});
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-mutation-history-export-budget-')),at='2026-10-11T20:00:00.000Z',secret='SYNTHETIC PRIVATE MUTATION EXPORT '+randomUUID();
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-mutation-member-'+role,user_id:'synthetic-mutation-user-'+role,email:'synthetic-mutation-'+role+'@example.test',name:role==='admin'?'Fiktiv skribent Å😀 "citat" \\':'Annan fiktiv skribent',role:role==='other'?'admin':role,owner:'',active:1})),actor=accounts[0];
 const actorIdentity={id:actor.user_id,name:actor.name};
 let db,bucket,ready,tables,trace=[],requests=0,loseAck=false,lostAcks=0,interleave=null,races=0,revocations=0,historyRaces=0,draftRaces=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__mutation_export_budget_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'mutation-history-export-budget'},r2Buckets:{BUCKET:'mutation-history-export-budget'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{MUTATION_HISTORY_OBSERVER:async request=>{
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

 const fixture=(eventCount=50000,type='note')=>{
  const sized=mutationExportFixture(core,{target:20000,type,actor:actorIdentity,space:'demo'});
  sized.type=type;sized.state.events=Array.from({length:eventCount},(_,n)=>({id:'synthetic-history-'+String(n).padStart(5,'0'),customerId:sized.state.customers[0].id,dealId:'',text:'Fiktiv historik',at,kind:'note'}));
  if(eventCount){sized.state.events[0].text='Fiktiv bevarad historik Å😀 "citat" \\ rad\n\t\u0000';sized.state.events[0].actor={id:'synthetic-original-actor',name:'Fiktiv ursprunglig kollega Å😀'};sized.state.events[0].note={title:'Fiktivt ursprungligt underlag',meetingDate:'',sourceFiles:['syntetiskt-underlag.txt']};}
  sized.data=mutationExportAction(core,sized.state,type);sized.projection=mutationExportProjection(core,sized.state,{type,data:sized.data,actor:actorIdentity,space:'demo'});return sized;
 };
 const seed=async sized=>{
  for(const table of ['crm_mutations','crm_events','crm_meetings','crm_tasks','crm_orders','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events'])await db.prepare('DELETE FROM '+table+' WHERE space=?').bind('demo').run();
  await db.prepare('DELETE FROM crm_drafts WHERE space=? AND id LIKE ?').bind('demo',publicationPrefix+'%').run();
  await db.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').bind(sized.state.version,'SYNTHETIC-UNCHANGED',JSON.stringify(sized.state.settings),'demo').run();
  await db.prepare('UPDATE crm_members SET active=1 WHERE id=?').bind(actor.id).run();
  await seedCollections('demo',{...sized.state,events:[]});
  const count=sized.state.events.length;
  if(count){await db.prepare("WITH RECURSIVE sequence(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM sequence WHERE n<?) INSERT INTO crm_events(space,id,customer_id,data) SELECT ?, 'synthetic-history-'||printf('%05d',n), ?, json_object('id','synthetic-history-'||printf('%05d',n),'customerId',?,'dealId','','text','Fiktiv historik','at',?,'kind','note') FROM sequence").bind(count-1,'demo',sized.state.customers[0].id,sized.state.customers[0].id,at).run();
   const first=sized.state.events[0];await db.prepare('UPDATE crm_events SET data=? WHERE space=? AND id=?').bind(JSON.stringify(first),'demo',first.id).run();}
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM crm_events WHERE space=?').bind('demo').first()).n,count);
 };
 const call=async(path,{body,account=actor,lost=false,gate=null}={})=>{
  assert.equal(interleave,null);trace=[];loseAck=lost;interleave=gate;requests++;const url=new URL(path,ready);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email,'Accept-Encoding':'identity',...(body===undefined?{}:{'Content-Type':'application/json',Origin:url.origin})},...(body===undefined?{}:{body:JSON.stringify(body)})}),text=await response.text();let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,headers:response.headers,trace:[...trace]};}finally{loseAck=false;interleave=null;}
 };
 const post=(sized,{id=randomUUID(),version=sized.state.version,account=actor,lost=false,gate=null,data=sized.data}={})=>call('/api/crm',{body:{space:'demo',version,requestId:id,type:sized.type,data,...(sized.expectedRecord?{expectedRecord:sized.expectedRecord}:{})},account,lost,gate});
 const noR2=events=>assert.equal(events.filter(event=>event.stage.startsWith('r2_')).length,0,'Ordinary mutation never reads, stages or deletes R2');
 const deny=async(sized,{alreadySeeded=false}={})=>{
  if(!alreadySeeded)await seed(sized);const before=await snapshot(),response=await post(sized);
  assert.equal(response.status,400,response.data?.error);assert.deepEqual(response.data,{error:HISTORY_ERROR});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.trace.length,0,'Count overflow stops before encoding probe, COMMIT and R2');assert.deepEqual(await snapshot(),before,'All 18 raw native tables and R2 remain byte/count-identical');
  report.denied++;report.cases.push({type:sized.type,sourceEvents:sized.state.events.length,finalProjectedEvents:sized.projection.state.events.length,status:400,beforeProbeCommitAndR2:true});return response;
 };
 const draft=async sized=>{
  const type=sized.type,id=publicationPrefix+randomUUID(),kind=type==='customer_note'?'note':'followup',context=type==='customer_note'?sized.state.customers[0].id:sized.state.tasks[0].id;
  const response=await call('/api/crm/drafts',{body:{space:'demo',id,kind,context,revision:0,requestId:randomUUID(),title:'Fiktivt privat införandeunderlag',data:{values:structuredClone(sized.data),privateText:secret}}});assert.equal(response.status,200,response.data?.error);assert.equal(response.data.archived,false);assert.equal(response.data.revision,1);sized.data.draft={id,revision:response.data.revision};
  const otherRead=await call('/api/crm/drafts?space=demo&id='+id,{account:accounts[1]});assert.equal(otherRead.status,200);assert.deepEqual(otherRead.data,[]);return response.data;
 };
 const saved=async(sized,response,id,before,{draft=false,commitTrace=response.trace}={})=>{
  assert.equal(response.status,200,response.data?.error);assert.equal(response.headers.get('cache-control'),'no-store');noR2(commitTrace);assert.equal(commitTrace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);
  const state=withoutEnvelope(response.data),oldIds=new Set(sized.state.events.map(row=>row.id)),added=state.events.filter(row=>!oldIds.has(row.id));assert.equal(added.length,sized.type==='customer'?2:1);assert.equal(state.events.length,sized.projection.state.events.length);
  for(const event of added){assert.deepEqual(event.actor,actorIdentity);assert.match(event.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(event.at).toISOString(),event.at);}
  const expected=mutationExportProjection(core,sized.state,{type:sized.type,data:sized.data,actor:actorIdentity,space:'demo',timestamp:added[0].at}).state;
  for(const row of expected.events.filter(row=>!oldIds.has(row.id)))row.id=added.find(event=>event.text===row.text)?.id;
  const oldTasks=new Set(sized.state.tasks.map(row=>row.id)),addedTasks=state.tasks.filter(row=>!oldTasks.has(row.id));let task=0;for(const row of expected.tasks.filter(row=>!oldTasks.has(row.id)))row.id=addedTasks[task++].id;
  assert.deepEqual(ordered(state),ordered(expected),'Actual final state preserves every original event, actor, Unicode, next activity and date');assert.ok(utf8(mutationExportHeader(state,{space:'demo'}))<16000000,'Count boundary is independent of 16 MB wire limit');
  const after=await snapshot();preserve(before,after,{draft});
  const receipts=(await db.prepare('SELECT * FROM crm_mutations WHERE space=?').bind('demo').all()).results;assert.equal(receipts.length,1);assert.equal(receipts[0].id,id);assert.equal(receipts[0].user_id,actor.user_id);assert.equal(receipts[0].request_hash,hash(JSON.stringify({type:sized.type,data:sized.data})));assert.deepEqual(JSON.parse(receipts[0].result_json),response.data.mutationResult);assert.ok(added.some(event=>event.id===response.data.mutationResult.eventId));
  if(draft){const row=await db.prepare('SELECT archived,revision FROM crm_drafts WHERE space=? AND user_id=? AND id=?').bind('demo',actor.user_id,sized.data.draft.id).first();assert.deepEqual(row,{archived:1,revision:sized.data.draft.revision+1});}
  return{state,after};
 };
 const copies=async state=>{
  const before=await snapshot(),data=await call('/api/crm?space=demo');assert.equal(data.status,200);assert.deepEqual(withoutEnvelope(data.data),state);assert.equal(restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state}).events.length,HISTORY_LIMIT);
  const json=await call('/api/crm/backup?space=demo');assert.equal(json.status,200,json.data?.error);assert.deepEqual(json.data.files,[]);assert.deepEqual(json.data.state,state);assert.equal(restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:json.data.state},true).events.length,HISTORY_LIMIT);
  const stream=await call('/api/crm/backup?space=demo&format=stream');assert.equal(stream.status,200,stream.data?.error);assert.equal(stream.headers.get('cache-control'),'no-store');const lines=stream.text.trimEnd().split('\n'),header=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(lines.length,2);assert.deepEqual(header.state,state);assert.deepEqual(header.files,[]);assert.deepEqual(end,{type:'end',files:0,bytes:0,sha256:hash(lines[0])});assert.equal(Number(stream.headers.get('Content-Length')),Buffer.byteLength(stream.text));assert.equal(restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:header.state},true).events.length,HISTORY_LIMIT);
  for(const response of[data,json,stream])assert.ok(!response.text.includes(secret));assert.deepEqual(await snapshot(),before,'Genuine exports and parser leave every native row and R2 byte unchanged');return{data:200,json:200,stream:200,count:state.events.length,headerBytes:Buffer.byteLength(lines[0]),dataCopyParserAccepted:true};
 };
 const report={nativeMutationHistoryExportBudget:true,legacyUnchecked:expectLegacyUnchecked,sourceRevision,eventLimit:HISTORY_LIMIT,requests:0,rawTables:0,builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash,cases:[],denied:0,exactAccepted:0,lostAcknowledgments:0,casRaces:0,actorRevocations:0,historyRaces:0,draftRaces:0,positivePrivateAccountsOutlookAndR2:true,hostedProductionWriteVerified:false,independentPersonnelAcceptance:false};
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
   const sized=fixture(HISTORY_LIMIT),beforeBytes=utf8(mutationExportHeader(sized.state,{space:'demo'}));assert.ok(beforeBytes<16000000);await seed(sized);stage('baseline_seeded',{eventCount:HISTORY_LIMIT,headerBytes:beforeBytes});const before=await snapshot(),initial=await call('/api/crm/backup?space=demo&format=stream');assert.equal(initial.status,200,initial.data?.error);assert.equal(JSON.parse(initial.text.split('\n')[0]).state.events.length,HISTORY_LIMIT);assert.deepEqual(await snapshot(),before);
   const id=randomUUID(),response=await post(sized,{id});stage('baseline_note_completed',{status:response.status});
   // Use the request's actual ID for ledger verification; no fabricated receipt.
   const savedResult=await saved(sized,response,id,before),after=savedResult.after;assert.equal(savedResult.state.events.length,HISTORY_LIMIT+1);
   const data=await call('/api/crm?space=demo');assert.equal(data.status,200);assert.equal(data.data.events.length,HISTORY_LIMIT+1);const actualState=withoutEnvelope(data.data);assert.throws(()=>restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:actualState}),error=>error.issues?.some(issue=>issue.path.join('.')==='state.events'&&issue.code==='too_big'&&issue.maximum===HISTORY_LIMIT));
   const exports={};for(const format of['json','stream']){const result=await call('/api/crm/backup?space=demo'+(format==='stream'?'&format=stream':'')),copy=result.status===200?(format==='stream'?JSON.parse(result.text.split('\n')[0]):result.data):null;exports[format]={status:result.status,returnedEvents:copy?.state?.events.length||null,error:result.data?.error||null};if(result.status===200)assert.throws(()=>restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state}),error=>error.issues?.some(issue=>issue.path.join('.')==='state.events'&&issue.code==='too_big'));else assert.equal(result.status,400,result.text);}
   assert.deepEqual(await snapshot(),after);report.cases.push({type:'note',sourceEvents:HISTORY_LIMIT,status:200,actualPersistedEvents:HISTORY_LIMIT+1,headerBytes:utf8(mutationExportHeader(actualState,{space:'demo'})),beforeStreamStatus:200,actualDataReadStatus:200,dataCopyParserRejected:true,exports});
  }else{
   await deny(fixture(HISTORY_LIMIT));
   for(const type of['customer_note','follow_up']){const over=fixture(HISTORY_LIMIT,type);await seed(over);const privateRecord=await draft(over);await deny(over,{alreadySeeded:true});const before=await snapshot(),read=await call('/api/crm/drafts?space=demo&id='+privateRecord.id);assert.equal(read.status,200);assert.deepEqual(read.data,[privateRecord]);assert.deepEqual(await snapshot(),before);report.cases.at(-1).privateUnarchivedDraftPreserved=true;}
   await deny(fixture(HISTORY_LIMIT-1,'customer'));
   const exact=fixture(HISTORY_LIMIT-1);await seed(exact);const before=await snapshot(),id=randomUUID(),lost=await post(exact,{id,lost:true});stage('exact_boundary_commit',{status:lost.status});assert.equal(lost.status,503);assert.equal(lostAcks,1);const committed=await snapshot();preserve(before,committed);const replay=await post(exact,{id,version:0});assert.equal(replay.status,200,replay.data?.error);assert.equal(replay.trace.length,0);const result=await saved(exact,replay,id,before,{commitTrace:lost.trace});assert.deepEqual(result.after,committed);assert.equal(result.state.events.length,HISTORY_LIMIT);const exports=await copies(result.state);report.exactAccepted++;report.exactBoundary={type:'note',statusAfterActualLostAck:503,exactReplayStatus:200,finalEvents:HISTORY_LIMIT,exports,actualNativeReceipt:true,exactReplayBeforeCountGate:true};
   const later=await post({...exact,state:result.state,data:{...exact.data,text:'Fiktiv nästa anteckning'}});assert.equal(later.status,400);assert.deepEqual(later.data,{error:HISTORY_ERROR});assert.equal(later.trace.length,0);assert.deepEqual(await snapshot(),result.after);report.denied++;
   for(const options of[{account:accounts[1]},{data:{...exact.data,text:'Fiktiv ändrad avsikt'}}]){const denied=await post(exact,{id,version:0,...options});assert.equal(denied.status,409);assert.equal(denied.trace.length,0);assert.deepEqual(await snapshot(),result.after);}
   for(const account of accounts.filter(row=>['reader','production','print','warehouse'].includes(row.role))){const beforeRole=await snapshot(),denied=await post(exact,{account,version:10});assert.equal(denied.status,403);assert.equal(denied.trace.length,0);assert.deepEqual(await snapshot(),beforeRole);}report.actualReceiptActorHashResultAndRoles=true;
   const historyEntry=fixture(HISTORY_LIMIT-1,'customer_note');await seed(historyEntry);await draft(historyEntry);let expectedHistoryRace;
   const changed=await post(historyEntry,{gate:async event=>{if(event.stage==='commit_before'&&!historyRaces){historyRaces++;const row={id:'synthetic-competing-history',customerId:historyEntry.state.customers[0].id,dealId:'',text:'Fiktiv annan kollegas självständiga historik',at,kind:'note'};await insert('crm_events',{id:row.id,space:'demo',customer_id:row.customerId,data:JSON.stringify(row)}).run();await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();expectedHistoryRace=await snapshot();}}});
   assert.equal(changed.status,400);assert.deepEqual(changed.data,{error:HISTORY_ERROR});assert.equal(historyRaces,1);assert.deepEqual(changed.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);noR2(changed.trace);assert.deepEqual(await snapshot(),expectedHistoryRace,'Safe retry counts actual independently added history before a second COMMIT; private draft and own ledger unchanged');report.safeRetryRemeasuresChangedHistory=true;
   for(const type of['customer_note','follow_up']){const small=fixture(2,type);await seed(small);await draft(small);const before=await snapshot(),id=randomUUID(),response=await post(small,{id}),result=await saved(small,response,id,before,{draft:true});const replay=await post(small,{id,version:0});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);assert.deepEqual(replay.data,response.data);assert.deepEqual(await snapshot(),result.after);report.cases.push({type,sourceEvents:2,status:200,finalEvents:3,privateDraftAndSharedPublicationAtomic:true,exactReplayNoWrites:true});}
   const draftEntry=fixture(2,'customer_note');await seed(draftEntry);await draft(draftEntry);let expectedDraftRace;
   const draftChanged=await post(draftEntry,{gate:async event=>{if(event.stage==='commit_before'&&!draftRaces){draftRaces++;await db.prepare('UPDATE crm_drafts SET revision=revision+1 WHERE space=? AND user_id=? AND id=?').bind('demo',actor.user_id,draftEntry.data.draft.id).run();expectedDraftRace=await snapshot();}}});
   assert.equal(draftChanged.status,409);assert.equal(draftRaces,1);assert.deepEqual(draftChanged.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);noR2(draftChanged.trace);assert.deepEqual(await snapshot(),expectedDraftRace);report.privateDraftCommitRaceDenied=true;
   const small=fixture(2);await seed(small);const staleBefore=await snapshot(),stale=await post(small,{version:8});assert.equal(stale.status,409);assert.equal(stale.trace.length,0);assert.deepEqual(await snapshot(),staleBefore);let expectedRace;
   const raced=await post(small,{gate:async event=>{if(event.stage==='commit_before'){races++;await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();expectedRace=await snapshot();}}});assert.equal(raced.status,409);assert.equal(races,1);assert.deepEqual(raced.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);assert.deepEqual(await snapshot(),expectedRace);report.casZeroPreservesAllRows=true;
   await seed(small);let expectedRevocation;const revoked=await post(small,{gate:async event=>{if(event.stage==='commit_before'){revocations++;await db.prepare('UPDATE crm_members SET active=0 WHERE id=?').bind(actor.id).run();expectedRevocation=await snapshot();}}});assert.equal(revoked.status,403);assert.equal(revocations,1);assert.deepEqual(revoked.trace.filter(event=>event.stage==='commit_after'),[{stage:'commit_after',changes:0}]);assert.deepEqual(await snapshot(),expectedRevocation);report.nativeCommitActorRevocationDenied=true;
  }
  assert.equal(builtHash(),originalBuiltHash);assert.deepEqual(fixtureHashes(),originalFixtureHashes);assert.deepEqual(helperHashes(),originalHelperHashes);report.fixtureModulesSha256=originalFixtureHashes;report.helperModulesSha256=originalHelperHashes;report.requests=requests;report.lostAcknowledgments=lostAcks;report.casRaces=races;report.actorRevocations=revocations;report.historyRaces=historyRaces;report.draftRaces=draftRaces;report.elapsedSeconds=Number(((performance.now()-started)/1000).toFixed(3));stage('proof_complete',{requests,elapsedSeconds:report.elapsedSeconds});return report;
 }finally{stage('before_dispose');await mf.dispose();stage('disposed');rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash);assert.deepEqual(fixtureHashes(),originalFixtureHashes);assert.deepEqual(helperHashes(),originalHelperHashes);}
}

// CLI and the mandatory runtime suite compile fixture schemas from their own
// current checkout. A baseline caller can explicitly supply its separately
// verified historical modules. No application module is transplanted or edited.
export async function assertNativeMutationHistoryExportBudget(options={}){
 if(options.moduleRoot)return runNativeMutationHistoryExportBudget(options);
 const sourceRoot=fileURLToPath(new URL('../',import.meta.url));mkdirSync(join(sourceRoot,'work'),{recursive:true});
 const directory=mkdtempSync(join(sourceRoot,'work/native-mutation-history-fixtures-')),modules=new Map();
 const compile=file=>{
  const target=resolve(directory,file.replace(/\.ts$/,'.mjs'));if(modules.has(file))return target;assert.ok(file.startsWith('lib/')&&file.endsWith('.ts'));
  const input=readFileSync(resolve(sourceRoot,file));modules.set(file,{sourceSha256:hash(input),moduleSha256:null,target});
  let output=ts.transpileModule(input.toString('utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('.'))dependency=compile(relative(sourceRoot,resolve(dirname(resolve(sourceRoot,file)),specifier)).split(sep).join('/')+'.ts');else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);modules.get(file).moduleSha256=hash(output);return target;
 };
 const fixed=()=>{for(const[file,row]of modules){assert.equal(hash(readFileSync(resolve(sourceRoot,file))),row.sourceSha256,'Actual source schema remained fixed: '+file);assert.equal(hash(readFileSync(row.target)),row.moduleSha256,'Compiled schema remained fixed: '+file);}};
 try{
  for(const file of['lib/crm.ts','lib/operations.ts','lib/crm-restore.ts'])compile(file);fixed();
  const sourceRevision=options.sourceRevision||execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim();
  const report=await runNativeMutationHistoryExportBudget({...options,sourceRevision,moduleRoot:join(directory,'lib'),coreFilename:'crm.mjs'});fixed();
  report.fixtureSourceModules=Object.fromEntries([...modules].map(([file,row])=>[file,{sourceSha256:row.sourceSha256,moduleSha256:row.moduleSha256}]));
  report.allTransitiveFixtureSourcesAndModulesUnchanged=true;return report;
 }finally{try{fixed();}finally{rmSync(directory,{recursive:true,force:true});}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native ordinary mutation history export budget: '+JSON.stringify(await assertNativeMutationHistoryExportBudget()));
