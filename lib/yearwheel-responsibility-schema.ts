import {z} from 'zod';

const profileId=z.string().uuid(),recordedProfileId=z.union([z.literal(''),profileId]);
const required=z.string().trim().min(1).max(4000),recordId=required.max(100),ownerName=required.max(150);
export const YearwheelResponsibilityHistorySchema=z.object({
 id:profileId,customerId:recordId,needId:recordId,action:z.enum(['anchor','transfer']),
 fromRecordedProfileId:recordedProfileId,fromProfileId:profileId,toProfileId:profileId,
 fromOwner:ownerName,toOwner:ownerName,fromDisplayName:ownerName,toDisplayName:ownerName,
 selectedTaskIds:z.array(recordId).max(500),reason:required,at:z.string().datetime(),byId:required,byMemberId:required,byName:required
}).strict();
export const YearwheelResponsibilityTransferSchema=z.object({
 customerId:recordId,needId:recordId,targetProfileId:profileId,selectedTaskIds:z.array(recordId).max(500).default([]),
 reason:required,reviewed:z.literal(true),expectedContext:z.string().min(1).max(3000000)
}).strict();
export type YearwheelResponsibilityHistory=z.infer<typeof YearwheelResponsibilityHistorySchema>;
export type YearwheelResponsibilityTransfer=z.infer<typeof YearwheelResponsibilityTransferSchema>;
