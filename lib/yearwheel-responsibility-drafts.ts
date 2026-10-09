import {z} from 'zod';
import {CustomerSchema,TaskSchema,emptyState,type State,type Task} from './crm';
import {DraftInput,type DraftRecord} from './drafts';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';
import {SellerProfileSchema} from './seller-profiles';
import {YearNeedDraftContextSchema} from './year-need-drafts';
import {YearwheelResponsibilityTransferSchema,yearwheelResponsibilityBasis,yearwheelResponsibilityContext,yearwheelResponsibilityCandidates,type YearwheelResponsibilityTransfer} from './yearwheel-responsibility';

const canonicalId=z.string().min(1).max(100).refine(value=>value===value.trim(),'Behåll den registrerade kund-, behovs- eller uppgiftskopplingen.');
// An unfinished choice and raw reason are private intent. Only publication
// trims and validates the required business reason and target profile.
export const YearwheelResponsibilityDraftValuesSchema=z.object({
 targetProfileId:z.union([z.literal(''),z.string().uuid()]),
 selectedTaskIds:z.array(canonicalId).max(500),reason:z.string().max(4000)
}).strict().superRefine((values,ctx)=>{
 if(new Set(values.selectedTaskIds).size!==values.selectedTaskIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:['selectedTaskIds'],message:'Välj varje årshjulsuppgift endast en gång.'});
});
export type YearwheelResponsibilityDraftValues=z.infer<typeof YearwheelResponsibilityDraftValuesSchema>;
const canonicalTask=z.custom<Task>(value=>{
 const parsed=TaskSchema.strict().safeParse(value);
 return parsed.success&&recordBasis(parsed.data)===recordBasis(value);
},'Granskningsunderlaget ska bevara uppgiftens fullständiga registrerade version.');
export const YearwheelResponsibilityDraftContextSchema=YearNeedDraftContextSchema.innerType().extend({need:YearNeedDraftContextSchema.innerType().shape.need.unwrap(),tasks:z.array(canonicalTask).max(30000)}).strict().superRefine((context,ctx)=>{
 const {tasks,...base}=context,parsed=YearNeedDraftContextSchema.safeParse(base);
 if(!parsed.success||recordBasis(parsed.data)!==recordBasis(base))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Behåll det fullständiga ursprungliga kund-, behovs- och profilunderlaget.'});
 if(!context.need)ctx.addIssue({code:z.ZodIssueCode.custom,path:['need'],message:'En behovsöverlämning ska behålla sitt ursprungliga inköpsbehov.'});
 const ids=tasks.map(task=>task.id);
 if(new Set(ids).size!==ids.length||tasks.some(task=>!task.id||task.customerId!==context.customer.id)||recordBasis(ids)!==recordBasis([...ids].sort((a,b)=>a.localeCompare(b))))ctx.addIssue({code:z.ZodIssueCode.custom,path:['tasks'],message:'Granskningsunderlaget ska innehålla unika, ordnade uppgifter för samma kund.'});
});
export type YearwheelResponsibilityDraftContext=z.infer<typeof YearwheelResponsibilityDraftContextSchema>;
export const YearwheelResponsibilityDraftEnvelopeSchema=z.object({
 draftId:z.string().min(1).max(160),type:z.literal('yearwheel_responsibility_transfer'),customerId:canonicalId,needId:canonicalId,
 values:YearwheelResponsibilityDraftValuesSchema,context:YearwheelResponsibilityDraftContextSchema,
 expectedContext:z.string().min(1).max(3000000),initialData:z.string().min(1).max(3000000)
}).strict().superRefine((envelope,ctx)=>{
 if(envelope.context.customer.id!==envelope.customerId||envelope.context.need?.id!==envelope.needId)ctx.addIssue({code:z.ZodIssueCode.custom,path:['customerId'],message:'Utkastets ursprungliga kund och inköpsbehov ska behållas.'});
 if(envelope.expectedContext!==recordBasis(envelope.context))ctx.addIssue({code:z.ZodIssueCode.custom,path:['expectedContext'],message:'Överlämningens ursprungliga granskningsunderlag stämmer inte.'});
 try{
  const initial:unknown=JSON.parse(envelope.initialData),parsed=YearwheelResponsibilityDraftValuesSchema.safeParse(initial);
  if(!parsed.success||recordBasis(parsed.data)!==envelope.initialData)throw Error('Invalid initial intent.');
 }catch{ctx.addIssue({code:z.ZodIssueCode.custom,path:['initialData'],message:'Behåll överlämningens ursprungliga råa val och orsak.'});}
});
export type YearwheelResponsibilityDraftEnvelope=z.infer<typeof YearwheelResponsibilityDraftEnvelopeSchema>;
export const isYearwheelResponsibilityDraft=(kind:string,context:string)=>kind==='form'&&context==='yearwheel_responsibility_transfer';
export const yearwheelResponsibilityDraftContext=yearwheelResponsibilityContext;

export function createYearwheelResponsibilityDraft(st:State,customerId:string,needId:string,draftId:string):YearwheelResponsibilityDraftEnvelope{
 const context=structuredClone(yearwheelResponsibilityContext(st,customerId,needId));
 if(!context.customer||!context.need)throw new RuleError('Kunden eller behovet finns inte längre. Ingen annan överlämning har öppnats.');
 const values:YearwheelResponsibilityDraftValues={targetProfileId:'',selectedTaskIds:[],reason:''};
 return YearwheelResponsibilityDraftEnvelopeSchema.parse({draftId,type:'yearwheel_responsibility_transfer',customerId,needId,values,context,expectedContext:recordBasis(context),initialData:recordBasis(values)});
}
/** A display-only state reconstructs the existing candidates from the frozen
 * context. It never replaces the stored context or supplies CRM permissions. */
export function yearwheelResponsibilityDraftSnapshot(value:YearwheelResponsibilityDraftContext){
 const context=YearwheelResponsibilityDraftContextSchema.parse(value),st=emptyState();
 st.customers=[CustomerSchema.parse({...context.customer,yearNeeds:[context.need]})];
 st.tasks=structuredClone(context.tasks);
 st.settings={...st.settings,owners:structuredClone(context.owners),sellerProfilesInitialized:context.initialized,sellerProfiles:context.profiles.map(profile=>SellerProfileSchema.parse(profile))};
 return yearwheelResponsibilityCandidates(st,context.customer.id,context.need!.id);
}
/** Only an explicit editor choice calls adoption. Fresh reads never change
 * original intent, and removed customer/need targets cannot become new work. */
export function adoptYearwheelResponsibilityDraftContext(value:YearwheelResponsibilityDraftEnvelope,current:State):YearwheelResponsibilityDraftEnvelope{
 const envelope=YearwheelResponsibilityDraftEnvelopeSchema.parse(value),context=structuredClone(yearwheelResponsibilityContext(current,envelope.customerId,envelope.needId));
 if(!context.customer||!context.need)throw new RuleError('Kunden eller behovet finns inte längre. Ditt privata överlämningsunderlag finns kvar.');
 const candidates=yearwheelResponsibilityCandidates(current,envelope.customerId,envelope.needId),eligible=new Set(candidates.eligible.map(task=>task.id));
 const values={...structuredClone(envelope.values),targetProfileId:candidates.targetProfiles.some(profile=>profile.id===envelope.values.targetProfileId)?envelope.values.targetProfileId:'',selectedTaskIds:envelope.values.selectedTaskIds.filter(id=>eligible.has(id))};
 return YearwheelResponsibilityDraftEnvelopeSchema.parse({...envelope,values,context,expectedContext:recordBasis(context)});
}
const ServerDraftSchema=DraftInput.extend({kind:z.literal('form'),context:z.literal('yearwheel_responsibility_transfer'),revision:z.number().int().positive(),archived:z.boolean(),updatedAt:z.string().min(1).max(100)});
export function yearwheelResponsibilityDraftServerVersion(value:unknown,id:string,customerId?:string,needId?:string):DraftRecord|null{
 const record=ServerDraftSchema.safeParse(value);if(!record.success||record.data.id!==id)return null;
 const envelope=YearwheelResponsibilityDraftEnvelopeSchema.safeParse(record.data.data);
 if(!envelope.success||envelope.data.draftId!==id||recordBasis(envelope.data)!==recordBasis(record.data.data)||customerId!==undefined&&envelope.data.customerId!==customerId||needId!==undefined&&envelope.data.needId!==needId)return null;
 return value as DraftRecord;
}
export const YearwheelResponsibilityDraftPublicationSchema=z.object({
 customerId:canonicalId,needId:canonicalId,values:YearwheelResponsibilityDraftValuesSchema,
 reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000),
 draft:z.object({id:z.string().min(1).max(160),revision:z.number().int().positive()}).strict()
}).strict();
export function yearwheelResponsibilityDraftBusinessValues(value:unknown):YearwheelResponsibilityTransfer{
 const payload=YearwheelResponsibilityDraftPublicationSchema.parse(value);
 return YearwheelResponsibilityTransferSchema.parse({customerId:payload.customerId,needId:payload.needId,...payload.values,reviewed:true,expectedContext:payload.expectedContext});
}
export function validateYearwheelResponsibilityDraftConsumption(actionData:unknown,stored:unknown,current:State,draftId:string):YearwheelResponsibilityTransfer{
 const envelope=YearwheelResponsibilityDraftEnvelopeSchema.parse(stored),payload=YearwheelResponsibilityDraftPublicationSchema.parse(actionData);
 if(envelope.draftId!==draftId||payload.draft.id!==draftId||payload.customerId!==envelope.customerId||payload.needId!==envelope.needId)throw new RuleError('Välj rätt eget överlämningsutkast för kunden och behovet.');
 if(payload.expectedContext!==envelope.expectedContext)throw new RuleError('Använd utkastets ursprungliga granskningsunderlag. Granska och spara en ny privat version först.');
 if(recordBasis(payload.values)!==recordBasis(envelope.values))throw new RuleError('Spara ändringarna privat först. CRM kan bara använda exakt samma råa val och orsak som den sparade utkastversionen.');
 const customer=current.customers.find(row=>row.id===envelope.customerId);
 if(!customer||!customer.yearNeeds.some(need=>need.id===envelope.needId))throw new RuleError('Kunden eller behovet finns inte längre. Ditt privata överlämningsunderlag finns kvar.');
 if(yearwheelResponsibilityBasis(current,envelope.customerId,envelope.needId)!==envelope.expectedContext)throw new RuleError('Behovet eller granskningsunderlaget har ändrats. Granska aktuellt underlag innan du sparar i CRM.');
 return yearwheelResponsibilityDraftBusinessValues(payload);
}
