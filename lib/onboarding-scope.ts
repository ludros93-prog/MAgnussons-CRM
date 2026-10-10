import type {Customer,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';
import {sellerProfileForOwner} from './seller-profiles';

// A personal profile follows the account's exact member link. The current
// customer-responsibility alias applies only to older rows without a profile.
export function onboardingScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets onboarding':personal?'Min onboarding'+(diagnostic?' · synligt urval':''):legacyOwner?'Onboarding · '+legacyOwner:'Välj onboardingansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type OnboardingScope=ReturnType<typeof onboardingScope>;

export function onboardingCustomerInScope(customer:Pick<Customer,'owner'|'onboarding'>,scope:OnboardingScope){
 return scope.team||(customer.onboarding.ownerProfileId?!!scope.profileId&&customer.onboarding.ownerProfileId===scope.profileId:!!scope.legacyOwner&&(customer.onboarding.owner||customer.owner)===scope.legacyOwner);
}
