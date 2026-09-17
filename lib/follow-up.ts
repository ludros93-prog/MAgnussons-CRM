import {z} from 'zod';
import type {State,Task} from './crm';
import {recordBasis} from './record-conflicts';
// Contact can be logged here even when completing the underlying work needs a
// dedicated approval, onboarding checklist or recurring-need workflow.
export const protectedFollowUp=(task:Task)=>['onboarding','csm_issue','csm_need'].includes(task.kind)||task.kind.startsWith('year:');
export const canFollowUp=(task:Task)=>!task.done&&(['manual','meeting_followup','quote','discovery','csm','csm_issue','csm_need','prospecting','onboarding','care'].includes(task.kind)||task.kind.startsWith('year:'));
export const FollowUpSchema=z.object({taskId:z.string().min(1),expectedContext:z.string().min(1),outcome:z.enum(['contact','no_reply','internal']),occurredOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Välj ett giltigt datum.'),note:z.string().trim().min(1,'Skriv en kort anteckning.').max(49000),completed:z.boolean(),nextAction:z.string().trim().max(240),nextDate:z.string()});
export function followupBasis(st:State,taskId:string){
 const t=st.tasks.find(t=>t.id===taskId),d=t&&['quote','discovery'].includes(t.kind)?st.deals.find(d=>d.id===t.dealId):undefined;
 const c=t?st.customers.find(c=>c.id===t.customerId):undefined;
 const context=c&&t&&(['csm','prospecting'].includes(t.kind)||protectedFollowUp(t))?{owner:c.owner,status:c.status,plan:c.plan,prospecting:c.prospecting,onboarding:c.onboarding,yearNeeds:c.yearNeeds,nextReview:c.nextReview}:null;
 return recordBasis({task:t||null,deal:d?{id:d.id,customerId:d.customerId,stage:d.stage,owner:d.owner,nextAction:d.nextAction,nextDate:d.nextDate}:null,customerContext:context});
}
