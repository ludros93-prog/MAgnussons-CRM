import type {Customer,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';
import {sellerProfileForOwner} from './seller-profiles';

// Registered issue responsibility follows the account's exact member link.
// Only older issues without a profile use its valid current operational alias.
export function customerIssueScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets kundärenden':personal?'Mina kundärenden'+(diagnostic?' · synligt urval':''):legacyOwner?'Kundärenden · '+legacyOwner:'Välj ärendeansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type CustomerIssueScope=ReturnType<typeof customerIssueScope>;

export function customerIssueInScope(customer:Pick<Customer,'plan'>,scope:CustomerIssueScope){
 return scope.team||(customer.plan.issueOwnerProfileId?!!scope.profileId&&customer.plan.issueOwnerProfileId===scope.profileId:!!scope.legacyOwner&&customer.plan.issueOwner===scope.legacyOwner);
}
