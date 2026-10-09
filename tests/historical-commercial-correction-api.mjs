import assert from 'node:assert/strict';

// Actual CRM route, migrated SQLite, complete raw snapshots and private/R2
// sentinels supplied by the retirement fixture. No production bindings.
export async function verifyHistoricalCommercialCorrectionApi({core,sqlite,get,post,api,conflicts,raw,tableNames,objects,db,normalBatch,state,space,ids,owners,accounts,otherCustomerId,historical}) {
 const cases=[['deal','deals','retirement-lost-deal','reason'],['deal','deals','retirement-blank-lost-deal','reason'],['order','orders','retirement-followed-order','notes'],['order','orders','retirement-blank-followed-order','notes']];
 const row=(st,collection,id)=>st[collection].find(row=>row.id===id);
 const unchanged=(before,label)=>assert.deepEqual(raw(),before,label+' preserves every raw table and R2 byte.');
 function assertCorrection(before,after,beforeRaw,type,collection,id,field,text,requestId) {
  const previous=row(before,collection,id),updated=row(after,collection,id);assert.deepEqual(updated,{...previous,[field]:text});
  assert.equal(after.version,before.version+1);assert.deepEqual(after[collection].filter(item=>item.id!==id),before[collection].filter(item=>item.id!==id));
  for(const key of Object.keys(before).filter(key=>!['version','events',collection].includes(key)))assert.deepEqual(after[key],before[key],key+' is unchanged by the actual route correction.');
  const previousIds=new Set(before.events.map(event=>event.id)),createdEvents=after.events.filter(event=>!previousIds.has(event.id));assert.equal(createdEvents.length,1);assert.equal(after.events.length,before.events.length+1);assert.deepEqual(after.events.filter(event=>previousIds.has(event.id)),before.events);const event=createdEvents[0];assert.equal(event.kind,'historical_commercial_correction');assert.deepEqual(event.actor,{id:before.viewer.id,name:before.viewer.name});assert.equal(event.customerId,previous.customerId);assert.equal(event.dealId,type==='deal'?id:previous.dealId);
  assert.deepEqual(historical(after),historical(before));
  const afterRaw=raw(),allowed=['crm_spaces','crm_mutations','crm_events','crm_'+collection];
  for(const table of tableNames.filter(table=>!allowed.includes(table)))assert.deepEqual(afterRaw.tables[table],beforeRaw.tables[table],table+' stays byte-identical on historical correction.');
  for(const table of allowed)assert.deepEqual(afterRaw.tables[table].filter(item=>table==='crm_spaces'?item.id!==space:item.space!==space),beforeRaw.tables[table].filter(item=>table==='crm_spaces'?item.id!==space:item.space!==space),'The other workspace stays byte-identical in '+table);
  assert.deepEqual(afterRaw.objects,beforeRaw.objects);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  assert.equal(after.events.filter(row=>row.id===event.id).length,1);return afterRaw;
 }
 assert.ok(raw().tables.crm_drafts.length&&raw().tables.outlook_connections.length&&raw().tables.outlook_items.length&&raw().tables.outlook_oauth_states.length&&objects.size,'Private/calendar/R2 preservation uses positive sentinels.');
 for(const [type,collection,id,field] of cases) {
  const before=state,beforeRaw=raw(),previous=row(before,collection,id);assert.ok(previous);const text='Syntetisk rättad historisk '+type+' '+id,data={...previous,[field]:text},requestId=crypto.randomUUID();
  const results=await Promise.all([post(before,type,data,space,requestId),post(before,type,data,space,requestId)]);for(const result of results)assert.equal(result.status,200,JSON.stringify(result.data));state=await get(space);
  const afterRaw=assertCorrection(before,state,beforeRaw,type,collection,id,field,text,requestId);
  assert.equal((await post(before,type,data,space,requestId)).status,200);unchanged(afterRaw,'Exact historical retry');
  const changedReplay=await post(before,type,{...data,[field]:'Syntetiskt annat avsiktligt innehåll'},space,requestId);assert.equal(changedReplay.status,409);unchanged(afterRaw,'Changed-body replay');
  const stale=await post(before,type,{...data,[field]:'Syntetisk gammal redigering'},space);assert.equal(stale.status,409,JSON.stringify(stale.data));unchanged(afterRaw,'Frozen record CAS');
 }
 // A different customer's committed edit changes the workspace version, but
 // the unchanged frozen historical record is allowed to rebase safely.
 const earlier=state,target=row(earlier,'orders','retirement-followed-order'),peer=await post(state,'customer',{...state.customers.find(customer=>customer.id===otherCustomerId),name:'Syntetisk annan kund efter historikgranskning'},space);assert.equal(peer.status,200,JSON.stringify(peer.data));state=await get(space);const rebasedBefore=state,rebasedRaw=raw(),rebasedId=crypto.randomUUID(),rebasedText='Syntetisk historik överlever annan kunds ändring';const rebased=await post(earlier,'order',{...target,notes:rebasedText},space,rebasedId);assert.equal(rebased.status,200,JSON.stringify(rebased.data));state=await get(space);assertCorrection(rebasedBefore,state,rebasedRaw,'order','orders',target.id,'notes',rebasedText,rebasedId);
 for(const [type,collection,id,field] of cases)for(const [key,value] of [['owner',owners.target],['ownerProfileId',ids.target],['customerId',otherCustomerId],['stage',type==='deal'?'paused':'delivered'],[type==='deal'?'value':'invoiceValue',123],...[type==='order'?['invoiceOwnerId',ids.target]:['sourceDealId','retirement-won-deal']]]) {
  const data={...row(state,collection,id),[field]:'Syntetisk text ihop med otillåten ändring',[key]:value},before=raw(),response=await post(state,type,data,space);assert.equal(response.status,400,key+': '+JSON.stringify(response.data));unchanged(before,'Rejected '+type+' '+key);
 }
 // Existing server roles remain authoritative. This path grants no new role.
 for(const who of accounts.filter(who=>who.role!=='seller')){
  const record=row(state,'orders','retirement-followed-order'),before=raw(),response=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{'oai-authenticated-user-id':who.user,'oai-authenticated-user-email':who.email,'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space,version:state.version,requestId:crypto.randomUUID(),expectedRecord:conflicts.recordBasis(record),type:'order',data:{...record,notes:'Syntetisk otillåten rollrättning'}})}));assert.equal(response.status,403);assert.deepEqual(Object.keys(await response.json()),['error']);unchanged(before,'Denied '+who.role+' role');
 }
 // The SQL actor gate is checked at the commit boundary, after route preflight.
 for(const [column,value] of [['role','reader'],['active',0],['user_id','synthetic-unbound-admin']]) {
  const originalValue=sqlite.prepare('SELECT '+column+' AS value FROM crm_members WHERE id=?').get(state.viewer.memberId).value;let injected=false,revokedRaw;
  db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;sqlite.prepare('UPDATE crm_members SET '+column+'=? WHERE id=?').run(value,state.viewer.memberId);revokedRaw=raw();}return normalBatch(statements);};
  try{const record=row(state,'orders','retirement-followed-order'),response=await post(state,'order',{...record,notes:'Syntetisk återkallad aktör får ingen rättning'},space);assert.ok(injected);assert.equal(response.status,403,JSON.stringify(response.data));unchanged(revokedRaw,'Late '+column+' revocation');}finally{db.batch=normalBatch;sqlite.prepare('UPDATE crm_members SET '+column+'=? WHERE id=?').run(originalValue,state.viewer.memberId);}state=await get(space);
 }
 // A failed batch leaves both historical text and its event/ledger untouched.
 const beforeFailure=raw();let failed=false;db.batch=async statements=>{if(!failed&&statements[0].sql.startsWith('UPDATE crm_spaces')){failed=true;return normalBatch([...statements,db.prepare('INSERT INTO synthetic_nonexistent_historical_table(id) VALUES(?)').bind('synthetic-failure')]);}return normalBatch(statements);};
 try{const record=row(state,'orders','retirement-followed-order'),response=await post(state,'order',{...record,notes:'Syntetisk text som ska rullas tillbaka'},space);assert.ok(failed);assert.equal(response.status,503,JSON.stringify(response.data));unchanged(beforeFailure,'Actual SQL batch rollback');}finally{db.batch=normalBatch;}state=await get(space);
 // Simulate a lost acknowledgment after the transaction genuinely committed.
 const beforeLoss=state,beforeLossRaw=raw(),lossRecord=row(state,'deals','retirement-lost-deal'),lossId=crypto.randomUUID(),lossData={...lossRecord,reason:'Syntetisk rättning vars kvittens tappas'};let committed=false;db.batch=async statements=>{const result=await normalBatch(statements);if(!committed&&statements[0].sql.startsWith('UPDATE crm_spaces')){committed=true;throw new Error('Synthetic historical correction acknowledgment lost after COMMIT');}return result;};
 try{const lost=await post(beforeLoss,'deal',lossData,space,lossId);assert.ok(committed);assert.equal(lost.status,503,JSON.stringify(lost.data));}finally{db.batch=normalBatch;}state=await get(space);const committedRaw=assertCorrection(beforeLoss,state,beforeLossRaw,'deal','deals',lossRecord.id,'reason',lossData.reason,lossId);const retried=await post(beforeLoss,'deal',lossData,space,lossId);assert.equal(retried.status,200,JSON.stringify(retried.data));unchanged(committedRaw,'Lost acknowledgment exact replay');
 console.log('PASS historical commercial correction API: four stable/blank identity HTTP corrections, one event/revision/ledger each, duplicate and exact/lost-ACK replay, changed-body/stale-record conflict, unrelated-customer rebase, server-role/late actor revocation and SQL rollback, unchanged 18-table private/calendar/account/file/R2 sentinels and KPIs.');
 return state;
}
