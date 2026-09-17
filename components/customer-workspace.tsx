'use client';
import {useState} from 'react';
import {CalendarClock,MessageSquare,Package,Phone,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {day,concerns,DELIVERY,label,type State,type Customer,type Task,type Order} from '@/lib/crm';
import {CustomerProfileSummary} from './customer-profile';
import {OutlookActivity,type OutlookContext} from './outlook';
import {displayDate,money} from './business-ui';

export function CustomerWorkspace({st,c,outlook,onTask,onOrder,onPlan,onNewTask}:{st:State;c:Customer;outlook:OutlookContext;onTask:(t:Task)=>void;onOrder:(o:Order)=>void;onPlan:()=>void;onNewTask:()=>void}){
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(20);
 const tasks=st.tasks.filter(t=>t.customerId===c.id&&!t.done).sort((a,b)=>a.due.localeCompare(b.due));
 const orders=st.orders.filter(o=>o.customerId===c.id&&!['followed'].includes(o.stage));
 const crmItems=st.events.filter(e=>e.customerId===c.id).map(e=>({id:e.id,at:e.at,kind:['note','contact','customer_note'].includes(e.kind)?'contact':['file','file_uploaded'].includes(e.kind)?'files':'work',search:(e.note?.title||'')+' '+e.text,event:e,outlook:undefined}));
 const mailItems=(outlook.state?.items||[]).filter(i=>i.customerId===c.id).map(i=>({id:i.id,at:i.at,kind:'contact',search:i.subject+' '+i.body,event:undefined,outlook:i}));
 const items=[...crmItems,...mailItems].filter(i=>(filter==='all'||i.kind===filter)&&i.search.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv'))).sort((a,b)=>b.at.localeCompare(a.at));
 return <div className="customer-workspace">
  <section className="customer-next"><div className="customer-section-title"><h3><CalendarClock size={18}/>Nästa steg</h3><Button size="sm" variant="outline" onClick={onNewTask}>Planera kontakt</Button></div>{tasks.slice(0,4).map(t=><div className="customer-next-row" key={t.id}><div><b>{t.title}</b><small className={t.due<day()?'late':''}>{displayDate(t.due)} · {t.owner}</small></div><Button size="sm" onClick={()=>onTask(t)}>{['handover','proof_deadline','order_deadline'].includes(t.kind)?'Hantera underlag':t.kind==='invoice_ready'?'Fakturera':t.kind==='receipt'?'Bekräfta mottaget':'Följ upp'}</Button></div>)}{!tasks.length&&<p>Ingen aktivitet är planerad för kunden.</p>}{tasks.length>4&&<details><summary>Visa ytterligare {tasks.length-4} aktiviteter</summary>{tasks.slice(4).map(t=><button className="customer-next-row" key={t.id} onClick={()=>onTask(t)}>{t.title} · {displayDate(t.due)}</button>)}</details>}</section>
  {concerns(c,day(),st).map(r=><p className="customer-signal" key={r}>{r}</p>)}
  <div className="customer-contact-plan"><div><small>Senaste kundkontakt</small><b>{displayDate(c.lastContact)}</b></div><div><small>Nästa avstämning</small><b>{displayDate(c.nextReview)}</b></div><Button size="sm" variant="ghost" onClick={onPlan}>Öppna kundplan</Button></div>
  {!!orders.length&&<section><h3 className="customer-section-title"><Package size={18}/>Order hos kunden</h3>{orders.map(o=>{const d=st.deals.find(d=>d.id===o.dealId);return <button className="customer-order-row" key={o.id} onClick={()=>onOrder(o)}><span><b>{d?.title}</b><small>{label(DELIVERY,o.stage)} · hos kund {displayDate(o.deliveryDate)}</small>{o.pendingAmendment&&<small className="late">Ändringsförslag väntar på godkännande</small>}</span><b>{money(o.commercialValue??d?.value??null)}</b></button>})}</section>}
  <details className="biz-details"><summary>Kunduppgifter, behov & adresser</summary><p>{c.need||'Behovet är ännu inte dokumenterat.'}</p><CustomerProfileSummary customer={c}/></details>
  <section className="customer-timeline"><h3 className="customer-section-title"><MessageSquare size={18}/>Kundens tidslinje</h3><div className="timeline-search"><Search size={16}/><Input aria-label="Sök i kundhistoriken" placeholder="Sök kontakt, överenskommelse eller order…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20)}}/></div><Tabs value={filter} onValueChange={v=>{setFilter(v);setLimit(20)}}><TabsList><TabsTrigger value="all">Allt</TabsTrigger><TabsTrigger value="contact">Kundkontakt</TabsTrigger><TabsTrigger value="work">Affär & order</TabsTrigger><TabsTrigger value="files">Filer</TabsTrigger></TabsList></Tabs>
   {!outlook.state?.connection&&!mailItems.length&&<p className="biz-hint">Outlook-korrespondens visas här när kopplingen är aktiverad och händelserna är kopplade till kunden.</p>}
   {outlook.error&&<p className="error" role="status">Outlook: {outlook.error}</p>}
   {items.slice(0,limit).map(item=>item.outlook?<OutlookActivity key={item.id} item={item.outlook} st={st} context={outlook}/>:<article className="customer-timeline-item" key={item.id} data-kind={item.kind}><div className="timeline-item-meta"><span>{item.kind==='contact'?'Kundkontakt':item.kind==='files'?'Kundunderlag':'Affärshändelse'}</span><time>{new Date(item.at).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',dateStyle:'short',timeStyle:'short'})}</time>{item.event?.actor&&<span>{item.event.actor.name}</span>}</div>{item.event?.note?.title&&<h4>{item.event.note.title}</h4>}{(item.event?.text.length||0)>500?<details><summary>{item.event?.text.slice(0,140)}…</summary><p>{item.event?.text}</p></details>:<p>{item.event?.text}</p>}</article>)}
   {!items.length&&<p className="biz-empty">{query?'Ingen händelse matchar sökningen.':'Kundens kontakter och affärshändelser samlas här.'}</p>}{items.length>limit&&<Button variant="ghost" onClick={()=>setLimit(limit+20)}>Visa fler händelser</Button>}
  </section>
 </div>;
}
