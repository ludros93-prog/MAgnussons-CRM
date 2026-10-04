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
