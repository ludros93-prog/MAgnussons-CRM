import {z} from 'zod';
import {NeedSchema,type Need} from './business';
import type {State} from './crm';
import {DraftInput,type DraftRecord} from './drafts';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';
import {yearNeedEditContext,yearNeedEditBasis} from './yearwheel-responsibility';
import {YearwheelResponsibilityHistorySchema,type YearwheelResponsibilityHistory} from './yearwheel-responsibility-schema';

const rawHistory=z.custom<YearwheelResponsibilityHistory>(value=>{
 const parsed=YearwheelResponsibilityHistorySchema.safeParse(value);
 return parsed.success&&recordBasis(parsed.data)===recordBasis(value);
},'Behovets bevarade ansvarshistorik måste ha exakt registrerat format.');
// Incomplete dates, choices and numbers are private text, not business facts.
// No defaults, coercion or trimming may change an acknowledged private body.
export const YearNeedDraftValuesSchema=z.object({
 id:z.string().max(4000),title:z.string().max(200),category:z.string().max(4000),
 due:z.string().max(100),leadDays:z.string().max(100),owner:z.string().max(4000),
 intervalMonths:z.string().max(100),notes:z.string().max(4000),
 status:z.enum(['planned','done','cancelled']),completedAt:z.string().max(4000),dealId:z.string().max(4000),
 ownerProfileId:z.union([z.literal(''),z.string().uuid()]),responsibilityTransfers:z.array(rawHistory).max(1000)
}).strict();
export type YearNeedDraftValues=z.infer<typeof YearNeedDraftValuesSchema>;
export function yearNeedDraftValues(need:Need):YearNeedDraftValues{
 return {...structuredClone(need),leadDays:String(need.leadDays),intervalMonths:String(need.intervalMonths)};
}
const canonicalNeed=z.custom<Need>(value=>{
 const parsed=NeedSchema.strict().safeParse(value);
 return parsed.success&&recordBasis(parsed.data)===recordBasis(value);
},'Det ursprungliga behovet måste vara den fullständiga registrerade versionen.');
const canonicalText=(max:number,empty=false)=>z.string().max(max).refine(value=>(empty||value.length>0)&&value===value.trim(),'Det sparade granskningsunderlaget får inte normaliseras.');
export const YearNeedDraftContextSchema=z.object({
 customer:z.object({id:canonicalText(100),name:canonicalText(200),owner:canonicalText(4000),ownerProfileId:z.union([z.literal(''),z.string().uuid()]),status:z.enum(['prospect','onboarding','active','growth','risk','dormant','closed'])}).strict(),
 need:canonicalNeed.nullable(),initialized:z.boolean(),owners:z.array(canonicalText(150)).min(1).max(30),
 profiles:z.array(z.object({id:z.string().uuid(),displayName:canonicalText(150),legacyOwnerName:canonicalText(150),active:z.boolean(),memberId:canonicalText(150,true)}).strict()).max(1000)
}).strict().superRefine((context,ctx)=>{
 const profiles=context.profiles,ids=profiles.map(profile=>profile.id),owners=profiles.map(profile=>profile.legacyOwnerName),members=profiles.map(profile=>profile.memberId).filter(Boolean);
 if(new Set(ids).size!==ids.length||new Set(owners).size!==owners.length||new Set(members).size!==members.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:['profiles'],message:'Det ursprungliga profilunderlaget har dubbla ansvarskopplingar.'});
 if(context.initialized?!profiles.length:profiles.length>0)ctx.addIssue({code:z.ZodIssueCode.custom,path:['initialized'],message:'Det ursprungliga profilunderlaget motsäger sin initialisering.'});
 for(const [key,row] of [['customer',context.customer],['need',context.need]] as const){
  if(row?.ownerProfileId&&!profiles.some(profile=>profile.id===row.ownerProfileId&&profile.legacyOwnerName===row.owner))ctx.addIssue({code:z.ZodIssueCode.custom,path:[key,'ownerProfileId'],message:'Det ursprungliga ansvaret motsäger profilunderlaget.'});
 }
});
export const YearNeedDraftEnvelopeSchema=z.object({
 draftId:z.string().min(1).max(160),type:z.literal('year_need'),customerId:canonicalText(100),
 values:YearNeedDraftValuesSchema,base:YearNeedDraftValuesSchema,context:YearNeedDraftContextSchema,
 expectedContext:z.string().min(1).max(3000000),initialData:z.string().min(1).max(3000000)
}).strict().superRefine((envelope,ctx)=>{
 if(envelope.context.customer.id!==envelope.customerId)ctx.addIssue({code:z.ZodIssueCode.custom,path:['customerId'],message:'Utkastet och det ursprungliga kundunderlaget måste gälla samma kund.'});
 if(envelope.expectedContext!==recordBasis(envelope.context))ctx.addIssue({code:z.ZodIssueCode.custom,path:['expectedContext'],message:'Utkastets ursprungliga behovsunderlag stämmer inte.'});
 if(envelope.initialData!==recordBasis(envelope.base))ctx.addIssue({code:z.ZodIssueCode.custom,path:['initialData'],message:'Utkastet ska behålla sina ursprungliga behovsuppgifter.'});
 if(envelope.values.id!==envelope.base.id)ctx.addIssue({code:z.ZodIssueCode.custom,path:['values','id'],message:'Utkastet får inte byta inköpsbehov.'});
 const original=envelope.context.need;
 if(envelope.base.id?(!original||original.id!==envelope.base.id||recordBasis(yearNeedDraftValues(original))!==recordBasis(envelope.base)):original!==null)ctx.addIssue({code:z.ZodIssueCode.custom,path:['base'],message:'Utkastets ursprungliga behov måste motsvara hela det frysta kundunderlaget.'});
});
export type YearNeedDraftEnvelope=z.infer<typeof YearNeedDraftEnvelopeSchema>;
export const isYearNeedDraft=(kind:string,context:string)=>kind==='form'&&context==='year_need';

export function createYearNeedDraftEnvelope(st:State,customerId:string,values:YearNeedDraftValues,draftId:string):YearNeedDraftEnvelope{
 const context=structuredClone(yearNeedEditContext(st,customerId,values.id));
 if(!context.customer||values.id&&!context.need)throw new RuleError('Kunden eller behovet finns inte längre. Inget annat behov har öppnats.');
 const base=context.need?yearNeedDraftValues(context.need):structuredClone(values);
 return YearNeedDraftEnvelopeSchema.parse({draftId,type:'year_need',customerId,values:structuredClone(values),base,context,expectedContext:recordBasis(context),initialData:recordBasis(base)});
}
// Explicit editor adoption only. Ordinary rereads never call this helper.
export function adoptYearNeedDraftContext(envelope:YearNeedDraftEnvelope,current:State):YearNeedDraftEnvelope{
 const parsed=YearNeedDraftEnvelopeSchema.parse(envelope),context=yearNeedEditContext(current,parsed.customerId,parsed.base.id);
 if(!context.customer||parsed.base.id&&!context.need)throw new RuleError('Kunden eller behovet finns inte längre. Ditt privata underlag finns kvar.');
 const actual=context.need,values=actual?{...structuredClone(parsed.values),owner:actual.owner,ownerProfileId:actual.ownerProfileId,responsibilityTransfers:structuredClone(actual.responsibilityTransfers),completedAt:actual.completedAt,dealId:actual.dealId}:structuredClone(parsed.values);
 return createYearNeedDraftEnvelope(current,parsed.customerId,values,parsed.draftId);
}
const ServerYearNeedDraftSchema=DraftInput.extend({kind:z.literal('form'),context:z.literal('year_need'),revision:z.number().int().positive(),archived:z.boolean(),updatedAt:z.string().min(1).max(100)});
export function yearNeedDraftServerVersion(value:unknown,id:string,customerId?:string,needId?:string):DraftRecord|null{
 const record=ServerYearNeedDraftSchema.safeParse(value);if(!record.success||record.data.id!==id)return null;
 const envelope=YearNeedDraftEnvelopeSchema.safeParse(record.data.data);
 if(!envelope.success||envelope.data.draftId!==id||recordBasis(envelope.data)!==recordBasis(record.data.data)||customerId!==undefined&&envelope.data.customerId!==customerId||needId!==undefined&&envelope.data.base.id!==needId)return null;
 return value as DraftRecord;
}
export function yearNeedDraftBusinessValues(value:unknown):Need{
 const raw=YearNeedDraftValuesSchema.parse(value);
 const whole=(text:string,label:string)=>{
  if(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text)))throw new RuleError('Ange '+label+' som ett helt antal, utan decimaler eller annan text.');
  return Number(text);
 };
 return NeedSchema.parse({...raw,leadDays:whole(raw.leadDays,'dagar före kontakt'),intervalMonths:whole(raw.intervalMonths,'månader mellan upprepningar')});
}
export const YearNeedDraftPublicationSchema=z.object({
 customerId:canonicalText(100),need:YearNeedDraftValuesSchema,expectedContext:z.string().min(1).max(3000000),
 draft:z.object({id:z.string().min(1).max(160),revision:z.number().int().positive()}).strict()
}).strict();
export function validateYearNeedDraftConsumption(actionData:unknown,stored:unknown,current:State,draftId:string):Need{
 const envelope=YearNeedDraftEnvelopeSchema.parse(stored),payload=YearNeedDraftPublicationSchema.parse(actionData);
 if(envelope.draftId!==draftId||payload.draft.id!==draftId||payload.customerId!==envelope.customerId)throw new RuleError('Välj rätt privat behovsutkast för den här kunden.');
 if(payload.expectedContext!==envelope.expectedContext)throw new RuleError('Använd utkastets ursprungliga behovsunderlag. Granska och spara en ny privat version först.');
 if(recordBasis(payload.need)!==recordBasis(envelope.values))throw new RuleError('Spara ändringarna privat först. CRM kan bara använda exakt samma behovsuppgifter som den sparade utkastversionen.');
 const customer=current.customers.find(row=>row.id===envelope.customerId);
 if(!customer||envelope.base.id&&!customer.yearNeeds.some(need=>need.id===envelope.base.id))throw new RuleError('Kunden eller behovet finns inte längre. Ditt privata utkast finns kvar.');
 if(yearNeedEditBasis(current,envelope.customerId,envelope.base.id)!==envelope.expectedContext)throw new RuleError('Behovet eller ansvarskopplingen har ändrats. Granska aktuellt underlag innan du sparar i CRM.');
 return yearNeedDraftBusinessValues(payload.need);
}
