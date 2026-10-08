'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {AlertTriangle,ClipboardList} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {AccountChangeWorkSchema,type AccountChangeWork,type AccountChangeWorkRow} from '@/lib/account-change-work-schema';
import type {AccountChangeReview} from '@/lib/account-change-review-schema';

type Props={review:AccountChangeReview;onStale:(focusReview:boolean)=>void};
type FocusIntent={basis:string;operation:number;offset:number;opener:HTMLElement|null;failed:boolean};
const workspaceLabel=(id:string)=>id==='live'?'Verksamhetens arbetsyta':id==='demo'?'Demoarbetsyta':'Registrerad arbetsyta: '+id;
const statusLabel={draft:'Ej skickad till tryck',submitted:'Väntar på tryck',printed:'Färdigtryckt',dispatched:'Skickad',cancelled:'Avbruten'};
const reasons:Record<AccountChangeWorkRow['reason'],string>={
 account_responsibility:'Det här ansvaret ligger kvar på kontot vars åtkomst ska minskas.',
 name_only:'Ett äldre namn finns registrerat utan en säker kontokoppling. Ingen person väljs utifrån namnet.',
 member_without_user:'Ett konto-ID finns registrerat, men kopplingen till användaridentiteten saknas.',
 no_account:'Det registrerade ansvaret saknar ett matchande CRM-konto.',
 mismatched_member:'De registrerade kontokopplingarna pekar på olika konton.',
 ambiguous_account:'Kontokopplingen är inte entydig och behöver granskas.'
};
const rowKey=(row:AccountChangeWorkRow)=>JSON.stringify([row.spaceId,row.orderId,row.kind]);
const canRestoreFocus=(opener:HTMLElement|null)=>document.activeElement===opener||document.activeElement===document.body||document.activeElement===document.documentElement;

export function AccountReviewWork({review,onStale}:Props){
 const headingId=useId(),rowId=useId();
 const basis=JSON.stringify([review.expectedContext,review.target.memberId,review.requested.role,review.requested.active]);
 const current=useRef(basis);current.current=basis;
 const alive=useRef(true),operation=useRef(0),lock=useRef(false),controller=useRef<AbortController|null>(null);
 const heading=useRef<HTMLHeadingElement>(null),list=useRef<HTMLOListElement>(null),errorNode=useRef<HTMLParagraphElement>(null),focusIntent=useRef<FocusIntent|null>(null);
 const [work,setWork]=useState<AccountChangeWork|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const workBasis=useRef('');
 const visible=workBasis.current===basis?work:null;

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;controller.current?.abort();lock.current=false;};},[]);
 useEffect(()=>{setWork(null);workBasis.current='';setLoading(false);setError('');operation.current++;controller.current?.abort();lock.current=false;focusIntent.current=null;},[basis]);
 useEffect(()=>{
  const intent=focusIntent.current;
  if(!intent||intent.basis!==basis||intent.operation!==operation.current||loading)return;
  focusIntent.current=null;
  if(!canRestoreFocus(intent.opener))return;
  const target=intent.failed?errorNode.current:intent.offset?list.current?.querySelector<HTMLElement>('[data-account-work-row="'+intent.offset+'"]'):heading.current;
  if(target){target.scrollIntoView({block:'nearest',inline:'nearest'});target.focus({preventScroll:true});}
 },[work,error,loading,basis]);

 async function load(offset:number){
  if(lock.current||!review.blocked)return;
  const startedBasis=basis;
  const previous=offset?visible:null;
  if(offset&&(!previous||previous.nextOffset!==offset))return;
  const startedOperation=++operation.current,opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
  controller.current?.abort();const request=new AbortController();controller.current=request;
  lock.current=true;setLoading(true);setError('');
  try{
   const query=new URLSearchParams({memberId:review.target.memberId,role:review.requested.role,active:String(review.requested.active),expectedContext:review.expectedContext,offset:String(offset)});
   let response:Response;
   try{response=await fetch('/api/crm/account-change-work?'+query,{cache:'no-store',signal:request.signal});}catch(cause){if(request.signal.aborted)throw cause;throw Error('Arbetsunderlaget kunde inte hämtas. Kontrollera anslutningen och försök igen.');}
   if(!alive.current||current.current!==startedBasis||operation.current!==startedOperation||request.signal.aborted)return;
   if(response.status===409){onStale(canRestoreFocus(opener));return;}
   let data:unknown;
   try{data=await response.json();}catch{throw Error('Arbetsunderlaget kunde inte läsas. Hämta underlaget igen.');}
   if(!response.ok)throw Error('Arbetsunderlaget kunde inte hämtas. Hämta kontoändringens granskning igen innan du går vidare.');
   const parsed=AccountChangeWorkSchema.safeParse(data);
   if(!parsed.success)throw Error('Arbetsunderlaget har ett oväntat format. Hämta kontoändringens granskning igen.');
   const next=parsed.data;
   if(next.expectedContext!==review.expectedContext||next.offset!==offset||previous&&next.total!==previous.total)throw Error('Arbetsunderlaget stämmer inte med den aktuella granskningen. Hämta kontoändringens granskning igen.');
   const rows=previous?[...previous.rows,...next.rows]:next.rows;
   if(new Set(rows.map(rowKey)).size!==rows.length)throw Error('Arbetsunderlaget innehåller upprepade ansvarsdelar. Hämta kontoändringens granskning igen.');
   if(!alive.current||current.current!==startedBasis||operation.current!==startedOperation||request.signal.aborted)return;
   focusIntent.current={basis:startedBasis,operation:startedOperation,offset,opener,failed:false};
   workBasis.current=startedBasis;setWork({...next,rows});
  }catch(cause){
   if(alive.current&&current.current===startedBasis&&operation.current===startedOperation&&!request.signal.aborted){focusIntent.current={basis:startedBasis,operation:startedOperation,offset,opener,failed:true};setWork(null);workBasis.current='';setError((cause as Error).message||'Arbetsunderlaget kunde inte hämtas.');}
  }finally{if(alive.current&&current.current===startedBasis&&operation.current===startedOperation){lock.current=false;setLoading(false);}}
 }

 if(!review.blocked)return null;
 return <section className="account-review-work" aria-labelledby={headingId} aria-busy={loading}>
  <h4 ref={heading} id={headingId} tabIndex={-1}><ClipboardList size={18} aria-hidden="true"/><span>Arbete som spärrar ändringen</span></h4>
  <p>Granska de registrerade ansvarsdelarna med arbetsyta och jobbreferens. Även oklara kontokopplingar behöver granskas innan åtkomsten kan minskas.</p>
  {!visible&&<Button type="button" variant="outline" disabled={loading} onClick={()=>void load(0)}>{loading?'Hämtar arbetsunderlag…':error?'Hämta arbetsunderlaget igen':'Visa arbete som spärrar ändringen'}</Button>}
  {visible&&<>
   <p className="account-review-work-count" role="status" aria-atomic="true">Visar {visible.rows.length} av {visible.total} ansvarsdelar. <span>Ett jobb kan ha både jobbansvar och ett separat öppet hinderansvar.</span></p>
   <ol ref={list} className="account-review-work-list" aria-label="Ansvarsdelar som spärrar kontoändringen">{visible.rows.map((row,index)=><li key={rowKey(row)}><article aria-labelledby={rowId+'-'+index}>
    <p className="account-review-work-space">{workspaceLabel(row.spaceId)}</p>
    <h5 id={rowId+'-'+index} tabIndex={-1} data-account-work-row={index} aria-label={(row.kind==='job'?'Jobbansvar':'Öppet hinderansvar')+' · '+workspaceLabel(row.spaceId)+' · Arbetsreferens: '+(row.workId||'saknas')}>{row.kind==='job'?'Jobbansvar':'Öppet hinderansvar'}</h5>
    <dl><div><dt>Arbetsreferens</dt><dd>{row.workId||'Arbetsreferens saknas'}</dd></div><div><dt>Order-ID</dt><dd>{row.orderId}</dd></div><div><dt>Produktionsstatus</dt><dd>{statusLabel[row.status]}</dd></div></dl>
    <p className="account-review-work-reason"><AlertTriangle size={17} aria-hidden="true"/><span>{reasons[row.reason]}</span></p>
   </article></li>)}</ol>
   {!visible.rows.length&&<p className="account-review-work-empty">Inga läsbara ansvarsdelar visas i det här underlaget. Ändringen är fortfarande spärrad; hämta kontoändringens granskning igen innan du går vidare.</p>}
   {visible.nextOffset!==null&&<Button type="button" variant="outline" disabled={loading} onClick={()=>void load(visible.nextOffset!)}>{loading?'Hämtar fler ansvarsdelar…':'Visa fler ansvarsdelar'}</Button>}
  </>}
  {loading&&<p className="account-change-feedback" role="status" aria-atomic="true">Hämtar aktuella ansvarsdelar. Kontoändringens formulärvärden finns kvar.</p>}
  {error&&<p ref={errorNode} tabIndex={-1} className="error account-change-feedback" role="alert">{error} Tidigare arbetsunderlag används inte. Kontoändringens formulärvärden finns kvar.</p>}
  <p className="biz-hint">Kontrollera rätt arbetsyta och jobbreferens och använd ansvarets befintliga arbetsflöde. Den här listan flyttar inget arbete och rättar inte oklara kontokopplingar. Hämta kontoändringens granskning igen efter att ansvaret har hanterats.</p>
 </section>;
}
