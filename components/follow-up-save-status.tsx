'use client';
import {Button} from './ui/button';
import {useDrafts} from './draft-workspace';

export type FollowUpFailure={source:'draft'|'crm'|'unavailable';message:string};
export type FollowUpOperation=''|'draft'|'crm'|'leave';
export type FollowUpDetails='draft'|'record'|'save'|'close';

// A later private autosave must not erase an unconfirmed CRM attempt or close.
// This component only presents status; existing handlers own every write/retry.
export function FollowUpSaveStatus({draftId,busy,readonly,operation,changed,done,failure,closeFailure,onDetails}:{draftId:string;busy:boolean;readonly:boolean;operation:FollowUpOperation;changed:boolean;done:boolean;failure:FollowUpFailure|null;closeFailure:string;onDetails:(details:FollowUpDetails)=>void}){
 const w=useDrafts(),d=w.records.find(row=>row.id===draftId);
 const privateText=readonly?'':!w.ready?w.error?'Ditt privata utkast kunde inte hämtas':'Hämtar ditt privata utkast…':!d?'':d.status==='saved'?'Privat utkast sparat':d.status==='pending'?'Privata ändringar väntar på sparning':d.status==='saving'?'Sparar privat utkast…':d.status==='conflict'?'Granska versionerna av ditt privata utkast':'Ditt privata utkast kunde inte sparas';
 const notice=readonly?'Ditt konto har läsbehörighet.':operation==='leave'?'Sparar privat utkast inför stängning…':operation==='draft'?'Sparar privat utkast före uppföljningen…':operation==='crm'?'Sparar uppföljningen i CRM…':busy?'Sparning pågår…':changed?'Aktiviteten har ändrats. Granska innan du sparar.':done?'Aktiviteten är redan avslutad. Din text finns kvar som privat utkast.':failure?.source==='crm'?'Sparningen i CRM kunde inte bekräftas. Uppgifterna finns kvar här.':failure?.source==='draft'?'Det privata utkastet kunde inte sparas vid senaste försöket.':failure?'Sparförsöket kunde inte startas. Uppgifterna finns kvar här.':closeFailure?'Utkastet kunde inte sparas inför stängning. Uppgifterna finns kvar här.':'';
 const closeNotice=!busy&&closeFailure&&(failure||changed||done)?'Senaste stängningsförsöket misslyckades. Försök spara utkastet igen.':'';
 const state=readonly?'readonly':changed||d?.status==='conflict'?'conflict':failure||closeFailure||d?.status==='error'||!w.ready&&!!w.error?'error':busy?'saving':d?.status||'clean';
 const details:FollowUpDetails|null=busy||readonly?null:d?.status==='conflict'?'draft':changed?'record':d?.status==='error'||!w.ready&&!!w.error?'draft':failure?'save':closeFailure?'close':null;
 const action=details==='draft'&&d?.status==='conflict'?'Granska utkast':details==='record'?'Granska ändrad aktivitet':'Visa besked';
 const timestamp=d?.status==='saved'&&d.updatedAt?new Date(d.updatedAt).toLocaleTimeString('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}):'';
 return <div className="follow-save-status" data-state={state} aria-label="Sparstatus för uppföljningen">
  <div className="follow-save-copy"><div role="status" aria-live="polite" aria-atomic="true"><span>{privateText}</span><span>{notice}</span>{closeNotice&&<span>{closeNotice}</span>}</div>
   {timestamp&&<span className="follow-save-time">Utkast sparat kl. {timestamp}</span>}
   {!readonly&&!notice&&<p>Spara uppföljningen nedan för att uppdatera CRM.</p>}
  </div>
  {details&&<Button type="button" variant="outline" size="sm" onClick={()=>onDetails(details)}>{action}</Button>}
 </div>;
}
