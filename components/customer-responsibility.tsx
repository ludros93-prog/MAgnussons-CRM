'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowRightLeft,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {customerResponsibilityBasis,customerResponsibilityCandidates} from '@/lib/customer-responsibility';
import {type State,type Customer,type Task} from '@/lib/crm';
import {BusinessField as F,Pick,displayDate,type SaveAction} from './business-ui';

type FixedWork={id:string;kind:string;title:string;due:string;owner:string};
type Snapshot=ReturnType<typeof customerResponsibilityCandidates>&{customerId:string;customerName:string;customerOwner:string;fixedWork:FixedWork[]};
type Draft={expectedContext:string;snapshot:Snapshot;targetProfileId:string;selectedTaskIds:string[];reason:string;reviewed:boolean};

function fixedCustomerWork(st:State,c:Customer):FixedWork[]{
 const work:FixedWork[]=[];
 for(const d of st.deals.filter(d=>d.customerId===c.id&&!['won','lost'].includes(d.stage)))work.push({id:'deal:'+d.id,kind:d.stage==='paused'?'Pausad affär':'Affär',title:d.title,due:d.nextDate,owner:d.owner});
 for(const o of st.orders.filter(o=>o.customerId===c.id&&(o.stage!=='followed'||o.invoiceValue===null)))work.push({id:'order:'+o.id,kind:o.stage==='followed'&&o.invoiceValue===null?'Order som saknar faktura':'Order',title:st.deals.find(d=>d.id===o.dealId)?.title||'Order '+o.id,due:o.deliveryDate,owner:o.owner});
 for(const m of st.meetings.filter(m=>m.customerId===c.id&&m.status==='planned'))work.push({id:'meeting:'+m.id,kind:'Möte',title:m.title,due:m.date,owner:m.owner});
 if(c.onboarding.startedAt&&!c.onboarding.completedAt)work.push({id:'onboarding',kind:'Onboarding',title:'Första affärens onboarding',due:c.onboarding.due,owner:c.onboarding.owner});
 if(c.plan.issueStatus==='open')work.push({id:'issue',kind:'Kundärende',title:c.plan.issueAction||c.plan.issue||'Öppet kundärende',due:c.plan.issueDue,owner:c.plan.issueOwner});
 for(const need of c.yearNeeds.filter(n=>n.status==='planned'))work.push({id:'need:'+need.id,kind:'Årshjul',title:need.title,due:need.due,owner:need.owner});
 return work;
}
function snapshot(st:State,c:Customer):Snapshot{
 return structuredClone({...customerResponsibilityCandidates(st,c.id),customerId:c.id,customerName:c.name,customerOwner:c.owner,fixedWork:fixedCustomerWork(st,c)});
}
const profileLabel=(profile:Snapshot['targetProfiles'][number])=>profile.displayName+(profile.displayName===profile.legacyOwnerName?'':' · '+profile.legacyOwnerName);

export function CustomerResponsibility({st,c,save,busy,refresh,onSettings,onDialogChange}:{st:State;c:Customer;save:SaveAction;busy:boolean;refresh:()=>Promise<void>;onSettings:()=>void;onDialogChange:(open:boolean)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false);
 const submitLock=useRef(false),currentBasis=customerResponsibilityBasis(st,c.id),conflict=!!draft&&draft.expectedContext!==currentBasis,locked=busy||submitting||refreshing;
 const admin=st.viewer?.role==='admin';
 useEffect(()=>{if(conflict&&draft?.reviewed)setDraft(previous=>previous?{...previous,reviewed:false}:previous);},[conflict,draft?.reviewed,currentBasis]);
 useEffect(()=>{if(open&&(!admin||!st.settings.sellerProfilesInitialized)){setOpen(false);onDialogChange(false);}},[admin,st.settings.sellerProfilesInitialized,open,onDialogChange]);
 useEffect(()=>()=>onDialogChange(false),[onDialogChange]);

 function changeOpen(next:boolean){
  if(locked)return;
  if(next&&!draft){setDraft({expectedContext:currentBasis,snapshot:snapshot(st,c),targetProfileId:'',selectedTaskIds:[],reason:'',reviewed:false});setError('');setNotice('');}
  setOpen(next);onDialogChange(next);
 }
 function update(patch:Partial<Draft>){setDraft(previous=>previous?{...previous,...patch,reviewed:false}:previous);setError('');}
 function readCurrent(){
  if(!draft||locked)return;
  const next=snapshot(st,c),eligibleIds=new Set(next.eligible.map(task=>task.id));
  const removed=draft.snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id)&&!eligibleIds.has(task.id));
  const targetValid=next.targetProfiles.some(profile=>profile.id===draft.targetProfileId);
  setDraft({...draft,expectedContext:currentBasis,snapshot:next,selectedTaskIds:draft.selectedTaskIds.filter(id=>eligibleIds.has(id)),targetProfileId:targetValid?draft.targetProfileId:'',reviewed:false});
  setError('');setNotice('Det aktuella underlaget visas. Orsaken finns kvar. Granska ändringen igen.'+(removed.length?' Följande val är inte längre möjliga och har tagits bort: '+removed.map(task=>task.title).join(', ')+'.':'')+(!targetValid&&draft.targetProfileId?' Den tidigare målprofilen är inte längre tillgänglig; välj en ny.':''));
 }
 async function submit(){
  if(!draft||locked||submitLock.current||conflict||!admin||!draft.reviewed)return;
  if(draft.snapshot.blockedReason){setError(draft.snapshot.blockedReason);return;}
  if(!draft.snapshot.targetProfiles.some(profile=>profile.id===draft.targetProfileId)||!draft.reason.trim()){setError('Välj en ny kundansvarig och beskriv varför ansvaret byts.');return;}
  submitLock.current=true;setSubmitting(true);setError('');
  try{
   const saved=await save('customer_responsibility_transfer',{customerId:c.id,targetProfileId:draft.targetProfileId,selectedTaskIds:draft.selectedTaskIds,reason:draft.reason.trim(),expectedContext:draft.expectedContext,reviewed:true},false);
   if(saved){setOpen(false);onDialogChange(false);setDraft(null);setNotice('');}
   else setError('Sparandet kunde inte bekräftas. Dina val och din orsak finns kvar. Kontrollera det aktuella underlaget eller försök igen med samma val.');
  }catch(e){setError((e as Error).message||'Sparandet kunde inte bekräftas. Dina uppgifter finns kvar.');}
  finally{submitLock.current=false;setSubmitting(false);}
 }
 if(!admin)return null;
 if(!st.settings.sellerProfilesInitialized)return <p className="biz-hint">Förbered resultatprofilerna innan kundansvaret kan bytas med spårbar överlämning. <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onSettings}>Förbered resultatprofiler</Button></p>;
 const target=draft?.snapshot.targetProfiles.find(profile=>profile.id===draft.targetProfileId),selected=draft?.snapshot.eligible.filter(task=>draft.selectedTaskIds.includes(task.id))||[];
 const leftEligible=draft?.snapshot.eligible.filter(task=>!draft.selectedTaskIds.includes(task.id))||[],excludedOpen=draft?.snapshot.excluded.filter(row=>!row.task.done)||[],excludedDone=draft?.snapshot.excluded.filter(row=>row.task.done)||[];
 const remainingCount=leftEligible.length+excludedOpen.length+(draft?.snapshot.fixedWork.length||0);
 const canReview=!!draft&&!!target&&!!draft.reason.trim()&&!conflict&&!draft.snapshot.blockedReason;
 function taskMeta(task:Task){return displayDate(task.due)+' · ansvarig '+task.owner;}

 return <Dialog open={open} onOpenChange={changeOpen}>
  <DialogTrigger asChild><Button type="button" size="sm" variant="outline" disabled={busy}><ArrowRightLeft size={15}/>Byt kundansvar</Button></DialogTrigger>
  <DialogContent className="business-ui max-h-[85dvh] overflow-y-auto sm:max-w-2xl" showCloseButton={!locked} onEscapeKeyDown={e=>{if(locked)e.preventDefault();}} onInteractOutside={e=>{if(locked)e.preventDefault();}}>
   <DialogHeader><DialogTitle>Byt kundansvar</DialogTitle><DialogDescription>{draft?.snapshot.customerName||c.name} · välj ny ansvarig och de aktiviteter som ska följa med.</DialogDescription></DialogHeader>
   {draft&&<form onSubmit={e=>{e.preventDefault();e.stopPropagation();void submit();}}><fieldset disabled={locked}>
    <p>Nuvarande kundansvar: <b>{draft.snapshot.sourceProfile?profileLabel(draft.snapshot.sourceProfile):draft.snapshot.customerOwner}</b>.</p>
    {draft.snapshot.blockedReason&&<div className="biz-callout" role="alert">{draft.snapshot.blockedReason}<Button type="button" variant="outline" onClick={()=>{changeOpen(false);onSettings();}}>Öppna resultatprofiler</Button></div>}
    <F label="Ny kundansvarig *"><Pick label="Ny kundansvarig" value={draft.targetProfileId} items={[{id:'',label:'Välj ny kundansvarig'},...draft.snapshot.targetProfiles.map(profile=>({id:profile.id,label:profileLabel(profile)}))]} onChange={value=>update({targetProfileId:value})}/></F>
    <F label="Varför byts kundansvaret? *"><Textarea required rows={3} maxLength={4000} placeholder="Beskriv överlämningen och varför ansvaret byts." value={draft.reason} onChange={e=>update({reason:e.target.value})}/></F>
    <section className="biz-group" aria-label="Uppgifter som kan flyttas"><h3>Uppgifter som kan flyttas ({draft.snapshot.eligible.length})</h3><p className="biz-hint">Ingen aktivitet är vald från början. Bocka för exakt de öppna uppgifter som ska få samma nya ansvariga som kunden.</p>
     {draft.snapshot.eligible.map(task=><label className="check-field" key={task.id}><Checkbox checked={draft.selectedTaskIds.includes(task.id)} aria-label={'Flytta aktiviteten '+task.title} onCheckedChange={value=>update({selectedTaskIds:value===true?[...draft.selectedTaskIds.filter(id=>id!==task.id),task.id]:draft.selectedTaskIds.filter(id=>id!==task.id)})}/><span><b>{task.title}</b><small className="block">{taskMeta(task)}</small></span></label>)}
     {!draft.snapshot.eligible.length&&<p>Det finns inga öppna fristående aktiviteter som kan följa med. Du kan fortfarande byta kundens ansvariga när målprofilen är tillgänglig.</p>}
    </section>
    <details className="biz-details"><summary>Följer inte med · {remainingCount} öppna arbets- och ansvarsposter</summary><p>De här ansvaren ändras inte genom denna överföring: affärer, order, möten, onboarding, kundärenden och årshjul. Uppgifter som inte bockats för ändras inte heller.</p>
     {leftEligible.map(task=><article className="revision-card" key={task.id}><b>Aktivitet · {task.title}</b><p>{taskMeta(task)}</p><small>Ligger kvar eftersom den inte är vald.</small></article>)}
     {excludedOpen.map(({task,reason})=><article className="revision-card" key={task.id}><b>Aktivitet · {task.title}</b><p>{taskMeta(task)}</p><small>{reason} Ligger kvar hos {task.owner}.</small></article>)}
     {draft.snapshot.fixedWork.map(work=><article className="revision-card" key={work.id}><b>{work.kind} · {work.title}</b><p>{displayDate(work.due)} · ligger kvar hos {work.owner||'tidigare registrerat ansvar'}.</p></article>)}
     {!remainingCount&&<p>Inget öppet arbete ligger kvar i dessa grupper.</p>}
     {!!excludedDone.length&&<p className="biz-hint">{excludedDone.length} avslutade aktiviteter behåller sitt historiska ansvar.</p>}
    </details>
    <section className="biz-callout" aria-label="Granska ansvarsförändringen"><h3>Granska ändringen</h3><p><b>{draft.snapshot.customerName}</b>: {draft.snapshot.sourceProfile?profileLabel(draft.snapshot.sourceProfile):draft.snapshot.customerOwner} → {target?profileLabel(target):'välj ny kundansvarig'}.</p><p>Orsak: {draft.reason.trim()||'ange en orsak'}</p><p><b>{selected.length} valda aktiviteter följer med.</b> {remainingCount} öppna arbets- och ansvarsposter ligger kvar som beskrivits ovan.</p>
     {selected.map(task=><p key={task.id}>{task.title} · {displayDate(task.due)} · {task.owner} → {target?.legacyOwnerName||'ny kundansvarig'}.</p>)}
     <p>Historisk försäljning, tidigare kvalificeringar och mål ligger kvar på sina resultatprofiler. Kundplanens särskilda ansvar, affärer, order och möten ändras inte genom detta byte.</p>
     <label className="check-field"><Checkbox disabled={!canReview} checked={draft.reviewed&&!conflict} onCheckedChange={value=>setDraft(previous=>previous?{...previous,reviewed:value===true}:previous)}/>Jag har granskat den nya kundansvariga, orsaken, de valda aktiviteterna och arbetet som ligger kvar.</label>
    </section>
    {conflict&&<div className="record-conflict" role="alert"><b><AlertTriangle size={16}/>Överlämningsunderlaget har ändrats</b><p>Dina val och din orsak finns kvar. Nuvarande kundansvar i CRM: {c.owner}. Läs in det aktuella granskningsunderlaget och granska ändringen igen innan du sparar.</p></div>}
    <details className="biz-details"><summary>Hämta och granska aktuellt underlag</summary><p>Hämtning behåller formuläret. Granskning ersätter listorna med CRM:s senaste inlästa uppgifter, behåller orsaken och de val som fortfarande är möjliga. Inga nya aktiviteter väljs automatiskt.</p><div className="biz-buttons"><Button type="button" variant="outline" onClick={async()=>{setRefreshing(true);try{await refresh();}catch(e){setError((e as Error).message);}finally{setRefreshing(false);}}}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" onClick={readCurrent}>Läs in nytt granskningsunderlag</Button></div></details>
    {notice&&<p className="biz-hint" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    <div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>changeOpen(false)}>Stäng, behåll val</Button><Button type="submit" disabled={locked||!canReview||!draft.reviewed}>{submitting?'Sparar…':'Spara nytt kundansvar'}</Button></div>
   </fieldset></form>}
  </DialogContent>
 </Dialog>;
}
