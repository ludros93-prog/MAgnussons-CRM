import {z} from 'zod';
import {AddressSchema,validDate} from './business';
import {recordBasis} from './record-conflicts';
import {productionProgress,quantity} from './production-quantities';
import {RuleError} from './crm-errors';
import type {State,Order,Deal} from './crm';

const text=z.string().trim().max(4000),required=text.min(1);
export const DirectShipmentSchema=z.object({id:required,entries:z.array(z.object({lineId:required,quantity:z.number().finite().positive().max(1e6)})).min(1).max(100),dispatchedOn:validDate.refine(Boolean),method:z.enum(['carrier','collection','supplier']),recipient:required.max(200),address:AddressSchema,evidence:required,tracking:text.max(500).default(''),recordedAt:required,recordedById:required,recordedBy:required});
export function directRows(deal:Deal,shipments:Order['directShipments']=[]){
 const used=new Set<string>();
 return deal.lines.filter(l=>l.kind==='product').map((raw,index)=>{
  let id=raw.id;if(!id||used.has(id)){id='direct-row-'+(index+1);while(used.has(id)||deal.lines.some(l=>l.id===id))id+='-';}used.add(id);
  const line={...raw,id},dispatched=quantity(shipments.reduce((n,s)=>n+s.entries.filter(e=>e.lineId===id).reduce((v,e)=>v+e.quantity,0),0));
  return {line,dispatched,remaining:quantity(line.quantity-dispatched)};
 });
}
export function directBasis(st:State,orderId:string){const order=st.orders.find(o=>o.id===orderId);return recordBasis({order:order||null,deal:order?st.deals.find(d=>d.id===order.dealId)||null:null});}
export function deliveryVerified(st:State,o:Order){
 if(o.production.status==='dispatched'){const rows=productionProgress(o.production);return !o.production.issue&&rows.length>0&&rows.every(r=>r.remaining===0)&&rows.some(r=>r.dispatched>0);}
 const d=st.deals.find(d=>d.id===o.dealId);if(!d||!o.directShipments.length)return false;
 const rows=directRows(d,o.directShipments);return rows.length>0&&rows.every(r=>r.remaining===0);
}
export function legacyUnverified(o:Order){return o.production.status!=='dispatched'&&!o.directShipments.length&&['shipping','delivered','followed'].includes(o.stage);}
const dispatchDayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'});
function productionDispatchDay(at:string){
 if(!at)return '';
 const timestamp=new Date(at);
 if(Number.isNaN(timestamp.getTime()))throw new RuleError('Avsändningstidpunkten är ogiltig. Kontrollera leveransunderlaget innan kundens mottagande registreras.');
 return dispatchDayFormat.format(timestamp);
}
export function latestDispatch(o:Order){return [productionDispatchDay(o.production.dispatchedAt),...o.directShipments.map(s=>s.dispatchedOn)].sort().at(-1)||'';}
