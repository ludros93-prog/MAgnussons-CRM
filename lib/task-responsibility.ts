import {z} from 'zod';
import {RuleError} from './crm-errors';
import type {Settings,State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';

const profileId=z.string().uuid();
const need=(value:unknown,message:string)=>{if(!value)throw new RuleError(message)};
type Responsibility=Pick<Task,'owner'|'ownerProfileId'>;

function matchingProfileId(settings:Settings,owner:string,id:string|undefined){
 if(!settings.sellerProfilesInitialized||!id||!profileId.safeParse(id).success)return '';
 return sellerProfileById(settings,id)?.legacyOwnerName===owner?id:'';
}

// An explicit ID is authoritative. Alias lookup is only the display fallback
// for a legacy blank; reading a label never anchors the stored task.
export function taskResponsibleProfile(st:State,task:Responsibility){
 const settings=st.settings;
 if(!settings.sellerProfilesInitialized)return undefined;
 if(task.ownerProfileId){
  const profile=sellerProfileById(settings,task.ownerProfileId);
  return profile?.legacyOwnerName===task.owner?profile:undefined;
 }
 return sellerProfileForOwner(settings,task.owner);
}
export function taskOwnerLabel(st:State,task:Responsibility){
 const profile=taskResponsibleProfile(st,task);
 if(!profile)return task.owner;
 return st.settings.sellerProfiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?profile.displayName+' · '+profile.legacyOwnerName:profile.displayName;
}

// A generic form can choose an owner, but cannot supply or clear a stable ID.
// A legacy task's ordinary edit/completion is deliberately not a migration.
export function protectTaskResponsibility(oldTask:Task|undefined,nextTask:Task,raw:unknown,settings:Settings){
 const supplied=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 if(Object.prototype.hasOwnProperty.call(supplied,'ownerProfileId')){
  need(nextTask.ownerProfileId===(oldTask?.ownerProfileId||''),'Aktivitetens ansvarsprofil väljs av systemet och får inte ändras i formuläret.');
 }
 if(oldTask&&nextTask.owner===oldTask.owner){
  nextTask.ownerProfileId=oldTask.ownerProfileId||'';
  return;
 }
 need(settings.owners.includes(nextTask.owner),'Välj en ansvarig från teamet.');
 const profile=settings.sellerProfilesInitialized?sellerProfileForOwner(settings,nextTask.owner):undefined;
 need(!settings.sellerProfilesInitialized||profile?.active,'Välj en aktiv, granskad säljarprofil för aktivitetens nya ansvar.');
 nextTask.ownerProfileId=profile?.id||'';
}

function derivedTaskProfileId(st:State,task:Task){
 // A new follow-up may copy the exact responsibility of its completed task.
 const copied=matchingProfileId(st.settings,task.owner,task.ownerProfileId);
 if(copied)return copied;
 const order=task.dealId?st.orders.find(row=>row.dealId===task.dealId&&row.customerId===task.customerId&&row.owner===task.owner):undefined;
 const deal=task.dealId?st.deals.find(row=>row.id===task.dealId&&row.customerId===task.customerId&&row.owner===task.owner):undefined;
 const customer=st.customers.find(row=>row.id===task.customerId&&row.owner===task.owner);
 for(const source of [order,deal,customer]){
  const id=matchingProfileId(st.settings,task.owner,source?.ownerProfileId);
  if(id)return id;
 }
 // Existing operational work may still belong to an inactive or unmapped
 // legacy owner. Recording dispatch/receipt/invoicing must remain possible;
 // this derives a new task, never reactivates a person or changes old history.
 return st.settings.sellerProfilesInitialized?sellerProfileForOwner(st.settings,task.owner)?.id||'':'';
}

export function assignTaskResponsibilities(previousState:State,nextState:State){
 const previous=new Map(previousState.tasks.map(task=>[task.id,task]));
 for(const task of nextState.tasks){
  const old=previous.get(task.id);
  task.ownerProfileId=old&&old.owner===task.owner?old.ownerProfileId||'':derivedTaskProfileId(nextState,task);
 }
 validateTaskResponsibilityReferences(nextState);
 return nextState;
}

export function validateTaskResponsibilityReferences(st:State){
 for(const task of st.tasks){
  const id=task.ownerProfileId;
  need(!id||matchingProfileId(st.settings,task.owner,id),'Aktivitetens stabila ansvarskoppling saknas eller motsäger det registrerade ansvaret.');
 }
}
