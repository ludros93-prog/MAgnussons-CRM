import assert from 'node:assert/strict';

export async function verifyProspectSuppression({core,ops,sqlite,get,post,rolePost,roleGet,headers,api,conflicts}) {
 // The linear list index must preserve the detailed history helper's
 // decisions across legacy duplicates, captured identities and source→org.
 const sample=ops.LeadSchema.parse({id:'index-old',name:'Index test',organizationNumber:'556408-7491',source:'Provider',sourceRecordId:'row-1'});
 const entry=(revision,identity,blocked)=>({id:'index-decision-'+revision,identity,revision,blocked,reason:'Index test decision',at:'2026-10-05T10:00:00Z',byId:'test',byName:'Test'});
 const indexRows=[
  {...sample,contactHistory:[entry(1,'org:5564087491',true)]},
  {...sample,id:'index-duplicate',source:'Other provider',contactHistory:[]},
  {...sample,id:'index-upgraded',organizationNumber:'556333-4444',contactHistory:[entry(2,'source:'+JSON.stringify(['Provider','row-1']),true)]},
  {...sample,id:'index-provider',organizationNumber:'',contactHistory:[]},
  {...sample,id:'index-reopened',organizationNumber:'5563334444',source:'Other',contactHistory:[entry(3,'org:5563334444',false)]},
  {...sample,id:'index-keyless',organizationNumber:'',sourceRecordId:'',contactHistory:[entry(4,'lead:index-keyless',true)]},
  {...sample,id:'index-same-domain',organizationNumber:'',sourceRecordId:'',contactHistory:[]}
 ];
 const indexed=ops.leadContactDecisions(indexRows);for(const row of indexRows)assert.deepEqual(indexed.get(row.id),ops.leadContactDecision(indexRows,row));
 assert.equal(indexed.get('index-duplicate').blocked,true);assert.equal(indexed.get('index-provider').blocked,true);assert.equal(indexed.get('index-upgraded').blocked,false);assert.equal(indexed.get('index-same-domain'),undefined);
 let state=await get('live');
 const conversionOwner=state.settings.owners[0];assert.ok(conversionOwner,'The test needs an allowed owner for lead conversion.');
 let existingCustomerOwner=state.settings.owners.find(owner=>owner!==conversionOwner);
 if(!existingCustomerOwner){
  existingCustomerOwner='Kontaktspärr testansvarig';
  const configured=await post(state,'settings',{...state.settings,owners:[...state.settings.owners,existingCustomerOwner]},'live');
  assert.equal(configured.status,200,JSON.stringify(configured.data));state=configured.data;
 }
 assert.ok(state.settings.owners.includes(conversionOwner)&&state.settings.owners.includes(existingCustomerOwner));
 assert.notEqual(existingCustomerOwner,conversionOwner,'The customer-link test must exercise a different existing owner.');
 const source='Kontaktspärr regression A',org='556408-7491';
 const initial={name:'Kontaktspärr regression AB',organizationNumber:org,source,sourceRecordId:'company-1',city:'Testort',website:'https://example.com',contacts:[{name:'Testkontakt',email:'suppression@example.com'}]};
 const importRows=rows=>post(state,'lead_import',{leads:rows},'live');
 const contactInput=(st,id,blocked,reason='Dokumenterat kontaktbeslut')=>({id,blocked,reason,expectedContext:conflicts.leadContactBasis(st,id)});
 const convert=(id)=>({id,owner:conversionOwner,contactIndex:0,nextDate:core.day(),nextAction:'Ring verifierad kontakt'});
 const lead=id=>state.leads.find(l=>l.id===id);
 const decision=id=>ops.leadContactDecision(state.leads,lead(id));
 let result=await importRows([initial]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const id=state.leads.find(l=>l.sourceRecordId==='company-1'&&l.source===source).id;
 assert.equal(decision(id),undefined);
 const blockInput=contactInput(state,id,true,'Företaget vill inte bli kontaktat');
 result=await rolePost('seller',state,'lead_contact',blockInput);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const blockedEvent=structuredClone(decision(id));
 assert.equal(blockedEvent.byId,'ops-seller');assert.equal(blockedEvent.byName,'seller');assert.equal(blockedEvent.identity,'org:5564087491');assert.ok(blockedEvent.at);
 const retry=await rolePost('seller',state,'lead_contact',blockInput,result.id);assert.equal(retry.status,200);assert.equal(retry.data.leads.find(l=>l.id===id).contactHistory.length,1);
 const protectedVersion=state.version,customersBefore=state.customers.length,tasksBefore=state.tasks.length;
 result=await post(state,'lead_convert',convert(id),'live');assert.equal(result.status,400,JSON.stringify(result.data));assert.match(result.data.error,/spärrat/);
 assert.equal((await get('live')).version,protectedVersion);assert.equal((await get('live')).customers.length,customersBefore);assert.equal((await get('live')).tasks.length,tasksBefore);
 // Import must preserve decisions despite a changed provider, number formatting
 // and a client's attempt to inject a fabricated reopening decision.
 const forged={...blockedEvent,id:crypto.randomUUID(),revision:99999,blocked:false,byId:'forged',byName:'Forged',reason:'Injected'};
 result=await importRows([{...initial,name:'Kontaktspärr regression uppdaterad AB',organizationNumber:'165564087491',source:'Kontaktspärr regression B',sourceRecordId:'other-id',contacts:[{name:'Ytterligare testkontakt',phone:'000000'}],contactHistory:[forged]}]);
 assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 assert.equal(lead(id).source,'Kontaktspärr regression B');assert.equal(lead(id).contacts.length,2);assert.deepEqual(lead(id).contactHistory,[blockedEvent]);assert.equal(decision(id).blocked,true);
 result=await importRows([{...initial,organizationNumber:'5564087491',source:'Kontaktspärr regression C',contactHistory:[]}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.deepEqual(lead(id).contactHistory,[blockedEvent]);
 assert.equal(state.leads.filter(l=>ops.leadOrganizationKey(l.organizationNumber)==='5564087491').length,1);
 assert.equal(ops.leadOrganizationKey('155564087491'),'');assert.equal(ops.leadOrganizationKey('SE556408749101'),'');
 result=await importRows([{...initial,organizationNumber:'SE556408749101'}]);assert.equal(result.status,400,JSON.stringify(result.data));assert.match(result.data.error,/Momsnummer/);
 // A shared domain/name/city with another explicit legal entity is not a match.
 result=await importRows([{...initial,organizationNumber:'556777-8888',sourceRecordId:'different-company'}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const otherId=state.leads.find(l=>l.source===source&&l.sourceRecordId==='different-company').id;assert.equal(decision(otherId),undefined);
 result=await importRows([{...initial,organizationNumber:'556111-2222',source:'Kontaktspärr regression C'}]);assert.equal(result.status,400,'A provider record ID cannot silently move to another legal entity.');
 // Older duplicate records with the same entity share the block and reopening.
 const duplicate=ops.LeadSchema.parse({...lead(id),id:'suppression-legacy-duplicate',source:'Legacy duplicate',sourceRecordId:'',contactHistory:[],customerId:''});
 sqlite.prepare('INSERT INTO crm_leads(space,id,data) VALUES(?,?,?)').run('live',duplicate.id,JSON.stringify(duplicate));state=await get('live');
 assert.equal(decision(duplicate.id).blocked,true);assert.equal((await post(state,'lead_convert',convert(duplicate.id),'live')).status,400);
 const stale=contactInput(state,id,false,'Min gamla återöppning');
 result=await rolePost('seller',state,'lead_contact',contactInput(state,duplicate.id,false,'Företaget har uttryckligen tillåtit kontakt igen'));assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 assert.equal(decision(id).blocked,false);assert.equal(ops.leadContactHistory(state.leads,lead(id)).length,2);assert.deepEqual(lead(id).contactHistory,[blockedEvent]);
 result=await post(state,'lead_contact',stale,'live');assert.equal(result.status,409,JSON.stringify(result.data));assert.equal(result.data.code,'lead_contact_conflict');
 assert.equal((await post(result.data.state,'lead_contact',stale,'live',result.id)).status,409,'Refreshing the workspace must not replace a dialog basis.');
 result=await importRows([{...initial,source:'Kontaktspärr regression D'}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.equal(decision(id).blocked,false);
 result=await post(state,'lead_convert',convert(id),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const linkedCustomer=lead(id).customerId,customer=state.customers.find(c=>c.id===linkedCustomer);assert.ok(linkedCustomer);assert.equal(customer.owner,state.settings.owners[0]);assert.equal(customer.contact,'Testkontakt');
 result=await importRows([{...initial,source:'Kontaktspärr regression E',customerId:'forged-customer',contactHistory:[]}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.equal(lead(id).customerId,linkedCustomer);assert.equal(state.customers.find(c=>c.id===linkedCustomer).owner,customer.owner);assert.equal(decision(id).blocked,false);
 // Swedish 12-digit provider IDs link to an existing 10-digit CRM customer
 // and preserve its current owner/contact instead of creating another card.
 result=await post(state,'customer',{name:'Befintlig kund med tio siffror',organizationNumber:'556777-8888',owner:existingCustomerOwner,contact:'Befintlig kontakt'},'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const existing=state.customers.find(c=>c.name==='Befintlig kund med tio siffror'),existingCount=state.customers.length;
 result=await importRows([{...initial,organizationNumber:'165567778888',sourceRecordId:'different-company'}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 result=await post(state,'lead_convert',convert(otherId),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.equal(lead(otherId).customerId,existing.id);assert.equal(state.customers.length,existingCount);assert.equal(state.customers.find(c=>c.id===existing.id).owner,existing.owner);assert.equal(state.customers.find(c=>c.id===existing.id).contact,'Befintlig kontakt');
 // Missing/null organization numbers share decisions only through an exact
 // provider record ID. Ambiguous name/location imports must ask for identity.
 const noOrg={name:'Kontaktspärr utan org',organizationNumber:null,source:'Kontaktspärr källa utan org',sourceRecordId:'no-org-1',city:'Testort',contacts:[]};
 result=await importRows([noOrg]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const sourceId=state.leads.find(l=>l.sourceRecordId==='no-org-1').id;assert.equal(lead(sourceId).organizationNumber,'');
 result=await post(state,'lead_contact',contactInput(state,sourceId,true),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 result=await importRows([{...noOrg,organizationNumber:undefined,contactHistory:[]}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.equal(decision(sourceId).blocked,true);assert.equal(state.leads.filter(l=>l.sourceRecordId==='no-org-1').length,1);
 for(const row of [{...noOrg,source:'Different source'},{...noOrg,sourceRecordId:''},{...noOrg,sourceRecordId:undefined,organizationNumber:undefined}]){
  const count=state.leads.length;result=await importRows([row]);assert.equal(result.status,400,JSON.stringify(result.data));assert.match(result.data.error,/identiteten är osäker/);assert.equal((await get('live')).leads.length,count);
 }
 // A post with no stable key can still be explicitly blocked; uncertain
 // reimports cannot quietly create an available copy beside it.
 const keyless={name:'Kontaktspärr helt utan nyckel',organizationNumber:null,source:'Keyless source',city:'Testort'};
 result=await importRows([keyless]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 const keylessId=state.leads.find(l=>l.name===keyless.name).id;
 result=await post(state,'lead_contact',contactInput(state,keylessId,true),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 for(const organizationNumber of [null,undefined,'']){result=await importRows([{...keyless,organizationNumber,sourceRecordId:''}]);assert.equal(result.status,400,JSON.stringify(result.data));assert.equal((await get('live')).leads.filter(l=>l.name===keyless.name).length,1);}
 // Same name/location alone must not carry a decision to an unrelated post.
 const differentName={...noOrg,name:'Orelaterat företag utan org',source:'Different source',sourceRecordId:'different-no-org'};
 result=await importRows([differentName]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.equal(decision(state.leads.find(l=>l.name===differentName.name).id),undefined);
 // New imports can never create a decision, even from an admin-supplied row.
 result=await importRows([{name:'Historik får inte importeras',organizationNumber:'556555-6666',source,contactHistory:[forged]}]);assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;assert.deepEqual(state.leads.find(l=>l.name==='Historik får inte importeras').contactHistory,[]);
 for(const role of ['print','warehouse','production'])assert.equal((await rolePost(role,await roleGet(role),'lead_contact',contactInput(state,sourceId,false))).status,403);
 const readerHeaders={'oai-authenticated-user-id':'reader','oai-authenticated-user-email':'reader@example.com'};
 const reader=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...readerHeaders,'Content-Type':'application/json',Origin:'https://crm.test'},body:JSON.stringify({space:'live',version:state.version,requestId:crypto.randomUUID(),type:'lead_contact',data:contactInput(state,sourceId,false)})}));assert.equal(reader.status,403);
 const withoutBasis=contactInput(state,sourceId,false);delete withoutBasis.expectedContext;assert.equal((await post(state,'lead_contact',withoutBasis,'live')).status,400);
 assert.equal((await post(state,'lead_contact',contactInput(state,sourceId,false,'  '),'live')).status,400);
 assert.equal((await rolePost('seller',state,'lead_import',{leads:[initial]})).status,403);
 assert.throws(()=>core.applyAction(state,{type:'lead_contact',data:contactInput(state,sourceId,false)},{id:'operator',name:'Operator',role:'production',owner:''}),/Kontaktspärrar/);
 // Force real database CAS loss: independent work merges safely; a competing
 // decision for the same entity requires a deliberate review of new status.
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch;
 for(const sameEntity of [false,true]){
  const base=state,myInput=contactInput(base,sourceId,false,'Mitt beslut efter CAS'),other=contactInput(base,sameEntity?sourceId:keylessId,false,'Kollegans beslut vid CAS');let injected=false;
  db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;const peer=await post(base,'lead_contact',other,'live');assert.equal(peer.status,200,JSON.stringify(peer.data));}return normalBatch(statements);};
  try{result=await post(base,'lead_contact',myInput,'live');}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(result.status,sameEntity?409:200,JSON.stringify(result.data));state=await get('live');assert.equal(decision(sourceId).reason,sameEntity?'Kollegans beslut vid CAS':'Mitt beslut efter CAS');
  if(!sameEntity){result=await post(state,'lead_contact',contactInput(state,sourceId,true,'Spärr före nästa CAS-prov'),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;}
 }
 result=await post(state,'lead_contact',contactInput(state,sourceId,true,'Aktiv kontaktspärr som ska följa kopian'),'live');assert.equal(result.status,200,JSON.stringify(result.data));state=result.data;
 // Export and restore the real serialized decisions in an isolated workspace.
 const store=await import('../work/crm-store.mjs'),stream=await import('../work/crm-backup-stream.mjs');
 for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');
 await store.initialize('demo');sqlite.prepare('UPDATE crm_spaces SET version=1 WHERE id=?').run('demo');
 const fixture=await store.load('demo'),snapshot=structuredClone(fixture);snapshot.leads=[{...lead(keylessId),customerId:''},{...lead(sourceId),customerId:''},...state.leads.filter(l=>[id,duplicate.id].includes(l.id)).map(l=>({...l,customerId:''}))];
 assert.equal(await store.commit('demo',fixture,snapshot,crypto.randomUUID()),true);
 const serialized=await new Response(await stream.exportBackupStream('demo')).text();
 for(const table of ['crm_leads','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');
 const target=await store.load('demo');
 const restored=await stream.importBackupStream('demo',new Response(serialized).body,crypto.randomUUID(),target.version,{id:'test-admin',name:'Test admin',role:'admin',owner:''});
 assert.equal(restored.leads.length,snapshot.leads.length);assert.deepEqual(new Map(restored.leads.map(row=>[row.id,row])),new Map(snapshot.leads.map(row=>[row.id,row])));for(const row of snapshot.leads)assert.deepEqual(ops.leadContactHistory(restored.leads,row),ops.leadContactHistory(snapshot.leads,row));
 assert.equal(ops.leadContactDecision(restored.leads,restored.leads.find(l=>l.id===id)).blocked,false);
 assert.equal(ops.leadContactDecision(restored.leads,restored.leads.find(l=>l.id===sourceId)).blocked,true);
 result=await post(await get('demo'),'lead_import',{leads:[{...noOrg,contactHistory:[]}]},'demo');assert.equal(result.status,200,JSON.stringify(result.data));const afterRestoreImport=result.data;
 assert.equal(ops.leadContactDecision(afterRestoreImport.leads,afterRestoreImport.leads.find(l=>l.id===sourceId)).blocked,true);
 result=await post(afterRestoreImport,'lead_convert',convert(sourceId),'demo');assert.equal(result.status,400,JSON.stringify(result.data));assert.match(result.data.error,/spärrat/);
 console.log('PASS prospect suppression: exact organization/provider identity, source changes, blocked conversion, retained imported history, no history injection, null/keyless ambiguity rejection, distinct legal entities, legacy duplicates, audited reopening, immutable conflicts, role guards, real CAS retries and export/restore.');
}
