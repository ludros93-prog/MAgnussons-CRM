import {RuleError} from './crm-errors';
import type {Actor,Settings,State,Task} from './crm';
import type {Need} from './business';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {taskResponsibleProfile} from './task-responsibility';
import {recordBasis} from './record-conflicts';

import {YearwheelResponsibilityHistorySchema,YearwheelResponsibilityTransferSchema,type YearwheelResponsibilityHistory,type YearwheelResponsibilityTransfer} from './yearwheel-responsibility-schema';
export {YearwheelResponsibilityHistorySchema,YearwheelResponsibilityTransferSchema,type YearwheelResponsibilityHistory,type YearwheelResponsibilityTransfer} from './yearwheel-responsibility-schema';
type Responsibility=Pick<Need,'owner'|'ownerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Alias lookup displays a legacy blank without anchoring its stored identity.
export function yearwheelResponsibleProfile(st:State,yearNeed:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(yearNeed.ownerProfileId){
  const profile=sellerProfileById(st.settings,yearNeed.ownerProfileId);
  return profile?.legacyOwnerName===yearNeed.owner?profile:undefined;
 }
 return sellerProfileForOwner(st.settings,yearNeed.owner);
}
export function yearwheelOwnerLabel(st:State,yearNeed:Responsibility){
 const profile=yearwheelResponsibleProfile(st,yearNeed);
 if(!profile)return yearNeed.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

export const isYearwheelResponsibilityUnassigned=(yearNeed:Pick<Need,'ownerProfileId'|'responsibilityTransfers'>)=>!yearNeed.ownerProfileId&&!yearNeed.responsibilityTransfers.length;

export function protectYearwheelResponsibility(old:Need|undefined,next:Need,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const has=(key:string)=>Object.prototype.hasOwnProperty.call(supplied,key);
 if(old&&!has('owner'))next.owner=old.owner;
 if(has('responsibilityTransfers'))need(recordBasis(next.responsibilityTransfers)===recordBasis(old?.responsibilityTransfers||[]),'Årshjulets ansvarshistorik skapas av systemet och får inte ändras i formuläret.');
 next.responsibilityTransfers=structuredClone(old?.responsibilityTransfers||[]);
 if(!old){
  if(settings.sellerProfilesInitialized){
   const selected=has('ownerProfileId')?sellerProfileById(settings,next.ownerProfileId):undefined;
   need(selected?.active&&settings.owners.includes(selected.legacyOwnerName)&&selected.legacyOwnerName===next.owner,'Välj uttryckligen en aktiv, granskad säljarprofil för det nya inköpsbehovet.');
   next.ownerProfileId=selected!.id;
  }else{
   need(!next.ownerProfileId,'Årshjulets ansvarsprofil väljs först när säljarprofilerna är granskade.');
   need(settings.owners.includes(next.owner),'Välj en ansvarig från teamet.');next.ownerProfileId='';
  }
  return;
 }
 if(has('ownerProfileId'))need(next.ownerProfileId===old.ownerProfileId,'Årshjulets ansvarsprofil ändras bara i en granskad överlämning.');
 need(!settings.sellerProfilesInitialized||next.owner===old.owner,'Använd Byt behovsansvar för en granskad överlämning.');
 if(next.owner!==old.owner)need(settings.owners.includes(next.owner),'Välj en ansvarig från teamet.');
 next.ownerProfileId=old.ownerProfileId;
}

function excludedReason(st:State,task:Task,yearNeed:Need|undefined){
 if(task.done)return 'Avslutad uppgift behåller sitt historiska ansvar.';
 if(task.kind!=='year:'+yearNeed?.id)return 'Uppgiften hör till ett annat inköpsbehov eller arbetsflöde.';
 if(task.dealId)return 'Affärs- och orderkopplade uppgifter har egna överlämningar.';
 if(task.owner!==yearNeed?.owner)return 'En annan ansvarig har uppgiften.';
 const source=yearNeed?yearwheelResponsibleProfile(st,yearNeed):undefined,taskProfile=taskResponsibleProfile(st,task);
 if(!source||!taskProfile||taskProfile.id!==source.id)return 'Uppgiftens ansvarskoppling motsäger inköpsbehovets ansvar.';
 if(task.responsibilityTransfers.length>=1000)return 'Uppgiften har nått gränsen för ansvarshistorik.';
 return '';
}
export function yearwheelResponsibilityCandidates(st:State,customerId:string,needId:string){
 const customer=st.customers.find(row=>row.id===customerId),yearNeed=customer?.yearNeeds.find(row=>row.id===needId);
 const sourceProfile=yearNeed?yearwheelResponsibleProfile(st,yearNeed):undefined;
 const eligible:Task[]=[],excluded:{task:Task;reason:string}[]=[];
 for(const task of st.tasks.filter(row=>row.customerId===customerId)){
  const reason=excludedReason(st,task,yearNeed);if(reason)excluded.push({task,reason});else eligible.push(task);
 }
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!yearNeed?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!customer)blockedReason='Kunden finns inte.';
 else if(!yearNeed)blockedReason='Inköpsbehovet finns inte.';
 else if(yearNeed.status!=='planned')blockedReason='Bara ett planerat inköpsbehov kan byta ansvar.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan behovsansvaret ändras.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==yearNeed.owner)blockedReason='Nuvarande behovsansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(yearNeed.responsibilityTransfers.length>=1000)blockedReason='Inköpsbehovet har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för behovsansvaret.';
 return {customer,need:yearNeed,sourceProfile,targetProfiles,eligible,excluded,blockedReason};
}
export function yearNeedEditContext(st:State,customerId:string,needId:string){
 const customer=st.customers.find(row=>row.id===customerId);
 return {
  customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,ownerProfileId:customer.ownerProfileId,status:customer.status}:null,
  need:customer?.yearNeeds.find(row=>row.id===needId)||null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId}))
 };
}
export type YearNeedEditContext=ReturnType<typeof yearNeedEditContext>;
// Ordinary edits freeze the selected need and owner choices, independently of
// unrelated activities. Reading fresh global data never adopts this basis.
export function yearNeedEditBasis(st:State,customerId:string,needId:string){return recordBasis(yearNeedEditContext(st,customerId,needId));}
// The reviewed handover additionally freezes every displayed task choice.
export function yearwheelResponsibilityContext(st:State,customerId:string,needId:string){
 return {...yearNeedEditContext(st,customerId,needId),tasks:st.tasks.filter(row=>row.customerId===customerId).sort((a,b)=>a.id.localeCompare(b.id))};
}
export function yearwheelResponsibilityBasis(st:State,customerId:string,needId:string){
 return recordBasis(yearwheelResponsibilityContext(st,customerId,needId));
}

export function transferYearwheelResponsibility(st:State,input:YearwheelResponsibilityTransfer,actor:Actor){
 const parsed=YearwheelResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Årshjulets ansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===yearwheelResponsibilityBasis(st,parsed.customerId,parsed.needId),'Inköpsbehovet eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateYearwheelResponsibilityReferences(st);
 const candidates=yearwheelResponsibilityCandidates(st,parsed.customerId,parsed.needId),yearNeed=candidates.need,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(yearNeed&&source,'Nuvarande behovsansvar saknar en granskad säljarprofil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!yearNeed!.ownerProfileId,'Inköpsbehovet har redan den valda ansvarskopplingen.');
 need(new Set(parsed.selectedTaskIds).size===parsed.selectedTaskIds.length,'Välj varje uppgift endast en gång.');
 const eligible=new Map(candidates.eligible.map(task=>[task.id,task]));
 need(parsed.selectedTaskIds.every(id=>eligible.has(id)),'En vald uppgift är avslutad, har ett annat ansvar eller hör till ett annat arbetsflöde.');
 const row=YearwheelResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),customerId:parsed.customerId,needId:parsed.needId,action:anchor?'anchor':'transfer',fromRecordedProfileId:yearNeed!.ownerProfileId,
  fromProfileId:source!.id,toProfileId:target!.id,fromOwner:yearNeed!.owner,toOwner:target!.legacyOwnerName,fromDisplayName:source!.displayName,toDisplayName:target!.displayName,
  selectedTaskIds:parsed.selectedTaskIds,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 yearNeed!.owner=target!.legacyOwnerName;yearNeed!.ownerProfileId=target!.id;yearNeed!.responsibilityTransfers.push(row);
 for(const id of parsed.selectedTaskIds)eligible.get(id)!.owner=target!.legacyOwnerName;
 st.events.unshift({id:crypto.randomUUID(),customerId:parsed.customerId,dealId:'',kind:'yearwheel_responsibility_transfer',at:row.at,text:(anchor?'Behovsansvar förankrat: '+row.toDisplayName:'Behovsansvar överfört: '+row.fromDisplayName+' → '+row.toDisplayName)+'\nInköpsbehov: '+yearNeed!.title+'\n'+row.selectedTaskIds.length+' valda öppna uppgifter granskades.\nOrsak: '+row.reason});
 // The caller appends selected task audits before validating the complete
 // bidirectional bundle. A partial bundle is never committed.
}

export function validateYearwheelResponsibilityReferences(st:State){
 const seen=new Set<string>(),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile])),tasks=new Map(st.tasks.map(task=>[task.id,task]));
 for(const customer of st.customers){
  const needIds=new Set<string>();
  for(const yearNeed of customer.yearNeeds){
   need(!needIds.has(yearNeed.id),'Årshjulet innehåller dubbla behovs-ID:n för samma kund.');needIds.add(yearNeed.id);
   need(!yearNeed.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(yearNeed.ownerProfileId)?.legacyOwnerName===yearNeed.owner,'Årshjulets stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
   let previous:YearwheelResponsibilityHistory|undefined;
   for(const raw of yearNeed.responsibilityTransfers){
    const row=YearwheelResponsibilityHistorySchema.parse(raw);
    need(!seen.has(row.id),'Årshjulshistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
    need(st.settings.sellerProfilesInitialized&&row.customerId===customer.id&&row.needId===yearNeed.id,'Årshjulshistoriken har en bruten kund- eller behovskoppling.');
    need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Årshjulshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
    need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Årshjulshistoriken har en ogiltig förankring eller överföring.');
    need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Inköpsbehovets ändringar bildar inte en sammanhängande ansvarskedja.');
    need(new Set(row.selectedTaskIds).size===row.selectedTaskIds.length,'Årshjulshistoriken har dubbla valda uppgifter.');
    for(const taskId of row.selectedTaskIds){
     const task=tasks.get(taskId),audits=task?.responsibilityTransfers.filter(history=>history.source==='yearwheel'&&history.sourceTransferId===row.id)||[],audit=audits[0];
     need(task&&task.customerId===customer.id&&task.kind==='year:'+yearNeed.id&&!task.dealId&&audits.length===1&&audit.taskId===taskId&&audit.customerId===customer.id&&!audit.dealId&&audit.action===row.action&&audit.fromProfileId===row.fromProfileId&&audit.toProfileId===row.toProfileId&&audit.fromOwner===row.fromOwner&&audit.toOwner===row.toOwner&&audit.fromDisplayName===row.fromDisplayName&&audit.toDisplayName===row.toDisplayName&&audit.reason===row.reason&&audit.at===row.at&&audit.byId===row.byId&&audit.byMemberId===row.byMemberId&&audit.byName===row.byName,'Årshjulshistoriken saknar en motsvarande granskad uppgift eller motsäger uppgiftens ansvarshistorik.');
    }
    previous=row;
   }
   need(!previous||yearNeed.owner===previous.toOwner&&yearNeed.ownerProfileId===previous.toProfileId,'Nuvarande behovsansvar motsäger den senaste granskade ändringen.');
  }
 }
}
