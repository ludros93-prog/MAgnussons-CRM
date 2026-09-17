import {z} from 'zod';
export const DraftKind=z.enum(['catalog','production','note','followup','form']);
export const DraftPayload=z.record(z.unknown());
export const DraftInput=z.object({id:z.string().min(1).max(160),kind:DraftKind,context:z.string().max(100).default(''),revision:z.number().int().nonnegative(),requestId:z.string().uuid(),title:z.string().max(200),data:DraftPayload,archived:z.boolean().default(false)});
export type DraftRecord={id:string;kind:z.infer<typeof DraftKind>;context:string;revision:number;requestId:string;title:string;data:Record<string,any>;archived:boolean;updatedAt:string};
