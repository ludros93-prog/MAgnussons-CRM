'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {OutlookState} from './outlook-shared';

type Scope={key:string;epoch:number;active:boolean;running:AbortController|null;controllers:Set<AbortController>;state:OutlookState|null;error:string};
type Snapshot={scope:Scope;epoch:number;state:OutlookState|null;busy:boolean;error:string};
const createScope=(key:string):Scope=>({key,epoch:0,active:false,running:null,controllers:new Set(),state:null,error:''});

// An empty key disables Outlook. The caller supplies the resolved workspace,
// authenticated user, member and permitted role; a boolean cannot isolate them.
export function useOutlook(scopeKey:string){
 const enabled=!!scopeKey.trim(),lifecycle=useRef<Scope>(createScope(scopeKey));
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 // Hide the previous identity's private items before effect cleanup. Old
 // callbacks may still exist, but cannot act in or publish into the new scope.
 if(lifecycle.current.key!==scopeKey){lifecycle.current.active=false;lifecycle.current=createScope(scopeKey);}
 const scope=lifecycle.current;
 const request=useCallback(async(body?:unknown)=>{
  const epoch=scope.epoch,current=()=>enabled&&lifecycle.current===scope&&scope.active&&scope.epoch===epoch;
  if(!current()||scope.running)return false;
  const controller=new AbortController();scope.running=controller;scope.controllers.add(controller);
  setSnapshot({scope,epoch,state:scope.state,busy:true,error:scope.error});
  try{
   const response=await fetch('/api/outlook',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal}:{cache:'no-store',signal:controller.signal});
   if(!current())return false;
   const data:any=await response.json();
   if(!current())return false;
   if(!response.ok)throw Error(data.error||'Outlook kunde inte läsas.');
   scope.state=data;scope.error='';
   setSnapshot({scope,epoch,state:scope.state,busy:true,error:''});
   return true;
  }catch(e){
   if(current()){scope.error=(e as Error).message;setSnapshot({scope,epoch,state:scope.state,busy:true,error:scope.error});}
   return false;
  }finally{
   scope.controllers.delete(controller);
   if(scope.running===controller)scope.running=null;
   if(current())setSnapshot({scope,epoch,state:scope.state,busy:false,error:scope.error});
  }
 },[enabled,scope]);
 useEffect(()=>{
  const epoch=++scope.epoch;scope.active=enabled;scope.state=null;scope.error='';
  setSnapshot({scope,epoch,state:null,busy:false,error:''});
  const current=()=>enabled&&lifecycle.current===scope&&scope.active&&scope.epoch===epoch;
  if(!enabled)return;
  void request().then(success=>{
   if(!success||!current())return;
   const connection=scope.state?.connection;
   if(connection?.status==='connected'&&(!connection.lastSync||Date.now()-Date.parse(connection.lastSync)>300000))void request({action:'sync'});
  });
  const interval=setInterval(()=>{
   if(!current()||document.visibilityState!=='visible')return;
   if(scope.state?.connection?.status==='connected')void request({action:'sync'});
   else void request();
  },300000);
  return()=>{
   scope.active=false;scope.epoch++;clearInterval(interval);
   // Cancelling a client request does not undo work already accepted by the
   // server. Its result simply cannot enter another identity's private view.
   for(const controller of scope.controllers)controller.abort();scope.controllers.clear();scope.running=null;
  };
 },[enabled,scope,request]);
 const visible=enabled&&scope.active&&snapshot?.scope===scope&&snapshot.epoch===scope.epoch?snapshot:null;
 return {state:visible?.state||null,busy:visible?.busy||false,error:visible?.error||'',request};
}
