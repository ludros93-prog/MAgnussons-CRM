import assert from 'node:assert/strict';

export async function verifyWorkflowSafety({core,get,post,headers,api,conflicts}) {
  const today=core.day();
  let state=await get('live');
  const owner=state.settings.owners[0];
  const pairs={};
  for(const kind of ['plan','prospecting','onboarding']) {
    pairs[kind]=[];
    for(const suffix of ['A','B']) {
      let result=await post(state,'customer',{name:'Workflow safety '+kind+' '+suffix,owner,status:kind==='plan'?'active':'prospect',contact:'Testkontakt'},'live');
      assert.equal(result.status,200);state=result.data;
      const c=state.customers.find(c=>c.id===state.mutationResult.customerId);
      pairs[kind].push(c.id);
      if(kind==='onboarding') {
        result=await post(state,'deal',core.DealSchema.parse({customerId:c.id,owner,title:'Första order '+suffix,stage:'won',confirmed:true,value:1000,cost:500,need:'Kläder till personal',decisionMaker:c.contact,solution:'Jackor',quoteRef:'WORKFLOW-'+suffix,decisionDate:today,deliveryDate:core.plusDays(today,20)}),'live');
        assert.equal(result.status,200);state=result.data;
      }
    }
  }
  const input=(st,kind,id,text)=>{
    const c=st.customers.find(c=>c.id===id);
    const context={customerId:id,expectedContext:conflicts.customerWorkflowBasis(st,kind,id)};
    if(kind==='plan')return {...context,plan:{...c.plan,goal:text,nextAction:'Stäm av kundens behov'},nextReview:core.plusDays(today,3),expectedOrder:c.expectedOrder,reviewDays:c.reviewDays,reviewed:false};
    if(kind==='prospecting')return {...context,prospecting:{...c.prospecting,reason:text,nextAction:'Ring testkontakten',nextDate:today}};
    return {...context,onboarding:{...c.onboarding,feedback:text},complete:false};
  };
  const savedText=(st,kind,id)=>{
    const c=st.customers.find(c=>c.id===id);
    return kind==='plan'?c.plan.goal:kind==='prospecting'?c.prospecting.reason:c.onboarding.feedback;
  };
  for(const kind of ['plan','prospecting','onboarding']) {
    const [a,b]=pairs[kind],basis=state,first=input(basis,kind,a,'Mitt öppna underlag');
    const colleague=await post(basis,kind,input(basis,kind,b,'Kollegans andra kund'),'live');
    assert.equal(colleague.status,200);
    const unrelated=await post(basis,kind,first,'live');
    assert.equal(unrelated.status,200,kind+' must allow independent customers at an old workspace version');
    state=unrelated.data;
    assert.equal(savedText(state,kind,b),'Kollegans andra kund');

    const openState=state,stale=input(openState,kind,a,'Mitt osparade arbete');
    const changed=await post(openState,kind,input(openState,kind,a,'Kollegans ändrade underlag'),'live');
    assert.equal(changed.status,200);state=changed.data;
    const conflict=await post(openState,kind,stale,'live');
    assert.equal(conflict.status,409);assert.equal(conflict.data.code,'customer_workflow_conflict');
    const repeated=await post(conflict.data.state,kind,stale,'live',conflict.id);
    assert.equal(repeated.status,409,kind+' must keep the original basis after a workspace refresh');
    assert.equal(savedText(await get('live'),kind,a),'Kollegans ändrade underlag');
    const refreshed=await post(state,kind,input(state,kind,a,'Medvetet inläst underlag'),'live');
    assert.equal(refreshed.status,200);state=refreshed.data;

    const withoutBasis=input(state,kind,a,'Saknar konfliktkontroll');delete withoutBasis.expectedContext;
    const missing=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:'live',version:state.version,requestId:crypto.randomUUID(),type:kind,data:withoutBasis})}));
    assert.equal(missing.status,400,kind+' must require a basis for direct API calls');
    assert.equal((await get('live')).version,state.version);
  }

  // Force a real database CAS loss after validation. The retry may merge an
  // unrelated customer's change, but must recheck the same customer's basis.
  const [a,b]=pairs.plan,db=globalThis.__crmEnv.DB,normalBatch=db.batch;
  for(const sameCustomer of [false,true]) {
    const base=state,myInput=input(base,'plan',a,'Mitt arbete efter CAS'),otherInput=input(base,'plan',sameCustomer?a:b,'Kollegans arbete vid CAS');
    let injected=false;
    db.batch=async statements=>{
      if(!injected){injected=true;const other=await post(base,'plan',otherInput,'live');assert.equal(other.status,200);}
      return normalBatch(statements);
    };
    let result;
    try{result=await post(base,'plan',myInput,'live');}finally{db.batch=normalBatch;}
    assert.ok(injected);assert.equal(result.status,sameCustomer?409:200);
    state=await get('live');
    assert.equal(savedText(state,'plan',a),sameCustomer?'Kollegans arbete vid CAS':'Mitt arbete efter CAS');
    if(!sameCustomer)assert.equal(savedText(state,'plan',b),'Kollegans arbete vid CAS');
  }
  const eventBase=state;
  for(const suffix of ['A','B']) {
    const created=await post(eventBase,'company_event',{title:'Workflow safety event '+suffix,date:today,owner,checklist:[{id:'prepare-'+suffix,title:'Förbered eventet',owner,due:today,done:false}]},'live');
    assert.equal(created.status,200,'new independent events may share the empty event basis');state=created.data;
  }
  const eventIds=['A','B'].map(suffix=>state.companyEvents.find(e=>e.title==='Workflow safety event '+suffix).id);
  const eventInput=(st,id,notes)=>({...st.companyEvents.find(e=>e.id===id),expectedContext:conflicts.companyEventBasis(st,id),notes});
  const [eventA,eventB]=eventIds,openEvents=state;
  let result=await post(openEvents,'company_event',eventInput(openEvents,eventB,'Kollegans andra event'),'live');assert.equal(result.status,200);
  result=await post(openEvents,'company_event',eventInput(openEvents,eventA,'Mitt event'),'live');assert.equal(result.status,200);state=result.data;
  const openEvent=state,staleEvent=eventInput(openEvent,eventA,'Mitt osparade event');
  result=await post(openEvent,'company_event',eventInput(openEvent,eventA,'Kollegans ändrade event'),'live');assert.equal(result.status,200);state=result.data;
  const staleResult=await post(openEvent,'company_event',staleEvent,'live');assert.equal(staleResult.status,409);assert.equal(staleResult.data.code,'company_event_conflict');
  assert.equal((await post(staleResult.data.state,'company_event',staleEvent,'live',staleResult.id)).status,409);
  const staleChecklist={...staleEvent,checklist:staleEvent.checklist.map(t=>({...t,done:true}))};
  assert.equal((await post(state,'company_event',staleChecklist,'live')).status,409,'a checklist click must use the basis of the rendered event');
  assert.equal((await get('live')).companyEvents.find(e=>e.id===eventA).notes,'Kollegans ändrade event');
  result=await post(state,'company_event',eventInput(state,eventA,'Medvetet inläst event'),'live');assert.equal(result.status,200);state=result.data;
  const noEventBasis=eventInput(state,eventA,'Saknar kontroll');delete noEventBasis.expectedContext;
  const noBasis=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:'live',version:state.version,requestId:crypto.randomUUID(),type:'company_event',data:noEventBasis})}));assert.equal(noBasis.status,400);
  for(const sameEvent of [false,true]) {
    const base=state,myEvent=eventInput(base,eventA,'Mitt event efter CAS'),otherEvent=eventInput(base,sameEvent?eventA:eventB,'Kollegans event vid CAS');
    let injected=false;
    db.batch=async statements=>{if(!injected){injected=true;assert.equal((await post(base,'company_event',otherEvent,'live')).status,200);}return normalBatch(statements);};
    try{result=await post(base,'company_event',myEvent,'live');}finally{db.batch=normalBatch;}
    assert.ok(injected);assert.equal(result.status,sameEvent?409:200);state=await get('live');
    assert.equal(state.companyEvents.find(e=>e.id===eventA).notes,sameEvent?'Kollegans event vid CAS':'Mitt event efter CAS');
  }
  console.log('PASS workflow safety: immutable prospect/customer-care/onboarding and event context, independent records, repeated stale saves, required API bases, checklist safety and real CAS revalidation.');
}
