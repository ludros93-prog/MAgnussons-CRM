'use client';
import {useState,useRef} from 'react';
import {CustomerNotes,emptyNoteDraft,type NoteDraft} from './customer-notes';
import {DraftStatus,useDrafts} from './draft-workspace';
import type {State} from '@/lib/crm';
import type {SaveAction} from './business-ui';
export function SavedCustomerNotes({st,customerId,save,busy}:{st:State;customerId:string;save:SaveAction;busy:boolean}){
 const [submitting,setSubmitting]=useState(false),lock=useRef(false),w=useDrafts(),c=st.customers.find(c=>c.id===customerId)!,current=w.records.find(d=>d.kind==='note'&&d.context===customerId);
 const value=current?.data as NoteDraft|undefined;
 return <><DraftStatus id={current?.id||''} disabled={busy||submitting}/><CustomerNotes customerId={customerId} events={st.events} owners={st.settings.owners} defaultOwner={c.owner} draft={value||emptyNoteDraft()} busy={busy||submitting||!w.ready||st.viewer?.role==='reader'||current?.status==='conflict'} onChange={data=>{if(!current&&!data.text&&!data.title&&!data.nextAction)return;if(current)w.update(current.id,data,data.title||'Anteckning · '+c.name);else w.create('note',customerId,data,data.title||'Anteckning · '+c.name)}} onSave={async data=>{if(!current||lock.current)return false;lock.current=true;setSubmitting(true);try{const ref=await w.flush(current.id);if(!ref)return false;const ok=await save('customer_note',{...data,draft:ref},false);if(ok)w.consume(current.id);return ok;}finally{lock.current=false;setSubmitting(false)}}}/></>;
}
