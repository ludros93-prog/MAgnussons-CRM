'use client';
import {useState} from 'react';
import {FilePenLine,History,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {canAmendOrder,revisionBasis} from '@/lib/order-revisions';
import {productionBasis,productionProgress} from '@/lib/production-quantities';
import {day,type State,type Order,type Deal} from '@/lib/crm';
import {calculateQuote,variantLabel} from '@/lib/business';
import {QuoteEditor} from './quote-editor';
import {BusinessField as F,money,type SaveAction} from './business-ui';

export function OrderChanges({st,o,save,busy}:{st:State;o:Order;save:SaveAction;busy:boolean}){
 const d=st.deals.find(d=>d.id===o.dealId)!;
 const [mode,setMode]=useState(''),[basis,setBasis]=useState(''),[production,setProduction]=useState('');
 const [proposal,setProposal]=useState<Deal>(d),[reason,setReason]=useState(''),[approvedBy,setApprovedBy]=useState(''),[approvedOn,setApprovedOn]=useState(day()),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const [values,setValues]=useState<Record<string,string>>({}),[agreedValue,setAgreedValue]=useState('');
 if(!['admin','seller'].includes(st.viewer?.role||''))return null;
 const pending=o.pendingAmendment,rows=productionProgress(o.production),canShortfall=['submitted','printed'].includes(o.production.status)&&o.invoiceValue===null&&rows.some(r=>r.toReceive>0);
 const changed=mode==='shortfall'?production!==productionBasis(o.production):!!mode&&basis!==revisionBasis(st,o.id);
 const entries=rows.filter(r=>Number(values[r.line.id])>0).map(r=>({lineId:r.line.id,quantity:Number(values[r.line.id])}));
 function start(next:string){const p=pending?.snapshot;setProposal(p?{...d,...p,quoteRef:p.reference}:structuredClone(d));setBasis(revisionBasis(st,o.id));setProduction(productionBasis(o.production));setReason(pending?.reason||'');setApprovedBy('');setApprovedOn(day());setConfirmed(false);setValues({});setAgreedValue(String(o.commercialValue??d.value??''));setError('');setMode(next);}
 async function submit(){
  let type='order_amend',data:Record<string,unknown>={orderId:o.id,expectedContext:basis};
  if(mode==='edit')Object.assign(data,{reason,snapshot:{reference:proposal.quoteRef,lines:proposal.lines,deliveryDate:proposal.deliveryDate,proofDeadline:proposal.proofDeadline,orderDeadline:proposal.orderDeadline}});
  if(mode==='accept'){type='order_amend_accept';Object.assign(data,{amendmentId:pending?.id,customerApprovedBy:approvedBy,customerApprovedOn:approvedOn});}
  if(mode==='shortfall'){type='order_shortfall';data={orderId:o.id,expectedProduction:production,entries,reason,customerApprovedBy:approvedBy,customerApprovedOn:approvedOn,agreedValue:Number(agreedValue)};}
  if(await save(type,data,false))setMode('');else setError('Ändringen sparades inte. Kontrollera underlaget och försök igen.');
 }
 return <section className="order-changes">
  {pending&&<div className="biz-callout"><b>Orderändring R{pending.snapshot.version} väntar på kundens godkännande</b><p>{pending.reason} · föreslaget värde {money(pending.snapshot.value)}</p><p>Den tidigare accepterade ordern gäller tills ändringen godkänns. Tryckunderlaget väntar.</p><div className="biz-buttons"><Button type="button" disabled={busy} onClick={()=>start('accept')}>Granska & registrera godkännande</Button><Button type="button" variant="ghost" disabled={busy} onClick={async()=>{await save('order_amend_discard',{orderId:o.id,expectedContext:revisionBasis(st,o.id)},false)}}>Återta förslaget</Button></div></div>}
  <div className="biz-buttons">{canAmendOrder(o)&&<Button type="button" variant="outline" disabled={busy} onClick={()=>start('edit')}><FilePenLine size={16}/>{pending?'Redigera ändringsförslag':'Ändra accepterad order'}</Button>}{canShortfall&&<Button type="button" variant="outline" disabled={busy} onClick={()=>start('shortfall')}><AlertTriangle size={16}/>Kunden godkänner färre artiklar</Button>}</div>
  {o.commercialValue!==null&&<p className="biz-hint">Överenskommet ordervärde efter avvikelse: <b>{money(o.commercialValue)}</b>. Kontrollera detta mot fakturaunderlaget.</p>}
  {!!o.revisions.length&&<details className="biz-details"><summary><History size={15}/> Accepterade orderversioner ({o.revisions.length})</summary>{[...o.revisions].reverse().map(r=><article className="revision-card" key={r.id}><b>R{r.snapshot.version} · {r.snapshot.reference} · {money(r.snapshot.value)}</b><p>{r.reason}</p><p>{r.historical?'Tidigare registrerad accept; namngiven godkännare saknas.':'Godkänd av '+r.customerApprovedBy+' · '+r.customerApprovedOn}</p>{r.snapshot.lines.map((l,i)=><p key={l.id||i}>{l.quantity} {l.unit} · {l.description} · {variantLabel(l)}</p>)}</article>)}</details>}
  <Sheet open={!!mode} onOpenChange={v=>{if(!v&&!busy)setMode('')}}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>{mode==='shortfall'?'Godkänd antalavvikelse':mode==='accept'?'Godkänn orderändring':'Föreslå orderändring'}</SheetTitle><SheetDescription>{d.title} · {st.customers.find(c=>c.id===o.customerId)?.name}</SheetDescription></SheetHeader><form className="sheet-body business-ui" onSubmit={e=>{e.preventDefault();e.stopPropagation();void submit()}}>
   {changed&&<div className="record-conflict" role="alert"><b>Underlaget har ändrats</b><p>Stäng och öppna ändringen igen för att granska de senaste uppgifterna.</p></div>}
   <fieldset disabled={busy||changed}>
    {mode==='edit'&&<><p>Skapa en ny version med ändrade artiklar, antal eller priser. Den befintliga accepten sparas.</p><F label="Varför ändras ordern? *"><Textarea required value={reason} onChange={e=>setReason(e.target.value)}/></F><div className="biz-grid"><F label="Ny offertreferens *"><Input required value={proposal.quoteRef} onChange={e=>setProposal({...proposal,quoteRef:e.target.value})}/></F><F label="Önskad leverans *"><Input required type="date" value={proposal.deliveryDate} onChange={e=>setProposal({...proposal,deliveryDate:e.target.value})}/></F></div><QuoteEditor deal={proposal} customer={st.customers.find(c=>c.id===o.customerId)} onChange={(key,value)=>setProposal(p=>({...p,[key]:value}))}/><p><b>Nytt ordervärde: {money(calculateQuote(proposal.lines).value)}</b></p><p className="biz-hint">Kundens nya godkännande registreras i nästa steg.</p></>}
    {mode==='accept'&&pending&&<><div className="revision-card"><b>R{pending.snapshot.version} · {pending.snapshot.reference}</b><p>{pending.reason}</p>{pending.snapshot.lines.map((l,i)=><p key={l.id||i}>{l.quantity} {l.unit} · {l.description} · {variantLabel(l)}</p>)}<p><b>{money(pending.snapshot.value)}</b> · leverans {pending.snapshot.deliveryDate}</p></div><p>Korrektur och leverantör behöver bekräftas på nytt efter orderändringen.</p></>}
    {mode==='shortfall'&&<><p>Använd när kunden uttryckligen accepterat färre artiklar. Kassation registreras av tryck eller lager och behåller kundens beställda antal.</p>{rows.filter(r=>r.toReceive>0).map(r=><F key={r.line.id} label={r.line.description+' · '+variantLabel(r.line)+' · minska med högst '+r.toReceive}><Input type="number" min="0" max={r.toReceive} step="any" placeholder="0" value={values[r.line.id]||''} onChange={e=>setValues({...values,[r.line.id]:e.target.value})}/></F>)}<F label="Orsak och överenskommelse *"><Textarea required value={reason} onChange={e=>setReason(e.target.value)}/></F><F label="Hela orderns överenskomna värde exkl. moms efter ändringen *"><Input required type="number" min="0" max="1000000000" step="0.01" value={agreedValue} onChange={e=>setAgreedValue(e.target.value)}/></F><p className="biz-hint">Ta med tryck, startkostnad och frakt enligt överenskommelsen.</p></>}
    {['accept','shortfall'].includes(mode)&&<><div className="biz-grid"><F label="Godkänt av hos kunden *"><Input required value={approvedBy} onChange={e=>setApprovedBy(e.target.value)}/></F><F label="Godkännandedatum *"><Input required type="date" max={day()} value={approvedOn} onChange={e=>setApprovedOn(e.target.value)}/></F></div><label className="check-field"><Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)}/>Kunden har godkänt exakt dessa antal, priser och villkor</label><p className="biz-hint">Detta registrerar ett mottaget kundbesked. Ingen digital signering skickas.</p></>}
    {error&&<p className="error" role="alert">{error}</p>}<div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>setMode('')}>Avbryt</Button><Button type="submit" disabled={busy||changed||(['accept','shortfall'].includes(mode)&&!confirmed)||(mode==='shortfall'&&!entries.length)}>{busy?'Sparar…':mode==='edit'?'Spara ändringsförslag':'Registrera kundens godkännande'}</Button></div>
   </fieldset>
  </form></SheetContent></Sheet>
 </section>;
}
