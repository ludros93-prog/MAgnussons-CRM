'use client';
import type {DraftRecord} from '@/lib/drafts';
import {CompanyEventDraftEnvelopeSchema,type CompanyEventDraftValues} from '@/lib/company-event-drafts';

export const eventCategories=[{id:'event',label:'Event'},{id:'campaign',label:'Kampanj'},{id:'internal',label:'Internt'},{id:'holiday',label:'Ledighet / stängt'}];
export const eventStatuses=[{id:'planned',label:'Planerad'},{id:'done',label:'Genomförd'},{id:'cancelled',label:'Inställd'}];
const text=(s:string)=>s===''?'Ej angivet':s;
export function CompanyEventSnapshot({values}:{values:CompanyEventDraftValues}){
 return <div className="event-draft-snapshot"><dl>{[['Rubrik',values.title],['Startdatum',values.date],['Slutdatum',values.endDate],['Aktivitetens ansvar',values.owner],['Kategori',eventCategories.find(c=>c.id===values.category)?.label||values.category],['Status',eventStatuses.find(s=>s.id===values.status)?.label||values.status],['Planering och anteckningar',values.notes],['Aktivitetens id',values.id]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl>{values.ownerProfileId!==undefined&&<p className="biz-hint break-words"><b>Aktivitetens registrerade profil-ID:</b> {values.ownerProfileId||'Äldre ansvar utan profil-ID'}. Ansvarsändringar i underlaget: {values.responsibilityTransfers?.length||0}.</p>}<h4>Förberedelser</h4>{values.checklist.length?values.checklist.map((t,i)=><dl key={i}><div><dt>Förberedelse {i+1}</dt><dd>{text(t.title)}</dd></div><div><dt>Förberedelsens ansvar</dt><dd>{text(t.owner)}</dd></div><div><dt>Klart senast</dt><dd>{text(t.due)}</dd></div><div><dt>Klarmarkerad</dt><dd>{t.done?'Ja':'Nej'}</dd></div><div><dt>Förberedelsens id</dt><dd>{text(t.id)}</dd></div>{t.ownerProfileId!==undefined&&<div><dt>Förberedelsens registrerade profil-ID</dt><dd>{t.ownerProfileId||'Äldre ansvar utan profil-ID'}. Ansvarsändringar i underlaget: {t.responsibilityTransfers?.length||0}.</dd></div>}</dl>):<p>Inga förberedelser i underlaget.</p>}</div>;
}
// Expanding a card only presents its exact private body. It never reconciles,
// chooses a newer version, changes its basis or writes to the shared calendar.
export function CompanyEventDraftPreview({draft}:{draft:Pick<DraftRecord,'id'|'data'|'updatedAt'>}){
 const p=CompanyEventDraftEnvelopeSchema.safeParse(draft.data),e=p.success&&p.data.draftId===draft.id?p.data:null;
 return <div className="event-draft-preview"><p>{e?(e.values.date||'Startdatum saknas')+' · '+(e.values.owner||'Ansvarig saknas')+' · '+e.values.checklist.length+' förberedelser':'Utkastets format kunde inte läsas. Öppna för att kopiera det bevarade underlaget.'}</p><details><summary>Visa alla aktivitetsuppgifter</summary>{e&&<CompanyEventSnapshot values={e.values}/>}<dl><div><dt>Ändrat · originaltid</dt><dd>{draft.updatedAt}</dd></div><div><dt>Privat utkastreferens</dt><dd>{draft.id}</dd></div></dl><details><summary>Visa hela det bevarade underlaget</summary><pre>{JSON.stringify(draft.data,null,2)}</pre></details></details></div>;
}
