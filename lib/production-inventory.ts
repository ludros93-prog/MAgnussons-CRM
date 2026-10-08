import {z} from 'zod';
import type {State} from './crm';
import {RoleSchema,type Role} from './operations';
import {recordBasis} from './record-conflicts';
import {productionAssignmentBlockedReason} from './production-assignment';

const text=z.string().max(4000),assignmentState=z.enum(['assigned','unassigned','unresolved']);
export const ProductionInventoryAccountSchema=z.object({memberId:text.min(1),name:text,role:RoleSchema,active:z.boolean(),connected:z.boolean(),identityStatus:z.enum(['connected','unconnected','ambiguous'])}).strict();
export const ProductionInventoryRowSchema=z.object({orderId:text.min(1),workId:text,customerName:text,title:text,dueAt:z.string().regex(/^(?:\d{4}-\d{2}-\d{2})?$/),status:z.enum(['submitted','printed','dispatched']),assigneeMemberId:text,assigneeName:text,assignmentState,issueOwnerMemberId:text,issueOwnerName:text,issueOwnerState:z.enum(['assigned','unassigned','unresolved','none']),issue:text,blockedReason:text}).strict().superRefine((row,ctx)=>{
 if(row.status==='dispatched'&&!row.issue)ctx.addIssue({code:'custom',message:'A dispatched inventory row requires a current open issue'});
});
export const ProductionInventoryReviewSchema=z.object({expectedContext:z.string().regex(/^[a-f0-9]{64}$/),accounts:z.array(ProductionInventoryAccountSchema),rows:z.array(ProductionInventoryRowSchema)}).strict();
export type ProductionInventoryAccount=z.infer<typeof ProductionInventoryAccountSchema>;
export type ProductionInventoryRow=z.infer<typeof ProductionInventoryRowSchema>;
export type ProductionInventoryReview=z.infer<typeof ProductionInventoryReviewSchema>;
// Authentication identifiers are accepted only in trusted server context.
// They never form part of the account or row response objects.
export type ProductionInventoryMember={id:string;user_id:string|null;name:string;role:Role;active:number};
const activeJob=(order:State['orders'][number])=>order.production.status==='submitted'||order.production.status==='printed';
// A sent job no longer has current job responsibility, but its unresolved
// issue still blocks the reporter's account change and needs a visible route.
const inventoryWork=(order:State['orders'][number])=>activeJob(order)||order.production.status==='dispatched'&&!!order.production.issue;
const canonicalRows=<T,>(rows:T[])=>rows.map(value=>({value,basis:recordBasis(value)})).sort((a,b)=>a.basis<b.basis?-1:a.basis>b.basis?1:0).map(row=>row.value);

// Shared local-only input lets the UI hide an old inventory immediately after
// a relevant CRM change. It is never returned by the API or rendered as text.
export function productionInventoryInput(st:State):string{
 const orders=st.orders.filter(inventoryWork),orderIds=new Set(orders.map(order=>order.id)),customerIds=new Set(orders.map(order=>order.customerId)),dealIds=new Set(orders.map(order=>order.dealId));
 return recordBasis({
  orders:canonicalRows(orders.map(order=>{const p=order.production;return {id:order.id,customerId:order.customerId,dealId:order.dealId,production:{status:p.status,workId:p.workId,assigneeId:p.assigneeId,assigneeMemberId:p.assigneeMemberId,assigneeName:p.assigneeName,assignmentRevision:p.assignmentRevision,assignmentHistoryLength:p.assignmentHistory.length,issue:p.issue,issueOwnerId:p.issueOwnerId,issueOwnerName:p.issueOwnerName,issueRevision:p.issueRevision,printDeadline:p.printDeadline,dispatchDeadline:p.dispatchDeadline,deliveryDate:p.deliveryDate}}})),
  // Inactive duplicate records also prevent safe navigation/transfer of a job.
  orderIdentities:canonicalRows(st.orders.filter(order=>orderIds.has(order.id)).map(order=>({id:order.id}))),
  customers:canonicalRows(st.customers.filter(customer=>customerIds.has(customer.id)).map(customer=>({id:customer.id,name:customer.name}))),
  deals:canonicalRows(st.deals.filter(deal=>dealIds.has(deal.id)).map(deal=>({id:deal.id,customerId:deal.customerId,title:deal.title})))
 });
}
export async function productionInventoryBasis(st:State):Promise<string>{
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(productionInventoryInput(st)));
 return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
}

export function buildProductionInventory(st:State,members:readonly ProductionInventoryMember[]):Pick<ProductionInventoryReview,'accounts'|'rows'>{
 const byUser=new Map<string,ProductionInventoryMember[]>(),byMember=new Map<string,ProductionInventoryMember[]>();
 for(const account of members){
  byMember.set(account.id,[...(byMember.get(account.id)||[]),account]);
  if(account.user_id)byUser.set(account.user_id,[...(byUser.get(account.user_id)||[]),account]);
 }
 const validIdentity=(account:ProductionInventoryMember)=>!!account.user_id&&account.user_id===account.user_id.trim()&&!!account.id&&account.id===account.id.trim()&&account.id.length<=100&&!!account.name.trim()&&byUser.get(account.user_id)?.length===1&&byMember.get(account.id)?.length===1;
 const accounts:ProductionInventoryAccount[]=members.map(account=>({memberId:account.id,name:account.name,role:account.role,active:account.active===1,connected:!!account.user_id,identityStatus:!account.user_id?'unconnected':validIdentity(account)?'connected':'ambiguous'}));
 const resolve=(userId:string,registeredName:string,registeredMemberId=''):{memberId:string;name:string;state:ProductionInventoryRow['assignmentState']}=>{
  if(!userId)return {memberId:'',name:registeredName,state:registeredName||registeredMemberId?'unresolved':'unassigned'};
  const matches=byUser.get(userId),account=matches?.length===1?matches[0]:undefined;
  if(!account||!validIdentity(account)||(registeredMemberId&&registeredMemberId!==account.id))return {memberId:'',name:registeredName,state:'unresolved'};
  // Inactive accounts retain their recorded work. They are not silently
  // treated as an unassigned queue or replaced by someone with the same name.
  return {memberId:account.id,name:account.name,state:'assigned'};
 };
 const rows:ProductionInventoryRow[]=st.orders.filter(inventoryWork).map(order=>{
  const p=order.production,assignee=resolve(p.assigneeId,p.assigneeName,p.assigneeMemberId),issueOwner=p.issue?resolve(p.issueOwnerId,p.issueOwnerName):{memberId:'',name:'',state:'none' as const};
  const customers=st.customers.filter(customer=>customer.id===order.customerId),deals=st.deals.filter(deal=>deal.id===order.dealId&&deal.customerId===order.customerId);
  return {orderId:order.id,workId:p.workId,customerName:customers.length===1?customers[0].name:'Kundkoppling behöver granskas',title:deals.length===1?deals[0].title:'Arbetsorder',dueAt:(p.status==='submitted'?p.printDeadline:p.dispatchDeadline)||p.deliveryDate,status:p.status as ProductionInventoryRow['status'],assigneeMemberId:assignee.memberId,assigneeName:assignee.name,assignmentState:assignee.state,issueOwnerMemberId:issueOwner.memberId,issueOwnerName:issueOwner.name,issueOwnerState:issueOwner.state,issue:p.issue,blockedReason:activeJob(order)?productionAssignmentBlockedReason(st,order.id,p.workId):''};
 });
 return {accounts,rows};
}
