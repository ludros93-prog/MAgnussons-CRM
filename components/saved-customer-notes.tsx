'use client';
import {useState,useRef,useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {CustomerNotes,emptyNoteDraft,type NoteDraft} from './customer-notes';
import {DraftStatus,useDrafts} from './draft-workspace';
import type {State} from '@/lib/crm';
import type {SaveAction} from './business-ui';
export function SavedCustomerNotes({st,customerId,save,busy,draftId,onResumeUnavailable,onResumeComplete}:{st:State;customerId:string;save:SaveAction;busy:boolean;draftId?:string;onResumeUnavailable?:()=>void;onResumeComplete?:()=>void}){
 const [submitting,setSubmitting]=useState(false),[completed,setCompleted]=useState(false),lock=useRef(false),finished=useRef(false),mounted=useRef(true),w=useDrafts(),c=st.customers.find(c=>c.id===customerId);
 const identity=JSON.stringify([st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'',customerId,draftId||'']),latestIdentity=useRef(identity);latestIdentity.current=identity;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const active=()=>mounted.current&&latestIdentity.current===identity,explicit=!!draftId;
 const selected=explicit?w.get(draftId!):undefined,current=explicit?selected?.id===draftId&&selected.kind==='note'&&selected.context===customerId&&!selected.archived?selected:undefined:w.records.find(d=>d.kind==='note'&&d.context===customerId);
 const selectedAvailable=()=>{const record=draftId?w.get(draftId):undefined;return !!record&&record.id===draftId&&record.kind==='note'&&record.context===customerId&&!record.archived};
 if(explicit&&!w.ready)return <DraftStatus id={draftId!} disabled={busy||submitting}/>;
 if(explicit&&(completed||finished.current))return <div className="biz-callout" role="status"><p>Anteckningen är sparad i CRM. Det valda privata utkastet är avslutat.</p>{onResumeUnavailable&&<Button type="button" variant="outline" onClick={onResumeUnavailable}>Till Min dag</Button>}</div>;
 if(!c||explicit&&!current)return <div className="biz-callout" role="status"><p>Det valda privata anteckningsutkastet kan inte öppnas på den här kunden. Det kan ha avslutats eller höra till ett annat kundarbete. Inget annat utkast har öppnats och ingen anteckning har registrerats. Välj utkastet igen från Min dag.</p>{onResumeUnavailable&&<Button type="button" variant="outline" onClick={onResumeUnavailable}>Till Min dag</Button>}</div>;
 const value=current?.data as NoteDraft|undefined;
 return <><DraftStatus id={current?.id||''} disabled={busy||submitting}/><CustomerNotes customerId={customerId} events={st.events} owners={st.settings.owners} defaultOwner={c.owner} draft={value||emptyNoteDraft()} busy={busy||submitting||!w.ready||st.viewer?.role==='reader'||current?.status==='conflict'} onChange={data=>{if(!active()||finished.current||explicit&&!selectedAvailable())return;if(!current&&!data.text&&!data.title&&!data.nextAction)return;if(current)w.update(current.id,data,data.title||'Anteckning · '+c.name);else if(!explicit)w.create('note',customerId,data,data.title||'Anteckning · '+c.name)}} onSave={async data=>{if(!active()||finished.current||!current||lock.current||explicit&&!selectedAvailable())return false;lock.current=true;setSubmitting(true);try{const ref=await w.flush(current.id);if(!ref||!active()||explicit&&!selectedAvailable())return false;const ok=await save('customer_note',{...data,draft:ref},false);if(ok&&active()){if(explicit){finished.current=true;setCompleted(true)}w.consume(current.id);if(explicit)onResumeComplete?.()}return ok;}finally{lock.current=false;if(active())setSubmitting(false)}}}/></>;
}
