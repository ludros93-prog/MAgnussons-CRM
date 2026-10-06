'use client';
import {useEffect,useRef,useState,type FocusEvent,type MouseEvent} from 'react';
import {Save} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import type {State} from '@/lib/crm';
import {ArticleSchema,type Article} from '@/lib/operations';
import {recordBasis} from '@/lib/record-conflicts';
import {ArticleDraftEnvelopeSchema,ArticleDraftValuesSchema,isArticleDraft,type ArticleDraftEnvelope,type ArticleDraftValues} from '@/lib/article-drafts';
import {DraftStatus,useDrafts} from './draft-workspace';
import {BusinessField as F,Pick,money} from './business-ui';

export type ArticleSave=(data:unknown,expectedRecord:string,onFailure:(status:number,message?:string)=>void)=>Promise<boolean>;
export type ArticleEditorProps={st:State;article:Article;draftId?:string;busy:boolean;save:ArticleSave;onClose:()=>void};
type ArticleAttempt={data:ArticleDraftValues&{draft:{id:string;revision:number}};expectedRecord:string};
const textFields=[['sku','Artikelnummer *',200],['name','Benämning *',300],['color','Färg',200],['size','Storlek',100],['variant','Övrig variant',4000],['variantId','Variant-ID hos leverantören',200],['unit','Enhet',30],['url','Produktlänk',2000]] as const;
const draftTitle=(values:ArticleDraftValues)=>('Artikel · '+(values.name.trim()||values.sku.trim()||'Påbörjade artikeluppgifter')).slice(0,200);

function ArticleSnapshot({article,st}:{article:Article;st:State}){
 const source=st.settings.catalogSources.find(row=>row.id===article.sourceId);
 return <dl className="article-draft-snapshot">
  {textFields.map(([key,label])=><div key={key}><dt>{label.replace(' *','')}</dt><dd>{article[key]||'Ej angivet'}</dd></div>)}
  <div><dt>Artikelkälla</dt><dd>{source?.name||article.sourceId||'Ej angivet'}</dd></div>
  <div><dt>Pris exkl. moms</dt><dd>{article.price===null?'Ej angivet':money(article.price)}</dd></div>
  <div><dt>Direkt kostnad</dt><dd>{article.cost===null?'Ej angivet':money(article.cost)}</dd></div>
  <div><dt>Aktiv artikel</dt><dd>{article.active?'Ja':'Nej'}</dd></div>
 </dl>;
}

export function ArticleEditor({st,article,draftId,busy,save,onClose}:ArticleEditorProps){
 const w=useDrafts(),enabled=st.viewer?.role==='admin';
 const opening=useRef(structuredClone(article)),newId=useRef(''),initialized=useRef(false),lock=useRef(false),alive=useRef(true);
 const ws=useRef(w),state=useRef(st),retryAttempt=useRef<ArticleAttempt|null>(null),panel=useRef<HTMLDivElement>(null),status=useRef<HTMLDivElement>(null),review=useRef<HTMLDivElement>(null),focusCleanup=useRef<()=>void>(()=>{});
 ws.current=w;state.current=st;
 const [activeId,setActiveId]=useState(draftId||''),[operation,setOperation]=useState(''),[failure,setFailure]=useState(''),[crmMessage,setCrmMessage]=useState(''),[retry,setRetry]=useState<ArticleAttempt|null>(null),[discard,setDiscard]=useState(false),[reviewArticle,setReviewArticle]=useState<Article|null>(null),[reviewed,setReviewed]=useState(false);
 const local=enabled?w.records.find(row=>row.id===activeId&&isArticleDraft(row.kind,row.context)):undefined;
 const parsed=local?ArticleDraftEnvelopeSchema.safeParse(local.data):null,envelope=parsed?.success&&parsed.data.draftId===local?.id?parsed.data:undefined,values=envelope?.data;
 const current=envelope?.base.id?st.articles.find(row=>row.id===envelope.base.id):undefined,currentBasis=recordBasis(current);
 const missing=!!envelope?.base.id&&!current,conflict=!!envelope?.base.id&&currentBasis!==envelope.expectedRecord,draftConflict=local?.status==='conflict';
 const locked=busy||!!operation;
 const valid=values?ArticleSchema.safeParse(values):null;
 const sourceExists=!!values&&st.settings.catalogSources.some(row=>row.id===values.sourceId);
 const reviewBasis=reviewArticle?recordBasis(reviewArticle):'';

 useEffect(()=>{alive.current=true;return()=>{alive.current=false;focusCleanup.current()}},[]);
 function clearRetry(){retryAttempt.current=null;setRetry(null)}
 function clearReview(){setReviewArticle(null);setReviewed(false)}
 // Generation changes mean user input or an explicit private version choice.
 // Private autosave only changes status/revision and cannot clear a CRM notice.
 useEffect(()=>{clearRetry();clearReview();setDiscard(false)},[local?.generation]);
 useEffect(()=>setReviewed(false),[currentBasis]);
 function reveal(target:HTMLElement|null){if(!target?.isConnected)return;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'})}
 function showFailure(message:string){if(!alive.current)return;setFailure(message);requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
 function currentEnvelope(){
  const record=ws.current.get(activeId);
  if(!record||!isArticleDraft(record.kind,record.context))return null;
  const p=ArticleDraftEnvelopeSchema.safeParse(record.data);
  return p.success&&p.data.draftId===record.id?{record,envelope:p.data}:null;
 }
 async function resume(id:string){
  if(lock.current||busy||!enabled)return;
  lock.current=true;setOperation('open');setActiveId(id);
  try{
   await ws.current.reconcile(id);if(!alive.current)return;
   const record=ws.current.get(id);
   if(!record||!isArticleDraft(record.kind,record.context))setFailure('Det valda artikelutkastet saknas, är avslutat eller hör till ett annat arbete. Inga andra utkast har öppnats.');
  }catch{showFailure('Artikelutkastet kunde inte kontrolleras. Dina bevarade uppgifter har inte ersatts. Försök hämta utkasten igen.')}
  finally{lock.current=false;if(alive.current)setOperation('')}
 }
 useEffect(()=>{
  if(initialized.current||!w.ready||!enabled||busy)return;
  initialized.current=true;
  if(draftId){void resume(draftId);return}
  const base=ArticleSchema.safeParse(opening.current);
  if(!base.success){setFailure('Artikelns ursprungliga underlag kunde inte läsas. Inget privat utkast har skapats.');return}
  const data=ArticleDraftValuesSchema.safeParse(base.data);
  if(!data.success){setFailure('Artikeluppgifterna kunde inte öppnas som privat utkast. Det gemensamma registret har inte ändrats.');return}
  if(!newId.current)newId.current=crypto.randomUUID();
  const basis=recordBasis(base.data),initial:ArticleDraftEnvelope={draftId:newId.current,type:'article',data:data.data,base:base.data,expectedRecord:basis,initialData:basis};
  const id=w.create('form','article',initial,draftTitle(data.data),newId.current);
  if(id)setActiveId(id);else{initialized.current=false;setFailure('Ditt privata artikelutkast kunde inte öppnas. Försök igen när utkasten har hämtats.')}
 },[w.ready,w.records,enabled,busy,draftId]);
 function update<K extends keyof ArticleDraftValues>(key:K,value:ArticleDraftValues[K]){
  if(!enabled||locked||lock.current)return;
  const saved=currentEnvelope();if(!saved||saved.record.status==='conflict')return;
  const next={...saved.envelope.data,[key]:value};
  clearRetry();clearReview();setDiscard(false);setFailure('');
  ws.current.update(activeId,{...saved.envelope,data:next},draftTitle(next));
 }
 function numberValue(key:'price'|'cost',value:string){
  const number=value.trim()===''?null:Number(value);
  if(number===null||Number.isFinite(number))update(key,number);
 }
 function draftAction(event:MouseEvent<HTMLDivElement>){
  if(!(event.target instanceof Element)||!event.target.closest('button'))return;
  if(lock.current||busy){event.preventDefault();event.stopPropagation();return}
  if(draftConflict){clearRetry();clearReview();setDiscard(false)}
 }
 async function close(){
  if(locked||lock.current)return;
  if(!enabled){onClose();return}
  // Failed initial loading has exposed no editable values and created no draft.
  // Keep the loading error recoverable without trapping an empty panel.
  if(!initialized.current&&!local){onClose();return}
  if(!ws.current.ready){showFailure('Dina privata utkast har inte hämtats. Försök hämta dem igen innan du lämnar artikelpanelen.');return}
  if(!activeId||!ws.current.get(activeId)){onClose();return}
  lock.current=true;setOperation('close');setFailure('');
  try{
   if(await ws.current.flush(activeId)===null){showFailure(ws.current.get(activeId)?.error||'Det privata artikelutkastet kunde inte sparas. Dina uppgifter finns kvar. Försök igen innan du stänger.');return}
   if(alive.current)onClose();
  }catch{showFailure('Det privata artikelutkastet kunde inte sparas. Dina uppgifter finns kvar. Försök igen innan du stänger.')}
  finally{lock.current=false;if(alive.current)setOperation('')}
 }
 async function remove(){
  if(locked||lock.current||!enabled||!activeId)return;
  lock.current=true;setOperation('discard');setFailure('');
  try{if(await ws.current.archive(activeId)){if(alive.current)onClose()}else showFailure(ws.current.get(activeId)?.error||'Det privata artikelutkastet kunde inte tas bort. Dina uppgifter finns kvar.')}
  catch{showFailure('Det privata artikelutkastet kunde inte tas bort. Dina uppgifter finns kvar.')}
  finally{lock.current=false;if(alive.current)setOperation('')}
 }
 function openReview(){
  if(locked||lock.current||!envelope||draftConflict||!current)return;
  setReviewArticle(structuredClone(current));setReviewed(false);
  requestAnimationFrame(()=>{if(alive.current)reveal(review.current)});
 }
 function adopt(){
  if(locked||lock.current||!reviewArticle||!reviewed)return;
  const saved=currentEnvelope(),latest=state.current.articles.find(row=>row.id===reviewArticle.id);
  if(!saved||saved.record.status==='conflict'||!latest||recordBasis(latest)!==reviewBasis)return;
  const basis=recordBasis(latest);
  ws.current.update(activeId,{...saved.envelope,base:structuredClone(latest),expectedRecord:basis,initialData:basis});
  clearRetry();clearReview();setFailure('Dina artikelvärden finns kvar. Det granskade underlaget är nu valt för ditt privata utkast. Spara sedan uttryckligen i CRM.');
 }
 async function copyValues(){
  if(locked||lock.current)return;
  const saved=ws.current.get(activeId);if(!saved)return;
  try{await navigator.clipboard.writeText(JSON.stringify(envelope?.data??saved.data,null,2));if(alive.current)setFailure('Dina bevarade artikeluppgifter är kopierade.')}
  catch{showFailure('Kunde inte kopiera. Visa de bevarade uppgifterna och kopiera dem direkt från texten.')}
 }
 async function submit(){
  if(!enabled||locked||lock.current)return;
  if(!retryAttempt.current&&(!envelope||conflict||draftConflict||!valid?.success||!sourceExists))return;
  lock.current=true;setOperation('draft');setFailure('');
  let attempt=retryAttempt.current,crmStarted=false;
  try{
   if(!attempt){
    if(!await ws.current.reconcile(activeId)){showFailure(ws.current.get(activeId)?.error||'Utkastet har ändrats på en annan enhet. Välj vilken version du vill använda.');return}
    const ref=await ws.current.flush(activeId);if(!alive.current)return;
    const saved=currentEnvelope();
    if(!ref||!saved||saved.record.status!=='saved'||saved.record.revision!==ref.revision){showFailure(ws.current.get(activeId)?.error||'Det privata artikelutkastet kunde inte sparas. Dina uppgifter finns kvar.');return}
    const currentArticle=saved.envelope.base.id?state.current.articles.find(row=>row.id===saved.envelope.base.id):undefined;
    if(saved.envelope.base.id&&(!currentArticle||recordBasis(currentArticle)!==saved.envelope.expectedRecord)){showFailure(currentArticle?'Artikeln har ändrats. Dina uppgifter finns kvar. Granska aktuell artikel innan du sparar i CRM.':'Artikeln finns inte längre i arbetsytan. Ditt privata utkast finns kvar.');return}
    if(!ArticleSchema.safeParse(saved.envelope.data).success||!state.current.settings.catalogSources.some(row=>row.id===saved.envelope.data.sourceId)){showFailure('Kontrollera artikelnummer, benämning, källa, produktlänk och priser före sparning i CRM. Ditt privata utkast finns kvar.');return}
    attempt={data:{...structuredClone(saved.envelope.data),draft:ref},expectedRecord:saved.envelope.expectedRecord};
   }
   // A lost acknowledgement may have saved the article and archived its draft.
   // Replay the exact values, reference and basis without reconcile or flush.
   crmStarted=true;setOperation('crm');setCrmMessage('');let responseStatus=0,message='';
   const ok=await save(attempt.data,attempt.expectedRecord,(code,text)=>{responseStatus=code;message=text||''});
   if(!alive.current)return;
   if(ok){ws.current.consume(attempt.data.draft.id);clearRetry();onClose();return}
   const notice=message||'Sparningen i CRM kunde inte bekräftas. Artikeln kan redan ha sparats. Dina uppgifter finns kvar.';
   setCrmMessage(notice);
   if(responseStatus===0||responseStatus>=500){retryAttempt.current=attempt;setRetry(attempt)}
   else{clearRetry();if(responseStatus===409)await ws.current.reconcile(activeId)}
   requestAnimationFrame(()=>{if(alive.current)reveal(status.current)});
  }catch{
   if(alive.current){
    if(crmStarted&&attempt){retryAttempt.current=attempt;setRetry(attempt);setCrmMessage('Sparningen i CRM kunde inte bekräftas. Artikeln kan redan ha sparats. Dina uppgifter finns kvar. Försök samma sparning igen.');requestAnimationFrame(()=>{if(alive.current)reveal(status.current)})}
    else showFailure('Det privata artikelutkastet kunde inte sparas. Dina uppgifter finns kvar. Försök igen.');
   }
  }finally{lock.current=false;if(alive.current)setOperation('')}
 }
 // Reveal the same native focused control as the existing article panel.
 // Animation/size changes may recheck visibility; autosave never moves focus.
 function revealFocusedControl(event:FocusEvent<HTMLDivElement>){
  const sheet=event.currentTarget,control=event.target;
  if(!(control instanceof HTMLElement)||!control.matches('input,textarea,button,summary,[role=combobox]'))return;
  focusCleanup.current();let stopped=false,frame=0;
  const revealControl=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   if(stopped)return;
   if(!alive.current||!control.isConnected||document.activeElement!==control||!sheet.contains(control)){stop();return}
   const box=control.getBoundingClientRect(),bounds=sheet.getBoundingClientRect(),top=Math.max(0,bounds.top)+12,bottom=Math.min(window.innerHeight,bounds.bottom)-12;
   if(box.height>bottom-top)return;
   if(box.top<top)sheet.scrollBy({top:box.top-top,behavior:'instant'});
   else if(box.bottom>bottom)sheet.scrollBy({top:box.bottom-bottom,behavior:'instant'});
  })};
  const observer=new ResizeObserver(revealControl);
  function stop(){stopped=true;cancelAnimationFrame(frame);observer.disconnect();sheet.removeEventListener('animationend',revealControl)}
  focusCleanup.current=stop;observer.observe(sheet);observer.observe(control);sheet.addEventListener('animationend',revealControl);revealControl();
 }
 const submitDisabled=locked||!envelope||(!retry&&(conflict||draftConflict||!valid?.success||!sourceExists));
 const operationMessage=operation==='crm'?'Sparar artikeln i CRM. Vänta innan du stänger.':operation==='close'?'Sparar privat artikelutkast inför stängning…':operation==='discard'?'Tar bort privat artikelutkast…':operation==='open'?'Kontrollerar det valda artikelutkastet…':operation?'Kontrollerar och sparar ditt privata utkast…':'';
 return <Sheet open onOpenChange={open=>{if(!open&&!locked&&!lock.current)void close()}}><SheetContent ref={panel} className="crm-sheet article-draft-editor" showCloseButton={!locked} onFocusCapture={revealFocusedControl} onEscapeKeyDown={event=>{if(locked||lock.current)event.preventDefault()}} onPointerDownOutside={event=>{if(locked||lock.current)event.preventDefault()}} onInteractOutside={event=>{if(locked||lock.current)event.preventDefault()}}>
  <SheetHeader><SheetTitle>Artikel</SheetTitle><SheetDescription>{enabled?'Privat utkast · bara synligt för dig. Gemensamt artikelregister ändras först när du sparar artikeln i CRM.':'Artikelregistrering kräver administratörsbehörighet.'}</SheetDescription></SheetHeader>
  {!enabled?<div className="sheet-body"><p>Ditt konto har inte behörighet att öppna privata artikelutkast.</p><Button variant="outline" onClick={onClose}>Stäng</Button></div>:<div className="sheet-body business-ui">
   {local&&<details className="article-draft-identity"><summary>Valt privat artikelutkast</summary><p>{local.title}</p><dl><div><dt>Utkastets id</dt><dd>{local.id}</dd></div></dl></details>}
   {local&&!envelope&&<div className="record-conflict article-draft-recovery"><h3>Artikelutkastets underlag kunde inte läsas</h3><p>Dina bevarade uppgifter har inte ersatts. Kopiera dem innan du öppnar annat arbete. Formatet behöver återställas innan det kan ändras.</p><Button disabled={locked} variant="outline" onClick={()=>void copyValues()}>Kopiera bevarade artikeluppgifter</Button><details><summary>Visa bevarade artikeluppgifter</summary><pre>{JSON.stringify(local.data,null,2)}</pre></details></div>}
   {envelope&&values&&<fieldset disabled={locked||draftConflict} className="article-draft-fields">
    {conflict&&<div className="record-conflict article-draft-conflict"><h3>{missing?'Artikeln finns inte längre i arbetsytan':'Artikeln har ändrats i det gemensamma registret'}</h3><p>Dina privata artikelvärden finns kvar. {missing?'Utkastet kan inte ersätta en artikel som saknas. Kopiera uppgifterna eller behåll utkastet.':'Jämför det ursprungliga och senast inlästa artikelunderlaget innan du väljer vilket underlag du ska använda.'}</p><div className="article-draft-actions"><Button type="button" variant="outline" onClick={()=>void copyValues()}>Kopiera mina artikeluppgifter</Button>{current&&<Button type="button" variant="outline" onClick={openReview}>Granska aktuell artikel</Button>}</div><details><summary>Visa ursprungligt artikelunderlag</summary><ArticleSnapshot article={envelope.base} st={st}/></details></div>}
    {reviewArticle&&<div ref={review} tabIndex={-1} className="article-draft-review" aria-label="Granska aktuellt artikelunderlag"><h3>Aktuellt inläst artikelunderlag</h3><ArticleSnapshot article={reviewArticle} st={st}/>{reviewBasis!==currentBasis?<><p>Artikeln ändrades igen. Granska den senaste inlästa versionen innan du väljer underlag.</p><Button type="button" variant="outline" onClick={openReview}>Granska senaste artikelversionen</Button></>:<label className="check-field"><Checkbox checked={reviewed} onCheckedChange={value=>{if(!lock.current&&!busy)setReviewed(value===true)}}/>Jag har jämfört mina värden med denna artikelversion</label>}<Button type="button" disabled={!reviewed||reviewBasis!==currentBasis||missing} onClick={adopt}>Använd detta underlag och behåll mina värden</Button><p>Detta ändrar bara ditt privata utkast. Artikelregistret ändras först vid sparning i CRM.</p></div>}
    {textFields.map(([key,label,max])=><F key={key} label={label}><Input maxLength={max} value={values[key]} onChange={event=>update(key,event.target.value)}/></F>)}
    <F label="Artikelkälla"><Pick label="Artikelns källa" value={values.sourceId} items={[{id:'',label:'Välj artikelkälla'},...st.settings.catalogSources.map(source=>({id:source.id,label:source.name})),...values.sourceId&&!sourceExists?[{id:values.sourceId,label:'Källa saknas · '+values.sourceId}]:[]]} onChange={value=>update('sourceId',value)}/></F>
    <div className="biz-grid"><F label="Pris exkl. moms"><Input type="number" step="0.01" value={values.price??''} onChange={event=>numberValue('price',event.target.value)}/></F><F label="Direkt kostnad"><Input type="number" step="0.01" value={values.cost??''} onChange={event=>numberValue('cost',event.target.value)}/></F></div>
    <label className="check-field"><Checkbox checked={values.active} onCheckedChange={value=>update('active',value===true)}/>Artikeln är aktiv</label>
    {!valid?.success&&<p className="article-draft-hint">Ofärdiga uppgifter kan sparas privat. Före sparning i CRM behöver artikelnummer, benämning, källa, produktlänk och priser vara giltiga.</p>}
    {!sourceExists&&values.sourceId&&<p className="article-draft-hint">Den sparade artikelkällan finns inte längre. Dina värden finns kvar; välj en tillgänglig källa före sparning i CRM.</p>}
   </fieldset>}
   <div className="article-draft-save" aria-label="Sparstatus för privat artikelutkast" onClickCapture={draftAction}><b>Privat artikelutkast</b><DraftStatus id={activeId} disabled={locked} announce onResolved={()=>{clearRetry();clearReview();setDiscard(false)}} onClosed={()=>{clearRetry();onClose()}}/><p>Privat sparning ändrar inga gemensamma artiklar eller kundorder.</p></div>
   <div ref={status} tabIndex={-1} className="article-draft-message" role="status" aria-live="polite" aria-atomic="true">{operationMessage&&<p><strong>{operationMessage}</strong></p>}{failure&&<p>{failure}</p>}{crmMessage&&<p><strong>Besked från CRM-sparningen:</strong> {crmMessage}</p>}{retry&&<p>Försök igen använder exakt samma uppgifter som förra försöket. Ändrar du ett fält eller väljer annan version blir det en ny sparning.</p>}</div>
   {local&&envelope&&<div className="article-draft-discard"><Button type="button" disabled={locked} variant="ghost" onClick={()=>setDiscard(true)}>Ta bort privat utkast</Button>{discard&&<><p>Detta tar bort ditt privata utkast. Artikelns sparade CRM-uppgifter ändras inte. En tidigare obekräftad CRM-sparning kan redan ha lyckats.</p><div className="article-draft-actions"><Button type="button" disabled={locked} variant="outline" onClick={()=>void remove()}>Ja, ta bort utkast</Button><Button type="button" disabled={locked} variant="ghost" onClick={()=>setDiscard(false)}>Behåll utkast</Button></div></>}</div>}
   <div className="article-draft-footer"><Button type="button" disabled={locked} variant="outline" onClick={()=>void close()}>{local?'Spara utkast & stäng':'Stäng'}</Button>{envelope&&<Button type="button" disabled={submitDisabled} onClick={()=>void submit()}><Save size={16}/>{operation==='crm'?'Sparar artikel…':retry?'Försök samma CRM-sparning igen':'Spara artikel i CRM'}</Button>}</div>
  </div>}
 </SheetContent></Sheet>;
}
