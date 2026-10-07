'use client';
import {useId,useState} from 'react';
import {Search,ArrowRight,Plus} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';import type {State} from '@/lib/crm';
export function CustomerPicker({st,purpose,onSelect,onClose,onNew}:{st:State;purpose:string;onSelect:(id:string)=>void;onClose:()=>void;onNew:()=>void}){
 const labelId=useId(),[query,setQuery]=useState('');
 const matches=st.customers.filter(c=>(c.name+' '+c.contact+' '+c.email+' '+c.organizationNumber).toLocaleLowerCase('sv').includes(query.trim().toLocaleLowerCase('sv'))).sort((a,b)=>Number(b.owner===st.viewer?.owner)-Number(a.owner===st.viewer?.owner)||a.name.localeCompare(b.name,'sv'));
 const action=purpose==='search'?'Öppna kundkort':'Välj kund';
 return <Dialog open onOpenChange={v=>{if(!v)onClose()}}>
  <DialogContent className="customer-picker">
   <DialogHeader>
    <DialogTitle>{purpose==='search'?'Sök kund':purpose==='notes'?'Vilken kund gäller anteckningen?':'Vilken kund gäller det?'}</DialogTitle>
    <DialogDescription>Sök på företag, kontaktperson, e-post eller organisationsnummer.</DialogDescription>
   </DialogHeader>
   <div className="search"><Search size={18}/><Input autoFocus aria-label="Sök i kundregistret" placeholder="Börja skriva ett namn…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="picker-results">
    {matches.slice(0,30).map((c,index)=><article className="picker-result" key={c.id}>
     <div className="picker-customer">
      <span className="company-icon" aria-hidden="true">{c.name.slice(0,2).toUpperCase()}</span>
      <div className="picker-customer-text"><b id={`${labelId}-name-${index}`}>{c.name}</b><small>{c.contact||'Ingen kontaktperson'} · {c.owner===st.viewer?.owner?'Din kund':c.owner}</small></div>
     </div>
     <Button type="button" variant="outline" className="picker-action" aria-labelledby={`${labelId}-action-${index} ${labelId}-name-${index}`} onClick={()=>onSelect(c.id)}>
      <span id={`${labelId}-action-${index}`}>{action}</span><ArrowRight size={18} aria-hidden="true"/>
     </Button>
    </article>)}
    {!matches.length&&<p>Ingen kund matchar sökningen.</p>}
    {matches.length>30&&<p>Fortsätt skriva för att begränsa {matches.length} träffar.</p>}
   </div>
   {st.viewer?.role!=='reader'&&<Button variant="outline" className="picker-new" onClick={onNew}><Plus size={16}/>Lägg till en ny kund</Button>}
  </DialogContent>
 </Dialog>;
}
