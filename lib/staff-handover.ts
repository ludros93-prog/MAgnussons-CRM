import type {State,Task} from './crm';
import {sellerProfileById,sellerProfileForOwner} from './seller-profiles';
import {customerResponsibilityCandidates} from './customer-responsibility';
import {commercialResponsibilityCandidates} from './commercial-responsibility';
import {taskResponsibilityCandidates,taskResponsibilityContext,taskResponsibilityKind,taskResponsibleProfile} from './task-responsibility';
import {meetingResponsibilityCandidates} from './meeting-responsibility';
import {onboardingResponsibilityCandidates} from './onboarding-responsibility';
import {issueResponsibilityCandidates} from './issue-responsibility';
import {yearwheelResponsibilityCandidates} from './yearwheel-responsibility';

export type StaffHandoverAction={
 kind:'customer'|'deal'|'order'|'task'|'meeting'|'onboarding'|'issue'|'yearwheel'|'companyEvent';
 id:string;customerId?:string;needId?:string;
};
export type StaffHandoverRow={
 key:string;kind:string;typeLabel:string;title:string;customerName:string;customerId:string;
 owner:string;ownerProfileId:string;identity:'profile'|'legacy'|'unresolved'|'alias';
 due:string;dueLabel:string;status:string;hint:string;action:StaffHandoverAction|null;actionLabel:string;
};

type Destination={action:StaffHandoverAction|null;actionLabel:string;hint:string};
type TaskBundle={
 sourceProfile?:{id:string};blockedReason:string;eligible:Task[];
 excluded:{task:Task;reason:string}[];
};
const relationStatus:Record<string,string>={prospect:'Prospekt',onboarding:'Ny kund',active:'Aktiv kund',growth:'Utveckling',risk:'Behöver omsorg',dormant:'Vilande'};
const dealStatus:Record<string,string>={identified:'Identifierad',contact:'Dialog pågår',needs:'Behov kartlagt',solution:'Lösning & prov',costing:'Offert förbereds',quoted:'Offert skickad',decision:'Beslut pågår',paused:'Pausad'};
const orderStatus:Record<string,string>={handover:'Orderunderlag',approval:'Korrektur',supplier:'Leverantör',production:'Produktion',shipping:'Leverans pågår',delivered:'Levererad',followed:'Uppföljd – faktura saknas'};

// This is an inventory of shared operational responsibilities, not an account
// offboarding command. Historical results, private drafts/Outlook and user-ID
// based production assignments remain separate. Reading never anchors an ID.
export function staffHandoverRows(st:State):StaffHandoverRow[]{
 if(st.viewer?.role!=='admin')return [];
 const rows:StaffHandoverRow[]=[],customers=new Map(st.customers.map(customer=>[customer.id,customer]));
 const deals=new Map(st.deals.map(deal=>[deal.id,deal]));
 const commercialCache=new Map<string,ReturnType<typeof commercialResponsibilityCandidates>>();
 const onboardingCache=new Map<string,ReturnType<typeof onboardingResponsibilityCandidates>>();
 const issueCache=new Map<string,ReturnType<typeof issueResponsibilityCandidates>>();
 const yearwheelCache=new Map<string,ReturnType<typeof yearwheelResponsibilityCandidates>>();
 const commercial=(kind:'deal'|'order',id:string)=>{
  const key=JSON.stringify([kind,id]);let value=commercialCache.get(key);
  if(!value){value=commercialResponsibilityCandidates(st,kind,id);commercialCache.set(key,value);}return value;
 };
 const onboarding=(customerId:string)=>{
  let value=onboardingCache.get(customerId);
  if(!value){value=onboardingResponsibilityCandidates(st,customerId);onboardingCache.set(customerId,value);}return value;
 };
 const issue=(customerId:string)=>{
  let value=issueCache.get(customerId);
  if(!value){value=issueResponsibilityCandidates(st,customerId);issueCache.set(customerId,value);}return value;
 };
 const yearwheel=(customerId:string,needId:string)=>{
  const key=JSON.stringify([customerId,needId]);let value=yearwheelCache.get(key);
  if(!value){value=yearwheelResponsibilityCandidates(st,customerId,needId);yearwheelCache.set(key,value);}return value;
 };
 function identity(owner:string,ownerProfileId:string,aliasOnly=false):StaffHandoverRow['identity']{
  if(!st.settings.sellerProfilesInitialized)return 'unresolved';
  if(ownerProfileId){const profile=sellerProfileById(st.settings,ownerProfileId);return profile?.legacyOwnerName===owner?'profile':'unresolved';}
  const profile=sellerProfileForOwner(st.settings,owner);
  return profile?aliasOnly?'alias':'legacy':'unresolved';
 }
 function customerDestination(customerId:string,hint:string):Destination{
  return customers.has(customerId)?{hint,action:{kind:'customer',id:customerId,customerId},actionLabel:'Öppna kundkort'}:{hint,action:null,actionLabel:''};
 }
 function destination(action:StaffHandoverAction,label:string,blockedReason:string,hint:string):Destination{
  return blockedReason?customerDestination(action.customerId||'',blockedReason):{action,actionLabel:label,hint};
 }
 function add(row:Omit<StaffHandoverRow,'key'|'identity'|'customerName'>,key:string[],aliasOnly=false){
  rows.push({...row,key:JSON.stringify(key),customerName:row.customerId?customers.get(row.customerId)?.name||'Kundkoppling saknas':'',identity:identity(row.owner,row.ownerProfileId,aliasOnly)});
 }
 function bundleDestination(task:Task,bundle:TaskBundle,action:StaffHandoverAction,label:string):Destination{
  if(bundle.blockedReason)return customerDestination(task.customerId,bundle.blockedReason);
  const source=taskResponsibleProfile(st,task);
  if(!source||source.id!==bundle.sourceProfile?.id)return customerDestination(task.customerId,'Uppgiftens ansvar skiljer sig från arbetsflödets ansvar. Granska den kvarvarande uppgiften separat.');
  if(task.responsibilityTransfers.length>=1000)return customerDestination(task.customerId,'Uppgiften har nått gränsen för ansvarshistorik. Granska den separat.');
  if(!bundle.eligible.some(candidate=>candidate.id===task.id))return customerDestination(task.customerId,bundle.excluded.find(candidate=>candidate.task.id===task.id)?.reason||'Uppgiften ingår inte i denna granskade överlämning. Granska dess kundunderlag.');
  return {action,actionLabel:label,hint:'Den här öppna uppgiften kan granskas i arbetsflödets överlämning. Uppgiftsval och orsak görs där.'};
 }
 function taskDestination(task:Task):Destination{
  if(!customers.has(task.customerId))return customerDestination(task.customerId,'Kundkopplingen saknas. Uppgiften ligger kvar och behöver granskas.');
  if(taskResponsibilityKind(task)==='delivery_activity'){
   const candidates=taskResponsibilityCandidates(st,task.id);
   return destination({kind:'task',id:task.id,customerId:task.customerId},'Granska leveranskontaktens ansvar',candidates.blockedReason,'Leveransuppföljningen har eget uppgiftsansvar. Endast denna uppgift överlämnas; kundrelation, order, mottagande, fakturering och tidigare resultat ligger kvar.');
  }
  if(task.dealId){
   const deal=deals.get(task.dealId);
   if(!deal||deal.customerId!==task.customerId)return customerDestination(task.customerId,'Affärskopplingen saknas eller hör till en annan kund. Uppgiften behöver granskas separat.');
   // A linked order is the actual commercial parent. Never route a task back
   // through its won deal, and never infer a parent from a matching owner.
   const order=st.orders.find(candidate=>candidate.dealId===task.dealId);
   const kind=order?'order':'deal',id=order?.id||deal.id,bundle=commercial(kind,id);
   return bundleDestination(task,bundle,{kind,id,customerId:task.customerId},kind==='order'?'Granska orderns överlämning':'Granska affärens överlämning');
  }
  if(taskResponsibilityKind(task)){
   const candidates=taskResponsibilityCandidates(st,task.id);
   const hint=candidates.context?candidates.context.typeLabel+' har eget uppgiftsansvar. Endast denna uppgift överlämnas; kundrelationens ansvar, kundplan och tidigare resultat ligger kvar.':'Fristående uppgiftsansvar granskas separat. Kundrelationens ansvar ändras inte.';
   return destination({kind:'task',id:task.id,customerId:task.customerId},'Granska uppgiftsansvar',candidates.blockedReason,hint);
  }
  if(task.kind==='onboarding')return bundleDestination(task,onboarding(task.customerId),{kind:'onboarding',id:task.customerId,customerId:task.customerId},'Granska onboardingansvar');
  if(task.kind==='csm_issue')return bundleDestination(task,issue(task.customerId),{kind:'issue',id:task.customerId,customerId:task.customerId},'Granska ärendeansvar');
  if(task.kind.startsWith('year:')){
   const needId=task.kind.slice('year:'.length);
   return bundleDestination(task,yearwheel(task.customerId,needId),{kind:'yearwheel',id:needId,customerId:task.customerId,needId},'Granska behovsansvar');
  }
  return customerDestination(task.customerId,'Separat arbetsflöde: denna uppgiftstyp har ännu ingen granskad ansvarsöverlämning. Öppna kundkortet och granska det kvarvarande arbetet.');
 }

 for(const customer of st.customers){
  if(customer.status!=='closed'){
   const candidates=customerResponsibilityCandidates(st,customer.id);
   add({kind:'customer',typeLabel:'Kundrelation',title:customer.name,customerId:customer.id,owner:customer.owner,ownerProfileId:customer.ownerProfileId,
    due:customer.status==='prospect'?customer.prospecting.nextDate:customer.nextReview,dueLabel:customer.status==='prospect'?'Nästa kontakt':'Nästa avstämning',status:relationStatus[customer.status]||customer.status,
    ...destination({kind:'customer',id:customer.id,customerId:customer.id},'Granska kundansvar',candidates.blockedReason,'Kundrelation och uttryckligt valda fristående uppgifter granskas på kundkortet. Andra ansvar överlämnas separat.')},['customer',customer.id]);
  }
  if(customer.onboarding.startedAt&&!customer.onboarding.completedAt){
   const value=customer.onboarding,candidates=onboarding(customer.id);
   add({kind:'onboarding',typeLabel:'Onboarding',title:'Första kundupplevelsen',customerId:customer.id,owner:value.owner,ownerProfileId:value.ownerProfileId,due:value.due,dueLabel:'Klart senast',status:'Pågående',
    ...destination({kind:'onboarding',id:customer.id,customerId:customer.id},'Granska onboardingansvar',candidates.blockedReason,'Onboarding och uttryckligt valda öppna onboardinguppgifter granskas tillsammans.')},['onboarding',customer.id]);
  }
  if(customer.plan.issueStatus==='open'){
   const value=customer.plan,candidates=issue(customer.id);
   add({kind:'issue',typeLabel:'Kundärende',title:value.issueAction||value.issue||'Öppet kundärende',customerId:customer.id,owner:value.issueOwner,ownerProfileId:value.issueOwnerProfileId,due:value.issueDue,dueLabel:'Åtgärdas senast',status:'Öppet',
    ...destination({kind:'issue',id:customer.id,customerId:customer.id},'Granska ärendeansvar',candidates.blockedReason,'Ärendet har eget ansvar. Kundrelationen och tidigare affärsansvar ligger kvar.')},['issue',customer.id]);
  }
  for(const need of customer.yearNeeds.filter(value=>value.status==='planned')){
   const candidates=yearwheel(customer.id,need.id);
   add({kind:'yearwheel',typeLabel:'Inköpsbehov',title:need.title,customerId:customer.id,owner:need.owner,ownerProfileId:need.ownerProfileId,due:need.due,dueLabel:'Kundens leveransbehov',status:'Planerat',
    ...destination({kind:'yearwheel',id:need.id,customerId:customer.id,needId:need.id},'Granska behovsansvar',candidates.blockedReason,'Behov och uttryckligt valda öppna årshjulsuppgifter granskas tillsammans. Kopplad affär överlämnas separat.')},['yearwheel',customer.id,need.id]);
  }
 }
 for(const deal of st.deals.filter(value=>!['won','lost'].includes(value.stage))){
  const candidates=commercial('deal',deal.id);
  let next=destination({kind:'deal',id:deal.id,customerId:deal.customerId},'Granska affärsansvar',candidates.blockedReason,'Affär och nödvändiga öppna åtaganden granskas i sin befintliga överlämning. Historiskt resultat ligger kvar.');
  if(candidates.linkedOrder){
   const order=candidates.linkedOrder,orderCandidates=commercial('order',order.id);
   const sameSource=!!candidates.sourceProfile&&candidates.sourceProfile.legacyOwnerName===deal.owner&&orderCandidates.sourceProfile?.id===candidates.sourceProfile.id;
   if(order.customerId===deal.customerId&&sameSource&&!orderCandidates.blockedReason)next={action:{kind:'order',id:order.id,customerId:deal.customerId},actionLabel:'Granska kopplad order',hint:'Affären har en order med samma registrerade ansvar. Granska orderns överlämning; affärens tidigare ansvar ändras inte.'};
   else next=customerDestination(deal.customerId,orderCandidates.blockedReason||(!sameSource?'Den kopplade ordern har ett annat eget ansvar eller en osäker ansvarskoppling. Granska kundkortet; affärens tidigare ansvar flyttas inte.':candidates.blockedReason));
  }
  add({kind:'deal',typeLabel:'Affär',title:deal.title,customerId:deal.customerId,owner:deal.owner,ownerProfileId:deal.ownerProfileId,due:deal.nextDate,dueLabel:'Nästa aktivitet',status:dealStatus[deal.stage]||deal.stage,
   ...next},['deal',deal.id]);
 }
 for(const order of st.orders.filter(value=>value.stage!=='followed'||value.invoiceValue===null)){
  const candidates=commercial('order',order.id);
  add({kind:'order',typeLabel:'Order',title:deals.get(order.dealId)?.title||'Order '+order.id,customerId:order.customerId,owner:order.owner,ownerProfileId:order.ownerProfileId,due:order.deliveryDate,dueLabel:'Kundens leveransdatum',status:orderStatus[order.stage]||order.stage,
   ...destination({kind:'order',id:order.id,customerId:order.customerId},'Granska orderansvar',candidates.blockedReason,'Orderns kommersiella ansvar granskas separat. Produktionsjobb, hinder och fakturasäljarens historik ändras inte.')},['order',order.id]);
 }
 // Tasks are inventoried independently of parent state/ownership. A handover
 // that left a task with its old owner must not make that task disappear.
 for(const task of st.tasks.filter(value=>!value.done))add({kind:'task',typeLabel:taskResponsibilityContext(st,task)?.typeLabel||'Uppgift',title:task.title,customerId:task.customerId,owner:task.owner,ownerProfileId:task.ownerProfileId,due:task.due,dueLabel:'Förfallodatum',status:'Öppen',...taskDestination(task)},['task',task.id]);
 for(const meeting of st.meetings.filter(value=>value.status==='planned')){
  const candidates=meetingResponsibilityCandidates(st,meeting.id);
  add({kind:'meeting',typeLabel:'Kundmöte',title:meeting.title,customerId:meeting.customerId,owner:meeting.owner,ownerProfileId:meeting.ownerProfileId,due:meeting.date,dueLabel:'Mötesdatum',status:'Planerat',
   ...destination({kind:'meeting',id:meeting.id,customerId:meeting.customerId},'Granska mötesansvar',candidates.blockedReason,'Mötets ansvar granskas separat. Befintliga uppgifter och externa kalenderposter ändras inte.')},['meeting',meeting.id]);
 }
 for(const event of st.companyEvents){
  const action:StaffHandoverAction={kind:'companyEvent',id:event.id};
  if(event.status==='planned')add({kind:'companyEvent',typeLabel:'Företagsaktivitet',title:event.title,customerId:'',owner:event.owner,ownerProfileId:'',due:event.date,dueLabel:'Aktivitetsdatum',status:'Planerad',action,actionLabel:'Öppna företagsaktivitet',hint:'Separat kalenderflöde med ansvar kopplat till namn. Aktiviteten saknar stabilt profil-ID och granskad ansvarsöverlämning.'},['companyEvent',event.id],true);
  for(const task of event.checklist.filter(value=>!value.done))add({kind:'companyEventTask',typeLabel:'Eventförberedelse',title:task.title,customerId:'',owner:task.owner,ownerProfileId:'',due:task.due,dueLabel:'Klart senast',status:event.status==='planned'?'Öppen förberedelse':'Öppen trots avslutad aktivitet',action,actionLabel:'Öppna företagsaktivitet',hint:(event.status==='planned'?'':event.status==='done'?'Aktiviteten är genomförd men denna förberedelse är fortfarande öppen. ':'Aktiviteten är avbokad men denna förberedelse är fortfarande öppen. ')+'Aktivitet: '+event.title+'. Separat kalenderflöde med ansvar kopplat till namn; ingen granskad uppgiftsöverlämning.'},['companyEventTask',event.id,task.id],true);
 }
 return rows;
}

export function staffHandoverForProfile(st:State,profileId:string):StaffHandoverRow[]{
 if(st.viewer?.role!=='admin'||!st.settings.sellerProfilesInitialized)return [];
 const profile=sellerProfileById(st.settings,profileId);
 if(!profile)return [];
 return staffHandoverRows(st).filter(row=>row.owner===profile.legacyOwnerName&&(!row.ownerProfileId||row.ownerProfileId===profile.id));
}
