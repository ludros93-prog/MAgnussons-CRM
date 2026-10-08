import {z} from 'zod';

export const ACCOUNT_CHANGE_WORK_PAGE_SIZE=20;
const text=z.string().max(4000),integer=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const AccountChangeWorkReasonSchema=z.enum(['account_responsibility','name_only','member_without_user','no_account','mismatched_member','ambiguous_account']);
export type AccountChangeWorkReason=z.infer<typeof AccountChangeWorkReasonSchema>;
export const AccountChangeWorkRowSchema=z.object({spaceId:text.min(1),orderId:text.min(1),workId:text,status:z.enum(['draft','submitted','printed','dispatched','cancelled']),kind:z.enum(['job','issue']),reason:AccountChangeWorkReasonSchema}).strict().superRefine((row,ctx)=>{
 if(row.kind==='job'&&!['submitted','printed'].includes(row.status)||row.kind==='issue'&&row.reason==='member_without_user')ctx.addIssue({code:'custom',message:'Invalid current responsibility part'});
});
export type AccountChangeWorkRow=z.infer<typeof AccountChangeWorkRowSchema>;
export const AccountChangeWorkSchema=z.object({expectedContext:z.string().regex(/^[a-f0-9]{64}$/),total:integer,offset:integer,nextOffset:integer.nullable(),rows:z.array(AccountChangeWorkRowSchema).max(ACCOUNT_CHANGE_WORK_PAGE_SIZE)}).strict().superRefine((page,ctx)=>{
 const expectedLength=Math.min(ACCOUNT_CHANGE_WORK_PAGE_SIZE,Math.max(0,page.total-page.offset));
 const nextOffset=page.offset+page.rows.length<page.total?page.offset+page.rows.length:null;
 if(page.offset>page.total||page.rows.length!==expectedLength||page.nextOffset!==nextOffset)ctx.addIssue({code:'custom',message:'Invalid account work page bounds'});
 if(new Set(page.rows.map(row=>JSON.stringify([row.spaceId,row.orderId,row.kind]))).size!==page.rows.length)ctx.addIssue({code:'custom',message:'Duplicate account work responsibility'});
});
export type AccountChangeWork=z.infer<typeof AccountChangeWorkSchema>;
