import type {Deal,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';
import {sellerProfileForOwner} from './seller-profiles';

// Personal registered responsibility follows the account's exact member link.
// Only older deals without a profile use its valid current operational alias.
export function dealScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets affärer':personal?'Mina affärer'+(diagnostic?' · synligt urval':''):legacyOwner?'Affärer · '+legacyOwner:'Välj affärsansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type DealScope=ReturnType<typeof dealScope>;

export function dealInScope(deal:Pick<Deal,'owner'|'ownerProfileId'>,scope:DealScope){
 return scope.team||(deal.ownerProfileId?!!scope.profileId&&deal.ownerProfileId===scope.profileId:!!scope.legacyOwner&&deal.owner===scope.legacyOwner);
}
