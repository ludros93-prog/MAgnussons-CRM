import {database} from './crm-db';
import {normalizeState,emptyState,seedState,type State} from './crm';
import {ensureReceiptTasks} from './order-work';
export type MutationResult={customerId?:string;dealId?:string;orderId?:string;taskId?:string;eventId?:string};
export type MutationMeta={result:MutationResult;userId:string;hash:string;restoreEmpty?:boolean};
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
 const draftGate=draft?' AND EXISTS(SELECT 1 FROM crm_drafts WHERE space=? AND user_id=? AND id=? AND revision=? AND archived=0)':'';const q=[db().prepare('UPDATE crm_spaces SET version=version+1,write_token=?,settings=? WHERE id=? AND version=?'+draftGate+restoreGate).bind(token,JSON.stringify(next.settings),space,prev.version,...(draft?[space,draft.userId,draft.id,draft.revision]:[]),...(mutation.restoreEmpty?[space,space]:[]))];
 for(const n of names)for(const item of next[n]){
  if(prev[n].some(old=>old.id===item.id&&JSON.stringify(old)===JSON.stringify(item)))continue;
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
 if(type==='lead_convert')result.customerId=after.leads.find(l=>l.id===data.id)?.customerId||result.customerId;
 return result;
}
export async function requestHash(type:string,data:unknown){const bytes=new TextEncoder().encode(JSON.stringify({type,data}));const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
