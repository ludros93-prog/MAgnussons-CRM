import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// The entry forwards the unmodified built application to actual native D1/R2.
// Request-local observation proves that rejected preflights never stage a file
// or attempt a transaction. The lost acknowledgment is thrown only AFTER the
// real D1 batch has committed; no SQL result or application module is patched.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap();
 const observe=async(stage,details={})=>{
  const response=await env.PREFLIGHT_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({stage,...details})});
  if(!response.ok)throw Error('Synthetic backup observation failed');
  if(response.headers.get('X-Synthetic-Lost-Ack')==='1')throw Error('Synthetic acknowledgment lost after native COMMIT');
 };
 const wrap=(native,sql)=>{const statement={bind(...values){return wrap(native.bind(...values),sql)},first(...args){return native.first(...args)},all(...args){return native.all(...args)},run(...args){return native.run(...args)},raw(...args){return native.raw(...args)}};statements.set(statement,{native,sql});return statement;};
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

const sha256=value=>createHash('sha256').update(value).digest('hex');
const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const withoutViewer=({viewer:_,...state})=>state;

function fixture(core,ops){
 const at='2026-10-09T10:00:00.000Z',today='2026-10-09',owner='Syntetiskt backupansvar',profileId=randomUUID(),privateSecret='SYNTHETIC PRIVATE BACKUP SENTINEL '+randomUUID();
 const accounts=['admin','seller','reader','production','print','warehouse'].map(role=>({id:'preflight-member-'+role,user_id:'preflight-user-'+role,email:'preflight-'+role+'@example.test',name:'Syntetiskt konto '+role,role,owner:role==='seller'?owner:'',active:1}));
 const actor=accounts[0],seller=accounts[1],customerId='preflight-customer-a',otherId='preflight-customer-b',dealId='preflight-deal',orderId='preflight-order',workId='preflight-work',oldWorkId='preflight-old-work',proofId='preflight-proof',photoId='preflight-photo',logoId='preflight-logo';
 const state=core.emptyState();state.version=23;state.settings.owners=[owner];state.settings.sellerProfilesInitialized=true;
 state.settings.sellerProfiles=[{id:profileId,legacyOwnerName:owner,displayName:'Syntetisk säljarprofil',memberId:seller.id,active:true,linkHistory:[]}];
 state.settings.sellerGoalsById[profileId]={'2026-10':{revenue:10000,grossProfit:4000,qualified:4}};
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Syntetisk återställningskund A',owner,ownerProfileId:profileId,status:'active',contact:'Syntetisk kontakt',plan:{goal:'Bevara verklig syntetisk kundplan'}}),core.CustomerSchema.parse({id:otherId,name:'Syntetisk återställningskund B',owner,ownerProfileId:profileId})];
 const line={id:'preflight-line',kind:'product',description:'Syntetisk provprodukt',quantity:2,unitPrice:100,unitCost:60};
 state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,ownerProfileId:profileId,title:'Syntetisk orderaffär',stage:'won',confirmed:true,value:200,cost:120,lines:[line],repeatRecipe:{sourceOrderId:orderId,sourceWorkId:oldWorkId,instructions:'Syntetiskt tidigare underlag',sketchFileId:proofId,sketchVersion:'preflight-v1'}})];
 state.orders=[core.OrderSchema.parse({id:orderId,customerId,dealId,owner,ownerProfileId:profileId,stage:'production',proofRequired:true,proofApproved:true,proofFileId:proofId,proofVersion:'preflight-v1',approvedBy:'Syntetiskt kundgodkännande',approvedDate:today,supplierConfirmed:true,deliveryDate:today,deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Syntetiskt fryst orderunderlag',production:{status:'submitted',workId,quantityMode:'lines',lines:[line],sketchFileId:proofId,sketchVersion:'preflight-v1',movements:[{id:'preflight-received',kind:'received',entries:[{lineId:line.id,quantity:2}],at,by:actor.name,reason:''},{id:'preflight-printed',kind:'printed',entries:[{lineId:line.id,quantity:1}],at,by:actor.name,reason:''}]},productionHistory:[{status:'cancelled',workId:oldWorkId,quantityMode:'lines',lines:[line],sketchFileId:proofId,sketchVersion:'preflight-v1',cancellationReason:'Syntetiskt arkiverat underlag'}]})];
 state.tasks=[core.TaskSchema.parse({id:'preflight-task',customerId,dealId,owner,ownerProfileId:profileId,title:'Syntetisk kvarvarande uppgift',due:today})];
 state.meetings=[core.MeetingSchema.parse({id:'preflight-meeting',customerId,owner,ownerProfileId:profileId,title:'Syntetiskt kundmöte',date:today,time:'10:00',duration:30})];
 state.events=[{id:'preflight-event-a',customerId,dealId:'',kind:'note',at,text:'Syntetisk ursprunglig anteckning A',actor:{id:seller.user_id,name:seller.name}},{id:'preflight-event-b',customerId:otherId,dealId:'',kind:'note',at,text:'Syntetisk ursprunglig anteckning B'}];
 state.articles=[ops.ArticleSchema.parse({id:'preflight-article',sourceId:'current',sku:'SYNTHETIC-BACKUP',name:'Syntetisk katalogpost',price:100,cost:60})];
 state.notices=[ops.NoticeSchema.parse({id:'preflight-notice',customerId,orderId,title:'Syntetisk befintlig notis',audience:'seller',owner,at,readBy:[seller.user_id]})];
 state.leads=[ops.LeadSchema.parse({id:'preflight-lead',name:'Syntetiskt oberoende prospekt',source:'Isolerat backup-prov'})];
 state.companyEvents=[ops.CompanyEventSchema.parse({id:'preflight-company-event',title:'Syntetiskt företagsevent',owner,ownerProfileId:profileId,date:today})];
 const files=[
  {id:proofId,name:'syntetiskt-korrektur.pdf',kind:'proof',bytes:new TextEncoder().encode('%PDF-1.7\nSyntetiskt korrektur åäö\n')},
  {id:photoId,name:'syntetiskt-arbetsfoto.png',kind:'document',bytes:new Uint8Array([137,80,78,71,13,10,26,10,0,255,31,127]),purpose:'production',orderId,workId},
  {id:logoId,name:'syntetisk-logotyp.bin',kind:'logo',bytes:new Uint8Array([0,1,2,128,254,255,0,13,10])}
 ].map(file=>({customerId,objectKey:'preflight-source/'+file.id,bytes:file.bytes,metadata:{id:file.id,name:file.name,kind:file.kind,version:'preflight-v1',size:file.bytes.length,at,uploadedBy:actor.user_id,...(file.purpose?{purpose:file.purpose,orderId:file.orderId,workId:file.workId}:{})}}));
 return{state,accounts,actor,customerId,otherId,at,privateSecret,files,destinationVersion:7};
}

function parseStream(text){
 const records=text.trimEnd().split('\n'),header=JSON.parse(records[0]),end=JSON.parse(records.at(-1));
 assert.equal(header.type,'header');assert.equal(header.format,'magnussons-crm-backup-2');assert.equal(end.type,'end');
 let digest=sha256(records[0]),bytes=0;
 const files=records.slice(1,-1).map((line,index)=>{
  const record=JSON.parse(line),file=header.files[index],content=Buffer.from(record.content,'base64');
  assert.equal(record.type,'file');assert.equal(record.id,file.metadata.id);assert.equal(content.length,file.metadata.size);assert.equal(sha256(content),record.sha256);assert.equal(content.toString('base64'),record.content);
  digest=sha256(digest+':'+sha256(line));bytes+=content.length;return{...file,content:record.content,sha256:record.sha256};
 });
 assert.equal(end.files,header.files.length);assert.equal(files.length,header.files.length);assert.equal(end.bytes,bytes);assert.equal(end.sha256,digest,'The native stream and any altered fixture have a valid complete digest');
 return{backup:{...header,files},records};
}

function changeStreamHeader(text,change){
 const {records}=parseStream(text),header=JSON.parse(records[0]);change(header);records[0]=JSON.stringify(header);
 let digest=sha256(records[0]);for(const line of records.slice(1,-1))digest=sha256(digest+':'+sha256(line));
 records[records.length-1]=JSON.stringify({...JSON.parse(records.at(-1)),sha256:digest});
 const altered=records.join('\n')+'\n';parseStream(altered);return altered;
}

export async function assertNativeBackupRestorePreflight(){
 const root=fileURLToPath(new URL('../',import.meta.url)),serverRoot=root+'dist/server',core=await import('../work/core.mjs'),ops=await import('../work/operations.mjs');
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>sha256(moduleFiles.map(file=>file+'\0'+sha256(readFileSync(serverRoot+'/'+file))).join('\n')),originalBuiltHash=builtHash();
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-backup-preflight-')),f=fixture(core,ops);
 let db,bucket,ready,tables,baseline,trace=[],loseAcknowledgment=false,requests=0,lostAcknowledgments=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__backup_restore_preflight_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'backup-restore-preflight'},r2Buckets:{BUCKET:'backup-restore-preflight'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{PREFLIGHT_OBSERVER:async request=>{const event=await request.json();trace.push(event);if(loseAcknowledgment&&event.stage==='commit_after'&&event.changes===1){loseAcknowledgment=false;lostAcknowledgments++;return new Response(null,{status:204,headers:{'X-Synthetic-Lost-Ack':'1'}});}return new Response(null,{status:204});}}});
 const who=account=>({'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email});
 const raw=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async row=>{const object=await bucket.get(row.key);return[row.key,{size:object.size,sha256:sha256(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const reset=async()=>{
  loseAcknowledgment=false;const order=['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders',...tables.filter(table=>!['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders'].includes(table))],q=order.toReversed().map(table=>db.prepare('DELETE FROM '+table));
  for(const table of order)for(const row of baseline.tables[table]){const columns=Object.keys(row);q.push(db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind(...columns.map(column=>row[column])));}
  await db.batch(q);for(const row of (await bucket.list()).objects)if(!Object.hasOwn(baseline.r2,row.key))await bucket.delete(row.key);
  assert.deepEqual(await raw(),baseline,'Owned synthetic reset restores all 18 tables and original R2 bytes/metadata');
 };
 const call=async(path,{body,contentType='application/json',account=f.actor,lostAck=false}={})=>{
  trace=[];loseAcknowledgment=lostAck;requests++;const url=new URL(path,ready);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{...who(account),'Accept-Encoding':'identity',...(body===undefined?{}:{'Content-Type':contentType,Origin:url.origin})},...(body===undefined?{}:{body})}),bytes=new Uint8Array(await response.arrayBuffer()),text=new TextDecoder().decode(bytes);let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,bytes,headers:response.headers,trace:[...trace]};}finally{loseAcknowledgment=false;}
 };
 const exported=async(space,format)=>{
  const r=await call('/api/crm/backup?space='+space+(format==='stream'?'&format=stream':''));assert.equal(r.status,200,r.text);assert.ok(!r.text.includes(f.privateSecret),'CRM copies exclude positive private and Outlook sentinels');
  if(format==='stream'){assert.equal(r.headers.get('Content-Type'),'application/x-ndjson');assert.equal(Number(r.headers.get('Content-Length')),r.bytes.byteLength,'The listening built Worker declares the exact native stream length');return{...r,backup:parseStream(r.text).backup};}
  assert.equal(r.data.format,'magnussons-crm-backup-1');for(const file of r.data.files){const bytes=Buffer.from(file.content,'base64');assert.equal(bytes.length,file.metadata.size);assert.equal(sha256(bytes),file.sha256);}return{...r,backup:r.data};
 };
 const restore=(format,input,{requestId=randomUUID(),version=f.destinationVersion,account=f.actor,lostAck=false}={})=>format==='stream'?call('/api/crm/backup?space=demo&version='+version+'&requestId='+requestId,{body:input,contentType:'application/x-ndjson',account,lostAck}):call('/api/crm/backup',{body:JSON.stringify({space:'demo',version,requestId,backup:input}),account,lostAck});
 const unchanged=async(before,label)=>assert.deepEqual(await raw(),before,label+' preserves all 18 raw native tables and every R2 object');
 const rejected=async(format,input,{status=400,...options}={})=>{const before=await raw(),r=await restore(format,input,options);assert.equal(r.status,status,r.text);assert.deepEqual(Object.keys(r.data),['error']);assert.equal(r.trace.length,0,'Rejected '+format+' preflight never puts/deletes an R2 object or attempts a CRM commit');await unchanged(before,'Rejected '+format+' preflight');return r;};
 const isolation=(before,after)=>{
  for(const table of tables){if(['crm_members','crm_drafts',...tables.filter(name=>name.startsWith('outlook_'))].includes(table))assert.deepEqual(after.tables[table],before.tables[table],table+' private/account sentinel');else{const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' source/unrelated rows');}}
  for(const [key,value] of Object.entries(before.r2))assert.deepEqual(after.r2[key],value,'Source and unrelated R2 sentinel '+key);
  const restoredFiles=after.tables.crm_files.filter(row=>row.space==='demo');assert.equal(restoredFiles.length,f.files.length);assert.deepEqual(Object.keys(after.r2).filter(key=>!Object.hasOwn(before.r2,key)).sort(),restoredFiles.map(row=>row.object_key).sort(),'Only committed destination files are added to R2');
 };
 const assertRestored=async(source,result,requestId)=>{
  const next=withoutViewer(result),expected=structuredClone(source.state),rows=(await raw()).tables.crm_files.filter(row=>row.space==='demo'),idMap=new Map();
  for(const file of source.files){const row=rows.find(row=>JSON.parse(row.data).name===file.metadata.name);assert.ok(row);const metadata=JSON.parse(row.data);assert.notEqual(row.id,file.metadata.id);assert.equal(row.customer_id,file.customerId);assert.equal(row.object_key,'demo/'+file.customerId+'/'+row.id);assert.deepEqual(metadata,{...file.metadata,id:row.id});idMap.set(file.metadata.id,row.id);const object=await bucket.get(row.object_key);assert.equal(sha256(new Uint8Array(await object.arrayBuffer())),file.sha256);}
  expected.version=f.destinationVersion+1;expected.settings.sellerProfiles=expected.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
  for(const order of expected.orders){order.proofFileId=idMap.get(order.proofFileId);for(const production of [order.production,...order.productionHistory])production.sketchFileId=idMap.get(production.sketchFileId);}
  for(const deal of expected.deals)if(deal.repeatRecipe)deal.repeatRecipe.sketchFileId=idMap.get(deal.repeatRecipe.sketchFileId);
  const sourceIds=new Set(source.state.events.map(event=>event.id)),added=next.events.filter(event=>!sourceIds.has(event.id));assert.equal(added.length,source.state.customers.length);assert.equal(new Set(added.map(event=>event.customerId)).size,source.state.customers.length);
  for(const event of added){assert.equal(event.kind,'restore');assert.equal(event.dealId,'');assert.equal(event.text,'CRM-data och kundfiler återställda från kopia daterad '+source.exportedAt);assert.deepEqual(event.actor,{id:f.actor.user_id,name:f.actor.name});assert.match(event.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(event.at).toISOString(),event.at);}
  assert.deepEqual({...next,events:next.events.filter(event=>sourceIds.has(event.id))},expected,'All CRM data, quantities, approved proof, archived sketch, recipe and seller history survive except remapped files and detached account links');
  const photo=rows.map(row=>JSON.parse(row.data)).find(file=>file.purpose==='production');assert.equal(photo.orderId,next.orders[0].id);assert.equal(photo.workId,next.orders[0].production.workId);
  const ledger=(await db.prepare('SELECT * FROM crm_mutations WHERE space=? AND id=?').bind('demo',requestId).all()).results;assert.equal(ledger.length,1);assert.equal(ledger[0].user_id,f.actor.user_id);assert.match(ledger[0].request_hash,/^[a-f0-9]{64}$/);return next;
 };
 try{
  db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');ready=await mf.ready;
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
  for(const space of ['live','demo'])await db.prepare('INSERT INTO crm_spaces(id,version,write_token,settings)VALUES(?,?,?,?)').bind(space,space==='live'?f.state.version:f.destinationVersion,'',JSON.stringify(space==='live'?f.state.settings:core.emptyState().settings)).run();
  for(const [name,table] of Object.entries(mapping))for(const row of f.state[name]){const independent=['customers','articles','notices','leads','companyEvents'].includes(name),columns=['space','id',...(independent?[]:['customer_id']),...(name==='orders'?['deal_id']:[]),'data'];await db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind('live',row.id,...(independent?[]:[row.customerId]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)).run();}
  for(const account of f.accounts)await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,?)').bind(account.id,account.email,account.user_id,account.name,account.role,account.owner,account.active).run();
  for(const space of ['live','demo'])for(const account of f.accounts.slice(0,2))await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(space,account.user_id,'preflight-draft-'+account.id,'note',f.customerId,3,randomUUID(),'Syntetiskt privat underlag',' {"text":"'+f.privateSecret+'"}\n',space==='demo'?1:0,f.at).run();
  await db.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash)VALUES(?,?,?,?,?)').bind('live',randomUUID(),' {"synthetic":"sentinel"}\n',f.actor.user_id,'0'.repeat(64)).run();
  for(const account of f.accounts.slice(0,2)){
   await db.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync,status,sync_note,lock_until,revision)VALUES(?,?,?,?,?,?,?,?,?)').bind(account.user_id,'synthetic-ms-'+account.id,account.email,f.privateSecret,f.at,'error',f.privateSecret,0,7).run();
   for(const shared of [0,1])await db.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,deal_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?,?)').bind('preflight-mail-'+account.id+'-'+shared,account.user_id,'mail',' {"body":"'+f.privateSecret+'"}\n',f.customerId,'',shared,f.at,f.at).run();
   await db.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').bind('preflight-oauth-'+account.id,account.user_id,f.privateSecret,1999999999000).run();
  }
  for(const file of f.files){await bucket.put(file.objectKey,file.bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'backup-preflight-source'}});await db.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').bind(file.metadata.id,'live',file.customerId,file.objectKey,JSON.stringify(file.metadata)).run();}
  await bucket.put('preflight-unrelated-r2-sentinel',new TextEncoder().encode(f.privateSecret+'\n\0 åäö'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'unrelated-private-sentinel'}});
  baseline=await raw();for(const table of tables)assert.ok(baseline.tables[table].length>0,'A positive raw sentinel must exist in '+table);assert.equal(Object.keys(baseline.r2).length,4);

  const originals={json:await exported('live','json'),stream:await exported('live','stream')};await unchanged(baseline,'Native source exports');
  const oversizedAt='2026-10-09T10:00:00.000Z'+'x'.repeat(50000);
  for(const format of ['json','stream']){
   const original=originals[format],input=format==='json'?{...original.backup,exportedAt:oversizedAt}:changeStreamHeader(original.text,header=>{header.exportedAt=oversizedAt});
   await rejected(format,input);
   for(const account of f.accounts.slice(1))await rejected(format,format==='json'?original.backup:original.text,{account,status:403});
   await rejected(format,format==='json'?original.backup:original.text,{version:f.destinationVersion-1});
  }

  for(const format of ['json','stream']){
   await reset();const original=originals[format],input=format==='json'?original.backup:original.text,requestId=randomUUID(),before=await raw(),lostBefore=lostAcknowledgments,r=await restore(format,input,{requestId,lostAck:true});
   assert.equal(r.status,200,r.text);assert.equal(lostAcknowledgments,lostBefore+1,'One acknowledgment is lost after the actual '+format+' D1 transaction');assert.equal(r.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.equal(r.trace.filter(event=>event.stage==='r2_put').length,f.files.length);assert.equal(r.trace.filter(event=>event.stage==='r2_delete').length,0,'Committed files survive a lost native transaction acknowledgment');
   const state=await assertRestored(original.backup,r.data,requestId),after=await raw();isolation(before,after);
   for(const reexportFormat of ['json','stream']){const copy=await exported('demo',reexportFormat);assert.deepEqual(copy.backup.state,state,'Accepted '+format+' restoration immediately re-exports as valid '+reexportFormat);for(const file of copy.backup.files){const source=original.backup.files.find(source=>source.metadata.name===file.metadata.name);assert.equal(file.content,source.content);assert.equal(file.sha256,source.sha256);assert.notEqual(file.metadata.id,source.metadata.id);}}
   await unchanged(after,'Native re-export');const replay=await restore(format,input,{requestId});assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.data,r.data);assert.equal(replay.trace.length,0,'Exact '+format+' replay never stages, deletes or commits');await unchanged(after,'Exact native '+format+' replay');
  }

  // Seed 50,000 valid source events with one native SQL statement. Native
  // successful commits stay small above; the high-capacity case tests only a
  // genuine native server export and its bounded, pre-staging rejection.
  await reset();await db.prepare('DELETE FROM crm_events WHERE space=?').bind('live').run();await db.prepare('DELETE FROM crm_customers WHERE space=? AND id=?').bind('live',f.otherId).run();
  await db.prepare("WITH RECURSIVE sequence(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM sequence WHERE n<49999) INSERT INTO crm_events(space,id,customer_id,data) SELECT ?, 'preflight-capacity-'||n, ?, json_object('id','preflight-capacity-'||n,'customerId',?,'dealId','','kind','note','at',?,'text','Syntetisk kapacitet') FROM sequence").bind('live',f.customerId,f.customerId,f.at).run();
  const capacityBefore=await raw();assert.equal(capacityBefore.tables.crm_events.filter(row=>row.space==='live').length,50000);assert.equal(capacityBefore.tables.crm_customers.filter(row=>row.space==='live').length,1);
  for(const format of ['json','stream']){const source=await exported('live',format);assert.equal(source.backup.state.events.length,50000);assert.equal(source.backup.state.customers.length,1);await unchanged(capacityBefore,'Valid native 50,000-event '+format+' export');await rejected(format,format==='json'?source.backup:source.text);}
  return{backupPreflightNativeBuiltListeningHTTP:true,backupPreflightUnchangedBuiltModules:true,backupPreflightPositive18RawTablesPrivateOutlookAccountsAndR2:true,backupPreflightOversizeTimestampBothFormatsBeforeStaging:true,backupPreflightValidAlteredStreamDigest:true,backupPreflightNative50000EventSourceExportBothFormats:true,backupPreflightCapacityBothFormatsBeforeStaging:true,backupPreflightNormalBothFormatsRemappedProofPhotoArchivedSketchAndRecipe:true,backupPreflightBothFormatsReexportBothFormats:true,backupPreflightDetachedSellerAccountLinks:true,backupPreflightBothFormatsLostNativeCommitAcknowledgment:true,backupPreflightExactReplayNoWrites:true,backupPreflightRolesAndVersionGates:true,backupPreflightNativeRequests:requests,backupPreflightNativeLostAcknowledgments:lostAcknowledgments,backupPreflightBuiltModuleSha256:originalBuiltHash};
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Native verification leaves every built application module byte-identical');}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native backup restore preflight: '+JSON.stringify(await assertNativeBackupRestorePreflight()));
