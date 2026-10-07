import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Customer,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const required=z.string().trim().min(1).max(4000),recordId=required.max(100);
export const CustomerResponsibilityHistorySchema=z.object({
 id:z.string().uuid(),customerId:recordId,fromProfileId:z.string().uuid(),toProfileId:z.string().uuid(),
 fromOwner:required.max(150),toOwner:required.max(150),selectedTaskIds:z.array(recordId).max(500),
 reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const CustomerResponsibilityTransferSchema=z.object({
 customerId:recordId,targetProfileId:z.string().uuid(),selectedTaskIds:z.array(recordId).max(500).default([]),
 reason:required,expectedContext:z.string().min(1).max(3000000),reviewed:z.literal(true)
});
export type CustomerResponsibilityTransfer=z.infer<typeof CustomerResponsibilityTransferSchema>;
type CustomerResponsibilityHistory=z.infer<typeof CustomerResponsibilityHistorySchema>;
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
  meetings:st.meetings.filter(m=>m.customerId===customerId).map(m=>({id:m.id,owner:m.owner,status:m.status,title:m.title,date:m.date})).sort((a,b)=>a.id.localeCompare(b.id))
 });
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
  let previous:CustomerResponsibilityHistory|undefined;
  for(const raw of c.responsibilityTransfers){
   const row=CustomerResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Ansvarshistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.customerId===c.id,'Ansvarshistoriken har en bruten kund- eller profilkoppling.');
   need(row.fromProfileId!==row.toProfileId&&profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner,'Ansvarshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toOwner===row.fromOwner,'Kundens överföringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length&&row.selectedTaskIds.every(id=>tasks.get(id)?.customerId===c.id),'Ansvarshistoriken har dubbla, saknade eller felaktiga kundkopplingar för uppgifterna.');
   previous=row;
  }
  // Legacy, already-reviewed histories remain readable without silently
  // filling their blank ID. Their current owner must still tell the truth.
  need(!previous||c.owner===previous.toOwner&&(!c.ownerProfileId||c.ownerProfileId===previous.toProfileId),'Nuvarande kundansvar motsäger den senaste granskade överföringen.');
 }
}
