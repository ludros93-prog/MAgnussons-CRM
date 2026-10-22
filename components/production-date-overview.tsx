'use client';

import {useState} from 'react';
import type {Order,State} from '@/lib/crm';
import {day} from '@/lib/crm';
import {Button} from './ui/button';
import {Input} from './ui/input';

const milestones = [
 ['printDeadline','Tryck klart'],
 ['dispatchDeadline','Skickas senast'],
 ['deliveryDate','Hos kunden'],
] as const;

export function ProductionDateOverview({orders,st,onSelect}:{orders:Order[];st:State;onSelect:(id:string)=>void}) {
 const [mode,setMode]=useState<'month'|'day'>('month');
 const [date,setDate]=useState(day());
 const [milestone,setMilestone]=useState('all');
 const period=mode==='month'?date.slice(0,7):date;
 const selectedMilestones=milestones.filter(([key])=>milestone==='all'||milestone===key);
 const entries=orders.flatMap(order=>selectedMilestones.flatMap(([key,label])=>{
  const value=order.production[key];
  return value&&period&&value.startsWith(period)?[{order,date:value,label,key}]:[];
 })).sort((a,b)=>a.date.localeCompare(b.date)||a.order.id.localeCompare(b.order.id)||a.key.localeCompare(b.key));
 const dates=[...new Set(entries.map(entry=>entry.date))];
 const undated=orders.filter(order=>selectedMilestones.some(([key])=>!order.production[key]));
 return <section aria-label="Datumöversikt för tryck och lager" className="mt-4 space-y-4">
  <h2 className="text-lg font-semibold">Planera tryck & leverans</h2>
  <p className="biz-hint">Öppna arbetsorder i den gemensamma kön, med aktuell sökning. Datumen är deadlines och planerad leverans, inte bokade arbetspass eller bekräftat kundmottagande. Samma jobb kan visas på flera datum.</p>
  <div className="flex flex-wrap items-end gap-3">
   <label className="grid gap-1">Visa<select className="min-h-11 rounded-md border bg-background px-3" value={mode} onChange={e=>setMode(e.target.value as 'month'|'day')}><option value="month">Månad</option><option value="day">Dag</option></select></label>
   <label className="grid min-w-0 gap-1">{mode==='month'?'Månad':'Datum'}<Input type={mode==='month'?'month':'date'} value={period} onChange={e=>setDate(mode==='month'?(e.target.value?e.target.value+'-01':''):e.target.value)}/></label>
   <label className="grid gap-1">Datumtyp<select className="min-h-11 rounded-md border bg-background px-3" value={milestone} onChange={e=>setMilestone(e.target.value)}><option value="all">Alla datumtyper</option>{milestones.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <Button variant="outline" onClick={()=>setDate(day())}>Idag</Button>
  </div>
  <p aria-live="polite">{new Set(entries.map(entry=>entry.order.id)).size} jobb · {entries.length} datumhändelser i perioden</p>
  {!period?<p>Välj en period för att visa jobb.</p>:!dates.length?<p>Inga datumhändelser i vald period och sökning. Jobb med andra datum finns kvar i Gemensam kö.</p>:dates.map(value=><section key={value} aria-label={value} className="rounded-lg border p-4">
   <h3 className="mb-3 font-semibold">{value}</h3>
   <ul className="space-y-3">{entries.filter(entry=>entry.date===value).map(({order,label,key})=><li key={order.id+key} className="flex min-w-0 flex-wrap items-center justify-between gap-3">
    <div className="min-w-0 [overflow-wrap:anywhere]"><b>{label}</b><p>{st.customers.find(customer=>customer.id===order.customerId)?.name||'Kundkoppling saknas'} · {st.deals.find(deal=>deal.id===order.dealId)?.title||'Arbetsorder'}</p><small>{order.production.assigneeName||'Ingen har tagit jobbet'}{order.production.issue?' · Hinder: '+order.production.issue:''}</small></div>
    <Button variant="outline" data-production-work-open={order.id} onClick={()=>onSelect(order.id)}>Öppna jobb</Button>
   </li>)}</ul>
  </section>)}
  {!!undated.length&&<details className="rounded-lg border p-4"><summary>{undated.length} jobb saknar minst ett valt datum</summary><p className="biz-hint">Dessa jobb kan inte placeras fullständigt i perioden. Listan gäller hela sökurvalet.</p><ul>{undated.map(order=><li key={order.id} className="my-2 flex flex-wrap items-center gap-3"><span>{st.deals.find(deal=>deal.id===order.dealId)?.title||'Arbetsorder'} · Saknas: {selectedMilestones.filter(([key])=>!order.production[key]).map(([,label])=>label).join(', ')}</span><Button variant="outline" data-production-work-open={order.id} onClick={()=>onSelect(order.id)}>Öppna jobb</Button></li>)}</ul></details>}
 </section>;
}
