import type {Customer,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';
import {sellerProfileForOwner} from './seller-profiles';

// Registered customer responsibility follows the exact member-linked profile.
// The account's current valid alias applies only to older blank-profile rows.
export function customerScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets kunder':personal?'Mina kunder'+(diagnostic?' · synligt urval':''):legacyOwner?'Kunder · '+legacyOwner:'Välj kundansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type CustomerScope=ReturnType<typeof customerScope>;

export function customerInScope(customer:Pick<Customer,'owner'|'ownerProfileId'>,scope:CustomerScope){
 return scope.team||(customer.ownerProfileId?!!scope.profileId&&customer.ownerProfileId===scope.profileId:!!scope.legacyOwner&&customer.owner===scope.legacyOwner);
}
