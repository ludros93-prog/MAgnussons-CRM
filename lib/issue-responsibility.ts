import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Customer,Settings,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {taskResponsibleProfile} from './task-responsibility';
import {recordBasis} from './record-conflicts';

const profileId=z.string().uuid(),recordedProfileId=z.union([z.literal(''),profileId]);
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const IssueResponsibilityHistorySchema=z.object({
 id:profileId,customerId:recordId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 selectedTaskIds:z.array(recordId).max(500),reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const IssueResponsibilityTransferSchema=z.object({
 customerId:recordId,targetProfileId:profileId,selectedTaskIds:z.array(recordId).max(500).default([]),
 reason:required,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type IssueResponsibilityHistory=z.infer<typeof IssueResponsibilityHistorySchema>;
export type IssueResponsibilityTransfer=z.infer<typeof IssueResponsibilityTransferSchema>;
type Plan=Customer['plan'];
type Responsibility=Pick<Plan,'issueOwner'|'issueOwnerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Alias lookup displays a legacy blank without anchoring its stored identity.
export function issueResponsibleProfile(st:State,plan:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(plan.issueOwnerProfileId){
  const profile=sellerProfileById(st.settings,plan.issueOwnerProfileId);
  return profile?.legacyOwnerName===plan.issueOwner?profile:undefined;
 }
 return sellerProfileForOwner(st.settings,plan.issueOwner);
}
export function issueOwnerLabel(st:State,plan:Responsibility){
 const profile=issueResponsibleProfile(st,plan);
 if(!profile)return plan.issueOwner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

export const isIssueResponsibilityUnassigned=(plan:Pick<Plan,'issueOwner'|'issueOwnerProfileId'|'issueResponsibilityTransfers'>)=>!plan.issueOwner&&!plan.issueOwnerProfileId&&!plan.issueResponsibilityTransfers.length;

export function protectIssueResponsibility(old:Plan,next:Plan,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const has=(key:string)=>Object.prototype.hasOwnProperty.call(supplied,key);
 if(!has('issueOwner'))next.issueOwner=old.issueOwner;
 if(has('issueResponsibilityTransfers'))need(recordBasis(next.issueResponsibilityTransfers)===recordBasis(old.issueResponsibilityTransfers),'Kundärendets ansvarshistorik skapas av systemet och får inte ändras i kundplanen.');
 next.issueResponsibilityTransfers=structuredClone(old.issueResponsibilityTransfers);
 // The mutable issue slot keeps responsibility on resolution and reopening.
 // With no previously recorded owner, ID or audit, this is its first explicit
 // responsibility even if an older status or description was already saved.
 const initial=isIssueResponsibilityUnassigned(old);
 if(initial&&next.issueStatus==='open'){
  if(settings.sellerProfilesInitialized){
   const selected=has('issueOwnerProfileId')?sellerProfileById(settings,next.issueOwnerProfileId):undefined;
   need(selected?.active&&settings.owners.includes(selected.legacyOwnerName)&&selected.legacyOwnerName===next.issueOwner,'Välj uttryckligen en aktiv, granskad säljarprofil för det nya kundärendet.');
   next.issueOwnerProfileId=selected!.id;
  }else{
   need(!next.issueOwnerProfileId,'Kundärendets ansvarsprofil väljs först när säljarprofilerna är granskade.');
   need(settings.owners.includes(next.issueOwner),'Välj en ansvarig från teamet.');next.issueOwnerProfileId='';
  }
  return;
 }
 if(has('issueOwnerProfileId'))need(next.issueOwnerProfileId===old.issueOwnerProfileId,'Kundärendets ansvarsprofil ändras bara i en granskad överlämning.');
 need(!settings.sellerProfilesInitialized||next.issueOwner===old.issueOwner,'Använd Byt ärendeansvar för en granskad överlämning.');
 if(next.issueOwner!==old.issueOwner)need(!next.issueOwner||settings.owners.includes(next.issueOwner),'Välj en ansvarig från teamet.');
 next.issueOwnerProfileId=old.issueOwnerProfileId;
}

function excludedReason(st:State,task:Task,plan:Plan|undefined){
 if(task.done)return 'Avslutad uppgift behåller sitt historiska ansvar.';
 if(task.kind!=='csm_issue')return 'Uppgiften hör till ett annat arbetsflöde.';
 if(task.dealId)return 'Affärs- och orderkopplade uppgifter har egna överlämningar.';
 if(task.owner!==plan?.issueOwner)return 'En annan ansvarig har uppgiften.';
 const source=plan?issueResponsibleProfile(st,plan):undefined,taskProfile=taskResponsibleProfile(st,task);
 if(!source||!taskProfile||taskProfile.id!==source.id)return 'Uppgiftens ansvarskoppling motsäger kundärendets ansvar.';
 if(task.responsibilityTransfers.length>=1000)return 'Uppgiften har nått gränsen för ansvarshistorik.';
 return '';
}
export function issueResponsibilityCandidates(st:State,customerId:string){
 const customer=st.customers.find(row=>row.id===customerId),plan=customer?.plan;
 const sourceProfile=plan?issueResponsibleProfile(st,plan):undefined;
 const eligible:Task[]=[],excluded:{task:Task;reason:string}[]=[];
 for(const task of st.tasks.filter(row=>row.customerId===customerId)){
  const reason=excludedReason(st,task,plan);if(reason)excluded.push({task,reason});else eligible.push(task);
 }
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!plan?.issueOwnerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!customer)blockedReason='Kunden finns inte.';
 else if(plan?.issueStatus!=='open')blockedReason='Bara ett öppet kundärende kan byta ansvar.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan ärendeansvaret ändras.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==plan.issueOwner)blockedReason='Nuvarande ärendeansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(plan.issueResponsibilityTransfers.length>=1000)blockedReason='Kundärendet har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för ärendeansvaret.';
 return {customer,plan,sourceProfile,targetProfiles,eligible,excluded,blockedReason};
}

// Freeze the complete plan and every displayed task/profile choice. An
// unrelated note may rebase; any changed plan requires a new review.
export function issueResponsibilityBasis(st:State,customerId:string){
 const customer=st.customers.find(row=>row.id===customerId);
 return recordBasis({
  customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,ownerProfileId:customer.ownerProfileId,status:customer.status,plan:customer.plan,nextReview:customer.nextReview,expectedOrder:customer.expectedOrder,reviewDays:customer.reviewDays}:null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId})),
  tasks:st.tasks.filter(row=>row.customerId===customerId).sort((a,b)=>a.id.localeCompare(b.id))
 });
}

export function transferIssueResponsibility(st:State,input:IssueResponsibilityTransfer,actor:Actor){
 const parsed=IssueResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Kundärendets ansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===issueResponsibilityBasis(st,parsed.customerId),'Kundplanen eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateIssueResponsibilityReferences(st);
 const candidates=issueResponsibilityCandidates(st,parsed.customerId),plan=candidates.plan,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(plan&&source,'Nuvarande ärendeansvar saknar en granskad säljarprofil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!plan!.issueOwnerProfileId,'Kundärendet har redan den valda ansvarskopplingen.');
 need(new Set(parsed.selectedTaskIds).size===parsed.selectedTaskIds.length,'Välj varje uppgift endast en gång.');
 const eligible=new Map(candidates.eligible.map(task=>[task.id,task]));
 need(parsed.selectedTaskIds.every(id=>eligible.has(id)),'En vald uppgift är avslutad, har ett annat ansvar eller hör till ett annat arbetsflöde.');
 const row=IssueResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),customerId:parsed.customerId,action:anchor?'anchor':'transfer',fromRecordedProfileId:plan!.issueOwnerProfileId,
  fromProfileId:source!.id,toProfileId:target!.id,fromOwner:plan!.issueOwner,toOwner:target!.legacyOwnerName,fromDisplayName:source!.displayName,toDisplayName:target!.displayName,
  selectedTaskIds:parsed.selectedTaskIds,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 plan!.issueOwner=target!.legacyOwnerName;plan!.issueOwnerProfileId=target!.id;plan!.issueResponsibilityTransfers.push(row);
 for(const id of parsed.selectedTaskIds)eligible.get(id)!.owner=target!.legacyOwnerName;
 st.events.unshift({id:crypto.randomUUID(),customerId:parsed.customerId,dealId:'',kind:'issue_responsibility_transfer',at:row.at,text:(anchor?'Ärendeansvar förankrat: '+row.toDisplayName:'Ärendeansvar överfört: '+row.fromDisplayName+' → '+row.toDisplayName)+'\n'+row.selectedTaskIds.length+' valda öppna uppgifter granskades.\nOrsak: '+row.reason});
 // The caller records selected task audits before validating the complete
 // bidirectional bundle. A partial bundle is never committed.
}

export function validateIssueResponsibilityReferences(st:State){
 const seen=new Set<string>(),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile])),tasks=new Map(st.tasks.map(task=>[task.id,task]));
 for(const customer of st.customers){
  const plan=customer.plan;
  need(!plan.issueOwnerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(plan.issueOwnerProfileId)?.legacyOwnerName===plan.issueOwner,'Kundärendets stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:IssueResponsibilityHistory|undefined;
  for(const raw of plan.issueResponsibilityTransfers){
   const row=IssueResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Ärendehistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.customerId===customer.id,'Ärendehistoriken har en bruten kundkoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Ärendehistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Ärendehistoriken har en ogiltig förankring eller överföring.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Kundärendets ändringar bildar inte en sammanhängande ansvarskedja.');
   need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length,'Ärendehistoriken har dubbla valda uppgifter.');
   for(const taskId of row.selectedTaskIds){
    const task=tasks.get(taskId),audits=task?.responsibilityTransfers.filter(history=>history.source==='customer_issue'&&history.sourceTransferId===row.id)||[],audit=audits[0];
    need(task&&task.customerId===customer.id&&task.kind==='csm_issue'&&!task.dealId&&audits.length===1&&audit.taskId===taskId&&audit.customerId===customer.id&&!audit.dealId&&audit.action===row.action&&audit.fromProfileId===row.fromProfileId&&audit.toProfileId===row.toProfileId&&audit.fromOwner===row.fromOwner&&audit.toOwner===row.toOwner&&audit.fromDisplayName===row.fromDisplayName&&audit.toDisplayName===row.toDisplayName&&audit.reason===row.reason&&audit.at===row.at&&audit.byId===row.byId&&audit.byMemberId===row.byMemberId&&audit.byName===row.byName,'Ärendehistoriken saknar en motsvarande granskad uppgift eller motsäger uppgiftens ansvarshistorik.');
   }
   previous=row;
  }
  need(!previous||plan.issueOwner===previous.toOwner&&plan.issueOwnerProfileId===previous.toProfileId,'Nuvarande ärendeansvar motsäger den senaste granskade ändringen.');
 }
}
