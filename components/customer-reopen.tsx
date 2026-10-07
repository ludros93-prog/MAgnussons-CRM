'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,RotateCcw,CalendarPlus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {day,label,RELATIONS,type State,type Customer} from '@/lib/crm';
import {CustomerReopenSchema,customerReopenBasis,customerReopenReview} from '@/lib/customer-reopen';
import {BusinessField as F,displayDate} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';
import type {FollowUpSaveAction} from './follow-up-dialog';

type Review=ReturnType<typeof customerReopenReview>;
type RelationStatus='prospect'|'active'|'dormant';
type Draft={identity:string;expectedContext:string;snapshot:Review;targetProfileId:string;status:RelationStatus|'';reason:string;nextAction:string;nextDate:string;reviewed:boolean};
type Props={st:State;c:Customer;space:string;save:FollowUpSaveAction;busy:boolean;refresh:()=>Promise<State>;onDialogChange?:(open:boolean)=>void;focusId?:string};
const statusLabels:Record<RelationStatus,string>={prospect:'Prospekt',active:'Aktiv kund',dormant:'Vilande'};
const identityFor=(st:State,space:string,customerId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',customerId]);
const snapshotFor=(st:State,customerId:string):Review=>structuredClone(customerReopenReview(st,customerId));
const profileLabel=(profile:NonNullable<Review['sourceProfile']>)=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value&&value>=day();
const workspaceLabel=(space:string)=>space==='live'?'Magnussons':space==='demo'?'Demo':space;

export function CustomerReopen({st,c,space,save,busy,refresh,onDialogChange,focusId='customer-card-heading'}:Props){
 const headingId=useId(),selectedProfileId=useId(),reasonId=useId(),identity=identityFor(st,space,c.id),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=customerReopenBasis(st,c.id),admin=st.viewer?.role==='admin';
 const [draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[remoteConflict,setRemoteConflict]=useState(false),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[success,setSuccess]=useState(''),[fetchedState,setFetchedState]=useState<State|null>(null);
 const lock=useRef(false),operation=useRef(0),alive=useRef(true),panel=useRef<HTMLElement|null>(null),heading=useRef<HTMLHeadingElement|null>(null),dialogHeading=useRef<HTMLHeadingElement|null>(null),opener=useRef<HTMLElement|null>(null);
 const visible=!!draft&&draft.identity===identity&&admin,locked=busy||submitting||refreshing;
 const conflict=!!draft&&(remoteConflict||draft.expectedContext!==currentBasis);
 const dirty=!!draft&&(!!draft.targetProfileId||!!draft.status||draft.reason!==''||draft.nextAction!==''||draft.nextDate!==''||draft.reviewed);
 const snapshot=draft?.snapshot,target=snapshot?.targetProfiles.find(profile=>profile.id===draft?.targetProfileId);
 const statusBlocked=draft?.status==='active'?snapshot?.activeBlockedReason||'':'';
 const canReview=visible&&!locked&&!discard&&!conflict&&!snapshot?.blockedReason&&!statusBlocked&&!!target&&!!draft?.status&&!!draft.reason.trim()&&!!draft.nextAction.trim()&&draft.nextAction.trim().length<=200&&validDate(draft.nextDate);

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  operation.current++;lock.current=false;opener.current=null;setDraft(null);setError('');setNotice('');setRemoteConflict(false);setSubmitting(false);setRefreshing(false);setDiscard(false);setSuccess('');setFetchedState(null);
 },[identity,admin]);
 useEffect(()=>{onDialogChange?.(visible);return()=>onDialogChange?.(false);},[visible,onDialogChange]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous?.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);
 useEffect(()=>{
  if(!visible||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,dirty]);

 function open(){
  if(!admin||c.status!=='closed'||!st.settings.sellerProfilesInitialized||locked||lock.current)return;
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setDraft({identity,expectedContext:currentBasis,snapshot:snapshotFor(st,c.id),targetProfileId:'',status:'',reason:'',nextAction:'',nextDate:'',reviewed:false});
  setError('');setNotice('');setRemoteConflict(false);setDiscard(false);setSuccess('');setFetchedState(null);
 }
 function finishClose(){setDraft(null);setDiscard(false);setError('');setNotice('');setRemoteConflict(false);setFetchedState(null);onDialogChange?.(false);}
 function close(){if(locked||lock.current||discard)return;if(dirty)setDiscard(true);else finishClose();}
 function update(patch:Partial<Draft>){
  if(!visible||locked||lock.current||discard)return;
  setDraft(previous=>previous?.identity===identity?{...previous,...patch,reviewed:false}:previous);setError('');setNotice('');
 }
 function adopt(){
  if(!draft||!visible||locked||lock.current||discard)return;
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,c.id)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna återöppningen på nytt.');return;}
  const next=snapshotFor(latest,c.id),targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:customerReopenBasis(latest,c.id),snapshot:next,targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});setRemoteConflict(false);setError('');
  setNotice('Aktuellt granskningsunderlag har lästs in. Din orsak, valda relation och uppföljning finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetProfileId?' Den tidigare valda ansvariga är inte längre tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!visible||locked||lock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  lock.current=true;setRefreshing(true);setError('');setNotice('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,c.id)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna återöppningen på nytt.');
   setFetchedState(structuredClone(next));setNotice('Aktuella CRM-uppgifter har hämtats. Formuläret behåller sitt tidigare granskningsunderlag och din text. Välj Läs in nytt granskningsunderlag och granska igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Aktuellt underlag kunde inte hämtas.')+' Din text, dina val och det tidigare granskningsunderlaget finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){lock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!draft||!canReview||!draft.reviewed||lock.current)return;
  const input=CustomerReopenSchema.safeParse({customerId:c.id,targetProfileId:draft.targetProfileId,status:draft.status,reason:draft.reason.trim(),nextAction:draft.nextAction.trim(),nextDate:draft.nextDate,expectedContext:draft.expectedContext,reviewed:true});
  if(!input.success){setError(input.error.issues[0]?.message||'Granska ansvarig, relation, orsak och uppföljning innan du sparar.');return;}
  const startedIdentity=identity,startedOperation=++operation.current;
  lock.current=true;setSubmitting(true);setError('');setNotice('');
  try{
   let failureStatus=0,failureMessage='';
   const saved=await save('customer_reopen',input.data,false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved){setSuccess('Kundrelationen är återöppnad. En ny uppföljning har sparats på '+profileLabel(target!)+'. Tidigare arbete och resultat finns kvar.');finishClose();}
   else{
    if(failureStatus===409){setRemoteConflict(true);setDraft(previous=>previous?{...previous,reviewed:false}:previous);}
    setError((failureMessage||'Återöppningen kunde inte bekräftas.')+' Din text och dina val finns kvar. '+(failureStatus===409?'Läs in nytt granskningsunderlag och granska igen.':'Ett obekräftat försök kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade uppgifter.'));
   }
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Återöppningen kunde inte bekräftas.')+' Din text och dina val finns kvar. Ett obekräftat försök kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade uppgifter.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){lock.current=false;setSubmitting(false);}}
 }
 function focusFallback(){
  if(!alive.current||currentIdentity.current!==identity||!panel.current?.isConnected)return null;
  const sheet=panel.current.closest('[data-slot=sheet-content]'),candidate=document.getElementById(focusId);
  return candidate&&sheet?.contains(candidate)?candidate:heading.current;
 }
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const dialog=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,summary,[role=combobox]'))return;
  requestAnimationFrame(()=>{
   if(!alive.current||!control.isConnected||document.activeElement!==control||!dialog.contains(control))return;
   const box=control.getBoundingClientRect(),bounds=dialog.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;
   if(box.height>bottom-top)return;
   if(box.top<top)dialog.scrollBy({top:box.top-top,behavior:'instant'});
   else if(box.bottom>bottom)dialog.scrollBy({top:box.bottom-bottom,behavior:'instant'});
  });
 }

 if(!admin||c.status!=='closed'&&!draft&&!success)return null;
 const source=snapshot?.sourceProfile,customer=snapshot?.customer;
 return <section ref={panel} className="customer-reopen" aria-labelledby={headingId}>
  <div className="customer-reopen-head"><div><h3 ref={heading} id={headingId} tabIndex={-1}><RotateCcw size={18} aria-hidden="true"/><span>{c.status==='closed'?'Kundrelationen är avslutad':'Återöppnad kundrelation'}</span></h3><p>{c.status==='closed'?'Återuppta arbetet på samma kundkort med en granskad ansvarig och en ny uppföljning.':'Kundkortet och tidigare historik finns kvar.'}</p></div>{c.status==='closed'&&<Button type="button" variant="outline" disabled={locked||!st.settings.sellerProfilesInitialized} onClick={open}>Återöppna kundrelation</Button>}</div>
  {c.status==='closed'&&!st.settings.sellerProfilesInitialized&&<p className="biz-hint">Administratören behöver först förbereda och granska resultatprofilerna under Inställningar.</p>}
  {success&&<p className="customer-reopen-success" role="status">{success}</p>}
  <Dialog open={visible} onOpenChange={value=>{if(!value)close();}}><DialogContent className="business-ui customer-reopen-dialog" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{event.preventDefault();dialogHeading.current?.focus({preventScroll:true});}} onEscapeKeyDown={event=>{if(locked||lock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||lock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>restoreHandoverFocus(event,opener.current,focusFallback)}>
   <DialogHeader><div className="customer-reopen-head"><DialogTitle ref={dialogHeading} tabIndex={-1}><RotateCcw size={20} aria-hidden="true"/><span>Återöppna kundrelation</span></DialogTitle><Button type="button" variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>Granska relation, ansvarig och nästa uppföljning i {workspaceLabel(space)}. Tidigare arbete och resultat behåller sina ansvariga.</DialogDescription></DialogHeader>
   {draft&&snapshot&&<form onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible||discard}>
    <section className="customer-reopen-current" aria-label="Kunden i granskningsunderlaget"><h3>{customer?.name||'Kunden saknas i granskningsunderlaget'}</h3><p><b>Nuvarande relation:</b> {customer?.status?label(RELATIONS,customer.status):'Saknas'}.</p><p><b>Tidigare kundrelationsansvarig:</b> {source?profileLabel(source):customer?.owner||'Saknas'}.</p>{source&&<p><b>Resultatprofil:</b> {source.active?'Aktuell profil':'Historisk profil'}. <b>Profil-ID:</b> {source.id}. <b>Ansvarskoppling:</b> {source.legacyOwnerName}.</p>}<p className="biz-hint">Kundrelation och resultatprofil är skilda statusar. Profilen visar inte om personen har ett aktivt CRM-konto.</p></section>
    {snapshot.blockedReason&&<p className="customer-reopen-warning" role="alert"><AlertTriangle size={18} aria-hidden="true"/><span>{snapshot.blockedReason}</span></p>}
    <F label="Ny kundrelationsansvarig *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger aria-label="Ny kundrelationsansvarig" aria-describedby={target?selectedProfileId:undefined}><SelectValue><span className="customer-reopen-selected-name">{target?profileLabel(target):'Välj ansvarig för kundrelationen'}</span></SelectValue></SelectTrigger><SelectContent className="customer-reopen-select"><SelectItem value="_none">Välj ansvarig för kundrelationen</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id}>{profileLabel(profile)}</SelectItem>)}</SelectContent></Select></F>
    {target&&<p id={selectedProfileId} className="customer-reopen-selected-details"><b>Vald ansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}. <b>Profil-ID:</b> {target.id}.</p>}
    <F label="Relation efter återöppningen *"><Select value={draft.status||'_none'} onValueChange={value=>update({status:value==='_none'?'':value as RelationStatus})}><SelectTrigger aria-label="Relation efter återöppningen"><SelectValue placeholder="Välj relation"/></SelectTrigger><SelectContent className="customer-reopen-select"><SelectItem value="_none">Välj relation</SelectItem>{(Object.keys(statusLabels) as RelationStatus[]).map(status=><SelectItem key={status} value={status} disabled={status==='active'&&!!snapshot.activeBlockedReason}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select></F>
    <p className="biz-hint">Välj hur relationen ska följas. Återöppning registrerar ingen ny affär, kundkontakt eller bekräftat inköpsbehov.</p>
    {snapshot.activeBlockedReason&&<p className="customer-reopen-warning" role={statusBlocked?'alert':undefined}>Aktiv kund kan inte väljas: {snapshot.activeBlockedReason}</p>}
    <F label="Varför återöppnas kundrelationen? *"><Textarea id={reasonId} required rows={3} maxLength={4000} value={draft.reason} aria-describedby={reasonId+'-hint'} placeholder="Beskriv varför relationen ska tas upp igen." onChange={event=>update({reason:event.target.value})}/></F><p id={reasonId+'-hint'} className="biz-hint">Orsaken sparas i kundens historik.</p>
    <section className="customer-reopen-current" aria-label="En ny uppföljning"><h3><CalendarPlus size={18} aria-hidden="true"/>Planera en ny uppföljning</h3><p>En ny aktivitet skapas för vald kundrelationsansvarig. Befintliga aktiviteter ändras inte.</p><F label="Vad ska göras? *"><Input required maxLength={200} value={draft.nextAction} placeholder="Beskriv nästa handling för kundrelationen." onChange={event=>update({nextAction:event.target.value})}/></F><F label="Uppföljningsdatum *"><Input required type="date" min={day()} value={draft.nextDate} onChange={event=>update({nextDate:event.target.value})}/></F>{draft.nextDate&&!validDate(draft.nextDate)&&<p className="error" role="alert">Välj ett giltigt datum som är idag eller senare.</p>}</section>
    <details className="biz-details customer-reopen-inventory"><summary>Befintligt öppet arbete behåller sitt ansvar ({snapshot.remainingWork.length})</summary><p>Hela kundens öppna arbetsunderlag visas, oavsett sökning och filter. Återöppningen flyttar, avslutar eller återstartar inga befintliga arbetsuppgifter.</p>{snapshot.remainingWork.length?<ol>{snapshot.remainingWork.map(row=><li key={row.key}><b>{row.typeLabel}: {row.title}</b><p><b>Status:</b> {row.status}. <b>Registrerat ansvar:</b> {row.owner||'Saknas'}.</p>{row.ownerProfileId&&<p><b>Profil-ID:</b> {row.ownerProfileId}.</p>}<p>{row.hint}</p></li>)}</ol>:<p>Inget öppet arbete finns i denna inventering. Tidigare avslutat arbete finns kvar i historiken.</p>}</details>
    <section className="customer-reopen-review" aria-label="Granska återöppningen"><h3>Det här ändras</h3><p><b>{customer?.name||c.name}</b>: Avslutad → {draft.status?statusLabels[draft.status]:'välj relation'}.</p><p><b>Kundrelationsansvar:</b> {source?profileLabel(source):customer?.owner||'Saknas'} → {target?profileLabel(target):'välj ansvarig'}.</p>{target&&target.id===source?.id&&<p className="biz-hint">Samma aktiva resultatprofil behåller kundrelationsansvaret. Ingen överföring till en annan person registreras.</p>}<p><b>Orsak:</b> <span className="customer-reopen-reason">{draft.reason.trim()||'ange en orsak'}</span></p><p><b>En ny uppföljning:</b> {draft.nextAction.trim()||'ange nästa handling'} · {displayDate(draft.nextDate)} · {target?profileLabel(target):'välj ansvarig'}.</p><h3>Tidigare arbete och resultat finns kvar</h3><p>Historisk försäljning, tidigare kvalificeringar, mål, offerter, order och fakturaunderlag behåller sina ansvariga. Kundplan, introduktion, årshjul och befintliga aktiviteter ändras inte.</p><p>Senaste kundkontakt ändras inte. CRM-konton, sidåtkomst, privata utkast, Outlook och andra arbetsytor ändras inte.</p><label className="check-field"><Checkbox aria-label="Jag har granskat återöppningen av kundrelationen" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(canReview&&!lock.current)setDraft(previous=>previous?.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat relationen, ansvarig, orsaken, den nya uppföljningen och arbetet som behåller sitt ansvar.</span></label></section>
    {conflict&&<div className="record-conflict" role="alert"><b>Granskningsunderlaget har ändrats</b><p>Din text och dina val finns kvar med det tidigare underlaget. Läs in nytt granskningsunderlag och granska igen innan du sparar.</p></div>}
    <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formulärets tidigare underlag. Inläsning uppdaterar granskningen, behåller texten och möjliga val och kräver en ny granskning. Ingen ny ansvarig väljs automatiskt.</p><div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" onClick={adopt}>Läs in nytt granskningsunderlag</Button></div></details>
    {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <p className="biz-hint">Formuläret sparas inte som privat utkast. Text och val finns kvar medan dialogen är öppen; de försvinner om du stänger utan att spara eller laddar om sidan.</p>
    <div className="biz-buttons"><Button type="button" variant="outline" onClick={close}>Stäng</Button><Button type="submit" disabled={!canReview||!draft.reviewed||locked||discard}>{submitting?'Sparar…':'Spara återöppnad kundrelation'}</Button></div>
   </fieldset></form>}
   {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar återöppningen…'} Vänta innan du stänger.</p>}
  </DialogContent></Dialog>
  <AlertDialog open={discard&&visible} onOpenChange={value=>{if(!locked&&!lock.current)setDiscard(value);}}><AlertDialogContent className="customer-reopen-dialog customer-reopen-discard" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara återöppningen?</AlertDialogTitle><AlertDialogDescription>Din text och dina val försvinner om du stänger. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte en sådan ändring.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction disabled={locked} onClick={()=>{if(!locked&&!lock.current)finishClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}
