'use client';
import {useEffect,useRef,useState,type FocusEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {day,type State} from '@/lib/crm';
import {companyEventBasis,recordBasis} from '@/lib/record-conflicts';
import {personalOwner} from '@/lib/sales-dashboard';
import {CompanyEventDraftEnvelopeSchema,CompanyEventDraftValuesSchema,companyEventDraftServerVersion,isCompanyEventDraft,type CompanyEventDraftEnvelope,type CompanyEventDraftValues} from '@/lib/company-event-drafts';
import {BusinessField as F,Pick} from './business-ui';
import {useDrafts,DraftStatus} from './draft-workspace';
import {CompanyEventDraftPreview,CompanyEventSnapshot,eventCategories,eventStatuses} from './company-event-draft-preview';

export type CompanyEventDraftRequest={eventId:string;draftId?:string};
export type CompanyEventPublish=(data:unknown,onFailure:(status:number,message?:string)=>void)=>Promise<boolean>;
type Attempt={data:CompanyEventDraftValues&{expectedContext:string;draft:{id:string;revision:number}}};
const title=(values:CompanyEventDraftValues)=>('Företagsaktivitet · '+(values.title.trim()||'Påbörjad planering')).slice(0,200);
function newValues(st:State):CompanyEventDraftValues{return{id:'',title:'',date:day(),endDate:'',owner:personalOwner(st),category:'event',notes:'',status:'planned',checklist:[]}}

export function CompanyEventEditor({st,request,busy,publish,onClose}:{st:State;request:CompanyEventDraftRequest;busy:boolean;publish:CompanyEventPublish;onClose:()=>void}){
 const w=useDrafts(),enabled=['admin','seller'].includes(st.viewer?.role||'');
 const opening=useRef(request.eventId?structuredClone(st.companyEvents.find(e=>e.id===request.eventId)):newValues(st));
 const initialized=useRef(false),lock=useRef(false),alive=useRef(true),ws=useRef(w),state=useRef(st),retryAttempt=useRef<Attempt|null>(null);
 ws.current=w;state.current=st;
 const panel=useRef<HTMLDivElement>(null),status=useRef<HTMLDivElement>(null),footer=useRef<HTMLDivElement>(null),privateDetails=useRef<HTMLDivElement>(null),sharedDetails=useRef<HTMLDivElement>(null);
 const [activeId,setActiveId]=useState(request.draftId||''),[operation,setOperation]=useState(''),[failure,setFailure]=useState(''),[crmMessage,setCrmMessage]=useState(''),[choices,setChoices]=useState<string[]>([]),[retry,setRetry]=useState<Attempt|null>(null),[discard,setDiscard]=useState(false);
 const [reviewedEvent,setReviewedEvent]=useState<CompanyEventDraftValues|null>(null),[sharedChoice,setSharedChoice]=useState(''),[privateChoice,setPrivateChoice]=useState('');
 const local=enabled?w.records.find(d=>d.id===activeId&&isCompanyEventDraft(d.kind,d.context)):undefined;
 const p=local?CompanyEventDraftEnvelopeSchema.safeParse(local.data):null;
 const envelope=p?.success&&p.data.draftId===local?.id&&p.data.base.id===request.eventId?p.data:undefined,values=envelope?.values;
 const current=envelope?.base.id?st.companyEvents.find(e=>e.id===envelope.base.id):undefined;
 const basis=companyEventBasis(st,envelope?.base.id||request.eventId),missing=!!envelope?.base.id&&!current,conflict=!!envelope&&envelope.expectedContext!==basis;
 const privateConflict=local?.status==='conflict',locked=busy||!!operation;
 const server=privateConflict?companyEventDraftServerVersion(local.server,activeId,request.eventId):null;
 const choiceBasis=recordBasis({id:local?.id,generation:local?.generation,data:local?.data,server:local?.server});
 const sharedBasis=recordBasis({id:local?.id,generation:local?.generation,data:local?.data,basis,reviewedEvent});
 const owners=[{id:'',label:'Välj ansvarig'},...st.settings.owners.map(o=>({id:o,label:o}))];
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{retryAttempt.current=null;setRetry(null);setSharedChoice('');setReviewedEvent(null);setDiscard(false)},[local?.generation]);
 useEffect(()=>setPrivateChoice(''),[choiceBasis]);
 useEffect(()=>setSharedChoice(''),[sharedBasis]);
 function currentEnvelope(){const d=ws.current.get(activeId);if(!d||!isCompanyEventDraft(d.kind,d.context))return null;const e=CompanyEventDraftEnvelopeSchema.safeParse(d.data);return e.success&&e.data.draftId===d.id&&e.data.base.id===request.eventId?{record:d,envelope:e.data}:null}
 function clearAttempt(){retryAttempt.current=null;setRetry(null)}
 function reveal(node:HTMLElement|null){if(!node?.isConnected)return;node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:'instant'})}
 function notice(message:string){if(!alive.current)return;setFailure(message);requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
 function create(){
  if(lock.current||busy||!enabled||!ws.current.ready)return;
  const parsed=CompanyEventDraftValuesSchema.safeParse(opening.current);if(!parsed.success){notice('Aktiviteten saknas eller dess ursprungliga underlag kunde inte läsas. Inget utkast har skapats.');return}
  const id=crypto.randomUUID(),base=parsed.data,e:CompanyEventDraftEnvelope={draftId:id,type:'company_event',values:structuredClone(base),base,initialData:recordBasis(base),expectedContext:base.id?recordBasis(base):recordBasis(null)};
  const created=ws.current.create('form','company_event',e,title(base),id);if(created){setChoices([]);setActiveId(created)}else notice('Ditt privata utkast kunde inte öppnas. Försök hämta utkasten igen.');
 }
 async function resume(id:string){if(lock.current||busy||!enabled)return;lock.current=true;setOperation('open');setActiveId(id);setChoices([]);try{await ws.current.reconcile(id);if(alive.current&&!ws.current.get(id))setFailure('Det valda utkastet saknas eller är avslutat. Inget annat utkast har öppnats.')}finally{lock.current=false;if(alive.current)setOperation('')}}
 useEffect(()=>{
  if(initialized.current||!w.ready||!enabled||busy)return;initialized.current=true;
  if(request.draftId){void resume(request.draftId);return}
  const existing=w.records.filter(d=>{if(!isCompanyEventDraft(d.kind,d.context))return false;const e=CompanyEventDraftEnvelopeSchema.safeParse(d.data);return e.success&&e.data.draftId===d.id&&e.data.base.id===request.eventId});
  if(existing.length){setChoices(existing.map(d=>d.id));return}create();
 },[w.ready,enabled,busy,request]);
 function update<K extends keyof CompanyEventDraftValues>(key:K,value:CompanyEventDraftValues[K]){
  if(locked||lock.current||!enabled)return;const saved=currentEnvelope();if(!saved||saved.record.status==='conflict')return;
  const next={...saved.envelope.values,[key]:value};ws.current.update(activeId,{...saved.envelope,values:next},title(next));clearAttempt();setFailure('');setCrmMessage('');setReviewedEvent(null);setSharedChoice('');
 }
 async function copy(){const d=ws.current.get(activeId);if(!d)return;try{await navigator.clipboard.writeText(JSON.stringify(d.data,null,2));setFailure('Hela ditt öppna underlag är kopierat.')}catch{setFailure('Kunde inte kopiera. Markera texten under hela det bevarade underlaget och kopiera den.')}}
 async function close(){if(lock.current||busy)return;if(!enabled||!activeId){onClose();return}lock.current=true;setOperation('close');setFailure('');try{if(!await ws.current.flush(activeId)){notice('Utkastet kunde inte sparas privat. Dina uppgifter finns kvar här. Försök igen eller behåll dem uttryckligen på denna enhet.');return}if(alive.current)onClose()}finally{lock.current=false;if(alive.current)setOperation('')}}
 function closeLocally(){if(lock.current||busy||!enabled)return;if(!ws.current.hasLocalCopy(activeId)){notice('En oförändrad lokal reservkopia kunde inte återläsas. Panelen är kvar. Kopiera underlaget innan du lämnar sidan.');return}onClose()}
 async function submit(){
  if(lock.current||busy||!enabled||!envelope||!retryAttempt.current&&(conflict||missing||privateConflict))return;
  lock.current=true;setOperation('publish');setFailure('');setCrmMessage('');
  try{
   let attempt=retryAttempt.current;
   if(!attempt){
    if(!await ws.current.reconcile(activeId)){notice('Det privata utkastet behöver granskas. Dina öppna uppgifter finns kvar.');return}
    const reference=await ws.current.flush(activeId);if(!alive.current)return;if(!reference){notice('Utkastet kunde inte sparas privat. Kalendern har inte ändrats av detta försök.');return}
    const saved=currentEnvelope();if(!saved||saved.record.status!=='saved'||saved.record.revision!==reference.revision){notice('Utkastet hann ändras. Kontrollera den sparade versionen.');return}
    const currentBasis=companyEventBasis(state.current,saved.envelope.base.id);if(currentBasis!==saved.envelope.expectedContext||saved.envelope.base.id&&!state.current.companyEvents.some(e=>e.id===saved.envelope.base.id)){notice('Företagsaktiviteten har ändrats eller saknas. Granska det aktuella underlaget först.');return}
    attempt={data:{...structuredClone(saved.envelope.values),expectedContext:saved.envelope.expectedContext,draft:reference}};retryAttempt.current=attempt;setRetry(attempt);
   }
   let code=0;
   const ok=await publish(attempt.data,(status,message)=>{code=status;if(alive.current)setCrmMessage(message||'Ingen bekräftad sparning i företagskalendern. Dina uppgifter finns kvar.')});
   if(!alive.current)return;
   if(ok){ws.current.consume(activeId);clearAttempt();onClose();return}
   if(code>0&&code<500){clearAttempt();if(code===409)await ws.current.reconcile(activeId)}
   if(!code||code>=500)setCrmMessage('Sparningen i företagskalendern kunde inte bekräftas. Den kan redan ha lyckats. Försök samma sparning igen; uppgifterna och begäran behålls.');
  }finally{lock.current=false;if(alive.current)setOperation('')}
 }
 function choosePrivate(useServer:boolean){
  if(locked||lock.current||privateChoice!==choiceBasis)return;const latest=currentEnvelope();if(!latest||latest.record.status!=='conflict'||recordBasis({id:latest.record.id,generation:latest.record.generation,data:latest.record.data,server:latest.record.server})!==choiceBasis)return;
  const version=companyEventDraftServerVersion(latest.record.server,activeId,request.eventId);
  if(latest.record.server&&!version||version?.archived||useServer&&!version){notice('Den privata serverversionen är inte ett giltigt aktivt utkast. Dina uppgifter finns kvar för kopiering.');return}
  ws.current.resolve(activeId,useServer);clearAttempt();setFailure(useServer?'Den visade serverversionen är vald. Kalendern är oförändrad.':'Dina öppna uppgifter är valda för en ny privat sparversion. Kalendern är oförändrad.');setPrivateChoice('');
 }
 function adoptShared(){
  if(locked||lock.current||sharedChoice!==sharedBasis||!reviewedEvent)return;const latest=currentEnvelope(),actual=state.current.companyEvents.find(e=>e.id===request.eventId);
  if(!latest||latest.record.status==='conflict'||!actual||recordBasis(actual)!==recordBasis(reviewedEvent)||recordBasis({id:latest.record.id,generation:latest.record.generation,data:latest.record.data,basis:companyEventBasis(state.current,request.eventId),reviewedEvent})!==sharedBasis){notice('Underlaget hann ändras. Granska den aktuella aktiviteten igen.');return}
  ws.current.update(activeId,{...latest.envelope,base:structuredClone(actual),initialData:recordBasis(actual),expectedContext:recordBasis(actual)});clearAttempt();setReviewedEvent(null);setSharedChoice('');setFailure('Det granskade underlaget används. Dina öppna uppgifter bevaras i det privata utkastet; kalendern är oförändrad.');
 }
 async function remove(){if(lock.current||busy||!enabled)return;lock.current=true;setOperation('archive');try{if(await ws.current.archive(activeId)){if(alive.current)onClose()}else notice('Utkastet kunde inte tas bort. Dina uppgifter finns kvar.')}finally{lock.current=false;if(alive.current)setOperation('')}}
 function focusIn(e:FocusEvent<HTMLDivElement>){const target=e.target as HTMLElement;requestAnimationFrame(()=>{const scroller=panel.current;if(!scroller||!target.isConnected||!scroller.contains(target))return;const p=scroller.getBoundingClientRect(),top=status.current?.getBoundingClientRect(),bottom=footer.current?.getBoundingClientRect(),r=target.getBoundingClientRect();const low=Math.max(p.top+8,top&&getComputedStyle(status.current!).position==='sticky'?top.bottom+8:p.top+8),high=Math.min(p.bottom-8,bottom&&getComputedStyle(footer.current!).position==='sticky'?bottom.top-8:p.bottom-8);if(high<=low)return;if(r.top<low)scroller.scrollTop-=low-r.top;else if(r.bottom>high)scroller.scrollTop+=r.bottom-high})}
 const statusText=!w.ready?w.error?'Ditt privata utkast kunde inte hämtas':'Hämtar ditt privata utkast…':!local?'Välj eller öppna ett privat utkast':!envelope?'Det bevarade underlaget kunde inte läsas':local.status==='saved'?'Privat utkast sparat':local.status==='saving'?'Sparar privat utkast…':local.status==='pending'?'Privata ändringar väntar på sparning':privateConflict?'Granska privata utkastversioner':'Det privata utkastet kunde inte sparas';
 return <Sheet open onOpenChange={v=>{if(!v&&!locked)void close()}}><SheetContent ref={panel} className="crm-sheet event-draft-editor" showCloseButton={!locked} onFocusCapture={focusIn} onEscapeKeyDown={e=>{if(locked)e.preventDefault()}} onPointerDownOutside={e=>{if(locked)e.preventDefault()}}><SheetHeader><SheetTitle>Företagsaktivitet</SheetTitle><SheetDescription>Privat utkast · bara synligt för dig. Teamet ser aktiviteten först när du sparar i företagskalendern. Kalenderinbjudningar skickas inte.</SheetDescription></SheetHeader>
 {!enabled?<div className="sheet-body"><p role="alert">Privata aktivitetsutkast kräver sälj- eller administratörsbehörighet.</p><Button onClick={onClose}>Stäng</Button></div>:<><div ref={status} tabIndex={-1} className="event-draft-status" aria-label="Sparstatus för företagsaktivitet"><div role="status" aria-live="polite" aria-atomic="true"><strong>{statusText}</strong><span>{operation==='publish'?'Kontrollerar sparning i företagskalendern…':crmMessage||failure||'Utkastet ändrar inte teamets kalender.'}</span></div><div className="event-draft-actions">{!w.ready&&w.error&&<Button variant="outline" disabled={locked} onClick={w.retry}>Hämta utkast igen</Button>}{local?.status==='error'&&<Button variant="outline" disabled={locked} onClick={()=>void w.flush(activeId)}>Försök spara utkast</Button>}{privateConflict&&<Button variant="outline" disabled={locked} onClick={()=>reveal(privateDetails.current)}>Granska utkastversioner</Button>}{conflict&&!privateConflict&&<Button variant="outline" disabled={locked} onClick={()=>reveal(sharedDetails.current)}>Granska kalenderunderlaget</Button>}</div></div>
 <div className="sheet-body business-ui">{!activeId&&choices.length>0&&<section className="event-draft-card"><h3>Fortsätt ett privat utkast</h3><p>Välj rätt underlag. Datum och förberedelser kan skilja sig även när rubriken är samma.</p>{choices.map(id=>{const d=w.records.find(d=>d.id===id);return d?<article className="event-draft-card" key={id}><h4>{d.title}</h4><CompanyEventDraftPreview draft={d}/><Button disabled={locked} onClick={()=>void resume(id)}>Fortsätt detta utkast</Button></article>:null})}<Button variant="outline" disabled={locked} onClick={create}>Börja på ett nytt utkast</Button></section>}
 {local&&<><DraftStatus id={activeId} allowActions={false}/><details className="event-draft-raw"><summary>Visa hela mitt bevarade underlag</summary><pre>{JSON.stringify(local.data,null,2)}</pre><Button variant="outline" disabled={locked} onClick={()=>void copy()}>Kopiera hela mitt underlag</Button></details>{!envelope&&<p role="alert">Formatet eller aktivitetskopplingen stämmer inte. Uppgifterna har inte ersatts; kopiera underlaget för återhämtning.</p>}</>}
 {envelope&&<><fieldset disabled={locked||privateConflict} className="event-draft-fields"><F label="Rubrik"><Input maxLength={200} value={values!.title} onChange={e=>update('title',e.target.value)}/></F><div className="biz-grid"><F label="Startdatum"><Input type="date" value={values!.date} onChange={e=>update('date',e.target.value)}/></F><F label="Slutdatum, valfritt"><Input type="date" value={values!.endDate} onChange={e=>update('endDate',e.target.value)}/></F><F label="Ansvarig"><Pick label="Ansvarig" value={values!.owner} items={owners} onChange={v=>update('owner',v)}/></F><F label="Kategori"><Pick label="Kategori" value={values!.category} items={eventCategories} onChange={v=>update('category',v as CompanyEventDraftValues['category'])}/></F></div><F label="Status"><Pick label="Status" value={values!.status} items={eventStatuses} onChange={v=>update('status',v as CompanyEventDraftValues['status'])}/></F><F label="Planering och anteckningar"><Textarea maxLength={4000} value={values!.notes} onChange={e=>update('notes',e.target.value)}/></F><h3>Förberedelser</h3><p>Ofärdiga rader kan sparas privat. Fyll i ansvar, text och datum innan du sparar i företagskalendern.</p>{values!.checklist.map((t,i)=><fieldset className="biz-group" key={t.id}><legend>Förberedelse {i+1}</legend><F label="Vad ska göras?"><Input maxLength={4000} value={t.title} onChange={e=>update('checklist',values!.checklist.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/></F><div className="biz-grid"><F label="Ansvarig"><Pick label="Ansvarig för förberedelse" value={t.owner} items={owners} onChange={v=>update('checklist',values!.checklist.map((x,j)=>j===i?{...x,owner:v}:x))}/></F><F label="Klart senast"><Input type="date" value={t.due} onChange={e=>update('checklist',values!.checklist.map((x,j)=>j===i?{...x,due:e.target.value}:x))}/></F></div><label className="event-draft-choice"><Checkbox checked={t.done} onCheckedChange={v=>update('checklist',values!.checklist.map((x,j)=>j===i?{...x,done:v===true}:x))}/><span>Förberedelsen är klar</span></label><Button variant="ghost" onClick={()=>update('checklist',values!.checklist.filter((_,j)=>j!==i))}>Ta bort förberedelse {i+1}</Button></fieldset>)}<Button variant="outline" disabled={values!.checklist.length>=50} onClick={()=>update('checklist',[...values!.checklist,{id:crypto.randomUUID(),title:'',owner:values!.owner,due:values!.date,done:false}])}>Lägg till förberedelse</Button></fieldset>
 {privateConflict&&<section ref={privateDetails} tabIndex={-1} className="event-draft-card"><h3>En annan privat version finns</h3><p>Jämför hela underlaget innan du väljer. Kalendern ändras inte av valet.</p><div className="event-draft-comparison"><section><h4>Mitt öppna underlag</h4><CompanyEventSnapshot values={values!}/></section><section><h4>Sparad privat serverversion</h4>{server?<><CompanyEventDraftPreview draft={server}/>{server.archived&&<p>Serverutkastet är avslutat. Dina öppna uppgifter finns kvar för kopiering.</p>}</>:<p>{local.server?'Serverversionens format eller koppling kunde inte läsas.':'Ingen privat serverversion hittades.'}</p>}</section></div>{!server?.archived&&(!local.server||server)&&<><label className="event-draft-choice"><Checkbox disabled={locked} checked={privateChoice===choiceBasis} onCheckedChange={v=>setPrivateChoice(v===true?choiceBasis:'')}/><span>Jag har jämfört de privata versionerna och vill välja underlag.</span></label><div className="event-draft-actions">{server&&<Button variant="outline" disabled={locked||privateChoice!==choiceBasis} onClick={()=>choosePrivate(true)}>Använd den visade serverversionen</Button>}<Button disabled={locked||privateChoice!==choiceBasis} onClick={()=>choosePrivate(false)}>Spara mina uppgifter som ny utkastversion</Button></div></>}</section>}
 {(conflict||missing)&&!privateConflict&&<section ref={sharedDetails} tabIndex={-1} className="event-draft-card"><h3>{missing?'Aktiviteten finns inte längre':'Teamets aktivitet har ändrats'}</h3><p>Ditt privata underlag finns kvar. Automatisk omläsning ersätter inte det ursprungliga underlaget.</p><CompanyEventSnapshot values={envelope.base}/>{current&&<><Button variant="outline" disabled={locked} onClick={()=>{setReviewedEvent(structuredClone(current));setSharedChoice('')}}>Granska aktuell aktivitet</Button>{reviewedEvent&&recordBasis(reviewedEvent)===basis&&<><h4>Aktuell aktivitet i företagskalendern</h4><CompanyEventSnapshot values={reviewedEvent}/><label className="event-draft-choice"><Checkbox disabled={locked} checked={sharedChoice===sharedBasis} onCheckedChange={v=>setSharedChoice(v===true?sharedBasis:'')}/><span>Jag har jämfört mina uppgifter med den aktuella aktiviteten.</span></label><Button disabled={locked||sharedChoice!==sharedBasis} onClick={adoptShared}>Använd aktuellt underlag och behåll mina uppgifter</Button></>}</>}</section>}
 <div className="event-draft-actions"><Button variant="ghost" disabled={locked||privateConflict} onClick={()=>setDiscard(true)}>Ta bort privat utkast</Button>{discard&&<><p>Detta tar bort det privata utkastet. Teamets aktivitet ändras inte.</p><Button variant="outline" disabled={locked||privateConflict} onClick={()=>void remove()}>Ja, ta bort utkast</Button><Button variant="ghost" disabled={locked} onClick={()=>setDiscard(false)}>Behåll utkast</Button></>}</div></>}
 {(local?.status==='error'||privateConflict)&&<section className="event-draft-card"><p>Du kan behålla en återläst lokal reservkopia. Den skyddar inte mot rensad enhetslagring och är ingen bekräftad serversparning.</p><Button variant="outline" disabled={locked} onClick={closeLocally}>Stäng och behåll på denna enhet</Button></section>}
 {(failure||crmMessage)&&<div className="event-draft-message" role="alert">{crmMessage||failure}</div>}
 <div ref={footer} className="event-draft-footer"><Button variant="outline" disabled={locked} onClick={()=>void close()}>Spara utkast & stäng</Button><Button disabled={locked||!envelope||!retry&&(conflict||missing||privateConflict)} onClick={()=>void submit()}>{operation==='publish'?'Sparar i företagskalendern…':retry?'Försök samma kalendersparning igen':'Spara i företagskalendern'}</Button></div></div></>}
 </SheetContent></Sheet>;
}
