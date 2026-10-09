import {ProductionIssueResponsibilitySchema,validateProductionIssueResponsibility} from './production-issue-responsibility';
import {database} from './crm-db';
import type {Member} from './crm-auth';
import {recordBasis} from './record-conflicts';
import {AccountChangeReviewSchema,accountChangeLoss,type AccountChangeRequested,type AccountChangeReview} from './account-change-review-schema';
import type {AccountChangeWorkReason,AccountChangeWorkRow} from './account-change-work-schema';
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
const relevantKeys=new Set(['status','workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName','issueResponsibility']);
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
   while(offset<source.length){space();const key=string(),decision=path.length===0&&(key==='id'||key==='production')||path.length===1&&path[0]==='production'&&relevantKeys.has(key)||path[0]==='production'&&path[1]==='issueResponsibility';if(decision&&seen.has(key))throw Error('Ambiguous stored production fields');seen.add(key);space();offset++;walk([...path,key],depth+1);space();if(source[offset++]==='}')return;}
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
 const issue=field(production,'issue'),workId=field(production,'workId'),reportedId=field(production,'issueOwnerId'),reportedName=field(production,'issueOwnerName');
 let issueOwnerId=reportedId,issueOwnerMemberId='',issueOwnerName=reportedName;
 if(Object.prototype.hasOwnProperty.call(production,'issueResponsibility')){
  const parsed=ProductionIssueResponsibilitySchema.safeParse(production.issueResponsibility);
  if(!parsed.success)throw Error('Invalid stored current issue responsibility');
  const current=parsed.data;
  if(!issue)throw Error('Current issue responsibility requires an open issue');
  try{validateProductionIssueResponsibility(row.id,workId,{id:reportedId,name:reportedName},current);}catch{throw Error('Invalid stored current issue responsibility chain');}
  issueOwnerId=current.userId;issueOwnerMemberId=current.memberId;issueOwnerName=current.name;
 }
 return {space:row.space,id:row.id,status,workId,assigneeId:field(production,'assigneeId'),assigneeMemberId:field(production,'assigneeMemberId'),assigneeName:field(production,'assigneeName'),issue,issueOwnerId,issueOwnerMemberId,issueOwnerName};
}
function resolve(directory:readonly DirectoryMember[],userId:string,memberId=''){
 const matches=directory.filter(member=>member.user_id===userId&&identity(member.id)&&identity(member.user_id));
 return matches.length===1&&(!memberId||matches[0].id===memberId)&&directory.filter(member=>member.id===matches[0].id).length===1;
}
function unresolvedReason(directory:readonly DirectoryMember[],userId:string,memberId:string,name:string):Exclude<AccountChangeWorkReason,'account_responsibility'>|null{
 if(!userId)return memberId?'member_without_user':name?'name_only':null;
 if(resolve(directory,userId,memberId))return null;
 const linked=directory.filter(account=>account.user_id===userId&&identity(account.id)&&identity(account.user_id));
 if(linked.length===1&&directory.filter(account=>account.id===linked[0].id).length===1&&memberId&&linked[0].id!==memberId)return 'mismatched_member';
 return directory.some(account=>account.user_id===userId)?'ambiguous_account':'no_account';
}
// Each row locates one CURRENT blocking responsibility. Display names and raw
// authentication IDs are deliberately absent; historical assignments are not
// inferred or repaired. A closed job can still carry an unresolved open issue.
export function buildAccountChangeWork(input:AccountChangeInput,target:AccountChangeTarget,requested:AccountChangeRequested):AccountChangeWorkRow[]{
 assertAccountChangeTarget(target);
 const spaces=new Set(input.spaces.map(space=>space.id));if(spaces.size!==input.spaces.length||input.spaces.some(space=>!identity(space.id)))throw Error('Invalid stored workspace directory');
 const work=input.orders.map(row=>parseWork(row,spaces)),loss=accountChangeLoss(target,requested),findings:AccountChangeWorkRow[]=[];
 if(!loss.jobs&&!loss.issues)return findings;
 for(const row of work){
  const reference={spaceId:row.space,orderId:row.id,workId:row.workId,status:row.status as AccountChangeWorkRow['status']};
  if(row.status==='submitted'||row.status==='printed'){
   const reason=unresolvedReason(input.members,row.assigneeId,row.assigneeMemberId,row.assigneeName),belongs=row.assigneeMemberId===target.id||!!target.user_id&&row.assigneeId===target.user_id;
   if(reason||loss.jobs&&belongs)findings.push({...reference,kind:'job',reason:reason||'account_responsibility'});
  }
  if(row.issue){
   const reason=unresolvedReason(input.members,row.issueOwnerId,row.issueOwnerMemberId,row.issueOwnerName),belongs=row.issueOwnerMemberId===target.id||!!target.user_id&&row.issueOwnerId===target.user_id;
   if(reason||loss.issues&&belongs)findings.push({...reference,kind:'issue',reason:reason||'account_responsibility'});
  }
 }
 const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
 return findings.sort((a,b)=>compare(a.spaceId,b.spaceId)||compare(a.orderId,b.orderId)||compare(a.kind,b.kind));
}
export async function buildAccountChangeReview(input:AccountChangeInput,target:AccountChangeTarget,requested:AccountChangeRequested):Promise<AccountChangeReview>{
 assertAccountChangeTarget(target);
 const spaces=new Set(input.spaces.map(space=>space.id));if(spaces.size!==input.spaces.length||input.spaces.some(space=>!identity(space.id)))throw Error('Invalid stored workspace directory');
 const expectedAccount=await accountExpectedBasis(target),loss=accountChangeLoss(target,requested),counts=new Map(Array.from(spaces,id=>[id,{id,jobCount:0,issueCount:0,unresolvedCount:0}]));
 const work=input.orders.map(row=>parseWork(row,spaces)),relevant=[];
 for(const row of work){
  const activeJob=row.status==='submitted'||row.status==='printed',hasIssue=!!row.issue,jobUnresolved=activeJob&&(row.assigneeId?!resolve(input.members,row.assigneeId,row.assigneeMemberId):!!(row.assigneeMemberId||row.assigneeName)),issueUnresolved=hasIssue&&(row.issueOwnerId?!resolve(input.members,row.issueOwnerId,row.issueOwnerMemberId):!!(row.issueOwnerMemberId||row.issueOwnerName));
  const group=counts.get(row.space)!;
  if(activeJob&&(row.assigneeMemberId===target.id||!!target.user_id&&row.assigneeId===target.user_id))group.jobCount++;
  if(hasIssue&&(row.issueOwnerMemberId===target.id||!!target.user_id&&row.issueOwnerId===target.user_id))group.issueCount++;
  // An ambiguous historical identity cannot be cleared by matching a name.
  // The administrator must investigate it before reducing anyone's access.
  group.unresolvedCount+=Number(jobUnresolved)+Number(issueUnresolved);
  if(activeJob||hasIssue)relevant.push({space:row.space,id:row.id,status:row.status,workId:row.workId,job:activeJob?{assigneeId:row.assigneeId,assigneeMemberId:row.assigneeMemberId,nameWithoutId:row.assigneeId?'':row.assigneeName,unresolved:jobUnresolved}:null,issue:hasIssue?{text:row.issue,ownerId:row.issueOwnerId,...(row.issueOwnerMemberId?{ownerMemberId:row.issueOwnerMemberId}:{}),nameWithoutId:row.issueOwnerId?'':row.issueOwnerName,unresolved:issueUnresolved}:null});
 }
 const workspaces=sorted(Array.from(counts.values())),total=workspaces.reduce((sum,workspace)=>({jobs:sum.jobs+workspace.jobCount,issues:sum.issues+workspace.issueCount,unresolved:sum.unresolved+workspace.unresolvedCount}),{jobs:0,issues:0,unresolved:0});
 const blocked=(loss.jobs||loss.issues)&&(!!total.unresolved||loss.jobs&&!!total.jobs||loss.issues&&!!total.issues);
 const reason=blocked?total.unresolved?'Produktionsunderlaget har '+total.unresolved+' oklar ansvarskoppling'+(total.unresolved===1?'':'ar')+'. Granska dem i samtliga lagrade arbetsytor innan kontots åtkomst minskas.':'Kontot har kvar registrerat produktionsansvar. Granska '+(loss.jobs?total.jobs+' jobb':'')+(loss.jobs&&loss.issues?' och ':'')+(loss.issues?total.issues+' hinderansvar':'')+' innan kontots åtkomst minskas.':loss.jobs||loss.issues?'Inget blockerande registrerat produktionsansvar hittades i de lagrade arbetsytorna. Servern kontrollerar underlaget igen när du sparar.':'Den valda ändringen minskar inte kontots produktionsrättigheter.';
 // The same selective basis also binds the displayed diagnostic reason. A
 // directory change can alter that reason while unresolved remains true.
 const findings=buildAccountChangeWork(input,target,requested);
 const expectedContext=await hash({expectedAccount,requested,spaces:sorted(Array.from(spaces)),work:sorted(relevant),findings});
 return AccountChangeReviewSchema.parse({expectedContext,expectedAccount,target:{memberId:target.id,name:target.name,role:target.role,active:target.active===1},requested,workspaces,blocked:!!blocked,reason});
}

// This predicate is re-evaluated by the SAME SQL statement that changes the
// account. A claim/issue/transfer that wins first must prevent loss of access;
// if the account change wins, existing CRM actor/target gates reject that write.
// CASE protects JSON extraction from malformed stored input, which fails closed.
export function accountChangeWriteGuard(target:AccountChangeTarget,requested:AccountChangeRequested):{sql:string;values:unknown[]}{
 assertAccountChangeTarget(target);
 const loss=accountChangeLoss(target,requested);if(!loss.jobs&&!loss.issues)return {sql:'',values:[]};
 // D1 limits expression depth to 100. Balance Boolean trees rather than
 // dropping guards: flat SQL OR chains otherwise grow one level per check.
 const any=(checks:readonly string[]):string=>{
  if(checks.length===1)return checks[0];
  const middle=Math.ceil(checks.length/2);
  return `(${any(checks.slice(0,middle))} OR ${any(checks.slice(middle))})`;
 };
 const value=(key:string,fallback="''")=>sqlTrim(`COALESCE(json_extract(work.data,'$.production.${key}'),${fallback})`);
 const hasIssueResponsibility="json_type(work.data,'$.production.issueResponsibility') IS NOT NULL";
 const user=value('assigneeId'),memberId=value('assigneeMemberId'),name=value('assigneeName'),issue=value('issue'),issueOwner=`CASE WHEN ${hasIssueResponsibility} THEN ${value('issueResponsibility.userId')} ELSE ${value('issueOwnerId')} END`,issueMember=`CASE WHEN ${hasIssueResponsibility} THEN ${value('issueResponsibility.memberId')} ELSE '' END`,issueName=`CASE WHEN ${hasIssueResponsibility} THEN ${value('issueResponsibility.name')} ELSE ${value('issueOwnerName')} END`,status="COALESCE(json_extract(work.data,'$.production.status'),'draft')",activeJob=`${status} IN ('submitted','printed')`;
 const validMember=(userId:string,registeredId?:string)=>`EXISTS(SELECT 1 FROM crm_members AS linked WHERE linked.user_id=${userId} AND linked.user_id<>'' AND linked.user_id=${sqlTrim('linked.user_id')} AND linked.id<>'' AND linked.id=${sqlTrim('linked.id')}${registeredId?` AND (${registeredId}='' OR linked.id=${registeredId})`:''} AND NOT EXISTS(SELECT 1 FROM crm_members AS duplicate WHERE duplicate.user_id=linked.user_id AND duplicate.id<>linked.id))`;
 const invalid=["json_type(work.data)<>'object'","json_type(work.data,'$.id') IS NOT 'text'","json_extract(work.data,'$.id')<>work.id","EXISTS(SELECT 1 FROM json_each(work.data) WHERE key IN ('id','production') GROUP BY key HAVING COUNT(*)>1)","EXISTS(SELECT 1 FROM json_each(work.data,'$.production') WHERE key IN ('status','workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName','issueResponsibility') GROUP BY key HAVING COUNT(*)>1)","(json_type(work.data,'$.production') IS NOT NULL AND json_type(work.data,'$.production')<>'object')","(json_type(work.data,'$.production.status') IS NOT NULL AND json_type(work.data,'$.production.status')<>'text')",`${status} NOT IN ('draft','submitted','printed','dispatched','cancelled')`,...['workId','assigneeId','assigneeMemberId','assigneeName','issue','issueOwnerId','issueOwnerName'].map(key=>`(json_type(work.data,'$.production.${key}') IS NOT NULL AND json_type(work.data,'$.production.${key}')<>'text')`)];
 // A registered object is authoritative only when its strict audit chain
 // matches the current identity and original report. These checks are inside
 // the account UPDATE itself, so a late malformed peer cannot fall back to
 // the reporter and authorize a reduction after the JavaScript review.
 const currentPath='$.production.issueResponsibility',historyPath=currentPath+'.history';
 const currentValue=(key:string)=>value('issueResponsibility.'+key);
 const auditFields=['id','orderId','workId','revision','action','fromUserId','fromMemberId','fromName','toUserId','toMemberId','toName','reason','at','byId','byMemberId','byName'];
 const auditValue=(key:string)=>sqlTrim(`COALESCE(json_extract(entry.value,'$.${key}'),'')`);
 const priorValue=(key:string)=>`CASE WHEN CAST(entry.key AS INTEGER)>0 THEN ${sqlTrim(`COALESCE(json_extract(work.data,'${historyPath}['||(CAST(entry.key AS INTEGER)-1)||'].${key}'),'')`)} ELSE '' END`;
 const lastValue=(key:string)=>value('issueResponsibility.history[#-1].'+key);
 const typedText=(json:string,path:string,nonempty:boolean)=>{
  const raw=`COALESCE(json_extract(${json},'${path}'),'')`,trimmed=sqlTrim(raw);
  return `(json_type(${json},'${path}') IS NOT 'text' OR instr(${raw},char(0))>0 OR length(CAST(${trimmed} AS BLOB))>4000${nonempty?` OR ${trimmed}=''`:''})`;
 };
 // UUID and UTC datetime schemas do not trim. SQLite datetime() accepts impossible
 // calendar dates and length(text) truncates NUL, so validate exact raw syntax,
 // decimal components and leap years independently, preserving Zod's optional
 // seconds and arbitrary nonempty fractional precision. Keep each GLOB pattern
 // short as D1 also limits pattern complexity.
 const auditRaw=(key:string)=>`COALESCE(json_extract(entry.value,'$.${key}'),'')`,auditId=auditRaw('id'),auditAt=auditRaw('at');
 const year=`CAST(substr(${auditAt},1,4) AS INTEGER)`,month=`CAST(substr(${auditAt},6,2) AS INTEGER)`,day=`CAST(substr(${auditAt},9,2) AS INTEGER)`;
 const lastDay=`CASE WHEN ${month}=2 THEN CASE WHEN ${year}%400=0 OR (${year}%4=0 AND ${year}%100<>0) THEN 29 ELSE 28 END WHEN ${month} IN (4,6,9,11) THEN 30 ELSE 31 END`;
 const dateTimeInvalid=[
  `${auditAt} NOT GLOB '????-??-??T??:??*Z'`,
  `(substr(${auditAt},1,4)||substr(${auditAt},6,2)||substr(${auditAt},9,2)||substr(${auditAt},12,2)||substr(${auditAt},15,2)) GLOB '*[^0-9]*'`,
  `${month} NOT BETWEEN 1 AND 12`,`${day} NOT BETWEEN 1 AND ${lastDay}`,
  `CAST(substr(${auditAt},12,2) AS INTEGER) NOT BETWEEN 0 AND 23`,`CAST(substr(${auditAt},15,2) AS INTEGER) NOT BETWEEN 0 AND 59`,
  `NOT (length(${auditAt})=17 OR (length(${auditAt})=20 AND substr(${auditAt},17,3) GLOB ':[0-9][0-9]') OR (length(${auditAt})>=22 AND substr(${auditAt},17,4) GLOB ':[0-9][0-9].' AND substr(${auditAt},21,length(${auditAt})-21) NOT GLOB '*[^0-9]*'))`,
  `(length(${auditAt})>17 AND CAST(substr(${auditAt},18,2) AS INTEGER) NOT BETWEEN 0 AND 59)`
 ];
 const auditInvalid=[
  ...auditFields.filter(key=>key!=='revision').map(key=>typedText('entry.value','$.'+key,!['fromUserId','fromMemberId','fromName'].includes(key))),
  `${auditRaw('action')} NOT IN ('assign','transfer')`,
  "json_type(entry.value,'$.revision') IS NOT 'integer'",`json_extract(entry.value,'$.revision')<>CAST(entry.key AS INTEGER)+1`,
  `EXISTS(SELECT 1 FROM json_each(entry.value) WHERE key NOT IN (${auditFields.map(key=>"'"+key+"'").join(',')}))`,
  'EXISTS(SELECT 1 FROM json_each(entry.value) GROUP BY key HAVING COUNT(*)>1)',
  `${auditValue('orderId')}<>${sqlTrim('work.id')}`,`${auditValue('workId')}<>${value('workId')}`,`${value('workId')}=''`,
  `(${auditValue('fromUserId')}='' AND (${auditValue('action')}<>'assign' OR ${auditValue('fromMemberId')}<>''))`,
  `(${auditValue('fromUserId')}<>'' AND (${auditValue('action')}<>'transfer' OR ${auditValue('fromUserId')}=${auditValue('toUserId')}))`,
  `(CAST(entry.key AS INTEGER)=0 AND (${auditValue('fromUserId')}<>${value('issueOwnerId')} OR ${auditValue('fromName')}<>${value('issueOwnerName')} OR ${auditValue('fromMemberId')}<>''))`,
  `(CAST(entry.key AS INTEGER)>0 AND (${auditValue('fromUserId')}<>${priorValue('toUserId')} OR ${auditValue('fromMemberId')}<>${priorValue('toMemberId')} OR ${auditValue('fromName')}<>${priorValue('toName')}))`,
  `length(${auditId})<>36`,...[[9],[14],[19],[24]].map(([index])=>`substr(${auditId},${index},1)<>'-'`),`length(replace(${auditId},'-',''))<>32`,`replace(${auditId},'-','') GLOB '*[^0-9a-fA-F]*'`,
  ...dateTimeInvalid,
  `EXISTS(SELECT 1 FROM json_each(work.data,'${historyPath}') AS duplicate WHERE CAST(duplicate.key AS INTEGER)<CAST(entry.key AS INTEGER) AND CASE WHEN duplicate.type='object' THEN ${sqlTrim("COALESCE(json_extract(duplicate.value,'$.id'),'')") }=${auditValue('id')} ELSE 0 END)`
 ];
 const responsibilityInvalid=[
  `json_type(work.data,'${currentPath}') IS NOT 'object'`,`${issue}=''`,
  ...['userId','memberId','name'].map(key=>typedText('work.data',currentPath+'.'+key,true)),
  `EXISTS(SELECT 1 FROM json_each(work.data,'${currentPath}') WHERE key NOT IN ('userId','memberId','name','history'))`,
  `EXISTS(SELECT 1 FROM json_each(work.data,'${currentPath}') GROUP BY key HAVING COUNT(*)>1)`,
  `CASE WHEN json_type(work.data,'${historyPath}') IS NOT 'array' THEN 1 ELSE (json_array_length(work.data,'${historyPath}') NOT BETWEEN 1 AND 1000 OR EXISTS(SELECT 1 FROM json_each(work.data,'${historyPath}') AS entry WHERE CASE WHEN entry.type<>'object' THEN 1 ELSE (${any(auditInvalid)}) END)) END`,
  ...[['userId','toUserId'],['memberId','toMemberId'],['name','toName']].map(([current,last])=>`${currentValue(current)}<>${lastValue(last)}`)
 ];
 // Keep strict audit validation in a sibling subquery: nesting it under the
 // general order predicate exceeds D1's depth limit even with balanced OR.
 // Both predicates still run inside the same account write and fail closed.
 const invalidResponsibility=`CASE WHEN json_valid(work.data)=0 THEN 1 ELSE CASE WHEN ${hasIssueResponsibility} THEN ${any(responsibilityInvalid)} ELSE 0 END END`;
 const unresolvedJob=`(${activeJob} AND ((${user}='' AND (${memberId}<>'' OR ${name}<>'')) OR (${user}<>'' AND NOT ${validMember(user,memberId)})))`,unresolvedIssue=`(${issue}<>'' AND ((${issueOwner}='' AND (${issueMember}<>'' OR ${issueName}<>'')) OR (${issueOwner}<>'' AND NOT ${validMember(issueOwner,issueMember)})))`;
 const blockedJob=loss.jobs?`(${activeJob} AND (${memberId}=target.id OR (target.user_id IS NOT NULL AND target.user_id<>'' AND ${user}=target.user_id)))`:'0',blockedIssue=loss.issues?`(${issue}<>'' AND (${issueMember}=target.id OR (target.user_id IS NOT NULL AND target.user_id<>'' AND ${issueOwner}=target.user_id)))`:'0';
 const invalidOrder=`CASE WHEN json_valid(work.data)=0 THEN 1 ELSE ${any([...invalid,unresolvedJob,unresolvedIssue,blockedJob,blockedIssue])} END`;
 const invalidScope=any(['scope.id IS NULL',"work.space=''",`work.space<>${sqlTrim('work.space')}`,"work.id=''",`work.id<>${sqlTrim('work.id')}`,invalidOrder]);
 const sql=` AND NOT EXISTS(SELECT 1 FROM crm_spaces WHERE id='' OR id<>${sqlTrim('id')}) AND NOT EXISTS(SELECT 1 FROM crm_orders AS work LEFT JOIN crm_spaces AS scope ON scope.id=work.space JOIN crm_members AS target ON target.id=? WHERE ${invalidScope}) AND NOT EXISTS(SELECT 1 FROM crm_orders AS work WHERE ${invalidResponsibility})`;
 return {sql,values:[target.id]};
}
