import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Actor,Meeting,Settings,State} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {recordBasis} from './record-conflicts';

const profileId=z.string().uuid(),recordedProfileId=z.union([z.literal(''),profileId]);
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const MeetingResponsibilityHistorySchema=z.object({
 id:profileId,meetingId:recordId,customerId:recordId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const MeetingResponsibilityTransferSchema=z.object({
 meetingId:recordId,targetProfileId:profileId,reason:required,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type MeetingResponsibilityHistory=z.infer<typeof MeetingResponsibilityHistorySchema>;
export type MeetingResponsibilityTransfer=z.infer<typeof MeetingResponsibilityTransferSchema>;
type Responsibility=Pick<Meeting,'owner'|'ownerProfileId'>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Stable IDs are authoritative. Legacy alias lookup describes a reviewed
// choice; reading never anchors a stored meeting or changes its ownership.
export function meetingResponsibleProfile(st:State,meeting:Responsibility){
 if(!st.settings.sellerProfilesInitialized)return undefined;
 if(meeting.ownerProfileId){
  const profile=sellerProfileById(st.settings,meeting.ownerProfileId);
  return profile?.legacyOwnerName===meeting.owner?profile:undefined;
 }
 return sellerProfileForOwner(st.settings,meeting.owner);
}
export function meetingOwnerLabel(st:State,meeting:Responsibility){
 const profile=meetingResponsibleProfile(st,meeting);
 if(!profile)return meeting.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

// Ordinary edits/completion preserve old empty IDs and inactive or removed
// owners. A new meeting chooses active responsibility through the server.
export function protectMeetingResponsibility(oldMeeting:Meeting|undefined,nextMeeting:Meeting,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(Object.prototype.hasOwnProperty.call(supplied,'ownerProfileId'))need(nextMeeting.ownerProfileId===(oldMeeting?.ownerProfileId||''),'Mötets ansvarsprofil väljs av systemet och får inte ändras i formuläret.');
 if(Object.prototype.hasOwnProperty.call(supplied,'responsibilityTransfers'))need(recordBasis(nextMeeting.responsibilityTransfers)===recordBasis(oldMeeting?.responsibilityTransfers||[]),'Mötets ansvarshistorik skapas av systemet och får inte ändras i formuläret.');
 nextMeeting.responsibilityTransfers=structuredClone(oldMeeting?.responsibilityTransfers||[]);
 if(oldMeeting){
  need(!settings.sellerProfilesInitialized||nextMeeting.owner===oldMeeting.owner,'Använd Byt mötesansvar för en granskad överföring.');
  if(oldMeeting.responsibilityTransfers.length)need(nextMeeting.customerId===oldMeeting.customerId,'Ett möte med ansvarshistorik får inte kopplas om till en annan kund.');
 }
 if(oldMeeting&&nextMeeting.owner===oldMeeting.owner){nextMeeting.ownerProfileId=oldMeeting.ownerProfileId||'';return;}
 need(settings.owners.includes(nextMeeting.owner),'Välj en ansvarig från teamet.');
 const profile=settings.sellerProfilesInitialized?sellerProfileForOwner(settings,nextMeeting.owner):undefined;
 need(!settings.sellerProfilesInitialized||profile?.active,'Välj en aktiv, granskad säljarprofil för det nya mötets ansvar.');
 nextMeeting.ownerProfileId=profile?.id||'';
}

export function meetingResponsibilityCandidates(st:State,meetingId:string){
 const meeting=st.meetings.find(row=>row.id===meetingId),customer=meeting?st.customers.find(row=>row.id===meeting.customerId):undefined;
 const sourceProfile=meeting?meetingResponsibleProfile(st,meeting):undefined;
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&st.settings.owners.includes(profile.legacyOwnerName)&&(!meeting?.ownerProfileId||profile.id!==sourceProfile?.id));
 let blockedReason='';
 if(!meeting)blockedReason='Mötet finns inte.';
 else if(meeting.status!=='planned')blockedReason='Genomförda och avbokade möten behåller sitt ansvar. Granska ett planerat möte för att ändra ansvaret.';
 else if(!customer)blockedReason='Kundkopplingen saknas. Granska mötet innan ansvaret ändras.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan mötesansvaret ändras.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==meeting.owner)blockedReason='Nuvarande mötesansvar saknar en giltig granskad säljarprofil. Koppla underlaget uttryckligen först.';
 else if(meeting.responsibilityTransfers.length>=1000)blockedReason='Mötet har nått gränsen för ansvarshistorik.';
 else if(!targetProfiles.length)blockedReason='Det finns ingen aktiv säljarprofil för mötesansvaret.';
 return {meeting,customer,sourceProfile,targetProfiles,blockedReason};
}

// Every displayed meeting field and profile choice is frozen. Unrelated
// changes may rebase; changed notes, status or ownership need a new review.
export function meetingResponsibilityBasis(st:State,meetingId:string){
 const meeting=st.meetings.find(row=>row.id===meetingId),customer=meeting?st.customers.find(row=>row.id===meeting.customerId):undefined;
 return recordBasis({
  meeting:meeting||null,customer:customer?{id:customer.id,name:customer.name,owner:customer.owner,ownerProfileId:customer.ownerProfileId,status:customer.status}:null,
  initialized:st.settings.sellerProfilesInitialized,owners:st.settings.owners,
  profiles:st.settings.sellerProfiles.map(profile=>({id:profile.id,displayName:profile.displayName,legacyOwnerName:profile.legacyOwnerName,active:profile.active,memberId:profile.memberId}))
 });
}

export function transferMeetingResponsibility(st:State,input:MeetingResponsibilityTransfer,actor:Actor){
 const parsed=MeetingResponsibilityTransferSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId,'Mötesansvar ändras av en inloggad administratör.');
 need(parsed.expectedContext===meetingResponsibilityBasis(st,parsed.meetingId),'Mötet eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag.');
 validateMeetingResponsibilityReferences(st);
 const candidates=meetingResponsibilityCandidates(st,parsed.meetingId),meeting=candidates.meeting,source=candidates.sourceProfile,target=sellerProfileById(st.settings,parsed.targetProfileId);
 need(!candidates.blockedReason,candidates.blockedReason);need(meeting&&source,'Nuvarande mötesansvar saknar en granskad säljarprofil.');
 need(target&&target.active&&st.settings.owners.includes(target.legacyOwnerName),'Välj en aktiv säljarprofil som finns bland de operativa ansvariga.');
 const anchor=target!.id===source!.id;
 need(!anchor||!meeting!.ownerProfileId,'Mötet har redan den valda ansvarskopplingen.');
 const row=MeetingResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),meetingId:meeting!.id,customerId:meeting!.customerId,action:anchor?'anchor':'transfer',
  fromRecordedProfileId:meeting!.ownerProfileId,fromProfileId:source!.id,toProfileId:target!.id,
  fromOwner:meeting!.owner,toOwner:target!.legacyOwnerName,fromDisplayName:source!.displayName,toDisplayName:target!.displayName,
  reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 });
 meeting!.owner=target!.legacyOwnerName;meeting!.ownerProfileId=target!.id;meeting!.responsibilityTransfers.push(row);
 st.events.unshift({id:crypto.randomUUID(),customerId:meeting!.customerId,dealId:'',kind:'meeting_responsibility_transfer',at:row.at,text:(anchor?'Mötesansvar förankrat: '+row.toDisplayName:'Mötesansvar överfört: '+row.fromDisplayName+' → '+row.toDisplayName)+'\nMöte: '+meeting!.title+'\nOrsak: '+row.reason});
 validateMeetingResponsibilityReferences(st);
}

export function validateMeetingResponsibilityReferences(st:State){
 const seen=new Set<string>(),customers=new Set(st.customers.map(row=>row.id)),profiles=new Map(st.settings.sellerProfiles.map(profile=>[profile.id,profile]));
 for(const meeting of st.meetings){
  need(!meeting.ownerProfileId||st.settings.sellerProfilesInitialized&&profiles.get(meeting.ownerProfileId)?.legacyOwnerName===meeting.owner,'Mötets stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
  let previous:MeetingResponsibilityHistory|undefined;
  for(const raw of meeting.responsibilityTransfers){
   const row=MeetingResponsibilityHistorySchema.parse(raw);
   need(!seen.has(row.id),'Möteshistoriken innehåller dubbla överförings-ID:n.');seen.add(row.id);
   need(st.settings.sellerProfilesInitialized&&row.meetingId===meeting.id&&row.customerId===meeting.customerId&&customers.has(row.customerId),'Möteshistoriken har en bruten mötes- eller kundkoppling.');
   need(profiles.get(row.fromProfileId)?.legacyOwnerName===row.fromOwner&&profiles.get(row.toProfileId)?.legacyOwnerName===row.toOwner&&(!row.fromRecordedProfileId||row.fromRecordedProfileId===row.fromProfileId),'Möteshistorikens profiler motsäger dess ursprungliga ansvarskopplingar.');
   need(row.action==='anchor'?!row.fromRecordedProfileId&&row.fromProfileId===row.toProfileId:row.fromProfileId!==row.toProfileId,'Möteshistoriken har en ogiltig förankring eller överföring.');
   need(!previous||previous.toProfileId===row.fromProfileId&&previous.toProfileId===row.fromRecordedProfileId&&previous.toOwner===row.fromOwner,'Mötets ändringar bildar inte en sammanhängande ansvarskedja.');
   previous=row;
  }
  need(!previous||meeting.owner===previous.toOwner&&meeting.ownerProfileId===previous.toProfileId,'Nuvarande mötesansvar motsäger den senaste granskade ändringen.');
 }
}
