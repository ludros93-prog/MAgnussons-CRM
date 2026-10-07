'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,ArrowRightLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {yearwheelResponsibilityBasis,yearwheelResponsibilityCandidates} from '@/lib/yearwheel-responsibility';
import type {State,Task} from '@/lib/crm';
import {BusinessField as F,displayDate} from './business-ui';

type Snapshot=ReturnType<typeof yearwheelResponsibilityCandidates>;
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;targetProfileId:string;selectedTaskIds:string[];reason:string;reviewed:boolean};
export type YearwheelResponsibilitySave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props={st:State;customerId:string;needId:string;space:string;save:YearwheelResponsibilitySave;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void};
const identityFor=(st:State,space:string,customerId:string,needId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',customerId,needId]);
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const takeSnapshot=(st:State,customerId:string,needId:string):Snapshot=>structuredClone(yearwheelResponsibilityCandidates(st,customerId,needId));
const taskMeta=(task:Task)=>displayDate(task.due)+' · ansvarig '+task.owner;

export function YearwheelResponsibilityDialog({st,customerId,needId,space,save,busy,refresh,onClose}:Props){
 const selectedProfileDescriptionId=useId(),titleRef=useRef<HTMLHeadingElement>(null);
 const identity=identityFor(st,space,customerId,needId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=yearwheelResponsibilityBasis(st,customerId,needId),admin=st.viewer?.role==='admin',initialized=st.settings.sellerProfilesInitialized;
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:takeSnapshot(st,customerId,needId),targetProfileId:'',selectedTaskIds:[],reason:'',reviewed:false}));
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[fetchedState,setFetchedState]=useState<State|null>(null);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const closeFallback=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.querySelector('.yearwheel-heading'));
 const visible=draft.identity===identity&&admin&&initialized,conflict=draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const snapshot=draft.snapshot,need=snapshot.need,target=snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId);
 const selected=snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)),leftEligible=snapshot.eligible.filter(task=>!draft.selectedTaskIds.includes(task.id));
 const excludedOpen=snapshot.excluded.filter(row=>!row.task.done),excludedDone=snapshot.excluded.filter(row=>row.task.done);
 const anchor=!!target&&!need?.ownerProfileId&&target.id===snapshot.sourceProfile?.id;
 const currentOwner=snapshot.sourceProfile?profileLabel(snapshot.sourceProfile):need?.owner||'Ansvar saknas i underlaget';
 const title=need?.ownerProfileId?'Byt behovsansvar':'Förankra behovsansvar';
 const canReview=visible&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot.blockedReason&&draft.selectedTaskIds.length<=500;
 const dirty=!!draft.targetProfileId||draft.reason!==''||draft.selectedTaskIds.length>0;

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  if(draft.identity===identity&&admin&&initialized)return;
  operation.current++;submitLock.current=false;setDiscard(false);setFetchedState(null);onClose();
 },[identity,admin,initialized,draft.identity,onClose]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);
 useEffect(()=>{
  if(!visible||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visible,dirty]);

 function close(){
  if(locked||submitLock.current||discard)return;
  if(dirty)setDiscard(true);else onClose();
 }
 function update(patch:Partial<Draft>){
  if(!visible||locked||submitLock.current||discard)return;
  setDraft(previous=>previous.identity===identity?{...previous,...patch,reviewed:false}:previous);setError('');
 }
 function readCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  // Fetching never adopts a new basis. Only this explicit reviewed action does.
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,customerId,needId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna överlämningen på nytt.');return;}
  const next=takeSnapshot(latest,customerId,needId),eligibleIds=new Set(next.eligible.map(task=>task.id)),targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  const removed=draft.snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)&&!eligibleIds.has(task.id));
  setDraft({...draft,expectedContext:yearwheelResponsibilityBasis(latest,customerId,needId),snapshot:next,targetProfileId:targetValid?draft.targetProfileId:'',selectedTaskIds:draft.selectedTaskIds.filter(id=>eligibleIds.has(id)),reviewed:false});setError('');
  setNotice('Aktuellt underlag har lästs in. Orsaken och möjliga val finns kvar. Granska ändringen igen.'+(removed.length?' Dessa uppgifter kan inte längre väljas: '+removed.map(task=>task.title).join(', ')+'.':'')+(!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,customerId,needId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna överlämningen på nytt.');
   setFetchedState(structuredClone(next));setNotice('Aktuella uppgifter har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska ändringen igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((e as Error).message||'Aktuellt underlag kunde inte hämtas. Din orsak och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!visible||locked||submitLock.current||discard||!canReview||!draft.reviewed)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  try{
   let status=0,message='';
   const saved=await save('yearwheel_responsibility_transfer',{customerId,needId,targetProfileId:draft.targetProfileId,selectedTaskIds:draft.selectedTaskIds,reason:draft.reason.trim(),reviewed:true,expectedContext:draft.expectedContext},false,(code,text)=>{status=code;message=text||''});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)onClose();
   else if(status>0&&status<500)setError((message||'Ändringen kunde inte sparas.')+' Din orsak och dina val finns kvar.'+(status===409?' Hämta och granska aktuellt underlag innan du försöker igen.':''));
   else setError('Ändringen kunde inte bekräftas. '+(message?message+' ':'')+'Din orsak och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade val.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Ändringen kunde inte bekräftas.')+' Din orsak och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setSubmitting(false);}}
 }
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const sheet=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,summary,[role=combobox]'))return;
  requestAnimationFrame(()=>{
   if(!alive.current||!control.isConnected||document.activeElement!==control||!sheet.contains(control))return;
   const box=control.getBoundingClientRect(),bounds=sheet.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;
   if(box.height>bottom-top)return;
   if(box.top<top)sheet.scrollBy({top:box.top-top,behavior:'instant'});
   else if(box.bottom>bottom)sheet.scrollBy({top:box.bottom-bottom,behavior:'instant'});
  });
 }

 return <>
  <Dialog open={visible} onOpenChange={value=>{if(!value)close();}}>
   <DialogContent className="business-ui yearwheel-responsibility-dialog" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{if(titleRef.current){event.preventDefault();titleRef.current.focus({preventScroll:true});}}} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>{if(currentIdentity.current!==identity){event.preventDefault();return;}if(opener.current?.isConnected&&!opener.current.matches(':disabled,[aria-disabled=true]')){event.preventDefault();opener.current.focus({preventScroll:true});}else if(closeFallback.current?.isConnected&&!closeFallback.current.closest('[inert],[aria-hidden=true]')){event.preventDefault();closeFallback.current.focus({preventScroll:true});}}}>
    <DialogHeader>
     <div className="yearwheel-responsibility-head"><DialogTitle ref={titleRef} tabIndex={-1}><ArrowRightLeft aria-hidden="true" size={19}/><span>{title}</span></DialogTitle><Button type="button" variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div>
     <DialogDescription>{snapshot.customer?.name||'Kundkopplingen saknas'} · granska vem som ansvarar för årshjulsbehovet och vilka öppna årshjulsuppgifter som följer med.</DialogDescription>
    </DialogHeader>
    <form onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
     <section className="yearwheel-responsibility-current" aria-label="Nuvarande behovsansvar"><p><b>Inköpsbehov:</b> {need?.title||'Behovet saknar beskrivning'}</p><p><b>Omfattning och förberedelser:</b> {need?.notes||'Ingen anteckning'}</p><p><b>Nuvarande ansvar:</b> {currentOwner}</p><p><b>Registrerad ansvarskoppling:</b> {need?.owner||'Saknas'}.</p><p><b>Sparat profil-ID:</b> {need?.ownerProfileId||'Tomt · äldre ansvar behöver förankras'}.</p>{snapshot.sourceProfile&&<p><b>Granskad profil:</b> {snapshot.sourceProfile.displayName} · {snapshot.sourceProfile.legacyOwnerName}. <b>Granskat profil-ID:</b> {snapshot.sourceProfile.id}. {snapshot.sourceProfile.active?'Aktiv profil.':'Inaktiv profil; ansvaret kan lämnas över till en aktiv profil.'}</p>}<p>Behövs hos kunden: {displayDate(need?.due||'')}.</p><p className="biz-hint">{need?.ownerProfileId?'Årshjulsbehovet har ett sparat profil-ID. En motsägande eller saknad profil visas som granskningsbehov.':'Äldre ansvar behöver förankras. Välj den nuvarande profilen för att behålla samma person, eller en annan aktiv profil för att byta ansvar.'} Profilens ursprungliga ansvarskoppling visas när namnen skiljer sig åt.</p></section>
     {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
     <F label="Ansvarig efter ändringen *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="yearwheel-responsibility-select" aria-label="Ansvarig efter ändringen" aria-describedby={target?selectedProfileDescriptionId:undefined}><SelectValue><span className="yearwheel-responsibility-choice-label">{target?target.displayName:'Välj ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="yearwheel-responsibility-options"><SelectItem value="_none">Välj ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id}><span>{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint"><b>Vald ansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}. <b>Profil-ID:</b> {target.id}. Aktiv profil.</p>}
     <F label="Varför ändras behovsansvaret? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv varför ansvaret förankras eller byts." value={draft.reason} onChange={event=>update({reason:event.target.value})}/></F>
     <section className="biz-group" aria-label="Behovsuppgifter som kan följa med"><h3>Uppgifter som kan följa med ({snapshot.eligible.length})</h3><p className="biz-hint">Ingen uppgift är vald från början. Välj bara de öppna årshjulsuppgifter som ska få samma ansvariga.</p>
      {snapshot.eligible.map(task=><label className="check-field" key={task.id}><Checkbox aria-label={'Flytta årshjulsuppgiften '+task.title} checked={draft.selectedTaskIds.includes(task.id)} onCheckedChange={value=>update({selectedTaskIds:value===true?[...draft.selectedTaskIds.filter(id=>id!==task.id),task.id]:draft.selectedTaskIds.filter(id=>id!==task.id)})}/><span><b>{task.title}</b><small>{taskMeta(task)}</small></span></label>)}
      {!snapshot.eligible.length&&<p>Inga öppna årshjulsuppgifter kan följa med.</p>}
     </section>
     <details className="biz-details"><summary>Uppgifter som ligger kvar ({leftEligible.length+excludedOpen.length} öppna)</summary><p>Uppgifter som inte valts, andra arbetsflöden och uppgifter kopplade till affär eller order behåller sitt ansvar.</p>
      {leftEligible.map(task=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>Ligger kvar eftersom den inte är vald.</small></article>)}
      {excludedOpen.map(({task,reason})=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>{reason}</small></article>)}
      {!!excludedDone.length&&<p>{excludedDone.length} avslutade uppgifter behåller sitt historiska ansvar.</p>}
     </details>
     <section className="biz-callout" aria-label="Granska behovsansvaret"><h3>Granska ändringen</h3><p><b>{snapshot.customer?.name||'Kundkopplingen saknas'}:</b> {need?.title||'Inköpsbehov'}.</p><p><b>Behovsansvar:</b> {currentOwner} → {target?profileLabel(target):'välj ansvarig'}.</p><p>{anchor?'Samma person behåller ansvaret; den äldre kopplingen förankras i personens profil.':'Årshjulsbehovet får den valda ansvariga.'}</p><p><b>{selected.length} valda uppgifter följer med.</b> {leftEligible.length+excludedOpen.length} öppna uppgifter ligger kvar.</p>{selected.map(task=><p key={task.id}>{task.title} · {displayDate(task.due)} · {task.owner} → {target?profileLabel(target):'välj ansvarig'}.</p>)}<p>Orsak: {draft.reason.trim()||'ange en orsak'}</p><p>Kundansvar, affär, order, onboarding, kundärenden, möten, andra årshjulsbehov och historiska försäljningsresultat behåller sina ansvariga. Behovets text, status, leveransdatum, framförhållning och upprepning ligger kvar. Ingen kundkontakt registreras.</p><label className="check-field"><Checkbox aria-label="Jag har granskat behovsansvaret" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat ansvarig, orsak och exakt vilka årshjulsuppgifter som följer med.</span></label></section>
     {draft.selectedTaskIds.length>500&&<p className="error" role="alert">Högst 500 årshjulsuppgifter kan följa med. Välj bort uppgifter och granska igen.</p>}
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle aria-hidden="true" size={16}/>Granskningsunderlaget har ändrats</b><p>Din orsak och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formulärets tidigare underlag. Läs in nytt granskningsunderlag använder de aktuella uppgifterna och behåller din orsak och möjliga val. Granskningen måste göras igen.</p><div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!need?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ansvarsändringar ({need.responsibilityTransfers.length})</summary>{[...need.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.action==='anchor'?'Förankrat ansvar':'Bytt ansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>Tidigare sparat profil-ID: {row.fromRecordedProfileId||'Tomt · äldre ansvar'}. Granskad frånprofil: {row.fromProfileId}. Tillprofil: {row.toProfileId}. {row.selectedTaskIds.length} valda årshjulsuppgifter.</small></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Den här överlämningens orsak och val sparas i CRM först vid Spara. Kopiera orsaken före omladdning; överlämningen sparas inte som privat utkast.</p>
     <div className="biz-buttons"><Button type="button" variant="outline" onClick={close}>Stäng</Button><Button type="submit" disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':anchor?'Spara förankrat behovsansvar':'Spara nytt behovsansvar'}</Button></div>
    </fieldset></form>
    {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar ansvarsändringen…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="yearwheel-responsibility-dialog" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara överlämningen?</AlertDialogTitle><AlertDialogDescription>Orsaken och valen i överlämningen försvinner. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={locked}>Fortsätt granska</AlertDialogCancel><AlertDialogAction disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
