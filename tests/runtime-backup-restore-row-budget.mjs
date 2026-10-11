import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// The entry forwards the unmodified built application to actual native D1/R2.
// Request-local observation proves that rejected row checks never stage a file
// or attempt a transaction. The lost acknowledgment is thrown only AFTER the
// real D1 batch has committed; no SQL result or application module is patched.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap();
 const observe=async(stage,details={})=>{
  const response=await env.ROW_BUDGET_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({stage,...details})});
  if(!response.ok)throw Error('Synthetic backup observation failed');
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

const sha256=value=>createHash('sha256').update(value).digest('hex');
const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const withoutViewer=({viewer:_,...state})=>state;

function fixture(core,ops){
 const at='2026-10-09T10:00:00.000Z',today='2026-10-09',owner='Syntetiskt backupansvar',profileId=randomUUID(),privateSecret='SYNTHETIC PRIVATE BACKUP SENTINEL '+randomUUID();
 const accounts=['admin','seller','reader','production','print','warehouse'].map(role=>({id:'row-budget-member-'+role,user_id:'row-budget-user-'+role,email:'row-budget-'+role+'@example.test',name:'Syntetiskt konto '+role,role,owner:role==='seller'?owner:'',active:1}));
 accounts[0].name='Syntetisk återställare Å🔷';const actor=accounts[0],seller=accounts[1],customerId='row-budget-customer-a',otherId='row-budget-customer-b',dealId='row-budget-deal',orderId='row-budget-order',workId='row-budget-work',oldWorkId='row-budget-old-work',proofId='p',photoId='f',logoId='l';
 const state=core.emptyState();state.version=9;state.settings.owners=[owner];state.settings.sellerProfilesInitialized=true;
 state.settings.sellerProfiles=[{id:profileId,legacyOwnerName:owner,displayName:'Syntetisk säljarprofil',memberId:seller.id,active:true,linkHistory:[]}];
 state.settings.sellerGoalsById[profileId]={'2026-10':{revenue:10000,grossProfit:4000,qualified:4}};
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Syntetisk återställningskund A',owner,ownerProfileId:profileId,status:'active',contact:'Syntetisk kontakt',plan:{goal:'Bevara verklig syntetisk kundplan'}}),core.CustomerSchema.parse({id:otherId,name:'Syntetisk återställningskund B',owner,ownerProfileId:profileId})];
 const line={id:'row-budget-line',kind:'product',description:'Syntetisk provprodukt',quantity:2,unitPrice:100,unitCost:60};
 state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,ownerProfileId:profileId,title:'Syntetisk orderaffär',stage:'won',confirmed:true,value:200,cost:120,lines:[line],repeatRecipe:{sourceOrderId:orderId,sourceWorkId:oldWorkId,instructions:'Syntetiskt tidigare underlag',sketchFileId:proofId,sketchVersion:'row-budget-v1'}})];
 state.orders=[core.OrderSchema.parse({id:orderId,customerId,dealId,owner,ownerProfileId:profileId,stage:'production',proofRequired:true,proofApproved:true,proofFileId:proofId,proofVersion:'row-budget-v1',approvedBy:'Syntetiskt kundgodkännande',approvedDate:today,supplierConfirmed:true,deliveryDate:today,deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Syntetiskt fryst orderunderlag',production:{status:'submitted',workId,quantityMode:'lines',lines:[line],sketchFileId:proofId,sketchVersion:'row-budget-v1',movements:[{id:'row-budget-received',kind:'received',entries:[{lineId:line.id,quantity:2}],at,by:actor.name,reason:''},{id:'row-budget-printed',kind:'printed',entries:[{lineId:line.id,quantity:1}],at,by:actor.name,reason:''}]},productionHistory:[{status:'cancelled',workId:oldWorkId,quantityMode:'lines',lines:[line],sketchFileId:proofId,sketchVersion:'row-budget-v1',cancellationReason:'Syntetiskt arkiverat underlag'}]})];
 state.tasks=[core.TaskSchema.parse({id:'row-budget-task',customerId,dealId,owner,ownerProfileId:profileId,title:'Syntetisk kvarvarande uppgift',due:today})];
 state.meetings=[core.MeetingSchema.parse({id:'row-budget-meeting',customerId,owner,ownerProfileId:profileId,title:'Syntetiskt kundmöte',date:today,time:'10:00',duration:30})];
 state.events=[{id:'row-budget-event-a',customerId,dealId:'',kind:'note',at,text:'Syntetisk ursprunglig anteckning A',actor:{id:seller.user_id,name:seller.name}},{id:'row-budget-event-b',customerId:otherId,dealId:'',kind:'note',at,text:'Syntetisk ursprunglig anteckning B'}];
 state.articles=[ops.ArticleSchema.parse({id:'row-budget-article',sourceId:'current',sku:'SYNTHETIC-BACKUP',name:'Syntetisk katalogpost',price:100,cost:60})];
 state.notices=[ops.NoticeSchema.parse({id:'row-budget-notice',customerId,orderId,title:'Syntetisk befintlig notis',audience:'seller',owner,at,readBy:[seller.user_id]})];
 state.leads=[ops.LeadSchema.parse({id:'row-budget-lead',name:'Syntetiskt oberoende prospekt',source:'Isolerat backup-prov'})];
 state.companyEvents=[ops.CompanyEventSchema.parse({id:'row-budget-company-event',title:'Syntetiskt företagsevent',owner,ownerProfileId:profileId,date:today})];
 const files=[
  {id:proofId,name:'syntetiskt-korrektur.pdf',kind:'proof',bytes:new TextEncoder().encode('%PDF-1.7\nSyntetiskt korrektur åäö\n')},
  {id:photoId,name:'syntetiskt-arbetsfoto.png',kind:'document',bytes:new Uint8Array([137,80,78,71,13,10,26,10,0,255,31,127]),purpose:'production',orderId,workId},
  {id:logoId,name:'syntetisk-logotyp.bin',kind:'logo',bytes:new Uint8Array([0,1,2,128,254,255,0,13,10])}
 ].map(file=>({customerId,objectKey:'row-budget-source/'+file.id,bytes:file.bytes,metadata:{id:file.id,name:file.name,kind:file.kind,version:'row-budget-v1',size:file.bytes.length,at,uploadedBy:actor.user_id,...(file.purpose?{purpose:file.purpose,orderId:file.orderId,workId:file.workId}:{})}}));
 return{state,accounts,actor,customerId,otherId,at,privateSecret,files,destinationVersion:9};
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

// This oracle computes SQLite record payloads independently of the product
// helper. It includes serial-type/header varints, indexed columns and UTF-8.
const ROW_LIMIT=2000000,UUID='11111111-1111-4111-8111-111111111111';
const varintBytes=value=>{let n=1;while(value>127&&n<9){value=Math.floor(value/128);n++;}return n;};
function recordBytes(values){
 const serials=values.map(value=>{
  if(value===null||value===undefined)return{type:0,bytes:0};
  if(typeof value==='string'){const bytes=Buffer.byteLength(value,'utf8');return{type:13+2*bytes,bytes};}
  if(value instanceof Uint8Array)return{type:12+2*value.byteLength,bytes:value.byteLength};
  assert.equal(typeof value,'number');if(value===0||value===1)return{type:8+value,bytes:0};
  if(!Number.isInteger(value))return{type:7,bytes:8};
  const bytes=value>=-128&&value<=127?1:value>=-32768&&value<=32767?2:value>=-8388608&&value<=8388607?3:value>=-2147483648&&value<=2147483647?4:value>=-140737488355328&&value<=140737488355327?6:8;return{type:bytes===6?5:bytes===8?6:bytes,bytes};
 });
 const serialBytes=serials.reduce((sum,value)=>sum+varintBytes(value.type),0);let header=serialBytes+1;
 while(header!==serialBytes+varintBytes(header))header=serialBytes+varintBytes(header);
 return header+serials.reduce((sum,value)=>sum+value.bytes,0);
}
const byteLength=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const header=(backup,state=backup.state,files=backup.files,space=backup.sourceSpace,at=backup.exportedAt)=>({type:'header',format:'magnussons-crm-backup-2',exportedAt:at,sourceSpace:space,state,files:files.map(file=>({customerId:file.customerId,metadata:file.metadata}))});
function projectedRows(backup,f,{remap=true,audit=true}={}){
 const space='demo',state=structuredClone(backup.state),files=structuredClone(backup.files);
 state.settings.sellerProfiles=state.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
 if(audit)state.events.push(...state.customers.map((customer,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),customerId:customer.id,dealId:'',kind:'restore',at:f.at,text:'CRM-data och kundfiler återställda från kopia daterad '+backup.exportedAt,actor:{id:f.actor.user_id,name:f.actor.name}})));
 if(remap){const ids=new Map(files.map((file,i)=>[file.metadata.id,'11111111-1111-4111-8111-'+String(i).padStart(12,'0')]));
  for(const order of state.orders){if(order.proofFileId)order.proofFileId=ids.get(order.proofFileId);for(const production of [order.production,...order.productionHistory])if(production.sketchFileId)production.sketchFileId=ids.get(production.sketchFileId);}
  for(const deal of state.deals)if(deal.repeatRecipe?.sketchFileId)deal.repeatRecipe.sketchFileId=ids.get(deal.repeatRecipe.sketchFileId);
  for(const file of files)file.metadata={...file.metadata,id:ids.get(file.metadata.id)};
 }
 const rows=[{table:'crm_spaces',id:space,values:[space,f.destinationVersion+1,UUID,JSON.stringify(state.settings)]}];
 for(const [name,table] of Object.entries(mapping))for(const row of state[name])rows.push({table,id:row.id,values:[row.id,space,...(['customers','articles','notices','leads','companyEvents'].includes(name)?[]:[row.customerId]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)]});
 for(const file of files){const id=file.metadata.id;rows.push({table:'crm_files',id,values:[id,space,file.customerId,space+'/'+file.customerId+'/'+id,JSON.stringify(file.metadata)]});}
 rows.push({table:'crm_mutations',id:UUID,values:[space,UUID,'{}',f.actor.user_id,'0'.repeat(64)]});
 return rows.map(row=>({...row,bytes:recordBytes(row.values),textBytes:row.values.filter(value=>typeof value==='string').map(value=>Buffer.byteLength(value,'utf8'))}));
}
function paddedArchive(source,f,layout,bytes){
 const backup=structuredClone(source);backup.exportedAt=f.at;const actor={...f.actor},context={...f,actor},slots=[];
 const seed='Syntetisk Å🔷 UTF-8 och JSON "\\\nZ';
 if(layout==='audit'){
  actor.name=seed;slots.push({get:()=>actor.name,set:value=>actor.name=value,max:ROW_LIMIT+1000});
 }else if(layout==='settings'){
  let key=seed;backup.state.settings.sellerAnnualGoals={[key]:{'2026':0}};
  slots.push({get:()=>key,set:value=>{key=value;backup.state.settings.sellerAnnualGoals={[key]:{'2026':0}}},max:ROW_LIMIT+1000});
 }else if(layout==='file'){
  const file=backup.files.find(file=>file.metadata.id==='p');file.metadata.uploadedBy=seed;
  slots.push({get:()=>file.metadata.uploadedBy,set:value=>file.metadata.uploadedBy=value,max:ROW_LIMIT+1000});
 }else if(layout==='event'){
  const event=backup.state.events[0];event.note={title:seed,meetingDate:'',sourceFiles:[]};
  slots.push({get:()=>event.note.title,set:value=>event.note.title=value,max:ROW_LIMIT+1000});
 }else if(layout==='order'){
  const order=backup.state.orders[0],first=order.production.lines[0];
  order.production.lines=Array.from({length:100},(_,i)=>({...first,id:i?first.id+'-'+i:first.id,sourceId:seed,article:'',variant:''}));
  order.productionHistory=Array.from({length:100},(_,i)=>({...structuredClone(order.productionHistory[0]),workId:order.productionHistory[0].workId+'-'+i,instructions:seed,deliveryAddress:{...order.productionHistory[0].deliveryAddress,street:''}}));
  // The genuine archived recipe keeps its source work ID.
  order.productionHistory[0].workId=backup.state.deals[0].repeatRecipe.sourceWorkId;
  for(const line of order.production.lines)for(const field of ['sourceId','article','variant'])slots.push({get:()=>line[field],set:value=>line[field]=value,max:4000});
  for(const production of order.productionHistory)for(const [object,field]of [[production,'instructions'],[production.deliveryAddress,'street']])slots.push({get:()=>object[field],set:value=>object[field]=value,max:4000});
 }else throw Error('Unknown synthetic layout '+layout);
 const table={settings:'crm_spaces',file:'crm_files',event:'crm_events',audit:'crm_events',order:'crm_orders'}[layout],select=()=>projectedRows(backup,context).filter(row=>row.table===table).sort((a,b)=>b.bytes-a.bytes)[0];
 let remaining=bytes-select().bytes;assert.ok(remaining>0);
 for(const slot of slots){const amount=Math.min(slot.max-slot.get().length,remaining);slot.set(slot.get()+'x'.repeat(amount));remaining-=amount;if(!remaining)break;}
 assert.equal(remaining,0,'Valid schema has enough independent padding slots for '+layout);
 let delta=bytes-select().bytes;
 for(let i=0;i<8&&delta;i++){
  const slot=slots.toReversed().find(slot=>delta<0?slot.get().endsWith('x')&&slot.get().length>=-delta:slot.get().length+delta<=slot.max);assert.ok(slot,'Exact encoded-row adjustment is possible');
  slot.set(delta<0?slot.get().slice(0,delta):slot.get()+'x'.repeat(delta));delta=bytes-select().bytes;
 }
 const row=select();assert.equal(row.bytes,bytes,'Independent whole-row oracle pads '+layout+' to exact inclusive bound');
 assert.ok(byteLength(header(backup))<16000000);assert.ok(byteLength(backup)<16000000);
 const sourceRow=projectedRows(backup,context,{remap:false}).filter(value=>value.table===table).sort((a,b)=>b.bytes-a.bytes)[0];
 return{backup,actorName:actor.name,row:{table:row.table,bytes:row.bytes,maxTextBytes:Math.max(...row.textBytes)},sourceRowBytes:sourceRow.bytes,remapGrowth:row.bytes-sourceRow.bytes,jsonArchiveBytes:byteLength(backup),headerBytes:byteLength(header(backup))};
}
function archiveStream(backup){
 const record=header(backup);const records=[JSON.stringify(record)];let digest=sha256(records[0]),bytes=0;
 for(const file of backup.files){const line=JSON.stringify({type:'file',id:file.metadata.id,content:file.content,sha256:file.sha256});records.push(line);digest=sha256(digest+':'+sha256(line));bytes+=file.metadata.size;}
 records.push(JSON.stringify({type:'end',files:backup.files.length,bytes,sha256:digest}));const text=records.join('\n')+'\n';parseStream(text);return text;
}

export async function assertNativeBackupRestoreRowBudget({moduleRoot,expectLegacyUnchecked=false,serverRoot:providedServerRoot}={}){
 const root=fileURLToPath(new URL('../',import.meta.url)),serverRoot=providedServerRoot||root+'dist/server',generated=moduleRoot||root+'work',core=await import(pathToFileURL(join(generated,'core.mjs')).href),ops=await import(pathToFileURL(join(generated,'operations.mjs')).href),restoreCore=await import(pathToFileURL(join(generated,'crm-restore.mjs')).href),backupCore=await import(pathToFileURL(join(generated,'crm-backup.mjs')).href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>sha256(moduleFiles.map(file=>file+'\0'+sha256(readFileSync(serverRoot+'/'+file))).join('\n')),originalBuiltHash=builtHash();
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-backup-row-budget-')),f=fixture(core,ops);
 let db,bucket,ready,tables,baseline,trace=[],loseAcknowledgment=false,requests=0,lostAcknowledgments=0,interleaveAtCommit;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__backup_restore_row-budget_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'backup-restore-row-budget'},r2Buckets:{BUCKET:'backup-restore-row-budget'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{ROW_BUDGET_OBSERVER:async request=>{const event=await request.json();trace.push(event);if(event.stage==='commit_before'&&interleaveAtCommit){const interleave=interleaveAtCommit;interleaveAtCommit=undefined;await interleave();}if(loseAcknowledgment&&event.stage==='commit_after'&&event.changes===1){loseAcknowledgment=false;lostAcknowledgments++;return new Response(null,{status:204,headers:{'X-Synthetic-Lost-Ack':'1'}});}return new Response(null,{status:204});}}});
 const who=account=>({'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email});
 const raw=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async row=>{const object=await bucket.get(row.key);return[row.key,{size:object.size,sha256:sha256(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const reset=async()=>{
  loseAcknowledgment=false;interleaveAtCommit=undefined;const order=['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders',...tables.filter(table=>!['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders'].includes(table))],q=order.toReversed().map(table=>db.prepare('DELETE FROM '+table));
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
 const writeTrace=trace=>trace.filter(event=>event.stage.startsWith('r2_')||event.stage.startsWith('commit_'));
 const encodingProbe=trace=>{const probes=trace.filter(event=>event.stage==='storage_probe');assert.equal(probes.length,1,'First restore checks the actual local D1 encoding once');assert.equal(probes[0].encoding,'41F09F9880','Actual native D1 encodes A😀 as UTF-8');};
 const rejected=async(format,input,{status=400,...options}={})=>{const before=await raw(),r=await restore(format,input,options);assert.equal(r.status,status,r.text);assert.deepEqual(Object.keys(r.data),['error']);assert.equal(writeTrace(r.trace).length,0,'Rejected '+format+' row budget never puts/deletes an R2 object or attempts a CRM commit');encodingProbe(r.trace);await unchanged(before,'Rejected '+format+' row budget');return r;};
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
  for(const space of ['live','demo'])for(const account of f.accounts.slice(0,2))await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(space,account.user_id,'row-budget-draft-'+account.id,'note',f.customerId,3,randomUUID(),'Syntetiskt privat underlag',' {"text":"'+f.privateSecret+'"}\n',space==='demo'?1:0,f.at).run();
  await db.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash)VALUES(?,?,?,?,?)').bind('live',randomUUID(),' {"synthetic":"sentinel"}\n',f.actor.user_id,'0'.repeat(64)).run();
  for(const account of f.accounts.slice(0,2)){
   await db.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync,status,sync_note,lock_until,revision)VALUES(?,?,?,?,?,?,?,?,?)').bind(account.user_id,'synthetic-ms-'+account.id,account.email,f.privateSecret,f.at,'error',f.privateSecret,0,7).run();
   for(const shared of [0,1])await db.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,deal_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?,?)').bind('row-budget-mail-'+account.id+'-'+shared,account.user_id,'mail',' {"body":"'+f.privateSecret+'"}\n',f.customerId,'',shared,f.at,f.at).run();
   await db.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').bind('row-budget-oauth-'+account.id,account.user_id,f.privateSecret,1999999999000).run();
  }
  for(const file of f.files){await bucket.put(file.objectKey,file.bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'backup-row-budget-source'}});await db.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').bind(file.metadata.id,'live',file.customerId,file.objectKey,JSON.stringify(file.metadata)).run();}
  await bucket.put('row-budget-unrelated-r2-sentinel',new TextEncoder().encode(f.privateSecret+'\n\0 åäö'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'unrelated-private-sentinel'}});
  baseline=await raw();for(const table of tables)assert.ok(baseline.tables[table].length>0,'A positive raw sentinel must exist in '+table);assert.equal(Object.keys(baseline.r2).length,4);

  const originals={json:await exported('live','json'),stream:await exported('live','stream')};await unchanged(baseline,'Native source exports');

  for(const format of ['json','stream']){
   await reset();const original=originals[format],input=format==='json'?original.backup:original.text,requestId=randomUUID(),before=await raw(),lostBefore=lostAcknowledgments,r=await restore(format,input,{requestId,lostAck:true});
   assert.equal(r.status,200,r.text);if(!expectLegacyUnchecked)encodingProbe(r.trace);assert.equal(lostAcknowledgments,lostBefore+1,'One acknowledgment is lost after the actual '+format+' D1 transaction');assert.equal(r.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.equal(r.trace.filter(event=>event.stage==='r2_put').length,f.files.length);assert.equal(r.trace.filter(event=>event.stage==='r2_delete').length,0,'Committed files survive a lost native transaction acknowledgment');
   const state=await assertRestored(original.backup,r.data,requestId),after=await raw();isolation(before,after);
   for(const reexportFormat of ['json','stream']){const copy=await exported('demo',reexportFormat);assert.deepEqual(copy.backup.state,state,'Accepted '+format+' restoration immediately re-exports as valid '+reexportFormat);for(const file of copy.backup.files){const source=original.backup.files.find(source=>source.metadata.name===file.metadata.name);assert.equal(file.content,source.content);assert.equal(file.sha256,source.sha256);assert.notEqual(file.metadata.id,source.metadata.id);}}
   await unchanged(after,'Native re-export');const replay=await restore(format,input,{requestId});assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.data,r.data);assert.equal(replay.trace.length,0,'Exact '+format+' replay never stages, deletes or commits');await unchanged(after,'Exact native '+format+' replay');
  }

  const validateSource=sized=>{
   const next=restoreCore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:sized.backup.state},true);backupCore.validateBackupFiles(next,sized.backup.files);
   const expected=structuredClone(sized.backup.state);expected.version=0;expected.settings.sellerProfiles=expected.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));assert.deepEqual(next,expected,'Padding remains valid and already normalized by the unchanged source restore contract');
  };
  const largeOrder=paddedArchive(originals.json.backup,f,'order',ROW_LIMIT+1);validateSource(largeOrder);
  assert.ok(largeOrder.sourceRowBytes<ROW_LIMIT,'Real source order fits native D1 before UUID remapping');assert.ok(largeOrder.remapGrowth>0,'Only the prepared file UUID expansion pushes the source order above the row limit');assert.ok(largeOrder.row.maxTextBytes<ROW_LIMIT,'Indexed columns and SQLite record overhead matter even when every individual value fits');
  await reset();await db.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').bind(JSON.stringify(largeOrder.backup.state.orders[0]),'live',largeOrder.backup.state.orders[0].id).run();
  const genuineLarge={json:await exported('live','json'),stream:await exported('live','stream')},largeBefore=await raw(),observedSource=largeBefore.tables.crm_orders.find(row=>row.space==='live');assert.equal(recordBytes(Object.values(observedSource)),largeOrder.sourceRowBytes,'Actual persisted native D1 source row matches the independent SQLite record oracle');
  const denied=[];if(expectLegacyUnchecked)baseline=largeBefore;
  for(const format of ['json','stream']){
   const original=genuineLarge[format],input=format==='json'?original.backup:original.text;
   if(expectLegacyUnchecked){
    await reset();const requestId=randomUUID(),response=await restore(format,input,{requestId});assert.equal(response.status,200,response.data?.error||'Legacy whole-row restore status');assert.equal(response.trace.filter(event=>event.stage==='r2_put').length,f.files.length,'Legacy restore stages all files without an encoded whole-row guard');assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.equal(response.trace.filter(event=>event.stage==='r2_delete').length,0);
    await assertRestored(original.backup,response.data,requestId);const after=await raw();isolation(largeBefore,after);const stored=after.tables.crm_orders.find(row=>row.space==='demo');assert.equal(recordBytes(Object.values(stored)),ROW_LIMIT+1,'Verified old native Worker really writes the exact over-contract whole SQLite record');
    denied.push({format,status:response.status,persistedWholeRowBytes:recordBytes(Object.values(stored)),r2PutCount:response.trace.filter(event=>event.stage==='r2_put').length,r2DeleteCount:response.trace.filter(event=>event.stage==='r2_delete').length,commits:response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length});
   }else{const response=await rejected(format,input);assert.match(response.data.error,/2 000 000 byte/);denied.push({layout:'nativeSourceOrderRemap',format,bytes:largeOrder.row.bytes,sourceRowBytes:largeOrder.sourceRowBytes,remapGrowth:largeOrder.remapGrowth,status:response.status});}
  }
  if(expectLegacyUnchecked)return{backupRowBudgetLegacyNativeBuiltListeningHTTP:true,backupRowBudgetLegacyGenuineBothSourceArchives:true,backupRowBudgetLegacyValidSourceNativeRowBytes:largeOrder.sourceRowBytes,backupRowBudgetLegacyPreparedRowBytes:largeOrder.row.bytes,backupRowBudgetLegacyRemapGrowthBytes:largeOrder.remapGrowth,backupRowBudgetLegacyNativeUncheckedWholeRowsAccepted:denied,backupRowBudgetLegacyPositive18RawTablesPrivacySourceAndR2Preserved:true,backupRowBudgetLegacyNativeProviderRejectsAboveDocumentedRowCap:false,backupRowBudgetLegacyHostedProviderBoundaryNotTested:true,backupRowBudgetBuiltModuleSha256:originalBuiltHash};

  await reset();
  for(const layout of ['settings','event','file','audit']){
   const sized=paddedArchive(originals.json.backup,f,layout,ROW_LIMIT+1);validateSource(sized);
   if(layout==='audit'){f.actor.name=sized.actorName;await db.prepare('UPDATE crm_members SET name=? WHERE id=?').bind(f.actor.name,f.actor.id).run();}
   for(const format of ['json','stream']){const input=format==='json'?sized.backup:archiveStream(sized.backup),response=await rejected(format,input);assert.match(response.data.error,/2 000 000 byte/,'A specific final encoded-row rejection is required');denied.push({layout,format,...sized.row,sourceRowBytes:sized.sourceRowBytes,remapGrowth:sized.remapGrowth,status:response.status});}
   if(layout==='audit'){await reset();f.actor.name=baseline.tables.crm_members.find(account=>account.id===f.actor.id).name;}
  }

  const accepted=[];
  for(const layout of ['settings','event','file','order','audit']){
   const sized=paddedArchive(originals.json.backup,f,layout,ROW_LIMIT);validateSource(sized);
   for(const format of ['json','stream']){
    await reset();if(layout==='audit'){f.actor.name=sized.actorName;await db.prepare('UPDATE crm_members SET name=? WHERE id=?').bind(f.actor.name,f.actor.id).run();}const before=await raw(),input=format==='json'?sized.backup:archiveStream(sized.backup),requestId=randomUUID(),response=await restore(format,input,{requestId});assert.equal(response.status,200,response.text);encodingProbe(response.trace);assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1,'Exact inclusive row boundary really commits in native D1');
    const state=await assertRestored(sized.backup,response.data,requestId),after=await raw();isolation(before,after);
    const row=after.tables[sized.row.table].filter(row=>sized.row.table==='crm_spaces'?row.id==='demo':row.space==='demo').sort((a,b)=>recordBytes(Object.values(b))-recordBytes(Object.values(a)))[0];assert.equal(recordBytes(Object.values(row)),ROW_LIMIT,'Actual native persisted '+layout+' record is exactly 2,000,000 bytes including its SQLite encoding');
    for(const reexportFormat of ['json','stream']){const copy=await exported('demo',reexportFormat);assert.deepEqual(copy.backup.state,state,'Exact native '+layout+' boundary re-exports all data as '+reexportFormat);assert.equal(copy.backup.files.length,sized.backup.files.length);}
    await unchanged(after,'Exact boundary native re-export');const replay=await restore(format,input,{requestId});assert.equal(replay.status,200,replay.text);assert.deepEqual(replay.data,response.data);assert.equal(replay.trace.length,0);await unchanged(after,'Exact inclusive boundary replay');
    accepted.push({layout,format,table:sized.row.table,bytes:recordBytes(Object.values(row)),sourceRowBytes:sized.sourceRowBytes,remapGrowth:sized.remapGrowth});if(layout==='audit')f.actor.name=baseline.tables.crm_members.find(account=>account.id===f.actor.id).name;
   }
  }

  let casZero=0;
  for(const format of ['json','stream']){
   await reset();const original=originals[format],before=await raw(),input=format==='json'?original.backup:original.text;let racedTables;
   interleaveAtCommit=async()=>{await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('demo').run();racedTables=(await raw()).tables;};
   const response=await restore(format,input);assert.equal(response.status,400,response.text);assert.match(response.data.error,/ändrades under återställningen/);assert.equal(response.trace.filter(event=>event.stage==='commit_after'&&event.changes===0).length,1,'Actual native CAS returns zero writes after independent version interleave');assert.equal(response.trace.filter(event=>event.stage==='r2_put').length,f.files.length);assert.equal(response.trace.filter(event=>event.stage==='r2_delete').length,f.files.length);assert.deepEqual((await raw()).tables,racedTables,'CAS loser performs no CRM row, audit, receipt, settings or private table writes');assert.deepEqual((await raw()).r2,before.r2,'CAS loser cleans only its own staging and preserves every original object');casZero++;
  }
  const generatedAudit=projectedRows(originals.json.backup,f).filter(row=>row.table==='crm_events'&&row.id.startsWith('00000000-'));
  assert.equal(generatedAudit.length,f.state.customers.length);assert.ok(generatedAudit.every(row=>row.bytes>Buffer.byteLength(String(row.values.at(-1)),'utf8')));
  return{backupRowBudgetNativeBuiltListeningHTTP:true,backupRowBudgetUnchangedBuiltModules:true,backupRowBudgetPositive18RawTablesPrivateOutlookAccountsAndR2:true,backupRowBudgetIndependentSqliteEncodedWholeRows:true,backupRowBudgetActualNativeD1Utf8Probe:'41F09F9880',backupRowBudgetGeneratedAuditUtf8Rows:generatedAudit.map(row=>row.bytes),backupRowBudgetNativeSourceOrderRemap:true,backupRowBudgetRejectedBeforeAnyR2PutDeleteOrCommit:denied,backupRowBudgetNativeAcceptedExactInclusiveBoundary:accepted,backupRowBudgetNormalBothFormatsRemappedProofPhotoArchivedSketchAndRecipe:true,backupRowBudgetBothFormatsReexportBothFormats:true,backupRowBudgetDetachedSellerAccountLinks:true,backupRowBudgetBothFormatsLostNativeCommitAcknowledgment:true,backupRowBudgetExactReplayNoWrites:true,backupRowBudgetNativeCASZeroWritesAndStagingCleanup:casZero,backupRowBudgetNativeRequests:requests,backupRowBudgetNativeLostAcknowledgments:lostAcknowledgments,backupRowBudgetBuiltModuleSha256:originalBuiltHash};
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Native verification leaves every built application module byte-identical');}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native backup restore row budget: '+JSON.stringify(await assertNativeBackupRestoreRowBudget()));
