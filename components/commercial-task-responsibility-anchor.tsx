'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,Link2,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {label,PIPELINE,OUTCOMES,DELIVERY,type State} from '@/lib/crm';
import {commercialTaskResponsibilityAnchorBasis,commercialTaskResponsibilityAnchorReview} from '@/lib/task-responsibility';
import {BusinessField as F} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';
import type {FollowUpSaveAction} from './follow-up-dialog';

type Review=ReturnType<typeof commercialTaskResponsibilityAnchorReview>;
type Account={id:string;name:string;email:string;role:string;owner:string;active:0|1;connected:0|1;expectedAccount:string};
type Snapshot={review:Review;account:Account|null;accountError:string};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;reason:string;reviewed:boolean;editVersion:number};
type Payload={taskId:string;reason:string;reviewed:true;expectedContext:string;expectedAccount:string};
type Attempt={payload:Payload;editVersion:number;unknown:boolean};
type Fetched={state:State;snapshot:Snapshot};
type Props={st:State;taskId:string;space:string;save:FollowUpSaveAction;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null;opener?:HTMLElement|null};
// A role change blocks new work, but must not discard an unconfirmed attempt
// by this same account. Account/workspace/target changes still isolate it.
const identityFor=(st:State,space:string,taskId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'','commercial-task',taskId]);
const accessFor=(st:State,identity:string)=>JSON.stringify([identity,st.viewer?.role||'',st.viewer?.owner||'']);
const workspaceLabel=(space:string)=>space==='live'?'Magnussons':space==='demo'?'Demo':space;
const roleLabels:Record<string,string>={admin:'Administratör',seller:'Säljare',reader:'Läsare',production:'Produktion',print:'Tryck',warehouse:'Lager'};
const roleLabel=(role:string)=>roleLabels[role]||role;
function displayDate(value:string){
 if(!value)return 'Inte angivet';
 const date=new Date(value.slice(0,10)+'T12:00:00');
 return Number.isNaN(date.getTime())?value:date.toLocaleDateString('sv-SE',{day:'numeric',month:'long',year:'numeric'});
}
const basisFor=commercialTaskResponsibilityAnchorBasis;
function snapshotFor(st:State,taskId:string):Snapshot{
 return {review:structuredClone(commercialTaskResponsibilityAnchorReview(st,taskId)),account:null,accountError:''};
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function accountRow(value:unknown):Account{
 if(!object(value)||!['id','name','email','role','owner','expectedAccount'].every(key=>typeof value[key]==='string')||!(value.active===0||value.active===1||value.active===false||value.active===true)||!(value.connected===0||value.connected===1||value.connected===false||value.connected===true)||!/^[a-f0-9]{64}$/.test(value.expectedAccount as string))throw Error('Kontolistan saknar ett verifierbart kontounderlag. Hämta kontona igen.');
 const row=value as unknown as Account;
 if(!row.id||row.id!==row.id.trim()||!row.name.trim()||!row.email.trim())throw Error('Kontolistan saknar ett verifierbart kontounderlag. Hämta kontona igen.');
 return {id:row.id,name:row.name,email:row.email,role:row.role,owner:row.owner,active:value.active===1||value.active===true?1:0,connected:value.connected===1||value.connected===true?1:0,expectedAccount:row.expectedAccount};
}
function accountBlocker(snapshot:Snapshot){
 if(snapshot.accountError)return snapshot.accountError;
 const profile=snapshot.review.sourceProfile,account=snapshot.account;
 if(!profile?.memberId)return 'Den ansvarigas personprofil saknar ett anslutet personligt CRM-konto. Administratören behöver granska kontolänken under Mål & inställningar.';
 if(!account)return 'Kontot har ännu inte kunnat läsas. Hämta aktuellt underlag innan du granskar kopplingen.';
 if(account.id!==profile.memberId||account.owner!==profile.legacyOwnerName)return 'Det anslutna kontots ansvarskoppling stämmer inte med den ansvarigas personprofil. Administratören behöver granska kontolänken.';
 if(!account.active)return 'Det anslutna CRM-kontot är inaktivt. Administratören behöver granska kontot innan ansvaret kan kopplas.';
 if(!account.connected)return 'CRM-kontot har ingen ansluten användaridentitet. Administratören behöver först klarlägga kontoanslutningen.';
 if(!['admin','seller'].includes(account.role))return 'Det anslutna kontot behöver en aktuell säljar- eller administratörsroll. Administratören behöver granska kontot.';
 return '';
}
async function readAccount(space:string,review:Review):Promise<Pick<Snapshot,'account'|'accountError'>>{
 if(!review.sourceProfile?.memberId)return {account:null,accountError:''};
 const response=await fetch('/api/crm/members?space='+encodeURIComponent(space),{cache:'no-store'}),data:unknown=await response.json();
 if(!response.ok)throw Error(object(data)&&typeof data.error==='string'?data.error:'CRM-kontot kunde inte hämtas.');
 if(!Array.isArray(data))throw Error('Kontolistan saknar ett verifierbart kontounderlag.');
 const accounts=data.map(accountRow),ids=new Set(accounts.map(account=>account.id));
 if(ids.size!==accounts.length)throw Error('Kontolistan innehåller oklara konto-ID:n. Administratören behöver granska kontona.');
 const matching=accounts.filter(account=>account.id===review.sourceProfile!.memberId);
 return matching.length===1?{account:matching[0],accountError:''}:{account:null,accountError:'Den ansvarigas personliga CRM-konto finns inte i den lästa kontolistan. Administratören behöver granska personprofilens kontolänk.'};
}
function payloadFor(draft:Draft):Payload|null{
 const review=draft.snapshot.review,task=review.task,profile=review.sourceProfile,account=draft.snapshot.account;
 return task&&profile&&account?{taskId:task.id,reason:draft.reason,reviewed:true,expectedContext:draft.expectedContext,expectedAccount:account.expectedAccount}:null;
}

export function CommercialTaskResponsibilityAnchor({st,taskId,space,save,busy,refresh,onClose,returnFocus,opener:sourceOpener}:Props){
 const reasonId=useId(),identity=identityFor(st,space,taskId),access=accessFor(st,identity),currentIdentity=useRef(identity),currentAccess=useRef(access),previousAccess=useRef(access);currentIdentity.current=identity;currentAccess.current=access;
 const currentBasis=basisFor(st,taskId),admin=st.viewer?.role==='admin';
 const [draft,setDraft]=useState<Draft|null>(null),[attempt,setAttempt]=useState<Attempt|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[remoteConflict,setRemoteConflict]=useState(false),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[fetched,setFetched]=useState<Fetched|null>(null);
 const lock=useRef(false),operation=useRef(0),alive=useRef(true),dialogHeading=useRef<HTMLHeadingElement|null>(null),opener=useRef<HTMLElement|null>(null);
 const visible=!!draft&&draft.identity===identity,locked=busy||submitting||refreshing,conflict=!!draft&&(remoteConflict||draft.expectedContext!==currentBasis),dirty=!!draft&&(draft.reason!==''||draft.reviewed||!!attempt);
 const snapshot=draft?.snapshot,profile=snapshot?.review.sourceProfile,account=snapshot?.account,blocked=snapshot?.review.blockedReason||snapshot&&accountBlocker(snapshot)||'';
 const validReason=!!draft?.reason.trim()&&draft.reason.trim().length<=4000;
 const canReview=visible&&admin&&!locked&&!discard&&!conflict&&!blocked&&validReason;
 const payload=draft?payloadFor(draft):null;
 const sameAttempt=!!attempt?.unknown&&!!draft&&attempt.editVersion===draft.editVersion&&!!payload&&JSON.stringify(attempt.payload)===JSON.stringify(payload);
 const canRetry=visible&&admin&&!locked&&!discard&&sameAttempt;
 const canSave=canRetry||canReview&&!!draft?.reviewed;

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  operation.current++;lock.current=false;setDraft(null);setAttempt(null);setError('');setNotice('');setRemoteConflict(false);setSubmitting(false);setRefreshing(false);setDiscard(false);setFetched(null);
  void open();
 },[identity]);
 useEffect(()=>{
  if(previousAccess.current===access)return;
  previousAccess.current=access;operation.current++;lock.current=false;setSubmitting(false);setRefreshing(false);setFetched(null);
  setDraft(previous=>previous?{...previous,reviewed:false}:previous);
  setAttempt(previous=>previous?{...previous,unknown:true}:previous);
  setError(admin?'Kontots uppgifter och administratörsroll har återlästs. Ditt formulär och ett eventuellt obekräftat försök finns kvar. Oförändrat försök kan återförsökas; en ny ändring kräver ny granskning.':'Kontots roll eller ansvarskoppling har ändrats. Ditt formulär och ett eventuellt obekräftat försök finns kvar. Administratörsrollen behövs för att granska eller spara kopplingen.');
 },[access]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous?.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);
 useEffect(()=>{
  if(!visible||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,dirty]);

 async function open(){
  if(!admin||lock.current)return;
  opener.current=sourceOpener||(document.activeElement instanceof HTMLElement?document.activeElement:null);
  const initial=snapshotFor(st,taskId),startedIdentity=identity,startedAccess=access,startedOperation=++operation.current;
  setDraft({identity,expectedContext:currentBasis,snapshot:initial,reason:'',reviewed:false,editVersion:0});setAttempt(null);setError('');setNotice('');setRemoteConflict(false);setDiscard(false);setFetched(null);
  if(initial.review.blockedReason||!initial.review.sourceProfile?.memberId)return;
  lock.current=true;setRefreshing(true);
  try{
   const read=await readAccount(space,initial.review);
   if(!alive.current||currentIdentity.current!==startedIdentity||currentAccess.current!==startedAccess||operation.current!==startedOperation)return;
   setDraft(previous=>previous?.identity===startedIdentity?{...previous,snapshot:{...previous.snapshot,...read},reviewed:false}:previous);
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation)setDraft(previous=>previous?.identity===startedIdentity?{...previous,snapshot:{...previous.snapshot,accountError:(e as Error).message||'CRM-kontot kunde inte hämtas.'},reviewed:false}:previous);}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation){lock.current=false;setRefreshing(false);}}
 }
 function finishClose(){setDraft(null);setAttempt(null);setDiscard(false);setError('');setNotice('');setRemoteConflict(false);setFetched(null);onClose();}
 function close(){if(locked||lock.current||discard)return;if(dirty)setDiscard(true);else finishClose();}
 function changeReason(value:string){
  if(!visible||!admin||locked||lock.current||discard)return;
  setDraft(previous=>previous?.identity===identity?{...previous,reason:value,reviewed:false,editVersion:previous.editVersion+1}:previous);setError('');setNotice('');
 }
 async function checkAccess(){
  if(!visible||admin||locked||lock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  lock.current=true;setRefreshing(true);setError('');setNotice('');
  try{
   // Only the current account's ordinary projected CRM read is used here.
   // It may restore the admin view, but never reads accounts or adopts basis.
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,taskId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats.');
   setNotice('Din roll har lästs från CRM: '+roleLabel(next.viewer?.role||'saknas')+'. Din orsak och det tidigare granskningsunderlaget finns kvar.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Din behörighet kunde inte läsas.')+' Din orsak och det tidigare underlaget finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){lock.current=false;setRefreshing(false);}}
 }
 async function fetchCurrent(){
  if(!visible||!admin||locked||lock.current||discard)return;
  const startedIdentity=identity,startedAccess=access,startedOperation=++operation.current;
  lock.current=true;setRefreshing(true);setError('');setNotice('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||currentAccess.current!==startedAccess||operation.current!==startedOperation)return;
   if(identityFor(next,space,taskId)!==startedIdentity||next.viewer?.role!=='admin')throw Error('Kontot eller arbetsytan har ändrats. Det tidigare formuläret finns kvar.');
   const latest=snapshotFor(next,taskId);
   if(!latest.review.blockedReason&&latest.review.sourceProfile?.memberId){
    try{Object.assign(latest,await readAccount(space,latest.review));}catch(e){latest.accountError=(e as Error).message||'CRM-kontot kunde inte hämtas.';}
   }
   if(!alive.current||currentIdentity.current!==startedIdentity||currentAccess.current!==startedAccess||operation.current!==startedOperation)return;
   setFetched({state:structuredClone(next),snapshot:latest});
   setNotice('Aktuellt uppgifts-, arbetsflödes- och kontounderlag har hämtats. Formuläret behåller din orsak och sitt tidigare granskningsunderlag. Välj Läs in nytt granskningsunderlag för en ny granskning.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation)setError(((e as Error).message||'Aktuellt underlag kunde inte hämtas.')+' Din orsak och det tidigare underlaget finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation){lock.current=false;setRefreshing(false);}}
 }
 function adopt(){
  if(!draft||!fetched||!visible||!admin||locked||lock.current||discard)return;
  if(identityFor(fetched.state,space,taskId)!==identity){setError('Kontot eller arbetsytan har ändrats. Det tidigare formuläret finns kvar.');return;}
  // Adopting a newly fetched basis is an explicit new intent. Never turn an
  // earlier unconfirmed write into a replay with silently replaced data.
  setDraft({...draft,expectedContext:basisFor(fetched.state,taskId),snapshot:structuredClone(fetched.snapshot),reviewed:false,editVersion:draft.editVersion+1});setRemoteConflict(false);setError('');
  setNotice('Det hämtade uppgifts-, arbetsflödes- och kontounderlaget är nu valt. Din orsak finns kvar. Granska personen, kontot och kopplingen igen innan du sparar.');
 }
 async function submit(){
  if(!draft||!payload||!canSave||lock.current)return;
  const submitted=canRetry?attempt!.payload:payload,startedIdentity=identity,startedAccess=access,startedOperation=++operation.current;
  lock.current=true;setSubmitting(true);setError('');setNotice('');setAttempt({payload:structuredClone(submitted),editVersion:draft.editVersion,unknown:true});
  try{
   let failureStatus=0,failureMessage='';
   const saved=await save('commercial_task_responsibility_anchor',submitted,false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||currentAccess.current!==startedAccess||operation.current!==startedOperation)return;
   if(saved)finishClose();
   else{
    const unknown=![400,409,413,422].includes(failureStatus);
    setAttempt(unknown?{payload:structuredClone(submitted),editVersion:draft.editVersion,unknown:true}:null);
    if(failureStatus===409){setRemoteConflict(true);setDraft(previous=>previous?{...previous,reviewed:false}:previous);}
    setError((failureMessage||'Kopplingen kunde inte bekräftas.')+' Din orsak och det tidigare underlaget finns kvar. '+(failureStatus===409?'Hämta aktuellt underlag, läs in det och granska igen.':unknown?'Försöket kan redan ha lyckats. Oförändrat återförsök använder samma granskade uppgifter.':'Kontrollera felbeskedet innan du granskar och försöker igen.'));
   }
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation){setAttempt({payload:structuredClone(submitted),editVersion:draft.editVersion,unknown:true});setError(((e as Error).message||'Kopplingen kunde inte bekräftas.')+' Din orsak och det tidigare underlaget finns kvar. Försöket kan redan ha lyckats. Oförändrat återförsök använder samma granskade uppgifter.');}}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&currentAccess.current===startedAccess&&operation.current===startedOperation){lock.current=false;setSubmitting(false);}}
 }
 function focusFallback(){
  if(currentIdentity.current!==identity)return null;
  return returnFocus?.()||null;
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

 const task=snapshot?.review.task,deal=snapshot?.review.deal,parent=snapshot?.review.parent,customer=snapshot?.review.customer;
 const parentIsOrder=snapshot?.review.parentType==='order',parentLabel=parentIsOrder?'Order':'Affär';
 const taskTitle=task?.title||'Uppgiften saknas i granskningsunderlaget';
 const kindLabels:Record<string,string>={quote:'Offertuppföljning',discovery:'Behovskartläggning',manual:'Manuell uppföljning',care:'Kundvård',meeting_followup:'Mötesuppföljning',handover:'Orderöverlämning',proof_deadline:'Korrekturbevakning',order_deadline:'Leveransbevakning',receipt:'Mottagningsbevakning',invoice_ready:'Fakturaförberedelse'};
 return <>
  <Dialog open={visible} onOpenChange={value=>{if(!value)close();}}><DialogContent className="business-ui customer-anchor-dialog commercial-anchor-dialog commercial-task-anchor-dialog" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{event.preventDefault();dialogHeading.current?.focus({preventScroll:true});}} onEscapeKeyDown={event=>{if(locked||lock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||lock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>restoreHandoverFocus(event,opener.current,focusFallback)}>
   <DialogHeader><div className="customer-anchor-head"><DialogTitle ref={dialogHeading} tabIndex={-1}><Link2 size={20} aria-hidden="true"/><span lang="sv">Koppla uppgifts<wbr/>ansvaret</span></DialogTitle><Button type="button" variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>Granska uppgiftens koppling till samma ansvariga persons CRM-konto i {workspaceLabel(space)}.</DialogDescription></DialogHeader>
   {draft&&snapshot&&<form onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||discard}>
    <section className="customer-anchor-card commercial-anchor-scope" aria-label="Uppgiften i granskningsunderlaget"><h3>{taskTitle}</h3><p><b>Kund:</b> {customer?.name||'Kundkopplingen saknas'}.</p><p><b>Registrerat uppgiftsansvar:</b> {task?.owner||'Saknas'}.</p><p><b>Uppgift:</b> {task?kindLabels[task.kind]||task.kind:'Saknas'}. <b>Status:</b> {task?task.done?'Avslutad':'Öppen':'Saknas'}.</p><p><b>Förfallodatum:</b> {displayDate(task?.due||'')}.</p><p className="biz-hint">Uppgiften har en äldre namnkoppling. Granska kopplingen till samma person som redan ansvarar för den kopplade {parentIsOrder?'ordern':'affären'}.</p></section>
    <section className="customer-anchor-card commercial-task-anchor-parent" aria-label="Arbetsflödet i granskningsunderlaget"><h3>{parentLabel} som uppgiften hör till</h3><p><b>{parent?deal?.title||parentLabel+' '+parent.id:'Arbetsflödeskopplingen saknas'}</b></p><p><b>Registrerat {parentIsOrder?'orderansvar':'affärsansvar'}:</b> {parent?.owner||'Saknas'}.</p><p><b>{parentIsOrder?'Ordersteg':'Affärssteg'}:</b> {parent?.stage?label(parentIsOrder?DELIVERY:[...PIPELINE,...OUTCOMES],parent.stage):'Saknas'}.</p><p className="biz-hint">Uppgiften kopplas till arbetsflödets redan granskade personprofil. Arbetsflödets ansvar ligger kvar.</p></section>
    <section className="customer-anchor-card customer-anchor-person" aria-label="Personen och kontot i granskningsunderlaget"><h3><UserRound size={18} aria-hidden="true"/>Samma ansvariga person</h3>{profile?<><p><b>{profile.displayName}</b><br/>Registrerad ansvarskoppling: {profile.legacyOwnerName}.</p><p><b>Personprofil:</b> {profile.active?'Aktuell':'Historisk'}.</p></>:<p>Ingen entydig granskad personprofil finns i underlaget.</p>}{account?<div className="customer-anchor-account"><p><b>CRM-konto:</b> {account.name}<br/>{account.email}</p><p><b>Roll i läst underlag:</b> {roleLabel(account.role)}. <b>Konto:</b> {account.active?'Aktivt':'Inaktivt'}. <b>Användaridentitet:</b> {account.connected?'Ansluten':'Inte ansluten'}.</p></div>:<p className="biz-hint">{refreshing?'Hämtar CRM-kontot…':'Ingen kontoanslutning har kunnat verifieras i detta granskningsunderlag.'}</p>}<p className="biz-hint">Den lästa kontoanslutningen är inget besked om personens egen lyckade inloggning.</p></section>
    {blocked&&!refreshing&&<p className="customer-anchor-warning" role="alert"><AlertTriangle size={18} aria-hidden="true"/><span>{blocked}</span></p>}
    {!admin&&<div className="customer-anchor-warning" role="alert"><div><p>Administratörsrollen behövs för att granska eller spara kopplingen. Din tidigare text och ditt underlag finns kvar att läsa.</p><Button type="button" variant="outline" onClick={()=>void checkAccess()}>Kontrollera min behörighet</Button></div></div>}
    <F label="Varför är det här rätt person? *"><Textarea id={reasonId} required rows={3} maxLength={4000} readOnly={!admin} value={draft.reason} aria-describedby={reasonId+'-hint'} placeholder="Beskriv underlaget för att uppgiften och arbetsflödet har samma ansvariga person." onChange={event=>changeReason(event.target.value)}/></F><p id={reasonId+'-hint'} className="biz-hint">Orsaken sparas i uppgiftens ansvarshistorik.</p>
    <section className="customer-anchor-review" aria-label="Granska uppgiftens ansvarskoppling"><h3>Det här sparas</h3><p><b>{taskTitle}</b> får en stabil koppling till samma ansvariga person: <b>{profile?.displayName||'profil saknas'}</b>.</p><p><b>Orsak:</b> <span className="customer-anchor-reason">{draft.reason||'Ange en orsak.'}</span></p><p>Kopplingen och den granskade personen registreras i denna uppgifts ansvarshistorik. Uppgiftens text, datum och öppna status ligger kvar.</p><p>Kundrelationens och arbetsflödets ansvar, övriga uppgifter, artikelantal, godkännanden, tryck och lager, leveranser och tidigare resultat ligger kvar.</p><label className="check-field"><Checkbox aria-label="Jag har granskat uppgiftens ansvarskoppling" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(canReview&&!lock.current)setDraft(previous=>previous?.identity===identity?{...previous,reviewed:value===true,editVersion:previous.editVersion+1}:previous);}}/><span>Jag har granskat uppgiften, det kopplade arbetsflödet, personen, kontot och orsaken.</span></label></section>
    {attempt?.unknown&&<div className="customer-anchor-pending" role="status"><b>Sparandet saknar kvittens</b><p>Försöket kan redan ha lyckats. {sameAttempt?'Du kan återförsöka samma sparning med det tidigare granskade underlaget.':'Du har ändrat formulärets avsikt. Ett nytt försök kräver aktuell granskning och ersätter inte kvittot från det tidigare försöket.'}</p></div>}
    {conflict&&<div className="record-conflict" role="alert"><b>Granskningsunderlaget har ändrats</b><p>Din orsak och det tidigare underlaget finns kvar. {sameAttempt?'Ett obekräftat, oförändrat försök kan fortfarande återförsökas. För en ny ändring behöver du hämta och läsa in aktuellt underlag.':'Hämta aktuellt underlag, läs in det och granska igen innan en ny sparning.'}</p></div>}
    <details className="biz-details customer-anchor-refresh"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning behåller formulärets tidigare underlag. Inläsning väljer det hämtade uppgifts-, arbetsflödes- och kontounderlaget, behåller din orsak och kräver en ny granskning.</p><div className="biz-buttons"><Button type="button" variant="outline" disabled={!admin} onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" disabled={!admin||!fetched} onClick={adopt}>Läs in nytt granskningsunderlag</Button></div>{fetched&&<div className="customer-anchor-fetched"><p><b>Senast hämtat uppgiftsansvar:</b> {fetched.snapshot.review.task?.owner||'Saknas'}. <b>Profil:</b> {fetched.snapshot.review.sourceProfile?.displayName||'Saknas'}.</p><p><b>Senast hämtat arbetsflöde:</b> {fetched.snapshot.review.parentType==='order'?'Order':fetched.snapshot.review.parentType==='deal'?'Affär':'Saknas'}{fetched.snapshot.review.parent?' · '+(fetched.snapshot.review.deal?.title||fetched.snapshot.review.parent.id):''}.</p><p><b>Senast hämtat konto:</b> {fetched.snapshot.account?fetched.snapshot.account.name+' · '+fetched.snapshot.account.email+' · '+roleLabel(fetched.snapshot.account.role):'Kontoanslutningen kunde inte verifieras.'}</p>{(fetched.snapshot.review.blockedReason||accountBlocker(fetched.snapshot))&&<p className="customer-anchor-warning">{fetched.snapshot.review.blockedReason||accountBlocker(fetched.snapshot)}</p>}</div>}</details>
    <details className="biz-details customer-anchor-technical"><summary>Visa kopplingens identifierare</summary><p><b>Uppgift:</b> {task?.id||'Saknas'}.<br/>{parentIsOrder&&<><b>Order:</b> {snapshot.review.order?.id||'Saknas'}.<br/></>}<b>Affär:</b> {deal?.id||'Saknas'}.<br/><b>Kund:</b> {customer?.id||'Saknas'}.<br/><b>Resultatprofil:</b> {profile?.id||'Saknas'}.<br/><b>CRM-konto:</b> {account?.id||profile?.memberId||'Saknas'}.</p></details>
    {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <p className="biz-hint">Formuläret sparas inte som privat utkast. Din text finns kvar medan dialogen är öppen; den försvinner om du stänger utan att spara eller laddar om sidan.</p>
    <div className="biz-buttons customer-anchor-footer"><Button type="button" variant="outline" onClick={close}>Stäng</Button><Button type="submit" disabled={!canSave||locked||discard}>{submitting?'Sparar…':sameAttempt?'Försök samma sparning igen':'Spara uppgiftskoppling'}</Button></div>
   </fieldset></form>}
   {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar kopplingen…'} Vänta innan du stänger.</p>}
  </DialogContent></Dialog>
  <AlertDialog open={discard&&visible} onOpenChange={value=>{if(!locked&&!lock.current)setDiscard(value);}}><AlertDialogContent className="customer-anchor-dialog customer-anchor-discard" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara kopplingen?</AlertDialogTitle><AlertDialogDescription>Din orsak och ditt granskningsunderlag försvinner om du stänger. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte en sådan ändring.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction disabled={locked} onClick={()=>{if(!locked&&!lock.current)finishClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
