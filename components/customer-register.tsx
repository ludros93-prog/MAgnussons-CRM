'use client';

import {ArrowRight,CalendarDays,Clock,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {RELATIONS,concerns,day,isOpen,label,type Customer,type State} from '@/lib/crm';
import {sellerProfileById} from '@/lib/seller-profiles';
import {taskOwnerLabel} from '@/lib/task-responsibility';
import {meetingOwnerLabel} from '@/lib/meeting-responsibility';

function displayDate(value:string){
 return value?new Date(value+'T12:00:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'}):'Inte planerad';
}

function customerResponsibility(st:State,c:Customer){
 const profile=st.settings.sellerProfilesInitialized&&c.ownerProfileId?sellerProfileById(st.settings,c.ownerProfileId):undefined;
 const matched=profile?.legacyOwnerName===c.owner?profile:undefined;
 const name=matched?(st.settings.sellerProfiles.some(p=>p.id!==matched.id&&p.displayName===matched.displayName)?matched.displayName+' · '+matched.legacyOwnerName:matched.displayName):c.owner||'Ej tilldelad';
 const note=st.settings.sellerProfilesInitialized&&!c.ownerProfileId?'Äldre ansvar behöver förankras':c.ownerProfileId&&!matched?'Ansvarskoppling behöver kontrolleras':matched&&!matched.active?'Inaktiv ansvarig':'';
 return {name,note};
}

function nextActivity(st:State,customerId:string){
 // Read existing open work only. Review dates are a separate customer plan.
 // Tasks have a due date, not a meeting time; on the same day they come first.
 const candidates=[
  ...st.tasks.filter(t=>t.customerId===customerId&&!t.done).map(t=>({id:t.id,kind:'task' as const,title:t.title,date:t.due,time:'',owner:taskOwnerLabel(st,t)})),
  ...st.meetings.filter(m=>m.customerId===customerId&&m.status==='planned').map(m=>({id:m.id,kind:'meeting' as const,title:m.title,date:m.date,time:m.time,owner:meetingOwnerLabel(st,m)})),
 ];
 return candidates.sort((a,b)=>(a.date+'T'+(a.time||'00:00')).localeCompare(b.date+'T'+(b.time||'00:00')))[0];
}

export function CustomerRegister({st,customers,onCustomer,onCreateCustomer,onDataTools}:{st:State;customers:Customer[];onCustomer:(id:string)=>void;onCreateCustomer:()=>void;onDataTools:()=>void}){
 const today=day(),canCreate=['admin','seller'].includes(st.viewer?.role||'');
 return <section className="panel customer-register" aria-label="Kundregister">
  <div className="panel-head cr-heading"><div><h2>Kundregister <span className="count">{customers.length}</span></h2><p>Öppna en kund för att arbeta vidare med relationen.</p></div><Button size="sm" variant="outline" onClick={onDataTools}>Importera / exportera</Button></div>
  {customers.length?<ul className="cr-list" aria-label="Kunder i urvalet">{customers.map(c=>{
   const responsible=customerResponsibility(st,c),activity=nextActivity(st,c.id),openDeals=st.deals.filter(d=>d.customerId===c.id&&isOpen(d)).length;
   return <li className="cr-row" key={c.id} data-customer-id={c.id}>
    <div className="cr-customer"><div className="cr-customer-heading"><span className="company-icon" aria-hidden="true">{c.name.trim().slice(0,2).toUpperCase()}</span><div className="cr-customer-copy"><h3>{c.name}</h3><p className="cr-contact">{c.contact||'Kontaktperson saknas'}</p></div></div><div className="cr-customer-actions"><Button type="button" size="sm" variant="ghost" className="cr-open-customer" aria-label={'Öppna kundkort: '+c.name} data-customer-id={c.id} onClick={()=>onCustomer(c.id)}>Öppna kundkort <ArrowRight size={16} aria-hidden="true"/></Button><span data-status={c.status} className={'pill '+(concerns(c,today,st).length?'amber':'')}>{label(RELATIONS,c.status)}</span></div></div>
    <div className="cr-owner"><span className="cr-label"><Users size={15} aria-hidden="true"/>Kundansvarig</span><p>{responsible.name}</p>{responsible.note&&<p className="cr-owner-note">{responsible.note}</p>}</div>
    <div className="cr-next" data-overdue={!!activity&&activity.date<today}>
     {activity?<><span className="cr-label">{activity.kind==='meeting'?<CalendarDays size={15} aria-hidden="true"/>:<Clock size={15} aria-hidden="true"/>}{activity.kind==='meeting'?'Nästa planerade CRM-möte':'Nästa öppna uppgift'}</span><p className="cr-activity-title">{activity.title}</p><p className="cr-activity-date"><time dateTime={activity.time?activity.date+'T'+activity.time:activity.date}>{displayDate(activity.date)}{activity.time?' kl. '+activity.time:''}</time><span>{activity.date<today?(activity.kind==='task'?'Försenad':'Datum passerat'):activity.date===today?'Idag':'Kommande'}</span></p><p className="cr-activity-owner">Ansvarig: {activity.owner}</p></>:<><span className="cr-label"><CalendarDays size={15} aria-hidden="true"/>Nästa aktivitet</span><p className="cr-no-activity">Ingen öppen uppgift eller planerat CRM-möte</p></>}
    </div>
    <dl className="cr-plan"><div><dt>Nästa avstämning</dt><dd className="cr-review-date" data-overdue={!!c.nextReview&&c.nextReview<today}>{c.nextReview?<time dateTime={c.nextReview}>{displayDate(c.nextReview)}</time>:'Inte planerad'}{c.nextReview&&c.nextReview<=today&&<span>{c.nextReview<today?'Datum passerat':'Idag'}</span>}</dd></div><div><dt>Öppna affärer</dt><dd>{openDeals}</dd></div></dl>
   </li>;
  })}</ul>:<div className="cr-empty"><Users size={28} aria-hidden="true"/><h3>{st.customers.length?'Inga kunder matchar urvalet':'Kundregistret är tomt'}</h3><p>{st.customers.length?'Ändra sökningen eller välj Alla ansvariga för att se fler kunder.':canCreate?'Lägg till en kund när du har företagets uppgifter.':'Registrerade kunder visas här när de har lagts till.'}</p>{canCreate&&<Button onClick={onCreateCustomer}>{st.customers.length?'Lägg till kund':'Lägg till första kunden'}</Button>}</div>}
 </section>;
}
