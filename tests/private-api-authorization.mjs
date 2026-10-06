import assert from 'node:assert/strict';

export async function verifyPrivateApiAuthorization({core,sqlite,fileApi,draftApi}){
 const env=globalThis.__crmEnv,db=env.DB,space='demo',suffix=crypto.randomUUID(),customerId='private-auth-c-'+suffix,orderId='private-auth-o-'+suffix,dealId='private-auth-d-'+suffix;
 const account={id:'private-auth-m-'+suffix,user:'private-auth-u-'+suffix,email:'private-auth-'+suffix+'@example.com'},other={id:'private-other-m-'+suffix,user:'private-other-u-'+suffix,email:'private-other-'+suffix+'@example.com'};
 const tables=['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'];
 const snapshot=()=>({meta:sqlite.prepare('SELECT * FROM crm_spaces WHERE id=?').get(space),rows:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' WHERE space=? ORDER BY id').all(space)]))});
 const original=snapshot(),settings=original.meta?JSON.parse(original.meta.settings):core.emptyState().settings,owner=settings.owners[0];
 const originalBucket=env.BUCKET,normalBatch=db.batch,prototype=Object.getPrototypeOf(db.prepare('SELECT 1')),methods=Object.fromEntries(['first','all','run'].map(name=>[name,prototype[name]]));
 const objects=new Map(),deleted=[];let beforeSQL,afterSQL,beforeBatch,afterBatch,afterPut,afterGet;
 const resetHooks=()=>{beforeSQL=afterSQL=beforeBatch=afterBatch=afterPut=afterGet=undefined;};
 const reset=(role='seller')=>sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,role=excluded.role,owner=excluded.owner,active=1').run(account.id,account.email,account.user,'Syntetisk användare',role,owner);
 const auth=(who=account)=>({'oai-authenticated-user-id':who.user,'oai-authenticated-user-email':who.email,Origin:'https://crm.test'});
 const json=async response=>({status:response.status,data:await response.json()});
 const denied=r=>{assert.equal(r.status,403,JSON.stringify(r.data));assert.deepEqual(Object.keys(r.data),['error'],'Revoked access must return no current draft, metadata, viewer or CRM payload.');};
 const draftInput=(changes={})=>({space,id:'private-auth-draft-'+crypto.randomUUID(),kind:'form',context:customerId,revision:0,requestId:crypto.randomUUID(),title:'Privat syntetiskt utkast',data:{notes:'PRIVATE-SYNTHETIC-'+suffix},archived:false,...changes});
 const draftWrite=(input,who=account)=>draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...auth(who),'Content-Type':'application/json'},body:JSON.stringify(input)})).then(json);
 const draftRead=(id='',who=account)=>draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space,...(id?{id}:{})}),{headers:auth(who)})).then(json);
 const fileWrite=()=>{const body=new FormData();body.set('space',space);body.set('customerId',customerId);body.set('version','synthetic-v1');body.set('kind','document');body.set('file',new File([new TextEncoder().encode('%PDF-1.7 synthetic')],'synthetic.pdf'));return fileApi.POST(new Request('https://crm.test/api/crm/files',{method:'POST',headers:auth(),body})).then(json);};
 const photoWrite=()=>{const body=new FormData();for(const [key,value] of Object.entries({space,customerId,version:'synthetic-photo-v1',kind:'document',purpose:'production',orderId,workId:'private-auth-work-'+suffix}))body.set(key,value);body.set('file',new File([new Uint8Array([137,80,78,71,13,10,26,10,1])],'synthetic.png'));return fileApi.POST(new Request('https://crm.test/api/crm/files',{method:'POST',headers:auth(),body})).then(json);};
 const fileRead=(params)=>fileApi.GET(new Request('https://crm.test/api/crm/files?'+new URLSearchParams({space,...params}),{headers:auth()}));
 const revocations=[
  ['inactive',()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id)],
  ['reader',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',account.id)],
  ['production',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('production',account.id)],
  ['deleted',()=>sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id)],
  ['identity',()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('changed-'+account.user,account.id)],
  ['owner',()=>sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run('changed-owner',account.id)],
  ['allowed-role',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('admin',account.id)]
 ];
 for(const name of Object.keys(methods))prototype[name]=async function(){if(beforeSQL)await beforeSQL(this.sql,name);const result=await methods[name].call(this);if(afterSQL)await afterSQL(this.sql,name);return result;};
 db.batch=async statements=>{if(beforeBatch)await beforeBatch(statements);const result=await normalBatch(statements);if(afterBatch)await afterBatch(statements);return result;};
 env.BUCKET={put:async(key,body)=>{objects.set(key,new Uint8Array(await new Response(body).arrayBuffer()));if(afterPut)await afterPut(key);},delete:async key=>{deleted.push(key);objects.delete(key);},get:async key=>{const bytes=objects.get(key);if(afterGet)await afterGet(key);return bytes?{body:new Response(bytes).body}:null;}};
 try{
  sqlite.prepare('INSERT OR IGNORE INTO crm_spaces(id,version,write_token,settings) VALUES(?,0,?,?)').run(space,'',JSON.stringify(settings));
  const customer=core.CustomerSchema.parse({id:customerId,name:'Syntetiskt privat åtkomstprov',owner});
  const deal=core.DealSchema.parse({id:dealId,customerId,owner,title:'Syntetiskt fotojobb'});
  const order=core.OrderSchema.parse({id:orderId,customerId,dealId,owner,stage:'production',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:core.day(),deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'',production:{workId:'private-auth-work-'+suffix,status:'submitted'}});
  sqlite.prepare('INSERT INTO crm_customers(space,id,data) VALUES(?,?,?)').run(space,customerId,JSON.stringify(customer));
  sqlite.prepare('INSERT INTO crm_deals(space,id,customer_id,data) VALUES(?,?,?,?)').run(space,dealId,customerId,JSON.stringify(deal));
  sqlite.prepare('INSERT INTO crm_orders(space,id,customer_id,deal_id,data) VALUES(?,?,?,?,?)').run(space,orderId,customerId,dealId,JSON.stringify(order));
  sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(other.id,other.email,other.user,'Annan syntetisk användare','seller','');

  // All original four races, plus the other fields in the atomic member gate.
  // A still-allowed role change also rejects the stale request; a new request
  // below succeeds with its fresh role instead of continuing with old scope.
  for(const [label,revoke] of revocations){
   reset();const before=snapshot(),priorObjects=new Map(objects),priorDeletes=deleted.length;let injected=false;
   afterPut=async()=>{injected=true;revoke();};let r;try{r=await fileWrite();}finally{resetHooks();}
   assert.ok(injected,label);denied(r);assert.deepEqual(snapshot(),before,'A denied file gate must preserve workspace, file metadata and event history: '+label);assert.deepEqual(objects,priorObjects,'Only the request staging object may be removed: '+label);assert.equal(deleted.length,priorDeletes+1);
  }
  reset('admin');let r=await fileWrite();assert.equal(r.status,200,JSON.stringify(r.data));const document=r.data,documentKey=space+'/'+customerId+'/'+document.id;assert.ok(objects.has(documentKey));
  // A role change before staging performs no R2 put and no CRM write.
  reset();let injected=false;const earlyBefore=snapshot(),earlyObjects=new Map(objects);
  afterSQL=async(sql,name)=>{if(!injected&&name==='first'&&sql==='SELECT version FROM crm_spaces WHERE id=?'){injected=true;revocations[0][1]();}};
  try{r=await fileWrite();}finally{resetHooks();}assert.ok(injected);denied(r);assert.deepEqual(snapshot(),earlyBefore);assert.deepEqual(objects,earlyObjects);

  for(const [label,revoke] of revocations){
   for(const mode of ['create','update','archive']){
    reset();let input=draftInput();if(mode!=='create'){r=await draftWrite(input);assert.equal(r.status,200,JSON.stringify(r.data));input={...input,revision:r.data.revision,requestId:crypto.randomUUID(),archived:mode==='archive',data:{notes:'Changed private text'}};}
    const before=snapshot();let injected=false;
    beforeSQL=async(sql,name)=>{if(!injected&&name==='run'&&(/^(INSERT OR IGNORE INTO|UPDATE) crm_drafts/.test(sql))){injected=true;revoke();}};
    try{r=await draftWrite(input);}finally{resetHooks();}assert.ok(injected,label+' '+mode);denied(r);assert.deepEqual(snapshot(),before,'Revocation must block draft create/update/archive without revision changes: '+label+' '+mode);
   }
  }
  reset();const input=draftInput(),crmBefore=snapshot().meta;
  r=await draftWrite(input);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.revision,1);assert.deepEqual(snapshot().meta,crmBefore,'Private autosave never changes the CRM version or token.');
  const update={...input,revision:1,requestId:crypto.randomUUID(),data:{notes:'PRIVATE-UPDATED-'+suffix}};r=await draftWrite(update);assert.equal(r.status,200);assert.equal(r.data.revision,2);
  const replayBefore=snapshot();r=await draftWrite(update);assert.equal(r.status,200);assert.equal(r.data.revision,2);assert.deepEqual(snapshot(),replayBefore);
  r=await draftWrite({...input,requestId:crypto.randomUUID(),revision:1});assert.equal(r.status,409);assert.equal(r.data.current.revision,2);assert.equal(r.data.current.data.notes,update.data.notes);
  const archive={...update,revision:2,requestId:crypto.randomUUID(),archived:true};r=await draftWrite(archive);assert.equal(r.status,200);assert.equal(r.data.revision,3);assert.equal(r.data.archived,true);
  r=await draftWrite(archive);assert.equal(r.status,200);assert.equal(r.data.revision,3);
  r=await draftWrite({...archive,revision:3,requestId:crypto.randomUUID(),archived:false});assert.equal(r.status,409);assert.equal(r.data.current.archived,true);assert.equal((await draftRead(input.id)).data[0].archived,true);assert.ok(!(await draftRead()).data.some(d=>d.id===input.id));assert.deepEqual((await draftRead(input.id,other)).data,[]);

  // A second real API request wins between the first read and the SQL write.
  // Both insert and update CAS still expose current data to the authorized actor.
  for(const mode of ['create','update']){
   reset();let mine=draftInput();if(mode==='update'){r=await draftWrite(mine);assert.equal(r.status,200);mine={...mine,revision:r.data.revision,requestId:crypto.randomUUID()};}
   let injected=false,peer,peerState;beforeSQL=async(sql,name)=>{if(!injected&&name==='run'&&(/^(INSERT OR IGNORE INTO|UPDATE) crm_drafts/.test(sql))){injected=true;peer=await draftWrite({...mine,requestId:crypto.randomUUID(),data:{notes:'PRIVATE-PEER-'+suffix}});assert.equal(peer.status,200,JSON.stringify(peer.data));peerState=snapshot();}};
   try{r=await draftWrite(mine);}finally{resetHooks();}assert.ok(injected);assert.equal(r.status,409,JSON.stringify(r.data));assert.deepEqual(r.data.current,peer.data);assert.deepEqual(snapshot(),peerState,'The losing draft request must preserve the peer write exactly.');
  }

  // Revocation in an early replay/conflict read must not expose its previous
  // private row. The same protection applies after the final SELECT on success.
  for(const mode of ['replay','conflict']){
   reset();const before=snapshot();let injected=false;
   afterSQL=async(sql,name)=>{if(!injected&&name==='first'&&sql.startsWith('SELECT * FROM crm_drafts WHERE space=')){injected=true;revocations[2][1]();}};
   try{r=await draftWrite(mode==='replay'?archive:{...update,revision:1,requestId:crypto.randomUUID()});}finally{resetHooks();}assert.ok(injected);denied(r);assert.deepEqual(snapshot(),before);
  }
  reset();let selects=0;const lateInput=draftInput();
  afterSQL=async(sql,name)=>{if(name==='first'&&sql.startsWith('SELECT * FROM crm_drafts WHERE space=')&&++selects===2)revocations[0][1]();};
  try{r=await draftWrite(lateInput);}finally{resetHooks();}denied(r);assert.equal(sqlite.prepare('SELECT revision FROM crm_drafts WHERE space=? AND user_id=? AND id=?').get(space,account.user,lateInput.id).revision,1,'A legitimate write before later revocation remains committed; only its response is denied.');

  for(const [label,revoke] of revocations){
   reset();let injected=false;const before=snapshot();
   beforeSQL=async(sql,name)=>{if(!injected&&name==='all'&&sql.startsWith('SELECT * FROM crm_drafts WHERE space=')){injected=true;revoke();}};
   try{r=await draftRead();}finally{resetHooks();}assert.ok(injected);denied(r);assert.deepEqual(snapshot(),before,'Read revocation must not mutate private drafts: '+label);
   reset();injected=false;beforeSQL=async(sql,name)=>{if(!injected&&name==='all'&&sql.startsWith('SELECT data FROM crm_files WHERE space=')){injected=true;revoke();}};
   try{r=await fileRead({customerId}).then(json);}finally{resetHooks();}assert.ok(injected);denied(r);assert.deepEqual(snapshot(),before);
   reset();injected=false;afterGet=async()=>{injected=true;revoke();};
   try{r=await fileRead({id:document.id}).then(json);}finally{resetHooks();}assert.ok(injected);denied(r);assert.deepEqual(snapshot(),before);
  }
  reset('admin');const freshFile=await fileRead({id:document.id});assert.equal(freshFile.status,200);assert.deepEqual(new Uint8Array(await freshFile.arrayBuffer()),objects.get(documentKey));
  // Both existing resource filters still apply with fresh credentials.
  reset('production');assert.equal((await fileRead({id:document.id})).status,403);assert.equal((await fileRead({customerId}).then(json)).data.length,0);assert.equal((await fileWrite()).status,403);r=await photoWrite();assert.equal(r.status,200,JSON.stringify(r.data));const photo=r.data;
  r=await fileRead({customerId}).then(json);assert.deepEqual(r.data.map(f=>f.id),[photo.id]);const preview=await fileRead({id:photo.id,preview:'1'});assert.equal(preview.status,200);assert.equal(preview.headers.get('Content-Type'),'image/png');await preview.arrayBuffer();
  reset('print');const photoAuthBefore=snapshot(),photoAuthObjects=new Map(objects);afterPut=async()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',account.id);
  try{r=await photoWrite();}finally{resetHooks();}denied(r);assert.deepEqual(snapshot(),photoAuthBefore);assert.deepEqual(objects,photoAuthObjects,'Losing the production role must remove only the staged photo.');
  reset();assert.equal((await fileRead({id:document.id,orderId})).status,403);

  // Real workspace CAS and production-snapshot losses remove only their staged
  // object. The peer's version/order change survives the rejected request.
  reset();const casBefore=snapshot(),casObjects=new Map(objects);afterPut=async()=>sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run(space);
  try{r=await fileWrite();}finally{resetHooks();}assert.equal(r.status,409,JSON.stringify(r.data));const casAfter=snapshot();assert.deepEqual(casAfter.rows,casBefore.rows);assert.equal(casAfter.meta.version,casBefore.meta.version+1);assert.equal(casAfter.meta.write_token,casBefore.meta.write_token);assert.deepEqual(objects,casObjects);
  reset('production');const photoBefore=snapshot(),photoObjects=new Map(objects),orderData=sqlite.prepare('SELECT data FROM crm_orders WHERE space=? AND id=?').get(space,orderId).data;
  afterPut=async()=>{const changed=JSON.parse(orderData);changed.production.workId='changed-work';sqlite.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').run(JSON.stringify(changed),space,orderId);};
  try{r=await photoWrite();}finally{resetHooks();}assert.equal(r.status,409,JSON.stringify(r.data));assert.deepEqual(snapshot().meta,photoBefore.meta);assert.deepEqual(objects,photoObjects);assert.equal(JSON.parse(sqlite.prepare('SELECT data FROM crm_orders WHERE space=? AND id=?').get(space,orderId).data).production.workId,'changed-work');sqlite.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').run(orderData,space,orderId);assert.deepEqual(snapshot(),photoBefore);

  // A lost SQL ACK must keep confirmed and uncertain R2 objects. A later access
  // loss denies the metadata response without rolling back a committed file.
  for(const mode of ['authorized','revoked','uncertain-revoked']){
   reset();const before=snapshot(),priorObjects=new Map(objects),priorDeletes=deleted.length;let committed=false,lookupFailed=false;
   afterBatch=async statements=>{if(!committed&&statements[0].sql.startsWith('UPDATE crm_spaces')){committed=true;if(mode!=='authorized')revocations[0][1]();throw Error('Synthetic lost ACK after COMMIT');}};
   if(mode==='uncertain-revoked')beforeSQL=async(sql,name)=>{if(!lookupFailed&&name==='first'&&sql==='SELECT id FROM crm_files WHERE object_key=?'){lookupFailed=true;throw Error('Synthetic unavailable commit outcome');}};
   try{r=await fileWrite();}finally{resetHooks();}assert.ok(committed);if(mode==='authorized')assert.equal(r.status,200,JSON.stringify(r.data));else denied(r);
   const after=snapshot();assert.equal(after.meta.version,before.meta.version+1);assert.equal(after.rows.crm_files.length,before.rows.crm_files.length+1);assert.equal(after.rows.crm_events.length,before.rows.crm_events.length+1);assert.equal(objects.size,priorObjects.size+1);assert.equal(deleted.length,priorDeletes,'No committed/uncertain object may be deleted after an ACK loss.');for(const row of after.rows.crm_files.filter(row=>row.customer_id===customerId))assert.ok(objects.has(row.object_key));if(mode==='uncertain-revoked')assert.ok(lookupFailed);
  }
  reset();const unknownBefore=snapshot(),unknownObjects=new Map(objects),unknownDeletes=deleted.length;let outcomeFailed=false;
  beforeBatch=async statements=>{if(statements[0].sql.startsWith('UPDATE crm_spaces'))throw Error('Synthetic unknown SQL outcome');};beforeSQL=async(sql,name)=>{if(name==='first'&&sql==='SELECT id FROM crm_files WHERE object_key=?'){outcomeFailed=true;throw Error('Synthetic unavailable commit outcome');}};
  try{r=await fileWrite();}finally{resetHooks();}assert.equal(r.status,503,JSON.stringify(r.data));assert.ok(outcomeFailed);assert.deepEqual(snapshot(),unknownBefore);assert.equal(objects.size,unknownObjects.size+1);assert.equal(deleted.length,unknownDeletes,'An unverified outcome must preserve the staged object for recovery.');
 }finally{
  resetHooks();db.batch=normalBatch;for(const [name,method] of Object.entries(methods))prototype[name]=method;env.BUCKET=originalBucket;
  sqlite.prepare('DELETE FROM crm_drafts WHERE space=? AND user_id IN (?,?)').run(space,account.user,other.user);
  for(const table of ['crm_files','crm_events','crm_orders','crm_deals'])sqlite.prepare('DELETE FROM '+table+' WHERE space=? AND customer_id=?').run(space,customerId);
  sqlite.prepare('DELETE FROM crm_customers WHERE space=? AND id=?').run(space,customerId);sqlite.prepare('DELETE FROM crm_members WHERE id IN (?,?)').run(account.id,other.id);
  if(original.meta)sqlite.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').run(original.meta.version,original.meta.write_token,original.meta.settings,space);else sqlite.prepare('DELETE FROM crm_spaces WHERE id=?').run(space);
  assert.deepEqual(snapshot(),original,'The isolated fixture must restore an originally empty or populated demo workspace exactly.');
 }
 console.log('PASS private API authorization: atomic file/draft gates, create/update/archive, private read/replay/conflict responses, fresh role scope, photo/CAS rollback and confirmed/uncertain ACK preservation. Already returned bytes and backup export streams are outside these checks.');
}
