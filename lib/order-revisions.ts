import {z} from 'zod';
import {LineSchema,QuoteSnapshotSchema,validDate,calculateQuote} from './business';
import {recordBasis} from './record-conflicts';
import {hasPhysicalWork} from './production-quantities';
import {RuleError,DealSchema,TaskSchema,validateDeal,day,type State,type Order,type Actor,type Action} from './crm';

const text=z.string().trim().max(4000),required=text.min(1);
export function revisionBasis(st:State,orderId:string){const o=st.orders.find(o=>o.id===orderId);return recordBasis({order:o||null,deal:o?st.deals.find(d=>d.id===o.dealId)||null:null});}
export function canAmendOrder(o:Order){return ['draft','cancelled'].includes(o.production.status)&&!hasPhysicalWork(o.production)&&!o.production.quantityAdjustments.length&&!['shipping','delivered','followed'].includes(o.stage)&&o.invoiceValue===null;}
const need=(v:unknown,message:string)=>{if(!v)throw new RuleError(message)};
export function applyOrderRevision(st:State,action:Action,actor:Actor):State{
 need(['admin','seller'].includes(actor.role),'Orderändringar hanteras av säljare eller administratör.');
 const input=z.object({orderId:required,expectedContext:z.string().min(1).max(3000000)}).passthrough().parse(action.data);
 const o=st.orders.find(o=>o.id===input.orderId);need(o,'Ordern finns inte.');
 need(input.expectedContext===revisionBasis(st,input.orderId),'Ordern eller offerten har ändrats. Läs in aktuellt underlag innan du fortsätter.');
 need(canAmendOrder(o!),'Ordern kan ändras före tryck. Avbryt först en inlämnad arbetsorder; registrerade varor, produktion och fakturor får inte skrivas över.');
 const order=o!,d=st.deals.find(d=>d.id===order.dealId)!,c=st.customers.find(c=>c.id===order.customerId)!;
 need(d.stage==='won','Orderändringen kräver en accepterad affär.');
 const now=new Date().toISOString(),today=day();
 const event=(message:string)=>st.events.unshift({id:crypto.randomUUID(),customerId:c.id,dealId:d.id,kind:'order_revision',text:message,at:now});
 if(action.type==='order_amend'){
  const p=z.object({reason:required,snapshot:z.object({reference:required,lines:z.array(LineSchema).min(1).max(100),deliveryDate:validDate.refine(Boolean),proofDeadline:validDate,orderDeadline:validDate})}).parse(action.data);
  const totals=calculateQuote(p.snapshot.lines),proposed=DealSchema.parse({...d,...totals,...p.snapshot,quoteRef:p.snapshot.reference,confirmed:true});
  validateDeal(proposed,c);
  need(order.revisions.length<100&&d.quotes.length<100,'Ordern har nått gränsen för versioner.');
  const snapshot=QuoteSnapshotSchema.parse({...p.snapshot,...totals,version:order.commercialVersion+1,at:now});
  order.pendingAmendment={id:crypto.randomUUID(),snapshot,reason:p.reason,createdAt:now,createdBy:actor.name};
  event('Ändringsförslag R'+snapshot.version+' sparat: '+p.reason+'. Tidigare accepterad version gäller tills kunden godkänner ändringen.');
 }else if(action.type==='order_amend_discard'){
  need(order.pendingAmendment,'Det finns inget ändringsförslag.');
  event('Ändringsförslag R'+order.pendingAmendment!.snapshot.version+' återtaget: '+order.pendingAmendment!.reason);order.pendingAmendment=null;
 }else if(action.type==='order_amend_accept'){
  const p=z.object({amendmentId:required,customerApprovedBy:required,customerApprovedOn:validDate.refine(Boolean)}).parse(action.data),pending=order.pendingAmendment;
  need(pending&&pending.id===p.amendmentId,'Ändringsförslaget har bytts ut. Öppna aktuell version.');
  need(p.customerApprovedOn<=today&&p.customerApprovedOn>=pending!.createdAt.slice(0,10),'Godkännandet ska gälla det nya förslaget och får inte ligga i framtiden.');
  if(!order.revisions.length)order.revisions.push({id:crypto.randomUUID(),snapshot:{version:order.commercialVersion,at:d.wonAt||d.createdAt,reference:d.quoteRef,lines:structuredClone(d.lines),value:d.value,cost:d.cost,deliveryDate:d.deliveryDate,proofDeadline:d.proofDeadline,orderDeadline:d.orderDeadline},reason:'Ursprunglig accepterad order',customerApprovedBy:'',customerApprovedOn:d.wonAt,recordedAt:now,recordedBy:'',historical:true});
  const snapshot=structuredClone(pending!.snapshot);
  order.revisions.push({id:crypto.randomUUID(),snapshot,reason:pending!.reason,customerApprovedBy:p.customerApprovedBy,customerApprovedOn:p.customerApprovedOn,recordedAt:now,recordedBy:actor.name,historical:false});
  Object.assign(d,{lines:structuredClone(snapshot.lines),value:snapshot.value,cost:snapshot.cost,quoteRef:snapshot.reference,deliveryDate:snapshot.deliveryDate,proofDeadline:snapshot.proofDeadline,orderDeadline:snapshot.orderDeadline});
  d.quotes.push({...snapshot,version:d.quotes.length+1,at:now});
  Object.assign(order,{commercialVersion:snapshot.version,commercialValue:null,pendingAmendment:null,deliveryDate:snapshot.deliveryDate,stage:'handover',proofApproved:false,approvedBy:'',approvedDate:'',supplierConfirmed:false});
  for(const [kind,title,due] of [['handover','Granska ändrad order: '+d.title,today],['proof_deadline','Säkra nytt korrekturgodkännande: '+d.title,d.proofDeadline],['order_deadline','Bekräfta ändringen hos leverantören: '+d.title,d.orderDeadline]]){
   const existing=st.tasks.filter(t=>t.dealId===d.id&&t.kind===kind);
   for(const t of existing){t.done=true;t.doneAt=now;}
   if(due)st.tasks.push(TaskSchema.parse({id:crypto.randomUUID(),customerId:c.id,dealId:d.id,owner:order.owner,title:title.slice(0,240),due,kind}));
  }
  event('Orderändring R'+snapshot.version+' godkänd av '+p.customerApprovedBy+' · '+p.customerApprovedOn+'. Orsak: '+pending!.reason+'. Korrektur och leverantör behöver bekräftas på nytt.');
 }
 return st;
}
