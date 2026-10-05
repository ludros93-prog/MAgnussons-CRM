'use client';

import {useEffect,useRef,useState} from 'react';
import {UserRound,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import type {State} from '@/lib/crm';
import {sellerProfilesBasis} from '@/lib/record-conflicts';
import {legacySellerNames} from '@/lib/seller-profiles';
import {BusinessField as F,Pick,type SaveAction} from './business-ui';

type Member={id:string;name:string;email:string;owner:string;role:string;active:boolean};
type Profile=State['settings']['sellerProfiles'][number];
type InitRow={legacyOwnerName:string;displayName:string;memberId:string};
type Editor=
 | {kind:'init';expectedContext:string;rows:InitRow[];reviewed:boolean}
 | {kind:'profile';expectedContext:string;id:string;legacyOwnerName:string;displayName:string;memberId:string;originalMemberId:string;confirmRelink:boolean;reason:string};

function aliasCounts(st:State,name:string){
 return {
  invoices:st.orders.filter(o=>o.invoiceValue!==null&&!!o.invoiceDate&&o.invoiceOwner===name&&o.invoiceOwnerSource!=='legacy_fallback').length,
  uncertainInvoices:st.orders.filter(o=>o.invoiceValue!==null&&!!o.invoiceDate&&o.invoiceOwnerSource==='legacy_fallback'&&(o.invoiceOwner||o.owner)===name).length,
  prospects:st.customers.filter(c=>!!c.prospecting.qualifiedAt&&c.prospecting.qualifiedOwner===name).length,
  months:Object.keys(st.settings.sellerGoals[name]||{}).length,
  years:Object.keys(st.settings.sellerAnnualGoals[name]||{}).length
 };
}

export function SellerProfiles({st,space,save,busy,refresh}:{st:State;space:string;save:SaveAction;busy:boolean;refresh:()=>Promise<void>}){
 const admin=st.viewer?.role==='admin';
 const [members,setMembers]=useState<Member[]>([]),[membersLoaded,setMembersLoaded]=useState(false),[membersLoading,setMembersLoading]=useState(false),[membersError,setMembersError]=useState('');
 const [editor,setEditor]=useState<Editor|null>(null),[error,setError]=useState(''),[submitting,setSubmitting]=useState(false),[refreshing,setRefreshing]=useState(false);
 const memberRequest=useRef(0),submitLock=useRef(false);
 const profiles=st.settings.sellerProfiles;
 const initialized=st.settings.sellerProfilesInitialized;
 const unassignedOwners=st.settings.owners.filter(name=>!profiles.some(p=>p.legacyOwnerName===name));
 const conflict=!!editor&&editor.expectedContext!==sellerProfilesBasis(st);
 const disabled=busy||submitting||refreshing;

 async function loadMembers(){
  if(!admin)return;
  const request=++memberRequest.current;
  setMembersLoading(true);setMembersLoaded(false);setMembersError('');
  try{
   const r=await fetch('/api/crm/members?space='+encodeURIComponent(space),{cache:'no-store'});
   const data:unknown=await r.json();
   if(!r.ok)throw Error((data as {error?:string})?.error||'CRM-kontona kunde inte hämtas.');
   if(!Array.isArray(data)||data.some(a=>!a||typeof a.id!=='string'||typeof a.name!=='string'||typeof a.email!=='string'||typeof a.owner!=='string'||typeof a.role!=='string'))throw Error('Kontolistan saknar verifierbara konto-ID:n.');
   if(request===memberRequest.current){setMembers(data.map(a=>({...a,active:!!a.active})));setMembersLoaded(true);}
  }catch(e){if(request===memberRequest.current)setMembersError((e as Error).message);}
  finally{if(request===memberRequest.current)setMembersLoading(false);}
 }
 useEffect(()=>{
  setMembers([]);setMembersLoaded(false);setMembersError('');setEditor(null);setError('');
  if(admin)void loadMembers();
  return()=>{memberRequest.current++;};
 },[space,admin,st.viewer?.id]);

 function openInit(){
  setEditor({kind:'init',expectedContext:sellerProfilesBasis(st),rows:legacySellerNames(st).map(name=>({legacyOwnerName:name,displayName:name,memberId:''})),reviewed:false});setError('');
 }
 function openProfile(profile?:Profile){
  setEditor({kind:'profile',expectedContext:sellerProfilesBasis(st),id:profile?.id||'',legacyOwnerName:profile?.legacyOwnerName||'',displayName:profile?.displayName||'',memberId:profile?.memberId||'',originalMemberId:profile?.memberId||'',confirmRelink:false,reason:''});setError('');
 }
 function replaceWithCurrent(){
  if(!editor)return;
  if(editor.kind==='init'){
   if(initialized){setError('Resultatprofilerna har redan upprättats. Stäng formuläret och granska de sparade profilerna.');return;}
   openInit();return;
  }
  if(editor.id){
   const current=profiles.find(p=>p.id===editor.id);
   if(!current){setError('Profilen finns inte i det aktuella underlaget. Dina uppgifter finns kvar.');return;}
   openProfile(current);
  }else openProfile();
 }
 function changeProfile(patch:Partial<Extract<Editor,{kind:'profile'}>>){
  setEditor(current=>current?.kind==='profile'?{...current,...patch}:current);
 }
 function changeInit(name:string,patch:Partial<InitRow>){
  setEditor(current=>current?.kind==='init'?{...current,reviewed:false,rows:current.rows.map(r=>r.legacyOwnerName===name?{...r,...patch}:r)}:current);
 }
 function memberItems(alias:string,selected='',profileId=''){
  const used=new Set(profiles.filter(p=>p.id!==profileId&&p.memberId).map(p=>p.memberId));
  const available=members.filter(m=>m.active&&['seller','admin'].includes(m.role)&&m.owner===alias&&!used.has(m.id));
  const items=[{id:'',label:'Ingen kontolänk'},...available.map(m=>({id:m.id,label:`${m.name} · ${m.email} · ansvar: ${m.owner} · konto-ID: ${m.id}`}))];
  if(selected&&!available.some(m=>m.id===selected)){
   const saved=members.find(m=>m.id===selected);
   items.push({id:selected,label:saved?`${saved.name} · ${saved.email} · ansvar: ${saved.owner||'saknas'} · ${saved.active?'sparad kontolänk':'inaktivt konto'} · konto-ID: ${selected}`:'Sparad kontolänk · konto-ID: '+selected});
  }
  return items;
 }
 function memberIsValid(id:string,alias:string,profileId=''){
  return !id||membersLoaded&&members.some(m=>m.id===id&&m.active&&['seller','admin'].includes(m.role)&&m.owner===alias)&&!profiles.some(p=>p.id!==profileId&&p.memberId===id);
 }
 async function submit(){
  if(!editor||disabled||submitLock.current||!admin)return;
  setError('');
  if(conflict){setError('Underlaget har ändrats. Granska den aktuella versionen innan du sparar.');return;}
  let type:string,data:unknown;
  if(editor.kind==='init'){
   if(!editor.reviewed){setError('Kontrollera varje äldre namn och markera att granskningen är klar.');return;}
   if(editor.rows.some(r=>!r.displayName.trim())){setError('Alla resultatprofiler behöver ett visningsnamn.');return;}
   if(editor.rows.some(r=>!memberIsValid(r.memberId,r.legacyOwnerName))){setError('Välj ett aktivt säljar- eller administratörskonto med samma kundansvar som det äldre namnet, eller ingen kontolänk.');return;}
   const linked=editor.rows.map(r=>r.memberId).filter(Boolean);
   if(new Set(linked).size!==linked.length){setError('Ett personligt konto kan bara kopplas till en resultatprofil.');return;}
   type='seller_profiles_init';data={expectedContext:editor.expectedContext,profiles:editor.rows.map(r=>({...r,displayName:r.displayName.trim()}))};
  }else{
   if(!editor.displayName.trim()){setError('Ange ett visningsnamn för resultatprofilen.');return;}
   if(!editor.id&&!unassignedOwners.includes(editor.legacyOwnerName)){setError('Välj ett aktuellt kundansvar som saknar resultatprofil.');return;}
   if((!editor.id||editor.memberId!==editor.originalMemberId)&&!memberIsValid(editor.memberId,editor.legacyOwnerName,editor.id)){setError('En ny eller ändrad kontolänk behöver ett aktivt säljar- eller administratörskonto med samma kundansvar. Välj ingen kontolänk om kontot inte ska vara kopplat.');return;}
   const relink=!!editor.id&&editor.memberId!==editor.originalMemberId;
   if(relink&&(!editor.confirmRelink||!editor.reason.trim())){setError('Kontrollera ändringen av kontolänken och ange varför den görs.');return;}
   type='seller_profile';data={expectedContext:editor.expectedContext,...(editor.id?{id:editor.id}:{legacyOwnerName:editor.legacyOwnerName}),displayName:editor.displayName.trim(),memberId:editor.memberId,...(relink?{confirmRelink:true,reason:editor.reason.trim()}:{})};
  }
  submitLock.current=true;setSubmitting(true);
  try{if(await save(type,data,false))setEditor(null);else setError('Inte sparat. Dina uppgifter finns kvar. Kontrollera felmeddelandet och eventuella ändringar i underlaget.');}
  catch(e){setError((e as Error).message||'Inte sparat. Dina uppgifter finns kvar.');}
  finally{submitLock.current=false;setSubmitting(false);}
 }
 if(!admin)return null;
 const unmappedInvoices=st.orders.filter(o=>o.invoiceValue!==null&&!!o.invoiceDate&&!o.invoiceOwnerId).length;
 const unmappedProspects=st.customers.filter(c=>!!c.prospecting.qualifiedAt&&!c.prospecting.qualifiedOwnerId).length;

 return <section className="business-ui panel padded">
  <div className="biz-head"><div><span className="biz-kicker">STABILT RESULTATANSVAR</span><h2><Users size={22}/>Personer bakom resultaten</h2><p>En resultatprofil har ett fast ID. Visningsnamnet kan ändras utan att personens sparade försäljning, prospects och mål flyttas till någon annan.</p></div>
   {initialized?<Button variant="outline" disabled={disabled||!unassignedOwners.length} onClick={()=>openProfile()}>Lägg till resultatprofil</Button>:<Button disabled={disabled} onClick={openInit}>Granska äldre namn</Button>}
  </div>
  <p className="biz-hint">Kundansvar och resultatansvar är separata. Ett namnbyte här ändrar resultatets visning. Personliga CRM-konton och ansvar för öppet arbete hanteras under Konton.</p>
  {!initialized&&<div className="biz-callout"><b>Äldre resultat behöver en första granskning</b><p>Varje äldre ansvarig får en egen profil. Kontrollera att namnen motsvarar verkliga personer innan du sparar. Kontolänkar väljs uttryckligen och börjar tomma.</p></div>}
  {initialized&&<>
   {!!(unmappedInvoices+unmappedProspects)&&<div className="biz-callout" role="status"><b>Historiskt resultat utan säker personkoppling</b><p>{unmappedInvoices} fakturasammanställningar och {unmappedProspects} kvalificerade prospects saknar resultat-ID. De har inte tilldelats någon person automatiskt. Granska underlagen i teamets resultat.</p></div>}
   <div className="account-roster">{profiles.map(p=>{
    const member=members.find(m=>m.id===p.memberId);
    const invoices=st.orders.filter(o=>o.invoiceValue!==null&&!!o.invoiceDate&&o.invoiceOwnerId===p.id).length;
    const prospects=st.customers.filter(c=>!!c.prospecting.qualifiedAt&&c.prospecting.qualifiedOwnerId===p.id).length;
    return <article key={p.id}><span className="account-avatar"><UserRound size={22}/></span><h3>{p.displayName}</h3><span className={'pill '+(p.active?'green':'amber')}>{p.active?'Aktuell profil':'Historisk profil'}</span><p>{invoices} fakturasammanställningar · {prospects} kvalificerade prospects</p><small>Äldre namn: {p.legacyOwnerName}</small><small>Resultat-ID: {p.id}</small><small>{p.memberId?member?`${member.name} · ${member.email}`:`Kontolänk: ${p.memberId}`:'Ingen kontolänk'}</small><Button variant="outline" disabled={disabled} onClick={()=>openProfile(p)}>Ändra visning och kontolänk</Button></article>;
   })}</div>
   {!!unassignedOwners.length&&<p className="biz-hint">Saknar resultatprofil: {unassignedOwners.join(', ')}. En ny profil får ett nytt ID och tilldelas framtida resultat; äldre historik flyttas inte automatiskt.</p>}
  </>}
  {membersLoading&&<p className="biz-hint" role="status">Hämtar verifierade CRM-konton…</p>}
  {membersError&&<div className="record-conflict" role="alert"><p>{membersError} Kontolänkar kan inte ändras förrän kontona har hämtats.</p><Button variant="outline" disabled={membersLoading||disabled} onClick={()=>void loadMembers()}>Hämta konton igen</Button></div>}
  <Sheet open={!!editor} onOpenChange={open=>{if(!open&&!disabled)setEditor(null);}}><SheetContent className="crm-sheet"><SheetHeader><SheetTitle>{editor?.kind==='init'?'Granska resultatens äldre namn':editor?.id?'Ändra resultatprofil':'Lägg till resultatprofil'}</SheetTitle><SheetDescription>Profilens ID och äldre namn bevaras. Kontolänken ska motsvara samma verkliga person.</SheetDescription></SheetHeader>
   {editor&&<form className="sheet-body business-ui" onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={disabled}>
    {editor.kind==='init'?<>
     <p>Samtliga äldre namn i arbetsytans ansvar, historiska resultat och mål visas. Varje rad sparas som en egen resultatprofil. Endast namn som finns bland dagens kundansvar blir aktuella profiler.</p>
     {editor.rows.map(row=>{
      const counts=aliasCounts(st,row.legacyOwnerName),current=st.settings.owners.includes(row.legacyOwnerName);
      return <fieldset className="biz-group" key={row.legacyOwnerName}><legend>{row.legacyOwnerName}</legend><span className={'pill '+(current?'green':'amber')}>{current?'Finns bland dagens kundansvar':'Äldre namn – historisk profil'}</span><p className="biz-hint">{counts.invoices} fakturasammanställningar med sparat ansvar · {counts.prospects} kvalificerade prospects med sparat ansvar · {counts.months} månadsmål · {counts.years} årsmål.</p>{!!counts.uncertainInvoices&&<p className="biz-hint">{counts.uncertainInvoices} fakturasammanställningar saknar verifierat historiskt ansvar och tilldelas inte denna person.</p>}<F label={'Visningsnamn för '+row.legacyOwnerName}><Input required maxLength={150} value={row.displayName} onChange={e=>changeInit(row.legacyOwnerName,{displayName:e.target.value})}/></F><fieldset disabled={!membersLoaded||!admin}><F label={'Personligt konto för '+row.legacyOwnerName}><Pick label={'Kontolänk för '+row.legacyOwnerName} value={row.memberId} items={memberItems(row.legacyOwnerName,row.memberId)} onChange={v=>changeInit(row.legacyOwnerName,{memberId:v})}/></F></fieldset></fieldset>;
     })}
     <p className="biz-hint">Kontolistan visar aktiva säljar- och administratörskonton med exakt samma kundansvar. Namn och mejladresser används aldrig för att gissa en koppling.</p>
     <label className="check-field"><Checkbox checked={editor.reviewed} onCheckedChange={v=>setEditor(current=>current?.kind==='init'?{...current,reviewed:v===true}:current)}/>Jag har granskat varje äldre namn, dess resultatunderlag och eventuella kontolänk.</label>
    </>:<>
     {editor.id?<div className="biz-callout"><b>Fast resultat-ID: {editor.id}</b><p>Äldre namn: {editor.legacyOwnerName}. Namnet används som referens och kan inte ändras här.</p></div>:<>
      <F label="Dagens kundansvar"><Pick label="Kundansvar för ny resultatprofil" value={editor.legacyOwnerName} items={[{id:'',label:'Välj kundansvar'},...unassignedOwners.map(name=>({id:name,label:name}))]} onChange={v=>changeProfile({legacyOwnerName:v,displayName:v,memberId:''})}/></F><div className="biz-callout"><b>Ny profil för framtida resultat</b><p>Profilen får ett nytt ID. Tidigare fakturasammanställningar, kvalificeringar och mål förs inte över automatiskt. Det här är inte en överföring av en annan persons historik.</p></div>
     </>}
     <F label="Visningsnamn i resultat"><Input required maxLength={150} value={editor.displayName} onChange={e=>changeProfile({displayName:e.target.value})}/></F>
     <fieldset disabled={!membersLoaded||!admin||!editor.legacyOwnerName}><F label="Personligt CRM-konto"><Pick label="Kontolänk för resultatprofil" value={editor.memberId} items={memberItems(editor.legacyOwnerName,editor.memberId,editor.id)} onChange={v=>changeProfile({memberId:v,confirmRelink:false,reason:''})}/></F></fieldset><p className="biz-hint">Kontot måste vara aktivt, ha säljar- eller administratörsroll och exakt samma kundansvar som profilens äldre namn.</p>
     {!!editor.id&&editor.memberId!==editor.originalMemberId&&<div className="biz-callout"><b>Kontolänken ändras</b><p>Resultat och mål ligger kvar på samma resultat-ID. Kontrollera att kontot hör till samma person innan du ändrar eller tar bort länken.</p><F label="Varför ändras kontolänken?"><Textarea required maxLength={1000} value={editor.reason} onChange={e=>changeProfile({reason:e.target.value,confirmRelink:false})}/></F><label className="check-field"><Checkbox checked={editor.confirmRelink} onCheckedChange={v=>changeProfile({confirmRelink:v===true})}/>Jag har kontrollerat att ändringen gäller rätt person.</label></div>}
    </>}
    {conflict&&<div className="record-conflict" role="alert"><b>Resultatunderlaget har ändrats</b><p>Dina öppna uppgifter finns kvar. Granska de senaste namnen, resultaten och kontolänkarna innan du sparar igen.</p></div>}
    <details className="biz-details"><summary>Hämta eller ersätt formulärets underlag</summary><p>Hämtning behåller dina uppgifter. Att ersätta formuläret tar bort din osparade inmatning och visar den aktuella versionen. Kopiera text du vill behålla först.</p><div className="biz-buttons"><Button type="button" variant="outline" disabled={disabled} onClick={async()=>{setRefreshing(true);try{await refresh();}catch(e){setError((e as Error).message);}finally{setRefreshing(false);}}}>Hämta aktuellt underlag</Button><Button type="button" variant="outline" disabled={disabled} onClick={replaceWithCurrent}>Ersätt formuläret med aktuell version</Button></div></details>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="biz-buttons"><Button type="submit" disabled={disabled||conflict||editor.kind==='init'&&!editor.reviewed}>{submitting?'Sparar…':editor.kind==='init'?'Upprätta granskade resultatprofiler':'Spara resultatprofil'}</Button><Button type="button" variant="ghost" disabled={disabled} onClick={()=>setEditor(null)}>Stäng</Button></div>
   </fieldset></form>}
  </SheetContent></Sheet>
 </section>;
}
