import {z} from 'zod';
import {RoleSchema,roleActions,type Role} from './operations';

const text=z.string().max(4000),digest=z.string().regex(/^[a-f0-9]{64}$/);
export const AccountReviewEnvelopeSchema=z.object({memberId:text.min(1).max(100),expectedAccount:digest,expectedContext:digest,confirmed:z.literal(true)}).strict();
export type AccountReviewEnvelope=z.infer<typeof AccountReviewEnvelopeSchema>;
export const AccountChangeRequestedSchema=z.object({role:RoleSchema,active:z.boolean()}).strict();
export type AccountChangeRequested=z.infer<typeof AccountChangeRequestedSchema>;
export const AccountChangeReviewSchema=z.object({expectedContext:digest,expectedAccount:digest,target:z.object({memberId:text.min(1).max(100),name:text,role:RoleSchema,active:z.boolean()}).strict(),requested:AccountChangeRequestedSchema,workspaces:z.array(z.object({id:text.min(1),jobCount:z.number().int().nonnegative(),issueCount:z.number().int().nonnegative(),unresolvedCount:z.number().int().nonnegative()}).strict()),blocked:z.boolean(),reason:text}).strict();
export type AccountChangeReview=z.infer<typeof AccountChangeReviewSchema>;
type AccountRole={role:Role;active:boolean|number};
const jobOperations=['production_claim','production_release','production_accept','production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed'];
const issueOperations=['production_issue','production_issue_resolve'];
const permits=(role:Role,operation:string)=>roleActions[role]===null||roleActions[role]!.has(operation);
export function accountChangeLoss(target:AccountRole,requested:AccountChangeRequested){
 if(target.active!==true&&target.active!==1)return {jobs:false,issues:false};
 if(!requested.active)return {jobs:true,issues:true};
 const lost=(operations:string[])=>operations.some(operation=>permits(target.role,operation)&&!permits(requested.role,operation));
 return {jobs:lost(jobOperations),issues:lost(issueOperations)};
}
export const accountChangeNeedsReview=(target:AccountRole,requested:AccountChangeRequested)=>{const loss=accountChangeLoss(target,requested);return loss.jobs||loss.issues;};
