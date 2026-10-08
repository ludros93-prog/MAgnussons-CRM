import {database} from './crm-db';
import type {Member} from './crm-auth';
import {recordBasis} from './record-conflicts';
import {AccountChangeReviewSchema,accountChangeLoss,type AccountChangeRequested,type AccountChangeReview} from './account-change-review-schema';
export * from './account-change-review-schema';

export type AccountChangeTarget=Pick<Member,'id'|'email'|'user_id'|'name'|'role'|'owner'|'active'>;
const hash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recordBasis(value)))),byte=>byte.toString(16).padStart(2,'0')).join('');
export const accountExpectedBasis=(target:AccountChangeTarget)=>hash({id:target.id,email:target.email,user_id:target.user_id,name:target.name,role:target.role,owner:target.owner,active:target.active});

type DirectoryMember=Pick<Member,'id'|'user_id'>;
type StoredOrder={space:string;id:string;data:string};
export type AccountChangeInput={spaces:{id:string}[];orders:StoredOrder[];members:AccountChangeTarget[]};
// These reads share one D1 batch snapshot. Never initialize a space or project
// demo seed data: account access spans the actual persisted store.
export async function readAccountChangeInput():Promise<AccountChangeInput>{
 const db=database(),rows=await db.batch([db.prepare('SELECT id FROM crm_spaces ORDER BY id'),db.prepare('SELECT space,id,data FROM crm_orders ORDER BY space,id'),db.prepare('SELECT id,email,user_id,name,role,owner,active FROM crm_members ORDER BY id')]);
 return {spaces:rows[0].results as {id:string}[],orders:rows[1].results as StoredOrder[],members:rows[2].results as AccountChangeTarget[]};
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const field=(row:Record<string,unknown>,key:string)=>{const value=row[key];if(value===undefined)return '';if(typeof value!=='string')throw Error('Invalid stored production field');return value.trim();};
const identity=(value:unknown)=>typeof value==='string'&&!!value&&value===value.trim();
const statuses=['draft','submitted','printed','dispatched','cancelled'];
export function assertAccountChangeTarget(target:AccountChangeTarget){
 // Authentication considers any truthy legacy active value enabled. A
 // malformed 2/-1 must never be classified as an already-inactive edit.
 if(!identity(target.id)||target.id.length>100||!['admin','seller','reader','print','warehouse','production'].includes(target.role)||(target.active!==0&&target.active!==1)||typeof target.email!=='string'||typeof target.name!=='string'||!target.name.trim()||typeof target.owner!=='string'||target.user_id!==null&&typeof target.user_id!=='string')throw Error('Invalid stored account identity or activation');
}
// SQLite trim() defaults to ASCII space; CRM's z.string().trim() uses the
// complete ECMAScript whitespace set. Keep the atomic predicate equivalent.
const whitespace=' \t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
const sqlTrim=(expression:string)=>`trim(${expression},'${whitespace}')`;
const sorted=<T,>(rows:T[])=>rows.map(value=>({value,basis:recordBasis(value)})).sort((a,b)=>a.basis<b.basis?-1:a.basis>b.basis?1:0).map(row=>row.value);
const relevantKeys=new Set(['status','workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName']);
// JSON.parse chooses the last duplicate key; SQLite JSON chooses the first.
// Reject ambiguous decision fields before either representation can authorize
// a reduction. Other order fields are outside this selective review context.
function rejectAmbiguousKeys(source:string){
 let offset=0;
 const space=()=>{while(/[ \t\n\r]/.test(source[offset]||'!'))offset++;};
 const string=()=>{const start=offset++;while(offset<source.length){if(source[offset]==='\\'){offset+=2;continue;}if(source[offset++]==='"')return JSON.parse(source.slice(start,offset)) as string;}throw Error('Invalid stored order string');};
 const walk=(path:string[],depth=0):void=>{
  if(depth>100)throw Error('Invalid stored order nesting');space();
  if(source[offset]==='{'){
   offset++;space();const seen=new Set<string>();if(source[offset]==='}'){offset++;return;}
   while(offset<source.length){space();const key=string(),decision=path.length===0&&(key==='id'||key==='production')||path.length===1&&path[0]==='production'&&relevantKeys.has(key);if(decision&&seen.has(key))throw Error('Ambiguous stored production fields');seen.add(key);space();offset++;walk([...path,key],depth+1);space();if(source[offset++]==='}')return;}
  }else if(source[offset]==='['){offset++;space();if(source[offset]===']'){offset++;return;}while(offset<source.length){walk([...path,'[]'],depth+1);space();if(source[offset++]===']')return;}}
  else if(source[offset]==='"'){string();}
  else{while(offset<source.length&&!/[\s,\]}]/.test(source[offset]))offset++;}
 };
 walk([]);
}
function parseWork(row:StoredOrder,spaces:Set<string>){
 if(!identity(row.space)||!identity(row.id)||!spaces.has(row.space))throw Error('Invalid stored production workspace');
 let raw:unknown;try{raw=JSON.parse(row.data);}catch{throw Error('Invalid stored order JSON');}rejectAmbiguousKeys(row.data);if(!object(raw)||typeof raw.id!=='string'||raw.id!==row.id)throw Error('Invalid stored order identity');
 const production=raw.production===undefined?{}:raw.production;if(!object(production))throw Error('Invalid stored production');
 const status=production.status===undefined?'draft':production.status;if(typeof status!=='string'||!statuses.includes(status))throw Error('Invalid stored production status');
 return {space:row.space,id:row.id,status,workId:field(production,'workId'),assigneeId:field(production,'assigneeId'),assigneeMemberId:field(production,'assigneeMemberId'),assigneeName:field(production,'assigneeName'),issue:field(production,'issue'),issueOwnerId:field(production,'issueOwnerId'),issueOwnerName:field(production,'issueOwnerName')};
}
function resolve(directory:readonly DirectoryMember[],userId:string,memberId=''){
 const matches=directory.filter(member=>member.user_id===userId&&identity(member.id)&&identity(member.user_id));
 return matches.length===1&&(!memberId||matches[0].id===memberId)&&directory.filter(member=>member.id===matches[0].id).length===1;
}
export async function buildAccountChangeReview(input:AccountChangeInput,target:AccountChangeTarget,requested:AccountChangeRequested):Promise<AccountChangeReview>{
 assertAccountChangeTarget(target);
 const spaces=new Set(input.spaces.map(space=>space.id));if(spaces.size!==input.spaces.length||input.spaces.some(space=>!identity(space.id)))throw Error('Invalid stored workspace directory');
 const expectedAccount=await accountExpectedBasis(target),loss=accountChangeLoss(target,requested),counts=new Map(Array.from(spaces,id=>[id,{id,jobCount:0,issueCount:0,unresolvedCount:0}]));
 const work=input.orders.map(row=>parseWork(row,spaces)),relevant=[];
 for(const row of work){
  const activeJob=row.status==='submitted'||row.status==='printed',hasIssue=!!row.issue,jobUnresolved=activeJob&&(row.assigneeId?!resolve(input.members,row.assigneeId,row.assigneeMemberId):!!(row.assigneeMemberId||row.assigneeName)),issueUnresolved=hasIssue&&(row.issueOwnerId?!resolve(input.members,row.issueOwnerId):!!row.issueOwnerName);
  const group=counts.get(row.space)!;
  if(activeJob&&(row.assigneeMemberId===target.id||!!target.user_id&&row.assigneeId===target.user_id))group.jobCount++;
  if(hasIssue&&!!target.user_id&&row.issueOwnerId===target.user_id)group.issueCount++;
  // An ambiguous historical identity cannot be cleared by matching a name.
  // The administrator must investigate it before reducing anyone's access.
  group.unresolvedCount+=Number(jobUnresolved)+Number(issueUnresolved);
  if(activeJob||hasIssue)relevant.push({space:row.space,id:row.id,status:row.status,workId:row.workId,job:activeJob?{assigneeId:row.assigneeId,assigneeMemberId:row.assigneeMemberId,nameWithoutId:row.assigneeId?'':row.assigneeName,unresolved:jobUnresolved}:null,issue:hasIssue?{text:row.issue,ownerId:row.issueOwnerId,nameWithoutId:row.issueOwnerId?'':row.issueOwnerName,unresolved:issueUnresolved}:null});
 }
 const workspaces=sorted(Array.from(counts.values())),total=workspaces.reduce((sum,workspace)=>({jobs:sum.jobs+workspace.jobCount,issues:sum.issues+workspace.issueCount,unresolved:sum.unresolved+workspace.unresolvedCount}),{jobs:0,issues:0,unresolved:0});
 const blocked=(loss.jobs||loss.issues)&&(!!total.unresolved||loss.jobs&&!!total.jobs||loss.issues&&!!total.issues);
 const reason=blocked?total.unresolved?'Produktionsunderlaget har '+total.unresolved+' oklar ansvarskoppling'+(total.unresolved===1?'':'ar')+'. Granska dem i samtliga lagrade arbetsytor innan kontots åtkomst minskas.':'Kontot har kvar registrerat produktionsansvar. Granska '+(loss.jobs?total.jobs+' jobb':'')+(loss.jobs&&loss.issues?' och ':'')+(loss.issues?total.issues+' hinderansvar':'')+' innan kontots åtkomst minskas.':loss.jobs||loss.issues?'Inget blockerande registrerat produktionsansvar hittades i de lagrade arbetsytorna. Servern kontrollerar underlaget igen när du sparar.':'Den valda ändringen minskar inte kontots produktionsrättigheter.';
 const expectedContext=await hash({expectedAccount,requested,spaces:sorted(Array.from(spaces)),work:sorted(relevant)});
 return AccountChangeReviewSchema.parse({expectedContext,expectedAccount,target:{memberId:target.id,name:target.name,role:target.role,active:target.active===1},requested,workspaces,blocked:!!blocked,reason});
}

// This predicate is re-evaluated by the SAME SQL statement that changes the
// account. A claim/issue/transfer that wins first must prevent loss of access;
// if the account change wins, existing CRM actor/target gates reject that write.
// CASE protects JSON extraction from malformed stored input, which fails closed.
export function accountChangeWriteGuard(target:AccountChangeTarget,requested:AccountChangeRequested):{sql:string;values:unknown[]}{
 assertAccountChangeTarget(target);
 const loss=accountChangeLoss(target,requested);if(!loss.jobs&&!loss.issues)return {sql:'',values:[]};
 const value=(key:string,fallback="''")=>sqlTrim(`COALESCE(json_extract(work.data,'$.production.${key}'),${fallback})`);
 const user=value('assigneeId'),memberId=value('assigneeMemberId'),name=value('assigneeName'),issue=value('issue'),issueOwner=value('issueOwnerId'),issueName=value('issueOwnerName'),status="COALESCE(json_extract(work.data,'$.production.status'),'draft')",activeJob=`${status} IN ('submitted','printed')`;
 const validMember=(userId:string,registeredId?:string)=>`EXISTS(SELECT 1 FROM crm_members AS linked WHERE linked.user_id=${userId} AND linked.user_id<>'' AND linked.user_id=${sqlTrim('linked.user_id')} AND linked.id<>'' AND linked.id=${sqlTrim('linked.id')}${registeredId?` AND (${registeredId}='' OR linked.id=${registeredId})`:''} AND NOT EXISTS(SELECT 1 FROM crm_members AS duplicate WHERE duplicate.user_id=linked.user_id AND duplicate.id<>linked.id))`;
 const invalid=["json_type(work.data)<>'object'","json_type(work.data,'$.id') IS NOT 'text'","json_extract(work.data,'$.id')<>work.id","EXISTS(SELECT 1 FROM json_each(work.data) WHERE key IN ('id','production') GROUP BY key HAVING COUNT(*)>1)","EXISTS(SELECT 1 FROM json_each(work.data,'$.production') WHERE key IN ('status','workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName') GROUP BY key HAVING COUNT(*)>1)","(json_type(work.data,'$.production') IS NOT NULL AND json_type(work.data,'$.production')<>'object')","(json_type(work.data,'$.production.status') IS NOT NULL AND json_type(work.data,'$.production.status')<>'text')",`${status} NOT IN ('draft','submitted','printed','dispatched','cancelled')`,...['workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName'].map(key=>`(json_type(work.data,'$.production.${key}') IS NOT NULL AND json_type(work.data,'$.production.${key}')<>'text')`)];
 const unresolvedJob=`(${activeJob} AND ((${user}='' AND (${memberId}<>'' OR ${name}<>'')) OR (${user}<>'' AND NOT ${validMember(user,memberId)})))`,unresolvedIssue=`(${issue}<>'' AND ((${issueOwner}='' AND ${issueName}<>'') OR (${issueOwner}<>'' AND NOT ${validMember(issueOwner)})))`;
 const blockedJob=loss.jobs?`(${activeJob} AND (${memberId}=target.id OR (target.user_id IS NOT NULL AND target.user_id<>'' AND ${user}=target.user_id)))`:'0',blockedIssue=loss.issues?`(${issue}<>'' AND target.user_id IS NOT NULL AND target.user_id<>'' AND ${issueOwner}=target.user_id)`:'0';
 const sql=` AND NOT EXISTS(SELECT 1 FROM crm_spaces WHERE id='' OR id<>${sqlTrim('id')}) AND NOT EXISTS(SELECT 1 FROM crm_orders AS work LEFT JOIN crm_spaces AS scope ON scope.id=work.space JOIN crm_members AS target ON target.id=? WHERE scope.id IS NULL OR work.space='' OR work.space<>${sqlTrim('work.space')} OR work.id='' OR work.id<>${sqlTrim('work.id')} OR CASE WHEN json_valid(work.data)=0 THEN 1 ELSE (${invalid.join(' OR ')} OR ${unresolvedJob} OR ${unresolvedIssue} OR ${blockedJob} OR ${blockedIssue}) END)`;
 return {sql,values:[target.id]};
}
