import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqliteRecordBytes,ROW_BUDGET} from './backup-restore-row-budget.mjs';
import {dataRestoreRowFixture,dataRestoreRowProjection} from './data-restore-row-budget.mjs';

// Forward the unchanged built Worker to real, persisted local D1/R2. The
// observer records native results; it never replaces SQL, probe values or
// application modules. A lost acknowledgment is injected after real COMMIT.
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
 const BUCKET={get(...args){return env.BUCKET.get(...args)},head(...args){return env.BUCKET.head(...args)},list(...args){return env.BUCKET.list(...args)},async put(key,...args){await observe('r2_put',{key});return env.BUCKET.put(key,...args)},async delete(key){await observe('r2_delete',{key});return env.BUCKET.delete(key)},createMultipartUpload(...args){return env.BUCKET.createMultipartUpload(...args)},resumeMultipartUpload(...args){return env.BUCKET.resumeMultipartUpload(...args)}};
 return withEnv({...env,DB,BUCKET},()=>app.fetch(request,{...env,DB,BUCKET},ctx));
}};
`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const independent=new Set(['customers','articles','notices','leads','companyEvents']);
const withoutEnvelope=({viewer:_,mutationResult:__,...state})=>state;

function fixture(core,ops){
 const at='2026-10-11T17:00:00.000Z',owner='Syntetiskt dataåterställningsansvar',customerId='data-row-customer',dealId='data-row-deal',profileId=randomUUID(),secret='SYNTHETIC PRIVATE DATA RESTORE '+randomUUID();
 const accounts=['admin','peer','seller'].map((role,i)=>({id:'data-row-member-'+role,user_id:'data-row-user-'+role,email:'data-row-'+role+'@example.test',name:'Syntetisk kollega '+role,role:i<2?'admin':'seller',owner:i===2?owner:'',active:1}));
 const actor=accounts[0];actor.name='Syntetisk återställare Å😀';
 const state=core.emptyState();state.version=7;state.settings.owners=[owner];state.settings.sellerProfilesInitialized=true;state.settings.sellerProfiles=[{id:profileId,legacyOwnerName:owner,displayName:'Syntetisk ansvarig',memberId:accounts[2].id,active:true,linkHistory:[]}];state.settings.sellerGoalsById[profileId]={'2026-10':{revenue:10000,grossProfit:4000,qualified:4}};
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv dataåterställningskund',owner,ownerProfileId:profileId,status:'active',plan:{goal:'Fiktivt bevarat kommersiellt ansvar'}})];
 state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,ownerProfileId:profileId,title:'Fiktiv bevarad affär'})];
 state.orders=[core.OrderSchema.parse({id:'data-row-order',customerId,dealId,owner,ownerProfileId:profileId,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktiv order utan filreferenser'})];
 state.tasks=[core.TaskSchema.parse({id:'data-row-task',customerId,dealId,owner,ownerProfileId:profileId,title:'Fiktiv planerad uppföljning',due:'2026-11-01'})];
 state.meetings=[core.MeetingSchema.parse({id:'data-row-meeting',customerId,owner,ownerProfileId:profileId,title:'Fiktivt möte',date:'2026-11-01',time:'10:00',duration:30})];
 state.events=[{id:'data-row-event',customerId,dealId:'',kind:'note',at,text:'Fiktiv bevarad anteckning Å😀 "\\\n\u0000\ud800',actor:{id:accounts[2].user_id,name:accounts[2].name}}];
 state.articles=[ops.ArticleSchema.parse({id:'data-row-article',sourceId:'current',sku:'SYNTHETIC-DATA-RESTORE',name:'Fiktiv katalogpost'})];
 state.notices=[ops.NoticeSchema.parse({id:'data-row-notice',title:'Fiktiv avisering',audience:'team',at})];
 state.leads=[ops.LeadSchema.parse({id:'data-row-lead',name:'Fiktivt prospekt',source:'Isolerat runtimeprov'})];
 state.companyEvents=[ops.CompanyEventSchema.parse({id:'data-row-company-event',title:'Fiktiv företagsaktivitet',owner,ownerProfileId:profileId,date:'2026-11-01'})];
 state.settings=core.SettingsSchema.parse(state.settings);
 return{state,accounts,actor,customerId,at,secret,version:9};
}

// This second oracle physically measures a SQLite record with the migration's
// INTEGER/TEXT affinities, including overflow pages. Its input is the actual
// persisted native D1 row, not a product helper or mocked write result.
function physicalRecord(values){
 const sqlite=new DatabaseSync(':memory:');
 try{
  sqlite.exec('CREATE TABLE probe('+values.map((value,i)=>'c'+i+(typeof value==='number'?(Number.isInteger(value)?' INTEGER':' REAL'):value instanceof Uint8Array?' BLOB':' TEXT')).join(',')+')');
  sqlite.prepare('INSERT INTO probe VALUES('+values.map(()=>'?').join(',')+')').run(...values);
  const bytes=Number(sqlite.prepare("SELECT SUM(payload) AS bytes FROM dbstat WHERE name='probe'").get().bytes);assert.equal(bytes,sqliteRecordBytes(values),'Independent dbstat agrees with whole-record UTF-8 oracle');return bytes;
 }finally{sqlite.close();}
}

export async function assertNativeDataRestoreRowBudget({moduleRoot,serverRoot:providedServerRoot,expectLegacyUnchecked=false}={}){
 const root=fileURLToPath(new URL('../',import.meta.url)),generated=moduleRoot||root+'work',serverRoot=providedServerRoot||root+'dist/server';
 const core=await import(pathToFileURL(join(generated,'core.mjs')).href),ops=await import(pathToFileURL(join(generated,'operations.mjs')).href),restoreCore=await import(pathToFileURL(join(generated,'crm-restore.mjs')).href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>hash(moduleFiles.map(file=>file+'\0'+hash(readFileSync(serverRoot+'/'+file))).join('\n')),originalBuiltHash=builtHash();
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-data-row-budget-')),f=fixture(core,ops);
 let db,bucket,ready,tables,baseline,trace=[],loseAck=false,lostAcks=0,requests=0,interleave,casZero=0,actorGateZero=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__data_restore_row_budget_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'data-restore-row-budget'},r2Buckets:{BUCKET:'data-restore-row-budget'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{DATA_RESTORE_OBSERVER:async request=>{const event=await request.json();trace.push(event);if(event.stage==='commit_before'&&interleave){const action=interleave;interleave=undefined;await action();}if(event.stage==='commit_after'&&event.changes===1&&loseAck){loseAck=false;lostAcks++;return new Response(null,{status:204,headers:{'X-Synthetic-Lost-Ack':'1'}});}return new Response(null,{status:204});}}});
 const raw=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async row=>{const object=await bucket.get(row.key);return[row.key,{size:object.size,sha256:hash(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const insert=(table,row)=>{const columns=Object.keys(row);return db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind(...columns.map(column=>row[column]));};
 const reset=async()=>{
  loseAck=false;interleave=undefined;f.actor.name='Syntetisk återställare Å😀';
  const order=['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders',...tables.filter(table=>!['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders'].includes(table))],q=order.toReversed().map(table=>db.prepare('DELETE FROM '+table));
  for(const table of order)for(const row of baseline.tables[table])q.push(insert(table,row));await db.batch(q);assert.deepEqual(await raw(),baseline,'Owned reset preserves all 18 positive tables and every native R2 object');
 };
 const call=async(path,{body,account=f.actor,lost=false}={})=>{
  trace=[];loseAck=lost;requests++;const url=new URL(path,ready);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email,'Accept-Encoding':'identity',...(body===undefined?{}:{'Content-Type':'application/json',Origin:url.origin})},...(body===undefined?{}:{body:JSON.stringify(body)})}),text=await response.text();let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,trace:[...trace]};}finally{loseAck=false;}
 };
 const dataExport=async space=>{
  const before=await raw(),r=await call('/api/crm?space='+space);assert.equal(r.status,200,r.data?.error||'Actual built GET');assert.ok(!r.text.includes(f.secret),'Data export excludes positive private drafts, tokens and Outlook items');
  const state=withoutEnvelope(r.data),data={format:'magnussons-crm-1',exportedAt:f.at,space,state};assert.equal(Object.hasOwn(data,'files'),false);assert.equal(Object.hasOwn(state,'viewer'),false);assert.equal(Object.hasOwn(state,'mutationResult'),false);
  assert.deepEqual(await raw(),before,'Actual built GET used by data export is read-only');return data;
 };
 const restore=(data,{id=randomUUID(),version=f.version,account=f.actor,lost=false}={})=>call('/api/crm',{body:{space:'demo',version,requestId:id,type:'restore',data},account,lost});
 const noR2=events=>assert.equal(events.filter(event=>event.stage.startsWith('r2_')).length,0,'Data-only restore never writes or deletes an R2 object');
 const probe=events=>{const probes=events.filter(event=>event.stage==='storage_probe');assert.equal(probes.length,1,'First write performs one uncached actual D1 encoding probe');assert.equal(probes[0].encoding,'41F09F9880','Actual native D1 stores A😀 as UTF-8');};
 const preserve=(before,after)=>{
  for(const table of tables){if(['crm_members','crm_drafts','crm_files',...tables.filter(table=>table.startsWith('outlook_'))].includes(table))assert.deepEqual(after.tables[table],before.tables[table],table+' account/file/private sentinel');else{const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' source/unrelated sentinel');}}
  assert.deepEqual(after.r2,before.r2,'Data-only success preserves every original R2 byte and metadata field');
 };
 const persistedRows=after=>{
  const space=after.tables.crm_spaces.find(row=>row.id==='demo'),rows=[{table:'crm_spaces',id:'demo',values:[space.id,space.version,space.write_token,space.settings]}];
  for(const[name,table]of Object.entries(mapping))for(const row of after.tables[table].filter(row=>row.space==='demo'))rows.push({table,id:row.id,values:[row.id,row.space,...(independent.has(name)?[]:[row.customer_id]),...(name==='orders'?[row.deal_id]:[]),row.data]});
  for(const row of after.tables.crm_mutations.filter(row=>row.space==='demo'))rows.push({table:'crm_mutations',id:row.id,values:[row.space,row.id,row.result_json,row.user_id,row.request_hash]});
  return rows.map(row=>({...row,bytes:sqliteRecordBytes(row.values)}));
 };
 const restored=async(data,response,id,before)=>{
  assert.equal(response.status,200,response.data?.error||'Actual native restore');noR2(response.trace);const after=await raw();preserve(before,after);
  const state=withoutEnvelope(response.data),expected=structuredClone(data.state);expected.version=f.version+1;expected.settings.sellerProfiles=expected.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
  const original=new Set(data.state.events.map(event=>event.id)),added=state.events.filter(event=>!original.has(event.id));assert.equal(added.length,data.state.customers.length);
  assert.equal(new Set(added.map(event=>event.customerId)).size,data.state.customers.length);
  for(const event of added){assert.equal(event.kind,'restore');assert.equal(event.dealId,'');assert.equal(event.text,'Kundens CRM-data återställd från export');assert.deepEqual(event.actor,{id:f.actor.user_id,name:f.actor.name});assert.match(event.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(event.at).toISOString(),event.at);}
  assert.deepEqual({...state,events:state.events.filter(event=>original.has(event.id))},expected,'Actual native restore preserves original Unicode/escaping, responsibility IDs, quantities and provenance; only account links detach');
  const result={customerId:data.state.customers[0]?.id,dealId:data.state.deals[0]?.id,orderId:data.state.orders[0]?.id,taskId:data.state.tasks[0]?.id,eventId:data.state.events[0]?.id||added[0]?.id},cleanResult=JSON.parse(JSON.stringify(result));assert.deepEqual(response.data.mutationResult,cleanResult,'Actual restore returns its real added-record mutationResult before persisted read ordering');
  const ledger=after.tables.crm_mutations.filter(row=>row.space==='demo');assert.equal(ledger.length,1);assert.equal(ledger[0].id,id);assert.equal(ledger[0].user_id,f.actor.user_id);assert.equal(ledger[0].request_hash,hash(JSON.stringify({type:'restore',data})));assert.deepEqual(JSON.parse(ledger[0].result_json),cleanResult,'The actual receipt preserves the real result object, actor and request hash');
  return{state,after,rows:persistedRows(after)};
 };
 const seed=async sized=>{
  f.actor.name=sized.actor.name;const q=[db.prepare('UPDATE crm_members SET name=? WHERE id=?').bind(f.actor.name,f.actor.id),db.prepare("UPDATE crm_spaces SET settings=? WHERE id='live'").bind(JSON.stringify(sized.state.settings))];
  for(const[name,table]of Object.entries(mapping))for(const row of sized.state[name]){const columns=['id','space',...(independent.has(name)?[]:['customer_id']),...(name==='orders'?['deal_id']:[]),'data'],values=[row.id,'live',...(independent.has(name)?[]:[row.customerId]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)];q.push(db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+') ON CONFLICT(space,id) DO UPDATE SET '+columns.filter(column=>!['id','space'].includes(column)).map(column=>column+'=excluded.'+column).join(',')).bind(...values));}
  await db.batch(q);const data=await dataExport('live');assert.deepEqual(data.state,sized.state,'Boundary input comes from the actual built source GET used by the existing data export');
  const normalized=restoreCore.restoreState(core.emptyState(),data);const expected=structuredClone(sized.state);expected.version=0;expected.settings.sellerProfiles=expected.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));assert.deepEqual(normalized,expected,'Synthetic boundary input passes the existing real schema and has no file references');
  const projection=dataRestoreRowProjection(data.state,{space:'demo',version:f.version,actor:{id:f.actor.user_id,name:f.actor.name}}),selected=projection.rows.find(row=>row.table===sized.selected.table&&row.id===sized.selected.id);assert.ok(selected);assert.equal(selected.bytes,sized.selected.bytes,'Actual source export reaches the independently projected final whole-row budget');return data;
 };
 const report={nativeDataRestoreRowBudget:true,legacyUnchecked:expectLegacyUnchecked,requests:0,rowLimit:ROW_BUDGET,rawTables:0,builtModules:moduleFiles.length,builtModulesSha256:originalBuiltHash,layouts:[],denied:0,exactAccepted:0,lostAcknowledgments:0,casZero:0,actorGateZero:0,actualUtf8Encoding:expectLegacyUnchecked?null:'41F09F9880',positivePrivateAndSharedOutlook:true,positiveAccountsDraftsAndR2:true,hostedProviderLimitVerified:false,hostedProductionRestoreVerified:false};
 try{
  db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');ready=await mf.ready;
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);report.rawTables=tables.length;
  for(const space of ['live','demo'])await insert('crm_spaces',{id:space,version:space==='live'?f.state.version:f.version,write_token:'SYNTHETIC-UNCHANGED',settings:JSON.stringify(space==='live'?f.state.settings:core.emptyState().settings)}).run();
  for(const[name,table]of Object.entries(mapping))for(const row of f.state[name])await insert(table,{id:row.id,space:'live',...(independent.has(name)?{}:{customer_id:row.customerId}),...(name==='orders'?{deal_id:row.dealId}:{}),data:JSON.stringify(row)}).run();
  for(const account of f.accounts)await insert('crm_members',account).run();
  for(const space of ['live','demo'])for(const account of f.accounts.slice(0,2))await insert('crm_drafts',{space,user_id:account.user_id,id:'data-row-draft-'+account.id,kind:'note',context:f.customerId,revision:3,request_id:randomUUID(),title:'Fiktivt privat utkast',data:' {"text":"'+f.secret+'"}\n',archived:space==='demo'?1:0,updated_at:f.at}).run();
  await insert('crm_mutations',{space:'live',id:randomUUID(),result_json:' {"sentinel":"private"}\n',user_id:f.actor.user_id,request_hash:'0'.repeat(64)}).run();
  for(const account of f.accounts.slice(0,2)){
   await insert('outlook_connections',{user_id:account.user_id,microsoft_id:'synthetic-ms-'+account.id,email:account.email,tokens:f.secret,last_sync:f.at,status:'error',sync_note:f.secret,lock_until:0,revision:7}).run();
   for(const shared of [0,1])await insert('outlook_items',{id:'data-row-mail-'+account.id+'-'+shared,user_id:account.user_id,kind:'mail',data:' {"body":"'+f.secret+'"}\n',customer_id:f.customerId,deal_id:'',shared,happened_at:f.at,seen_at:f.at}).run();
   await insert('outlook_oauth_states',{hash:'data-row-oauth-'+account.id,user_id:account.user_id,verifier:f.secret,expires:1999999999000}).run();
  }
  const file={id:'data-row-source-file',name:'syntetisk-utanför-dataexporten.txt',kind:'document',version:'synthetic-v1',size:5,at:f.at,uploadedBy:f.actor.user_id};
  await bucket.put('data-row-source-object',new Uint8Array([0,1,255,13,10]),{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'outside-data-export'}});await insert('crm_files',{id:file.id,space:'live',customer_id:f.customerId,object_key:'data-row-source-object',data:JSON.stringify(file)}).run();
  await bucket.put('data-row-private-r2',new TextEncoder().encode(f.secret+'\n\0 Å😀'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private-sentinel'}});
  baseline=await raw();for(const table of tables)assert.ok(baseline.tables[table].length>0,'Positive native sentinel in '+table);assert.equal(Object.keys(baseline.r2).length,2);

  if(expectLegacyUnchecked){
   const sized=dataRestoreRowFixture(core,{layout:'event',bytes:ROW_BUDGET+1,baseState:f.state,space:'demo',version:f.version,actor:{id:f.actor.user_id,name:f.actor.name}});assert.equal(physicalRecord(sized.selected.values),ROW_BUDGET+1);assert.ok(Buffer.byteLength(sized.selected.values.at(-1),'utf8')<ROW_BUDGET,'Individual JSON value fits while the whole row does not');const data=await seed(sized),before=await raw(),id=randomUUID(),response=await restore(data,{id}),after=await restored(data,response,id,before),selected=after.rows.find(row=>row.table===sized.selected.table&&row.id===sized.selected.id);assert.ok(selected);assert.equal(physicalRecord(selected.values),ROW_BUDGET+1);assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.equal(response.trace.filter(event=>event.stage==='storage_probe').length,0);report.layouts.push({layout:'event',bytes:ROW_BUDGET+1,status:200,nativePersistedRecordBytes:selected.bytes,uncheckedWholeRow:true});
  }else{
   const small=await dataExport('live'),before=await raw(),id=randomUUID(),response=await restore(small,{id,lost:true});assert.equal(response.status,503,'The existing data-only route reports a post-COMMIT transport loss as uncertain save');assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);probe(response.trace);noR2(response.trace);
   const committed=await raw();preserve(before,committed);assert.equal(committed.tables.crm_mutations.filter(row=>row.space==='demo').length,1,'Lost acknowledgment occurs after real data/audit/receipt commit');
   const replay=await restore(small,{id});assert.equal(replay.trace.length,0,'Exact lost-ACK replay returns the real stored mutationResult without another probe or write');const saved=await restored(small,replay,id,before);assert.deepEqual(saved.after,committed,'Retry does not duplicate any data, generated audit or receipt');
   const exported=await dataExport('demo');assert.deepEqual(exported.state,saved.state,'Existing data export preserves the restored complete CRM state');const copy=await call('/api/crm/backup?space=demo');assert.equal(copy.status,200);assert.deepEqual(copy.data.files,[],'Data-only restore produces no destination files');assert.deepEqual(copy.data.state,saved.state);assert.deepEqual(await raw(),committed);
   for(const options of [{id,account:f.accounts[1]},{id}]){const input=options.account?small:{...small,exportedAt:'2026-10-12T17:00:00.000Z'},r=await restore(input,options);assert.equal(r.status,409,'Receipt requires exact actor and input');assert.equal(r.trace.length,0);assert.deepEqual(await raw(),committed);}
   await reset();const deniedRoleBefore=await raw(),deniedRole=await restore(small,{account:f.accounts[2]});assert.equal(deniedRole.status,403);assert.equal(deniedRole.trace.length,0);assert.deepEqual(await raw(),deniedRoleBefore);

   for(const layout of ['event','settings','audit','order'])for(const bytes of [ROW_BUDGET+1,ROW_BUDGET]){
    await reset();const sized=dataRestoreRowFixture(core,{layout,bytes,baseState:f.state,space:'demo',version:f.version,actor:{id:f.actor.user_id,name:f.actor.name}});assert.equal(physicalRecord(sized.selected.values),bytes);const data=await seed(sized),before=await raw(),id=randomUUID(),response=await restore(data,{id});probe(response.trace);noR2(response.trace);
    if(bytes>ROW_BUDGET){assert.equal(response.status,400,response.data?.error||layout+' overflow');assert.deepEqual(Object.keys(response.data),['error']);assert.match(response.data.error,/2 000 000/);assert.equal(response.trace.filter(event=>event.stage.startsWith('commit_')).length,0,'Encoded '+layout+' overflow is denied before any real D1 transaction');assert.deepEqual(await raw(),before,'Overflow preserves all 18 raw tables and every R2 object');report.denied++;report.layouts.push({layout,bytes,status:400,beforeCommit:true});}
    else{const saved=await restored(data,response,id,before),selected=saved.rows.filter(row=>row.table===sized.selected.table&&(layout==='audit'?JSON.parse(row.values.at(-1)).kind==='restore':row.id===sized.selected.id)).sort((a,b)=>b.bytes-a.bytes)[0];assert.ok(selected,'Native selected '+layout+' row is persisted');assert.equal(physicalRecord(selected.values),ROW_BUDGET,'The actual native persisted row reaches the inclusive whole-record boundary');assert.ok(saved.rows.every(row=>row.bytes<=ROW_BUDGET),'Every actual persisted CRM record including real receipt fits the whole-row cap');assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);const exported=await dataExport('demo');assert.deepEqual(exported.state,saved.state,'Exact '+layout+' boundary survives native data re-export');const replay=await restore(data,{id});assert.equal(replay.status,200);assert.equal(replay.trace.length,0);assert.deepEqual(replay.data,response.data);assert.deepEqual(await raw(),saved.after,'Exact-bound replay preserves all tables and R2');report.exactAccepted++;report.layouts.push({layout,bytes,status:200,nativePersistedRecordBytes:selected.bytes,receiptResultPreserved:true});}
   }
   await reset();let raced;interleave=async()=>{await db.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='demo'").run();raced=await raw();};const cas=await restore(small);assert.equal(cas.status,409);probe(cas.trace);noR2(cas.trace);assert.equal(cas.trace.filter(event=>event.stage==='commit_after'&&event.changes===0).length,1);assert.deepEqual(await raw(),raced,'Actual native CAS loser writes no data, generated audits, receipt or settings');casZero++;
   await reset();let revoked;interleave=async()=>{await db.prepare('UPDATE crm_members SET active=0 WHERE id=?').bind(f.actor.id).run();revoked=await raw();};const gate=await restore(small);assert.equal(gate.status,403);probe(gate.trace);noR2(gate.trace);assert.equal(gate.trace.filter(event=>event.stage==='commit_after'&&event.changes===0).length,1);assert.deepEqual(await raw(),revoked,'Actual actor authorization gate prevents all restore writes after account revocation');actorGateZero++;
   report.realLostAck503ThenReplay200=true;report.exactReplayNoWritesOrProbe=true;report.actualReceiptActorHashAndResult=true;report.dataExportWithoutFilesOrPrivateData=true;report.originalSellerProfileIdsPreservedAndAccountLinksDetached=true;
  }
  assert.equal(builtHash(),originalBuiltHash,'All built application modules remain byte-for-byte unchanged');report.requests=requests;report.lostAcknowledgments=lostAcks;report.casZero=casZero;report.actorGateZero=actorGateZero;return report;
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Native harness leaves the built modules unchanged even on failure');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native data-only restore row budget: '+JSON.stringify(await assertNativeDataRestoreRowBudget()));
