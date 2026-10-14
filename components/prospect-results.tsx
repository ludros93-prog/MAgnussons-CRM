'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import type {Lead} from '@/lib/operations';

// Keyed by the search filters by the caller: a new selection starts at 100.
export function ProspectResults({leads,children}:{leads:Lead[];children:(lead:Lead)=>ReactNode}){
 const [limit,setLimit]=useState(100);
 const grid=useRef<HTMLDivElement>(null),focusIndex=useRef<number|null>(null),id=useId();
 const shown=Math.min(limit,leads.length),remaining=leads.length-shown;
 useEffect(()=>{
  if(focusIndex.current===null)return;
  const next=grid.current?.children.item(focusIndex.current) as HTMLElement|undefined;
  focusIndex.current=null;
  next?.focus();
 },[limit]);
 return <>
  <div id={id} ref={grid} className="production-grid">{leads.slice(0,limit).map(children)}</div>
  {leads.length>0&&<div className="biz-buttons">
   <p role="status" aria-live="polite" aria-atomic="true">Visar {shown} av {leads.length} företag i urvalet.</p>
   {remaining>0&&<Button type="button" variant="outline" aria-controls={id} style={{minHeight:44,whiteSpace:'normal'}} onClick={()=>{focusIndex.current=shown;setLimit(value=>value+100)}}>Visa {Math.min(100,remaining)} fler företag</Button>}
  </div>}
 </>;
}
