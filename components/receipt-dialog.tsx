'use client';
import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {type State,type Order,day,plusDays} from '@/lib/crm';
import {awaitingReceipt,receiptBasis} from '@/lib/order-work';
import {directRows,deliveryVerified,latestDispatch} from '@/lib/direct-delivery';
import {productionProgress} from '@/lib/production-quantities';
import {BusinessField as F,displayDate} from './business-ui';
type ReceiptSave=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;

export function ReceiptDialog({o,st,save,busy,onClose}:{o:Order;st:State;save:ReceiptSave;busy:boolean;onClose:()=>void}){
 const [mode,setMode]=useState<'confirm'|'issue'>('confirm'),[date,setDate]=useState(day()),[name,setName]=useState(''),[note,setNote]=useState(''),[issue,setIssue]=useState(o.deliveryIssue),[next,setNext]=useState(plusDays(day(),1));
 const currentBasis=receiptBasis(st,o.id),[basis,setBasis]=useState(()=>currentBasis),[reviewBasis,setReviewBasis]=useState(''),[reviewed,setReviewed]=useState(false),[failure,setFailure]=useState(''),[working,setWorking]=useState(false);
 const lock=useRef(false),alive=useRef(true),status=useRef<HTMLDivElement>(null),review=useRef<HTMLDivElement>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>setReviewed(false),[currentBasis]);
 const enabled=['admin','seller'].includes(st.viewer?.role||''),locked=busy||working,conflict=basis!==currentBasis,waiting=awaitingReceipt(o);
 const tasks=st.tasks.filter(t=>t.dealId===o.dealId&&t.kind==='receipt');
 const d=st.deals.find(d=>d.id===o.dealId),rows=o.production.status==='dispatched'?productionProgress(o.production).map(r=>({id:r.line.id,name:r.line.description||r.line.article,quantity:r.target,dispatched:r.dispatched})):d?directRows(d,o.directShipments).map(r=>({id:r.line.id,name:r.line.description||r.line.article,quantity:r.line.quantity,dispatched:r.dispatched})):[];
 let dispatched='';try{dispatched=displayDate(latestDispatch(o))}catch{dispatched='Ogiltigt datum – kontrollera avsändningsunderlaget'}
 function reveal(target:HTMLElement|null){if(!target?.isConnected)return;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}
 function openReview(){if(locked||lock.current)return;setReviewBasis(currentBasis);setReviewed(false);requestAnimationFrame(()=>{if(alive.current)reveal(review.current)})}
 function adopt(){if(locked||lock.current||!reviewed||reviewBasis!==currentBasis||!waiting)return;setBasis(reviewBasis);setReviewBasis('');setReviewed(false);setFailure('');requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
 async function submit(){
  if(!enabled||locked||lock.current||conflict||!waiting)return;
  lock.current=true;setWorking(true);setFailure('');
  // Keep the original basis in the submitted data. The shared save action
  // reuses the same request ID for an unchanged, unconfirmed attempt.
  const type=mode==='confirm'?'receipt_confirm':'receipt_issue',data=mode==='confirm'?{orderId:o.id,expectedContext:basis,deliveredDate:date,receivedBy:name,note}:{orderId:o.id,expectedContext:basis,message:issue,nextCheck:next};
  try{
   let message='';const ok=await save(type,data,false,(_,text)=>{message=text||''});
   if(!alive.current)return;
   if(ok){onClose();return}
   setFailure(message||'Sparningen kunde inte bekräftas. Dina uppgifter finns kvar. Kontrollera resultatet innan du försöker igen.');
   requestAnimationFrame(()=>{if(alive.current)reveal(status.current)});
  }catch{
   if(alive.current){setFailure('Sparningen kunde inte bekräftas. Dina uppgifter finns kvar. Kontrollera resultatet innan du försöker igen.');requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
  }finally{if(alive.current){lock.current=false;setWorking(false)}}
 }
 return <Sheet open onOpenChange={v=>{if(!v&&!locked&&!lock.current)onClose()}}><SheetContent className="crm-sheet receipt-dialog" showCloseButton={!locked} onEscapeKeyDown={e=>{if(locked||lock.current)e.preventDefault()}} onPointerDownOutside={e=>{if(locked||lock.current)e.preventDefault()}} onInteractOutside={e=>{if(locked||lock.current)e.preventDefault()}}><SheetHeader><SheetTitle>{enabled?d?.title:'Leveransunderlag'}</SheetTitle><SheetDescription>{st.customers.find(c=>c.id===o.customerId)?.name} · Utlovad leverans {displayDate(o.deliveryDate)}</SheetDescription></SheetHeader>
 {!enabled?<div className="sheet-body business-ui"><p>Nästa kontroll: {displayDate(o.deliveryNextCheck||o.deliveryDate)}</p>{o.deliveryIssue&&<p>{o.deliveryIssue}</p>}<p>Ditt konto kan läsa leveransunderlaget.</p><Button variant="outline" onClick={onClose}>Stäng</Button></div>:<div className="sheet-body business-ui">
 <div ref={status} tabIndex={-1} className="form-status-details receipt-status" role="status" aria-live="polite" aria-atomic="true"><b>{locked?'Sparar leveransregistreringen…':conflict?'Leveransunderlaget har ändrats. Din text finns kvar.':!waiting?'Ordern väntar inte längre på mottagningsbekräftelse.':failure?'Sparningen kunde inte bekräftas.':'Registrera kundens mottagande eller planera nästa leveranskontroll.'}</b>{failure&&<p>{failure}</p>}</div>
 <fieldset disabled={locked}>
 {conflict&&<div className="record-conflict"><p>Granska kollegans aktuella besked innan du sparar. Dina öppna fält ersätts inte.</p><Button variant="outline" onClick={openReview}>Granska aktuell leverans</Button></div>}
 {reviewBasis&&<div ref={review} tabIndex={-1} className="receipt-review form-status-details" aria-label="Aktuellt leveransunderlag"><h3>Aktuellt sparat leveransunderlag</h3><p>Ansvarig: {o.owner}</p><p>Leveransbesked: {o.deliveryIssue||'Inget problem registrerat'}</p><p>Nästa kontroll på ordern: {displayDate(o.deliveryNextCheck||o.deliveryDate)}</p><p>Mottagen: {o.deliveredDate?displayDate(o.deliveredDate)+' · '+o.receivedBy:'Inte bekräftad'}</p><p>{deliveryVerified(st,o)?'Hela den registrerade leveransen är avsänd.':'Leveransunderlaget behöver kompletteras innan mottagandet kan bekräftas.'}</p>
 <p>Senaste avsändning: {dispatched}</p>{o.production.issue&&<p>Produktionshinder: {o.production.issue}</p>}
 {rows.map(r=><p key={r.id}>{r.name}: {r.dispatched} av {r.quantity} skickade</p>)}
 {o.directShipments.map(s=><div key={s.id}><p>Försändelse {displayDate(s.dispatchedOn)} · {s.recipient} · {s.recordedBy}</p><p>Underlag: {s.evidence}{s.tracking?' · Spårning: '+s.tracking:''}</p></div>)}
 {o.production.movements.filter(m=>m.kind==='dispatched').map(m=><p key={m.id}>Registrerad avsändning: {displayDate(m.at)} · {m.by} · {m.recipient}{m.tracking?' · Spårning: '+m.tracking:''}{m.reason?' · '+m.reason:''}</p>)}
 {tasks.map(t=><p key={t.id}>{t.title} · {t.owner} · {displayDate(t.due)} · {t.done?'Avslutad':'Öppen'}</p>)}
 {reviewBasis!==currentBasis?<><p>Underlaget ändrades igen. Granska den senaste versionen.</p><Button variant="outline" onClick={openReview}>Visa senaste leveransunderlaget</Button></>:<label className="check-field"><Checkbox checked={reviewed} onCheckedChange={v=>setReviewed(v===true)}/>Jag har jämfört mina uppgifter med detta underlag</label>}
 <Button disabled={!waiting||!reviewed||reviewBasis!==currentBasis} onClick={adopt}>Använd detta underlag och behåll min text</Button><p className="biz-hint">Detta sparar ingenting. Granska dina fält och välj därefter rätt registrering.</p></div>}
 <div className="biz-buttons"><Button variant={mode==='confirm'?'default':'outline'} onClick={()=>setMode('confirm')}><CheckCircle2 size={16}/>Kunden har fått ordern</Button><Button variant={mode==='issue'?'default':'outline'} onClick={()=>setMode('issue')}><AlertTriangle size={16}/>Försening / behöver kontrolleras</Button></div>
 {mode==='confirm'?<><F label="Faktiskt mottagningsdatum"><Input type="date" max={day()} value={date} onChange={e=>setDate(e.target.value)}/></F><F label="Vem eller vilket underlag bekräftar mottagandet?"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Kundens namn eller transportörens leveransbevis"/></F><F label="Anteckning, valfritt"><Textarea value={note} onChange={e=>setNote(e.target.value)}/></F><p className="biz-hint">Bekräfta när hela ordern har kommit fram. Därefter planeras uppföljning av leveransen och nästa behov.</p><Button disabled={conflict||!waiting||!name.trim()||!date} onClick={submit}>Bekräfta mottagen leverans</Button></>:<><F label="Vad behöver följas upp?"><Textarea value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Paketet har inte kommit fram. Kontakta transportören."/></F><F label="Nästa kontroll"><Input type="date" min={day()} value={next} onChange={e=>setNext(e.target.value)}/></F><Button disabled={conflict||!waiting||!issue.trim()||!next} onClick={submit}>Spara & behåll leveransbevakning</Button></>}
 </fieldset></div>}
 </SheetContent></Sheet>;
}
