'use client';
import {useEffect,useRef,useState,type FocusEvent,type MouseEvent} from 'react';
import {CheckCircle2,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {type State,type Order,day,plusDays} from '@/lib/crm';
import {validDate} from '@/lib/business';
import {awaitingReceipt,receiptBasis} from '@/lib/order-work';
import {ReceiptDraftEnvelopeSchema,type ReceiptDraftEnvelope,type ReceiptDraftValues} from '@/lib/receipt-drafts';
import {directRows,deliveryVerified,latestDispatch} from '@/lib/direct-delivery';
import {productionProgress} from '@/lib/production-quantities';
import {DraftStatus,useDrafts} from './draft-workspace';
import {BusinessField as F,displayDate} from './business-ui';
type ReceiptSave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
type ReceiptAttempt={type:'receipt_confirm'|'receipt_issue';data:Record<string,unknown>&{draft:{id:string;revision:number}}};
const usableDate=(value:string)=>!!value&&validDate.safeParse(value).success;

export function ReceiptDialog({o,st,save,busy,onClose,draftId}:{o:Order;st:State;save:ReceiptSave;busy:boolean;onClose:()=>void;draftId?:string}){
 const w=useDrafts(),enabled=['admin','seller'].includes(st.viewer?.role||''),currentBasis=receiptBasis(st,o.id),waiting=awaitingReceipt(o);
 const customer=st.customers.find(c=>c.id===o.customerId),d=st.deals.find(d=>d.id===o.dealId);
 const initial=useRef<ReceiptDraftEnvelope>({values:{mode:'confirm',deliveredDate:day(),receivedBy:'',note:'',message:o.deliveryIssue,nextCheck:plusDays(day(),1)},expectedContext:currentBasis,customerName:customer?.name.slice(0,200),orderTitle:d?.title.slice(0,200)});
 const [activeId,setActiveId]=useState(''),[choices,setChoices]=useState<string[]>([]),[reviewBasis,setReviewBasis]=useState(''),[reviewed,setReviewed]=useState(false),[failure,setFailure]=useState(''),[operation,setOperation]=useState(''),[discard,setDiscard]=useState(false),[retry,setRetry]=useState<ReceiptAttempt|null>(null);
 const initialized=useRef(false),lock=useRef(false),alive=useRef(true),ws=useRef(w),state=useRef(st),retryAttempt=useRef<ReceiptAttempt|null>(null),status=useRef<HTMLDivElement>(null),review=useRef<HTMLDivElement>(null);
 ws.current=w;state.current=st;
 const local=enabled?w.records.find(r=>r.id===activeId&&r.kind==='receipt'&&r.context===o.id):undefined;
 const parsed=local?ReceiptDraftEnvelopeSchema.safeParse(local.data):null,envelope=parsed?.success?parsed.data:undefined,v=envelope?.values;
 const locked=busy||!!operation,conflict=!!envelope&&envelope.expectedContext!==currentBasis,draftConflict=local?.status==='conflict';
 const tasks=st.tasks.filter(t=>t.dealId===o.dealId&&t.kind==='receipt');
 const rows=o.production.status==='dispatched'?productionProgress(o.production).map(r=>({id:r.line.id,name:r.line.description||r.line.article,quantity:r.target,dispatched:r.dispatched})):d?directRows(d,o.directShipments).map(r=>({id:r.line.id,name:r.line.description||r.line.article,quantity:r.line.quantity,dispatched:r.dispatched})):[];
 let dispatched='';try{dispatched=displayDate(latestDispatch(o))}catch{dispatched='Ogiltigt datum – kontrollera avsändningsunderlaget'}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 function clearReview(){setReviewBasis('');setReviewed(false)}
 function clearRetry(){retryAttempt.current=null;setRetry(null)}
 function reset(){clearRetry();clearReview();setDiscard(false);setFailure('')}
 // Both explicit version choices increment the local generation. Neither an
 // autosave status nor a global CRM refresh changes the user's review basis.
 useEffect(()=>{reset()},[local?.generation]);
 useEffect(()=>setReviewed(false),[currentBasis]);
 function reveal(target:HTMLElement|null){if(!target?.isConnected)return;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}
 function showFailure(message:string){if(!alive.current)return;setFailure(message);requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
 function currentEnvelope(){const record=ws.current.get(activeId);if(!record||record.kind!=='receipt'||record.context!==o.id)return null;const p=ReceiptDraftEnvelopeSchema.safeParse(record.data);return p.success?{record,envelope:p.data}:null;}
 async function resume(id:string){
  if(lock.current||busy||!enabled)return;
  lock.current=true;setOperation('open');setActiveId(id);setChoices([]);reset();
  try{
   await ws.current.reconcile(id);if(!alive.current)return;
   const saved=ws.current.get(id);
   if(!saved||saved.kind!=='receipt'||saved.context!==o.id)setFailure('Det valda utkastet saknas, är avslutat eller hör till en annan order. Öppna rätt arbete från Min dag.');
  }finally{lock.current=false;if(alive.current)setOperation('')}
 }
 useEffect(()=>{
  if(initialized.current||!w.ready||!enabled||busy)return;
  initialized.current=true;
  if(draftId){void resume(draftId);return}
  const existing=w.records.filter(r=>r.kind==='receipt'&&r.context===o.id);
  if(existing.length>1){setChoices(existing.map(r=>r.id));return}
  if(existing.length===1){void resume(existing[0].id);return}
  // Completed orders and missing/archived chosen drafts never create a new
  // receipt draft. The initial context is the one opened, not a later refresh.
  if(!waiting)return;
  const id=w.create('receipt',o.id,initial.current,('Leverans · '+(d?.title||customer?.name||'Order')).slice(0,200));
  if(id)setActiveId(id);else{initialized.current=false;setFailure('Ditt privata utkast kunde inte öppnas. Försök igen när utkasten har hämtats.')}
 },[w.ready,w.records,enabled,busy,draftId,waiting,o.id]);
 function update<K extends keyof ReceiptDraftValues>(key:K,value:ReceiptDraftValues[K]){
  if(!enabled||locked||lock.current)return;
  const saved=currentEnvelope();if(!saved||saved.record.status==='conflict')return;
  reset();ws.current.update(activeId,{...saved.envelope,values:{...saved.envelope.values,[key]:value}});
 }
 function draftAction(event:MouseEvent<HTMLDivElement>){
  if(!(event.target instanceof HTMLElement)||!event.target.closest('button'))return;
  if(lock.current||busy){event.preventDefault();event.stopPropagation();return}
  if(draftConflict)reset();
 }
 function openReview(){if(locked||lock.current||!envelope||draftConflict)return;setReviewBasis(currentBasis);setReviewed(false);requestAnimationFrame(()=>{if(alive.current)reveal(review.current)})}
 function adopt(){
  if(locked||lock.current||!reviewed||reviewBasis!==receiptBasis(state.current,o.id)||!waiting)return;
  const saved=currentEnvelope();if(!saved||saved.record.status==='conflict')return;
  ws.current.update(activeId,{...saved.envelope,expectedContext:reviewBasis});reset();
  requestAnimationFrame(()=>{if(alive.current)reveal(status.current)});
 }
 async function close(){
  if(locked||lock.current)return;
  if(!enabled||!activeId||!ws.current.get(activeId)){onClose();return}
  lock.current=true;setOperation('close');setFailure('');
  try{if(await ws.current.flush(activeId)===null){showFailure(ws.current.get(activeId)?.error||'Ditt privata utkast kunde inte sparas. Dina uppgifter finns kvar här. Försök igen innan du stänger.');return}if(alive.current)onClose();}
  finally{lock.current=false;if(alive.current)setOperation('')}
 }
 async function remove(){
  if(locked||lock.current||!enabled||!activeId)return;
  lock.current=true;setOperation('discard');setFailure('');clearRetry();clearReview();
  try{if(await ws.current.archive(activeId)){if(alive.current)onClose()}else showFailure(ws.current.get(activeId)?.error||'Det privata utkastet kunde inte tas bort. Dina uppgifter finns kvar.');}
  finally{lock.current=false;if(alive.current)setOperation('')}
 }
 async function submit(){
  if(!enabled||locked||lock.current)return;
  if(!retryAttempt.current&&(!envelope||conflict||draftConflict||!waiting))return;
  lock.current=true;setOperation('draft');setFailure('');
  let attempt=retryAttempt.current,crmStarted=false;
  try{
   if(!attempt){
    if(!await ws.current.reconcile(activeId)){showFailure(ws.current.get(activeId)?.error||'Utkastet har ändrats på en annan enhet. Välj vilken version du vill använda.');return}
    const ref=await ws.current.flush(activeId);if(!alive.current)return;
    const saved=currentEnvelope();
    if(!ref||!saved||saved.record.status!=='saved'||saved.record.revision!==ref.revision){showFailure(ws.current.get(activeId)?.error||'Det privata utkastet kunde inte sparas. Dina uppgifter finns kvar.');return}
    const currentOrder=state.current.orders.find(row=>row.id===o.id);
    if(!currentOrder||!awaitingReceipt(currentOrder)||saved.envelope.expectedContext!==receiptBasis(state.current,o.id)){showFailure('Leveransunderlaget har ändrats. Dina uppgifter finns kvar. Granska aktuell leverans innan du registrerar i CRM.');return}
    const values=saved.envelope.values,context={orderId:o.id,expectedContext:saved.envelope.expectedContext,draft:ref};
    attempt=values.mode==='confirm'?{type:'receipt_confirm',data:{...context,deliveredDate:values.deliveredDate,receivedBy:values.receivedBy,note:values.note}}:{type:'receipt_issue',data:{...context,message:values.message,nextCheck:values.nextCheck}};
   }
   // An unconfirmed attempt may already have changed the receipt and archived
   // its draft. Replay the exact payload/ref; do not flush or adopt fresh basis.
   setOperation('crm');crmStarted=true;let responseStatus=0,message='';
   const ok=await save(attempt.type,attempt.data,false,(code,text)=>{responseStatus=code;message=text||''});
   if(!alive.current)return;
   if(ok){ws.current.consume(attempt.data.draft.id);clearRetry();onClose();return}
   if(responseStatus===0||responseStatus>=500){retryAttempt.current=attempt;setRetry(attempt);showFailure(message||'Registreringen kunde inte bekräftas. Dina uppgifter finns kvar. Kontrollera resultatet eller försök samma registrering igen.');}
   else{clearRetry();if(responseStatus===409)await ws.current.reconcile(activeId);showFailure(message||'Registreringen i CRM kunde inte bekräftas. Dina uppgifter finns kvar. Kontrollera underlaget innan du försöker igen.');}
  }catch{
   if(alive.current){if(crmStarted&&attempt){retryAttempt.current=attempt;setRetry(attempt)}showFailure(crmStarted?'Registreringen kunde inte bekräftas. Dina uppgifter finns kvar. Kontrollera resultatet eller försök samma registrering igen.':'Det privata utkastet kunde inte sparas. Dina uppgifter finns kvar. Försök igen.');}
  }finally{lock.current=false;if(alive.current)setOperation('')}
 }
 // Native Tab wrapping can suppress scrolling. Reveal the same focused
 // control in this sheet; private autosave never focuses or scrolls anything.
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const sheet=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,[role=combobox]'))return;
  requestAnimationFrame(()=>{if(!alive.current||!control.isConnected||document.activeElement!==control||!sheet.contains(control))return;const box=control.getBoundingClientRect(),bounds=sheet.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;if(box.height>bottom-top)return;if(box.top<top)sheet.scrollBy({top:box.top-top,behavior:'instant'});else if(box.bottom>bottom)sheet.scrollBy({top:box.bottom-bottom,behavior:'instant'});});
 }
 const validFields=!!v&&(v.mode==='confirm'?usableDate(v.deliveredDate)&&!!v.receivedBy.trim():usableDate(v.nextCheck)&&!!v.message.trim());
 const submitDisabled=locked||!envelope||!retry&&(conflict||draftConflict||!waiting||!validFields);
 const crmStatus=operation==='crm'?'Sparar leveransregistreringen i CRM…':operation==='close'?'Sparar privat utkast inför stängning…':operation==='discard'?'Tar bort privat utkast…':operation?'Kontrollerar ditt privata utkast…':retry?'Det senaste registreringsförsöket kunde inte bekräftas.':!waiting?'Ordern väntar inte längre på mottagningsbekräftelse.':draftConflict?'Välj version av ditt privata utkast innan du fortsätter.':conflict?'Leveransunderlaget har ändrats. Dina uppgifter finns kvar.':failure?'Läs sparbeskedet innan du fortsätter.':'Registrera kundens mottagande eller planera nästa leveranskontroll.';
 return <Sheet open onOpenChange={open=>{if(!open&&!locked&&!lock.current)void close()}}><SheetContent className="crm-sheet receipt-dialog" showCloseButton={!locked} onFocusCapture={revealFocusedControl} onEscapeKeyDown={e=>{if(locked||lock.current)e.preventDefault()}} onPointerDownOutside={e=>{if(locked||lock.current)e.preventDefault()}} onInteractOutside={e=>{if(locked||lock.current)e.preventDefault()}}><SheetHeader><SheetTitle>{enabled?d?.title||'Leveransregistrering':'Leveransunderlag'}</SheetTitle><SheetDescription>{customer?.name} · Utlovad leverans {displayDate(o.deliveryDate)}</SheetDescription></SheetHeader>
 {!enabled?<div className="sheet-body business-ui"><p>Nästa kontroll: {displayDate(o.deliveryNextCheck||o.deliveryDate)}</p>{o.deliveryIssue&&<p>{o.deliveryIssue}</p>}<p>Ditt konto kan läsa leveransunderlaget.</p><Button variant="outline" onClick={onClose}>Stäng</Button></div>:<div className="sheet-body business-ui">
 <div className="receipt-private-status" aria-label="Besked och versioner för ditt privata utkast" onClickCapture={draftAction}><b>Privat utkast · bara synligt för dig</b><DraftStatus id={activeId} disabled={locked} announce onResolved={reset} onClosed={()=>{reset();onClose()}}/><p>Kundens mottagande och leveransbevakning ändras först när du registrerar i CRM.</p></div>
 <div ref={status} tabIndex={-1} className="form-status-details receipt-status" role="status" aria-live="polite" aria-atomic="true"><b>{crmStatus}</b>{failure&&<p>{failure}</p>}{retry&&<p>Återförsöket använder samma uppgifter som förra försöket. Ändrar du ett fält eller väljer en annan version blir det en ny registrering.</p>}</div>
 {!!choices.length&&<div className="receipt-draft-choices"><h3>Välj privat leveransutkast</h3><p>Det finns flera av dina utkast för ordern. Välj vilket du vill fortsätta med.</p><div className="biz-buttons">{choices.map(id=>{const choice=w.records.find(r=>r.id===id);return choice?<Button key={id} disabled={locked} variant="outline" onClick={()=>void resume(id)}>{choice.title} · {new Date(choice.updatedAt).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Button>:null})}</div></div>}
 {local&&!envelope&&<div className="record-conflict"><b>Det sparade utkastet kunde inte läsas</b><p>Dina bevarade uppgifter ersätts inte. Kopiera dem innan du öppnar annat arbete. Utkastets format behöver återställas innan det kan ändras.</p><Button disabled={locked} variant="outline" onClick={async()=>{if(lock.current||busy)return;try{await navigator.clipboard.writeText(JSON.stringify(local.data,null,2));if(alive.current)setFailure('De bevarade utkastuppgifterna är kopierade.')}catch{showFailure('Kunde inte kopiera. Öppna de bevarade uppgifterna nedan och kopiera texten.')}}}>Kopiera bevarade utkastuppgifter</Button><details><summary>Visa bevarade utkastuppgifter</summary><pre>{JSON.stringify(local.data.values??local.data,null,2)}</pre></details></div>}
 {envelope&&v&&<fieldset disabled={locked||draftConflict}>
 {conflict&&<div className="record-conflict"><p>Granska kollegans aktuella besked innan du registrerar i CRM. Dina privata fält ersätts inte.</p><Button variant="outline" onClick={openReview}>Granska aktuell leverans</Button></div>}
 {reviewBasis&&<div ref={review} tabIndex={-1} className="receipt-review form-status-details" aria-label="Aktuellt leveransunderlag"><h3>Aktuellt sparat leveransunderlag</h3><p>Ansvarig: {o.owner}</p><p>Leveransbesked: {o.deliveryIssue||'Inget problem registrerat'}</p><p>Nästa kontroll på ordern: {displayDate(o.deliveryNextCheck||o.deliveryDate)}</p><p>Mottagen: {o.deliveredDate?displayDate(o.deliveredDate)+' · '+o.receivedBy:'Inte bekräftad'}</p><p>{deliveryVerified(st,o)?'Hela den registrerade leveransen är avsänd.':'Leveransunderlaget behöver kompletteras innan mottagandet kan bekräftas.'}</p>
 <p>Senaste avsändning: {dispatched}</p>{o.production.issue&&<p>Produktionshinder: {o.production.issue}</p>}
 {rows.map(r=><p key={r.id}>{r.name}: {r.dispatched} av {r.quantity} skickade</p>)}
 {o.directShipments.map(s=><div key={s.id}><p>Försändelse {displayDate(s.dispatchedOn)} · {s.recipient} · {s.recordedBy}</p><p>Underlag: {s.evidence}{s.tracking?' · Spårning: '+s.tracking:''}</p></div>)}
 {o.production.movements.filter(m=>m.kind==='dispatched').map(m=><p key={m.id}>Registrerad avsändning: {displayDate(m.at)} · {m.by} · {m.recipient}{m.tracking?' · Spårning: '+m.tracking:''}{m.reason?' · '+m.reason:''}</p>)}
 {tasks.map(t=><p key={t.id}>{t.title} · {t.owner} · {displayDate(t.due)} · {t.done?'Avslutad':'Öppen'}</p>)}
 {reviewBasis!==currentBasis?<><p>Underlaget ändrades igen. Granska den senaste versionen.</p><Button variant="outline" onClick={openReview}>Visa senaste leveransunderlaget</Button></>:<label className="check-field"><Checkbox checked={reviewed} onCheckedChange={value=>{if(!lock.current&&!busy)setReviewed(value===true)}}/>Jag har jämfört mina uppgifter med detta underlag</label>}
 <Button disabled={!waiting||!reviewed||reviewBasis!==currentBasis} onClick={adopt}>Använd detta underlag och behåll min text</Button><p className="biz-hint">Detta uppdaterar bara ditt privata utkast. Granska fälten och välj därefter rätt registrering i CRM.</p></div>}
 <div className="biz-buttons"><Button variant={v.mode==='confirm'?'default':'outline'} aria-pressed={v.mode==='confirm'} onClick={()=>update('mode','confirm')}><CheckCircle2 size={16}/><span>Kunden har fått ordern</span></Button><Button variant={v.mode==='issue'?'default':'outline'} aria-pressed={v.mode==='issue'} onClick={()=>update('mode','issue')}><AlertTriangle size={16}/><span>Försening / behöver kontrolleras</span></Button></div>
 {v.mode==='confirm'?<><F label="Faktiskt mottagningsdatum"><Input type="date" max={day()} value={v.deliveredDate} onChange={e=>update('deliveredDate',e.target.value)}/></F>{v.deliveredDate&&!usableDate(v.deliveredDate)&&<p className="biz-hint">Bevarat datum i utkastet: {v.deliveredDate}. Välj ett giltigt mottagningsdatum före registrering.</p>}<F label="Vem eller vilket underlag bekräftar mottagandet?"><Input maxLength={4000} value={v.receivedBy} onChange={e=>update('receivedBy',e.target.value)} placeholder="Kundens namn eller transportörens leveransbevis"/></F><F label="Anteckning, valfritt"><Textarea maxLength={4000} value={v.note} onChange={e=>update('note',e.target.value)}/></F><p className="biz-hint">Bekräfta när hela ordern har kommit fram. Därefter planeras uppföljning av leveransen och nästa behov.</p></>:<><F label="Vad behöver följas upp?"><Textarea maxLength={4000} value={v.message} onChange={e=>update('message',e.target.value)} placeholder="Paketet har inte kommit fram. Kontakta transportören."/></F><F label="Nästa kontroll"><Input type="date" min={day()} value={v.nextCheck} onChange={e=>update('nextCheck',e.target.value)}/></F>{v.nextCheck&&!usableDate(v.nextCheck)&&<p className="biz-hint">Bevarat datum i utkastet: {v.nextCheck}. Välj ett giltigt kontrolldatum före registrering.</p>}</>}
 </fieldset>}
 {local&&envelope&&<div className="receipt-discard"><Button disabled={locked} variant="ghost" onClick={()=>{if(!lock.current&&!busy)setDiscard(true)}}>Ta bort privat utkast</Button>{discard&&<><p>Detta tar bort ditt utkast. Kundens sparade leveransuppgifter ändras inte.</p><div className="biz-buttons"><Button disabled={locked} variant="outline" onClick={()=>void remove()}>Ja, ta bort utkast</Button><Button disabled={locked} variant="ghost" onClick={()=>{if(!lock.current&&!busy)setDiscard(false)}}>Behåll utkast</Button></div></>}</div>}
 <div className="receipt-footer"><Button disabled={locked} variant="outline" onClick={()=>void close()}>{local?'Stäng, behåll privat utkast':'Stäng'}</Button>{envelope&&<Button disabled={submitDisabled} onClick={()=>void submit()}>{operation==='crm'?'Sparar i CRM…':retry?retry.type==='receipt_confirm'?'Försök bekräfta samma mottagande igen':'Försök spara samma leveranskontroll igen':v?.mode==='confirm'?'Bekräfta mottagen leverans':'Spara & behåll leveransbevakning'}</Button>}</div>
 </div>}
 </SheetContent></Sheet>;
}
