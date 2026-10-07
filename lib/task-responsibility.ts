import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Settings,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const profileId=z.string().uuid();
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
const recordedProfileId=z.union([z.literal(''),profileId]);
export const TaskResponsibilityHistorySchema=z.object({
 id:profileId,taskId:recordId,customerId:recordId,dealId:z.string().trim().max(100),
 source:z.enum(['task','customer','deal','order','onboarding','customer_issue']),sourceTransferId:recordedProfileId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const TaskResponsibilityTransferSchema=z.object({
 taskId:recordId,targetProfileId:profileId,reason:required,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type TaskResponsibilityTransfer=z.infer<typeof TaskResponsibilityTransferSchema>;
export type TaskResponsibilityHistory=z.infer<typeof TaskResponsibilityHistorySchema>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
type Responsibility=Pick<Task,'owner'|'ownerProfileId'>;
const independentKinds=new Set(['manual','care','meeting_followup']);
const commercialKinds={deal:new Set(['discovery','quote','proof_deadline','order_deadline',...independentKinds]),order:new Set(['handover','proof_deadline','order_deadline','receipt','invoice_ready',...independentKinds])};

function matchingProfileId(settings:Settings,owner:string,id:string|undefined){
 if(!settings.sellerProfilesInitialized||!id||!profileId.safeParse(id).success)return '';
 return sellerProfileById(settings,id)?.legacyOwnerName===owner?id:'';
}

// An explicit ID is authoritative. Alias lookup is only the display fallback
// for a legacy blank; reading a label never anchors the stored task.
export function taskResponsibleProfile(st:State,task:Responsibility){
 const settings=st.settings;
 if(!settings.sellerProfilesInitialized)return undefined;
 if(task.ownerProfileId){
  const profile=sellerProfileById(settings,task.ownerProfileId);
  return profile?.legacyOwnerName===task.owner?profile:undefined;
 }
 return sellerProfileForOwner(settings,task.owner);
}
export function taskOwnerLabel(st:State,task:Responsibility){
 const profile=taskResponsibleProfile(st,task);
 if(!profile)return task.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

// A new generic form can choose an owner, but cannot supply stable IDs or audit.
// A legacy task's ordinary edit/completion is deliberately not a migration.
export function protectTaskResponsibility(oldTask:Task|undefined,nextTask:Task,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(Object.prototype.hasOwnProperty.call(supplied,'ownerProfileId')){
  need(nextTask.ownerProfileId===(oldTask?.ownerProfileId||''),'Aktivitetens ansvarsprofil väljs av systemet och får inte ändras i formuläret.');
 }
 if(Object.prototype.hasOwnProperty.call(supplied,'responsibilityTransfers')){
  need(recordBasis(nextTask.responsibilityTransfers)===recordBasis(oldTask?.responsibilityTransfers||[]),'Uppgiftens ansvarshistorik skapas av systemet och får inte ändras i formuläret.');
 }
 nextTask.responsibilityTransfers=structuredClone(oldTask?.responsibilityTransfers||[]);
 if(oldTask){
  need(!settings.sellerProfilesInitialized||nextTask.owner===oldTask.owner,'Använd Byt uppgiftsansvar för en granskad överföring. Affärs-, order- och kundflöden behåller sina egna överlämningar.');
  if((oldTask.responsibilityTransfers||[]).length)need(nextTask.customerId===oldTask.customerId&&nextTask.dealId===oldTask.dealId&&nextTask.kind===oldTask.kind,'En uppgift med ansvarshistorik får inte kopplas om till en annan kund, affär eller typ.');
 }
 if(oldTask&&nextTask.owner===oldTask.owner){
  nextTask.ownerProfileId=oldTask.ownerProfileId||'';
  return;
 }
 need(settings.owners.includes(nextTask.owner),'Välj en ansvarig från teamet.');
 const profile=settings.sellerProfilesInitialized?sellerProfileForOwner(settings,nextTask.owner):undefined;
 need(!settings.sellerProfilesInitialized||profile?.active,'Välj en aktiv, granskad säljarprofil för aktivitetens nya ansvar.');
 nextTask.ownerProfileId=profile?.id||'';
}

export function taskResponsibilityCandidates(st:State,taskId:string){
 const task=st.tasks.find(row=>row.id===taskId),customer=task?st.customers.find(row=>row.id===task.customerId):undefined;
 const sourceProfile=task?taskResponsibleProfile(st,task):undefined;
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!task?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!task)blockedReason='Uppgiften finns inte.';
 else if(task.done)blockedReason='Avslutad uppgift behåller sitt historiska ansvar.';
 else if(task.dealId)blockedReason='Uppgiften hör till en affär eller order. Granska ansvaret i dess överlämning.';
 else if(!independentKinds.has(task.kind))blockedReason='Uppgiftens ansvar styrs av ett särskilt kund-, affärs- eller orderflöde.';
 else if(!customer)blockedReason='Kundkopplingen saknas. Granska uppgiften innan ansvaret ändras.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan uppgiftsansvaret ändras.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==task.owner)blockedReason='Nuvarande ansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(task.responsibilityTransfers.length>=1000)blockedReason='Uppgiften har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för uppgiftsansvaret.';
 return {task,customer,sourceProfile,targetProfiles,blockedReason};
}

// Freeze the displayed task, customer identity and every reviewed profile
// choice. An unrelated note may rebase, but a changed preview needs review.
export function taskResponsibilityBasis(st:State,taskId:string){
 const task=st.tasks.find(row=>row.id===taskId),customer=task?st.customers.find(row=>row.id===task.customerId):undefined;
 return recordBasis({
  task:task||null,customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,ownerProfileId:customer.ownerProfileId,status:customer.status}:null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId}))
 });
}

export function transferTaskResponsibility(st:State,input:TaskResponsibilityTransfer,actor:Actor){
 const parsed=TaskResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Uppgiftsansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===taskResponsibilityBasis(st,parsed.taskId),'Uppgiftsansvaret eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateTaskResponsibilityReferences(st);
 const candidates=taskResponsibilityCandidates(st,parsed.taskId),task=candidates.task,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(task&&source,'Nuvarande uppgiftsansvar saknar en granskad säljarprofil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!task!.ownerProfileId,'Uppgiften har redan den valda ansvarskopplingen.');
 const row=TaskResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),taskId:task!.id,customerId:task!.customerId,dealId:task!.dealId,source:'task',sourceTransferId:'',action:anchor?'anchor':'transfer',
  fromRecordedProfileId:task!.ownerProfileId,fromProfileId:source!.id,toProfileId:target!.id,
  fromOwner:task!.owner,toOwner:target!.legacyOwnerName,fromDisplayName:source!.displayName,toDisplayName:target!.displayName,
  reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 task!.owner=target!.legacyOwnerName;task!.ownerProfileId=target!.id;task!.responsibilityTransfers.push(row);
 st.events.unshift({id:crypto.randomUUID(),customerId:task!.customerId,dealId:task!.dealId,kind:'task_responsibility_transfer',at:row.at,text:(anchor?'Uppgiftsansvar förankrat: '+row.toDisplayName:'Uppgiftsansvar överfört: '+row.fromDisplayName+' → '+row.toDisplayName)+'\nUppgift: '+task!.title+'\nOrsak: '+row.reason});
 validateTaskResponsibilityReferences(st);
}

// Selected tasks keep their own chain when an existing customer/commercial
// bundle moves them. The actual parent audit supplies the immutable source.
export function recordTaskBundleTransfers(previousState:State,nextState:State,source:'customer'|'deal'|'order'|'onboarding'|'customer_issue',sourceTransferId:string){
 const parent=source==='customer_issue'?nextState.customers.flatMap(row=>row.plan.issueResponsibilityTransfers).find(row=>row.id===sourceTransferId):source==='onboarding'?nextState.customers.flatMap(row=>row.onboarding.responsibilityTransfers).find(row=>row.id===sourceTransferId):source==='customer'?nextState.customers.flatMap(row=>row.responsibilityTransfers).find(row=>row.id===sourceTransferId):[...nextState.deals,...nextState.orders].flatMap(row=>row.responsibilityTransfers).find(row=>row.id===sourceTransferId);
 need(parent,'Den granskade överlämningens ansvarshistorik saknas.');
 for(const taskId of parent!.selectedTaskIds){
  const old=previousState.tasks.find(row=>row.id===taskId),task=nextState.tasks.find(row=>row.id===taskId),from=old?taskResponsibleProfile(previousState,old):undefined,to=sellerProfileById(nextState.settings,parent!.toProfileId);
  need(old&&task&&from&&to&&old.owner===parent!.fromOwner&&from.id===parent!.fromProfileId,'Uppgiftens ursprungliga ansvar motsäger den granskade överlämningen.');
  need((old!.responsibilityTransfers||[]).length<1000,'En vald uppgift har nått gränsen för ansvarshistorik. Granska överlämningen utan den uppgiften.');
  const displayParent=parent as typeof parent&{fromDisplayName?:string;toDisplayName?:string};
  const row=TaskResponsibilityHistorySchema.parse({
   id:crypto.randomUUID(),taskId:task!.id,customerId:task!.customerId,dealId:task!.dealId,source,sourceTransferId:parent!.id,action:(source==='onboarding'||source==='customer_issue')&&parent!.fromProfileId===parent!.toProfileId?'anchor':'transfer',
   fromRecordedProfileId:old!.ownerProfileId||'',fromProfileId:parent!.fromProfileId,toProfileId:parent!.toProfileId,
   fromOwner:parent!.fromOwner,toOwner:parent!.toOwner,fromDisplayName:displayParent.fromDisplayName||from!.displayName,toDisplayName:displayParent.toDisplayName||to!.displayName,
   reason:parent!.reason,at:parent!.at,byId:parent!.byId,byMemberId:parent!.byMemberId,byName:parent!.byName
  });
  task!.ownerProfileId=to!.id;task!.responsibilityTransfers.push(row);
 }
}

function derivedTaskProfileId(st:State,task:Task){
 // New issue work copies the exact recorded issue identity, including a legacy
 // blank. The customer, order and alias must never fill that blank.
 if(task.kind==='csm_issue'&&!task.dealId){
  const plan=st.customers.find(row=>row.id===task.customerId)?.plan;
  need(plan?.issueStatus==='open'&&task.owner===plan.issueOwner,'En ny ärendeuppgift måste följa det öppna kundärendets ansvar.');
  return plan!.issueOwnerProfileId;
 }
 // catalog_order delegates to the deal workflow and then derives new tasks
 // again in its outer action. A started onboarding remains authoritative in
 // both passes, including a deliberately unanchored legacy blank.
 const onboarding=task.kind==='onboarding'&&!task.dealId?st.customers.find(row=>row.id===task.customerId)?.onboarding:undefined;
 if(onboarding?.startedAt&&onboarding.owner===task.owner)return onboarding.ownerProfileId;
 // A new follow-up may copy the exact responsibility of its completed task.
 const copied=matchingProfileId(st.settings,task.owner,task.ownerProfileId);
 if(copied)return copied;
 const order=task.dealId?st.orders.find(row=>row.dealId===task.dealId&&row.customerId===task.customerId&&row.owner===task.owner):undefined;
 const deal=task.dealId?st.deals.find(row=>row.id===task.dealId&&row.customerId===task.customerId&&row.owner===task.owner):undefined;
 const customer=st.customers.find(row=>row.id===task.customerId&&row.owner===task.owner);
 for(const source of [order,deal,customer]){
  const id=matchingProfileId(st.settings,task.owner,source?.ownerProfileId);
  if(id)return id;
 }
 // Existing operational work may still belong to an inactive or unmapped
 // legacy owner. Recording dispatch/receipt/invoicing must remain possible;
 // this derives a new task, never reactivates a person or changes old history.
 return st.settings.sellerProfilesInitialized?sellerProfileForOwner(st.settings,task.owner)?.id||'':'';
}

export function assignTaskResponsibilities(previousState:State,nextState:State,exactNewMeetingOwners?:ReadonlyMap<string,string>,exactNewOnboardingOwners?:ReadonlyMap<string,string>){
 const previous=new Map(previousState.tasks.map(task=>[task.id,task]));
 // Only these server-created tasks copy an exact recorded source ID,
 // including a blank. Other generators retain their derivation rules.
 for(const [taskId,ownerId] of exactNewMeetingOwners||[]){
  const task=nextState.tasks.find(row=>row.id===taskId);
  need(!previous.has(taskId)&&task&&task.kind==='meeting_followup'&&!task.dealId&&(ownerId===''||matchingProfileId(nextState.settings,task.owner,ownerId)),'Mötets exakta uppgiftsansvar får bara kopieras till en ny mötesuppföljning.');
 }
 for(const [taskId,ownerId] of exactNewOnboardingOwners||[]){
  const task=nextState.tasks.find(row=>row.id===taskId),customer=task?nextState.customers.find(row=>row.id===task.customerId):undefined;
  need(!previous.has(taskId)&&task&&task.kind==='onboarding'&&!task.dealId&&customer?.onboarding.startedAt&&task.owner===customer.onboarding.owner&&ownerId===customer.onboarding.ownerProfileId&&(ownerId===''||matchingProfileId(nextState.settings,task.owner,ownerId)),'Onboardingens exakta uppgiftsansvar får bara kopieras till en ny onboardinguppgift.');
 }
 for(const task of nextState.tasks){
  const old=previous.get(task.id);
  const oldHistory=old?.responsibilityTransfers||[],audited=!!old&&task.responsibilityTransfers.length>oldHistory.length;
  if(old)need(task.responsibilityTransfers.length>=oldHistory.length&&recordBasis(task.responsibilityTransfers.slice(0,oldHistory.length))===recordBasis(oldHistory),'Uppgiftens tidigare ansvarshistorik får inte skrivas om.');
  else need(!task.responsibilityTransfers.length,'En ny uppgift får inte ärva en annan uppgifts ansvarshistorik.');
  if(!audited){
   need(!old||!oldHistory.length||old.owner===task.owner,'Uppgiftens granskade ansvar måste överföras i dess överlämning.');
   task.ownerProfileId=exactNewMeetingOwners?.has(task.id)?exactNewMeetingOwners.get(task.id)!:exactNewOnboardingOwners?.has(task.id)?exactNewOnboardingOwners.get(task.id)!:old&&old.owner===task.owner?old.ownerProfileId||'':derivedTaskProfileId(nextState,task);
  }
 }
 validateTaskResponsibilityReferences(nextState);
 return nextState;
}

export function validateTaskResponsibilityReferences(st:State){
 const seen=new Set<string>(),customers=new Set(st.customers.map(row=>row.id)),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile]));
 for(const task of st.tasks){
  const id=task.ownerProfileId;
  need(!id||matchingProfileId(st.settings,task.owner,id),'Aktivitetens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:TaskResponsibilityHistory|undefined;
  for(const raw of task.responsibilityTransfers){
   const row=TaskResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Uppgiftshistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.taskId===task.id&&row.customerId===task.customerId&&row.dealId===task.dealId&&customers.has(row.customerId),'Uppgiftshistoriken har en bruten uppgifts- eller kundkoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Uppgiftshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   // An onboarding anchor can review a task whose matching ID was already
   // recorded. Its unchanged recorded ID remains explicit in the audit; the
   // ordinary standalone-task anchor still requires a previously blank ID.
   need(row.action==='anchor'?(row.source==='task'&&!row.fromRecordedProfileId||row.source==='onboarding'||row.source==='customer_issue')&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Uppgiftshistoriken har en ogiltig förankring eller överföring.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Uppgiftens överföringar bildar inte en sammanhängande ansvarskedja.');
   if(row.source==='task'){
    need(!row.sourceTransferId&&!row.dealId&&independentKinds.has(task.kind),'En fristående uppgiftsöverföring har en felaktig arbetsflödeskoppling.');
   }else{
    const parent=row.source==='customer_issue'?st.customers.find(customer=>customer.id===row.customerId)?.plan.issueResponsibilityTransfers.find(history=>history.id===row.sourceTransferId):row.source==='onboarding'?st.customers.find(customer=>customer.id===row.customerId)?.onboarding.responsibilityTransfers.find(history=>history.id===row.sourceTransferId):row.source==='customer'?st.customers.find(customer=>customer.id===row.customerId)?.responsibilityTransfers.find(history=>history.id===row.sourceTransferId):(row.source==='deal'?st.deals:st.orders).flatMap(target=>target.responsibilityTransfers).find(history=>history.id===row.sourceTransferId);
    need(parent&&parent.customerId===row.customerId&&parent.selectedTaskIds.includes(row.taskId)&&parent.fromProfileId===row.fromProfileId&&parent.toProfileId===row.toProfileId&&parent.fromOwner===row.fromOwner&&parent.toOwner===row.toOwner&&parent.reason===row.reason&&parent.at===row.at&&parent.byId===row.byId&&parent.byMemberId===row.byMemberId&&parent.byName===row.byName,'Uppgiftshistoriken motsäger den granskade kund-, affärs- eller orderöverlämningen.');
    if(row.source==='customer')need(!row.dealId&&independentKinds.has(task.kind),'Kundöverlämningen innehåller en affärskopplad eller skyddad uppgift.');
    else if(row.source==='customer_issue'){
     const issue=parent as NonNullable<typeof parent>&{action?:string;fromDisplayName?:string;toDisplayName?:string};
     need(!row.dealId&&task.kind==='csm_issue'&&issue.action===row.action&&issue.fromDisplayName===row.fromDisplayName&&issue.toDisplayName===row.toDisplayName,'Uppgiftshistoriken har en bruten ärendeöverlämning.');
    }
    else if(row.source==='onboarding'){
     const onboarding=parent as NonNullable<typeof parent>&{action?:string;dealId?:string;fromDisplayName?:string;toDisplayName?:string};
     need(!row.dealId&&task.kind==='onboarding'&&onboarding.dealId===st.customers.find(customer=>customer.id===row.customerId)?.onboarding.dealId&&onboarding.action===row.action&&onboarding.fromDisplayName===row.fromDisplayName&&onboarding.toDisplayName===row.toDisplayName,'Uppgiftshistoriken har en bruten onboardingöverlämning.');
    }else{
     const commercial=parent as NonNullable<typeof parent>&{targetType?:string;dealId?:string;fromDisplayName?:string;toDisplayName?:string};
     need(commercial.targetType===row.source&&commercial.dealId===row.dealId&&commercial.fromDisplayName===row.fromDisplayName&&commercial.toDisplayName===row.toDisplayName&&commercialKinds[row.source].has(task.kind),'Uppgiftshistoriken har en bruten kommersiell överlämningskoppling.');
    }
   }
   previous=row;
  }
  need(!previous||task.owner===previous.toOwner&&task.ownerProfileId===previous.toProfileId,'Nuvarande uppgiftsansvar motsäger den senaste granskade ändringen.');
 }
}
