import type {Actor,Order,State} from './crm';
import type {Production} from './production-quantities';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';
import {ProductionIssueResponsibilityHistorySchema,ProductionIssueResponsibilitySchema,ProductionIssueResponsibilityTransferSchema,type ProductionIssueResponsibilityRole,type ProductionIssueResponsibilityTransfer,type ProductionIssueResponsibility} from './production-issue-responsibility-schema';
export * from './production-issue-responsibility-schema';

export type ProductionIssueResponsibilityTarget={memberId:string;userId:string;name:string;role:ProductionIssueResponsibilityRole;active:1;expectedTarget:string};
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
export const productionIssueResponsibilityRole=(role:string):role is ProductionIssueResponsibilityRole=>['admin','seller','production','print','warehouse'].includes(role);
// The original report remains provenance. Only a reviewed explicit handover
// establishes a separate current owner; old names never establish member IDs.
export function productionIssueResponsibility(p:Pick<Production,'issueOwnerId'|'issueOwnerName'|'issueResponsibility'>){
 return p.issueResponsibility?{userId:p.issueResponsibility.userId,memberId:p.issueResponsibility.memberId,name:p.issueResponsibility.name}:{userId:p.issueOwnerId,memberId:'',name:p.issueOwnerName};
}
export function ownsProductionIssue(p:Pick<Production,'issueOwnerId'|'issueOwnerName'|'issueResponsibility'>,actor:{id:string;memberId?:string}){
 const current=productionIssueResponsibility(p);
 return !!current.userId&&current.userId===actor.id&&(!p.issueResponsibility||current.memberId===actor.memberId);
}
export async function productionIssueResponsibilityTargetBasis(target:Omit<ProductionIssueResponsibilityTarget,'expectedTarget'>){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recordBasis(target)));
 return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
}
export function productionIssueResponsibilityBasis(st:State,orderId:string){
 const orders=st.orders.filter(order=>order.id===orderId),order=orders.length===1?orders[0]:undefined;
 return recordBasis({purpose:'production_issue_responsibility_transfer',orderId,orders,customers:order?st.customers.filter(customer=>customer.id===order.customerId).map(customer=>({id:customer.id,name:customer.name})):[],deals:order?st.deals.filter(deal=>deal.id===order.dealId).map(deal=>({id:deal.id,customerId:deal.customerId,title:deal.title})):[]});
}
export function productionIssueResponsibilityBlockedReason(st:State,orderId:string,workId:string){
 const orders=st.orders.filter(order=>order.id===orderId),order=orders.length===1?orders[0]:undefined;
 if(!orders.length)return 'Arbetsordern finns inte.';
 if(!order||st.customers.filter(customer=>customer.id===order.customerId).length!==1||st.deals.filter(deal=>deal.id===order.dealId).length!==1||st.deals.filter(deal=>deal.id===order.dealId&&deal.customerId===order.customerId).length!==1)return 'Arbetsorderns kopplingar behöver granskas innan hinderansvaret ändras.';
 if(!order.production.issue)return 'Arbetsordern har inget öppet hinder.';
 if(!['submitted','printed','dispatched'].includes(order.production.status))return 'Hindret behöver granskas i sin arbetsversion. Överlämningen gäller lämnade, tryckta eller skickade arbetsordrar.';
 if(!workId||order.production.workId!==workId)return 'Arbetsversionen har ändrats eller saknar ett stabilt id. Läs in och granska aktuellt hinder.';
 if((order.production.issueResponsibility?.history.length||0)>=1000)return 'Hindret har nått gränsen för ansvarshistorik.';
 return '';
}
export function protectProductionIssueResponsibilityInput(old:Order,raw:unknown){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const check=(previous:Production|undefined,value:unknown)=>{
  if(!value||typeof value!=='object')return;const p=value as Record<string,unknown>;
  if(Object.prototype.hasOwnProperty.call(p,'issueResponsibility'))need(p.issueResponsibility!==undefined&&recordBasis(p.issueResponsibility)===recordBasis(previous?.issueResponsibility),'Hinderansvar och ansvarshistorik skapas bara i en granskad överlämning.');
  if(Object.prototype.hasOwnProperty.call(p,'issueResolutions'))need(recordBasis(p.issueResolutions)===recordBasis(previous?.issueResolutions||[]),'Hindrets lösningar och bevarade ansvarshistorik skapas av systemet.');
 };
 check(old.production,supplied.production);
 if(Array.isArray(supplied.productionHistory))for(let index=0;index<supplied.productionHistory.length;index++)check(old.productionHistory[index],supplied.productionHistory[index]);
}
export function transferProductionIssueResponsibility(st:State,input:ProductionIssueResponsibilityTransfer,actor:Actor,target:ProductionIssueResponsibilityTarget){
 const parsed=ProductionIssueResponsibilityTransferSchema.parse(input);need(actor.role==='admin'&&actor.memberId,'Hinderansvaret ändras av en inloggad administratör.');
 need(parsed.expectedContext===productionIssueResponsibilityBasis(st,parsed.orderId),'Hindret eller granskningsunderlaget har ändrats. Läs in och granska aktuellt hinder.');
 const blocked=productionIssueResponsibilityBlockedReason(st,parsed.orderId,parsed.workId);need(!blocked,blocked);
 need(target.memberId===parsed.targetMemberId&&target.userId&&target.name.trim()&&target.active===1&&productionIssueResponsibilityRole(target.role),'Välj ett aktivt och anslutet konto som får hantera produktionshinder.');
 need(parsed.expectedTarget===target.expectedTarget,'Det valda kontot har ändrats. Läs in och granska kontolistan igen.');
 const order=st.orders.find(order=>order.id===parsed.orderId)!,p=order.production,from=productionIssueResponsibility(p),history=p.issueResponsibility?.history||[];
 need(from.userId!==target.userId,'Hindret har redan den valda ansvariga.');
 const at=new Date().toISOString(),audit=ProductionIssueResponsibilityHistorySchema.parse({id:crypto.randomUUID(),orderId:order.id,workId:p.workId,revision:history.length+1,action:from.userId?'transfer':'assign',fromUserId:from.userId,fromMemberId:from.memberId,fromName:from.name,toUserId:target.userId,toMemberId:target.memberId,toName:target.name,reason:parsed.reason,at,byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 p.issueResponsibility={userId:audit.toUserId,memberId:audit.toMemberId,name:audit.toName,history:[...history,audit]};p.issueRevision++;
 st.events.unshift({id:crypto.randomUUID(),customerId:order.customerId,dealId:order.dealId,kind:'production',at,text:'Hinderansvar '+(from.userId?'överlämnat från '+(from.name||'tidigare konto'):'tilldelat')+' till '+target.name+'. Ursprunglig rapport ligger kvar. Orsak: '+parsed.reason,actor:{id:actor.id,name:actor.name}});
 validateProductionIssueResponsibilityReferences(st);
}
export function validateProductionIssueResponsibility(orderId:string,workId:string,report:{id:string;name:string},value:ProductionIssueResponsibility,ids=new Set<string>()){
  const responsibility=ProductionIssueResponsibilitySchema.parse(value);let previous:typeof responsibility.history[number]|undefined;
  for(const row of responsibility.history){
   need(!ids.has(row.id),'Hinderansvaret innehåller dubbla historik-id:n.');ids.add(row.id);
   need(row.orderId===orderId&&row.workId===workId,'Hinderansvarets historik har en bruten order- eller arbetsversionskoppling.');
   need(row.revision===(previous?previous.revision+1:1),'Hinderansvarets ändringar saknar en sammanhängande revisionskedja.');
   need(previous?row.fromUserId===previous.toUserId&&row.fromMemberId===previous.toMemberId&&row.fromName===previous.toName:row.fromUserId===report.id&&row.fromName===report.name&&!row.fromMemberId,'Hinderansvarets ändringar motsäger tidigare ansvar eller ursprunglig rapport.');
   need(row.fromUserId?row.action==='transfer'&&row.fromUserId!==row.toUserId:row.action==='assign'&&!row.fromMemberId,'Hinderansvarets historik har en ogiltig överlämning.');previous=row;
  }
  need(previous&&responsibility.userId===previous.toUserId&&responsibility.memberId===previous.toMemberId&&responsibility.name===previous.toName,'Nuvarande hinderansvar motsäger den senaste granskade ändringen.');
}
export function validateProductionIssueResponsibilityReferences(st:State){
 const ids=new Set<string>();
 for(const order of st.orders)for(const p of [order.production,...order.productionHistory]){
  need(!Object.prototype.hasOwnProperty.call(p,'issueResponsibility')||p.issueResponsibility!==undefined,'Registrerat hinderansvar får inte vara tomt eller ersättas av äldre rapportansvar.');
  if(p.issueResponsibility){need(p.issue,'Ett separat aktuellt hinderansvar kräver ett öppet hinder.');validateProductionIssueResponsibility(order.id,p.workId,{id:p.issueOwnerId,name:p.issueOwnerName},p.issueResponsibility,ids);}
  for(const resolution of p.issueResolutions){need(!Object.prototype.hasOwnProperty.call(resolution,'responsibility')||resolution.responsibility!==undefined,'Bevarat hinderansvar får inte ersättas av tom historik.');if(resolution.responsibility)validateProductionIssueResponsibility(order.id,p.workId,{id:resolution.reportedById,name:resolution.reportedBy},resolution.responsibility,ids);}
 }
}
