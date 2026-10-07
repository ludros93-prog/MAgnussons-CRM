'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {type State} from '@/lib/crm';
import {companyEventBasis} from '@/lib/record-conflicts';
import {CompanyEventDraftEnvelopeSchema,isCompanyEventDraft} from '@/lib/company-event-drafts';
import {displayDate,type SaveAction} from './business-ui';
import {useDrafts,DraftStatus} from './draft-workspace';
import {CompanyEventEditor,type CompanyEventDraftRequest,type CompanyEventPublish} from './company-event-editor';
import {CompanyEventDraftPreview,eventCategories} from './company-event-draft-preview';

export function CompanyCalendar({st,save,busy,publish,resumeDraftId,onResumeClosed}:{st:State;save:SaveAction;busy:boolean;publish:CompanyEventPublish;resumeDraftId?:string;onResumeClosed:()=>void}){
 const w=useDrafts(),[history,setHistory]=useState(false),[request,setRequest]=useState<(CompanyEventDraftRequest&{token:string})|null>(null);
 const write=['admin','seller'].includes(st.viewer?.role||'');
 const drafts=write?w.records.filter(d=>isCompanyEventDraft(d.kind,d.context)):[];
 function openDraft(id:string){const d=w.get(id),p=d&&CompanyEventDraftEnvelopeSchema.safeParse(d.data);setRequest({eventId:p&&p.success?p.data.base.id:'',draftId:id,token:crypto.randomUUID()})}
 useEffect(()=>{if(resumeDraftId&&write&&w.ready)openDraft(resumeDraftId)},[resumeDraftId,write,w.ready]);
 const list=st.companyEvents.filter(e=>history?e.status!=='planned':e.status==='planned').sort((a,b)=>a.date.localeCompare(b.date));
 return <section className="business-ui panel operations company-calendar"><div className="biz-head"><div><span className="biz-kicker">GEMENSAM PLANERING</span><h2><CalendarDays/>Företagets aktiviteter</h2><p>Event, kampanjer och förberedelser med tydligt ansvar.</p></div><div className="biz-buttons"><Button variant="outline" onClick={()=>setHistory(!history)}>{history?'Visa planerade':'Visa historik'}</Button>{write&&<Button disabled={busy||!w.ready} onClick={()=>setRequest({eventId:'',token:crypto.randomUUID()})}><Plus size={16}/>Ny aktivitet</Button>}</div></div>
 {write&&<div className="event-draft-list"><h3>Mina privata aktivitetsutkast</h3><p>Bara synliga för dig. Sparning i företagskalendern är en separat handling.</p>{!w.ready&&<DraftStatus id=""/>}{drafts.map(d=><article className="event-draft-card" key={d.id}><h4>{d.title}</h4><CompanyEventDraftPreview draft={d}/><DraftStatus id={d.id} allowActions={false}/><div className="biz-buttons"><Button variant="outline" disabled={busy} onClick={()=>openDraft(d.id)}>Fortsätt detta aktivitetsutkast</Button><Button variant="ghost" disabled={busy} onClick={()=>openDraft(d.id)}>Granska eller ta bort</Button></div></article>)}{w.ready&&!drafts.length&&<p>Inga privata aktivitetsutkast just nu.</p>}</div>}
 {list.map(e=><article className="event-card" key={e.id}><div><span className="pill">{eventCategories.find(c=>c.id===e.category)?.label}</span><h3>{e.title}</h3><p>{displayDate(e.date)}{e.endDate?' – '+displayDate(e.endDate):''} · {e.owner}</p><p>{e.notes}</p></div><div className="event-tasks">{e.checklist.map(t=><label key={t.id}><Checkbox checked={t.done} disabled={busy||!write} onCheckedChange={v=>save('company_event',{...e,expectedContext:companyEventBasis(st,e.id),checklist:e.checklist.map(x=>x.id===t.id?{...x,done:v===true}:x)},false)}/><span><b>{t.title}</b><small>{t.owner} · {displayDate(t.due)}</small></span></label>)}<small>{e.checklist.filter(t=>t.done).length} av {e.checklist.length} förberedelser klara</small></div>{write&&<Button variant="outline" disabled={busy||!w.ready} onClick={()=>setRequest({eventId:e.id,token:crypto.randomUUID()})}>Redigera</Button>}</article>)}
 {!list.length&&<div className="biz-empty">Inga {history?'avslutade':'planerade'} företagsaktiviteter.</div>}
 {request&&<CompanyEventEditor key={JSON.stringify([st.viewer?.id,st.viewer?.role,request.token])} st={st} request={request} busy={busy} publish={publish} onClose={()=>{setRequest(null);onResumeClosed()}}/>}
 </section>;
}
