import assert from 'node:assert/strict';

export async function verifyCrmResponseAuthorization({core,sqlite,api,draftApi,objects}){
 const store=await import('../work/crm-store.mjs'),copyApi=await import('../work/private-draft-copy-api.mjs');
 const env=globalThis.__crmEnv,db=env.DB,normalBatch=db.batch,prototype=Object.getPrototypeOf(db.prepare('SELECT 1')),normalAll=prototype.all;
 const space='live',suffix=crypto.randomUUID(),id=kind=>'response-auth-'+kind+'-'+suffix;
 const actor={id:id('member'),user:id('user'),email:id('actor')+'@example.test'},other={id:id('other-member'),user:id('other-user'),email:id('other')+'@example.test'};
 const customerId=id('customer'),dealId=id('deal'),orderId=id('order'),taskId=id('task'),noticeId=id('notice'),eventId=id('event'),fileId=id('file'),objectKey=id('object'),at='2026-10-09T15:00:00.000Z';
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
 assert.equal(tableNames.length,18,'Compare every migrated raw table, including private and account stores.');
 const snapshot=()=>({tables:Object.fromEntries(tableNames.map(name=>[name,sqlite.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()])),objects:[...objects].map(([key,bytes])=>({key,bytes:[...bytes]}))});
 const original=snapshot(),originalMeta=sqlite.prepare('SELECT * FROM crm_spaces WHERE id=?').get(space),state=await store.load(space),owner=state.settings.owners[0];
 const settings=structuredClone(state.settings);settings.budgets['2026-10']=913579;
 const rows={
  crm_customers:core.CustomerSchema.parse({id:customerId,name:'Syntetiskt CRM-svarprov',owner,need:'COMMERCIAL-CUSTOMER-'+suffix}),
  crm_deals:core.DealSchema.parse({id:dealId,customerId,owner,title:'Syntetiskt affärsunderlag',stage:'won',value:424242,cost:131313}),
  crm_orders:core.OrderSchema.parse({id:orderId,customerId,dealId,owner,stage:'production',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:'2026-10-10',deliveredDate:'',invoiceDate:'2026-10-09',invoiceRef:'SYNTHETIC-INVOICE-'+suffix,invoiceValue:424242,actualCost:131313,invoiceOwner:owner,notes:'COMMERCIAL-ORDER-'+suffix,production:{status:'submitted',workId:id('work'),quantityMode:'lines',lines:[{id:id('line'),description:'Syntetisk vara',quantity:50,unitPrice:1000,unitCost:600}],movements:[['received',40],['printed',35],['scrap_printed',2],['dispatched',10]].map(([kind,quantity])=>({id:id(kind),kind,entries:[{lineId:id('line'),quantity}],at,by:'Syntetisk historisk aktör'}))}}),
  crm_tasks:core.TaskSchema.parse({id:taskId,customerId,owner,title:'Syntetisk separat uppgift',due:'2026-10-10'}),
  crm_events:{id:eventId,customerId,dealId,text:'COMMERCIAL-EVENT-'+suffix,kind:'customer_note',at},
  crm_notices:{id:noticeId,customerId,orderId,title:'Syntetisk teamnotis',body:'Operativt underlag',audience:'team',owner,at,readBy:[]}
 };
 const putRow=(table,row)=>{
  const cols=['space','id',...(['crm_customers','crm_notices'].includes(table)?[]:['customer_id']),...(table==='crm_orders'?['deal_id']:[]),'data'];
  const values=[space,row.id,...(['crm_customers','crm_notices'].includes(table)?[]:[row.customerId]),...(table==='crm_orders'?[row.dealId]:[]),JSON.stringify(row)];
  sqlite.prepare('INSERT INTO '+table+'('+cols.join(',')+') VALUES('+cols.map(()=>'?').join(',')+')').run(...values);
 };
 const resetActor=(role='admin')=>sqlite.prepare('UPDATE crm_members SET id=?,user_id=?,role=?,owner=?,active=1 WHERE email=?').run(actor.id,actor.user,role,owner,actor.email);
 const requests=new Set(),counts={fresh:0,getRevocations:0,committedRevocations:0,replayRevocations:0,conflictRevocations:0,privateRevocations:0};
 let baseline,meta;
 function resetCase(role='admin'){
  db.batch=normalBatch;prototype.all=normalAll;resetActor(role);
  sqlite.prepare('DELETE FROM crm_events WHERE space=? AND customer_id=? AND id<>?').run(space,customerId,eventId);
  sqlite.prepare('UPDATE crm_notices SET data=? WHERE space=? AND id=?').run(JSON.stringify(rows.crm_notices),space,noticeId);
  for(const requestId of requests)sqlite.prepare('DELETE FROM crm_mutations WHERE space=? AND id=?').run(space,requestId);
  sqlite.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').run(meta.version,meta.write_token,meta.settings,space);
 }
 const auth={'oai-authenticated-user-id':actor.user,'oai-authenticated-user-email':actor.email};
 const request=(path,body)=>new Request('https://crm.test'+path,{method:body?'POST':'GET',headers:{...auth,...(body?{'Content-Type':'application/json',Origin:'https://crm.test'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const json=async response=>({status:response.status,data:await response.json()});
 const get=()=>api.GET(request('/api/crm?space='+space)).then(json);
 const payload=(type,data,extra={})=>{const requestId=crypto.randomUUID();requests.add(requestId);return {space,version:meta.version,requestId,type,data,...extra};};
 const post=body=>api.POST(request('/api/crm',body)).then(json);
 const denied=(response,label)=>{assert.equal(response.status,403,label+': '+JSON.stringify(response.data));assert.deepEqual(Object.keys(response.data),['error'],label+' exposes no state, viewer, conflict code, result or private metadata.');};
 const downgrade=(kind)=>{
  if(kind==='inactive')sqlite.prepare('UPDATE crm_members SET active=0 WHERE email=?').run(actor.email);
  else if(kind==='owner')sqlite.prepare('UPDATE crm_members SET owner=? WHERE email=?').run('Changed synthetic owner',actor.email);
  else if(kind==='user_id')sqlite.prepare('UPDATE crm_members SET user_id=? WHERE email=?').run(id('changed-user'),actor.email);
  else if(kind==='member_id')sqlite.prepare('UPDATE crm_members SET id=? WHERE email=?').run(id('replacement-member'),actor.email);
  else sqlite.prepare('UPDATE crm_members SET role=? WHERE email=?').run(kind,actor.email);
 };
 function unchanged(before,label){assert.deepEqual(snapshot(),before,label+' preserves all 18 raw tables and R2 bytes.');}
 function untouchedStores(before,allowed,label){const after=snapshot();for(const table of tableNames)if(!allowed.has(table))assert.deepEqual(after.tables[table],before.tables[table],label+' preserves '+table);assert.deepEqual(after.objects,before.objects,label+' preserves every R2 byte.');}
 function projection(response,role){
  assert.equal(response.status,200,JSON.stringify(response.data));assert.equal(response.data.viewer.role,role);
  const c=response.data.customers.find(row=>row.id===customerId),d=response.data.deals.find(row=>row.id===dealId),o=response.data.orders.find(row=>row.id===orderId);assert.ok(c&&d&&o);
  if(['production','print','warehouse'].includes(role)){
   assert.equal(c.need,'');assert.equal(d.value,null);assert.equal(d.cost,null);assert.equal(o.invoiceValue,null);assert.equal(o.actualCost,null);assert.equal(o.notes,'');assert.deepEqual(response.data.settings.budgets,{});
   assert.ok(!response.data.events.some(row=>row.id===eventId));assert.deepEqual(response.data.tasks,[]);
   assert.equal(o.production.lines[0].unitPrice,0);assert.equal(o.production.lines[0].unitCost,null);
  }else{
   assert.equal(c.need,rows.crm_customers.need);assert.equal(d.value,424242);assert.equal(d.cost,131313);assert.equal(o.invoiceValue,424242);assert.equal(o.actualCost,131313);assert.equal(o.notes,rows.crm_orders.notes);assert.equal(response.data.settings.budgets['2026-10'],913579);
   assert.ok(response.data.events.some(row=>row.id===eventId));assert.ok(response.data.tasks.some(row=>row.id===taskId));
  }
  assert.ok(!JSON.stringify(response.data).includes('PRIVATE-DRAFT-'+suffix));assert.ok(!JSON.stringify(response.data).includes('PRIVATE-OUTLOOK-'+suffix));
 }
 const roles=['admin','seller','production','print','warehouse','reader'],identityChanges=['owner','inactive','user_id','member_id'];
 try{
  sqlite.prepare('INSERT OR IGNORE INTO crm_spaces(id,version,write_token,settings) VALUES(?,0,?,?)').run(space,'',JSON.stringify(settings));
  sqlite.prepare('UPDATE crm_spaces SET settings=? WHERE id=?').run(JSON.stringify(settings),space);
  for(const [table,row] of Object.entries(rows))putRow(table,row);
  for(const person of [actor,other])sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(person.id,person.email,person.user,'Syntetisk provaktör','admin',owner);
  for(const person of [actor,other]){
   sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,person.user,id('private-'+person.id), 'form','customer',2,crypto.randomUUID(),'Privat syntetiskt underlag',JSON.stringify({notes:'PRIVATE-DRAFT-'+suffix}),0,at);
   sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(person.user,id('ms-'+person.id),person.email,'synthetic-sealed-placeholder',at);
   sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run(id('mail-'+person.id),person.user,'mail',JSON.stringify({subject:'PRIVATE-OUTLOOK-'+suffix}),customerId,0,at,at);
   sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run(id('oauth-'+person.id),person.user,'synthetic-verifier',1890000000000);
  }
  objects.set(objectKey,new Uint8Array([67,82,77,55,55]));
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(fileId,space,customerId,objectKey,JSON.stringify({id:fileId,name:'synthetic-proof.txt',version:'v1',kind:'proof',size:5,at}));
  meta=sqlite.prepare('SELECT * FROM crm_spaces WHERE id=?').get(space);baseline=snapshot();
  for(const role of roles){resetCase(role);const before=snapshot();projection(await get(),role);unchanged(before,'Fresh '+role+' read');counts.fresh++;}
  for(const source of roles)for(const change of [...roles.filter(role=>role!==source),...identityChanges]){
   resetCase(source);let injected=false,revoked;
   db.batch=async statements=>{const result=await normalBatch(statements);if(!injected&&statements[0].sql.startsWith('SELECT version,settings FROM crm_spaces')){injected=true;downgrade(change);revoked=snapshot();}return result;};
   const response=await get();assert.ok(injected);denied(response,source+'→'+change+' during GET load');unchanged(revoked,'Revoked GET');counts.getRevocations++;
  }
  // A lost response must not undo a legitimate atomic commit or create a second
  // event/version/ledger entry when the same request is retried after recovery.
  for(const source of roles.filter(role=>role!=='reader'))for(const change of [...roles.filter(role=>role!==source),...identityChanges]){
   resetCase(source);const before=snapshot(),note=['admin','seller'].includes(source),body=payload(note?'customer_note':'notice_read',note?{customerId,text:'Committed before denied response '+suffix}:{id:noticeId});
   let injected=false,committed;
   db.batch=async statements=>{const result=await normalBatch(statements);if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')&&result[0].meta.changes===1){injected=true;downgrade(change);committed=snapshot();}return result;};
   const response=await post(body);assert.ok(injected);denied(response,source+'→'+change+' after commit');unchanged(committed,'Denied committed response');
   assert.equal(sqlite.prepare('SELECT version FROM crm_spaces WHERE id=?').get(space).version,meta.version+1);
   assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,body.requestId).n,1);
   assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_events WHERE space=? AND customer_id=? AND id<>?').get(space,customerId,eventId).n,note?1:0);
   untouchedStores(before,new Set(['crm_spaces','crm_members','crm_mutations',note?'crm_events':'crm_notices']),'Post-commit denial');
   db.batch=normalBatch;resetActor(source);const replayBefore=snapshot(),replay=await post(body);projection(replay,source);unchanged(replayBefore,'Restored exact retry after denied ACK');counts.committedRevocations++;
  }
  resetCase();const dropped=payload('customer_note',{customerId,text:'Lost transport ACK '+suffix});
  const lost=await api.POST(request('/api/crm',dropped));assert.equal(lost.status,200); // Deliberately discard its body.
  const lostBefore=snapshot(),recovered=await post(dropped);assert.equal(recovered.status,200);unchanged(lostBefore,'Exact retry after lost transport ACK');
  assert.equal(sqlite.prepare('SELECT version FROM crm_spaces WHERE id=?').get(space).version,meta.version+1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_events WHERE space=? AND customer_id=? AND id<>?').get(space,customerId,eventId).n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,dropped.requestId).n,1);
  for(const change of [...roles.filter(role=>role!=='admin'),...identityChanges]){
   resetCase();const body=payload('customer_note',{customerId,text:'Replay authorization '+suffix});assert.equal((await post(body)).status,200);
   let reads=0,injected=false,revoked;
   db.batch=async statements=>{const result=await normalBatch(statements);if(statements[0].sql.startsWith('SELECT version,settings FROM crm_spaces')&&++reads===2){injected=true;downgrade(change);revoked=snapshot();}return result;};
   const replay=await post(body);assert.ok(injected);denied(replay,'Replay final load→'+change);unchanged(revoked,'Revoked replay');
   db.batch=normalBatch;resetActor();const before=snapshot();assert.equal((await post(body)).status,200);unchanged(before,'Replay after authorization restored');counts.replayRevocations++;
  }
  const conflicts=[
   ['record','customer',{...rows.crm_customers,email:'synthetic-change@example.test'},{expectedRecord:'stale-record'},'record_conflict'],
   ['workflow','plan',{customerId,expectedContext:'stale-workflow'},{},'customer_workflow_conflict'],
   ['customer-responsibility','customer_responsibility_transfer',{customerId,targetProfileId:crypto.randomUUID(),reason:'Syntetisk granskning',reviewed:true,expectedContext:'stale-responsibility'},{},'customer_responsibility_conflict'],
   ['commercial-responsibility','commercial_responsibility_transfer',{targetType:'order',targetId:orderId,targetProfileId:crypto.randomUUID(),reason:'Syntetisk granskning',reviewed:true,expectedContext:'stale-commercial'},{},'commercial_responsibility_conflict'],
   ['receipt','receipt_confirm',{orderId,expectedContext:'stale-receipt'},{},'receipt_conflict'],
   ['production','production_printed',{orderId,expectedProduction:'stale-production'},{},'production_conflict'],
   ['follow-up','follow_up',{taskId,expectedContext:'stale-followup'},{},'followup_conflict'],
   ['workspace-version','note',{customerId,text:'Syntetisk anteckning',contact:false},{version:Math.max(0,meta.version-1)},undefined]
  ];
  // Give the unsafe workspace-version control an actually stale nonnegative revision.
  if(meta.version===0)conflicts.at(-1)[3].version=1;
  for(const [label,type,data,extra,code] of conflicts){
   resetCase();const body=payload(type,data,extra),before=snapshot(),positive=await post(body);assert.equal(positive.status,409,label+': '+JSON.stringify(positive.data));assert.ok(positive.data.state);if(code)assert.equal(positive.data.code,code);unchanged(before,'Authorized '+label+' conflict');
   for(const change of ['production','owner','inactive','user_id','member_id']){
    resetCase();let injected=false,revoked;
    db.batch=async statements=>{const result=await normalBatch(statements);if(!injected&&statements[0].sql.startsWith('SELECT version,settings FROM crm_spaces')){injected=true;downgrade(change);revoked=snapshot();}return result;};
    const response=await post(body);assert.ok(injected);denied(response,label+' conflict→'+change);unchanged(revoked,'Revoked '+label+' conflict');counts.conflictRevocations++;
   }
  }
  for(const safe of [false,true]){
   resetCase();const body=payload(safe?'customer_note':'note',safe?{customerId,text:'Retry exhausted '+suffix}:{customerId,text:'Unsafe CAS '+suffix,contact:false});let commits=0,reads=0,injected=false,revoked;
   db.batch=async statements=>{
    if(statements[0].sql.startsWith('UPDATE crm_spaces')){commits++;sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run(space);}
    const result=await normalBatch(statements);
    if(statements[0].sql.startsWith('SELECT version,settings FROM crm_spaces')&&++reads===(safe?5:2)){injected=true;downgrade('production');revoked=snapshot();}
    return result;
   };
   const response=await post(body);assert.ok(injected);assert.equal(commits,safe?4:1);denied(response,safe?'Exhausted safe retry':'Unsafe lost CAS');unchanged(revoked,'CAS denial');
   assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,body.requestId).n,0);
   assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_events WHERE space=? AND customer_id=? AND id<>?').get(space,customerId,eventId).n,0);counts.conflictRevocations++;
  }
  for(const [label,route,path,needle] of [['drafts',draftApi,'/api/crm/drafts?space='+space,'SELECT * FROM crm_drafts'],['private-copy',copyApi,'/api/crm/drafts/copy?space='+space,'WITH own AS MATERIALIZED']]){
   resetCase();const before=snapshot(),positive=await route.GET(request(path));assert.equal(positive.status,200);const text=await positive.text();assert.ok(text.includes('PRIVATE-DRAFT-'+suffix));unchanged(before,'Authorized private '+label+' read');
   for(const change of ['production','reader','inactive','user_id','member_id','owner']){
    resetCase();let injected=false,revoked;
    prototype.all=async function(){const result=await normalAll.call(this);if(!injected&&this.sql.startsWith(needle)){injected=true;downgrade(change);revoked=snapshot();}return result;};
    const response=await route.GET(request(path)).then(json);assert.ok(injected);denied(response,'Private '+label+' read→'+change);unchanged(revoked,'Revoked private read');counts.privateRevocations++;
   }
  }
  resetCase();unchanged(baseline,'Restored owned fixture baseline');
 }finally{
  db.batch=normalBatch;prototype.all=normalAll;
  for(const requestId of requests)sqlite.prepare('DELETE FROM crm_mutations WHERE space=? AND id=?').run(space,requestId);
  sqlite.prepare('DELETE FROM crm_files WHERE id=?').run(fileId);objects.delete(objectKey);
  for(const table of ['crm_events','crm_tasks','crm_orders','crm_deals'])sqlite.prepare('DELETE FROM '+table+' WHERE space=? AND customer_id=?').run(space,customerId);
  sqlite.prepare('DELETE FROM crm_notices WHERE space=? AND id=?').run(space,noticeId);sqlite.prepare('DELETE FROM crm_customers WHERE space=? AND id=?').run(space,customerId);
  for(const person of [actor,other]){
   for(const table of ['crm_drafts','outlook_items','outlook_connections','outlook_oauth_states'])sqlite.prepare('DELETE FROM '+table+' WHERE user_id=?').run(person.user);
   sqlite.prepare('DELETE FROM crm_members WHERE email=?').run(person.email);
  }
  if(originalMeta)sqlite.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').run(originalMeta.version,originalMeta.write_token,originalMeta.settings,space);else sqlite.prepare('DELETE FROM crm_spaces WHERE id=?').run(space);
  unchanged(original,'Final exact pre-fixture restore');
 }
 console.log('PASS CRM response authorization: '+JSON.stringify(counts)+'; all roles/fresh projections, in-flight membership changes, post-commit denied ACK and lost transport ACK exact replay, state conflicts/CAS/retry exhaustion, private route controls, positive 18-table/R2 sentinels and exact fixture restore. Single SQLite connection; no live-account or independent-connection claim.');
}
