import {z} from 'zod';
import type {Actor,State} from './crm';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';
import {sellerProfileById,SellerProfileRetirementHistorySchema,validateSellerProfileReferences,type SellerProfile} from './seller-profiles';
import {staffHandoverRows,type StaffHandoverRow} from './staff-handover';

export const SellerProfileRetireSchema=z.object({
 profileId:z.string().uuid(),expectedContext:z.string().min(1).max(3000000),reviewed:z.literal(true),reason:z.string().trim().min(1).max(4000)
}).strict();
export type SellerProfileRetire=z.infer<typeof SellerProfileRetireSchema>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// The inventory's public helper hides personnel work from non-admin views.
// Here its role flag is solely an internal projection of shared CRM records,
// never authorization, a guessed account, or a stored viewer modification.
function operationalRows(st:State){
 return staffHandoverRows({...st,viewer:{...(st.viewer||{id:'',name:'',email:'',owner:''}),role:'admin'}});
}
function rowsForProfile(rows:StaffHandoverRow[],profile:SellerProfile){
 // Closure is conservative even for malformed pure-domain input: an explicit
 // conflicting UUID never makes a matching operational alias look empty.
 return rows.filter(row=>row.owner===profile.legacyOwnerName||row.ownerProfileId===profile.id).sort((a,b)=>a.key.localeCompare(b.key));
}
export function sellerProfileRetirementReview(st:State,profileId:string){
 const profile=sellerProfileById(st.settings,profileId),rows=operationalRows(st);
 const blockers=profile?rowsForProfile(rows,profile):[];
 const remainingProfiles=st.settings.sellerProfiles.filter(candidate=>candidate.id!==profileId&&candidate.active&&st.settings.owners.includes(candidate.legacyOwnerName));
 let blockedReason='';
 if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna före profilavveckling.';
 else if(!profile)blockedReason='Säljarprofilen finns inte i aktuellt underlag.';
 else if(!profile.active||profile.retirementHistory?.length)blockedReason='Profilen är redan historisk. Ingen ny avveckling registreras.';
 else if(blockers.length)blockedReason=blockers.length+' ansvarsdelar återstår. Granska och hantera allt öppet arbete före profilavveckling.';
 else if(!remainingProfiles.length)blockedReason='Behåll minst en annan aktiv, granskad säljarprofil bland de operativa ansvariga.';
 return {profile,blockers,blockedReason,remainingProfiles};
}

// Freeze the chosen identity, operative roster and every visible blocker.
// Historical invoices/goals, other customers' notes and the global version
// are not rewritten by closure and do not create unrelated CAS conflicts.
export function sellerProfileRetirementBasis(st:State,profileId:string){
 const review=sellerProfileRetirementReview(st,profileId);
 return recordBasis({
  initialized:st.settings.sellerProfilesInitialized,profile:review.profile||null,owners:st.settings.owners,
  remainingProfiles:review.remainingProfiles.map(profile=>({id:profile.id,legacyOwnerName:profile.legacyOwnerName,displayName:profile.displayName,memberId:profile.memberId,active:profile.active})).sort((a,b)=>a.id.localeCompare(b.id)),
  blockers:review.blockers
 });
}

export function retireSellerProfile(st:State,input:SellerProfileRetire,actor:Actor){
 need(actor.role==='admin'&&actor.memberId,'Profilavveckling kräver en inloggad administratör.');
 const parsed=SellerProfileRetireSchema.parse(input);
 need(parsed.expectedContext===sellerProfileRetirementBasis(st,parsed.profileId),'Profilen eller det kvarvarande arbetet har ändrats. Läs in och granska aktuellt underlag före profilavveckling.');
 validateSellerProfileReferences(st);
 const review=sellerProfileRetirementReview(st,parsed.profileId);
 need(!review.blockedReason,review.blockedReason);
 const profile=review.profile!;
 const audit=SellerProfileRetirementHistorySchema.parse({id:crypto.randomUUID(),profileId:profile.id,owner:profile.legacyOwnerName,displayName:profile.displayName,reason:parsed.reason,at:new Date().toISOString(),byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 // Only this profile's availability changes. Account binding, all commercial
 // IDs/results/goals, completed records and private stores remain untouched.
 st.settings.owners=st.settings.owners.filter(owner=>owner!==profile.legacyOwnerName);
 profile.active=false;profile.retirementHistory=[...(profile.retirementHistory||[]),audit];
 validateSellerProfileReferences(st);
 return st;
}

export function protectRetiredSellerResponsibilities(previous:State,next:State){
 const previousRetired=previous.settings.sellerProfiles.filter(profile=>profile.retirementHistory?.length);
 for(const profile of previousRetired){
  const current=sellerProfileById(next.settings,profile.id);
  need(current&&current.legacyOwnerName===profile.legacyOwnerName&&recordBasis(current.retirementHistory)===recordBasis(profile.retirementHistory),'Profilavvecklingens tidigare identitet och historik får inte ändras eller tas bort.');
 }
 const retired=next.settings.sellerProfiles.filter(profile=>profile.retirementHistory?.length);
 if(!retired.length)return next;
 const before=operationalRows(previous),after=operationalRows(next);
 for(const profile of retired){
  need(!profile.active&&!next.settings.owners.includes(profile.legacyOwnerName),'En avvecklad profil får inte återaktiveras som operativ ansvarig.');
  const prior=sellerProfileById(previous.settings,profile.id),oldKeys=new Set(prior?rowsForProfile(before,prior).map(row=>row.key):[]);
  need(rowsForProfile(after,profile).every(row=>oldKeys.has(row.key)),'Öppet arbete får inte skapas, återöppnas eller tilldelas en avvecklad profil. Granska ansvaret och välj en aktiv profil.');
 }
 // Legacy inactive profiles without a recorded retirement deliberately retain
 // their previous editing/completion/derived-task rules; no audit is inferred.
 return next;
}
