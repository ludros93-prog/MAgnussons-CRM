'use client';
import {useMemo,useState} from 'react';
import {Search,MapPin,ExternalLink,Users} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {LeadSchema,distanceKm,leadOrganizationKey,leadContactDecisions,leadContactHistory,type Lead} from '@/lib/operations';
import {leadContactBasis} from '@/lib/record-conflicts';
import {day,type State} from '@/lib/crm';
import {personalOwner} from '@/lib/sales-dashboard';
import {BusinessField as F,Pick,type SaveAction} from './business-ui';
import {RecordImporter,csvNumber} from './record-importer';

const fields=[{id:'name',label:'Företagsnamn',aliases:['company','companyname']},{id:'organizationNumber',label:'Organisationsnummer',aliases:['businessid']},{id:'sourceRecordId',label:'Källans företags-ID',aliases:['externalid','recordid']},{id:'industry',label:'Bransch'},{id:'employees',label:'Antal anställda'},{id:'city',label:'Ort'},{id:'address',label:'Adress'},{id:'latitude',label:'Latitud'},{id:'longitude',label:'Longitud'},{id:'website',label:'Webbplats'},{id:'contact',label:'Kontaktperson'},{id:'role',label:'Befattning'},{id:'email',label:'E-post'},{id:'phone',label:'Telefon'},{id:'linkedin',label:'LinkedIn'},{id:'checkedAt',label:'Kontrollerad datum'}];

export function ProspectSearch({st,save,busy,onCustomer}:{st:State;save:SaveAction;busy:boolean;onCustomer:(id:string)=>void}){
 const [query,setQuery]=useState(''),[industry,setIndustry]=useState(''),[city,setCity]=useState(''),[min,setMin]=useState(''),[max,setMax]=useState(''),[role,setRole]=useState(''),[radius,setRadius]=useState(''),[contactFilter,setContactFilter]=useState('available'),[importing,setImporting]=useState(false),[source,setSource]=useState(''),[selected,setSelected]=useState<Lead|null>(null),[owner,setOwner]=useState(personalOwner(st)),[contactIndex,setContactIndex]=useState('0'),[nextDate,setNextDate]=useState(day()),[nextAction,setNextAction]=useState('Ta en första kontakt och undersök behov');
 const [decision,setDecision]=useState<{id:string;blocked:boolean;basis:string}|null>(null),[reason,setReason]=useState('');
 const canWrite=st.viewer?.role==='admin'||st.viewer?.role==='seller';
 const contains=(a:string,b:string)=>a.toLocaleLowerCase('sv').includes(b.toLocaleLowerCase('sv'));
 const decisions=useMemo(()=>leadContactDecisions(st.leads),[st.leads]);
 const list=st.leads.filter(l=>{
  const blocked=!!decisions.get(l.id)?.blocked;
  return (contactFilter==='all'||(contactFilter==='blocked'?blocked:!blocked))&&contains(l.name+' '+l.organizationNumber,query)&&contains(l.industry,industry)&&contains(l.city,city)&&(!min||l.employees!==null&&l.employees>=Number(min))&&(!max||l.employees!==null&&l.employees<=Number(max))&&(!role||l.contacts.some(c=>contains(c.role,role)))&&(!radius||l.latitude!==null&&l.longitude!==null&&distanceKm(56.104866,13.913155,l.latitude,l.longitude)<=Number(radius));
 }).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
 const decisionLead=st.leads.find(l=>l.id===decision?.id),history=decisionLead?leadContactHistory(st.leads,decisionLead):[];
 const conflict=!!decision&&decision.basis!==leadContactBasis(st,decision.id);
 const decisionAlreadyApplied=!!decision&&!!decisionLead&&!!decisions.get(decisionLead.id)?.blocked===decision.blocked;
 const openDecision=(l:Lead)=>{setReason('');setDecision({id:l.id,blocked:!decisions.get(l.id)?.blocked,basis:leadContactBasis(st,l.id)});};
 return <section className="business-ui operations">
  <div className="biz-head"><div><span className="biz-kicker">HITTA NÄSTA KUND</span><h2><Search/>Företagsökning</h2><p>{st.leads.length} företag i inläst underlag · {list.length} matchar urvalet · {[...decisions.values()].filter(d=>d?.blocked).length} spärrade poster</p></div>{st.viewer?.role==='admin'&&<Button onClick={()=>setImporting(true)}>Importera företagslista</Button>}</div>
  <div className="biz-callout">Sökningen gäller era inlästa företagslistor. Vainu eller annan extern datakälla är inte ansluten. Kontaktuppgifter visas från underlaget och behöver kontrolleras före kontakt. Kontaktspärren gäller prospekteringen i denna vy.</div>
  <div className="prospect-filters">
   <F label="Företag / org.nr"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Sök företag"/></F>
   <F label="Kontaktstatus"><Pick label="Kontaktstatus" value={contactFilter} items={[{id:'available',label:'Utan kontaktspärr'},{id:'blocked',label:'Spärrade för prospektering'},{id:'all',label:'Alla företag'}]} onChange={setContactFilter}/></F>
   <F label="Bransch"><Input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="Ex. bygg"/></F>
   <F label="Ort"><Input value={city} onChange={e=>setCity(e.target.value)}/></F>
   <F label="Minst anställda"><Input type="number" min={0} value={min} onChange={e=>setMin(e.target.value)}/></F>
   <F label="Högst anställda"><Input type="number" min={0} value={max} onChange={e=>setMax(e.target.value)}/></F>
   <F label="Kontaktens befattning"><Input value={role} onChange={e=>setRole(e.target.value)} placeholder="VD, marknad, försäljning…"/></F>
   <F label="Radie från Vinslöv, km"><Input type="number" min={1} value={radius} onChange={e=>setRadius(e.target.value)} placeholder="Ingen avgränsning"/></F>
  </div>
  <p className="biz-hint"><MapPin size={14}/> Radie är fågelväg från en ungefärlig punkt i Vinslöv. {st.leads.filter(l=>l.latitude===null||l.longitude===null).length} företag saknar koordinater och visas inte med aktivt radiefilter.</p>
  <div className="production-grid">{list.slice(0,100).map(l=>{
   const current=decisions.get(l.id),blocked=!!current?.blocked;
   return <article className="production-card lead-card" key={l.id}>
    <div className="biz-head"><div><span className="pill">{l.industry||'Bransch saknas'}</span><h3>{l.name}</h3><p>{l.city||'Ort saknas'} · {l.employees===null?'Antal anställda saknas':l.employees+' anställda'}</p></div><Users size={22}/></div>
    {blocked&&<div className="biz-callout"><b>Spärrad för prospektering</b><p>{current!.reason}</p><small>{current!.byName} · {new Date(current!.at).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm'})}</small></div>}
    {l.contacts.map((c,i)=><div className="lead-contact" key={i}><b>{c.name}</b><span>{c.role||'Befattning saknas'}</span><div className="biz-buttons">{c.email&&(blocked?<span>{c.email}</span>:<a href={'mailto:'+c.email}>{c.email}</a>)}{c.phone&&(blocked?<span>{c.phone}</span>:<a href={'tel:'+c.phone}>{c.phone}</a>)}{c.linkedin&&(blocked?<span>LinkedIn finns i underlaget</span>:<a href={c.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={13}/></a>)}</div></div>)}
    {!l.contacts.length&&<p>Ingen kontaktperson i underlaget.</p>}
    <p className="biz-hint">Källa: {l.source} · {l.checkedAt?'Kontrollerad '+l.checkedAt:'Kontrolldatum saknas'}</p>
    <div className="biz-buttons">{l.website&&<a href={l.website} target="_blank" rel="noreferrer">Webbplats ↗</a>}{l.customerId?<Button variant="outline" onClick={()=>onCustomer(l.customerId)}>Öppna kundkort</Button>:canWrite&&!blocked&&<Button disabled={busy} onClick={()=>{setSelected(l);setContactIndex('0')}}>Börja bearbeta</Button>}{canWrite&&<Button variant="outline" disabled={busy} onClick={()=>openDecision(l)}>{blocked?'Återöppna kontakt':'Spärra prospektering'}</Button>}</div>
   </article>;
  })}</div>
  {!list.length&&<div className="biz-empty">{st.leads.length?'Inga företag matchar filtren.':'Importera en företagslista för att börja söka.'}</div>}
  {list.length>100&&<p>Visar de första 100 träffarna. Avgränsa urvalet för att se fler.</p>}
  <p className="biz-hint">E-postlänkar öppnar din e-postapp. Mejl skickas inte från CRM i denna version.</p>
  <Sheet open={importing} onOpenChange={setImporting}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>Importera företagsdata</SheetTitle><SheetDescription>Samma organisationsnummer slås ihop, kontakter läggs till och kontaktspärrar bevaras. Utan organisationsnummer krävs samma datakälla och källans företags-ID för att känna igen en post vid återimport.</SheetDescription></SheetHeader><div className="sheet-body business-ui"><F label="Datakälla *"><Input value={source} onChange={e=>setSource(e.target.value)} placeholder="Ex. Vainu"/></F><p className="biz-hint">Använd samma namn för samma datakälla vid återimport. Poster utan organisationsnummer eller käll-ID kan inte säkert kännas igen. Importen stoppas om namn och ort kan motsvara en spärrad post; komplettera då identiteten.</p><RecordImporter maxRows={500} fields={fields} busy={busy} parse={r=>{const p=LeadSchema.safeParse({...r,source,employees:csvNumber(r.employees),latitude:csvNumber(r.latitude),longitude:csvNumber(r.longitude),contacts:r.contact?[{name:r.contact,role:r.role,email:r.email,phone:r.phone,linkedin:r.linkedin}]:[]});if(!p.success)throw Error(p.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; '));return p.data}} onImport={rows=>save('lead_import',{leads:rows},false)}/></div></SheetContent></Sheet>
  <Sheet open={!!selected} onOpenChange={v=>{if(!v)setSelected(null)}}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>{selected?.name}</SheetTitle><SheetDescription>Skapa ett prospekt med ansvarig och nästa steg. Befintliga kunder länkas utan att skrivas över.</SheetDescription></SheetHeader><div className="sheet-body business-ui"><F label="Kundansvarig *"><Pick label="Kundansvarig" value={owner} items={[{id:'',label:'Välj kundansvarig'},...st.settings.owners.map(o=>({id:o,label:o}))]} onChange={setOwner}/></F>{!owner&&<p className="biz-hint">Välj vem som ska ansvara för kontakten innan prospektet läggs till.</p>}{!!selected?.contacts.length&&<F label="Primär kontakt"><Pick label="Primär kontakt" value={contactIndex} items={selected.contacts.map((c,i)=>({id:String(i),label:c.name+' · '+c.role}))} onChange={setContactIndex}/></F>}<F label="Nästa aktivitet"><Input value={nextAction} onChange={e=>setNextAction(e.target.value)}/></F><F label="Datum"><Input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></F>{selected&&decisions.get(selected.id)?.blocked&&<p role="alert">Företaget har spärrats för prospektering. Återöppna kontakten före bearbetning.</p>}<Button disabled={busy||!!(selected&&decisions.get(selected.id)?.blocked)||!st.settings.owners.includes(owner)||!nextAction.trim()||!nextDate} onClick={async()=>{if(await save('lead_convert',{id:selected?.id,owner,contactIndex:Number(contactIndex),nextAction,nextDate},false))setSelected(null)}}>Lägg i nykundsbearbetning</Button></div></SheetContent></Sheet>
  <Sheet open={!!decision} onOpenChange={v=>{if(!v)setDecision(null)}}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>{decision?.blocked?'Spärra prospektering':'Återöppna kontakt'} · {decisionLead?.name}</SheetTitle><SheetDescription>{decision?.blocked?'Företaget tas bort från det vanliga sökurvalet och kan inte läggas i nykundsbearbetning här.':'Beskriv varför prospektering får återupptas. Den tidigare spärren finns kvar i historiken.'}</SheetDescription></SheetHeader><div className="sheet-body business-ui">
   {decisionLead&&<p className="biz-callout">{leadOrganizationKey(decisionLead.organizationNumber)?'Beslutet följer samma organisationsnummer även vid återimport från en annan källa.':decisionLead.sourceRecordId?'Beslutet följer denna datakälla och dess företags-ID. Utan organisationsnummer kan andra källor inte kopplas säkert.':'Beslutet gäller denna post. Organisationsnummer och käll-ID saknas; en återimport kan inte identifieras säkert.'}</p>}
   <F label="Orsak *"><Textarea value={reason} maxLength={4000} onChange={e=>setReason(e.target.value)} placeholder={decision?.blocked?'Ex. Företaget har bett oss att inte kontakta dem':'Vilket underlag tillåter kontakt igen?'}/></F>
   {conflict&&<div className="record-conflict" role="alert"><b>Underlaget har ändrats</b><p>Din orsak finns kvar. Läs in aktuell kontaktstatus och granska innan du sparar.</p><Button variant="outline" onClick={()=>{if(decision&&decisionLead)setDecision({...decision,basis:leadContactBasis(st,decision.id)})}}>Läs in aktuell kontaktstatus</Button></div>}
   {decisionAlreadyApplied&&!conflict&&<p role="status">{decision?.blocked?'Företaget är redan spärrat.':'Kontakten är redan återöppnad.'} Stäng dialogen för att granska företagets aktuella status.</p>}
   <div className="biz-buttons"><Button variant="outline" disabled={busy} onClick={()=>setDecision(null)}>Stäng</Button><Button disabled={busy||conflict||decisionAlreadyApplied||!reason.trim()||!decisionLead} onClick={async()=>{if(decision&&await save('lead_contact',{id:decision.id,blocked:decision.blocked,reason,expectedContext:decision.basis},false))setDecision(null)}}>{busy?'Sparar…':decision?.blocked?'Spara kontaktspärr':'Återöppna kontakt'}</Button></div>
   {!!history.length&&<div><h3>Spärrhistorik</h3>{[...history].reverse().map(entry=><div className="lead-contact" key={entry.id}><b>{entry.blocked?'Prospektering spärrad':'Kontakt återöppnad'}</b><p>{entry.reason}</p><small>{entry.byName} · {new Date(entry.at).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm'})}</small></div>)}</div>}
  </div></SheetContent></Sheet>
 </section>;
}
