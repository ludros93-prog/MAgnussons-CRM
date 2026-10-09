import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// This entry exists only in this test's Miniflare module configuration. It
// imports every built application module unchanged, and delegates every query
// to real native D1. A Node service callback can pause after a completed D1
// snapshot, update the real account, and release that same pending HTTP request.
// No application route, built file, query result or production binding is patched.
const testEntry=`
import app from './index.js';
import {withEnv} from 'cloudflare:workers';
export default {fetch(request,env,ctx){
 const statements=new WeakMap(),counts={};
 const gate=async stage=>{
  const occurrence=counts[stage]=(counts[stage]||0)+1;
  const response=await env.RUNTIME_GATE.fetch('http://synthetic-fixture/gate',{
   method:'POST',body:JSON.stringify({stage,occurrence})
  });
  if(!response.ok)throw Error('Synthetic D1 interleaving failed');
 };
 const wrap=(native,sql)=>{
  const value={
   bind(...values){return wrap(native.bind(...values),sql)},
   async first(...args){const result=await native.first(...args);
    if(sql.startsWith('SELECT result_json,user_id,request_hash FROM crm_mutations'))await gate('ledger_after');
    return result;
   },
   all(...args){return native.all(...args)},run(...args){return native.run(...args)},raw(...args){return native.raw(...args)}
  };
  statements.set(value,{native,sql});return value;
 };
 const DB={
  prepare(sql){return wrap(env.DB.prepare(sql),sql)},
  async batch(rows){
   const sql=statements.get(rows[0]).sql;
   const commit=sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
   if(commit)await gate('commit_before');
   const result=await env.DB.batch(rows.map(row=>statements.get(row).native));
   if(sql==='SELECT version,settings FROM crm_spaces WHERE id=?')await gate('state_after');
   if(commit)await gate('commit_after');
   return result;
  }
 };
 return withEnv({...env,DB},()=>app.fetch(request,{...env,DB},ctx));
}};
`;

export async function assertNativeResponseAuthorization(){
 const root=fileURLToPath(new URL('../',import.meta.url)),serverRoot=root+'dist/server';
 const core=await import('../work/core.mjs'),conflicts=await import('../work/record-conflicts.mjs');
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
 const {Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(file=>/\.m?js$/.test(file)).sort();
 const builtHash=()=>createHash('sha256').update(moduleFiles.map(file=>file+'\0'+createHash('sha256').update(readFileSync(serverRoot+'/'+file)).digest('hex')).join('\n')).digest('hex');
 const originalBuiltHash=builtHash(),statePath=mkdtempSync(join(tmpdir(),'magnussons-response-authorization-'));
 let db,bucket,ready,currentGate=null,trace=[],requests=0,forcedRaces=0;
 const mf=new Miniflare({
  modulesRoot:serverRoot,modules:[{type:'ESModule',path:serverRoot+'/__response_authorization_test__.mjs',contents:testEntry},...moduleFiles.map(file=>({type:'ESModule',path:serverRoot+'/'+file}))],
  compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,log:new Log(LogLevel.ERROR),
  d1Databases:{DB:'response-authorization'},r2Buckets:{BUCKET:'response-authorization'},d1Persist:statePath+'/d1',r2Persist:statePath+'/r2',
  serviceBindings:{RUNTIME_GATE:async request=>{const event=await request.json();trace.push(event);if(currentGate)await currentGate(event);return new Response(null,{status:204});}}
 });
 const actorId='response-native-actor',actorEmail=actorId+'@example.test',owner='Sebastian Hansson',otherOwner='Erik Lindberg';
 const headers={'oai-authenticated-user-id':actorId,'oai-authenticated-user-email':actorEmail};
 const commercialSecret='SYNTHETIC RESPONSE COMMERCIAL SECRET',privateSecret='SYNTHETIC RESPONSE PRIVATE RAW SECRET';
 const memberRow={id:actorId,user_id:actorId,email:actorEmail,name:'Syntetisk svarskontroll',role:'admin',owner,active:1};
 let tables;
 const raw=async()=>({tables:Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async item=>{const object=await bucket.get(item.key);return[item.key,{sha256:createHash('sha256').update(new Uint8Array(await object.arrayBuffer())).digest('hex'),size:object.size,httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}]})))});
 const resetMember=async(role='admin')=>{
  await db.prepare('DELETE FROM crm_members WHERE email=?').bind(actorEmail).run();
  await db.prepare('INSERT INTO crm_members(id,user_id,email,name,role,owner,active)VALUES(?,?,?,?,?,?,1)').bind(actorId,actorId,actorEmail,memberRow.name,role,owner).run();
 };
 const call=async(payload=null,gate=null,who=headers)=>{
  assert.equal(currentGate,null,'Interleaving scenarios execute separately.');trace=[];currentGate=gate;requests++;
  try{
   const url=new URL('/api/crm'+(payload?'':'?space=live'),ready);
   const response=await fetch(url,{method:payload?'POST':'GET',headers:payload?{...who,'Content-Type':'application/json',Origin:url.origin}:who,...(payload?{body:JSON.stringify(payload)}:{})});
   const text=await response.text();return{status:response.status,data:JSON.parse(text),text,headers:response.headers,trace:[...trace]};
  }finally{currentGate=null;}
 };
 const get=async()=>{const result=await call();assert.equal(result.status,200,result.text);return result.data;};
 const noState=(result,label)=>{
  assert.equal(result.status,403,label+': '+result.text);assert.deepEqual(Object.keys(result.data),['error'],label+' emits only the access error');
  assert.match(result.headers.get('cache-control')||'',/no-store/);assert.ok(!result.text.includes(commercialSecret));assert.ok(!result.text.includes(privateSecret));
 };
 const unchangedOutside=(before,after,allowed,label)=>{
  for(const table of tables.filter(table=>!allowed.includes(table)))assert.deepEqual(after.tables[table],before.tables[table],label+' '+table);
  for(const table of tables.filter(table=>table.startsWith('crm_')&&table!=='crm_members')){
   const outside=rows=>rows.filter(row=>row.space&&row.space!=='live'||row.id==='demo'&&table==='crm_spaces');
   assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),label+' other workspace '+table);
  }
  assert.deepEqual(after.r2,before.r2,label+' all R2 bytes and metadata');
 };
 const changes=[
  ['production role',async()=>db.prepare('UPDATE crm_members SET role=? WHERE email=?').bind('production',actorEmail).run()],
  ['reader role',async()=>db.prepare('UPDATE crm_members SET role=? WHERE email=?').bind('reader',actorEmail).run()],
  ['seller role',async()=>db.prepare('UPDATE crm_members SET role=? WHERE email=?').bind('seller',actorEmail).run()],
  ['owner',async()=>db.prepare('UPDATE crm_members SET owner=? WHERE email=?').bind(otherOwner,actorEmail).run()],
  ['inactive',async()=>db.prepare('UPDATE crm_members SET active=0 WHERE email=?').bind(actorEmail).run()],
  ['user identity',async()=>db.prepare('UPDATE crm_members SET user_id=? WHERE email=?').bind('response-rebound-user',actorEmail).run()],
  ['member identity',async()=>db.prepare('UPDATE crm_members SET id=? WHERE email=?').bind('response-replaced-member',actorEmail).run()],
  ['deleted membership',async()=>db.prepare('DELETE FROM crm_members WHERE email=?').bind(actorEmail).run()]
 ];
 const race=async(payload,occurrence,change)=>{
  let expected,fired=0;
  const result=await call(payload,async event=>{if(event.stage==='state_after'&&event.occurrence===occurrence){fired++;forcedRaces++;await change();expected=await raw();}});
  assert.equal(fired,1,'The native state-load pause must actually execute exactly once.');
  assert.deepEqual(await raw(),expected,'No D1/R2 writes follow the final access-change pause.');return result;
 };
 const customerIntent=(state,contact)=>({space:'live',version:state.version,requestId:crypto.randomUUID(),type:'customer',expectedRecord:conflicts.recordBasis(state.customers.find(row=>row.id==='response-customer')),data:{...state.customers.find(row=>row.id==='response-customer'),contact}});
 try{
  db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');ready=await mf.ready;
  for(const file of readdirSync(root+'drizzle').filter(file=>file.endsWith('.sql')).sort())for(const sql of readFileSync(root+'drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await db.prepare(sql).run();
  tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
  await resetMember();
  const state=core.emptyState();state.version=10;state.settings.budgets={'2026-10':123456};state.settings.annualBudgets={'2026':234567};
  state.customers=[core.CustomerSchema.parse({id:'response-customer',name:'Syntetisk produktionskund',owner,contact:'Operativ kontakt',need:commercialSecret,plan:{goal:commercialSecret}}),core.CustomerSchema.parse({id:'response-sales-only',name:'Syntetisk privat säljmöjlighet',owner:otherOwner,need:commercialSecret})];
  state.deals=[core.DealSchema.parse({id:'response-deal',customerId:'response-customer',owner,title:'Operativ jobbtitel',value:12345,cost:6789,need:commercialSecret}),core.DealSchema.parse({id:'response-sales-deal',customerId:'response-sales-only',owner:otherOwner,title:commercialSecret,value:76543})];
  const line={id:'response-line',kind:'product',description:'Syntetisk provprodukt',quantity:2,unitPrice:6172.5,unitCost:3394.5};
  state.orders=[core.OrderSchema.parse({id:'response-order',customerId:'response-customer',dealId:'response-deal',owner,stage:'production',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:'',deliveredDate:'',invoiceDate:'',invoiceRef:commercialSecret,invoiceValue:12345,actualCost:6789,notes:commercialSecret,commercialValue:12345,production:{status:'submitted',workId:'response-work',instructions:'Syntetiska operativa instruktioner',lines:[line]}})];
  state.tasks=[core.TaskSchema.parse({id:'response-task',customerId:'response-customer',owner,title:commercialSecret,due:'2026-10-09'})];
  state.meetings=[core.MeetingSchema.parse({id:'response-meeting',customerId:'response-customer',owner,title:commercialSecret,date:'2026-10-09',time:'10:00',duration:30})];
  state.events=[{id:'response-private-event',customerId:'response-customer',dealId:'',kind:'note',at:'2026-10-09T09:00:00.000Z',text:commercialSecret},{id:'response-production-event',customerId:'response-customer',dealId:'response-deal',kind:'production',at:'2026-10-09T09:00:00.000Z',text:'Syntetisk operativ händelse'}];
  state.notices=[{id:'response-own-notice',audience:'seller',owner,title:'Syntetisk egen avisering',body:'',customerId:'',orderId:'',at:'2026-10-09T09:00:00.000Z',readBy:[]},{id:'response-other-notice',audience:'seller',owner:otherOwner,title:'Syntetisk annan avisering',body:'',customerId:'',orderId:'',at:'2026-10-09T09:00:00.000Z',readBy:[]}];
  const mapping={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',notices:'crm_notices'};
  for(const space of ['live','demo']){
   await db.prepare('INSERT INTO crm_spaces(id,version,write_token,settings)VALUES(?,?,?,?)').bind(space,state.version,'',JSON.stringify(state.settings)).run();
   for(const [name,table] of Object.entries(mapping))for(const row of state[name]){
    const fields=['space','id',...(['customers','notices'].includes(name)?[]:['customer_id']),...(name==='orders'?['deal_id']:[]),'data'];
    await db.prepare('INSERT INTO '+table+'('+fields.join(',')+')VALUES('+fields.map(()=>'?').join(',')+')').bind(space,row.id,...(['customers','notices'].includes(name)?[]:[row.customerId]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)).run();
   }
   const key='response-native/'+space+'/file',fileId='response-file-'+space,bytes=new TextEncoder().encode(privateSecret+'\n  åäö '+space);
   await bucket.put(key,bytes,{httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'response-authorization'}});
   await db.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').bind(fileId,space,'response-customer',key,JSON.stringify({id:fileId,customerId:'response-customer',name:'Syntetisk kontrollfil.txt',kind:'document',size:bytes.length,version:'response-native',at:'2026-10-09T09:00:00.000Z'})).run();
   for(const userId of [actorId,'response-other-user'])await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(space,userId,'response-draft-'+userId,'note','response-customer',3,crypto.randomUUID(),'Syntetiskt privat utkast',' {"text":"'+privateSecret+'"} \n',0,'2026-10-09T09:00:00.000Z').run();
  }
  await db.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync,status,sync_note,lock_until,revision)VALUES(?,?,?,?,?,?,?,?,?)').bind(actorId,'response-synthetic-microsoft',actorEmail,privateSecret,'2026-10-09T09:00:00.000Z','error',privateSecret,0,7).run();
  for(const shared of [0,1])await db.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,deal_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?,?)').bind('response-outlook-'+shared,actorId,'mail',JSON.stringify({body:privateSecret}),'response-customer','',shared,'2026-10-09T09:00:00.000Z','2026-10-09T09:00:00.000Z').run();
  await db.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').bind('response-oauth',actorId,privateSecret,1999999999000).run();

  const initial=await raw(),anonymous=await call(null,null,{});assert.equal(anonymous.status,401);assert.deepEqual(Object.keys(anonymous.data),['error']);assert.deepEqual(await raw(),initial);
  for(const role of ['admin','seller','reader','production','print','warehouse']){
   await resetMember(role);const before=await raw(),result=await call();assert.equal(result.status,200,result.text);assert.equal(result.data.viewer.role,role);assert.ok(!result.text.includes(privateSecret));assert.deepEqual(await raw(),before);
   if(['production','print','warehouse'].includes(role)){
    assert.ok(!result.text.includes(commercialSecret));assert.deepEqual(result.data.customers.map(row=>row.id),['response-customer']);assert.deepEqual(result.data.deals.map(row=>row.id),['response-deal']);
    for(const name of ['tasks','meetings','articles','leads','companyEvents'])assert.deepEqual(result.data[name],[]);
    assert.deepEqual(result.data.settings.budgets,{});assert.deepEqual(result.data.settings.annualBudgets,{});assert.equal(result.data.orders[0].invoiceValue,null);assert.equal(result.data.orders[0].actualCost,null);assert.equal(result.data.orders[0].commercialValue,null);assert.equal(result.data.orders[0].production.lines[0].unitPrice,0);assert.equal(result.data.orders[0].production.lines[0].unitCost,null);
   }else{assert.ok(result.text.includes(commercialSecret));assert.equal(result.data.customers.length,2);assert.equal(result.data.orders[0].invoiceValue,12345);}
   if(role==='seller')assert.deepEqual(result.data.notices.map(row=>row.id),['response-own-notice']);
  }
  for(const [label,change] of changes){await resetMember();const before=await raw(),result=await race(null,1,change);noState(result,'GET '+label);unchangedOutside(before,await raw(),['crm_members'],'GET '+label);}
  await resetMember('seller');noState(await race(null,1,changes.find(([name])=>name==='owner')[1]),'GET same seller role with new owner');
  await resetMember();const renamed=await race(null,1,async()=>db.prepare('UPDATE crm_members SET name=? WHERE email=?').bind('Aktuellt syntetiskt kontonamn',actorEmail).run());assert.equal(renamed.status,200);assert.equal(renamed.data.viewer.name,'Aktuellt syntetiskt kontonamn');

  // The commit finishes before this pause. A denied response must retain its
  // exact ledger receipt; an unchanged retry later returns that one commit.
  for(const [label,change] of changes.filter(([name])=>['production role','owner','inactive','user identity','member identity'].includes(name))){
   await resetMember();const beforeState=await get(),beforeRaw=await raw(),intent=customerIntent(beforeState,'Syntetiskt sparat trots nekad kvittens: '+label);
   const denied=await race(intent,2,change);noState(denied,'Committed success '+label);assert.equal(denied.trace.filter(event=>event.stage==='commit_after').length,1);
   const committed=await raw();unchangedOutside(beforeRaw,committed,['crm_members','crm_customers','crm_events','crm_spaces','crm_mutations'],'Committed success '+label);
   assert.equal(committed.tables.crm_spaces.find(row=>row.id==='live').version,beforeState.version+1);assert.equal(JSON.parse(committed.tables.crm_customers.find(row=>row.space==='live'&&row.id==='response-customer').data).contact,intent.data.contact);assert.equal(committed.tables.crm_mutations.filter(row=>row.space==='live'&&row.id===intent.requestId).length,1);
   if(label==='production role'){const fresh=await call();assert.equal(fresh.status,200);assert.equal(fresh.data.viewer.role,'production');assert.ok(!fresh.text.includes(commercialSecret));}
   await resetMember();const retryRaw=await raw(),replay=await call(intent);assert.equal(replay.status,200,replay.text);assert.equal(replay.data.version,beforeState.version+1);assert.deepEqual(replay.data.mutationResult,JSON.parse(committed.tables.crm_mutations.find(row=>row.id===intent.requestId).result_json));assert.deepEqual(await raw(),retryRaw,'Exact replay of the unknown successful commit writes no table or object.');
   const replayDenied=await race(intent,2,changes.find(([name])=>name==='production role')[1]);noState(replayDenied,'Stored receipt replay '+label);assert.equal(replayDenied.trace.filter(event=>event.stage==='commit_after').length,0);assert.equal((await raw()).tables.crm_mutations.filter(row=>row.id===intent.requestId).length,1);
  }

  await resetMember();const conflictState=await get(),recordIntent={...customerIntent(conflictState,'Syntetiskt osparat gammalt underlag'),expectedRecord:'stale'};
  const conflictRaw=await raw(),recordConflict=await call(recordIntent);assert.equal(recordConflict.status,409);assert.equal(recordConflict.data.code,'record_conflict');assert.ok(recordConflict.data.state);assert.deepEqual(await raw(),conflictRaw);
  noState(await race(recordIntent,1,changes.find(([name])=>name==='production role')[1]),'Cached record conflict');
  await resetMember('production');const redactedConflictRaw=await raw(),redactedConflict=await call({space:'live',version:conflictState.version,requestId:crypto.randomUUID(),type:'production_issue',data:{orderId:'response-order',expectedProduction:'stale',message:'Syntetiskt hinder'}});assert.equal(redactedConflict.status,409);assert.equal(redactedConflict.data.code,'production_conflict');assert.equal(redactedConflict.data.state.viewer.role,'production');assert.ok(!redactedConflict.text.includes(commercialSecret));assert.deepEqual(await raw(),redactedConflictRaw);
  await resetMember();const latest=await get(),versionIntent={space:'live',version:0,requestId:crypto.randomUUID(),type:'note',data:{customerId:'response-customer',text:'Syntetisk osparad anteckning',contact:false}};
  const versionRaw=await raw(),versionConflict=await call(versionIntent);assert.equal(versionConflict.status,409);assert.ok(versionConflict.data.state);assert.deepEqual(await raw(),versionRaw);
  noState(await race(versionIntent,1,changes.find(([name])=>name==='owner')[1]),'Cached workspace version conflict');

  // Force real native CAS misses with independent version UPDATEs; do not
  // replace the commit result. Exercise its reload and its four-retry ending.
  for(const exhausted of [false,true])for(const revoked of [false,true]){
   await resetMember();const beforeState=await get(),beforeRaw=await raw();
   const intent=exhausted?customerIntent(beforeState,'Syntetiskt CAS-blockerad kundkontakt'):{...versionIntent,version:beforeState.version,requestId:crypto.randomUUID()};
   let expected,misses=0,revocations=0;
   const result=await call(intent,async event=>{
    if(event.stage==='commit_before'){misses++;await db.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').bind('live').run();expected=await raw();}
    if(revoked&&event.stage==='state_after'&&event.occurrence===(exhausted?5:2)){revocations++;forcedRaces++;await changes.find(([name])=>name==='inactive')[1]();expected=await raw();}
   });
   assert.equal(misses,exhausted?4:1);assert.equal(revocations,revoked?1:0);assert.equal(result.trace.filter(event=>event.stage==='state_after').length,exhausted?5:2);
   if(revoked)noState(result,exhausted?'Exhausted CAS reply':'Failed CAS reload reply');else{assert.equal(result.status,409,result.text);assert.ok(result.data.state);}
   assert.deepEqual(await raw(),expected,'CAS misses never store any proposed CRM row or ledger receipt.');unchangedOutside(beforeRaw,expected,['crm_spaces','crm_members'],'Real native CAS misses');assert.equal(expected.tables.crm_mutations.some(row=>row.id===intent.requestId),false);
  }
  return {responseAuthorizationNativeBuiltHTTP:true,responseAuthorizationNativeUnchangedBuiltModules:true,responseAuthorizationNativeRequestLocalD1Wrapper:true,responseAuthorizationNativeRealD1Pause:true,responseAuthorizationNativeForcedRaces:forcedRaces,responseAuthorizationNativeRequests:requests,responseAuthorizationNativeGETIdentityRoleOwnerRevocation:true,responseAuthorizationNativeStableSixRolesAndRedaction:true,responseAuthorizationNativeFreshViewerName:true,responseAuthorizationNativePostCommitNoState:true,responseAuthorizationNativeUnknownCommitExactlyOneReceipt:true,responseAuthorizationNativeExactReplayNoWrites:true,responseAuthorizationNativeReplayReauthorization:true,responseAuthorizationNativeCached409Reauthorization:true,responseAuthorizationNativeFailedAndExhaustedCAS:true,responseAuthorizationNative18TablePrivateOutlookAndR2Isolation:true,responseAuthorizationNativeBuiltModuleSha256:originalBuiltHash};
 }finally{await mf.dispose();rmSync(statePath,{recursive:true,force:true});assert.equal(builtHash(),originalBuiltHash,'Runtime verification leaves every built application module byte-identical.');}
}
