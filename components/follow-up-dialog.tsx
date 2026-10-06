'use client';
import {useEffect,useState,useRef} from 'react';
import {Phone,Check} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';import {Textarea} from '@/components/ui/textarea';import {Checkbox} from '@/components/ui/checkbox';
import {BusinessField as F,Pick} from './business-ui';
import {day,plusDays,type State,type Deal} from '@/lib/crm';
import {followupBasis,protectedFollowUp} from '@/lib/follow-up';
import {DraftStatus,useDrafts} from './draft-workspace';
import {FollowUpSaveStatus,type FollowUpFailure,type FollowUpOperation,type FollowUpDetails} from './follow-up-save-status';
export type FollowUpSaveAction=(type:string,data:unknown,close?:boolean,onFailure?:(status:number,message?:string)=>void)=>Promise<boolean>;
export function FollowUpDialog({st,taskId,save,busy,onClose,onDeal,onWorkflow}:{st:State;taskId:string;save:FollowUpSaveAction;busy:boolean;onClose:()=>void;onDeal:(d:Deal)=>void;onWorkflow:()=>void}){
 const task=st.tasks.find(t=>t.id===taskId)!,customer=st.customers.find(c=>c.id===task.customerId),deal=st.deals.find(d=>d.id===task.dealId),w=useDrafts(),current=w.records.find(d=>d.kind==='followup'&&d.context===taskId),[failure,setFailure]=useState<FollowUpFailure|null>(null),[closeFailure,setCloseFailure]=useState(''),[operation,setOperation]=useState<FollowUpOperation>(''),[submitting,setSubmitting]=useState(false),lock=useRef(false),alive=useRef(true),attempt=useRef(0),readonly=st.viewer?.role==='reader';
 const draftDetails=useRef<HTMLDivElement>(null),recordDetails=useRef<HTMLDivElement>(null),saveDetails=useRef<HTMLDivElement>(null),closeDetails=useRef<HTMLDivElement>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;attempt.current++;}},[]);
 busy=busy||submitting;
 const protectedWork=protectedFollowUp(task),canonical=['quote','discovery','csm','prospecting'].includes(task.kind);
 useEffect(()=>{if(w.ready&&!current&&!task.done&&!readonly)w.create('followup',taskId,{taskId,expectedContext:followupBasis(st,taskId),outcome:'contact',occurredOn:day(),note:'',completed:false,nextAction:task.title,nextDate:plusDays(day(),1)},'Uppföljning · '+(customer?.name||task.title));},[w.ready,current?.id,taskId,task.done]);
 async function leave(next=onClose){
  if(lock.current)return;if(!current||readonly){next();return}
  const id=current.id,run=++attempt.current;lock.current=true;setSubmitting(true);setOperation('leave');
  try{const ref=await w.flush(id);if(!alive.current||attempt.current!==run)return;if(ref)next();else setCloseFailure(w.get(id)?.error||'Det privata utkastet kunde inte sparas. Försök igen innan du stänger.');}
  finally{lock.current=false;if(alive.current&&attempt.current===run){setSubmitting(false);setOperation('');}}
 }
 if(!current)return <Dialog open onOpenChange={v=>{if(!v)onClose()}}><DialogContent><DialogHeader><DialogTitle>Följ upp aktiviteten</DialogTitle><DialogDescription>{task.title}</DialogDescription></DialogHeader>{readonly?<p>Ditt konto har läsbehörighet.</p>:task.done?<p>Aktiviteten är redan avslutad.</p>:<DraftStatus id=""/>}</DialogContent></Dialog>;
 const v=current.data,changed=v.expectedContext!==followupBasis(st,taskId),required=canonical||protectedWork||v.outcome==='no_reply'||!v.completed;
 const update=(key:string,value:unknown)=>w.update(current.id,{...v,[key]:value});
 async function submit(){
  if(lock.current||readonly)return;
  const id=current!.id,run=++attempt.current;lock.current=true;setSubmitting(true);setFailure(null);setOperation('draft');
  try{
   const ref=await w.flush(id);if(!alive.current||attempt.current!==run)return;
   if(!ref){setFailure({source:'draft',message:w.get(id)?.error||'Det privata utkastet kunde inte sparas. Försök igen.'});return;}
   setOperation('crm');let reported=false,message='';
   const ok=await save('follow_up',{...v,completed:protectedWork?false:v.completed,nextDate:v.nextAction.trim()?v.nextDate:'',draft:ref},false,(_status,text)=>{reported=true;message=text||'';});
   if(!alive.current||attempt.current!==run)return;
   if(ok){w.consume(id);onClose();}
   else setFailure({source:reported?'crm':'unavailable',message:message||'Uppföljningen kunde inte sparas just nu. Dina uppgifter finns kvar här. Försök igen.'});
  }finally{lock.current=false;if(alive.current&&attempt.current===run){setSubmitting(false);setOperation('');}}
 }
 function showDetails(details:FollowUpDetails){const target={draft:draftDetails,record:recordDetails,save:saveDetails,close:closeDetails}[details].current;if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}}
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)void leave()}}><DialogContent className="follow-dialog business-ui"><DialogHeader><DialogTitle><Phone size={20}/>Följ upp {task.kind==='quote'?'offerten':'kundkontakten'}</DialogTitle><DialogDescription>{customer?.name} · {task.owner}</DialogDescription></DialogHeader><div className="follow-context"><b>{task.title}</b>{deal&&<span>{deal.title}</span>}</div><div className="follow-status-details" ref={draftDetails} tabIndex={-1} aria-label="Besked och versioner för ditt privata utkast"><DraftStatus id={current.id} disabled={busy} onClosed={onClose}/></div><form onSubmit={e=>{e.preventDefault();void submit()}}><fieldset disabled={busy||current.status==='conflict'}><div className="biz-grid"><F label="Vad hände?"><Pick label="Resultat av uppföljning" value={v.outcome} onChange={value=>update('outcome',value)} items={[{id:'contact',label:'Vi hade kontakt'},{id:'no_reply',label:'Jag fick inget svar'},{id:'internal',label:'Jag arbetade med uppgiften'}]}/></F><F label="Datum"><Input type="date" required max={day()} value={v.occurredOn} onChange={e=>update('occurredOn',e.target.value)}/></F></div><F label={v.outcome==='contact'?'Vad kom ni överens om?':'Kort anteckning'}><Textarea autoFocus required rows={4} maxLength={49000} value={v.note} onChange={e=>update('note',e.target.value)} placeholder="Kundens besked, frågor och vad du lovade…"/></F>
 {!protectedWork&&<><label className="check-field"><Checkbox checked={v.completed} onCheckedChange={value=>update('completed',value===true)}/>Den tidigare aktiviteten är utförd</label><p className="biz-hint">{v.completed?'Den avslutas när du sparar.':'Den ligger kvar och får nästa datum och aktivitet nedan.'}</p></>}
 {protectedWork&&<p className="biz-callout">Kontakten sparas här. Kontrollpunkter, kundärenden och inköpsbehov avslutas i sitt arbetsflöde.</p>}
 <F label={'Nästa aktivitet'+(required?' *':' (valfritt)')}><Input required={required} maxLength={240} value={v.nextAction} onChange={e=>update('nextAction',e.target.value)} placeholder="Till exempel: Skicka uppdaterat prisförslag"/></F>{(required||v.nextAction.trim())&&<F label="När ska du göra det?"><Input required type="date" min={day()} value={v.nextDate} onChange={e=>update('nextDate',e.target.value)}/></F>}{v.outcome==='no_reply'&&<p className="biz-hint">Kontaktförsöket sparas. Senaste kundkontakt ändras först när ni har haft kontakt.</p>}</fieldset>
 {changed&&<div className="record-conflict follow-status-details" ref={recordDetails} tabIndex={-1} aria-label="Ändrat CRM-underlag"><b>Aktiviteten har ändrats</b><p>Läs in det senaste nästa steget. Din anteckning och ditt kontaktbesked behålls.</p><Button type="button" disabled={busy||task.done} variant="outline" onClick={()=>w.update(current.id,{...v,expectedContext:followupBasis(st,taskId),nextAction:task.title,nextDate:task.due<day()?day():task.due,completed:false})}>Läs in aktuellt nästa steg</Button>{task.done&&<p>Aktiviteten är redan avslutad. Din text finns kvar som privat utkast.</p>}</div>}
 {failure&&<div className="error follow-status-details" ref={saveDetails} tabIndex={-1} aria-label="Besked från senaste sparförsöket"><b>{failure.source==='crm'?'CRM-besked':failure.source==='draft'?'Utkastet kunde inte sparas':'Sparförsöket kunde inte startas'}</b><p>{failure.message}</p></div>}
 {closeFailure&&<div className="error follow-status-details" ref={closeDetails} tabIndex={-1} aria-label="Besked från stängningsförsöket"><b>Utkastet kunde inte sparas inför stängning</b><p>{closeFailure}</p></div>}
 <div className="follow-footer"><FollowUpSaveStatus draftId={current.id} busy={busy} readonly={readonly} operation={operation} changed={changed} done={task.done} failure={failure} closeFailure={closeFailure} onDetails={showDetails}/><Button type="button" variant="outline" disabled={busy} onClick={()=>void leave()}>{closeFailure?'Försök spara utkast & stäng':'Spara utkast & stäng'}</Button><Button type="submit" disabled={busy||changed||task.done||current.status==='conflict'||!v.note.trim()||st.viewer?.role==='reader'}><Check size={16}/>{busy?'Sparar…':'Spara uppföljning & nästa steg'}</Button></div></form>
 {(protectedWork||task.kind==='prospecting'||task.kind==='csm')&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>void leave(onWorkflow)}>Hantera {task.kind==='onboarding'?'nya kundens checklista':task.kind.startsWith('year:')?'inköpsbehovet':task.kind==='prospecting'?'bearbetningen':'kundplanen'}</Button>}
 {deal&&!['won','lost'].includes(deal.stage)&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>void leave(()=>onDeal(deal))}>Öppna offerten</Button>}
 </DialogContent></Dialog>;
}
