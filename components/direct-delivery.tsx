'use client';

import {useState} from 'react';
import {AlertTriangle,History,Truck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {day,type State,type Order} from '@/lib/crm';
import {AddressSchema,variantLabel} from '@/lib/business';
import {directRows,directBasis,deliveryVerified,legacyUnverified} from '@/lib/direct-delivery';
import {hasPhysicalWork} from '@/lib/production-quantities';
import {BusinessField as F,Pick,displayDate,type SaveAction} from './business-ui';

type DeliveryMethod='carrier'|'collection'|'supplier';
type Draft={orderId:string;basis:string;values:Record<string,string>;dispatchedOn:string;method:DeliveryMethod;recipient:string;address:ReturnType<typeof AddressSchema.parse>;evidence:string;tracking:string;noProofNeeded:boolean;supplierConfirmed:boolean};
const methods=[{id:'carrier',label:'Skickad med transportör'},{id:'collection',label:'Hämtad av kunden'},{id:'supplier',label:'Skickad direkt från leverantör'}];
const methodLabel=(method:string)=>methods.find(m=>m.id===method)?.label||method;

export function DirectDelivery({st,o,save,busy}:{st:State;o:Order;save:SaveAction;busy:boolean}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState('');
 const d=st.deals.find(deal=>deal.id===o.dealId),c=st.customers.find(customer=>customer.id===o.customerId);
 const rows=d?directRows(d,o.directShipments):[],remaining=rows.filter(row=>row.remaining>0);
 const direct=['draft','cancelled'].includes(o.production.status)&&!hasPhysicalWork(o.production)&&!o.productionHistory.some(hasPhysicalWork);
 const historical=['shipping','delivered','followed'].includes(o.stage);
 const canRegister=!!d&&direct&&!o.pendingAmendment&&!o.production.issue&&(o.invoiceValue===null||historical)&&remaining.length>0;
 const verified=deliveryVerified(st,o),legacy=legacyUnverified(o);
 const changed=!!draft&&draft.basis!==directBasis(st,o.id);
 const proofReady=!o.proofRequired||o.proofApproved||draft?.noProofNeeded===true;
 const entries=remaining.filter(row=>Number(draft?.values[row.line.id])>0).map(row=>({lineId:row.line.id,quantity:Number(draft?.values[row.line.id])}));
 if(!['admin','seller'].includes(st.viewer?.role||''))return null;
 if(!direct&&!o.directShipments.length)return null;

 function update(patch:Partial<Draft>){setDraft(previous=>previous?{...previous,...patch}:previous);}
 function start(){
  setDraft(previous=>previous?.orderId===o.id?previous:{orderId:o.id,basis:directBasis(st,o.id),values:{},dispatchedOn:day(),method:'carrier',recipient:c?.contact||'',address:AddressSchema.parse(o.shippingAddress||c?.deliveryAddress||{}),evidence:'',tracking:'',noProofNeeded:false,supplierConfirmed:false});
  setError('');setOpen(true);
 }
 async function submit(){
  if(!draft||changed||!canRegister||!entries.length||!proofReady||!draft.supplierConfirmed)return;
  setError('');
  const saved=await save('direct_dispatch',{orderId:o.id,expectedContext:draft.basis,entries,dispatchedOn:draft.dispatchedOn,method:draft.method,recipient:draft.recipient,address:draft.address,evidence:draft.evidence,tracking:draft.tracking,noProofNeeded:draft.noProofNeeded,supplierConfirmed:draft.supplierConfirmed},false);
  if(saved){setOpen(false);setDraft(null);}else setError('Leveransen sparades inte. Dina uppgifter finns kvar. Kontrollera underlaget och försök igen.');
 }

 return <section className="order-changes">
  {legacy&&<div className="biz-callout"><b><AlertTriangle size={16}/> Äldre leverans saknar verifierat underlag</b><p>Ordern är registrerad som skickad eller mottagen. Komplettera artikelantal och underlag för den faktiska leveransen.</p></div>}
  {!!o.directShipments.length&&<p className="biz-hint">{verified?'Alla artikelantal har leveransunderlag.':`Delvis registrerad direktleverans. ${remaining.length} artikelrader har antal kvar.`} Kundens mottagande följs upp separat.</p>}
  {canRegister&&<div className="biz-buttons"><Button type="button" variant="outline" disabled={busy} onClick={start}><Truck size={16}/>Registrera direktleverans</Button></div>}
  {direct&&!rows.length&&legacy&&<p className="biz-hint">Äldre ordern saknar artikelrader. Underlaget behöver kompletteras genom granskad rättning innan en ny faktura registreras.</p>}
  {direct&&o.production.issue&&<p className="biz-hint">Lös produktionshindret innan leveransen registreras.</p>}
  {direct&&o.pendingAmendment&&<p className="biz-hint">Slutför eller återta orderändringen innan leveransen registreras.</p>}
  {!!o.directShipments.length&&<details className="biz-details"><summary><History size={15}/> Direktleveranser ({o.directShipments.length})</summary>{[...o.directShipments].reverse().map(shipment=><article className="revision-card" key={shipment.id}>
   <b>{methodLabel(shipment.method)} · {displayDate(shipment.dispatchedOn)}</b><p>Mottagare: {shipment.recipient}</p>
   {shipment.entries.map((entry,index)=>{const row=rows.find(row=>row.line.id===entry.lineId);return <p key={entry.lineId+'-'+index}>{entry.quantity} {row?.line.unit||'st'} · {row?row.line.description:'Artikelrad '+entry.lineId}{row&&variantLabel(row.line)?' · '+variantLabel(row.line):''}</p>})}
   {[shipment.address.street,shipment.address.postalCode,shipment.address.city,shipment.address.reference].some(Boolean)&&<p>{[shipment.address.street,shipment.address.postalCode,shipment.address.city,shipment.address.country,shipment.address.reference].filter(Boolean).join(', ')}</p>}
   <p className="production-instructions">Underlag: {shipment.evidence}</p>{shipment.tracking&&<p>Frakt-/spårningsreferens: {shipment.tracking}</p>}
   <p className="biz-hint">Registrerat {displayDate(shipment.recordedAt)} av {shipment.recordedBy||shipment.recordedById}</p>
  </article>)}</details>}
  <Sheet open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>Registrera direktleverans</SheetTitle><SheetDescription>{d?.title} · {c?.name}</SheetDescription></SheetHeader>{draft&&<form className="sheet-body business-ui" onSubmit={event=>{event.preventDefault();event.stopPropagation();void submit()}}>
   <p>Registrera faktiskt skickade eller hämtade artiklar utan internt tryck. Delleverans lämnar resten av ordern öppet.</p>
   {historical&&<p className="biz-hint">Du kompletterar leveransunderlaget på en äldre order. Kontrollera datum och antal mot det verkliga leveransbeskedet.</p>}
   {changed&&<div className="record-conflict" role="alert"><b>Orderunderlaget har ändrats</b><p>Dina uppgifter finns kvar. Granska de aktuella artikelraderna och återstående antalen innan du sparar.</p><Button type="button" variant="outline" disabled={busy} onClick={()=>{update({basis:directBasis(st,o.id)});setError('')}}>Använd senaste underlaget</Button></div>}
   {!canRegister&&<p className="error" role="alert">Leveransen kan inte registreras nu. Kontrollera orderändringar, produktion och tidigare leveranser.</p>}
   <fieldset disabled={busy||changed||!canRegister}>
    {remaining.map(row=><F key={row.line.id} label={row.line.description+(variantLabel(row.line)?' · '+variantLabel(row.line):'')+' · '+row.remaining+' '+row.line.unit+' kvar'}><Input aria-label={'Skickat eller hämtat antal för '+row.line.description+' '+variantLabel(row.line)} type="number" min="0" max={row.remaining} step="any" placeholder="0" value={draft.values[row.line.id]||''} onChange={event=>update({values:{...draft.values,[row.line.id]:event.target.value}})}/></F>)}
    <div className="biz-grid"><F label="Skickad/hämtad datum *"><Input required type="date" max={day()} value={draft.dispatchedOn} onChange={event=>update({dispatchedOn:event.target.value})}/></F><F label="Leveranssätt *"><Pick label="Leveranssätt" value={draft.method} items={methods} onChange={value=>update({method:value as DeliveryMethod})}/></F></div>
    <F label="Mottagare hos kunden *"><Input required maxLength={200} value={draft.recipient} onChange={event=>update({recipient:event.target.value})}/></F>
    <F label={draft.method==='collection'?'Leveransadress (valfri vid hämtning)':'Leveransadress *'}><Input required={draft.method!=='collection'} maxLength={4000} autoComplete="street-address" value={draft.address.street} onChange={event=>update({address:{...draft.address,street:event.target.value}})}/></F>
    <div className="biz-grid"><F label={'Postnummer'+(draft.method==='collection'?'':' *')}><Input required={draft.method!=='collection'} maxLength={4000} autoComplete="postal-code" value={draft.address.postalCode} onChange={event=>update({address:{...draft.address,postalCode:event.target.value}})}/></F><F label={'Ort'+(draft.method==='collection'?'':' *')}><Input required={draft.method!=='collection'} maxLength={4000} autoComplete="address-level2" value={draft.address.city} onChange={event=>update({address:{...draft.address,city:event.target.value}})}/></F></div>
    <div className="biz-grid"><F label="Land"><Input maxLength={4000} autoComplete="country-name" value={draft.address.country} onChange={event=>update({address:{...draft.address,country:event.target.value}})}/></F><F label="Adressreferens"><Input maxLength={4000} value={draft.address.reference} onChange={event=>update({address:{...draft.address,reference:event.target.value}})}/></F></div>
    <F label="Frakt-/spårningsreferens"><Input maxLength={500} value={draft.tracking} onChange={event=>update({tracking:event.target.value})}/></F>
    <F label="Underlag som bekräftar leveransen *"><Textarea required maxLength={4000} placeholder="Exempel: leverantörens leveransbesked, fraktsedel eller vem som bekräftade hämtningen." value={draft.evidence} onChange={event=>update({evidence:event.target.value})}/></F>
    {o.proofRequired&&o.proofApproved?<p className="biz-hint">Korrektur {o.proofVersion||'utan registrerad versionsreferens'} godkänt av {o.approvedBy||'tidigare registrerad godkännare'} · {displayDate(o.approvedDate)}.</p>:!o.proofRequired?<p className="biz-hint">Ordern kräver inget kundkorrektur.</p>:<label className="check-field"><Checkbox checked={draft.noProofNeeded} onCheckedChange={value=>update({noProofNeeded:value===true})}/>Kundkorrektur behövs inte för denna leverans</label>}
    <label className="check-field"><Checkbox checked={draft.supplierConfirmed} onCheckedChange={value=>update({supplierConfirmed:value===true})}/>Leverantören har bekräftat leveransen</label>
    <p className="biz-hint">Registreringen bekräftar avsändning eller hämtning. Kundens mottagande och fakturan registreras separat.</p>
    {error&&<p className="error" role="alert">{error}</p>}<div className="biz-buttons"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Stäng</Button><Button type="submit" disabled={busy||changed||!canRegister||!entries.length||!proofReady||!draft.supplierConfirmed}>{busy?'Sparar…':'Registrera leveransen'}</Button></div>
   </fieldset>
  </form>}</SheetContent></Sheet>
 </section>;
}
