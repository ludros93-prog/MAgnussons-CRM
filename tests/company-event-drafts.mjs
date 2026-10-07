import assert from 'node:assert/strict';

// Selecting a private server comparison must preserve unfinished raw values.
// It cannot repair a malformed envelope or choose a different event/identity.
export function verifyCompanyEventDraftServerVersions({CompanyEventSchema,contracts,conflicts}) {
 const id='synthetic-event-server-comparison',base=CompanyEventSchema.parse({id:'synthetic-existing-event',title:'Syntetiskt originalevent',date:'2026-10-07',owner:'Syntetisk ansvarig'});
 const envelope=original=>({draftId:id,type:'company_event',base:original,values:{...original,title:'  Ofärdigt privat event  ',date:'ej valt ännu',owner:'',notes:'  Rå privat text\nmed radbrytning  ',checklist:[{id:'',title:'',owner:'',due:'inte bestämt',done:false}]},expectedContext:original.id?conflicts.recordBasis(original):conflicts.recordBasis(null),initialData:conflicts.recordBasis(original)});
 const active={id,kind:'form',context:'company_event',revision:3,requestId:'f7e92f7e-3984-480a-95f8-5c87d856baf0',title:'  Privat rå titel  ',data:envelope(base),archived:false,updatedAt:'2026-10-07T00:00:00.000Z'};
 const archived={...active,revision:4,archived:true},newBase={...base,id:'',title:'',date:'',owner:''},newDraft={...active,data:envelope(newBase)};
 for(const record of [active,archived,newDraft]) {
  const before=JSON.stringify(record);
  assert.strictEqual(contracts.companyEventDraftServerVersion(record,id,record.data.base.id),record,'Inspection must return the exact raw active/archived/new server object.');
  assert.equal(JSON.stringify(record),before,'Reading a comparison must not normalize private text or mutate the original basis.');
 }
 const invalid=[
  ['different requested draft',active,'another-private-event',base.id],
  ['different envelope draft',{...active,data:{...active.data,draftId:'another-private-event'}},id,base.id],
  ['wrong kind',{...active,kind:'catalog'},id,base.id],
  ['wrong context',{...active,context:'article'},id,base.id],
  ['unsaved revision',{...active,revision:0},id,base.id],
  ['fractional revision',{...active,revision:1.5},id,base.id],
  ['invalid persisted request ID',{...active,requestId:'not-a-uuid'},id,base.id],
  ['changed original target',{...active,data:envelope({...base,id:'synthetic-other-event'})},id,base.id],
  ['unexpected envelope field',{...active,data:{...active.data,unexpected:'not an event envelope field'}},id,base.id],
  ['unexpected private value',{...active,data:{...active.data,values:{...active.data.values,unexpected:'not an event field'}}},id,base.id],
  ['wrong original basis',{...active,data:{...active.data,expectedContext:conflicts.recordBasis(null)}},id,base.id],
  ['wrong initial values',{...active,data:{...active.data,initialData:'spoofed original'}},id,base.id],
  ['changed private target',{...active,data:{...active.data,values:{...active.data.values,id:'synthetic-other-event'}}},id,base.id]
 ];
 const missingArchive=structuredClone(active);delete missingArchive.archived;invalid.push(['missing explicit archived state',missingArchive,id,base.id]);
 const missingValue=structuredClone(active);delete missingValue.data.values.status;invalid.push(['missing private default',missingValue,id,base.id]);
 const normalizedOriginal={...base,title:'  '+base.title+'  '};invalid.push(['normalizing registered original',{...active,data:envelope(normalizedOriginal)},id,base.id]);
 assert.equal(CompanyEventSchema.safeParse(normalizedOriginal).success,true,'The original fixture must exercise business normalization rather than an invalid event.');
 for(const [label,record,draftId,eventId] of invalid) {
  const before=JSON.stringify(record);
  assert.equal(contracts.companyEventDraftServerVersion(record,draftId,eventId),null,'An unsafe private comparison cannot be selected: '+label);
  assert.equal(JSON.stringify(record),before,'Rejected comparisons remain intact for reading/copying: '+label);
 }
 console.log('PASS company-event draft server comparison: 3 exact raw active/archived/new records; '+invalid.length+' rejected identity, persisted-state, target and envelope/normalization cases; no input mutation.');
 return {accepted:3,rejected:invalid.length};
}

// These are the authenticated HTTP handlers and real SQLite transaction gate.
// All event titles, actors and private notes are fictitious test data. R2 bytes
// and every unrelated application table are audited without exporting content.
export async function verifyCompanyEventDrafts({core,sqlite,get,api,draftApi,conflicts,objects}) {
 const {CompanyEventSchema}=await import('../work/operations.mjs'),contracts=await import('../work/company-event-drafts.mjs');
 const comparison=verifyCompanyEventDraftServerVersions({CompanyEventSchema,contracts,conflicts});
 const suffix=crypto.randomUUID(),space='live';let state=await get(space);await get('demo');
 const owner=state.settings.owners[0];assert.ok(owner,'The isolated event fixture requires a configured responsible seller.');
 const counts={privateWrites:0,eventRequests:0,rejected400:0,rejected403:0,rejected409:0,privateCasRaces:0,sqlDraftRaces:0,sqlWorkspaceRaces:0,sqlRoleRaces:0,privateRoleRaces:0,doubleClickPairs:0,exactReplays:0};
 const accounts=Object.fromEntries(['seller','admin','other','reader','production','warehouse','print'].map(role=>{
  const id='company-event-draft-'+role+'-'+suffix;return [role,{id,user:id+'-user',email:id+'@example.test',role:role==='other'?'seller':role}];
 }));
 for(const a of Object.values(accounts))sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(a.id,a.email,a.user,'Syntetisk privat eventaktör',a.role,['seller','admin'].includes(a.role)?owner:'');
 const identity=a=>({'oai-authenticated-user-id':a.user,'oai-authenticated-user-email':a.email});
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));
 assert.equal(tableNames.length,18,'Audit all 18 application tables, not only the event and draft tables.');
 const quoted=name=>'"'+name.replaceAll('"','""')+'"';
 const raw=()=>({tables:Object.fromEntries(tableNames.map(name=>{
  const columns=sqlite.prepare('PRAGMA table_info('+quoted(name)+')').all().map(c=>quoted(c.name));
  return [name,sqlite.prepare('SELECT * FROM '+quoted(name)+' ORDER BY '+columns.join(',')).all()];
 })),objects:new Map(Array.from(objects,([key,bytes])=>[key,new Uint8Array(bytes)]))});
 const unchanged=(before,message)=>assert.deepEqual(raw(),before,message);
 const unchangedExcept=(before,allowed,message)=>{
  const after=raw();for(const name of tableNames)if(!allowed.includes(name))assert.deepEqual(after.tables[name],before.tables[name],message+' ('+name+')');
  assert.deepEqual(after.objects,before.objects,message+' (R2 object keys and bytes)');
 };
 const unchangedExceptDrafts=(before,message)=>unchangedExcept(before,['crm_drafts'],message);
 const event=id=>state.companyEvents.find(e=>e.id===id);
 const fresh=(label,patch={})=>CompanyEventSchema.parse({title:'Syntetiskt företagsevent '+label+' '+suffix,date:core.day(),endDate:core.plusDays(core.day(),1),owner,notes:'Fiktiva eventanteckningar '+label,checklist:[{id:'synthetic-event-check-'+label+'-'+suffix,title:'Förbered fiktivt underlag',owner,due:core.day(),done:false}],...patch});
 const envelope=(base,values=base,draftId=crypto.randomUUID())=>({draftId,type:'company_event',values,base,expectedContext:base.id?conflicts.recordBasis(base):conflicts.recordBasis(null),initialData:conflicts.recordBasis(base)});
 const input=draft=>({...structuredClone(draft.data.values),expectedContext:draft.data.expectedContext,draft:{id:draft.id,revision:draft.revision}});
 async function readDraft(id='',account=accounts.seller,workspace=space) {
  const before=raw(),r=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space:workspace,...(id?{id}:{})}),{headers:identity(account)}));
  const result={status:r.status,data:await r.json()};unchanged(before,'Reading private events cannot change any application table or R2 object');return result;
 }
 async function writeDraft(data,account=accounts.seller,workspace=space) {
  counts.privateWrites++;
  const r=await draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...identity(account),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,...data})}));
  return {status:r.status,data:await r.json()};
 }
 async function business(st,data,{account=accounts.seller,requestId=crypto.randomUUID(),workspace=space}={}) {
  counts.eventRequests++;
  const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...identity(account),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,version:st.version,requestId,type:'company_event',data})}));
  const result={status:r.status,data:await r.json(),id:requestId};
  if(r.status===400)counts.rejected400++;if(r.status===403)counts.rejected403++;if(r.status===409)counts.rejected409++;return result;
 }
 const direct=(st,data,options)=>business(st,{...data,expectedContext:conflicts.companyEventBasis(st,data.id||'')},options);
 async function fixture(base) {
  const before=raw(),r=await direct(state,base);assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);
  unchangedExcept(before,['crm_spaces','crm_company_events','crm_mutations'],'Creating an event fixture cannot modify orders, commercial history, other business rows or files');
  const saved=state.companyEvents.find(e=>e.title===base.title.trim());assert.ok(saved);return saved;
 }
 async function makeDraft(base,values=base,{account=accounts.seller,draftId=crypto.randomUUID()}={}) {
  const before=raw(),r=await writeDraft({id:draftId,kind:'form',context:'company_event',revision:0,requestId:crypto.randomUUID(),title:'Privat syntetiskt eventunderlag',data:envelope(base,values,draftId)},account);
  assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'Private event autosave cannot change business data');return r.data;
 }
 async function updateDraft(draft,data,account=accounts.seller) {
  const before=raw(),r=await writeDraft({...draft,data,requestId:crypto.randomUUID()},account);assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'Editing a private event cannot change business data');return r.data;
 }
 async function reject(draft,data=input(draft),status=400,options={}) {
  const before=raw(),r=await business(state,data,options);assert.equal(r.status,status,JSON.stringify(r.data));unchanged(before,'Rejected event publication must preserve all 18 raw tables and R2 objects');return r;
 }
 async function publish(draft,{requestId=crypto.randomUUID(),account=accounts.seller}={}) {
  const before=state,rawBefore=raw(),data=input(draft),r=await business(before,data,{requestId,account});assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);assert.equal(state.version,before.version+1);
  const saved=(await readDraft(draft.id,account)).data[0];assert.equal(saved.archived,true);assert.equal(saved.revision,draft.revision+1);assert.deepEqual(saved.data,draft.data);assert.ok(!(await readDraft('',account)).data.some(d=>d.id===draft.id));
  unchangedExcept(rawBefore,['crm_spaces','crm_company_events','crm_drafts','crm_mutations'],'Event publication and private consumption must leave all unrelated business rows and R2 untouched');
  return {before,data,r,saved};
 }

 // Incomplete dates, titles, owners and checklist fields survive exact reload.
 const base=fresh('incomplete'),unfinished={...base,title:'',date:'ej valt ännu',endDate:'',owner:'',notes:'  PRIVATE UNFINISHED EVENT\nRå text  ',checklist:[{id:'',title:'',owner:'',due:'inte bestämt',done:false}]};
 const incomplete=await makeDraft({...base,title:'',date:'',owner:''},unfinished);
 assert.deepEqual((await readDraft(incomplete.id)).data[0].data.values,unfinished);
 assert.ok(!JSON.stringify(await get(space)).includes('PRIVATE UNFINISHED EVENT'),'Private event text must not leak into shared CRM state.');
 assert.deepEqual((await readDraft(incomplete.id,accounts.other)).data,[]);
 assert.deepEqual((await readDraft(incomplete.id,accounts.admin)).data,[],'Administrators cannot read another seller’s private event.');
 assert.deepEqual((await readDraft(incomplete.id,accounts.seller,'demo')).data,[]);
 const retryBefore=raw(),retry=await writeDraft({...incomplete,revision:0});assert.equal(retry.status,200);assert.equal(retry.data.revision,incomplete.revision);unchanged(retryBefore,'An exact private retry cannot add a revision');
 for(const patch of [
  {data:{...incomplete.data,values:{...unfinished,notes:'Different private content with same request ID'}}},
  {title:'Another private title with same request ID'},{archived:true},{kind:'catalog'},{context:'customer'}
 ]) {
  const before=raw(),r=await writeDraft({...incomplete,revision:0,...patch});assert.equal(r.status,409,JSON.stringify(r.data));assert.deepEqual(r.data.current,incomplete);unchanged(before,'A different private event body cannot reuse an acknowledged request ID');
 }
 await reject(incomplete);assert.equal((await readDraft(incomplete.id)).data[0].archived,false);
 const malformed=[
  e=>({...e,draftId:crypto.randomUUID()}),e=>({...e,type:'article'}),e=>({...e,expectedContext:'spoofed original'}),e=>({...e,initialData:'spoofed original'}),
  e=>({...e,values:{...e.values,id:'another-event'}}),e=>({...e,values:{...e.values,extra:'unexpected value'}}),e=>({...e,extra:'unexpected envelope'}),
  e=>({...e,values:{...e.values,checklist:[{id:'private-check',title:'',owner:'',due:'',done:'false'}]}}),
  e=>({...e,values:{...e.values,category:'invented-category'}})
 ];
 const missingField=e=>{const copy=structuredClone(e);delete copy.values.status;return copy;};malformed.push(missingField);
 for(const makeBad of malformed) {
  const id=crypto.randomUUID(),before=raw(),r=await writeDraft({id,kind:'form',context:'company_event',revision:0,requestId:crypto.randomUUID(),title:'Ogiltigt privat eventunderlag',data:makeBad(envelope(base,base,id))});assert.equal(r.status,400,JSON.stringify(r.data));unchanged(before,'Malformed private event envelopes must never write');
 }
 const anonymousBefore=raw();assert.equal((await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=live'))).status,401);unchanged(anonymousBefore,'Unauthenticated private reads cannot write');
 for(const account of [accounts.reader,accounts.production,accounts.warehouse,accounts.print]) {
  const before=raw(),id=crypto.randomUUID(),r=await writeDraft({id,kind:'form',context:'company_event',revision:0,requestId:crypto.randomUUID(),title:'Otillåtet privat event',data:envelope(base,base,id)},account);assert.equal(r.status,403);
  assert.equal((await readDraft('',account)).status,403);await reject(incomplete,input(incomplete),403,{account});unchanged(before,'Server roles deny both event drafts and publication without leaking or writing');
 }
 // Two identities may use the same local draft ID without sharing private data.
 {
  const id=crypto.randomUUID(),mine=await makeDraft(fresh('same-id-A'),undefined,{draftId:id}),other=await makeDraft(fresh('same-id-B'),undefined,{draftId:id,account:accounts.other});
  assert.deepEqual((await readDraft(id)).data[0],mine);assert.deepEqual((await readDraft(id,accounts.other)).data[0],other);assert.notDeepEqual(mine.data,other.data);
 }
 // A real two-device CAS winner remains authoritative; the loser sees that row.
 {
  const draft=await makeDraft(fresh('two-devices')),before=raw();
  const writes=await Promise.all(['Enhet A','Enhet B'].map(notes=>writeDraft({...draft,requestId:crypto.randomUUID(),data:{...draft.data,values:{...draft.data.values,notes}}})));
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);counts.privateCasRaces++;
  const winner=writes.find(r=>r.status===200).data,loser=writes.find(r=>r.status===409).data;
  assert.equal(winner.revision,draft.revision+1);assert.deepEqual(loser.current,winner);assert.deepEqual((await readDraft(draft.id)).data[0],winner);unchangedExceptDrafts(before,'Private CAS cannot update shared event or CRM version');
 }

 const existing=await fixture(fresh('existing')),different=await fixture(fresh('different'));
 const valid=await makeDraft(existing,{...existing,title:'  Publicerad syntetisk aktivitet  ',notes:'  Exact private source text\n  ',checklist:existing.checklist.map(t=>({...t,done:true}))});
 const bound=input(valid);
 await reject(valid,{...bound,draft:{...bound.draft,revision:valid.revision+1}},409);
 await reject(valid,{...bound,draft:{...bound.draft,id:crypto.randomUUID()}},409);
 await reject(valid,bound,409,{account:accounts.other});
 await reject(valid,{...bound,title:bound.title.trim()});
 await reject(valid,{...bound,notes:'Different text than the saved private body'});
 await reject(valid,{...bound,checklist:bound.checklist.map(t=>({...t,done:false}))});
 await reject(valid,{...bound,unexpected:'Publication cannot silently drop this field'});
 await reject(valid,{...bound,id:different.id},409);
 await reject(valid,{...bound,expectedContext:'spoofed original'},409);
 const noBasis=structuredClone(bound);delete noBasis.expectedContext;await reject(valid,noBasis);
 const otherDraft=await makeDraft(different,{...different,title:'Andra privata eventet'});await reject(valid,{...bound,draft:{id:otherDraft.id,revision:otherDraft.revision}});
 {
  const id=crypto.randomUUID(),before=raw(),stored=await writeDraft({id,kind:'catalog',context:'',revision:0,requestId:crypto.randomUUID(),title:'Fel slags privat underlag',data:valid.data});assert.equal(stored.status,200);unchangedExceptDrafts(before,'Wrong-kind test fixture is still private');
  await reject(valid,{...bound,draft:{id,revision:stored.data.revision}});
 }
 const demoBefore=raw(),crossSpace=await business(await get('demo'),bound,{workspace:'demo'});assert.equal(crossSpace.status,409);unchanged(demoBefore,'A live event draft cannot be consumed in demo');
 for(const patch of [{kind:'catalog'},{context:'article'}]) {
  const before=raw(),r=await writeDraft({...valid,...patch,requestId:crypto.randomUUID()});assert.equal(r.status,400);unchanged(before,'Private kind/context cannot change');
 }
 {
  const before=raw(),r=await writeDraft({...valid,requestId:crypto.randomUUID(),data:envelope(different,different,valid.id)});assert.equal(r.status,400);unchanged(before,'A saved event draft cannot switch target IDs');
  const newDraft=await makeDraft(fresh('new-target'));const newBefore=raw(),changed=await writeDraft({...newDraft,requestId:crypto.randomUUID(),data:envelope(existing,existing,newDraft.id)});assert.equal(changed.status,400);unchanged(newBefore,'A new-event draft cannot become an existing-event edit');
 }
 const published=await publish(valid);
 assert.equal(event(existing.id).title,'Publicerad syntetisk aktivitet');assert.equal(event(existing.id).notes,'Exact private source text');assert.equal(event(existing.id).checklist[0].done,true);
 const replayBefore=raw(),replay=await business(published.before,published.data,{requestId:published.r.id});assert.equal(replay.status,200);counts.exactReplays++;unchanged(replayBefore,'An unchanged lost-ack CRM retry cannot publish or archive twice');
 await reject(valid,{...published.data,title:'Different event with same CRM request ID'},409,{requestId:published.r.id});
 await reject(valid,published.data,409,{requestId:published.r.id,account:accounts.other});
 await reject(valid,published.data,409);
 const archivedBefore=raw(),revive=await writeDraft({...valid,requestId:crypto.randomUUID(),data:{...valid.data,values:{...valid.data.values,notes:'Stale autosave after consume'}}});assert.equal(revive.status,409);unchanged(archivedBefore,'Consumed event drafts cannot be revived by stale autosave');

 // Global rereads leave the opening basis frozen. A colleague's related edit
 // needs explicit private review before publication; unrelated events coexist.
 {
  const original=event(existing.id),mine=await makeDraft(original,{...original,notes:'Mitt äldre privata eventarbete'}),opened=state;
  const peer=await direct(opened,{...original,notes:'Kollegans nya eventunderlag'},{account:accounts.other});assert.equal(peer.status,200);state=await get(space);
  assert.deepEqual((await readDraft(mine.id)).data[0].data,mine.data);
  const first=await reject(mine,input(mine),409);assert.equal(first.data.code,'company_event_conflict');
  const beforeRetry=raw(),retry=await business(first.data.state,input(mine),{requestId:first.id});assert.equal(retry.status,409);unchanged(beforeRetry,'A global refresh cannot silently adopt the colleague’s changed event basis');
  await reject(mine,{...input(mine),expectedContext:conflicts.companyEventBasis(state,original.id)});
  const reviewed=await updateDraft(mine,envelope(event(original.id),mine.data.values,mine.id));await publish(reviewed);assert.equal(event(original.id).notes,mine.data.values.notes);
 }
 // Invalid business values are private-editable, but cannot consume the draft.
 for(const [label,patch] of [
  ['end-before-start',{endDate:core.plusDays(core.day(),-1)}],
  ['unknown-owner',{owner:'Unconfigured fictitious owner'}],
  ['duplicate-checklist',{checklist:[{id:'dup',title:'A',owner,due:core.day(),done:false},{id:'dup',title:'B',owner,due:core.day(),done:false}]}],
  ['impossible-date',{date:'2026-02-30'}]
 ]) {
  const draft=await makeDraft(fresh(label),{...fresh(label),...patch});await reject(draft);assert.equal((await readDraft(draft.id)).data[0].archived,false);
 }
 // Autosave winning after private validation must roll back CRM atomically.
 {
  const original=event(existing.id),mine=await makeDraft(original,{...original,notes:'Atomisk eventpublicering'}),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterAutosave;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.sqlDraftRaces++;const r=await writeDraft({...mine,requestId:crypto.randomUUID(),data:{...mine.data,values:{...mine.data.values,notes:'Nyare privat enhetstext'}}});assert.equal(r.status,200);afterAutosave=raw();}return normalBatch(statements);};
  let r;try{r=await business(state,input(mine));}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,409,JSON.stringify(r.data));unchanged(afterAutosave,'Losing private revision must roll back the event, CRM version, ledger and archive together');
  const active=(await readDraft(mine.id)).data[0];assert.equal(active.archived,false);assert.equal(active.revision,mine.revision+1);state=await get(space);
 }
 // A transaction-level workspace race retries unrelated edits against the
 // original basis, but cannot overwrite the same event or consume its draft.
 for(const sameEvent of [false,true]) {
  const original=event(existing.id),mine=await makeDraft(original,{...original,notes:'Mitt eventarbete efter CRM-CAS '+sameEvent}),opened=state,peerId=sameEvent?existing.id:different.id,peer=event(peerId),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterPeer;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.sqlWorkspaceRaces++;const r=await direct(opened,{...peer,notes:'Kollegans CRM-CAS-event '+sameEvent},{account:accounts.other});assert.equal(r.status,200,JSON.stringify(r.data));afterPeer=raw();}return normalBatch(statements);};
  let r;try{r=await business(opened,input(mine));}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,sameEvent?409:200,JSON.stringify(r.data));if(sameEvent)unchanged(afterPeer,'Same-event workspace CAS loss cannot consume or overwrite private work');
  state=await get(space);assert.equal((await readDraft(mine.id)).data[0].archived,!sameEvent);assert.equal(event(peerId).notes,'Kollegans CRM-CAS-event '+sameEvent);if(!sameEvent)assert.equal(event(existing.id).notes,mine.data.values.notes);
 }
 // Permission revocation between validation and commit blocks the complete
 // CRM transaction; only the independently controlled member change remains.
 const revocations=[['reader',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',accounts.seller.id)],['inactive',()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(accounts.seller.id)],['identity',()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('changed-'+accounts.seller.user,accounts.seller.id)]];
 const restoreActor=()=>sqlite.prepare('UPDATE crm_members SET role=?,active=1,user_id=? WHERE id=?').run('seller',accounts.seller.user,accounts.seller.id);
 for(const [label,revoke] of revocations) {
  const original=event(existing.id),mine=await makeDraft(original,{...original,notes:'Nekad eventpublicering '+label}),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterRevoke;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.sqlRoleRaces++;revoke();afterRevoke=raw();}return normalBatch(statements);};
  let r;try{r=await business(state,input(mine));assert.ok(injected);assert.equal(r.status,403,JSON.stringify(r.data));assert.deepEqual(Object.keys(r.data),['error']);unchanged(afterRevoke,'Role/identity revocation must not partially publish, consume or expose CRM state: '+label);}finally{db.batch=normalBatch;restoreActor();}
  assert.equal((await readDraft(mine.id)).data[0].archived,false);state=await get(space);
 }
 // The private SQL authorization gate separately protects create/update/archive.
 {
  const db=globalThis.__crmEnv.DB,prototype=Object.getPrototypeOf(db.prepare('SELECT 1')),normalRun=prototype.run;
  for(const mode of ['create','update','archive']) {
   let draft=mode==='create'?null:await makeDraft(fresh('private-role-'+mode));const id=draft?.id||crypto.randomUUID(),data=draft?{...draft,requestId:crypto.randomUUID(),archived:mode==='archive',data:{...draft.data,values:{...draft.data.values,notes:'Privat rollrace '+mode}}}:{id,kind:'form',context:'company_event',revision:0,requestId:crypto.randomUUID(),title:'Privat rollrace',data:envelope(fresh('private-role-create'),undefined,id)};
   let injected=false,afterRevoke;prototype.run=async function(){if(!injected&&/^(INSERT OR IGNORE INTO|UPDATE) crm_drafts/.test(this.sql)){injected=true;counts.privateRoleRaces++;revocations[0][1]();afterRevoke=raw();}return normalRun.call(this);};
   try{const r=await writeDraft(data);assert.ok(injected);assert.equal(r.status,403,JSON.stringify(r.data));assert.deepEqual(Object.keys(r.data),['error']);unchanged(afterRevoke,'Private role gate must block '+mode+' without a revision, archive or business write');}finally{prototype.run=normalRun;restoreActor();}
  }
 }
 // Double-click and an exact lost-200 retry acknowledge one new event, one
 // mutation ledger row and one private revision increment, never two events.
 {
  const draft=await makeDraft(fresh('double-click')),opened=state,data=input(draft),requestId=crypto.randomUUID(),before=raw(),eventCount=opened.companyEvents.length;
  const clicks=await Promise.all([business(opened,data,{requestId}),business(opened,data,{requestId})]);assert.deepEqual(clicks.map(r=>r.status),[200,200]);counts.doubleClickPairs++;
  state=await get(space);assert.equal(state.version,opened.version+1);assert.equal(state.companyEvents.length,eventCount+1);assert.equal(state.companyEvents.filter(e=>e.title===draft.data.values.title).length,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  const archived=(await readDraft(draft.id)).data[0];assert.equal(archived.archived,true);assert.equal(archived.revision,draft.revision+1);unchangedExcept(before,['crm_spaces','crm_company_events','crm_drafts','crm_mutations'],'A double-click cannot change unrelated rows or files');
  const beforeRetry=raw(),retry=await business(opened,data,{requestId});assert.equal(retry.status,200);counts.exactReplays++;unchanged(beforeRetry,'The lost successful response cannot add a second event, archive or revision');
 }
 // Deletion never turns a saved existing-target draft into a new event.
 {
  const removed=await fixture(fresh('removed')),draft=await makeDraft(removed,{...removed,notes:'Privat arbete för borttaget event'});
  sqlite.prepare('DELETE FROM crm_company_events WHERE space=? AND id=?').run(space,removed.id);state=await get(space);
  await reject(draft,input(draft),409);await reject(draft,{...input(draft),expectedContext:conflicts.recordBasis(null)});
  assert.equal((await readDraft(draft.id)).data[0].archived,false);assert.ok(!event(removed.id));
 }
 // Existing checklist toggles still use the direct, explicit CRM path. They
 // require the current event basis and do not create or consume private drafts.
 {
  const original=event(different.id),before=raw(),r=await direct(state,{...original,checklist:original.checklist.map(t=>({...t,done:!t.done}))});assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);
  assert.equal(event(original.id).checklist[0].done,!original.checklist[0].done);unchangedExcept(before,['crm_spaces','crm_company_events','crm_mutations'],'The direct checklist path must leave every private draft and unrelated row untouched');
 }
 // Administrators have the same own-private workflow, without gaining access
 // to sellers' drafts or changing the publication contract.
 {
  const draft=await makeDraft(fresh('admin-own'),undefined,{account:accounts.admin});assert.deepEqual((await readDraft(draft.id,accounts.seller)).data,[]);await publish(draft,{account:accounts.admin});
 }
 console.log('PASS private company-event drafts: incomplete raw fields and frozen originals; owner/workspace/server roles; strict exact consumption; private/CRM/role CAS rollback; explicit related-basis review; deletion protected; direct checklist retained; atomic publication, lost-ack replay and double-click. '+JSON.stringify({...counts,rawTables:tableNames.length,r2Objects:objects.size,comparison}));
 return {...counts,rawTables:tableNames.length,r2Objects:objects.size,comparison};
}
