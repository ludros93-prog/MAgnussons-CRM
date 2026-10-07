'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,Archive,History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import type {State} from '@/lib/crm';
import {sellerProfileRetirementBasis,sellerProfileRetirementReview} from '@/lib/seller-profile-retirement';
import {BusinessField as F} from './business-ui';
import {restoreHandoverFocus} from './handover-focus';
import type {FollowUpSaveAction} from './follow-up-dialog';

export type RetirementSave=FollowUpSaveAction;
type Review=ReturnType<typeof sellerProfileRetirementReview>;
type Draft={identity:string;expectedContext:string;snapshot:Review;reason:string;reviewed:boolean};
type Props={st:State;space:'demo'|'live';profileId:string;save:RetirementSave;busy:boolean;refresh:()=>Promise<State>};
const identityFor=(st:State,space:string,profileId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',profileId]);
const snapshotFor=(st:State,profileId:string):Review=>structuredClone(sellerProfileRetirementReview(st,profileId));
const workspaceName=(space:'demo'|'live')=>space==='live'?'Magnussons':'Demo';

export function SellerProfileRetirement({st,space,profileId,save,busy,refresh}:Props){
 const headingId=useId(),reasonId=useId(),identity=identityFor(st,space,profileId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const review=sellerProfileRetirementReview(st,profileId),basis=sellerProfileRetirementBasis(st,profileId),profile=review.profile;
 const [draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[remoteConflict,setRemoteConflict]=useState(false),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[success,setSuccess]=useState(''),[fetchedState,setFetchedState]=useState<State|null>(null);
 const lock=useRef(false),operation=useRef(0),alive=useRef(true),panel=useRef<HTMLElement|null>(null),heading=useRef<HTMLHeadingElement|null>(null),opener=useRef<HTMLElement|null>(null);
 const admin=st.viewer?.role==='admin',visible=!!draft&&draft.identity===identity&&admin&&st.settings.sellerProfilesInitialized;
 const locked=busy||submitting||refreshing,conflict=!!draft&&(remoteConflict||draft.expectedContext!==basis),dirty=!!draft&&(draft.reason!==''||draft.reviewed);
 const snapshot=draft?.snapshot,snapshotProfile=snapshot?.profile;
 const canReview=visible&&!locked&&!discard&&!conflict&&!snapshot?.blockedReason&&!!snapshotProfile?.active&&!!draft?.reason.trim();

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  operation.current++;lock.current=false;setDraft(null);setError('');setNotice('');setRemoteConflict(false);setDiscard(false);setSuccess('');setSubmitting(false);setRefreshing(false);setFetchedState(null);
 },[identity,admin]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous?.reviewed?{...previous,reviewed:false}:previous);},[conflict,basis]);
 useEffect(()=>{
  if(!visible||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,dirty]);

 function open(){
  if(!admin||locked||lock.current||!profile?.active||!st.settings.sellerProfilesInitialized)return;
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setDraft({identity,expectedContext:basis,snapshot:snapshotFor(st,profileId),reason:'',reviewed:false});setError('');setNotice('');setRemoteConflict(false);setDiscard(false);setSuccess('');setFetchedState(null);
 }
 function close(){
  if(locked||lock.current||discard)return;
  if(dirty)setDiscard(true);else setDraft(null);
 }
 function changeReason(reason:string){
  if(!visible||locked||lock.current||discard)return;
  setDraft(previous=>previous?.identity===identity?{...previous,reason,reviewed:false}:previous);setError('');
 }
 function adopt(){
  if(!visible||locked||lock.current||discard)return;
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,profileId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna profilgranskningen på nytt.');return;}
  setDraft(previous=>previous?.identity===identity?{...previous,expectedContext:sellerProfileRetirementBasis(latest,profileId),snapshot:snapshotFor(latest,profileId),reviewed:false}:previous);
  setRemoteConflict(false);setError('');setNotice('Aktuellt granskningsunderlag har lästs in. Din orsak finns kvar. Granska profilen och kvarvarande ansvar igen.');
 }
 async function fetchCurrent(){
  if(!visible||locked||lock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  lock.current=true;setRefreshing(true);setError('');setNotice('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,profileId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna profilgranskningen på nytt.');
   setFetchedState(structuredClone(next));
   setNotice('Aktuellt CRM-underlag har hämtats. Formuläret behåller sitt tidigare granskningsunderlag och din orsak. Välj Läs in aktuellt granskningsunderlag och granska igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Aktuellt underlag kunde inte hämtas.')+' Din orsak och det tidigare granskningsunderlaget finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){lock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!draft||!canReview||!draft.reviewed||lock.current)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  lock.current=true;setSubmitting(true);setError('');setNotice('');
  try{
   let failureStatus=0,failureMessage='';
   const ok=await save('seller_profile_retire',{profileId,expectedContext:draft.expectedContext,reason:draft.reason.trim(),reviewed:true},false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(ok){
    setSuccess('Resultatprofilen är nu historisk i '+workspaceName(space)+'. Profil-ID, historik och sparad kontolänk är bevarade. CRM-kontot och sidåtkomsten har inte ändrats.');setDraft(null);setDiscard(false);
   }else{
    if(failureStatus===409){setRemoteConflict(true);setDraft(previous=>previous?{...previous,reviewed:false}:previous);}
    setError((failureMessage||'Profiländringen kunde inte bekräftas.')+' Din orsak finns kvar. '+(failureStatus===409?'Läs in aktuellt granskningsunderlag och granska igen.':'Ett obekräftat försök kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade uppgifter.'));
   }
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Profiländringen kunde inte bekräftas.')+' Din orsak finns kvar. Ett obekräftat försök kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade uppgifter.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){lock.current=false;setSubmitting(false);}}
 }
 function returnFocus(){
  if(!alive.current||currentIdentity.current!==identity||!panel.current?.isConnected)return null;
  return heading.current||document.getElementById('staff-handover-heading');
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
 if(!admin||!profile||!st.settings.sellerProfilesInitialized)return null;
 const history=profile.retirementHistory||[];

 return <section ref={panel} className="seller-profile-retirement" aria-labelledby={headingId}>
  <div className="seller-profile-retirement-head"><div><span className="biz-kicker">PROFILENS FORTSATTA ANSVAR</span><h3 ref={heading} id={headingId} tabIndex={-1}><Archive size={20} aria-hidden="true"/><span>{profile.active?'Granska profilavslut':'Historisk resultatprofil'}</span></h3><p><b>{profile.displayName}</b> · arbetsyta: {workspaceName(space)}.</p></div>{profile.active&&<Button type="button" variant="outline" disabled={locked} onClick={open}>Granska profilavslut</Button>}</div>
  <dl className="seller-profile-retirement-facts"><div><dt>Resultatprofil</dt><dd>{profile.active?'Aktuell profil':'Historisk profil'}</dd></div><div><dt>CRM-konto</dt><dd>{profile.memberId?'Sparad kontolänk; kontots aktivitet kontrolleras under Registrerade CRM-konton.':'Ingen sparad kontolänk. Det säger inte om personen har ett annat CRM-konto.'}</dd></div><div><dt>Sidåtkomst</dt><dd>Hanteras separat; inte kontrollerad här.</dd></div></dl>
  <p><b>Profil-ID:</b> {profile.id}. <b>Äldre ansvarskoppling:</b> {profile.legacyOwnerName}.</p>{profile.memberId&&<p><b>Sparad kontolänk:</b> {profile.memberId}.</p>}
  {profile.active?<><p>Profilavslut granskar hela den här profilens kvarvarande operativa ansvar i vald arbetsyta, oavsett sökning och filter ovan. Tidigare resultat och avslutat arbete ligger kvar hos samma person.</p><p className="seller-profile-retirement-summary"><b>{review.blockers.length} kvarvarande ansvarsdelar i hela profilens underlag.</b> {review.blockedReason||'Inga ansvarsdelar återstår i den här granskningen. Kontot, andra arbetsytor, produktionens användaransvar och sidåtkomsten är separata.'}</p></>:<p>Den historiska profilen och dess sparade resultat finns kvar. Profilstatusen visar inte om CRM-kontot eller sidåtkomsten är avstängda.</p>}
  {!!history.length&&<details className="biz-details seller-profile-retirement-history"><summary><History size={17} aria-hidden="true"/><span>Sparade profilavslut ({history.length})</span></summary>{[...history].reverse().map(row=><article key={row.id}><b>{row.displayName} · {row.owner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="seller-profile-retirement-reason">{row.reason}</p><p><b>Profil-ID:</b> {row.profileId}. <b>Referens:</b> {row.id}.</p></article>)}</details>}
  {success&&<p className="seller-profile-retirement-success" role="status">{success}</p>}
  <Dialog open={visible} onOpenChange={value=>{if(!value)close();}}><DialogContent className="business-ui seller-profile-retirement-dialog" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={event=>{if(locked||lock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||lock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>restoreHandoverFocus(event,opener.current,returnFocus)}>
   <DialogHeader><div className="seller-profile-retirement-head"><DialogTitle><Archive size={20} aria-hidden="true"/><span>Gör resultatprofil historisk</span></DialogTitle><Button type="button" variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>Granska en resultatprofil i arbetsytan {workspaceName(space)}. Kontots och sidans åtkomst ändras separat.</DialogDescription></DialogHeader>
   {draft&&<form onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
    <section className="seller-profile-retirement-current" aria-label="Profilen som ska granskas"><h3>{snapshotProfile?.displayName||'Profilen saknas i granskningsunderlaget'}</h3><p><b>Profil-ID:</b> {snapshotProfile?.id||profileId}.</p><p><b>Äldre ansvarskoppling:</b> {snapshotProfile?.legacyOwnerName||'Saknas'}.</p><p><b>Sparad kontolänk:</b> {snapshotProfile?.memberId||'Ingen registrerad kontolänk'}.</p><p><b>Arbetsyta:</b> {workspaceName(space)}. {snapshotProfile?.active?'Profilen är aktuell i granskningsunderlaget.':'Profilen är redan historisk eller saknas.'}</p></section>
    <section className="seller-profile-retirement-blockers" aria-label="Hela profilens kvarvarande ansvar"><h3>Kvarvarande ansvar före profilavslut</h3><p><b>{snapshot?.blockers.length||0} ansvarsdelar.</b> Listan gäller hela profilens granskningsunderlag. Sökning och filter i översikten ovan påverkar inte profilavslutet.</p>{!!snapshot?.blockers.length&&<ol>{snapshot.blockers.map(row=><li key={row.key}><b>{row.typeLabel}: {row.title}</b><p><b>Kund:</b> {row.customerName||'Ingen kundkoppling'}. <b>Status:</b> {row.status}.</p><p><b>Registrerat ansvar:</b> {row.owner||'Saknas'}. {row.ownerProfileId&&<><b>Profil-ID:</b> {row.ownerProfileId}.</>}</p><p>{row.hint}</p></li>)}</ol>}{snapshot?.blockedReason&&<p className="seller-profile-retirement-warning" role="alert"><AlertTriangle size={18} aria-hidden="true"/><span>{snapshot.blockedReason}</span></p>}</section>
    <section className="seller-profile-retirement-current" aria-label="Det här ändras och bevaras"><h3>Det här ändras i {workspaceName(space)}</h3><p>Resultatprofilen blir historisk och dess operativa ansvarskoppling tas bort i den här arbetsytan. Den kan därefter inte väljas för nytt operativt ansvar.</p><p><b>Det här bevaras:</b> profil-ID, äldre ansvarskoppling, historiska resultat, mål, avslutat arbete och sparad kontolänk.</p><p>CRM-kontot, sidåtkomsten, andra arbetsytor, privata utkast, personlig Outlook och produktionens användaransvar ändras inte. Detta är ett profilavslut, ingen full personalavveckling.</p></section>
    <F label="Varför ska profilen bli historisk? *"><Textarea id={reasonId} aria-describedby={reasonId+'-hint'} required rows={3} maxLength={4000} value={draft.reason} placeholder="Beskriv orsaken till profilavslutet." onChange={event=>changeReason(event.target.value)}/></F><p id={reasonId+'-hint'} className="biz-hint">Orsaken sparas i profilens historik. Historiska resultat tilldelas ingen ersättare.</p>
    <label className="check-field seller-profile-retirement-review"><Checkbox aria-label="Jag har granskat profilavslutet i denna arbetsyta" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(canReview&&!lock.current)setDraft(previous=>previous?.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat profilens identitet, kvarvarande ansvar och orsak och vill göra den historisk i denna arbetsyta.</span></label>
    {conflict&&<div className="record-conflict" role="alert"><b>Granskningsunderlaget har ändrats</b><p>Din orsak finns kvar med det tidigare underlaget. Läs in aktuellt granskningsunderlag och granska igen innan du sparar.</p></div>}
    <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning behåller formulärets tidigare underlag och din orsak. Läs in aktuellt granskningsunderlag använder den aktuella versionen. Granskningsrutan blir tom och behöver markeras på nytt.</p><div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" onClick={adopt}>Läs in aktuellt granskningsunderlag</Button></div></details>
    {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <p className="biz-hint">Formuläret har inget privat serverutkast. Din orsak finns kvar medan dialogen är öppen. Kopiera den före omladdning eller stängning utan att spara.</p>
    <div className="biz-buttons"><Button type="button" variant="outline" onClick={close} disabled={discard}>Stäng</Button><Button type="submit" disabled={!canReview||!draft.reviewed||locked||discard}>{submitting?'Sparar profilavslut…':'Gör profilen historisk i denna arbetsyta'}</Button></div>
   </fieldset></form>}
   {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar profilavslut…'} Vänta innan du stänger.</p>}
  </DialogContent></Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!lock.current)setDiscard(value);}}><AlertDialogContent className="seller-profile-retirement-dialog" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara profilavslutet?</AlertDialogTitle><AlertDialogDescription>Din orsak och granskning försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat försök kan redan ha ändrat profilen; stängning återställer inte ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={locked}>Fortsätt granska</AlertDialogCancel><AlertDialogAction disabled={locked} onClick={()=>{if(!locked&&!lock.current){setDiscard(false);setDraft(null);}}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}
