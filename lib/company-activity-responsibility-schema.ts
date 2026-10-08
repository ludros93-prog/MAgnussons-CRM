import {z} from 'zod';

const profileId=z.string().uuid(),recordedProfileId=z.union([z.literal(''),profileId]);
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const CompanyActivityResponsibilityHistorySchema=z.object({
 id:profileId,eventId:recordId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const CompanyActivityResponsibilityTransferSchema=z.object({
 eventId:recordId,targetProfileId:profileId,reason:required,
 reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type CompanyActivityResponsibilityHistory=z.infer<typeof CompanyActivityResponsibilityHistorySchema>;
export type CompanyActivityResponsibilityTransfer=z.infer<typeof CompanyActivityResponsibilityTransferSchema>;
