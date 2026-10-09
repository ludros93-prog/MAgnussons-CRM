'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {AlertTriangle,ArrowRightLeft,Link2,RefreshCw,Search,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import type {State} from '@/lib/crm';
import {staffHandoverRows,type StaffHandoverAction,type StaffHandoverRow} from '@/lib/staff-handover';
import {SellerProfileRetirement,type RetirementSave} from './seller-profile-retirement';

type Props={st:State;space:'demo'|'live';save:RetirementSave;busy:boolean;onAction:(action:StaffHandoverAction,opener:HTMLElement)=>void;refresh:()=>Promise<State>};
const unresolvedChoice='__unresolved';
const pageSize=20;
const identityLabel:Record<StaffHandoverRow['identity'],string>={
 profile:'Ansvar med profil-ID',
 legacy:'Äldre ansvar behöver förankras',
 unresolved:'Ansvar behöver granskas',
 alias:'Separat ansvar med namnkoppling'
};

function displayDue(value:string){
 if(!value)return 'Inte angivet';
 const date=new Date(value.slice(0,10)+'T12:00:00');
 return Number.isNaN(date.getTime())?value:date.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});
}
function profileLabel(profile:State['settings']['sellerProfiles'][number]){
 return profile.displayName+(profile.displayName!==profile.legacyOwnerName?' · '+profile.legacyOwnerName:'')+(profile.active?'':' · Historisk profil');
}

export function StaffHandover({st,space,save,busy,onAction,refresh}:Props){
 const profileDescriptionId=useId(),rowId=useId();
 const [selectedProfileId,setSelectedProfileId]=useState(''),[query,setQuery]=useState(''),[kind,setKind]=useState('all'),[visibleCount,setVisibleCount]=useState(pageSize);
 const [refreshing,setRefreshing]=useState(false),[refreshError,setRefreshError]=useState(''),[refreshNotice,setRefreshNotice]=useState('');
 const refreshLock=useRef(false),alive=useRef(true),request=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const admin=st.viewer?.role==='admin';
 const rows=admin?staffHandoverRows(st):[];
 const profiles=st.settings.sellerProfiles;
 const profile=profiles.find(item=>item.id===selectedProfileId);
 const aliasCounts=new Map<string,number>();
 for(const item of profiles)aliasCounts.set(item.legacyOwnerName,(aliasCounts.get(item.legacyOwnerName)||0)+1);
 const unresolved=selectedProfileId===unresolvedChoice;
 const stale=!!selectedProfileId&&!unresolved&&(!profile||aliasCounts.get(profile.legacyOwnerName)!==1);
 const selectedRows=unresolved?rows.filter(row=>row.identity==='unresolved'):profile&&!stale?rows.filter(row=>(
  row.owner===profile.legacyOwnerName&&(
   row.ownerProfileId===profile.id||
   !row.ownerProfileId
  )
 )):[];
 const categories=new Map<string,string>(rows.map(row=>[row.kind,row.typeLabel]));
 const categoryItems=[...categories].sort((a,b)=>a[1].localeCompare(b[1],'sv'));
 const search=query.trim().toLocaleLowerCase('sv');
 const matches=selectedRows.filter(row=>(kind==='all'||row.kind===kind)&&(!search||[
  row.typeLabel,row.title,row.customerName,row.owner,row.ownerProfileId,row.status,row.hint
 ].join(' ').toLocaleLowerCase('sv').includes(search)));
 const shown=matches.slice(0,visibleCount);
 const filtered=kind!=='all'||!!search;
 const counts=new Map<string,{label:string;count:number}>();
 for(const row of selectedRows){const existing=counts.get(row.kind);counts.set(row.kind,{label:row.typeLabel,count:(existing?.count||0)+1});}
 const selectedLabel=unresolved?'Ansvar som behöver granskas':profile?profileLabel(profile):stale?'Den tidigare valda profilen saknas':'Välj säljarprofil';

 function changeProfile(value:string){setSelectedProfileId(value==='_none'?'':value);setVisibleCount(pageSize);setRefreshError('');setRefreshNotice('');}
 function changeQuery(value:string){setQuery(value);setVisibleCount(pageSize);}
 function changeKind(value:string){setKind(value);setVisibleCount(pageSize);}
 function clearFilters(){setQuery('');setKind('all');setVisibleCount(pageSize);}
 async function fetchCurrent(){
  if(refreshLock.current||!admin)return;
  const current=++request.current;
  refreshLock.current=true;setRefreshing(true);setRefreshError('');setRefreshNotice('');
  try{
   await refresh();
   if(alive.current&&current===request.current)setRefreshNotice('Aktuellt CRM-underlag har hämtats. Din valda profil och dina filter finns kvar.');
  }catch(error){
   if(alive.current&&current===request.current)setRefreshError((error as Error).message||'Aktuellt CRM-underlag kunde inte hämtas. Din valda profil och dina filter finns kvar.');
  }finally{
   if(alive.current&&current===request.current){refreshLock.current=false;setRefreshing(false);}
  }
 }
 function act(row:StaffHandoverRow,opener:HTMLElement,anchor=false){
  const action=anchor?row.anchorAction:row.action;
  if(!refreshLock.current&&!busy&&action&&admin)onAction(action,opener);
 }
 if(!admin)return null;

 return <section className="business-ui panel padded staff-handover" aria-labelledby="staff-handover-heading">
  <header className="staff-handover-head">
   <div><span className="biz-kicker">GRANSKAD ARBETSÖVERLÄMNING</span><h2 id="staff-handover-heading" tabIndex={-1}><ArrowRightLeft size={22} aria-hidden="true"/><span>Överlämna arbete</span></h2><p>Välj en säljarprofil. Se vad personen ansvarar för och granska en överlämning i taget.</p></div>
   <Button type="button" variant="outline" disabled={refreshing} onClick={()=>void fetchCurrent()}><RefreshCw size={17} aria-hidden="true"/><span>{refreshing?'Hämtar underlag…':'Hämta aktuellt underlag'}</span></Button>
  </header>
  <p className="staff-handover-intro">Översikten samlar kundrelationer och öppna ansvarsdelar. Kund, affär, order och tillhörande uppgifter kan ha olika ansvariga. Koppla äldre ansvar till samma person eller granska ett byte av ansvarig. Varje post granskas separat; du väljer själv vilka tillåtna uppgifter som följer med vid ett byte.</p>
  {!st.settings.sellerProfilesInitialized?<div className="staff-handover-notice"><AlertTriangle size={19} aria-hidden="true"/><div><b>Säljarprofiler behöver granskas först</b><p>Öppna Mål & inställningar och granska de stabila säljarprofilerna. Äldre namn tilldelas ingen person automatiskt av den här översikten.</p>{selectedProfileId&&<p>Det tidigare profilvalet finns kvar men kan inte användas med det här underlaget. Ett tomt urval visar inte att arbetet har lämnats över.</p>}</div></div>:<>
   <div className="staff-handover-toolbar">
    <label className="biz-field"><span>Vems arbete vill du granska?</span><Select value={selectedProfileId||'_none'} onValueChange={changeProfile} disabled={refreshing}><SelectTrigger aria-label="Välj profil för arbetsöverlämning" aria-describedby={selectedProfileId?profileDescriptionId:undefined}><SelectValue><span className="staff-handover-choice">{selectedLabel}</span></SelectValue></SelectTrigger><SelectContent className="staff-handover-options"><SelectItem value="_none">Välj säljarprofil</SelectItem>{profiles.map(item=><SelectItem value={item.id} key={item.id}>{profileLabel(item)}</SelectItem>)}<SelectItem value={unresolvedChoice}>Ansvar som behöver granskas</SelectItem>{stale&&!profile&&<SelectItem value={selectedProfileId} disabled>Den tidigare valda profilen behöver granskas</SelectItem>}</SelectContent></Select></label>
    <label className="biz-field"><span>Arbetskategori</span><Select value={kind} onValueChange={changeKind} disabled={!selectedProfileId||refreshing}><SelectTrigger aria-label="Filtrera överlämning efter arbetskategori"><SelectValue/></SelectTrigger><SelectContent className="staff-handover-options"><SelectItem value="all">Alla arbetskategorier</SelectItem>{categoryItems.map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}{kind!=='all'&&!categories.has(kind)&&<SelectItem value={kind}>Tidigare vald kategori</SelectItem>}</SelectContent></Select></label>
    <label className="biz-field"><span>Sök i valt ansvar</span><div className="staff-handover-search"><Search size={18} aria-hidden="true"/><Input aria-label="Sök kund eller arbetsuppgift i överlämningen" placeholder="Kund eller arbetsuppgift…" value={query} onChange={event=>changeQuery(event.target.value)} disabled={!selectedProfileId||refreshing}/></div></label>
   </div>
   {selectedProfileId&&<div id={profileDescriptionId} className={'staff-handover-profile'+(stale?' staff-handover-warning':'')}>
    <UserRound size={20} aria-hidden="true"/><div>{unresolved?<><b>Ansvar som behöver granskas</b><p>Här syns poster med saknad, omappad eller motsägande ansvarskoppling. Översikten gissar ingen ansvarig.</p></>:profile?<><b>{profile.displayName}</b><p>{profile.active?'Aktuell resultatprofil.':'Historisk resultatprofil. Kvarvarande öppet arbete behöver fortfarande granskas.'} <b>Äldre ansvarskoppling:</b> {profile.legacyOwnerName}.</p><p><b>Profil-ID:</b> {profile.id}. {profile.memberId?'Profilen har en registrerad kontolänk.':'Ingen kontolänk är registrerad.'}</p></>:<><b>Den tidigare valda profilen finns inte i aktuellt underlag</b><p>Välj en profil på nytt. Ett tomt urval visar inte att arbetet har lämnats över.</p></>}{stale&&profile&&<p>Profilens namnkoppling är inte entydig. Granska säljarprofilerna innan den här översikten används för personen.</p>}</div>
   </div>}
   {!!selectedProfileId&&!stale&&<>
    <div className="staff-handover-summary">
     <div><p className="staff-handover-count" role="status">Visar {shown.length} av {matches.length} poster{filtered?' som matchar dina filter':''}. {filtered&&<span>Valt ansvar innehåller {selectedRows.length} poster före filtrering.</span>}</p><p className="biz-hint">Antalet gäller ansvarsdelar. Samma kund kan ha flera poster.</p></div>
     {filtered&&<Button type="button" variant="outline" onClick={clearFilters} disabled={refreshing}>Återställ filter</Button>}
    </div>
    {!!selectedRows.length&&<ul className="staff-handover-counts" aria-label="Ansvarsdelar i hela det valda urvalet">{[...counts].map(([category,entry])=><li key={category}><span>{entry.label}</span><b>{entry.count}</b></li>)}</ul>}
    <ol className="staff-handover-list" aria-label="Ansvarsposter att granska">
     {shown.map((row,index)=><li className="staff-handover-row" key={row.key} data-kind={row.kind}>
      <article aria-labelledby={rowId+'-row-'+index}>
       <div className="staff-handover-row-head"><span className="staff-handover-type">{row.typeLabel}</span><span className={'staff-handover-identity staff-handover-identity-'+row.identity}>{identityLabel[row.identity]}</span></div>
       <h3 id={rowId+'-row-'+index}>{row.title}</h3>
       <p className="staff-handover-customer"><b>Kund:</b> {row.customerName||'Ingen kundkoppling'}</p>
       <dl><div><dt>Registrerat ansvar</dt><dd>{row.owner||'Ansvar saknas'}</dd></div><div><dt>{row.dueLabel||'Datum'}</dt><dd>{displayDue(row.due)}</dd></div><div><dt>Status</dt><dd>{row.status}</dd></div>{row.ownerProfileId&&<div><dt>Sparat profil-ID</dt><dd>{row.ownerProfileId}</dd></div>}</dl>
       <div className="staff-handover-row-actions">
        {row.anchorAction&&<section className="staff-handover-anchor-action" aria-label="Koppla ansvar till samma person">
         <h4><Link2 size={17} aria-hidden="true"/><span>Behåll samma ansvariga person</span></h4>
         {row.anchorHint&&<p id={rowId+'-anchor-hint-'+index}>{row.anchorHint}</p>}
         {row.anchorAction.kind==='customerAnchor'&&<p className="staff-handover-anchor-next">Öppna kundkortet och välj sedan <b>Koppla kundansvaret</b>.</p>}
         <Button type="button" variant="outline" disabled={refreshing||busy} onClick={event=>act(row,event.currentTarget,true)} data-anchor-kind={row.anchorAction.kind} data-anchor-id={row.anchorAction.id} data-customer-id={row.anchorAction.kind==='customerAnchor'?(row.anchorAction.customerId||row.anchorAction.id):undefined} aria-describedby={row.anchorHint?rowId+'-anchor-hint-'+index:rowId+'-row-'+index}><Link2 size={17} aria-hidden="true"/><span>{row.anchorLabel}</span></Button>
        </section>}
        <div className="staff-handover-transfer-action">
         {row.anchorAction&&<h4>{row.action?.kind==='customer'&&row.kind!=='customer'?'Granska kvarvarande arbete':'Granska byte av ansvarig'}</h4>}
         {row.hint&&<p className="staff-handover-row-hint">{row.hint}</p>}
         {row.action?<Button type="button" variant="outline" disabled={refreshing||busy} onClick={event=>act(row,event.currentTarget)} data-customer-id={row.action.kind==='customer'?(row.action.customerId||row.action.id):undefined} aria-describedby={rowId+'-row-'+index}>{row.actionLabel}</Button>:<p className="staff-handover-unavailable"><AlertTriangle size={17} aria-hidden="true"/><span>{row.actionLabel||'Ansvarskopplingen behöver granskas innan en överlämning kan öppnas.'}</span></p>}
        </div>
       </div>
      </article>
     </li>)}
    </ol>
    {!matches.length&&<div className="staff-handover-empty"><b>{filtered?'Inga poster matchar dina filter.':'Inga poster finns i de här ansvarsdelarna.'}</b><p>{filtered?'Återställ filter för att granska allt ansvar i det valda urvalet.':'Ett tomt inventeringsurval är ingen kvittens på profilavslut eller kontoavstängning. Profilstatus, CRM-konto och sidåtkomst granskas separat.'}</p></div>}
    {shown.length<matches.length&&<div className="staff-handover-more"><Button type="button" variant="outline" disabled={refreshing} onClick={()=>setVisibleCount(value=>value+pageSize)}>Visa fler ansvarsposter</Button><p>{matches.length-shown.length} ytterligare poster matchar urvalet.</p></div>}
   </>}
   {!selectedProfileId&&<div className="staff-handover-empty"><b>Välj en profil för att börja.</b><p>Även historiska profiler kan ha kvarvarande öppet arbete. Du kan också välja Ansvar som behöver granskas.</p></div>}
  </>}
  {profile&&!stale&&<SellerProfileRetirement key={profile.id} st={st} space={space} profileId={profile.id} save={save} busy={busy} refresh={refresh}/>}
  {refreshing&&<p className="staff-handover-refresh" role="status">Hämtar aktuellt CRM-underlag. Det tidigare underlaget visas tills hämtningen är klar.</p>}
  {refreshNotice&&<p className="staff-handover-refresh" role="status">{refreshNotice}</p>}
  {refreshError&&<p className="error staff-handover-refresh" role="alert">{refreshError} Din valda profil och dina filter finns kvar.</p>}
  <aside className="staff-handover-boundaries" aria-label="Det här ansvaret hanteras separat">
   <h3>Det här behöver också granskas</h3>
   <p><b>Historiska resultat bevaras.</b> Tidigare försäljning, kvalificerade prospects och avslutat arbete flyttas inte av den här översikten.</p>
   <p><b>Tryck & leverans har egna ansvar.</b> Produktionsjobb och produktionsproblem är kopplade till användar-ID, inte säljarprofil-ID. Granska dem separat i Tryck & leverans.</p>
   <p><b>Företagsaktiviteter och förberedelser har egna ansvar.</b> En planerad aktivitet och varje öppen förberedelse granskas separat. Granska aktivitetens ansvar för själva aktiviteten; en förberedelse behåller sitt ansvar tills den överlämnas i sitt eget flöde.</p>
   <p><b>Konton och privata uppgifter är separata.</b> Den här vyn stänger inget konto och läser eller flyttar inga privata utkast eller personliga Outlook-data. Inga mejl eller inbjudningar skickas.</p>
  </aside>
 </section>;
}
