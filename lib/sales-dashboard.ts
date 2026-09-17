import {type State,day,isOpen,margin} from './crm';
export const personalOwner=(st:State)=>st.viewer?.owner&&st.settings.owners.includes(st.viewer.owner)?st.viewer.owner:'';
export function swedishMonth(at:string){if(!at)return '';const date=new Date(at);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(date);}
export function salesMetrics(st:State,month:string,owner:string){
 const year=month.slice(0,4),matches=(r:{owner:string})=>owner==='all'||!!owner&&r.owner===owner;
 const invoices=st.orders.filter(o=>matches(o)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(month+'-'));
 const yearInvoices=st.orders.filter(o=>matches(o)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-'));
 const known=invoices.filter(o=>o.actualCost!==null),knownRevenue=known.reduce((n,o)=>n+o.invoiceValue!,0),knownCost=known.reduce((n,o)=>n+o.actualCost!,0);
 const open=st.deals.filter(d=>matches(d)&&isOpen(d)),goals=owner==='all'?undefined:st.settings.sellerGoals[owner]?.[month];
 const yearMonths=Object.entries(st.settings.sellerGoals[owner]||{}).filter(([date,g])=>date.startsWith(year+'-')&&g.revenue!==null);
 const explicitYear=owner==='all'?st.settings.annualBudgets[year]:st.settings.sellerAnnualGoals[owner]?.[year];
 const yearTarget=explicitYear??(owner!=='all'&&yearMonths.length===12?yearMonths.reduce((n,[,g])=>n+g.revenue!,0):null);
 return {invoices,known,revenue:invoices.reduce((n,o)=>n+o.invoiceValue!,0),target:(owner==='all'?st.settings.budgets[month]:goals?.revenue)??null,profit:known.length?knownRevenue-knownCost:null,profitTarget:goals?.grossProfit??null,margin:margin(knownRevenue,knownCost),yearRevenue:yearInvoices.reduce((n,o)=>n+o.invoiceValue!,0),yearTarget,yearTargetSource:explicitYear!=null?'annual':yearMonths.length===12?'months':'missing',configuredMonths:yearMonths.length,qualified:st.customers.filter(c=>(owner==='all'||!!owner&&(c.prospecting.qualifiedOwner||c.owner)===owner)&&swedishMonth(c.prospecting.qualifiedAt)===month).length,qualifiedTarget:goals?.qualified??null,open,pipeline:open.reduce((n,d)=>n+(d.value||0),0),unpriced:open.filter(d=>d.value===null).length,repeat:invoices.filter(o=>st.deals.find(d=>d.id===o.dealId)?.type==='repeat').length,tasks:st.tasks.filter(t=>matches(t)&&!t.done).sort((a,b)=>a.due.localeCompare(b.due)),customers:st.customers.filter(matches),orders:st.orders.filter(matches),meetings:st.meetings.filter(m=>matches(m)&&m.status==='planned'&&m.date>=day()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))};
}
export function noticeInScope(st:State,n:State['notices'][number],owner:string){if(owner==='all'||['print','warehouse','production'].includes(st.viewer?.role||''))return true;if(n.audience==='team')return true;if(!owner||owner==='_unassigned')return false;return n.owner===owner||!!n.orderId&&st.orders.some(o=>o.id===n.orderId&&o.owner===owner);}
