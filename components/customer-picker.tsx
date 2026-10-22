'use client';
import {useId,useState} from 'react';
import {Search,ArrowRight,Plus} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';import type {State} from '@/lib/crm';
import {customerScope,customerInScope} from '@/lib/customer-scope';
import {customerMatchesQuery} from '@/lib/customer-search';
import {personalOwner} from '@/lib/sales-dashboard';
export function CustomerPicker({st,purpose,onSelect,onClose,onNew}:{st:State;purpose:string;onSelect:(id:string)=>void;onClose:()=>void;onNew:()=>void}){
 const labelId=useId(),diagnosticId=useId(),[query,setQuery]=useState('');
 const scope=customerScope(st,personalOwner(st)||'_unassigned'),isMine=(customer:State['customers'][number])=>customerInScope(customer,scope),accountHelp=scope.diagnostic==='operational-missing';
 const matches=st.customers.filter(c=>customerMatchesQuery(c,query)).sort((a,b)=>Number(isMine(b))-Number(isMine(a))||a.name.localeCompare(b.name,'sv'));
 const action=purpose==='search'?'Öppna kundkort':'Välj kund';
 return <Dialog open onOpenChange={v=>{if(!v)onClose()}}>
  <DialogContent className="customer-picker">
   <DialogHeader>
    <DialogTitle>{purpose==='search'?'Sök kund':purpose==='notes'?'Vilken kund gäller anteckningen?':'Vilken kund gäller det?'}</DialogTitle>
    <DialogDescription>Sök på företag, kontaktuppgift, organisationsnummer eller kundnummer i Fortnox.</DialogDescription>
   </DialogHeader>
   {scope.diagnostic&&<section className="min-w-0 [overflow-wrap:anywhere]" role="status" aria-labelledby={diagnosticId} data-profile-diagnostic={scope.diagnostic}>
    <p id={diagnosticId}><b>{accountHelp?'Kundansvar saknas':'Kundkopplingen behöver kontrolleras'}</b></p>
    <p>{scope.diagnostic==='missing'?'Märkningen ”Din kund” och prioriteringen kan vara ofullständiga eftersom kontot saknar säljarprofil.':accountHelp?'Profilkopplade kunder kan märkas ”Din kund”. Äldre kunder utan profilansvar kan inte prioriteras som dina.':'Ditt kundansvar och din kopplade säljarprofil hör till olika ansvar. ”Din kund” och prioriteringen följer profilen för registrerade kunder och kundansvaret för äldre kunder.'} Sökningen omfattar alla tillgängliga kunder.</p>
    <p>{st.viewer?.role==='admin'?(accountHelp?'Kontrollera ditt kundansvar i Konton & roller.':'Kontrollera konto- och profilkopplingen i Mål & inställningar.'):(accountHelp?'Be en administratör kontrollera ditt kundansvar i Konton & roller.':'Be en administratör kontrollera din konto- och profilkoppling i Mål & inställningar.')}</p>
   </section>}
   <div className="search"><Search size={18}/><Input autoFocus aria-label="Sök i kundregistret" placeholder="Börja skriva ett namn…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="picker-results">
    {matches.slice(0,30).map((c,index)=><article className="picker-result" key={c.id} data-customer-id={c.id}>
     <div className="picker-customer">
      <span className="company-icon" aria-hidden="true">{c.name.slice(0,2).toUpperCase()}</span>
      <div className="picker-customer-text"><b id={`${labelId}-name-${index}`}>{c.name}</b><small>{c.contact||'Ingen kontaktperson'} · {isMine(c)?'Din kund':c.owner}</small></div>
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
