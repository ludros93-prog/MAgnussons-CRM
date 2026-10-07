'use client';

import {useEffect,useId,useRef,useState,type FocusEvent} from 'react';
import {ArrowRightLeft,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {customerResponsibilityBasis,customerResponsibilityCandidates} from '@/lib/customer-responsibility';
import {type State,type Customer,type Task} from '@/lib/crm';
import {BusinessField as F,displayDate,type SaveAction} from './business-ui';

type FixedWork={id:string;kind:string;title:string;due:string;owner:string};
type Snapshot=ReturnType<typeof customerResponsibilityCandidates>&{customerId:string;customerName:string;customerOwner:string;customerOwnerProfileId:string;responsibilityTransfers:Customer['responsibilityTransfers'];fixedWork:FixedWork[]};
type Draft={identity:string;expectedContext:string;snapshot:Snapshot;targetProfileId:string;selectedTaskIds:string[];reason:string;reviewed:boolean};
type Props={st:State;c:Customer;space:string;save:SaveAction;busy:boolean;refresh:()=>Promise<State>;onSettings:()=>void;onDialogChange:(open:boolean)=>void};
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';
const identityFor=(st:State,space:string,customerId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',customerId]);
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);
const taskMeta=(task:Task)=>displayDate(task.due)+' · ansvarig '+task.owner;

function fixedCustomerWork(st:State,c:Customer):FixedWork[]{
 const work:FixedWork[]=[];
 for(const d of st.deals.filter(d=>d.customerId===c.id&&!['won','lost'].includes(d.stage)))work.push({id:'deal:'+d.id,kind:d.stage==='paused'?'Pausad affär':'Affär',title:d.title,due:d.nextDate,owner:d.owner});
 for(const o of st.orders.filter(o=>o.customerId===c.id&&(o.stage!=='followed'||o.invoiceValue===null)))work.push({id:'order:'+o.id,kind:o.stage==='followed'&&o.invoiceValue===null?'Order som saknar faktura':'Order',title:st.deals.find(d=>d.id===o.dealId)?.title||'Order '+o.id,due:o.deliveryDate,owner:o.owner});
 for(const m of st.meetings.filter(m=>m.customerId===c.id&&m.status==='planned'))work.push({id:'meeting:'+m.id,kind:'Möte',title:m.title,due:m.date,owner:m.owner});
 if(c.onboarding.startedAt&&!c.onboarding.completedAt)work.push({id:'onboarding',kind:'Introduktion',title:'Introduktion vid första affären',due:c.onboarding.due,owner:c.onboarding.owner});
 if(c.plan.issueStatus==='open')work.push({id:'issue',kind:'Kundärende',title:c.plan.issueAction||c.plan.issue||'Öppet kundärende',due:c.plan.issueDue,owner:c.plan.issueOwner});
 for(const need of c.yearNeeds.filter(n=>n.status==='planned'))work.push({id:'need:'+need.id,kind:'Årshjul',title:need.title,due:need.due,owner:need.owner});
 return work;
}
function takeSnapshot(st:State,customerId:string):Snapshot{
 const c=st.customers.find(customer=>customer.id===customerId);
 return structuredClone({...customerResponsibilityCandidates(st,customerId),customerId,customerName:c?.name||'Kunden finns inte längre',customerOwner:c?.owner||'',customerOwnerProfileId:c?.ownerProfileId||'',responsibilityTransfers:c?.responsibilityTransfers||[],fixedWork:c?fixedCustomerWork(st,c):[]});
}

export function CustomerResponsibility({st,c,space,save,busy,refresh,onSettings,onDialogChange}:Props){
 const selectedProfileDescriptionId=useId();
 const identity=identityFor(st,space,c.id),currentIdentity=useRef(identity);currentIdentity.current=identity;
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false),[discard,setDiscard]=useState(false),[closeDestination,setCloseDestination]=useState<'settings'|null>(null),[fetchedState,setFetchedState]=useState<State|null>(null);
 const submitLock=useRef(false),operation=useRef(0),alive=useRef(true),opener=useRef<HTMLElement|null>(null);
 const currentBasis=customerResponsibilityBasis(st,c.id),admin=st.viewer?.role==='admin',initialized=st.settings.sellerProfilesInitialized;
 const visibleOpen=open&&draft?.identity===identity&&admin&&initialized;
 const conflict=!!draft&&draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const dirty=!!draft&&(!!draft.targetProfileId||draft.reason!==''||draft.selectedTaskIds.length>0);

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
 useEffect(()=>{
  operation.current++;submitLock.current=false;opener.current=null;
  setOpen(false);setDraft(null);setDiscard(false);setCloseDestination(null);setFetchedState(null);setError('');setNotice('');setSubmitting(false);setRefreshing(false);
 },[identity,admin,initialized]);
 useEffect(()=>{onDialogChange(visibleOpen);return()=>onDialogChange(false);},[visibleOpen,onDialogChange]);
 useEffect(()=>{if(conflict)setDraft(previous=>previous?.reviewed?{...previous,reviewed:false}:previous);},[conflict,currentBasis]);
 useEffect(()=>{
  if(!visibleOpen||!dirty)return;
  const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
 },[visibleOpen,dirty]);

 function finishClose(destination:'settings'|null=null){
  setOpen(false);onDialogChange(false);setDraft(null);setDiscard(false);setCloseDestination(null);setFetchedState(null);setError('');setNotice('');
  if(destination==='settings')onSettings();
 }
 function close(destination:'settings'|null=null){
  if(locked||submitLock.current||discard)return;
  if(dirty){setCloseDestination(destination);setDiscard(true);}else finishClose(destination);
 }
 function changeOpen(next:boolean){
  if(!next){close();return;}
  if(locked||submitLock.current||!admin||!initialized)return;
  opener.current=typeof document!=='undefined'&&document.activeElement instanceof HTMLElement?document.activeElement:null;
  setDraft({identity,expectedContext:currentBasis,snapshot:takeSnapshot(st,c.id),targetProfileId:'',selectedTaskIds:[],reason:'',reviewed:false});
  setError('');setNotice('');setFetchedState(null);setDiscard(false);setCloseDestination(null);setOpen(true);onDialogChange(true);
 }
 function update(patch:Partial<Draft>){
  if(locked||submitLock.current||discard)return;
  setDraft(previous=>previous?.identity===identity?{...previous,...patch,reviewed:false}:previous);setError('');
 }
 function readCurrent(){
  if(!draft||draft.identity!==identity||locked||submitLock.current||discard)return;
  // The returned read can arrive before the parent's State render. Never use
  // a render older than that read, and never adopt the draft during fetching.
  const latest=fetchedState&&fetchedState.version>st.version?fetchedState:st;
  if(identityFor(latest,space,c.id)!==identity){setError('Kontot eller arbetsytan har ändrats. Stäng och öppna överlämningen på nytt.');return;}
  const next=takeSnapshot(latest,c.id),eligibleIds=new Set(next.eligible.map(task=>task.id));
  const removed=draft.snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)&&!eligibleIds.has(task.id));
  const targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:customerResponsibilityBasis(latest,c.id),snapshot:next,selectedTaskIds:draft.selectedTaskIds.filter(id=>eligibleIds.has(id)),targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});
  setError('');setNotice('Aktuellt underlag har lästs in. Orsaken och de möjliga valen finns kvar. Granska ändringen igen.'+(removed.length?' Dessa uppgifter kan inte längre väljas: '+removed.map(task=>task.title).join(', ')+'.':'')+(!targetValid&&draft.targetProfileId?' Den tidigare valda profilen är inte tillgänglig; välj en ny.':''));
 }
 async function fetchCurrent(){
  if(!draft||draft.identity!==identity||locked||submitLock.current||discard)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setRefreshing(true);setError('');
  try{
   const next=await refresh();
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(identityFor(next,space,c.id)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Stäng och öppna överlämningen på nytt.');
   setFetchedState(structuredClone(next));setNotice('Aktuella uppgifter har hämtats. Formuläret visar fortfarande sitt tidigare underlag. Välj Läs in nytt granskningsunderlag och granska sedan ändringen igen.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError((e as Error).message||'Aktuellt underlag kunde inte hämtas. Din orsak och dina val finns kvar.');}
  finally{if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation){submitLock.current=false;setRefreshing(false);}}
 }
 async function submit(){
  if(!draft||draft.identity!==identity||locked||submitLock.current||discard||conflict||!admin||!draft.reviewed)return;
  if(draft.snapshot.blockedReason){setError(draft.snapshot.blockedReason);return;}
  if(!draft.snapshot.targetProfiles.some(profile=>profile.id===draft.targetProfileId)||!draft.reason.trim()){setError('Välj en ny kundansvarig och beskriv varför ansvaret byts.');return;}
  if(draft.selectedTaskIds.length>500){setError('Högst 500 aktiviteter kan följa med. Välj bort aktiviteter och granska ändringen igen.');return;}
  const startedIdentity=identity,startedOperation=++operation.current;
  submitLock.current=true;setSubmitting(true);setError('');
  try{
   const saved=await save('customer_responsibility_transfer',{customerId:draft.snapshot.customerId,targetProfileId:draft.targetProfileId,selectedTaskIds:draft.selectedTaskIds,reason:draft.reason.trim(),expectedContext:draft.expectedContext,reviewed:true},false);
   if(!alive.current||currentIdentity.current!==startedIdentity||operation.current!==startedOperation)return;
   if(saved)finishClose();
   else setError('Sparandet kunde inte bekräftas. Din orsak och dina val finns kvar. Första försöket kan redan ha lyckats. Hämta och granska aktuellt underlag eller försök igen med samma val.');
  }catch(e){if(alive.current&&currentIdentity.current===startedIdentity&&operation.current===startedOperation)setError(((e as Error).message||'Sparandet kunde inte bekräftas.')+' Din orsak och dina val finns kvar.');}
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

 if(!admin)return null;
 if(!initialized)return <p className="biz-hint">Förbered säljarprofilerna innan kundansvaret kan bytas med spårbar överlämning. <Button type="button" className={buttonClass} size="sm" variant="outline" disabled={busy} onClick={onSettings}>Förbered resultatprofiler</Button></p>;
 const snapshot=draft?.snapshot,target=snapshot?.targetProfiles.find(profile=>profile.id===draft?.targetProfileId),selected=snapshot?.eligible.filter(task=>draft?.selectedTaskIds.includes(task.id))||[];
 const leftEligible=snapshot?.eligible.filter(task=>!draft?.selectedTaskIds.includes(task.id))||[],excludedOpen=snapshot?.excluded.filter(row=>!row.task.done)||[],excludedDone=snapshot?.excluded.filter(row=>row.task.done)||[];
 const remainingCount=leftEligible.length+excludedOpen.length+(snapshot?.fixedWork.length||0);
 const canReview=!!draft&&draft.identity===identity&&!!target&&!!draft.reason.trim()&&!conflict&&!snapshot?.blockedReason&&draft.selectedTaskIds.length<=500;
 const currentOwner=snapshot?.sourceProfile?profileLabel(snapshot.sourceProfile):snapshot?.customerOwner||'Ansvar saknas i underlaget';

 return <>
  <Dialog open={visibleOpen} onOpenChange={changeOpen}>
   <DialogTrigger asChild><Button type="button" className={buttonClass} size="sm" variant="outline" disabled={busy}><ArrowRightLeft size={15}/>Byt kundansvar</Button></DialogTrigger>
   <DialogContent className="business-ui max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onEscapeKeyDown={e=>{if(locked||submitLock.current)e.preventDefault();}} onInteractOutside={e=>{if(locked||submitLock.current)e.preventDefault();}} onCloseAutoFocus={e=>{if(opener.current?.isConnected){e.preventDefault();opener.current.focus({preventScroll:true});}}}>
    <DialogHeader className="min-w-0"><div className="flex items-start justify-between gap-3"><DialogTitle className="flex min-w-0 flex-1 items-center gap-2"><ArrowRightLeft className="shrink-0" size={19}/><span className="min-w-0">Byt kundansvar</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" disabled={locked} onClick={()=>close()}>Stäng</Button></div><DialogDescription>{snapshot?.customerName||c.name} · välj ny ansvarig och vilka aktiviteter som ska följa med.</DialogDescription></DialogHeader>
    {draft&&snapshot&&<form className="min-w-0" onSubmit={e=>{e.preventDefault();e.stopPropagation();void submit();}}><fieldset className="min-w-0" disabled={locked}>
     <p>Nuvarande kundansvar: <b>{currentOwner}</b>.</p>
     <p className="biz-hint">{snapshot.customerOwnerProfileId===snapshot.sourceProfile?.id?'Ansvar kopplat till säljarprofil.':snapshot.customerOwnerProfileId?'Ansvarskopplingen behöver granskas innan kundansvaret kan bytas.':'Äldre ansvarskoppling. Den kontrolleras när du granskar överlämningen.'} Profilens ursprungliga ansvarskoppling visas efter namnet när de skiljer sig åt.</p>
     {snapshot.blockedReason&&<div className="biz-callout" role="alert">{snapshot.blockedReason}<Button type="button" className={buttonClass} variant="outline" onClick={()=>close('settings')}>Öppna resultatprofiler</Button></div>}
     <F label="Ny kundansvarig *"><Select value={draft.targetProfileId||'_none'} onValueChange={value=>update({targetProfileId:value==='_none'?'':value})}><SelectTrigger className="*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:overflow-hidden" aria-label="Ny kundansvarig" aria-describedby={target?selectedProfileDescriptionId:undefined} style={{height:'auto',minHeight:44,width:'100%',minWidth:0,whiteSpace:'normal'}}><SelectValue><span style={{display:'-webkit-box',WebkitBoxOrient:'vertical',WebkitLineClamp:2,overflow:'hidden',overflowWrap:'anywhere',lineHeight:1.4,maxHeight:'2.8em',minWidth:0,flex:1,textAlign:'left'}}>{target?profileLabel(target):'Välj ny kundansvarig'}</span></SelectValue></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]"><SelectItem value="_none" className="min-h-11 whitespace-normal">Välj ny kundansvarig</SelectItem>{snapshot.targetProfiles.map(profile=><SelectItem key={profile.id} value={profile.id} className="min-h-11 whitespace-normal break-words"><span className="min-w-0">{profileLabel(profile)}</span></SelectItem>)}</SelectContent></Select></F>
     {target&&<p id={selectedProfileDescriptionId} className="biz-hint break-words"><b>Vald kundansvarig:</b> {target.displayName}. <b>Ansvarskoppling:</b> {target.legacyOwnerName}.</p>}
     <F label="Varför byts kundansvaret? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv överlämningen och varför ansvaret byts." value={draft.reason} onChange={e=>update({reason:e.target.value})}/></F>
     <section className="biz-group" aria-label="Aktiviteter som kan följa med"><h3>Aktiviteter som kan följa med ({snapshot.eligible.length})</h3><p className="biz-hint">Ingen aktivitet är vald från början. Välj endast de öppna aktiviteter som ska få samma nya ansvariga som kunden.</p>
      {snapshot.eligible.map(task=><label className="check-field" key={task.id}><Checkbox checked={draft.selectedTaskIds.includes(task.id)} aria-label={'Flytta aktiviteten '+task.title} onCheckedChange={value=>update({selectedTaskIds:value===true?[...draft.selectedTaskIds.filter(id=>id!==task.id),task.id]:draft.selectedTaskIds.filter(id=>id!==task.id)})}/><span><b>{task.title}</b><small className="block">{taskMeta(task)}</small></span></label>)}
      {!snapshot.eligible.length&&<p>Inga öppna fristående aktiviteter kan följa med. Du kan fortfarande byta kundansvar när en annan aktiv säljarprofil finns att välja.</p>}
     </section>
     <details className="biz-details"><summary>Följer inte med · {remainingCount} öppna arbets- och ansvarsposter</summary><p>Affärer, order, möten, introduktion vid första affären, kundärenden och årshjul behåller sina ansvariga. Aktiviteter som inte valts ligger också kvar.</p>
      {leftEligible.map(task=><article className="revision-card" key={task.id}><b>Aktivitet · {task.title}</b><p>{taskMeta(task)}</p><small>Ligger kvar eftersom den inte är vald.</small></article>)}
      {excludedOpen.map(({task,reason})=><article className="revision-card" key={task.id}><b>Aktivitet · {task.title}</b><p>{taskMeta(task)}</p><small>{reason} Ligger kvar hos {task.owner}.</small></article>)}
      {snapshot.fixedWork.map(work=><article className="revision-card" key={work.id}><b>{work.kind} · {work.title}</b><p>{displayDate(work.due)} · ligger kvar hos {work.owner||'tidigare registrerat ansvar'}.</p></article>)}
      {!remainingCount&&<p>Inget öppet arbete ligger kvar i dessa grupper.</p>}
      {!!excludedDone.length&&<p className="biz-hint">{excludedDone.length} avslutade aktiviteter behåller sitt historiska ansvar.</p>}
     </details>
     <section className="biz-callout" aria-label="Granska ansvarsförändringen"><h3>Granska ändringen</h3><p><b>{snapshot.customerName}</b>: {currentOwner} → {target?profileLabel(target):'välj ny kundansvarig'}.</p><p>Orsak: {draft.reason.trim()||'ange en orsak'}</p><p><b>{selected.length} valda aktiviteter följer med.</b> {remainingCount} öppna arbets- och ansvarsposter ligger kvar som beskrivits ovan.</p>
      {selected.map(task=><p key={task.id}>{task.title} · {displayDate(task.due)} · {task.owner} → {target?.legacyOwnerName||'ny kundansvarig'}.</p>)}
      <p>Historisk försäljning, tidigare kvalificeringar och mål behåller sina resultatprofiler. Kundplanens särskilda ansvar, affärer, order och möten ändras inte genom detta byte.</p>
      <label className="check-field"><Checkbox disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>{if(!locked&&!submitLock.current&&!discard)setDraft(previous=>previous?.identity===identity?{...previous,reviewed:value===true}:previous);}}/>Jag har granskat den nya kundansvariga, orsaken, de valda aktiviteterna och arbetet som ligger kvar.</label>
     </section>
     {draft.selectedTaskIds.length>500&&<p className="error" role="alert">Högst 500 aktiviteter kan följa med. Välj bort aktiviteter innan du granskar överlämningen.</p>}
     {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16}/>Överlämningsunderlaget har ändrats</b><p>Din orsak och dina val finns kvar med det tidigare underlaget. Läs in och granska aktuellt underlag innan du sparar.</p></div>}
     <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning bevarar formuläret och dess tidigare underlag. Läs in nytt granskningsunderlag visar senast hämtade uppgifter, behåller orsaken och de möjliga valen och kräver en ny granskning. Nya aktiviteter väljs aldrig automatiskt.</p><div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>void fetchCurrent()}>Hämta aktuellt underlag</Button><Button type="button" className={buttonClass} variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
     {!!snapshot.responsibilityTransfers.length&&<details className="biz-details"><summary>Tidigare överlämningar ({snapshot.responsibilityTransfers.length})</summary>{[...snapshot.responsibilityTransfers].reverse().map(row=><article className="revision-card" key={row.id}><b>{row.fromOwner} → {row.toOwner}</b><p>{new Date(row.at).toLocaleString('sv-SE')} · registrerat av {row.byName}.</p><p className="whitespace-pre-wrap">{row.reason}</p><small>{row.selectedTaskIds.length} aktiviteter följde med.</small></article>)}</details>}
     {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
     <p className="biz-hint">Formuläret sparas inte som privat utkast. Din text och dina val finns kvar medan dialogen är öppen; de försvinner om du stänger utan att spara eller laddar om sidan.</p>
     <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={()=>close()}>Stäng</Button><Button type="submit" className={buttonClass} disabled={locked||!canReview||!draft.reviewed||discard}>{submitting?'Sparar…':'Spara nytt kundansvar'}</Button></div>
    </fieldset></form>}
    {locked&&<p role="status">{refreshing?'Hämtar aktuellt underlag…':'Sparar överlämningen…'} Vänta innan du stänger.</p>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={discard&&visibleOpen} onOpenChange={value=>{if(!locked&&!submitLock.current)setDiscard(value);}}>
   <AlertDialogContent className="max-h-[90dvh] overflow-y-auto break-words" onFocusCapture={revealFocusedControl}><AlertDialogHeader className="min-w-0"><AlertDialogTitle>Stäng utan att spara överlämningen?</AlertDialogTitle><AlertDialogDescription>Din orsak och dina val försvinner om du stänger. De är inte sparade som privat utkast. Ett tidigare obekräftat sparförsök kan redan ha ändrat CRM; stängning återställer inte en sådan ändring.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="min-w-0"><AlertDialogCancel className={buttonClass} disabled={locked}>Fortsätt redigera</AlertDialogCancel><AlertDialogAction className={buttonClass} disabled={locked} onClick={()=>{if(!locked&&!submitLock.current)finishClose(closeDestination);}}>Stäng utan att spara</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
  </AlertDialog>
 </>;
}
