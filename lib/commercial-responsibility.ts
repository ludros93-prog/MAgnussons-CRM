import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Deal,Order,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner,validateSellerProfileReferences} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
const exactText=(max:number)=>z.string().min(1).max(max).refine(value=>value===value.trim()&&!value.includes('\0'),'Ansvarskopplingen kräver en exakt registrerad identitet.');
const accountDigest=z.string().regex(/^[a-f0-9]{64}$/);
// Keep previously saved transfers strict and unchanged. A new neutral link
// records its own evidence; reading old rows must never add account history.
const CommercialResponsibilityTransferHistorySchema=z.object({
 id:z.string().uuid(),targetType:z.enum(['deal','order']),targetId:recordId,customerId:recordId,dealId:recordId,
 fromProfileId:z.string().uuid(),toProfileId:z.string().uuid(),fromOwner:ownerName,toOwner:ownerName,
 fromDisplayName:ownerName,toDisplayName:ownerName,selectedTaskIds:z.array(recordId).max(500),reason:required,
 at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const CommercialResponsibilityAnchorHistorySchema=CommercialResponsibilityTransferHistorySchema.extend({
 action:z.literal('anchor'),targetType:z.literal('deal'),fromRecordedProfileId:z.literal(''),
 selectedTaskIds:z.array(recordId).max(0),fromDisplayName:exactText(150),toDisplayName:exactText(150),
 targetMemberId:exactText(150),targetUserId:exactText(4000),targetName:exactText(150),targetRole:z.enum(['admin','seller'])
}).strict();
export const CommercialResponsibilityHistorySchema=z.union([CommercialResponsibilityTransferHistorySchema,CommercialResponsibilityAnchorHistorySchema]);
export const CommercialResponsibilityTransferSchema=z.object({
 targetType:z.enum(['deal','order']),targetId:recordId,targetProfileId:z.string().uuid(),
 selectedTaskIds:z.array(recordId).max(500).default([]),reason:required,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000)
});
export type CommercialResponsibilityTransfer=z.infer<typeof CommercialResponsibilityTransferSchema>;
export const CommercialResponsibilityAnchorSchema=z.object({
 dealId:recordId,targetProfileId:z.string().uuid(),reason:required,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000),expectedAccount:accountDigest
}).strict();
export type CommercialResponsibilityAnchor=z.infer<typeof CommercialResponsibilityAnchorSchema>;
export const CommercialResponsibilityAnchorTargetSchema=z.object({
 memberId:exactText(150),userId:exactText(4000),name:exactText(150),email:z.string().email().refine(value=>value===value.trim()),
 role:z.enum(['admin','seller']),owner:exactText(150),active:z.literal(1),expectedAccount:accountDigest
}).strict();
export type CommercialResponsibilityAnchorTarget=z.infer<typeof CommercialResponsibilityAnchorTargetSchema>;
export type CommercialResponsibilityHistory=z.infer<typeof CommercialResponsibilityHistorySchema>;
export type CommercialResponsibilityAnchorHistory=z.infer<typeof CommercialResponsibilityAnchorHistorySchema>;
export const isCommercialResponsibilityAnchorHistory=(row:CommercialResponsibilityHistory):row is CommercialResponsibilityAnchorHistory=>'action' in row&&row.action==='anchor';
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
 // legacy records are mapped only by an explicit reviewed transfer or link.
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
// A neutral link is available only for an existing open deal that has never
// recorded a responsibility ID or transfer and has no order. It does not move
// activities or reconstruct ownership of an earlier commercial result.
export function commercialResponsibilityAnchorReview(st:State,dealId:string){
 const matches=st.deals.filter(deal=>deal.id===dealId),deal=matches.length===1?matches[0]:undefined;
 const customers=deal?st.customers.filter(customer=>customer.id===deal.customerId):[],customer=customers.length===1?customers[0]:undefined;
 const source=sourceProfile(st,deal),linkedOrder=st.orders.find(order=>order.dealId===dealId);
 let blockedReason='';
 if(!matches.length)blockedReason='Affären finns inte.';
 else if(!deal)blockedReason='Affärskopplingen är tvetydig. Granska affärsunderlaget först.';
 else if(!customer)blockedReason='Kundkopplingen saknas eller är tvetydig. Granska affärsunderlaget först.';
 else if(['won','lost'].includes(deal.stage))blockedReason='En vunnen eller förlorad affär behåller sitt historiska ansvar.';
 else if(linkedOrder)blockedReason='Affären har en order. Granska orderansvaret i dess eget arbetsflöde.';
 else if(deal.ownerProfileId)blockedReason='Affärsansvaret har redan en registrerad ansvarskoppling.';
 else if(deal.responsibilityTransfers.length)blockedReason='Affären har registrerad ansvarshistorik. Granska den i affärens befintliga överlämningsflöde.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan affärsansvaret kopplas.';
 else if(!source||source.legacyOwnerName!==deal.owner||st.settings.sellerProfiles.filter(profile=>profile.legacyOwnerName===deal.owner).length!==1||st.settings.sellerProfiles.filter(profile=>profile.id===source.id).length!==1)blockedReason='Affärens ansvariga saknar en entydig granskad säljarprofil. Granska personkopplingen först.';
 else if(!source.active||source.retirementHistory.length||!st.settings.owners.includes(source.legacyOwnerName))blockedReason='Affärsansvaret behöver en aktiv, granskad säljarprofil bland teamets ansvariga.';
 else if(!source.memberId||source.memberId!==source.memberId.trim()||source.memberId.includes('\0')||st.settings.sellerProfiles.filter(profile=>profile.memberId===source.memberId).length!==1)blockedReason='Säljarprofilen saknar en entydig registrerad kontokoppling. Granska profilen och personens anslutna konto först.';
 return {deal,customer,sourceProfile:source,linkedOrder,blockedReason};
}
export function commercialResponsibilityAnchorBasis(st:State,dealId:string){
 const review=commercialResponsibilityAnchorReview(st,dealId);
 return recordBasis({
  purpose:'commercial_responsibility_anchor',dealId,deal:review.deal||null,customer:review.customer||null,sourceProfile:review.sourceProfile||null,
  responsibility:commercialResponsibilityBasis(st,'deal',dealId),
  linkedOrders:st.orders.filter(order=>order.dealId===dealId).sort((a,b)=>a.id.localeCompare(b.id))
 });
}
// The server supplies the fresh account tuple and its directory digest. A
// payload cannot nominate a different member, role or account audit snapshot.
export function anchorCommercialResponsibility(st:State,input:CommercialResponsibilityAnchor,actor:Actor,target:CommercialResponsibilityAnchorTarget){
 const parsed=CommercialResponsibilityAnchorSchema.parse(input),account=CommercialResponsibilityAnchorTargetSchema.parse(target);
 need(actor.role==='admin'&&actor.memberId&&actor.memberId===actor.memberId.trim()&&actor.id.trim()&&actor.id===actor.id.trim()&&actor.name.trim(),'Affärsansvar kopplas av en inloggad administratör.');
 need(parsed.expectedContext===commercialResponsibilityAnchorBasis(st,parsed.dealId),'Affären eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag innan ansvaret kopplas.');
 validateSellerProfileReferences(st);validateCommercialResponsibilityReferences(st);
 const review=commercialResponsibilityAnchorReview(st,parsed.dealId);
 need(!review.blockedReason,review.blockedReason);
 const deal=review.deal!,profile=review.sourceProfile!;
 need(parsed.targetProfileId===profile.id,'Koppla affärsansvaret till samma redan granskade ansvariga person. Ett byte görs i Byt affärsansvar.');
 need(account.memberId===profile.memberId&&account.owner===profile.legacyOwnerName&&account.owner===deal.owner,'Det anslutna kontot motsäger affärens granskade personkoppling. Läs in och granska profilen och kontot igen.');
 need(parsed.expectedAccount===account.expectedAccount,'Det anslutna kontot har ändrats. Läs in och granska kontot igen innan ansvaret kopplas.');
 const at=new Date().toISOString(),row=CommercialResponsibilityAnchorHistorySchema.parse({
  id:crypto.randomUUID(),targetType:'deal',targetId:deal.id,customerId:deal.customerId,dealId:deal.id,action:'anchor',fromRecordedProfileId:'',
  fromProfileId:profile.id,toProfileId:profile.id,fromOwner:deal.owner,toOwner:deal.owner,
  fromDisplayName:profile.displayName,toDisplayName:profile.displayName,selectedTaskIds:[],
  targetMemberId:account.memberId,targetUserId:account.userId,targetName:account.name,targetRole:account.role,
  reason:parsed.reason,at,byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 const event={id:crypto.randomUUID(),customerId:deal.customerId,dealId:deal.id,kind:'commercial_responsibility_anchor',at,actor:{id:actor.id,name:actor.name},text:'Affärsansvar kopplat: '+profile.displayName+' · '+deal.owner+'\nSamma ansvariga person fortsätter. Kontokopplingen granskades vid denna registrering; ingen tidigare kontoidentitet rekonstrueras.\nUnderlag: '+parsed.reason};
 deal.ownerProfileId=profile.id;deal.responsibilityTransfers.push(row);st.events.unshift(event);
 validateCommercialResponsibilityReferences(st);
 return st;
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
  let previous:CommercialResponsibilityHistory|undefined,anchored=false;
  for(const raw of history){
   const row=CommercialResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Affärs- och orderhistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.targetType===targetType&&row.targetId===target.id&&row.customerId===target.customerId&&row.dealId===dealId&&customers.has(row.customerId),'Ansvarshistoriken har en bruten kund-, affärs- eller orderkoppling.');
   if(targetType==='order')need(st.deals.some(d=>d.id===row.dealId&&d.customerId===row.customerId),'Orderns ansvarshistorik har en bruten affärskoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner,'Ansvarshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   if(isCommercialResponsibilityAnchorHistory(row)){
    need(targetType==='deal'&&!previous&&!anchored&&!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId&&row.fromOwner===row.toOwner&&row.fromDisplayName===row.toDisplayName&&!row.selectedTaskIds.length,'Affärshistoriken har en ogiltig eller upprepad ansvarskoppling.');
    anchored=true;
   }else need(row.fromProfileId!==row.toProfileId,'Ansvarshistorikens överföring behöver två olika säljarprofiler.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toOwner===row.fromOwner,'Ansvarshistorikens överföringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length&&row.selectedTaskIds.every(id=>tasks.get(id)?.customerId===row.customerId&&tasks.get(id)?.dealId===row.dealId),'Ansvarshistoriken har dubbla, saknade eller felaktiga affärs- eller kundkopplingar för uppgifterna.');
   previous=row;
  }
  need(!previous||ownerId===previous.toProfileId&&target.owner===previous.toOwner,'Nuvarande affärs- eller orderansvar motsäger den senaste granskade överföringen.');
 }
}
