import assert from 'node:assert/strict';

export async function verifyAccessSafety(h){
 const {core,sqlite,get,post,roleGet}=h;
 const members=await import('../work/members-api.mjs');
 const originalAccounts=sqlite.prepare('SELECT id,role,active FROM crm_members').all();
 const adminIds=['access-admin-a','access-admin-b'];
 const emails=['access-seller-a@example.com','access-seller-b@example.com'];
 const state=await get('live');
 const availableOwner=state.settings.owners.find(owner=>!sqlite.prepare('SELECT id FROM crm_members WHERE owner=? AND active=1').get(owner));
 assert.ok(availableOwner,'The fixture needs one available salesperson profile.');
 const write=(actor,data)=>members.POST(new Request('https://crm.test/api/crm/members',{method:'POST',headers:{'oai-authenticated-user-id':actor,'oai-authenticated-user-email':actor+'@example.com','Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify(data)}));
 try{
  for(const id of adminIds)sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(id,id+'@example.com',id,id,'admin','');
  // Both requests pass the preliminary read before either write. The SQL gate
  // must keep the profile unique for both new accounts and existing accounts.
  const race=await Promise.all(adminIds.map((id,i)=>write(id,{email:emails[i],name:'Concurrent seller '+i,role:'seller',owner:availableOwner,active:true})));
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_members WHERE owner=? AND active=1').get(availableOwner).n,1);
  const winner=sqlite.prepare('SELECT email FROM crm_members WHERE owner=? AND active=1').get(availableOwner).email;
  sqlite.prepare('UPDATE crm_members SET active=0 WHERE email=?').run(winner);
  for(const email of emails)sqlite.prepare('INSERT INTO crm_members(id,email,name,role,owner,active) VALUES(?,?,?,?,?,0) ON CONFLICT(email) DO UPDATE SET active=0').run(email,email,'Existing seller','seller','');
  const existingRace=await Promise.all(adminIds.map((id,i)=>write(id,{email:emails[i],name:'Existing seller '+i,role:'seller',owner:availableOwner,active:true})));
  assert.deepEqual(existingRace.map(r=>r.status).sort(),[200,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_members WHERE owner=? AND active=1').get(availableOwner).n,1);
  // Two administrators may each try to remove the other's role. Authorization
  // and the last-administrator rule must still hold when the actual write runs.
  sqlite.prepare("UPDATE crm_members SET active=0 WHERE role='admin' AND id NOT IN (?,?)").run(...adminIds);
  const removals=await Promise.all(adminIds.map((id,i)=>write(id,{email:adminIds[1-i]+'@example.com',name:adminIds[1-i],role:'reader',owner:'',active:true})));
  assert.equal(removals.filter(r=>r.status===200).length,1);
  assert.ok(removals.some(r=>r.status===409||r.status===403));
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM crm_members WHERE role='admin' AND active=1").get().n,1);
 }finally{
  for(const email of [...emails,...adminIds.map(id=>id+'@example.com')])sqlite.prepare('DELETE FROM crm_members WHERE email=?').run(email);
  for(const account of originalAccounts)sqlite.prepare('UPDATE crm_members SET role=?,active=? WHERE id=?').run(account.role,account.active,account.id);
 }
 console.log('PASS access safety: concurrent new/existing profile assignment and cross-admin removal preserve unique responsibility and one active administrator.');
 await verifyMutationAuthorization(h);

 const dashboards=await import('../work/sales-dashboard.mjs');
 let live=await get('live');
 const unbilled=live.orders.find(o=>o.invoiceValue===null&&o.production.status==='dispatched');
 assert.ok(unbilled,'The fixture needs a dispatched order ready for invoicing.');
 const invoiceOwner=unbilled.owner,otherOwner=live.settings.owners.find(owner=>owner!==invoiceOwner);
 let result=await post(live,'order',{...unbilled,invoiceValue:1234,invoiceDate:core.day(),invoiceRef:'ACCESS-INVOICE',actualCost:500,invoiceOwner:otherOwner},'live');
 assert.equal(result.status,200,JSON.stringify(result.data));live=result.data;
 let saved=live.orders.find(o=>o.id===unbilled.id);
 assert.equal(saved.invoiceOwner,invoiceOwner,'The caller cannot forge invoice attribution.');
 const month=core.day().slice(0,7),before=Object.fromEntries([invoiceOwner,otherOwner,'all'].map(owner=>[owner,dashboards.salesMetrics(live,month,owner)]));
 result=await post(live,'order',{...saved,owner:otherOwner,invoiceOwner:otherOwner},'live');
 assert.equal(result.status,200,JSON.stringify(result.data));live=result.data;saved=live.orders.find(o=>o.id===unbilled.id);
 assert.equal(saved.owner,otherOwner);assert.equal(saved.invoiceOwner,invoiceOwner);
 for(const owner of [invoiceOwner,otherOwner,'all']){
  const after=dashboards.salesMetrics(live,month,owner);
  for(const field of ['revenue','yearRevenue','profit','margin'])assert.equal(after[field],before[owner][field],field+' must retain historical attribution for '+owner);
 }
 assert.ok(dashboards.salesMetrics(live,month,otherOwner).orders.some(o=>o.id===unbilled.id),'Operational responsibility can still move.');
 assert.equal((await roleGet('production')).orders.find(o=>o.id===unbilled.id).invoiceOwner,'');

 // Old orders acquire their current historical attribution on normalization,
 // while subsequent payloads and responsibility changes cannot replace it.
 const legacy=core.seedState(),legacyOrder=legacy.orders.find(o=>o.invoiceValue!==null);delete legacyOrder.invoiceOwner;
 const normalized=core.normalizeState(legacy);assert.equal(normalized.orders.find(o=>o.id===legacyOrder.id).invoiceOwner,legacyOrder.owner);
 console.log('PASS access safety: invoice-owner snapshot, forged payload rejection, month/year/margin history survives order transfer, legacy fallback and department invoice redaction.');
}

// The actor can change after authentication, before the actual SQL write or
// between CAS attempts. Exercise the API and its whole transaction, not a mock.
export async function verifyMutationAuthorization({core,sqlite,get}){
 const api=await import('../work/api.mjs'),store=await import('../work/crm-store.mjs'),conflicts=await import('../work/record-conflicts.mjs');
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch,account={id:'access-mutation-member',user:'access-mutation-user',email:'access-mutation@example.com'},space='demo';
 const initial=await get(space),owner=initial.settings.owners[0],customerId='access-mutation-customer-'+crypto.randomUUID();
 const auth={'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email,'Content-Type':'application/json',Origin:'https://crm.test'};
 const resetActor=(role='seller')=>sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,role=excluded.role,owner=excluded.owner,active=1').run(account.id,account.email,account.user,'Isolerat åtkomstprov',role,owner);
 const snapshot=()=>({meta:sqlite.prepare('SELECT * FROM crm_spaces WHERE id=?').get(space),rows:Object.fromEntries([...Object.values(store.tables),'crm_mutations','crm_drafts'].map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' WHERE space=? ORDER BY id').all(space)]))});
 const baseline=snapshot();
 const write=async(payload)=>{const response=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:auth,body:JSON.stringify(payload)}));return {status:response.status,data:await response.json()}};
 const fixture=async(label,role='seller',type='customer_note')=>{
  resetActor(role);const state=await get(space),id='access-mutation-draft-'+label,requestId=crypto.randomUUID();
  sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,1,?,?,?,0,?)').run(space,account.user,id,'note',customerId,crypto.randomUUID(),label,JSON.stringify({text:label}),'2026-01-01T12:00:00Z');
  return {space,version:state.version,requestId,type,expectedRecord:type==='settings'?conflicts.recordBasis(state.settings):undefined,data:type==='settings'?state.settings:{customerId,text:label,draft:{id,revision:1}}};
 };
 try{
  await store.initialize(space);
  const customer=core.CustomerSchema.parse({id:customerId,name:'Syntetiskt åtkomstprov '+customerId,owner});
  sqlite.prepare('INSERT INTO crm_customers(space,id,data) VALUES(?,?,?)').run(space,customer.id,JSON.stringify(customer));
  const revoked=[
   ['inactive',()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id)],
   ['reader',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',account.id)],
   ['production',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('production',account.id)],
   ['deleted',()=>sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id)],
   ['identity',()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('different-authenticated-user',account.id)]
  ];
  for(const [label,revoke] of revoked){
   const payload=await fixture(label),before=snapshot();let injected=false;
   db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;revoke()}return normalBatch(statements)};
   let result;try{result=await write(payload)}finally{db.batch=normalBatch}
   assert.ok(injected);assert.equal(result.status,403,JSON.stringify(result.data));assert.equal(result.data.state,undefined);assert.deepEqual(snapshot(),before,'Revoked actor must leave CRM, version, token, events, ledger and private draft unchanged: '+label);
   assert.equal(sqlite.prepare('SELECT id FROM crm_mutations WHERE space=? AND id=?').get(space,payload.requestId),undefined);
  }
  // Non-retrying administrator actions also reauthenticate before returning
  // any conflict state after a failed atomic gate.
  const unsafe=await fixture('admin-demoted','admin','settings'),unsafeBefore=snapshot();let demoted=false;
  db.batch=async statements=>{if(!demoted&&statements[0].sql.startsWith('UPDATE crm_spaces')){demoted=true;sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',account.id)}return normalBatch(statements)};
  let denied;try{denied=await write(unsafe)}finally{db.batch=normalBatch}
  assert.ok(demoted,JSON.stringify(denied));assert.equal(denied.status,403);assert.deepEqual(snapshot(),unsafeBefore);assert.equal(denied.data.state,undefined);

  // A real peer version change defeats CAS. A role revoked after that loss
  // must be checked before the request retries with its old actor snapshot.
  const stale=await fixture('cas-revoked'),staleBefore=snapshot();let collided=false,peerSnapshot;
  db.batch=async statements=>{
   if(!collided&&statements[0].sql.startsWith('UPDATE crm_spaces')){
    collided=true;sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run(space);peerSnapshot=snapshot();
    const result=await normalBatch(statements);sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('production',account.id);return result;
   }return normalBatch(statements);
  };
  let blocked;try{blocked=await write(stale)}finally{db.batch=normalBatch}
  assert.ok(collided);assert.equal(blocked.status,403);assert.equal(blocked.data.state,undefined);assert.equal(peerSnapshot.meta.version,staleBefore.meta.version+1);assert.deepEqual(snapshot(),peerSnapshot,'Only the peer version change may persist after a CAS loss and actor revocation.');

  // An allowed role change can retry, but the second commit and returned
  // viewer must use the fresh server role. Archive and receipt occur once.
  const allowed=await fixture('allowed-retry','admin'),allowedBefore=snapshot();let writes=0;
  db.batch=async statements=>{if(statements[0].sql.startsWith('UPDATE crm_spaces')){writes++;if(writes===1)sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',account.id)}return normalBatch(statements)};
  let accepted;try{accepted=await write(allowed)}finally{db.batch=normalBatch}
  assert.equal(accepted.status,200,JSON.stringify(accepted.data));assert.equal(writes,2);assert.equal(accepted.data.viewer.role,'seller');assert.equal(accepted.data.version,allowedBefore.meta.version+1);
  const acceptedSnapshot=snapshot(),draft=sqlite.prepare('SELECT revision,archived FROM crm_drafts WHERE space=? AND user_id=? AND id=?').get(space,account.user,allowed.data.draft.id);
  assert.equal(draft.revision,2);assert.equal(draft.archived,1);assert.equal(accepted.data.events.filter(e=>e.text==='allowed-retry').length,1);
  assert.equal((await write(allowed)).status,200);assert.deepEqual(snapshot(),acceptedSnapshot,'Exact replay must neither archive twice nor duplicate events or receipts.');

  // Losing the acknowledgement after the batch commits still leaves one
  // archived draft and a receipt that the exact retry can safely resolve.
  const lost=await fixture('lost-ack');let committed=false;
  db.batch=async statements=>{const result=await normalBatch(statements);if(!committed&&statements[0].sql.startsWith('UPDATE crm_spaces')){committed=true;throw new Error('Isolated lost commit acknowledgement')}return result};
  let uncertain;try{uncertain=await write(lost)}finally{db.batch=normalBatch}
  assert.ok(committed);assert.equal(uncertain.status,503);const committedSnapshot=snapshot();
  assert.equal(sqlite.prepare('SELECT archived,revision FROM crm_drafts WHERE space=? AND user_id=? AND id=?').get(space,account.user,lost.data.draft.id).archived,1);
  assert.equal(sqlite.prepare('SELECT user_id FROM crm_mutations WHERE space=? AND id=?').get(space,lost.requestId).user_id,account.user);
  const replay=await write(lost);assert.equal(replay.status,200);assert.equal(replay.data.events.filter(e=>e.text==='lost-ack').length,1);assert.deepEqual(snapshot(),committedSnapshot);
 }finally{
  db.batch=normalBatch;
  // Restore the exact prior demo rows, including version/token and receipts.
  // Keep existing customer IDs in place so pre-existing file references remain
  // valid; delete only newly added rows, in foreign-key dependency order.
  for(const table of Object.keys(baseline.rows).reverse()){
   const keys=table==='crm_drafts'?['space','user_id','id']:['space','id'],key=row=>JSON.stringify(keys.map(k=>row[k])),prior=new Set(baseline.rows[table].map(key));
   for(const row of sqlite.prepare('SELECT * FROM '+table+' WHERE space=?').all(space))if(!prior.has(key(row)))sqlite.prepare('DELETE FROM '+table+' WHERE '+keys.map(k=>k+'=?').join(' AND ')).run(...keys.map(k=>row[k]));
   for(const row of baseline.rows[table]){
    const fields=Object.keys(row).filter(k=>!keys.includes(k));
    if(fields.length)sqlite.prepare('UPDATE '+table+' SET '+fields.map(k=>k+'=?').join(',')+' WHERE '+keys.map(k=>k+'=?').join(' AND ')).run(...fields.map(k=>row[k]),...keys.map(k=>row[k]));
   }
  }
  if(baseline.meta)sqlite.prepare('UPDATE crm_spaces SET version=?,write_token=?,settings=? WHERE id=?').run(baseline.meta.version,baseline.meta.write_token,baseline.meta.settings,space);
  else sqlite.prepare('DELETE FROM crm_spaces WHERE id=?').run(space);
  sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id);
  assert.deepEqual(snapshot(),baseline,'Access probes must restore the exact prior demo state, ledger and drafts.');
 }
 console.log('PASS access safety: atomic main-API actor identity/active/role gates, unchanged CRM/draft/ledger on revocation, non-safe denial, fresh CAS roles, exactly-once archive and lost-ack replay.');
}
