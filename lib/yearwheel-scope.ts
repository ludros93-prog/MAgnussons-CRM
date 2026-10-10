import type {Customer,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';

// Registered needs follow the exact member-linked profile; only older needs
// without a profile follow the account's valid current customer responsibility.
export function yearwheelScope(st:State,mode:'mine'|'team'){
 const team=mode==='team',personal=!team,legacyOwner=team?'':personalOwner(st);
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personalResultScope(st);
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!legacyOwner?'operational-missing':profile&&profile.legacyOwnerName!==legacyOwner?'mismatch':''):'';
 const caption=team?'Teamets behov':'Mina behov'+(diagnostic?' · synligt urval':'');
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type YearwheelScope=ReturnType<typeof yearwheelScope>;

export function yearNeedInScope(need:Pick<Customer['yearNeeds'][number],'owner'|'ownerProfileId'>,scope:YearwheelScope){
 return scope.team||(need.ownerProfileId?!!scope.profileId&&need.ownerProfileId===scope.profileId:!!scope.legacyOwner&&need.owner===scope.legacyOwner);
}
