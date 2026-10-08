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
import {companyEventResponsibilityBasis,companyEventResponsibilityCandidates} from '@/lib/company-event-responsibility';
import {companyActivityOwnerLabel} from '@/lib/company-activity-responsibility';
import type {State} from '@/lib/crm';
import {BusinessField as F,displayDate} from './business-ui';
import {eventCategories,eventStatuses} from './company-event-draft-preview';

type Snapshot=ReturnType<typeof companyEventResponsibilityCandidates>&{activityOwnerLabel:string};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;targetProfileId:string;reason:string;reviewed:boolean};
export type CompanyEventResponsibilityRequest={eventId:string;checklistId:string};
export type CompanyEventResponsibilitySaveAction=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props=CompanyEventResponsibilityRequest&{st:State;space:string;save:CompanyEventResponsibilitySaveAction;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,eventId:string,checklistId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',eventId,checklistId]);
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const takeSnapshot=(st:State,eventId:string,checklistId:string):Snapshot=>{const snapshot=companyEventResponsibilityCandidates(st,eventId,checklistId);return structuredClone({...snapshot,activityOwnerLabel:snapshot.event?companyActivityOwnerLabel(st,snapshot.event):'Ansvar saknas'});};

function ActivityContext({snapshot}:{snapshot:Snapshot}){
 const event=snapshot.event,preparation=snapshot.preparation;
 if(!event)return null;
 return <details className="biz-details" aria-label="Företagsaktivitetens frysta underlag"><summary>Aktivitetens planering · ligger kvar</summary>
  <p className="biz-hint">Sparade uppgifter vid granskningen. Den här dialogen ändrar endast den valda förberedelsens ansvar.</p>
  <dl className="min-w-0">
   <div className="mb-3"><dt className="font-medium">Aktivitet</dt><dd className="whitespace-pre-wrap break-words">{event.title}</dd></div>
   <div className="mb-3"><dt className="font-medium">Kategori</dt><dd>{eventCategories.find(value=>value.id===event.category)?.label||event.category}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetsdatum</dt><dd>{displayDate(event.date)}{event.endDate?' – '+displayDate(event.endDate):''}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetens status</dt><dd>{eventStatuses.find(value=>value.id===event.status)?.label||event.status}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetens ansvar · ligger kvar</dt><dd className="whitespace-pre-wrap break-words">{snapshot.activityOwnerLabel||'Ansvar saknas'}</dd></div>
   <div className="mb-3"><dt className="font-medium">Planering och anteckningar</dt><dd className="whitespace-pre-wrap break-words">{event.notes||'Ej angivet'}</dd></div>
   <div className="mb-3"><dt className="font-medium">Vald förberedelse</dt><dd className="whitespace-pre-wrap break-words">{preparation?.title||'Förberedelsen finns inte längre'}</dd></div>
   <div className="mb-3"><dt className="font-medium">Förberedelsen ska vara klar senast</dt><dd>{displayDate(preparation?.due||'')}</dd></div>
   <div className="mb-3"><dt className="font-medium">Förberedelsens status</dt><dd>{preparation?preparation.done?'Klar':'Öppen':'Förberedelsen saknas'}</dd></div>
  </dl>
  <p className="biz-hint">Övriga förberedelser behåller sina ansvar, datum och status. Ingen kalenderinbjudan eller avisering skickas av ansvarsbytet.</p>
 </details>;
}

export function CompanyEventResponsibility({st,eventId,checklistId,space,save,busy,refresh,onClose,returnFocus}:Props){
 const selectedProfileDescriptionId=useId(),identity=identityFor(st,space,eventId,checklistId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=companyEventResponsibilityBasis(st,eventId,checklistId),admin=st.viewer?.role==='admin',initialized=st.settings.sellerProfilesInitialized;
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:takeSnapshot(st,eventId,checklistId),targetProfileId:'',reason:'',reviewed:false}));
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[fetchedState,setFetchedState]=useState<State|null>(null);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const visible=draft.identity===identity&&admin,conflict=draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const snapshot=draft.snapshot,target=snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId),preparation=snapshot.preparation,event=snapshot.event;
 const anchor=!!target&&!preparation?.ownerProfileId&&target.id===snapshot.sourceProfile?.id;
 const currentOwner=snapshot.sourceProfile?profileLabel(snapshot.sourceProfile):preparation?.owner||'Ansvar saknas i underlaget';
 const title=preparation?.ownerProfileId?'Byt förberedelseansvar':'Förankra ansvar';
 const canReview=visible&&initialized&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot.blockedReason;
 const dirty=!!draft.targetProfileId||draft.reason!=='';

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  if(draft.identity===identity&&admin)return;
  operation.current++;submitLock.current=false;setDiscard(false);setFetchedState(null);onClose();
 },[identity,admin,draft.identity,onClose]);
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
  // Fetching does not adopt the new version or replace the open intent.
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,eventId,checklistId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna förberedelsen på nytt.');return;}
  const next=takeSnapshot(latest,eventId,checklistId),targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:companyEventResponsibilityBasis(latest,eventId,checklistId),snapshot:next,targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});setError('');
  setNotice('Aktuellt underlag har lästs in. Din orsak och möjliga val finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,eventId,checklistId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna förberedelsen på nytt.');
   setFetchedState(structuredClone(next));setNotice('Aktuella uppgifter har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska ändringen igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((e as Error).message||'Aktuellt underlag kunde inte hämtas. Din text och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!visible||locked||submitLock.current||discard||!canReview||!draft.reviewed)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  let failureStatus=0,failureMessage='';
  const rejectedMessage=()=>failureStatus>=400&&failureStatus<500&&failureStatus!==409?(failureMessage||'CRM nekade ändringen.')+' Detta försök nekades. Din text och dina val finns kvar. Hämta och granska aktuellt underlag innan du försöker igen. Om du tidigare försökt spara kan det försöket redan ha lyckats.':'';
  try{
   const saved=await save('company_event_responsibility_transfer',{eventId,checklistId,targetProfileId:draft.targetProfileId,reason:draft.reason.trim(),reviewed:true,expectedContext:draft.expectedContext},false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)onClose();
   else setError(rejectedMessage()||'Ändringen kunde inte bekräftas. Din text och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade val.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(rejectedMessage()||((e as Error).message||'Ändringen kunde inte bekräftas.')+' Din text och dina val finns kvar.');}
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
   <DialogContent className="business-ui company-event-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>{if(returnFocus){restoreHandoverFocus(event,opener.current,returnFocus);return;}if(opener.current?.isConnected){event.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0">
     <div className="company-event-responsibility-head"><DialogTitle className="flex items-start gap-2"><ArrowRightLeft className="shrink-0" size={19} aria-hidden="true"/><span className="min-w-0">{title}</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div>
     <DialogDescription>{event?.title||'Aktiviteten finns inte längre'} · {preparation?.title||'Förberedelsen finns inte längre'}. Granska ansvar för den här förberedelsen.</DialogDescription>
    </DialogHeader>
    <form className="min-w-0" onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
     <section className="company-event-responsibility-current" aria-label="Nuvarande förberedelseansvar"><p><b>Förberedelsens nuvarande ansvar:</b> {currentOwner}</p><p>Klart senast: {displayDate(preparation?.due||'')}</p><p><b>Aktivitetens status:</b> {eventStatuses.find(value=>value.id===event?.status)?.label||'Aktiviteten saknas'}. Förberedelsen behöver hanteras separat.</p><p className="biz-hint">{preparation?.ownerProfileId?'Förberedelsen är kopplad till en granskad säljarprofil.':'Äldre förberedelseansvar behöver förankras. Välj den nuvarande profilen för att behålla samma person, eller en annan aktiv profil för att byta ansvar.'} Ursprunglig ansvarskoppling visas när namnen skiljer sig åt.</p>{snapshot.sourceProfile&&!snapshot.sourceProfile.active&&<p className="biz-hint">Den nuvarande profilen är historisk. Det öppna arbetet behöver fortfarande granskas.</p>}<p><b>Aktivitetens ansvar · ligger kvar:</b> {snapshot.activityOwnerLabel||'Ansvar saknas i underlaget'}</p><p className="biz-hint">Aktivitetens ansvar granskas separat. Det förankras eller byts inte genom förberedelsens ansvarsbyte.</p>{event&&preparation&&event.status!=='planned'&&<p className="biz-callout">Aktiviteten är {event.status==='done'?'genomförd':'avbokad'}, men förberedelsen är {preparation.done?'klar':'fortfarande öppen'}. Ansvarsbytet återöppnar inte aktiviteten.</p>}</section>
     <ActivityContext snapshot={snapshot}/>
     {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
     <F label="Ansvarig efter ändringen *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="company-event-responsibility-select *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:overflow-hidden" aria-label="Ansvarig efter ändringen" aria-describedby={target?selectedProfileDescriptionId:undefined} style={{height:'auto',minHeight:44,width:'100%',minWidth:0,whiteSpace:'normal'}}><SelectValue><span className="company-event-responsibility-selected">{target?profileLabel(target):'Välj ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="company-event-responsibility-options max-w-[calc(100vw-2rem)]"><SelectItem value="_none" className="min-h-11 whitespace-normal">Välj ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id} className="min-h-11 whitespace-normal break-words"><span className="min-w-0">{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint break-words"><b>Vald förberedelseansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}. <span className="block">Profil-ID: {target.id}</span></p>}
     <F label="Varför ändras ansvarskopplingen? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv varför förberedelsens ansvar förankras eller byts." value={draft.reason} onChange={event=>update({reason:event.target.value})}/></F>
     <section className="biz-callout" aria-label="Granska förberedelseansvaret"><h3>Granska ändringen</h3><p><b>{preparation?.title||'Förberedelsen saknas'}</b>: {currentOwner} → {target?profileLabel(target):'välj ansvarig'}.</p><p>{anchor?'Samma person behåller förberedelsen; den äldre ansvarskopplingen förankras i personens profil.':'Endast den här förberedelsens ansvar ändras.'}</p><p className="whitespace-pre-wrap break-words">Orsak: {draft.reason.trim()||'ange en orsak'}</p><p>Aktivitetens ansvar ligger kvar hos {snapshot.activityOwnerLabel||'aktivitetens registrerade ansvariga'}. Planering, datum, status och övriga förberedelser ligger kvar. Ansvarsbytet slutför inget arbete och ändrar inga kundrelationer, affärer, order eller historiska försäljningsresultat.</p><label className="check-field"><Checkbox aria-label="Jag har granskat förberedelseansvaret" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat förberedelsens ansvarig, orsak och att aktivitetens ansvar och övriga förberedelser ligger kvar.</span></label></section>
     <details className="biz-details"><summary>Visa registrerade ansvarskopplingar</summary><p><b>Förberedelsens ansvar:</b> {currentOwner}</p><p className="break-words">{preparation?.ownerProfileId?'Registrerat profil-ID: '+preparation.ownerProfileId:'Förberedelsen saknar registrerat profil-ID; äldre ansvarskoppling.'}</p><p><b>Aktivitetens ansvar:</b> {snapshot.activityOwnerLabel||'Ansvar saknas'}. Separat från förberedelsens ansvar.</p><p className="break-words">{event?.ownerProfileId?'Aktivitetens registrerade profil-ID: '+event.ownerProfileId:'Aktiviteten saknar registrerat profil-ID; äldre ansvarskoppling.'}</p>{target&&<p className="break-words"><b>Valt förberedelseansvar:</b> {profileLabel(target)} · {target.id}</p>}<p className="biz-hint">En resultatprofil eller registrerad kontolänk är inget verifierat besked om inloggning eller sidåtkomst.</p></details>
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16} aria-hidden="true"/>Granskningsunderlaget har ändrats</b><p>Din text och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formulärets tidigare underlag. Läs in nytt granskningsunderlag använder de aktuella uppgifterna och behåller din orsak och möjliga val. Granskningen måste göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!preparation?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ansvarsändringar ({preparation.responsibilityTransfers.length})</summary>{[...preparation.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.action==='anchor'?'Förankrat ansvar':'Bytt ansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>Förberedelseansvar · {event?.title||'Aktivitet'} · {preparation.title}. Referens: {row.id}.</small></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Formuläret sparas inte som privat utkast. Din text och dina val finns kvar medan dialogen är öppen. Kopiera orsaken före omladdning; den försvinner om du stänger utan att spara.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':anchor?'Spara förankrat ansvar':'Spara förberedelsens ansvar'}</Button></div>
    </fieldset></form>
    {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar ansvarsändringen…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="company-event-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara ansvarsändringen?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
