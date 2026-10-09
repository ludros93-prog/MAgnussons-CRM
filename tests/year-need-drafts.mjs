import assert from 'node:assert/strict';

// All fixtures are synthetic. This exercises the real authenticated routes and
// their SQLite transaction; it never reads or writes a hosted customer record.
export async function verifyYearNeedDrafts({core,sqlite,get,api,draftApi,conflicts,objects}) {
 const contracts=await import('../work/year-need-drafts.mjs'),year=await import('../work/yearwheel-responsibility.mjs');
 const {NeedSchema}=await import('../work/business.mjs'),store=await import('../work/crm-store.mjs'),sellers=await import('../work/seller-profiles.mjs');
 const suffix=crypto.randomUUID(),space='live',owner='Syntetiskt privat årshjulsansvar '+suffix.slice(0,8);
 const accounts=Object.fromEntries(['seller','other','admin','reader','production','warehouse','print'].map(key=>[key,{id:'year-draft-'+key+'-'+suffix,user:'year-draft-user-'+key+'-'+suffix,email:'year-draft-'+key+'-'+suffix+'@example.test',role:key==='other'?'seller':key}]));
 for(const a of Object.values(accounts))sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(a.id,a.email,a.user,'Syntetisk privat årshjulsaktör',a.role,['admin','seller'].includes(a.role)?owner:'');
 await store.initialize(space);let state=await get(space);await get('demo');const initial=await store.load(space),fixture=structuredClone(initial),profileId=crypto.randomUUID();
 if(!fixture.settings.sellerProfilesInitialized){fixture.settings.sellerProfiles=fixture.settings.owners.map(legacyOwnerName=>sellers.SellerProfileSchema.parse({id:crypto.randomUUID(),legacyOwnerName,displayName:legacyOwnerName,active:true}));fixture.settings.sellerProfilesInitialized=true;}
 fixture.settings.owners.push(owner);fixture.settings.sellerProfiles.push(sellers.SellerProfileSchema.parse({id:profileId,legacyOwnerName:owner,displayName:owner,active:true,memberId:accounts.seller.id}));
 const customerId='year-draft-customer-'+suffix,otherId='year-draft-other-customer-'+suffix;
 fixture.customers.push(...[customerId,otherId].map(id=>core.CustomerSchema.parse({id,name:'Syntetisk privat årshjulskund '+id,owner,ownerProfileId:profileId,status:'active'})));
 assert.equal(await store.commit(space,initial,fixture,crypto.randomUUID()),true);state=await get(space);
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));assert.equal(tableNames.length,18);
 const raw=()=>({tables:Object.fromEntries(tableNames.map(name=>[name,sqlite.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()])),r2:new Map(Array.from(objects,([key,bytes])=>[key,new Uint8Array(bytes)]))});
 const unchanged=(before,label)=>assert.deepEqual(raw(),before,label);
 const except=(before,allowed,label)=>{const after=raw();for(const name of tableNames)if(!allowed.includes(name))assert.deepEqual(after.tables[name],before.tables[name],label+' '+name);assert.deepEqual(after.r2,before.r2,label+' R2');};
 const identity=a=>({'oai-authenticated-user-id':a.user,'oai-authenticated-user-email':a.email});
 const counts={rawReloads:0,privateCasRaces:0,sqlDraftRaces:0,sqlWorkspaceRaces:0,sqlRoleRaces:0,privateRoleRaces:0,sqlProfileRaces:0,sqlCapacityRaces:0,doubleClickPairs:0,exactReplays:0,rejected:0};
 const customer=(id=customerId)=>state.customers.find(c=>c.id===id),need=id=>customer()?.yearNeeds.find(n=>n.id===id);
 const fresh=(label,patch={})=>NeedSchema.parse({title:'Syntetiskt behov '+label+' '+suffix,due:core.plusDays(core.day(),60),leadDays:30,intervalMonths:12,owner,ownerProfileId:profileId,notes:'Fiktivt planeringsunderlag '+label,...patch});
 const envelope=(values,id=crypto.randomUUID(),cid=customerId)=>contracts.createYearNeedDraftEnvelope(state,cid,values,id);
 const input=draft=>({customerId:draft.data.customerId,need:structuredClone(draft.data.values),expectedContext:draft.data.expectedContext,draft:{id:draft.id,revision:draft.revision}});
 async function read(id='',a=accounts.seller,workspace=space){const before=raw(),r=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space:workspace,...(id?{id}:{})}),{headers:identity(a)}));const out={status:r.status,data:await r.json()};unchanged(before,'A private read cannot mutate any application table or file');return out;}
 async function write(data,a=accounts.seller,workspace=space){const r=await draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...identity(a),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,...data})}));return {status:r.status,data:await r.json()};}
 async function business(opened,data,{a=accounts.seller,requestId=crypto.randomUUID(),workspace=space}={}){const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...identity(a),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,version:opened.version,requestId,type:'year_need',data})}));return {status:r.status,data:await r.json(),id:requestId};}
 async function direct(values,cid=customerId,options){const r=await business(state,{customerId:cid,need:values,expectedContext:year.yearNeedEditBasis(state,cid,values.id||'')},options);assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);return customer(cid).yearNeeds.find(n=>n.title===values.title.trim());}
 async function make(values,{id=crypto.randomUUID(),cid=customerId,a=accounts.seller}={}){const before=raw(),e=envelope(values,id,cid),r=await write({id,kind:'form',context:'year_need',revision:0,requestId:crypto.randomUUID(),title:'Privat syntetiskt behov',data:e},a);assert.equal(r.status,200,JSON.stringify(r.data));except(before,['crm_drafts'],'Autosave is private');return r.data;}
 async function update(draft,data){const before=raw(),r=await write({...draft,data,requestId:crypto.randomUUID()});assert.equal(r.status,200,JSON.stringify(r.data));except(before,['crm_drafts'],'Private editing is independent of customer, need and reminder');return r.data;}
 async function reject(draft,data=input(draft),status=400,options={}){const before=raw(),r=await business(state,data,options);assert.equal(r.status,status,JSON.stringify(r.data));counts.rejected++;unchanged(before,'Rejected publication cannot partially change business state, ledger or private revision');return r;}
 async function publish(draft,options={}){const opened=state,before=raw(),data=input(draft),r=await business(opened,data,options);assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);assert.equal(state.version,opened.version+1);const saved=(await read(draft.id,options.a)).data[0];assert.equal(saved.archived,true);assert.equal(saved.revision,draft.revision+1);assert.deepEqual(saved.data,draft.data);except(before,['crm_customers','crm_tasks','crm_events','crm_spaces','crm_mutations','crm_drafts'],'Need/reminder/event/ledger/private archive commit atomically');return {opened,data,r,saved};}

 // Empty/invalid business fields and raw numeric text are valid private work.
 const unfinished=contracts.yearNeedDraftValues(fresh('unfinished'));
 Object.assign(unfinished,{title:'  ',due:'inte valt',leadDays:' 3e ',intervalMonths:'',owner:'',ownerProfileId:'',notes:'  PRIVATE YEAR NEED\nRå text  '});
 const incomplete=await make(unfinished);assert.deepEqual((await read(incomplete.id)).data[0].data.values,unfinished);counts.rawReloads++;
 assert.ok(!JSON.stringify(await get(space)).includes('PRIVATE YEAR NEED'));
 assert.deepEqual((await read(incomplete.id,accounts.other)).data,[]);assert.deepEqual((await read(incomplete.id,accounts.admin)).data,[]);assert.deepEqual((await read(incomplete.id,accounts.seller,'demo')).data,[]);
 const beforeRetry=raw(),retry=await write({...incomplete,revision:0});assert.equal(retry.status,200);assert.deepEqual(retry.data,incomplete);unchanged(beforeRetry,'An exact private retry adds no revision');
 for(const patch of [{title:'Changed same-ID title'},{archived:true},{data:{...incomplete.data,values:{...unfinished,leadDays:'3'}}},{kind:'catalog'}]){const before=raw(),r=await write({...incomplete,revision:0,...patch});assert.equal(r.status,409,JSON.stringify(r.data));assert.deepEqual(r.data.current,incomplete);unchanged(before,'Changed bodies cannot reuse the acknowledged private request ID');}
 const {CompanyEventSchema}=await import('../work/operations.mjs'),eventBase=CompanyEventSchema.parse({title:'Syntetisk giltig annan typ',date:core.day(),owner});
 const eventEnvelope={draftId:incomplete.id,type:'company_event',base:eventBase,values:eventBase,initialData:conflicts.recordBasis(eventBase),expectedContext:conflicts.recordBasis(null)};
 const changedKindBefore=raw(),changedKind=await write({...incomplete,revision:0,context:'company_event',data:eventEnvelope});assert.equal(changedKind.status,409);unchanged(changedKindBefore,'A valid different typed body still cannot reuse an acknowledged yearwheel request ID');
 await reject(incomplete);assert.equal((await read(incomplete.id)).data[0].archived,false);
 const normal=contracts.yearNeedDraftValues(fresh('normal'));
 const malformed=[e=>({...e,draftId:crypto.randomUUID()}),e=>({...e,customerId:otherId}),e=>({...e,type:'company_event'}),e=>({...e,expectedContext:'spoofed basis'}),e=>({...e,initialData:'spoofed original'}),e=>({...e,unexpected:true}),e=>({...e,values:{...e.values,unexpected:true}}),e=>({...e,values:{...e.values,id:'retargeted'}}),e=>({...e,values:{...e.values,leadDays:30}}),e=>({...e,context:{...e.context,customer:null}}),e=>{const copy=structuredClone(e);delete copy.values.status;return copy;}];
 for(const corrupt of malformed){const id=crypto.randomUUID(),before=raw(),r=await write({id,kind:'form',context:'year_need',revision:0,requestId:crypto.randomUUID(),title:'Ogiltigt privat behov',data:corrupt(envelope(normal,id))});assert.equal(r.status,400,JSON.stringify(r.data));unchanged(before,'Malformed private envelopes are not normalized into valid work');counts.rejected++;}
 const parsed=contracts.YearNeedDraftEnvelopeSchema.parse(incomplete.data);assert.deepEqual(parsed,incomplete.data,'Envelope parsing must not trim, default or numerically repair raw values');
 for(const record of [incomplete,{...incomplete,archived:true,revision:2}]){const before=JSON.stringify(record);assert.strictEqual(contracts.yearNeedDraftServerVersion(record,record.id,customerId,''),record);assert.equal(JSON.stringify(record),before);}
 for(const record of [{...incomplete,revision:0},{...incomplete,archived:undefined},{...incomplete,data:{...incomplete.data,unexpected:true}},{...incomplete,requestId:'invalid'}])assert.equal(contracts.yearNeedDraftServerVersion(record,incomplete.id,customerId,''),null);
 assert.equal(contracts.yearNeedDraftServerVersion(incomplete,incomplete.id,otherId,''),null);
 const anonymous=raw();assert.equal((await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=live'))).status,401);unchanged(anonymous,'Anonymous draft access cannot write');
 for(const a of [accounts.reader,accounts.production,accounts.warehouse,accounts.print]){const id=crypto.randomUUID(),before=raw();assert.equal((await write({id,kind:'form',context:'year_need',revision:0,requestId:crypto.randomUUID(),title:'Nekat privat behov',data:envelope(normal,id)},a)).status,403);assert.equal((await read('',a)).status,403);await reject(incomplete,input(incomplete),403,{a});unchanged(before,'Operational and reader roles cannot access private seller forms');}
 {
  const id=crypto.randomUUID(),mine=await make(normal,{id}),other=await make({...normal,notes:'Andra identitetens råtext'},{id,a:accounts.other});assert.deepEqual((await read(id)).data[0],mine);assert.deepEqual((await read(id,accounts.other)).data[0],other);
  const before=raw(),writes=await Promise.all(['Enhet A','Enhet B'].map(notes=>write({...mine,requestId:crypto.randomUUID(),data:{...mine.data,values:{...normal,notes}}})));assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);const winner=writes.find(r=>r.status===200).data,loser=writes.find(r=>r.status===409).data;assert.deepEqual(loser.current,winner);assert.deepEqual((await read(id)).data[0],winner);except(before,['crm_drafts'],'Two-device private CAS leaves CRM untouched');counts.privateCasRaces++;
 }
 const existing=await direct(fresh('existing')),otherNeed=await direct(fresh('other'),otherId);
 const valid=await make({...contracts.yearNeedDraftValues(existing),title:'  Publicerat privat behov  ',notes:'  Exakt rått privat underlag\n  ',leadDays:'030'});
 const bound=input(valid);
 await reject(valid,{...bound,draft:{...bound.draft,revision:valid.revision+1}},409);await reject(valid,bound,409,{a:accounts.other});await reject(valid,{...bound,customerId:otherId},409);
 for(const data of [{...bound,need:{...bound.need,title:bound.need.title.trim()}},{...bound,need:{...bound.need,leadDays:'30'}},{...bound,need:{...bound.need,unexpected:true}},{...bound,unexpected:true}])await reject(valid,data);
 await reject(valid,{...bound,expectedContext:'spoofed basis'},409);
 const noBasis=structuredClone(bound);delete noBasis.expectedContext;await reject(valid,noBasis);
 const retargetBefore=raw(),retarget=await write({...valid,requestId:crypto.randomUUID(),data:envelope(contracts.yearNeedDraftValues(otherNeed),valid.id,otherId)});assert.equal(retarget.status,400);unchanged(retargetBefore,'Acknowledged private work cannot switch its customer or existing/new target');
 const published=await publish(valid);assert.equal(need(existing.id).title,'Publicerat privat behov');assert.equal(need(existing.id).leadDays,30);assert.equal(need(existing.id).notes,'Exakt rått privat underlag');
 assert.equal(state.tasks.find(t=>t.kind==='year:'+existing.id&&!t.done).due,core.plusDays(need(existing.id).due,-30));
 const replayBefore=raw(),replay=await business(published.opened,published.data,{requestId:published.r.id});assert.equal(replay.status,200);unchanged(replayBefore,'Exact successful-request replay adds no need/reminder/private archive');counts.exactReplays++;
 await reject(valid,{...published.data,need:{...published.data.need,notes:'changed same request'}},409,{requestId:published.r.id});await reject(valid,published.data,409);
 const late=raw(),lateWrite=await write({...valid,requestId:crypto.randomUUID(),data:{...valid.data,values:{...valid.data.values,notes:'late autosave'}}});assert.equal(lateWrite.status,409);unchanged(late,'A consumed private revision cannot resurrect through a late autosave');

 // Fresh GET is never an implicit adoption of the original customer/profile/need.
 {
  const draft=await make({...contracts.yearNeedDraftValues(need(existing.id)),notes:'Min oförändrade privata text'}),opening=draft.data.expectedContext;
  await direct({...need(existing.id),notes:'Kollegans aktuella planering',due:core.plusDays(core.day(),80)});
  assert.equal((await read(draft.id)).data[0].data.expectedContext,opening);await reject(draft,input(draft),409);
  const adopted=contracts.adoptYearNeedDraftContext(draft.data,state);assert.equal(adopted.values.notes,draft.data.values.notes);assert.equal(adopted.values.due,draft.data.values.due);assert.equal(adopted.expectedContext,year.yearNeedEditBasis(state,customerId,existing.id));assert.deepEqual(adopted.context.need,need(existing.id));
  const reviewed=await update(draft,adopted);await publish(reviewed);assert.equal(need(existing.id).notes,'Min oförändrade privata text');
 }
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch;
 {
  const draft=await make({...contracts.yearNeedDraftValues(need(existing.id)),notes:'Atomiskt privat underlag'});let injected=false,afterPeer;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;const r=await write({...draft,requestId:crypto.randomUUID(),data:{...draft.data,values:{...draft.data.values,notes:'Nyare enhet'}}});assert.equal(r.status,200);afterPeer=raw();}return normalBatch(statements);};
  try{const r=await business(state,input(draft));assert.ok(injected);assert.equal(r.status,409,JSON.stringify(r.data));unchanged(afterPeer,'Private revision loss rolls back need, reminder, event, ledger and archive');counts.sqlDraftRaces++;}finally{db.batch=normalBatch;}state=await get(space);
 }
 for(const related of [false,true]){
  const draft=await make({...contracts.yearNeedDraftValues(need(existing.id)),notes:'Mitt CAS-underlag '+related}),opened=state;let injected=false,afterPeer;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;const peer=related?need(existing.id):state.customers.find(c=>c.id===otherId).yearNeeds.find(n=>n.id===otherNeed.id),r=await business(opened,{customerId:related?customerId:otherId,need:{...peer,notes:'Kollegans CRM-CAS '+related},expectedContext:year.yearNeedEditBasis(opened,related?customerId:otherId,peer.id)},{a:accounts.other});assert.equal(r.status,200,JSON.stringify(r.data));afterPeer=raw();}return normalBatch(statements);};
  try{const r=await business(opened,input(draft));assert.ok(injected);assert.equal(r.status,related?409:200,JSON.stringify(r.data));if(related)unchanged(afterPeer,'Same-need rebase must preserve the newer CRM row and private work');counts.sqlWorkspaceRaces++;}finally{db.batch=normalBatch;}state=await get(space);assert.equal((await read(draft.id)).data[0].archived,!related);
 }
 const restoreActor=()=>sqlite.prepare('UPDATE crm_members SET role=?,active=1,user_id=? WHERE id=?').run('seller',accounts.seller.user,accounts.seller.id);
 for(const [label,revoke] of [['reader',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',accounts.seller.id)],['inactive',()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(accounts.seller.id)],['identity',()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('changed-user',accounts.seller.id)]]){
  const draft=await make({...contracts.yearNeedDraftValues(need(existing.id)),notes:'Nekad atomicitet '+label});let injected=false,afterRevoke;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;revoke();afterRevoke=raw();}return normalBatch(statements);};
  try{const r=await business(state,input(draft));assert.ok(injected);assert.equal(r.status,403,JSON.stringify(r.data));assert.deepEqual(Object.keys(r.data),['error']);unchanged(afterRevoke,'Actor revocation leaves no partial yearwheel/private write');counts.sqlRoleRaces++;}finally{db.batch=normalBatch;restoreActor();}state=await get(space);
 }
 {
  const prototype=Object.getPrototypeOf(db.prepare('SELECT 1')),normalRun=prototype.run;
  for(const mode of ['create','update','archive']){const draft=mode==='create'?null:await make(normal),id=draft?.id||crypto.randomUUID(),data=draft?{...draft,requestId:crypto.randomUUID(),archived:mode==='archive'}:{id,kind:'form',context:'year_need',revision:0,requestId:crypto.randomUUID(),title:'Privat rollrace',data:envelope(normal,id)};let injected=false,afterRevoke;
   prototype.run=async function(){if(!injected&&/^(INSERT OR IGNORE INTO|UPDATE) crm_drafts/.test(this.sql)){injected=true;sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',accounts.seller.id);afterRevoke=raw();}return normalRun.call(this);};
   try{const r=await write(data);assert.ok(injected);assert.equal(r.status,403);unchanged(afterRevoke,'Private SQL role gate blocks '+mode);counts.privateRoleRaces++;}finally{prototype.run=normalRun;restoreActor();}
  }
 }
 // Creation must recheck the selected profile's actual account at commit time.
 {
  const draft=await make(normal,{a:accounts.admin});let injected=false,afterRevoke;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run('Otillåten senare kontokoppling',accounts.seller.id);afterRevoke=raw();}return normalBatch(statements);};
  try{const r=await business(state,input(draft),{a:accounts.admin});assert.ok(injected);assert.equal(r.status,403,JSON.stringify(r.data));unchanged(afterRevoke,'Selected target account race cannot create a need or consume private data');counts.sqlProfileRaces++;}finally{db.batch=normalBatch;sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run(owner,accounts.seller.id);}state=await get(space);
 }
 {
  const draft=await make({...normal,title:'Syntetiskt dubbelklick '+suffix}),opened=state,data=input(draft),requestId=crypto.randomUUID(),before=raw(),beforeCount=customer().yearNeeds.length;
  const clicks=await Promise.all([business(opened,data,{requestId}),business(opened,data,{requestId})]);assert.deepEqual(clicks.map(r=>r.status),[200,200]);state=await get(space);assert.equal(state.version,opened.version+1);assert.equal(customer().yearNeeds.length,beforeCount+1);assert.equal(customer().yearNeeds.filter(n=>n.title===data.need.title).length,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);assert.equal((await read(draft.id)).data[0].revision,draft.revision+1);except(before,['crm_spaces','crm_customers','crm_tasks','crm_events','crm_mutations','crm_drafts'],'Double-click commits one exact operation');counts.doubleClickPairs++;
 }
 // The already documented 100-active-draft limit is transaction guarded even
 // when a different kind wins between the preflight count and SQL INSERT.
 {
  const a=accounts.other,active=()=>sqlite.prepare('SELECT COUNT(*) AS n FROM crm_drafts WHERE space=? AND user_id=? AND archived=0').get(space,a.user).n;
  while(active()<99){const id=crypto.randomUUID();sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?)').run(space,a.user,id,'note',customerId,1,crypto.randomUUID(),'Syntetisk kapacitetsgräns','{}',new Date().toISOString());}
  const prototype=Object.getPrototypeOf(db.prepare('SELECT 1')),normalRun=prototype.run;
  for(const yearFirst of [true,false]){
   const id=crypto.randomUUID(),peerId=crypto.randomUUID(),yearInput=target=>({id:target,kind:'form',context:'year_need',revision:0,requestId:crypto.randomUUID(),title:'Privat kapacitetsbehov',data:envelope(normal,target)}),noteInput=target=>({id:target,kind:'note',context:customerId,revision:0,requestId:crypto.randomUUID(),title:'Privat kapacitetsnotering',data:{text:'En annan typ av privat arbete'}});let injected=false,afterPeer;
   prototype.run=async function(){if(!injected&&this.sql.startsWith('INSERT OR IGNORE INTO crm_drafts')){injected=true;const r=await write(yearFirst?noteInput(peerId):yearInput(peerId),a);assert.equal(r.status,200);afterPeer=raw();}return normalRun.call(this);};
   try{const r=await write(yearFirst?yearInput(id):noteInput(id),a);assert.ok(injected);assert.equal(r.status,409,JSON.stringify(r.data));assert.equal(active(),100);counts.sqlCapacityRaces++;unchanged(afterPeer,'Mixed private kinds cannot create a 101st draft after losing the SQL capacity gate');}finally{prototype.run=normalRun;sqlite.prepare('DELETE FROM crm_drafts WHERE space=? AND user_id=? AND id=?').run(space,a.user,peerId);}
  }
 }
 // Deleted customers or needs retain their private recovery copy and never
 // turn an old edit into an unrelated creation.
 {
  const removed=await direct(fresh('removed')),draft=await make({...contracts.yearNeedDraftValues(removed),notes:'Bevara borttaget privat mål'}),createDraft=await make(normal,{cid:otherId});
  const current=await store.load(space),next=structuredClone(current);next.customers.find(c=>c.id===customerId).yearNeeds=next.customers.find(c=>c.id===customerId).yearNeeds.filter(n=>n.id!==removed.id);next.tasks=next.tasks.filter(t=>t.kind!=='year:'+removed.id);next.customers=next.customers.filter(c=>c.id!==otherId);next.tasks=next.tasks.filter(t=>t.customerId!==otherId);assert.equal(await store.commit(space,current,next,crypto.randomUUID()),true);sqlite.prepare('DELETE FROM crm_tasks WHERE space=? AND customer_id=?').run(space,otherId);sqlite.prepare('DELETE FROM crm_events WHERE space=? AND customer_id=?').run(space,otherId);sqlite.prepare('DELETE FROM crm_customers WHERE space=? AND id=?').run(space,otherId);state=await get(space);assert.equal(customer(otherId),undefined);assert.equal(need(removed.id),undefined);
  await reject(draft,input(draft),409);await reject(createDraft,input(createDraft),409);assert.equal((await read(draft.id)).data[0].archived,false);assert.equal((await read(createDraft.id)).data[0].archived,false);
 }
 console.log('PASS private yearwheel drafts: raw unfinished numeric/text reload; frozen customer/profile/need; strict raw consumption; private/CRM/member/profile SQL CAS; deleted target recovery; atomic need/reminder/event/ledger/archive and double-click. '+JSON.stringify({...counts,rawTables:tableNames.length,r2Objects:objects.size}));
 return {...counts,rawTables:tableNames.length,r2Objects:objects.size};
}
