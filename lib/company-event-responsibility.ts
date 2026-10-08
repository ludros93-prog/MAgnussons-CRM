import type {Actor,State} from './crm';
import type {CompanyEvent} from './operations';
import {RuleError} from './crm-errors';
import {sellerProfileById} from './seller-profiles';
import {recordBasis} from './record-conflicts';
import {CompanyEventResponsibilityHistorySchema,CompanyEventResponsibilityTransferSchema,type CompanyEventResponsibilityHistory,type CompanyEventResponsibilityTransfer} from './company-event-responsibility-schema';
export {CompanyEventResponsibilityHistorySchema,CompanyEventResponsibilityTransferSchema} from './company-event-responsibility-schema';
export type {CompanyEventResponsibilityHistory,CompanyEventResponsibilityTransfer} from './company-event-responsibility-schema';

type Preparation=CompanyEvent['checklist'][number];
type Responsibility=Pick<Preparation,'owner'|'ownerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Reading a legacy alias describes the source but never anchors its UUID.
// Explicit IDs are authoritative; conflicting IDs never fall back to a name.
export function companyEventResponsibleProfile(st:State,row:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(row.ownerProfileId){const matches=st.settings.sellerProfiles.filter(profile=>profile.id===row.ownerProfileId);return matches.length===1&&matches[0].legacyOwnerName===row.owner?matches[0]:undefined;}
 const matches=st.settings.sellerProfiles.filter(profile=>profile.legacyOwnerName===row.owner);
 return matches.length===1&&st.settings.sellerProfiles.filter(profile=>profile.id===matches[0].id).length===1?matches[0]:undefined;
}
export function companyEventOwnerLabel(st:State,row:Responsibility){
 const profile=companyEventResponsibleProfile(st,row);
 if(!profile)return row.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}
export function companyEventResponsibilityCandidates(st:State,eventId:string,checklistId:string){
 const matches=st.companyEvents.filter(event=>event.id===eventId),event=matches.length===1?matches[0]:undefined;
 const preparations=event?.checklist.filter(row=>row.id===checklistId)||[],preparation=preparations.length===1?preparations[0]:undefined;
 const sourceProfile=preparation?companyEventResponsibleProfile(st,preparation):undefined;
 const idCounts=new Map<string,number>(),aliasCounts=new Map<string,number>();
 for(const profile of st.settings.sellerProfiles){idCounts.set(profile.id,(idCounts.get(profile.id)||0)+1);aliasCounts.set(profile.legacyOwnerName,(aliasCounts.get(profile.legacyOwnerName)||0)+1);}
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>idCounts.get(profile.id)===1&&aliasCounts.get(profile.legacyOwnerName)===1&&profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!preparation?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!matches.length)blockedReason='Företagsaktiviteten finns inte.';
 else if(matches.length!==1)blockedReason='Aktivitetskopplingen är inte entydig. Granska underlaget innan ansvaret ändras.';
 else if(!preparations.length)blockedReason='Förberedelsen finns inte i den valda företagsaktiviteten.';
 else if(preparations.length!==1)blockedReason='Förberedelsens koppling är inte entydig. Granska checklistans id:n.';
 else if(!eventId||eventId.length>100||!checklistId||checklistId.length>100)blockedReason='Aktivitetens eller förberedelsens id behöver granskas före ansvarsbytet.';
 else if(preparation!.done)blockedReason='Avslutad förberedelse behåller sitt historiska ansvar.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan förberedelsens ansvar ändras.';
 else if(!sourceProfile)blockedReason='Nuvarande förberedelseansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(preparation!.responsibilityTransfers.length>=1000)blockedReason='Förberedelsen har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för förberedelsens ansvar.';
 return {event,preparation,sourceProfile,targetProfiles,blockedReason};
}

// The full parent/checklist and all displayed profile choices are frozen.
// Another customer's note may rebase; parent status or a sibling cannot.
export function companyEventResponsibilityBasis(st:State,eventId:string,checklistId:string){
 return recordBasis({eventId,checklistId,events:st.companyEvents.filter(event=>event.id===eventId),
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId}))});
}
export function transferCompanyEventResponsibility(st:State,input:CompanyEventResponsibilityTransfer,actor:Actor){
 const parsed=CompanyEventResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Förberedelsens ansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===companyEventResponsibilityBasis(st,parsed.eventId,parsed.checklistId),'Aktiviteten eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateCompanyEventResponsibilityReferences(st);
 const candidates=companyEventResponsibilityCandidates(st,parsed.eventId,parsed.checklistId),row=candidates.preparation,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(row&&source,'Förberedelsens tidigare ansvar saknar en granskad säljarprofil.');
 need(target&&candidates.targetProfiles.some(profile=>profile.id===target.id),'Välj en aktiv, entydig och granskad säljarprofil bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!row!.ownerProfileId,'Förberedelsen har redan den valda ansvarskopplingen.');
 const audit=CompanyEventResponsibilityHistorySchema.parse({id:crypto.randomUUID(),eventId:parsed.eventId,checklistId:parsed.checklistId,action:anchor?'anchor':'transfer',
  fromRecordedProfileId:row!.ownerProfileId,fromProfileId:source!.id,toProfileId:target!.id,fromOwner:row!.owner,toOwner:target!.legacyOwnerName,
  fromDisplayName:source!.displayName,toDisplayName:target!.displayName,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 // There is no customer-linked timeline event for a company preparation.
 // Its complete audit is embedded in this row, written by the same CRM CAS.
 row!.owner=target!.legacyOwnerName;row!.ownerProfileId=target!.id;row!.responsibilityTransfers.push(audit);
 validateCompanyEventResponsibilityReferences(st);
}

// Ordinary edits/completion keep existing responsibility, including blank
// legacy UUIDs and historical owners. Only a new row receives a server ID.
export function protectCompanyEventResponsibilities(st:State,old:CompanyEvent|undefined,next:CompanyEvent,raw:unknown){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},rawRows=Array.isArray(supplied.checklist)?supplied.checklist as Record<string,unknown>[]:[];
 const has=(row:Record<string,unknown>,key:string)=>Object.prototype.hasOwnProperty.call(row,key);
 for(const previous of old?.checklist||[])if(previous.responsibilityTransfers.length)need(next.checklist.some(row=>row.id===previous.id),'En förberedelse med ansvarshistorik får inte tas bort. Markera faktiskt avslutat arbete i checklistan.');
 for(const row of next.checklist){
  const oldRows=old?.checklist.filter(previous=>previous.id===row.id)||[];
  need(oldRows.length<=1,'Förberedelsens tidigare koppling är inte entydig. Granska checklistans id:n.');
  const previous=oldRows[0],source=rawRows.find(value=>value&&typeof value.id==='string'&&value.id.trim()===row.id)||{};
  if(has(source,'ownerProfileId'))need(row.ownerProfileId===(previous?.ownerProfileId||''),'Förberedelsens ansvarsprofil skapas av systemet och ändras bara i en granskad överlämning.');
  if(has(source,'responsibilityTransfers'))need(recordBasis(row.responsibilityTransfers)===recordBasis(previous?.responsibilityTransfers||[]),'Förberedelsens ansvarshistorik skapas av systemet och får inte ändras i kalenderformuläret.');
  row.responsibilityTransfers=structuredClone(previous?.responsibilityTransfers||[]);
  if(previous){
   need(!st.settings.sellerProfilesInitialized||row.owner===previous.owner,'Använd Byt förberedelseansvar för en granskad överföring.');
   if(row.owner===previous.owner){row.ownerProfileId=previous.ownerProfileId||'';continue;}
  }
  need(st.settings.owners.includes(row.owner),'Välj en ansvarig från teamet för den nya förberedelsen.');
  const profile=st.settings.sellerProfilesInitialized?companyEventResponsibleProfile(st,{owner:row.owner,ownerProfileId:''}):undefined;
  need(!st.settings.sellerProfilesInitialized||profile?.active,'Välj en aktiv, granskad säljarprofil för den nya förberedelsen.');
  row.ownerProfileId=profile?.id||'';
 }
}
export function validateCompanyEventResponsibilityReferences(st:State){
 const seen=new Set<string>(),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile])),eventCounts=new Map<string,number>();
 for(const event of st.companyEvents)eventCounts.set(event.id,(eventCounts.get(event.id)||0)+1);
 for(const event of st.companyEvents){
  const tracked=event.checklist.some(row=>row.ownerProfileId||row.responsibilityTransfers.length);
  if(tracked)need(!!event.id&&eventCounts.get(event.id)===1&&new Set(event.checklist.map(row=>row.id)).size===event.checklist.length,'Förberedelsernas stabila ansvar har en tom eller tvetydig aktivitets-/checklistekoppling.');
  for(const preparation of event.checklist){
   need(!preparation.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(preparation.ownerProfileId)?.legacyOwnerName===preparation.owner,'Förberedelsens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
   let previous:CompanyEventResponsibilityHistory|undefined;
   for(const raw of preparation.responsibilityTransfers){
    const row=CompanyEventResponsibilityHistorySchema.parse(raw);
    need(!seen.has(row.id),'Förberedelsernas historik innehåller dubbla överförings-ID:n.');seen.add(row.id);
    need(st.settings.sellerProfilesInitialized&&row.eventId===event.id&&row.checklistId===preparation.id,'Förberedelsens historik har en bruten aktivitets- eller checklistekoppling.');
    need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Förberedelsens historiska profiler motsäger de registrerade ansvarskopplingarna.');
    need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Förberedelsens historik har en ogiltig förankring eller överföring.');
    need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Förberedelsens ändringar bildar inte en sammanhängande ansvarskedja.');
    previous=row;
   }
   need(!previous||preparation.owner===previous.toOwner&&preparation.ownerProfileId===previous.toProfileId,'Förberedelsens nuvarande ansvar motsäger den senaste granskade ändringen.');
  }
 }
}
