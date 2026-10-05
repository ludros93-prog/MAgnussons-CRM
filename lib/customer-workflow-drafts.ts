import {z} from 'zod';
import {validDate} from './business';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';

export const CustomerWorkflowDraftKind=z.enum(['plan','prospecting','onboarding']);
export type CustomerWorkflowDraftKind=z.infer<typeof CustomerWorkflowDraftKind>;
export const CustomerWorkflowDraftEnvelopeSchema=z.object({
 // A private draft may be incomplete. Business validation runs only when the
 // owner deliberately publishes it into the customer's CRM workflow.
 values:z.record(z.unknown()),expectedContext:z.string().min(1).max(3000000),
 customerName:z.string().max(200).optional(),reviewedOn:validDate.optional()
}).strict();
export type CustomerWorkflowDraftEnvelope=z.infer<typeof CustomerWorkflowDraftEnvelopeSchema>;
export const isCustomerWorkflowDraft=(kind:string):kind is CustomerWorkflowDraftKind=>CustomerWorkflowDraftKind.safeParse(kind).success;

export function customerWorkflowDraftValues(type:CustomerWorkflowDraftKind,data:unknown){
 const payload=z.record(z.unknown()).parse(data);
 if(type==='plan')return {...z.record(z.unknown()).parse(payload.plan),nextReview:payload.nextReview,expectedOrder:payload.expectedOrder,reviewDays:payload.reviewDays,reviewed:payload.reviewed??false};
 return z.record(z.unknown()).parse(payload[type]);
}
export function validateCustomerWorkflowDraftConsumption(type:CustomerWorkflowDraftKind,data:unknown,stored:unknown,today:string){
 const envelope=CustomerWorkflowDraftEnvelopeSchema.parse(stored),payload=z.record(z.unknown()).parse(data);
 if(payload.expectedContext!==envelope.expectedContext)throw new RuleError('Utkastets ursprungliga kundunderlag måste användas. Läs in och granska ändringar innan du sparar en ny version av utkastet.');
 if(recordBasis(customerWorkflowDraftValues(type,payload))!==recordBasis(envelope.values))throw new RuleError('Spara dina ändringar i det privata utkastet först. CRM kan bara använda samma uppgifter som den sparade utkastversionen.');
 if(type==='plan'&&envelope.values.reviewed===true&&envelope.reviewedOn!==today)throw new RuleError('Avstämningen i utkastet gäller en annan dag. Granska kundplanen och bekräfta en avstämning idag innan den registreras som kundkontakt.');
}
