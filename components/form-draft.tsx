'use client';
import {useEffect,type Ref} from 'react';
import {DraftStatus,useDrafts} from './draft-workspace';
import {recordBasis} from '@/lib/record-conflicts';
export type FormDraft={draftId:string;type:string;data:Record<string,any>;base?:Record<string,any>;expectedRecord?:string;initialData?:string};
export type FormDraftControl={flush:()=>Promise<{id:string;revision:number}|null|undefined>;consume:()=>void};
export function FormDraftStatus({form,register,onResolved,onClosed,announce=true,detailsRef}:{form:FormDraft;onClosed:()=>void;onResolved:(form:FormDraft)=>void;register:(control:FormDraftControl|null)=>void;announce?:boolean;detailsRef?:Ref<HTMLDivElement>}){
 const w=useDrafts(),current=w.records.find(d=>d.id===form.draftId),dirty=recordBasis(form.data)!==form.initialData;
 const supported=['customer','deal','order','task','meeting','note'].includes(form.type);
 useEffect(()=>{
  if(!supported||!w.ready)return;
  const title=form.data.title||form.data.name||(form.type==='note'?'Kundanteckning':'Påbörjade kunduppgifter');
  if(!current&&dirty)w.create('form',form.type,form,title,form.draftId);
  else if(current&&recordBasis(current.data)!==recordBasis(form))w.update(current.id,form,title);
 },[form,current?.id,w.ready,supported]);
 useEffect(()=>{register(supported?{flush:()=>!w.ready?Promise.resolve(null):current?w.flush(current.id):Promise.resolve(dirty?null:undefined),consume:()=>{if(current)w.consume(current.id)}}:null);return()=>register(null);},[form.draftId,current?.id,w.ready,supported,dirty]);
 if(!supported)return null;
 const status=<DraftStatus id={form.draftId} announce={announce} onClosed={onClosed} onResolved={data=>onResolved(data as FormDraft)}/>;
 // The generic footer announces the summary. Detailed text and existing
 // retry/version controls remain here and are focused only by an explicit link.
 return detailsRef?(!w.ready||current?<div ref={detailsRef} tabIndex={-1} className="form-status-details" aria-label="Besked för privat utkast">{status}</div>:null):status;
}
