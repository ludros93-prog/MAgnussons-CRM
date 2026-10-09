'use client';
import type {DraftRecord} from '@/lib/drafts';
import {RELATIONS,label} from '@/lib/crm';
import {YearNeedDraftEnvelopeSchema,type YearNeedDraftValues} from '@/lib/year-need-drafts';
import type {YearNeedEditContext} from '@/lib/yearwheel-responsibility';

export const needStatuses=[{id:'planned',label:'Planerat'},{id:'done',label:'Hanterat'},{id:'cancelled',label:'Avslutat'}];
export const needIntervals=[{id:'0',label:'Engångsbehov'},{id:'1',label:'Varje månad'},{id:'3',label:'Var tredje månad'},{id:'6',label:'Var sjätte månad'},{id:'12',label:'Varje år'},{id:'24',label:'Vartannat år'}];
const text=(s:string|undefined)=>s===undefined?'Saknas i underlaget':s===''?'Ej angivet':s;
export function YearNeedSnapshot({values}:{values:YearNeedDraftValues}){
 return <div className="event-draft-snapshot"><dl>{[['Behov',values.title],['Produktområde',values.category],['Behövs hos kunden',values.due],['Angivna dagar före kontakt',values.leadDays],['Angiven upprepning i månader',values.intervalMonths],['Behovsansvarig',values.owner],['Status',needStatuses.find(s=>s.id===values.status)?.label||values.status],['Omfattning, anledning och förberedelser',values.notes],['Behovets id',values.id],['Registrerat profil-ID',values.ownerProfileId],['Hanterat · registrerat datum',values.completedAt],['Affärskoppling',values.dealId]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl><details><summary>Visa registrerad ansvarshistorik</summary><pre>{JSON.stringify(values.responsibilityTransfers??[],null,2)}</pre></details></div>;
}
export function YearNeedContextSnapshot({context}:{context:YearNeedEditContext}){
 return <div className="event-draft-snapshot"><dl><div><dt>Kund i underlaget</dt><dd>{context.customer?.name||'Kunden saknas'} · {context.customer?.id||'Ingen kundkoppling'}</dd></div><div><dt>Kundansvar och status</dt><dd>{context.customer?.owner||'Saknas'} · {context.customer?label(RELATIONS,context.customer.status):'Saknas'}</dd></div><div><dt>Säljarprofiler granskade</dt><dd>{context.initialized?'Ja':'Nej'}</dd></div></dl><details><summary>Visa hela kund-, behovs- och profilunderlaget</summary><pre>{JSON.stringify(context,null,2)}</pre></details></div>;
}
// Previewing never reconciles a private version or adopts a new CRM basis.
export function YearNeedDraftPreview({draft,summaryId,identityId}:{draft:Pick<DraftRecord,'id'|'data'|'updatedAt'>;summaryId?:string;identityId?:string}){
 const p=YearNeedDraftEnvelopeSchema.safeParse(draft.data),e=p.success&&p.data.draftId===draft.id?p.data:null;
 return <div className="event-draft-preview year-need-draft-preview"><p id={summaryId}>{e?(e.context.customer?.name||'Kunden saknas')+' · '+(e.values.due||'Leveransdatum saknas')+' · '+(e.values.owner||'Ansvarig saknas'):'Utkastets format kunde inte läsas. Öppna för att kopiera det bevarade underlaget.'}</p><details><summary>Visa alla behovsuppgifter</summary>{e&&<><YearNeedSnapshot values={e.values}/><YearNeedContextSnapshot context={e.context}/></>}<dl id={identityId}><div><dt>Ändrat · originaltid</dt><dd>{draft.updatedAt}</dd></div><div><dt>Privat utkastreferens</dt><dd>{draft.id}</dd></div><div><dt>Behovets id</dt><dd>{e?.base.id||'Nytt behov'}</dd></div></dl><details><summary>Visa hela det bevarade underlaget</summary><pre>{JSON.stringify(draft.data,null,2)}</pre></details></details></div>;
}
