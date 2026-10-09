import assert from 'node:assert/strict';

// Real applyAction on an audited retirement, including legacy blank identities.
// The supplied fixture is synthetic and is never changed by these scenarios.
export async function verifyHistoricalCommercialCorrection({core,closed,actor,ids,names}) {
 const dashboards=await import('../work/sales-dashboard.mjs');
 const fixture=core.normalizeState(structuredClone(closed)),lostId=fixture.deals.find(row=>row.stage==='lost').id,orderId=fixture.orders[0].id;
 const rows=st=>[['deal','deals',lostId,'reason'],['order','orders',orderId,'notes']];
 const metrics=st=>Object.fromEntries([ids.a,ids.b,'all'].map(id=>{const result=dashboards.salesMetrics(st,'2026-09',id);return [id,Object.fromEntries(Object.entries(result).filter(([,value])=>value===null||typeof value!=='object'))];}));
 const correct=(st,type,id,field,text)=>{const collection=type==='deal'?'deals':'orders',row=st[collection].find(row=>row.id===id);return core.applyAction(st,{type,data:{...row,[field]:text}},actor);};
 let accepted=0,rejected=0;
 for(const blank of [false,true])for(const [type,collection,id,field] of rows(fixture)) {
  const st=structuredClone(fixture),row=st[collection].find(row=>row.id===id);if(blank)row.ownerProfileId='';
  const original=structuredClone(st),text=type==='deal'?'Syntetisk rättad förlustorsak':'Syntetisk precisering av avslutad leverans',next=correct(st,type,id,field,text);
  assert.deepEqual(st,original,'A historical '+type+' correction cannot mutate the source graph.');
  assert.deepEqual(next[collection].find(row=>row.id===id),{...row,[field]:text},'Only the selected historical text changes; '+(blank?'blank legacy ID':'stable UUID')+' remains exact.');
  const otherCollection=type==='deal'?'orders':'deals';assert.deepEqual(next[otherCollection],st[otherCollection]);
  assert.deepEqual(next[collection].filter(row=>row.id!==id),st[collection].filter(row=>row.id!==id));
  for(const key of Object.keys(st).filter(key=>![collection,'events'].includes(key)))assert.deepEqual(next[key],st[key],type+' historical correction preserves '+key);
  assert.equal(next.events.length,st.events.length+1);assert.deepEqual(next.events.slice(1),st.events);
  const event=next.events[0];assert.equal(event.kind,'historical_commercial_correction');assert.equal(event.customerId,row.customerId);assert.equal(event.dealId,type==='deal'?row.id:row.dealId);assert.equal(event.actor,undefined,'The actual authenticated API records the actor after pure domain dispatch.');assert.match(event.text,/historisk|historik/i);
  assert.deepEqual(correct(next,type,id,field,text),next,'An unchanged historical text creates no second domain event or lifecycle action.');
  assert.deepEqual(metrics(next),metrics(st),'Text corrections preserve historical revenue, margin, goals, prospects and attribution.');
  if(type==='order'){const cleared=correct(next,type,id,field,'');assert.equal(cleared.orders.find(row=>row.id===id).notes,'','An order note may be deliberately cleared without changing its invoice or lifecycle.');}
  else assert.throws(()=>correct(next,type,id,field,'  '),'Lost deals still need a nonempty loss reason.');
  accepted++;
 }
 const changedDealFields={id:'synthetic-unknown-deal',customerId:fixture.customers[1].id,owner:names.b,ownerProfileId:ids.b,title:'Syntetiskt ändrad affärstitel',stage:'paused',category:'Trycksaker',type:'expansion',value:1,cost:0,lines:[{id:'synthetic-rejected-line',article:'SYNTHETIC',description:'Syntetisk rad',quantity:45,unitPrice:1,unitCost:0}],proofDeadline:'2026-09-05',orderDeadline:'2026-09-05',sourceDealId:fixture.deals[0].id,priceChecked:true,priceCheckedAt:'2026-09-05T10:00:00.000Z',quotes:[{version:1,at:'2026-09-05T10:00:00.000Z',reference:'SYNTHETIC-QUOTE',lines:[],value:1,cost:0,deliveryDate:'',proofDeadline:'',orderDeadline:''}],need:'Ändrat behov',decisionMaker:'Ändrad syntetisk beslutsroll',solution:'Ändrad lösning',quoteRef:'SYNTHETIC-CHANGED',decisionDate:'2026-09-05',deliveryDate:'2026-09-05',nextAction:'Återöppnat arbete',nextDate:'2026-09-05',confirmed:true,createdAt:'2026-09-05T10:00:00.000Z',stageAt:'2026-09-05T10:00:00.000Z',wonAt:'2026-09-05T10:00:00.000Z',repeatRecipe:{sourceOrderId:orderId,sourceWorkId:'synthetic-work',instructions:'Syntetisk ny instruktion',sketchFileId:'',sketchVersion:''}};
 const changedOrderFields={id:'synthetic-unknown-order',customerId:fixture.customers[1].id,dealId:lostId,owner:names.b,ownerProfileId:ids.b,invoiceOwner:names.b,invoiceOwnerId:ids.b,invoiceOwnerSource:'legacy_recorded',commercialVersion:2,commercialValue:1,shippingAddress:{street:'Syntetisk gata',postalCode:'00000',city:'Syntetisk ort',country:'Sverige',reference:''},receivedBy:'Ändrat syntetiskt mottagarunderlag',receiptNote:'Ändrat mottagarunderlag',deliveryIssue:'Ändrat leveranshinder',deliveryNextCheck:'2026-09-05',stage:'delivered',proofRequired:true,proofApproved:true,proofFileId:'synthetic-other-proof',proofVersion:'synthetic-other-version',approvedBy:'Syntetiskt ändrat godkännande',approvedDate:'2026-09-05',supplierConfirmed:false,deliveryDate:'2026-09-05',deliveredDate:'2026-09-05',invoiceDate:'2026-09-05',invoiceRef:'SYNTHETIC-OTHER-INVOICE',invoiceValue:1001,actualCost:601,production:{...fixture.orders[0].production,instructions:'Ändrad syntetisk tryckinstruktion',lines:[{id:'synthetic-forged-quantity',article:'SYNTHETIC',description:'Syntetisk rad',quantity:48,unitPrice:1,unitCost:0}]},productionHistory:[{...fixture.orders[0].production,instructions:'Påhittad äldre instruktion'}],directShipments:[{id:'synthetic-forged-shipment',entries:[{lineId:'synthetic-line',quantity:1}],dispatchedOn:'2026-09-04',method:'collection',recipient:'Syntetisk mottagare',address:{},evidence:'Syntetiskt ändrat underlag',recordedAt:'2026-09-04T10:00:00.000Z',recordedById:actor.id,recordedBy:actor.name}]};
 const syntheticTransfer=targetType=>({id:crypto.randomUUID(),targetType,targetId:targetType==='deal'?lostId:orderId,customerId:fixture.customers[0].id,dealId:targetType==='deal'?lostId:fixture.orders[0].dealId,fromProfileId:ids.b,toProfileId:ids.a,fromOwner:names.b,toOwner:names.a,fromDisplayName:names.b,toDisplayName:names.a,selectedTaskIds:[],reason:'Syntetiskt föreslagen ny historik',at:'2026-09-04T10:00:00.000Z',byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 changedDealFields.responsibilityTransfers=[syntheticTransfer('deal')];changedOrderFields.responsibilityTransfers=[syntheticTransfer('order')];
 const snapshot={version:2,at:'2026-09-04T10:00:00.000Z',reference:'SYNTHETIC-REVISION',lines:[],value:1,cost:0,deliveryDate:'',proofDeadline:'',orderDeadline:''};
 changedOrderFields.pendingAmendment={id:'synthetic-pending-amendment',snapshot,reason:'Syntetisk otillåten väntande ändring',createdAt:'2026-09-04T10:00:00.000Z',createdBy:actor.name};
 changedOrderFields.revisions=[{id:'synthetic-forged-revision',snapshot,reason:'Syntetisk otillåten godkännandehistorik',customerApprovedBy:'Syntetisk godkännare',customerApprovedOn:'2026-09-04',recordedAt:'2026-09-04T10:00:00.000Z',recordedBy:actor.name,historical:true}];
 for(const [type,collection,id,field] of rows(fixture))for(const [key,value] of Object.entries(type==='deal'?changedDealFields:changedOrderFields)) {
  const old=fixture[collection].find(row=>row.id===id),data={...old,[field]:'Syntetisk tillåten text tillsammans med otillåten ändring',[key]:value};
  (type==='deal'?core.DealSchema:core.OrderSchema).parse(data); // Each negative payload is schema-valid, so rejection protects behavior.
  const before=structuredClone(fixture);assert.throws(()=>core.applyAction(fixture,{type,data},actor),'Historical '+type+' text cannot also change '+key);assert.deepEqual(fixture,before,'Rejected '+key+' cannot partly mutate historical state.');rejected++;
 }
 for(const [type,collection,id,field] of rows(fixture))for(const [label,modify] of [
  ['no audited retirement',st=>{st.settings.sellerProfiles[0].retirementHistory=[];}],
  ['uninitialized profiles',st=>{st.settings.sellerProfilesInitialized=false;}],
  ['mismatched recorded UUID',st=>{st[collection].find(row=>row.id===id).ownerProfileId=ids.b;}],
  ['unknown recorded UUID',st=>{st[collection].find(row=>row.id===id).ownerProfileId=crypto.randomUUID();}],
  ['mismatched historical owner',st=>{st[collection].find(row=>row.id===id).owner='Syntetisk okänd historisk ansvarig';}],
  ['forged retirement audit',st=>{st.settings.sellerProfiles[0].retirementHistory[0].profileId=ids.b;}]
 ]){const st=structuredClone(fixture);modify(st);const before=structuredClone(st);assert.throws(()=>correct(st,type,id,field,'Syntetisk historisk rättning'),label);assert.deepEqual(st,before);rejected++;}
 for(const stage of ['identified','contact','needs','solution','costing','quoted','decision','paused','won']){const st=structuredClone(fixture);st.deals.find(row=>row.id===lostId).stage=stage;assert.throws(()=>correct(st,'deal',lostId,'reason','Syntetisk rättning'),stage+' is not a lost historical deal.');rejected++;}
 for(const [label,modify] of [
  ...['handover','approval','supplier','production','shipping','delivered'].map(stage=>['unfinished '+stage,st=>{st.orders[0].stage=stage;}]),
  ['missing invoice value',st=>{st.orders[0].invoiceValue=null;}],['missing invoice reference',st=>{st.orders[0].invoiceRef='';}],['blank invoice reference',st=>{st.orders[0].invoiceRef='  ';}],['missing invoice date',st=>{st.orders[0].invoiceDate='';}]
 ]){const st=structuredClone(fixture);modify(st);assert.throws(()=>correct(st,'order',orderId,'notes','Syntetisk historisk rättning'),label+' cannot use the historical correction path.');rejected++;}
 // No replacement profile or invoice-owner anchoring may appear for old JSON.
 const older=structuredClone(fixture);for(const row of [older.orders[0],older.deals.find(row=>row.id===lostId)])delete row.ownerProfileId;delete older.orders[0].invoiceOwnerId;
 const normalizedOlder=core.normalizeState(structuredClone(older)),olderCorrected=correct(older,'order',orderId,'notes','Syntetisk rättning av äldre JSON');assert.equal(olderCorrected.orders[0].ownerProfileId,'');assert.equal(olderCorrected.orders[0].invoiceOwnerId,'');assert.deepEqual(olderCorrected.settings,normalizedOlder.settings);
 const zero=structuredClone(fixture);zero.orders[0].invoiceValue=0;assert.equal(correct(zero,'order',orderId,'notes','Syntetisk nollfaktura behåller underlaget').orders[0].invoiceValue,0,'A recorded zero invoice is distinct from a missing invoice value.');
 const recorded=structuredClone(fixture);recorded.orders[0].responsibilityTransfers=[syntheticTransfer('order')];recorded.deals.find(row=>row.id===lostId).responsibilityTransfers=[syntheticTransfer('deal')];const recordedBefore=structuredClone(recorded);
 for(const [type,collection,id,field] of rows(recorded)){const next=correct(recorded,type,id,field,'Syntetisk rättning med bevarad faktiskt lagrad testhistorik');assert.deepEqual(next[collection].find(row=>row.id===id).responsibilityTransfers,recordedBefore[collection].find(row=>row.id===id).responsibilityTransfers,'An existing recorded transfer is preserved byte-for-byte by text correction.');}
 console.log('PASS historical commercial correction domain: '+accepted+' stable/blank identity corrections, '+rejected+' schema-valid field/lifecycle/identity rejections, exact immutable graph, audit and KPI preservation, old JSON, zero invoice and deliberately cleared order note.');
}
