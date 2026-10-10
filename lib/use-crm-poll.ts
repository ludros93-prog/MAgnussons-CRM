'use client';
import {useCallback,useEffect,useRef} from 'react';
import type {State} from './crm';

type PollOptions={
 space:string;
 state:State|null;
 view:string;
 saving:{current:boolean};
 onState:(expected:State,next:State,current:()=>boolean)=>void;
 onAccessDenied:(expected:State,message:string,current:()=>boolean)=>void;
};
type Scope={space:string;active:boolean;epoch:number;generation:number;running:AbortController|null};
const newScope=(space:string):Scope=>({space,active:false,epoch:0,generation:0,running:null});
const viewerKey=(state:State)=>JSON.stringify([state.viewer?.id||'',state.viewer?.memberId||'',state.viewer?.role||'',state.viewer?.owner||'']);
function dataPaused(view:string){
 return ['catalog','settings'].includes(view)||
  (!['orders','print','warehouse','production'].includes(view)&&!!document.querySelector('details[open]'))||
  !!document.querySelector('[role=dialog],[role=alertdialog]')||
  !!document.activeElement?.matches('input,textarea,[contenteditable=true]');
}
function readableState(value:State){
 return value&&Number.isSafeInteger(value.version)&&value.version>=0&&
  typeof value.viewer?.id==='string'&&!!value.viewer.id.trim()&&
  ['admin','seller','reader','production','print','warehouse'].includes(value.viewer.role);
}

// Editing pauses ordinary CRM data updates, never a current access check.
// Results belong to the exact state object, workspace and request generation.
export function useCRMPoll(options:PollOptions){
 const latest=useRef(options);latest.current=options;
 const lifecycle=useRef<Scope>(newScope(options.space));
 if(lifecycle.current.space!==options.space){
  lifecycle.current.active=false;lifecycle.current.generation++;
  lifecycle.current.running?.abort();lifecycle.current.running=null;
  lifecycle.current=newScope(options.space);
 }
 const scope=lifecycle.current;
 const invalidate=useCallback(()=>{
  const active=lifecycle.current;active.generation++;
  active.running?.abort();active.running=null;
 },[]);
 // A same-version explicit read or mutation still replaces the state object.
 useEffect(()=>{invalidate()},[options.state,scope,invalidate]);
 useEffect(()=>{
  scope.active=true;scope.generation++;const epoch=++scope.epoch;
  async function poll(){
   const start=latest.current,expected=start.state;
   if(lifecycle.current!==scope||!scope.active||scope.epoch!==epoch||!expected||start.space!==scope.space||start.saving.current||document.hidden||scope.running)return;
   const generation=++scope.generation;
   const pausedAtStart=dataPaused(start.view),controller=new AbortController();scope.running=controller;
   const current=()=>lifecycle.current===scope&&scope.active&&scope.epoch===epoch&&scope.generation===generation&&
    latest.current.space===scope.space&&latest.current.state===expected&&
    !latest.current.saving.current&&!controller.signal.aborted&&!document.hidden;
   const timeout=setTimeout(()=>{if(scope.running===controller)invalidate()},15000);
   try{
    const response=await fetch('/api/crm?space='+encodeURIComponent(scope.space),{cache:'no-store',signal:controller.signal});
    if(!current())return;
    if(response.status===401||response.status===403){
     // Status comes from the authenticated CRM endpoint. Do not display an
     // arbitrary response body, HTML, or a transient network failure as access.
     latest.current.onAccessDenied(expected,response.status===401?
      'Din inloggning behöver kontrolleras. Logga in igen och välj Försök igen.':
      'Ditt konto saknar åtkomst till arbetsytan. Be administratören kontrollera kontot och välj sedan Försök igen.',current);
     return;
    }
    if(!response.ok)return;
    const data=await response.json() as State;
    if(!current()||!readableState(data)||data.version<expected.version)return;
    const accessChanged=viewerKey(data)!==viewerKey(expected);
    if(accessChanged||data.version>expected.version&&!pausedAtStart&&!dataPaused(latest.current.view))latest.current.onState(expected,data,current);
   }catch{/* A failed read preserves the current workspace and editing text. */}
   finally{clearTimeout(timeout);if(scope.running===controller)scope.running=null;}
  }
  const visible=()=>{if(lifecycle.current!==scope||!scope.active||scope.epoch!==epoch)return;if(document.hidden)invalidate();else void poll();};
  const timer=setInterval(()=>void poll(),30000);
  window.addEventListener('focus',poll);document.addEventListener('visibilitychange',visible);
  return()=>{
   scope.active=false;scope.epoch++;scope.generation++;scope.running?.abort();scope.running=null;
   clearInterval(timer);window.removeEventListener('focus',poll);document.removeEventListener('visibilitychange',visible);
  };
 },[scope,invalidate]);
 return invalidate;
}
