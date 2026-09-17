'use client';
import {useEffect} from 'react';
import {DraftStatus,useDrafts} from './draft-workspace';
import {recordBasis} from '@/lib/record-conflicts';
export type FormDraft={draftId:string;type:string;data:Record<string,any>;base?:Record<string,any>;expectedRecord?:string;initialData?:string};
export type FormDraftControl={flush:()=>Promise<{id:string;revision:number}|null|undefined>;consume:()=>void};
export function FormDraftStatus({form,register,onResolved,onClosed}:{form:FormDraft;onClosed:()=>void;onResolved:(form:FormDraft)=>void;register:(control:FormDraftControl|null)=>void}){
 const w=useDrafts(),current=w.records.find(d=>d.id===form.draftId),dirty=recordBasis(form.data)!==form.initialData;
 const supported=['customer','deal','order','task','meeting','note'].includes(form.type);
 useEffect(()=>{
  if(!supported||!w.ready)return;
  const title=form.data.title||form.data.name||(form.type==='note'?'Kundanteckning':'Påbörjade kunduppgifter');
  if(!current&&dirty)w.create('form',form.type,form,title,form.draftId);
  else if(current&&recordBasis(current.data)!==recordBasis(form))w.update(current.id,form,title);
 },[form,current?.id,w.ready,supported]);
 useEffect(()=>{register(supported?{flush:()=>!w.ready?Promise.resolve(null):current?w.flush(current.id):Promise.resolve(dirty?null:undefined),consume:()=>{if(current)w.consume(current.id)}}:null);return()=>register(null);},[form.draftId,current?.id,w.ready,supported,dirty]);
 return supported&&current?<DraftStatus id={current.id} onClosed={onClosed} onResolved={data=>onResolved(data as FormDraft)}/>:null;
}
