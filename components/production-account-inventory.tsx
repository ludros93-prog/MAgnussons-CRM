'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {AlertTriangle,ArrowRightLeft,ClipboardList,RefreshCw,Search,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {Order,State} from '@/lib/crm';
import {productionInventoryBasis,productionInventoryInput,ProductionInventoryReviewSchema,type ProductionInventoryAccount,type ProductionInventoryReview,type ProductionInventoryRow} from '@/lib/production-inventory';
import {isLegacyProductionAssignment,productionAssignmentBlockedReason} from '@/lib/production-assignment';

type Props={st:State;space:'demo'|'live';onProductionAssignment:(order:Order)=>void;onOpenJob:(orderId:string)=>void;refresh:()=>Promise<State>};
type Inventory={identity:string;input:string;review:ProductionInventoryReview};
const pageSize=20;
const accountPrefix='account:';
const allChoice='__all',unassignedChoice='__unassigned',unresolvedChoice='__unresolved';
const roles={admin:'Administratör',seller:'Säljare',reader:'Läsare',print:'Tryck',warehouse:'Lager',production:'Tryck & leverans'};
function identityFor(st:State,space:string){return JSON.stringify([space,st.viewer?.id||'',st.viewer?.memberId||'',st.viewer?.role||'']);}
function accountLabel(account:ProductionInventoryAccount){return `${account.name} · ${roles[account.role]}${account.active?'':' · Inaktiverat'} · ${account.memberId}`;}
function displayDate(value:string){
 if(!value)return 'Datum saknas';
 const date=new Date(value.slice(0,10)+'T12:00:00');
 return Number.isNaN(date.getTime())?'Datum behöver granskas':date.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});
}
async function readInventory(space:string,signal:AbortSignal){
 let response:Response;
 try{response=await fetch('/api/crm/production-inventory?space='+encodeURIComponent(space),{signal,cache:'no-store'});}catch(cause){if(signal.aborted)throw cause;throw Error('Produktionsöversikten kunde inte hämtas. Kontrollera anslutningen och hämta aktuellt underlag igen.');}
 let data:unknown;
 try{data=await response.json();}catch{throw Error('Produktionsöversikten kunde inte läsas. Hämta aktuellt underlag igen.');}
 if(!response.ok){const message=data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'';throw Error(message||'Produktionsöversikten kunde inte hämtas.');}
 const parsed=ProductionInventoryReviewSchema.safeParse(data);
 if(!parsed.success)throw Error('Produktionsöversikten har ett oväntat format. Hämta aktuellt underlag igen.');
 return parsed.data;
}

export function ProductionAccountInventory({st,space,onProductionAssignment,onOpenJob,refresh}:Props){
 const headingId='production-inventory-heading',accountDescriptionId=useId(),rowId=useId();
 const identity=identityFor(st,space),input=productionInventoryInput(st),admin=st.viewer?.role==='admin';
 const current=useRef({identity,input,admin});current.current={identity,input,admin};
 const [inventory,setInventory]=useState<Inventory|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState(''),[responsibility,setResponsibility]=useState('all'),[query,setQuery]=useState(''),[visibleCount,setVisibleCount]=useState(pageSize);
 const alive=useRef(true),operation=useRef(0),lock=useRef(false),controller=useRef<AbortController|null>(null);
 const isCurrent=admin&&inventory?.identity===identity&&inventory.input===input;
 const review=isCurrent?inventory.review:null;
 const selectedMemberId=selected.startsWith(accountPrefix)?selected.slice(accountPrefix.length):'';
 const account=review?.accounts.find(item=>item.memberId===selectedMemberId);
 const group=[allChoice,unassignedChoice,unresolvedChoice].includes(selected);
 const unavailable=!!review&&!!selected&&!group&&!account;
 const stale=!!inventory&&!isCurrent;

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;controller.current?.abort();lock.current=false;};},[]);
 useEffect(()=>{
  setInventory(null);setError('');setNotice('');setSelected('');setResponsibility('all');setQuery('');setVisibleCount(pageSize);
  if(admin)void load(false);
  return()=>{operation.current++;controller.current?.abort();lock.current=false;};
 },[identity]);
 useEffect(()=>{if(inventory&&(inventory.identity!==identity||inventory.input!==input)){setInventory(null);setNotice('Underlaget i CRM har ändrats. Hämta aktuellt underlag för att granska produktionsarbetet igen.');}},[identity,input,inventory]);

 async function load(refreshState:boolean){
  if(lock.current||!current.current.admin)return;
  const startedIdentity=identity,startedOperation=++operation.current;
  controller.current?.abort();const request=new AbortController();controller.current=request;
  lock.current=true;setLoading(true);setInventory(null);setError('');setNotice('');
  try{
   const snapshot=refreshState?await refresh():st;
   if(!alive.current||current.current.identity!==startedIdentity||operation.current!==startedOperation||request.signal.aborted)return;
   if(snapshot.viewer?.role!=='admin'||identityFor(snapshot,space)!==startedIdentity)throw Error('Kontot eller arbetsytan har ändrats. Öppna översikten på nytt.');
   const snapshotInput=productionInventoryInput(snapshot);
   const [expectedContext,next]=await Promise.all([productionInventoryBasis(snapshot),readInventory(space,request.signal)]);
   if(!alive.current||current.current.identity!==startedIdentity||operation.current!==startedOperation||request.signal.aborted)return;
   if(expectedContext!==next.expectedContext||snapshotInput!==current.current.input)throw Error('CRM-underlaget har ändrats under hämtningen. Hämta aktuellt underlag och granska igen.');
   setInventory({identity:startedIdentity,input:snapshotInput,review:next});
   if(refreshState)setNotice('Aktuella produktionsjobb och kontokopplingar har hämtats. Ditt urval och dina filter finns kvar.');
  }catch(cause){
   if(alive.current&&current.current.identity===startedIdentity&&operation.current===startedOperation&&!request.signal.aborted){setInventory(null);setError((cause as Error).message||'Produktionsöversikten kunde inte hämtas. Hämta aktuellt underlag igen.');}
  }finally{if(alive.current&&current.current.identity===startedIdentity&&operation.current===startedOperation){lock.current=false;setLoading(false);}}
 }
 function changeSelected(value:string){setSelected(value);setVisibleCount(pageSize);}
 function resetFilters(){setResponsibility('all');setQuery('');setVisibleCount(pageSize);}
 function belongs(row:ProductionInventoryRow,part:'job'|'issue'){
  if(part==='issue'&&!row.issue)return false;
  const state=part==='job'?row.assignmentState:row.issueOwnerState;
  const memberId=part==='job'?row.assigneeMemberId:row.issueOwnerMemberId;
  if(selected===allChoice)return true;
  if(selected===unassignedChoice)return state==='unassigned';
  if(selected===unresolvedChoice)return state==='unresolved';
  return !!account&&state==='assigned'&&memberId===account.memberId;
 }
 const selectedRows=review&&selected&&!unavailable?review.rows.filter(row=>belongs(row,'job')||belongs(row,'issue')):[];
 const search=query.trim().toLocaleLowerCase('sv');
 const filtered=responsibility!=='all'||!!search;
 const matches=selectedRows.filter(row=>(responsibility==='all'||belongs(row,responsibility as 'job'|'issue'))&&(!search||[row.customerName,row.title,row.workId,row.assigneeName,row.issueOwnerName,row.issue].join(' ').toLocaleLowerCase('sv').includes(search)));
 const shown=matches.slice(0,visibleCount);
 const jobCount=selectedRows.filter(row=>belongs(row,'job')).length,issueCount=selectedRows.filter(row=>belongs(row,'issue')).length;
 function stillCurrent(){return !!inventory&&current.current.admin&&current.current.identity===inventory.identity&&current.current.input===inventory.input;}
 function assignmentAction(row:ProductionInventoryRow){
  const orders=st.orders.filter(order=>order.id===row.orderId);
  if(orders.length!==1||orders[0].production.workId!==row.workId)return null;
  if(isLegacyProductionAssignment(orders[0].production)&&!productionAssignmentBlockedReason(st,row.orderId,row.workId,'resolve_legacy'))return 'resolve_legacy';
  return row.blockedReason?null:'transfer';
 }
 function openAssignment(row:ProductionInventoryRow){
  if(lock.current||!stillCurrent()||!assignmentAction(row)||!belongs(row,'job'))return;
  const orders=st.orders.filter(order=>order.id===row.orderId);
  if(orders.length===1&&orders[0].production.workId===row.workId)onProductionAssignment(orders[0]);
 }
 function openJob(row:ProductionInventoryRow){if(!lock.current&&stillCurrent()&&st.orders.filter(order=>order.id===row.orderId).length===1)onOpenJob(row.orderId);}
 function dueLabel(row:ProductionInventoryRow){
  const orders=st.orders.filter(order=>order.id===row.orderId),production=orders.length===1?orders[0].production:null;
  return production&&(row.status==='submitted'?production.printDeadline:production.dispatchDeadline)?row.status==='submitted'?'Tryck senast':'Skickas senast':'Leveransdatum';
 }
 if(!admin)return null;

 return <section className="business-ui panel padded production-inventory" aria-labelledby={headingId} aria-busy={loading}>
  <header className="production-inventory-head">
   <div><span className="biz-kicker">KONTO OCH PRODUKTIONSARBETE</span><h2 id={headingId} tabIndex={-1}><ClipboardList size={22} aria-hidden="true"/><span>Produktionsarbete per konto</span></h2><p>Se öppna jobb och hinder inför en överlämning. Jobbets ansvar och hindrets ansvar granskas var för sig.</p></div>
   <Button type="button" variant="outline" disabled={loading} onClick={()=>void load(true)}><RefreshCw size={17} aria-hidden="true"/><span>{loading?'Hämtar underlag…':'Hämta aktuellt underlag'}</span></Button>
  </header>
  <p className={'production-inventory-space production-inventory-space-'+space}><b>{space==='live'?'Verksamhetens arbetsyta':'Demoarbetsyta'}</b><span>{space==='live'?'Inventeringen gäller den här arbetsytan.':'Inventeringen gäller demounderlaget; den visar inte verksamhetens jobb.'}</span></p>
  <div className="production-inventory-toolbar">
   <label className="biz-field"><span>Vems produktionsarbete vill du granska?</span><select aria-label="Välj konto för produktionsinventering" aria-describedby={selected?accountDescriptionId:undefined} value={selected} onChange={event=>changeSelected(event.target.value)} disabled={!review||loading}><option value="">Välj konto eller arbetskö</option>{review?.accounts.map((item,index)=><option key={item.memberId+'-'+index} value={accountPrefix+item.memberId}>{accountLabel(item)}</option>)}<option value={unassignedChoice}>Arbete utan ansvarig</option><option value={unresolvedChoice}>Ansvar som behöver granskas</option><option value={allChoice}>Alla öppna produktionsjobb</option>{unavailable&&<option value={selected}>Det tidigare valda kontot behöver granskas</option>}</select></label>
   <label className="biz-field"><span>Vilket ansvar?</span><select aria-label="Filtrera produktionsinventering efter ansvar" value={responsibility} onChange={event=>{setResponsibility(event.target.value);setVisibleCount(pageSize);}} disabled={!review||!selected||loading}><option value="all">Jobbansvar och hinderansvar</option><option value="job">Jobbansvar</option><option value="issue">Öppet hinderansvar</option></select></label>
   <label className="biz-field"><span>Sök i valt arbete</span><div className="production-inventory-search"><Search size={18} aria-hidden="true"/><Input aria-label="Sök kund eller jobb i produktionsinventeringen" value={query} onChange={event=>{setQuery(event.target.value);setVisibleCount(pageSize);}} placeholder="Kund, jobb eller hinder…" disabled={!review||!selected||loading}/></div></label>
  </div>
  {review&&selected&&<div id={accountDescriptionId} className={'production-inventory-account'+(unavailable||account?.identityStatus!=='connected'&&!!account?' production-inventory-warning':'')}><UserRound size={20} aria-hidden="true"/><div>{account?<><b>{account.name}</b><p>{roles[account.role]} · {account.active?'Aktivt CRM-konto':'Inaktiverat CRM-konto'}. Även ett inaktiverat konto kan ha kvarvarande arbete.</p><p><b>Konto-ID:</b> {account.memberId}.</p>{account.identityStatus==='unconnected'&&<p>Kontot saknar en kopplad användaridentitet. Namn används inte för att gissa vilket arbete personen ansvarar för.</p>}{account.identityStatus==='ambiguous'&&<p>Kontokopplingen är inte entydig. Granska Ansvar som behöver granskas; ett tomt kontourval betyder inte att arbetet är överlämnat.</p>}</>:unavailable?<><b>Det tidigare valda kontot saknas i underlaget</b><p>Välj ett konto på nytt. Ett tomt urval visar inte att arbetet har lämnats över.</p></>:selected===unassignedChoice?<><b>Arbete utan ansvarig</b><p>Jobb eller öppna hinder som saknar registrerat ansvar. Granska varje ansvarsdel separat.</p></>:selected===unresolvedChoice?<><b>Ansvar som behöver granskas</b><p>Här visas saknade, äldre eller motsägande identitetskopplingar. Ingen person tilldelas arbete utifrån sitt namn.</p></>:<><b>Alla öppna produktionsjobb</b><p>Jobb som är lämnade till produktion eller markerade tryckta. Historiska, avslutade och avbrutna jobb ingår inte.</p></>}</div></div>}
  {review&&selected&&!unavailable&&<>
   <div className="production-inventory-summary"><div><p className="production-inventory-count" role="status" aria-atomic="true">Visar {shown.length} av {matches.length} jobb{filtered?' som matchar dina filter':''}. {filtered&&<span>Valt arbete innehåller {selectedRows.length} jobb före filtrering.</span>}</p><p className="biz-hint">Ett jobb kan ha både jobbansvar och ett separat öppet hinder.</p></div>{filtered&&<Button type="button" variant="outline" disabled={loading} onClick={resetFilters}>Återställ filter</Button>}</div>
   <ul className="production-inventory-counts" aria-label="Ansvar i hela det valda arbetet"><li><span>Jobbansvar</span><b>{jobCount}</b></li><li><span>Öppet hinderansvar</span><b>{issueCount}</b></li></ul>
   <ol className="production-inventory-list" aria-label="Produktionsjobb att granska">{shown.map((row,index)=>{const ownsJob=belongs(row,'job'),ownsIssue=belongs(row,'issue'),assignment=assignmentAction(row);return <li key={row.orderId+'-'+row.workId+'-'+index}><article aria-labelledby={rowId+'-'+index}>
    <div className="production-inventory-row-head"><span className="production-inventory-status">{row.status==='submitted'?'Lämnad till produktion':'Tryckt'}</span><span className="production-inventory-date">{dueLabel(row)}: {displayDate(row.dueAt)}</span></div>
    <h3 id={rowId+'-'+index}>{row.title}</h3><p className="production-inventory-customer"><b>Kund:</b> {row.customerName||'Kundkoppling behöver granskas'}</p>
    <dl><div><dt>Jobbansvar{ownsJob?' · ingår i urvalet':''}</dt><dd>{row.assignmentState==='unassigned'?'Ingen ansvarig':row.assigneeName||'Ansvarig saknas i underlaget'}{row.assignmentState==='assigned'&&<small>Konto-ID: {row.assigneeMemberId}.</small>}{row.assignmentState==='unresolved'&&<span className="production-inventory-attention">Kontokopplingen behöver granskas</span>}</dd></div><div><dt>Öppet hinderansvar{ownsIssue?' · ingår i urvalet':''}</dt><dd>{!row.issue?'Inget öppet hinder':row.issueOwnerState==='unassigned'?'Ingen ansvarig':row.issueOwnerName||'Ansvarig saknas i underlaget'}{row.issueOwnerState==='assigned'&&<small>Konto-ID: {row.issueOwnerMemberId}.</small>}{row.issueOwnerState==='unresolved'&&<span className="production-inventory-attention">Kontokopplingen behöver granskas</span>}</dd></div></dl>
    {row.issue&&<p className="production-inventory-issue"><AlertTriangle size={17} aria-hidden="true"/><span><b>Öppet hinder:</b> {row.issue}</span></p>}
    <p className="production-inventory-reference">Arbetsreferens: {row.workId||'saknas'}.</p>
    {row.blockedReason&&<p className="production-inventory-blocker"><AlertTriangle size={17} aria-hidden="true"/><span>{row.blockedReason}</span></p>}
    <div className="production-inventory-actions">{ownsJob&&assignment&&<Button type="button" variant="outline" onClick={()=>openAssignment(row)} aria-describedby={rowId+'-'+index}><ArrowRightLeft size={17} aria-hidden="true"/><span>{assignment==='resolve_legacy'?'Rätta äldre jobbansvar':'Granska jobbansvar'}</span></Button>}<Button type="button" variant="outline" disabled={st.orders.filter(order=>order.id===row.orderId).length!==1} onClick={()=>openJob(row)} aria-describedby={rowId+'-'+index}>Öppna jobbet</Button></div>
    {ownsIssue&&<p className="biz-hint">Öppna jobbet för att granska hindret. Ett byte av jobbansvar flyttar inte hindrets ansvar.</p>}
   </article></li>;})}</ol>
   {!matches.length&&<div className="production-inventory-empty"><b>{filtered?'Inga jobb matchar dina filter.':'Inga öppna jobb finns i det här urvalet.'}</b><p>{filtered?'Återställ filter för att granska allt arbete i urvalet.':'Det här gäller aktuella produktionsjobb i vald arbetsyta. Ett tomt urval bekräftar inte en fullständig personalavveckling eller att kontot kan stängas.'}</p></div>}
   {shown.length<matches.length&&<div className="production-inventory-more"><Button type="button" variant="outline" onClick={()=>setVisibleCount(value=>value+pageSize)}>Visa fler produktionsjobb</Button><p>{matches.length-shown.length} ytterligare jobb matchar urvalet.</p></div>}
  </>}
  {review&&!selected&&<div className="production-inventory-empty"><b>Välj ett konto eller en arbetskö för att börja.</b><p>Jobbansvar och hinderansvar visas tillsammans så att nästa överlämning blir tydlig. Konton med samma namn skiljs åt med konto-ID.</p></div>}
  {loading&&<p className="production-inventory-feedback" role="status" aria-atomic="true">Hämtar produktionsjobb och kontokopplingar. Arbete visas när underlaget har kontrollerats.</p>}
  {!loading&&(notice||stale)&&<p className="production-inventory-feedback" role="status">{notice||'CRM-underlaget har ändrats. Hämta aktuellt underlag för att granska arbetet igen.'}</p>}
  {error&&<p className="error production-inventory-feedback" role="alert">{error} Tidigare produktionsjobb visas inte.</p>}
  <aside className="production-inventory-boundaries" aria-label="Inventeringens omfattning"><h3>En översikt inför nästa överlämning</h3><p>Granska ett jobb i taget. Hinderansvar och orderns kommersiella ansvar har egna arbetsflöden. Den här översikten stänger inget konto och flyttar inget arbete.</p><p>Privata utkast, personliga mejl och tillgång till sidan ingår inte i inventeringen. Kontokopplingar visar registrerat CRM-underlag; de är inget prov av personens aktuella inloggning.</p></aside>
 </section>;
}
