import {type Order,type State,TaskSchema,day} from './crm';
import {recordBasis} from './record-conflicts';
import {directRows} from './direct-delivery';
// Receipt work can replace delivery tracking or close it. Keep the context
// opened by the user, including every affected task and the dispatch evidence,
// while unrelated invoices, notes and other orders remain independent.
export function receiptBasis(st:State,orderId:string):string {
 const o=st.orders.find(o=>o.id===orderId);if(!o)return recordBasis(null);
 const p=o.production,d=st.deals.find(d=>d.id===o.dealId),tasks=st.tasks.filter(t=>t.dealId===o.dealId&&t.kind==='receipt');
 return recordBasis({
  order:{id:o.id,customerId:o.customerId,dealId:o.dealId,owner:o.owner,ownerProfileId:o.ownerProfileId,stage:o.stage,deliveryDate:o.deliveryDate,deliveredDate:o.deliveredDate,receivedBy:o.receivedBy,receiptNote:o.receiptNote,deliveryIssue:o.deliveryIssue,deliveryNextCheck:o.deliveryNextCheck,commercialVersion:o.commercialVersion,pendingAmendment:o.pendingAmendment?.id||'',proofRequired:o.proofRequired,proofApproved:o.proofApproved,supplierConfirmed:o.supplierConfirmed},
  production:{workId:p.workId,status:p.status,quantityMode:p.quantityMode,dispatchedAt:p.dispatchedAt,issue:p.issue,issueRevision:p.issueRevision,lines:p.lines.map(l=>({id:l.id,quantity:l.quantity})),dispatched:p.movements.filter(m=>m.kind==='dispatched'),quantityAdjustments:p.quantityAdjustments},
  shipments:o.directShipments,
  directTargets:p.status==='dispatched'?null:d?directRows(d,o.directShipments).map(r=>({id:r.line.id,quantity:r.line.quantity})):null,
  primaryTaskId:tasks[0]?.id||'',tasks:tasks.map(t=>({id:t.id,customerId:t.customerId,dealId:t.dealId,kind:t.kind,owner:t.owner,ownerProfileId:t.ownerProfileId,title:t.title,due:t.due,done:t.done,doneAt:t.doneAt})).sort((a,b)=>a.id.localeCompare(b.id))
 });
}
export function orderBasis(o:Order){return JSON.stringify([o.id,o.owner,o.stage,o.deliveryDate,o.shippingAddress,o.proofRequired,o.proofApproved,o.proofFileId,o.proofVersion,o.approvedBy,o.approvedDate,o.supplierConfirmed,o.production.status,o.production.submittedAt,o.productionHistory.length,o.commercialVersion,o.pendingAmendment?.id||'']);}
export function awaitingReceipt(o:Order){return (o.stage==='shipping'||o.production.status==='dispatched')&&!['delivered','followed'].includes(o.stage)&&!o.deliveredDate;}
export function ensureReceiptTasks(st:State){for(const o of st.orders){if(!awaitingReceipt(o))continue;const old=st.tasks.find(t=>t.dealId===o.dealId&&t.kind==='receipt');if(old)continue;const title=st.deals.find(d=>d.id===o.dealId)?.title||'Order';st.tasks.push(TaskSchema.parse({id:'receipt-'+o.id,customerId:o.customerId,dealId:o.dealId,owner:o.owner,ownerProfileId:o.ownerProfileId,title:('Bekräfta kundens mottagande: '+title).slice(0,240),due:o.deliveryNextCheck||o.deliveryDate||day(),kind:'receipt'}));}return st;}
