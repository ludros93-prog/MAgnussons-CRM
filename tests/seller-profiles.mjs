import assert from 'node:assert/strict';

// Exercise real SQLite, authentication, CAS retries and serialized recovery.
// The fixture occupies demo only; the existing live integration tests remain intact.
export async function verifySellerProfiles({core,sqlite,get,post,headers,api,conflicts,dashboards}) {
 const sellers=await import('../work/seller-profiles.mjs'),responsibility=await import('../work/customer-responsibility.mjs'),store=await import('../work/crm-store.mjs'),stream=await import('../work/crm-backup-stream.mjs'),restore=await import('../work/crm-restore.mjs'),direct=await import('../work/direct-delivery.mjs'),members=await import('../work/members-api.mjs');
 const actor={id:'test-admin',name:'Isolerad administratör',role:'admin',owner:''},month='2026-09',year='2026',at='2026-09-04T10:00:00Z';
 const names={a:'Profiltest ansvar A',b:'Profiltest ansvar B',retired:'Profiltest tidigare säljare',goal:'Profiltest historiskt mål',task:'Profiltest äldre uppgiftsansvar',future:'Profiltest nytillagd ansvarig'};
 const accounts={a:{id:'seller-profile-member-a',user:'seller-profile-user-a',email:'seller-profile-a@example.com',owner:names.a},b:{id:'seller-profile-member-b',user:'seller-profile-user-b',email:'seller-profile-b@example.com',owner:names.b},replacement:{id:'seller-profile-replacement',user:'seller-profile-replacement-user',email:'seller-profile-replacement@example.com',owner:names.a},future:{id:'seller-profile-member-future',user:'seller-profile-user-future',email:'seller-profile-future@example.com',owner:names.future},production:{id:'seller-profile-production',user:'seller-profile-production-user',email:'seller-profile-production@example.com',owner:''},reader:{id:'seller-profile-reader',user:'seller-profile-reader-user',email:'seller-profile-reader@example.com',owner:''}};
 const auth=account=>({'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email});
 async function readAs(account){const r=await api.GET(new Request('https://crm.test/api/crm?space=demo',{headers:auth(account)}));assert.equal(r.status,200);return r.json();}
 async function writeAs(account,st,type,data,id=crypto.randomUUID()){
  const record=conflicts.editableRecord(st,type,data?.id||'');
  const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...auth(account),'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:'demo',version:st.version,requestId:id,expectedRecord:record?conflicts.recordBasis(record):undefined,type,data})}));
  return {status:r.status,data:await r.json(),id};
 }
 async function memberSave(account,active,role='seller'){
  const r=await members.POST(new Request('https://crm.test/api/crm/members',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({email:account.email,name:'Samma kontonamn',role,owner:account.owner,active})}));
  assert.equal(r.status,200,JSON.stringify(await r.json()));
 }
 async function resetDemo(){
  for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');
  await store.initialize('demo');sqlite.prepare('UPDATE crm_spaces SET version=1,settings=? WHERE id=?').run(JSON.stringify(core.emptyState().settings),'demo');
 }
 await resetDemo();
 for(const [key,account] of Object.entries(accounts))if(key!=='replacement')sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,account.user,'Samma kontonamn',key==='production'?'production':key==='reader'?'reader':'seller',account.owner);
 const fixture=core.emptyState();fixture.settings.owners=[names.a,names.b];fixture.settings.budgets[month]=2000;fixture.settings.annualBudgets[year]=20000;
 fixture.settings.sellerGoals[names.a]={[month]:{revenue:800,grossProfit:250,qualified:3}};fixture.settings.sellerAnnualGoals[names.a]={[year]:9000};
 fixture.settings.sellerGoals[names.retired]={[month]:{revenue:700,grossProfit:200,qualified:2}};fixture.settings.sellerAnnualGoals[names.retired]={[year]:7000};
 fixture.settings.sellerGoals[names.goal]={[month]:{revenue:500,grossProfit:null,qualified:null}};
 const makeCustomer=(id,owner,prospecting={})=>core.CustomerSchema.parse({id,name:id,owner,contact:'Verifierad testkontakt',prospecting});
 fixture.customers=[makeCustomer('seller-profile-c-a',names.a),makeCustomer('seller-profile-c-q-a',names.b,{qualifiedAt:at,qualifiedOwner:names.a}),makeCustomer('seller-profile-c-missing',names.a,{qualifiedAt:at}),makeCustomer('seller-profile-c-retired',names.b,{qualifiedAt:at,qualifiedOwner:names.retired})];
 function historicalOrder(id,owner,snapshot,value,cost,date=month+'-03'){
  const deal=core.DealSchema.parse({id:id+'-deal',customerId:fixture.customers[0].id,owner,title:id,stage:'won',confirmed:true,value,cost});fixture.deals.push(deal);
  const order=core.OrderSchema.parse({id,customerId:deal.customerId,dealId:deal.id,owner,stage:'delivered',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:date,deliveredDate:date,invoiceDate:date,invoiceRef:id+'-invoice',invoiceValue:value,actualCost:cost,notes:'',invoiceOwner:snapshot});
  // Omit provenance to exercise an actual old stored record rather than schema defaults.
  delete order.invoiceOwnerSource;delete order.invoiceOwnerId;fixture.orders.push(order);return order;
 }
 historicalOrder('seller-profile-invoice-a',names.b,names.a,400,240);
 historicalOrder('seller-profile-invoice-a-annual',names.b,names.a,200,120,'2026-08-03');
 historicalOrder('seller-profile-invoice-b',names.b,names.b,100,60);
 historicalOrder('seller-profile-invoice-retired',names.b,names.retired,300,180);
 historicalOrder('seller-profile-invoice-fallback',names.a,'',250,150);
 fixture.tasks=[core.TaskSchema.parse({id:'seller-profile-old-task',customerId:fixture.customers[0].id,owner:names.task,title:'Äldre utfört arbete',due:month+'-01',done:true})];
 assert.equal(await store.commit('demo',await store.load('demo'),fixture,crypto.randomUUID()),true);
 let state=await get('demo');
 const profile=alias=>sellers.sellerProfileForOwner(state.settings,alias),metrics=id=>dashboards.salesMetrics(state,month,id);
 const input=(st,values)=>({expectedContext:conflicts.sellerProfilesBasis(st),...values});
 async function save(type,data,id){const r=await post(state,type,data,'demo',id);assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;return r;}
 async function reject(type,data,status=400){const version=state.version,r=await post(state,type,data,'demo');assert.equal(r.status,status,JSON.stringify(r.data));assert.equal((await get('demo')).version,version);return r;}
 assert.equal((await readAs(accounts.a)).viewer.memberId,accounts.a.id);assert.notEqual(accounts.a.id,accounts.a.user);
 assert.equal(sellers.personalSellerId(await readAs(accounts.a)),names.a,'Uninitialized workspaces retain the legacy personal view.');
 assert.equal(dashboards.salesMetrics(state,month,names.a).revenue,650);
 assert.equal(dashboards.teamSalesRows(state,month).find(row=>row.owner===names.retired).revenue,300,'Removing an old operational owner cannot hide pre-migration team history.');
 assert.equal(state.orders.find(o=>o.id==='seller-profile-invoice-fallback').invoiceOwnerSource,'legacy_fallback');
 assert.deepEqual(new Set(sellers.legacySellerNames(state)),new Set([names.a,names.b,names.retired,names.goal,names.task]));
 let init=input(state,{profiles:sellers.legacySellerNames(state).map(legacyOwnerName=>({legacyOwnerName,displayName:legacyOwnerName,memberId:legacyOwnerName===names.a?accounts.a.id:legacyOwnerName===names.b?accounts.b.id:''}))});
 await reject('seller_profiles_init',{...init,profiles:init.profiles.filter(p=>p.legacyOwnerName!==names.retired)});
 await reject('seller_profiles_init',{...init,profiles:[...init.profiles.slice(0,-1),init.profiles[0]]});
 for(const account of [accounts.a,accounts.production,accounts.reader]){const denied=await writeAs(account,state,'seller_profiles_init',init);assert.equal(denied.status,403,JSON.stringify(denied.data));}
 const initBase=state,initDb=globalThis.__crmEnv.DB,initNormalBatch=initDb.batch;let initRaced=false,staleInit;
 initDb.batch=async statements=>{if(!initRaced&&statements[0].sql.startsWith('UPDATE crm_spaces')){initRaced=true;const peer=await post(initBase,'settings',{...initBase.settings,sellerGoals:{...initBase.settings.sellerGoals,[names.goal]:{[month]:{revenue:525,grossProfit:null,qualified:null}}}},'demo');assert.equal(peer.status,200,JSON.stringify(peer.data));}return initNormalBatch(statements);};
 try{staleInit=await post(initBase,'seller_profiles_init',init,'demo');}finally{initDb.batch=initNormalBatch;}
 assert.ok(initRaced);assert.equal(staleInit.status,409,JSON.stringify(staleInit.data));assert.equal(staleInit.data.code,'seller_profile_conflict');state=await get('demo');assert.equal(state.settings.sellerProfilesInitialized,false);assert.deepEqual(state.settings.sellerProfiles,[]);
 assert.equal((await post(state,'seller_profiles_init',init,'demo',staleInit.id)).status,409);init={...init,expectedContext:conflicts.sellerProfilesBasis(state)};
 const beforeInit=state,initialized=await save('seller_profiles_init',init),ids=state.settings.sellerProfiles.map(p=>p.id);
 assert.equal(new Set(ids).size,5);for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
 const replay=await post(beforeInit,'seller_profiles_init',init,'demo',initialized.id);assert.equal(replay.status,200);assert.deepEqual(replay.data.settings.sellerProfiles,state.settings.sellerProfiles);
 assert.equal(profile(names.retired).active,false);assert.equal(profile(names.task).active,false);
 const idA=profile(names.a).id,idB=profile(names.b).id,idRetired=profile(names.retired).id;
 // Explicit initial account links are audited by the server, including its actor and time.
 for(const [alias,account] of [[names.a,accounts.a],[names.b,accounts.b]]){
  const history=profile(alias).linkHistory;assert.equal(history.length,1);assert.equal(history[0].previousMemberId,'');assert.equal(history[0].nextMemberId,account.id);
  assert.equal(history[0].byId,beforeInit.viewer.id);assert.equal(history[0].byName,beforeInit.viewer.name);assert.ok(history[0].reason);assert.equal(new Date(history[0].at).toISOString(),history[0].at);
 }
 assert.deepEqual(profile(names.retired).linkHistory,[]);const historyBeforeRename=structuredClone(profile(names.a).linkHistory);
 assert.equal(state.orders.find(o=>o.id==='seller-profile-invoice-a').invoiceOwnerId,idA);
 assert.equal(state.orders.find(o=>o.id==='seller-profile-invoice-a').invoiceOwnerSource,'legacy_recorded');
 assert.equal(state.orders.find(o=>o.id==='seller-profile-invoice-fallback').invoiceOwnerId,'');
 assert.equal(state.customers.find(c=>c.id==='seller-profile-c-missing').prospecting.qualifiedOwnerId,'');
 assert.equal(state.customers.find(c=>c.id==='seller-profile-c-q-a').prospecting.qualifiedOwnerId,idA);
 assert.deepEqual(state.settings.sellerGoalsById[idA],fixture.settings.sellerGoals[names.a]);assert.deepEqual(state.settings.sellerAnnualGoalsById[idA],fixture.settings.sellerAnnualGoals[names.a]);
 assert.equal(metrics(idA).revenue,400);assert.equal(metrics(idA).yearRevenue,600);assert.equal(metrics(idA).qualified,1);assert.equal(metrics(idA).target,800);assert.equal(metrics(idA).yearTarget,9000);assert.equal(metrics(idA).margin,40);
 assert.equal(metrics('all').revenue,1050);assert.equal(metrics('all').unattributedRevenue,250);assert.equal(metrics('all').unattributedQualified,1);
 const unknownScope=metrics(crypto.randomUUID());assert.equal(unknownScope.revenue,0);assert.equal(unknownScope.qualified,0);assert.equal(unknownScope.pipeline,0);assert.equal(unknownScope.tasks.length,0);assert.equal(unknownScope.customers.length,0);
 assert.equal(dashboards.teamSalesRows(state,month).find(r=>r.id===idRetired).revenue,300);
 const meaningful=s=>({revenue:s.revenue,yearRevenue:s.yearRevenue,target:s.target,yearTarget:s.yearTarget,profit:s.profit,margin:s.margin,qualified:s.qualified,qualifiedTarget:s.qualifiedTarget});
 const ownBefore=meaningful(metrics(idA)),rowsBefore=dashboards.teamSalesRows(state,month),seriesBefore=dashboards.salesYearSeries(state,year,idA),originalAlias=profile(names.a).legacyOwnerName;
 await save('seller_profile',input(state,{id:idA,displayName:'Nytt visningsnamn'}));
 assert.deepEqual(meaningful(metrics(idA)),ownBefore);assert.deepEqual(dashboards.salesYearSeries(state,year,idA),seriesBefore);assert.equal(profile(names.a).legacyOwnerName,originalAlias);assert.deepEqual(profile(names.a).linkHistory,historyBeforeRename);
 // Reusing a name and even making both labels identical must not merge identities.
 await save('seller_profile',input(state,{id:idB,displayName:names.a}));
 assert.equal(metrics(idB).revenue,100);assert.equal(metrics(idB).qualified,0);assert.equal(metrics(idB).target,null);
 await save('seller_profile',input(state,{id:idA,displayName:names.a}));
 const sameNameRows=dashboards.teamSalesRows(state,month).filter(r=>r.displayName===names.a);assert.equal(sameNameRows.length,2);assert.equal(new Set(sameNameRows.map(r=>r.id)).size,2);
 assert.deepEqual(sameNameRows.map(r=>r.revenue).sort((a,b)=>a-b),[100,400]);assert.equal(dashboards.teamSalesRows(state,month).reduce((sum,r)=>sum+r.revenue,0)+metrics('all').unattributedRevenue,metrics('all').revenue);
 assert.equal(dashboards.teamSalesRows(state,month).find(r=>r.id===idRetired).active,false);assert.equal(rowsBefore.find(r=>r.id===idRetired).qualified,1);
 const linked=await readAs(accounts.a);assert.equal(dashboards.personalResultScope(linked),idA);
 assert.equal(sellers.personalSellerId({...linked,viewer:{...linked.viewer,name:'Irrelevant nytt namn',owner:names.b,id:'Not the member ID'}}),idA);
 assert.equal(sellers.personalSellerId({...linked,viewer:{...linked.viewer,memberId:'unlinked-member',name:names.a,owner:names.a}}),'');
 await reject('seller_profile',input(state,{id:idA,legacyOwnerName:names.b,displayName:'Aliasförfalskning'}));
 await reject('seller_profile',input(state,{id:idA,displayName:names.a,active:false}));
 for(const patch of [{sellerProfiles:[]},{sellerProfilesInitialized:false},{sellerProfiles:state.settings.sellerProfiles.map(p=>p.id===idA?{...p,memberId:accounts.b.id}:p)}])await reject('settings',{...state.settings,...patch});
 await reject('settings',{...state.settings,sellerGoalsById:{...state.settings.sellerGoalsById,[crypto.randomUUID()]:{[month]:{revenue:1,grossProfit:null,qualified:null}}}});
 const registry=structuredClone(state.settings.sellerProfiles),minimalSettings={...state.settings};delete minimalSettings.sellerProfiles;delete minimalSettings.sellerProfilesInitialized;delete minimalSettings.sellerGoalsById;delete minimalSettings.sellerAnnualGoalsById;
 await save('settings',minimalSettings);assert.deepEqual(state.settings.sellerProfiles,registry);assert.equal(state.settings.sellerGoalsById[idA][month].revenue,800);
 await save('settings',{...state.settings,sellerGoalsById:{...state.settings.sellerGoalsById,[idB]:{[month]:{revenue:600,grossProfit:120,qualified:1}}},sellerAnnualGoalsById:{...state.settings.sellerAnnualGoalsById,[idB]:{[year]:6000}}});
 assert.equal(metrics(idA).target,800);assert.equal(metrics(idB).target,600);assert.equal(metrics(idB).yearTarget,6000);
 const forgedCustomer=state.customers.find(c=>c.id==='seller-profile-c-q-a');
 await reject('customer',{...forgedCustomer,owner:names.a,prospecting:{...forgedCustomer.prospecting,qualifiedOwner:names.b,qualifiedOwnerId:idB}});
 await save('customer',{...forgedCustomer,prospecting:{...forgedCustomer.prospecting,qualifiedOwner:names.b,qualifiedOwnerId:idB}});
 assert.equal(state.customers.find(c=>c.id===forgedCustomer.id).prospecting.qualifiedOwnerId,idA);
 await save('customer_responsibility_transfer',{customerId:forgedCustomer.id,targetProfileId:idA,selectedTaskIds:[],reviewed:true,reason:'Kontrollerad kundöverlämning utan ändrad säljarhistorik',expectedContext:responsibility.customerResponsibilityBasis(state,forgedCustomer.id)});
 assert.equal(state.customers.find(c=>c.id===forgedCustomer.id).prospecting.qualifiedOwnerId,idA);
 const missing=state.customers.find(c=>c.id==='seller-profile-c-missing');
 await save('prospecting',{customerId:missing.id,prospecting:{...missing.prospecting,stage:'qualified',reason:'Relevant',need:'Jackor',scope:'20 plagg',timing:core.day(),nextAction:'Stäm av underlag',nextDate:core.day(),qualifiedOwner:names.a,qualifiedOwnerId:idA}});
 assert.equal(state.customers.find(c=>c.id===missing.id).prospecting.qualifiedOwner,'');assert.equal(state.customers.find(c=>c.id===missing.id).prospecting.qualifiedOwnerId,'','An edit cannot manufacture an old qualification snapshot.');
 // A replacement account may share an operational alias but gets no old results.
 await memberSave(accounts.a,false);await memberSave(accounts.replacement,true);
 accounts.replacement.id=sqlite.prepare('SELECT id FROM crm_members WHERE email=?').get(accounts.replacement.email).id;
 assert.equal(sellers.personalSellerId(await readAs(accounts.replacement)),'');assert.equal(metrics(idA).revenue,400);
 await save('seller_profile',input(state,{id:idA,displayName:'Namnbyte med avstängt konto'}));assert.equal(profile(names.a).memberId,accounts.a.id);
 await reject('seller_profile',input(state,{id:idA,displayName:names.a,memberId:accounts.replacement.id}));
 await reject('seller_profile',input(state,{id:idA,displayName:names.a,memberId:accounts.replacement.id,confirmRelink:true}));
 const beforeRelink=state,relinkPayload=input(state,{id:idA,displayName:names.a,memberId:accounts.replacement.id,confirmRelink:true,reason:'Uttrycklig återkoppling av samma säljaridentitet'}),relinked=await save('seller_profile',relinkPayload);
 assert.equal(profile(names.a).linkHistory.length,historyBeforeRename.length+1);assert.deepEqual(profile(names.a).linkHistory.slice(0,-1),historyBeforeRename);assert.deepEqual({...profile(names.a).linkHistory.at(-1),at:'timestamp'},{previousMemberId:accounts.a.id,nextMemberId:accounts.replacement.id,reason:relinkPayload.reason,at:'timestamp',byId:beforeRelink.viewer.id,byName:beforeRelink.viewer.name});assert.equal(new Date(profile(names.a).linkHistory.at(-1).at).toISOString(),profile(names.a).linkHistory.at(-1).at);const historyAfterRelink=structuredClone(profile(names.a).linkHistory);
 assert.equal(sellers.personalSellerId(await readAs(accounts.replacement)),idA);assert.deepEqual(meaningful(metrics(idA)),ownBefore);
 assert.equal((await post(beforeRelink,'seller_profile',relinkPayload,'demo',relinked.id)).status,200);assert.deepEqual((await get('demo')).settings.sellerProfiles.find(p=>p.id===idA).linkHistory,historyAfterRelink);
 for(const badMember of ['missing-member',accounts.production.id,accounts.b.id])await reject('seller_profile',input(state,{id:idA,displayName:names.a,memberId:badMember,confirmRelink:true,reason:'Testar ogiltig kontokoppling'}),403);
 // New profiles never adopt old ID-empty records or old name-keyed targets.
 await save('settings',{...state.settings,owners:[...state.settings.owners,names.future]});
 const oldFutureCustomer=makeCustomer('seller-profile-future-legacy',names.future,{qualifiedAt:at,qualifiedOwner:names.future});
 const oldFutureDeal=core.DealSchema.parse({id:'seller-profile-future-legacy-deal',customerId:oldFutureCustomer.id,owner:names.future,title:'Omappad äldre order',stage:'won',confirmed:true,value:70,cost:42});
 const oldFutureOrder=core.OrderSchema.parse({...state.orders[0],id:'seller-profile-future-legacy-order',customerId:oldFutureCustomer.id,dealId:oldFutureDeal.id,owner:names.future,invoiceOwner:names.future,invoiceOwnerId:'',invoiceOwnerSource:'legacy_recorded',invoiceValue:70,actualCost:42});
 const legacyExtra=structuredClone(await store.load('demo'));legacyExtra.customers.push(oldFutureCustomer);legacyExtra.deals.push(oldFutureDeal);legacyExtra.orders.push(oldFutureOrder);legacyExtra.settings.sellerGoals[names.future]={[month]:{revenue:123,grossProfit:null,qualified:1}};
 assert.equal(await store.commit('demo',await store.load('demo'),legacyExtra,crypto.randomUUID()),true);state=await get('demo');
 await save('customer',{name:'seller-profile-future-new-prospect',owner:names.future,contact:'Testkontakt'});const futureProspect=state.customers.find(c=>c.name==='seller-profile-future-new-prospect');
 const qualification=c=>({customerId:c.id,prospecting:{...c.prospecting,stage:'qualified',reason:'Relevant',need:'Arbetskläder',scope:'10 plagg',timing:core.day(),nextAction:'Förbered offert',nextDate:core.day(),qualifiedOwnerId:idA,qualifiedOwner:names.a}});
 await reject('prospecting',qualification(futureProspect));
 await save('customer',{name:'seller-profile-future-order-customer',owner:names.future,contact:'Testkontakt',status:'active'});const futureOrderCustomer=state.customers.find(c=>c.name==='seller-profile-future-order-customer');
 await save('catalog_order',{customerId:futureOrderCustomer.id,owner:names.future,title:'Profil-ID följer orderansvar',lines:[{id:'seller-profile-new-line',article:'TEST-PROFILE',description:'Testjacka',quantity:2,unitPrice:100,unitCost:60}],deliveryDate:core.day(),accepted:true,nextDate:core.day()});
 let newOrder=state.orders.find(o=>o.customerId===futureOrderCustomer.id);
 await save('direct_dispatch',{orderId:newOrder.id,expectedContext:direct.directBasis(state,newOrder.id),entries:[{lineId:'seller-profile-new-line',quantity:2}],dispatchedOn:core.day(),method:'collection',recipient:'Testkontakt',address:{},evidence:'Isolerad verifierad avhämtning',supplierConfirmed:true,noProofNeeded:true});newOrder=state.orders.find(o=>o.id===newOrder.id);
 const invoice=o=>({...o,invoiceValue:200,actualCost:120,invoiceRef:'SELLER-PROFILE-NEW',invoiceDate:core.day(),invoiceOwner:names.a,invoiceOwnerId:idA,invoiceOwnerSource:'legacy_recorded'});
 await reject('order',invoice(newOrder));
 await save('seller_profile',input(state,{legacyOwnerName:names.future,displayName:names.a,memberId:accounts.future.id}));const idFuture=profile(names.future).id;
 assert.equal(metrics(idFuture).revenue,0);assert.equal(metrics(idFuture).qualified,0);assert.equal(metrics(idFuture).target,null);assert.equal(state.settings.sellerGoalsById[idFuture],undefined);
 assert.equal(state.orders.find(o=>o.id===oldFutureOrder.id).invoiceOwnerId,'');assert.equal(state.customers.find(c=>c.id===oldFutureCustomer.id).prospecting.qualifiedOwnerId,'');
 await save('prospecting',qualification(state.customers.find(c=>c.id===futureProspect.id)));
 assert.equal(state.customers.find(c=>c.id===futureProspect.id).prospecting.qualifiedOwnerId,idFuture);assert.equal(state.customers.find(c=>c.id===futureProspect.id).prospecting.qualifiedOwner,names.future);
 await save('order',invoice(state.orders.find(o=>o.id===newOrder.id)));newOrder=state.orders.find(o=>o.id===newOrder.id);
 assert.equal(newOrder.invoiceOwnerId,idFuture);assert.equal(newOrder.invoiceOwner,names.future);assert.equal(newOrder.invoiceOwnerSource,'recorded');
 await save('order',{...newOrder,owner:names.b,invoiceOwnerId:idB,invoiceOwner:names.b,invoiceOwnerSource:'legacy_fallback',invoiceRef:'SELLER-PROFILE-EDIT'});
 assert.equal(state.orders.find(o=>o.id===newOrder.id).invoiceOwnerId,idFuture);assert.equal(state.orders.find(o=>o.id===newOrder.id).invoiceOwner,names.future);assert.equal(state.orders.find(o=>o.id===newOrder.id).invoiceOwnerSource,'recorded');
 await reject('settings',{...state.settings,owners:[...state.settings.owners,names.retired]});
 // Old dialogs stay old even after refreshing the workspace version.
 const stale= input(state,{id:idA,displayName:'Min äldre namndialog'});
 await save('seller_profile',input(state,{id:idB,displayName:'Kollegans nya namn'}));
 const staleResult=await reject('seller_profile',stale,409);assert.equal(staleResult.data.code,'seller_profile_conflict');assert.equal((await post(staleResult.data.state,'seller_profile',stale,'demo',staleResult.id)).status,409);
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch;
 for(const related of [false,true]){
  const base=state,mine=input(base,{id:idA,displayName:related?'Namn efter ändrat underlag':'Namn efter oberoende anteckning'});let injected=false;
  db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;const peer=await post(base,related?'seller_profile':'customer_note',related?input(base,{id:idB,displayName:'Förändring som måste granskas'}):{customerId:base.customers[0].id,text:'Oberoende kundanteckning'},'demo');assert.equal(peer.status,200,JSON.stringify(peer.data));}return normalBatch(statements);};
  let r;try{r=await post(base,'seller_profile',mine,'demo');}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,related?409:200,JSON.stringify(r.data));state=await get('demo');assert.deepEqual(profile(names.a).linkHistory,historyAfterRelink);
 }
 // Permission changes after preflight must be enforced by the actual SQL write.
 const base=state,target=input(base,{id:idFuture,displayName:'Ska inte sparas',memberId:accounts.future.id});let revoked=false;
 // Force a changed link, whose active role must remain valid through the CAS.
 await save('seller_profile',input(state,{id:idFuture,displayName:profile(names.future).displayName,memberId:'',confirmRelink:true,reason:'Frikoppling före race-test'}));
 const raceBase=state,racePayload={...target,expectedContext:conflicts.sellerProfilesBasis(raceBase)};
 db.batch=async statements=>{if(!revoked&&statements[0].sql.startsWith('UPDATE crm_spaces')){revoked=true;sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('production',accounts.future.id);}return normalBatch(statements);};
 let blockedRace;try{blockedRace=await post(raceBase,'seller_profile',racePayload,'demo');}finally{db.batch=normalBatch;sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',accounts.future.id);}
 assert.ok(revoked);assert.equal(blockedRace.status,403,JSON.stringify(blockedRace.data));state=await get('demo');assert.equal(state.version,raceBase.version);assert.equal(profile(names.future).memberId,'');assert.notEqual(profile(names.future).displayName,'Ska inte sparas');
 await save('seller_profile',input(state,{id:idFuture,displayName:profile(names.future).displayName,memberId:accounts.future.id}));
 // Unknown IDs and contradictory provenance fail recovery rather than guessing.
 const snapshot=await store.load('demo');
 const corruptions=[s=>s.orders[0].invoiceOwnerId=crypto.randomUUID(),s=>s.orders.find(o=>o.invoiceOwnerId===idA).invoiceOwnerId=idB,s=>s.orders.find(o=>o.invoiceOwnerSource==='legacy_fallback').invoiceOwnerId=idA,s=>s.customers.find(c=>c.id==='seller-profile-c-missing').prospecting.qualifiedOwnerId=idA,s=>s.settings.sellerGoalsById[crypto.randomUUID()]={[month]:{revenue:1,grossProfit:null,qualified:null}},s=>s.settings.sellerAnnualGoalsById[crypto.randomUUID()]={[year]:1},s=>s.settings.sellerProfiles[1].id=s.settings.sellerProfiles[0].id,s=>s.settings.sellerProfiles[1].memberId=s.settings.sellerProfiles[0].memberId];
 for(const corrupt of corruptions){const bad=structuredClone(snapshot);corrupt(bad);assert.throws(()=>restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:bad}));}
 const department=await readAs(accounts.production);assert.deepEqual(department.settings.sellerProfiles,[]);assert.deepEqual(department.settings.sellerGoalsById,{});assert.ok(department.orders.every(o=>!o.invoiceOwnerId));
 const serialized=await new Response(await stream.exportBackupStream('demo')).text(),exported=JSON.parse(serialized.split('\n')[0]).state;
 assert.deepEqual(exported.settings.sellerProfiles,snapshot.settings.sellerProfiles);assert.deepEqual(exported.settings.sellerGoalsById,snapshot.settings.sellerGoalsById);
 await resetDemo();const targetState=await store.load('demo'),restored=await stream.importBackupStream('demo',new Response(serialized).body,crypto.randomUUID(),targetState.version,actor);
 assert.deepEqual(restored.settings.sellerProfiles,snapshot.settings.sellerProfiles.map(p=>({...p,memberId:''})));assert.deepEqual(restored.settings.sellerGoalsById,snapshot.settings.sellerGoalsById);assert.deepEqual(restored.settings.sellerAnnualGoalsById,snapshot.settings.sellerAnnualGoalsById);
 assert.deepEqual(restored.orders.map(o=>[o.id,o.invoiceOwnerId,o.invoiceOwnerSource]),snapshot.orders.map(o=>[o.id,o.invoiceOwnerId,o.invoiceOwnerSource]));assert.deepEqual(restored.customers.map(c=>[c.id,c.prospecting.qualifiedOwnerId]),snapshot.customers.map(c=>[c.id,c.prospecting.qualifiedOwnerId]));
 assert.equal(sellers.personalSellerId(await readAs(accounts.replacement)),'');assert.deepEqual(meaningful(dashboards.salesMetrics(restored,month,idA)),meaningful(dashboards.salesMetrics(snapshot,month,idA)));
 console.log('PASS seller profiles: explicit legacy migration, immutable attribution and goals, renamed/reused/duplicate labels, inactive history, missing snapshots, authenticated member IDs, relink audit, forgery and role guards, actual CAS conflicts/permission races, and backup/restore without automatic account relinking.');
}
