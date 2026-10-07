import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Customer,Settings,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {taskResponsibleProfile} from './task-responsibility';
import {recordBasis} from './record-conflicts';

const profileId=z.string().uuid(),recordedProfileId=z.union([z.literal(''),profileId]);
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const OnboardingResponsibilityHistorySchema=z.object({
 id:profileId,customerId:recordId,dealId:recordId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 selectedTaskIds:z.array(recordId).max(500),reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const OnboardingResponsibilityTransferSchema=z.object({
 customerId:recordId,targetProfileId:profileId,selectedTaskIds:z.array(recordId).max(500).default([]),
 reason:required,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type OnboardingResponsibilityHistory=z.infer<typeof OnboardingResponsibilityHistorySchema>;
export type OnboardingResponsibilityTransfer=z.infer<typeof OnboardingResponsibilityTransferSchema>;
type Onboarding=Customer['onboarding'];
type Responsibility=Pick<Onboarding,'owner'|'ownerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// An existing blank is displayed through its original reviewed alias, never
// filled by reading, checklist work, a rename or backup normalization.
export function onboardingResponsibleProfile(st:State,onboarding:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(onboarding.ownerProfileId){
  const profile=sellerProfileById(st.settings,onboarding.ownerProfileId);
  return profile?.legacyOwnerName===onboarding.owner?profile:undefined;
 }
 return sellerProfileForOwner(st.settings,onboarding.owner);
}
export function onboardingOwnerLabel(st:State,onboarding:Responsibility){
 const profile=onboardingResponsibleProfile(st,onboarding);
 if(!profile)return onboarding.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

export function protectOnboardingResponsibility(old:Onboarding,next:Onboarding,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(Object.prototype.hasOwnProperty.call(supplied,'ownerProfileId'))need(next.ownerProfileId===old.ownerProfileId,'Onboardingens ansvarsprofil ändras bara i en granskad överlämning.');
 if(Object.prototype.hasOwnProperty.call(supplied,'responsibilityTransfers'))need(recordBasis(next.responsibilityTransfers)===recordBasis(old.responsibilityTransfers),'Onboardingens ansvarshistorik skapas av systemet och får inte ändras i checklistan.');
 need(!settings.sellerProfilesInitialized||next.owner===old.owner,'Använd Byt onboardingansvar för en granskad överlämning.');
 if(!settings.sellerProfilesInitialized)need(settings.owners.includes(next.owner),'Välj en ansvarig från teamet.');
 next.ownerProfileId=old.ownerProfileId;next.responsibilityTransfers=structuredClone(old.responsibilityTransfers);
}

function excludedReason(st:State,task:Task,onboarding:Onboarding|undefined){
 if(task.done)return 'Avslutad uppgift behåller sitt historiska ansvar.';
 if(task.kind!=='onboarding')return 'Uppgiften hör till ett annat arbetsflöde.';
 if(task.dealId)return 'Affärs- och orderkopplade uppgifter har egna överlämningar.';
 if(task.owner!==onboarding?.owner)return 'En annan ansvarig har uppgiften.';
 const source=onboarding?onboardingResponsibleProfile(st,onboarding):undefined,taskProfile=taskResponsibleProfile(st,task);
 if(!source||!taskProfile||taskProfile.id!==source.id)return 'Uppgiftens ansvarskoppling motsäger onboardingens ansvar.';
 if(task.responsibilityTransfers.length>=1000)return 'Uppgiften har nått gränsen för ansvarshistorik.';
 return '';
}
export function onboardingResponsibilityCandidates(st:State,customerId:string){
 const customer=st.customers.find(row=>row.id===customerId),onboarding=customer?.onboarding;
 const sourceProfile=onboarding?onboardingResponsibleProfile(st,onboarding):undefined;
 const eligible:Task[]=[],excluded:{task:Task;reason:string}[]=[];
 for(const task of st.tasks.filter(row=>row.customerId===customerId)){
  const reason=excludedReason(st,task,onboarding);if(reason)excluded.push({task,reason});else eligible.push(task);
 }
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!onboarding?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!customer)blockedReason='Kunden finns inte.';
 else if(!onboarding?.startedAt||!onboarding.dealId)blockedReason='Onboarding startar vid den första bekräftade ordern.';
 else if(onboarding.completedAt)blockedReason='Avslutad onboarding behåller sitt historiska ansvar.';
 else if(!st.deals.some(row=>row.id===onboarding.dealId&&row.customerId===customerId&&row.stage==='won')||!st.orders.some(row=>row.dealId===onboarding.dealId&&row.customerId===customerId))blockedReason='Onboardingens första affär eller order saknas. Granska kundens underlag.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan onboardingansvaret ändras.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==onboarding.owner)blockedReason='Nuvarande onboardingansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(onboarding.responsibilityTransfers.length>=1000)blockedReason='Onboarding har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för onboardingansvaret.';
 return {customer,onboarding,sourceProfile,targetProfiles,eligible,excluded,blockedReason};
}

// Freeze every displayed responsibility/task choice and the first-order
// identity. An unrelated note may rebase; a changed review may not.
export function onboardingResponsibilityBasis(st:State,customerId:string){
 const customer=st.customers.find(row=>row.id===customerId),dealId=customer?.onboarding.dealId,deal=st.deals.find(row=>row.id===dealId&&row.customerId===customerId);
 return recordBasis({
  customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,ownerProfileId:customer.ownerProfileId,status:customer.status,onboarding:customer.onboarding}:null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId})),
  tasks:st.tasks.filter(row=>row.customerId===customerId).sort((a,b)=>a.id.localeCompare(b.id)),
  deal:deal?{id:deal.id,customerId:deal.customerId,stage:deal.stage}:null,
  order:st.orders.filter(row=>row.dealId===dealId&&row.customerId===customerId).map(row=>({id:row.id,dealId:row.dealId,customerId:row.customerId})).sort((a,b)=>a.id.localeCompare(b.id))
 });
}

export function transferOnboardingResponsibility(st:State,input:OnboardingResponsibilityTransfer,actor:Actor){
 const parsed=OnboardingResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Onboardingansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===onboardingResponsibilityBasis(st,parsed.customerId),'Onboarding eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateOnboardingResponsibilityReferences(st);
 const candidates=onboardingResponsibilityCandidates(st,parsed.customerId),onboarding=candidates.onboarding,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(onboarding&&source,'Nuvarande onboardingansvar saknar en granskad säljarprofil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!onboarding!.ownerProfileId,'Onboarding har redan den valda ansvarskopplingen.');
 need(new Set(parsed.selectedTaskIds).size===parsed.selectedTaskIds.length,'Välj varje uppgift endast en gång.');
 const eligible=new Map(candidates.eligible.map(task=>[task.id,task]));
 need(parsed.selectedTaskIds.every(id=>eligible.has(id)),'En vald uppgift är avslutad, har ett annat ansvar eller hör till ett annat arbetsflöde.');
 const row=OnboardingResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),customerId:parsed.customerId,dealId:onboarding!.dealId,action:anchor?'anchor':'transfer',fromRecordedProfileId:onboarding!.ownerProfileId,
  fromProfileId:source!.id,toProfileId:target!.id,fromOwner:onboarding!.owner,toOwner:target!.legacyOwnerName,fromDisplayName:source!.displayName,toDisplayName:target!.displayName,
  selectedTaskIds:parsed.selectedTaskIds,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 onboarding!.owner=target!.legacyOwnerName;onboarding!.ownerProfileId=target!.id;onboarding!.responsibilityTransfers.push(row);
 for(const id of parsed.selectedTaskIds)eligible.get(id)!.owner=target!.legacyOwnerName;
 st.events.unshift({id:crypto.randomUUID(),customerId:parsed.customerId,dealId:row.dealId,kind:'onboarding_responsibility_transfer',at:row.at,text:(anchor?'Onboardingansvar förankrat: '+row.toDisplayName:'Onboardingansvar överfört: '+row.fromDisplayName+' → '+row.toDisplayName)+'\n'+row.selectedTaskIds.length+' valda öppna uppgifter granskades.\nOrsak: '+row.reason});
 // The caller records selected Task audits before validating the complete
 // bidirectional bundle. No partially recorded state is committed.
}

export function validateOnboardingResponsibilityReferences(st:State){
 const seen=new Set<string>(),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile])),tasks=new Map(st.tasks.map(task=>[task.id,task]));
 for(const customer of st.customers){
  const onboarding=customer.onboarding;
  need(!onboarding.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(onboarding.ownerProfileId)?.legacyOwnerName===onboarding.owner,'Onboardingens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  if(onboarding.ownerProfileId||onboarding.responsibilityTransfers.length)need(onboarding.startedAt&&onboarding.dealId&&st.deals.some(deal=>deal.id===onboarding.dealId&&deal.customerId===customer.id&&deal.stage==='won')&&st.orders.some(order=>order.dealId===onboarding.dealId&&order.customerId===customer.id),'Onboardingens ansvar har en bruten första affärs- eller orderkoppling.');
  let previous:OnboardingResponsibilityHistory|undefined;
  for(const raw of onboarding.responsibilityTransfers){
   const row=OnboardingResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Onboardinghistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.customerId===customer.id&&row.dealId===onboarding.dealId,'Onboardinghistoriken har en bruten kund- eller affärskoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Onboardinghistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Onboardinghistoriken har en ogiltig förankring eller överföring.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Onboardingens ändringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length,'Onboardinghistoriken har dubbla valda uppgifter.');
   for(const taskId of row.selectedTaskIds){
    const task=tasks.get(taskId),audits=task?.responsibilityTransfers.filter(history=>history.source==='onboarding'&&history.sourceTransferId===row.id)||[],audit=audits[0];
    need(task&&task.customerId===customer.id&&task.kind==='onboarding'&&!task.dealId&&audits.length===1&&audit.taskId===taskId&&audit.customerId===customer.id&&!audit.dealId&&audit.action===row.action&&audit.fromProfileId===row.fromProfileId&&audit.toProfileId===row.toProfileId&&audit.fromOwner===row.fromOwner&&audit.toOwner===row.toOwner&&audit.fromDisplayName===row.fromDisplayName&&audit.toDisplayName===row.toDisplayName&&audit.reason===row.reason&&audit.at===row.at&&audit.byId===row.byId&&audit.byMemberId===row.byMemberId&&audit.byName===row.byName,'Onboardinghistoriken saknar en motsvarande granskad uppgift eller motsäger uppgiftens ansvarshistorik.');
   }
   previous=row;
  }
  need(!previous||onboarding.owner===previous.toOwner&&onboarding.ownerProfileId===previous.toProfileId,'Nuvarande onboardingansvar motsäger den senaste granskade ändringen.');
 }
}
