import assert from 'node:assert/strict';

export async function verifyOrderSafety(h){
 const {core,quantities,get,post,roleGet,rolePost,catalogInput,productionData}=h;
 const direct=await import('../work/direct-delivery.mjs'),restore=await import('../work/crm-restore.mjs');
 let state=await get('live');
 async function create(title,submit=false){
  let r=await post(state,'catalog_order',{...catalogInput,title,accepted:true},'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;
  const id=r.data.mutationResult.orderId;
  if(submit){let o=state.orders.find(o=>o.id===id);r=await post(state,'order',{...o,proofRequired:false,proofApproved:false,supplierConfirmed:true},'live');assert.equal(r.status,200);state=r.data;o=state.orders.find(o=>o.id===id);r=await post(state,'production_submit',{orderId:id,production:{...productionData.production,lines:state.deals.find(d=>d.id===o.dealId).lines}},'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;}
  return id;
 }
 const id=await create('Direktleverans med verifierat underlag');
 let order=state.orders.find(o=>o.id===id);
 for(const stage of ['shipping','delivered','followed']){const r=await post(state,'order',{...order,proofRequired:false,supplierConfirmed:true,stage,deliveredDate:core.day(),receivedBy:'Testkund',invoiceValue:stage==='shipping'?5000:null,invoiceDate:core.day(),invoiceRef:'BYPASS'},'live');assert.equal(r.status,400);assert.equal((await get('live')).version,state.version);}
 for(const date of [core.day(),core.plusDays(core.day(),1)])assert.equal((await post(state,'order',{...order,deliveredDate:date,receivedBy:'Smitt mottagande utan underlag'},'live')).status,400);
 const shipment=(s,n=25)=>({orderId:id,expectedContext:direct.directBasis(s,id),entries:[{lineId:direct.directRows(s.deals.find(d=>d.id===order.dealId))[0].line.id,quantity:n}],dispatchedOn:core.day(),method:'collection',recipient:'Testkund',address:{},evidence:'Kunden hämtade enligt kvitterat underlag TEST-1',supplierConfirmed:true,noProofNeeded:true});
 assert.equal((await rolePost('production',await roleGet('production'),'direct_dispatch',shipment(state))).status,403);
 for(const invalid of [{dispatchedOn:core.plusDays(core.day(),1)},{evidence:''},{method:'carrier'},{entries:[{lineId:'wrong-row',quantity:1}]},{entries:[{lineId:order.directShipments[0]?.id||'catline',quantity:51}]}])assert.equal((await post(state,'direct_dispatch',{...shipment(state),...invalid},'live')).status,400);
 const before=state,first=await post(state,'direct_dispatch',shipment(state),'live');assert.equal(first.status,200,JSON.stringify(first.data));state=first.data;order=state.orders.find(o=>o.id===id);
 assert.equal(order.directShipments.length,1);assert.equal(direct.deliveryVerified(state,order),false);assert.notEqual(order.stage,'shipping');
 assert.equal((await post(before,'direct_dispatch',shipment(before),'live',first.id)).data.orders.find(o=>o.id===id).directShipments.length,1);
 assert.equal((await post(state,'direct_dispatch',shipment(before),'live')).status,409);
 assert.equal((await post(state,'order',{...order,stage:'shipping',invoiceValue:5000,invoiceDate:core.day(),invoiceRef:'PARTIAL'},'live')).status,400);
 const last=await post(state,'direct_dispatch',shipment(state),'live');assert.equal(last.status,200,JSON.stringify(last.data));state=last.data;order=state.orders.find(o=>o.id===id);
 assert.equal(order.stage,'shipping');assert.equal(direct.deliveryVerified(state,order),true);assert.equal(order.production.status,'draft');assert.equal(state.tasks.filter(t=>t.dealId===order.dealId&&t.kind==='invoice_ready').length,1);
 assert.equal((await post(state,'production_submit',{orderId:id,production:productionData.production},'live')).status,400);
 assert.equal((await post(state,'order',{...order,stage:'delivered',deliveredDate:core.day(),receivedBy:''},'live')).status,400);
 assert.equal((await post(state,'receipt_confirm',{orderId:id,deliveredDate:core.plusDays(core.day(),-1),receivedBy:'Testkund'},'live')).status,400);
 let r=await post(state,'order',{...order,invoiceValue:5000,invoiceDate:core.day(),invoiceRef:'DIRECT-1',directShipments:[],invoiceOwner:'forged'},'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;assert.equal(state.orders.find(o=>o.id===id).directShipments.length,2);assert.notEqual(state.orders.find(o=>o.id===id).invoiceOwner,'forged');
 r=await post(state,'receipt_confirm',{orderId:id,deliveredDate:core.day(),receivedBy:'Testkund'},'live');assert.equal(r.status,200);state=r.data;
 assert.doesNotThrow(()=>restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state},true));
 for(const fault of ['duplicate','broken','overage']){const bad=structuredClone(state),o=bad.orders.find(o=>o.id===id);if(fault==='duplicate')o.directShipments[1].id=o.directShipments[0].id;if(fault==='broken')o.directShipments[0].entries[0].lineId='missing-row';if(fault==='overage')o.directShipments[0].entries[0].quantity+=1;assert.throws(()=>restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:bad},true),/försändelser|artikelkopplingar|direktleveransantal/);}
 const legacy=core.normalizeState(core.seedState()),legacyOrder=legacy.orders[0];assert.ok(direct.legacyUnverified(legacyOrder));assert.doesNotThrow(()=>core.applyAction(legacy,{type:'order',data:{...legacyOrder,notes:'Historiken bevarad'}}));assert.throws(()=>core.applyAction(legacy,{type:'order',data:{...legacyOrder,invoiceRef:'NEW-WITHOUT-EVIDENCE'}}),/leveransunderlag/);
 console.log('PASS order safety: direct-delivery bypass rejected, explicit partial/final quantities, shipment evidence and receipt dates, replay/stale context, immutable shipment history, legacy warning and restore invariants.');

 const issueId=await create('Minskning med öppet hinder',true);
 for(const kind of ['received','printed','dispatched']){order=state.orders.find(o=>o.id===issueId);r=await post(state,'production_'+kind,{orderId:issueId,expectedProduction:quantities.productionBasis(order.production),entries:[{lineId:order.production.lines[0].id,quantity:48}],address:order.production.deliveryAddress},'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;}
 let operator=await roleGet('production');r=await rolePost('production',operator,'production_issue',{orderId:issueId,message:'Avstämning med leverantören krävs'});assert.equal(r.status,200,JSON.stringify(r.data));state=await get('live');order=state.orders.find(o=>o.id===issueId);
 const shortfall=()=>({orderId:issueId,expectedProduction:quantities.productionBasis(order.production),entries:[{lineId:order.production.lines[0].id,quantity:2}],reason:'Kunden accepterar färre jackor',customerApprovedBy:'Testkund',customerApprovedOn:core.day(),agreedValue:4800});
 assert.equal((await post(state,'order_shortfall',shortfall(),'live')).status,400);assert.equal((await get('live')).version,state.version);
 assert.equal((await rolePost('production',await roleGet('production'),'production_issue',{orderId:issueId,message:''})).status,400);
 const originalBasis=quantities.productionBasis(order.production);
 assert.equal((await rolePost('operator2',await roleGet('operator2'),'production_issue_resolve',{orderId:issueId,expectedProduction:originalBasis,resolution:'Jag tar bort någon annans hinder'})).status,400);
 assert.equal((await rolePost('production',await roleGet('production'),'production_issue_resolve',{orderId:issueId,expectedProduction:originalBasis,resolution:''})).status,400);
 r=await rolePost('production',await roleGet('production'),'production_issue',{orderId:issueId,message:'Avstämning med leverantören krävs'});assert.equal(r.status,200);
 assert.equal((await rolePost('production',await roleGet('production'),'production_issue_resolve',{orderId:issueId,expectedProduction:originalBasis,resolution:'Gammal flik'})).status,409);
 operator=await roleGet('production');order=operator.orders.find(o=>o.id===issueId);const resolve={orderId:issueId,expectedProduction:quantities.productionBasis(order.production),resolution:'Leverantören bekräftar att kunden kan avstå resterande två jackor'};
 r=await rolePost('production',operator,'production_issue_resolve',resolve);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.orders.find(o=>o.id===issueId).production.issueResolutions.length,1);
 assert.equal((await rolePost('production',operator,'production_issue_resolve',resolve,r.id)).data.orders.find(o=>o.id===issueId).production.issueResolutions.length,1);
 state=await get('live');order=state.orders.find(o=>o.id===issueId);assert.equal(order.production.issue,'');assert.equal(order.production.issueResolutions[0].resolvedById,'ops-production');assert.ok(order.production.issueResolutions[0].resolvedAt);
 r=await post(state,'order_shortfall',shortfall(),'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;order=state.orders.find(o=>o.id===issueId);assert.equal(order.production.status,'dispatched');assert.equal(order.production.issueResolutions.length,1);
 console.log('PASS order safety: unresolved blockers prevent quantity-shortfall closure, empty text cannot resolve, named resolution history, reporter/admin authorization and stale/replayed resolution safety.');
}
