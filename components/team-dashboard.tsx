'use client';
import { useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';import { Input } from '@/components/ui/input';import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '@/components/ui/table';
import {salesMetrics,teamSalesRows} from '@/lib/sales-dashboard';
import {Switch} from '@/components/ui/switch';
import {Progress} from '@/components/ui/progress';
import { type State } from '@/lib/crm';
import { BusinessField as F,money,type SaveAction } from './business-ui';
export function TeamDashboard({st,month,onCustomer}:{st:State;month:string;onCustomer:(id:string)=>void}){
 const [sort,setSort]=useState<'goal'|'revenue'|'qualified'>('goal'),[ranked,setRanked]=useState(false);
 const rows=teamSalesRows(st,month).sort((a,b)=>sort==='revenue'?b.revenue-a.revenue:sort==='qualified'?b.qualified-a.qualified:(b.attainment??-1)-(a.attainment??-1));
 const totals=salesMetrics(st,month,'all');
 const rowName=(row:typeof rows[number])=>rows.some(other=>other.id!==row.id&&other.displayName===row.displayName)?row.displayName+' · '+row.owner:row.displayName;
 const watched=st.customers.filter(c=>c.status!=='prospect'&&c.status!=='closed'&&(!c.plan.nextAction||!c.nextReview));
 const score=(row:typeof rows[number])=>sort==='goal'?row.attainment:sort==='revenue'?row.revenue:row.qualified;
 const place=(row:typeof rows[number])=>{const value=score(row);return value===null?'—':1+rows.filter(other=>{const otherValue=score(other);return otherValue!==null&&otherValue>value}).length};
 return <section className="business-ui team-score panel result-team">
  <div className="result-panel-heading"><div><span className="result-kicker">GEMENSAM UPPFÖLJNING</span><h2>Teamets resultat</h2><p>Fakturerat och första kvalificeringar · {month}</p></div><label className="result-rank-toggle"><Switch checked={ranked} onCheckedChange={setRanked} aria-label="Visa placeringar"/>Visa placeringar</label></div>
  <div className="result-team-sort" aria-label="Sortera teamets resultat">{([{id:'goal',label:'Mot mål'},{id:'revenue',label:'Försäljning'},{id:'qualified',label:'Prospects'}] as const).map(item=><Button key={item.id} size="sm" variant={sort===item.id?'default':'ghost'} aria-pressed={sort===item.id} onClick={()=>setSort(item.id)}>{item.label}</Button>)}</div>
  {(totals.unattributedInvoices.length>0||totals.unattributedQualified>0)&&<p className="biz-callout" role="status">{totals.unattributedInvoices.length} fakturor på {money(totals.unattributedRevenue)} och {totals.unattributedQualified} kvalificerade prospects saknar verifierad resultatansvarig i månaden. De ingår i teamets totalsiffror och ligger utanför personraderna.</p>}
  <div className="result-team-list">{rows.map(row=><article key={row.id}>
   {ranked&&<span className="result-rank">{place(row)}</span>}<span className="result-avatar">{rowName(row).split(' ').map(part=>part[0]).slice(0,2).join('')}</span><div className="result-seller"><b>{rowName(row)}{!row.active&&<small> · Inaktiv profil</small>}</b><span>{money(row.revenue)} <small>av {row.goal?.revenue==null?'mål ej satt':money(row.goal.revenue)}</small></span><Progress aria-label={rowName(row)+'s måluppfyllelse'} value={Math.min(100,(row.attainment??0)*100)}/></div><div className="result-team-percent"><b>{row.attainment===null?'—':Math.round(row.attainment*100)+' %'}</b><small>av målet</small></div><div className="result-team-prospects"><b>{row.qualified}</b><small>kvalificerade</small></div>
  </article>)}</div>
  <details className="result-team-details"><summary>Visa marginal och fler mått</summary><Table><TableHeader><TableRow>{['Ansvarig','Marginal','Kostnadsunderlag','Bruttovinst / mål','Kvalificerade / mål','Återköpsorder','Försenade aktiviteter'].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(row=><TableRow key={row.id}><TableCell>{rowName(row)}{!row.active&&<small>Inaktiv profil</small>}</TableCell><TableCell>{row.margin===null?'—':row.margin.toLocaleString('sv-SE',{maximumFractionDigits:1})+' %'}</TableCell><TableCell>{row.known} / {row.invoices} fakturor</TableCell><TableCell>{money(row.profit)}<small>{money(row.goal?.grossProfit)}</small></TableCell><TableCell>{row.qualified} / {row.goal?.qualified??'—'}</TableCell><TableCell>{row.repeat}</TableCell><TableCell>{row.late}</TableCell></TableRow>)}</TableBody></Table></details>
  <p className="result-chart-note">Jämför måluppfyllelse när kundportföljerna skiljer sig. Saknade mål ger ingen placering i jämförelsen mot mål. Samma resultatregler som i Mitt resultat används.</p>
  <div className="team-care"><b>{watched.length} befintliga kunder saknar fullständig kundplan</b>{watched.slice(0,4).map(customer=><Button size="sm" key={customer.id} variant="outline" data-customer-id={customer.id} onClick={()=>onCustomer(customer.id)}>{customer.name.replace(' · exempel','')}</Button>)}</div>
 </section>;
}
export function SellerGoals({st,month,save,busy}:{st:State;month:string;save:SaveAction;busy:boolean}){
 const initialized=st.settings.sellerProfilesInitialized;
 const currentDraft=initialized?st.settings.sellerGoalsById:st.settings.sellerGoals,currentAnnual=initialized?st.settings.sellerAnnualGoalsById:st.settings.sellerAnnualGoals;
 const context=(goals:typeof currentDraft,annual:typeof currentAnnual)=>JSON.stringify([initialized,st.settings.sellerProfiles,goals,annual]);
 const [draft,setDraft]=useState(currentDraft),[annual,setAnnual]=useState(currentAnnual),[basis,setBasis]=useState(()=>context(currentDraft,currentAnnual));
 const year=month.slice(0,4),changed=basis!==context(currentDraft,currentAnnual);
 const profiles=initialized?st.settings.sellerProfiles:st.settings.owners.map(owner=>({id:owner,displayName:owner,legacyOwnerName:owner,active:true}));
 const reload=()=>{setDraft(currentDraft);setAnnual(currentAnnual);setBasis(context(currentDraft,currentAnnual))};
 return <section className="business-ui panel padded"><h2><Target size={20}/>Säljarmål · {month}</h2><p className="biz-hint">Lämna tomt när mål ännu inte är överenskommet. Personliga månads- och årsmål visas på säljarens dashboard. Teambudgeten anges separat.</p>
  {profiles.map(profile=><fieldset className="biz-group" key={profile.id} disabled={busy||changed}><legend>{profile.displayName}{profiles.some(other=>other.id!==profile.id&&other.displayName===profile.displayName)?' · '+profile.legacyOwnerName:''}{!profile.active?' · Inaktiv profil':''}</legend><div className="biz-grid">
   {(['revenue','grossProfit','qualified'] as const).map((k,i)=><F key={k} label={['Försäljningsmål, kr','Bruttovinstmål, kr','Nya kvalificerade prospects'][i]}><Input type="number" min={0} step={k==='qualified'?1:'0.01'} value={draft[profile.id]?.[month]?.[k]??''} onChange={e=>setDraft({...draft,[profile.id]:{...draft[profile.id],[month]:{...(draft[profile.id]?.[month]||{revenue:null,grossProfit:null,qualified:null}),[k]:e.target.value===''?null:Number(e.target.value)}}})}/></F>)}
   <F label={'Personligt årsmål '+year+', kr'}><Input type="number" min={0} step="0.01" value={annual[profile.id]?.[year]??''} onChange={e=>{const values={...annual[profile.id]};if(e.target.value==='')delete values[year];else values[year]=Number(e.target.value);setAnnual({...annual,[profile.id]:values})}}/></F>
  </div></fieldset>)}
  <p className="biz-hint">Lämna årsmålet tomt för att använda summan av tolv kompletta månadsmål.</p>
  {changed&&<div className="biz-callout" role="alert">Profilerna eller målen har ändrats sedan du öppnade dem. Dina inmatade mål finns kvar. Läs in aktuella mål innan du sparar; det ersätter de osparade mål du ser här.<Button variant="outline" onClick={reload}>Läs in aktuella mål</Button></div>}
  <Button disabled={busy||changed} onClick={async()=>{const update=initialized?{sellerGoalsById:draft,sellerAnnualGoalsById:annual}:{sellerGoals:draft,sellerAnnualGoals:annual};if(await save('settings',{...st.settings,...update},false))setBasis(context(draft,annual))}}>Spara säljarmål</Button>
 </section>;
}
