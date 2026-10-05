import {type State,day,isOpen,margin} from './crm';
import {legacySellerNames,personalSellerId,sellerProfileById} from './seller-profiles';

// Operational ownership stays on its existing alias until the separate
// operational-ID migration is complete. Result attribution never follows it
// once explicit seller profiles have been initialized.
export const personalOwner=(st:State)=>st.viewer?.owner&&st.settings.owners.includes(st.viewer.owner)?st.viewer.owner:'';
export const personalResultScope=(st:State)=>st.settings.sellerProfilesInitialized?personalSellerId(st):personalOwner(st);
export function resultOperationalOwner(st:State,scope:string){
 if(scope==='all')return 'all';
 const alias=st.settings.sellerProfilesInitialized?sellerProfileById(st.settings,scope)?.legacyOwnerName||'':scope;
 return st.settings.owners.includes(alias)?alias:'';
}
export function swedishMonth(at:string){if(!at)return '';const date=new Date(at);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(date);}

function invoiceInScope(st:State,o:State['orders'][number],scope:string){
 if(scope==='all')return true;
 if(!scope)return false;
 return st.settings.sellerProfilesInitialized?!!sellerProfileById(st.settings,scope)&&o.invoiceOwnerId===scope:(o.invoiceOwner||o.owner)===scope;
}
function qualificationInScope(st:State,c:State['customers'][number],scope:string){
 if(scope==='all')return true;
 if(!scope)return false;
 return st.settings.sellerProfilesInitialized?!!sellerProfileById(st.settings,scope)&&c.prospecting.qualifiedOwnerId===scope:(c.prospecting.qualifiedOwner||c.owner)===scope;
}
function sellerGoals(st:State,scope:string){return st.settings.sellerProfilesInitialized?st.settings.sellerGoalsById[scope]:st.settings.sellerGoals[scope];}
function sellerAnnualGoals(st:State,scope:string){return st.settings.sellerProfilesInitialized?st.settings.sellerAnnualGoalsById[scope]:st.settings.sellerAnnualGoals[scope];}

export function salesMetrics(st:State,month:string,owner:string){
 const year=month.slice(0,4),operationalOwner=resultOperationalOwner(st,owner),matches=(r:{owner:string})=>owner==='all'||!!operationalOwner&&r.owner===operationalOwner;
 const invoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(month+'-'));
 const yearInvoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-'));
 const known=invoices.filter(o=>o.actualCost!==null),knownRevenue=known.reduce((n,o)=>n+o.invoiceValue!,0),knownCost=known.reduce((n,o)=>n+o.actualCost!,0);
 const open=st.deals.filter(d=>matches(d)&&isOpen(d)),goals=owner==='all'?undefined:sellerGoals(st,owner)?.[month];
 const yearMonths=Object.entries(sellerGoals(st,owner)||{}).filter(([date,g])=>date.startsWith(year+'-')&&g.revenue!==null);
 const explicitYear=owner==='all'?st.settings.annualBudgets[year]:sellerAnnualGoals(st,owner)?.[year];
 const yearTarget=explicitYear??(owner!=='all'&&yearMonths.length===12?yearMonths.reduce((n,[,g])=>n+g.revenue!,0):null);
 const unattributedInvoices=st.settings.sellerProfilesInitialized?invoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const yearUnattributedInvoices=st.settings.sellerProfilesInitialized?yearInvoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const qualified=st.customers.filter(c=>qualificationInScope(st,c,owner)&&swedishMonth(c.prospecting.qualifiedAt)===month);
 const unattributedQualified=st.settings.sellerProfilesInitialized?qualified.filter(c=>!c.prospecting.qualifiedOwnerId||!sellerProfileById(st.settings,c.prospecting.qualifiedOwnerId)):[];
 return {invoices,yearInvoices,known,revenue:invoices.reduce((n,o)=>n+o.invoiceValue!,0),target:(owner==='all'?st.settings.budgets[month]:goals?.revenue)??null,profit:known.length?knownRevenue-knownCost:null,profitTarget:goals?.grossProfit??null,margin:margin(knownRevenue,knownCost),yearRevenue:yearInvoices.reduce((n,o)=>n+o.invoiceValue!,0),yearTarget,yearTargetSource:explicitYear!=null?'annual':yearMonths.length===12?'months':'missing',configuredMonths:yearMonths.length,qualified:qualified.length,qualifiedTarget:goals?.qualified??null,open,pipeline:open.reduce((n,d)=>n+(d.value||0),0),unpriced:open.filter(d=>d.value===null).length,repeat:invoices.filter(o=>st.deals.find(d=>d.id===o.dealId)?.type==='repeat').length,tasks:st.tasks.filter(t=>matches(t)&&!t.done).sort((a,b)=>a.due.localeCompare(b.due)),customers:st.customers.filter(matches),orders:st.orders.filter(matches),meetings:st.meetings.filter(m=>matches(m)&&m.status==='planned'&&m.date>=day()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),unattributedInvoices,unattributedRevenue:unattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),yearUnattributedInvoices,yearUnattributedRevenue:yearUnattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),unattributedQualified:unattributedQualified.length};
}
export function noticeInScope(st:State,n:State['notices'][number],owner:string){if(owner==='all'||['print','warehouse','production'].includes(st.viewer?.role||''))return true;if(n.audience==='team')return true;if(!owner||owner==='_unassigned')return false;return n.owner===owner||!!n.orderId&&st.orders.some(o=>o.id===n.orderId&&o.owner===owner);}

export function salesYearSeries(st:State,year:string,owner:string){
 const invoices=st.orders.filter(o=>o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-')&&invoiceInScope(st,o,owner));
 let cumulativeRevenue=0,cumulativeTarget:number|null=0;
 return Array.from({length:12},(_,i)=>{
  const month=year+'-'+String(i+1).padStart(2,'0'),rows=invoices.filter(o=>o.invoiceDate.startsWith(month+'-'));
  const target=(owner==='all'?st.settings.budgets[month]:sellerGoals(st,owner)?.[month]?.revenue)??null;
  const revenue=rows.reduce((sum,o)=>sum+o.invoiceValue!,0);cumulativeRevenue+=revenue;
  cumulativeTarget=target===null||cumulativeTarget===null?null:cumulativeTarget+target;
  return {month,label:new Date(month+'-01T12:00:00').toLocaleDateString('sv-SE',{month:'short'}),revenue,target,invoices:rows.length,cumulativeRevenue,cumulativeTarget};
 });
}

// Include inactive profiles so former sellers' history remains visible.
export function teamSalesRows(st:State,month:string){
 const profiles=st.settings.sellerProfilesInitialized?st.settings.sellerProfiles:legacySellerNames(st).map(owner=>({id:owner,legacyOwnerName:owner,displayName:owner,active:st.settings.owners.includes(owner)}));
 return profiles.map(profile=>{
  const stats=salesMetrics(st,month,profile.id),goal=sellerGoals(st,profile.id)?.[month];
  return {id:profile.id,ownerId:st.settings.sellerProfilesInitialized?profile.id:'',owner:profile.legacyOwnerName,displayName:profile.displayName,active:profile.active,revenue:stats.revenue,profit:stats.profit,margin:stats.margin,known:stats.known.length,invoices:stats.invoices.length,qualified:stats.qualified,goal,attainment:stats.target!==null&&stats.target>0?stats.revenue/stats.target:null,repeat:stats.repeat,late:stats.tasks.filter(t=>t.due<day()).length};
 });
}
