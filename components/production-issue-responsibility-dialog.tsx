'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,ArrowRightLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {productionIssueResponsibility,productionIssueResponsibilityBasis,ProductionIssueResponsibilityReviewSchema,ProductionIssueResponsibilityReasonSchema,type ProductionIssueResponsibilityReview,type ProductionIssueResponsibilityCandidate} from '@/lib/production-issue-responsibility';
import type {State,Order} from '@/lib/crm';
import {BusinessField as F} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';

export type ProductionIssueResponsibilitySave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props={st:State;orderId:string;space:string;save:ProductionIssueResponsibilitySave;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus:()=>HTMLElement|null};
type Snapshot={order:Order|null;customerName:string;jobTitle:string};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;review:ProductionIssueResponsibilityReview|null;targetMemberId:string;reason:string;reviewed:boolean};
type Fetched={state:State;review:ProductionIssueResponsibilityReview};
const roles={admin:'Administratör',seller:'Säljare',production:'Tryck & leverans',print:'Tryck',warehouse:'Lager & leverans'};
const statuses={draft:'Ej lämnad till produktion',submitted:'Aktiv arbetsorder',printed:'Färdigtryckt',dispatched:'Skickat · öppet hinder',cancelled:'Avbruten'};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,orderId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',orderId]);
const candidateLabel=(candidate:ProductionIssueResponsibilityCandidate)=>candidate.name+' · '+roles[candidate.role]+' · Konto '+candidate.memberId;
const issueTime=(value:string)=>!value?'Tidpunkt saknas i underlaget':Number.isNaN(new Date(value).getTime())?value:new Date(value).toLocaleString('sv-SE');
function snapshotFor(st:State,orderId:string):Snapshot{
 const orders=st.orders.filter(item=>item.id===orderId),order=orders.length===1?orders[0]:null;
 return structuredClone({order,customerName:st.customers.find(item=>item.id===order?.customerId)?.name||'Kunden saknas i underlaget',jobTitle:st.deals.find(item=>item.id===order?.dealId)?.title||'Arbetsorder'});
}
async function readAccounts(space:string,orderId:string,workId:string,signal?:AbortSignal):Promise<ProductionIssueResponsibilityReview>{
 const response=await fetch('/api/crm/production-issue-responsibility?'+new URLSearchParams({space,orderId,workId}),{cache:'no-store',signal});
 let data:unknown;
 try{data=await response.json();}catch{throw Error('Kontolistan kunde inte läsas. Hämta aktuellt underlag och försök igen.');}
 if(!response.ok)throw Error(typeof (data as {error?:unknown})?.error==='string'?(data as {error:string}).error:'Tillgängliga konton för hinderansvar kunde inte hämtas.');
 const parsed=ProductionIssueResponsibilityReviewSchema.safeParse(data);
 if(!parsed.success||parsed.data.orderId!==orderId||parsed.data.workId!==workId)throw Error('Kontolistan kunde inte läsas för den här granskningen. Hämta aktuellt underlag och försök igen.');
 return parsed.data;
}

export function ProductionIssueResponsibilityDialog({st,orderId,space,save,busy,refresh,onClose,returnFocus}:Props){
 const identity=identityFor(st,space,orderId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=productionIssueResponsibilityBasis(st,orderId),admin=st.viewer?.role==='admin',targetDescriptionId=useId(),reasonErrorId=useId(),heading=useRef<HTMLHeadingElement|null>(null);
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:snapshotFor(st,orderId),review:null,targetMemberId:'',reason:'',reviewed:false}));
 const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[fetched,setFetched]=useState<Fetched|null>(null),[requiresCurrent,setRequiresCurrent]=useState(false),[indeterminate,setIndeterminate]=useState(false);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const visible=admin&&draft.identity===identity,locked=busy||loading||submitting||refreshing;
 const snapshot=draft.snapshot,production=snapshot.order?.production,currentOwner=production?productionIssueResponsibility(production):null;
 const ownerName=currentOwner?.name||'Ansvarig saknas i underlaget';
 const target=draft.review?.candidates.find(item=>item.memberId===draft.targetMemberId);
 const conflict=draft.expectedContext!==currentBasis||!!draft.review&&draft.review.expectedContext!==draft.expectedContext;
 const directoryMatches=!!draft.review&&draft.review.orderId===orderId&&draft.review.workId===production?.workId&&draft.review.expectedContext===draft.expectedContext;
 const openIssue=!!production?.issue&&['submitted','printed','dispatched'].includes(production.status);
 const parsedReason=ProductionIssueResponsibilityReasonSchema.safeParse(draft.reason);
 const reasonError=draft.reason.trim()&&!parsedReason.success?(draft.reason.includes('\0')?'Orsaken innehåller ogiltig text. Skriv om texten.':'Orsaken är för lång. Korta texten.'):'';
 const canReview=visible&&openIssue&&directoryMatches&&!draft.review?.blockedReason&&!conflict&&!requiresCurrent&&!!target&&parsedReason.success;
 const dirty=!!draft.targetMemberId||draft.reason!=='';

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
   if(review.expectedContext!==draft.expectedContext)setNotice('Jobbet eller hindret har ändrats sedan dialogen öppnades. Hämta och läs in aktuellt granskningsunderlag.');
  }).catch(cause=>{
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation||controller.signal.aborted)return;
   setError((cause as Error).message||'Konton kunde inte hämtas. Din text och dina val finns kvar.');
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
  submitLock.current=true;setRefreshing(true);setError('');setFetched(null);
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,orderId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna jobbet på nytt.');
   const nextOrders=next.orders.filter(item=>item.id===orderId),nextOrder=nextOrders.length===1?nextOrders[0]:undefined;
   if(!nextOrder?.production.workId)throw Error('Arbetsordern saknas i aktuellt underlag. Kontrollera jobbet.');
   const review=await readAccounts(space,orderId,nextOrder.production.workId);
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   setFetched({state:structuredClone(next),review:structuredClone(review)});
   setNotice('Aktuellt hinder och tillgängliga konton har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska ändringen igen.');
  }catch(cause){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((cause as Error).message||'Aktuellt underlag kunde inte hämtas. Din text och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 function adoptCurrent(){
  if(!visible||locked||submitLock.current||discard||!fetched)return;
  if(identityFor(fetched.state,space,orderId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna jobbet på nytt.');return;}
  const nextBasis=productionIssueResponsibilityBasis(fetched.state,orderId),nextOrders=fetched.state.orders.filter(item=>item.id===orderId),nextOrder=nextOrders.length===1?nextOrders[0]:undefined;
  if(nextBasis!==fetched.review.expectedContext||fetched.review.orderId!==orderId||fetched.review.workId!==nextOrder?.production.workId||currentBasis!==nextBasis){
   setError('Jobbet ändrades under hämtningen. Din text och dina val finns kvar. Hämta aktuellt underlag på nytt innan du läser in det.');return;
  }
  const targetValid=fetched.review.candidates.some(item=>item.memberId===draft.targetMemberId);
  setDraft(previous=>({...previous,expectedContext:nextBasis,snapshot:snapshotFor(fetched.state,orderId),review:structuredClone(fetched.review),targetMemberId:targetValid?previous.targetMemberId:'',reviewed:false}));
  setRequiresCurrent(false);setIndeterminate(false);setError('');setFetched(null);
  setNotice('Aktuellt granskningsunderlag har lästs in. Din orsak och tillgängliga val finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetMemberId?' Det tidigare valda kontot är inte tillgängligt; välj en ny ansvarig.':''));
 }
 async function submit(){
  if(!visible||locked||submitLock.current||discard||!canReview||!draft.reviewed||!target||!production||!parsedReason.success)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  let failureStatus=0,failureMessage='';
  function failure(){
   if(failureStatus>=400&&failureStatus<500){
    setRequiresCurrent(true);setDraft(previous=>({...previous,reviewed:false}));
    return (failureMessage||(failureStatus===409?'Granskningsunderlaget har ändrats.':'CRM nekade ändringen.'))+' Din text och dina val finns kvar. Hämta, läs in och granska aktuellt underlag innan du sparar igen. Ett tidigare obekräftat försök kan redan ha lyckats.';
   }
   setIndeterminate(true);
   return 'Ändringen kunde inte bekräftas. Din text och dina val finns kvar. Första försöket kan redan ha lyckats. Försök igen med samma oförändrade val, eller hämta, läs in och granska aktuellt underlag.';
  }
  try{
   const saved=await save('production_issue_responsibility_transfer',{orderId,workId:production.workId,targetMemberId:target.memberId,expectedContext:draft.expectedContext,expectedTarget:target.expectedTarget,reason:parsedReason.data,reviewed:true},false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
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
   <DialogContent className="business-ui production-assignment-dialog min-w-0 grid-cols-1 max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{event.preventDefault();heading.current?.focus({preventScroll:true});}} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>restoreHandoverFocus(event,opener.current,returnFocus)}>
    <DialogHeader className="min-w-0"><div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between"><DialogTitle ref={heading} tabIndex={-1} className="flex min-w-0 items-start gap-2 text-left leading-snug sm:flex-1"><ArrowRightLeft className="shrink-0" size={19} aria-hidden="true"/><span className="min-w-0">Byt hinder<wbr/>ansvar</span></DialogTitle><Button type="button" className={`${buttonClass} self-end sm:self-start sm:shrink-0`} variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>{snapshot.customerName} · {snapshot.jobTitle}. Välj vem som ansvarar för nästa steg i det öppna hindret.</DialogDescription></DialogHeader>
    <form className="min-w-0" onSubmit={event=>{event.preventDefault();void submit();}}><fieldset disabled={locked||discard}>
     <section className="production-assignment-current" aria-label="Hinder och aktuellt ansvar"><h3>Det här hindret ska följas upp</h3><p className="whitespace-pre-wrap"><b>Öppet hinder:</b> {production?.issue||'Inget öppet hinder i det inlästa underlaget'}.</p><p><b>Ansvarar för nästa steg:</b> {ownerName}.</p>{currentOwner?.memberId&&<p className="biz-hint">Konto-ID: {currentOwner.memberId}.</p>}<p><b>Jobbets status:</b> {production?statuses[production.status]:'Arbetsordern saknas'}.</p>{production?.status==='dispatched'&&<p>Jobbet är skickat. Hindret är fortfarande öppet och kan få en annan ansvarig för uppföljningen.</p>}{!openIssue&&<p className="biz-callout" role="status">Det inlästa jobbet saknar ett öppet hinder som kan få nytt ansvar. Ingen ansvarsändring kan sparas här.</p>}</section>
     <section className="production-assignment-current" aria-label="Hindrets originalrapportering"><h3>Originalrapportering · ligger kvar</h3><p><b>Rapporterat av:</b> {production?.issueOwnerName||'Rapportör saknas i underlaget'}.</p><p><b>Registrerad rapporttid:</b> {issueTime(production?.issueAt||'')}.</p><p className="biz-hint">Rapportören och rapporttiden ändras inte när någon annan får ansvar för nästa steg.</p><p className="biz-hint">Orderreferens: {orderId}. Arbetsreferens: {production?.workId||'saknas'}.</p></section>
     {draft.review?.blockedReason&&<p className="biz-callout" role="alert">{draft.review.blockedReason}</p>}
     <F label="Hinderansvarig efter ändringen *"><Select value={draft.targetMemberId||'_none'} onValueChange={value=>update({targetMemberId:value==='_none'?'':value})} disabled={!draft.review}><SelectTrigger aria-label="Hinderansvarig efter ändringen" aria-describedby={target?targetDescriptionId:undefined} className="production-assignment-select"><SelectValue><span className="production-assignment-selected">{target?candidateLabel(target):'Välj hinderansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="production-assignment-options max-w-[calc(100vw-2rem)]"><SelectItem value="_none">Välj hinderansvarig</SelectItem>{draft.review?.candidates.map(candidate=><SelectItem key={candidate.memberId} value={candidate.memberId}>{candidateLabel(candidate)}</SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={targetDescriptionId} className="biz-hint break-words"><b>Vald hinderansvarig:</b> {target.name}. <b>CRM-roll:</b> {roles[target.role]}. <span className="block">Konto-ID: {target.memberId}.</span>Valet gäller personens aktiva, anslutna CRM-konto.</p>}
     {draft.review&&!draft.review.candidates.length&&<p className="biz-hint">Inga tillgängliga konton finns i detta underlag. Kontrollera Konton & roller och hämta aktuellt underlag.</p>}
     <F label="Varför ändras hinderansvaret? *"><Textarea className="min-w-0 max-w-full" required rows={3} maxLength={4000} aria-invalid={!!reasonError} aria-describedby={reasonError?reasonErrorId:undefined} value={draft.reason} onChange={event=>update({reason:event.target.value})} placeholder="Beskriv varför en annan person ska följa upp hindret."/></F>
     {reasonError&&<p id={reasonErrorId} className="error" role="alert">{reasonError}</p>}
     <section className="biz-callout" aria-label="Granska hinderansvaret"><h3>Granska ändringen</h3><p><b>Ansvar för nästa steg:</b> {ownerName} → {target?candidateLabel(target):'välj ansvarig'}.</p><p className="whitespace-pre-wrap">Orsak: {draft.reason.trim()||'ange en orsak'}.</p><p>Bara det här öppna hindrets ansvar ändras. Originalrapportering, jobbansvar, orderansvar, antal, tryck, kassation, leveranser och datum ligger kvar. Bytet löser inte hindret och skapar inget kundgodkännande.</p><label className="check-field"><Checkbox aria-label="Jag har granskat hinderansvaret" disabled={!canReview} checked={draft.reviewed&&canReview} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat ansvarig och orsak. Originalrapporteringen och registrerat arbete ligger kvar.</span></label></section>
     {(conflict||requiresCurrent)&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16} aria-hidden="true"/>Granskningsunderlaget behöver läsas in</b><p>Din text och dina val finns kvar med det tidigare underlaget. Hämta, läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning behåller formulärets tidigare hinder och kontolista. Läs in nytt granskningsunderlag använder de hämtade uppgifterna och behåller din orsak och tillgängliga val. Granskningen behöver göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" disabled={!fetched} onClick={adoptCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {production&&<ProductionIssueResponsibilityHistory production={production}/>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}{indeterminate&&<p className="biz-callout" role="status">Ett tidigare sparförsök kan redan ha ändrat CRM. Samma oförändrade val kan återförsökas. Hämta och granska aktuellt underlag om du vill göra en ny ändring.</p>}
     <p className="biz-hint">Orsak och val i det här formuläret är inget sparat privat utkast; kopiera orsaken före omladdning.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar hinderansvaret…':'Spara nytt hinderansvar'}</Button></div>
    </fieldset></form>{locked&&<p role="status">{loading?'Hämtar tillgängliga konton…':refreshing?'Hämtar aktuellt underlag…':'Sparar hinderansvaret…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="production-assignment-dialog min-w-0 grid-cols-1 max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader className="min-w-0"><AlertDialogTitle>Stäng utan att spara?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat försök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="min-w-0"><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}

export function ProductionIssueResponsibilityHistory({production,archived=false}:{production:Order['production'];archived?:boolean}){
 const history=production.issueResponsibility?.history||[];
 const resolved=production.issueResolutions.filter(row=>!!row.responsibility?.history.length),count=history.length+resolved.reduce((total,row)=>total+(row.responsibility?.history.length||0),0);
 if(!count)return null;
 function changes(rows:typeof history){return [...rows].reverse().map(row=><article className="revision-card min-w-0 break-words" key={row.id}><b>{row.fromName||'Tidigare ansvar saknas'} → {row.toName}</b><p>{issueTime(row.at)} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">Orsak: {row.reason}.</p><p className="biz-hint">Från konto: {row.fromMemberId||'Ingen tidigare verifierad kontokoppling'}. Till konto: {row.toMemberId}. Ansvarsrevision {row.revision}.</p></article>);}
 return <details className="biz-details"><summary>Tidigare ändringar av hinderansvaret ({count})</summary>{history.length>0&&<section aria-label={archived?'Ansvarsändringar för det arkiverade hindret':'Ansvarsändringar för det öppna hindret'}><h3>{archived?'Arkiverat hinder':'Öppet hinder'}</h3><p className="whitespace-pre-wrap">{production.issue}</p><p><b>Rapporterat av:</b> {production.issueOwnerName||'Rapportör saknas i underlaget'}. <b>Registrerad rapporttid:</b> {issueTime(production.issueAt)}.</p>{changes(history)}</section>}{[...resolved].reverse().map((row,index)=><section aria-label="Bevarat ansvar för ett löst hinder" key={row.resolvedAt+'-'+index}><h3>Löst hinder</h3><p className="whitespace-pre-wrap">{row.issue}</p><p><b>Rapporterat av:</b> {row.reportedBy||'Rapportör saknas i underlaget'}. <b>Registrerad rapporttid:</b> {issueTime(row.reportedAt)}.</p><p><b>Ansvarig när hindret löstes:</b> {row.responsibility?.name}.</p><p className="whitespace-pre-wrap"><b>Lösning:</b> {row.resolution}.</p><p><b>Löst av:</b> {row.resolvedBy} · {issueTime(row.resolvedAt)}.</p>{changes(row.responsibility?.history||[])}</section>)}</details>;
}
