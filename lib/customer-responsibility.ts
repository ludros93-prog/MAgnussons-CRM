import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Customer,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner,validateSellerProfileReferences} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const required=z.string().trim().min(1).max(4000),recordId=required.max(100);
const exactText=(max:number)=>z.string().min(1).max(max).refine(value=>value===value.trim()&&!value.includes('\0'),'Ansvarskopplingen kräver en exakt registrerad identitet.');
const accountDigest=z.string().regex(/^[a-f0-9]{64}$/);
// Preserve the original strict transfer shape. Reading an older audit must
// never materialize action, recorded-ID or account fields that were not saved.
const CustomerResponsibilityTransferHistorySchema=z.object({
 id:z.string().uuid(),customerId:recordId,fromProfileId:z.string().uuid(),toProfileId:z.string().uuid(),
 fromOwner:required.max(150),toOwner:required.max(150),selectedTaskIds:z.array(recordId).max(500),
 reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const CustomerResponsibilityAnchorHistorySchema=CustomerResponsibilityTransferHistorySchema.extend({
 action:z.literal('anchor'),fromRecordedProfileId:z.literal(''),selectedTaskIds:z.array(recordId).max(0),
 fromDisplayName:exactText(150),toDisplayName:exactText(150),
 targetMemberId:exactText(150),targetUserId:exactText(4000),targetName:exactText(150),targetRole:z.enum(['admin','seller'])
}).strict();
export const CustomerResponsibilityHistorySchema=z.union([CustomerResponsibilityTransferHistorySchema,CustomerResponsibilityAnchorHistorySchema]);
export const CustomerResponsibilityTransferSchema=z.object({
 customerId:recordId,targetProfileId:z.string().uuid(),selectedTaskIds:z.array(recordId).max(500).default([]),
 reason:required,expectedContext:z.string().min(1).max(3000000),reviewed:z.literal(true)
});
export type CustomerResponsibilityTransfer=z.infer<typeof CustomerResponsibilityTransferSchema>;
export const CustomerResponsibilityAnchorSchema=z.object({
 customerId:recordId,targetProfileId:z.string().uuid(),reason:required,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000),expectedAccount:accountDigest
}).strict();
export type CustomerResponsibilityAnchor=z.infer<typeof CustomerResponsibilityAnchorSchema>;
export const CustomerResponsibilityAnchorTargetSchema=z.object({
 memberId:exactText(150),userId:exactText(4000),name:exactText(150),email:z.string().email().refine(value=>value===value.trim()),
 role:z.enum(['admin','seller']),owner:exactText(150),active:z.literal(1),expectedAccount:accountDigest
}).strict();
export type CustomerResponsibilityAnchorTarget=z.infer<typeof CustomerResponsibilityAnchorTargetSchema>;
export type CustomerResponsibilityHistory=z.infer<typeof CustomerResponsibilityHistorySchema>;
export type CustomerResponsibilityAnchorHistory=z.infer<typeof CustomerResponsibilityAnchorHistorySchema>;
export const isCustomerResponsibilityAnchorHistory=(row:CustomerResponsibilityHistory):row is CustomerResponsibilityAnchorHistory=>'action' in row&&row.action==='anchor';
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
const independentKinds=new Set(['manual','care','meeting_followup']);
function sourceProfile(st:State,customer:Customer|undefined){
 if(!customer)return undefined;
 // An anchored customer never falls back to another matching name. Older
 // blank IDs are anchored only when the transfer is explicitly reviewed.
 return customer.ownerProfileId?sellerProfileById(st.settings,customer.ownerProfileId):sellerProfileForOwner(st.settings,customer.owner);
}
function excludedReason(task:Task,currentOwner:string){
 if(task.done)return 'Avslutad uppgift: historiken behåller sin ansvariga.';
 if(task.owner!==currentOwner)return 'En annan ansvarig har uppgiften.';
 if(task.dealId)return 'Uppgiften hör till en affär eller order som behåller sitt ansvar.';
 if(!independentKinds.has(task.kind))return 'Ansvar styrs av affären, ordern eller ett särskilt kundflöde.';
 return '';
}
export function customerResponsibilityCandidates(st:State,customerId:string){
 const customer=st.customers.find(c=>c.id===customerId),source=sourceProfile(st,customer);
 const eligible:Task[]=[],excluded:{task:Task;reason:string}[]=[];
 for(const task of st.tasks.filter(t=>t.customerId===customerId)){
  const reason=excludedReason(task,customer?.owner||'');if(reason)excluded.push({task,reason});else eligible.push(task);
 }
 const targetProfiles=st.settings.sellerProfiles.filter(p=>p.active&&st.settings.owners.includes(p.legacyOwnerName)&&p.id!==source?.id);
 const blockedReason=!customer?'Kunden finns inte.':!st.settings.sellerProfilesInitialized?'Skapa och granska de stabila säljarprofilerna innan kundansvaret överförs.':!source||source.legacyOwnerName!==customer.owner?'Kundens nuvarande ansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.':customer.responsibilityTransfers.length>=1000?'Kunden har nått gränsen för ansvarshistorik.':!targetProfiles.length?'Det finns ingen annan aktiv säljarprofil för kundansvaret.':'';
 return {eligible,excluded,sourceProfile:source,targetProfiles,blockedReason};
}
// The reviewed customer, all its activities, excluded responsibilities and
// available profile choices form one context. An unrelated customer's edit
// may retry; a changed handover preview must be reviewed again.
export function customerResponsibilityBasis(st:State,customerId:string){
 const c=st.customers.find(c=>c.id===customerId);
 return recordBasis({
  customer:c?{id:c.id,name:c.name,owner:c.owner,ownerProfileId:c.ownerProfileId,status:c.status,responsibilityTransfers:c.responsibilityTransfers,onboarding:c.onboarding,plan:c.plan,yearNeeds:c.yearNeeds}:null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(p=>({id:p.id,displayName:p.displayName,legacyOwnerName:p.legacyOwnerName,active:p.active,memberId:p.memberId})),
  tasks:st.tasks.filter(t=>t.customerId===customerId).sort((a,b)=>a.id.localeCompare(b.id)),
  deals:st.deals.filter(d=>d.customerId===customerId).map(d=>({id:d.id,owner:d.owner,stage:d.stage,title:d.title,nextDate:d.nextDate})).sort((a,b)=>a.id.localeCompare(b.id)),
  orders:st.orders.filter(o=>o.customerId===customerId).map(o=>({id:o.id,owner:o.owner,stage:o.stage,deliveryDate:o.deliveryDate,invoiceValue:o.invoiceValue,productionStatus:o.production.status})).sort((a,b)=>a.id.localeCompare(b.id)),
  meetings:st.meetings.filter(m=>m.customerId===customerId).map(m=>({id:m.id,owner:m.owner,ownerProfileId:m.ownerProfileId,responsibilityTransfers:m.responsibilityTransfers,status:m.status,title:m.title,date:m.date})).sort((a,b)=>a.id.localeCompare(b.id))
 });
}
// This operation links one existing open customer's older blank ID to the
// same reviewed person. It never chooses a replacement owner or moves work.
export function customerResponsibilityAnchorReview(st:State,customerId:string){
 const matches=st.customers.filter(customer=>customer.id===customerId),customer=matches.length===1?matches[0]:undefined;
 const source=sourceProfile(st,customer);
 let blockedReason='';
 if(!matches.length)blockedReason='Kunden finns inte.';
 else if(!customer)blockedReason='Kundkopplingen är tvetydig. Granska kundunderlaget först.';
 else if(customer.status==='closed')blockedReason='En avslutad kundrelation behåller sitt ansvar. Återöppna relationen i dess granskningsflöde när det finns ett verkligt nästa steg.';
 else if(customer.ownerProfileId)blockedReason='Kundansvaret har redan en registrerad ansvarskoppling.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan kundansvaret kopplas.';
 else if(!source||source.legacyOwnerName!==customer.owner||st.settings.sellerProfiles.filter(profile=>profile.legacyOwnerName===customer.owner).length!==1)blockedReason='Kundens ansvariga saknar en entydig granskad säljarprofil. Granska personkopplingen först.';
 else if(!source.active||source.retirementHistory.length||!st.settings.owners.includes(source.legacyOwnerName))blockedReason='Kundansvaret behöver en aktiv, granskad säljarprofil bland teamets ansvariga.';
 else if(!source.memberId||source.memberId!==source.memberId.trim())blockedReason='Säljarprofilen saknar en registrerad kontokoppling. Granska profilen och personens anslutna konto först.';
 else if(customer.responsibilityTransfers.length>=1000)blockedReason='Kunden har nått gränsen för ansvarshistorik.';
 return {customer,sourceProfile:source,blockedReason};
}
export function customerResponsibilityAnchorBasis(st:State,customerId:string){
 const review=customerResponsibilityAnchorReview(st,customerId);
 return recordBasis({purpose:'customer_responsibility_anchor',customer:review.customer||null,sourceProfile:review.sourceProfile||null,responsibility:customerResponsibilityBasis(st,customerId)});
}
// Account context is supplied only by the server's fresh directory read. A
// client payload cannot provide its own user, member, role or audit snapshot.
export function anchorCustomerResponsibility(st:State,input:CustomerResponsibilityAnchor,actor:Actor,target:CustomerResponsibilityAnchorTarget){
 const parsed=CustomerResponsibilityAnchorSchema.parse(input),account=CustomerResponsibilityAnchorTargetSchema.parse(target);
 need(actor.role==='admin'&&actor.memberId&&actor.memberId===actor.memberId.trim()&&actor.id.trim()&&actor.id===actor.id.trim()&&actor.name.trim(),'Kundansvar kopplas av en inloggad administratör.');
 need(parsed.expectedContext===customerResponsibilityAnchorBasis(st,parsed.customerId),'Kunden eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag innan ansvaret kopplas.');
 validateSellerProfileReferences(st);validateCustomerResponsibilityReferences(st);
 const review=customerResponsibilityAnchorReview(st,parsed.customerId);
 need(!review.blockedReason,review.blockedReason);
 const customer=review.customer!,profile=review.sourceProfile!;
 need(parsed.targetProfileId===profile.id,'Koppla kundansvaret till samma redan granskade ansvariga person. Ett byte görs i Byt kundansvar.');
 need(account.memberId===profile.memberId&&account.owner===profile.legacyOwnerName&&account.owner===customer.owner,'Det anslutna kontot motsäger kundens granskade personkoppling. Läs in och granska profilen och kontot igen.');
 need(parsed.expectedAccount===account.expectedAccount,'Det anslutna kontot har ändrats. Läs in och granska kontot igen innan ansvaret kopplas.');
 const at=new Date().toISOString(),row=CustomerResponsibilityAnchorHistorySchema.parse({
  id:crypto.randomUUID(),customerId:customer.id,action:'anchor',fromRecordedProfileId:'',fromProfileId:profile.id,toProfileId:profile.id,
  fromOwner:customer.owner,toOwner:customer.owner,fromDisplayName:profile.displayName,toDisplayName:profile.displayName,selectedTaskIds:[],
  targetMemberId:account.memberId,targetUserId:account.userId,targetName:account.name,targetRole:account.role,
  reason:parsed.reason,at,byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 const event={id:crypto.randomUUID(),customerId:customer.id,dealId:'',kind:'customer_responsibility_anchor',at,actor:{id:actor.id,name:actor.name},text:'Kundansvar kopplat: '+profile.displayName+' · '+customer.owner+'\nSamma ansvariga person fortsätter. Kontokopplingen granskades vid denna registrering; ingen tidigare kontoidentitet rekonstrueras.\nUnderlag: '+parsed.reason};
 customer.ownerProfileId=profile.id;customer.responsibilityTransfers.push(row);st.events.unshift(event);
 validateCustomerResponsibilityReferences(st);
 return st;
}
export function transferCustomerResponsibility(st:State,input:CustomerResponsibilityTransfer,actor:Actor){
 need(actor.role==='admin'&&actor.memberId,'Kundansvar överförs av en inloggad administratör.');
 need(input.expectedContext===customerResponsibilityBasis(st,input.customerId),'Kundansvaret eller överlämningsunderlaget har ändrats. Läs in och granska det aktuella underlaget.');
 validateCustomerResponsibilityReferences(st);
 const candidates=customerResponsibilityCandidates(st,input.customerId),c=st.customers.find(c=>c.id===input.customerId),target=sellerProfileById(st.settings,input.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(c&&candidates.sourceProfile,'Kundens ansvar saknar en verifierad profil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 need(target!.id!==candidates.sourceProfile!.id,'Kunden har redan den valda ansvariga.');
 need(new Set(input.selectedTaskIds).size===input.selectedTaskIds.length,'Välj varje uppgift endast en gång.');
 const eligible=new Map(candidates.eligible.map(t=>[t.id,t]));
 need(input.selectedTaskIds.every(id=>eligible.has(id)),'En vald uppgift är avslutad, tillhör en annan kund eller ansvarig, eller behöver överföras i sitt eget arbetsflöde.');
 need(c!.responsibilityTransfers.length<1000,'Kunden har nått gränsen för ansvarshistorik.');
 const row=CustomerResponsibilityHistorySchema.parse({id:crypto.randomUUID(),customerId:c!.id,fromProfileId:candidates.sourceProfile!.id,toProfileId:target!.id,fromOwner:c!.owner,toOwner:target!.legacyOwnerName,selectedTaskIds:input.selectedTaskIds,reason:input.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 c!.owner=target!.legacyOwnerName;c!.ownerProfileId=target!.id;for(const id of input.selectedTaskIds)eligible.get(id)!.owner=target!.legacyOwnerName;
 c!.responsibilityTransfers.push(row);
 st.events.unshift({id:crypto.randomUUID(),customerId:c!.id,dealId:'',kind:'responsibility_transfer',at:row.at,text:'Kundansvar överfört: '+row.fromOwner+' → '+row.toOwner+'\n'+row.selectedTaskIds.length+' valda öppna uppgifter följde med.\nOrsak: '+row.reason});
}
export function validateCustomerResponsibilityReferences(st:State){
 const seen=new Set<string>(),tasks=new Map(st.tasks.map(t=>[t.id,t])),profiles=new Map(st.settings.sellerProfiles.map(p=>[p.id,p]));
 for(const c of st.customers){
  need(!c.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(c.ownerProfileId)?.legacyOwnerName===c.owner,'Kundens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:CustomerResponsibilityHistory|undefined,anchored=false;
  for(const raw of c.responsibilityTransfers){
   const row=CustomerResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Ansvarshistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.customerId===c.id,'Ansvarshistoriken har en bruten kund- eller profilkoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner,'Ansvarshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   if(isCustomerResponsibilityAnchorHistory(row)){
    need(!anchored&&!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId&&row.fromOwner===row.toOwner&&row.fromDisplayName===row.toDisplayName&&!row.selectedTaskIds.length,'Kundhistoriken har en ogiltig eller upprepad ansvarskoppling.');
    anchored=true;
   }else need(row.fromProfileId!==row.toProfileId,'Ansvarshistorikens överföring behöver två olika säljarprofiler.');
   // A valid older transfer chain may still end at a blank recorded ID. Its
   // first explicit anchor joins the verified profile, without rewriting that
   // blank past into a recorded assignment or claiming any child activity.
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toOwner===row.fromOwner,'Kundens överföringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length&&row.selectedTaskIds.every(id=>tasks.get(id)?.customerId===c.id),'Ansvarshistoriken har dubbla, saknade eller felaktiga kundkopplingar för uppgifterna.');
   previous=row;
  }
  // Legacy, already-reviewed histories remain readable without silently
  // filling their blank ID. Their current owner must still tell the truth.
  need(!previous||c.owner===previous.toOwner&&((!c.ownerProfileId&&!anchored)||c.ownerProfileId===previous.toProfileId),'Nuvarande kundansvar motsäger den senaste granskade överföringen.');
 }
}
