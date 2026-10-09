'use client';
import {createContext,useContext,useEffect,useId,useMemo,useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {Download,FileJson,FolderOpen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {PRIVATE_DRAFT_COPY_MAX_FILE_BYTES,parsePrivateDraftCopy,type PrivateDraftCopy} from '@/lib/private-draft-copy';

type Scope={key:string;active:boolean;controllers:Set<AbortController>};
type LocalCopy={copy:PrivateDraftCopy;raw:string;name:string};
type Presentation={key:string;scope:Scope;open:boolean;fetching:boolean;reading:boolean;message:string;error:string;local:LocalCopy|null;archived:boolean;selected:number;limit:number;showFile:boolean;showRaw:boolean};
type CopyWorkspace={enabled:boolean;open:(event:MouseEvent<HTMLButtonElement>)=>void};
const Context=createContext<CopyWorkspace|null>(null);
const initial=(key:string,scope:Scope):Presentation=>({key,scope,open:false,fetching:false,reading:false,message:'',error:'',local:null,archived:false,selected:-1,limit:20,showFile:false,showRaw:false});
const kindLabels:Record<string,string>={catalog:'Offert-/orderutkast',production:'Tryckunderlag',note:'Anteckning',followup:'Kunduppföljning',form:'Påbörjade uppgifter',plan:'Kundplan',prospecting:'Nykundsbearbetning',onboarding:'Onboarding',receipt:'Leveransbesked'};
const readableLabels:Record<string,string>={text:'Text',notes:'Anteckningar',note:'Anteckning',message:'Meddelande',reason:'Orsak',goal:'Mål',nextAction:'Nästa steg',title:'Rubrik',name:'Namn',need:'Behov',receivedBy:'Mottagningsunderlag',description:'Beskrivning'};
const plainObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
/** Display-only decoding of a small, known set of text fields. The original
 * raw envelope is kept separately and never normalized, imported or saved. */
function readableText(raw:string):{label:string;value:string}[]{
 try{
  const parsed:unknown=JSON.parse(raw);if(!plainObject(parsed))return [];
  const values=plainObject(parsed.values)?parsed.values:plainObject(parsed.data)?parsed.data:parsed;
  return Object.entries(readableLabels).flatMap(([key,label])=>typeof values[key]==='string'&&values[key]!==''?[{label,value:values[key] as string}]:[]).slice(0,12);
 }catch{return [];}
}
function displayTime(value:string){
 const parsed=new Date(value);
 return Number.isFinite(parsed.getTime())&&parsed.toISOString()===value?parsed.toLocaleString('sv-SE',{timeZone:'Europe/Stockholm',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):value||'Tid saknas';
}

export function PrivateDraftCopyEntry(){
 const workspace=useContext(Context);
 if(!workspace?.enabled)return null;
 return <Button type="button" variant="outline" className="private-draft-copy-entry-button" onClick={workspace.open}><FileJson size={17} aria-hidden="true"/>Kopia av mina utkast</Button>;
}

export function PrivateDraftCopyTools({space,userId,enabled,identityKey,pendingCount,children}:{space:string;userId:string;enabled:boolean;identityKey:string;pendingCount:number;children:ReactNode}){
 const key=JSON.stringify([space,userId,enabled,identityKey]);
 const lifecycle=useRef<Scope>({key,active:enabled&&!!userId&&['demo','live'].includes(space),controllers:new Set()});
 // A changed account or workspace invalidates old promises during render,
 // before effects can run or old contents can become visible again.
 if(lifecycle.current.key!==key){lifecycle.current.active=false;lifecycle.current={key,active:enabled&&!!userId&&['demo','live'].includes(space),controllers:new Set()};}
 const scope=lifecycle.current;
 const [state,setState]=useState<Presentation>(()=>initial(key,scope));
 const shown=state.key===key&&state.scope===scope?state:initial(key,scope);
 const openRef=useRef<{scope:Scope;generation:number}|null>(null),generation=useRef(0),fileAttempt=useRef(0),fetchAttempt=useRef(0),clipboardAttempt=useRef(0);
 const downloading=useRef<{scope:Scope;epoch:number}|null>(null);
 const opener=useRef<{element:HTMLButtonElement;scope:Scope}|null>(null),heading=useRef<HTMLHeadingElement|null>(null);
 const fileLabel=useId(),recordLabel=useId(),rawLabel=useId(),fileRawLabel=useId();
 const current=(session:Scope,epoch:number)=>lifecycle.current===session&&session.active&&openRef.current?.scope===session&&openRef.current.generation===epoch;
 function patch(session:Scope,epoch:number,change:Partial<Presentation>){if(current(session,epoch))setState(s=>s.key===session.key&&s.scope===session?{...s,...change}:s);}
 useEffect(()=>{
  scope.active=enabled&&!!userId&&['demo','live'].includes(space);
  return()=>{scope.active=false;for(const controller of scope.controllers)controller.abort();scope.controllers.clear();};
 },[key]);
 function open(event:MouseEvent<HTMLButtonElement>){
  if(!scope.active||lifecycle.current!==scope)return;
  opener.current={element:event.currentTarget,scope};
  openRef.current={scope,generation:++generation.current};
  fileAttempt.current++;fetchAttempt.current++;clipboardAttempt.current++;
  setState({...initial(key,scope),open:true});
 }
 function close(){
  if(lifecycle.current!==scope)return;
  openRef.current=null;generation.current++;fileAttempt.current++;fetchAttempt.current++;clipboardAttempt.current++;
  for(const controller of scope.controllers)controller.abort();scope.controllers.clear();
  setState(initial(key,scope));
 }
 async function fetchCopy(){
  const session=scope,epoch=openRef.current?.generation;
  if(epoch===undefined||!current(session,epoch)||shown.fetching||(space!=='demo'&&space!=='live')||downloading.current?.scope===session&&downloading.current.epoch===epoch)return;
  const attempt=++fetchAttempt.current,job={scope:session,epoch};downloading.current=job;
  const controller=new AbortController();session.controllers.add(controller);
  patch(session,epoch,{fetching:true,error:'',message:''});
  const same=()=>current(session,epoch)&&fetchAttempt.current===attempt;
  try{
   const response=await fetch('/api/crm/drafts/copy?'+new URLSearchParams({space}),{cache:'no-store',signal:controller.signal});
   if(!same())return;
   if(!response.ok){
    let message='Dina sparade utkast kunde inte hämtas. Försök igen.';
    try{const result=await response.json() as {error?:unknown};if(typeof result?.error==='string'&&result.error.trim())message=result.error;}catch{}
    if(!same())return;
    throw Error(message);
   }
   const blob=await response.blob();if(!same())return;
   if(blob.size>PRIVATE_DRAFT_COPY_MAX_FILE_BYTES)throw Error('Utkastkopian är för stor för att öppnas här.');
   const raw=await blob.text();if(!same())return;
   const copy=await parsePrivateDraftCopy(raw,{ownerUserId:userId,space});if(!same())return;
   // Validate even successful HTTP responses. A late response from a previous
   // scope must never create an object URL or initiate a browser download.
   const url=URL.createObjectURL(blob);
   try{
    if(!same())return;
    const link=document.createElement('a');link.href=url;
    link.download='magnussons-mina-utkast-'+space+'-'+copy.exportedAt.slice(0,10)+'.json';
    document.body.appendChild(link);
    try{if(same())link.click();}finally{link.remove();}
    if(same())patch(session,epoch,{message:'Kopian har lämnats till webbläsaren. Kontrollera dina hämtade filer för att se om den sparades.'});
   }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(error){if(same())patch(session,epoch,{error:error instanceof Error?error.message:'Dina sparade utkast kunde inte hämtas. Försök igen.'});}
  finally{session.controllers.delete(controller);if(downloading.current===job)downloading.current=null;if(same())patch(session,epoch,{fetching:false});}
 }
 async function openFile(file:File){
  const session=scope,epoch=openRef.current?.generation,attempt=++fileAttempt.current;
  if(epoch===undefined||!current(session,epoch)||(space!=='demo'&&space!=='live'))return;
  clipboardAttempt.current++;
  patch(session,epoch,{reading:true,error:'',message:'',local:null,selected:-1,showFile:false,showRaw:false,limit:20});
  const same=()=>current(session,epoch)&&fileAttempt.current===attempt;
  try{
   if(file.size>PRIVATE_DRAFT_COPY_MAX_FILE_BYTES)throw Error('Välj en utkastkopia på högst 32 MB.');
   const raw=await file.text();if(!same())return;
   const copy=await parsePrivateDraftCopy(raw,{ownerUserId:userId,space});if(!same())return;
   const selected=copy.records.findIndex(row=>!row.archived),archived=selected<0&&copy.records.some(row=>row.archived);
   patch(session,epoch,{local:{copy,raw,name:file.name},archived,selected:selected>=0?selected:copy.records.findIndex(row=>row.archived)});
  }catch(error){if(same())patch(session,epoch,{error:error instanceof Error?error.message:'Kopian kunde inte öppnas. Välj en hel utkastkopia från samma konto och arbetsyta.'});}
  finally{if(same())patch(session,epoch,{reading:false});}
 }
 async function copyText(text:string){
  const session=scope,epoch=openRef.current?.generation;if(epoch===undefined||!current(session,epoch))return;
  const attempt=++clipboardAttempt.current,same=()=>current(session,epoch)&&clipboardAttempt.current===attempt;
  patch(session,epoch,{error:'',message:''});
  try{await navigator.clipboard.writeText(text);if(same())patch(session,epoch,{message:'Texten är kopierad.'});}
  catch{if(same())patch(session,epoch,{error:'Webbläsaren kunde inte kopiera. Markera texten i läsfältet och kopiera den själv.'});}
 }
 const local=shown.local,records=local?.copy.records||[],selected=records[shown.selected];
 const readable=useMemo(()=>selected?readableText(selected.dataRaw):[],[selected?.dataRaw]);
 const visible=records.map((row,index)=>({row,index})).filter(({row})=>row.archived===shown.archived);
 function chooseArchived(archived:boolean){
  const epoch=openRef.current?.generation;if(epoch===undefined)return;
  clipboardAttempt.current++;
  patch(scope,epoch,{archived,selected:records.findIndex(row=>row.archived===archived),limit:20,showRaw:false,message:'',error:''});
 }
 return <Context.Provider value={{enabled:scope.active,open}}>{children}
  <Sheet open={scope.active&&shown.open} onOpenChange={value=>{if(!value)close()}}>
   <SheetContent className="crm-sheet private-draft-copy-sheet" onOpenAutoFocus={event=>{event.preventDefault();heading.current?.focus({preventScroll:true});}} onCloseAutoFocus={event=>{event.preventDefault();const origin=opener.current;if(origin&&origin.scope===lifecycle.current&&origin.scope.active&&origin.element.isConnected)origin.element.focus({preventScroll:true});}}>
    <SheetHeader><SheetTitle ref={heading} tabIndex={-1}>Kopia av mina utkast</SheetTitle><SheetDescription>Din egen filkopia, utanför CRM.</SheetDescription></SheetHeader>
    <div className="sheet-body private-draft-copy-body">
     <p className="private-draft-copy-scope">{space==='demo'?'Demoytan':'Teamets arbetsyta'} · bara dina utkast</p>
     <section className="private-draft-copy-card" aria-label="Hämta en egen filkopia">
      <h3>Behåll en egen filkopia</h3>
      <p>Hämta dina sparade aktiva och arkiverade utkast från den här arbetsytan.</p>
      <p>Kopian innehåller bara den senaste version som servern har bekräftat. Ändringar som väntar på sparning ingår inte. Vänta på ”Sparat som privat utkast” om du vill få med dem.</p>
      {pendingCount>0&&<p className="private-draft-copy-note">{pendingCount===1?'Ett öppet utkast har':pendingCount+' öppna utkast har'} ändringar som ännu inte är bekräftat sparade.</p>}
      <Button type="button" disabled={shown.fetching} onClick={fetchCopy}><Download size={17} aria-hidden="true"/>{shown.fetching?'Hämtar sparade utkast…':'Hämta mina sparade utkast'}</Button>
     </section>
     <section className="private-draft-copy-card" aria-labelledby={fileLabel}>
      <h3 id={fileLabel}><FolderOpen size={18} aria-hidden="true"/>Öppna en utkastkopia</h3>
      <p>Läs en tidigare filkopia från samma konto och arbetsyta. Filen stannar i din webbläsare och laddas inte upp eller sparas i CRM.</p>
      <label className="private-draft-copy-file-label">Välj JSON-fil, högst 32 MB<Input type="file" accept=".json,application/json" aria-label="Öppna en utkastkopia" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void openFile(file);}}/></label>
      {shown.reading&&<p role="status">Kontrollerar filkopian…</p>}
     </section>
     <div className="private-draft-copy-message" aria-live="polite" aria-atomic="true">{shown.message&&<p role="status">{shown.message}</p>}{shown.error&&<p className="error" role="alert">{shown.error}</p>}</div>
     <p className="private-draft-copy-boundary">Kundfiler, Outlook-data och inloggningar ingår inte. En arkiverad post visar inte om innehållet har sparats i CRM. Förvara filkopian privat.</p>
     {local&&<section className="private-draft-copy-viewer" aria-labelledby={recordLabel}>
      <h3 id={recordLabel}>Läs filkopian</h3>
      <p className="private-draft-copy-file-name">{local.name}</p>
      <p>Kopian hör till ditt konto och den här arbetsytan. Här kan du läsa och kopiera texten.</p>
      <details className="private-draft-copy-technical"><summary>Om filkontrollen</summary><p>Utkastens innehåll stämmer med kontrollsumman. Kontrollsumman är ingen signatur från servern.</p></details>
      <dl className="private-draft-copy-metadata"><div><dt>Skapad</dt><dd>{displayTime(local.copy.exportedAt)}</dd></div><div><dt>Antal sparade poster</dt><dd>{records.length}</dd></div></dl>
      <div className="private-draft-copy-filters" aria-label="Visa utkast i filkopian"><Button type="button" variant={shown.archived?'outline':'default'} aria-pressed={!shown.archived} onClick={()=>chooseArchived(false)}>Aktiva ({records.filter(row=>!row.archived).length})</Button><Button type="button" variant={shown.archived?'default':'outline'} aria-pressed={shown.archived} onClick={()=>chooseArchived(true)}>Arkiverade ({records.filter(row=>row.archived).length})</Button></div>
      {shown.archived&&<p className="private-draft-copy-note">Arkiverade utkast är avslutade eller borttagna. Här kan du läsa och kopiera texten. De öppnas inte på nytt i CRM.</p>}
      <ul className="private-draft-copy-records">{visible.slice(0,shown.limit).map(({row,index})=><li key={index}><button type="button" aria-pressed={shown.selected===index} onClick={()=>{const epoch=openRef.current?.generation;if(epoch!==undefined){clipboardAttempt.current++;patch(scope,epoch,{selected:index,showRaw:false,message:'',error:''});}}}><b>{row.title||'Utkast utan titel'}</b><span>{kindLabels[row.kind]||'Sparat utkast'}</span></button></li>)}</ul>
      {!visible.length&&<p>Inga {shown.archived?'arkiverade':'aktiva'} utkast i kopian.</p>}
      {visible.length>shown.limit&&<Button type="button" variant="outline" onClick={()=>{const epoch=openRef.current?.generation;if(epoch!==undefined)patch(scope,epoch,{limit:shown.limit+20});}}>Visa 20 till</Button>}
      {selected&&<div className="private-draft-copy-record">
       <h4>{selected.title||'Utkast utan titel'}</h4>
       <dl className="private-draft-copy-metadata"><div><dt>Status i kopian</dt><dd>{selected.archived?'Arkiverat utkast':'Aktivt utkast'}</dd></div><div><dt>Senast sparat</dt><dd>{displayTime(selected.updatedAt)}</dd></div></dl>
       {readable.length>0?<div className="private-draft-copy-readable"><h4>Din sparade text</h4><p>Textfälten nedan går att markera och kopiera. Resten av innehållet finns i råtexten.</p>{readable.map((field,index)=><div className="private-draft-copy-text-field" key={index}><label htmlFor={rawLabel+'-readable-'+index}>{field.label} · endast läsning</label><Textarea id={rawLabel+'-readable-'+index} className="private-draft-copy-readable-text" readOnly spellCheck={false} value={field.value}/><Button type="button" variant="outline" onClick={()=>copyText(field.value)}>Kopiera {field.label.toLocaleLowerCase('sv-SE')}</Button></div>)}</div>:<p>Ingen vanlig textvy finns för det här innehållet. Du kan läsa och kopiera den ursprungliga råtexten nedan.</p>}
       <details className="private-draft-copy-technical" key={'metadata-'+shown.selected}><summary>Tekniska uppgifter</summary><dl className="private-draft-copy-metadata"><div><dt>Utkastets ID</dt><dd>{selected.id}</dd></div><div><dt>Typ</dt><dd>{selected.kind}</dd></div><div><dt>Sammanhang</dt><dd>{selected.context||'Tomt'}</dd></div><div><dt>Revision</dt><dd>{selected.revision}</dd></div><div><dt>Sparförsökets ID</dt><dd>{selected.requestId}</dd></div></dl></details>
       <Button type="button" variant="ghost" aria-expanded={shown.showRaw} aria-controls={rawLabel+'-section'} onClick={()=>{const epoch=openRef.current?.generation;if(epoch!==undefined)patch(scope,epoch,{showRaw:!shown.showRaw});}}>{shown.showRaw?'Dölj råtext':'Visa råtext'}</Button>
       {shown.showRaw&&<div id={rawLabel+'-section'}><label htmlFor={rawLabel}>Utkastets råtext · endast läsning</label><Textarea id={rawLabel} className="private-draft-copy-raw" readOnly spellCheck={false} value={selected.dataRaw}/><Button type="button" variant="outline" onClick={()=>copyText(selected.dataRaw)}>Kopiera råtext</Button></div>}
      </div>}
      <div className="private-draft-copy-file-actions"><Button type="button" variant="ghost" aria-expanded={shown.showFile} aria-controls={fileRawLabel} onClick={()=>{const epoch=openRef.current?.generation;if(epoch!==undefined)patch(scope,epoch,{showFile:!shown.showFile});}}>{shown.showFile?'Dölj hela filtexten':'Visa hela kopians JSON-text'}</Button><Button type="button" variant="outline" onClick={()=>copyText(local.raw)}>Kopiera hela filtexten</Button></div>
      {shown.showFile&&<div id={fileRawLabel}><label htmlFor={fileRawLabel+'-text'}>Filens ursprungliga JSON-text · endast läsning</label><Textarea id={fileRawLabel+'-text'} className="private-draft-copy-raw" readOnly spellCheck={false} value={local.raw}/></div>}
      <p className="private-draft-copy-boundary">Texten visas som den sparats. Ingen import eller ändring av kunder, utkast eller CRM-underlag görs här.</p>
     </section>}
     <div className="private-draft-copy-close"><Button type="button" variant="outline" onClick={close}>Stäng</Button></div>
    </div>
   </SheetContent>
  </Sheet>
 </Context.Provider>;
}
