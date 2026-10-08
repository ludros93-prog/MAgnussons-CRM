'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,ArrowRightLeft} from 'lucide-react';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {productionAssignmentBasis,type ProductionAssignmentReview,type ProductionAssignmentCandidate} from '@/lib/production-assignment';
import {productionProgress} from '@/lib/production-quantities';
import type {State,Order} from '@/lib/crm';
import {BusinessField as F,displayDate} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';

export type ProductionAssignmentSave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props={st:State;orderId:string;space:string;save:ProductionAssignmentSave;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null};
type Snapshot={order:Order|null;customerName:string;jobTitle:string};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;review:ProductionAssignmentReview|null;targetMemberId:string;reason:string;reviewed:boolean};
type Fetched={state:State;review:ProductionAssignmentReview};
const roleLabels={admin:'Administratör',production:'Tryck & leverans',print:'Tryck',warehouse:'Lager & leverans'};
const statuses={draft:'Ej lämnad till produktion',submitted:'Aktiv arbetsorder',printed:'Färdigtryckt',dispatched:'Skickad',cancelled:'Avbruten'};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,orderId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',orderId]);
const candidateLabel=(candidate:ProductionAssignmentCandidate)=>candidate.name+' · '+roleLabels[candidate.role]+' · Konto '+candidate.memberId;
const ReviewSchema=z.object({
 orderId:z.string().min(1).max(100),workId:z.string().min(1).max(100),
 expectedContext:z.string().min(1).max(3000000),blockedReason:z.string().max(4000),
 candidates:z.array(z.object({memberId:z.string().min(1).max(100),name:z.string().min(1).max(150).refine(name=>!!name.trim()),role:z.enum(['admin','production','print','warehouse']),expectedTarget:z.string().regex(/^[0-9a-f]{64}$/)})).max(1000)
}).refine(review=>new Set(review.candidates.map(candidate=>candidate.memberId)).size===review.candidates.length);
function snapshotFor(st:State,orderId:string):Snapshot{
 const order=st.orders.find(item=>item.id===orderId)||null;
 return structuredClone({order,customerName:st.customers.find(item=>item.id===order?.customerId)?.name||'Kunden saknas i underlaget',jobTitle:st.deals.find(item=>item.id===order?.dealId)?.title||'Arbetsorder'});
}
async function readAccounts(space:string,orderId:string,workId:string,signal?:AbortSignal):Promise<ProductionAssignmentReview>{
 const response=await fetch('/api/crm/production-assignment?'+new URLSearchParams({space,orderId,workId}),{cache:'no-store',signal});
 let data:unknown;
 try{data=await response.json();}catch{throw Error('Kontolistan kunde inte läsas. Hämta aktuellt underlag och försök igen.');}
 if(!response.ok)throw Error(typeof (data as {error?:unknown})?.error==='string'?(data as {error:string}).error:'Tillgängliga produktionskonton kunde inte hämtas.');
 const parsed=ReviewSchema.safeParse(data);
 if(!parsed.success||parsed.data.orderId!==orderId||parsed.data.workId!==workId)throw Error('Kontolistan kunde inte läsas. Hämta aktuellt underlag och försök igen.');
 return parsed.data;
}

export function ProductionAssignmentDialog({st,orderId,space,save,busy,refresh,onClose,returnFocus}:Props){
 const identity=identityFor(st,space,orderId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=productionAssignmentBasis(st,orderId),admin=st.viewer?.role==='admin',targetDescriptionId=useId(),heading=useRef<HTMLHeadingElement|null>(null);
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:snapshotFor(st,orderId),review:null,targetMemberId:'',reason:'',reviewed:false}));
 const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[fetched,setFetched]=useState<Fetched|null>(null),[requiresCurrent,setRequiresCurrent]=useState(false),[indeterminate,setIndeterminate]=useState(false);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const visible=admin&&draft.identity===identity,locked=busy||loading||submitting||refreshing;
 const snapshot=draft.snapshot,order=snapshot.order,production=order?.production;
 const target=draft.review?.candidates.find(item=>item.memberId===draft.targetMemberId);
 const conflict=draft.expectedContext!==currentBasis||!!draft.review&&draft.review.expectedContext!==draft.expectedContext;
 const directoryMatches=!!draft.review&&draft.review.orderId===orderId&&draft.review.workId===production?.workId&&draft.review.expectedContext===draft.expectedContext;
 const active=!!production&&['submitted','printed'].includes(production.status);
 const canReview=visible&&active&&directoryMatches&&!draft.review?.blockedReason&&!conflict&&!requiresCurrent&&!!target&&!!draft.reason.trim();
 const dirty=!!draft.targetMemberId||draft.reason!=='';
 const ownerName=production?.assigneeId?(production.assigneeName||'Registrerad ansvarig utan namn'):production?.assigneeName?production.assigneeName+' · äldre namn utan konto-ID':'Ingen har tagit jobbet';
 const title=production?.assigneeId?'Byt produktionsansvar':'Tilldela produktionsansvar';

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  const controller=new AbortController(),startedIdentity=identity,startedOperation=++operation.current;
  if(!admin||draft.identity!==identity){setLoading(false);return()=>controller.abort();}
  const workId=draft.snapshot.order?.production.workId||'';
  if(!workId){setLoading(false);setError('Arbetsordern saknar arbetsreferens. Kontrollera jobbets underlag.');return()=>controller.abort();}
  setLoading(true);
  void readAccounts(space,orderId,workId,controller.signal).then(review=>{
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   setDraft(previous=>previous.identity===startedIdentity?{...previous,review,reviewed:false}:previous);
   if(review.expectedContext!==draft.expectedContext)setNotice('Jobbets underlag har ändrats sedan dialogen öppnades. Hämta och läs in aktuellt granskningsunderlag.');
  }).catch(cause=>{
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation||controller.signal.aborted)return;
   setError((cause as Error).message||'Produktionskonton kunde inte hämtas. Din text och dina val finns kvar.');
  }).finally(()=>{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setLoading(false);});
  return()=>controller.abort();
 },[identity]);
 useEffect(()=>{
  if(draft.identity===identity&&admin)return;
  operation.current++;submitLock.current=false;setDiscard(false);setFetched(null);onClose();
 },[identity,admin,draft.identity,onClose]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);
 useEffect(()=>{
  if(!visible||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,dirty]);

 function close(){if(locked||submitLock.current||discard)return;if(dirty)setDiscard(true);else onClose();}
 function update(patch:Partial<Draft>){
  if(!visible||locked||submitLock.current||discard)return;
  setDraft(previous=>previous.identity===identity?{...previous,...patch,reviewed:false}:previous);setError('');
 }
 async function fetchCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,orderId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna jobbet på nytt.');
   const nextOrder=next.orders.find(item=>item.id===orderId);
   if(!nextOrder?.production.workId)throw Error('Arbetsordern saknas i aktuellt underlag. Kontrollera jobbet.');
   const review=await readAccounts(space,orderId,nextOrder.production.workId);
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   setFetched({state:structuredClone(next),review:structuredClone(review)});
   setNotice('Aktuellt jobb och tillgängliga produktionskonton har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska ändringen igen.');
  }catch(cause){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((cause as Error).message||'Aktuellt underlag kunde inte hämtas. Din text och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 function adoptCurrent(){
  if(!visible||locked||submitLock.current||discard||!fetched)return;
  if(identityFor(fetched.state,space,orderId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna jobbet på nytt.');return;}
  const nextBasis=productionAssignmentBasis(fetched.state,orderId),nextOrder=fetched.state.orders.find(item=>item.id===orderId);
  if(nextBasis!==fetched.review.expectedContext||fetched.review.orderId!==orderId||fetched.review.workId!==nextOrder?.production.workId||currentBasis!==nextBasis){
   setError('Jobbet ändrades under hämtningen. Din text och dina val finns kvar. Hämta aktuellt underlag på nytt innan du läser in det.');return;
  }
  const targetValid=fetched.review.candidates.some(item=>item.memberId===draft.targetMemberId);
  setDraft(previous=>({...previous,expectedContext:nextBasis,snapshot:snapshotFor(fetched.state,orderId),review:structuredClone(fetched.review),targetMemberId:targetValid?previous.targetMemberId:'',reviewed:false}));
  setRequiresCurrent(false);setIndeterminate(false);setError('');setFetched(null);
  setNotice('Aktuellt granskningsunderlag har lästs in. Din orsak och tillgängliga val finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetMemberId?' Det tidigare valda kontot är inte tillgängligt; välj en ny ansvarig.':''));
 }
 async function submit(){
  if(!visible||locked||submitLock.current||discard||!canReview||!draft.reviewed||!target||!production)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  let failureStatus=0,failureMessage='';
  function failure(){
   if(failureStatus===409){
    setRequiresCurrent(true);setDraft(previous=>({...previous,reviewed:false}));
    return (failureMessage||'Granskningsunderlaget har ändrats.')+' Din text och dina val finns kvar. Hämta, läs in och granska aktuellt underlag innan du sparar igen. Ett tidigare obekräftat försök kan redan ha lyckats.';
   }
   if(failureStatus>=400&&failureStatus<500){
    setRequiresCurrent(true);setDraft(previous=>({...previous,reviewed:false}));
    return (failureMessage||'CRM nekade ändringen.')+' Detta försök nekades. Din text och dina val finns kvar. Hämta och granska aktuellt underlag innan du försöker igen. Ett tidigare obekräftat försök kan redan ha lyckats.';
   }
   setIndeterminate(true);
   return 'Ändringen kunde inte bekräftas. Din text och dina val finns kvar. Första försöket kan redan ha lyckats. Försök igen med samma oförändrade val, eller hämta, läs in och granska aktuellt underlag.';
  }
  try{
   const saved=await save('production_assignment_transfer',{orderId,workId:production.workId,targetMemberId:target.memberId,expectedContext:draft.expectedContext,expectedTarget:target.expectedTarget,reason:draft.reason.trim(),reviewed:true},false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)onClose();else setError(failure());
  }catch(cause){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){if(!failureStatus)setIndeterminate(true);setError(failureStatus?failure():((cause as Error).message||'Ändringen kunde inte bekräftas.')+' Din text och dina val finns kvar. Försöket kan redan ha lyckats; återförsök samma oförändrade val eller hämta och granska aktuellt underlag.');}}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setSubmitting(false);}}
 }
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const container=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,summary,[role=combobox]'))return;
  requestAnimationFrame(()=>{
   if(!alive.current||!control.isConnected||document.activeElement!==control||!container.contains(control))return;
   const box=control.getBoundingClientRect(),bounds=container.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;
   if(box.height>bottom-top)return;
   if(box.top<top)container.scrollBy({top:box.top-top,behavior:'instant'});
   else if(box.bottom>bottom)container.scrollBy({top:box.bottom-bottom,behavior:'instant'});
  });
 }

 return <>
  <Dialog open={visible} onOpenChange={value=>{if(!value)close();}}>
   <DialogContent className="business-ui production-assignment-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{event.preventDefault();heading.current?.focus({preventScroll:true});}} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>{if(returnFocus){restoreHandoverFocus(event,opener.current,returnFocus);return;}if(opener.current?.isConnected&&currentIdentity.current===identity){event.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0"><div className="production-assignment-head"><DialogTitle ref={heading} tabIndex={-1} className="flex items-start gap-2"><ArrowRightLeft className="shrink-0" size={19} aria-hidden="true"/><span className="min-w-0">{title}</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>{snapshot.customerName} · {snapshot.jobTitle}. Granska vem som håller ihop tryck- och leveransarbetet.</DialogDescription></DialogHeader>
    <form className="min-w-0" onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
     <section className="production-assignment-current" aria-label="Nuvarande produktionsansvar"><h3>Arbetsorderns produktionsansvar</h3><p><b>Nuvarande ansvarig:</b> {ownerName}</p><p><b>Status:</b> {production?statuses[production.status]:'Arbetsordern saknas'}.</p><p>Tryck klart: {displayDate(production?.printDeadline||'')}. Skickas senast: {displayDate(production?.dispatchDeadline||'')}.</p><p className="biz-hint">Det här är arbetsorderns operativa ansvar i CRM. Registreringarna från tryck och lager behåller sina ursprungliga personer.</p>{!active&&<p className="biz-callout">Arbetsordern är inte aktiv och behåller sitt registrerade ansvar.</p>}</section>
     <section className="production-assignment-current" aria-label="Orderansvar ligger kvar"><h3>Orderansvar · ligger kvar</h3><p><b>Orderns säljare:</b> {order?.owner||'Ansvar saknas i underlaget'}.</p><p>Kundrelation, orderansvar, uppgifter och historiska försäljningsresultat ändras inte av produktionsansvaret.</p></section>
     <details className="biz-details" aria-label="Arbetsorderns frysta underlag"><summary>Jobbets registrerade underlag · ligger kvar</summary>{production&&<><p className="biz-hint">Sparade uppgifter vid granskningen. Ansvarsbytet ändrar inga registrerade mängder eller produktionsmoment.</p>{productionProgress(production).map(row=><article className="revision-card" key={row.line.id}><b>{row.line.article}</b><p>Beställt {row.ordered} · åtagande {row.target} · mottaget {row.received} · tryckt {row.printed} · skickat {row.dispatched}.</p><p>Kasserat före tryck {row.scrapUnprinted} · efter tryck {row.scrapPrinted}.</p></article>)}<p><b>Produktionshinder:</b> {production.issue||'Inget registrerat hinder'}. {production.issue&&'Hindrets ansvar ligger kvar hos '+(production.issueOwnerName||'registrerad medarbetare')+'.'}</p><p className="whitespace-pre-wrap"><b>Instruktion:</b> {production.instructions||'Ingen separat instruktion'}</p><p><b>Hos kunden:</b> {displayDate(production.deliveryDate||order?.deliveryDate||'')}.</p><p><b>Tryckskiss:</b> {production.sketchVersion||'Ingen angiven version'}.</p><p className="biz-hint break-words">Orderreferens: {orderId}. Arbetsreferens: {production.workId}.</p></>}</details>
     {draft.review?.blockedReason&&<p className="biz-callout" role="alert">{draft.review.blockedReason}</p>}
     <F label="Produktionsansvarig efter ändringen *"><Select value={draft.targetMemberId||'_none'} onValueChange={value=>update({targetMemberId:value==='_none'?'':value})} disabled={!draft.review}><SelectTrigger aria-label="Produktionsansvarig efter ändringen" aria-describedby={target?targetDescriptionId:undefined} className="production-assignment-select"><SelectValue><span className="production-assignment-selected">{target?candidateLabel(target):'Välj produktionsansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="production-assignment-options max-w-[calc(100vw-2rem)]"><SelectItem value="_none">Välj produktionsansvarig</SelectItem>{draft.review?.candidates.map(candidate=><SelectItem key={candidate.memberId} value={candidate.memberId}>{candidateLabel(candidate)}</SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={targetDescriptionId} className="biz-hint break-words"><b>Vald produktionsansvarig:</b> {target.name}. <b>CRM-roll:</b> {roleLabels[target.role]}. <span className="block">Konto-ID: {target.memberId}.</span>Valet gäller personens CRM-konto och roll.</p>}
     {draft.review&&!draft.review.candidates.length&&<p className="biz-hint">Inga tillgängliga produktionskonton finns i detta underlag. Kontrollera Konton & roller och hämta aktuellt underlag.</p>}
     <F label="Varför ändras produktionsansvaret? *"><Textarea required rows={3} maxLength={4000} value={draft.reason} onChange={event=>update({reason:event.target.value})} placeholder="Beskriv varför någon annan ska hålla ihop jobbet."/></F>
     <section className="biz-callout" aria-label="Granska produktionsansvaret"><h3>Granska ändringen</h3><p><b>{snapshot.jobTitle}</b>: {ownerName} → {target?candidateLabel(target):'välj ansvarig'}.</p><p className="whitespace-pre-wrap">Orsak: {draft.reason.trim()||'ange en orsak'}.</p><p>Bara den här arbetsorderns produktionsansvar ändras. Orderns säljare, registrerade antal, tryck, kassation, leveranser, datum och hinder ligger kvar. Ansvarsbytet slutför inget arbete och skapar inget kundgodkännande. Ingen avisering eller kundkommunikation skickas.</p><label className="check-field"><Checkbox aria-label="Jag har granskat produktionsansvaret" disabled={!canReview} checked={draft.reviewed&&canReview} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat ansvarig och orsak samt att orderansvar och registrerat arbete ligger kvar.</span></label></section>
     {(conflict||requiresCurrent)&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16} aria-hidden="true"/>Granskningsunderlaget behöver läsas in</b><p>Din text och dina val finns kvar med det tidigare underlaget. Hämta, läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning behåller formulärets tidigare jobb och kontolista. Läs in nytt granskningsunderlag använder de hämtade uppgifterna och behåller din orsak och tillgängliga val. Granskningen behöver göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" disabled={!fetched} onClick={adoptCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {production&&production.assignmentHistory.length>0&&<details className="biz-details"><summary>Tidigare ändringar av produktionsansvaret ({production.assignmentHistory.length})</summary>{[...production.assignmentHistory].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.fromUserId?(row.fromName||'Tidigare ansvarig utan namn'):'Gemensam kö'} → {row.toUserId?(row.toName||'Registrerad ansvarig utan namn'):'Gemensam kö'}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><p className="biz-hint">Ansvarsrevision {row.revision}. Referens: {row.id}.</p></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}{indeterminate&&<p className="biz-callout" role="status">Ett tidigare sparförsök kan redan ha ändrat CRM. Samma oförändrade val kan återförsökas. Hämta och granska aktuellt underlag om du vill göra en ny ändring.</p>}
     <p className="biz-hint">Formuläret är inget sparat privat utkast. Din text och dina val finns kvar medan dialogen är öppen. Kopiera orsaken före omladdning; den försvinner om du stänger utan att spara.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':'Spara produktionsansvar'}</Button></div>
    </fieldset></form>{locked&&<p role="status">{loading?'Hämtar tillgängliga produktionskonton…':refreshing?'Hämtar aktuellt underlag…':'Sparar produktionsansvaret…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="production-assignment-dialog max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara produktionsansvaret?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat försök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}

