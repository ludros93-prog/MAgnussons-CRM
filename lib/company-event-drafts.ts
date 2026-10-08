import {z} from 'zod';
import {CompanyEventSchema,type CompanyEvent} from './operations';
import {recordBasis} from './record-conflicts';
import {RuleError} from './crm-errors';
import {DraftInput,type DraftRecord} from './drafts';
import {CompanyEventResponsibilityHistorySchema,type CompanyEventResponsibilityHistory} from './company-event-responsibility-schema';

// Unfinished titles, owners and dates belong in the private draft. Validate
// business fields only when the owner explicitly publishes to the shared CRM.
// No defaults or trimming may silently change an acknowledged private body.
const rawResponsibilityHistory=z.custom<CompanyEventResponsibilityHistory>(value=>{
 const parsed=CompanyEventResponsibilityHistorySchema.safeParse(value);
 return parsed.success&&recordBasis(parsed.data)===recordBasis(value);
},'Förberedelsens bevarade ansvarshistorik måste ha exakt registrerat format.');
export const CompanyEventDraftValuesSchema=z.object({
 id:z.string().max(4000),title:z.string().max(200),date:z.string().max(100),
 endDate:z.string().max(100),owner:z.string().max(4000),
 category:z.enum(['event','campaign','internal','holiday']),notes:z.string().max(4000),
 status:z.enum(['planned','done','cancelled']),
 checklist:z.array(z.object({
  id:z.string().max(4000),title:z.string().max(4000),owner:z.string().max(4000),
  due:z.string().max(100),done:z.boolean(),
  // Optional without defaults: an acknowledged pre-v60 private body must
  // remain byte-exact and recoverable, even after shared responsibility changes.
  ownerProfileId:z.union([z.literal(''),z.string().uuid()]).optional(),
  responsibilityTransfers:z.array(rawResponsibilityHistory).max(1000).optional()
 }).strict()).max(50)
}).strict();
export type CompanyEventDraftValues=z.infer<typeof CompanyEventDraftValuesSchema>;
export const CompanyEventDraftEnvelopeSchema=z.object({
 draftId:z.string().min(1).max(160),type:z.literal('company_event'),
 values:CompanyEventDraftValuesSchema,base:CompanyEventDraftValuesSchema,
 expectedContext:z.string().min(1).max(3000000),initialData:z.string().min(1).max(3000000)
}).strict().superRefine((envelope,ctx)=>{
 const basis=recordBasis(envelope.base);
 if(envelope.initialData!==basis)ctx.addIssue({code:z.ZodIssueCode.custom,path:['initialData'],message:'Utkastet ska behålla sina ursprungliga aktivitetsuppgifter.'});
 if(envelope.expectedContext!==(envelope.base.id?basis:recordBasis(null)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['expectedContext'],message:'Utkastets ursprungliga aktivitetsunderlag stämmer inte.'});
 if(envelope.values.id!==envelope.base.id)ctx.addIssue({code:z.ZodIssueCode.custom,path:['values','id'],message:'Utkastet får inte byta företagsaktivitet.'});
 if(envelope.base.id){
  const original=CompanyEventSchema.strict().safeParse(envelope.base);
  if(original.success){
   // Only the newly introduced empty defaults may be absent in a legacy base.
   // Validate all original business fields; never normalize the private body.
   const comparable=structuredClone(original.data) as CompanyEventDraftValues;
   comparable.checklist.forEach((row,index)=>{
    if(envelope.base.checklist[index].ownerProfileId===undefined)delete row.ownerProfileId;
    if(envelope.base.checklist[index].responsibilityTransfers===undefined)delete row.responsibilityTransfers;
   });
   if(recordBasis(comparable)!==basis)ctx.addIssue({code:z.ZodIssueCode.custom,path:['base'],message:'Det ursprungliga underlaget ska vara den fullständiga registrerade företagsaktiviteten.'});
  }else ctx.addIssue({code:z.ZodIssueCode.custom,path:['base'],message:'Det ursprungliga underlaget ska vara den fullständiga registrerade företagsaktiviteten.'});
 }
});
export type CompanyEventDraftEnvelope=z.infer<typeof CompanyEventDraftEnvelopeSchema>;
export const isCompanyEventDraft=(kind:string,context:string)=>kind==='form'&&context==='company_event';

// Called only after explicit comparison/adoption in the editor. Preserve all
// planning text and deliberate owner edits. An unchanged old owner follows the
// reviewed current row; a deliberate different owner still needs its own review.
export function adoptCompanyEventDraftResponsibilities(values:CompanyEventDraftValues,base:CompanyEventDraftValues,current:CompanyEvent):CompanyEventDraftValues{
 return {...structuredClone(values),checklist:values.checklist.map(row=>{
  const previous=base.checklist.find(value=>value.id===row.id),actual=current.checklist.find(value=>value.id===row.id);
  if(!previous||!actual)return structuredClone(row);
  return {...structuredClone(row),owner:row.owner===previous.owner?actual.owner:row.owner,
   ownerProfileId:actual.ownerProfileId,responsibilityTransfers:structuredClone(actual.responsibilityTransfers)};
 })};
}

const ServerCompanyEventDraftSchema=DraftInput.extend({kind:z.literal('form'),context:z.literal('company_event'),revision:z.number().int().positive(),archived:z.boolean(),updatedAt:z.string().min(1).max(100)});
// Read/copy malformed old records, but never select a normalized, differently
// linked or unsaved comparison as the private server version being reviewed.
export function companyEventDraftServerVersion(value:unknown,id:string,eventId?:string):DraftRecord|null{
 const record=ServerCompanyEventDraftSchema.safeParse(value);if(!record.success||record.data.id!==id)return null;
 const envelope=CompanyEventDraftEnvelopeSchema.safeParse(record.data.data);
 if(!envelope.success||envelope.data.draftId!==id||recordBasis(envelope.data)!==recordBasis(record.data.data)||eventId!==undefined&&envelope.data.base.id!==eventId)return null;
 return value as DraftRecord;
}

export function validateCompanyEventDraftConsumption(actionData:unknown,stored:unknown,currentEvents:CompanyEvent[],draftId:string){
 const envelope=CompanyEventDraftEnvelopeSchema.parse(stored),payload=z.record(z.unknown()).parse(actionData);
 const {draft,expectedContext,...rawValues}=payload,values=CompanyEventDraftValuesSchema.parse(rawValues);
 const reference=z.object({id:z.string().min(1).max(160),revision:z.number().int().positive()}).strict().parse(draft);
 if(envelope.draftId!==draftId||reference.id!==draftId)throw new RuleError('Välj rätt privat aktivitetsutkast innan du sparar i CRM.');
 if(expectedContext!==envelope.expectedContext)throw new RuleError('Använd utkastets ursprungliga aktivitetsunderlag. Granska aktuell aktivitet och spara den valda versionen privat först.');
 if(recordBasis(values)!==recordBasis(envelope.values))throw new RuleError('Spara dina ändringar i det privata utkastet först. CRM kan bara använda exakt samma aktivitetsuppgifter som den sparade utkastversionen.');
 if(values.id){
  const current=currentEvents.find(event=>event.id===values.id);
  if(!current)throw new RuleError('Företagsaktiviteten finns inte längre i arbetsytan. Ditt privata utkast finns kvar.');
  if(recordBasis(current)!==envelope.expectedContext)throw new RuleError('Företagsaktiviteten har ändrats. Granska aktuellt underlag innan du sparar i CRM.');
 }
}
