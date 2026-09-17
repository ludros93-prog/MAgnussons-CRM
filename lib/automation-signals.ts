import {day,plusDays,type State} from './crm';
export type WorkSignal={id:string;owner:string;customerId:string;title:string;reason:string;taskId?:string;orderId?:string;escalated:boolean};
// A read projection: stable IDs and source conditions make reminders disappear
// as soon as work is completed, rescheduled or no longer relevant.
export function workSignals(st:State,today=day()):WorkSignal[]{
 const signals:WorkSignal[]=[];
 for(const t of st.tasks){if(t.done||t.kind!=='quote'||t.due>plusDays(today,-2))continue;const d=st.deals.find(d=>d.id===t.dealId);if(!d||!['quoted','decision'].includes(d.stage))continue;signals.push({id:'quote-'+t.id,owner:t.owner,customerId:t.customerId,taskId:t.id,title:'Offerten behöver följas upp',reason:t.title+' · planerad kontakt '+t.due,escalated:t.due<=plusDays(today,-5)});}
 for(const o of st.orders){if(!o.deliveryDate||o.deliveryDate>plusDays(today,5)||['shipping','delivered','followed'].includes(o.stage)||o.production.status==='dispatched')continue;const missing=[o.proofRequired&&!o.proofApproved?'kundens korrekturgodkännande':'',!o.supplierConfirmed?'leverantörens bekräftelse':'',o.pendingAmendment?'godkännande av orderändring':''].filter(Boolean);if(!missing.length)continue;signals.push({id:'delivery-'+o.id,owner:o.owner,customerId:o.customerId,orderId:o.id,title:'Leveransdatumet är nära',reason:'Hos kund '+o.deliveryDate+' · saknar '+missing.join(', '),escalated:o.deliveryDate<=today});}
 return signals;
}
