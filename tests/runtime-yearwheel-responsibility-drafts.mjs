import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as contracts from '../work/yearwheel-responsibility-drafts.mjs';
import * as year from '../work/yearwheel-responsibility.mjs';
import * as conflicts from '../work/record-conflicts.mjs';

// Every request below crosses the ordinary built workerd HTTP listener and
// migrated, persisted local D1/R2. Fixtures are synthetic; no deployed bindings.
export async function verifyYearwheelResponsibilityDraftNative({db,raw,get,headers,core,ready}) {
 const space='live',origin=new URL(ready).origin,suffix=crypto.randomUUID(),prefix='runtime-year-handover-'+suffix;
 const own=headers['oai-authenticated-user-id'];
 let state=await get();
 const request=async(path,payload,who=headers)=>{
  const response=await fetch(new URL(path,ready),{headers:{...who,...(payload?{'Content-Type':'application/json',Origin:origin}:{})},...(payload?{method:'POST',body:JSON.stringify(payload)}:{})});
  return {status:response.status,data:await response.json()};
 };
 const write=(data,who=headers,workspace=space)=>request('/api/crm/drafts',{space:workspace,...data},who);
 const read=(id,who=headers,workspace=space)=>request('/api/crm/drafts?'+new URLSearchParams({space:workspace,id}),null,who);
 const payload=(opened,data,requestId=crypto.randomUUID())=>({space,version:opened.version,requestId,type:'yearwheel_responsibility_transfer',data});
 const input=draft=>({customerId:draft.data.customerId,needId:draft.data.needId,values:structuredClone(draft.data.values),reviewed:true,expectedContext:draft.data.expectedContext,draft:{id:draft.id,revision:draft.revision}});
 const business=(opened,data,requestId,who=headers)=>request('/api/crm',payload(opened,data,requestId),who);
 const unchanged=async(before,label)=>assert.deepEqual(await raw(),before,label);
 const except=async(before,allowed,label)=>{
  const after=await raw();assert.equal(Object.keys(after.tables).length,18);
  for(const table of Object.keys(before.tables)){
   if(!allowed.includes(table))assert.deepEqual(after.tables[table],before.tables[table],label+' '+table);
   else if(table==='crm_spaces')assert.deepEqual(after.tables[table].filter(row=>row.id!==space),before.tables[table].filter(row=>row.id!==space),label+' other workspace '+table);
   else assert.deepEqual(after.tables[table].filter(row=>row.space!==space),before.tables[table].filter(row=>row.space!==space),label+' other workspace '+table);
  }
  assert.deepEqual(after.r2,before.r2,label+' every R2 byte');return after;
 };
 const post=async(type,data)=>{
  const record=conflicts.editableRecord(state,type,data.id||''),response=await request('/api/crm',{space,version:state.version,requestId:crypto.randomUUID(),type,data,expectedRecord:record?conflicts.recordBasis(record):undefined});
  assert.equal(response.status,200,JSON.stringify(response.data));state=await get();return response;
 };
 const linked=[];
 for(const profile of state.settings.sellerProfiles.filter(p=>p.active&&p.memberId&&state.settings.owners.includes(p.legacyOwnerName))){
  const member=await db.prepare('SELECT id,email,user_id,role,owner,active FROM crm_members WHERE id=?').bind(profile.memberId).first();
  if(member?.active===1&&member.user_id&&['admin','seller'].includes(member.role)&&member.owner===profile.legacyOwnerName)linked.push({profile,member});
 }
 const source=linked.find(row=>row.member.user_id===own),target=linked.find(row=>row.profile.id!==source?.profile.id);
 assert.ok(source&&target,'Native transfer needs two actually linked, active synthetic runtime profiles.');
 assert.equal(source.member.role,'admin');
 const identities=[];
 const identity=async(role,active=1)=>{
  const id=prefix+'-'+role+'-'+identities.length,email=id+'@example.test';identities.push(id);
  await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,?)').bind(id,email,id,'Syntetisk privat överlämningsaktör',role,source.profile.legacyOwnerName,active).run();
  return {'oai-authenticated-user-id':id,'oai-authenticated-user-email':email};
 };
 const other=await identity('admin'),seller=await identity('seller');
 const deniedRoles=[];for(const role of ['reader','production','print','warehouse'])deniedRoles.push(await identity(role));
 const inactive=await identity('admin',0);
 await post('customer',{name:'Syntetisk privat överlämningskund '+suffix,owner:source.profile.legacyOwnerName,status:'active'});
 const customerId=state.customers.find(c=>c.name==='Syntetisk privat överlämningskund '+suffix).id;
 await post('year_need',{customerId,need:{title:'Syntetiskt privat överlämningsbehov '+suffix,due:core.plusDays(core.day(),90),owner:source.profile.legacyOwnerName,ownerProfileId:source.profile.id,leadDays:30,notes:'Fullständigt syntetiskt granskningsunderlag'}});
 const needId=state.customers.find(c=>c.id===customerId).yearNeeds[0].id;
 const selected=state.tasks.find(t=>t.customerId===customerId&&t.kind==='year:'+needId&&!t.done);
 assert.ok(selected);assert.equal(selected.ownerProfileId,source.profile.id);
 await post('task',{customerId,owner:source.profile.legacyOwnerName,title:'Syntetisk oflyttad privat överlämningsuppgift '+suffix,due:core.plusDays(core.day(),65),kind:'year:'+needId});
 const unselectedId=state.tasks.find(t=>t.title==='Syntetisk oflyttad privat överlämningsuppgift '+suffix).id;
 const needOf=st=>st.customers.find(c=>c.id===customerId).yearNeeds.find(n=>n.id===needId);
 const fresh=(reason='  Privat rå överlämningsorsak\n  Behåll dessa blanksteg.  ',ids=[selected.id])=>({targetProfileId:target.profile.id,selectedTaskIds:ids,reason});
 const envelope=(id,values)=>({...contracts.createYearwheelResponsibilityDraft(state,customerId,needId,id),values:structuredClone(values)});
 async function make(values=fresh()){
  const id=crypto.randomUUID(),before=await raw(),response=await write({id,kind:'form',context:'yearwheel_responsibility_transfer',revision:0,requestId:crypto.randomUUID(),title:'Privat granskat behovsansvar',data:envelope(id,values)});
  assert.equal(response.status,200,JSON.stringify(response.data));await except(before,['crm_drafts'],'Private handover save');return response.data;
 }
 async function reject(draft,{data=input(draft),status=400,requestId,who=headers,opened=state}={}){
  const before=await raw(),response=await business(opened,data,requestId,who);assert.equal(response.status,status,JSON.stringify(response.data));await unchanged(before,'Rejected private handover preserves all 18 raw tables and R2');return response;
 }
 const unfinished=await make({targetProfileId:'',selectedTaskIds:[],reason:'  \n  Privat ofärdig råtext 🙂\n  '}),privateBefore=await raw();
 assert.deepEqual((await read(unfinished.id)).data[0],unfinished);await unchanged(privateBefore,'Exact unfinished handover HTTP reload');
 assert.equal(unfinished.data.expectedContext,year.yearwheelResponsibilityBasis(state,customerId,needId));
 assert.deepEqual(unfinished.data.context.tasks,state.tasks.filter(t=>t.customerId===customerId).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.deepEqual(unfinished.data.context.need,needOf(state));assert.ok(!JSON.stringify(await get()).includes(unfinished.data.values.reason));
 for(const who of [other,seller])assert.deepEqual((await read(unfinished.id,who)).data,[]);
 assert.deepEqual((await read(unfinished.id,headers,'demo')).data,[]);
 assert.equal((await read(unfinished.id,{})).status,401);
 for(const who of [...deniedRoles,inactive])assert.equal((await read(unfinished.id,who)).status,403);
 await reject(unfinished);await reject(unfinished,{status:403,who:seller});
 const unauthorizedBefore=await raw(),sellerCreationId=crypto.randomUUID();
 const sellerCreation=await write({id:sellerCreationId,kind:'form',context:'yearwheel_responsibility_transfer',revision:0,requestId:crypto.randomUUID(),title:'Nekat nytt säljarutkast',data:envelope(sellerCreationId,fresh())},seller);
 assert.equal(sellerCreation.status,403,JSON.stringify(sellerCreation.data));await unchanged(unauthorizedBefore,'Seller cannot create a private administrator handover');

 // Strict raw envelopes have no coercion, defaults, silently stripped fields,
 // rewritten original task rows, or mismatched handover/draft references.
 for(const mutate of [
  data=>{data.values.reason=27;},data=>{data.values.targetProfileId='guessed-profile';},
  data=>{data.values.selectedTaskIds=[selected.id,selected.id];},data=>{data.values.extra='unknown';},
  data=>{data.values.reason='x'.repeat(4001);},data=>{data.expectedContext+='changed';},
  data=>{data.context.tasks[0].title+='changed';},data=>{data.draftId=crypto.randomUUID();}
 ]){
  const id=crypto.randomUUID(),data=envelope(id,fresh());mutate(data);const before=await raw();
  const response=await write({id,kind:'form',context:'yearwheel_responsibility_transfer',revision:0,requestId:crypto.randomUUID(),title:'Nekat felaktigt råkuvert',data});
  assert.equal(response.status,400,JSON.stringify(response.data));await unchanged(before,'Strict built private envelope rejects malformed data');
 }
 const initial=await make(),writeReplayBefore=await raw();
 assert.equal((await write(initial)).status,200);await unchanged(writeReplayBefore,'Exact private same-request replay');
 const changedWrite=await write({...initial,data:{...initial.data,values:{...initial.data.values,reason:'Ändrad samma privatbegäran'}}});
 assert.equal(changedWrite.status,409,JSON.stringify(changedWrite.data));await unchanged(writeReplayBefore,'Changed-body private same-request replay denied');
 await reject(initial,{data:{...input(initial),values:{...initial.data.values,reason:initial.data.values.reason.trim()}}});
 await reject(initial,{data:{...input(initial),reviewed:false}});
 await reject(initial,{data:{...input(initial),draft:{id:initial.id,revision:initial.revision+1}},status:409});
 await reject(initial,{status:409,who:other});
 for(const who of [...deniedRoles,inactive])await reject(initial,{status:403,who});

 // A former administrator reads their own complete raw version and can
 // explicitly archive only that identical acknowledged version.
 const former=await make(fresh('  Ofärdig text före rollbyte\n  '));
 await db.prepare('UPDATE crm_members SET role=? WHERE id=?').bind('seller',source.member.id).run();
 try{
  const before=await raw();assert.deepEqual((await read(former.id)).data[0],former);await unchanged(before,'Former-admin own read');
  const altered=await write({...former,requestId:crypto.randomUUID(),data:{...former.data,values:{...former.data.values,reason:'Oerkänd lokal ändring'}}});assert.equal(altered.status,403);await unchanged(before,'Former admin cannot edit private handover');
  const alteredArchive=await write({...former,requestId:crypto.randomUUID(),archived:true,data:{...former.data,values:{...former.data.values,reason:'Oerkänd lokal ändring'}}});assert.equal(alteredArchive.status,403);await unchanged(before,'Former admin cannot archive unsaved changed values');
  await reject(former,{status:403});
  const archive=await write({...former,requestId:crypto.randomUUID(),archived:true});assert.equal(archive.status,200,JSON.stringify(archive.data));assert.equal(archive.data.archived,true);assert.deepEqual(archive.data.data,former.data);await except(before,['crm_drafts'],'Former-admin exact archive');
 }finally{await db.prepare('UPDATE crm_members SET role=? WHERE id=?').bind(source.member.role,source.member.id).run();}
 state=await get();
 for(const [field,value] of [['active',0],['user_id',prefix+'-revoked-login']]){
  await db.prepare('UPDATE crm_members SET '+field+'=? WHERE id=?').bind(value,source.member.id).run();
  try{const before=await raw();assert.equal((await read(initial.id)).status,403);await reject(initial,{status:403});await unchanged(before,'Revoked actor cannot read, publish or consume private work');}finally{await db.prepare('UPDATE crm_members SET '+field+'=? WHERE id=?').bind(source.member[field],source.member.id).run();}
 }
 // Actual target-account revocations do not consume an otherwise valid draft.
 for(const [field,value] of [['role','production'],['active',0],['owner','Syntetisk senare kontokoppling']]){
  await db.prepare('UPDATE crm_members SET '+field+'=? WHERE id=?').bind(value,target.member.id).run();
  try{await reject(initial,{status:403});}finally{await db.prepare('UPDATE crm_members SET '+field+'=? WHERE id=?').bind(target.member[field],target.member.id).run();}
 }
 // A fresh global version never adopts stale customer-task/profile context.
 const staleTask=await make(),originalTask=state.tasks.find(t=>t.id===unselectedId);
 await post('task',{...originalTask,title:originalTask.title+' · senare ändring'});await reject(staleTask,{status:409});
 assert.deepEqual((await read(staleTask.id)).data[0].data,staleTask.data);
 const staleProfile=await make(),oldTarget=state.settings.sellerProfiles.find(p=>p.id===target.profile.id);
 await post('seller_profile',{expectedContext:conflicts.sellerProfilesBasis(state),id:oldTarget.id,legacyOwnerName:oldTarget.legacyOwnerName,displayName:oldTarget.displayName+' · senare profil',memberId:oldTarget.memberId});
 await reject(staleProfile,{status:409});assert.deepEqual((await read(staleProfile.id)).data[0].data,staleProfile.data);
 const adopted=contracts.adoptYearwheelResponsibilityDraftContext(staleProfile.data,state);
 assert.deepEqual(adopted.values,staleProfile.data.values);assert.equal(adopted.initialData,staleProfile.data.initialData);assert.equal(adopted.expectedContext,year.yearwheelResponsibilityBasis(state,customerId,needId));
 const adoptionBefore=await raw(),reviewed=await write({...staleProfile,requestId:crypto.randomUUID(),data:adopted});assert.equal(reviewed.status,200,JSON.stringify(reviewed.data));assert.equal(reviewed.data.revision,staleProfile.revision+1);assert.deepEqual(reviewed.data.data,adopted);await except(adoptionBefore,['crm_drafts'],'Explicit fresh review changes only exact private context');

 // Competing private saves start at one acknowledged revision; exactly one
 // reaches D1. Publishing the older version cannot consume the winner.
 const raced=await make(),raceBefore=await raw();
 const revisionRace=await Promise.all(['Första syntetiska enheten','Andra syntetiska enheten'].map(reason=>write({...raced,requestId:crypto.randomUUID(),data:{...raced.data,values:{...raced.data.values,reason}}})));
 assert.deepEqual(revisionRace.map(r=>r.status).sort(),[200,409]);await except(raceBefore,['crm_drafts'],'Simultaneous private revision CAS');
 const raceWinner=revisionRace.find(r=>r.status===200).data;assert.equal(raceWinner.revision,raced.revision+1);assert.deepEqual((await read(raced.id)).data[0],raceWinner);await reject(raced,{status:409});

 // A real D1 trigger fails at the mutation ledger, after parent, task, event,
 // and archive statements have run. Native rollback must undo them all.
 const atomic=reviewed.data,atomicRequestId=crypto.randomUUID();
 await db.prepare(`CREATE TRIGGER runtime_private_year_handover_failure BEFORE INSERT ON crm_mutations WHEN NEW.space='live' AND NEW.id='${atomicRequestId}' BEGIN SELECT RAISE(ABORT,'synthetic private year handover transaction failure'); END`).run();
 try{await reject(atomic,{status:503,requestId:atomicRequestId});assert.equal((await read(atomic.id)).data[0].archived,false);}finally{await db.prepare('DROP TRIGGER runtime_private_year_handover_failure').run();}
 const opened=state,data=input(atomic),before=await raw(),intent=payload(opened,data,atomicRequestId);
 const clicks=await Promise.all([request('/api/crm',intent),request('/api/crm',intent)]);assert.deepEqual(clicks.map(r=>r.status),[200,200]);
 state=await get();assert.equal(state.version,opened.version+1);
 const oldNeed=needOf(opened),savedNeed=needOf(state),parent=savedNeed.responsibilityTransfers.at(-1),newTarget=state.settings.sellerProfiles.find(p=>p.id===data.values.targetProfileId);
 assert.deepEqual(savedNeed,{...oldNeed,owner:newTarget.legacyOwnerName,ownerProfileId:newTarget.id,responsibilityTransfers:[...oldNeed.responsibilityTransfers,parent]});
 assert.equal(parent.action,'transfer');assert.equal(parent.customerId,customerId);assert.equal(parent.needId,needId);assert.equal(parent.fromRecordedProfileId,oldNeed.ownerProfileId);assert.equal(parent.fromProfileId,source.profile.id);assert.equal(parent.toProfileId,newTarget.id);assert.deepEqual(parent.selectedTaskIds,data.values.selectedTaskIds);assert.equal(parent.reason,data.values.reason.trim());assert.equal(parent.byId,own);assert.equal(parent.byMemberId,source.member.id);assert.equal(parent.byName,state.viewer.name);assert.equal(new Date(parent.at).toISOString(),parent.at);
 for(const old of opened.tasks){
  const next=state.tasks.find(t=>t.id===old.id);if(!data.values.selectedTaskIds.includes(old.id)){assert.deepEqual(next,old);continue;}
  const audit=next.responsibilityTransfers.at(-1);assert.deepEqual(audit,{id:audit.id,taskId:old.id,customerId:old.customerId,dealId:old.dealId,source:'yearwheel',sourceTransferId:parent.id,action:'transfer',fromRecordedProfileId:old.ownerProfileId,fromProfileId:parent.fromProfileId,toProfileId:parent.toProfileId,fromOwner:old.owner,toOwner:parent.toOwner,fromDisplayName:parent.fromDisplayName,toDisplayName:parent.toDisplayName,reason:parent.reason,at:parent.at,byId:parent.byId,byMemberId:parent.byMemberId,byName:parent.byName});
  assert.deepEqual(next,{...old,owner:parent.toOwner,ownerProfileId:parent.toProfileId,responsibilityTransfers:[...old.responsibilityTransfers,audit]});
 }
 for(const name of ['orders','deals','meetings','settings','notices','companyEvents'])assert.deepEqual(state[name],opened[name]);
 const addedEvents=state.events.filter(e=>!opened.events.some(old=>old.id===e.id));assert.equal(addedEvents.length,1);assert.equal(addedEvents[0].kind,'yearwheel_responsibility_transfer');assert.equal(addedEvents[0].customerId,customerId);
 const archive=(await read(atomic.id)).data[0];assert.equal(archive.archived,true);assert.equal(archive.revision,atomic.revision+1);assert.deepEqual(archive.data,atomic.data);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').bind(space,atomicRequestId).first()).n,1);
 const committedRaw=await except(before,['crm_spaces','crm_customers','crm_tasks','crm_events','crm_mutations','crm_drafts'],'Native private reviewed parent/task/event/ledger/archive atomic commit');
 assert.equal((await request('/api/crm',intent)).status,200);await unchanged(committedRaw,'Repeated exact CRM replay');
 await reject(atomic,{data:{...data,values:{...data.values,reason:data.values.reason+'changed'}},status:409,requestId:atomicRequestId,opened});
 await reject(atomic,{status:409,opened});
 const late=await write({...atomic,requestId:crypto.randomUUID(),data:{...atomic.data,values:{...atomic.data.values,reason:'Försenad privat autosparning'}}});assert.equal(late.status,409);await unchanged(committedRaw,'Late autosave cannot resurrect consumed handover');

 // Different requests contend over one private revision across the actual
 // HTTP boundary. Updating and consuming that revision cannot both succeed.
 const updateConsume=await make({targetProfileId:source.profile.id,selectedTaskIds:[],reason:'  Konkurrerande privat skrivning och överlämning  '}),consumeOpened=state,consumeId=crypto.randomUUID(),consumeBefore=await raw();
 const contention=await Promise.all([
  write({...updateConsume,requestId:crypto.randomUUID(),data:{...updateConsume.data,values:{...updateConsume.data.values,reason:'Nyare privat enhetsversion'}}}),
  business(consumeOpened,input(updateConsume),consumeId)
 ]);
 assert.deepEqual(contention.map(r=>r.status).sort(),[200,409],JSON.stringify(contention));
 const contentionDraft=(await read(updateConsume.id)).data[0];state=await get();
 if(contention[0].status===200){assert.equal(contentionDraft.archived,false);assert.deepEqual(contentionDraft.data,contention[0].data.data);assert.equal(state.version,consumeOpened.version);await except(consumeBefore,['crm_drafts'],'Private save wins actual HTTP consume race');}
 else {assert.equal(contentionDraft.archived,true);assert.equal(state.version,consumeOpened.version+1);assert.deepEqual(contentionDraft.data,updateConsume.data);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').bind(space,consumeId).first()).n,1);await except(consumeBefore,['crm_spaces','crm_customers','crm_events','crm_mutations','crm_drafts'],'Private publication wins actual HTTP save race');}

 // The first successful response is deliberately dropped before reading its
 // body. An exact retry finds one durable commit, audit, event and archive.
 const droppedTarget=needOf(state).ownerProfileId===source.profile.id?target.profile.id:source.profile.id;
 const lostAck=await make({targetProfileId:droppedTarget,selectedTaskIds:[],reason:'  Syntetisk första förlorad HTTP-kvittens  '}),lostOpened=state,lostId=crypto.randomUUID(),lostIntent=payload(lostOpened,input(lostAck),lostId),lostBefore=await raw();
 const dropped=await fetch(new URL('/api/crm',ready),{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(lostIntent)});assert.equal(dropped.status,200);await dropped.body.cancel();
 state=await get();assert.equal(state.version,lostOpened.version+1);assert.equal(needOf(state).responsibilityTransfers.length,needOf(lostOpened).responsibilityTransfers.length+1);assert.equal(needOf(state).ownerProfileId,droppedTarget);assert.deepEqual(state.tasks,lostOpened.tasks);
 const lostArchive=(await read(lostAck.id)).data[0];assert.equal(lostArchive.archived,true);assert.equal(lostArchive.revision,lostAck.revision+1);assert.deepEqual(lostArchive.data,lostAck.data);
 assert.equal(state.events.filter(e=>!lostOpened.events.some(old=>old.id===e.id)).length,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').bind(space,lostId).first()).n,1);
 const lostRaw=await except(lostBefore,['crm_spaces','crm_customers','crm_events','crm_mutations','crm_drafts'],'First dropped successful HTTP response');
 assert.equal((await request('/api/crm',lostIntent)).status,200);await unchanged(lostRaw,'Lost first-success acknowledgement exact replay adds nothing');
 await reject(lostAck,{data:{...input(lostAck),values:{...lostAck.data.values,reason:'Different lost acknowledgement intent'}},status:409,requestId:lostId,opened:lostOpened});

 // Unknown private contexts are opaque recovery data. The raw-copy endpoint
 // must preserve exact bytes; shared CRM backup must exclude them. The existing
 // full-file harness invokes stageRestore/assertRestore for destination proof.
 const unknownId=prefix+'-future-live',marker='CRM75_PRIVATE_RAW_FUTURE_'+suffix,unknownRaw=' { "future": "'+marker+'", "values": {"reason":"  raw\\n text  "}, "unknown": true }\n';
 const unknownRow=async(workspace,id)=>{
  await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?)').bind(workspace,own,id,'form','future_yearwheel_context',17,crypto.randomUUID(),'Syntetisk framtida privat återhämtning',unknownRaw,'2026-10-09T09:00:00.000Z').run();
 };
 await unknownRow(space,unknownId);
 const copyBefore=await raw(),copy=await request('/api/crm/drafts/copy?space=live');assert.equal(copy.status,200,JSON.stringify(copy.data));assert.equal(copy.data.integrity.sha256,createHash('sha256').update(JSON.stringify(copy.data.records)).digest('hex'));
 assert.equal(copy.data.records.find(row=>row.id===unknownId).dataRaw,unknownRaw);
 assert.deepEqual(JSON.parse(copy.data.records.find(row=>row.id===atomic.id).dataRaw),atomic.data);await unchanged(copyBefore,'Known and unknown private raw-copy is read-only');
 assert.ok(!JSON.stringify(await get()).includes(marker));
 let privateRestoreSnapshot;
 const evidence={yearwheelPrivateNativeUnfinishedRawAndFullContext:true,yearwheelPrivateNativeOwnAdminWorkspaceScopes:true,yearwheelPrivateNativeStrictEnvelopeAndChangedRequestDenied:true,yearwheelPrivateNativeFormerAdminReadExactArchive:true,yearwheelPrivateNativeActualAccountRevocationsDenied:true,yearwheelPrivateNativeExactBodyAndRevisionConsumption:true,yearwheelPrivateNativeStaleTaskProfileContextDenied:true,yearwheelPrivateNativeExplicitReviewPreservesRawIntent:true,yearwheelPrivateNativeSimultaneousRevisionCAS:true,yearwheelPrivateNativeParentSelectedTaskAuditEventLedgerArchiveAtomic:true,yearwheelPrivateNativeSQLFailureAll18TablesR2Rollback:true,yearwheelPrivateNativeDoubleClickDroppedResponseExactReplay:true,yearwheelPrivateNativeHTTPAutosaveConsumptionRace:true,yearwheelPrivateNativeLateAutosaveDenied:true,yearwheelPrivateNativeOpaqueRawCopy:true};
 console.log('PASS private yearwheel responsibility native built HTTP: '+JSON.stringify(evidence));
 return {
  evidence,
  assertExport(records){assert.ok(!records.join('\n').includes(marker),'Shared complete-file CRM stream excludes private unknown-context bytes');assert.ok(!records[0].includes(atomic.id),'Shared state excludes private handover identity');},
  async stageRestore(){await unknownRow('demo',prefix+'-future-demo');privateRestoreSnapshot=(await raw()).tables.crm_drafts;},
  async assertRestore(sourceState,restored){
   assert.deepEqual(restored.customers.find(c=>c.id===customerId),sourceState.customers.find(c=>c.id===customerId));
   for(const task of sourceState.tasks.filter(t=>t.customerId===customerId))assert.deepEqual(restored.tasks.find(t=>t.id===task.id),task,'Full-file native restore preserves exact reviewed task profile/audit');
   assert.deepEqual((await raw()).tables.crm_drafts,privateRestoreSnapshot,'Full-file native restore preserves all exact private source rows and archived unknown destination raw bytes');
   evidence.yearwheelPrivateNativeSharedStreamAndDestinationOpaqueRestore=true;
  }
 };
}
