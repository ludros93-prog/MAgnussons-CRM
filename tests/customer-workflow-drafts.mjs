import assert from 'node:assert/strict';

// Real SQLite and authenticated HTTP handlers. Only the isolated demo fixture
// is replaced; the live fixture used by the Outlook suite is left intact.
export async function verifyCustomerWorkflowDrafts({core,sqlite,get,headers,api,conflicts}) {
  const store=await import('../work/crm-store.mjs'),draftApi=await import('../work/draft-api.mjs');
  const today=core.day(),yesterday=core.plusDays(today,-1),oldContact=core.plusDays(today,-12),owner='Utkastsprov säljare';
  const kinds=['plan','prospecting','onboarding'];
  const accounts={seller:{id:'workflow-draft-member',user:'workflow-draft-user',email:'workflow-draft@example.test',role:'seller'},other:{id:'workflow-draft-other-member',user:'workflow-draft-other-user',email:'workflow-draft-other@example.test',role:'seller'},reader:{id:'workflow-draft-reader-member',user:'workflow-draft-reader-user',email:'workflow-draft-reader@example.test',role:'reader'},production:{id:'workflow-draft-production-member',user:'workflow-draft-production-user',email:'workflow-draft-production@example.test',role:'production'}};
  const identity=account=>({'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email});
  for(const account of Object.values(accounts))sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,account.user,'Utkastsprov',account.role,account.role==='seller'?owner:'');
  for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');
  await store.initialize('demo');sqlite.prepare('UPDATE crm_spaces SET version=1,settings=? WHERE id=?').run(JSON.stringify(core.emptyState().settings),'demo');
  const fixture=core.emptyState();fixture.settings.owners=[owner];
  const ids={};
  for(const kind of kinds) {
    ids[kind]=[];
    for(const suffix of ['a','b']) {
      const id='workflow-draft-'+kind+'-'+suffix;ids[kind].push(id);
      const customer=core.CustomerSchema.parse({id,name:'Utkastsprov '+kind+' '+suffix,owner,contact:'Verifierad testkontakt',status:kind==='plan'?'active':kind==='onboarding'?'onboarding':'prospect',lastContact:oldContact,nextReview:core.plusDays(today,7),expectedOrder:core.plusDays(today,40),plan:{nextAction:'Stäm av nästa behov',nextDate:core.plusDays(today,7),lastReview:oldContact},onboarding:kind==='onboarding'?{owner,due:core.plusDays(today,3),dealId:id+'-deal',startedAt:yesterday+'T09:00:00Z'}:{}});
      fixture.customers.push(customer);
      fixture.tasks.push(core.TaskSchema.parse({id:id+'-task',customerId:id,owner,title:'Bevarat ursprungligt arbete',due:core.plusDays(today,7),kind:kind==='plan'?'csm':kind==='prospecting'?'prospecting':'onboarding'}));
      fixture.events.push({id:id+'-event',customerId:id,dealId:'',text:'Verifierad äldre historik',kind:'note',at:oldContact+'T09:00:00Z'});
      if(kind==='onboarding') {
        fixture.deals.push(core.DealSchema.parse({id:id+'-deal',customerId:id,owner,title:'Första levererade ordern',stage:'won',confirmed:true,value:1000,cost:600,wonAt:yesterday+'T08:00:00Z'}));
        fixture.orders.push(core.OrderSchema.parse({id:id+'-order',customerId:id,dealId:id+'-deal',owner,stage:'delivered',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:yesterday,deliveredDate:yesterday,invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:''}));
      }
    }
  }
  assert.equal(await store.commit('demo',await store.load('demo'),fixture,crypto.randomUUID()),true);
  let state=await get('demo');
  const customer=(id,st=state)=>st.customers.find(c=>c.id===id);
  const values=(kind,id,text,st=state)=>{
    const c=customer(id,st);
    if(kind==='plan')return {...c.plan,goal:text,nextAction:'Stäm av kundens nästa behov',nextReview:core.plusDays(today,5),expectedOrder:c.expectedOrder,reviewDays:c.reviewDays,reviewed:false};
    if(kind==='prospecting')return {...c.prospecting,reason:text,nextAction:'Ring den verifierade testkontakten',nextDate:core.plusDays(today,2)};
    return {...c.onboarding,feedback:text};
  };
  const envelope=(kind,id,v,st=state,extra={})=>({values:v,expectedContext:conflicts.customerWorkflowBasis(st,kind,id),customerName:customer(id,st)?.name,...extra});
  const payload=(kind,id,v,data)=>kind==='plan'?{customerId:id,expectedContext:data.expectedContext,plan:v,nextReview:v.nextReview,expectedOrder:v.expectedOrder,reviewDays:v.reviewDays,reviewed:v.reviewed??false}:{customerId:id,expectedContext:data.expectedContext,[kind]:v,...(kind==='onboarding'?{complete:false}:{})};
  async function readDraft(id='',account=accounts.seller,space='demo') {
    const r=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space,...(id?{id}:{})}),{headers:identity(account)}));return {status:r.status,data:await r.json()};
  }
  async function writeDraft(input,account=accounts.seller,space='demo') {
    const r=await draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...identity(account),'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space,...input})}));return {status:r.status,data:await r.json()};
  }
  async function business(st,kind,data,{account=accounts.seller,space='demo',requestId=crypto.randomUUID()}={}) {
    const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...identity(account),'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space,version:st.version,requestId,type:kind,data})}));return {status:r.status,data:await r.json(),id:requestId};
  }
  async function makeDraft(kind,id,v,extra={}) {
    const data=envelope(kind,id,v,state,extra),input={id:crypto.randomUUID(),kind,context:id,revision:0,requestId:crypto.randomUUID(),title:customer(id).name+' – '+kind,data};
    const result=await writeDraft(input);assert.equal(result.status,200,JSON.stringify(result.data));return result.data;
  }
  async function updateDraft(draft,data) {
    const result=await writeDraft({...draft,data,requestId:crypto.randomUUID()});assert.equal(result.status,200,JSON.stringify(result.data));return result.data;
  }
  async function publish(kind,id,draft,extra={},options={}) {
    const input={...payload(kind,id,draft.data.values,draft.data),draft:{id:draft.id,revision:draft.revision},...extra},before=state,result=await business(before,kind,input,options);
    assert.equal(result.status,200,JSON.stringify(result.data));state=await get('demo');assert.equal((await readDraft(draft.id)).data[0].archived,true);return {input,result,before};
  }
  async function rejectBusiness(kind,data,status=400,options={}) {
    const before=await store.load('demo'),drafts=sqlite.prepare('SELECT * FROM crm_drafts WHERE space=? ORDER BY user_id,id').all('demo');
    const result=await business(state,kind,data,options);assert.equal(result.status,status,JSON.stringify(result.data));
    assert.deepEqual(await store.load('demo'),before,'Rejected publication must not partially change customer, tasks, events or contact dates.');
    assert.deepEqual(sqlite.prepare('SELECT * FROM crm_drafts WHERE space=? ORDER BY user_id,id').all('demo'),drafts,'Rejected publication must leave private drafts active and intact.');return result;
  }
  assert.equal((await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=demo'))).status,401);
  for(const denied of [accounts.reader,accounts.production]) {
    assert.equal((await readDraft('',denied)).status,403);
    assert.equal((await writeDraft({id:crypto.randomUUID(),kind:'plan',context:ids.plan[0],revision:0,requestId:crypto.randomUUID(),title:'Otillåtet',data:envelope('plan',ids.plan[0],{})},denied)).status,403);
  }
  for(const kind of kinds) {
    const [id,otherId]=ids[kind],original=await store.load('demo'),text='PRIVATE UNFINISHED '+kind;
    // Required business fields may be absent or unfinished in a private draft.
    const incomplete=kind==='plan'?{goal:text,contacts:[{name:'',role:'',email:'inte färdig'}],reviewDays:''}:kind==='prospecting'?{reason:text,nextDate:'ej valt ännu'}:{feedback:text,checks:{contacts:true}};
    const draft=await makeDraft(kind,id,incomplete);
    const reloaded=await readDraft(draft.id);assert.equal(reloaded.status,200);assert.deepEqual(reloaded.data[0].data.values,incomplete);assert.equal(reloaded.data[0].context,id);assert.equal(reloaded.data[0].kind,kind);assert.equal(reloaded.data[0].data.expectedContext,conflicts.customerWorkflowBasis(state,kind,id));
    assert.deepEqual(await store.load('demo'),original);assert.ok(!JSON.stringify(await get('demo')).includes(text));
    assert.deepEqual((await readDraft(draft.id,accounts.other)).data,[]);assert.deepEqual((await readDraft(draft.id,accounts.seller,'live')).data,[]);
    const adminRead=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=demo&id='+draft.id,{headers}));assert.equal(adminRead.status,200);assert.deepEqual(await adminRead.json(),[],'An administrator cannot read another seller’s private work.');
    for(const patch of [{kind:kinds.find(k=>k!==kind)},{context:otherId}]) {
      const rejected=await writeDraft({...draft,...patch,requestId:crypto.randomUUID()});assert.equal(rejected.status,400);assert.deepEqual((await readDraft(draft.id)).data,reloaded.data);
    }
    for(const bad of [{values:'wrong',expectedContext:'x'},{values:{}},{values:{},expectedContext:''}])assert.equal((await writeDraft({id:crypto.randomUUID(),kind,context:id,revision:0,requestId:crypto.randomUUID(),title:'Ogiltigt kuvert',data:bad})).status,400);
    assert.equal((await writeDraft({id:crypto.randomUUID(),kind,context:'missing-workflow-customer',revision:0,requestId:crypto.randomUUID(),title:'Okänd kund',data:envelope(kind,id,{})})).status,400);
    let valid=await updateDraft(draft,envelope(kind,id,values(kind,id,'Publicerat '+kind)));
    const bound=payload(kind,id,valid.data.values,valid.data),ref={id:valid.id,revision:valid.revision};
    await rejectBusiness(kind,{...bound,draft:{...ref,revision:ref.revision+1}},409);
    await rejectBusiness(kind,{...bound,draft:{...ref,id:crypto.randomUUID()}},409);
    await rejectBusiness(kind,{...bound,draft:ref},409,{account:accounts.other});
    const otherValues=values(kind,otherId,'Fel kund'),otherData=envelope(kind,otherId,otherValues);
    await rejectBusiness(kind,{...payload(kind,otherId,otherValues,otherData),draft:ref});
    const otherKind=kinds.find(k=>k!==kind),wrongValues=values(otherKind,id,'Fel typ'),wrongData=envelope(otherKind,id,wrongValues);
    await rejectBusiness(otherKind,{...payload(otherKind,id,wrongValues,wrongData),draft:ref});
    const live=await get('live'),crossSpace=await business(live,kind,{...bound,expectedContext:conflicts.customerWorkflowBasis(live,kind,id),draft:ref},{space:'live'});
    assert.equal(crossSpace.status,409);assert.equal((await readDraft(valid.id)).data[0].archived,false);assert.deepEqual(await get('live'),live);
    // Matching the reference does not permit different values to consume it.
    const altered=structuredClone(bound);if(kind==='plan')altered.plan.goal='Inte det sparade utkastet';else altered[kind][kind==='prospecting'?'reason':'feedback']='Inte det sparade utkastet';
    await rejectBusiness(kind,{...altered,draft:ref});
    const invalidValues={...valid.data.values};if(kind==='plan')invalidValues.nextAction='';else if(kind==='prospecting')invalidValues.reason='';else invalidValues.due='';
    const invalid=await updateDraft(valid,{...valid.data,values:invalidValues});await rejectBusiness(kind,{...payload(kind,id,invalidValues,invalid.data),draft:{id:invalid.id,revision:invalid.revision}});assert.equal((await readDraft(invalid.id)).data[0].archived,false);
    valid=await updateDraft(invalid,{...invalid.data,values:values(kind,id,'Publicerat '+kind)});
    const completed=await publish(kind,id,valid),published=await store.load('demo'),publishedDraft=(await readDraft(valid.id)).data[0];
    const replay=await business(completed.before,kind,completed.input,{requestId:completed.result.id});assert.equal(replay.status,200);assert.deepEqual(await store.load('demo'),published);assert.deepEqual((await readDraft(valid.id)).data[0],publishedDraft);
    await rejectBusiness(kind,{...completed.input,customerId:otherId},409,{requestId:completed.result.id});
    await rejectBusiness(kind,completed.input,409);assert.equal((await writeDraft({...valid,requestId:crypto.randomUUID(),data:{...valid.data,values:incomplete}})).status,409);assert.deepEqual((await readDraft(valid.id)).data[0],publishedDraft);
    assert.equal(customer(id).lastContact,oldContact,kind+' publication without explicit contact/completion cannot invent a customer contact.');
  }
  // Two devices edit one saved draft; one wins and the other retains a conflict.
  const raceKind='plan',raceId=ids.plan[0],raceDraft=await makeDraft(raceKind,raceId,values(raceKind,raceId,'Två enheter'));
  const writes=await Promise.all(['Enhet A','Enhet B'].map(goal=>writeDraft({...raceDraft,requestId:crypto.randomUUID(),data:{...raceDraft.data,values:{...raceDraft.data.values,goal}}})));
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);assert.equal((await readDraft(raceDraft.id)).data[0].revision,raceDraft.revision+1);
  for(const kind of kinds) {
    const [id,otherId]=ids[kind];
    // A colleague's edit stays protected after reload and after a forged fresh basis.
    const stale=await makeDraft(kind,id,values(kind,id,'Mitt äldre privata arbete'));
    const peerValues=values(kind,id,'Kollegans aktuella kundunderlag'),peerData=envelope(kind,id,peerValues),peer=await business(state,kind,payload(kind,id,peerValues,peerData));assert.equal(peer.status,200);state=await get('demo');
    const old=payload(kind,id,stale.data.values,stale.data),staleInput={...old,draft:{id:stale.id,revision:stale.revision}};
    const staleResponse=await rejectBusiness(kind,staleInput,409);assert.equal(staleResponse.data.code,'customer_workflow_conflict');
    assert.equal((await business(staleResponse.data.state,kind,staleInput,{requestId:staleResponse.id})).status,409);
    await rejectBusiness(kind,{...staleInput,expectedContext:conflicts.customerWorkflowBasis(state,kind,id)});
    assert.equal((await readDraft(stale.id)).data[0].archived,false);
    // The saved private revision can change after preflight but before SQL commit.
    const atom=await makeDraft(kind,id,values(kind,id,'Atomisk publicering'));
    const before=await store.load('demo'),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false;
    db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;const update=await writeDraft({...atom,requestId:crypto.randomUUID(),data:{...atom.data,values:values(kind,id,'Nyare arbete på annan enhet')}});assert.equal(update.status,200);}return normalBatch(statements);};
    let result;try{result=await business(state,kind,{...payload(kind,id,atom.data.values,atom.data),draft:{id:atom.id,revision:atom.revision}});}finally{db.batch=normalBatch;}
    assert.ok(injected);assert.equal(result.status,409);assert.deepEqual(await store.load('demo'),before,'Losing the draft gate must roll back the entire business operation.');assert.equal((await readDraft(atom.id)).data[0].archived,false);assert.equal((await readDraft(atom.id)).data[0].revision,atom.revision+1);
    // A workspace CAS loss retries only when the reviewed customer is unchanged.
    for(const sameCustomer of [false,true]) {
      const mine=await makeDraft(kind,id,values(kind,id,'Mitt arbete efter CRM-CAS')),base=state,peerId=sameCustomer?id:otherId,peerValues=values(kind,peerId,'Kollegans CRM-CAS-underlag'),peerInput=payload(kind,peerId,peerValues,envelope(kind,peerId,peerValues));let changed=false;
      db.batch=async statements=>{if(!changed&&statements[0].sql.startsWith('UPDATE crm_spaces')){changed=true;const peer=await business(base,kind,peerInput);assert.equal(peer.status,200,JSON.stringify(peer.data));}return normalBatch(statements);};
      try{result=await business(base,kind,{...payload(kind,id,mine.data.values,mine.data),draft:{id:mine.id,revision:mine.revision}});}finally{db.batch=normalBatch;}
      assert.ok(changed);assert.equal(result.status,sameCustomer?409:200,JSON.stringify(result.data));state=await get('demo');assert.equal((await readDraft(mine.id)).data[0].archived,!sameCustomer);
      const c=customer(id);assert.equal(kind==='plan'?c.plan.goal:kind==='prospecting'?c.prospecting.reason:c.onboarding.feedback,sameCustomer?'Kollegans CRM-CAS-underlag':'Mitt arbete efter CRM-CAS');
    }
  }
  // The day-specific contact statement must come from today's saved envelope.
  const planId=ids.plan[0],contactBefore=customer(planId).lastContact,reviewBefore=customer(planId).plan.lastReview;
  for(const reviewedOn of [undefined,'',yesterday]) {
    const v={...values('plan',planId,'Tidigare avstämningsmarkering'),reviewed:true},draft=await makeDraft('plan',planId,v,reviewedOn===undefined?{}:{reviewedOn});
    await rejectBusiness('plan',{...payload('plan',planId,v,draft.data),draft:{id:draft.id,revision:draft.revision}});
    assert.equal(customer(planId).lastContact,contactBefore);assert.equal(customer(planId).plan.lastReview,reviewBefore);
  }
  let unchecked=await makeDraft('plan',planId,values('plan',planId,'Ingen kontakt registrerad'),{reviewedOn:today});
  await rejectBusiness('plan',{...payload('plan',planId,unchecked.data.values,unchecked.data),reviewed:true,draft:{id:unchecked.id,revision:unchecked.revision}});
  let yesterdayDraft=await makeDraft('plan',planId,{...values('plan',planId,'Bevarad text efter återupptagning'),reviewed:true},{reviewedOn:yesterday});
  yesterdayDraft=await updateDraft(yesterdayDraft,{...yesterdayDraft.data,values:{...yesterdayDraft.data.values,reviewed:false},reviewedOn:''});await publish('plan',planId,yesterdayDraft);assert.equal(customer(planId).lastContact,contactBefore);assert.equal(customer(planId).plan.lastReview,reviewBefore);
  const explicit=await makeDraft('plan',planId,{...values('plan',planId,'Dagens uttryckligen genomförda avstämning'),reviewed:true},{reviewedOn:today});await publish('plan',planId,explicit);assert.equal(customer(planId).lastContact,today);assert.equal(customer(planId).plan.lastReview,today);
  // Completed checklist data does not itself complete onboarding.
  const onboardId=ids.onboarding[0],onboardValues={...values('onboarding',onboardId,'Kundens verifierade återkoppling'),checks:Object.fromEntries(core.ONBOARDING_CHECKS.map(check=>[check.id,true])),nextNeed:'Undersök nästa återköp'};
  let onboard=await makeDraft('onboarding',onboardId,onboardValues);assert.equal(customer(onboardId).onboarding.completedAt,'');assert.equal(customer(onboardId).status,'onboarding');await publish('onboarding',onboardId,onboard);assert.equal(customer(onboardId).onboarding.completedAt,'');assert.equal(customer(onboardId).status,'onboarding');
  onboard=await makeDraft('onboarding',onboardId,customer(onboardId).onboarding);await publish('onboarding',onboardId,onboard,{complete:true});assert.ok(customer(onboardId).onboarding.completedAt);assert.equal(customer(onboardId).status,'active');assert.equal(state.orders.find(o=>o.customerId===onboardId).stage,'followed');
  // Qualifying text is private until published, and creates no deal by autosave.
  const prospectId=ids.prospecting[0],qualifiedValues={...values('prospecting',prospectId,'Verifierad passform'),stage:'qualified',need:'Profiljackor',scope:'20 plagg',timing:core.plusDays(today,35)},qualified=await makeDraft('prospecting',prospectId,qualifiedValues);
  assert.equal(customer(prospectId).prospecting.qualifiedAt,'');assert.ok(!state.deals.some(d=>d.customerId===prospectId));await publish('prospecting',prospectId,qualified);assert.ok(customer(prospectId).prospecting.qualifiedAt);assert.ok(!state.deals.some(d=>d.customerId===prospectId));
  const converted=await business(state,'qualify',{customerId:prospectId});assert.equal(converted.status,200);state=await get('demo');assert.equal(state.deals.filter(d=>d.customerId===prospectId).length,1);
  console.log('PASS private customer workflow drafts: incomplete authenticated autosave, customer/type/workspace isolation, canonical publication, two-device and shared-customer conflicts, atomic draft/CRM CAS, archived retries, explicit contact day and explicit onboarding/qualification.');
}
