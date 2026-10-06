'use client';
import type {DraftRecord} from '@/lib/drafts';
import {validDate} from '@/lib/business';
import {ReceiptDraftEnvelopeSchema} from '@/lib/receipt-drafts';

type PreviewProps={draft:Pick<DraftRecord,'id'|'data'|'updatedAt'>;summaryId:string;identityId:string;titleId:string};
const dateFormat=new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Stockholm'});
const timeFormat=new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Europe/Stockholm'});
const dateText=(value:string)=>!value?'Ej angivet i utkastet':validDate.safeParse(value).success?dateFormat.format(new Date(value+'T12:00:00Z')):value+' (kontrollera datumet)';
const fullDateText=(value:string)=>value&&validDate.safeParse(value).success?dateText(value)+' · '+value:dateText(value);
function timestampText(value:unknown){
 if(typeof value!=='string')return 'Ändringstiden kunde inte läsas';
 const iso=/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value),date=new Date(value);
 return iso&&validDate.safeParse(value.slice(0,10)).success&&!Number.isNaN(date.getTime())?timeFormat.format(date)+' · svensk tid':value?value+' (tiden kunde inte tolkas)':'Uppdateringstid saknas';
}
function excerpt(value:string){const text=value.replace(/\s+/g,' ').trim(),characters=Array.from(text);return characters.length>140?characters.slice(0,140).join('')+'…':text;}
const fullText=(value:string)=>value===''?'Ej angivet i utkastet':value;

// Presentation only: inspecting or expanding a draft never saves, reconciles
// or changes its receipt basis. Invalid envelopes keep the existing recovery.
export function ReceiptDraftPreview({draft,summaryId,identityId,titleId}:PreviewProps){
 const parsed=ReceiptDraftEnvelopeSchema.safeParse(draft.data),v=parsed.success?parsed.data.values:null;
 const mode=v?.mode==='confirm'?'Utkast för mottagningsbesked':'Utkast för leveranskontroll',detailsLabelId=summaryId+'-details-label';
 return <div className="receipt-draft-preview">
  <div id={summaryId} className="receipt-draft-overview">
   {v?<><span className="receipt-draft-mode">{mode}</span><div><strong>{v.mode==='confirm'?'Mottagningsdatum i utkastet:':'Nästa kontroll i utkastet:'}</strong> {dateText(v.mode==='confirm'?v.deliveredDate:v.nextCheck)}</div>
    {v.mode==='confirm'?<><div><strong>Bekräftelseunderlag:</strong> {excerpt(v.receivedBy)||'Ej skrivet i utkastet'}</div>{excerpt(v.note)&&<div><strong>Anteckning:</strong> {excerpt(v.note)}</div>}</>:<div><strong>Att följa upp:</strong> {excerpt(v.message)||'Ej skrivet i utkastet'}</div>}
   </>:<div className="receipt-draft-unreadable">Utkastuppgifterna kunde inte läsas. Fortsätt för att visa och kopiera det bevarade underlaget.</div>}
   <div className="receipt-draft-updated">Ändrat: {timestampText(draft.updatedAt)}</div>
  </div>
  <details className="receipt-draft-details"><summary id={detailsLabelId} aria-labelledby={detailsLabelId+' '+titleId}>Visa alla utkastuppgifter</summary>
   <div className="receipt-draft-details-body"><div>Detta är ditt privata utkast. Uppgifterna är inte en registrering i CRM.</div>
    {v?<dl><div><dt>Läge i utkastet</dt><dd>{mode}</dd></div><div><dt>Mottagningsdatum i utkastet</dt><dd>{fullDateText(v.deliveredDate)}</dd></div><div><dt>Bekräftelseunderlag i utkastet</dt><dd>{fullText(v.receivedBy)}</dd></div><div><dt>Anteckning i utkastet</dt><dd>{fullText(v.note)}</dd></div><div><dt>Att följa upp i utkastet</dt><dd>{fullText(v.message)}</dd></div><div><dt>Nästa kontroll i utkastet</dt><dd>{fullDateText(v.nextCheck)}</dd></div></dl>:<div>Formatet behöver återställas innan uppgifterna kan ändras. Välj Fortsätt för att öppna de bevarade uppgifterna.</div>}
    <dl className="receipt-draft-metadata"><div><dt>Exakt ändringstid</dt><dd>{timestampText(draft.updatedAt)}{typeof draft.updatedAt==='string'&&draft.updatedAt&&<span className="receipt-draft-original-time">Originaltid: {draft.updatedAt}</span>}</dd></div><div><dt>Utkastets id</dt><dd id={identityId}>{draft.id}</dd></div></dl>
   </div>
  </details>
 </div>;
}
