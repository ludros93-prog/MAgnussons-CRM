import assert from 'node:assert/strict';

// Pure synthetic domain coverage. API/runtime suites separately verify actual
// member gates, atomic SQL/CAS, replay, files and private-store isolation.
export async function verifyCustomerActivityResponsibility({core,business,ops}){
 const responsibility=await import('../work/task-responsibility.mjs'),sellers=await import('../work/seller-profiles.mjs'),followup=await import('../work/follow-up.mjs'),customers=await import('../work/customer-responsibility.mjs'),dashboard=await import('../work/sales-dashboard.mjs');
 const ids={a:'57000000-0000-4000-8000-000000000001',b:'57000000-0000-4000-8000-000000000002',c:'57000000-0000-4000-8000-000000000003'};
 const owners={a:'Syntetisk aktivitetsägare A',b:'Syntetisk relationsägare B',c:'Syntetisk tredje ägare C'},today=core.day(),future=core.plusDays(today,5),at=today+'T08:00:00.000Z';
 const actor={id:'synthetic-activity-admin',memberId:'synthetic-activity-admin-member',name:'Syntetisk administratör',role:'admin',owner:''};
 function base(kind='csm',recorded=true){
  const st=core.emptyState();st.settings.sellerProfilesInitialized=true;st.settings.owners=Object.values(owners);st.settings.sellerProfiles=Object.keys(ids).map(key=>sellers.SellerProfileSchema.parse({id:ids[key],legacyOwnerName:owners[key],displayName:'Samma syntetiska namn',active:true,memberId:'synthetic-activity-member-'+key}));
  st.customers=[core.CustomerSchema.parse({id:'activity-customer',name:'Syntetisk aktivitetskund',owner:owners.b,ownerProfileId:ids.b,status:kind==='prospecting'?'prospect':'active',contact:'Syntetisk kontakt',email:'synthetic-activity@example.test',phone:'SYNTHETIC-PHONE',decisionMaker:'Syntetisk beslutsroll',lastContact:today,nextReview:future,expectedOrder:future,plan:{nextAction:'Kundplanens aktivitet',nextDate:future,nextNeed:'Syntetiskt kommande behov',nextNeedDate:future,lastReview:today},prospecting:{stage:'qualified',reason:'Syntetisk passform',nextAction:'Syntetisk prospektkontakt',nextDate:future,need:'Syntetiskt bekräftat behov',scope:'Syntetisk omfattning',timing:future,qualifiedAt:at,qualifiedOwner:owners.a,qualifiedOwnerId:ids.a}}),core.CustomerSchema.parse({id:'unrelated-customer',name:'Syntetisk annan kund',owner:owners.c,ownerProfileId:ids.c,status:'active'})];
  st.tasks=[core.TaskSchema.parse({id:'activity-task',customerId:st.customers[0].id,owner:owners.a,ownerProfileId:recorded?ids.a:'',title:'Syntetiskt öppet arbete',due:future,kind}),core.TaskSchema.parse({id:'activity-done',customerId:st.customers[0].id,owner:owners.a,ownerProfileId:ids.a,title:'Syntetisk avslutad uppgift',due:today,done:true,doneAt:at})];
  st.deals=[core.DealSchema.parse({id:'activity-history-won',customerId:st.customers[0].id,owner:owners.a,ownerProfileId:ids.a,title:'Syntetisk historisk affär',stage:'won',confirmed:true,value:1000,cost:600,wonAt:at})];
  st.orders=[core.OrderSchema.parse({id:'activity-history-order',customerId:st.customers[0].id,dealId:st.deals[0].id,owner:owners.a,ownerProfileId:ids.a,stage:'followed',proofRequired:false,proofApproved:false,supplierConfirmed:true,notes:'Syntetiska historiska villkor',deliveryDate:today,deliveredDate:today,invoiceDate:today,invoiceRef:'SYNTHETIC-ACTIVITY-INVOICE',invoiceValue:1000,actualCost:600,invoiceOwner:owners.a,invoiceOwnerId:ids.a,invoiceOwnerSource:'recorded'})];
  st.events=[{id:'activity-history-note',customerId:st.customers[0].id,dealId:'',kind:'note',text:'Syntetisk tidigare intern anteckning',at}];
  return core.normalizeState(st);
 }
 const task=st=>st.tasks.find(row=>row.id==='activity-task'),input=(st,extra={})=>({taskId:task(st).id,targetProfileId:ids.c,reviewed:true,reason:'Granskad syntetisk delegering av endast uppgiften',expectedContext:responsibility.taskResponsibilityBasis(st,task(st).id),...extra});
 const transfer=(st,extra={})=>core.applyAction(st,{type:'task_responsibility_transfer',data:input(st,extra)},actor);
 function rejects(st,payload=input(st),message,by=actor){const before=structuredClone(st);assert.throws(()=>core.applyAction(st,{type:'task_responsibility_transfer',data:payload},by),message);assert.deepEqual(st,before,'Rejected delegation leaves its input unchanged.');}
 function assertTransfer(old,next,target=ids.c,anchor=false){
  const before=task(old),after=task(next),audit=after.responsibilityTransfers.at(-1),profile=next.settings.sellerProfiles.find(row=>row.id===target);
  assert.match(audit.id,/^[0-9a-f-]{36}$/i);assert.equal(new Date(audit.at).toISOString(),audit.at);
  assert.deepEqual(audit,{id:audit.id,taskId:before.id,customerId:before.customerId,dealId:'',source:'task',sourceTransferId:'',action:anchor?'anchor':'transfer',fromRecordedProfileId:before.ownerProfileId,fromProfileId:before.owner===owners.a?ids.a:ids.c,toProfileId:target,fromOwner:before.owner,toOwner:profile.legacyOwnerName,fromDisplayName:'Samma syntetiska namn',toDisplayName:'Samma syntetiska namn',reason:'Granskad syntetisk delegering av endast uppgiften',at:audit.at,byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
  assert.deepEqual(after,{...before,owner:profile.legacyOwnerName,ownerProfileId:profile.id,responsibilityTransfers:[...before.responsibilityTransfers,audit]});
  for(const name of ['customers','deals','orders','meetings','settings','articles','notices','leads','companyEvents'])assert.deepEqual(next[name],old[name],'Delegation leaves '+name+' unchanged.');
  for(const previous of old.tasks.filter(row=>row.id!==before.id))assert.deepEqual(next.tasks.find(row=>row.id===previous.id),previous);
  assert.equal(next.events.length,old.events.length+1);assert.equal(next.events[0].kind,'task_responsibility_transfer');assert.equal(next.events[0].customerId,before.customerId);assert.ok(next.events[0].text.includes(audit.reason));
  for(const previous of old.events)assert.deepEqual(next.events.find(row=>row.id===previous.id),previous);
  const month=today.slice(0,7);for(const metric of ['revenue','yearRevenue','qualified','profit','margin'])assert.equal(dashboard.salesMetrics(next,month,ids.a)[metric],dashboard.salesMetrics(old,month,ids.a)[metric],'Historical '+metric+' stays with A.');
  assert.deepEqual(core.normalizeState(next),next,'New task audit can be parsed without changing history.');
 }
 const labels={csm:'Kundavstämning',csm_need:'Kommande kundbehov',prospecting:'Prospektkontakt'};
 for(const kind of Object.keys(labels)){
  const st=base(kind),before=structuredClone(st),review=responsibility.taskResponsibilityCandidates(st,task(st).id);
  assert.equal(responsibility.taskResponsibilityKind(task(st)),'customer_activity');assert.equal(review.context.typeLabel,labels[kind]);assert.equal(review.blockedReason,'');assert.equal(review.sourceProfile.id,ids.a);assert.equal(review.customer.ownerProfileId,ids.b,'Task and relationship ownership differ explicitly.');
  const frozen=structuredClone(st),freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};freeze(frozen);responsibility.taskResponsibilityCandidates(frozen,task(frozen).id);responsibility.taskResponsibilityBasis(frozen,task(frozen).id);assert.deepEqual(st,before,'Reviews never fill a blank or change facts.');
  const changed=transfer(st);assertTransfer(st,changed);const chained=transfer(changed,{targetProfileId:ids.a});assertTransfer(changed,chained,ids.a);assert.equal(task(chained).responsibilityTransfers.length,2);
  const anchored=base(kind,false);assertTransfer(anchored,transfer(anchored,{targetProfileId:ids.a}),ids.a,true);
  const inactive=base(kind);inactive.settings.sellerProfiles[0].active=false;inactive.settings.owners=inactive.settings.owners.filter(owner=>owner!==owners.a);assertTransfer(inactive,transfer(inactive));assert.equal(transfer(inactive).settings.sellerProfiles[0].active,false);
  rejects(st,input(st,{targetProfileId:ids.a}),/redan/);for(const extra of [{reviewed:false},{reason:'  '},{targetProfileId:'bad-id'},{owner:owners.c},{ownerProfileId:ids.c},{responsibilityTransfers:[]}])rejects(st,input(st,extra));
  for(const role of ['seller','reader','print','warehouse','production'])rejects(st,input(st),/administratör/,{...actor,role});rejects(st,input(st),/administratör/,{...actor,memberId:undefined});
  for(const change of [s=>task(s).title+=' ny',s=>s.customers[0].contact+=' ny',s=>s.customers[0].email='changed@example.test',s=>s.customers[0].ownerProfileId='',s=>s.settings.sellerProfiles[2].memberId='new-synthetic-member',s=>s.settings.sellerProfiles[0].displayName='Nytt syntetiskt namn',s=>{if(kind==='prospecting')s.customers[0].prospecting.nextAction+=' ny';else s.customers[0].plan.nextAction+=' ny';},s=>{if(kind==='prospecting')s.customers[0].prospecting.qualifiedOwnerId='';else s.customers[0].plan.nextNeed+=' ny';}]){
   const peer=structuredClone(st);change(peer);assert.notEqual(responsibility.taskResponsibilityBasis(peer,task(peer).id),input(st).expectedContext);rejects(peer,input(st),/ändrats/);
  }
  const unrelated=structuredClone(st);unrelated.customers[1].name+=' ny';unrelated.settings.monthlyGoal+=1;unrelated.events.push({...unrelated.events[0],id:'synthetic-unrelated-note'});assert.equal(responsibility.taskResponsibilityBasis(unrelated,task(unrelated).id),input(st).expectedContext);
  // Later parent completion/reclassification is history, never grounds to
  // erase or reject an already recorded truthful task handover.
  const historical=structuredClone(changed);historical.customers[0].status='closed';historical.customers[0].plan.nextNeed='';historical.customers[0].plan.nextNeedDate='';historical.customers[0].prospecting.stage='not_relevant';historical.customers[0].prospecting.convertedDealId=historical.deals[0].id;assert.deepEqual(core.normalizeState(historical),historical);assert.ok(responsibility.taskResponsibilityCandidates(historical,task(historical).id).blockedReason);
  for(const patch of [{owner:owners.a},{ownerProfileId:''},{responsibilityTransfers:[]},{kind:'manual'},{customerId:changed.customers[1].id},{dealId:changed.deals[0].id}])assert.throws(()=>core.applyAction(changed,{type:'task',data:{...task(changed),...patch}},actor));
 }
 for(const kind of ['manual','care','meeting_followup']){const st=base(kind);assert.equal(responsibility.taskResponsibilityKind(task(st)),'independent');assert.equal(responsibility.taskResponsibilityContext(st,task(st)),null);const peer=structuredClone(st);peer.customers[0].plan.nextAction+=' ny';peer.customers[0].contact+=' ny';assert.equal(responsibility.taskResponsibilityBasis(peer,task(peer).id),input(st).expectedContext,'Independent tasks retain their previous bounded context.');}
 for(const kind of ['delivery','csm_issue','onboarding','year:synthetic','unknown_kind']){const st=base(kind);assert.equal(responsibility.taskResponsibilityKind(task(st)),null);assert.ok(responsibility.taskResponsibilityCandidates(st,task(st).id).blockedReason);rejects(st);}
 for(const kind of Object.keys(labels)){
  for(const change of [s=>task(s).done=true,s=>task(s).dealId=s.deals[0].id,s=>task(s).customerId='missing-customer',s=>task(s).ownerProfileId=ids.b,s=>s.settings.sellerProfiles[2].active=false,s=>s.customers[0].status='closed']){const st=base(kind);change(st);rejects(st);}
  if(kind==='prospecting')for(const change of [s=>s.customers[0].status='active',s=>s.customers[0].prospecting.convertedDealId=s.deals[0].id,s=>s.customers[0].prospecting.stage='not_relevant']){const st=base(kind);change(st);assert.ok(responsibility.taskResponsibilityCandidates(st,task(st).id).blockedReason);rejects(st);}
  else{const st=base(kind);st.customers[0].status='prospect';rejects(st);}
  if(kind==='csm_need')for(const field of ['nextNeed','nextNeedDate']){const st=base(kind);st.customers[0].plan[field]='';rejects(st);}
 }
 const paused=base('prospecting');paused.customers[0].prospecting.stage='paused';assert.equal(responsibility.taskResponsibilityCandidates(paused,task(paused).id).blockedReason,'');
 // Exact owner copying is an internal, constrained successor operation.
 // It cannot be reused to bind generic/new or unrelated work to a source.
 for(const kind of Object.keys(labels))for(const recorded of [false,true]){
  const before=base(kind,recorded),next=structuredClone(before),source=task(before),successor=core.TaskSchema.parse({...source,id:'synthetic-exact-successor',kind:kind==='csm_need'?'manual':kind,responsibilityTransfers:[]});next.tasks.push(successor);
  const entry={sourceTaskId:source.id,ownerProfileId:source.ownerProfileId},map=new Map([[successor.id,entry]]);responsibility.assignTaskResponsibilities(before,next,undefined,undefined,undefined,map);assert.equal(successor.ownerProfileId,source.ownerProfileId);
  for(const patch of [{customerId:before.customers[1].id},{dealId:before.deals[0].id},{owner:owners.b},{kind:kind==='csm_need'?'csm_need':'care'},{done:true},{doneAt:at}]){
   const bad=structuredClone(next);Object.assign(bad.tasks.at(-1),patch);assert.throws(()=>responsibility.assignTaskResponsibilities(before,bad,undefined,undefined,undefined,map),/ursprungliga/);
  }
  for(const forged of [{...entry,sourceTaskId:'missing-task'},{...entry,ownerProfileId:ids.b}])assert.throws(()=>responsibility.assignTaskResponsibilities(before,structuredClone(next),undefined,undefined,undefined,new Map([[successor.id,forged]])),/ursprungliga/);
  const completed=structuredClone(before);task(completed).done=true;assert.throws(()=>responsibility.assignTaskResponsibilities(completed,structuredClone(next),undefined,undefined,undefined,map),/ursprungliga/);
 }
 for(const kind of ['manual','care','meeting_followup','delivery','linked_csm'])for(const recorded of [false,true]){
  const before=base(kind==='linked_csm'?'csm':kind,recorded);if(kind==='linked_csm')task(before).dealId=before.deals[0].id;
  const next=structuredClone(before),source=task(before),successor=core.TaskSchema.parse({...source,id:'synthetic-invalid-mapped-successor',responsibilityTransfers:[]});next.tasks.push(successor);
  assert.throws(()=>responsibility.assignTaskResponsibilities(before,next,undefined,undefined,undefined,new Map([[successor.id,{sourceTaskId:source.id,ownerProfileId:source.ownerProfileId}]])),/ursprungliga/,'Exact-copy map cannot change established follow-up behavior for '+kind);
 }
 function saveWorkflow(st,kind,reviewed=false){const c=st.customers[0];return core.applyAction(st,{type:kind==='prospecting'?'prospecting':'plan',data:kind==='prospecting'?{customerId:c.id,prospecting:{...c.prospecting,nextAction:'Syntetiskt uppdaterad bearbetning'}}:{customerId:c.id,plan:{...c.plan,nextAction:'Syntetiskt uppdaterad kundplan'},nextReview:future,expectedOrder:c.expectedOrder,reviewDays:c.reviewDays,reviewed}},actor);}
 // Customer-plan/prospect edits cannot take unaudited task ownership back to
 // the relationship owner, nor implicitly anchor a legacy blank UUID.
 for(const kind of Object.keys(labels))for(const recorded of [false,true]){
  const st=base(kind,recorded),old=structuredClone(task(st)),saved=saveWorkflow(st,kind),after=task(saved);assert.equal(after.owner,old.owner);assert.equal(after.ownerProfileId,old.ownerProfileId);assert.deepEqual(after.responsibilityTransfers,[]);assert.equal(saved.customers[0].ownerProfileId,ids.b);
  const delegated=transfer(st),savedDelegated=saveWorkflow(delegated,kind);assert.equal(task(savedDelegated).ownerProfileId,ids.c);assert.deepEqual(task(savedDelegated).responsibilityTransfers,task(delegated).responsibilityTransfers);
  const data={taskId:old.id,expectedContext:followup.followupBasis(st,old.id),outcome:'internal',occurredOn:today,note:'Syntetiskt faktiskt dokumenterat arbete',completed:kind!=='csm_need',nextAction:'Syntetiskt uttryckligt nästa steg',nextDate:future};
  const followed=core.applyAction(st,{type:'follow_up',data},actor),successor=followed.tasks.find(row=>!st.tasks.some(old=>old.id===row.id));assert.ok(successor);assert.equal(successor.owner,old.owner);assert.equal(successor.ownerProfileId,old.ownerProfileId);assert.deepEqual(successor.responsibilityTransfers,[]);assert.equal(successor.kind,kind==='csm_need'?'manual':kind);
  const later=saveWorkflow(followed,kind),same=later.tasks.find(row=>row.id===successor.id);assert.equal(same.owner,old.owner);assert.equal(same.ownerProfileId,old.ownerProfileId);assert.deepEqual(same.responsibilityTransfers,[]);
  if(kind==='csm_need'){assert.deepEqual(task(followed),old);assert.throws(()=>core.applyAction(st,{type:'follow_up',data:{...data,completed:true}},actor),/arbetsflöde/);assert.throws(()=>core.applyAction(st,{type:'task',data:{...old,done:true}},actor),/arbetsflöde/);}
  const whollyNew=base(kind,recorded);whollyNew.tasks=whollyNew.tasks.filter(row=>row.id!=='activity-task');const generated=saveWorkflow(whollyNew,kind).tasks.find(row=>row.kind===kind&&!row.done);assert.ok(generated);assert.equal(generated.owner,owners.b);assert.equal(generated.ownerProfileId,ids.b);assert.deepEqual(generated.responsibilityTransfers,[]);
 }
 // Customer bundle policy stays independent: these activities are never
 // silently selected with the relationship or commercial parent.
 for(const kind of Object.keys(labels)){const st=base(kind);assert.ok(!customers.customerResponsibilityCandidates(st,st.customers[0].id).eligible.some(row=>row.id===task(st).id));}
 console.log('PASS customer activity responsibility: only open no-deal csm/csm_need/prospecting delegation, shared labels/context, real immutable UUID audit chain, independent parent/results, legacy/inactive/strict-role/context gates, unchanged historical eligibility and protected need completion, preserved unaudited owners and exact successor UUIDs. Synthetic pure domain only.');
}
