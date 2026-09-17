import type {State} from './crm';

const collections = {customer:'customers',deal:'deals',order:'orders',task:'tasks',meeting:'meetings',article:'articles'} as const;
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
export const fieldLabels:Record<string,string>={name:'Företagsnamn',email:'E-post',phone:'Telefon',contact:'Kontaktperson',owner:'Ansvarig',stage:'Steg',status:'Kundrelation',nextDate:'Nästa aktivitetsdatum',nextAction:'Nästa aktivitet',due:'Aktivitetsdatum',title:'Benämning',lines:'Artikelrader',production:'Produktion',productionHistory:'Tidigare produktion',proofApproved:'Korrekturgodkännande',proofFileId:'Korrekturfil',proofVersion:'Korrekturversion',approvedBy:'Godkänt av',approvedDate:'Godkännandedatum',supplierConfirmed:'Leverantörsbekräftelse',deliveryDate:'Planerad leverans',deliveredDate:'Mottaget datum',invoiceRef:'Fakturareferens',invoiceDate:'Fakturadatum',invoiceValue:'Fakturabelopp',actualCost:'Faktisk kostnad',value:'Ordervärde',cost:'Kalkylerad kostnad',plan:'Kundplan',onboarding:'Onboarding',prospecting:'Nykundsbearbetning',notes:'Anteckningar',done:'Klar',doneAt:'Klarmarkerad',settings:'Inställningar',quotes:'Offertversioner',yearNeeds:'Årshjul',products:'Kundsortiment',nextReview:'Nästa kundavstämning',lastContact:'Senaste kundkontakt',shippingAddress:'Leveransadress'};
