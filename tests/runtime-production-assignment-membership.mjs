import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// This test-only entry forwards the unchanged built application and every SQL
// statement to native workerd/D1/R2. A service callback interleaves real local
// membership changes before the actual CAS, or loses an acknowledgment AFTER
// the native batch has committed. It never fabricates SQL results or patches
// an application module, and it does not use a production binding or account.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap(),counts={},run=request.headers.get('X-Synthetic-Assignment-Run');
 const observe=async(stage,details={})=>{
  const occurrence=counts[stage]=(counts[stage]||0)+1;
  const response=await env.ASSIGNMENT_MEMBERSHIP_OBSERVER.fetch('http://synthetic-fixture/observe',{method:'POST',body:JSON.stringify({run,stage,occurrence,...details})});
  if(!response.ok)throw Error('Synthetic assignment interleaving failed');
  if(response.headers.get('X-Synthetic-Lost-Ack')==='1')throw Error('Synthetic acknowledgment lost after native assignment COMMIT');
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
const assignmentFields=new Set(['assigneeId','assigneeMemberId','assigneeName','assignedAt','assignmentRevision','assignmentHistory']);
const withoutAssignment=production=>Object.fromEntries(Object.entries(production).filter(([key])=>!assignmentFields.has(key)));

function fixture(core,ops){
 const at='2026-10-09T10:00:00.000Z',today='2026-10-09',owner='Syntetiskt kommersiellt ansvar',secret='SYNTHETIC PRIVATE ASSIGNMENT SENTINEL '+randomUUID();
 const accounts=['admin','production','print','warehouse','seller','reader'].map(role=>({id:'assignment-member-'+role,user_id:'assignment-user-'+role,email:'assignment-'+role+'@example.test',name:'Syntetiskt konto '+role,role,owner:role==='seller'?owner:'',active:1}));
 const admin=accounts[0],operator=accounts[1],customerId='assignment-customer',dealId='assignment-deal',orderId='assignment-order',workId='assignment-work',proofId='assignment-proof';
 const line={id:'assignment-line',kind:'product',description:'Syntetisk provprodukt',quantity:50,unitPrice:100,unitCost:60};
 const state=core.emptyState();state.version=10;state.settings.owners=[owner];
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Syntetisk arbetsansvarskund',owner,status:'active',contact:'Syntetisk kontakt',plan:{goal:'Bevara kommersiellt kundansvar'}})];
 state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Syntetisk accepterad affär',stage:'won',confirmed:true,value:5000,cost:3000,lines:[line]})];
 state.orders=[core.OrderSchema.parse({id:orderId,customerId,dealId,owner,stage:'production',proofRequired:true,proofApproved:true,proofFileId:proofId,proofVersion:'assignment-v1',approvedBy:'Syntetiskt kundgodkännande',approvedDate:today,supplierConfirmed:true,deliveryDate:today,deliveredDate:'',invoiceDate:'',invoiceRef:'SYNTHETIC-COMMERCIAL-REF',invoiceValue:5000,actualCost:3000,notes:'Syntetiskt fryst orderunderlag',production:{status:'submitted',workId,quantityMode:'lines',lines:[line],submittedAt:at,submittedBy:admin.name,sketchFileId:proofId,sketchVersion:'assignment-v1',instructions:'Bevara skiss och samtliga fysiska antal',issue:'Syntetiskt separat tryckhinder',issueAt:at,issueOwnerId:admin.user_id,issueOwnerName:admin.name,movements:[['received',40],['printed',20],['scrap_unprinted',1],['dispatched',10]].map(([kind,quantity])=>({id:'assignment-'+kind,kind,entries:[{lineId:line.id,quantity}],at,by:admin.name,reason:kind==='scrap_unprinted'?'Syntetisk kassation':''}))}})];
 state.tasks=[core.TaskSchema.parse({id:'assignment-task',customerId,dealId,owner,title:'Syntetisk nästa kunduppföljning',due:today})];
 state.meetings=[core.MeetingSchema.parse({id:'assignment-meeting',customerId,owner,title:'Syntetiskt kundmöte',date:today,time:'10:00',duration:30})];
 state.events=[{id:'assignment-event',customerId,dealId:'',kind:'note',at,text:'Syntetisk ursprunglig anteckning'}];
 state.articles=[ops.ArticleSchema.parse({id:'assignment-article',sourceId:'current',sku:'SYNTHETIC-ASSIGNMENT',name:'Syntetisk katalogpost',price:100,cost:60})];
 state.notices=[ops.NoticeSchema.parse({id:'assignment-notice',customerId,orderId,title:'Syntetisk befintlig notis',audience:'seller',owner,at,readBy:[accounts[4].user_id]})];
 state.leads=[ops.LeadSchema.parse({id:'assignment-lead',name:'Syntetiskt separat prospekt',source:'Isolerat arbetsansvarsprov'})];
 state.companyEvents=[ops.CompanyEventSchema.parse({id:'assignment-company-event',title:'Syntetiskt företagsevent',owner,date:today})];
 const bytes=new TextEncoder().encode('%PDF-1.7\nSyntetiskt korrektur åäö\n');
 const file={customerId,objectKey:'assignment-source/'+proofId,bytes,metadata:{id:proofId,name:'syntetiskt-korrektur.pdf',version:'assignment-v1',kind:'proof',size:bytes.length,at,uploadedBy:admin.user_id}};
 return{state,accounts,admin,operator,customerId,dealId,orderId,workId,file,secret,at,destinationVersion:17};
}

function parsedStream(text){
 const records=text.trimEnd().split('\n'),header=JSON.parse(records[0]),end=JSON.parse(records.at(-1));
 assert.equal(header.type,'header');assert.equal(header.format,'magnussons-crm-backup-2');assert.equal(end.type,'end');
 let digest=sha256(records[0]),bytes=0;const files=records.slice(1,-1).map((line,index)=>{
  const row=JSON.parse(line),file=header.files[index],content=Buffer.from(row.content,'base64');
  assert.equal(row.type,'file');assert.equal(row.id,file.metadata.id);assert.equal(content.length,file.metadata.size);assert.equal(sha256(content),row.sha256);assert.equal(content.toString('base64'),row.content);
  bytes+=content.length;digest=sha256(digest+':'+sha256(line));return{...file,content:row.content,sha256:row.sha256};
 });
 assert.equal(end.files,files.length);assert.equal(end.files,header.files.length);assert.equal(end.bytes,bytes);assert.equal(end.sha256,digest);return{...header,files};
}

export async function assertNativeProductionAssignmentMembership({moduleRoot}={}){
 const root=fileURLToPath(new URL('../',import.meta.url)),serverRoot=root+'dist/server',domainRoot=moduleRoot||root+'work',core=await import(pathToFileURL(domainRoot+'/core.mjs').href),ops=await import(pathToFileURL(domainRoot+'/operations.mjs').href),quantities=await import(pathToFileURL(domainRoot+'/production-quantities.mjs').href);
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const modules=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort(),builtHash=()=>sha256(modules.map(file=>file+'\0'+sha256(readFileSync(serverRoot+'/'+file))).join('\n')),originalBuiltHash=builtHash();
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-assignment-membership-')),f=fixture(core,ops),gates=new Map(),traces=new Map();
 let db,bucket,ready,tables,baseline,requests=0,lostAcknowledgments=0,forcedRaces=0;
 const mf=new Miniflare({modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__assignment_membership_test__.mjs',contents:testEntry},...modules.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'assignment-membership'},r2Buckets:{BUCKET:'assignment-membership'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',serviceBindings:{ASSIGNMENT_MEMBERSHIP_OBSERVER:async request=>{const event=await request.json();traces.get(event.run)?.push(event);const lose=await gates.get(event.run)?.(event);return new Response(null,{status:204,...(lose?{headers:{'X-Synthetic-Lost-Ack':'1'}}:{})});}}});
 const who=account=>({'oai-authenticated-user-id':account.user_id,'oai-authenticated-user-email':account.email});
 const raw=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async item=>{const object=await bucket.get(item.key);return[item.key,{size:object.size,sha256:sha256(new Uint8Array(await object.arrayBuffer())),httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const call=async(path,{body,contentType='application/json',account=f.admin,gate=null}={})=>{
  const run=String(++requests),url=new URL(path,ready);traces.set(run,[]);if(gate)gates.set(run,gate);
  try{const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{...who(account),'Accept-Encoding':'identity','X-Synthetic-Assignment-Run':run,...(body===undefined?{}:{'Content-Type':contentType,Origin:url.origin})},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}),bytes=new Uint8Array(await response.arrayBuffer()),text=new TextDecoder().decode(bytes);let data;try{data=JSON.parse(text)}catch{}return{status:response.status,data,text,bytes,headers:response.headers,trace:[...traces.get(run)]};}finally{gates.delete(run);traces.delete(run);}
 };
 const get=async(space='live',account=f.admin)=>{const r=await call('/api/crm?space='+space,{account});assert.equal(r.status,200,r.text);assert.ok(!r.text.includes(f.secret));return r.data;};
 const production=state=>state.orders.find(order=>order.id===f.orderId).production;
 const intent=(state,type='production_release',space='live')=>({space,version:state.version,requestId:randomUUID(),type,data:{orderId:f.orderId,expectedAssignment:quantities.assignmentBasis(production(state))}});
 const submit=(payload,account=f.operator,gate=null)=>call('/api/crm',{body:payload,account,gate});
 const replaceOperator=async({id=f.operator.id,user_id=f.operator.user_id,role=f.operator.role,name=f.operator.name,active=1}={})=>{
  await db.batch([db.prepare('DELETE FROM crm_members WHERE email=?').bind(f.operator.email),db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,?)').bind(id,f.operator.email,user_id,name,role,f.operator.owner,active)]);
  return{...f.operator,id,user_id,role,name,active};
 };
 const reset=async()=>{
  const order=['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders',...tables.filter(table=>!['crm_spaces','crm_members','crm_customers','crm_deals','crm_orders'].includes(table))],q=order.toReversed().map(table=>db.prepare('DELETE FROM '+table));
  for(const table of order)for(const row of baseline.tables[table]){const columns=Object.keys(row);q.push(db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind(...columns.map(column=>row[column])));}
  await db.batch(q);for(const item of (await bucket.list()).objects)if(!Object.hasOwn(baseline.r2,item.key))await bucket.delete(item.key);assert.deepEqual(await raw(),baseline,'Owned fixture reset restores all native tables and original R2 objects');
 };
 const untouched=async(before,label)=>assert.deepEqual(await raw(),before,label+' leaves all 18 raw tables and every R2 byte/metadata unchanged');
 const unchangedExceptMembers=(before,after,label)=>{for(const table of tables.filter(table=>table!=='crm_members'))assert.deepEqual(after.tables[table],before.tables[table],label+' '+table);assert.deepEqual(after.r2,before.r2,label+' R2');};
 const mutationIsolation=(previous,next,before,after,space)=>{
  const old=previous.orders.find(row=>row.id===f.orderId),current=next.orders.find(row=>row.id===f.orderId);
  assert.deepEqual({...current,production:old.production},old,'Commercial owner, acceptance, values, costs, proof and order history stay exact');assert.deepEqual(withoutAssignment(current.production),withoutAssignment(old.production),'All received/printed/scrapped/dispatched quantities, issue ownership, deadlines and sketch stay exact');
  for(const [name] of Object.entries(mapping))if(!['orders','events'].includes(name))assert.deepEqual(next[name],previous[name],name+' outside the assignment operation');
  const allowed=new Set(['crm_orders','crm_events','crm_spaces','crm_mutations']);for(const table of tables){if(!allowed.has(table))assert.deepEqual(after.tables[table],before.tables[table],table+' outside the assignment commit');else{const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!==space:row.space!==space);assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' other workspace');}}
  assert.deepEqual(after.r2,before.r2,'An assignment never stages, removes or changes customer files');
 };
 const audit=(previous,next,actor,action)=>{
  const old=production(previous),current=production(next),row=current.assignmentHistory.at(-1),releasing=action==='release';
  assert.equal(current.assignmentRevision,old.assignmentRevision+1);assert.equal(current.assignmentHistory.length,old.assignmentHistory.length+1);assert.deepEqual(current.assignmentHistory.slice(0,-1),old.assignmentHistory);assert.match(row.id,/^[a-f0-9-]{36}$/);assert.equal(new Date(row.at).toISOString(),row.at);
  assert.deepEqual(row,{id:row.id,orderId:f.orderId,workId:f.workId,revision:old.assignmentRevision+1,action,fromUserId:old.assigneeId,fromMemberId:old.assigneeMemberId,fromName:old.assigneeName,toUserId:releasing?'':actor.user_id,toMemberId:releasing?'':actor.id,toName:releasing?'':actor.name,reason:releasing?'Arbetsordern lämnades tillbaka till gemensam kö.':'Jag tog ansvar för arbetsordern.',at:row.at,byId:actor.user_id,byMemberId:actor.id,byName:actor.name});
  assert.equal(current.assigneeId,row.toUserId);assert.equal(current.assigneeMemberId,row.toMemberId);assert.equal(current.assigneeName,row.toName);assert.equal(current.assignedAt,releasing?'':row.at);
  const added=next.events.filter(event=>!previous.events.some(before=>before.id===event.id));assert.equal(added.length,1);assert.equal(added[0].kind,'production');assert.deepEqual(added[0].actor,{id:actor.user_id,name:actor.name});return row;
 };
 const denyOwnership=async(payload,account,label)=>{const before=await raw(),r=await submit(payload,account);assert.equal(r.status,400,r.text);assert.deepEqual(Object.keys(r.data),['error']);assert.equal(r.data.error,'Bara den ansvariga eller administratören kan lämna tillbaka jobbet.');assert.equal(r.trace.length,0,label+' stops before CAS or R2 staging');await untouched(before,label);return r;};
 const exportCopy=async format=>{
  const before=await raw(),r=await call('/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''));assert.equal(r.status,200,r.text);assert.ok(!r.text.includes(f.secret));await untouched(before,'Actual source '+format+' export');
  const backup=format==='stream'?parsedStream(r.text):r.data;assert.equal(backup.files.length,1);assert.equal(backup.files[0].sha256,sha256(f.file.bytes));assert.equal(backup.files[0].content,Buffer.from(f.file.bytes).toString('base64'));if(format==='stream')assert.equal(Number(r.headers.get('Content-Length')),r.bytes.length);
  return{format,input:format==='stream'?r.text:backup,backup};
 };
 const restore=async copy=>{
  const before=await raw(),requestId=randomUUID(),r=copy.format==='stream'?await call('/api/crm/backup?space=demo&version='+f.destinationVersion+'&requestId='+requestId,{body:copy.input,contentType:'application/x-ndjson'}):await call('/api/crm/backup',{body:{space:'demo',version:f.destinationVersion,requestId,backup:copy.input}});
  assert.equal(r.status,200,r.text);const next=await get('demo'),after=await raw();assert.equal(next.version,f.destinationVersion+1);assert.deepEqual(production(next).assignmentHistory,production(copy.backup.state).assignmentHistory);for(const key of assignmentFields)assert.deepEqual(production(next)[key],production(copy.backup.state)[key],copy.format+' restore preserves '+key);
  assert.equal(r.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);assert.equal(r.trace.filter(event=>event.stage==='r2_put').length,1);assert.equal(r.trace.filter(event=>event.stage==='r2_delete').length,0);
  for(const table of tables){if(table==='crm_members'||table==='crm_drafts'||table.startsWith('outlook_'))assert.deepEqual(after.tables[table],before.tables[table],table+' complete private/account store survives restore');else{const outside=rows=>table==='crm_spaces'?rows.filter(row=>row.id!=='demo'):rows.filter(row=>row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside real empty-target restore');}}
  for(const [key,value] of Object.entries(before.r2))assert.deepEqual(after.r2[key],value,'Source R2 survives restore');const file=after.tables.crm_files.find(row=>row.space==='demo'),meta=JSON.parse(file.data);assert.notEqual(meta.id,f.file.metadata.id);assert.equal(production(next).sketchFileId,meta.id);assert.equal(next.orders[0].proofFileId,meta.id);assert.equal(after.r2[file.object_key].sha256,sha256(f.file.bytes));assert.deepEqual(Object.keys(after.r2).filter(key=>!Object.hasOwn(before.r2,key)),[file.object_key],'The one committed target proof is the only added R2 object');return next;
 };
 try{
  db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');ready=await mf.ready;
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
  for(const space of ['live','demo'])await db.prepare('INSERT INTO crm_spaces(id,version,write_token,settings)VALUES(?,?,?,?)').bind(space,space==='live'?f.state.version:f.destinationVersion,'',JSON.stringify(space==='live'?f.state.settings:core.emptyState().settings)).run();
  for(const [name,table] of Object.entries(mapping))for(const row of f.state[name]){const independent=['customers','articles','notices','leads','companyEvents'].includes(name),columns=['space','id',...(independent?[]:['customer_id']),...(name==='orders'?['deal_id']:[]),'data'];await db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').bind('live',row.id,...(independent?[]:[row.customerId]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)).run();}
  for(const account of f.accounts)await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,?)').bind(account.id,account.email,account.user_id,account.name,account.role,account.owner,account.active).run();
  for(const space of ['live','demo'])await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(space,f.admin.user_id,'assignment-draft-'+space,'note',f.customerId,3,randomUUID(),'Syntetiskt privat utkast',' {"text":"'+f.secret+'"}\n',space==='demo'?1:0,f.at).run();
  await db.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash)VALUES(?,?,?,?,?)').bind('live',randomUUID(),' {"synthetic":"sentinel"}\n',f.admin.user_id,'0'.repeat(64)).run();
  await db.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync,status,sync_note,lock_until,revision)VALUES(?,?,?,?,?,?,?,?,?)').bind(f.admin.user_id,'assignment-synthetic-microsoft',f.admin.email,f.secret,f.at,'error',f.secret,0,7).run();
  for(const shared of [0,1])await db.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,deal_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?,?)').bind('assignment-mail-'+shared,f.admin.user_id,'mail',' {"body":"'+f.secret+'"}\n',f.customerId,'',shared,f.at,f.at).run();
  await db.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').bind('assignment-oauth',f.admin.user_id,f.secret,1999999999000).run();
  await bucket.put(f.file.objectKey,f.file.bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{synthetic:'assignment-source-proof'}});await db.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').bind(f.file.metadata.id,'live',f.customerId,f.file.objectKey,JSON.stringify(f.file.metadata)).run();
  await bucket.put('assignment-unrelated-r2',new TextEncoder().encode(f.secret+'\n\0 åäö'),{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'unrelated'}});
  const initial=await raw();for(const table of tables)assert.ok(initial.tables[table].length>0,'Positive native sentinel in '+table);
  const unassigned=await get(),claim=intent(unassigned,'production_claim'),claimed=await submit(claim);assert.equal(claimed.status,200,claimed.text);const assigned=await get();assert.equal(assigned.version,unassigned.version+1);audit(unassigned,assigned,f.operator,'claim');mutationIsolation(unassigned,assigned,initial,await raw(),'live');
  const copies={json:await exportCopy('json'),stream:await exportCopy('stream')};for(const copy of Object.values(copies))assert.deepEqual(production(copy.backup.state).assignmentHistory,production(assigned).assignmentHistory,'The source audit comes from an actual native HTTP claim');baseline=await raw();

  for(const format of ['json','stream']){
   await reset();let rebound=await replaceOperator({id:'assignment-rebound-member'}),state=await restore(copies[format]);
   const operational=await get('demo',rebound);assert.equal(operational.viewer.id,f.operator.user_id);assert.equal(operational.viewer.memberId,rebound.id);assert.equal(production(operational).assigneeMemberId,f.operator.id);assert.deepEqual(production(operational).assignmentHistory,production(assigned).assignmentHistory);
   for(const role of ['production','print','warehouse']){rebound=await replaceOperator({id:rebound.id,role});await denyOwnership(intent(state,'production_release','demo'),rebound,format+' same auth user with different '+role+' member');}
   const wrongUser=await replaceOperator({user_id:'assignment-different-auth-user'});await denyOwnership(intent(state,'production_release','demo'),wrongUser,format+' same recorded member with different auth user');
   const renamed=await replaceOperator({name:'Syntetiskt nytt kontonamn'}),before=await raw(),payload=intent(state,'production_release','demo'),clicks=await Promise.all([submit(payload,renamed),submit(payload,renamed)]);for(const r of clicks)assert.equal(r.status,200,r.text);const released=await get('demo'),after=await raw();assert.equal(released.version,state.version+1);audit(state,released,renamed,'release');mutationIsolation(state,released,before,after,'demo');assert.equal(clicks.flatMap(r=>r.trace).filter(event=>event.stage==='commit_after'&&event.changes===1).length,1,'Two actual HTTP clicks produce one native successful CAS');assert.equal(after.tables.crm_mutations.filter(row=>row.space==='demo'&&row.id===payload.requestId).length,1);
   const replay=await submit(payload,renamed);assert.equal(replay.status,200,replay.text);assert.equal(replay.trace.length,0);await untouched(after,format+' exact successful release replay');
   const stale=await submit({...payload,version:released.version,requestId:randomUUID()},renamed);assert.equal(stale.status,409,stale.text);assert.equal(stale.data.code,'production_assignment_conflict');assert.equal(stale.trace.length,0);await untouched(after,format+' stale assignment with fresh workspace version');
   const freshClaim=intent(released,'production_claim','demo'),claimedAgain=await submit(freshClaim,renamed);assert.equal(claimedAgain.status,200,claimedAgain.text);state=await get('demo');audit(released,state,renamed,'claim');
   const lossPayload=intent(state,'production_release','demo'),lossBefore=await raw();let lost=false;
   const loss=await submit(lossPayload,renamed,event=>{if(!lost&&event.stage==='commit_after'&&event.changes===1){lost=true;lostAcknowledgments++;return true;}});assert.equal(loss.status,503,loss.text);assert.ok(lost,'The real native batch commits before its acknowledgment is lost');const committed=await get('demo'),lossAfter=await raw();assert.equal(committed.version,state.version+1);audit(state,committed,renamed,'release');mutationIsolation(state,committed,lossBefore,lossAfter,'demo');assert.equal(loss.trace.filter(event=>event.stage==='commit_after'&&event.changes===1).length,1);
   const recovered=await submit(lossPayload,renamed);assert.equal(recovered.status,200,recovered.text);assert.equal(recovered.trace.length,0);await untouched(lossAfter,format+' same-request lost-ack recovery');
   for(const [changed,account] of [[{...lossPayload,type:'production_claim'},renamed],[lossPayload,f.accounts[2]]]){const denied=await submit(changed,account);assert.equal(denied.status,409,denied.text);assert.equal(denied.trace.length,0);await untouched(lossAfter,format+' receipt actor/intent protection');}

   await reset();await replaceOperator({id:'assignment-rebound-member'});state=await restore(copies[format]);const overrideBefore=await raw(),override=await submit(intent(state,'production_release','demo'),f.admin);assert.equal(override.status,200,override.text);const overrideState=await get('demo');assert.equal(overrideState.version,state.version+1);audit(state,overrideState,f.admin,'release');mutationIsolation(state,overrideState,overrideBefore,await raw(),'demo');
  }

  await reset();const beforeRace=await raw(),raceState=await get(),racePayload=intent(raceState);let replaced=false;
  const memberRace=await submit(racePayload,f.operator,async event=>{if(!replaced&&event.stage==='commit_before'){replaced=true;forcedRaces++;await replaceOperator({id:'assignment-at-commit-member'});}});assert.equal(memberRace.status,400,memberRace.text);assert.equal(memberRace.data.error,'Bara den ansvariga eller administratören kan lämna tillbaka jobbet.');assert.ok(replaced);assert.deepEqual(memberRace.trace.filter(event=>event.stage==='commit_after').map(event=>event.changes),[0]);unchangedExceptMembers(beforeRace,await raw(),'Membership replaced at the actual atomic assignment write');assert.ok(!(await raw()).tables.crm_mutations.some(row=>row.id===racePayload.requestId));
  await reset();const inactiveBefore=await raw(),inactiveState=await get();let deactivated=false;
  const inactiveRace=await submit(intent(inactiveState),f.operator,async event=>{if(!deactivated&&event.stage==='commit_before'){deactivated=true;forcedRaces++;await db.prepare('UPDATE crm_members SET active=0 WHERE id=?').bind(f.operator.id).run();}});assert.equal(inactiveRace.status,403,inactiveRace.text);assert.ok(deactivated);assert.deepEqual(inactiveRace.trace.filter(event=>event.stage==='commit_after').map(event=>event.changes),[0]);unchangedExceptMembers(inactiveBefore,await raw(),'Actor deactivated at native CAS');

  await reset();const legacy=structuredClone(assigned.orders[0]);Object.assign(legacy.production,{assigneeMemberId:'',assignmentHistory:[],assignmentRevision:7,assignedAt:'Äldre registrerat tidsfält'});await db.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').bind(JSON.stringify(legacy),'live',f.orderId).run();const legacyCopies={json:await exportCopy('json'),stream:await exportCopy('stream')};
  for(const format of ['json','stream']){
   await reset();const rebound=await replaceOperator({id:'assignment-legacy-current-member'}),state=await restore(legacyCopies[format]),before=await raw();assert.equal(production(state).assigneeMemberId,'');assert.equal(production(state).assignedAt,'Äldre registrerat tidsfält');assert.deepEqual(production(state).assignmentHistory,[]);const release=await submit(intent(state,'production_release','demo'),rebound);assert.equal(release.status,200,release.text);const next=await get('demo');assert.equal(next.version,state.version+1);audit(state,next,rebound,'release');mutationIsolation(state,next,before,await raw(),'demo');
  }
  await reset();const nameOnly=structuredClone(assigned.orders[0]);Object.assign(nameOnly.production,{assigneeId:'',assigneeMemberId:'',assignmentHistory:[],assignmentRevision:0,assignedAt:'Äldre registrerat tidsfält'});await db.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').bind(JSON.stringify(nameOnly),'live',f.orderId).run();const nameState=await get(),nameBefore=await raw();for(const type of ['production_claim','production_release']){const denied=await submit(intent(nameState,type));assert.equal(denied.status,400,denied.text);assert.match(denied.data.error,/tidigare ansvarigt namn utan användaridentitet/);assert.equal(denied.trace.length,0);await untouched(nameBefore,'Legacy display name cannot authorize '+type);}
  return{productionAssignmentMembershipNativeBuiltListeningHTTP:true,productionAssignmentMembershipUnchangedBuiltModules:true,productionAssignmentMembershipPositive18RawTablesPrivateOutlookAccountsAndR2:true,productionAssignmentMembershipActualSourceClaimAudit:true,productionAssignmentMembershipValidJSONAndStreamEmptyTargetRestore:true,productionAssignmentMembershipPreservedRestoreUserMemberHistoryAndRemappedProof:true,productionAssignmentMembershipDifferentMemberSameUserThreeOperationalRolesDenied:true,productionAssignmentMembershipSameMemberDifferentUserDenied:true,productionAssignmentMembershipSameIdentityRenamedDisplayAllowed:true,productionAssignmentMembershipAdminOverridePreservesAudit:true,productionAssignmentMembershipLegacyBlankMemberUserScopePreserved:true,productionAssignmentMembershipNameOnlyNeverGuessed:true,productionAssignmentMembershipTwoHTTPClicksOneNativeCommit:true,productionAssignmentMembershipStaleAssignmentFreshVersionDenied:true,productionAssignmentMembershipActualCommitMemberReplacementDenied:true,productionAssignmentMembershipActualCommitInactiveActorDenied:true,productionAssignmentMembershipLostNativeCommitAckAndExactReplay:true,productionAssignmentMembershipReceiptActorAndIntentDenied:true,productionAssignmentMembershipCommercialPhysicalIssuePrivateR2Unchanged:true,productionAssignmentMembershipNativeRequests:requests,productionAssignmentMembershipNativeLostAcknowledgments:lostAcknowledgments,productionAssignmentMembershipNativeForcedRaces:forcedRaces,productionAssignmentMembershipBuiltModuleSha256:originalBuiltHash,hostedProductionRestoreVerified:false,personalAccountAcceptanceVerified:false};
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'The native test leaves every built application module byte-identical');}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PASS native production assignment membership: '+JSON.stringify(await assertNativeProductionAssignmentMembership()));
