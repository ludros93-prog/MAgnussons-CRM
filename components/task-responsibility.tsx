'use client';

import {restoreHandoverFocus} from './handover-focus';
import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {AlertTriangle,ArrowRightLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {taskResponsibilityBasis,taskResponsibilityCandidates} from '@/lib/task-responsibility';
import type {State} from '@/lib/crm';
import {BusinessField as F,displayDate,type SaveAction} from './business-ui';

type Snapshot=ReturnType<typeof taskResponsibilityCandidates>;
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;targetProfileId:string;reason:string;reviewed:boolean};
type Props={st:State;taskId:string;space:string;save:SaveAction;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,taskId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',taskId]);
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const sourceLabel={task:'Uppgiftens ansvar',customer:'Kundöverlämning',deal:'Affärsöverlämning',order:'Orderöverlämning',onboarding:'Onboardingöverlämning',customer_issue:'Kundärende',yearwheel:'Årshjul'};
const takeSnapshot=(st:State,taskId:string):Snapshot=>structuredClone(taskResponsibilityCandidates(st,taskId));

export function TaskResponsibility({st,taskId,space,save,busy,refresh,onClose,returnFocus}:Props){
 const selectedProfileDescriptionId=useId(),identity=identityFor(st,space,taskId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=taskResponsibilityBasis(st,taskId),admin=st.viewer?.role==='admin',initialized=st.settings.sellerProfilesInitialized;
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:takeSnapshot(st,taskId),targetProfileId:'',reason:'',reviewed:false}));
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[fetchedState,setFetchedState]=useState<State|null>(null);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const visible=draft.identity===identity&&admin&&initialized,conflict=draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const snapshot=draft.snapshot,target=snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId),task=snapshot.task;
 const anchor=!!target&&!task?.ownerProfileId&&target.id===snapshot.sourceProfile?.id;
 const currentOwner=snapshot.sourceProfile?profileLabel(snapshot.sourceProfile):task?.owner||'Ansvar saknas i underlaget';
 const title=task?.ownerProfileId?'Byt uppgiftsansvar':'Förankra ansvar';
 const canReview=visible&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot.blockedReason;
 const dirty=!!draft.targetProfileId||draft.reason!=='';

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
  // A completed read may precede the parent's render. Fetching itself never
  // replaces the opening basis or the administrator's intent.
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,taskId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna uppgiften på nytt.');return;}
  const next=takeSnapshot(latest,taskId),targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:taskResponsibilityBasis(latest,taskId),snapshot:next,targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});setError('');
  setNotice('Aktuellt underlag har lästs in. Din orsak och möjliga val finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,taskId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna uppgiften på nytt.');
   setFetchedState(structuredClone(next));setNotice('Aktuella uppgifter har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska ändringen igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((e as Error).message||'Aktuellt underlag kunde inte hämtas. Din text och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!visible||locked||submitLock.current||discard||!canReview||!draft.reviewed)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  try{
   const saved=await save('task_responsibility_transfer',{taskId,targetProfileId:draft.targetProfileId,reason:draft.reason.trim(),reviewed:true,expectedContext:draft.expectedContext},false);
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)onClose();
   else setError('Ändringen kunde inte bekräftas. Din text och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade val.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Ändringen kunde inte bekräftas.')+' Din text och dina val finns kvar.');}
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
   <DialogContent className="business-ui task-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>{if(returnFocus){restoreHandoverFocus(event,opener.current,returnFocus);return;}if(opener.current?.isConnected){event.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0">
     <div className="task-responsibility-head"><DialogTitle className="flex items-start gap-2"><ArrowRightLeft className="shrink-0" size={19}/><span className="min-w-0">{title}</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div>
     <DialogDescription>{snapshot.customer?.name||'Kundkopplingen saknas'} · {task?.title||'Uppgiften finns inte längre'}. Granska ansvar för den här uppgiften.</DialogDescription>
    </DialogHeader>
    <form className="min-w-0" onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
     <section className="task-responsibility-current" aria-label="Nuvarande uppgiftsansvar"><p><b>Nuvarande ansvar:</b> {currentOwner}</p><p>Sista datum: {displayDate(task?.due||'')}</p><p className="biz-hint">{task?.ownerProfileId?'Uppgiften är kopplad till en granskad säljarprofil.':'Äldre ansvar behöver förankras. Välj den nuvarande profilen för att behålla samma person, eller en annan aktiv profil för att byta ansvar.'} Ursprunglig ansvarskoppling visas när namnen skiljer sig åt.</p></section>
     {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
     <F label="Ansvarig efter ändringen *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="task-responsibility-select *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:overflow-hidden" aria-label="Ansvarig efter ändringen" aria-describedby={target?selectedProfileDescriptionId:undefined} style={{height:'auto',minHeight:44,width:'100%',minWidth:0,whiteSpace:'normal'}}><SelectValue><span className="task-responsibility-selected">{target?profileLabel(target):'Välj ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="task-responsibility-options max-w-[calc(100vw-2rem)]"><SelectItem value="_none" className="min-h-11 whitespace-normal">Välj ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id} className="min-h-11 whitespace-normal break-words"><span className="min-w-0">{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint break-words"><b>Vald ansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}.</p>}
     <F label="Varför ändras ansvarskopplingen? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv varför ansvaret förankras eller byts." value={draft.reason} onChange={event=>update({reason:event.target.value})}/></F>
     <section className="biz-callout" aria-label="Granska uppgiftsansvaret"><h3>Granska ändringen</h3><p><b>{task?.title||'Uppgiften saknas'}</b>: {currentOwner} → {target?profileLabel(target):'välj ansvarig'}.</p><p>{anchor?'Samma person behåller uppgiften; den äldre ansvarskopplingen förankras i personens profil.':'Endast den här uppgiftens ansvar ändras.'}</p><p>Orsak: {draft.reason.trim()||'ange en orsak'}</p><p>Kundens ansvar ligger kvar hos {snapshot.customer?.owner||'kundens registrerade ansvariga'}. Övriga uppgifter, affärer, order, möten och historiska försäljningsresultat behåller sitt ansvar.</p><label className="check-field"><Checkbox aria-label="Jag har granskat uppgiftsansvaret" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat ansvarig, orsak och att endast den här uppgiftens ansvar ändras.</span></label></section>
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16}/>Granskningsunderlaget har ändrats</b><p>Din text och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formulärets tidigare underlag. Läs in nytt granskningsunderlag använder de aktuella uppgifterna och behåller din orsak och möjliga val. Granskningen måste göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!task?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ansvarsändringar ({task.responsibilityTransfers.length})</summary>{[...task.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.action==='anchor'?'Förankrat ansvar':'Bytt ansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>{sourceLabel[row.source]} · {snapshot.customer?.name||'Kund'} · {task.title}. Referens: {row.id}.</small></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Formuläret sparas inte som privat utkast. Din text och dina val finns kvar medan dialogen är öppen. Kopiera orsaken före omladdning; den försvinner om du stänger utan att spara.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':anchor?'Spara förankrat ansvar':'Spara nytt uppgiftsansvar'}</Button></div>
    </fieldset></form>
    {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar ansvarsändringen…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="task-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara ansvarsändringen?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
