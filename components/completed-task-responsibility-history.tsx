'use client';

import {useState,type RefObject} from 'react';
import {ChevronDown,History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {Customer,State} from '@/lib/crm';
import {TaskResponsibilityHistory} from './task-responsibility-history';

export const completedTaskHistoryIdentity=(st:State,space:string,customerId:string)=>JSON.stringify([customerId,space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'']);
const taskHistoryIdentity=(st:State,space:string,taskId:string)=>JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',taskId]);

// Completion is read only from the recorded timestamp. A due date or an audit
// timestamp cannot supply a missing completion date or time.
function completionTime(value:string){
 const match=/^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
 if(!match)return null;
 const calendar=Date.parse(match[1]+'T00:00:00Z'),timestamp=Date.parse(value);
 return Number.isFinite(calendar)&&new Date(calendar).toISOString().slice(0,10)===match[1]&&Number.isFinite(timestamp)?timestamp:null;
}

type Opening={taskId:string;identity:string;opener:HTMLElement};
type View={scope:string;expanded:boolean;limit:number;opening:Opening|null};
type Props={st:State;c:Customer;space:string;summaryRef:RefObject<HTMLElement|null>;returnFocus:()=>HTMLElement|null};

export function CompletedTaskResponsibilityHistory({st,c,space,summaryRef,returnFocus}:Props){
 const scope=completedTaskHistoryIdentity(st,space,c.id),admin=st.viewer?.role==='admin';
 const initialView:View={scope,expanded:false,limit:10,opening:null};
 const [view,setView]=useState<View>(initialView);
 const current=view.scope===scope?view:initialView;
 const tasks=admin?st.tasks.filter(task=>task.customerId===c.id&&task.done&&task.responsibilityTransfers.length>0).map(task=>({task,completed:completionTime(task.doneAt)})).sort((a,b)=>{
  if(a.completed!==null&&b.completed!==null&&a.completed!==b.completed)return b.completed-a.completed;
  if(a.completed===null&&b.completed!==null)return 1;
  if(a.completed!==null&&b.completed===null)return -1;
  return a.task.id<b.task.id?-1:a.task.id>b.task.id?1:0;
 }):[];
 const selected=current.opening?tasks.find(row=>row.task.id===current.opening!.taskId):undefined;

 // Guard during render, not after an effect: changed identity, deletion,
 // reopening or removed audit must never leave the old dialog visible or let
 // it reappear if that task later becomes completed again.
 if(view.scope!==scope)setView(initialView);
 else if(current.opening&&!selected)setView({...current,opening:null});

 if(!admin)return null;
 return <>
  <details className="co-completed-history" open={current.expanded} onToggle={event=>{
   const expanded=event.currentTarget.open;
   setView(previous=>previous.scope===scope&&previous.expanded!==expanded?{...previous,expanded}:previous);
  }}>
   <summary ref={summaryRef}><History size={20} aria-hidden="true"/><span>Avslutade uppgifter med ansvarshistorik ({tasks.length})</span><ChevronDown size={20} className="co-completed-history-chevron" aria-hidden="true"/></summary>
   <div className="co-completed-history-content">
    <p className="co-completed-history-description">Sparad ansvarshistorik för kundens avslutade uppgifter. Avslutsdatum och tid visas i svensk tid, Europe/Stockholm.</p>
    {tasks.length>0?<>
     <p className="co-completed-history-count" role="status">Visar {Math.min(current.limit,tasks.length)} av {tasks.length} avslutade uppgifter.</p>
     <ol className="co-completed-task-list" aria-label="Avslutade uppgifter med registrerad ansvarshistorik">{tasks.slice(0,current.limit).map(({task,completed})=><li className="co-completed-task-row" data-task-id={task.id} key={task.id}>
      <div className="co-completed-task-copy"><h4 className="co-completed-task-title">{task.title}</h4><dl className="co-completed-task-facts">
       <div><dt>Registrerat uppgiftsansvar</dt><dd className="co-completed-task-owner">{task.owner}</dd></div>
       <div><dt>Avslutad</dt><dd className="co-completed-task-completion">{completed!==null?<time dateTime={task.doneAt}>{new Date(completed).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',dateStyle:'short',timeStyle:'medium'})}</time>:'Avslutsdatum saknas'}</dd></div>
      </dl></div>
      <Button type="button" variant="outline" className="co-completed-task-audit-button" onClick={event=>{
       const opener=event.currentTarget;
       setView(previous=>previous.scope===scope?{...previous,opening:{taskId:task.id,identity:taskHistoryIdentity(st,space,task.id),opener}}:previous);
      }}>Visa ansvarshistorik</Button>
     </li>)}</ol>
     {tasks.length>current.limit&&<Button type="button" variant="outline" className="co-completed-history-more" onClick={()=>setView(previous=>previous.scope===scope?{...previous,limit:previous.limit+10}:previous)}>Visa fler avslutade uppgifter</Button>}
    </>:<p className="co-completed-history-empty">Kunden har inga avslutade uppgifter med registrerad ansvarshistorik.</p>}
   </div>
  </details>
  {selected&&current.opening&&<TaskResponsibilityHistory st={st} taskId={selected.task.id} space={space} openingIdentity={current.opening.identity} opener={current.opening.opener} onClose={()=>setView(previous=>previous.scope===scope?{...previous,opening:null}:previous)} returnFocus={returnFocus}/>}
 </>;
}
