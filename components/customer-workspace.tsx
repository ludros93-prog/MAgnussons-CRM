'use client';
import {useId,useState,type MouseEvent} from 'react';
import {AlertCircle,ArrowRight,CalendarClock,FileText,Mail,MessageSquare,Package,Paperclip,Search,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {day,concerns,DELIVERY,label,type State,type Customer,type Task,type Order} from '@/lib/crm';
import {CustomerProfileSummary} from './customer-profile';
import {OutlookActivity,type OutlookContext} from './outlook';
import {displayDate,money} from './business-ui';

const taskAction=(t:Task)=>['handover','proof_deadline','order_deadline'].includes(t.kind)?'Hantera underlag':t.kind==='invoice_ready'?'Fakturera':t.kind==='receipt'?'Bekräfta mottaget':'Följ upp';
const taskTiming=(due:string,today:string)=>due<today?'Försenad':due===today?'Idag':'Kommande';
const eventType=(kind:string)=>['note','customer_note'].includes(kind)?'Anteckning':kind==='contact'?'Kundkontakt':['file','file_uploaded'].includes(kind)?'Kundunderlag':'Affärshändelse';

export function CustomerWorkspace({st,c,outlook,onTask,onOrder,onPlan,onNewTask}:{st:State;c:Customer;outlook:OutlookContext;onTask:(t:Task)=>void;onOrder:(o:Order)=>void;onPlan:()=>void;onNewTask:()=>void}){
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(20);
 const id=useId(),today=day(),reader=st.viewer?.role==='reader',canPlan=['admin','seller'].includes(st.viewer?.role||'');
 const sectionId=(section:string)=>id+'-'+section;
 const tasks=st.tasks.filter(t=>t.customerId===c.id&&!t.done).sort((a,b)=>a.due.localeCompare(b.due));
 const orders=st.orders.filter(o=>o.customerId===c.id&&!['followed'].includes(o.stage));
 const crmItems=st.events.filter(e=>e.customerId===c.id).map(e=>({id:e.id,at:e.at,kind:['note','contact','customer_note'].includes(e.kind)?'contact':['file','file_uploaded'].includes(e.kind)?'files':'work',search:(e.note?.title||'')+' '+e.text,event:e,outlook:undefined}));
 const mailItems=(outlook.state?.items||[]).filter(i=>i.customerId===c.id).map(i=>({id:i.id,at:i.at,kind:'contact',search:i.subject+' '+i.body,event:undefined,outlook:i}));
 const allItems=[...crmItems,...mailItems];
 const items=allItems.filter(i=>(filter==='all'||i.kind===filter)&&i.search.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv'))).sort((a,b)=>b.at.localeCompare(a.at));
 const signals=concerns(c,today,st),first=tasks[0];
 function jump(e:MouseEvent<HTMLAnchorElement>,section:string){
  const target=document.getElementById(sectionId(section));if(!target)return;
  e.preventDefault();target.focus({preventScroll:true});
  target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function taskRow(t:Task){return <div className="co-task-row" key={t.id}>
  <div className="co-task-copy"><span className="co-task-status" data-timing={taskTiming(t.due,today)}>{taskTiming(t.due,today)}</span><h4>{t.title}</h4><p>{displayDate(t.due)} <span aria-hidden="true">·</span> {t.owner}</p></div>
  <Button type="button" variant="outline" onClick={()=>onTask(t)}>{reader?'Visa aktivitet':taskAction(t)}</Button>
 </div>}
 const navigation=<nav className="co-section-nav" aria-label="Gå till del av kundöversikten">
  {[{section:'next',title:'Nästa steg',count:tasks.length},{section:'orders',title:'Order',count:orders.length},{section:'history',title:'Historik',count:allItems.length}].map(link=><a key={link.section} href={'#'+sectionId(link.section)} onClick={e=>jump(e,link.section)}><span>{link.title}</span><b>{link.count}</b><span className="sr-only"> {link.section==='next'?'öppna aktiviteter':link.section==='orders'?'aktuella order':'tillgängliga händelser'}</span></a>)}
 </nav>;
 return <div className="customer-workspace customer-overview" data-readonly={reader}>
  <section className="co-section co-next" id={sectionId('next')} tabIndex={-1} aria-labelledby={sectionId('next-title')}>
   <div className="co-section-heading"><h3 id={sectionId('next-title')}><CalendarClock size={20} aria-hidden="true"/>Nästa steg</h3>{canPlan&&<Button type="button" variant="outline" onClick={onNewTask}>Planera kontakt</Button>}</div>
   {first?<><div className="co-next-action" data-timing={taskTiming(first.due,today)}><div className="co-next-top"><span>Nästa handling</span><span className="co-task-status" data-timing={taskTiming(first.due,today)}>{taskTiming(first.due,today)}</span></div><h4>{first.title}</h4><Button type="button" className="co-primary-action" onClick={()=>onTask(first)}>{reader?'Visa aktivitet':taskAction(first)}<ArrowRight size={18} aria-hidden="true"/></Button><dl className="co-action-facts"><div><dt>Datum</dt><dd>{displayDate(first.due)}</dd></div><div><dt>Ansvarig</dt><dd>{first.owner}</dd></div></dl></div>
    {navigation}
    {tasks.length>1&&<div className="co-other-tasks"><p className="co-list-label">Fler öppna aktiviteter</p>{tasks.slice(1,4).map(taskRow)}{tasks.length>4&&<details className="co-more-tasks"><summary>Visa ytterligare {tasks.length-4} aktiviteter</summary>{tasks.slice(4).map(taskRow)}</details>}</div>}
   </>:<><div className="co-empty"><CalendarClock size={24} aria-hidden="true"/><div><h4>Ingen aktivitet planerad</h4><p>{canPlan?'Planera nästa kundkontakt när du vet vad som ska göras och av vem.':'Inga öppna aktiviteter är registrerade för kunden. Kontaktplanen visas nedan.'}</p></div></div>{navigation}</>}
  </section>

  <section className="co-section co-contact-plan" aria-labelledby={sectionId('plan-title')}>
   <div className="co-section-heading"><h3 id={sectionId('plan-title')}><UserRound size={20} aria-hidden="true"/>Kontaktplan</h3><Button type="button" variant="ghost" onClick={onPlan}>{reader?(c.status==='prospect'?'Visa bearbetning':'Visa kundvård'):'Öppna kundplan'}</Button></div>
   <dl className="co-contact-dates"><div><dt>Senaste kundkontakt</dt><dd>{c.lastContact?displayDate(c.lastContact):'Ingen kontakt registrerad'}</dd></div><div><dt>Nästa avstämning</dt><dd>{c.nextReview?displayDate(c.nextReview):'Inte planerad'}</dd></div></dl>
   {signals.length>0&&<div className="co-signals" aria-label="Kunden behöver uppmärksamhet">{signals.map(signal=><p key={signal}><AlertCircle size={18} aria-hidden="true"/><span>{signal}</span></p>)}</div>}
  </section>

  <section className="co-section co-orders" id={sectionId('orders')} tabIndex={-1} aria-labelledby={sectionId('orders-title')}>
   <div className="co-section-heading"><h3 id={sectionId('orders-title')}><Package size={20} aria-hidden="true"/>Order & leverans <span className="co-count">{orders.length}</span></h3></div>
   {orders.length?orders.map(o=>{const d=st.deals.find(d=>d.id===o.dealId);return <button type="button" className="co-order-row" key={o.id} onClick={()=>onOrder(o)}><span className="co-order-copy"><b>{d?.title||'Order'}</b><span className="co-order-status">{label(DELIVERY,o.stage)}</span><small>Hos kund {displayDate(o.deliveryDate)}</small>{o.pendingAmendment&&<span className="co-order-warning">Ändringsförslag väntar på godkännande</span>}</span><span className="co-order-end"><b>{money(o.commercialValue??d?.value??null)}</b><span>{reader?'Visa order':'Öppna order'} <ArrowRight size={16} aria-hidden="true"/></span></span></button>}):<div className="co-empty"><Package size={24} aria-hidden="true"/><div><h4>Ingen pågående order</h4><p>Aktuella order visas här. Avslutade händelser finns kvar i historiken.</p></div></div>}
  </section>

  <details className="biz-details co-customer-details"><summary>Kunduppgifter, behov & adresser</summary><p>{c.need||'Behovet är ännu inte dokumenterat.'}</p><CustomerProfileSummary customer={c}/></details>

  <section className="co-section co-history customer-timeline" id={sectionId('history')} tabIndex={-1} aria-labelledby={sectionId('history-title')}>
   <div className="co-section-heading"><h3 id={sectionId('history-title')}><MessageSquare size={20} aria-hidden="true"/>Historik <span className="co-count">{allItems.length}</span></h3></div><p className="co-section-description">Anteckningar, kundkontakt och händelser som du har tillgång till.</p>
   <div className="co-history-search"><Search size={18} aria-hidden="true"/><Input aria-label="Sök i kundhistoriken" placeholder="Sök i kundens historik…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20)}}/></div>
   <Tabs value={filter} onValueChange={v=>{setFilter(v);setLimit(20)}}><TabsList aria-label="Filtrera kundhistoriken"><TabsTrigger value="all">Allt</TabsTrigger><TabsTrigger value="contact">Kontakt & anteckningar</TabsTrigger><TabsTrigger value="work">Affär & order</TabsTrigger><TabsTrigger value="files">Filer</TabsTrigger></TabsList></Tabs>
   {!outlook.state?.connection&&!mailItems.length&&<p className="co-history-hint">Outlook-korrespondens visas när kopplingen är aktiverad och händelserna har kopplats till kunden.</p>}
   {outlook.error&&<p className="error" role="status">Outlook: {outlook.error}</p>}
   {items.length>0&&<><p className="co-result-count">Visar {Math.min(limit,items.length)} av {items.length} händelser{items.length!==allItems.length?' i urvalet':''}</p><ol className="co-timeline" aria-label="Kundens tillgängliga historik">{items.slice(0,limit).map(item=>{
    const type=item.outlook?(item.outlook.kind==='mail'?'Mejl':'Outlook-möte'):eventType(item.event!.kind),note=type==='Anteckning';
    return <li key={item.id} className="co-timeline-entry" data-category={note?'note':item.kind}><span className="co-timeline-marker" aria-hidden="true">{item.outlook?.kind==='mail'?<Mail size={16}/>:note?<FileText size={16}/>:item.kind==='files'?<Paperclip size={16}/>:<MessageSquare size={16}/>}</span>{item.outlook?<div className="co-outlook-entry"><OutlookActivity item={item.outlook} st={st} context={outlook}/></div>:<article className="co-event"><div className="co-event-meta"><span className="co-event-type">{type}</span><time dateTime={item.at}>{new Date(item.at).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',dateStyle:'short',timeStyle:'short'})}</time>{item.event?.actor&&<span className="co-event-actor">{item.event.actor.name}</span>}</div>{item.event?.note?.title&&<h4>{item.event.note.title}</h4>}{(item.event?.text.length||0)>500?<details><summary>{item.event?.text.slice(0,140)}…</summary><p>{item.event?.text}</p></details>:<p>{item.event?.text}</p>}</article>}</li>
   })}</ol></>}
   {!items.length&&<div className="co-empty"><MessageSquare size={24} aria-hidden="true"/><div><h4>{query||filter!=='all'?'Ingen historik i det här urvalet':'Ingen historik ännu'}</h4><p>{query||filter!=='all'?'Prova en annan sökning eller välj Allt.':'Sparade anteckningar, kundkontakter och affärshändelser visas här när de finns.'}</p></div></div>}{items.length>limit&&<Button type="button" variant="outline" className="co-show-more" onClick={()=>setLimit(limit+20)}>Visa fler händelser</Button>}
  </section>
 </div>;
}
