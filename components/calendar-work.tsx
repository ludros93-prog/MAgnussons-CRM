'use client';
import {useId,type ReactNode} from 'react';
import {AlertTriangle,CalendarDays,Check,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {day,label,type State,type Task,type Meeting} from '@/lib/crm';
import {personalOwner,personalResultScope} from '@/lib/sales-dashboard';
import {sellerProfileForOwner} from '@/lib/seller-profiles';
import {taskOwnerLabel} from '@/lib/task-responsibility';
import {meetingOwnerLabel} from '@/lib/meeting-responsibility';

export function calendarActivityScope(st:State,owner:string){
 const ownOwner=personalOwner(st),team=owner==='all',personal=!team&&owner===(ownOwner||'_unassigned');
 const legacyOwner=team?'':personal?ownOwner:st.settings.owners.includes(owner)?owner:'';
 const profileId=team||!st.settings.sellerProfilesInitialized?'':personal?personalResultScope(st):legacyOwner?sellerProfileForOwner(st.settings,legacyOwner)?.id||'':'';
 const profile=profileId?st.settings.sellerProfiles.find(p=>p.id===profileId):undefined;
 const diagnostic: ''|'missing'|'mismatch'|'operational-missing'=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!ownOwner?'operational-missing':profile&&profile.legacyOwnerName!==ownOwner?'mismatch':''):'';
 const caption=team?'Teamets aktiviteter':personal?'Mina aktiviteter'+(diagnostic?' · synligt urval':''):legacyOwner?'Aktiviteter · '+legacyOwner:'Välj aktivitetsansvar';
 return {team,personal,profileId,legacyOwner,diagnostic,caption};
}

const dateLabel=(d:string)=>d?new Date(d+'T12:00:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short'}):'Ej planerat';
function Empty({children}:{children:ReactNode}){return <div className="empty"><div className="empty-icon"><Check size={22}/></div>{children}</div>}

export function CalendarWork({st,owner,search,busy,onMeeting,onTask,onCreateTask,onTransferMeeting,onView}:{st:State;owner:string;search:string;busy:boolean;onMeeting:(meeting:Meeting)=>void;onTask:(task:Task)=>void;onCreateTask:()=>void;onTransferMeeting:(meeting:Meeting)=>void;onView:(view:string)=>void}){
 const diagnosticId=useId(),scope=calendarActivityScope(st,owner),today=day(),admin=st.viewer?.role==='admin';
 const linkedProfile=scope.profileId?st.settings.sellerProfiles.find(p=>p.id===scope.profileId):undefined;
 const match=(activity:{owner:string;ownerProfileId:string})=>scope.team||(activity.ownerProfileId?!!scope.profileId&&activity.ownerProfileId===scope.profileId:!!scope.legacyOwner&&activity.owner===scope.legacyOwner);
 const cname=(id:string)=>(st.customers.find(c=>c.id===id)?.name||'Okänd kund').replace(' · exempel','');
 const meetings=st.meetings.filter(m=>match(m)&&(m.title+' '+cname(m.customerId)).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const tasks=st.tasks.filter(t=>!t.done&&match(t)).sort((a,b)=>a.due.localeCompare(b.due));
 return <div className="business-ui calendar-work min-w-0" data-profile-diagnostic={scope.diagnostic||undefined}>
  {scope.diagnostic&&<section className="panel day-profile-notice mb-6" role="status" aria-labelledby={diagnosticId} data-profile-diagnostic={scope.diagnostic}>
   <h2 id={diagnosticId}><AlertTriangle size={20} aria-hidden="true"/>{scope.diagnostic==='missing'?'Dina aktiviteter behöver en kontokoppling':scope.diagnostic==='operational-missing'?'Kundansvar saknas':'Kontokopplingen behöver kontrolleras'}</h2>
   <p>{scope.diagnostic==='missing'?(scope.legacyOwner?'Ditt konto har kundansvar, men saknar koppling till en säljarprofil. Uppgifter och möten med profilansvar kan därför saknas här.':'Ditt konto saknar giltigt kundansvar och koppling till en säljarprofil. Dina uppgifter och möten kan därför saknas här.'):scope.diagnostic==='operational-missing'?'Ditt konto är kopplat till en säljarprofil, men har inget giltigt kundansvar. Dina profilkopplade uppgifter och möten visas. Äldre aktiviteter utan profilansvar kan saknas här.':'Ditt kundansvar och den säljarprofil som är kopplad till kontot hör till olika ansvar. Kalendern kan därför visa ett blandat urval av uppgifter och möten.'}</p>
   {scope.diagnostic==='operational-missing'&&<p>Kopplad profil: <b>{linkedProfile!.displayName}</b>.</p>}
   {scope.diagnostic==='mismatch'&&<p>Kundansvar: <b>{scope.legacyOwner}</b>. Kopplad profil: <b>{linkedProfile!.displayName}</b> · ansvar: <b>{linkedProfile!.legacyOwnerName}</b>.</p>}
   <p>Synligt urval: det som visas här är inte en bekräftad fullständig aktivitetslista.</p>
   {admin?<Button type="button" variant="outline" onClick={()=>onView(scope.diagnostic==='operational-missing'?'accounts':'settings')}>{scope.diagnostic==='operational-missing'?'Öppna Konton & roller':'Öppna Mål & inställningar'}</Button>:<p>{scope.diagnostic==='operational-missing'?'Be en administratör kontrollera ditt kundansvar i Konton & roller.':'Be en administratör kontrollera din konto- och profilkoppling i Mål & inställningar.'}</p>}
  </section>}
  <div className="dashboard-grid">
   <section className="panel min-w-0"><div className="panel-head"><div><h2>Kundmöten i CRM{scope.diagnostic?' · synligt urval':''}</h2><p>Intern planering · ingen inbjudan skickas</p></div><CalendarDays/></div>
    {meetings.map(m=><div className="meeting-calendar-row min-w-0" key={m.id} data-meeting-id={m.id}><button className={'meeting-row meeting-calendar-main min-w-0 '+(m.status==='cancelled'?'cancelled':'')} aria-label={'Visa möte: '+m.title} onClick={()=>onMeeting(m)}><div className="date-tile"><b>{m.date.slice(8)}</b><span>{new Date(m.date+'T12:00:00').toLocaleDateString('sv-SE',{month:'short'})}</span></div><div className="meeting-calendar-detail min-w-0 [overflow-wrap:anywhere]"><b>{m.title}</b><small>{cname(m.customerId)} · {m.time} · {m.duration} min</small><small>{m.location} · {label([{id:'planned',label:'Planerat'},{id:'done',label:'Genomfört'},{id:'cancelled',label:'Avbokat'}],m.status)}</small><small>Ansvarig: {meetingOwnerLabel(st,m)}{st.settings.sellerProfilesInitialized&&!m.ownerProfileId?' · Inte förankrat':''}</small></div></button>{admin&&st.settings.sellerProfilesInitialized&&m.status==='planned'&&<Button className="meeting-calendar-responsibility" variant="outline" disabled={busy} onClick={()=>onTransferMeeting(m)}>{m.ownerProfileId?'Byt mötesansvar':'Förankra mötesansvar'}</Button>}</div>)}
    {!meetings.length&&<Empty>{scope.diagnostic?'Inga kundmöten visas i detta synliga urval. Kontokopplingen behöver kontrolleras innan listan kan bedömas som fullständig.':st.meetings.length?'Inga kundmöten i ditt valda urval.':'Planera första kundmötet.'}</Empty>}
   </section>
   <section className="panel min-w-0"><div className="panel-head"><h2>Aktiviteter{scope.diagnostic?' · synligt urval':''}</h2><Button size="sm" variant="outline" onClick={onCreateTask}><Plus size={14}/>Uppgift</Button></div>
    {tasks.length?<div className="task-list">{tasks.slice(0,100).map(t=><div className="task-row min-w-0" data-overdue={t.due<today} key={t.id} data-task-id={t.id}><Checkbox aria-label={'Markera klar: '+t.title} disabled={busy} checked={false} onCheckedChange={()=>onTask(t)}/><button className="task-title min-w-0 [overflow-wrap:anywhere]" onClick={()=>onTask(t)}><strong>{t.title}</strong><small>{cname(t.customerId)} · {taskOwnerLabel(st,t)}{st.settings.sellerProfilesInitialized&&!t.ownerProfileId?' · Inte förankrat':''}</small></button><span className={'due '+(t.due<today?'late':t.due===today?'today':'')}>{t.due===today?'Idag':dateLabel(t.due)}</span></div>)}</div>:<Empty>{scope.diagnostic?'Inga öppna uppgifter visas i detta synliga urval. Kontokopplingen behöver kontrolleras innan listan kan bedömas som fullständig.':'Inga öppna uppgifter. Planera nästa kundkontakt.'}</Empty>}
   </section>
  </div>
 </div>;
}
