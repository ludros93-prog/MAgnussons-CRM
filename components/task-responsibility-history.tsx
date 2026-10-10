'use client';

import {useEffect,useRef,type FocusEvent} from 'react';
import {History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {State,Task} from '@/lib/crm';
import {restoreHandoverFocus} from './handover-focus';

const sourceLabel={task:'Uppgiftens ansvar',customer:'Kundöverlämning',deal:'Affärsöverlämning',order:'Orderöverlämning',onboarding:'Onboardingöverlämning',customer_issue:'Kundärende',yearwheel:'Årshjul',commercial_task:'Kopplad affärs-/orderuppgift'};
const identityFor=(st:State,space:string,taskId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',taskId]);
const buttonClass='h-auto min-h-11 max-w-full min-w-0 whitespace-normal';

// The recorded audit supplies its own names and account evidence. Looking up a
// current profile or account would rewrite what was known when it was saved.
export function TaskResponsibilityHistoryEntries({task,customerName}:{task:Task;customerName:string}){
 return <>{[...task.responsibilityTransfers].reverse().map(row=><article className="revision-card min-w-0 break-words" key={row.id} data-responsibility-history-id={row.id}>
  <b>{row.source==='commercial_task'?'Kopplat till samma person · '+row.toDisplayName+' · '+row.toOwner:<>{row.action==='anchor'?'Förankrat ansvar':'Bytt ansvar'} · {row.fromDisplayName} · {row.fromOwner} → {row.toDisplayName} · {row.toOwner}</>}</b>
  <p><time dateTime={row.at}>{new Date(row.at).toLocaleString('sv-SE')}</time> · registrerat av {row.byName}.</p>
  <p className="whitespace-pre-wrap">{row.reason}</p>
  {row.source==='commercial_task'&&<>
   <p><b>Arbetsflöde i granskningen:</b> {row.parentType==='order'?'Order':'Affär'} · {row.parentId}.</p>
   <p><b>Granskat CRM-konto vid sparandet:</b> {row.targetName} · {row.targetRole==='admin'?'Administratör':'Säljare'}.</p>
   <p className="biz-hint">Kontokopplingen registrerades vid sparandet. Den visar ingen tidigare kontoidentitet eller personens egen lyckade inloggning.</p>
   <details className="biz-details"><summary>Visa granskade kontoidentifierare</summary><p className="break-words"><b>CRM-konto:</b> {row.targetMemberId}.<br/><b>Användaridentitet:</b> {row.targetUserId}.</p></details>
  </>}
  <small>{sourceLabel[row.source]} · {customerName} · {task.title}. Referens: {row.id}.</small>
 </article>)}</>;
}

type Props={st:State;taskId:string;space:string;openingIdentity:string;opener:HTMLElement|null;onClose:()=>void;returnFocus:()=>HTMLElement|null};

export function TaskResponsibilityHistory({st,taskId,space,openingIdentity,opener,onClose,returnFocus}:Props){
 const identity=identityFor(st,space,taskId),currentIdentity=useRef(identity),heading=useRef<HTMLHeadingElement|null>(null);currentIdentity.current=identity;
 const task=st.tasks.find(row=>row.id===taskId),customer=task?st.customers.find(row=>row.id===task.customerId):undefined;
 const visible=openingIdentity===identity&&st.viewer?.role==='admin'&&!!task?.responsibilityTransfers.length;

 useEffect(()=>{if(!visible)onClose();},[visible,onClose]);

 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const sheet=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('button,summary'))return;
  requestAnimationFrame(()=>{
   if(currentIdentity.current!==openingIdentity||!control.isConnected||document.activeElement!==control||!sheet.contains(control))return;
   const box=control.getBoundingClientRect(),bounds=sheet.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;
   if(box.height>bottom-top)return;
   if(box.top<top)sheet.scrollBy({top:box.top-top,behavior:'instant'});
   else if(box.bottom>bottom)sheet.scrollBy({top:box.bottom-bottom,behavior:'instant'});
  });
 }

 return <Dialog open={visible} onOpenChange={open=>{if(!open)onClose();}}>
  <DialogContent className="business-ui task-responsibility-dialog task-responsibility-history-dialog max-h-[90dvh] overflow-y-auto break-words sm:max-w-2xl" showCloseButton={false} onFocusCapture={revealFocusedControl} onOpenAutoFocus={event=>{event.preventDefault();heading.current?.focus({preventScroll:true});}} onCloseAutoFocus={event=>restoreHandoverFocus(event,opener,returnFocus)}>
   <DialogHeader className="min-w-0">
    <div className="task-responsibility-head"><DialogTitle ref={heading} tabIndex={-1} className="flex items-start gap-2"><History className="shrink-0" size={19} aria-hidden="true"/><span className="min-w-0">Ansvarshistorik för uppgiften</span></DialogTitle><Button type="button" className={buttonClass} variant="outline" onClick={onClose}>Stäng</Button></div>
    <DialogDescription>{visible?<>{customer?.name||'Kundkopplingen saknas'} · {task?.title||'Uppgiften finns inte längre'}.</>:'Historiken är stängd.'}</DialogDescription>
   </DialogHeader>
   {visible&&task&&<section className="min-w-0" aria-label="Registrerade ansvarsändringar">
    <p className="biz-hint">Registrerade ansvarsändringar, med den senaste först. Namn, orsak och tidpunkt visas från den sparade historiken.</p>
    <TaskResponsibilityHistoryEntries task={task} customerName={customer?.name||'Kund'}/>
   </section>}
   <div className="biz-buttons"><Button type="button" className={buttonClass} variant="outline" onClick={onClose}>Stäng</Button></div>
  </DialogContent>
 </Dialog>;
}
