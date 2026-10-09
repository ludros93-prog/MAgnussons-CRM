'use client';
import {Button} from './ui/button';
import {useDrafts} from './draft-workspace';
import type {FormDraft} from './form-draft';

export type FormSaveFailure={draftId:string;source:'draft'|'crm';message:string};
export type FormCloseFailure={draftId:string;message:string};
export type FormStatusDetails='draft'|'record'|'save'|'close';

// Presentation only: persistence, retries and conflict decisions stay in the
// existing form and DraftStatus handlers. A private success cannot clear an
// unconfirmed CRM attempt or a failed close.
export function GenericFormSaveStatus({form,readonly,busy,failure,closeFailure,recordConflict,blockedNotice,onDetails}:{form:FormDraft;readonly:boolean;busy:boolean;failure?:FormSaveFailure|null;closeFailure?:FormCloseFailure|null;recordConflict:boolean;blockedNotice?:string;onDetails:(details:FormStatusDetails)=>void}){
 const w=useDrafts(),supported=['customer','deal','order','task','meeting','note'].includes(form.type),d=supported&&!readonly?w.records.find(row=>row.id===form.draftId):undefined;
 const privateText=readonly||!supported?'':!w.ready?w.error?'Ditt privata utkast kunde inte hämtas':'Hämtar ditt privata utkast…':!d?'':d.status==='saved'?'Privat utkast sparat':d.status==='pending'?'Privata ändringar väntar på sparning':d.status==='saving'?'Sparar privat utkast…':d.status==='conflict'?'Granska versionerna av ditt privata utkast':'Ditt privata utkast kunde inte sparas';
 const notice=readonly?'Ditt konto har läsbehörighet.':busy?'Sparning pågår…':recordConflict?'CRM-underlaget har ändrats. Granska innan du sparar.':blockedNotice|| (failure?.source==='crm'?'Sparningen i CRM kunde inte bekräftas. Uppgifterna finns kvar här.':failure?'Det privata utkastet kunde inte sparas vid senaste försöket.':closeFailure?'Utkastet kunde inte sparas inför stängning. Uppgifterna finns kvar här.':'');
 const privateLoadFailure=supported&&!readonly&&!w.ready&&!!w.error;
 const state=readonly?'readonly':d?.status==='conflict'||recordConflict||blockedNotice?'conflict':failure||closeFailure||d?.status==='error'||privateLoadFailure?'error':busy?'saving':d?.status||'clean';
 const details:FormStatusDetails|null=busy||readonly?null:d?.status==='conflict'?'draft':recordConflict?'record':supported&&(!w.ready&&w.error||d?.status==='error')?'draft':blockedNotice?null:failure?'save':closeFailure?'close':null;
 const action=details==='draft'&&d?.status==='conflict'?'Granska utkast':details==='record'?'Granska ändrat underlag':'Visa besked';
 const timestamp=d?.status==='saved'&&d.updatedAt?new Date(d.updatedAt).toLocaleTimeString('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}):'';
 return <div className="generic-form-save-status" data-state={state} aria-label="Sparstatus för formuläret">
  <div className="generic-form-save-copy">
   <div className="generic-form-save-summary" role="status" aria-live="polite" aria-atomic="true"><span>{privateText}</span><span>{notice}</span></div>
   {timestamp&&<span className="generic-form-save-time">Utkast sparat kl. {timestamp}</span>}
   {!readonly&&!notice&&<p className="generic-form-save-hint">{supported?'Spara nedan för att uppdatera CRM.':'Inställningarna sparas när du väljer Spara ändringar.'}</p>}
  </div>
  {details&&<Button type="button" variant="outline" size="sm" onClick={()=>onDetails(details)}>{action}</Button>}
 </div>;
}
