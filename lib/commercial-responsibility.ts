import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Deal,Order,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const CommercialResponsibilityHistorySchema=z.object({
 id:z.string().uuid(),targetType:z.enum(['deal','order']),targetId:recordId,customerId:recordId,dealId:recordId,
 fromProfileId:z.string().uuid(),toProfileId:z.string().uuid(),fromOwner:ownerName,toOwner:ownerName,
 fromDisplayName:ownerName,toDisplayName:ownerName,selectedTaskIds:z.array(recordId).max(500),reason:required,
 at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const CommercialResponsibilityTransferSchema=z.object({
 targetType:z.enum(['deal','order']),targetId:recordId,targetProfileId:z.string().uuid(),
 selectedTaskIds:z.array(recordId).max(500).default([]),reason:required,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000)
});
export type CommercialResponsibilityTransfer=z.infer<typeof CommercialResponsibilityTransferSchema>;
export type CommercialResponsibilityHistory=z.infer<typeof CommercialResponsibilityHistorySchema>;
type TargetType=CommercialResponsibilityTransfer['targetType'];
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
const requiredKinds={deal:new Set(['discovery','quote','proof_deadline','order_deadline']),order:new Set(['handover','proof_deadline','order_deadline','receipt','invoice_ready'])};
const optionalKinds=new Set(['manual','care','meeting_followup']);
function targetRecord(st:State,type:TargetType,id:string):Deal|Order|undefined {
 return type==='deal'?st.deals.find(d=>d.id===id):st.orders.find(o=>o.id===id);
}
function sourceProfile(st:State,target:Deal|Order|undefined){
 if(!target)return undefined;
 // An anchored identity never falls back to today's matching alias. Empty
 // legacy records are mapped only by the explicit reviewed transfer below.
 return target.ownerProfileId?sellerProfileById(st.settings,target.ownerProfileId):sellerProfileForOwner(st.settings,target.owner);
}
function exclusion(task:Task,target:Deal|Order,type:TargetType){
 if(task.customerId!==target.customerId)return 'Uppgiften har en annan kundkoppling och behöver granskas separat.';
 if(task.done)return 'Avslutad uppgift: historiken behåller sin ansvariga.';
 if(task.owner!==target.owner)return 'En annan ansvarig har uppgiften.';
 if(task.kind==='delivery')return 'Kundkontakten efter leveransen har eget uppgiftsansvar och överförs inte med ordern. Granska leveranskontaktens ansvar separat.';
 if(!requiredKinds[type].has(task.kind)&&!optionalKinds.has(task.kind))return 'Uppgiften hör till ett särskilt kundflöde eller har en typ som inte överförs här.';
 return '';
}
export function commercialResponsibilityCandidates(st:State,targetType:TargetType,targetId:string){
 const target=targetRecord(st,targetType,targetId),customer=target?st.customers.find(c=>c.id===target.customerId):undefined;
 const dealId=targetType==='deal'?targetId:(target as Order|undefined)?.dealId||'';
 const linkedDeal=targetType==='order'?st.deals.find(d=>d.id===dealId):undefined;
 const linkedOrder=targetType==='deal'?st.orders.find(o=>o.dealId===targetId):undefined;
 const source=sourceProfile(st,target),eligible:Task[]=[],excluded:{task:Task;reason:string}[]=[],requiredTaskIds:string[]=[];
 for(const task of st.tasks.filter(t=>!!dealId&&t.dealId===dealId).sort((a,b)=>a.id.localeCompare(b.id))){
  const reason=target?exclusion(task,target,targetType):'Affären eller ordern finns inte.';
  if(reason)excluded.push({task,reason});else {eligible.push(task);if(requiredKinds[targetType].has(task.kind))requiredTaskIds.push(task.id);}
 }
 const targetProfiles=st.settings.sellerProfiles.filter(p=>p.active&&st.settings.owners.includes(p.legacyOwnerName)&&p.id!==source?.id);
 let blockedReason='';
 if(!target)blockedReason=targetType==='deal'?'Affären finns inte.':'Ordern finns inte.';
 else if(!customer)blockedReason='Kundkopplingen saknas. Granska affären eller ordern innan ansvaret ändras.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan affärs- eller orderansvaret överförs.';
 else if(!source||source.legacyOwnerName!==target.owner)blockedReason='Nuvarande ansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(targetType==='deal'&&['won','lost'].includes((target as Deal).stage))blockedReason='Vunnen eller förlorad affär behåller sitt historiska ansvar. Öppet orderansvar ändras på ordern.';
 else if(targetType==='deal'&&linkedOrder)blockedReason='Affären har en order. Granska och överför det öppna orderansvaret på ordern i stället.';
 else if(targetType==='order'&&(!linkedDeal||linkedDeal.customerId!==target.customerId))blockedReason='Orderns affärskoppling saknas eller hör till en annan kund.';
 else if(targetType==='order'&&(target as Order).stage==='followed')blockedReason='En uppföljd order behåller sitt historiska ansvar.';
 else if(target.responsibilityTransfers.length>=1000)blockedReason='Affären eller ordern har nått gränsen för ansvarshistorik.';
 else if(requiredTaskIds.length>500)blockedReason='Det finns fler än 500 nödvändiga öppna åtaganden. Granska arbetsunderlaget innan ansvaret överförs.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen annan aktiv säljarprofil för affärs- eller orderansvaret.';
 return {targetType,targetId,target,customer,linkedDeal,linkedOrder,sourceProfile:source,targetProfiles,eligible,requiredTaskIds,excluded,blockedReason};
}

// Freeze everything displayed or potentially selected in this handover. CAS
// retries may incorporate an unrelated customer's change, never a new preview.
export function commercialResponsibilityBasis(st:State,targetType:TargetType,targetId:string){
 const target=targetRecord(st,targetType,targetId),dealId=targetType==='deal'?targetId:(target as Order|undefined)?.dealId||'';
 const customer=target?st.customers.find(c=>c.id===target.customerId):undefined;
 return recordBasis({
  targetType,targetId,target:target||null,
  linkedDeal:targetType==='order'?st.deals.find(d=>d.id===dealId)||null:null,
  linkedOrder:targetType==='deal'?st.orders.find(o=>o.dealId===targetId)||null:null,
  customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,status:customer.status}:null,
  tasks:st.tasks.filter(t=>!!dealId&&t.dealId===dealId).sort((a,b)=>a.id.localeCompare(b.id)),
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(p=>({id:p.id,displayName:p.displayName,legacyOwnerName:p.legacyOwnerName,active:p.active,memberId:p.memberId}))
 });
}
export function transferCommercialResponsibility(st:State,input:CommercialResponsibilityTransfer,actor:Actor){
 const parsed=CommercialResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Affärs- och orderansvar överförs av en inloggad administratör.');
 need(parsed.expectedContext===commercialResponsibilityBasis(st,parsed.targetType,parsed.targetId),'Affärs- eller orderansvaret eller överlämningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateCommercialResponsibilityReferences(st);
 const candidates=commercialResponsibilityCandidates(st,parsed.targetType,parsed.targetId),target=candidates.target,source=candidates.sourceProfile,next=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(target&&source,'Nuvarande ansvar saknar en granskad säljarprofil.');
 need(next&&next.active&&st.settings.owners.includes(next.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 need(next!.id!==source!.id,'Affären eller ordern har redan den valda ansvariga.');
 need(new Set(parsed.selectedTaskIds).size===parsed.selectedTaskIds.length,'Välj varje uppgift endast en gång.');
 const eligible=new Map(candidates.eligible.map(task=>[task.id,task])),selected=new Set(parsed.selectedTaskIds);
 need(parsed.selectedTaskIds.every(id=>eligible.has(id)),'En vald uppgift är avslutad, tillhör en annan kund eller ansvarig, eller behöver överföras i sitt eget arbetsflöde.');
 need(candidates.requiredTaskIds.every(id=>selected.has(id)),'Alla nödvändiga öppna affärs- eller orderåtaganden behöver följa med. Granska och välj dem innan du sparar.');
 const dealId=parsed.targetType==='deal'?target!.id:(target as Order).dealId;
 const row=CommercialResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),targetType:parsed.targetType,targetId:target!.id,customerId:target!.customerId,dealId,
  fromProfileId:source!.id,toProfileId:next!.id,fromOwner:target!.owner,toOwner:next!.legacyOwnerName,
  fromDisplayName:source!.displayName,toDisplayName:next!.displayName,selectedTaskIds:parsed.selectedTaskIds,reason:parsed.reason,
  at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 target!.owner=next!.legacyOwnerName;target!.ownerProfileId=next!.id;target!.responsibilityTransfers.push(row);
 for(const id of parsed.selectedTaskIds)eligible.get(id)!.owner=next!.legacyOwnerName;
 st.events.unshift({id:crypto.randomUUID(),customerId:target!.customerId,dealId,kind:'commercial_responsibility_transfer',at:row.at,text:(parsed.targetType==='deal'?'Affärsansvar':'Orderansvar')+' överfört: '+row.fromDisplayName+' → '+row.toDisplayName+'\n'+row.selectedTaskIds.length+' valda öppna åtaganden följde med.\nOrsak: '+row.reason});
}
export function validateCommercialResponsibilityReferences(st:State){
 const seen=new Set<string>(),tasks=new Map(st.tasks.map(t=>[t.id,t])),profiles=new Map(st.settings.sellerProfiles.map(p=>[p.id,p])),customers=new Set(st.customers.map(c=>c.id));
 for(const targetType of ['deal','order'] as const)for(const target of targetType==='deal'?st.deals:st.orders){
  const ownerId=target.ownerProfileId,history=target.responsibilityTransfers,dealId=targetType==='deal'?target.id:(target as Order).dealId;
  need(!ownerId||st.settings.sellerProfilesInitialized&&profiles.get(ownerId)?.legacyOwnerName===target.owner,'Affärens eller orderns stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:CommercialResponsibilityHistory|undefined;
  for(const raw of history){
   const row=CommercialResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Affärs- och orderhistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.targetType===targetType&&row.targetId===target.id&&row.customerId===target.customerId&&row.dealId===dealId&&customers.has(row.customerId),'Ansvarshistoriken har en bruten kund-, affärs- eller orderkoppling.');
   if(targetType==='order')need(st.deals.some(d=>d.id===row.dealId&&d.customerId===row.customerId),'Orderns ansvarshistorik har en bruten affärskoppling.');
   need(row.fromProfileId!==row.toProfileId&&profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner,'Ansvarshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toOwner===row.fromOwner,'Ansvarshistorikens överföringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length&&row.selectedTaskIds.every(id=>tasks.get(id)?.customerId===row.customerId&&tasks.get(id)?.dealId===row.dealId),'Ansvarshistoriken har dubbla, saknade eller felaktiga affärs- eller kundkopplingar för uppgifterna.');
   previous=row;
  }
  need(!previous||ownerId===previous.toProfileId&&target.owner===previous.toOwner,'Nuvarande affärs- eller orderansvar motsäger den senaste granskade överföringen.');
 }
}
