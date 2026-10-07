import {z} from 'zod';
import {day,TaskSchema,type Actor,type State} from './crm';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';
import {sellerProfileById,sellerProfileForOwner,validateSellerProfileReferences} from './seller-profiles';
import {CustomerResponsibilityHistorySchema,customerResponsibilityBasis,validateCustomerResponsibilityReferences} from './customer-responsibility';
import {validateTaskResponsibilityReferences} from './task-responsibility';
import {staffHandoverRows} from './staff-handover';

const required=z.string().trim().min(1).max(4000);
const nextDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Välj ett giltigt datum för nästa aktivitet.').refine(value=>!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'Välj ett giltigt datum för nästa aktivitet.').refine(value=>value>=day(),'Nästa aktivitet ska vara idag eller senare.');
export const CustomerReopenSchema=z.object({
 customerId:required.max(100),targetProfileId:z.string().uuid(),status:z.enum(['prospect','active','dormant']),
 reason:required,nextAction:required.max(200),nextDate,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type CustomerReopen=z.infer<typeof CustomerReopenSchema>;
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};

// Use the same canonical, customer-scoped projection for the visible review
// and its CAS basis. Destinations/hints can change through another workflow's
// identity or audit limit even when its older customer-level basis is equal.
function customerRemainingWork(st:State,customerId:string){
 return staffHandoverRows({...st,viewer:{...(st.viewer||{id:'',name:'',email:'',owner:''}),role:'admin'}}).filter(row=>row.customerId===customerId).sort((a,b)=>a.key.localeCompare(b.key));
}
export function customerReopenReview(st:State,customerId:string){
 const customer=st.customers.find(row=>row.id===customerId);
 const sourceProfile=customer?(customer.ownerProfileId?sellerProfileById(st.settings,customer.ownerProfileId):sellerProfileForOwner(st.settings,customer.owner)):undefined;
 const targetProfiles=st.settings.sellerProfiles.filter(profile=>profile.active&&!profile.retirementHistory?.length&&st.settings.owners.includes(profile.legacyOwnerName)&&((customer?.responsibilityTransfers.length||0)<1000||profile.id===sourceProfile?.id));
 // Inventory is solely a read projection of shared CRM records. It neither
 // grants authority from viewer nor reads/transfers any account/private data.
 const remainingWork=customerRemainingWork(st,customerId);
 const activeBlockedReason=customer?.onboarding.startedAt&&!customer.onboarding.completedAt?'Slutför den befintliga onboardingchecklistan innan kunden återöppnas som aktiv.':'';
 let blockedReason='';
 if(!customer)blockedReason='Kunden finns inte i aktuellt underlag.';
 else if(customer.status!=='closed')blockedReason='Kundrelationen är redan öppen. Ingen ny återöppning registreras.';
 else if(!st.settings.sellerProfilesInitialized)blockedReason='Skapa och granska de stabila säljarprofilerna innan kundrelationen återöppnas.';
 else if(!sourceProfile||sourceProfile.legacyOwnerName!==customer.owner)blockedReason='Kundens tidigare ansvar saknar en giltig granskad säljarprofil. Granska ansvarskopplingen först.';
 else if(!targetProfiles.length)blockedReason=customer.responsibilityTransfers.length>=1000?'Kunden har nått gränsen för ansvarshistorik och kan inte få en annan ansvarig.':'Det finns ingen aktiv, granskad säljarprofil bland de operativa ansvariga.';
 return {customer,sourceProfile,targetProfiles,blockedReason,activeBlockedReason,remainingWork};
}

// Every displayed customer field and related responsibility choice stays at
// the reviewed version. An unrelated customer's note may safely retry.
export function customerReopenBasis(st:State,customerId:string){
 return recordBasis({customer:st.customers.find(row=>row.id===customerId)||null,responsibility:customerResponsibilityBasis(st,customerId),remainingWork:customerRemainingWork(st,customerId)});
}

export function reopenCustomer(st:State,input:CustomerReopen,actor:Actor){
 const parsed=CustomerReopenSchema.parse(input);
 need(actor.role==='admin'&&actor.memberId?.trim()&&actor.id.trim()&&actor.name.trim(),'Kundrelationen återöppnas av en inloggad administratör.');
 need(parsed.expectedContext===customerReopenBasis(st,parsed.customerId),'Kunden eller granskningsunderlaget har ändrats. Läs in och granska aktuellt underlag innan du återöppnar relationen.');
 need(parsed.nextDate>=day(),'Nästa aktivitet ska vara idag eller senare.');
 validateSellerProfileReferences(st);validateCustomerResponsibilityReferences(st);validateTaskResponsibilityReferences(st);
 const review=customerReopenReview(st,parsed.customerId);
 need(!review.blockedReason,review.blockedReason);
 need(parsed.status!=='active'||!review.activeBlockedReason,review.activeBlockedReason);
 const customer=review.customer!,source=review.sourceProfile!,target=review.targetProfiles.find(profile=>profile.id===parsed.targetProfileId);
 need(target,'Välj en aktiv, granskad säljarprofil som finns bland de operativa ansvariga.');
 const at=new Date().toISOString(),selected=target!;
 // Build all server records before mutation. The existing responsibility
 // chain records only a genuine profile change and never claims old tasks.
 const transfer=source.id!==selected.id?CustomerResponsibilityHistorySchema.parse({
  id:crypto.randomUUID(),customerId:customer.id,fromProfileId:source.id,toProfileId:selected.id,
  fromOwner:customer.owner,toOwner:selected.legacyOwnerName,selectedTaskIds:[],reason:parsed.reason,at,
  byId:actor.id,byMemberId:actor.memberId,byName:actor.name
 }):undefined;
 const task=TaskSchema.parse({id:crypto.randomUUID(),customerId:customer.id,dealId:'',owner:selected.legacyOwnerName,ownerProfileId:selected.id,responsibilityTransfers:[],title:parsed.nextAction,due:parsed.nextDate,kind:'care',done:false,doneAt:''});
 const statusLabel={prospect:'Prospekt',active:'Aktiv kund',dormant:'Vilande'}[parsed.status];
 const event={id:crypto.randomUUID(),customerId:customer.id,dealId:'',kind:'customer_reopened',at,actor:{id:actor.id,name:actor.name},text:'Kundrelation återöppnad: '+statusLabel+'\nTidigare kundansvar: '+source.displayName+' · '+source.legacyOwnerName+' · '+source.id+'\nValt kundansvar: '+selected.displayName+' · '+selected.legacyOwnerName+' · '+selected.id+'\nNy planerad aktivitet: '+task.title+' · '+task.due+'\nOrsak: '+parsed.reason};
 customer.status=parsed.status;customer.owner=selected.legacyOwnerName;customer.ownerProfileId=selected.id;
 if(transfer)customer.responsibilityTransfers.push(transfer);
 st.tasks.push(task);st.events.unshift(event);
 validateCustomerResponsibilityReferences(st);validateTaskResponsibilityReferences(st);
 return st;
}
