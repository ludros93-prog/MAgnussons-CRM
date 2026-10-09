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
import {commercialResponsibilityBasis,commercialResponsibilityCandidates,isCommercialResponsibilityAnchorHistory} from '@/lib/commercial-responsibility';
import type {State,Task} from '@/lib/crm';
import {BusinessField as F,displayDate,type SaveAction} from './business-ui';

type Snapshot=ReturnType<typeof commercialResponsibilityCandidates>;
type Draft={expectedContext:string;snapshot:Snapshot;targetProfileId:string;selectedTaskIds:string[];reason:string;reviewed:boolean};
type Props={st:State;targetType:'deal'|'order';targetId:string;save:SaveAction;busy:boolean;refresh:()=>Promise<void>;onClose:()=>void;returnFocus?:()=>HTMLElement|null};
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+' · '+profile.legacyOwnerName;
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const taskMeta=(task:Task)=>displayDate(task.due)+' · ansvarig '+task.owner;

function takeSnapshot(st:State,targetType:Props['targetType'],targetId:string):Snapshot{
 return structuredClone(commercialResponsibilityCandidates(st,targetType,targetId));
}

export function CommercialResponsibility({st,targetType,targetId,save,busy,refresh,onClose,returnFocus}:Props){
 const selectedProfileDescriptionId=useId();
 const currentBasis=commercialResponsibilityBasis(st,targetType,targetId);
 const [draft,setDraft]=useState<Draft>(()=>{
  const snapshot=takeSnapshot(st,targetType,targetId);
  return {snapshot,expectedContext:currentBasis,targetProfileId:'',selectedTaskIds:[...snapshot.requiredTaskIds],reason:'',reviewed:false};
 });
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false);
 const submitLock=useRef(false),alive=useRef(true),opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement instanceof HTMLElement?document.activeElement:null);
 const conflict=draft.expectedContext!==currentBasis,admin=st.viewer?.role==='admin',locked=busy||submitting||refreshing;
 const label=targetType==='deal'?'affärsansvar':'orderansvar',title=targetType==='deal'?'Byt affärsansvar':'Byt orderansvar';
 const snapshot=draft.snapshot,requiredIds=new Set(snapshot.requiredTaskIds),optional=snapshot.eligible.filter(task=>!requiredIds.has(task.id));
 const selected=snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)),leftOptional=optional.filter(task=>!draft.selectedTaskIds.includes(task.id));
 const target=snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId);
 const recordName=targetType==='deal'&&snapshot.target&&'title' in snapshot.target?snapshot.target.title:snapshot.linkedDeal?.title||'Order '+targetId;
 const currentOwner=snapshot.sourceProfile?profileLabel(snapshot.sourceProfile):snapshot.target?.owner||'Ansvar saknas i underlaget';
 const canReview=admin&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot.blockedReason&&draft.selectedTaskIds.length<=500;
 const dirty=!!draft.targetProfileId||draft.reason!==''||draft.selectedTaskIds.some(id=>!requiredIds.has(id));

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[dirty]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);

 function update(patch:Partial<Draft>){
  if(locked||submitLock.current)return;
  setDraft(previous=>({...previous,...patch,reviewed:false}));setError('');
 }
 function close(){
  if(locked||submitLock.current)return;
  if(dirty)setDiscard(true);else onClose();
 }
 function readCurrent(){
  if(locked||submitLock.current)return;
  const next=takeSnapshot(st,targetType,targetId),eligible=new Set(next.eligible.map(task=>task.id));
  const removed=snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)&&!eligible.has(task.id));
  const added=next.eligible.filter(task=>next.requiredTaskIds.includes(task.id)&&!draft.selectedTaskIds.includes(task.id));
  const targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  const selectedTaskIds=[...new Set([...draft.selectedTaskIds.filter(id=>eligible.has(id)),...next.requiredTaskIds])];
  setDraft({...draft,snapshot:next,expectedContext:currentBasis,selectedTaskIds,targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});setError('');
  setNotice('Aktuellt underlag har lästs in. Orsaken och de möjliga valen finns kvar. Granska ändringen igen.'+
   (removed.length?' Dessa uppgifter kan inte längre väljas: '+removed.map(task=>task.title).join(', ')+'.':'')+
   (added.length?' Dessa nödvändiga åtaganden behöver nu följa med: '+added.map(task=>task.title).join(', ')+'.':'')+
   (!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(locked||submitLock.current)return;
  submitLock.current=true;setRefreshing(true);setError('');
  try{await refresh();if(alive.current)setNotice('Aktuella uppgifter har hämtats. Formuläret är kvar med sitt tidigare underlag. Välj Läs in nytt granskningsunderlag för att granska det hämtade underlaget.');}
  catch(e){if(alive.current)setError((e as Error).message||'Aktuellt underlag kunde inte hämtas. Dina uppgifter finns kvar.');}
  finally{submitLock.current=false;if(alive.current)setRefreshing(false);}
 }
 async function submit(){
  if(locked||submitLock.current||!canReview||!draft.reviewed||discard)return;
  submitLock.current=true;setSubmitting(true);setError('');
  try{
   const saved=await save('commercial_responsibility_transfer',{targetType,targetId,targetProfileId:draft.targetProfileId,selectedTaskIds:draft.selectedTaskIds,reason:draft.reason.trim(),reviewed:true,expectedContext:draft.expectedContext},false);
   if(!alive.current)return;
   if(saved)onClose();
   else setError('Sparandet kunde inte bekräftas. Din orsak och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma val.');
  }catch(e){if(alive.current)setError(((e as Error).message||'Sparandet kunde inte bekräftas.')+' Din orsak och dina val finns kvar.');}
  finally{submitLock.current=false;if(alive.current)setSubmitting(false);}
 }
 // Native Tab wrapping can use preventScroll. Reveal the same focused control
 // inside this dialog without moving focus or scrolling the underlying page.
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
  <Dialog open onOpenChange={value=>{if(!value)close();}}>
   <DialogContent className="business-ui commercial-responsibility-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={e=>{if(locked||submitLock.current)e.preventDefault();}} onInteractOutside={e=>{if(locked||submitLock.current)e.preventDefault();}} onCloseAutoFocus={e=>{if(returnFocus){restoreHandoverFocus(e,opener.current,returnFocus);return;}if(opener.current?.isConnected){e.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0">
     <div className="flex items-start justify-between gap-3"><DialogTitle className="flex min-w-0 flex-1 items-center gap-2"><ArrowRightLeft className="shrink-0" size={19}/><span className="min-w-0">{title}</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked} onClick={close}>Stäng</Button></div>
     <DialogDescription>{snapshot.customer?.name||'Kundkopplingen saknas'} · {recordName}. Välj ny ansvarig och granska de öppna åtagandena.</DialogDescription>
    </DialogHeader>
    <form className="min-w-0" onSubmit={e=>{e.preventDefault();e.stopPropagation();void submit();}}><fieldset className="min-w-0" disabled={locked||!admin}>
     {!admin&&<p className="biz-callout" role="alert">Endast en administratör kan överföra affärs- och orderansvar. Formulärets uppgifter har inte sparats.</p>}
     <p>Nuvarande ansvar: <b>{currentOwner}</b>.</p>
     <p className="biz-hint">Profilens namn följs av dess ursprungliga ansvarskoppling. Det skiljer profiler med samma visningsnamn åt.</p>
     {snapshot.blockedReason&&<p className="biz-callout" role="alert">{snapshot.blockedReason}</p>}
     <F label="Ny ansvarig *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:overflow-hidden" aria-label="Ny ansvarig" aria-describedby={target?selectedProfileDescriptionId:undefined} style={{height:'auto',minHeight:44,width:'100%',minWidth:0,whiteSpace:'normal'}}><SelectValue><span className="commercial-responsibility-selected">{target?profileLabel(target):'Välj ny ansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]"><SelectItem value="_none" className="min-h-11 whitespace-normal">Välj ny ansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id} className="min-h-11 whitespace-normal break-words"><span className="min-w-0">{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint mb-4"><b>Vald ansvarig:</b> {profileLabel(target)}. Profil-ID: {target.id}.</p>}
     <F label="Varför byts ansvaret? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv överlämningen och varför ansvaret byts." value={draft.reason} onChange={e=>update({reason:e.target.value})}/></F>
     <section className="biz-group" aria-label="Nödvändiga åtaganden"><h3>Nödvändiga åtaganden ({snapshot.requiredTaskIds.length})</h3><p className="biz-hint">Dessa öppna åtaganden följer alltid med till den nya ansvariga. De kan inte väljas bort i överlämningen.</p>
      {snapshot.eligible.filter(task=>requiredIds.has(task.id)).map(task=><label className="check-field" key={task.id}><Checkbox checked disabled aria-label={'Nödvändigt åtagande: '+task.title}/><span><b>{task.title}</b><small className="block">{taskMeta(task)}</small></span></label>)}
      {!snapshot.requiredTaskIds.length&&<p>Inga nödvändiga öppna åtaganden finns i det här underlaget.</p>}
     </section>
     <section className="biz-group" aria-label="Valfria uppgifter"><h3>Valfria uppgifter ({optional.length})</h3><p className="biz-hint">Ingen valfri uppgift är vald från början. Välj de uppgifter som också ska följa med.</p>
      {optional.map(task=><label className="check-field" key={task.id}><Checkbox checked={draft.selectedTaskIds.includes(task.id)} aria-label={'Flytta uppgiften '+task.title} onCheckedChange={value=>update({selectedTaskIds:value===true?[...draft.selectedTaskIds.filter(id=>id!==task.id),task.id]:draft.selectedTaskIds.filter(id=>id!==task.id)})}/><span><b>{task.title}</b><small className="block">{taskMeta(task)}</small></span></label>)}
      {!optional.length&&<p>Inga valfria uppgifter finns att flytta.</p>}
     </section>
     <details className="biz-details"><summary>Uppgifter som ligger kvar ({leftOptional.length+snapshot.excluded.length})</summary>
      {leftOptional.map(task=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>Inte vald; ansvar och historik ligger kvar.</small></article>)}
      {snapshot.excluded.map(({task,reason})=><article className="revision-card" key={task.id}><b>{task.title}</b><p>{taskMeta(task)}</p><small>{reason}</small></article>)}
      {!leftOptional.length&&!snapshot.excluded.length&&<p>Inga uppgifter ligger kvar i dessa grupper.</p>}
     </details>
     <section className="biz-callout" aria-label="Granska ansvarsförändringen"><h3>Granska ändringen</h3>
      <p><b>{recordName}</b>: {currentOwner} → {target?profileLabel(target):'välj ny ansvarig'}.</p>
      <p>Orsak: {draft.reason.trim()||'ange en orsak'}</p><p><b>{selected.length} öppna åtaganden och uppgifter följer med.</b></p>
      {selected.map(task=><p key={task.id}>{task.title} · {displayDate(task.due)} · {task.owner} → {target?.legacyOwnerName||'ny ansvarig'}.</p>)}
      <p>Kundens ansvar ligger kvar hos {snapshot.customer?.owner||'kundens registrerade ansvariga'}. Vunnen/förlorad affär, tidigare fakturaansvar, försäljningshistorik och mål ändras inte genom överlämningen. Tryckets tilldelning, material, mängder, skisser, kundgodkännanden och leveransregistreringar ändras inte.</p>
      <label className="check-field"><Checkbox disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>setDraft(previous=>({...previous,reviewed:value===true}))}/>Jag har granskat den nya ansvariga, orsaken, åtagandena som följer med och det som ligger kvar.</label>
     </section>
     {draft.selectedTaskIds.length>500&&<p className="error" role="alert">Högst 500 uppgifter kan följa med. Välj bort valfria uppgifter innan du granskar överlämningen.</p>}
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16}/>Överlämningsunderlaget har ändrats</b><p>Din orsak och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formuläret. Läs in nytt granskningsunderlag ersätter listorna med senast hämtade uppgifter och behåller orsaken och möjliga val. Nya nödvändiga åtaganden visas valda. Valfria uppgifter väljs inte automatiskt. Granskningen måste göras igen.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!snapshot.target?.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare ansvar ({snapshot.target.responsibilityTransfers.length})</summary>{[...snapshot.target.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}>{isCommercialResponsibilityAnchorHistory(row)?<><b>Kopplat affärsansvar · {row.toDisplayName}</b><p>Samma ansvariga person fick en stabil koppling. Registrerat affärsansvar: {row.toOwner}.</p><p>CRM-konto vid kopplingen: {row.targetName} · {row.targetRole==='admin'?'Administratör':'Säljare'}.</p><small>Person- och kontonamnen är sparade från kopplingstillfället.</small></>:<><b>Bytt {targetType==='deal'?'affärsansvar':'orderansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</b><small>{row.selectedTaskIds.length} uppgifter följde med.</small></>}<p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Det här formuläret sparas inte som privat utkast. Din text och dina val finns kvar medan dialogen är öppen; de försvinner om du stänger utan att spara eller laddar om sidan.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={close}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':'Spara nytt '+label}</Button></div>
    </fieldset></form>
    {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar överlämningen…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={discard} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}>
   <AlertDialogContent className="max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader><AlertDialogTitle>Stäng utan att spara överlämningen?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner om du stänger. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte en sådan ändring.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)onClose();}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
  </AlertDialog>
 </>;
}
