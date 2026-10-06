'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Check,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {PROSPECT_STAGES,ONBOARDING_CHECKS,day,label,type State,type Customer} from '@/lib/crm';
import {customerWorkflowBasis,recordBasis} from '@/lib/record-conflicts';
import {CustomerWorkflowDraftEnvelopeSchema,type CustomerWorkflowDraftEnvelope,type CustomerWorkflowDraftKind} from '@/lib/customer-workflow-drafts';
import {useDrafts,DraftStatus} from './draft-workspace';

export type WorkflowDraftRequest={customerId:string;kind:CustomerWorkflowDraftKind;draftId?:string};
export type WorkflowSaveControl={workflowDraft:{id:string;revision:number};onFailure?:(status:number,message?:string)=>void};
export type WorkflowSave=(type:string,data:unknown,close?:boolean,control?:WorkflowSaveControl)=>Promise<boolean>;
const labels={plan:'Kundplan',prospecting:'Prospektering',onboarding:'Onboarding'};
const date=(s:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'}):'Inte planerat';
function Field({title,children}:{title:string;children:ReactNode}){return <label className="wf-field"><span>{title}</span>{children}</label>}
function Pick({value,options,onChange,title}:{value:string;options:{id:string;label:string}[];onChange:(s:string)=>void;title:string}){return <Select value={value||'_empty'} onValueChange={s=>onChange(s==='_empty'?'':s)}><SelectTrigger aria-label={title}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem value={o.id||'_empty'} key={o.id}>{o.label}</SelectItem>)}</SelectContent></Select>}
function initialValues(c:Customer,kind:CustomerWorkflowDraftKind){return structuredClone(kind==='prospecting'?c.prospecting:kind==='onboarding'?c.onboarding:{...c.plan,nextReview:c.nextReview,expectedOrder:c.expectedOrder,reviewDays:c.reviewDays,reviewed:false})}
function CurrentWorkflowValues({c,kind}:{c:Customer;kind:CustomerWorkflowDraftKind}){
 const v=initialValues(c,kind) as Record<string,any>;
 const fields=kind==='plan'?[['goal','Mål för samarbetet'],['ordering','Beställningar och köpmönster'],['nextNeed','Nästa inköpsbehov'],['nextNeedDate','Datum för behovet'],['expectedOrder','Förväntat återköp'],['nextAction','Nästa kundaktivitet'],['nextReview','Nästa kundavstämning'],['reviewDays','Kontaktintervall, dagar'],['issueStatus','Ärendestatus'],['issue','Kundärende'],['issueAction','Nästa åtgärd'],['issueOwner','Åtgärdsansvarig'],['issueDue','Åtgärdas senast']]:kind==='prospecting'?[['stage','Bearbetningsstatus'],['reason','Varför företaget passar'],['need','Bekräftat behov'],['scope','Omfattning eller budget'],['timing','När lösningen behövs'],['nextAction','Nästa aktivitet'],['nextDate','Nästa kontaktdatum'],['outcomeReason','Orsak till paus eller avslut']]:[['owner','Onboardingansvarig'],['due','Klart senast'],['feedback','Kundens återkoppling'],['nextNeed','Nästa behov']];
 const dates=new Set(['nextNeedDate','expectedOrder','nextReview','issueDue','timing','nextDate','due']);
 return <div className="wf-inset"><b>Aktuellt sparat underlag</b><p>Kundansvarig: {c.owner}</p><dl>{fields.map(([key,title])=>{const text=dates.has(key)?date(v[key]||''):key==='stage'?label(PROSPECT_STAGES,v[key]):key==='issueStatus'?label([{id:'none',label:'Inget ärende'},{id:'open',label:'Öppet – kräver åtgärd'},{id:'resolved',label:'Löst'}],v[key]):String(v[key]??'')||'Inte angivet';return <div key={key} className="mb-3"><dt className="font-medium">{title}</dt><dd className="whitespace-pre-wrap break-words">{text}</dd></div>})}</dl>{kind==='plan'&&<><h4>Viktiga kontaktpersoner</h4>{c.plan.contacts.length?c.plan.contacts.map((p,i)=><p key={i}>{[p.name,p.role,p.email,p.phone].filter(Boolean).join(' · ')}</p>):<p>Inga kontaktpersoner i kundplanen.</p>}<p>Senast sparade kundavstämning: {date(c.plan.lastReview)}</p></>}{kind==='onboarding'&&<><h4>Kontrollpunkter</h4>{ONBOARDING_CHECKS.map(x=><p key={x.id}>{c.onboarding.checks[x.id]?'Kontrollerad: ':'Inte kontrollerad: '}{x.label}</p>)}<p>{c.onboarding.completedAt?'Onboarding avslutad: '+new Date(c.onboarding.completedAt).toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm',day:'numeric',month:'short',year:'numeric'}):'Onboarding är inte avslutad.'}</p></>}</div>
}
function resumedEnvelope(value:CustomerWorkflowDraftEnvelope,kind:CustomerWorkflowDraftKind):CustomerWorkflowDraftEnvelope{
 if(kind!=='plan')return value;
 const {reviewedOn:_,...rest}=value;
 return {...rest,values:{...value.values,reviewed:false}};
}

export function CustomerWorkflowDraft({st,request,busy,onSave,onClose,onCustomer,onOpenPlan,refresh}:{st:State;request:WorkflowDraftRequest;busy:boolean;onSave:WorkflowSave;onClose:()=>void;onCustomer:(id:string)=>void;onOpenPlan:()=>void;refresh:()=>Promise<void>}){
 const w=useDrafts(),enabled=['admin','seller'].includes(st.viewer?.role||''),c=st.customers.find(c=>c.id===request.customerId);
 const [draftId,setDraftId]=useState(''),[working,setWorking]=useState(false),[failure,setFailure]=useState(''),[choices,setChoices]=useState<string[]>([]),[discard,setDiscard]=useState(false),[reviewBasis,setReviewBasis]=useState(''),[basisReviewed,setBasisReviewed]=useState(false);
 const initialized=useRef(false),lock=useRef(false),alive=useRef(true),ws=useRef(w);ws.current=w;
 const [statusNode,setStatusNode]=useState<HTMLDivElement|null>(null),[footerNode,setFooterNode]=useState<HTMLDivElement|null>(null);
 const sheet=useRef<HTMLDivElement>(null),draftDetails=useRef<HTMLDivElement>(null),contextDetails=useRef<HTMLDivElement>(null),messageDetails=useRef<HTMLParagraphElement>(null);
 const retry=useRef<{payload:Record<string,unknown>;draft:{id:string;revision:number};complete:boolean}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const local=enabled?w.records.find(d=>d.id===draftId&&d.kind===request.kind&&d.context===request.customerId):undefined;
 const parsed=local?CustomerWorkflowDraftEnvelopeSchema.safeParse(local.data):null;
 const envelope=parsed?.success?parsed.data:undefined,values=envelope?.values||{};
 const basis=c?customerWorkflowBasis(st,request.kind,c.id):'',conflict=!!envelope&&envelope.expectedContext!==basis;
 const locked=busy||working||!enabled;
 const contacts=Array.isArray(values.contacts)?values.contacts.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)) as Record<string,any>[]:[];
 const checks=values.checks&&typeof values.checks==='object'?values.checks as Record<string,boolean>:{};
 // Measure both sticky regions so native focus and detail links stay between them.
 useEffect(()=>{
  if(!enabled||!c||!sheet.current||!statusNode||!footerNode)return;
  const panel=sheet.current,top=statusNode,bottom=footerNode;
  const measure=()=>{panel.style.setProperty('--wf-status-height',top.getBoundingClientRect().height+'px');panel.style.setProperty('--wf-footer-height',bottom.getBoundingClientRect().height+'px')};
  measure();const observer=new ResizeObserver(measure);observer.observe(top);observer.observe(bottom);return()=>observer.disconnect();
 },[enabled,c?.id,statusNode,footerNode]);
 function showDetails(target:HTMLElement|null){if(!target)return;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}
 const privateStatus=!w.ready?w.error?'Ditt privata utkast kunde inte hämtas':'Hämtar ditt privata utkast…':!local?choices.length?'Välj ett privat utkast':'Öppnar ditt privata utkast…':!envelope?'Det sparade utkastet kunde inte läsas':local.status==='saved'?'Privat utkast sparat':local.status==='pending'?'Privata ändringar väntar på sparning':local.status==='saving'?'Sparar privat utkast…':local.status==='conflict'?'Granska versionerna av ditt privata utkast':'Ditt privata utkast kunde inte sparas';
 const statusMessage=busy?'Sparar i kundens CRM…':working?'Kontrollerar underlaget…':local?.status==='conflict'?'Välj utkastversion innan du fortsätter.':conflict?'Kundunderlaget har ändrats. Granska innan du sparar.':failure?'Läs beskedet innan du fortsätter.':'Kundens CRM ändras först när du sparar där.';


 async function resume(id:string){
  if(lock.current||!enabled)return;lock.current=true;setWorking(true);setDraftId(id);setFailure('');
  try{await ws.current.reconcile(id);if(!alive.current)return;const current=ws.current.get(id),p=current&&current.kind===request.kind&&current.context===request.customerId&&CustomerWorkflowDraftEnvelopeSchema.safeParse(current.data);if(p&&p.success){const next=resumedEnvelope(p.data,request.kind);if(recordBasis(next)!==recordBasis(p.data))ws.current.update(id,next);}else setFailure('Utkastet saknas eller hör till ett annat kundarbete. Öppna rätt utkast från Min dag.');}
  finally{if(alive.current){lock.current=false;setWorking(false)}}
 }
 useEffect(()=>{
  if(initialized.current||!w.ready||!enabled||!c)return;
  initialized.current=true;
  if(request.draftId){void resume(request.draftId);return}
  const existing=w.records.filter(d=>d.kind===request.kind&&d.context===c.id);
  if(existing.length>1){setChoices(existing.map(d=>d.id));return}
  if(existing.length===1){void resume(existing[0].id);return}
  const id=w.create(request.kind,c.id,{values:initialValues(c,request.kind),expectedContext:customerWorkflowBasis(st,request.kind,c.id),customerName:c.name},labels[request.kind]+' · '+c.name.replace(' · exempel',''));
  if(id)setDraftId(id);else{initialized.current=false;setFailure('Ditt privata utkast kunde inte öppnas. Försök igen när utkasten har hämtats.')}
 },[w.ready,w.records,enabled,c,request]);
 useEffect(()=>{setReviewBasis('');setBasisReviewed(false)},[basis]);
 // The checkbox describes a contact today. Resuming a draft never records it.
 function update(key:string,value:unknown){
  if(locked||lock.current||!envelope)return;
  const next:CustomerWorkflowDraftEnvelope={...envelope,values:{...values,[key]:value}};
  if(key==='reviewed'){if(value===true)next.reviewedOn=day();else delete next.reviewedOn}
  w.update(draftId,next);retry.current=null;setFailure('');setBasisReviewed(false);
 }
 const field=(key:string,title:string,type='text')=><Field title={title}><Input type={type} value={String(values[key]??'')} onChange={e=>update(key,type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/></Field>;
 const area=(key:string,title:string)=><Field title={title}><Textarea rows={3} value={String(values[key]??'')} onChange={e=>update(key,e.target.value)}/></Field>;
 async function close(after?:()=>void){
  if(lock.current||busy||!enabled)return;lock.current=true;setWorking(true);setFailure('');
  try{if(draftId&&await w.flush(draftId)===null){if(alive.current)setFailure('Utkastet kunde inte sparas. Dina uppgifter finns kvar här. Försök igen innan du stänger.');return}if(alive.current){onClose();after?.();}}
  finally{if(alive.current){lock.current=false;setWorking(false)}}
 }
 async function submit(complete=false){
  if(lock.current||busy||!enabled||!c||!envelope||(!retry.current&&(conflict||local?.status==='conflict')))return;
  lock.current=true;setWorking(true);setFailure('');
  try{
   let attempt=retry.current?.complete===complete?retry.current:null;
   if(!attempt){
    if(!await w.reconcile(draftId)){setFailure('Utkastet har ändrats på en annan enhet. Dina uppgifter finns kvar. Välj vilken version du vill använda.');return}
    const draft=await w.flush(draftId);if(!alive.current)return;if(!draft){setFailure('Det privata utkastet kunde inte sparas. Dina uppgifter finns kvar.');return}
    const saved=w.get(draftId),p=saved&&CustomerWorkflowDraftEnvelopeSchema.safeParse(saved.data);if(!p?.success)return;
    if(p.data.expectedContext!==customerWorkflowBasis(st,request.kind,c.id)){setFailure('Kundunderlaget har ändrats. Granska den aktuella versionen innan du sparar.');return}
    const data=p.data.values;
    if(request.kind==='plan'&&data.reviewed===true&&p.data.reviewedOn!==day()){setFailure('Bekräfta på nytt att en kundavstämning genomfördes idag.');return}
    const payload=request.kind==='plan'?{customerId:c.id,expectedContext:p.data.expectedContext,plan:data,nextReview:data.nextReview,expectedOrder:data.expectedOrder,reviewDays:data.reviewDays,reviewed:data.reviewed??false}:{customerId:c.id,expectedContext:p.data.expectedContext,[request.kind]:data,complete};
    attempt={payload,draft,complete};
   }
   let status=0,message='';
   const ok=await onSave(request.kind,attempt.payload,false,{workflowDraft:attempt.draft,onFailure:(s,text)=>{status=s;message=text||''}});
   if(!alive.current)return;
   if(ok){w.consume(draftId);retry.current=null;onClose();return}
   if(status===0||status>=500){retry.current=attempt;setFailure('Sparandet kunde inte bekräftas. Dina uppgifter finns kvar. Försök spara igen med samma uppgifter.'+(message?' '+message:''));}
   else{retry.current=null;if(status===409)await w.reconcile(draftId);setFailure('Inte sparat i kundens CRM. Dina uppgifter finns kvar. '+(message||'Kontrollera underlaget innan du försöker igen.'));}
  }finally{if(alive.current){lock.current=false;setWorking(false)}}
 }
 async function adoptBasis(){
  if(locked||!envelope||!basisReviewed||reviewBasis!==basis)return;
  w.update(draftId,{...resumedEnvelope(envelope,request.kind),expectedContext:basis});retry.current=null;setReviewBasis('');setBasisReviewed(false);setFailure('Dina uppgifter finns kvar. Granska dem mot kundens aktuella underlag innan du sparar i CRM.');
 }
 async function remove(){
  if(lock.current||busy||!enabled)return;lock.current=true;setWorking(true);
  try{const ok=await w.archive(draftId);if(alive.current){if(ok)onClose();else setFailure('Utkastet kunde inte tas bort. Det finns kvar.');}}finally{if(alive.current){lock.current=false;setWorking(false)}}
 }
 return <Sheet open onOpenChange={v=>{if(!v){if(!enabled)onClose();else if(!locked)void close()}}}><SheetContent ref={sheet} className="crm-sheet wf-sheet" showCloseButton={!locked||!enabled} onEscapeKeyDown={e=>{if(locked&&enabled)e.preventDefault()}} onPointerDownOutside={e=>{if(locked&&enabled)e.preventDefault()}}><SheetHeader><SheetDescription>{enabled?'Privat utkast · bara synligt för dig. Kundens CRM ändras först när du sparar i CRM.':'Privata utkast kräver sälj- eller administratörsbehörighet.'}</SheetDescription><SheetTitle>{enabled?labels[request.kind]+' · '+(c?.name.replace(' · exempel','')||'Kund saknas'):'Kundarbete'}</SheetTitle></SheetHeader>
 {!enabled?<div className="sheet-body"><p className="error" role="alert">Ditt konto har inte behörighet att öppna privata utkast.</p><Button onClick={onClose}>Stäng</Button></div>:!c?<div className="sheet-body"><p className="error" role="alert">Kunden finns inte längre i arbetsytan. Utkastet har inte publicerats.</p><Button onClick={onClose}>Stäng</Button></div> :<><div ref={setStatusNode} tabIndex={-1} role="group" aria-label="Sparstatus för privat kundarbete" className="wf-save-status" data-state={conflict?'conflict':failure?'notice':local&&!envelope?'error':local?.status||(!w.ready&&w.error?'error':'pending')}>
 <div className="wf-save-summary" role="status" aria-live="polite" aria-atomic="true"><strong>{privateStatus}</strong><span>{statusMessage}</span></div>
 {!locked&&(local?.status==='conflict'?<Button type="button" variant="outline" onClick={()=>showDetails(draftDetails.current)}>Granska utkast</Button>:conflict?<Button type="button" variant="outline" onClick={()=>showDetails(contextDetails.current)}>Granska kundunderlag</Button>:local?.status==='error'?<Button type="button" variant="outline" onClick={async()=>{statusNode?.focus({preventScroll:true});const saved=await w.flush(draftId);if(saved&&alive.current)setFailure('')}}>Försök spara utkast</Button>:local&&!envelope?<Button type="button" variant="outline" onClick={()=>showDetails(draftDetails.current)}>Granska underlag</Button>:failure?<Button type="button" variant="outline" onClick={()=>showDetails(messageDetails.current)}>Visa besked</Button>:!w.ready&&w.error?<Button type="button" variant="outline" onClick={()=>{statusNode?.focus({preventScroll:true});w.retry()}}>Hämta utkast igen</Button>:null)}
 </div><form className="sheet-body" onSubmit={e=>{e.preventDefault();void submit(retry.current?.complete??false)}}><fieldset disabled={locked} className="form-input-lock">
 <div ref={draftDetails} tabIndex={-1} aria-label="Detaljer för privat utkast"><DraftStatus id={draftId} disabled={locked} onClosed={onClose} onResolved={data=>{const p=CustomerWorkflowDraftEnvelopeSchema.safeParse(data);if(p.success)w.update(draftId,resumedEnvelope(p.data,request.kind));retry.current=null;setReviewBasis('');setBasisReviewed(false)}}/>{local&&!envelope&&<p className="error" role="alert">Utkastets underlag kunde inte läsas. Dina sparade uppgifter har inte skrivits över.</p>}</div>
 {!draftId&&choices.length>0&&<div className="wf-inset"><b>Välj vilket privat utkast du vill fortsätta med</b><p>Det finns flera utkast för samma kund. Dina uppgifter slås inte ihop automatiskt.</p>{choices.map(id=>{const d=w.records.find(d=>d.id===id);return d?<Button key={id} type="button" variant="outline" onClick={()=>{setChoices([]);void resume(id)}}>{d.title} · {new Date(d.updatedAt).toLocaleString('sv-SE')}</Button>:null})}</div>}
 {envelope&&<><div className="wf-editor-owner"><span>Kontakt: {c.contact||'Saknas'}<br/>Kundansvarig: {c.owner}</span><Button variant="outline" type="button" onClick={()=>void close(()=>onCustomer(c.id))}>Kundkort</Button></div>
 {request.kind==='prospecting'&&<><Field title="Steg i bearbetningen"><Pick title="Steg" value={String(values.stage||'')} onChange={s=>update('stage',s)} options={PROSPECT_STAGES}/></Field>{area('reason','Varför passar företaget? *')}{area('need','Bekräftat behov')}{field('scope','Ungefärligt antal, omfattning eller budget')}{field('timing','När behöver kunden lösningen?','date')}{field('nextAction','Nästa konkreta aktivitet *')}{field('nextDate','Nästa kontaktdatum *','date')}{['paused','not_relevant'].includes(String(values.stage))&&area('outcomeReason','Orsak till paus eller avslut *')}<div className="wf-inset"><b>När behovet är bekräftat</b><p>Spara underlaget i kundens CRM och skapa sedan en affär. Behov, omfattning, leveranstid och nästa aktivitet följer med.</p>{c.prospecting.stage==='qualified'&&!c.prospecting.convertedDealId&&<p>Skapa affären från det sparade behovet i prospektets översikt när du har sparat bearbetningen.</p>}</div></>}
 {request.kind==='onboarding'&&<><div className="wf-form-grid"><Field title="Ansvarig för onboarding *"><Pick value={String(values.owner||'')} onChange={v=>update('owner',v)} title="Onboardingansvarig" options={[{id:'',label:'Välj ansvarig'},...st.settings.owners.map(o=>({id:o,label:o}))]}/></Field>{field('due','Klart senast *','date')}</div><div className="wf-checklist">{ONBOARDING_CHECKS.map(x=><label key={x.id}><Checkbox checked={checks[x.id]===true} onCheckedChange={v=>update('checks',{...checks,[x.id]:v===true})}/><span>{x.label}</span></label>)}</div><p className="wf-hint">Markera bara sådant som är kontrollerat. För kunduppföljningen måste första leveransen också vara registrerad som levererad. Att spara utkast eller checklista slutför inte onboarding.</p>{area('feedback','Vad sa kunden om första leveransen?')}{area('nextNeed','Nästa behov eller vad vi behöver undersöka')}<div className="wf-inset"><b>Överlämning till kundvård</b><p>Nästa avstämning: {date(c.nextReview)}<br/>Nästa aktivitet: {c.plan.nextAction||'Inte planerad'}</p><Button type="button" variant="outline" onClick={()=>void close(onOpenPlan)}>Planera nästa kundkontakt</Button></div><Button className="wf-complete" type="button" disabled={conflict||local?.status==='conflict'} onClick={()=>void submit(true)}><Check size={16}/>Slutför onboarding & lämna över till CSM</Button></>}
 {request.kind==='plan'&&<>{area('goal','Vad ska samarbetet hjälpa kunden att uppnå?')}{area('ordering','Hur beställer kunden? Köpmönster och viktiga händelser')}<div className="wf-section-head"><h3>Viktiga kontaktpersoner</h3><Button type="button" variant="outline" size="sm" disabled={contacts.length>=20} onClick={()=>update('contacts',[...contacts,{name:'',role:'',email:'',phone:''}])}><Plus size={14}/>Kontakt</Button></div>{contacts.map((contact,i)=><div className="wf-contact-edit" key={i}><div className="wf-form-grid">{[{key:'name',title:'Namn *'},{key:'role',title:'Roll, t.ex. inköpare *'},{key:'email',title:'E-post'},{key:'phone',title:'Telefon'}].map(f=><Field key={f.key} title={f.title}><Input type={f.key==='email'?'email':'text'} value={String(contact[f.key]??'')} onChange={e=>update('contacts',contacts.map((v,j)=>j===i?{...v,[f.key]:e.target.value}:v))}/></Field>)}</div><Button type="button" variant="ghost" size="sm" onClick={()=>update('contacts',contacts.filter((_,j)=>i!==j))}>Ta bort kontakt från planen</Button></div>)}<h3>Nästa kontakt och inköpsbehov</h3>{area('nextNeed','Nästa sannolika inköpsbehov')}<div className="wf-form-grid">{field('nextNeedDate','När uppstår behovet?','date')}{field('expectedOrder','Förväntat återköpsdatum','date')}</div><p className="wf-hint">Ett daterat inköpsbehov skapar en uppgift 14 dagar i förväg när kundplanen sparas i CRM.</p>{field('nextAction','Nästa konkreta kundaktivitet *')}<div className="wf-form-grid">{field('nextReview','Nästa kundavstämning *','date')}{field('reviewDays','Kontaktintervall, dagar','number')}</div><label className="wf-checkbox"><Checkbox checked={values.reviewed===true&&envelope.reviewedOn===day()} onCheckedChange={v=>update('reviewed',v===true)}/>En kundavstämning genomfördes idag</label><p className="wf-hint">Bekräftelsen avmarkeras när du fortsätter ett utkast. Anteckningar och utkast räknas inte som kundkontakt.</p><h3>Kundärende eller missnöje</h3><Field title="Ärendestatus"><Pick title="Ärendestatus" value={String(values.issueStatus||'none')} onChange={v=>update('issueStatus',v)} options={[{id:'none',label:'Inget ärende'},{id:'open',label:'Öppet – kräver åtgärd'},{id:'resolved',label:'Löst'}]}/></Field>{!!values.issueStatus&&values.issueStatus!=='none'&&<>{area('issue','Vad behöver lösas?')}{field('issueAction','Nästa åtgärd')}<div className="wf-form-grid"><Field title="Ansvarig för åtgärden"><Pick title="Ärendeansvarig" value={String(values.issueOwner||'')} onChange={v=>update('issueOwner',v)} options={[{id:'',label:'Välj ansvarig'},...st.settings.owners.map(o=>({id:o,label:o}))]}/></Field>{field('issueDue','Åtgärdas senast','date')}</div></>}<div className="wf-inset"><b>Återköp och merförsäljning</b><p>Spara kundplanen i CRM och skapa sedan en separat affär från kundvårdsöversikten.</p></div></>}
 {conflict&&<div ref={contextDetails} tabIndex={-1} className="record-conflict" role="alert"><b>Kundens underlag har ändrats</b><p>Dina uppgifter finns kvar i det privata utkastet. Jämför med kundens aktuella version innan du väljer att använda den som underlag.</p><div className="wf-buttons"><Button type="button" variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(values,null,2));setFailure('Dina uppgifter är kopierade.')}catch{setFailure('Kunde inte kopiera. Markera och kopiera texten i formuläret.')}}}>Kopiera mina uppgifter</Button><Button type="button" variant="outline" onClick={async()=>{if(lock.current)return;lock.current=true;setWorking(true);try{await refresh();if(!alive.current)return;setReviewBasis('');setBasisReviewed(false);setFailure('Aktuellt kundunderlag har hämtats. Granska versionen nedan.')}finally{if(alive.current){lock.current=false;setWorking(false)}}}}>Hämta aktuellt kundunderlag</Button><Button type="button" onClick={()=>{setReviewBasis(basis);setBasisReviewed(false)}}>Granska aktuell kundversion</Button></div>{reviewBasis===basis&&<><CurrentWorkflowValues c={c} kind={request.kind}/><label className="wf-checkbox"><Checkbox checked={basisReviewed} onCheckedChange={v=>setBasisReviewed(v===true)}/>Jag har jämfört mina uppgifter med kundens aktuella version</label><Button type="button" disabled={!basisReviewed} onClick={()=>void adoptBasis()}>Använd aktuellt underlag och behåll mina uppgifter</Button></>}</div>}
 <div className="biz-buttons"><Button type="button" variant="ghost" onClick={()=>setDiscard(true)}>Ta bort privat utkast</Button>{discard&&<><span>Detta tar bort utkastet. Kundens sparade CRM-uppgifter ändras inte.</span><Button type="button" variant="outline" onClick={()=>void remove()}>Ja, ta bort utkast</Button><Button type="button" variant="ghost" onClick={()=>setDiscard(false)}>Behåll utkast</Button></>}</div></>}
 {failure&&<p ref={messageDetails} tabIndex={-1} className="error" role="alert">{failure}</p>}<div ref={setFooterNode} className="form-footer"><Button type="button" variant="outline" disabled={!draftId} onClick={()=>void close()}>Spara utkast & stäng</Button><Button type="submit" disabled={!envelope||(!retry.current&&(conflict||local?.status==='conflict'))}>{locked?'Sparar…':retry.current?(retry.current.complete?'Försök slutföra onboarding igen':'Försök spara i CRM igen'):'Spara '+(request.kind==='plan'?'kundplan':request.kind==='onboarding'?'checklista':'bearbetning')}</Button></div>
 </fieldset></form></>}
 </SheetContent></Sheet>;
}
