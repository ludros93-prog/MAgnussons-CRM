import {database} from './crm-db';
import {normalizeState,emptyState,seedState,type State,type Actor} from './crm';
import {ensureReceiptTasks} from './order-work';
export type MutationResult={customerId?:string;dealId?:string;orderId?:string;taskId?:string;eventId?:string};
export type CustomerAnchorAuthorization={actorMemberId:string;actorUserId:string;actorName:string;targetMemberId:string;targetUserId:string;targetEmail:string;targetName:string;targetOwner:string;targetRole:'admin'|'seller'};
export type CommercialAnchorAuthorization=CustomerAnchorAuthorization;
export type OrderAnchorRecord={id:string;customerId:string;dealId:string;owner:string;rawData:string};
export type TaskAnchorRecord=OrderAnchorRecord&{kind:string};
export type MutationMeta={result:MutationResult;userId:string;hash:string;restoreEmpty?:boolean;actorAuthorization?:{memberId:string;userId:string;role:Actor['role'];owner:string};customerAnchorAuthorization?:CustomerAnchorAuthorization;commercialAnchorAuthorization?:CommercialAnchorAuthorization;orderAnchorRecord?:OrderAnchorRecord;taskAnchorRecord?:TaskAnchorRecord;productionAssignmentAuthorization?:{actorMemberId:string;actorUserId:string;actorName:string;targetMemberId:string;targetUserId:string;targetName:string;targetRole:'admin'|'seller'|'production'|'print'|'warehouse'};sellerProfileAuthorization?:{actorMemberId:string;actorUserId:string;issueInitialActorRole?:'admin'|'seller';yearwheelInitialActorRole?:'admin'|'seller';companyEventInitialActorRole?:'admin'|'seller';links:{id:string;owner:string}[]}};
export type StoredFile={id:string;customerId:string;objectKey:string;metadata:Record<string,unknown>};
export const names=['customers','deals','orders','tasks','meetings','events','articles','notices','leads','companyEvents'] as const;
export const tables={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const db=database;
export async function load(space:string):Promise<State>{
 const r=await db().batch([db().prepare('SELECT version,settings FROM crm_spaces WHERE id=?').bind(space),...names.map(n=>db().prepare(`SELECT data FROM ${tables[n]} WHERE space=?`).bind(space))]);
 const meta=r[0].results[0] as {version:number;settings:string}|undefined;if(!meta)return emptyState();
 const state=emptyState();state.version=meta.version;state.settings=JSON.parse(meta.settings);names.forEach((n,i)=>{(state[n] as unknown[])=r[i+1].results.map(x=>JSON.parse((x as {data:string}).data))});return normalizeState(state);
}
export async function commit(space:string,prev:State,next:State,requestId:string,draft?:{id:string;revision:number;userId:string},mutation:MutationMeta={result:{},userId:"",hash:""},files:StoredFile[]=[]){
 const token=crypto.randomUUID(),gate='EXISTS(SELECT 1 FROM crm_spaces WHERE id=? AND write_token=?)';
 const restoreGate=mutation.restoreEmpty?' AND NOT EXISTS(SELECT 1 FROM crm_files WHERE space=?) AND NOT EXISTS(SELECT 1 FROM crm_drafts WHERE space=? AND archived=0)':'';
 const actor=mutation.actorAuthorization;
 // The server-read identity and role must still hold when the transaction
 // writes. The same token gates every CRM row, event, draft and receipt below.
 const actorGate=actor?' AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND role=? AND owner=? AND active=1)':'';
 const authorization=mutation.sellerProfileAuthorization;
 // Only validated first issue/yearwheel/activity or preparation assignments use the ordinary seller role.
 // Existing responsibility/profile actions retain the default admin gate.
 const initialActorRole=authorization?.issueInitialActorRole||authorization?.yearwheelInitialActorRole||authorization?.companyEventInitialActorRole,profileActorRole=initialActorRole||'admin';
 if([authorization?.issueInitialActorRole,authorization?.yearwheelInitialActorRole,authorization?.companyEventInitialActorRole].filter(Boolean).length>1)return false;
 if(initialActorRole&&(!actor||!['admin','seller'].includes(profileActorRole)||actor.role!==profileActorRole||actor.memberId!==authorization.actorMemberId||actor.userId!==authorization.actorUserId))return false;
 const profileGate=authorization?" AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND role=? AND active=1)"+authorization.links.map(()=>" AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND owner=? AND role IN ('admin','seller') AND active=1)").join(''):'';
 const productionAuthorization=mutation.productionAssignmentAuthorization;
 if(productionAuthorization&&(!actor||actor.role!=='admin'||actor.memberId!==productionAuthorization.actorMemberId||actor.userId!==productionAuthorization.actorUserId))return false;
 // The reviewed target and the audit actor must still be the exact accounts
 // at the atomic write. No competing member may carry the same target user ID.
 const productionGate=productionAuthorization?" AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND name=? AND role='admin' AND active=1) AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND name=? AND role=? AND active=1) AND NOT EXISTS(SELECT 1 FROM crm_members WHERE user_id=? AND id<>?)":'';
 if(mutation.customerAnchorAuthorization&&mutation.commercialAnchorAuthorization)return false;
 const anchor=mutation.customerAnchorAuthorization||mutation.commercialAnchorAuthorization;
 if(anchor&&(!actor||actor.role!=='admin'||actor.memberId!==anchor.actorMemberId||actor.userId!==anchor.actorUserId))return false;
 // The account reviewed for a neutral customer, deal or order anchor includes its private
 // user binding. All audit snapshots and uniqueness must hold in this CAS,
 // rather than a weaker profile-name lookup performed before the write.
 const anchorGate=anchor?" AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND name=? AND role='admin' AND active=1) AND NOT EXISTS(SELECT 1 FROM crm_members WHERE user_id=? AND id<>?) AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND email=? AND name=? AND owner=? AND role=? AND active=1) AND NOT EXISTS(SELECT 1 FROM crm_members WHERE user_id=? AND id<>?)":'';
 const orderAnchor=mutation.orderAnchorRecord,taskAnchor=mutation.taskAnchorRecord;
 if(orderAnchor&&taskAnchor)return false;
 if(orderAnchor){
  // Only the dedicated neutral order operation may use the raw patch. It
  // cannot smuggle another row, draft, profile or settings change into it.
  if(!mutation.commercialAnchorAuthorization||mutation.customerAnchorAuthorization||authorization||productionAuthorization||mutation.restoreEmpty||draft||files.length)return false;
  const previous=prev.orders.filter(row=>row.id===orderAnchor.id),updated=next.orders.filter(row=>row.id===orderAnchor.id),old=previous[0],target=updated[0],audit=target?.responsibilityTransfers[0],addedEvent=next.events[0];
  if(previous.length!==1||updated.length!==1||next.orders.length!==prev.orders.length||!old||!target||old.ownerProfileId||old.responsibilityTransfers.length||!target.ownerProfileId||target.responsibilityTransfers.length!==1||!audit||!('action' in audit)||audit.action!=='anchor'||audit.targetType!=='order')return false;
  if(orderAnchor.customerId!==old.customerId||orderAnchor.dealId!==old.dealId||orderAnchor.owner!==old.owner||!orderAnchor.rawData||audit.targetId!==old.id||audit.customerId!==old.customerId||audit.dealId!==old.dealId||audit.fromProfileId!==target.ownerProfileId||audit.toProfileId!==target.ownerProfileId||audit.fromOwner!==old.owner||audit.toOwner!==old.owner||audit.targetMemberId!==anchor!.targetMemberId||audit.targetUserId!==anchor!.targetUserId||audit.targetName!==anchor!.targetName||audit.targetRole!==anchor!.targetRole||audit.byId!==anchor!.actorUserId||audit.byMemberId!==anchor!.actorMemberId||audit.byName!==anchor!.actorName)return false;
  if(JSON.stringify(target)!==JSON.stringify({...old,ownerProfileId:target.ownerProfileId,responsibilityTransfers:target.responsibilityTransfers})||JSON.stringify(next.orders.filter(row=>row.id!==old.id))!==JSON.stringify(prev.orders.filter(row=>row.id!==old.id))||JSON.stringify(next.settings)!==JSON.stringify(prev.settings))return false;
  if(next.events.length!==prev.events.length+1||!addedEvent||addedEvent.kind!=='order_responsibility_anchor'||addedEvent.customerId!==old.customerId||addedEvent.dealId!==old.dealId||addedEvent.actor?.id!==anchor!.actorUserId||addedEvent.actor?.name!==anchor!.actorName||JSON.stringify(next.events.slice(1))!==JSON.stringify(prev.events))return false;
  for(const name of names)if(name!=='orders'&&name!=='events'&&JSON.stringify(next[name])!==JSON.stringify(prev[name]))return false;
 }
 if(taskAnchor){
  if(!mutation.commercialAnchorAuthorization||mutation.customerAnchorAuthorization||authorization||productionAuthorization||mutation.restoreEmpty||draft||files.length)return false;
  const previous=prev.tasks.filter(row=>row.id===taskAnchor.id),updated=next.tasks.filter(row=>row.id===taskAnchor.id),old=previous[0],target=updated[0],audit=target?.responsibilityTransfers[0],addedEvent=next.events[0];
  if(previous.length!==1||updated.length!==1||next.tasks.length!==prev.tasks.length||!old||!target||old.done||old.doneAt||old.ownerProfileId||old.responsibilityTransfers.length||!target.ownerProfileId||target.responsibilityTransfers.length!==1||audit?.source!=='commercial_task'||audit.action!=='anchor')return false;
  if(taskAnchor.customerId!==old.customerId||taskAnchor.dealId!==old.dealId||taskAnchor.owner!==old.owner||taskAnchor.kind!==old.kind||!taskAnchor.rawData||audit.taskId!==old.id||audit.customerId!==old.customerId||audit.dealId!==old.dealId||audit.fromProfileId!==target.ownerProfileId||audit.toProfileId!==target.ownerProfileId||audit.fromOwner!==old.owner||audit.toOwner!==old.owner||audit.targetMemberId!==anchor!.targetMemberId||audit.targetUserId!==anchor!.targetUserId||audit.targetName!==anchor!.targetName||audit.targetRole!==anchor!.targetRole||audit.byId!==anchor!.actorUserId||audit.byMemberId!==anchor!.actorMemberId||audit.byName!==anchor!.actorName)return false;
  if(JSON.stringify(target)!==JSON.stringify({...old,ownerProfileId:target.ownerProfileId,responsibilityTransfers:target.responsibilityTransfers})||JSON.stringify(next.tasks.filter(row=>row.id!==old.id))!==JSON.stringify(prev.tasks.filter(row=>row.id!==old.id))||JSON.stringify(next.settings)!==JSON.stringify(prev.settings))return false;
  if(next.events.length!==prev.events.length+1||!addedEvent||addedEvent.kind!=='commercial_task_responsibility_anchor'||addedEvent.customerId!==old.customerId||addedEvent.dealId!==old.dealId||addedEvent.actor?.id!==anchor!.actorUserId||addedEvent.actor?.name!==anchor!.actorName||JSON.stringify(next.events.slice(1))!==JSON.stringify(prev.events))return false;
  for(const name of names)if(name!=='tasks'&&name!=='events'&&JSON.stringify(next[name])!==JSON.stringify(prev[name]))return false;
 }
 // Freeze the raw target as well as its normalized review. Index/body
 // consistency and decoded duplicate-key checks share the FIRST CAS gate;
 // malformed concurrent JSON cannot let an event/receipt commit alone.
 const orderAnchorGate=orderAnchor?" AND EXISTS(SELECT 1 FROM crm_orders AS anchor_order WHERE space=? AND id=? AND customer_id=? AND deal_id=? AND data=? AND CASE WHEN json_valid(anchor_order.data) THEN json_type(anchor_order.data)='object' AND json_extract(anchor_order.data,'$.id')=anchor_order.id AND json_extract(anchor_order.data,'$.customerId')=anchor_order.customer_id AND json_extract(anchor_order.data,'$.dealId')=anchor_order.deal_id AND json_extract(anchor_order.data,'$.owner')=? AND NOT EXISTS(SELECT 1 FROM json_each(anchor_order.data) GROUP BY key HAVING COUNT(*)>1) ELSE 0 END)":'';
 const taskAnchorGate=taskAnchor?" AND EXISTS(SELECT 1 FROM crm_tasks AS anchor_task WHERE space=? AND id=? AND customer_id=? AND data=? AND CASE WHEN json_valid(anchor_task.data) THEN json_type(anchor_task.data)='object' AND json_extract(anchor_task.data,'$.id')=anchor_task.id AND json_extract(anchor_task.data,'$.customerId')=anchor_task.customer_id AND json_extract(anchor_task.data,'$.dealId')=? AND json_extract(anchor_task.data,'$.owner')=? AND CASE WHEN json_type(anchor_task.data,'$.kind') IS NULL THEN 'manual' ELSE json_extract(anchor_task.data,'$.kind') END=? AND NOT EXISTS(SELECT 1 FROM json_each(anchor_task.data) GROUP BY key HAVING COUNT(*)>1) ELSE 0 END)":'';
 const rawAnchor=!!(orderAnchor||taskAnchor);
 const draftGate=draft?' AND EXISTS(SELECT 1 FROM crm_drafts WHERE space=? AND user_id=? AND id=? AND revision=? AND archived=0)':'';const q=[db().prepare('UPDATE crm_spaces SET version=version+1,write_token=?'+(rawAnchor?'':',settings=?')+' WHERE id=? AND version=?'+draftGate+restoreGate+actorGate+profileGate+productionGate+anchorGate+orderAnchorGate+taskAnchorGate).bind(token,...(rawAnchor?[]:[JSON.stringify(next.settings)]),space,prev.version,...(draft?[space,draft.userId,draft.id,draft.revision]:[]),...(mutation.restoreEmpty?[space,space]:[]),...(actor?[actor.memberId,actor.userId,actor.role,actor.owner]:[]),...(authorization?[authorization.actorMemberId,authorization.actorUserId,profileActorRole,...authorization.links.flatMap(link=>[link.id,link.owner])]:[]),...(productionAuthorization?[productionAuthorization.actorMemberId,productionAuthorization.actorUserId,productionAuthorization.actorName,productionAuthorization.targetMemberId,productionAuthorization.targetUserId,productionAuthorization.targetName,productionAuthorization.targetRole,productionAuthorization.targetUserId,productionAuthorization.targetMemberId]:[]),...(anchor?[anchor.actorMemberId,anchor.actorUserId,anchor.actorName,anchor.actorUserId,anchor.actorMemberId,anchor.targetMemberId,anchor.targetUserId,anchor.targetEmail,anchor.targetName,anchor.targetOwner,anchor.targetRole,anchor.targetUserId,anchor.targetMemberId]:[]),...(orderAnchor?[space,orderAnchor.id,orderAnchor.customerId,orderAnchor.dealId,orderAnchor.rawData,orderAnchor.owner]:[]),...(taskAnchor?[space,taskAnchor.id,taskAnchor.customerId,taskAnchor.rawData,taskAnchor.dealId,taskAnchor.owner,taskAnchor.kind]:[]))];
 for(const n of names)for(const item of next[n]){
  if(prev[n].some(old=>old.id===item.id&&JSON.stringify(old)===JSON.stringify(item)))continue;
  if(orderAnchor&&n==='orders'&&item.id===orderAnchor.id){
   const order=item as State['orders'][number];
   // Preserve absence, defaults, invoice attribution and unknown legacy fields
   // in the saved order. Normalized reading is not a metadata migration.
   q.push(db().prepare("UPDATE crm_orders SET data=json_set(data,'$.ownerProfileId',?,'$.responsibilityTransfers',json(?)) WHERE space=? AND id=? AND "+gate).bind(order.ownerProfileId,JSON.stringify(order.responsibilityTransfers),space,order.id,space,token));
   continue;
  }
  if(taskAnchor&&n==='tasks'&&item.id===taskAnchor.id){
   const task=item as State['tasks'][number];
   q.push(db().prepare("UPDATE crm_tasks SET data=json_set(data,'$.ownerProfileId',?,'$.responsibilityTransfers',json(?)) WHERE space=? AND id=? AND "+gate).bind(task.ownerProfileId,JSON.stringify(task.responsibilityTransfers),space,task.id,space,token));
   continue;
  }
  const row=item as unknown as {id:string;customerId:string;dealId:string};const cols=['space','id',...(['customers','articles','notices','leads','companyEvents'].includes(n)?[]:['customer_id']),...(n==='orders'?['deal_id']:[]),'data'];const vals=[space,row.id,...(['customers','articles','notices','leads','companyEvents'].includes(n)?[]:[row.customerId]),...(n==='orders'?[row.dealId]:[]),JSON.stringify(item)];
  q.push(db().prepare(`INSERT INTO ${tables[n]} (${cols.join(',')}) SELECT ${cols.map(()=>'?').join(',')} WHERE ${gate} ON CONFLICT(space,id) DO UPDATE SET ${cols.filter(c=>!['space','id'].includes(c)).map(c=>c+'=excluded.'+c).join(',')}`).bind(...vals,space,token));
 }
 if(draft)q.push(db().prepare('UPDATE crm_drafts SET archived=1,revision=revision+1,updated_at=? WHERE space=? AND user_id=? AND id=? AND revision=? AND '+gate).bind(new Date().toISOString(),space,draft.userId,draft.id,draft.revision,space,token));
 for(const f of files)q.push(db().prepare(`INSERT INTO crm_files(id,space,customer_id,object_key,data) SELECT ?,?,?,?,? WHERE ${gate}`).bind(f.id,space,f.customerId,f.objectKey,JSON.stringify(f.metadata),space,token));
 q.push(db().prepare(`INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) SELECT ?,?,?,?,? WHERE ${gate}`).bind(space,requestId,JSON.stringify(mutation.result),mutation.userId,mutation.hash,space,token));
 const result=await db().batch(q);return result[0].meta.changes===1;
}

export function projectState(raw:State,space:string){return ensureReceiptTasks(space==='demo'&&raw.version===0&&!raw.customers.length?seedState():structuredClone(raw));}
export async function initialize(space:string){await db().prepare('INSERT OR IGNORE INTO crm_spaces(id,version,write_token,settings) VALUES(?,0,?,?)').bind(space,'',JSON.stringify(emptyState().settings)).run();}
export function mutationResult(before:State,after:State,type:string,data:any):MutationResult{
 const added=(name:'customers'|'deals'|'orders'|'tasks'|'events')=>after[name].find(row=>!before[name].some(old=>old.id===row.id))?.id;
 const result:MutationResult={customerId:added('customers'),dealId:added('deals'),orderId:added('orders'),taskId:added('tasks'),eventId:added('events')};
 if(type==='commercial_task_responsibility_anchor'){const task=after.tasks.find(row=>row.id===data.taskId);result.taskId=task?.id;result.customerId=task?.customerId;result.dealId=task?.dealId;}
 if(type==='lead_convert')result.customerId=after.leads.find(l=>l.id===data.id)?.customerId||result.customerId;
 return result;
}
export async function requestHash(type:string,data:unknown){const bytes=new TextEncoder().encode(JSON.stringify({type,data}));const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
