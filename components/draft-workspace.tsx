'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import type {DraftRecord} from '@/lib/drafts';
import {validDate} from '@/lib/business';
import {isArticleDraft} from '@/lib/article-drafts';
import {PrivateDraftCopyTools} from '@/components/private-draft-copy-tools';
type LocalDraft=DraftRecord&{status:'saved'|'pending'|'saving'|'error'|'conflict';error?:string;server?:DraftRecord|null;generation:number;posted?:boolean};
type Workspace={ready:boolean;error:string;records:LocalDraft[];get:(id:string)=>LocalDraft|undefined;create:(kind:DraftRecord['kind'],context:string,data:Record<string,any>,title:string,id?:string)=>string;update:(id:string,data:Record<string,any>,title?:string)=>void;flush:(id:string)=>Promise<{id:string;revision:number}|null>;reconcile:(id:string,reviewServer?:boolean)=>Promise<boolean>;hasLocalCopy:(id:string)=>boolean;consume:(id:string)=>void;resolve:(id:string,useServer:boolean)=>void;archive:(id:string)=>Promise<boolean>;retry:()=>void};
type Scope={key:string;epoch:number;active:boolean;controllers:Set<AbortController>};
type Session={scope:Scope;epoch:number};
const draftKinds=['catalog','production','note','followup','form','plan','prospecting','onboarding','receipt'];
const Context=createContext<Workspace|null>(null);
export const useDrafts=()=>{const ctx=useContext(Context);if(!ctx)throw Error('Draft workspace missing');return ctx;};
export function DraftProvider({space,userId,enabled,canEditArticles,children}:{space:string;userId:string;enabled:boolean;canEditArticles:boolean;children:ReactNode}){
 const [records,setRecords]=useState<LocalDraft[]>([]),[ready,setReady]=useState(!enabled),[error,setError]=useState('');
 const entries=useRef<LocalDraft[]>([]),jobs=useRef(new Map<string,Promise<unknown>>()),requests=useRef(new Map<string,{body:any;generation:number}>()),instances=useRef(new Map<string,symbol>());
 const storageKey='magnussons-unsaved-v1:'+space+':'+userId,scopeKey=JSON.stringify([space,userId,enabled]);
 const lifecycle=useRef<Scope>({key:scopeKey,epoch:0,active:false,controllers:new Set()});
 const loaded=useRef<Session|null>(null),loading=useRef<{session:Session;promise:Promise<boolean>}|null>(null);
 const articleEditing=useRef(canEditArticles);articleEditing.current=canEditArticles;
 // Invalidate old closures as soon as the identity or role changes, before
 // effects run. Async work may finish, but cannot publish into the new scope.
 if(lifecycle.current.key!==scopeKey){lifecycle.current.active=false;lifecycle.current={key:scopeKey,epoch:lifecycle.current.epoch+1,active:false,controllers:new Set()};}
 const scope=lifecycle.current;
 const active=(session:Session)=>enabled&&!!userId&&lifecycle.current===session.scope&&session.scope.active&&session.scope.epoch===session.epoch;
 const begin=():Session=>({scope,epoch:scope.epoch});
 const isReady=(session:Session)=>active(session)&&loaded.current?.scope===session.scope&&loaded.current.epoch===session.epoch;
 function controller(session:Session){const c=new AbortController();session.scope.controllers.add(c);return c;}
 function put(next:LocalDraft[],session=begin()){
  if(!active(session))return;
  entries.current=next;setRecords(next);
  try{localStorage.setItem(storageKey,JSON.stringify(next.filter(d=>!d.archived&&d.status!=='saved')));}
  catch{if(active(session))setError('Webbläsaren kunde inte spara en lokal reservkopia. Vänta på ”Sparat” innan du lämnar sidan.');}
 }
 function patch(id:string,change:(d:LocalDraft)=>LocalDraft,session=begin()){
  if(!active(session)||!entries.current.some(d=>d.id===id))return;
  put(entries.current.map(d=>d.id===id?change(d):d),session);
 }
 function get(id:string){const session=begin();return isReady(session)?entries.current.find(d=>d.id===id&&!d.archived):undefined;}
 function conflict(id:string,server:DraftRecord|null,message:string,session:Session){
  if(!active(session))return;
  requests.current.delete(id);patch(id,d=>({...d,status:'conflict',server,error:message}),session);
 }
 async function serial<T>(id:string,session:Session,operation:()=>Promise<T>,fallback:T):Promise<T>{
  if(!isReady(session))return fallback;
  const previous=jobs.current.get(id);
  const work=(async()=>{if(previous){try{await previous;}catch{}if(!isReady(session))return fallback;}return active(session)?operation():fallback;})();
  jobs.current.set(id,work);
  try{const result=await work;return active(session)?result:fallback;}
  finally{if(active(session)&&jobs.current.get(id)===work)jobs.current.delete(id);}
 }
 async function load():Promise<boolean>{
  const session=begin();if(!active(session))return false;if(isReady(session))return true;
  if(loading.current?.session.scope===session.scope&&loading.current.session.epoch===session.epoch)return loading.current.promise;
  const c=controller(session);
  const work=(async()=>{
   try{
    if(!active(session))return false;
    const response=await fetch('/api/crm/drafts?'+new URLSearchParams({space}),{cache:'no-store',signal:c.signal});
    if(!active(session))return false;
    const rows=await response.json() as any;if(!active(session))return false;
    if(!response.ok)throw Error(rows.error);if(!Array.isArray(rows))throw Error('Dina utkast kunde inte läsas.');
    let pending:LocalDraft[]=[];
    try{const local=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(local))pending=local.filter((d:any)=>d&&typeof d.id==='string'&&d.data&&draftKinds.includes(d.kind));}catch{}
    const merged:LocalDraft[]=rows.map((d:DraftRecord)=>({...d,generation:0,status:'saved',posted:true}));
    for(const local of pending){
     const saved=merged.find(d=>d.id===local.id);
     if(saved&&local.status!=='conflict'&&JSON.stringify(saved.data)===JSON.stringify(local.data)&&saved.title===local.title)continue;
     const posted=local.posted??(local.revision>0||local.status!=='pending');
     const changed=local.status==='conflict'||!!saved&&(saved.revision!==local.revision||saved.kind!==local.kind||saved.context!==local.context)||!saved&&(local.revision>0||posted);
     const recovered:LocalDraft={...local,posted,status:changed?'conflict':'pending',server:saved||null,generation:local.generation||0,error:changed?'En annan version har sparats eller utkastet har avslutats. Kontrollera serverversionen innan du fortsätter.':''};
     if(saved)merged.splice(merged.indexOf(saved),1,recovered);else merged.push(recovered);
    }
    if(!active(session))return false;
    instances.current=new Map(merged.map(d=>[d.id,Symbol(d.id)] as const));
    setError('');put(merged,session);loaded.current=session;setReady(true);return true;
   }catch(e){if(active(session)){setError((e as Error).message);setReady(false);}return false;}
   finally{session.scope.controllers.delete(c);}
  })();
  loading.current={session,promise:work};
  try{const result=await work;return active(session)&&result;}finally{if(loading.current?.promise===work)loading.current=null;}
 }
 useEffect(()=>{
  scope.epoch++;scope.active=enabled&&!!userId;
  entries.current=[];jobs.current.clear();requests.current.clear();instances.current.clear();loaded.current=null;loading.current=null;
  setRecords([]);setError('');setReady(!enabled);
  if(scope.active)void load();
  return()=>{scope.active=false;scope.epoch++;for(const c of scope.controllers)c.abort();scope.controllers.clear();};
 },[space,userId,enabled]);
 async function persist(id:string,session:Session):Promise<{id:string;revision:number}|null>{
  const instance=instances.current.get(id);if(!instance)return null;
  for(let attempt=0;attempt<5;attempt++){
   if(!isReady(session)||instances.current.get(id)!==instance)return null;
   const current=entries.current.find(d=>d.id===id);
   if(!current||current.archived||current.status==='conflict')return null;
   if(current.status==='saved')return {id,revision:current.revision};
   if(isArticleDraft(current.kind,current.context)&&!articleEditing.current){patch(id,d=>({...d,status:'error',error:'Ditt konto kan läsa det egna artikelutkastet men inte spara artikeländringar. Granska den sparade serverversionen eller behåll underlaget lokalt.'}),session);return null;}
   let request=requests.current.get(id);
   if(!request){request={generation:current.generation,body:{space,id,kind:current.kind,context:current.context,revision:current.revision,requestId:crypto.randomUUID(),title:current.title,data:structuredClone(current.data),archived:false}};requests.current.set(id,request);}
   const c=controller(session);patch(id,d=>({...d,status:'saving',error:'',posted:true}),session);
   try{
    if(!active(session)||instances.current.get(id)!==instance)return null;
    const response=await fetch('/api/crm/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.body),signal:c.signal});
    if(!active(session)||instances.current.get(id)!==instance)return null;
    const result=await response.json() as any;if(!active(session)||instances.current.get(id)!==instance)return null;
    if(response.status===409){conflict(id,result.current||null,result.error,session);return null;}
    if(!response.ok){if(response.status<500)requests.current.delete(id);throw Error(result.error);}
    if(result.archived){conflict(id,result,'Utkastet är redan avslutat på en annan enhet.',session);return null;}
    requests.current.delete(id);
    patch(id,d=>({...d,revision:result.revision,requestId:result.requestId,updatedAt:result.updatedAt,status:d.generation===request!.generation?'saved':'pending',error:'',server:undefined,posted:true}),session);
   }catch(e){if(active(session)&&instances.current.get(id)===instance)patch(id,d=>({...d,status:'error',error:(e as Error).message}),session);return null;}
   finally{session.scope.controllers.delete(c);}
  }
  const latest=entries.current.find(d=>d.id===id);
  return isReady(session)&&instances.current.get(id)===instance&&latest?.status==='saved'?{id,revision:latest.revision}:null;
 }
 const flush=(id:string)=>{const session=begin();return serial(id,session,()=>persist(id,session),null);};
 async function reconcile(id:string,reviewServer=false):Promise<boolean>{
  const session=begin();
  return serial(id,session,async()=>{
   const original=entries.current.find(d=>d.id===id),instance=instances.current.get(id);if(!original||original.archived||!instance)return false;
   if(reviewServer&&!isArticleDraft(original.kind,original.context))return false;
   const c=controller(session);
   try{
    if(!active(session)||instances.current.get(id)!==instance)return false;
    const response=await fetch('/api/crm/drafts?'+new URLSearchParams({space,id}),{cache:'no-store',signal:c.signal});
    if(!active(session)||instances.current.get(id)!==instance)return false;
    const rows=await response.json() as any;if(!active(session)||instances.current.get(id)!==instance)return false;
    if(!response.ok)throw Error(rows.error);if(!Array.isArray(rows))throw Error('Serverversionen av utkastet kunde inte läsas.');
    // Read the latest local record after the GET. Editing or consuming it
    // while the request runs must not resurrect or overwrite local values.
    const local=entries.current.find(d=>d.id===id);if(!local||local.archived)return false;
    const server:DraftRecord|null=rows.find((d:DraftRecord)=>d.id===id)||null;
    if(reviewServer){conflict(id,server,server?'Serverversionen är hämtad. Dina lokala uppgifter finns kvar tills du uttryckligen väljer version.':'Ingen sparad serverversion hittades. Dina lokala uppgifter finns kvar.',session);return false;}
    if(!server){
     if(local.revision===0&&local.status==='pending'&&!local.posted&&!local.requestId&&!requests.current.has(id))return true;
     conflict(id,null,'Serverutkastet saknas. Ditt öppna underlag finns kvar; välj hur du vill fortsätta.',session);return false;
    }
    if(server.archived){conflict(id,server,'Utkastet är redan avslutat på en annan enhet. Ditt öppna underlag finns kvar.',session);return false;}
    if(server.revision!==local.revision||server.kind!==local.kind||server.context!==local.context){conflict(id,server,'En annan version har sparats. Ditt öppna underlag finns kvar; välj vilken version du vill använda.',session);return false;}
    if(local.status==='conflict'){patch(id,d=>({...d,server}),session);return false;}
    return true;
   }catch(e){if(active(session)&&instances.current.get(id)===instance)patch(id,d=>({...d,status:d.status==='conflict'?'conflict':'error',error:(e as Error).message}),session);return false;}
   finally{session.scope.controllers.delete(c);}
  },false);
 }
 const visibleReady=!enabled||ready&&isReady(begin());
 useEffect(()=>{
  const session=begin();if(!visibleReady||!isReady(session))return;
  const timer=setInterval(()=>{if(!isReady(session))return;for(const d of entries.current)if(!d.archived&&d.status==='pending'&&!jobs.current.has(d.id)&&(!isArticleDraft(d.kind,d.context)||articleEditing.current))void flush(d.id);},700);
  const guard=(e:BeforeUnloadEvent)=>{if(isReady(session)&&entries.current.some(d=>!d.archived&&d.status!=='saved')){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',guard);return()=>{clearInterval(timer);window.removeEventListener('beforeunload',guard);};
 },[visibleReady,space,userId,enabled]);
 function create(kind:DraftRecord['kind'],context:string,data:Record<string,any>,title:string,id=crypto.randomUUID()){
  const session=begin();if(!isReady(session)||isArticleDraft(kind,context)&&!articleEditing.current)return '';
  const existing=entries.current.find(d=>d.id===id);if(existing)return existing.archived?'':id;
  instances.current.set(id,Symbol(id));
  put([...entries.current,{id,kind,context,data:structuredClone(data),title,revision:0,requestId:'',archived:false,updatedAt:new Date().toISOString(),status:'pending',generation:1,posted:false}],session);return id;
 }
 function update(id:string,data:Record<string,any>,title?:string){const session=begin();if(!isReady(session))return;const d=get(id);if(d&&isArticleDraft(d.kind,d.context)&&!articleEditing.current)return;patch(id,d=>({...d,data:structuredClone(data),title:title||d.title,generation:d.generation+1,status:d.status==='conflict'?'conflict':'pending',updatedAt:new Date().toISOString()}),session);}
 function hasLocalCopy(id:string){
  const current=get(id);if(!current)return false;
  try{const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');const copy=Array.isArray(stored)?stored.find(d=>d?.id===id):null;return !!copy&&!copy.archived&&copy.kind===current.kind&&copy.context===current.context&&copy.revision===current.revision&&copy.requestId===current.requestId&&copy.title===current.title&&copy.generation===current.generation&&JSON.stringify(copy.data)===JSON.stringify(current.data);}catch{return false;}
 }
 function consume(id:string){const session=begin();if(!isReady(session))return;requests.current.delete(id);instances.current.delete(id);put(entries.current.filter(d=>d.id!==id),session);}
 function resolve(id:string,useServer:boolean){
  const session=begin();if(!isReady(session))return;
  const current=entries.current.find(d=>d.id===id);if(!current||current.status!=='conflict')return;
  if(!useServer&&isArticleDraft(current.kind,current.context)&&!articleEditing.current)return;
  requests.current.delete(id);
  patch(id,d=>useServer?d.server?{...d.server,generation:d.generation+1,status:'saved',posted:true}:{...d,archived:true,status:'saved'}:{...d,revision:d.server?.revision||0,requestId:d.server?.requestId||'',status:d.server?.archived?'conflict':'pending',error:d.server?.archived?'Utkastet är redan avslutat på en annan enhet. Öppna det sparade arbetet.':'',generation:d.generation+1,posted:!!d.server},session);
 }
 async function archive(id:string):Promise<boolean>{
  const session=begin();
  return serial(id,session,async()=>{
   const saved=await persist(id,session);if(!active(session)||!saved)return false;
   const d=entries.current.find(row=>row.id===id),instance=instances.current.get(id);if(!d||d.archived||d.status!=='saved'||!instance)return false;
   const c=controller(session);
   try{
    if(!active(session)||instances.current.get(id)!==instance)return false;
    const r=await fetch('/api/crm/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,...saved,space,requestId:crypto.randomUUID(),archived:true}),signal:c.signal});
    if(!active(session)||instances.current.get(id)!==instance)return false;
    const data=await r.json() as any;if(!active(session)||instances.current.get(id)!==instance)return false;
    if(r.status===409){conflict(id,data.current||null,data.error,session);return false;}
    if(!r.ok)throw Error(data.error);
    const latest=entries.current.find(row=>row.id===id);
    if(latest&&latest.generation!==d.generation){conflict(id,data,'Utkastet avslutades medan du skrev. Dina senaste uppgifter finns kvar.',session);return false;}
    consume(id);return true;
   }catch(e){if(active(session)&&instances.current.get(id)===instance)patch(id,row=>({...row,status:'error',error:(e as Error).message}),session);return false;}
   finally{session.scope.controllers.delete(c);}
  },false);
 }
 function retry(){const session=begin();if(!active(session))return;if(!isReady(session)){void load();return;}for(const d of entries.current)if(d.status==='error')void flush(d.id);}
 return <Context.Provider value={{ready:visibleReady,error:enabled&&active(begin())?error:'',records:enabled&&isReady(begin())?records.filter(d=>!d.archived):[],get,create,update,flush,reconcile,hasLocalCopy,consume,resolve,archive,retry}}><PrivateDraftCopyTools space={space} userId={userId} enabled={enabled} identityKey={JSON.stringify([space,userId,enabled,canEditArticles])} pendingCount={enabled&&isReady(begin())?records.filter(d=>!d.archived&&d.status!=='saved').length:0}>{children}</PrivateDraftCopyTools></Context.Provider>
}
export function DraftStatus({id,onClosed,onResolved,disabled=false,announce=false,allowActions=true}:{id:string;onClosed?:()=>void;onResolved?:(data:Record<string,any>)=>void;disabled?:boolean;announce?:boolean;allowActions?:boolean}){
 const w=useDrafts(),d=w.records.find(d=>d.id===id);
 const message=!w.ready?w.error||'Hämtar dina utkast…':!d?'':d.status==='saved'?'Sparat som privat utkast':d.status==='pending'?'Ändringar väntar på sparning':d.status==='saving'?'Sparar utkast…':d.error||'Kontrollera utkastet';
 const updatedAt=typeof d?.updatedAt==='string'?d.updatedAt:'';
 const savedTime=w.ready&&d?.status==='saved'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(updatedAt)&&validDate.safeParse(updatedAt.slice(0,10)).success?new Date(updatedAt):null;
 const timestamp=savedTime&&Number.isFinite(savedTime.getTime())?' · '+savedTime.toLocaleTimeString('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}):'';
 if(w.ready&&!d&&!announce)return null;
 // Generic forms retain this text region even when clean. Retry/version buttons
 // and the changing timestamp stay outside it; announcing never moves focus.
 // A clean region remains accessible without adding an empty grid row.
 const text=announce?<span><span role="status" aria-live="polite" aria-atomic="true">{message}</span>{timestamp}</span>:!w.ready?message:<span>{message}{timestamp}</span>;
 return <div className={!w.ready?'draft-status':d?'draft-status '+d.status:'sr-only'}>
  {text}
  {allowActions&&!w.ready&&w.error&&<Button type="button" variant="outline" size="sm" disabled={disabled} onClick={w.retry}>Försök igen</Button>}
  {allowActions&&w.ready&&d?.status==='error'&&<Button type="button" size="sm" variant="outline" disabled={disabled} onClick={()=>w.flush(id)}>Försök spara igen</Button>}
  {allowActions&&w.ready&&d?.status==='conflict'&&<>{!d.server&&<p>Utkastet saknas på servern. Underlaget finns bara lokalt; om du kastar utkastet försvinner den lokala texten.</p>}<div className="biz-buttons"><Button type="button" size="sm" variant="outline" disabled={disabled} onClick={()=>{w.resolve(id,true);if(!d.server||d.server.archived)onClosed?.();else if(d.server)onResolved?.(d.server.data)}}>{!d.server?'Kasta mitt lokala utkast':d.server.archived?'Stäng avslutat utkast':'Använd sparad version'}</Button>{!d.server?.archived&&<Button type="button" size="sm" disabled={disabled} onClick={()=>w.resolve(id,false)}>{d.server?'Ersätt med mitt öppna underlag':'Behåll och spara mitt underlag'}</Button>}</div></>}
 </div>
}
