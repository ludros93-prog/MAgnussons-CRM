import {z} from 'zod';
import type {Actor,State} from './crm';
import type {Role} from './operations';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';

export {ProductionAssignmentHistorySchema,ProductionAssignmentTransferSchema} from './operations';
import {ProductionAssignmentHistorySchema,ProductionAssignmentTransferSchema} from './operations';
export type ProductionAssignmentHistory=z.infer<typeof ProductionAssignmentHistorySchema>;
export type ProductionAssignmentTransfer=z.infer<typeof ProductionAssignmentTransferSchema>;
export type ProductionAssignmentRole=Extract<Role,'admin'|'production'|'print'|'warehouse'>;
export type ProductionAssignmentTarget={memberId:string;userId:string;name:string;role:ProductionAssignmentRole;active:1;expectedTarget:string};
export type ProductionAssignmentCandidate=Pick<ProductionAssignmentTarget,'memberId'|'name'|'role'|'expectedTarget'>;
export type ProductionAssignmentPurpose='transfer'|'resolve_legacy';
export type ProductionAssignmentReview={purpose:ProductionAssignmentPurpose;orderId:string;workId:string;expectedContext:string;candidates:ProductionAssignmentCandidate[];blockedReason:string};
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
export const productionAssignmentRole=(role:string):role is ProductionAssignmentRole=>['admin','production','print','warehouse'].includes(role);

// Account IDs remain server-only. The browser receives an opaque digest of
// precisely the account identity, name, role and activation it reviewed.
export async function productionAssignmentTargetBasis(target:Omit<ProductionAssignmentTarget,'expectedTarget'>){
 const bytes=new TextEncoder().encode(recordBasis({memberId:target.memberId,userId:target.userId,name:target.name,role:target.role,active:target.active}));
 const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
}
export function productionAssignmentBasis(st:State,orderId:string,purpose:ProductionAssignmentPurpose='transfer'){
 const orders=st.orders.filter(order=>order.id===orderId),order=orders.length===1?orders[0]:undefined;
 const basis=recordBasis({orderId,orders,customers:order?st.customers.filter(customer=>customer.id===order.customerId).map(customer=>({id:customer.id,name:customer.name})):[],deals:order?st.deals.filter(deal=>deal.id===order.dealId).map(deal=>({id:deal.id,customerId:deal.customerId,title:deal.title})):[]});
 // Ordinary transfers retain their existing context bytes. A legacy review is
 // distinct evidence and cannot be authorized by a blocked transfer review.
 return purpose==='resolve_legacy'?recordBasis({purpose,basis}):basis;
}
export const isLegacyProductionAssignment=(production:Pick<State['orders'][number]['production'],'assigneeId'|'assigneeMemberId'|'assigneeName'|'assignmentHistory'>)=>!production.assigneeId&&!production.assigneeMemberId&&!!production.assigneeName.trim()&&!production.assignmentHistory.length;
export function productionAssignmentBlockedReason(st:State,orderId:string,workId:string,purpose:ProductionAssignmentPurpose='transfer'){
 const orders=st.orders.filter(order=>order.id===orderId),order=orders.length===1?orders[0]:undefined;
 if(!orders.length)return 'Arbetsordern finns inte.';
 if(!order||st.customers.filter(customer=>customer.id===order.customerId).length!==1||st.deals.filter(deal=>deal.id===order.dealId&&deal.customerId===order.customerId).length!==1||purpose==='resolve_legacy'&&st.deals.filter(deal=>deal.id===order.dealId).length!==1)return 'Arbetsorderns kopplingar behöver granskas innan ansvaret ändras.';
 if(!['submitted','printed'].includes(order.production.status))return 'Avslutade, avbrutna och ännu inte inlämnade jobb behåller sitt registrerade ansvar.';
 if(purpose==='resolve_legacy'){
  if(!isLegacyProductionAssignment(order.production))return 'Den här rättningen gäller bara ett äldre jobbansvar med namn, utan användar- eller kontokoppling och utan registrerad ansvarshistorik. Övriga ansvar kräver sitt vanliga granskningsflöde.';
 }else if(!order.production.assigneeId&&order.production.assigneeName)return 'Jobbet har ett tidigare ansvarigt namn utan användaridentitet. Granska den äldre ansvarskopplingen innan någon tilldelas jobbet.';
 if(!workId||order.production.workId!==workId)return 'Arbetsversionen har ändrats eller saknar ett stabilt id. Läs in och granska aktuellt jobb.';
 if(order.production.assignmentHistory.length>=1000)return 'Arbetsordern har nått gränsen för ansvarshistorik.';
 return '';
}
export function protectProductionAssignmentInput(old:State['orders'][number],raw:unknown){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const check=(previous:State['orders'][number]['production']|undefined,value:unknown)=>{
  if(!value||typeof value!=='object')return;
  const production=value as Record<string,unknown>;
  for(const key of ['assigneeMemberId','assignmentHistory'] as const)if(Object.prototype.hasOwnProperty.call(production,key))need(recordBasis(production[key])===recordBasis(previous?.[key]??(key==='assignmentHistory'?[]:'')),'Arbetsansvarets kontokoppling och historik skapas av systemet och får inte ändras i orderformuläret.');
 };
 check(old.production,supplied.production);
 if(Array.isArray(supplied.productionHistory))for(let index=0;index<supplied.productionHistory.length;index++)check(old.productionHistory[index],supplied.productionHistory[index]);
}
export function recordProductionAssignment(order:State['orders'][number],actor:Actor,target:{userId:string;memberId:string;name:string},action:ProductionAssignmentHistory['action'],reason:string,at=new Date().toISOString()){
 const production=order.production;need(production.assignmentHistory.length<1000,'Arbetsordern har nått gränsen för ansvarshistorik.');
 if(action==='resolve_legacy')need(isLegacyProductionAssignment(production),'Rättningen kräver ett äldre namn utan identitetskoppling eller registrerad ansvarshistorik.');
 const audit=ProductionAssignmentHistorySchema.parse({id:crypto.randomUUID(),orderId:order.id,workId:production.workId,revision:production.assignmentRevision+1,action,
  fromUserId:production.assigneeId,fromMemberId:production.assigneeMemberId,fromName:production.assigneeName,
  toUserId:target.userId,toMemberId:target.memberId,toName:target.name,reason,at,byId:actor.id,byMemberId:actor.memberId||'',byName:actor.name,...(action==='resolve_legacy'?{legacyAssignedAt:production.assignedAt}:{})});
 production.assigneeId=audit.toUserId;production.assigneeMemberId=audit.toMemberId;production.assigneeName=audit.toName;production.assignedAt=audit.toUserId?at:'';production.assignmentRevision=audit.revision;production.assignmentHistory.push(audit);
}
// The target is separate trusted server context. A CRM action payload never
// supplies its own account ID, name, role or historical audit.
export function transferProductionAssignment(st:State,input:ProductionAssignmentTransfer,actor:Actor,target:ProductionAssignmentTarget){
 changeProductionAssignment(st,input,actor,target,'transfer');
}
export function resolveLegacyProductionAssignment(st:State,input:ProductionAssignmentTransfer,actor:Actor,target:ProductionAssignmentTarget){
 changeProductionAssignment(st,input,actor,target,'resolve_legacy');
}
function changeProductionAssignment(st:State,input:ProductionAssignmentTransfer,actor:Actor,target:ProductionAssignmentTarget,purpose:ProductionAssignmentPurpose){
 const parsed=ProductionAssignmentTransferSchema.parse(input);need(actor.role==='admin'&&actor.memberId,'Arbetsansvaret ändras av en inloggad administratör.');
 need(parsed.expectedContext===productionAssignmentBasis(st,parsed.orderId,purpose),'Arbetsordern eller granskningsunderlaget har ändrats. Läs in och granska aktuellt jobb.');
 const blocked=productionAssignmentBlockedReason(st,parsed.orderId,parsed.workId,purpose);need(!blocked,blocked);
 need(target.memberId===parsed.targetMemberId&&target.userId&&target.name.trim()&&target.active===1&&productionAssignmentRole(target.role),'Välj ett aktivt, anslutet tryck-, lager-, produktions- eller administratörskonto.');
 need(parsed.expectedTarget===target.expectedTarget,'Det valda kontot har ändrats. Läs in och granska kontolistan igen.');
 const order=st.orders.find(order=>order.id===parsed.orderId)!;need(order.production.assigneeId!==target.userId,'Jobbet har redan den valda ansvariga.');
 const action=purpose==='resolve_legacy'?'resolve_legacy':order.production.assigneeId?'transfer':'assign';recordProductionAssignment(order,actor,target,action,parsed.reason);
 const audit=order.production.assignmentHistory.at(-1)!;
 st.events.unshift({id:crypto.randomUUID(),customerId:order.customerId,dealId:order.dealId,kind:'production',at:audit.at,text:action==='resolve_legacy'?'Äldre jobbansvar granskat. Tidigare namn: '+audit.fromName+' (identitet inte fastställd). Nytt produktionsansvar registrerat för '+target.name+'. Underlag och orsak: '+parsed.reason:'Arbetsansvar '+(action==='assign'?'tilldelat till '+target.name:'överlämnat från '+(audit.fromName||'tidigare konto')+' till '+target.name)+'. Orsak: '+parsed.reason,actor:{id:actor.id,name:actor.name}});
 validateProductionAssignmentReferences(st);
}
export function validateProductionAssignmentReferences(st:State){
 const ids=new Set<string>();
 for(const order of st.orders)for(const production of [order.production,...order.productionHistory]){
  need(!production.assigneeMemberId||production.assigneeId,'Arbetsansvaret har en kontokoppling utan användaridentitet.');
  need(!production.assigneeMemberId||production.assignmentHistory.length,'Arbetsansvarets kontokoppling saknar den registrerade ansvarshistoriken.');
  let previous:ProductionAssignmentHistory|undefined;
  for(const raw of production.assignmentHistory){
   const row=ProductionAssignmentHistorySchema.parse(raw);need(!ids.has(row.id),'Arbetsansvaret innehåller dubbla historik-id:n.');ids.add(row.id);
   need(row.orderId===order.id&&row.workId===production.workId,'Arbetsansvarets historik har en bruten order- eller arbetsversionskoppling.');
   need(!row.fromMemberId||row.fromUserId,'Arbetsansvarets historik har en kontokoppling utan användaridentitet.');
   // Legacy work had no member link. A first known audit may start at any
   // legacy revision/user, but a linked source needs its preceding audit.
   need(previous||!row.fromMemberId,'Arbetsansvarets historik saknar den tidigare registrerade kontokopplingen.');
   const releasing=row.action==='release',assigning=row.action==='assign'||row.action==='claim';
   need(releasing?!!row.fromUserId&&!row.toUserId&&!row.toMemberId&&!row.toName:!!row.toUserId&&!!row.toName,'Arbetsansvarets historik har en ogiltig ansvarskoppling.');
   need(!assigning||!row.fromUserId&&!row.fromMemberId&&!row.fromName,'Ett nytt arbetsansvar får inte ersätta en befintlig ansvarig.');
   need(row.action!=='transfer'||!!row.fromUserId&&row.fromUserId!==row.toUserId,'Överlämningen behöver två olika användaridentiteter.');
   need(row.action!=='resolve_legacy'||!previous&&!row.fromUserId&&!row.fromMemberId&&!!row.fromName&&typeof row.legacyAssignedAt==='string','Rättningen av äldre jobbansvar ska inleda historiken med tidigare namn och bevarat tidsfält utan gissad identitet.');
   need(!['assign','transfer','resolve_legacy'].includes(row.action)||!!row.toMemberId&&!!row.byMemberId,'Den granskade överlämningen saknar stabila kontokopplingar.');
   need(row.action!=='claim'||row.toUserId===row.byId&&row.toMemberId===row.byMemberId,'Eget arbetsansvar måste tillhöra den inloggade användaren.');
   need(!previous||row.revision===previous.revision+1&&row.fromUserId===previous.toUserId&&row.fromMemberId===previous.toMemberId&&row.fromName===previous.toName,'Arbetsansvarets ändringar bildar inte en sammanhängande ansvarskedja.');previous=row;
  }
  need(!previous||production.assignmentRevision===previous.revision&&production.assigneeId===previous.toUserId&&production.assigneeMemberId===previous.toMemberId&&production.assigneeName===previous.toName&&production.assignedAt===(previous.toUserId?previous.at:''),'Nuvarande arbetsansvar motsäger den senaste registrerade ändringen.');
 }
}
