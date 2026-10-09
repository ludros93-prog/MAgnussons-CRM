'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,ArrowRightLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {recordBasis} from '@/lib/record-conflicts';
import {yearwheelResponsibilityBasis} from '@/lib/yearwheel-responsibility';
import {YearwheelResponsibilityDraftEnvelopeSchema,createYearwheelResponsibilityDraft,yearwheelResponsibilityDraftContext,yearwheelResponsibilityDraftSnapshot,yearwheelResponsibilityDraftServerVersion,adoptYearwheelResponsibilityDraftContext,isYearwheelResponsibilityDraft,type YearwheelResponsibilityDraftEnvelope,type YearwheelResponsibilityDraftValues} from '@/lib/yearwheel-responsibility-drafts';
import type {State,Task} from '@/lib/crm';
import {BusinessField as F,displayDate} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';
import {useDrafts} from './draft-workspace';
import {YearwheelResponsibilityDraftPreview,YearwheelResponsibilityContextSnapshot,YearwheelResponsibilityIntentSnapshot} from './yearwheel-responsibility-draft-preview';

export type YearwheelResponsibilitySave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props={st:State;customerId:string;needId:string;space:string;save:YearwheelResponsibilitySave;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null;resumeDraftId?:string};
type Context=ReturnType<typeof yearwheelResponsibilityDraftContext>;
type Attempt={customerId:string;needId:string;values:YearwheelResponsibilityDraftValues;reviewed:true;expectedContext:string;draft:{id:string;revision:number}};
const identityFor=(st:State,space:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'']);
const profileLabel=(profile:{displayName:string;legacyOwnerName:string})=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const draftTitle=(e:YearwheelResponsibilityDraftEnvelope)=>('Överlämning · '+e.context.customer.name+' · '+e.context.need.title).slice(0,200);
const taskMeta=(task:Task)=>displayDate(task.due)+' · ansvarig '+task.owner;
function capture(st:State,customerId:string,needId:string,resumeDraftId?:string){
 if(resumeDraftId||st.viewer?.role!=='admin')return null;
 try{return createYearwheelResponsibilityDraft(st,customerId,needId,crypto.randomUUID())}catch{return null}
}

export function YearwheelResponsibilityDialog({st,customerId,needId,space,save,busy,refresh,onClose,returnFocus,resumeDraftId}:Props){
 const w=useDrafts(),admin=st.viewer?.role==='admin',enabled=['admin','seller'].includes(st.viewer?.role||''),identity=identityFor(st,space),selectedProfileDescriptionId=useId();
 // The opened CRM version is captured before the private workspace finishes loading.
 const [capturedOpening]=useState(()=>capture(st,customerId,needId,resumeDraftId));
 const opening=useRef(capturedOpening),openingIdentity=useRef(identity),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const initialized=useRef(false),lock=useRef(false),alive=useRef(true),epoch=useRef(0),ws=useRef(w),state=useRef(st),attemptRef=useRef<Attempt|null>(null);
 const opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null),titleRef=useRef<HTMLHeadingElement>(null);
 const fallback=useRef<HTMLElement|null>(typeof document==='undefined'?null:opener.current?.closest('.yearwheel')?.querySelector<HTMLElement>('.yearwheel-heading')||document.querySelector('.yearwheel-heading'));
 const panel=useRef<HTMLDivElement>(null),status=useRef<HTMLDivElement>(null),footer=useRef<HTMLDivElement>(null),privateDetails=useRef<HTMLElement>(null),sharedDetails=useRef<HTMLElement>(null);
 const [activeId,setActiveId]=useState(resumeDraftId||''),[choices,setChoices]=useState<string[]>([]),[operation,setOperation]=useState(''),[failure,setFailure]=useState(''),[crmMessage,setCrmMessage]=useState(''),[copyMessage,setCopyMessage]=useState(''),[discard,setDiscard]=useState(false);
 const [fetched,setFetched]=useState<State|null>(null),[reviewedContext,setReviewedContext]=useState<Context|null>(null),[privateChoice,setPrivateChoice]=useState(''),[sharedChoice,setSharedChoice]=useState(''),[reviewed,setReviewed]=useState(''),[retry,setRetry]=useState<Attempt|null>(null);
 const latest=fetched&&fetched.version>st.version&&identityFor(fetched,space)===identity?fetched:st;ws.current=w;state.current=latest;
 const visible=enabled&&openingIdentity.current===identity,local=visible?w.records.find(d=>d.id===activeId&&isYearwheelResponsibilityDraft(d.kind,d.context)):undefined;
 const parsed=local?YearwheelResponsibilityDraftEnvelopeSchema.safeParse(local.data):null;
 const envelope=parsed?.success&&parsed.data.draftId===local?.id&&(!customerId||parsed.data.customerId===customerId)&&(!needId||parsed.data.needId===needId)?parsed.data:undefined,values=envelope?.values;
 const currentCustomerId=envelope?.customerId||customerId,currentNeedId=envelope?.needId||needId,context=yearwheelResponsibilityDraftContext(latest,currentCustomerId,currentNeedId),basis=yearwheelResponsibilityBasis(latest,currentCustomerId,currentNeedId);
 const missing=!!envelope&&(!context.customer||!context.need),conflict=!!envelope&&envelope.expectedContext!==basis,privateConflict=local?.status==='conflict',locked=busy||!!operation;
 const snapshot=envelope?yearwheelResponsibilityDraftSnapshot(envelope.context):null,need=snapshot?.need,target=snapshot?.targetProfiles.find(p=>p.id===values?.targetProfileId);
 const selected=snapshot?.eligible.filter(task=>values?.selectedTaskIds.includes(task.id))||[],leftEligible=snapshot?.eligible.filter(task=>!values?.selectedTaskIds.includes(task.id))||[];
 const excludedOpen=snapshot?.excluded.filter(row=>!row.task.done)||[],excludedDone=snapshot?.excluded.filter(row=>row.task.done)||[];
 const currentOwner=snapshot?.sourceProfile?profileLabel(snapshot.sourceProfile):need?.owner||'Ansvar saknas i underlaget',anchor=!!target&&!need?.ownerProfileId&&target.id===snapshot?.sourceProfile?.id;
 const canEdit=visible&&admin&&!missing,server=privateConflict?yearwheelResponsibilityDraftServerVersion(local.server,activeId,currentCustomerId||undefined,currentNeedId||undefined):null;
 const choiceBasis=recordBasis({id:local?.id,generation:local?.generation,data:local?.data,server:local?.server});
 const sharedBasis=recordBasis({id:local?.id,generation:local?.generation,data:local?.data,basis,reviewedContext});
 const reviewBasis=recordBasis({identity,id:local?.id,generation:local?.generation,data:local?.data,basis});
 const invalidSelected=values?.selectedTaskIds.filter(id=>!snapshot?.eligible.some(task=>task.id===id))||[];
 const canReview=canEdit&&!!target&&!!values?.reason.trim()&&!conflict&&!privateConflict&&!snapshot?.blockedReason&&!invalidSelected.length&&(values?.selectedTaskIds.length||0)<=500;
 const dialogTitle=!admin?'Läs ditt överlämningsutkast':need?.ownerProfileId?'Byt behovsansvar':'Förankra behovsansvar';
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++}},[]);
 useEffect(()=>{if(openingIdentity.current!==identity||!enabled){epoch.current++;onClose()}},[identity,enabled,onClose]);
 useEffect(()=>{setReviewed('');setPrivateChoice('');setSharedChoice('');setReviewedContext(null);setDiscard(false);attemptRef.current=null;setRetry(null)},[local?.generation]);
 useEffect(()=>setPrivateChoice(''),[choiceBasis]);
 useEffect(()=>setSharedChoice(''),[sharedBasis]);
 useEffect(()=>{
  if(!visible||!retry)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,retry]);
 useEffect(()=>{
  const node=panel.current,actions=footer.current,banner=status.current;if(!node||!actions||!banner)return;
  const measure=()=>{const bottom=actions.getBoundingClientRect().height,top=banner.getBoundingClientRect().height;node.style.setProperty('--yearwheel-handover-footer-height',bottom+'px');node.dataset.draftFlow=bottom+top>Math.min(window.innerHeight,node.getBoundingClientRect().height)/2?'true':'false'};
  measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(actions);observer?.observe(banner);window.addEventListener('resize',measure);
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);node.style.removeProperty('--yearwheel-handover-footer-height');delete node.dataset.draftFlow;};
 },[visible,activeId,!!envelope]);
 const stillHere=(started:string,token:number)=>alive.current&&currentIdentity.current===started&&epoch.current===token;
 function currentEnvelope(){const d=ws.current.get(activeId);if(!d||!isYearwheelResponsibilityDraft(d.kind,d.context))return null;const p=YearwheelResponsibilityDraftEnvelopeSchema.safeParse(d.data);return p.success&&p.data.draftId===d.id&&(!customerId||p.data.customerId===customerId)&&(!needId||p.data.needId===needId)?{record:d,envelope:p.data}:null}
 function clearAttempt(){attemptRef.current=null;setRetry(null)}
 function reveal(node:HTMLElement|null){if(!node?.isConnected)return;node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:'instant'})}
 function notice(message:string){if(!alive.current)return;setFailure(message);requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
 function create(){
  if(lock.current||busy||!admin||!visible||!ws.current.ready)return;
  if(!opening.current||openingIdentity.current!==identityFor(state.current,space)){notice('Kunden, behovet eller kontots ursprungliga underlag kunde inte läsas. Inget utkast har skapats.');return}
  const draftId=crypto.randomUUID(),e={...structuredClone(opening.current),draftId},id=ws.current.create('form','yearwheel_responsibility_transfer',e,draftTitle(e),draftId);
  if(id){setActiveId(id);setChoices([]);setReviewed('')}else notice('Ditt privata överlämningsutkast kunde inte öppnas. Försök hämta utkasten igen.');
 }
 async function resume(id:string){
  if(lock.current||busy||!visible)return;const started=identity,token=++epoch.current;lock.current=true;setOperation('open');setActiveId(id);setChoices([]);setReviewed('');
  try{await ws.current.reconcile(id);if(stillHere(started,token)&&!ws.current.get(id))notice('Det valda utkastet saknas eller är avslutat. Inget annat utkast har öppnats.')}finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 useEffect(()=>{
  if(initialized.current||!w.ready||!visible||busy)return;initialized.current=true;
  if(resumeDraftId){void resume(resumeDraftId);return}
  const existing=w.records.filter(d=>{if(!isYearwheelResponsibilityDraft(d.kind,d.context))return false;const p=YearwheelResponsibilityDraftEnvelopeSchema.safeParse(d.data);return p.success&&p.data.draftId===d.id&&p.data.customerId===customerId&&p.data.needId===needId});
  if(existing.length){setChoices(existing.map(d=>d.id));return}create();
 },[w.ready,visible,busy,resumeDraftId,customerId,needId]);
 function update(patch:Partial<YearwheelResponsibilityDraftValues>){
  if(locked||lock.current||!canEdit||retry)return;const saved=currentEnvelope();if(!saved||saved.record.status==='conflict')return;
  if(patch.selectedTaskIds&&patch.selectedTaskIds.length>500){notice('Högst 500 årshjulsuppgifter kan följa med. Välj bort en uppgift innan du väljer fler.');return}
  ws.current.update(activeId,{...saved.envelope,values:{...saved.envelope.values,...patch}},draftTitle(saved.envelope));setReviewed('');setFailure('');setCrmMessage('');setReviewedContext(null);setSharedChoice('');clearAttempt();
 }
 async function copy(){const d=ws.current.get(activeId);if(!d)return;try{await navigator.clipboard.writeText(JSON.stringify(d.data,null,2));if(alive.current)setCopyMessage('Hela ditt öppna underlag är kopierat.')}catch{if(alive.current)setCopyMessage('Kunde inte kopiera. Markera texten i hela det bevarade underlaget och kopiera den.')}}
 async function close(){
  if(lock.current||busy)return;
  if(attemptRef.current){notice('Överlämningen väntar på bekräftelse. Försök samma överlämning igen innan du stänger. Dina val finns kvar.');return}
  if(!visible||!activeId){onClose();return}const started=identity,token=++epoch.current;lock.current=true;setOperation('close');setFailure('');
  try{
   const d=ws.current.get(activeId),startedBody=d?recordBasis({kind:d.kind,context:d.context,title:d.title,data:d.data}):'';
   if(!admin&&d?.status!=='saved'){notice('Dina lokala uppgifter kan inte sparas med denna behörighet. Granska serverversionen eller behåll en återläst lokal kopia.');return}
   const reference=await ws.current.flush(activeId);if(!stillHere(started,token))return;
   if(!reference){notice('Utkastet kunde inte sparas privat. Din orsak och dina val finns kvar här. Försök igen eller behåll dem uttryckligen på denna enhet.');return}
   const current=ws.current.get(activeId);
   if(!d||!current||current.status!=='saved'||current.revision!==reference.revision||current.generation!==d.generation||recordBasis({kind:current.kind,context:current.context,title:current.title,data:current.data})!==startedBody){notice('Utkastet hann ändras före stängning. Dina senaste uppgifter finns kvar. Spara utkastet igen innan du stänger.');return}
   onClose();
  }finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 function closeLocally(){if(lock.current||busy||!visible)return;if(attemptRef.current){notice('Överlämningen väntar på bekräftelse. Försök samma överlämning igen innan du stänger. Dina val finns kvar.');return}if(!ws.current.hasLocalCopy(activeId)){notice('En oförändrad lokal reservkopia kunde inte återläsas. Dialogen är kvar. Kopiera underlaget innan du lämnar sidan.');return}onClose()}
 async function fetchCurrent(){
  if(lock.current||busy||!visible)return;const started=identity,token=++epoch.current;lock.current=true;setOperation('refresh');setFailure('');
  try{const fresh=await refresh();if(!stillHere(started,token))return;if(identityFor(fresh,space)!==started){notice('Kontot eller arbetsytan ändrades. Ditt ursprungliga privata underlag finns kvar.');return}setFetched(structuredClone(fresh));setReviewedContext(null);setSharedChoice('');notice('Aktuella CRM-uppgifter är hämtade. Ditt tidigare underlag är oförändrat tills du uttryckligen granskar och väljer aktuellt underlag.')}catch(e){if(stillHere(started,token))notice((e as Error).message||'Aktuellt underlag kunde inte hämtas. Din orsak och dina val finns kvar.')}finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 async function fetchPrivate(){
  if(lock.current||busy||!visible)return;const started=identity,token=++epoch.current;lock.current=true;setOperation('private');setFailure('');setPrivateChoice('');
  try{await ws.current.reconcile(activeId,true);if(stillHere(started,token)){const current=ws.current.get(activeId);if(current?.status==='error')notice(current.error||'Serverversionen kunde inte hämtas. Ditt öppna underlag finns kvar.');else requestAnimationFrame(()=>{if(stillHere(started,token))reveal(privateDetails.current)})}}finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 function choosePrivate(useServer:boolean){
  if(locked||lock.current||retry||privateChoice!==choiceBasis||!visible||!useServer&&!admin)return;
  const saved=currentEnvelope();if(!saved||saved.record.status!=='conflict'||recordBasis({id:saved.record.id,generation:saved.record.generation,data:saved.record.data,server:saved.record.server})!==choiceBasis)return;
  const version=yearwheelResponsibilityDraftServerVersion(saved.record.server,activeId,saved.envelope.customerId,saved.envelope.needId);
  if(saved.record.server&&!version||version?.archived||useServer&&!version){notice('Serverversionen är inte ett giltigt aktivt privat utkast. Dina uppgifter finns kvar för kopiering.');return}
  ws.current.resolve(activeId,useServer);setReviewed('');clearAttempt();setPrivateChoice('');setReviewedContext(null);notice(useServer?'Den visade serverversionen är vald. Granska överlämningen igen innan du sparar i CRM.':'Dina öppna uppgifter är valda för en ny privat sparversion. Granska överlämningen igen. CRM är oförändrat.');
 }
 function adoptShared(){
  if(locked||lock.current||!canEdit||retry||sharedChoice!==sharedBasis||!reviewedContext)return;
  const saved=currentEnvelope(),actual=yearwheelResponsibilityDraftContext(state.current,currentCustomerId,currentNeedId);
  if(!saved||saved.record.status==='conflict'||recordBasis(actual)!==recordBasis(reviewedContext)||recordBasis({id:saved.record.id,generation:saved.record.generation,data:saved.record.data,basis:recordBasis(actual),reviewedContext})!==sharedBasis){notice('Underlaget hann ändras. Granska aktuellt behovsansvar igen.');return}
  try{
   const next=adoptYearwheelResponsibilityDraftContext(saved.envelope,state.current),removed=saved.envelope.values.selectedTaskIds.filter(id=>!next.values.selectedTaskIds.includes(id));
   ws.current.update(activeId,next,draftTitle(next));setReviewed('');clearAttempt();setReviewedContext(null);setSharedChoice('');notice('Det granskade underlaget används. Orsaken och möjliga val bevaras privat. Granska överlämningen igen.'+(removed.length?' '+removed.length+' tidigare valda uppgifter kan inte längre följa med.':'')+(saved.envelope.values.targetProfileId&&!next.values.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
  }catch(e){notice((e as Error).message||'Underlaget kunde inte användas. Din orsak och dina val finns kvar.')}
 }
 async function submit(){
  if(lock.current||busy||!admin||!visible||!envelope||!attemptRef.current&&(!canReview||reviewed!==reviewBasis))return;
  const started=identity,token=++epoch.current;lock.current=true;setOperation('publish');setFailure('');setCrmMessage('');
  try{
   let attempt=attemptRef.current;
   if(!attempt){
    if(!await ws.current.reconcile(activeId)){if(stillHere(started,token))notice('Det privata utkastet behöver granskas. Din orsak och dina val finns kvar.');return}
    if(!stillHere(started,token))return;
    const reference=await ws.current.flush(activeId);if(!stillHere(started,token))return;
    if(!reference){notice('Utkastet kunde inte sparas privat. Överlämningen har inte skickats till CRM av detta försök.');return}
    const saved=currentEnvelope();
    if(!saved||saved.record.status!=='saved'||saved.record.revision!==reference.revision||saved.record.generation!==local?.generation||recordBasis(saved.envelope)!==recordBasis(envelope)){notice('Utkastet hann ändras. Granska den sparade versionen igen.');return}
    if(yearwheelResponsibilityBasis(state.current,saved.envelope.customerId,saved.envelope.needId)!==saved.envelope.expectedContext){notice('Behovet eller ansvarsunderlaget har ändrats. Granska aktuellt behovsansvar först.');return}
    attempt={customerId:saved.envelope.customerId,needId:saved.envelope.needId,values:structuredClone(saved.envelope.values),reviewed:true,expectedContext:saved.envelope.expectedContext,draft:reference};attemptRef.current=attempt;setRetry(attempt);
   }
   let code=0,message='';const ok=await save('yearwheel_responsibility_transfer',attempt,false,(status,text)=>{code=status;message=text||''});if(!stillHere(started,token))return;
   if(ok){ws.current.consume(activeId);clearAttempt();onClose();return}
   if(code>0&&code<500){clearAttempt();setReviewed('');setCrmMessage((message||'Överlämningen kunde inte sparas.')+' Din orsak och dina val finns kvar.'+(code===409?' Granska aktuellt privat utkast och behovsansvar innan du försöker igen.':''));if(code===409)await ws.current.reconcile(activeId)}
   else setCrmMessage('Överlämningen kunde inte bekräftas. Första försöket kan redan ha lyckats. Försök samma överlämning igen; exakt samma val och begäran behålls.');
  }catch(e){if(stillHere(started,token))setCrmMessage('Överlämningen kunde inte bekräftas. '+((e as Error).message||'')+' Första försöket kan redan ha lyckats. Försök samma överlämning igen.')}
  finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 async function remove(){
  if(lock.current||busy||!visible||privateConflict||!admin&&local?.status!=='saved')return;
  if(attemptRef.current){notice('Överlämningen väntar på bekräftelse. Försök samma överlämning igen innan du tar bort utkastet. Dina val finns kvar.');return}
  const started=identity,token=++epoch.current;lock.current=true;setOperation('archive');
  try{if(await ws.current.archive(activeId)){if(stillHere(started,token))onClose()}else if(stillHere(started,token))notice('Det privata utkastet kunde inte tas bort. Dina uppgifter finns kvar.')}finally{if(stillHere(started,token)){lock.current=false;setOperation('')}}
 }
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const control=event.target;if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,summary,[role=combobox]'))return;
  requestAnimationFrame(()=>{const sheet=panel.current;if(!alive.current||!sheet||!control.isConnected||document.activeElement!==control||!sheet.contains(control))return;const box=control.getBoundingClientRect(),bounds=sheet.getBoundingClientRect(),top=status.current?.getBoundingClientRect(),bottom=footer.current?.getBoundingClientRect(),low=Math.max(0,bounds.top)+12+(top&&getComputedStyle(status.current!).position==='sticky'?top.height:0),high=Math.min(window.innerHeight,bounds.bottom)-12-(bottom&&getComputedStyle(footer.current!).position==='sticky'?bottom.height:0);if(high<=low||box.height>high-low)return;if(box.top<low)sheet.scrollBy({top:box.top-low,behavior:'instant'});else if(box.bottom>high)sheet.scrollBy({top:box.bottom-high,behavior:'instant'})});
 }
 const statusText=!w.ready?w.error?'Ditt privata utkast kunde inte hämtas':'Hämtar ditt privata utkast…':!local?'Välj eller öppna ett privat utkast':!envelope?'Det bevarade underlaget kunde inte läsas':local.status==='saved'?'Privat utkast sparat':local.status==='saving'?'Sparar privat utkast…':local.status==='pending'?'Ändringar väntar på privat sparning':privateConflict?'Granska privata utkastversioner':'Det privata utkastet kunde inte sparas';
 return <Dialog open={visible} onOpenChange={value=>{if(!value&&!locked)void close()}}><DialogContent ref={panel} className="business-ui yearwheel-responsibility-dialog event-draft-editor yearwheel-handover-editor" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{if(titleRef.current){event.preventDefault();titleRef.current.focus({preventScroll:true})}}} onEscapeKeyDown={event=>{if(locked||lock.current)event.preventDefault()}} onInteractOutside={event=>{if(locked||lock.current)event.preventDefault()}} onCloseAutoFocus={event=>{if(returnFocus){restoreHandoverFocus(event,opener.current,returnFocus);return}if(currentIdentity.current!==openingIdentity.current){event.preventDefault();return}restoreHandoverFocus(event,opener.current,()=>fallback.current)}}>
  <DialogHeader><div className="yearwheel-responsibility-head"><DialogTitle ref={titleRef} tabIndex={-1}><ArrowRightLeft aria-hidden="true" size={19}/><span>{dialogTitle}</span></DialogTitle><Button type="button" variant="outline" disabled={locked} onClick={()=>void close()}>Stäng</Button></div><DialogDescription>Privat utkast · bara synligt för dig. Behovsansvaret ändras för teamet först när administratören granskar och sparar överlämningen i CRM.</DialogDescription></DialogHeader>
  <div ref={status} tabIndex={-1} className="event-draft-status" aria-label="Sparstatus för överlämningen"><div role="status" aria-live="polite" aria-atomic="true"><strong>{statusText}</strong><span>{operation==='publish'?'Kontrollerar sparning av behovsansvar i CRM…':operation==='close'?'Väntar på privat sparning innan dialogen stängs…':'Privat sparning ändrar inte behov eller uppgifter i CRM.'}</span></div><div className="event-draft-actions">{!w.ready&&w.error&&<Button type="button" variant="outline" disabled={locked} onClick={w.retry}>Hämta utkast igen</Button>}{local?.status==='error'&&admin&&<Button type="button" variant="outline" disabled={locked} onClick={()=>void w.flush(activeId)}>Försök spara utkast</Button>}{privateConflict&&<Button type="button" variant="outline" disabled={locked} onClick={()=>reveal(privateDetails.current)}>Granska utkastversioner</Button>}{conflict&&!privateConflict&&<Button type="button" variant="outline" disabled={locked} onClick={()=>reveal(sharedDetails.current)}>Granska aktuellt behovsansvar</Button>}{local&&(!admin||local.status==='error')&&!privateConflict&&<Button type="button" variant="outline" disabled={locked} onClick={()=>void fetchPrivate()}>Hämta sparad serverversion</Button>}</div>{local?.error&&<p>{local.error}</p>}{failure&&<p role="alert">{failure}</p>}</div>
  {!activeId&&choices.length>0&&<section className="event-draft-card"><h3>Fortsätt ett privat överlämningsutkast</h3><p>Välj rätt kund, behov och föreslagna ansvar. Ett annat utkast öppnas aldrig automatiskt.</p>{choices.map(id=>{const d=w.records.find(row=>row.id===id);return d?<article className="event-draft-card" key={id}><h4>{d.title}</h4><YearwheelResponsibilityDraftPreview draft={d}/><Button type="button" disabled={locked} onClick={()=>void resume(id)}>Fortsätt detta utkast</Button></article>:null})}{admin&&<Button type="button" variant="outline" disabled={locked} onClick={create}>Börja på ett nytt överlämningsutkast</Button>}</section>}
  {w.ready&&!local&&!choices.length&&<p role="alert">{failure||'Det valda privata utkastet kunde inte öppnas. Inget annat utkast har öppnats.'}</p>}
  {local&&<details className="event-draft-raw"><summary>Visa hela mitt bevarade underlag</summary><Textarea readOnly rows={8} aria-label="Hela mitt bevarade överlämningsunderlag" value={JSON.stringify(local.data,null,2)}/><Button type="button" variant="outline" disabled={locked} onClick={()=>void copy()}>Kopiera hela mitt underlag</Button><p role="status">{copyMessage}</p><p>Privat utkastreferens: {local.id} · ändrat: {local.updatedAt}.</p></details>}
  {local&&!envelope&&<p role="alert">Formatet eller kund- och behovskopplingen stämmer inte. Ditt bevarade underlag finns kvar för kopiering.</p>}
  {envelope&&snapshot&&<><form onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit()}}><fieldset disabled={locked||privateConflict||!canEdit||!!retry}>
   <section className="yearwheel-responsibility-current" aria-label="Nuvarande behovsansvar"><p><b>Kund:</b> {snapshot.customer?.name}</p><p><b>Inköpsbehov:</b> {need?.title}</p><p><b>Omfattning och förberedelser:</b> <span className="whitespace-pre-wrap">{need?.notes||'Ingen anteckning'}</span></p><p><b>Nuvarande ansvar:</b> {currentOwner}</p><p>Behövs hos kunden: {displayDate(need?.due||'')}.</p>{!need?.ownerProfileId&&<p className="biz-hint">Äldre ansvar behöver förankras. Välj den nuvarande profilen för att behålla samma person, eller en annan aktiv profil för att byta ansvar.</p>}<details><summary>Visa registrerad ansvarskoppling</summary><p>Ansvarsetikett: {need?.owner||'Saknas'}.</p><p>Sparat profil-ID: {need?.ownerProfileId||'Tomt · äldre ansvar'}.</p>{snapshot.sourceProfile&&<p>Granskad profil: {profileLabel(snapshot.sourceProfile)} · {snapshot.sourceProfile.id}. {snapshot.sourceProfile.active?'Aktiv profil.':'Inaktiv profil; ansvar kan lämnas över till en aktiv profil.'}</p>}</details></section>
   {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
   <F label="Ansvarig efter ändringen *"><Select value={values!.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="yearwheel-responsibility-select" aria-label="Ansvarig efter ändringen" aria-describedby={target?selectedProfileDescriptionId:undefined}><SelectValue><span className="yearwheel-responsibility-choice-label">{target?target.displayName:values!.targetProfileId?'Bevarat profilval behöver granskas':'Välj ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="yearwheel-responsibility-options"><SelectItem value="_none">Välj ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id}>{profileLabel(profile)}</SelectItem>)}</SelectContent></Select></F>
   {target&&<div id={selectedProfileDescriptionId} className="biz-hint"><p><b>Vald ansvarig:</b> {profileLabel(target)}. Aktiv profil.</p><details><summary>Visa vald profilreferens</summary><p>Profil-ID: {target.id}.</p></details></div>}
   <F label="Varför ändras behovsansvaret? *"><Textarea rows={3} maxLength={4000} placeholder="Beskriv varför ansvaret förankras eller byts." value={values!.reason} onChange={event=>update({reason:event.target.value})}/></F>
   <section className="biz-group" aria-label="Behovsuppgifter som kan följa med"><h3>Uppgifter som kan följa med ({snapshot.eligible.length})</h3><p className="biz-hint">Ingen uppgift är vald från början. Välj de öppna årshjulsuppgifter som ska få samma ansvariga.</p>{snapshot.eligible.map(task=><label className="check-field" key={task.id}><Checkbox aria-label={'Flytta årshjulsuppgiften '+task.title} checked={values!.selectedTaskIds.includes(task.id)} onCheckedChange={value=>update({selectedTaskIds:value===true?[...values!.selectedTaskIds.filter(id=>id!==task.id),task.id]:values!.selectedTaskIds.filter(id=>id!==task.id)})}/><span><b>{task.title}</b><small>{taskMeta(task)}</small></span></label>)}{!snapshot.eligible.length&&<p>Inga öppna årshjulsuppgifter kan följa med.</p>}</section>
   <details className="biz-details"><summary>Uppgifter som ligger kvar ({leftEligible.length+excludedOpen.length} öppna)</summary>{leftEligible.map(task=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>Ligger kvar eftersom den inte är vald.</small></article>)}{excludedOpen.map(({task,reason})=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>{reason}</small></article>)}{!!excludedDone.length&&<p>{excludedDone.length} avslutade uppgifter behåller sitt historiska ansvar.</p>}</details>
   <section className="biz-callout" aria-label="Granska behovsansvaret"><h3>Granska ändringen</h3><p><b>{snapshot.customer?.name}:</b> {need?.title}.</p><p><b>Behovsansvar:</b> {currentOwner} → {target?profileLabel(target):'välj ansvarig'}.</p><p>{anchor?'Samma person behåller ansvaret; den äldre kopplingen förankras i personens profil.':'Årshjulsbehovet får den valda ansvariga.'}</p><p><b>{selected.length} valda uppgifter följer med.</b> {leftEligible.length+excludedOpen.length} öppna uppgifter ligger kvar.</p>{selected.map(task=><p key={task.id}>{task.title} · {displayDate(task.due)} · {task.owner} → {target?profileLabel(target):'välj ansvarig'}.</p>)}<p className="whitespace-pre-wrap">Orsak: {values!.reason||'ange en orsak'}</p><details><summary>Vad behåller sitt registrerade underlag?</summary><p>Kundansvar, affär, order, onboarding, kundärenden, möten, andra årshjulsbehov och historiska försäljningsresultat behåller sina ansvariga. Behovets text, status, leveransdatum, framförhållning och upprepning ligger kvar. Ingen kundkontakt registreras.</p></details><label className="check-field"><Checkbox aria-label="Jag har granskat behovsansvaret" disabled={!canReview} checked={reviewed===reviewBasis&&canReview} onCheckedChange={value=>{if(!locked&&!lock.current&&canReview)setReviewed(value===true?reviewBasis:'')}}/><span>Jag har granskat ansvarig, orsak och exakt vilka årshjulsuppgifter som följer med.</span></label></section>
   {values!.selectedTaskIds.length>500&&<p className="error" role="alert">Högst 500 årshjulsuppgifter kan följa med. Välj bort uppgifter och granska igen.</p>}
   {!!invalidSelected.length&&<p className="error" role="alert">{invalidSelected.length} bevarade uppgiftsval kan inte följa med enligt det här underlaget. Granska aktuellt behovsansvar innan du sparar överlämningen.</p>}
  </fieldset></form>
  {!admin&&<p className="biz-callout" role="status">Ditt konto kan läsa och kopiera ditt eget överlämningsutkast. En administratör måste granska och spara behovsansvaret. Dina öppna uppgifter har inte ersatts.</p>}
  {retry&&<p className="biz-callout">En tidigare CRM-sparning väntar på bekräftelse. Valen hålls kvar för exakt återförsök. Ett avslutat privat utkast är inte i sig bevis på att överlämningen har registrerats.</p>}
  {privateConflict&&<section ref={privateDetails} tabIndex={-1} className="event-draft-card yearwheel-private-comparison"><h3>Granska dina privata utkastversioner</h3><p>Jämför hela orsaken, valen och deras granskningsunderlag innan du väljer. Versionsvalet ändrar inte CRM.</p><Button type="button" variant="outline" disabled={locked} onClick={()=>void fetchPrivate()}>Hämta sparad serverversion</Button><div className="event-draft-comparison"><section aria-label="Mitt öppna privata underlag"><h4>Mitt öppna underlag</h4><YearwheelResponsibilityIntentSnapshot values={values!} context={envelope.context}/><YearwheelResponsibilityContextSnapshot context={envelope.context}/></section><section aria-label="Sparad privat serverversion"><h4>Sparad privat serverversion</h4>{server?<><YearwheelResponsibilityDraftPreview draft={server}/>{server.archived&&<p>Serverutkastet är avslutat. Det bevisar inte att överlämningen har sparats i CRM. Ditt öppna underlag finns kvar för kopiering.</p>}</>:<><p>{local.server?'Serverversionens format eller koppling kunde inte läsas.':'Ingen privat serverversion hittades.'}</p>{local.server&&<pre>{JSON.stringify(local.server.data,null,2)}</pre>}</>}</section></div>{!server?.archived&&(!local.server||server)&&<><label className="check-field"><Checkbox disabled={locked||!!retry} checked={privateChoice===choiceBasis} onCheckedChange={value=>setPrivateChoice(value===true?choiceBasis:'')}/><span>Jag har jämfört de privata versionerna och vill välja underlag.</span></label><div className="event-draft-actions">{server&&<Button type="button" variant="outline" disabled={locked||!!retry||privateChoice!==choiceBasis} onClick={()=>choosePrivate(true)}>Använd den visade serverversionen</Button>}{admin&&<Button type="button" disabled={locked||!!retry||privateChoice!==choiceBasis} onClick={()=>choosePrivate(false)}>Spara mina uppgifter som ny utkastversion</Button>}</div></>}</section>}
  {(conflict||missing)&&!privateConflict&&<section ref={sharedDetails} tabIndex={-1} className="event-draft-card yearwheel-shared-comparison"><h3><AlertTriangle aria-hidden="true" size={16}/>{missing?'Kunden eller behovet finns inte längre':'CRM-underlaget har ändrats'}</h3><p>Din orsak och dina val finns kvar med sitt tidigare underlag. Jämför behovsansvar, profiler och uppgifter innan du väljer aktuellt underlag.</p><div className="event-draft-comparison"><section aria-label="Tidigare CRM-underlag"><h4>Tidigare CRM-underlag</h4><YearwheelResponsibilityContextSnapshot context={envelope.context}/><YearwheelResponsibilityIntentSnapshot values={values!} context={envelope.context}/></section><section aria-label="Aktuellt CRM-underlag"><h4>Aktuellt CRM-underlag</h4><YearwheelResponsibilityContextSnapshot context={context}/></section></div><Button type="button" variant="outline" disabled={locked} onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button>{!missing&&admin&&!retry&&<><Button type="button" variant="outline" disabled={locked} onClick={()=>{setReviewedContext(structuredClone(context));setSharedChoice('');setReviewed('')}}>Granska aktuellt CRM-underlag</Button>{reviewedContext&&recordBasis(reviewedContext)===basis&&<><YearwheelResponsibilityContextSnapshot context={reviewedContext}/><label className="check-field"><Checkbox disabled={locked} checked={sharedChoice===sharedBasis} onCheckedChange={value=>setSharedChoice(value===true?sharedBasis:'')}/><span>Jag har jämfört kunden, behovsansvaret, profilerna och uppgifterna med mina föreslagna val.</span></label><Button type="button" disabled={locked||sharedChoice!==sharedBasis} onClick={adoptShared}>Läs in nytt granskningsunderlag</Button></>}</>}{missing&&<p>Behovet kan inte lämnas över eller återskapas från detta utkast. Kopiera ditt bevarade underlag.</p>}</section>}
  {!conflict&&!privateConflict&&<details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar utkastets tidigare underlag. Om det har ändrats behöver du jämföra och uttryckligen välja aktuell version.</p><Button type="button" variant="outline" disabled={locked} onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button></details>}
  {!!need?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ansvarsändringar ({need.responsibilityTransfers.length})</summary>{[...need.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.action==='anchor'?'Förankrat ansvar':'Bytt ansvar'} · {row.fromDisplayName} → {row.toDisplayName}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>{row.selectedTaskIds.length} valda årshjulsuppgifter.</small></article>)}</details>}
  {!privateConflict&&(admin||local?.status==='saved')&&<div className="event-draft-actions"><Button type="button" variant="ghost" disabled={locked||!!retry} onClick={()=>setDiscard(true)}>Ta bort privat utkast</Button>{discard&&<><p>Detta avslutar bara det privata utkastet. Det ändrar inte behovsansvaret och återställer inte en tidigare CRM-sparning.</p><Button type="button" variant="outline" disabled={locked||!!retry} onClick={()=>void remove()}>Ja, ta bort utkast</Button><Button type="button" variant="ghost" disabled={locked} onClick={()=>setDiscard(false)}>Behåll utkast</Button></>}</div>}
  </>}
  {local&&(local.status==='error'||privateConflict||!envelope||!admin&&local.status!=='saved')&&<section className="event-draft-card"><p>En återläst lokal reservkopia finns bara på denna enhet. Den är ingen bekräftad serversparning och skyddar inte mot rensad enhetslagring.</p><Button type="button" variant="outline" disabled={locked} onClick={closeLocally}>Stäng och behåll på denna enhet</Button></section>}
  {crmMessage&&<div className="event-draft-message" role="alert" aria-label="Besked från CRM-sparningen">{crmMessage}</div>}
  <div ref={footer} className="event-draft-footer"><Button type="button" variant="outline" disabled={locked} onClick={()=>void close()}>{!admin&&local?.status==='saved'?'Stäng':!activeId?'Stäng':'Spara utkast & stäng'}</Button>{admin&&local&&<Button type="button" disabled={locked||!envelope||!retry&&(!canReview||reviewed!==reviewBasis)} onClick={()=>void submit()}>{operation==='publish'?'Sparar behovsansvar…':retry?'Försök samma överlämning igen':anchor?'Spara förankrat behovsansvar':'Spara nytt behovsansvar'}</Button>}</div>
 </DialogContent></Dialog>;
}
