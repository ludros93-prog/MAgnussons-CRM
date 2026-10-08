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
import {companyActivityResponsibilityBasis,companyActivityResponsibilityCandidates} from '@/lib/company-activity-responsibility';
import {companyEventOwnerLabel} from '@/lib/company-event-responsibility';
import type {State} from '@/lib/crm';
import {BusinessField as F,displayDate} from './business-ui';
import {eventCategories,eventStatuses} from './company-event-draft-preview';

type Candidates=ReturnType<typeof companyActivityResponsibilityCandidates>;
type Snapshot=Candidates&{preparations:Array<State['companyEvents'][number]['checklist'][number]&{ownerLabel:string}>};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;targetProfileId:string;reason:string;reviewed:boolean};
export type CompanyActivityResponsibilitySaveAction=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type Props={st:State;eventId:string;space:string;save:CompanyActivityResponsibilitySaveAction;busy:boolean;refresh:()=>Promise<State>;onClose:()=>void;returnFocus?:()=>HTMLElement|null};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,eventId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',eventId]);
const profileLabel=(profile:Candidates['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
function takeSnapshot(st:State,eventId:string):Snapshot{
 const candidates=companyActivityResponsibilityCandidates(st,eventId);
 return structuredClone({...candidates,preparations:(candidates.event?.checklist||[]).map(row=>({...row,ownerLabel:companyEventOwnerLabel(st,row)}))});
}

function FrozenContext({snapshot}:{snapshot:Snapshot}){
 const event=snapshot.event;if(!event)return null;
 return <>
  <section className="company-event-responsibility-current" aria-label="Förberedelsernas ansvar ligger kvar"><h3>Förberedelsernas ansvar · ligger kvar</h3><p>{snapshot.preparations.filter(row=>!row.done).length} öppna och {snapshot.preparations.filter(row=>row.done).length} klara förberedelser. Deras ansvar ändras inte av aktivitetens ansvarsbyte.</p><details className="biz-details"><summary>Visa förberedelsernas registrerade ansvar</summary>{snapshot.preparations.length?snapshot.preparations.map((row,index)=><article className="revision-card" key={row.id+'-'+index}><b>{row.title}</b><p><b>Förberedelsens ansvar:</b> {row.ownerLabel||'Ansvar saknas'}</p><p>Klart senast: {displayDate(row.due)} · {row.done?'Klar':'Öppen'}.</p><p className="biz-hint break-words">{row.ownerProfileId?'Registrerat profil-ID: '+row.ownerProfileId:'Äldre ansvarskoppling: '+(row.owner||'Ansvar saknas')}. Förberedelsereferens: {row.id}.</p></article>):<p>Aktiviteten har inga förberedelser.</p>}</details></section>
  <details className="biz-details" aria-label="Företagsaktivitetens frysta underlag"><summary>Aktivitetens planering · ligger kvar</summary><p className="biz-hint">Sparade uppgifter vid granskningen. Den här dialogen ändrar endast aktivitetens ansvar.</p><dl className="min-w-0">
   <div className="mb-3"><dt className="font-medium">Aktivitet</dt><dd className="whitespace-pre-wrap break-words">{event.title}</dd></div>
   <div className="mb-3"><dt className="font-medium">Kategori</dt><dd>{eventCategories.find(value=>value.id===event.category)?.label||event.category}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetsdatum</dt><dd>{displayDate(event.date)}{event.endDate?' – '+displayDate(event.endDate):''}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetens status</dt><dd>{eventStatuses.find(value=>value.id===event.status)?.label||event.status}</dd></div>
   <div className="mb-3"><dt className="font-medium">Planering och anteckningar</dt><dd className="whitespace-pre-wrap break-words">{event.notes||'Ej angivet'}</dd></div>
   <div className="mb-3"><dt className="font-medium">Aktivitetsreferens</dt><dd className="break-words">{event.id}</dd></div>
  </dl><p className="biz-hint">Datum, status, planering och förberedelsernas ansvar ligger kvar. Ingen kalenderinbjudan eller avisering skickas av ansvarsbytet.</p></details>
 </>;
}

export function CompanyActivityResponsibility({st,eventId,space,save,busy,refresh,onClose,returnFocus}:Props){
 const selectedProfileDescriptionId=useId(),identity=identityFor(st,space,eventId),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const currentBasis=companyActivityResponsibilityBasis(st,eventId),admin=st.viewer?.role==='admin',initialized=st.settings.sellerProfilesInitialized;
 const [draft,setDraft]=useState<Draft>(()=>({identity,expectedContext:currentBasis,snapshot:takeSnapshot(st,eventId),targetProfileId:'',reason:'',reviewed:false}));
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[fetchedState,setFetchedState]=useState<State|null>(null);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const visible=draft.identity===identity&&admin,conflict=draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const snapshot=draft.snapshot,target=snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId),event=snapshot.event;
 const anchor=!!target&&!event?.ownerProfileId&&target.id===snapshot.sourceProfile?.id;
 const currentOwner=snapshot.sourceProfile?profileLabel(snapshot.sourceProfile):event?.owner||'Ansvar saknas i underlaget';
 const title=event?.ownerProfileId?'Byt aktivitetsansvar':'Förankra aktivitetens ansvar';
 const canReview=visible&&initialized&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot.blockedReason&&event?.status==='planned';
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

 function close(){if(locked||submitLock.current||discard)return;if(dirty)setDiscard(true);else onClose();}
 function update(patch:Partial<Draft>){
  if(!visible||locked||submitLock.current||discard)return;
  setDraft(previous=>previous.identity===identity?{...previous,...patch,reviewed:false}:previous);setError('');
 }
 function readCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,eventId)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna aktiviteten på nytt.');return;}
  const next=takeSnapshot(latest,eventId),targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:companyActivityResponsibilityBasis(latest,eventId),snapshot:next,targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});setError('');
  setNotice('Aktuellt underlag har lästs in. Din orsak och möjliga val finns kvar. Granska ändringen igen.'+(!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!visible||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,eventId)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna aktiviteten på nytt.');
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
  const conflictMessage=()=>failureStatus===409?(failureMessage||'Granskningsunderlaget har ändrats.')+' Din text och dina val finns kvar. Hämta, läs in och granska aktuellt underlag innan du sparar igen. Ett tidigare obekräftat sparförsök kan redan ha lyckats.':'';
  try{
   const saved=await save('company_activity_responsibility_transfer',{eventId,targetProfileId:draft.targetProfileId,reason:draft.reason.trim(),reviewed:true,expectedContext:draft.expectedContext},false,(status,message)=>{failureStatus=status;failureMessage=message||'';});
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)onClose();
   else setError(rejectedMessage()||conflictMessage()||'Ändringen kunde inte bekräftas. Din text och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma oförändrade val.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(rejectedMessage()||conflictMessage()||((e as Error).message||'Ändringen kunde inte bekräftas.')+' Din text och dina val finns kvar.');}
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
   <DialogContent className="business-ui company-event-responsibility-dialog company-activity-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onInteractOutside={event=>{if(locked||submitLock.current||discard)event.preventDefault();}} onCloseAutoFocus={event=>{if(returnFocus){restoreHandoverFocus(event,opener.current,returnFocus);return;}if(opener.current?.isConnected){event.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0"><div className="company-event-responsibility-head"><DialogTitle className="flex items-start gap-2"><ArrowRightLeft className="shrink-0" size={19} aria-hidden="true"/><span className="min-w-0">{title}</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked||discard} onClick={close}>Stäng</Button></div><DialogDescription>{event?.title||'Aktiviteten finns inte längre'}. Granska vem som ansvarar för den här aktiviteten.</DialogDescription></DialogHeader>
    <form className="min-w-0" onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit();}}><fieldset disabled={locked||!visible}>
     <section className="company-event-responsibility-current" aria-label="Nuvarande aktivitetsansvar"><p><b>Aktivitetens nuvarande ansvar:</b> {currentOwner}</p><p>Aktivitetsdatum: {displayDate(event?.date||'')}{event?.endDate?' – '+displayDate(event.endDate):''}</p><p><b>Aktivitetens status:</b> {eventStatuses.find(value=>value.id===event?.status)?.label||'Aktiviteten saknas'}.</p><p className="biz-hint">{event?.ownerProfileId?'Aktiviteten är kopplad till en granskad säljarprofil.':'Äldre aktivitetsansvar behöver förankras. Välj den nuvarande profilen för att behålla samma person, eller en annan aktiv profil för att byta ansvar.'} Ursprunglig ansvarskoppling visas när namnen skiljer sig åt.</p>{snapshot.sourceProfile&&!snapshot.sourceProfile.active&&<p className="biz-hint">Den nuvarande profilen är historisk. Det planerade arbetet behöver fortfarande granskas.</p>}{event&&event.status!=='planned'&&<p className="biz-callout">Aktiviteten är {event.status==='done'?'genomförd':'inställd'} och behåller sitt historiska ansvar. Öppna förberedelser hanteras separat.</p>}</section>
     <FrozenContext snapshot={snapshot}/>
     {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
     <F label="Aktivitetsansvarig efter ändringen *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="company-event-responsibility-select *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:overflow-hidden" aria-label="Aktivitetsansvarig efter ändringen" aria-describedby={target?selectedProfileDescriptionId:undefined} style={{height:'auto',minHeight:44,width:'100%',minWidth:0,whiteSpace:'normal'}}><SelectValue><span className="company-event-responsibility-selected">{target?profileLabel(target):'Välj ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="company-event-responsibility-options max-w-[calc(100vw-2rem)]"><SelectItem value="_none" className="min-h-11 whitespace-normal">Välj ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id} className="min-h-11 whitespace-normal break-words"><span className="min-w-0">{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint break-words"><b>Vald aktivitetsansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}. <span className="block">Profil-ID: {target.id}</span></p>}
     <F label="Varför ändras aktivitetens ansvar? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv varför aktivitetens ansvar förankras eller byts." value={draft.reason} onChange={event=>update({reason:event.target.value})}/></F>
     <section className="biz-callout" aria-label="Granska aktivitetsansvaret"><h3>Granska ändringen</h3><p><b>{event?.title||'Aktiviteten saknas'}</b>: {currentOwner} → {target?profileLabel(target):'välj ansvarig'}.</p><p>{anchor?'Samma person behåller aktiviteten; den äldre ansvarskopplingen förankras i personens profil.':'Endast den här aktivitetens ansvar ändras.'}</p><p className="whitespace-pre-wrap break-words">Orsak: {draft.reason.trim()||'ange en orsak'}</p><p>Förberedelserna behåller sina ansvar, datum och status. Aktivitetens planering, datum och status ligger kvar. Ansvarsbytet slutför inget arbete och ändrar inga kundrelationer, affärer, order eller historiska försäljningsresultat. Ingen kalenderinbjudan eller avisering skickas.</p><label className="check-field"><Checkbox aria-label="Jag har granskat aktivitetsansvaret" disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous.identity===identity?{...previous,reviewed:value===true}:previous);}}/><span>Jag har granskat aktivitetens ansvarig och orsak samt att förberedelserna behåller sina ansvar.</span></label></section>
     <details className="biz-details"><summary>Visa registrerade ansvarskopplingar</summary><p><b>Aktivitetens ansvar:</b> {currentOwner}</p><p className="break-words">{event?.ownerProfileId?'Registrerat profil-ID: '+event.ownerProfileId:'Aktiviteten saknar registrerat profil-ID; äldre ansvarskoppling.'}</p>{target&&<p className="break-words"><b>Valt aktivitetsansvar:</b> {profileLabel(target)} · {target.id}</p>}<p className="biz-hint">En resultatprofil eller registrerad kontolänk är inget verifierat besked om inloggning eller sidåtkomst.</p></details>
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16} aria-hidden="true"/>Granskningsunderlaget har ändrats</b><p>Din text och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formulärets tidigare underlag. Läs in nytt granskningsunderlag använder de aktuella uppgifterna och behåller din orsak och möjliga val. Granskningen måste göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!event?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ändringar av aktivitetens ansvar ({event.responsibilityTransfers.length})</summary>{[...event.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.action==='anchor'?'Förankrat aktivitetsansvar':'Bytt aktivitetsansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>Aktivitetsansvar · {event.title}. Referens: {row.id}.</small></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Formuläret sparas inte som privat utkast. Din text och dina val finns kvar medan dialogen är öppen. Kopiera orsaken före omladdning; den försvinner om du stänger utan att spara.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':anchor?'Spara förankrat aktivitetsansvar':'Spara aktivitetens ansvar'}</Button></div>
    </fieldset></form>{locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar aktivitetens ansvar…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={visible&&discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}><AlertDialogContent className="company-event-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara aktivitetsansvaret?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte den ändringen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
