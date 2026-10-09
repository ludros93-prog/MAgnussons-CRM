import {ProductionIssueResponsibilitySchema} from './production-issue-responsibility-schema';
import { z } from 'zod';
import { LineSchema,AddressSchema,validDate,VariantFields } from './business';
import {CompanyEventResponsibilityHistorySchema} from './company-event-responsibility-schema';
import {CompanyActivityResponsibilityHistorySchema} from './company-activity-responsibility-schema';
const text=z.string().trim().max(4000),required=text.min(1,'Fyll i obligatoriska uppgifter.'),date=validDate;
export const RoleSchema=z.enum(['admin','seller','reader','print','warehouse','production']);
export type Role=z.infer<typeof RoleSchema>;
export const safeUrl=z.string().trim().max(2000).refine(v=>{if(!v)return true;try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}},'Ange en fullständig http- eller https-adress.');
export const ArticleSchema=z.object({id:text.default(''),sourceId:required,sku:required.max(200),name:required.max(300),variant:text.default(''),...VariantFields,url:safeUrl.default(''),price:z.number().finite().min(0).max(1e9).nullable().default(null),cost:z.number().finite().min(0).max(1e9).nullable().default(null),updatedAt:text.default(''),active:z.boolean().default(true)});
export type Article=z.infer<typeof ArticleSchema>;
export const SourceSchema=z.object({id:required,name:required,url:safeUrl,active:z.boolean().default(true)});
export const MovementEntrySchema=z.object({lineId:required,quantity:z.number().finite().positive().max(1e6)});
export const MovementSchema=z.object({id:required,kind:z.enum(['received','printed','dispatched','scrap_unprinted','scrap_printed']),entries:z.array(MovementEntrySchema).min(1).max(100),at:required,by:required,reason:text.default(''),tracking:text.max(500).default(''),recipient:text.max(200).default(''),address:AddressSchema.nullable().default(null),legacy:z.boolean().default(false)});
export const QuantityAdjustmentSchema=z.object({id:required,entries:z.array(MovementEntrySchema).min(1).max(100),reason:required,customerApprovedBy:required,customerApprovedOn:date.refine(Boolean),recordedBy:required,recordedAt:required});
export const ProductionAssignmentHistorySchema=z.object({
 id:z.string().uuid(),orderId:required,workId:text,revision:z.number().int().positive(),action:z.enum(['claim','release','assign','transfer','resolve_legacy']),
 fromUserId:text,fromMemberId:text,fromName:text,toUserId:text,toMemberId:text,toName:text,
 reason:required,at:z.string().datetime(),byId:required,byMemberId:text,byName:required,
 // A preserved older field, not evidence of a verified assignment date.
 legacyAssignedAt:z.string().max(4000).optional()
}).strict().superRefine((row,ctx)=>{
 const hasLegacyAssignedAt=Object.prototype.hasOwnProperty.call(row,'legacyAssignedAt');
 if(row.action==='resolve_legacy'?!hasLegacyAssignedAt||row.legacyAssignedAt===undefined:hasLegacyAssignedAt)ctx.addIssue({code:'custom',message:'Äldre ansvarstid ska bevaras endast vid granskad rättning av äldre jobbansvar.'});
});
export const ProductionAssignmentTransferSchema=z.object({
 orderId:required.max(100),workId:required.max(100),targetMemberId:required.max(100),reason:required,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000),expectedTarget:z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
export const ProductionSchema=z.object({issueResponsibility:ProductionIssueResponsibilitySchema.optional(),assigneeMemberId:text.default(''),assignmentHistory:z.array(ProductionAssignmentHistorySchema).max(1000).default([]),issueRevision:z.number().int().nonnegative().default(0),issueResolutions:z.array(z.object({responsibility:ProductionIssueResponsibilitySchema.optional(),issue:required,reportedAt:text,reportedById:text,reportedBy:text,resolution:required,resolvedAt:required,resolvedById:required,resolvedBy:required})).max(1000).default([]),assigneeId:text.default(''),assigneeName:text.default(''),assignedAt:text.default(''),assignmentRevision:z.number().int().nonnegative().default(0),quantityAdjustments:z.array(QuantityAdjustmentSchema).max(100).default([]),issueOwnerId:text.default(''),issueOwnerName:text.default(''),workId:text.default(''),quantityMode:z.enum(['legacy','lines']).default('legacy'),movements:z.array(MovementSchema).max(1000).default([]),status:z.enum(['draft','submitted','printed','dispatched','cancelled']).default('draft'),lines:z.array(LineSchema).max(100).default([]),instructions:text.default(''),sketchFileId:text.default(''),sketchVersion:text.default(''),printDeadline:date.default(''),dispatchDeadline:date.default(''),deliveryDate:date.default(''),deliveryAddress:AddressSchema.default({}),submittedAt:text.default(''),submittedBy:text.default(''),printedAt:text.default(''),printedBy:text.default(''),dispatchedAt:text.default(''),dispatchedBy:text.default(''),tracking:text.default(''),issue:text.default(''),issueAt:text.default(''),goodsReceived:z.boolean().default(false),goodsReceivedAt:text.default(''),goodsReceivedBy:text.default(''),acceptedAt:text.default(''),acceptedBy:text.default(''),cancellationReason:text.default('')});
export const NoticeSchema=z.object({id:required,customerId:text.default(''),orderId:text.default(''),title:required,body:text.default(''),audience:z.enum(['print','warehouse','seller','team']),owner:text.default(''),at:required,readBy:z.array(text).default([])});
export type Notice=z.infer<typeof NoticeSchema>;
export const LeadContactSchema=z.object({name:required,role:text.default(''),email:z.union([z.literal(''),z.string().email()]).default(''),phone:text.default(''),linkedin:safeUrl.default('')});
export const LeadContactDecisionSchema=z.object({id:required,identity:z.string().min(1).max(5000),revision:z.number().int().positive(),blocked:z.boolean(),reason:required,at:required,byId:required,byName:required});
export const LeadSchema=z.object({id:text.default(''),name:required.max(200),organizationNumber:z.preprocess(v=>v===null?'':v,text.default('')),industry:text.default(''),employees:z.number().int().min(0).max(1e7).nullable().default(null),city:text.default(''),address:text.default(''),latitude:z.number().min(-90).max(90).nullable().default(null),longitude:z.number().min(-180).max(180).nullable().default(null),website:safeUrl.default(''),contacts:z.array(LeadContactSchema).max(30).default([]),source:required,sourceRecordId:text.max(200).default(''),sourceUrl:safeUrl.default(''),checkedAt:date.default(''),customerId:text.default(''),contactHistory:z.array(LeadContactDecisionSchema).max(1000).default([])});
export type Lead=z.infer<typeof LeadSchema>;
// Only an explicitly supplied legal-entity number or a provider's exact record
// ID may share a contact decision. Names, locations and domains are not keys.
// Swedish 12-digit legal-entity identifiers add the fixed prefix 16; do not
// truncate arbitrary numbers or accept VAT numbers as organization numbers.
export function leadOrganizationKey(value:string){const raw=value.trim();if(!/^(?:16)?\d{6}[ -]?\d{4}$/.test(raw))return '';const digits=raw.replace(/[ -]/g,'');return digits.length===12?digits.slice(2):digits;}
export function leadIdentity(l:Lead){const org=leadOrganizationKey(l.organizationNumber);return org?'org:'+org:l.sourceRecordId?'source:'+JSON.stringify([l.source,l.sourceRecordId]):'lead:'+l.id;}
const compareContactDecisions=(a:z.infer<typeof LeadContactDecisionSchema>,b:z.infer<typeof LeadContactDecisionSchema>)=>a.revision-b.revision||a.at.localeCompare(b.at)||a.id.localeCompare(b.id);
export function leadContactHistory(leads:Lead[],lead:Lead){
 const identity=leadIdentity(lead),entries=new Map<string,z.infer<typeof LeadContactDecisionSchema>>();
 for(const row of leads)for(const entry of row.contactHistory)if(row.id===lead.id||leadIdentity(row)===identity||entry.identity===identity)entries.set(entry.id,entry);
 return [...entries.values()].sort(compareContactDecisions);
}
export const leadContactDecision=(leads:Lead[],lead:Lead)=>leadContactHistory(leads,lead).at(-1);
// The list needs one decision for every lead. Index both the row's current
// identity and the identity captured by the decision, preserving source→org
// upgrades and older duplicate rows without scanning all leads for every card.
export function leadContactDecisions(leads:Lead[]){
 type Decision=z.infer<typeof LeadContactDecisionSchema>;
 const current=new Map<string,Decision>(),captured=new Map<string,Decision>();
 const retain=(map:Map<string,Decision>,identity:string,entry:Decision)=>{const old=map.get(identity);if(!old||compareContactDecisions(old,entry)<0)map.set(identity,entry);};
 for(const row of leads){const identity=leadIdentity(row);for(const entry of row.contactHistory){retain(current,identity,entry);retain(captured,entry.identity,entry);}}
 return new Map(leads.map(row=>{const identity=leadIdentity(row),a=current.get(identity),b=captured.get(identity);return [row.id,!a?b:!b?a:compareContactDecisions(a,b)<0?b:a] as const;}));
}
export const CompanyEventSchema=z.object({id:text.default(''),title:required.max(200),date:date.refine(Boolean,'Välj datum.'),endDate:date.default(''),owner:required,ownerProfileId:z.union([z.literal(''),z.string().uuid()]).default(''),responsibilityTransfers:z.array(CompanyActivityResponsibilityHistorySchema).max(1000).default([]),category:z.enum(['event','campaign','internal','holiday']).default('event'),notes:text.default(''),status:z.enum(['planned','done','cancelled']).default('planned'),checklist:z.array(z.object({id:required,title:required,owner:required,ownerProfileId:z.union([z.literal(''),z.string().uuid()]).default(''),responsibilityTransfers:z.array(CompanyEventResponsibilityHistorySchema).max(1000).default([]),due:date.refine(Boolean),done:z.boolean().default(false)})).max(50).default([])});
export type CompanyEvent=z.infer<typeof CompanyEventSchema>;
export function distanceKm(a:number,b:number,c:number,d:number){const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))}
export const operations=new Set(['production_issue_responsibility_transfer','production_assignment_transfer','production_assignment_legacy_resolve','production_claim','production_release','prepare_order','receipt_confirm','receipt_issue','article','article_import','catalog_order','production_submit','production_accept','production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed','production_issue','production_issue_resolve','direct_dispatch','production_cancel','order_shortfall','order_amend','order_amend_accept','order_amend_discard','notice_read','lead_import','lead_convert','lead_contact','company_event']);
export const roleActions:Record<Role,Set<string>|null>={admin:null,seller:new Set(['prepare_order','receipt_confirm','receipt_issue','customer','deal','order','task','meeting','note','customer_note','follow_up','prospecting','qualify','onboarding','plan','year_need','complete_need','need_deal','products','repeat_order','catalog_order','production_submit','production_issue','production_issue_resolve','direct_dispatch','production_cancel','order_shortfall','order_amend','order_amend_accept','order_amend_discard','notice_read','lead_convert','lead_contact','company_event']),reader:new Set(),production:new Set(['production_claim','production_release','production_accept','production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed','production_issue','production_issue_resolve','notice_read']),print:new Set(['production_claim','production_release','production_accept','production_printed','production_scrap_printed','production_issue','production_issue_resolve','notice_read']),warehouse:new Set(['production_claim','production_release','production_received','production_dispatched','production_scrap_unprinted','production_issue','production_issue_resolve','notice_read'])};

export const isDepartmentRole=(role:string|undefined)=>['print','warehouse','production'].includes(role||'');
export const receivesNotice=(role:Role,audience:string,owner:string,noticeOwner:string)=>role==='admin'||audience==='team'||(role==='production'&&['print','warehouse'].includes(audience))||(role===audience&&(role!=='seller'||owner===noticeOwner));
