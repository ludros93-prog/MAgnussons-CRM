import {z} from 'zod';
import {ArticleSchema,type Article} from './operations';
import {recordBasis} from './record-conflicts';
import {RuleError} from './crm-errors';
import {DraftInput,type DraftRecord} from './drafts';

// Keep unfinished values exactly as entered. Required business fields, safe
// URLs and nonnegative prices are checked only on explicit CRM publication.
export const ArticleDraftValuesSchema=z.object({
 id:z.string().max(4000),sourceId:z.string().max(4000),
 sku:z.string().max(200),name:z.string().max(300),variant:z.string().max(4000),
 variantId:z.string().max(200),color:z.string().max(200),size:z.string().max(100),
 unit:z.string().max(30),url:z.string().max(2000),
 price:z.number().finite().nullable(),cost:z.number().finite().nullable(),
 updatedAt:z.string().max(4000),active:z.boolean()
}).strict();
export type ArticleDraftValues=z.infer<typeof ArticleDraftValuesSchema>;
export const ArticleDraftEnvelopeSchema=z.object({
 draftId:z.string().min(1).max(160),type:z.literal('article'),
 data:ArticleDraftValuesSchema,base:ArticleSchema.strict(),
 expectedRecord:z.string().min(1).max(3000000),initialData:z.string().min(1).max(3000000)
}).strict().superRefine((envelope,ctx)=>{
 const basis=recordBasis(envelope.base);
 if(envelope.expectedRecord!==basis)ctx.addIssue({code:z.ZodIssueCode.custom,path:['expectedRecord'],message:'Utkastet ska behålla det ursprungliga artikelunderlaget.'});
 if(envelope.initialData!==basis)ctx.addIssue({code:z.ZodIssueCode.custom,path:['initialData'],message:'Utkastets ursprungliga artikeluppgifter stämmer inte.'});
 if(envelope.data.id!==envelope.base.id)ctx.addIssue({code:z.ZodIssueCode.custom,path:['data','id'],message:'Utkastet får inte byta artikel.'});
});
export type ArticleDraftEnvelope=z.infer<typeof ArticleDraftEnvelopeSchema>;
export const isArticleDraft=(kind:string,context:string)=>kind==='form'&&context==='article';

const ServerArticleDraftSchema=DraftInput.extend({kind:z.literal('form'),context:z.literal('article'),revision:z.number().int().positive(),archived:z.boolean(),updatedAt:z.string().min(1).max(100)});
// A comparison may contain an old or malformed record. Keep its raw data for
// reading/copying, but never select a normalized or differently linked version.
export function articleDraftServerVersion(value:unknown,id:string,articleId?:string):DraftRecord|null{
 const record=ServerArticleDraftSchema.safeParse(value);if(!record.success||record.data.id!==id)return null;
 const envelope=ArticleDraftEnvelopeSchema.safeParse(record.data.data);
 if(!envelope.success||envelope.data.draftId!==id||recordBasis(envelope.data)!==recordBasis(record.data.data)||articleId!==undefined&&envelope.data.base.id!==articleId)return null;
 return value as DraftRecord;
}

export function validateArticleDraftConsumption(actionData:unknown,stored:unknown,expectedRecord:string|undefined,currentArticles:Article[],draftId:string){
 const envelope=ArticleDraftEnvelopeSchema.parse(stored),payload=z.record(z.unknown()).parse(actionData);
 const {draft,...rawValues}=payload,values=ArticleDraftValuesSchema.parse(rawValues);
 const reference=z.object({id:z.string().min(1).max(160),revision:z.number().int().positive()}).strict().parse(draft);
 if(envelope.draftId!==draftId||reference.id!==draftId)throw new RuleError('Välj rätt privat artikelutkast innan du sparar i CRM.');
 if(expectedRecord!==envelope.expectedRecord)throw new RuleError('Använd utkastets ursprungliga artikelunderlag. Granska aktuell artikel och spara den valda versionen privat först.');
 if(recordBasis(values)!==recordBasis(envelope.data))throw new RuleError('Spara dina ändringar i det privata utkastet först. CRM kan bara använda exakt samma artikeluppgifter som den sparade utkastversionen.');
 if(values.id){
  const current=currentArticles.find(article=>article.id===values.id);
  if(!current)throw new RuleError('Artikeln finns inte längre i arbetsytan. Ditt privata utkast finns kvar.');
  if(recordBasis(current)!==envelope.expectedRecord)throw new RuleError('Artikeln har ändrats. Granska aktuellt artikelunderlag innan du sparar i CRM.');
 }else{
  // The existing article/import action deliberately upserts a natural key.
  // A private "new article" must not silently replace a colleague's article.
  const candidate=ArticleSchema.parse(values);
  const matches=currentArticles.some(article=>article.sourceId===candidate.sourceId&&article.sku===candidate.sku&&article.variant===candidate.variant&&article.variantId===candidate.variantId&&article.color===candidate.color&&article.size===candidate.size);
  if(matches)throw new RuleError('Artikel och variant finns redan i denna källa. Ditt privata utkast finns kvar. Öppna och granska den registrerade artikeln innan du ändrar den.');
 }
}
