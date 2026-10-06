import assert from 'node:assert/strict';

// Use the real HTTP handler and SQLite transaction gate. In particular, do
// not use the harness's convenience POST for receipt actions: it may fill in
// a fresh basis and hide the unchanged retry that caused the original loss.
export async function verifyReceiptConcurrency(h){
 const {core,get,post,api,headers,sqlite}=h;
 const work=await import('../work/order-work.mjs'),direct=await import('../work/direct-delivery.mjs');
 const space='live',today=core.day(),suffix=crypto.randomUUID();
 const counts={fixtureCommits:0,receiptRequests:0,rejected409:0,rejected400:0,rejected403:0,exactReplays:0,sqlRaces:0,protectedProjectionChanges:0,independentProjectionChanges:0,independentInvoiceWrites:0};
 let state=await get(space);
 const owner=state.settings.owners[0];
 assert.ok(owner,'The isolated fixture needs one configured owner.');
 const basis=(st,id)=>typeof work.receiptBasis==='function'?work.receiptBasis(st,id):'baseline-original-receipt-context';
 const order=(st,id)=>st.orders.find(o=>o.id===id);
 const issue=(st,id,message,offset=1)=>({orderId:id,expectedContext:basis(st,id),message,nextCheck:core.plusDays(today,offset)});
 const confirm=(st,id)=>({orderId:id,expectedContext:basis(st,id),deliveredDate:today,receivedBy:'Syntetisk mottagare i samtidighetsprov',note:'Fiktiv kvittens; ingen verklig kundkontakt.'});
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));
 const quoted=name=>'"'+name.replaceAll('"','""')+'"';
 const raw=()=>Object.fromEntries(tableNames.map(name=>{
  const columns=sqlite.prepare('PRAGMA table_info('+quoted(name)+')').all().map(c=>quoted(c.name));
  return [name,sqlite.prepare('SELECT * FROM '+quoted(name)+' ORDER BY '+columns.join(',')).all()];
 }));
 const unchanged=(before,message)=>assert.deepEqual(raw(),before,message);
 async function receipt(st,type,data,requestId=crypto.randomUUID(),identity=headers){
  counts.receiptRequests++;
  const response=await api.POST(new Request('https://crm.test/api/crm',{
   method:'POST',headers:{...identity,'Content-Type':'application/json',Origin:'https://crm.test'},
   body:JSON.stringify({space,version:st.version,requestId,type,data})
  }));
  const result={status:response.status,data:await response.json(),id:requestId};
  if(result.status===409)counts.rejected409++;
  if(result.status===400)counts.rejected400++;
  if(result.status===403)counts.rejected403++;
  return result;
 }
 async function fixtureSave(type,data){
  const result=await post(state,type,data,space);
  assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;counts.fixtureCommits++;
  return result;
 }
 const created=await fixtureSave('customer',{name:'Syntetiskt receipt-konfliktprov '+suffix,contact:'Fiktiv inköpare',owner,status:'active'});
 const customerId=created.data.mutationResult.customerId;
 async function shipped(label){
  const lineId='receipt-context-line-'+label+'-'+suffix;
  const result=await fixtureSave('catalog_order',{customerId,owner,title:'Syntetisk skickad receipt-order '+label+' '+suffix,lines:[{id:lineId,article:'TEST-RECEIPT-'+label,description:'Fiktiva testplagg',quantity:4,unitPrice:100,unitCost:40}],deliveryDate:today,accepted:true,nextDate:today});
  const id=result.data.mutationResult.orderId;
  await fixtureSave('direct_dispatch',{orderId:id,expectedContext:direct.directBasis(state,id),entries:[{lineId,quantity:4}],dispatchedOn:today,method:'collection',recipient:'Syntetisk mottagare',address:{},evidence:'Fiktiv avhämtningskvittens '+label+' '+suffix,supplierConfirmed:true,noProofNeeded:true});
  assert.ok(work.awaitingReceipt(order(state,id)));assert.ok(direct.deliveryVerified(state,order(state,id)));
  return id;
 }
 const a=await shipped('A'),b=await shipped('B');
 await fixtureSave('order',{...order(state,a),invoiceValue:400,actualCost:160,invoiceDate:today,invoiceRef:'TEST-RECEIPT-INVOICE-'+suffix});
 const protectedCustomer=structuredClone(state.customers.find(c=>c.id===customerId));
 const protectedDeal=structuredClone(state.deals.find(d=>d.id===order(state,a).dealId));
 const commercialOrder=o=>{
  const copy=structuredClone(o);
  for(const key of ['deliveryIssue','deliveryNextCheck','stage','deliveredDate','receivedBy','receiptNote'])delete copy[key];
  return copy;
 };
 let protectedOrder=commercialOrder(order(state,a));
 const protectBusiness=st=>{
  assert.deepEqual(st.customers.find(c=>c.id===customerId),protectedCustomer,'Receipt work must not invent customer contact or change the customer plan.');
  assert.deepEqual(st.deals.find(d=>d.id===protectedDeal.id),protectedDeal,'Receipt work must preserve the accepted deal.');
  assert.deepEqual(commercialOrder(order(st,a)),protectedOrder,'Receipt work must preserve quantities, shipments, proof, invoice and historical attribution.');
 };
 const conflict=(result,message)=>{
  assert.equal(result.status,409,message+' '+JSON.stringify(result.data));
  assert.ok(result.data.state,message+' must return reviewable current state.');
 };

 // Keep this first. On the unmodified baseline B saves successfully, A gets
 // a global-version 409, and A's unchanged second click incorrectly gets 200.
 // It must fail here before missing-basis or other new-contract assertions.
 {
  const opened=state,local=issue(opened,a,'A:s gamla lokala leveranstext',1),requestId=crypto.randomUUID();
  const colleague=await receipt(opened,'receipt_issue',issue(opened,a,'B:s nyare registrerade leveransproblem',2));
  assert.equal(colleague.status,200,JSON.stringify(colleague.data));state=colleague.data;
  const afterColleague=raw(),first=await receipt(opened,'receipt_issue',local,requestId);
  conflict(first,'The first stale receipt issue must be rejected.');
  unchanged(afterColleague,'The first conflict must preserve every application table.');
  const second=await receipt(first.data.state,'receipt_issue',local,requestId);
  conflict(second,'An unchanged receipt retry must keep its original context after receiving newer global state.');
  unchanged(afterColleague,'An unchanged second click must not replace the colleague issue, task, notice or ledger.');
  state=await get(space);assert.equal(order(state,a).deliveryIssue,'B:s nyare registrerade leveransproblem');protectBusiness(state);
 }
 console.log('PASS receipt concurrency: stale issue rejected twice with identical context/request-ID and all application tables unchanged.');

 // Pure synthetic clones exercise the receipt's domain boundary. These do
 // not mutate persisted shipment history or claim a valid live correction:
 // dispatch evidence/quantities and every affected receipt task require a
 // new review, while invoice, cost and internal notes remain independent.
 {
  assert.equal(typeof work.receiptBasis,'function');
  const changed=(base,label,edit)=>{
   const copy=structuredClone(base);edit(copy,order(copy,a));
   assert.notEqual(basis(copy,a),basis(base,a),'Receipt review must detect '+label+'.');counts.protectedProjectionChanges++;
  };
  changed(state,'a changed direct dispatch day',(_st,o)=>{o.directShipments[0].dispatchedOn=core.plusDays(today,-1);});
  changed(state,'a changed quantity in a dispatched shipment',(_st,o)=>{o.directShipments[0].entries[0].quantity=3;});
  changed(state,'a changed accepted direct-delivery quantity',(st,o)=>{st.deals.find(d=>d.id===o.dealId).lines.find(l=>l.kind==='product').quantity=5;});
  const produced=structuredClone(state),p=order(produced,a).production,lines=produced.deals.find(d=>d.id===order(produced,a).dealId).lines.filter(l=>l.kind==='product');
  order(produced,a).directShipments=[];
  Object.assign(p,{workId:'receipt-projection-work-'+suffix,status:'dispatched',quantityMode:'lines',lines:structuredClone(lines),goodsReceived:true,dispatchedAt:today+'T12:00:00.000Z',quantityAdjustments:[],movements:['received','printed','dispatched'].map(kind=>({id:'receipt-projection-'+kind+'-'+suffix,kind,entries:lines.map(l=>({lineId:l.id,quantity:l.quantity})),at:today+'T12:00:00.000Z',by:'Syntetisk produktionsaktör',reason:'',tracking:'',recipient:'Syntetisk mottagare',address:null,legacy:false}))});
  assert.ok(direct.deliveryVerified(produced,order(produced,a)),'The pure production fixture must cover the whole accepted quantity.');
  changed(produced,'a changed production dispatch day',(_st,o)=>{o.production.dispatchedAt=core.plusDays(today,-1)+'T12:00:00.000Z';});
  changed(produced,'a changed production target quantity',(_st,o)=>{o.production.lines[0].quantity=5;});
  changed(produced,'a changed actual production dispatch quantity',(_st,o)=>{o.production.movements.find(m=>m.kind==='dispatched').entries[0].quantity=3;});
  const duplicated=structuredClone(state),task=duplicated.tasks.find(t=>t.dealId===order(duplicated,a).dealId&&t.kind==='receipt');
  assert.ok(task);
  changed(state,'an additional legacy receipt task',(st)=>{st.tasks.push({...task,id:'receipt-projection-extra-'+suffix,due:core.plusDays(today,2)});});
  duplicated.tasks.push({...task,id:'receipt-projection-extra-'+suffix,due:core.plusDays(today,2)});
  changed(duplicated,'the nonprimary receipt task control date',(st)=>{st.tasks.find(t=>t.id==='receipt-projection-extra-'+suffix).due=core.plusDays(today,3);});
  changed(duplicated,'which duplicate receipt task receives an issue update',(st)=>{
   const indices=st.tasks.map((t,i)=>t.dealId===order(st,a).dealId&&t.kind==='receipt'?i:-1).filter(i=>i>=0);
   [st.tasks[indices[0]],st.tasks[indices[1]]]=[st.tasks[indices[1]],st.tasks[indices[0]]];
  });
  for(const [label,edit] of [
   ['invoice',o=>{o.invoiceValue=450;o.invoiceRef='TEST-PROJECTION-INVOICE';o.invoiceDate=core.plusDays(today,-1);}],
   ['actual cost',o=>{o.actualCost=180;}],
   ['internal order notes',o=>{o.notes='Syntetisk separat intern anteckning';}]
  ]){
   const copy=structuredClone(state);edit(order(copy,a));
   assert.equal(basis(copy,a),basis(state,a),'Independent '+label+' must not require receipt review.');counts.independentProjectionChanges++;
  }
 }

 // Confirmation closes receipt tracking and clears an issue. It therefore
 // needs the same review requirement when the colleague changes that issue.
 {
  const opened=state,local=confirm(opened,a),requestId=crypto.randomUUID();
  const colleague=await receipt(opened,'receipt_issue',issue(opened,a,'B behöver fortfarande kontrollera leveransen',3));
  assert.equal(colleague.status,200,JSON.stringify(colleague.data));state=colleague.data;
  const afterColleague=raw(),first=await receipt(opened,'receipt_confirm',local,requestId);
  conflict(first,'Stale confirmation must not clear the newer delivery issue.');unchanged(afterColleague,'Rejected confirmation must be atomic.');
  conflict(await receipt(first.data.state,'receipt_confirm',local,requestId),'Confirmation retry must not silently adopt fresh global state.');
  unchanged(afterColleague,'Repeated confirmation must preserve tracking and all other tables.');state=await get(space);protectBusiness(state);
 }

 // A colleague can edit the receipt task independently through the existing
 // task API. Its newer due date must not be replaced by an old receipt form.
 {
  const opened=state,local=issue(opened,a,'A:s anteckning före ändrad kontrolluppgift',4);
  const task=opened.tasks.find(t=>t.kind==='receipt'&&t.dealId===order(opened,a).dealId);
  assert.ok(task);
  const updated=await post(opened,'task',{...task,due:core.plusDays(today,7)},space);
  assert.equal(updated.status,200,JSON.stringify(updated.data));state=updated.data;
  assert.deepEqual(order(state,a),order(opened,a),'The fixture must change only the receipt task, not the order.');
  const afterTask=raw(),requestId=crypto.randomUUID(),first=await receipt(state,'receipt_issue',local,requestId);
  conflict(first,'A fresh global version does not make an old receipt-task basis current.');unchanged(afterTask,'A task-only conflict must preserve all tables.');
  conflict(await receipt(first.data.state,'receipt_issue',local,requestId),'Receipt task conflict must survive an unchanged retry.');
  unchanged(afterTask,'Rejected retry must preserve the colleague control date.');state=await get(space);protectBusiness(state);
 }

 // Independent work is allowed with the old global version. This avoids
 // replacing the missing record protection with a blanket stale-page lock.
 {
  const opened=state,local=issue(opened,a,'A:s oberoende leveransregistrering',4);
  const colleague=await receipt(opened,'receipt_issue',issue(opened,b,'B:s separata order behöver kontroll',5));
  assert.equal(colleague.status,200,JSON.stringify(colleague.data));
  const own=await receipt(opened,'receipt_issue',local);assert.equal(own.status,200,JSON.stringify(own.data));state=own.data;
  assert.equal(order(state,b).deliveryIssue,'B:s separata order behöver kontroll');protectBusiness(state);
  const beforeOther=state,otherLocal=issue(beforeOther,a,'A:s text efter oberoende manuell uppgift',5);
  const other=await post(beforeOther,'task',{customerId,owner,title:'Syntetisk oberoende manuell uppgift '+suffix,due:today,kind:'manual'},space);
  assert.equal(other.status,200,JSON.stringify(other.data));
  const result=await receipt(beforeOther,'receipt_issue',otherLocal);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;protectBusiness(state);
 }

 // Exercise that independence through the real authorized order API, too.
 // An invoice/cost/note write must survive the receipt's original body and
 // old workspace version without forcing the caller to recapture its basis.
 {
  const opened=state,local=issue(opened,a,'Syntetisk leveransregistrering efter separat fakturaändring',6);
  const invoiceRef='TEST-RECEIPT-INVOICE-REVISED-'+suffix,notes='Syntetisk intern fakturaanteckning';
  const revised=await fixtureSave('order',{...order(opened,a),invoiceRef,actualCost:180,notes});counts.independentInvoiceWrites++;
  assert.equal(basis(revised.data,a),local.expectedContext,'An actual invoice update must leave the opened receipt context intact.');
  const expectedBusiness={...protectedOrder,invoiceRef,actualCost:180,notes};
  assert.deepEqual(commercialOrder(order(revised.data,a)),expectedBusiness,'The invoice fixture must change only the intended invoice/cost/note fields.');protectedOrder=expectedBusiness;
  const afterInvoice=raw(),result=await receipt(opened,'receipt_issue',local);
  assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
  const allowed=new Set(['crm_spaces','crm_orders','crm_tasks','crm_events','crm_notices','crm_mutations']),afterReceipt=raw();
  for(const name of tableNames)if(!allowed.has(name))assert.deepEqual(afterReceipt[name],afterInvoice[name],'Receipt after invoice must preserve '+name+'.');
  assert.deepEqual(state.orders.filter(o=>o.id!==a),revised.data.orders.filter(o=>o.id!==a),'Receipt work must preserve every other order.');protectBusiness(state);
 }

 // Inject a real colleague commit after the handler checks the basis but
 // before the original SQL transaction. The losing CAS must re-read context.
 for(const sameOrder of [true,false]){
  const opened=state,local=issue(opened,a,'A:s registrering vid SQL-CAS '+sameOrder,6),otherId=sameOrder?a:b;
  const otherInput=issue(opened,otherId,'B:s registrering mellan kontroll och SQL '+sameOrder,8);
  const db=globalThis.__crmEnv.DB,normalBatch=db.batch;
  let injected=false,afterColleague,colleague;
  db.batch=async statements=>{
   if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){
    injected=true;counts.sqlRaces++;
    colleague=await receipt(opened,'receipt_issue',otherInput);
    assert.equal(colleague.status,200,JSON.stringify(colleague.data));afterColleague=raw();
   }
   return normalBatch(statements);
  };
  let result;
  try{result=await receipt(opened,'receipt_issue',local);}finally{db.batch=normalBatch;}
  assert.ok(injected,'The test must exercise an actual SQL-CAS race.');
  if(sameOrder){conflict(result,'A changed receipt basis after SQL-CAS loss must reject the whole original write.');unchanged(afterColleague,'The losing same-order CAS must leave exactly the colleague commit.');}
  else assert.equal(result.status,200,JSON.stringify(result.data));
  state=await get(space);
  assert.equal(order(state,otherId).deliveryIssue,otherInput.message);
  if(!sameOrder)assert.equal(order(state,a).deliveryIssue,local.message);
  protectBusiness(state);
 }

 // Direct API calls need a nonempty basis even if their global version is
 // fresh. A basis belonging to another order cannot authorize this order.
 for(const type of ['receipt_issue','receipt_confirm']){
  const local=type==='receipt_issue'?issue(state,a,'Syntetiskt saknat underlag',1):confirm(state,a);
  for(const missing of [undefined,'']){
   const invalid={...local,expectedContext:missing};if(missing===undefined)delete invalid.expectedContext;
   const before=raw(),result=await receipt(state,type,invalid);
   assert.equal(result.status,400,'Direct '+type+' must require nonempty original context. '+JSON.stringify(result.data));unchanged(before,'Missing context must not mutate any table.');
  }
  const before=raw();conflict(await receipt(state,type,{...local,expectedContext:basis(state,b)}),'Another order context must be rejected.');unchanged(before,'Cross-order context must not mutate any table.');
 }

 const members=[];
 try{
  for(const role of ['reader','warehouse','production']){
   const id='receipt-role-'+role+'-'+suffix,email=id+'@example.test';members.push(id);
   sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(id,email,id,'Syntetisk receipt-roll '+role,role,'');
   const identity={'oai-authenticated-user-id':id,'oai-authenticated-user-email':email};
   for(const type of ['receipt_issue','receipt_confirm']){
    const before=raw(),local=type==='receipt_issue'?issue(state,a,'Syntetiskt nekat rollförsök',1):confirm(state,a);
    const result=await receipt(state,type,local,crypto.randomUUID(),identity);
    assert.equal(result.status,403,role+' must not perform '+type+'. '+JSON.stringify(result.data));unchanged(before,'Role denial must preserve every table.');
   }
  }
 }finally{for(const id of members)sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(id);}

 // Deliberately discard the first successful result to model a caller that
 // lost its commit acknowledgment. Exact replay is checked before stale
 // context; it must not duplicate events, notices, tasks or the ledger.
 {
  const opened=state,local=issue(opened,a,'Syntetisk lyckad registrering med tappad kvittens',9),requestId=crypto.randomUUID();
  assert.equal((await receipt(opened,'receipt_issue',local,requestId)).status,200);
  state=await get(space);const afterCommit=raw();
  const replay=await receipt(opened,'receipt_issue',local,requestId);assert.equal(replay.status,200,JSON.stringify(replay.data));counts.exactReplays++;
  unchanged(afterCommit,'Exact lost-ack issue replay must not duplicate a commit.');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  const altered=await receipt(state,'receipt_issue',{...local,message:'Annat innehåll med samma request-ID'},requestId);
  assert.equal(altered.status,409);unchanged(afterCommit,'A request-ID cannot be reused for changed receipt content.');protectBusiness(state);
 }
 {
  const opened=state,local=confirm(opened,a),requestId=crypto.randomUUID();
  assert.equal((await receipt(opened,'receipt_confirm',local,requestId)).status,200);
  state=await get(space);const afterCommit=raw();
  const replay=await receipt(opened,'receipt_confirm',local,requestId);assert.equal(replay.status,200,JSON.stringify(replay.data));counts.exactReplays++;
  unchanged(afterCommit,'Exact confirmation replay must not duplicate receipt, events or follow-up.');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  assert.equal(order(state,a).deliveredDate,today);assert.equal(order(state,a).receivedBy,local.receivedBy);assert.equal(order(state,a).deliveryIssue,'');assert.equal(order(state,a).deliveryNextCheck,'');
  assert.equal(state.tasks.filter(t=>t.kind==='delivery'&&t.dealId===protectedDeal.id&&!t.done).length,1);
  protectBusiness(state);
 }
 console.log('PASS receipt concurrency: immutable issue/confirm/task context, preserved shipment and business history, independent orders, real SQL-CAS revalidation, required API basis, role denial and exact lost-ack replay. '+JSON.stringify({...counts,rawAuditedTables:tableNames.length}));
}
