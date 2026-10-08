'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {z} from 'zod';
import {toast} from 'sonner';
import {AlertTriangle,RefreshCw,UserRound,Users,ShieldCheck} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {type State} from '@/lib/crm';
import {RoleSchema} from '@/lib/operations';
import {AccountChangeReviewSchema,accountChangeNeedsReview,type AccountChangeReview} from '@/lib/account-change-review-schema';
import {BusinessField as F,Pick} from './business-ui';

const AccountSchema=z.object({id:z.string().min(1).max(100),email:z.string().email(),name:z.string().min(1).max(150),role:RoleSchema,owner:z.string().max(150),active:z.union([z.boolean(),z.literal(0),z.literal(1)]),connected:z.union([z.boolean(),z.literal(0),z.literal(1)]).optional(),expectedAccount:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const AccountsSchema=z.array(AccountSchema).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length&&new Set(rows.map(row=>row.email)).size===rows.length);
type Account={id:string;expectedAccount:string;email:string;name:string;role:z.infer<typeof RoleSchema>;owner:string;active:boolean;connected?:boolean};
type Profile='manager'|Account['role'];
type Review={key:string;data:AccountChangeReview};
const profileOf=(a:Account):Profile=>a.role==='admin'&&a.owner?'manager':a.role;
const roleLabel=(a:Account)=>({manager:'Ledning & säljare',admin:'Administratör',seller:'Säljare',reader:'Läsare',print:'Tryck',warehouse:'Lager',production:'Tryck & leverans'})[profileOf(a)];
const workspaceLabel=(id:string)=>id==='live'?'Verksamhetens arbetsyta':id==='demo'?'Demoarbetsyta':'Registrerad arbetsyta: '+id;
const newAccount=(name='',owner='',role:Account['role']='seller'):Account=>({id:'',expectedAccount:'',email:'',name,role,owner,active:true});
async function readAccounts(signal:AbortSignal):Promise<Account[]>{
 let response:Response;
 try{response=await fetch('/api/crm/members',{cache:'no-store',signal});}catch(cause){if(signal.aborted)throw cause;throw Error('Kontolistan kunde inte hämtas. Kontrollera anslutningen och försök igen.');}
 let data:unknown;
 try{data=await response.json();}catch{throw Error('Kontolistan kunde inte läsas. Hämta den igen innan du ändrar ett konto.');}
 if(!response.ok)throw Error(data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Kontolistan kunde inte hämtas.');
 const parsed=AccountsSchema.safeParse(data);
 if(!parsed.success)throw Error('Kontolistan har ett oväntat format. Hämta den igen innan du ändrar ett konto.');
 return parsed.data.map(account=>({...account,active:!!account.active,connected:!!account.connected}));
}

export function TeamAccounts({st,refresh}:{st:State;refresh:()=>Promise<void>}){
 const identity=JSON.stringify([st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'']),admin=st.viewer?.role==='admin';
 const current=useRef({identity,admin});current.current={identity,admin};
 const alive=useRef(true),loadOperation=useRef(0),reviewOperation=useRef(0),saveOperation=useRef(0),saveLock=useRef(false);
 const accountController=useRef<AbortController|null>(null),reviewController=useRef<AbortController|null>(null),writeController=useRef<AbortController|null>(null);
 const [accounts,setAccounts]=useState<Account[]>([]),[loadedIdentity,setLoadedIdentity]=useState(''),[loading,setLoading]=useState(false);
 const [edit,setEdit]=useState<Account|null>(null),[original,setOriginal]=useState<Account|null>(null),[profile,setProfile]=useState<Profile>('seller');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [review,setReview]=useState<Review|null>(null),[reviewing,setReviewing]=useState(false),[reviewError,setReviewError]=useState(''),[reviewRevision,setReviewRevision]=useState(0),[confirmedKey,setConfirmedKey]=useState('');
 const [uncertain,setUncertain]=useState(false),[requiresReread,setRequiresReread]=useState(false),[readingCurrent,setReadingCurrent]=useState(false),[observed,setObserved]=useState<Account|null>(null),[observedRead,setObservedRead]=useState(false);
 const headingId=useId(),reviewHeadingId=useId(),confirmationId=useId(),opener=useRef<HTMLElement|null>(null),openerIdentity=useRef('');
 const existing=!!original,loaded=admin&&loadedIdentity===identity;
 const needsReview=!!edit&&!!original&&accountChangeNeedsReview(original,{role:edit.role,active:edit.active});
 const reviewKey=needsReview&&edit&&original?JSON.stringify([identity,original.id,original.expectedAccount,edit.role,edit.active]):'';
 const reviewData=reviewKey&&review?.key===reviewKey&&!uncertain&&!requiresReread?review.data:null;
 const confirmed=!!reviewData&&confirmedKey===reviewKey;
 const canSave=!!edit&&!!edit.email.trim()&&!!edit.name.trim()&&!busy&&!readingCurrent&&!uncertain&&!requiresReread&&(!needsReview||!!reviewData&&!reviewData.blocked&&confirmed&&!reviewing);

 function stillCurrent(startedIdentity:string){return alive.current&&current.current.admin&&current.current.identity===startedIdentity;}
 async function load(){
  const startedIdentity=identity,startedOperation=++loadOperation.current;
  accountController.current?.abort();const controller=new AbortController();accountController.current=controller;
  setLoading(true);setLoadedIdentity('');setAccounts([]);
  try{
   const next=await readAccounts(controller.signal);
   if(!stillCurrent(startedIdentity)||loadOperation.current!==startedOperation||controller.signal.aborted)return;
   setAccounts(next);setLoadedIdentity(startedIdentity);
  }finally{if(stillCurrent(startedIdentity)&&loadOperation.current===startedOperation)setLoading(false);}
 }
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;loadOperation.current++;reviewOperation.current++;saveOperation.current++;accountController.current?.abort();reviewController.current?.abort();writeController.current?.abort();saveLock.current=false;};},[]);
 useEffect(()=>{
  setEdit(null);setOriginal(null);setReview(null);setConfirmedKey('');setError('');setNotice('');setLoadedIdentity('');setAccounts([]);setBusy(false);setReadingCurrent(false);setUncertain(false);setRequiresReread(false);setObserved(null);setObservedRead(false);
  if(admin)void load().catch(cause=>{if(stillCurrent(identity))setError((cause as Error).message);});
  return()=>{loadOperation.current++;reviewOperation.current++;saveOperation.current++;accountController.current?.abort();reviewController.current?.abort();writeController.current?.abort();saveLock.current=false;};
 },[identity]);
 useEffect(()=>{
  setReview(null);setConfirmedKey('');setReviewError('');setReviewing(false);
  if(!reviewKey||!edit||!original||uncertain||requiresReread)return;
  const startedIdentity=identity,startedKey=reviewKey,startedOperation=++reviewOperation.current;
  const target={...original},requested={role:edit.role,active:edit.active};
  reviewController.current?.abort();const controller=new AbortController();reviewController.current=controller;
  setReviewing(true);
  void (async()=>{
   let response:Response;
   try{response=await fetch('/api/crm/account-change-review?'+new URLSearchParams({memberId:target.id,role:requested.role,active:String(requested.active)}),{cache:'no-store',signal:controller.signal});}catch(cause){if(controller.signal.aborted)throw cause;throw Error('Kontoändringen kunde inte granskas. Kontrollera anslutningen och hämta granskningen igen.');}
   let data:unknown;
   try{data=await response.json();}catch{throw Error('Granskningsunderlaget kunde inte läsas. Hämta granskningen igen.');}
   if(!response.ok)throw Error(data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Kontoändringen kunde inte granskas.');
   const parsed=AccountChangeReviewSchema.safeParse(data);
   if(!parsed.success)throw Error('Granskningsunderlaget har ett oväntat format. Hämta granskningen igen.');
   const next=parsed.data;
   if(next.target.memberId!==target.id||next.expectedAccount!==target.expectedAccount||next.target.name!==target.name||next.target.role!==target.role||next.target.active!==target.active||next.requested.role!==requested.role||next.requested.active!==requested.active)throw Error('Kontot har ändrats sedan du öppnade formuläret. Läs aktuellt konto och välj uttryckligen om du vill utgå från det. Dina uppgifter finns kvar.');
   if(stillCurrent(startedIdentity)&&reviewOperation.current===startedOperation&&!controller.signal.aborted)setReview({key:startedKey,data:next});
  })().catch(cause=>{if(stillCurrent(startedIdentity)&&reviewOperation.current===startedOperation&&!controller.signal.aborted){setReview(null);setReviewError((cause as Error).message);}}).finally(()=>{if(stillCurrent(startedIdentity)&&reviewOperation.current===startedOperation)setReviewing(false);});
  return()=>{reviewOperation.current++;controller.abort();};
 },[reviewKey,reviewRevision,uncertain,requiresReread]);

 function open(account:Account,isExisting=false){
  if(saveLock.current||!admin)return;
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;openerIdentity.current=identity;
  setEdit({...account});setOriginal(isExisting?{...account}:null);setProfile(profileOf(account));setReview(null);setConfirmedKey('');setError('');setReviewError('');setNotice('');setUncertain(false);setRequiresReread(false);setObserved(null);setObservedRead(false);
 }
 function change(patch:Partial<Account>){if(!edit||saveLock.current||busy||readingCurrent)return;setEdit({...edit,...patch});setConfirmedKey('');setError('');setObserved(null);setObservedRead(false);}
 function close(){if(saveLock.current||busy||readingCurrent)return;setEdit(null);setOriginal(null);setReview(null);setConfirmedKey('');setError('');setNotice('');}
 function restoreFocus(event:Event){
  event.preventDefault();
  if(!stillCurrent(openerIdentity.current))return;
  const candidate=opener.current,usable=candidate?.isConnected&&!candidate.matches(':disabled,[aria-disabled=true]')&&!candidate.closest('[hidden],[inert],[aria-hidden=true]')&&!!candidate.getBoundingClientRect().width;
  const target=usable?candidate:document.getElementById(headingId);
  if(target){target.scrollIntoView({block:'nearest',inline:'nearest'});target.focus({preventScroll:true});}
 }
 async function rereadCurrent(){
  if(!edit||busy||readingCurrent||saveLock.current)return;
  const startedIdentity=identity,memberId=original?.id||'',email=edit.email.toLowerCase().trim(),operation=++loadOperation.current;
  accountController.current?.abort();const controller=new AbortController();accountController.current=controller;
  setReadingCurrent(true);setObserved(null);setObservedRead(false);setReview(null);setConfirmedKey('');setError('');
  try{
   const next=await readAccounts(controller.signal);
   if(!stillCurrent(startedIdentity)||loadOperation.current!==operation||controller.signal.aborted)return;
   setAccounts(next);setLoadedIdentity(startedIdentity);setObserved(next.find(account=>memberId?account.id===memberId:account.email===email)||null);setObservedRead(true);
   setNotice(uncertain?'Kontots aktuella uppgifter har lästs. Detta visar nuläget och bekräftar inte om det tidigare sparförsöket utfördes. Dina formulärvärden finns kvar.':'Kontots aktuella uppgifter har lästs. Dina formulärvärden finns kvar tills du väljer att läsa in kontot.');
  }catch(cause){if(stillCurrent(startedIdentity)&&loadOperation.current===operation&&!controller.signal.aborted)setError((cause as Error).message);}
  finally{if(stillCurrent(startedIdentity)&&loadOperation.current===operation)setReadingCurrent(false);}
 }
 function adoptObserved(){
  if(!observed||busy||readingCurrent||saveLock.current)return;
  setEdit({...observed});setOriginal({...observed});setProfile(profileOf(observed));setUncertain(false);setRequiresReread(false);setObserved(null);setObservedRead(false);setConfirmedKey('');setReview(null);setError('');setReviewError('');setNotice('Det aktuella kontot är inläst. Tidigare formulärvärden har ersatts; välj och granska nästa ändring.');
 }
 async function save(){
  if(!edit||!canSave||saveLock.current)return;
  if(['seller','manager'].includes(profile)&&!edit.owner){setError('Välj vilken säljarprofil kontot ska kopplas till.');return;}
  const startedIdentity=identity,operation=++saveOperation.current;
  const payload={email:edit.email,name:edit.name,role:edit.role,owner:edit.owner,active:edit.active,...(needsReview&&reviewData?{accountReview:{memberId:original!.id,expectedAccount:original!.expectedAccount,expectedContext:reviewData.expectedContext,confirmed:true}}:{})};
  saveLock.current=true;setBusy(true);setError('');setNotice('');
  const controller=new AbortController();writeController.current=controller;
  let attempted=false,acknowledged=false,rejected=false;
  try{
   attempted=true;
   const response=await fetch('/api/crm/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   let data:unknown;
   try{data=await response.json();}catch{throw Error('Svaret från sparningen kunde inte läsas.');}
   if(!stillCurrent(startedIdentity)||saveOperation.current!==operation)return;
   if(!response.ok){rejected=response.status<500;throw Error(data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'CRM-kontot kunde inte sparas.');}
   if(!z.object({ok:z.literal(true)}).strict().safeParse(data).success)throw Error('Sparningen saknar ett giltigt kvitto.');
   acknowledged=true;setEdit(null);setOriginal(null);setReview(null);setConfirmedKey('');
   const results=await Promise.allSettled([load(),refresh()]);
   if(!stillCurrent(startedIdentity)||saveOperation.current!==operation)return;
   if(results.some(result=>result.status==='rejected')){setNotice('CRM-kontot är sparat, men kontolistan eller arbetsöversikten kunde inte uppdateras. Hämta kontolistan igen innan nästa kontoändring.');toast.warning('Kontot är sparat. Översikten behöver uppdateras.');}
   else{setNotice('Det personliga CRM-kontot är sparat och översikten har uppdaterats.');toast.success('Det personliga CRM-kontot är sparat.');}
  }catch(cause){
   if(!stillCurrent(startedIdentity)||saveOperation.current!==operation)return;
   setReview(null);setConfirmedKey('');setObserved(null);setObservedRead(false);
   if(attempted&&!acknowledged&&!rejected){setUncertain(true);setRequiresReread(true);setLoadedIdentity('');setAccounts([]);setError('Det är oklart om kontoändringen sparades. Skicka inte samma ändring igen. Läs kontots aktuella status innan du går vidare. Dina uppgifter finns kvar.');}
   else{setError((cause as Error).message||'CRM-kontot kunde inte sparas. Dina uppgifter finns kvar.');if(needsReview){setRequiresReread(true);setLoadedIdentity('');setAccounts([]);}}
  }finally{if(stillCurrent(startedIdentity)&&saveOperation.current===operation){saveLock.current=false;setBusy(false);}}
 }
 async function reload(){if(saveLock.current||loading)return;setError('');setNotice('');try{await load();await refresh();if(stillCurrent(identity))setNotice('Aktuella konton och arbetsöversikten har hämtats.');}catch(cause){if(stillCurrent(identity))setError((cause as Error).message);}}
 if(!admin)return null;

 return <section className="business-ui accounts-workspace account-change-workspace" aria-labelledby={headingId}>
  <div className="panel padded"><div className="biz-head"><div><span className="biz-kicker">PERSONLIG INLOGGNING</span><h2 id={headingId} tabIndex={-1}><Users size={22} aria-hidden="true"/>Ett konto per person</h2><p>Inloggningsadressen identifierar personen. Säljarprofilen kopplar kontot till rätt kunder, affärer, mål och aktiviteter.</p></div><Button type="button" variant="outline" disabled={busy||loading||!loaded} onClick={()=>open(newAccount())}>Förbered nytt konto</Button></div>
   <div className="account-role-guide"><div><UserRound aria-hidden="true"/><b>Säljare</b><p>Öppnar Min dashboard med sin egen försäljning och Min dag med sina aktiviteter.</p></div><div><ShieldCheck aria-hidden="true"/><b>Ledning &amp; säljare</b><p>För Sebbe och Pelle: personlig dashboard, teamets dashboard och full CRM-administration.</p></div><div><Users aria-hidden="true"/><b>Tryck &amp; lager</b><p>Öppnar avdelningens arbetskö med order, underlag och deadlines.</p></div></div>
   <p className="biz-hint">Personliga vyer väljer rätt urval. Säljteamets kundregister är gemensamt; detta spärrar inte säljare från varandras kunduppgifter. Egna utkast och personlig Outlook-korrespondens har separat åtkomst.</p>
   <Button type="button" variant="outline" disabled={busy||loading} onClick={()=>void reload()}><RefreshCw size={17} aria-hidden="true"/>{loading?'Hämtar kontolistan…':'Hämta aktuell kontolista'}</Button>
   {!edit&&notice&&<p className="account-change-feedback" role="status" aria-atomic="true">{notice}</p>}{!edit&&error&&<p className="error account-change-feedback" role="alert">{error}</p>}
  </div>
  <section className="panel padded"><h2>Säljarprofiler och kontokoppling</h2><p className="biz-hint">En säljarprofil är inte ett inloggningskonto. Här syns vilka kopplingar som är klara.</p>{loaded?<div className="account-roster">{st.settings.owners.map(owner=>{const account=accounts.find(account=>account.owner===owner&&account.active);return <article key={owner}><span className="account-avatar" aria-hidden="true">{owner.split(' ').map(name=>name[0]).slice(0,2).join('')}</span><h3>{owner}</h3><p>{account?roleLabel(account):'Personligt konto saknas'}</p><small>{account?.email||'Inloggningsadress behöver anges'}</small><span className={'pill '+(account?.connected?'green':'amber')}>{account?account.connected?'Har loggat in':'Inväntar första inloggning':'Säljarprofil utan konto'}</span><Button type="button" variant="outline" disabled={busy} onClick={()=>account?open(account,true):open(newAccount(owner,owner,owner==='Pelle Peolin'?'admin':'seller'))}>{account?'Ändra koppling':'Förbered konto'}</Button></article>;})}</div>:<p role="status">{loading?'Hämtar kontokopplingar…':'Kontokopplingar visas när aktuell kontolista har hämtats.'}</p>}</section>
  <section className="panel padded"><h2>Registrerade CRM-konton</h2>{loaded&&accounts.map(account=><div className="biz-repeat" key={account.id}><div><b>{account.name}</b><small>{account.email}</small><small>{roleLabel(account)} · {account.active?'Aktivt':'Inaktiverat'}{account.owner?' · Kundportfölj: '+account.owner:' · Ingen personlig säljarprofil'}</small><small>Konto-ID: {account.id}</small></div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>open(account,true)} aria-label={'Ändra konto för '+account.name+' · '+account.email}>Ändra</Button></div>)}<p className="biz-hint">Att spara ett CRM-konto skickar ingen inbjudan. Tillgång till sidan tilldelas separat när ni är redo att släppa in personen.</p></section>
  <Sheet open={!!edit} onOpenChange={value=>{if(!value)close();}}><SheetContent className="crm-sheet account-change-sheet" showCloseButton={false} onCloseAutoFocus={restoreFocus}><SheetHeader><SheetTitle>{existing?'Ändra personligt konto':'Förbered personligt konto'}</SheetTitle><SheetDescription>Koppla personens inloggning till rätt roll och säljarprofil.</SheetDescription></SheetHeader>{edit&&<div className="sheet-body business-ui account-editor" aria-busy={busy||readingCurrent}>
   <fieldset disabled={busy||readingCurrent}><div className="biz-grid"><F label="Namn"><Input value={edit.name} onChange={event=>change({name:event.target.value})}/></F><F label="Personlig inloggningsadress"><Input type="email" disabled={existing} value={edit.email} onChange={event=>change({email:event.target.value})} placeholder="Personens verifierade e-postadress"/></F><F label="Roll och arbetsvy"><Pick label="Roll och arbetsvy" value={profile} onChange={value=>{const next=value as Profile;setProfile(next);change({role:next==='manager'?'admin':next,owner:['manager','seller'].includes(next)?edit.owner:''});}} items={[{id:'seller',label:'Säljare – personlig dashboard'},{id:'manager',label:'Ledning & säljare – egen + team'},{id:'admin',label:'Administratör – utan egen portfölj'},{id:'reader',label:'Läsare'},{id:'production',label:'Tryck & leverans – gemensam arbetsvy'},{id:'print',label:'Tryck'},{id:'warehouse',label:'Lager'}]}/></F>{['manager','seller','reader'].includes(profile)&&<F label="Kopplad säljarprofil"><Pick label="Koppla konto till säljare" value={edit.owner} onChange={value=>change({owner:value})} items={[{id:'',label:'Välj säljarprofil'},...st.settings.owners.map(owner=>({id:owner,label:owner}))]}/></F>}</div>
    <label className="check-field account-change-active"><Checkbox checked={edit.active} onCheckedChange={value=>change({active:value===true})}/>Kontot är aktivt</label>
    <div className="biz-callout"><b>Så öppnas kontot</b><p>{!edit.active?'Kontot får inte CRM-åtkomst efter inaktivering. Kontohistorik och tidigare arbete ligger kvar.':profile==='manager'?'Egen försäljning visas först. Personen kan växla till hela teamet och administrera CRM-systemet.':profile==='seller'?'Egna mål, egen försäljning och egna aktiviteter visas först.':profile==='admin'?'Personen administrerar systemet och kan öppna teamets dashboard. Inga personliga säljsiffror visas utan säljarprofil.':profile==='production'?'Personen öppnar Min produktion med eget arbete och gemensam kö. Kan registrera varor, tryck och utleverans.':profile==='print'||profile==='warehouse'?'Personen öppnar avdelningens arbetskö.':'Kontot får läsbehörighet.'}</p></div>
    {needsReview&&<section className="account-change-review" aria-labelledby={reviewHeadingId} aria-busy={reviewing}><h3 id={reviewHeadingId}><ShieldCheck size={20} aria-hidden="true"/>Granska kontoändringen</h3><p>Inaktivering och minskade arbetsrättigheter kontrolleras mot registrerat produktionsansvar i alla lagrade arbetsytor.</p><p><b>Konto:</b> {original!.name} · {original!.id}. <b>Ändring:</b> {edit.active?roleLabel(edit):'Inaktiverat CRM-konto'}.</p>
     {reviewing&&<p className="account-change-feedback" role="status" aria-atomic="true">Kontrollerar jobbansvar, hinderansvar och kontokopplingar i alla lagrade arbetsytor…</p>}
     {reviewData&&<><p className={reviewData.blocked?'account-change-blocker':'account-change-clear'}><AlertTriangle size={18} aria-hidden="true"/><span><b>{reviewData.blocked?'Ändringen är spärrad':'Produktionskontrollen tillåter den här ändringen'}</b>{reviewData.reason&&<span>{reviewData.reason}</span>}</span></p><ul className="account-change-counts" aria-label="Produktionsansvar per arbetsyta">{reviewData.workspaces.map(workspace=><li key={workspace.id}><b>{workspaceLabel(workspace.id)}</b><dl><div><dt>Jobbansvar</dt><dd>{workspace.jobCount}</dd></div><div><dt>Öppet hinderansvar</dt><dd>{workspace.issueCount}</dd></div><div><dt>Kopplingar att granska</dt><dd>{workspace.unresolvedCount}</dd></div></dl></li>)}</ul>{!reviewData.workspaces.length&&<p>Inga registrerade arbetsytor finns i granskningsunderlaget.</p>}{reviewData.blocked?<p>Granska och överlämna varje ansvarsdel i den berörda arbetsytan. Ett skickat jobb kan ha ett kvarvarande hinder. Ett tomt urval i produktionskön räcker därför inte.</p>:<label className="check-field account-change-confirm" htmlFor={confirmationId}><Checkbox id={confirmationId} checked={confirmed} onCheckedChange={value=>setConfirmedKey(value===true?reviewKey:'')}/><span>Jag har granskat kontoändringen och produktionskontrollen.</span></label>}</>}
     {reviewError&&<p className="error account-change-feedback" role="alert">{reviewError} Tidigare granskningsunderlag används inte.</p>}
     <Button type="button" variant="outline" disabled={reviewing||uncertain||requiresReread} onClick={()=>{setReview(null);setConfirmedKey('');setReviewRevision(value=>value+1);}}>Hämta kontoändringens granskning igen</Button>
     <p className="biz-hint">Kontrollen gäller produktionsansvar. Kommersiellt ansvar, privata utkast och mejl samt tillgång till sidan har separata arbetsflöden. Detta är ingen fullständig personalavveckling.</p>
    </section>}
    {(uncertain||requiresReread||reviewError)&&<section className="account-change-readback" aria-label="Kontrollera aktuellt konto"><h3>{uncertain?'Kontrollera en osäker sparning':'Läs kontots aktuella status'}</h3><p>Formulärets namn, roll och val bevaras. En återläsning visar aktuella kontouppgifter och flyttar inget arbete.</p><Button type="button" variant="outline" disabled={busy||readingCurrent} onClick={()=>void rereadCurrent()}>{readingCurrent?'Läser aktuellt konto…':'Läs kontots aktuella status'}</Button>{observedRead&&<><p>{observed?<><b>{observed.name}</b> · {observed.email}<br/>{roleLabel(observed)} · {observed.active?'Aktivt':'Inaktiverat'}<br/>Konto-ID: {observed.id}.</>:'Kontot finns inte i den återlästa kontolistan. Ett tidigare sparförsök är fortfarande inte bekräftat. Stäng formuläret och kontrollera kontolistan innan ett nytt försök.'}</p>{observed&&<Button type="button" variant="outline" onClick={adoptObserved}>Läs in aktuellt konto och ersätt formulärvärden</Button>}</>}</section>}
    <div className="biz-buttons account-change-actions"><Button type="button" disabled={!canSave} onClick={()=>void save()}>{busy?'Sparar CRM-konto…':needsReview&&!edit.active?'Inaktivera CRM-konto':'Spara CRM-konto'}</Button><Button type="button" variant="ghost" onClick={close}>Stäng</Button></div>
   </fieldset>
   {busy&&<p className="account-change-feedback" role="status" aria-atomic="true">Sparar kontoändringen. Vänta på kvittot innan du går vidare.</p>}{notice&&<p className="account-change-feedback" role="status" aria-atomic="true">{notice}</p>}{error&&<p className="error account-change-feedback" role="alert">{error}</p>}
  </div>}</SheetContent></Sheet>
 </section>;
}
