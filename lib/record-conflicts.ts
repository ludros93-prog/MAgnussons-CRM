import type {State} from './crm';
import {leadIdentity,leadContactHistory} from './operations';
import {legacySellerNames} from './seller-profiles';

// Profile initialization and relinking read historical attribution and account
// aliases, not customer notes or unrelated budgets. Recheck this context on CAS
// retries so a newly recorded invoice cannot be silently assigned by old input.
export function sellerProfilesBasis(st:State):string {
 return recordBasis({
  aliases:legacySellerNames(st),owners:st.settings.owners,
  initialized:st.settings.sellerProfilesInitialized,profiles:st.settings.sellerProfiles,
  goals:st.settings.sellerGoals,annualGoals:st.settings.sellerAnnualGoals,
  goalsById:st.settings.sellerGoalsById,annualGoalsById:st.settings.sellerAnnualGoalsById,
  invoices:st.orders.map(o=>({id:o.id,owner:o.owner,invoiceOwner:o.invoiceOwner,invoiceOwnerId:o.invoiceOwnerId,source:o.invoiceOwnerSource,value:o.invoiceValue,date:o.invoiceDate,ref:o.invoiceRef})).sort((a,b)=>a.id.localeCompare(b.id)),
  prospects:st.customers.map(c=>({id:c.id,owner:c.owner,at:c.prospecting.qualifiedAt,ownerSnapshot:c.prospecting.qualifiedOwner,ownerId:c.prospecting.qualifiedOwnerId})).sort((a,b)=>a.id.localeCompare(b.id))
 });
}

const collections = {customer:'customers',deal:'deals',order:'orders',task:'tasks',meeting:'meetings',article:'articles'} as const;
export const customerWorkflowTypes=new Set(['prospecting','onboarding','plan']);
export const companyEventBasis=(st:State,eventId:string)=>recordBasis(st.companyEvents.find(e=>e.id===eventId)||null);
export function leadContactBasis(st:State,leadId:string){
 const lead=st.leads.find(l=>l.id===leadId);
 return recordBasis(lead?{id:lead.id,name:lead.name,identity:leadIdentity(lead),customerId:lead.customerId,history:leadContactHistory(st.leads,lead)}:null);
}
// Include only the records and fields read or replaced by this workflow. A
// colleague editing a different customer must not invalidate this basis.
export function customerWorkflowBasis(st:State,type:string,customerId:string):string {
  const c=st.customers.find(c=>c.id===customerId);
  if(!c)return recordBasis(null);
  const identity={id:c.id,owner:c.owner,status:c.status};
  if(type==='prospecting')return recordBasis({...identity,contact:c.contact,prospecting:c.prospecting});
  if(type==='plan')return recordBasis({...identity,plan:c.plan,nextReview:c.nextReview,expectedOrder:c.expectedOrder,reviewDays:c.reviewDays});
  if(type==='onboarding'){
    const o=st.orders.find(o=>o.dealId===c.onboarding.dealId&&o.customerId===c.id);
    return recordBasis({...identity,onboarding:c.onboarding,nextReview:c.nextReview,plan:{nextAction:c.plan.nextAction,nextNeed:c.plan.nextNeed,lastReview:c.plan.lastReview},order:o?{id:o.id,stage:o.stage,deliveredDate:o.deliveredDate}:null});
  }
  throw Error('Okänt kundarbetsflöde.');
}
export function editableRecord(st:State,type:string,id:string):Record<string,unknown>|undefined {
  if(type==='settings')return st.settings;
  const key=collections[type as keyof typeof collections];
  return key?st[key].find(row=>row.id===id) as unknown as Record<string,unknown>|undefined:undefined;
}
export function recordBasis(value:unknown):string {
  if(value===undefined)return 'undefined';
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(recordBasis).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+recordBasis((value as Record<string,unknown>)[key])).join(',')+'}';
}
export function recordChanges(before:Record<string,unknown>,after:Record<string,unknown>){
  return Object.keys(after).filter(key=>recordBasis(before[key])!==recordBasis(after[key]));
}
export const fieldLabels:Record<string,string>={name:'Företagsnamn',email:'E-post',phone:'Telefon',contact:'Kontaktperson',owner:'Ansvarig',ownerProfileId:'Ansvarskoppling',stage:'Steg',status:'Kundrelation',nextDate:'Nästa aktivitetsdatum',nextAction:'Nästa aktivitet',due:'Aktivitetsdatum',title:'Benämning',lines:'Artikelrader',production:'Produktion',productionHistory:'Tidigare produktion',proofApproved:'Korrekturgodkännande',proofFileId:'Korrekturfil',proofVersion:'Korrekturversion',approvedBy:'Godkänt av',approvedDate:'Godkännandedatum',supplierConfirmed:'Leverantörsbekräftelse',deliveryDate:'Planerad leverans',deliveredDate:'Mottaget datum',invoiceRef:'Fakturareferens',invoiceDate:'Fakturadatum',invoiceValue:'Fakturabelopp',actualCost:'Faktisk kostnad',value:'Ordervärde',cost:'Kalkylerad kostnad',plan:'Kundplan',onboarding:'Onboarding',prospecting:'Nykundsbearbetning',notes:'Anteckningar',done:'Klar',doneAt:'Klarmarkerad',settings:'Inställningar',quotes:'Offertversioner',yearNeeds:'Årshjul',products:'Kundsortiment',nextReview:'Nästa kundavstämning',lastContact:'Senaste kundkontakt',shippingAddress:'Leveransadress'};
