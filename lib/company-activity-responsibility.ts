import type {Actor,State} from './crm';
import type {CompanyEvent} from './operations';
import {RuleError} from './crm-errors';
import {sellerProfileById} from './seller-profiles';
import {recordBasis} from './record-conflicts';
import {validateCompanyEventResponsibilityReferences} from './company-event-responsibility';
import {CompanyActivityResponsibilityHistorySchema,CompanyActivityResponsibilityTransferSchema,type CompanyActivityResponsibilityHistory,type CompanyActivityResponsibilityTransfer} from './company-activity-responsibility-schema';
export {CompanyActivityResponsibilityHistorySchema,CompanyActivityResponsibilityTransferSchema} from './company-activity-responsibility-schema';
export type {CompanyActivityResponsibilityHistory,CompanyActivityResponsibilityTransfer} from './company-activity-responsibility-schema';

type Responsibility=Pick<CompanyEvent,'owner'|'ownerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Reading describes the registered identity. An explicit UUID never falls
// back to a similar name, and a legacy alias is not anchored by a read.
export function companyActivityResponsibleProfile(st:State,event:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(event.ownerProfileId){const matches=st.settings.sellerProfiles.filter(profile=>profile.id===event.ownerProfileId);return matches.length===1&&matches[0].legacyOwnerName===event.owner?matches[0]:undefined;}
 const matches=st.settings.sellerProfiles.filter(profile=>profile.legacyOwnerName===event.owner);
 return matches.length===1&&st.settings.sellerProfiles.filter(profile=>profile.id===matches[0].id).length===1?matches[0]:undefined;
}
export function companyActivityOwnerLabel(st:State,event:Responsibility){
 const profile=companyActivityResponsibleProfile(st,event);
 if(!profile)return event.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}
export function companyActivityResponsibilityCandidates(st:State,eventId:string){
 const matches=st.companyEvents.filter(event=>event.id===eventId),event=matches.length===1?matches[0]:undefined;
 const sourceProfile=event?companyActivityResponsibleProfile(st,event):undefined;
 const idCounts=new Map<string,number>(),aliasCounts=new Map<string,number>();
 for(const profile of st.settings.sellerProfiles){idCounts.set(profile.id,(idCounts.get(profile.id)||0)+1);aliasCounts.set(profile.legacyOwnerName,(aliasCounts.get(profile.legacyOwnerName)||0)+1);}
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>idCounts.get(profile.id)===1&&aliasCounts.get(profile.legacyOwnerName)===1&&profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!event?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!matches.length)blockedReason='Företagsaktiviteten finns inte.';
 else if(matches.length!==1)blockedReason='Aktivitetskopplingen är inte entydig. Granska underlaget innan ansvaret ändras.';
 else if(!eventId||eventId.length>100)blockedReason='Aktivitetens id behöver granskas före ansvarsbytet.';
 else if(event!.status!=='planned')blockedReason='Genomförda och inställda aktiviteter behåller sitt historiska ansvar. Granska en planerad aktivitet för att ändra ansvaret.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan aktivitetens ansvar ändras.';
 else if(!sourceProfile)blockedReason='Nuvarande aktivitetsansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(event!.responsibilityTransfers.length>=1000)blockedReason='Aktiviteten har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för aktivitetens ansvar.';
 return {event,sourceProfile,targetProfiles,blockedReason};
}

// The reviewed parent, all preparations and displayed profile choices are
// frozen together. Unrelated CRM work may rebase without changing this basis.
export function companyActivityResponsibilityBasis(st:State,eventId:string){
 return recordBasis({eventId,events:st.companyEvents.filter(event=>event.id===eventId),
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId}))});
}
export function transferCompanyActivityResponsibility(st:State,input:CompanyActivityResponsibilityTransfer,actor:Actor){
 const parsed=CompanyActivityResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Aktivitetens ansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===companyActivityResponsibilityBasis(st,parsed.eventId),'Aktiviteten eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateCompanyActivityResponsibilityReferences(st);
 const candidates=companyActivityResponsibilityCandidates(st,parsed.eventId),event=candidates.event,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(event&&source,'Aktivitetens tidigare ansvar saknar en granskad säljarprofil.');
 need(target&&candidates.targetProfiles.some(profile=>profile.id===target.id),'Välj en aktiv, entydig och granskad säljarprofil bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!event!.ownerProfileId,'Aktiviteten har redan den valda ansvarskopplingen.');
 const audit=CompanyActivityResponsibilityHistorySchema.parse({id:crypto.randomUUID(),eventId:parsed.eventId,action:anchor?'anchor':'transfer',
  fromRecordedProfileId:event!.ownerProfileId,fromProfileId:source!.id,toProfileId:target!.id,fromOwner:event!.owner,toOwner:target!.legacyOwnerName,
  fromDisplayName:source!.displayName,toDisplayName:target!.displayName,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 // Only this parent changes. Preparations and customer-linked timeline events
 // retain their own identities; this complete audit shares the CRM CAS write.
 event!.owner=target!.legacyOwnerName;event!.ownerProfileId=target!.id;event!.responsibilityTransfers.push(audit);
 validateCompanyActivityResponsibilityReferences(st);
}

// Normal editing/completion keeps the registered UUID and history, including
// blank legacy IDs and historical owners. Only a new parent receives an ID.
export function protectCompanyActivityResponsibility(st:State,old:CompanyEvent|undefined,next:CompanyEvent,raw:unknown){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(Object.prototype.hasOwnProperty.call(supplied,'ownerProfileId'))need(next.ownerProfileId===(old?.ownerProfileId||''),'Aktivitetens ansvarsprofil skapas av systemet och ändras bara i en granskad överlämning.');
 if(Object.prototype.hasOwnProperty.call(supplied,'responsibilityTransfers'))need(recordBasis(next.responsibilityTransfers)===recordBasis(old?.responsibilityTransfers||[]),'Aktivitetens ansvarshistorik skapas av systemet och får inte ändras i kalenderformuläret.');
 next.responsibilityTransfers=structuredClone(old?.responsibilityTransfers||[]);
 if(old){
  need(!st.settings.sellerProfilesInitialized||next.owner===old.owner,'Använd Byt aktivitetsansvar för en granskad överföring.');
  if(next.owner===old.owner){next.ownerProfileId=old.ownerProfileId||'';return;}
 }
 need(st.settings.owners.includes(next.owner),'Välj en ansvarig från teamet för den nya aktiviteten.');
 const profile=st.settings.sellerProfilesInitialized?companyActivityResponsibleProfile(st,{owner:next.owner,ownerProfileId:''}):undefined;
 need(!st.settings.sellerProfilesInitialized||profile?.active,'Välj en aktiv, granskad säljarprofil för den nya aktiviteten.');
 next.ownerProfileId=profile?.id||'';
}
export function validateCompanyActivityResponsibilityReferences(st:State){
 // Keep the existing preparation contract and enforce unique audit identities
 // across both levels of the same company-activity graph.
 validateCompanyEventResponsibilityReferences(st);
 const seen=new Set(st.companyEvents.flatMap(event=>event.checklist.flatMap(row=>row.responsibilityTransfers.map(transfer=>transfer.id))));
 const profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile])),eventCounts=new Map<string,number>();
 for(const event of st.companyEvents)eventCounts.set(event.id,(eventCounts.get(event.id)||0)+1);
 for(const event of st.companyEvents){
  if(event.ownerProfileId||event.responsibilityTransfers.length)need(!!event.id&&event.id.length<=100&&eventCounts.get(event.id)===1,'Aktivitetens stabila ansvar har en tom eller tvetydig aktivitetskoppling.');
  need(!event.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(event.ownerProfileId)?.legacyOwnerName===event.owner,'Aktivitetens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:CompanyActivityResponsibilityHistory|undefined;
  for(const raw of event.responsibilityTransfers){
   const row=CompanyActivityResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Aktiviteterna och förberedelserna innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.eventId===event.id,'Aktivitetens historik har en bruten aktivitetskoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Aktivitetens historiska profiler motsäger de registrerade ansvarskopplingarna.');
   need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Aktivitetens historik har en ogiltig förankring eller överföring.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Aktivitetens ändringar bildar inte en sammanhängande ansvarskedja.');
   previous=row;
  }
  need(!previous||event.owner===previous.toOwner&&event.ownerProfileId===previous.toProfileId,'Aktivitetens nuvarande ansvar motsäger den senaste granskade ändringen.');
 }
}
