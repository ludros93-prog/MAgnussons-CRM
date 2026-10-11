import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Observe the unchanged built Worker through a real HTTP listener and native,
// persisted D1/R2. SQL and application modules are never replaced. A lost
// acknowledgment is injected only after the real restore transaction commits.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap();
 const observe=async(stage,details={})=>{
  const response=await env.DATA_RESTORE_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({stage,...details})});
  if(!response.ok)throw Error('Synthetic data restore observation failed');
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
const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const independent=new Set(['customers','articles','notices','leads','companyEvents']);
const withoutEnvelope=({viewer:_,mutationResult:__,...state})=>state;
const HEADER_LIMIT=16000000;
const HEADER_ERROR='CRM-kopian lämnar inte plats för återställningens data och historik inom 16 MB. Inga uppgifter återställs och befintlig historik tas inte bort.';
const byteLength=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const header=(state,at)=>({type:'header',format:'magnussons-crm-backup-2',exportedAt:at,sourceSpace:'demo',state,files:[]});

function fixture(core,ops){
 const at='2026-10-11T17:00:00.000Z',owner='Syntetiskt dataåterställningsansvar',customerId='export-budget-customer',dealId='export-budget-deal',profileId=randomUUID(),secret='SYNTHETIC PRIVATE HISTORY RESTORE '+randomUUID();
 const accounts=['admin','peer','seller'].map((role,i)=>({id:'export-budget-member-'+role,user_id:'export-budget-user-'+role,email:'export-budget-'+role+'@example.test',name:'Syntetisk kollega '+role,role:i<2?'admin':'seller',owner:i===2?owner:'',active:1}));
 const actor=accounts[0];actor.name='Syntetisk återställare Å😀';
 const state=core.emptyState();state.version=7;state.settings.owners=[owner];state.settings.sellerProfilesInitialized=true;state.settings.sellerProfiles=[{id:profileId,legacyOwnerName:owner,displayName:'Syntetisk ansvarig',memberId:accounts[2].id,active:true,linkHistory:[]}];state.settings.sellerGoalsById[profileId]={'2026-10':{revenue:10000,grossProfit:4000,qualified:4}};
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv dataåterställningskund',owner,ownerProfileId:profileId,status:'active',plan:{goal:'Fiktivt bevarat kommersiellt ansvar'}})];
 state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,ownerProfileId:profileId,title:'Fiktiv bevarad affär'})];
 state.orders=[core.OrderSchema.parse({id:'export-budget-order',customerId,dealId,owner,ownerProfileId:profileId,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktiv order utan filreferenser'})];
 state.tasks=[core.TaskSchema.parse({id:'export-budget-task',customerId,dealId,owner,ownerProfileId:profileId,title:'Fiktiv planerad uppföljning',due:'2026-11-01'})];
 state.meetings=[core.MeetingSchema.parse({id:'export-budget-meeting',customerId,owner,ownerProfileId:profileId,title:'Fiktivt möte',date:'2026-11-01',time:'10:00',duration:30})];
 state.events=[{id:'export-budget-event',customerId,dealId:'',kind:'note',at,text:'Fiktiv bevarad anteckning Å😀 "\\\n\u0000\ud800',actor:{id:accounts[2].user_id,name:accounts[2].name}}];
 state.articles=[ops.ArticleSchema.parse({id:'export-budget-article',sourceId:'current',sku:'SYNTHETIC-DATA-RESTORE',name:'Fiktiv katalogpost'})];
 state.notices=[ops.NoticeSchema.parse({id:'export-budget-notice',title:'Fiktiv avisering',audience:'team',at})];
 state.leads=[ops.LeadSchema.parse({id:'export-budget-lead',name:'Fiktivt prospekt',source:'Isolerat runtimeprov'})];
 state.companyEvents=[ops.CompanyEventSchema.parse({id:'export-budget-company-event',title:'Fiktiv företagsaktivitet',owner,ownerProfileId:profileId,date:'2026-11-01'})];
 state.settings=core.SettingsSchema.parse(state.settings);
 return{state,accounts,actor,customerId,at,secret,version:9};
}

export async function assertNativeDataRestoreExportBudget({moduleRoot,coreFilename='core.mjs',serverRoot:providedServerRoot,expectLegacyUnchecked=false}={}){
 const started=performance.now(),root=fileURLToPath(new URL('../',import.meta.url)),generated=moduleRoot||root+'work',serverRoot=providedServerRoot||root+'dist/server';
 const core=await import(pathToFileURL(join(generated,coreFilename)).href),ops=await import(pathToFileURL(join(generated,'operations.mjs')).href),restoreCore=await import(pathToFileURL(join(generated,'crm-restore.mjs')).href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>hash(moduleFiles.map(file=>file+'\0'+hash(readFileSync(serverRoot+'/'+file))).join('\n')),originalBuiltHash=builtHash();
 const generatedFiles=[coreFilename,'operations.mjs','crm-restore.mjs'],generatedHashes=()=>Object.fromEntries(generatedFiles.map(file=>[file,hash(readFileSync(join(generated,file)))])),originalGeneratedHashes=generatedHashes();
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-data-export-budget-')),f=fixture(core,ops);
 let db,bucket,ready,tables,baseline,trace=[],loseAck=false,lostAcks=0,requests=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__data_restore_history_budget_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'data-restore-export-budget'},r2Buckets:{BUCKET:'data-restore-export-budget'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{DATA_RESTORE_OBSERVER:async request=>{const event=await request.json();trace.push(event);if(event.stage==='commit_after'&&event.changes===1&&loseAck){loseAck=false;lostAcks++;return new Response(null,{status:204,headers:{'X-Synthetic-Lost-Ack':'1'}});}return new Response(null,{status:204});}}});
 const insert=(table,row)=>{const columns=Object.keys(row);return db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind(...columns.map(column=>row[column]));};
 // Hash the actual complete raw tables so header-boundary snapshots stay bounded
 // in memory. Private/account/R2 sentinels remain positive, never empty fixtures.
 const snapshot=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>{const rows=(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results;return[table,{count:rows.length,sha256:hash(JSON.stringify(rows)),outsideSha256:hash(JSON.stringify(rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo')))}];}))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async row=>{const object=await bucket.get(row.key);return[row.key,{size:object.size,sha256:hash(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const clearDestination=async()=>{
  const order=['crm_mutations','crm_files','crm_events','crm_meetings','crm_tasks','crm_orders','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events'];
  await db.batch([...order.map(table=>db.prepare('DELETE FROM '+table+' WHERE space=?').bind('demo')),db.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').bind(f.version,'SYNTHETIC-UNCHANGED',JSON.stringify(core.emptyState().settings),'demo')]);
 };
 const call=async(path,{body,account=f.actor,lost=false}={})=>{
  trace=[];loseAck=lost;requests++;const url=new URL(path,ready);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email,'Accept-Encoding':'identity',...(body===undefined?{}:{'Content-Type':'application/json',Origin:url.origin})},...(body===undefined?{}:{body:JSON.stringify(body)})}),text=await response.text();let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,headers:response.headers,trace:[...trace]};}finally{loseAck=false;}
 };
 const restore=(data,{id=randomUUID(),version=f.version,account=f.actor,lost=false}={})=>call('/api/crm',{body:{space:'demo',version,requestId:id,type:'restore',data},account,lost});
 const noR2=events=>assert.equal(events.filter(event=>event.stage.startsWith('r2_')).length,0,'Data-only restore never reads, writes or deletes an R2 object');
 const dataExport=async space=>{const before=await snapshot(),response=await call('/api/crm?space='+space);assert.equal(response.status,200,response.data?.error);assert.ok(!response.text.includes(f.secret));assert.deepEqual(await snapshot(),before,'The genuine data export leaves all native tables and R2 unchanged');return{format:'magnussons-crm-1',exportedAt:f.at,space,state:withoutEnvelope(response.data)};};
 const preserve=(before,after)=>{
  for(const table of tables){if(['crm_members','crm_drafts',...tables.filter(name=>name.startsWith('outlook_'))].includes(table))assert.deepEqual(after.tables[table],before.tables[table],table+' account/private sentinel');else assert.equal(after.tables[table].outsideSha256,before.tables[table].outsideSha256,table+' source/unrelated sentinel');}
  assert.deepEqual(after.r2,before.r2,'All original native R2 bytes and metadata survive');
 };
 const saved=async(data,response,id,before)=>{
  assert.equal(response.status,200,response.data?.error);noR2(response.trace);const next=withoutEnvelope(response.data),sourceIds=new Set(data.state.events.map(event=>event.id)),audits=next.events.filter(event=>!sourceIds.has(event.id));
  assert.equal(audits.length,data.state.customers.length);assert.equal(new Set(audits.map(event=>event.customerId)).size,data.state.customers.length);
  for(const event of audits){assert.equal(event.kind,'restore');assert.equal(event.dealId,'');assert.equal(event.text,'Kundens CRM-data återställd från export');assert.deepEqual(event.actor,{id:f.actor.user_id,name:f.actor.name});assert.match(event.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(event.at).toISOString(),event.at);}
  const expected=structuredClone(data.state);expected.version=f.version+1;expected.settings.sellerProfiles=expected.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
  assert.deepEqual({...next,events:next.events.filter(event=>sourceIds.has(event.id))},expected,'All original history, Unicode, provenance, CRM responsibility and quantities survive; only member links detach');
  const after=await snapshot();preserve(before,after);assert.equal(after.tables.crm_events.count-before.tables.crm_events.count,data.state.events.length+audits.length);
  const ledger=(await db.prepare('SELECT * FROM crm_mutations WHERE space=?').bind('demo').all()).results;assert.equal(ledger.length,1);assert.equal(ledger[0].id,id);assert.equal(ledger[0].user_id,f.actor.user_id);assert.equal(ledger[0].request_hash,hash(JSON.stringify({type:'restore',data})));assert.deepEqual(JSON.parse(ledger[0].result_json),response.data.mutationResult,'Actual receipt preserves its actor, input hash and mutation result');
  return{state:next,after};
 };
 // Independent wire oracle: apply the existing parser, explicitly name the
 // generated audit and final 9 -> 10 version, then measure JSON in UTF-8.
 // Product backupStreamHeader/restore byte guards are never called by this oracle.
 const futureHeader=data=>{
  const state=restoreCore.restoreState({...core.emptyState(),version:f.version},data);
  const beforeAudit=byteLength(header(state,f.at));
  state.events.push(...state.customers.map((customer,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),customerId:customer.id,dealId:'',text:'Kundens CRM-data återställd från export',kind:'restore',at:f.at,actor:{id:f.actor.user_id,name:f.actor.name}})));
  const withAudit=byteLength(header(state,f.at));state.version=f.version+1;
  return {bytes:byteLength(header(state,f.at)),auditBytes:withAudit-beforeAudit,versionBytes:byteLength(header(state,f.at))-withAudit};
 };
 const capacitySource=async(target,{legacy=false,layout='cjk'}={})=>{
  await clearDestination();
  const state=structuredClone(f.state);state.events=Array.from({length:legacy?160:110},(_,i)=>({...f.state.events[0],id:'export-capacity-'+String(i).padStart(3,'0'),text:i===0?f.state.events[0].text:''}));
  const data={format:'magnussons-crm-1',exportedAt:f.at,space:'live',state};
  if(legacy)for(const event of state.events)event.text+='漢'.repeat(49500-event.text.length);
  else{
   let remaining=target-futureHeader(data).bytes;assert.ok(remaining>0);
   const character=layout==='emoji'?'😀':'漢',bytes=Buffer.byteLength(character),units=character.length;
   for(const event of state.events){const count=Math.min(Math.floor((50000-event.text.length)/units),Math.floor(remaining/bytes));event.text+=character.repeat(count);remaining-=count*bytes;}
   for(const event of state.events){const count=Math.min(50000-event.text.length,remaining);event.text+='x'.repeat(count);remaining-=count;}
   assert.equal(remaining,0,'Exact UTF-8 padding fits every unchanged 50,000 UTF-16 event cap');
  }
  const projected=futureHeader(data),body=JSON.stringify({space:'demo',version:f.version,requestId:'22222222-2222-4222-8222-222222222222',type:'restore',data});
  assert.ok(body.length<=10000000,'Actual POST envelope remains under its existing UTF-16 request cap');
  assert.ok(state.events.every(event=>event.text.length<=50000&&byteLength(event)<2000000),'Every event retains its schema and SQLite row budget');
  assert.ok(projected.auditBytes>0);assert.equal(projected.versionBytes,1,'Final committed revision crosses the 9 to 10 decimal boundary');
  if(legacy)assert.ok(projected.bytes>HEADER_LIMIT);else assert.equal(projected.bytes,target,'Independent final-state header is the exact requested UTF-8 size');
  return {data,projected,requestUnits:body.length,requestBytes:Buffer.byteLength(body),layout};
 };
 const copies=async (state,expectedBytes)=>{
  const before=await snapshot(),data=await dataExport('demo');assert.deepEqual(data.state,state);const parsed=restoreCore.restoreState(core.emptyState(),data);assert.equal(parsed.events.length,state.events.length);
  const json=await call('/api/crm/backup?space=demo');assert.equal(json.status,200,json.data?.error);assert.equal(json.headers.get('cache-control'),'no-store');assert.equal(json.data.format,'magnussons-crm-backup-1');assert.deepEqual(json.data.files,[]);assert.deepEqual(json.data.state,state);restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:json.data.state},true);
  const streamed=await call('/api/crm/backup?space=demo&format=stream');assert.equal(streamed.status,200);assert.equal(streamed.headers.get('cache-control'),'no-store');const lines=streamed.text.trimEnd().split('\n'),head=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(lines.length,2);assert.equal(head.format,'magnussons-crm-backup-2');assert.equal(head.type,'header');assert.deepEqual(head.files,[]);assert.deepEqual(head.state,state);assert.deepEqual(end,{type:'end',files:0,bytes:0,sha256:hash(lines[0])});assert.equal(Buffer.byteLength(lines[0]),expectedBytes,'The actual native NDJSON header matches the independent future-state UTF-8 oracle exactly');assert.equal(Number(streamed.headers.get('Content-Length')),Buffer.byteLength(streamed.text));restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:head.state},true);
  assert.ok(!json.text.includes(f.secret)&&!streamed.text.includes(f.secret));assert.deepEqual(await snapshot(),before,'All three export formats preserve native raw tables/R2');
 };
 const report={nativeDataRestoreExportBudget:true,legacyUnchecked:expectLegacyUnchecked,headerByteLimit:HEADER_LIMIT,requests:0,rawTables:0,builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash,cases:[],denied:0,exactAccepted:0,lostAcknowledgments:0,allOriginalHistoryPreserved:true,positivePrivateAccountsOutlookAndR2:true,hostedProductionRestoreVerified:false,independentPersonnelAcceptance:false};
 try{
  db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');ready=await mf.ready;
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);report.rawTables=tables.length;
  for(const space of ['live','demo'])await insert('crm_spaces',{id:space,version:space==='live'?f.state.version:f.version,write_token:'SYNTHETIC-UNCHANGED',settings:JSON.stringify(space==='live'?f.state.settings:core.emptyState().settings)}).run();
  for(const[name,table]of Object.entries(mapping))for(const row of f.state[name])await insert(table,{id:row.id,space:'live',...(independent.has(name)?{}:{customer_id:row.customerId}),...(name==='orders'?{deal_id:row.dealId}:{}),data:JSON.stringify(row)}).run();
  for(const account of f.accounts)await insert('crm_members',account).run();
  for(const space of ['live','demo'])for(const account of f.accounts.slice(0,2))await insert('crm_drafts',{space,user_id:account.user_id,id:'export-budget-draft-'+account.id,kind:'note',context:f.customerId,revision:3,request_id:randomUUID(),title:'Fiktivt privat utkast',data:' {"text":"'+f.secret+'"}\n',archived:space==='demo'?1:0,updated_at:f.at}).run();
  await insert('crm_mutations',{space:'live',id:randomUUID(),result_json:' {"sentinel":"private"}\n',user_id:f.actor.user_id,request_hash:'0'.repeat(64)}).run();
  for(const account of f.accounts.slice(0,2)){
   await insert('outlook_connections',{user_id:account.user_id,microsoft_id:'synthetic-ms-'+account.id,email:account.email,tokens:f.secret,last_sync:f.at,status:'error',sync_note:f.secret,lock_until:0,revision:7}).run();
   for(const shared of [0,1])await insert('outlook_items',{id:'export-budget-mail-'+account.id+'-'+shared,user_id:account.user_id,kind:'mail',data:' {"body":"'+f.secret+'"}\n',customer_id:f.customerId,deal_id:'',shared,happened_at:f.at,seen_at:f.at}).run();
   await insert('outlook_oauth_states',{hash:'export-budget-oauth-'+account.id,user_id:account.user_id,verifier:f.secret,expires:1999999999000}).run();
  }
  const file={id:'export-budget-source-file',name:'syntetisk-utanför-dataexporten.txt',kind:'document',version:'synthetic-v1',size:5,at:f.at,uploadedBy:f.actor.user_id};
  await bucket.put('export-budget-source-object',new Uint8Array([0,1,255,13,10]),{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'outside-data-export'}});await insert('crm_files',{id:file.id,space:'live',customer_id:f.customerId,object_key:'export-budget-source-object',data:JSON.stringify(file)}).run();
  await bucket.put('export-budget-private-r2',new TextEncoder().encode(f.secret+'\n\0 Å😀'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private-sentinel'}});
  baseline=await snapshot();for(const table of tables)assert.ok(baseline.tables[table].count>0,'Positive native sentinel in '+table);assert.equal(Object.keys(baseline.r2).length,2);
  if(expectLegacyUnchecked){
   const sized=await capacitySource(HEADER_LIMIT+1,{legacy:true}),{data}=sized,before=await snapshot(),id=randomUUID(),response=await restore(data,{id}),result=await saved(data,response,id,before);
   assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);
   assert.equal(byteLength(header(result.state,f.at)),sized.projected.bytes,'Actual native committed state has the independently predicted oversized header');
   const exported=await call('/api/crm/backup?space=demo&format=stream');assert.equal(exported.status,400);assert.deepEqual(exported.data,{error:'CRM-data och filförteckning får vara högst 16 MB.'});assert.deepEqual(await snapshot(),result.after);
   report.cases.push({sourceEvents:data.state.events.length,customers:data.state.customers.length,status:200,persistedEvents:result.state.events.length,requestUtf16Units:sized.requestUnits,requestUtf8Bytes:sized.requestBytes,futureHeaderBytes:sized.projected.bytes,reexportStatus:400,reexportError:exported.data.error});
  }else{
   const sized=await capacitySource(HEADER_LIMIT+1),{data}=sized,before=await snapshot(),response=await restore(data);
   assert.equal(response.status,400,response.data?.error);assert.deepEqual(response.data,{error:HEADER_ERROR});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.trace.length,0,'Future-header byte overflow stops before actual encoding probe, transaction and R2');assert.deepEqual(await snapshot(),before,'One-byte header denial preserves every byte/count of all 18 native tables and R2');report.denied++;
   report.cases.push({sourceEvents:data.state.events.length,customers:data.state.customers.length,status:400,requestUtf16Units:sized.requestUnits,requestUtf8Bytes:sized.requestBytes,futureHeaderBytes:sized.projected.bytes,beforeProbeAndCommit:true});
   // Historical receipts are completed contracts, not first writes. This
   // explicitly synthetic oversized-input receipt must still replay early.
   const oldId=randomUUID(),oldResult={customerId:f.customerId,eventId:data.state.events[0].id};
   await insert('crm_mutations',{space:'demo',id:oldId,result_json:JSON.stringify(oldResult),user_id:f.actor.user_id,request_hash:hash(JSON.stringify({type:'restore',data}))}).run();
   const withReceipt=await snapshot(),oldReplay=await restore(data,{id:oldId});assert.equal(oldReplay.status,200);assert.deepEqual(oldReplay.data.mutationResult,oldResult);assert.equal(oldReplay.trace.length,0);assert.deepEqual(await snapshot(),withReceipt,'Exact synthetic legacy receipt returns before header/probe/COMMIT/R2 and preserves all raw rows');report.syntheticLegacyOversizedReceiptReplay=true;
   const exact=await capacitySource(HEADER_LIMIT),exactBefore=await snapshot(),id=randomUUID(),accepted=await restore(exact.data,{id}),result=await saved(exact.data,accepted,id,exactBefore);
   assert.equal(accepted.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.deepEqual(accepted.trace.filter(event=>event.stage==='storage_probe'),[{stage:'storage_probe',encoding:'41F09F9880'}]);
   await copies(result.state,HEADER_LIMIT);const replay=await restore(exact.data,{id,version:0});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);assert.deepEqual(replay.data,accepted.data);assert.deepEqual(await snapshot(),result.after,'Exact boundary double-click/stale completed retry duplicates neither history nor receipt');report.exactAccepted++;
   report.cases.push({sourceEvents:exact.data.state.events.length,customers:exact.data.state.customers.length,status:200,persistedEvents:result.state.events.length,requestUtf16Units:exact.requestUnits,requestUtf8Bytes:exact.requestBytes,futureHeaderBytes:HEADER_LIMIT,threeExportFormatsValid:true,exactReplayNoWrites:true});
   await clearDestination();const small={format:'magnussons-crm-1',state:structuredClone(f.state)},smallBefore=await snapshot(),smallId=randomUUID(),lost=await restore(small,{id:smallId,lost:true});assert.equal(lost.status,503);assert.equal(lostAcks,1);assert.equal(lost.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);noR2(lost.trace);const committed=await snapshot();preserve(smallBefore,committed);const retry=await restore(small,{id:smallId,version:0});assert.equal(retry.status,200);assert.equal(retry.trace.length,0);const retried=await saved(small,retry,smallId,smallBefore);assert.deepEqual(retried.after,committed);report.smallLostAcknowledgmentThenReplay=true;
   const other=await restore(small,{id:smallId,account:f.accounts[1]});assert.equal(other.status,409);assert.equal(other.trace.length,0);assert.deepEqual(await snapshot(),committed,'Another actor cannot reuse the receipt');
   const changed=structuredClone(small);changed.state.customers[0].name+=' ändrad avsikt';const intent=await restore(changed,{id:smallId});assert.equal(intent.status,409);assert.equal(intent.trace.length,0);assert.deepEqual(await snapshot(),committed,'Changed intent cannot reuse the receipt');
   await clearDestination();const roleBefore=await snapshot(),role=await restore(small,{account:f.accounts[2]});assert.equal(role.status,403);assert.equal(role.trace.length,0);assert.deepEqual(await snapshot(),roleBefore,'Seller cannot restore even when final header fits');report.actualReceiptActorHashResultAndRole=true;
  }
  assert.equal(builtHash(),originalBuiltHash,'All built application modules remain byte-for-byte unchanged');assert.deepEqual(generatedHashes(),originalGeneratedHashes,'All source fixture modules remain byte-for-byte unchanged');report.fixtureModulesSha256=originalGeneratedHashes;report.requests=requests;report.lostAcknowledgments=lostAcks;report.elapsedSeconds=Number(((performance.now()-started)/1000).toFixed(3));return report;
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Native harness leaves the unmodified built modules intact even on failure');assert.deepEqual(generatedHashes(),originalGeneratedHashes,'Native harness leaves source fixture modules intact even on failure');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native data-only restore export budget: '+JSON.stringify(await assertNativeDataRestoreExportBudget()));

