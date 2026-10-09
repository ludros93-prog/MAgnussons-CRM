import assert from 'node:assert/strict';

// Read-only domain coverage. Every person, company and document is synthetic;
// this test neither opens the application nor reads/writes a database.
export async function verifyStaffHandover({core, business, ops}) {
 const inventory = await import('../work/staff-handover.mjs');
 business ||= await import('../work/business.mjs');
 const operations = ops || await import('../work/operations.mjs');
 const ids = {
  a:'10000000-0000-4000-8000-000000000001',
  b:'10000000-0000-4000-8000-000000000002',
  retired:'10000000-0000-4000-8000-000000000003',
  unknown:'10000000-0000-4000-8000-000000000004'
 };
 const owners = {a:'Syntetisk ursprungsägare A', b:'Syntetisk ursprungsägare B', retired:'Syntetisk tidigare ägare', unknown:'Syntetisk omappad ägare'};
 const at = '2026-10-07T08:00:00.000Z', date = '2028-03-31';
 const st = core.emptyState();
 st.viewer = {id:'synthetic-admin-user', memberId:'synthetic-admin-member', name:'Syntetisk administratör', email:'staff-admin@example.test', role:'admin', owner:''};
 st.settings.owners = [owners.a, owners.b];
 st.settings.sellerProfilesInitialized = true;
 st.settings.sellerProfiles = ['a','b','retired'].map(key => ({id:ids[key], legacyOwnerName:owners[key], displayName:'Samma syntetiska visningsnamn', active:key!=='retired', memberId:'synthetic-member-'+key, linkHistory:[], retirementHistory:[]}));
 const customer = (id, extra={}) => core.CustomerSchema.parse({id, name:'Syntetisk kund '+id, owner:owners.a, ownerProfileId:ids.a, status:'active', ...extra});
 const need = (id, extra={}) => business.NeedSchema.parse({id, title:'Syntetiskt behov '+id, owner:owners.a, ownerProfileId:ids.a, due:date, intervalMonths:12, ...extra});
 const deal = (id, extra={}) => core.DealSchema.parse({id, customerId:'active-a', title:'Syntetisk affär '+id, owner:owners.a, ownerProfileId:ids.a, nextAction:'Granska syntetiskt underlag', nextDate:date, ...extra});
 const order = (id, dealId, extra={}) => core.OrderSchema.parse({id, dealId, customerId:'active-a', owner:owners.a, ownerProfileId:ids.a, stage:'handover', proofRequired:false, proofApproved:false, supplierConfirmed:false, deliveryDate:date, deliveredDate:'', invoiceDate:'', invoiceRef:'', invoiceValue:null, actualCost:null, notes:'Syntetiskt underlag', ...extra});
 const task = (id, extra={}) => core.TaskSchema.parse({id, customerId:'active-a', owner:owners.a, ownerProfileId:ids.a, title:'Syntetisk uppgift '+id, due:date, ...extra});
 const meeting = (id, extra={}) => core.MeetingSchema.parse({id, customerId:'active-a', owner:owners.a, ownerProfileId:ids.a, title:'Syntetiskt möte '+id, date, time:'10:00', duration:45, ...extra});
 st.customers = [
  customer('active-a', {yearNeeds:[need('shared-need'), need('finished-need',{status:'done', completedAt:at}), need('cancelled-need',{status:'cancelled'})], plan:{issue:'Syntetiskt öppet ärende', issueStatus:'open', issueOwner:owners.a, issueOwnerProfileId:ids.a, issueDue:date}}),
  customer('active-b', {owner:owners.b, ownerProfileId:ids.b, yearNeeds:[need('shared-need',{owner:owners.b, ownerProfileId:ids.b})]}),
  customer('closed-a', {status:'closed'}),
  customer('legacy-a', {ownerProfileId:''}),
  customer('retired-customer', {owner:owners.retired, ownerProfileId:ids.retired, yearNeeds:[need('retired-need',{owner:owners.retired, ownerProfileId:ids.retired})]}),
  customer('unknown-customer', {owner:owners.unknown, ownerProfileId:''}),
  customer('unknown-id-customer', {ownerProfileId:ids.unknown}),
  customer('mismatched-customer', {ownerProfileId:ids.b}),
  customer('ownerless-issue', {owner:owners.b, ownerProfileId:ids.b, plan:{issue:'Syntetiskt ärende utan registrerad ansvarig', issueStatus:'open', issueOwner:'', issueOwnerProfileId:''}}),
  customer('onboarding-a', {onboarding:{owner:owners.a, ownerProfileId:ids.a, dealId:'onboarding-first', startedAt:at, due:date}}),
  customer('onboarding-complete', {onboarding:{owner:owners.a, ownerProfileId:ids.a, dealId:'historical-won', startedAt:at, completedAt:at}}),
  customer('planned-customer', {plan:{nextNeed:'Syntetiskt planerat återköp', nextNeedDate:date, nextAction:'Kontrollera kundens behov', nextDate:date}}),
  customer('open-prospect', {status:'prospect', prospecting:{stage:'paused', reason:'Syntetiskt behov att undersöka', outcomeReason:'Syntetiskt vänteläge', nextAction:'Stäm av framöver', nextDate:date}})
 ];
 st.deals = [
  deal('paused',{stage:'paused', reason:'Syntetiskt vänteläge'}),
  deal('open'),
  deal('linked-open'),
  deal('parent-moved',{owner:owners.b, ownerProfileId:ids.b}),
  deal('other-customer-parent',{customerId:'active-b', owner:owners.b, ownerProfileId:ids.b}),
  deal('order-won',{stage:'won', confirmed:true, wonAt:at}),
  deal('historical-won',{stage:'won', confirmed:true, wonAt:at}),
  deal('historical-lost',{stage:'lost', reason:'Syntetisk förlustorsak'}),
  deal('onboarding-first',{customerId:'onboarding-a', stage:'won', confirmed:true, wonAt:at}),
  deal('followed-no-invoice-deal',{stage:'won', confirmed:true, wonAt:at}),
  deal('followed-invoiced-deal',{stage:'won', confirmed:true, wonAt:at})
 ];
 st.orders = [
  order('open-order','order-won',{production:{status:'submitted', assigneeId:ids.a, assigneeName:owners.a, issue:'Syntetiskt materialhinder', issueOwnerId:ids.a, issueOwnerName:owners.a}}),
  order('linked-open-order','linked-open'),
  order('onboarding-order','onboarding-first',{customerId:'onboarding-a'}),
  order('followed-no-invoice','followed-no-invoice-deal',{stage:'followed'}),
  order('followed-invoiced','followed-invoiced-deal',{stage:'followed', invoiceDate:'2026-09-30', invoiceRef:'SYNTHETIC-INVOICE', invoiceValue:1000, actualCost:600, invoiceOwner:owners.a, invoiceOwnerId:ids.a, invoiceOwnerSource:'recorded'})
 ];
 st.tasks = [
  task('manual'), task('legacy',{ownerProfileId:''}), task('care',{kind:'care'}), task('meeting-followup',{kind:'meeting_followup'}),
  task('retired',{owner:owners.retired, ownerProfileId:ids.retired}),
  task('unknown-alias',{owner:owners.unknown, ownerProfileId:''}),
  task('unknown-id',{ownerProfileId:ids.unknown}), task('mismatched-id',{ownerProfileId:ids.b}),
  task('b',{owner:owners.b, ownerProfileId:ids.b}), task('done',{done:true, doneAt:at}),
  task('closed-customer',{customerId:'closed-a'}),
  task('commercial-open',{dealId:'open', kind:'quote'}),
  task('commercial-mismatched-id',{dealId:'open', kind:'quote', ownerProfileId:ids.b}),
  task('commercial-paused',{dealId:'paused', kind:'discovery'}),
  task('order-linked',{dealId:'order-won', kind:'handover'}),
  task('parent-moved',{dealId:'parent-moved', kind:'quote'}),
  task('historical-parent',{dealId:'historical-won', kind:'discovery'}),
  task('orphan-deal',{dealId:'missing-synthetic-deal', kind:'quote'}),
  task('wrong-customer-parent',{dealId:'other-customer-parent', kind:'quote'}),
  task('orphan-customer',{customerId:'missing-synthetic-customer'}),
  task('onboarding',{customerId:'onboarding-a', kind:'onboarding'}),
  task('completed-onboarding',{customerId:'onboarding-complete', kind:'onboarding'}),
  task('issue',{kind:'csm_issue'}),
  task('year-a',{kind:'year:shared-need'}),
  task('year-b',{customerId:'active-b', owner:owners.b, ownerProfileId:ids.b, kind:'year:shared-need'}),
  task('year-moved',{customerId:'active-b', kind:'year:shared-need'}),
  task('year-missing',{kind:'year:missing-synthetic-need'}),
  task('year-done',{kind:'year:finished-need'}),
  ...['csm','csm_need','prospecting','unknown_kind'].map(kind => task('unsupported-'+kind,{kind})),
  task('planned-csm_need',{customerId:'planned-customer',kind:'csm_need'}),
  task('paused-prospecting',{customerId:'open-prospect',kind:'prospecting'}),
  task('closed-csm',{customerId:'closed-a',kind:'csm'}),
  task('linked-csm',{kind:'csm',dealId:'order-won'}),
  task('unsupported-delivery',{dealId:'order-won', kind:'delivery'})
 ];
 st.meetings = [meeting('planned'), meeting('legacy',{ownerProfileId:''}), meeting('retired',{owner:owners.retired, ownerProfileId:ids.retired}), meeting('done',{status:'done'}), meeting('cancelled',{status:'cancelled'})];
 st.companyEvents = [
  operations.CompanyEventSchema.parse({id:'planned-event', title:'Syntetisk planerad aktivitet', owner:owners.a, date, checklist:[{id:'b-check', title:'Separat syntetiskt ansvar B', owner:owners.b, ownerProfileId:ids.b, due:date},{id:'unresolved-event-check',title:'Syntetisk motstridig profil',owner:owners.a,ownerProfileId:ids.b,due:date}]}),
  operations.CompanyEventSchema.parse({id:'done-event', title:'Syntetisk avslutad aktivitet', owner:owners.b, date, status:'done', checklist:[{id:'shared-check', title:'Kvarstående syntetisk förberedelse', owner:owners.a, due:date},{id:'done-check', title:'Avslutad förberedelse', owner:owners.a, due:date, done:true},{id:'retired-event-check',title:'Syntetiskt historiskt ansvar',owner:owners.retired,ownerProfileId:ids.retired,due:date}]}),
  operations.CompanyEventSchema.parse({id:'cancelled-event', title:'Syntetisk avbokad aktivitet', owner:owners.b, date, status:'cancelled', checklist:[{id:'shared-check', title:'Separat kvarstående förberedelse', owner:owners.a, due:date}]}),
  operations.CompanyEventSchema.parse({id:'unknown-event', title:'Syntetiskt omappat event', owner:owners.unknown, date}),
  operations.CompanyEventSchema.parse({id:'profile-event', title:'Syntetisk profilkopplad aktivitet B', owner:owners.b, ownerProfileId:ids.b, date, checklist:[{id:'separate-a-check', title:'Självständigt förberedelseansvar A', owner:owners.a, ownerProfileId:ids.a, due:date}]}),
  operations.CompanyEventSchema.parse({id:'retired-parent-event', title:'Syntetisk äldre aktiv aktivitet', owner:owners.retired, ownerProfileId:ids.retired, date}),
  operations.CompanyEventSchema.parse({id:'mismatched-parent-event', title:'Syntetisk motstridig aktivitetsprofil', owner:owners.a, ownerProfileId:ids.b, date}),
  operations.CompanyEventSchema.parse({id:'unknown-id-parent-event', title:'Syntetisk saknad aktivitetsprofil', owner:owners.a, ownerProfileId:ids.unknown, date})
 ];
 // Read operations must work on a frozen graph; profile lookup may describe
 // legacy fields but must never fill UUIDs or rewrite historical attribution.
 const before = structuredClone(st);
 const freeze = value => {if(value && typeof value==='object' && !Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
 freeze(st);
 const rows = inventory.staffHandoverRows(st);
 assert.ok(rows.length>0);
 assert.equal(new Set(rows.map(row=>row.key)).size, rows.length, 'Every responsibility part has a unique key.');
 const row = (kind,id,customerId) => {
  const result = rows.find(item => item.kind===kind && (JSON.parse(item.key).includes(id)) && (!customerId || item.customerId===customerId));
  assert.ok(result, 'Visible '+kind+' responsibility '+id); return result;
 };
 const absent = (kind,id) => assert.equal(rows.some(item => item.kind===kind && JSON.parse(item.key).includes(id)),false, 'Historical '+kind+' is excluded: '+id);
 const action = (kind,id,expected,customerId) => assert.deepEqual(row(kind,id,customerId).action, expected);
 assert.equal(row('customer','legacy-a').identity,'legacy');
 assert.equal(row('customer','legacy-a').ownerProfileId,'', 'Reading older responsibility does not anchor it.');
 assert.equal(row('customer','active-a').identity,'profile');
 for(const id of ['unknown-customer','unknown-id-customer','mismatched-customer']) assert.equal(row('customer',id).identity,'unresolved');
 for(const id of ['unknown-alias','unknown-id','mismatched-id']) assert.equal(row('task',id).identity,'unresolved');
 assert.equal(row('issue','ownerless-issue').identity,'unresolved', 'An unassigned issue is never attributed to the customer owner.');
 absent('customer','closed-a');
 for(const id of ['historical-won','historical-lost']) absent('deal',id);
 absent('order','followed-invoiced'); absent('task','done');
 for(const id of ['done','cancelled']) absent('meeting',id);
 absent('onboarding','onboarding-complete');
 absent('yearwheel','finished-need'); absent('yearwheel','cancelled-need');
 for(const id of ['done-event','cancelled-event']) absent('companyEvent',id);
 absent('companyEventTask','done-check');
 action('deal','paused',{kind:'deal',id:'paused',customerId:'active-a'});
 action('deal','linked-open',{kind:'order',id:'linked-open-order',customerId:'active-a'});
 const missingInvoice = row('order','followed-no-invoice');
 assert.notEqual(missingInvoice.action?.kind,'order','A followed order is not presented as transferable merely because invoicing is outstanding.');
 assert.ok(missingInvoice.hint, 'Outstanding invoicing with a historical order has an explanation.');
 for(const id of ['manual','care','meeting-followup','legacy','retired','closed-customer']) action('task',id,{kind:'task',id,customerId:id==='closed-customer'?'closed-a':'active-a'});
 for(const [id,customerId,label] of [['unsupported-csm','active-a','Kundavstämning'],['planned-csm_need','planned-customer','Kommande kundbehov'],['paused-prospecting','open-prospect','Prospektkontakt']]){
  action('task',id,{kind:'task',id,customerId});
  assert.equal(row('task',id).typeLabel,label);
  assert.match(row('task',id).hint,/Endast denna uppgift överlämnas/);
 }
 action('task','commercial-open',{kind:'deal',id:'open',customerId:'active-a'});
 action('task','commercial-paused',{kind:'deal',id:'paused',customerId:'active-a'});
 action('task','order-linked',{kind:'order',id:'open-order',customerId:'active-a'});
 action('task','onboarding',{kind:'onboarding',id:'onboarding-a',customerId:'onboarding-a'});
 action('task','issue',{kind:'issue',id:'active-a',customerId:'active-a'});
 for(const customerId of ['active-a','active-b']) {
  action('yearwheel','shared-need',{kind:'yearwheel',id:'shared-need',customerId,needId:'shared-need'},customerId);
  action('task',customerId==='active-a'?'year-a':'year-b',{kind:'yearwheel',id:'shared-need',customerId,needId:'shared-need'});
 }
 assert.notEqual(row('yearwheel','shared-need','active-a').key,row('yearwheel','shared-need','active-b').key,'The same mutable need ID on two customers stays distinct.');
 for(const id of ['parent-moved','commercial-mismatched-id','historical-parent','orphan-deal','wrong-customer-parent','completed-onboarding','year-moved','year-missing','year-done','unsupported-csm_need','unsupported-prospecting','unsupported-unknown_kind','unsupported-delivery','closed-csm','linked-csm']) {
  const item=row('task',id); assert.equal(item.action?.kind,'customer','Unsupported/open child '+id+' uses its actual customer, not an unsafe transfer.');
  assert.equal(item.action.id,item.customerId); assert.ok(item.hint,'Unsupported child remains explained: '+id);
 }
 assert.equal(row('task','orphan-customer').action,null,'An orphan must be visible without inventing a valid customer target.');
 assert.ok(row('task','orphan-customer').hint);
 const openTaskRows = rows.filter(item=>item.kind==='task');
 assert.deepEqual(openTaskRows.map(item=>JSON.parse(item.key)[1]).sort(),st.tasks.filter(item=>!item.done).map(item=>item.id).sort(),'Every open task remains visible even if its parent moved, ended or disappeared.');
 assert.equal(row('companyEvent','planned-event').identity,'legacy');
 assert.equal(row('companyEvent','planned-event').ownerProfileId,'','Reading an older parent describes the legacy responsibility without anchoring it.');
 action('companyEvent','planned-event',{kind:'companyEvent',id:'planned-event'});
 assert.equal(row('companyEvent','planned-event').actionLabel,'Granska aktivitetens ansvar');
 assert.match(row('companyEvent','planned-event').hint,/Endast aktivitetens övergripande ansvar överlämnas/);
 assert.equal(row('companyEvent','profile-event').identity,'profile');
 assert.equal(row('companyEvent','profile-event').ownerProfileId,ids.b);
 action('companyEvent','profile-event',{kind:'companyEvent',id:'profile-event'});
 assert.equal(row('companyEvent','retired-parent-event').ownerProfileId,ids.retired);
 action('companyEvent','retired-parent-event',{kind:'companyEvent',id:'retired-parent-event'});
 for(const id of ['unknown-event','mismatched-parent-event','unknown-id-parent-event']){
  assert.equal(row('companyEvent',id).identity,'unresolved');
  action('companyEvent',id,{kind:'companyEvent',id});
  assert.ok(row('companyEvent',id).hint,'Unresolved parent responsibility stays visible with its actual review context.');
 }
 assert.equal(row('companyEventTask','shared-check','').identity,'legacy');
 assert.equal(row('companyEventTask','shared-check','').ownerProfileId,'');
 assert.equal(row('companyEventTask','b-check').identity,'profile');
 assert.equal(row('companyEventTask','b-check').ownerProfileId,ids.b);
 assert.equal(row('companyEventTask','unresolved-event-check').identity,'unresolved');
 assert.equal(row('companyEventTask','unresolved-event-check').action?.kind,'companyEventPreparation');
 assert.equal(row('companyEventTask','retired-event-check').ownerProfileId,ids.retired);
 assert.equal(row('companyEventTask','retired-event-check').action?.kind,'companyEventPreparation');
 const leftoverChecks=rows.filter(item=>item.kind==='companyEventTask' && JSON.parse(item.key).includes('shared-check'));
 assert.equal(leftoverChecks.length,2,'Checklist IDs are scoped to their event.');
 assert.ok(leftoverChecks.every(item=>item.hint && item.action?.kind==='companyEventPreparation'),'Open preparations keep their reviewed route after the event ended/cancelled.');
 for(const item of leftoverChecks)assert.deepEqual(item.action,{kind:'companyEventPreparation',id:JSON.parse(item.key)[1],checklistId:'shared-check'});
 assert.deepEqual(row('companyEventTask','b-check').action,{kind:'companyEventPreparation',id:'planned-event',checklistId:'b-check'});
 assert.equal(row('companyEvent','unknown-event').identity,'unresolved');
 assert.ok(!rows.some(item=>item.kind.startsWith('production')),'Production user IDs never join to a seller-profile UUID, even with matching ID/name strings.');
 const aRows=inventory.staffHandoverForProfile(st,ids.a), bRows=inventory.staffHandoverForProfile(st,ids.b), retiredRows=inventory.staffHandoverForProfile(st,ids.retired);
 const keys = value=>new Set(value.map(item=>item.key));
 assert.ok(keys(aRows).has(row('task','legacy').key));
 assert.ok(keys(aRows).has(row('companyEvent','planned-event').key));
 assert.ok(keys(bRows).has(row('companyEventTask','b-check').key),'Checklist responsibility can differ from event responsibility.');
 assert.ok(keys(bRows).has(row('companyEvent','profile-event').key),'Stable parent responsibility belongs to its actual profile.');
 assert.ok(keys(aRows).has(row('companyEventTask','separate-a-check').key),'Parent B does not transfer its separately assigned preparation A during inventory reads.');
 assert.ok(!keys(aRows).has(row('companyEvent','profile-event').key));
 assert.ok(!keys(bRows).has(row('companyEventTask','separate-a-check').key));
 assert.ok(keys(retiredRows).has(row('companyEvent','retired-parent-event').key),'An inactive source profile retains visibility of its own planned activity.');
 for(const id of ['mismatched-parent-event','unknown-id-parent-event']){
  assert.ok(!keys(aRows).has(row('companyEvent',id).key),'An explicit conflicting/unknown parent UUID never falls back to its alias: '+id);
  assert.ok(!keys(bRows).has(row('companyEvent',id).key),'A conflicting alias never attributes the activity to another profile ID: '+id);
 }
 assert.ok(keys(retiredRows).has(row('task','retired').key));
 assert.ok(keys(retiredRows).has(row('companyEventTask','retired-event-check').key));
 assert.ok(!keys(aRows).has(row('companyEventTask','unresolved-event-check').key),'A conflicting explicit preparation UUID never falls back to its alias.');
 assert.ok(keys(retiredRows).has(row('meeting','retired').key));
 assert.ok(keys(retiredRows).has(row('yearwheel','retired-need').key),'Inactive profiles remain selectable for future open needs.');
 assert.ok(aRows.every(item=>!keys(bRows).has(item.key)),'Identical display names never merge two stable profiles.');
 for(const id of ['unknown-id','mismatched-id','unknown-alias']) assert.ok(!keys(aRows).has(row('task',id).key),'No fallback to the alias of an explicit conflicting/unknown UUID: '+id);
 assert.deepEqual(inventory.staffHandoverForProfile(st,ids.unknown),[]);
 assert.deepEqual(inventory.staffHandoverForProfile(st,'missing-profile'),[]);
 const renamed=structuredClone(st); renamed.settings.sellerProfiles[0].displayName='Syntetiskt nytt visningsnamn';
 assert.deepEqual(inventory.staffHandoverForProfile(renamed,ids.a).map(item=>item.key),aRows.map(item=>item.key),'Changing a display name does not change responsibility membership.');
 const uninitialized=structuredClone(st); uninitialized.settings.sellerProfilesInitialized=false; uninitialized.settings.sellerProfiles=[];
 assert.ok(inventory.staffHandoverRows(uninitialized).some(item=>item.identity==='unresolved'),'Unreviewed identities are visible for review.');
 assert.deepEqual(inventory.staffHandoverForProfile(uninitialized,ids.a),[],'The inventory does not initialize or infer profiles.');
 for(const role of ['seller','reader','print','warehouse','production']) {
  const privateState={...st,viewer:{...st.viewer,role}};
  assert.deepEqual(inventory.staffHandoverRows(privateState),[],'No staff inventory for '+role);
  assert.deepEqual(inventory.staffHandoverForProfile(privateState,ids.a),[],'No profile inventory for '+role);
 }
 assert.deepEqual(inventory.staffHandoverRows({...st,viewer:undefined}),[],'No staff inventory without authenticated viewer.');
 assert.deepEqual(st,before,'Inventory leaves all operational records, recurrence, history, invoice ownership, settings and production quantities unchanged.');
 // A same-person link is a different operation from handing work to another
 // seller. A one-person team must still be able to find the reviewed link;
 // inventory itself has no fresh account-directory proof and cannot save it.
 const anchorState=core.emptyState();
 anchorState.viewer=structuredClone(st.viewer);
 anchorState.settings.owners=[owners.a];
 anchorState.settings.sellerProfilesInitialized=true;
 anchorState.settings.sellerProfiles=[structuredClone(st.settings.sellerProfiles[0])];
 anchorState.customers=[customer('anchor-customer',{ownerProfileId:''})];
 anchorState.deals=[
  deal('anchor-deal',{customerId:'anchor-customer',ownerProfileId:''}),
  deal('anchor-parent',{customerId:'anchor-customer',owner:owners.b,ownerProfileId:ids.b,stage:'won',confirmed:true,wonAt:at})
 ];
 anchorState.orders=[order('anchor-order','anchor-parent',{customerId:'anchor-customer',ownerProfileId:''})];
 anchorState.tasks=[task('anchor-child',{customerId:'anchor-customer',dealId:'anchor-deal',kind:'quote',ownerProfileId:''})];
 const anchorRows=value=>{
  const unchanged=structuredClone(value);
  const result=inventory.staffHandoverRows(freeze(value));
  assert.deepEqual(value,unchanged,'Describing same-person link actions does not mutate input or supply account confirmation.');
  return result;
 };
 const anchorRow=(value,kind,id)=>{
  const result=anchorRows(value).find(item=>item.kind===kind&&JSON.parse(item.key).includes(id));
  assert.ok(result,'Visible same-person review row '+kind+' '+id);return result;
 };
 const expectedAnchors=[['customer','anchor-customer','customerAnchor','Koppla kundansvaret'],['deal','anchor-deal','dealAnchor','Koppla affärsansvaret'],['order','anchor-order','orderAnchor','Koppla orderansvaret']];
 for(const [kind,id,actionKind,label] of expectedAnchors){
  const item=anchorRow(structuredClone(anchorState),kind,id);
  assert.deepEqual(item.anchorAction,{kind:actionKind,id,customerId:'anchor-customer'},'The direct row exposes its own same-person review.');
  assert.equal(item.anchorLabel,label);
  assert.match(item.anchorHint,/Samma person fortsätter/,'Same-person link has its own explanation.');
  assert.match(item.anchorHint,/konto.*granskas.*innan.*sparas/i,'The inventory does not report an active account or successful save.');
  assert.deepEqual(item.action,{kind:'customer',id:'anchor-customer',customerId:'anchor-customer'},'The original handover retains its safe customer review route.');
  assert.equal(item.actionLabel,'Öppna kundkort');
  assert.match(item.hint,/ingen annan aktiv säljarprofil/i,'The original handover still describes the unavailable target.');
  assert.deepEqual(Object.keys(item.anchorAction).sort(),['customerId','id','kind'],'Inventory actions contain navigation context, not active-account proof or save payload.');
 }
 assert.equal(anchorRow(structuredClone(anchorState),'task','anchor-child').anchorAction,undefined,'A child task never gets a neutral link for its commercial parent.');
 const noAnchors=(value,label,kinds=['customer','deal','order'])=>{
  const result=anchorRows(value);
  for(const kind of kinds)for(const item of result.filter(item=>item.kind===kind)){
   assert.equal(item.anchorAction,undefined,label+': no unsafe '+kind+' link');
   assert.equal(item.anchorLabel,undefined,label+': no orphan action label');
   assert.equal(item.anchorHint,undefined,label+': no orphan action hint');
  }
 };
 for(const [label,edit] of [
  ['already recorded UUID',value=>{for(const record of [...value.customers,...value.deals,...value.orders])record.ownerProfileId=ids.a;}],
  ['unknown explicit UUID',value=>{for(const record of [...value.customers,...value.deals,...value.orders])record.ownerProfileId=ids.unknown;}],
  ['conflicting explicit UUID',value=>{for(const record of [...value.customers,...value.deals,...value.orders])record.ownerProfileId=ids.b;}],
  ['inactive profile',value=>{value.settings.sellerProfiles[0].active=false;}],
  ['no current operational owner',value=>{value.settings.owners=[];}],
  ['missing member link',value=>{value.settings.sellerProfiles[0].memberId='';}],
  ['ambiguous legacy person',value=>{value.settings.sellerProfiles.push({...structuredClone(value.settings.sellerProfiles[0]),id:ids.b,memberId:'synthetic-duplicate-member'});}],
  ['unreviewed profile registry',value=>{value.settings.sellerProfilesInitialized=false;value.settings.sellerProfiles=[];}],
  ['unknown owner',value=>{for(const record of [...value.customers,...value.deals,...value.orders])record.owner=owners.unknown;}],
  ['retired profile',value=>{value.settings.sellerProfiles[0].retirementHistory=[{id:'20000000-0000-4000-8000-000000000001',profileId:ids.a,owner:owners.a,displayName:'Syntetisk tidigare ägare',reason:'Syntetiskt tidigare avslut',at,byId:st.viewer.id,byMemberId:st.viewer.memberId,byName:st.viewer.name}];}]
 ]){
  const value=structuredClone(anchorState);edit(value);noAnchors(value,label);
 }
 for(const [label,edit] of [
  ['missing customer',value=>{value.customers=[];}],
  ['missing won deal',value=>{value.deals=value.deals.filter(record=>record.id!=='anchor-parent');}],
  ['parent belongs to another customer',value=>{value.deals.find(record=>record.id==='anchor-parent').customerId='missing-synthetic-customer';}],
  ['parent is not won',value=>{value.deals.find(record=>record.id==='anchor-parent').stage='quoted';}],
  ['multiple linked orders',value=>{value.orders.push({...structuredClone(value.orders[0]),id:'second-anchor-order'});}],
  ['followed historical order',value=>{value.orders[0].stage='followed';}]
 ]){
  const value=structuredClone(anchorState);edit(value);noAnchors(value,label,['order']);
 }
 const redirected=structuredClone(anchorState);
 redirected.orders=[order('linked-legacy-order','anchor-deal',{customerId:'anchor-customer',ownerProfileId:''})];
 assert.equal(anchorRow(redirected,'deal','anchor-deal').anchorAction,undefined,'A deal with an order cannot show an order link through a deal row.');
 const endedDeal=structuredClone(anchorState);endedDeal.deals[0].stage='lost';endedDeal.deals[0].reason='Syntetiskt tidigare avslut';
 assert.ok(!anchorRows(endedDeal).some(item=>item.kind==='deal'&&JSON.parse(item.key).includes('anchor-deal')),'Historical deals do not become same-person link targets.');
 const transfer={id:'30000000-0000-4000-8000-000000000001',customerId:'anchor-customer',fromOwner:owners.b,toOwner:owners.a,fromProfileId:ids.b,toProfileId:ids.a,reason:'Syntetisk tidigare överlämning',at,byId:st.viewer.id,byMemberId:st.viewer.memberId,byName:st.viewer.name,selectedTaskIds:[]};
 for(const target of ['deals','orders']){
  const value=structuredClone(anchorState),targetType=target==='deals'?'deal':'order',record=value[target][0];
  value[target][0]=(target==='deals'?core.DealSchema:core.OrderSchema).parse({...record,responsibilityTransfers:[{...transfer,targetType,targetId:record.id,dealId:target==='deals'?record.id:record.dealId,fromDisplayName:owners.b,toDisplayName:owners.a}]});
  noAnchors(value,'Existing '+target+' responsibility history',[target==='deals'?'deal':'order']);
 }
 const customerHistory=structuredClone(anchorState);customerHistory.customers[0]=customer('anchor-customer',{ownerProfileId:'',responsibilityTransfers:[transfer]});
 assert.deepEqual(anchorRow(customerHistory,'customer','anchor-customer').anchorAction,{kind:'customerAnchor',id:'anchor-customer',customerId:'anchor-customer'},'Older customer transfer history with a blank ID uses the existing customer review rules.');
 for(const role of ['seller','reader','print','warehouse','production']){
  const value=structuredClone(anchorState);value.viewer.role=role;
  assert.deepEqual(anchorRows(value),[],'Same-person staff review remains admin-only for '+role);
 }
 assert.deepEqual(anchorRows({...structuredClone(anchorState),viewer:undefined}),[],'No same-person staff review without authentication.');
 assert.equal(anchorState.orders[0].owner,owners.a);
 assert.equal(anchorState.deals[1].owner,owners.b,'Different historical parent ownership is preserved; the direct order review does not rewrite it.');
 console.log('PASS staff handover: pure admin inventory, inactive/legacy/ambiguous identities, duplicate display names, paused and invoice-outstanding work, every open child, exact parent actions, customer-scoped needs/checklists and unchanged historical/production data. Synthetic domain fixtures only.');
 console.log('PASS staff same-person links: direct customer/deal/order review in a one-person team, account proof withheld, existing transfer paths preserved, known/inactive/retired/unlinked/ambiguous/historical/orphan and multiple-order guards, no child redirects, frozen read-only fixtures.');
}
