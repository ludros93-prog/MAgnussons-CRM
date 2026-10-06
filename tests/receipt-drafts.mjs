import assert from 'node:assert/strict';

// Authenticated handlers and the real SQLite transaction gate. All names,
// acceptances and dispatch evidence below belong to an isolated test fixture.
// Do not fill in a fresh receipt basis on retries: that would hide lost work.
export async function verifyReceiptDrafts({core,sqlite,get,headers,api,draftApi,orderWork}) {
 const direct=await import('../work/direct-delivery.mjs');
 const space='live',today=core.day(),suffix=crypto.randomUUID();
 const counts={privateWrites:0,receiptRequests:0,rejected400:0,rejected409:0,rejected403:0,exactReplays:0,doubleClickPairs:0,privateCasRaces:0,sqlDraftRaces:0,sqlWorkspaceRaces:0};
 let state=await get(space);
 const owner=state.settings.owners[0];assert.ok(owner,'The isolated fixture needs a configured seller.');
 const accounts=Object.fromEntries(['seller','other','reader','production','warehouse','print'].map(role=>{
  const id='receipt-draft-'+role+'-'+suffix;
  return [role,{id,user:id+'-user',email:id+'@example.test',role:role==='other'?'seller':role}];
 }));
 for(const a of Object.values(accounts))sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(a.id,a.email,a.user,'Syntetisk privat leveransaktör',a.role,a.role==='seller'?owner:'');
 const identity=a=>({'oai-authenticated-user-id':a.user,'oai-authenticated-user-email':a.email});
 const order=(id,st=state)=>st.orders.find(o=>o.id===id);
 const basis=(id,st=state)=>orderWork.receiptBasis(st,id);
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));
 const quoted=name=>'"'+name.replaceAll('"','""')+'"';
 const raw=()=>Object.fromEntries(tableNames.map(name=>{
  const columns=sqlite.prepare('PRAGMA table_info('+quoted(name)+')').all().map(c=>quoted(c.name));
  return [name,sqlite.prepare('SELECT * FROM '+quoted(name)+' ORDER BY '+columns.join(',')).all()];
 }));
 const unchanged=(before,message)=>assert.deepEqual(raw(),before,message);
 const unchangedExceptDrafts=(before,message)=>{
  const after=raw();for(const name of tableNames)if(name!=='crm_drafts')assert.deepEqual(after[name],before[name],message+' ('+name+')');
 };
 async function business(st,type,data,{account=accounts.seller,requestId=crypto.randomUUID(),workspace=space,actorHeaders}={}) {
  if(type==='receipt_issue'||type==='receipt_confirm')counts.receiptRequests++;
  const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...(actorHeaders||identity(account)),'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:workspace,version:st.version,requestId,type,data})}));
  const result={status:r.status,data:await r.json(),id:requestId};
  if(result.status===400)counts.rejected400++;if(result.status===409)counts.rejected409++;if(result.status===403)counts.rejected403++;
  return result;
 }
 async function readDraft(id='',account=accounts.seller,workspace=space,actorHeaders) {
  const r=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space:workspace,...(id?{id}:{})}),{headers:actorHeaders||identity(account)}));
  return {status:r.status,data:await r.json()};
 }
 async function writeDraft(input,account=accounts.seller,workspace=space) {
  counts.privateWrites++;
  const r=await draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...identity(account),'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:workspace,...input})}));
  return {status:r.status,data:await r.json()};
 }
 async function fixture(type,data) {
  const r=await business(state,type,data,{actorHeaders:headers});assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);return r;
 }
 const created=await fixture('customer',{name:'Syntetiskt privat leveransprov '+suffix,contact:'Fiktiv inköpare',owner,status:'active'});
 const customerId=created.data.mutationResult.customerId;
 async function shipped(label) {
  const lineId='private-receipt-line-'+label+'-'+suffix;
  const created=await fixture('catalog_order',{customerId,owner,title:'Syntetisk accepterad leverans '+label+' '+suffix,lines:[{id:lineId,article:'TEST-PRIVATE-RECEIPT-'+label,description:'Fiktiva testplagg',quantity:4,unitPrice:100,unitCost:40}],deliveryDate:today,accepted:true,nextDate:today});
  const id=created.data.mutationResult.orderId;
  await fixture('direct_dispatch',{orderId:id,expectedContext:direct.directBasis(state,id),entries:[{lineId,quantity:4}],dispatchedOn:today,method:'collection',recipient:'Syntetisk mottagare',address:{},evidence:'Fiktiv avhämtningskvittens '+label+' '+suffix,supplierConfirmed:true,noProofNeeded:true});
  assert.ok(orderWork.awaitingReceipt(order(id)));assert.ok(direct.deliveryVerified(state,order(id)));return id;
 }
 const a=await shipped('A'),b=await shipped('B');
 const originalCustomer=structuredClone(state.customers.find(c=>c.id===customerId));
 const originalDeals=structuredClone(state.deals.filter(d=>d.customerId===customerId));
 const commercial=o=>{const copy=structuredClone(o);for(const key of ['deliveryIssue','deliveryNextCheck','stage','deliveredDate','receivedBy','receiptNote'])delete copy[key];return copy;};
 const originals=new Map([a,b].map(id=>[id,commercial(order(id))]));
 const protectBusiness=()=>{
  assert.deepEqual(state.customers.find(c=>c.id===customerId),originalCustomer,'Private receipt work must not invent customer contact or change the customer plan.');
  assert.deepEqual(state.deals.filter(d=>d.customerId===customerId),originalDeals,'Receipt work must preserve accepted prices and quantities.');
  for(const [id,original] of originals)assert.deepEqual(commercial(order(id)),original,'Receipt work must preserve shipping proof, quantities, costs and responsibility.');
 };
 const values=(mode='issue',label='Privat syntetisk text')=>({mode,deliveredDate:today,receivedBy:label+' mottagare',note:label+' kvittensanteckning',message:label+' leveransproblem',nextCheck:core.plusDays(today,2)});
 const envelope=(id,v,st=state)=>({values:v,expectedContext:basis(id,st),customerName:originalCustomer.name,orderTitle:st.deals.find(d=>d.id===order(id,st).dealId).title});
 const payload=(draft,id=draft.context)=>({orderId:id,expectedContext:draft.data.expectedContext,...(draft.data.values.mode==='confirm'?{deliveredDate:draft.data.values.deliveredDate,receivedBy:draft.data.values.receivedBy,note:draft.data.values.note}:{message:draft.data.values.message,nextCheck:draft.data.values.nextCheck}),draft:{id:draft.id,revision:draft.revision}});
 const type=draft=>draft.data.values.mode==='confirm'?'receipt_confirm':'receipt_issue';
 async function makeDraft(id,mode='issue',{data,account=accounts.seller,kind='receipt',draftId=crypto.randomUUID()}={}) {
  const input={id:draftId,kind,context:id,revision:0,requestId:crypto.randomUUID(),title:'Privat syntetiskt leveransbesked',data:data||envelope(id,values(mode))};
  const before=raw(),r=await writeDraft(input,account);assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'A private draft must not change business records');return r.data;
 }
 async function updateDraft(draft,data,account=accounts.seller) {
  const before=raw(),r=await writeDraft({...draft,data,requestId:crypto.randomUUID()},account);assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'Private editing must not change business records');return r.data;
 }
 async function rejected(draft,data=payload(draft),status=400,options={}) {
  const before=raw(),r=await business(state,options.type||type(draft),data,options);assert.equal(r.status,status,JSON.stringify(r.data));unchanged(before,'A rejected receipt publication must preserve every application table.');return r;
 }
 async function published(draft,{requestId=crypto.randomUUID()}={}) {
  const before=state,input=payload(draft),r=await business(before,type(draft),input,{requestId});assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);assert.equal(state.version,before.version+1);
  const saved=(await readDraft(draft.id)).data[0];assert.ok(saved.archived);assert.equal(saved.revision,draft.revision+1);assert.deepEqual(saved.data,draft.data);assert.ok(!(await readDraft()).data.some(d=>d.id===draft.id));protectBusiness();return {before,input,r,saved};
 }

 // An unfinished draft preserves both modes and all five fields across reload.
 const unfinished={mode:'confirm',deliveredDate:'',receivedBy:'PRIVATE UNFINISHED mottagare',note:'PRIVATE UNFINISHED kvittens',message:'PRIVATE UNFINISHED problem',nextCheck:'ej valt ännu'};
 const incomplete=await makeDraft(a,'confirm',{data:envelope(a,unfinished)});
 assert.deepEqual((await readDraft(incomplete.id)).data[0].data,incomplete.data);
 assert.ok(!JSON.stringify(await get(space)).includes('PRIVATE UNFINISHED'));
 assert.deepEqual((await readDraft(incomplete.id,accounts.other)).data,[]);
 assert.deepEqual((await readDraft(incomplete.id,accounts.seller,'demo')).data,[]);
 assert.deepEqual((await readDraft(incomplete.id,accounts.seller,space,headers)).data,[],'An administrator cannot read another seller’s private text.');
 const retryBefore=raw(),retry=await writeDraft({...incomplete,revision:0});assert.equal(retry.status,200);assert.equal(retry.data.revision,1);unchanged(retryBefore,'The exact private request retry must not create a second revision.');
 const switched=await updateDraft(incomplete,{...incomplete.data,values:{...unfinished,mode:'issue'}});
 assert.deepEqual((await readDraft(switched.id)).data[0].data.values,{...unfinished,mode:'issue'});
 for(const patch of [{kind:'production'},{context:b}]) {
  const before=raw(),r=await writeDraft({...switched,...patch,requestId:crypto.randomUUID()});assert.equal(r.status,400);unchanged(before,'A saved draft cannot change its kind or order.');
 }
 for(const bad of [
  {values:'invalid',expectedContext:'x'},
  {values:values(),expectedContext:''},
  {values:values()},
  {...envelope(a,values()),unexpected:'discarded data must not be silently ignored'},
  envelope(a,{...values(),mode:'invalid'}),
  envelope(a,{...values(),receivedBy:'x'.repeat(4001)}),
  envelope(a,{...values(),nextCheck:'x'.repeat(101)}),
  envelope(a,{...values(),unexpected:'invalid field'})
 ]) {
  const before=raw(),r=await writeDraft({id:crypto.randomUUID(),kind:'receipt',context:a,revision:0,requestId:crypto.randomUUID(),title:'Ogiltigt privat underlag',data:bad});assert.equal(r.status,400,JSON.stringify(r.data));unchanged(before,'Malformed receipt envelopes must never write.');
 }
 {
  const before=raw(),r=await writeDraft({id:crypto.randomUUID(),kind:'receipt',context:'missing-order-'+suffix,revision:0,requestId:crypto.randomUUID(),title:'Saknad order',data:envelope(a,values())});assert.equal(r.status,400);unchanged(before,'A receipt draft must belong to an existing order.');
 }
 assert.equal((await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=live'))).status,401);
 for(const account of [accounts.reader,accounts.production,accounts.warehouse,accounts.print]) {
  const before=raw();assert.equal((await readDraft('',account)).status,403);
  assert.equal((await writeDraft({id:crypto.randomUUID(),kind:'receipt',context:a,revision:0,requestId:crypto.randomUUID(),title:'Otillåtet',data:envelope(a,values())},account)).status,403);
  for(const mode of ['confirm','issue']) {
   const d={...switched,data:envelope(a,values(mode))};await rejected(d,payload(d),403,{account});
  }
  unchanged(before,'Private and receipt role denials must preserve every table.');
 }

 // Consumption binds the private owner, exact revision, order, mode, active
 // values and original receipt basis. Unused fields remain private.
 for(const mode of ['issue','confirm']) {
  const draft=await makeDraft(a,mode),bound=payload(draft);
  await rejected(draft,{...bound,draft:{...bound.draft,revision:draft.revision+1}},409);
  await rejected(draft,{...bound,draft:{...bound.draft,id:crypto.randomUUID()}},409);
  await rejected(draft,bound,409,{account:accounts.other});
  const otherOrder=await makeDraft(b,mode);await rejected(draft,{...bound,draft:{id:otherOrder.id,revision:otherOrder.revision}});
  const wrongKind=await makeDraft(a,mode,{kind:'form'});await rejected(draft,{...bound,draft:{id:wrongKind.id,revision:wrongKind.revision}});
  const opposite=mode==='confirm'?'issue':'confirm';await rejected(draft,{...bound,...(opposite==='confirm'?{deliveredDate:today,receivedBy:'Syntetisk annan mottagare',note:''}:{message:'Syntetiskt annat problem',nextCheck:core.plusDays(today,1)})},400,{type:opposite==='confirm'?'receipt_confirm':'receipt_issue'});
  for(const field of mode==='confirm'?['deliveredDate','receivedBy','note']:['message','nextCheck'])await rejected(draft,{...bound,[field]:bound[field]+' ändrat'});
  const staleEnvelope=await makeDraft(a,mode,{data:{...envelope(a,values(mode)),expectedContext:'another-saved-original-basis'}});
  await rejected(staleEnvelope,{...payload(staleEnvelope),expectedContext:basis(a)});
  const demo=await get('demo');await rejected(draft,bound,409,{workspace:'demo',type:type(draft)});assert.deepEqual(await get('demo'),demo);
  const invalidValues=mode==='confirm'?{...draft.data.values,deliveredDate:core.plusDays(today,1)}:{...draft.data.values,nextCheck:core.plusDays(today,-1)};
  const invalid=await updateDraft(draft,{...draft.data,values:invalidValues});await rejected(invalid);assert.equal((await readDraft(invalid.id)).data[0].archived,false);
  const blank=await updateDraft(invalid,{...invalid.data,values:{...invalidValues,[mode==='confirm'?'receivedBy':'message']:''}});await rejected(blank);assert.equal((await readDraft(blank.id)).data[0].archived,false);
 }

 // Same local ID is scoped by private user, with no accidental data adoption.
 {
  const sharedId=crypto.randomUUID(),mine=await makeDraft(a,'issue',{draftId:sharedId}),other=await makeDraft(a,'issue',{draftId:sharedId,account:accounts.other,data:envelope(a,values('issue','Andra säljarens privata text'))});
  assert.deepEqual((await readDraft(sharedId)).data[0],mine);assert.deepEqual((await readDraft(sharedId,accounts.other)).data[0],other);assert.notDeepEqual(mine.data,other.data);
 }
 // Two actual device requests share one saved revision. Exactly one wins.
 {
  const draft=await makeDraft(a),before=raw();
  const writes=await Promise.all(['Enhet A','Enhet B'].map(label=>writeDraft({...draft,requestId:crypto.randomUUID(),data:{...draft.data,values:values('issue',label)}})));
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);counts.privateCasRaces++;
  const winner=writes.find(r=>r.status===200).data,loser=writes.find(r=>r.status===409).data;
  assert.equal(winner.revision,draft.revision+1);assert.deepEqual(loser.current,winner);assert.deepEqual((await readDraft(draft.id)).data[0],winner);unchangedExceptDrafts(before,'Private CAS must not modify CRM');
 }

 // A colleague's issue stays protected after reopening the saved private work
 // and after the client receives a fresh global workspace version.
 {
  const mine=await makeDraft(a),opened=state,local=payload(mine),requestId=crypto.randomUUID();
  const peer=await business(opened,'receipt_issue',{orderId:a,expectedContext:basis(a,opened),message:'Kollegans registrerade syntetiska problem',nextCheck:core.plusDays(today,3)},{account:accounts.other});assert.equal(peer.status,200);state=await get(space);
  assert.deepEqual((await readDraft(mine.id)).data[0].data,mine.data);
  const before=raw(),first=await business(opened,'receipt_issue',local,{requestId});assert.equal(first.status,409);assert.equal(first.data.code,'receipt_conflict');unchanged(before,'A reopened stale private draft cannot replace the colleague issue.');
  const retry=await business(first.data.state,'receipt_issue',local,{requestId});assert.equal(retry.status,409);unchanged(before,'An unchanged retry cannot adopt newer receipt context.');
  await rejected(mine,{...local,expectedContext:basis(a)});assert.equal((await readDraft(mine.id)).data[0].archived,false);protectBusiness();
 }

 // A real private autosave can land after validation but before SQL commit.
 // The transaction gate must leave only that autosave, with no receipt event.
 {
  const mine=await makeDraft(a),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterAutosave;
  db.batch=async statements=>{
   if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')) {
    injected=true;counts.sqlDraftRaces++;
    const saved=await writeDraft({...mine,requestId:crypto.randomUUID(),data:{...mine.data,values:values('issue','Nyare privat arbete från annan enhet')}});assert.equal(saved.status,200);afterAutosave=raw();
   }
   return normalBatch(statements);
  };
  let r;try{r=await business(state,'receipt_issue',payload(mine));}finally{db.batch=normalBatch;}
  assert.ok(injected,'Exercise a real draft revision race at the SQL gate.');assert.equal(r.status,409,JSON.stringify(r.data));unchanged(afterAutosave,'Losing private revision must roll back the entire receipt mutation.');
  const active=(await readDraft(mine.id)).data[0];assert.equal(active.revision,mine.revision+1);assert.equal(active.archived,false);state=await get(space);protectBusiness();
 }
 // A workspace CAS loss rechecks the original receipt basis and exact draft.
 // A different order can proceed; the same order requires explicit review.
 for(const sameOrder of [false,true]) {
  const mine=await makeDraft(a),opened=state,peerId=sameOrder?a:b,db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterPeer;
  const peerInput={orderId:peerId,expectedContext:basis(peerId,opened),message:'Kollegans syntetiska CRM-CAS '+sameOrder,nextCheck:core.plusDays(today,4)};
  db.batch=async statements=>{
   if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')) {
    injected=true;counts.sqlWorkspaceRaces++;
    const peer=await business(opened,'receipt_issue',peerInput,{account:accounts.other});assert.equal(peer.status,200,JSON.stringify(peer.data));afterPeer=raw();
   }
   return normalBatch(statements);
  };
  let r;try{r=await business(opened,'receipt_issue',payload(mine));}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,sameOrder?409:200,JSON.stringify(r.data));
  if(sameOrder)unchanged(afterPeer,'Same-order CAS must preserve the colleague mutation and the private draft.');
  state=await get(space);assert.equal((await readDraft(mine.id)).data[0].archived,!sameOrder);assert.equal(order(peerId).deliveryIssue,peerInput.message);protectBusiness();
 }

 // A genuine double-click sends the same frozen body twice in parallel.
 // Both responses acknowledge one commit and one private archive.
 {
  const draft=await makeDraft(a,'issue',{data:envelope(a,values('issue','Syntetiskt dubbelklick'))}),opened=state,input=payload(draft),requestId=crypto.randomUUID();
  const beforeEvents=new Set(opened.events.map(e=>e.id));
  const clicks=await Promise.all([business(opened,'receipt_issue',input,{requestId}),business(opened,'receipt_issue',input,{requestId})]);
  assert.deepEqual(clicks.map(r=>r.status),[200,200]);counts.doubleClickPairs++;
  state=await get(space);assert.equal(state.version,opened.version+1);assert.equal(state.events.filter(e=>!beforeEvents.has(e.id)).length,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  const archived=(await readDraft(draft.id)).data[0];assert.equal(archived.archived,true);assert.equal(archived.revision,draft.revision+1);protectBusiness();
 }
 // Consume both modes atomically. Deliberately discard the successful result
 // before replaying its frozen body: ledger replay precedes draft/basis gates.
 for(const [id,mode] of [[a,'issue'],[b,'confirm']]) {
  const draft=await makeDraft(id,mode,{data:envelope(id,values(mode,'Exakt syntetisk registrering '+mode))});
  const completed=await published(draft),afterCommit=raw();
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,completed.r.id).n,1);
  const replay=await business(completed.before,type(draft),completed.input,{requestId:completed.r.id});assert.equal(replay.status,200,JSON.stringify(replay.data));counts.exactReplays++;unchanged(afterCommit,'Frozen lost-ack replay must not duplicate any task, event, notice, draft revision or mutation.');
  assert.deepEqual((await readDraft(draft.id)).data[0],completed.saved);
  const field=mode==='issue'?'message':'note';await rejected(draft,{...completed.input,[field]:completed.input[field]+' ändrad'},409,{requestId:completed.r.id});
  await rejected(draft,{...completed.input,expectedContext:basis(id)},409); // A fresh request cannot consume an already archived draft.
  const beforeLate=raw(),late=await writeDraft({...draft,requestId:crypto.randomUUID(),data:{...draft.data,values:values(mode,'Sen automatisk sparning')}});assert.equal(late.status,409);unchanged(beforeLate,'Late autosave must not resurrect an archived receipt draft.');
  if(mode==='confirm'){assert.equal(order(id).receivedBy,draft.data.values.receivedBy);assert.equal(order(id).receiptNote,draft.data.values.note);assert.ok(!orderWork.awaitingReceipt(order(id)));assert.ok(!JSON.stringify(state).includes(draft.data.values.message),'Inactive issue text stays private.');}
  else {assert.equal(order(id).deliveryIssue,draft.data.values.message);assert.ok(orderWork.awaitingReceipt(order(id)));assert.ok(!JSON.stringify(state).includes(draft.data.values.note),'Inactive confirmation text stays private.');}
 }
 assert.ok((await readDraft()).data.every(d=>!d.archived));protectBusiness();
 console.log('PASS private receipt drafts: incomplete five-field/mode reload, strict envelopes, private user/workspace/role isolation, exact consumption, domain rejection, two-device CAS, SQL draft/workspace races, atomic issue/confirmation archives and unchanged lost-ack replay. '+JSON.stringify({...counts,rawTables:tableNames.length}));
}
