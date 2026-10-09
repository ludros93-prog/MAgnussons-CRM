import type {Deal,Order,State} from './crm';
import type {SellerProfile} from './seller-profiles';

export type HistoricalCommercialCorrectionEligibility={field:'reason'|'notes';profile:SellerProfile};

// A historical text correction describes the recorded responsible person. It
// never anchors an older blank UUID or transfers responsibility to an account.
export function historicalCommercialCorrectionEligibility(st:State,targetType:'deal'|'order',record:Deal|Order|undefined):HistoricalCommercialCorrectionEligibility|null{
 if(!record||!st.settings.sellerProfilesInitialized)return null;
 const records=targetType==='deal'?st.deals:st.orders;
 if(records.filter(candidate=>candidate.id===record.id).length!==1)return null;
 const profiles=st.settings.sellerProfiles.filter(profile=>record.ownerProfileId?profile.id===record.ownerProfileId:profile.legacyOwnerName===record.owner);
 if(profiles.length!==1)return null;
 const profile=profiles[0],history=profile.retirementHistory||[];
 if(profile.legacyOwnerName!==record.owner||profile.active||st.settings.owners.includes(profile.legacyOwnerName)||history.length!==1||history[0].profileId!==profile.id||history[0].owner!==profile.legacyOwnerName)return null;
 if(targetType==='deal')return record.stage==='lost'?{field:'reason',profile}:null;
 const order=record as Order;
 return order.stage==='followed'&&order.invoiceValue!==null&&!!order.invoiceRef.trim()&&!!order.invoiceDate?{field:'notes',profile}:null;
}
