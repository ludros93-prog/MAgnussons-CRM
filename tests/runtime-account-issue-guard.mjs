import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {accountChangeWriteGuard,buildAccountChangeReview} from '../work/account-change-review.mjs';
import {OrderSchema} from '../work/core.mjs';

// Direct native D1 proof supplements the built HTTP runtime. It uses only a
// separate migrated synthetic database and the actual compiled guard. Both
// account UPDATE and the complete current members INSERT must execute: a plain
// Node SQLite pass cannot detect D1's expression-depth or GLOB pattern limits.
export async function assertNativeAccountIssueGuard(){
 const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
 const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
 const {Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const statePath=mkdtempSync(join(tmpdir(),'magnussons-account-issue-guard-'));
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("synthetic guard probe")}}',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),d1Databases:{DB:'account-issue-guard'},d1Persist:statePath});
 const accounts=[
  {id:'guard-reporter',user_id:'guard-reporter-user',email:'reporter@example.test',name:'Synthetic reporter',role:'production',owner:'',active:1},
  {id:'guard-current',user_id:'guard-current-user',email:'current@example.test',name:'Synthetic current owner',role:'production',owner:'',active:1},
  {id:'guard-unrelated',user_id:'guard-unrelated-user',email:'unrelated@example.test',name:'Synthetic unrelated target',role:'production',owner:'',active:1},
  {id:'guard-admin',user_id:'guard-admin-user',email:'admin@example.test',name:'Synthetic administrator',role:'admin',owner:'',active:1}
 ];
 const target=accounts[2],admin=accounts[3],requested={role:'production',active:false};
 const audit={id:crypto.randomUUID(),orderId:'guard-order',workId:'guard-work',revision:1,action:'transfer',fromUserId:accounts[0].user_id,fromMemberId:'',fromName:accounts[0].name,toUserId:accounts[1].user_id,toMemberId:accounts[1].id,toName:accounts[1].name,reason:'Synthetic reviewed handover',at:'2026-01-01T12:30:10.123Z',byId:admin.user_id,byMemberId:admin.id,byName:admin.name};
 const order=OrderSchema.parse({id:'guard-order',customerId:'guard-customer',dealId:'guard-deal',owner:'Synthetic owner',stage:'production',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:'',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'',production:{status:'submitted',workId:'guard-work',issue:'Synthetic open issue',issueOwnerId:accounts[0].user_id,issueOwnerName:accounts[0].name,issueResponsibility:{userId:accounts[1].user_id,memberId:accounts[1].id,name:accounts[1].name,history:[audit]}}});
 const original=JSON.stringify(order),guard=accountChangeWriteGuard(target,requested);
 // Read the complete SQL template and its target gate from the real route;
 // never copy the issue predicate or let a smaller query mask native limits.
 const membersSource=readFileSync(root+'app/api/crm/members/route.ts','utf8');
 const template=membersSource.match(/db\.prepare\(`(INSERT INTO crm_members[\s\S]*?)`\)/)?.[1];
 const targetExpression=membersSource.match(/const targetGate=([^;\n]+);/)?.[1];
 assert.ok(template&&targetExpression,'The actual members write template must be available for the native guard proof.');
 const targetGate=Function('target','return '+targetExpression)(target);
 const insert=Function('targetGate','workGuard','return `'+template+'`')(targetGate,guard);
 const insertValues=[crypto.randomUUID(),target.email,target.name,target.role,'',0,admin.id,admin.user_id,admin.email,'',0,'',target.email,0,target.role,target.email,target.email,target.id,target.email,target.user_id,target.name,target.role,target.owner,target.active,...guard.values];
 const queries=[{name:'account UPDATE',sql:'UPDATE crm_members SET active=0 WHERE id=?'+guard.sql,values:[target.id,...guard.values]},{name:'full members INSERT',sql:insert,values:insertValues}];
 const negatives=[
  ['extra UUID hyphen','id','00000000-0000-0000-0000-00000000000-'],['padded UUID','id',' '+audit.id+' '],['UUID NUL suffix','id',audit.id+'\0bad'],
  ['invalid calendar day','at','2026-02-30T12:30:00Z'],['padded datetime','at',' '+audit.at+' '],['datetime NUL suffix','at',audit.at+'\0bad'],['padded action','action','transfer '],
  ['UTF-16 overlong reason','reason','😀'.repeat(2001)],['UTF-8 overlong reason','reason','😀'.repeat(1001)],['NUL overlong reason','reason','a\0'+'x'.repeat(4000)],
  ['non-leap century','at','1900-02-29T12:00Z'],['month zero','at','2026-00-01T12:00Z'],['month thirteen','at','2026-13-01T12:00Z'],['day zero','at','2026-01-00T12:00Z'],
  ['April31','at','2026-04-31T12:00Z'],['hour24','at','2026-01-01T24:00Z'],['minute60','at','2026-01-01T12:60Z'],['second60','at','2026-01-01T12:00:60Z'],
  ['empty fraction','at','2026-01-01T12:00:00.Z'],['fraction nondigit','at','2026-01-01T12:00:00.0aZ'],['fraction without seconds','at','2026-01-01T12:00.12Z'],['non-UTC offset','at','2026-01-01T12:00:00+00:00'],
  ['punctuation in hour and minute','at','2026-01-01T1-:2-Z']
 ];
 // Every decimal position is checked independently. Global replacement of
 // punctuation before a digit check would accept malformed CAST prefixes.
 for(const index of [0,1,2,3,5,6,8,9,11,12,14,15,17,18,20,21,22])for(const replacement of ['-',':','T','Z',' ','\t'])negatives.push(['nondigit datetime position '+index+' '+JSON.stringify(replacement),'at',audit.at.slice(0,index)+replacement+audit.at.slice(index+1)]);
 const positives=[
  ['canonical ISO','at',audit.at],['optional seconds','at','2026-01-01T12:30Z'],['whole seconds','at','2026-01-01T12:30:10Z'],['one fraction digit','at','2026-01-01T12:30:10.1Z'],
  ['long fraction','at','2026-01-01T12:30:10.'+'1'.repeat(100)+'Z'],['leap2024','at','2024-02-29T00:00Z'],['leap2000','at','2000-02-29T23:59:59.999Z'],['leap0000','at','0000-02-29T00:00Z'],
  ['uppercase UUID','id',audit.id.toUpperCase()],['4000-byte accented reason','reason','å'.repeat(2000)],['4000-byte emoji reason','reason','😀'.repeat(1000)],['trimmed reason','reason','  reviewed reason  ']
 ];
 try{
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(root+'drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  for(const account of accounts)await db.prepare('INSERT INTO crm_members(id,user_id,email,name,role,owner,active)VALUES(?,?,?,?,?,?,?)').bind(account.id,account.user_id,account.email,account.name,account.role,account.owner,account.active).run();
  await db.prepare('INSERT INTO crm_spaces(id,version,write_token,settings)VALUES(?,?,?,?)').bind('live',1,'','{}').run();
  await db.prepare('INSERT INTO crm_customers(space,id,data)VALUES(?,?,?)').bind('live',order.customerId,'{}').run();
  await db.prepare('INSERT INTO crm_deals(space,id,customer_id,data)VALUES(?,?,?,?)').bind('live',order.dealId,order.customerId,'{}').run();
  await db.prepare('INSERT INTO crm_orders(space,id,customer_id,deal_id,data)VALUES(?,?,?,?,?)').bind('live',order.id,order.customerId,order.dealId,original).run();
  const input=async()=>({spaces:(await db.prepare('SELECT id FROM crm_spaces ORDER BY id').all()).results,orders:(await db.prepare('SELECT space,id,data FROM crm_orders ORDER BY space,id').all()).results,members:(await db.prepare('SELECT id,email,user_id,name,role,owner,active FROM crm_members ORDER BY id').all()).results});
  const decisions=async(label,allowed)=>{
   const before=(await db.prepare('SELECT id,email,user_id,name,role,owner,active FROM crm_members ORDER BY id').all()).results;
   for(const query of queries){
    const result=await db.prepare(query.sql).bind(...query.values).run();assert.equal(result.meta.changes,allowed?1:0,label+' '+query.name);
    assert.equal((await db.prepare('SELECT active FROM crm_members WHERE id=?').bind(target.id).first()).active,allowed?0:1,label+' persisted decision');
    await db.prepare('UPDATE crm_members SET active=1 WHERE id=?').bind(target.id).run();
    assert.deepEqual((await db.prepare('SELECT id,email,user_id,name,role,owner,active FROM crm_members ORDER BY id').all()).results,before,label+' preserves the directory after fixture reset');
   }
  };
  for(const [label,field,value] of negatives){
   const altered=JSON.parse(original);altered.production.issueResponsibility.history[0][field]=value;await db.prepare('UPDATE crm_orders SET data=?').bind(JSON.stringify(altered)).run();
   let rejected=false;try{await buildAccountChangeReview(await input(),target,requested);}catch{rejected=true;}assert.ok(rejected,label+' JavaScript review must reject');await decisions(label,false);
  }
  for(const [label,field,value] of positives){
   const altered=JSON.parse(original);altered.production.issueResponsibility.history[0][field]=value;await db.prepare('UPDATE crm_orders SET data=?').bind(JSON.stringify(altered)).run();
   assert.equal((await buildAccountChangeReview(await input(),target,requested)).blocked,false,label+' JavaScript review must accept');await decisions(label,true);
  }
  const rawNegatives=[
   ['malformed JSON',()=>'{'],['null object',()=>{const a=JSON.parse(original);a.production.issueResponsibility=null;return JSON.stringify(a);}],
   ['history scalar',()=>{const a=JSON.parse(original);a.production.issueResponsibility.history=[null];return JSON.stringify(a);}],
   ['duplicate key',()=>original.replace('"issueResponsibility":','"issueResponsibility":null,"issueResponsibility":')],
   ['member mismatch',()=>{const a=JSON.parse(original);a.production.issueResponsibility.memberId=accounts[0].id;return JSON.stringify(a);}]
  ];
  for(const [label,makeRaw] of rawNegatives){await db.prepare('UPDATE crm_orders SET data=?').bind(makeRaw()).run();let denied=false;try{denied=(await buildAccountChangeReview(await input(),target,requested)).blocked;}catch{denied=true;}assert.ok(denied,label+' JavaScript review must deny');await decisions(label,false);}
  return {accountIssueGuardDirectNativeD1:true,accountIssueGuardActualCompiledPredicate:true,accountIssueGuardFullMembersSQLTemplate:true,accountIssueGuardNegativeCases:negatives.length+rawNegatives.length,accountIssueGuardPositiveCases:positives.length,accountIssueGuardNativeWriteDecisions:2*(negatives.length+rawNegatives.length+positives.length),accountIssueGuardSourceHash:createHash('sha256').update(readFileSync(root+'lib/account-change-review.ts')).digest('hex')};
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});}
}
