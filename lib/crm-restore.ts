import {z} from 'zod';
import {collectFileReferences} from './export-references';
import {productionProgress} from './production-quantities';
import {ArticleSchema,NoticeSchema,LeadSchema,CompanyEventSchema} from './operations';
import {normalizeState,RuleError,type State,CustomerSchema,DealSchema,OrderSchema,TaskSchema,MeetingSchema,SettingsSchema} from './crm';
export function restoreState(current:State,data:unknown,allowFiles=false):State{
 if(current.customers.length||current.deals.length||current.tasks.length||current.orders.length||current.events.length||current.meetings.length||current.articles.length||current.leads.length||current.companyEvents.length||current.notices.length)throw new RuleError('Återställning kräver en tom arbetsyta. Befintliga uppgifter skrivs inte över.');
 const p=z.object({format:z.literal('magnussons-crm-1'),state:z.object({articles:z.array(ArticleSchema).default([]),notices:z.array(NoticeSchema).default([]),leads:z.array(LeadSchema).default([]),companyEvents:z.array(CompanyEventSchema).default([]),customers:z.array(CustomerSchema).max(10000),deals:z.array(DealSchema).max(20000),orders:z.array(OrderSchema).max(20000),tasks:z.array(TaskSchema).max(30000),meetings:z.array(MeetingSchema).max(20000),events:z.array(z.object({id:z.string().min(1),customerId:z.string().min(1),dealId:z.string(),text:z.string().max(50000),at:z.string(),kind:z.string(),note:z.object({title:z.string(),meetingDate:z.string(),sourceFiles:z.array(z.string())}).optional(),actor:z.object({id:z.string(),name:z.string()}).optional()})).max(50000),settings:SettingsSchema})}).parse(data);
 const next=normalizeState({...p.state,version:current.version});for(const list of [next.customers,next.deals,next.orders,next.tasks,next.meetings,next.events,next.articles,next.leads,next.notices,next.companyEvents]){if(list.some(x=>!x.id)||new Set(list.map(x=>x.id)).size!==list.length)throw new RuleError('Exporten innehåller tomma eller dubbla id:n.');}
 const cs=new Set(next.customers.map(c=>c.id)),ds=new Map(next.deals.map(d=>[d.id,d.customerId]));for(const row of [...next.deals,...next.orders,...next.tasks,...next.meetings,...next.events])if(!cs.has(row.customerId))throw new RuleError('Exporten har en bruten kundkoppling.');
 for(const row of [...next.orders,...next.tasks,...next.events])if(row.dealId&&ds.get(row.dealId)!==row.customerId)throw new RuleError('Exporten har en bruten affärskoppling.');
 if(new Set(next.orders.map(o=>o.dealId)).size!==next.orders.length)throw new RuleError('Exporten har fler än en order per affär.');
 for(const o of next.orders)for(const p of [o.production,...o.productionHistory]){
  const ids=new Set(p.lines.map(l=>l.id));
  if([...p.movements,...p.quantityAdjustments].some(m=>new Set(m.entries.map(e=>e.lineId)).size!==m.entries.length||m.entries.some(e=>!ids.has(e.lineId))))throw new RuleError('Kopian har en bruten artikelkoppling i antalhistoriken.');
  if(productionProgress(p).some(r=>[r.target,r.usableReceived,r.usablePrinted,r.toReceive,r.toPrint,r.toDispatch,r.remaining].some(n=>!Number.isFinite(n)||n<0)))throw new RuleError('Kopian har oförenliga mottagna, tryckta eller skickade antal.');
 }
 if(!allowFiles&&collectFileReferences(next).length)throw new RuleError('Den här dataexporten hänvisar till uppladdade kundfiler som inte ingår i JSON-filen. Återställningen stoppas för att bevara korrektur och produktionsunderlag. Använd funktionen CRM-kopia med kundfiler för en komplett återställning.');
 return next;
}
