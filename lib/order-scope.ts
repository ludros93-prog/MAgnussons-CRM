import type {Order,State} from './crm';
import {personalOwner,personalResultScope} from './sales-dashboard';
import {sellerProfileForOwner} from './seller-profiles';

// Registered order responsibility follows the account's exact member link.
// Only older orders without a profile use its valid current operational alias.
export function orderScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets order':personal?'Mina order'+(diagnostic?' · synligt urval':''):legacyOwner?'Order · '+legacyOwner:'Välj orderansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}
export type OrderScope=ReturnType<typeof orderScope>;

export function orderInScope(order:Pick<Order,'owner'|'ownerProfileId'>,scope:OrderScope){
 return scope.team||(order.ownerProfileId?!!scope.profileId&&order.ownerProfileId===scope.profileId:!!scope.legacyOwner&&order.owner===scope.legacyOwner);
}
