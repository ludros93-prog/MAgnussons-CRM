import {z} from 'zod';

// New responsibility text has one bounded encoding in both Zod and the atomic SQL guard.
// Legacy report fields retain their existing schema and are never silently shortened.
const bounded=(value:string)=>!value.includes('\0')&&new TextEncoder().encode(value).length<=4000;
const base=z.string().trim().max(4000),message='Skriv en kortare orsak utan ogiltiga tecken.';
const text=base.refine(bounded,message),required=base.min(1).refine(bounded,message),shortRequired=base.min(1).max(100).refine(bounded,message),digest=z.string().regex(/^[a-f0-9]{64}$/);
export const ProductionIssueResponsibilityReasonSchema=required;
export const ProductionIssueResponsibilityHistorySchema=z.object({
 id:z.string().uuid(),orderId:required,workId:required,revision:z.number().int().positive(),action:z.enum(['assign','transfer']),
 fromUserId:text,fromMemberId:text,fromName:text,toUserId:required,toMemberId:required,toName:required,
 reason:ProductionIssueResponsibilityReasonSchema,at:z.string().datetime().max(4000),byId:required,byMemberId:required,byName:required
}).strict();
// Absence means legacy/current reporter responsibility. An empty object or
// an empty history must never silently erase an explicit current account.
export const ProductionIssueResponsibilitySchema=z.object({userId:required,memberId:required,name:required,history:z.array(ProductionIssueResponsibilityHistorySchema).min(1).max(1000)}).strict();
export const ProductionIssueResponsibilityTransferSchema=z.object({
 orderId:shortRequired,workId:shortRequired,targetMemberId:shortRequired,reason:ProductionIssueResponsibilityReasonSchema,reviewed:z.literal(true),
 expectedContext:z.string().min(1).max(3000000),expectedTarget:digest
}).strict();
export const ProductionIssueResponsibilityReviewSchema=z.object({
 orderId:shortRequired,workId:shortRequired,expectedContext:z.string().min(1).max(3000000),blockedReason:text,
 candidates:z.array(z.object({memberId:shortRequired,name:required,role:z.enum(['admin','seller','production','print','warehouse']),expectedTarget:digest}).strict()).max(1000)
}).strict().refine(review=>new Set(review.candidates.map(candidate=>candidate.memberId)).size===review.candidates.length,'Kontolistan innehåller en oklar kontokoppling.');
export type ProductionIssueResponsibilityHistory=z.infer<typeof ProductionIssueResponsibilityHistorySchema>;
export type ProductionIssueResponsibility=z.infer<typeof ProductionIssueResponsibilitySchema>;
export type ProductionIssueResponsibilityTransfer=z.infer<typeof ProductionIssueResponsibilityTransferSchema>;
export type ProductionIssueResponsibilityReview=z.infer<typeof ProductionIssueResponsibilityReviewSchema>;
export type ProductionIssueResponsibilityCandidate=ProductionIssueResponsibilityReview['candidates'][number];
export type ProductionIssueResponsibilityRole=ProductionIssueResponsibilityCandidate['role'];
