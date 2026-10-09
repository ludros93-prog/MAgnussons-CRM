import assert from 'node:assert/strict';

// Pure domain fixtures only. The authenticated SQLite/workerd contract tests
// separately verify commit, permission-race and private-store invariants.
export async function verifySellerProfileRetirement({core,business,ops}) {
 const retirement=await import('../work/seller-profile-retirement.mjs');
 const sellers=await import('../work/seller-profiles.mjs');
 const dashboards=await import('../work/sales-dashboard.mjs');
 business ||= await import('../work/business.mjs');
 ops ||= await import('../work/operations.mjs');
 const ids={a:'55000000-0000-4000-8000-000000000001',b:'55000000-0000-4000-8000-000000000002',legacy:'55000000-0000-4000-8000-000000000003'};
 const names={a:'Syntetisk avvecklingsprofil A',b:'Syntetisk aktiv profil B',legacy:'Syntetisk äldre inaktiv profil'};
 const actor={id:'retirement-admin-user',memberId:'retirement-admin-member',name:'Syntetisk administratör',role:'admin',owner:''};
 const at='2026-09-04T10:00:00.000Z',date='2026-09-04',future='2028-03-31',month='2026-09';
 function base(){
  const st=core.emptyState();st.settings.owners=[names.a,names.b];st.settings.sellerProfilesInitialized=true;
  st.settings.sellerProfiles=Object.keys(ids).map(key=>sellers.SellerProfileSchema.parse({id:ids[key],legacyOwnerName:names[key],displayName:'Samma syntetiska visningsnamn',active:key!=='legacy',memberId:'retirement-member-'+key,linkHistory:[{previousMemberId:'',nextMemberId:'retirement-member-'+key,reason:'Syntetisk kontolänk före avveckling',at,byId:actor.id,byName:actor.name}]}));
  st.settings.sellerGoals[names.a]={[month]:{revenue:5000,grossProfit:null,qualified:3}};st.settings.sellerAnnualGoals[names.a]={'2026':60000};
  st.settings.sellerGoalsById[ids.a]=structuredClone(st.settings.sellerGoals[names.a]);st.settings.sellerAnnualGoalsById[ids.a]=structuredClone(st.settings.sellerAnnualGoals[names.a]);
  st.customers=[core.CustomerSchema.parse({id:'retirement-c-a',name:'Syntetisk historisk kund A',owner:names.a,ownerProfileId:ids.a,status:'closed',contact:'Syntetisk kontakt',prospecting:{qualifiedAt:at,qualifiedOwner:names.a,qualifiedOwnerId:ids.a},onboarding:{owner:names.a,ownerProfileId:ids.a,dealId:'retirement-d-won',startedAt:at,completedAt:at,due:date},plan:{issue:'Syntetiskt löst ärende',issueStatus:'resolved',issueOwner:names.a,issueOwnerProfileId:ids.a},yearNeeds:[business.NeedSchema.parse({id:'retirement-need-done',title:'Syntetiskt hanterat behov',owner:names.a,ownerProfileId:ids.a,due:future,status:'done',completedAt:at}),business.NeedSchema.parse({id:'retirement-need-cancelled',title:'Syntetiskt avbokat behov',owner:names.a,ownerProfileId:ids.a,due:future,status:'cancelled'})]}),core.CustomerSchema.parse({id:'retirement-c-b',name:'Syntetisk aktiv kund B',owner:names.b,ownerProfileId:ids.b,status:'active'})];
  st.deals=[core.DealSchema.parse({id:'retirement-d-won',customerId:'retirement-c-a',owner:names.a,ownerProfileId:ids.a,title:'Syntetisk historisk affär',stage:'won',confirmed:true,wonAt:at,value:1000,cost:600}),core.DealSchema.parse({id:'retirement-d-lost',customerId:'retirement-c-a',owner:names.a,ownerProfileId:ids.a,title:'Syntetisk förlorad affär',stage:'lost',reason:'Syntetisk förlustorsak',nextAction:'Syntetisk avstämning',nextDate:future})];
  st.orders=[core.OrderSchema.parse({id:'retirement-o-history',customerId:'retirement-c-a',dealId:'retirement-d-won',owner:names.a,ownerProfileId:ids.a,stage:'followed',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:date,deliveredDate:date,invoiceDate:date,invoiceRef:'SYNTHETIC-RETIREMENT-INVOICE',invoiceValue:1000,actualCost:600,notes:'Historiska villkor bevaras',invoiceOwner:names.a,invoiceOwnerId:ids.a,invoiceOwnerSource:'recorded'})];
  st.tasks=[core.TaskSchema.parse({id:'retirement-t-done',customerId:'retirement-c-a',owner:names.a,ownerProfileId:ids.a,title:'Syntetiskt avslutad uppgift',due:date,kind:'manual',done:true,doneAt:at})];
  st.meetings=[core.MeetingSchema.parse({id:'retirement-m-done',customerId:'retirement-c-a',owner:names.a,ownerProfileId:ids.a,title:'Syntetiskt genomfört möte',date,time:'10:00',duration:45,status:'done'}),core.MeetingSchema.parse({id:'retirement-m-cancelled',customerId:'retirement-c-a',owner:names.a,ownerProfileId:ids.a,title:'Syntetiskt avbokat möte',date,time:'11:00',duration:45,status:'cancelled'})];
  st.companyEvents=[ops.CompanyEventSchema.parse({id:'retirement-e-history',title:'Syntetisk genomförd företagsaktivitet',owner:names.a,date,status:'done',checklist:[{id:'retirement-check-done',title:'Syntetisk avslutad förberedelse',owner:names.a,due:date,done:true}]})];
  st.events=[{id:'retirement-history-note',customerId:'retirement-c-a',dealId:'',kind:'customer_note',text:'Syntetisk historisk anteckning',at,actor:{id:actor.id,name:actor.name}}];
  return core.normalizeState(st);
 }
 const input=(st,profileId=ids.a)=>({profileId,expectedContext:retirement.sellerProfileRetirementBasis(st,profileId),reviewed:true,reason:'Granskat syntetiskt arbetsunderlag: inget öppet ansvar återstår.'});
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
 const original=base(),originalCopy=structuredClone(original),frozen=freeze(original);
 const review=retirement.sellerProfileRetirementReview(frozen,ids.a);
 assert.equal(review.profile.id,ids.a);assert.equal(review.blockedReason,'');assert.deepEqual(review.blockers,[]);assert.deepEqual(review.remainingProfiles.map(profile=>profile.id),[ids.b]);
 const basis=retirement.sellerProfileRetirementBasis(frozen,ids.a);assert.ok(basis.length>0&&basis.length<3000000);assert.deepEqual(frozen,originalCopy,'Review/basis do not mutate even a frozen graph.');
 const roleless=structuredClone(original);delete roleless.viewer;assert.equal(retirement.sellerProfileRetirementBasis(roleless,ids.a),basis,'Persisted server state needs no viewer to inventory shared work.');
 for(const role of ['seller','reader','print','warehouse','production']){const projected={...frozen,viewer:{id:'test-projected-user',memberId:'test-projected-member',email:'test@example.test',name:'Syntetiskt visningskonto',owner:'',role}};assert.equal(retirement.sellerProfileRetirementBasis(projected,ids.a),basis,'Review authority never comes from a client viewer: '+role);}
 const beforeMetric=dashboards.salesMetrics(frozen,month,ids.a),beforeSeries=dashboards.salesYearSeries(frozen,'2026',ids.a),beforeProfile=structuredClone(review.profile);
 const closed=structuredClone(frozen);retirement.retireSellerProfile(closed,input(closed),actor);
 const closedProfile=closed.settings.sellerProfiles.find(profile=>profile.id===ids.a),audit=closedProfile.retirementHistory[0];
 assert.match(audit.id,/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);assert.equal(new Date(audit.at).toISOString(),audit.at);
 assert.deepEqual({...audit,id:'server-generated',at:'server-generated'},{id:'server-generated',profileId:ids.a,owner:names.a,displayName:beforeProfile.displayName,reason:input(frozen).reason,at:'server-generated',byId:actor.id,byMemberId:actor.memberId,byName:actor.name});
 assert.deepEqual(closedProfile,{...beforeProfile,active:false,retirementHistory:[audit]});assert.equal(closedProfile.memberId,beforeProfile.memberId);assert.deepEqual(closedProfile.linkHistory,beforeProfile.linkHistory);
 for(const key of ['customers','deals','orders','tasks','meetings','events','articles','notices','leads','companyEvents','version','viewer'])assert.deepEqual(closed[key],originalCopy[key],'No closure side effect on '+key);
 assert.deepEqual(closed.settings,{...originalCopy.settings,owners:[names.b],sellerProfiles:originalCopy.settings.sellerProfiles.map(profile=>profile.id===ids.a?{...profile,active:false,retirementHistory:[audit]}:profile)});
 const afterMetric=dashboards.salesMetrics(closed,month,ids.a);
 for(const key of ['revenue','yearRevenue','target','yearTarget','profit','margin','qualified','qualifiedTarget'])assert.equal(afterMetric[key],beforeMetric[key],'Historical KPI '+key+' keeps its stable profile.');
 assert.deepEqual(dashboards.salesYearSeries(closed,'2026',ids.a),beforeSeries);assert.equal(dashboards.teamSalesRows(closed,month).find(row=>row.id===ids.a).revenue,1000);assert.equal(dashboards.teamSalesRows(closed,month).find(row=>row.id===ids.a).active,false);
 assert.ok(sellers.legacySellerNames(closed).includes(names.a),'The immutable historical alias remains discoverable.');
 assert.equal(sellers.personalSellerId({...closed,viewer:{id:'retirement-user-a',memberId:closedProfile.memberId,name:'Changed viewing name',email:'retirement-a@example.test',role:'seller',owner:names.a}}),ids.a,'An unchanged account link keeps historical personal results; closure is not account revocation.');
 assert.deepEqual(core.normalizeState(structuredClone(closed)),closed,'Reading the new format preserves retirement audit.');
 assert.equal(retirement.protectRetiredSellerResponsibilities(frozen,closed),closed);
 assert.ok(retirement.sellerProfileRetirementReview(closed,ids.a).blockedReason);
 assert.throws(()=>retirement.retireSellerProfile(closed,input(closed),actor),/historisk/);assert.equal(closedProfile.retirementHistory.length,1);

 const blockerCases=[];
 for(const status of ['prospect','onboarding','active','growth','risk','dormant'])blockerCases.push(['customer '+status,st=>{st.customers[0].status=status;},'customer']);
 blockerCases.push(['incomplete onboarding on closed customer',st=>{st.customers[0].onboarding.completedAt='';},'onboarding'],['open issue on closed customer',st=>{st.customers[0].plan.issueStatus='open';},'issue'],['future need on closed customer',st=>{st.customers[0].yearNeeds[0].status='planned';},'yearwheel']);
 for(const stage of ['identified','contact','needs','solution','costing','quoted','decision','paused'])blockerCases.push(['deal '+stage,st=>{st.deals[1].stage=stage;},'deal']);
 for(const stage of ['handover','approval','supplier','production','shipping','delivered'])blockerCases.push(['order '+stage,st=>{st.orders[0].stage=stage;},'order']);
 blockerCases.push(['followed order without invoice',st=>{st.orders[0].invoiceValue=null;},'order']);
 for(const kind of ['manual','care','meeting_followup','csm','csm_need','prospecting','delivery','unknown_kind','year:missing-need','onboarding','csm_issue','quote','discovery','handover','receipt','invoice_ready'])blockerCases.push(['open task '+kind,st=>{st.tasks[0].done=false;st.tasks[0].kind=kind;},'task']);
 blockerCases.push(['open task with missing customer',st=>{st.tasks[0].done=false;st.tasks[0].customerId='synthetic-missing-customer';},'task'],['open task with missing commercial parent',st=>{st.tasks[0].done=false;st.tasks[0].dealId='synthetic-missing-deal';st.tasks[0].kind='quote';},'task'],['legacy blank task UUID',st=>{st.tasks[0].done=false;st.tasks[0].ownerProfileId='';},'task'],['conflicting task UUID still conservatively blocks alias',st=>{st.tasks[0].done=false;st.tasks[0].ownerProfileId=ids.b;},'task'],['explicit UUID still blocks conflicting alias',st=>{st.tasks[0].done=false;st.tasks[0].owner=names.b;},'task']);
 blockerCases.push(['planned meeting',st=>{st.meetings[0].status='planned';},'meeting'],['planned legacy meeting',st=>{st.meetings[1].status='planned';st.meetings[1].ownerProfileId='';},'meeting'],['planned company activity',st=>{st.companyEvents[0].status='planned';},'companyEvent'],['open preparation after completed activity',st=>{st.companyEvents[0].checklist[0].done=false;},'companyEventTask'],['open preparation after cancelled activity',st=>{st.companyEvents[0].status='cancelled';st.companyEvents[0].checklist[0].done=false;},'companyEventTask']);
 for(const [label,modify,kind] of blockerCases){
  const state=base();modify(state);const before=structuredClone(state),pending=retirement.sellerProfileRetirementReview(state,ids.a);
  assert.ok(pending.blockers.some(row=>row.kind===kind),'Inventory gate includes '+label);assert.match(pending.blockedReason,/återstår/);
  assert.throws(()=>retirement.retireSellerProfile(state,input(state),actor),/återstår/,label);assert.deepEqual(state,before,'Rejected closure preserves '+label);
  assert.notEqual(retirement.sellerProfileRetirementBasis(state,ids.a),basis,'Related operational work invalidates reviewed context: '+label);
 }
 const otherWork=base();otherWork.tasks.push(core.TaskSchema.parse({...otherWork.tasks[0],id:'retirement-other-open-task',owner:names.b,ownerProfileId:ids.b,done:false,title:'Syntetisk annan ansvarigs uppgift'}));assert.equal(retirement.sellerProfileRetirementBasis(otherWork,ids.a),basis,'Unrelated work does not manufacture a global conflict.');
 const unrelated=base();unrelated.version+=3;unrelated.events[0].text='Syntetisk annan historisk anteckning';unrelated.settings.budgets[month]=1234;unrelated.customers[1].name='Annan syntetisk kundvisning';assert.equal(retirement.sellerProfileRetirementBasis(unrelated,ids.a),basis,'Unrelated history, budget and global version may rebase.');
 const changedProfile=base();changedProfile.settings.sellerProfiles[0].displayName='Changed reviewed profile';assert.notEqual(retirement.sellerProfileRetirementBasis(changedProfile,ids.a),basis);
 const changedRoster=base();changedRoster.settings.sellerProfiles[1].memberId='changed-other-registered-member';assert.notEqual(retirement.sellerProfileRetirementBasis(changedRoster,ids.a),basis);
 const stale=base();stale.tasks[0].done=false;assert.throws(()=>retirement.retireSellerProfile(stale,input(frozen),actor),/ändrats/);stale.tasks[0].done=true;assert.equal(retirement.sellerProfileRetirementBasis(stale,ids.a),basis);
 for(const profileChange of [st=>{st.settings.sellerProfiles[1].active=false;},st=>{st.settings.owners=[names.a];},st=>{st.settings.owners=[names.a,'Syntetisk ännu ogranskad ansvarig'];}]){const state=base();profileChange(state);assert.match(retirement.sellerProfileRetirementReview(state,ids.a).blockedReason,/annan aktiv/);assert.throws(()=>retirement.retireSellerProfile(state,input(state),actor),/annan aktiv/);}
 for(const role of ['seller','reader','print','warehouse','production'])assert.throws(()=>retirement.retireSellerProfile(base(),input(frozen),{...actor,role}),/administratör/);
 assert.throws(()=>retirement.retireSellerProfile(base(),input(frozen),{...actor,memberId:''}),/administratör/);
 for(const patch of [{reviewed:false},{reviewed:undefined},{reason:'   '},{profileId:'not-a-uuid'},{profileId:crypto.randomUUID()},{expectedContext:''},{expectedContext:'x'.repeat(3000001)},{unexpected:'unreviewed-option'}]){const state=base(),before=structuredClone(state);assert.throws(()=>retirement.retireSellerProfile(state,{...input(state),...patch},actor));assert.deepEqual(state,before,'Invalid input cannot partially change identity.');}
 const uninitialized=base();uninitialized.settings.sellerProfilesInitialized=false;uninitialized.settings.sellerProfiles=[];assert.match(retirement.sellerProfileRetirementReview(uninitialized,ids.a).blockedReason,/Skapa/);
 const noOperationalAlias=base();noOperationalAlias.settings.owners=[names.b];assert.equal(retirement.sellerProfileRetirementReview(noOperationalAlias,ids.a).blockedReason,'');assert.throws(()=>sellers.saveSellerProfile(noOperationalAlias,sellers.SellerProfileInputSchema.parse({id:ids.a,displayName:names.a,active:false,expectedContext:'test'}),actor),/granskade profilavvecklingen/,'Old profile action cannot bypass the new audit after alias removal.');
 const legacy=base();assert.deepEqual(legacy.settings.sellerProfiles.find(profile=>profile.id===ids.legacy).retirementHistory,[],'Old inactive profiles receive no invented retirement event.');

 const reopenedCases=[
  ['historical customer reopened',st=>{st.customers[0].status='active';}],
  ['completed task reopened',st=>{st.tasks[0].done=false;}],
  ['completed meeting replanned',st=>{st.meetings[0].status='planned';}],
  ['cancelled meeting replanned',st=>{st.meetings[1].status='planned';}],
  ['resolved issue reopened',st=>{st.customers[0].plan.issueStatus='open';}],
  ['completed onboarding reopened',st=>{st.customers[0].onboarding.completedAt='';}],
  ['completed future need reopened',st=>{st.customers[0].yearNeeds[0].status='planned';}],
  ['lost deal reopened',st=>{st.deals[1].stage='paused';}],
  ['followed order reopened',st=>{st.orders[0].stage='delivered';}],
  ['followed invoice removed',st=>{st.orders[0].invoiceValue=null;}],
  ['completed company activity replanned',st=>{st.companyEvents[0].status='planned';}],
  ['completed company preparation reopened',st=>{st.companyEvents[0].checklist[0].done=false;}],
  ['copied new meeting follow-up',st=>{st.tasks.push(core.TaskSchema.parse({...st.tasks[0],id:'retirement-copied-open-task',kind:'meeting_followup',done:false}));}],
  ['same operational key reassigned from another profile',st=>{st.tasks.find(task=>task.id==='retirement-other-open-task').owner=names.a;st.tasks.find(task=>task.id==='retirement-other-open-task').ownerProfileId=ids.a;}]
 ];
 const guarded=structuredClone(closed);guarded.tasks.push(core.TaskSchema.parse({...guarded.tasks[0],id:'retirement-other-open-task',owner:names.b,ownerProfileId:ids.b,done:false}));
 for(const [label,modify] of reopenedCases){const next=structuredClone(guarded);modify(next);assert.throws(()=>retirement.protectRetiredSellerResponsibilities(guarded,next),/Öppet arbete/,label);}
 const historicalEdit=structuredClone(closed);historicalEdit.tasks[0].title='Syntetisk rättning av historisk instruktion';historicalEdit.meetings[0].notes='Syntetisk historisk precisering';historicalEdit.customers[0].yearNeeds[0].notes='Syntetisk historisk precisering';historicalEdit.settings.sellerProfiles[0].displayName='Syntetiskt nytt visningsnamn';assert.equal(retirement.protectRetiredSellerResponsibilities(closed,historicalEdit),historicalEdit,'Historical corrections remain possible without opening work.');
 const smallSnapshot=retirement.snapshotRetiredSellerResponsibilities(closed);
 assert.equal(smallSnapshot.profiles.length,1,'Only explicitly audited profiles enter the internal guard snapshot.');
 assert.deepEqual(Object.keys(smallSnapshot.profiles[0]).sort(),['id','legacyOwnerName','operationalKeys','retirementHistory']);
 assert.equal(smallSnapshot.profiles[0].id,ids.a);assert.equal(smallSnapshot.profiles[0].legacyOwnerName,names.a);assert.deepEqual(smallSnapshot.profiles[0].operationalKeys,[]);
 assert.equal(typeof smallSnapshot.profiles[0].retirementHistory,'string','Audit is copied as immutable canonical text, not a reference to settings.');
 assert.equal(retirement.protectRetiredSellerResponsibilities(smallSnapshot,historicalEdit),historicalEdit,'A bounded normalized snapshot allows historical corrections.');
 const emptySnapshotInput=base();delete emptySnapshotInput.customers;delete emptySnapshotInput.companyEvents;
 assert.deepEqual(retirement.snapshotRetiredSellerResponsibilities(emptySnapshotInput).profiles,[],'No audited profile means no operational inventory or historical-row traversal.');
 const preexisting=structuredClone(closed);preexisting.tasks[0].done=false;const unchangedOpen=structuredClone(preexisting);unchangedOpen.tasks[0].title='Syntetiskt redan befintligt arbete granskas';assert.equal(retirement.protectRetiredSellerResponsibilities(preexisting,unchangedOpen),unchangedOpen,'Already-existing work can be resolved rather than locking recovery.');unchangedOpen.tasks[0].done=true;assert.equal(retirement.protectRetiredSellerResponsibilities(preexisting,unchangedOpen),unchangedOpen,'Completion decreases existing responsibility.');
 const boundedPrevious=structuredClone(preexisting),boundedSnapshot=retirement.snapshotRetiredSellerResponsibilities(boundedPrevious),boundedNext=structuredClone(preexisting);
 boundedPrevious.tasks[0].done=true;boundedPrevious.settings.sellerProfiles[0].retirementHistory[0].reason='Syntetisk senare ändring av källobjekt';
 assert.equal(retirement.protectRetiredSellerResponsibilities(boundedSnapshot,boundedNext),boundedNext,'Captured audit and old keys cannot drift when source records are later mutated.');
 for(const [label,modify] of reopenedCases){const next=structuredClone(guarded);modify(next);assert.throws(()=>retirement.protectRetiredSellerResponsibilities(retirement.snapshotRetiredSellerResponsibilities(guarded),next),/Öppet arbete/,'Bounded snapshot protects '+label);}
 const inactiveLegacyWork=structuredClone(closed);inactiveLegacyWork.tasks.push(core.TaskSchema.parse({...inactiveLegacyWork.tasks[0],id:'retirement-legacy-open-task',owner:names.legacy,ownerProfileId:ids.legacy,done:false}));assert.equal(retirement.protectRetiredSellerResponsibilities(closed,inactiveLegacyWork),inactiveLegacyWork,'Old inactive profiles without explicit audit retain backward-compatible work rules.');
 for(const modify of [st=>{st.settings.sellerProfiles[0].retirementHistory=[];},st=>{st.settings.sellerProfiles[0].retirementHistory[0].reason='Forged rewrite';},st=>{st.settings.sellerProfiles=st.settings.sellerProfiles.filter(profile=>profile.id!==ids.a);},st=>{st.settings.sellerProfiles[0].active=true;},st=>{st.settings.owners.push(names.a);}]){const next=structuredClone(closed);modify(next);assert.throws(()=>retirement.protectRetiredSellerResponsibilities(closed,next));}
 for(const modify of [st=>{st.settings.sellerProfiles[0].retirementHistory[0].profileId=ids.b;},st=>{st.settings.sellerProfiles[0].retirementHistory[0].owner=names.b;},st=>{st.settings.sellerProfiles[0].retirementHistory.push({...st.settings.sellerProfiles[0].retirementHistory[0],id:crypto.randomUUID()});},st=>{st.settings.sellerProfiles[0].active=true;},st=>{st.settings.owners.push(names.a);}]){const next=structuredClone(closed);modify(next);assert.throws(()=>core.normalizeState(next),'Malformed retirement identity/history is not accepted on load.');}
 // Exercise the integrated action dispatcher as well as the final invariant:
 // unchanged-owner preservation must not reopen or copy work after retirement.
 const dispatched=core.applyAction(base(),{type:'seller_profile_retire',data:input(frozen)},actor);
 assert.equal(dispatched.settings.sellerProfiles.find(profile=>profile.id===ids.a).retirementHistory.length,1);
 for(const action of [
  {type:'task',data:{...closed.tasks[0],done:false}},
  {type:'meeting',data:{...closed.meetings[0],status:'planned'}},
  {type:'meeting',data:{...closed.meetings[1],status:'done'}},
  {type:'year_need',data:{customerId:closed.customers[0].id,need:{...closed.customers[0].yearNeeds[0],status:'planned'}}},
  {type:'plan',data:{customerId:closed.customers[0].id,plan:{...closed.customers[0].plan,issueStatus:'open',issueAction:'Syntetisk återöppning',issueDue:future,nextAction:'Syntetisk kundkontakt'},nextReview:future,expectedOrder:'',reviewDays:90}}
 ])assert.throws(()=>core.applyAction(closed,action,actor),/Öppet arbete/,'Dispatcher protects '+action.type+' from retired unchanged-owner reuse.');
 const correctedTask=core.applyAction(closed,{type:'task',data:{...closed.tasks[0],title:'Syntetisk rättning av avslutad uppgift'}},actor);assert.equal(correctedTask.tasks[0].done,true);assert.deepEqual(correctedTask.settings.sellerProfiles[0].retirementHistory,[audit]);
 await (await import('./historical-commercial-correction.mjs')).verifyHistoricalCommercialCorrection({core,closed,actor,ids,names});
 // applyAction accepts older JSON by normalizing a single copy first. Its
 // immutable guard snapshot must use those defaults, never the raw source.
 for(const [label,strip] of [
  ['old profile audit defaults',st=>{for(const profile of st.settings.sellerProfiles)delete profile.retirementHistory;}],
  ['customer onboarding default',st=>{delete st.customers[1].onboarding;}],
  ['customer plan default',st=>{delete st.customers[1].plan;}],
  ['customer yearNeeds default',st=>{delete st.customers[1].yearNeeds;}],
  ['old companyEvents default',st=>{delete st.companyEvents;}]
 ]){
  const raw=base();strip(raw);const rawBefore=structuredClone(raw),normalized=core.normalizeState(structuredClone(raw));
  const retired=core.applyAction(raw,{type:'seller_profile_retire',data:input(normalized)},actor);
  assert.equal(retired.settings.sellerProfiles[0].retirementHistory.length,1,'Raw '+label+' closes from normalized reviewed input.');assert.deepEqual(raw,rawBefore,'Raw '+label+' remains immutable.');
  const historicalRaw=structuredClone(retired);if(label!=='old profile audit defaults')strip(historicalRaw);
  const corrected=core.applyAction(historicalRaw,{type:'task',data:{...retired.tasks[0],title:'Syntetisk rättning med äldre fältformat'}},actor);
  assert.equal(corrected.tasks[0].title,'Syntetisk rättning med äldre fältformat');assert.deepEqual(corrected.settings.sellerProfiles[0].retirementHistory,retired.settings.sellerProfiles[0].retirementHistory,'Raw historical default projection preserves recorded audit.');
 }
 const impliedRaw=structuredClone(closed);impliedRaw.customers[0].status='onboarding';delete impliedRaw.customers[0].onboarding;
 const impliedBefore=structuredClone(impliedRaw),impliedNormalized=core.normalizeState(structuredClone(impliedRaw));
 assert.ok(impliedNormalized.customers[0].onboarding.startedAt,'An older existing first-order record implies onboarding in normalization.');
 const impliedSnapshot=retirement.snapshotRetiredSellerResponsibilities(impliedNormalized);
 assert.ok(impliedSnapshot.profiles[0].operationalKeys.includes(JSON.stringify(['onboarding',impliedNormalized.customers[0].id])),'Previous keys include normalized, pre-existing implied onboarding.');
 const impliedHistorical=core.applyAction(impliedRaw,{type:'task',data:{...closed.tasks[0],title:'Syntetisk historisk rättning under befintlig onboarding'}},actor);
 assert.equal(impliedHistorical.tasks[0].done,true);assert.equal(impliedHistorical.customers[0].onboarding.startedAt,impliedNormalized.customers[0].onboarding.startedAt);assert.deepEqual(impliedRaw,impliedBefore,'Normalized guard does not mutate old source JSON.');
 const legacyCompleted=base();legacyCompleted.tasks[0].owner=names.legacy;legacyCompleted.tasks[0].ownerProfileId=ids.legacy;const legacyReopened=core.applyAction(legacyCompleted,{type:'task',data:{...legacyCompleted.tasks[0],done:false}},actor);assert.equal(legacyReopened.tasks[0].done,false,'Existing inactive-source behavior remains backward compatible without fabricated audit.');
 console.log('PASS seller profile retirement domain: '+blockerCases.length+' conservative operational blockers, explicit admin/reason/basis gates, stable result/account/history preservation, inactive legacy compatibility, audited closed-profile reopen/copy guards and identity validation.');
}
