import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, Log, LogLevel }=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
import * as core from '../work/core.mjs';
import * as conflicts from '../work/record-conflicts.mjs';
// Run after tests/outlook.mjs and pnpm build. No production bindings or data.
const root = fileURLToPath(new URL('../',import.meta.url)), statePath = mkdtempSync(join(tmpdir(),'magnussons-runtime-'));
const serverRoot=root+'/dist/server';
const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(f=>/\.m?js$/.test(f));
const mf = new Miniflare({ modulesRoot:serverRoot, modules:[
  {type:'ESModule',path:serverRoot+'/index.js'},
  ...moduleFiles.filter(f=>f!=='index.js').map(f=>({type:'ESModule',path:serverRoot+'/'+f}))],
  compatibilityDate:'2026-05-15', compatibilityFlags:['nodejs_compat'], cf:false,
  log:new Log(LogLevel.ERROR), d1Databases:{DB:'crm-runtime'}, r2Buckets:{BUCKET:'crm-runtime'},
  d1Persist:statePath+'/d1', r2Persist:statePath+'/r2',
  assets:{directory:root+'/dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}} });
const origin='http://localhost', headers={'oai-authenticated-user-id':'runtime-admin','oai-authenticated-user-email':'runtime-admin@example.test'};
const api = (url,options={})=>mf.dispatchFetch(origin+url,options);
try {
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())
    for(const sql of readFileSync(root+'/drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await db.prepare(sql).run();
  await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').bind('runtime-admin','runtime-admin@example.test','runtime-admin','Runtime test','admin','Sebastian Hansson').run();
  assert.equal((await api('/api/crm?space=live')).status,401);
  const home=await api('/');assert.equal(home.status,200);assert.match(await home.text(),/Magnussons/);
  const get=async(space='live')=>{const r=await api('/api/crm?space='+space,{headers});assert.equal(r.status,200);return r.json();};
  let state=await get();
  const post=async(type,data)=>{const record=conflicts.editableRecord(state,type,data.id||''),r=await api('/api/crm',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({space:'live',version:state.version,requestId:crypto.randomUUID(),expectedRecord:record?conflicts.recordBasis(record):undefined,type,data})});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));state=value;return value;};
  await post('customer',{name:'Isolerat körprov AB',owner:'Sebastian Hansson',contact:'Testbeställare'});
  const customer=state.customers[0], today=core.day();
  await post('catalog_order',{customerId:customer.id,owner:customer.owner,title:'Körprov med filer',lines:[{id:'runtime-line',kind:'product',article:'TEST-1',description:'Jacka',quantity:50,unitPrice:100,unitCost:50}],deliveryDate:core.plusDays(today,30),accepted:true,nextDate:today});
  let order=state.orders[0];
  const sources=[];
  async function upload(name,kind,photo=false){
    const bytes=new Uint8Array(4500000);for(let i=0;i<bytes.length;i++)bytes[i]=(i+sources.length*61)%251;
    bytes.set(photo?[137,80,78,71,13,10,26,10]:[37,80,68,70,45]);
    const form=new FormData();form.set('space','live');form.set('customerId',customer.id);form.set('version','runtime-v1');form.set('kind',kind);form.set('file',new File([bytes],name));
    if(photo){form.set('purpose','production');form.set('orderId',order.id);form.set('workId',order.production.workId);}
    const serialized=new Request(origin+'/api/crm/files',{method:'POST',headers:{...headers,Origin:origin},body:form});
    const r=await api('/api/crm/files',{method:'POST',headers:Object.fromEntries(serialized.headers),body:new Uint8Array(await serialized.arrayBuffer())});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));sources.push({metadata:value,sha256:createHash('sha256').update(bytes).digest('hex')});state=await get();return value;
  }
  const proof=await upload('korrektur.pdf','proof');
  order=state.orders[0];await post('order',{...order,proofApproved:true,proofFileId:proof.id,proofVersion:proof.version,approvedBy:'Testkund',approvedDate:today,supplierConfirmed:true});
  order=state.orders[0];await post('production_submit',{orderId:order.id,production:{lines:state.deals[0].lines,sketchFileId:proof.id,sketchVersion:proof.version,instructions:'Brösttryck enligt godkänt korrektur',printDeadline:core.plusDays(today,10),dispatchDeadline:core.plusDays(today,20)}});
  order=state.orders[0];await upload('arbetsfoto.png','document',true);await upload('original.pdf','logo');
  const before=await get();
  // Use the real HTTP listener: RPC dispatch can hide framing/stream errors.
  const exported=await fetch(new URL('/api/crm/backup?space=live&format=stream',await mf.ready),{headers:{...headers,'Accept-Encoding':'identity'}});assert.equal(exported.status,200);
  const bytes=new Uint8Array(await exported.arrayBuffer()), records=new TextDecoder().decode(bytes).trimEnd().split('\n');
  assert.equal(Number(exported.headers.get('Content-Length')),bytes.byteLength,'Built workerd declares the exact complete backup length');
  const end=JSON.parse(records.at(-1));assert.equal(end.bytes,13500000);assert.equal(end.files,3);
  await db.prepare('INSERT INTO crm_spaces(id,version,write_token,settings) VALUES(?,0,?,?)').bind('demo','',JSON.stringify(core.emptyState().settings)).run();
  const requestId=crypto.randomUUID(), restoreUrl='/api/crm/backup?space=demo&version=0&requestId='+requestId;
  const restoreOptions={method:'POST',headers:{...headers,'Content-Type':'application/x-ndjson',Origin:origin},body:bytes};
  const restoredResponse=await api(restoreUrl,restoreOptions);const restored=await restoredResponse.json();assert.equal(restoredResponse.status,200,JSON.stringify(restored));
  assert.equal(restored.customers.length,1);assert.equal(restored.orders.length,1);assert.equal(restored.orders[0].proofApproved,true);
  const filesResponse=await api('/api/crm/files?space=demo&customerId='+restored.customers[0].id,{headers}),files=await filesResponse.json();assert.equal(files.length,3);
  for(const source of sources){const file=files.find(f=>f.name===source.metadata.name);assert.ok(file);assert.notEqual(file.id,source.metadata.id);const r=await api('/api/crm/files?space=demo&id='+file.id,{headers});assert.equal(r.status,200);assert.equal(createHash('sha256').update(new Uint8Array(await r.arrayBuffer())).digest('hex'),source.sha256);}
  assert.equal(restored.orders[0].proofFileId,files.find(f=>f.kind==='proof').id);
  assert.equal(restored.orders[0].production.sketchFileId,restored.orders[0].proofFileId);
  const photo=files.find(f=>f.purpose==='production');assert.equal(photo.orderId,restored.orders[0].id);assert.equal(photo.workId,restored.orders[0].production.workId);
  const retry=await api(restoreUrl,restoreOptions);assert.equal(retry.status,200);assert.equal((await retry.json()).version,restored.version);
  assert.deepEqual(await get(),before);
  // The built Worker stores unfinished workflow text privately, then consumes
  // its revision in the same D1 transaction as the explicit customer update.
  const privateBaseline=await get(),workflowCustomer=privateBaseline.customers.find(c=>c.id===customer.id),workflowBasis=conflicts.customerWorkflowBasis(privateBaseline,'plan',workflowCustomer.id),draftId=crypto.randomUUID();
  const draftWrite=async data=>{const r=await api('/api/crm/drafts',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({space:'live',...data})});return {status:r.status,data:await r.json()};};
  const draftRead=async who=>{const r=await api('/api/crm/drafts?space=live&id='+draftId,{headers:who});return {status:r.status,data:await r.json()};};
  assert.equal((await api('/api/crm/drafts?space=live&id='+draftId)).status,401);
  const unfinished=await draftWrite({id:draftId,kind:'plan',context:workflowCustomer.id,revision:0,requestId:crypto.randomUUID(),title:'Privat kundplan i riktig Worker',data:{values:{goal:'PRIVATE WORKER DRAFT',contacts:[{name:'',role:'',email:'ofullständig'}]},expectedContext:workflowBasis,customerName:workflowCustomer.name}});
  assert.equal(unfinished.status,200,JSON.stringify(unfinished.data));assert.deepEqual(await get(),privateBaseline);assert.equal((await draftRead(headers)).data[0].data.values.goal,'PRIVATE WORKER DRAFT');
  await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').bind('runtime-workflow-other','runtime-workflow-other@example.test','runtime-workflow-other','Annan runtime-säljare','seller','Sebastian Hansson').run();
  const otherRead=await draftRead({'oai-authenticated-user-id':'runtime-workflow-other','oai-authenticated-user-email':'runtime-workflow-other@example.test'});assert.equal(otherRead.status,200);assert.deepEqual(otherRead.data,[]);
  const workflowValues={...workflowCustomer.plan,goal:'Explicit publicerad kundplan',nextAction:'Stäm av körprovskundens nästa behov',nextReview:core.plusDays(today,7),expectedOrder:workflowCustomer.expectedOrder,reviewDays:workflowCustomer.reviewDays,reviewed:false};
  const ready=await draftWrite({...unfinished.data,requestId:crypto.randomUUID(),data:{...unfinished.data.data,values:workflowValues}});assert.equal(ready.status,200,JSON.stringify(ready.data));
  const publicationId=crypto.randomUUID(),publication={space:'live',version:privateBaseline.version,requestId:publicationId,type:'plan',data:{customerId:workflowCustomer.id,expectedContext:workflowBasis,plan:workflowValues,nextReview:workflowValues.nextReview,expectedOrder:workflowValues.expectedOrder,reviewDays:workflowValues.reviewDays,reviewed:false,draft:{id:draftId,revision:ready.data.revision}}};
  const publicationOptions={method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(publication)};
  const publishedResponse=await api('/api/crm',publicationOptions),published=await publishedResponse.json();assert.equal(publishedResponse.status,200,JSON.stringify(published));assert.equal(published.customers.find(c=>c.id===workflowCustomer.id).plan.goal,workflowValues.goal);assert.equal(published.customers.find(c=>c.id===workflowCustomer.id).lastContact,workflowCustomer.lastContact);assert.deepEqual(published.orders,privateBaseline.orders);assert.equal((await draftRead(headers)).data[0].archived,true);
  const persistedPublication=await get(),{mutationResult:publicationResult,...publicationState}=published;assert.deepEqual(persistedPublication,publicationState);assert.ok(publicationResult.eventId);assert.ok(publicationResult.taskId);
  const publicationReplay=await api('/api/crm',publicationOptions);assert.equal(publicationReplay.status,200);const replayedPublication=await publicationReplay.json();assert.deepEqual(replayedPublication.mutationResult,publicationResult);assert.deepEqual(replayedPublication,{...persistedPublication,mutationResult:publicationResult});assert.deepEqual(await get(),persistedPublication);
  const lateAutosave=await draftWrite({...ready.data,requestId:crypto.randomUUID(),data:{...ready.data.data,values:{goal:'Late private autosave'}}});assert.equal(lateAutosave.status,409);assert.equal((await draftRead(headers)).data[0].archived,true);assert.deepEqual(await get(),persistedPublication);
  // Exercise the built commercial handover API with real local D1/R2, stable
  // profiles and duplicate display names. Old operational IDs stay unguessed.
  const sellers=await import('../work/seller-profiles.mjs'),commercial=await import('../work/commercial-responsibility.mjs'),quantities=await import('../work/production-quantities.mjs');
  const savedPrivateDraft=(await draftRead(headers)).data;
  state=await get();const sourceOwner=customer.owner,targetOwner=state.settings.owners.find(name=>name!==sourceOwner),targetMember='runtime-commercial-target';assert.ok(targetOwner);
  await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').bind(targetMember,'runtime-commercial-target@example.test',targetMember,'Identiskt kontonamn','seller',targetOwner).run();
  await post('seller_profiles_init',{expectedContext:conflicts.sellerProfilesBasis(state),profiles:sellers.legacySellerNames(state).map(legacyOwnerName=>({legacyOwnerName,displayName:'Identiskt runtime-namn',memberId:legacyOwnerName===sourceOwner?'runtime-admin':legacyOwnerName===targetOwner?targetMember:''}))});
  const sourceProfile=state.settings.sellerProfiles.find(p=>p.legacyOwnerName===sourceOwner),targetProfile=state.settings.sellerProfiles.find(p=>p.legacyOwnerName===targetOwner);assert.ok(sourceProfile&&targetProfile);assert.notEqual(sourceProfile.id,targetProfile.id);assert.equal(sourceProfile.displayName,targetProfile.displayName);assert.equal(state.orders.find(o=>o.id===order.id).ownerProfileId,'','Profile initialization is not automatic operational migration.');
  const runtimeTables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));assert.equal(runtimeTables.length,18);
  const bucket=await mf.getR2Bucket('BUCKET'),raw=async()=>({tables:Object.fromEntries(await Promise.all(runtimeTables.map(async table=>[table,(await db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results]))),r2:Object.fromEntries(await Promise.all((await bucket.list()).objects.map(async item=>[item.key,createHash('sha256').update(new Uint8Array(await (await bucket.get(item.key)).arrayBuffer())).digest('hex')]))) });
  const commercialRequest=async(payload)=>{const r=await api('/api/crm',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(payload)});return {status:r.status,data:await r.json()};};
  await post('catalog_order',{customerId:customer.id,owner:sourceOwner,title:'Isolerad granskad orderöverlämning',lines:[{id:'runtime-commercial-line',kind:'product',article:'TEST-COMMERCIAL',description:'Fiktiv provjacka',quantity:2,unitPrice:100,unitCost:60}],deliveryDate:core.plusDays(today,30),accepted:true,nextDate:today});
  const newOrder=state.orders.find(o=>o.id!==order.id);assert.ok(newOrder);assert.equal(newOrder.ownerProfileId,sourceProfile.id);assert.equal(state.deals.find(d=>d.id===newOrder.dealId).ownerProfileId,sourceProfile.id);
  const choices=commercial.commercialResponsibilityCandidates(state,'order',newOrder.id);assert.ok(choices.requiredTaskIds.length,'The built new-order flow supplies actual required handover work.');
  const opened=state,request=crypto.randomUUID(),transferData={targetType:'order',targetId:newOrder.id,targetProfileId:targetProfile.id,selectedTaskIds:choices.requiredTaskIds,reason:'Granskat lokalt runtimeprov',reviewed:true,expectedContext:commercial.commercialResponsibilityBasis(opened,'order',newOrder.id)},transferPayload={space:'live',version:opened.version,requestId:request,type:'commercial_responsibility_transfer',data:transferData};
  const omittedBefore=await raw(),omitted=await commercialRequest({...transferPayload,requestId:crypto.randomUUID(),data:{...transferData,selectedTaskIds:[]}});assert.equal(omitted.status,400);assert.deepEqual(await raw(),omittedBefore,'Omitted required work leaves all 18 native D1 tables and every R2 object unchanged.');
  const transferred=await Promise.all([commercialRequest(transferPayload),commercialRequest(transferPayload)]);for(const r of transferred)assert.equal(r.status,200,JSON.stringify(r.data));state=await get();assert.equal(state.version,opened.version+1);const handed=state.orders.find(o=>o.id===newOrder.id);assert.equal(handed.owner,targetOwner);assert.equal(handed.ownerProfileId,targetProfile.id);assert.equal(handed.responsibilityTransfers.length,1);assert.deepEqual(state.customers,opened.customers);assert.deepEqual(state.deals,opened.deals);assert.deepEqual(handed.production,newOrder.production);for(const old of opened.tasks)assert.deepEqual(state.tasks.find(t=>t.id===old.id),choices.requiredTaskIds.includes(old.id)?{...old,owner:targetOwner,ownerProfileId:targetProfile.id}:old);
  const replayBefore=await raw(),lostAckReplay=await commercialRequest(transferPayload);assert.equal(lostAckReplay.status,200);assert.deepEqual(await raw(),replayBefore,'A lost handover acknowledgment replays one stored commit.');const changedIntent=await commercialRequest({...transferPayload,data:{...transferData,reason:'Different intent'}});assert.equal(changedIntent.status,409);assert.deepEqual(await raw(),replayBefore);
  await post('production_claim',{orderId:order.id,expectedAssignment:quantities.assignmentBasis(state.orders.find(o=>o.id===order.id).production)});
  const productionBefore=state,oldProductionOrder=productionBefore.orders.find(o=>o.id===order.id),productionChoices=commercial.commercialResponsibilityCandidates(productionBefore,'order',order.id);assert.equal(oldProductionOrder.ownerProfileId,'');assert.equal(oldProductionOrder.production.assigneeId,'runtime-admin');
  await post('commercial_responsibility_transfer',{targetType:'order',targetId:order.id,targetProfileId:targetProfile.id,selectedTaskIds:productionChoices.requiredTaskIds,reason:'Granskad äldre produktionsorder, arbetsansvaret bevaras',reviewed:true,expectedContext:commercial.commercialResponsibilityBasis(productionBefore,'order',order.id)});
  const productionTransferred=state.orders.find(o=>o.id===order.id);assert.equal(productionTransferred.ownerProfileId,targetProfile.id);assert.deepEqual(productionTransferred.production,oldProductionOrder.production);assert.deepEqual(productionTransferred.productionHistory,oldProductionOrder.productionHistory);assert.deepEqual(state.customers,productionBefore.customers);assert.deepEqual(state.deals,productionBefore.deals);assert.equal(productionTransferred.proofFileId,oldProductionOrder.proofFileId);assert.equal(productionTransferred.responsibilityTransfers[0].fromProfileId,sourceProfile.id);assert.deepEqual((await draftRead(headers)).data,savedPrivateDraft);
  // Customer handover anchors only the reviewed relationship and explicitly
  // selected independent work. Commercial and production ownership stay put.
  const customers=await import('../work/customer-responsibility.mjs');
  assert.equal(state.customers.find(c=>c.id===customer.id).ownerProfileId,'');
  await post('customer',{name:'Ny fiktiv runtime-kund',owner:sourceOwner});
  const newCustomer=state.customers.find(c=>c.name==='Ny fiktiv runtime-kund');assert.equal(newCustomer.ownerProfileId,sourceProfile.id);
  await post('task',{customerId:customer.id,owner:sourceOwner,title:'Fristående runtime-kundkontakt',kind:'manual',due:today});
  const selectedCustomerTask=state.tasks.find(t=>t.title==='Fristående runtime-kundkontakt');assert.ok(selectedCustomerTask);assert.equal(selectedCustomerTask.ownerProfileId,sourceProfile.id);
  const customerBefore=await get(),customerRaw=await raw(),customerTransfer={space:'live',version:customerBefore.version,requestId:crypto.randomUUID(),type:'customer_responsibility_transfer',data:{customerId:customer.id,targetProfileId:targetProfile.id,selectedTaskIds:[selectedCustomerTask.id],reason:'Uttryckligen granskad fiktiv kundöverlämning',reviewed:true,expectedContext:customers.customerResponsibilityBasis(customerBefore,customer.id)}};
  const customerResponses=await Promise.all([commercialRequest(customerTransfer),commercialRequest(customerTransfer)]);for(const response of customerResponses)assert.equal(response.status,200,JSON.stringify(response.data));
  state=await get();assert.equal(state.version,customerBefore.version+1);const assignedCustomer=state.customers.find(c=>c.id===customer.id);assert.equal(assignedCustomer.ownerProfileId,targetProfile.id);assert.equal(assignedCustomer.owner,targetOwner);assert.equal(assignedCustomer.responsibilityTransfers.length,1);
  assert.deepEqual(state.orders,customerBefore.orders);assert.deepEqual(state.deals,customerBefore.deals);assert.deepEqual(state.settings,customerBefore.settings);
  for(const t of customerBefore.tasks)assert.deepEqual(state.tasks.find(current=>current.id===t.id),t.id===selectedCustomerTask.id?{...t,owner:targetOwner,ownerProfileId:targetProfile.id}:t);
  const customerAfterRaw=await raw(),customerAllowed=new Set(['crm_customers','crm_tasks','crm_events','crm_spaces','crm_mutations']);for(const table of runtimeTables.filter(table=>!customerAllowed.has(table)))assert.deepEqual(customerAfterRaw.tables[table],customerRaw.tables[table],table);assert.deepEqual(customerAfterRaw.r2,customerRaw.r2);assert.deepEqual((await draftRead(headers)).data,savedPrivateDraft);
  const customerReplay=await commercialRequest(customerTransfer);assert.equal(customerReplay.status,200);assert.deepEqual(await raw(),customerAfterRaw);
  const commercialSource=await get(),commercialExport=await fetch(new URL('/api/crm/backup?space=live&format=stream',await mf.ready),{headers:{...headers,'Accept-Encoding':'identity'}});assert.equal(commercialExport.status,200);const commercialBytes=new Uint8Array(await commercialExport.arrayBuffer()),commercialRecords=new TextDecoder().decode(commercialBytes).trimEnd().split('\n'),commercialEnd=JSON.parse(commercialRecords.at(-1));assert.equal(Number(commercialExport.headers.get('Content-Length')),commercialBytes.length);assert.equal(commercialEnd.bytes,13500000);assert.equal(commercialEnd.files,3);assert.deepEqual(JSON.parse(commercialRecords[0]).state.orders,commercialSource.orders);assert.deepEqual(JSON.parse(commercialRecords[0]).state.deals,commercialSource.deals);
  // Clear only the temporary destination created above. Source customer data,
  // original files and the separate private draft remain untouched.
  const destinationObjects=(await db.prepare('SELECT object_key FROM crm_files WHERE space=?').bind('demo').all()).results.map(r=>r.object_key);for(const key of destinationObjects)await bucket.delete(key);
  for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])await db.prepare('DELETE FROM '+table+' WHERE space=?').bind('demo').run();
  await db.prepare('UPDATE crm_spaces SET version=0,write_token=?,settings=? WHERE id=?').bind('',JSON.stringify(core.emptyState().settings),'demo').run();
  const commercialRestoreResponse=await api('/api/crm/backup?space=demo&version=0&requestId='+crypto.randomUUID(),{method:'POST',headers:{...headers,'Content-Type':'application/x-ndjson',Origin:origin},body:commercialBytes}),commercialRestored=await commercialRestoreResponse.json();assert.equal(commercialRestoreResponse.status,200,JSON.stringify(commercialRestored));for(const o of commercialSource.orders){const restoredOrder=commercialRestored.orders.find(r=>r.id===o.id);assert.equal(restoredOrder.ownerProfileId,o.ownerProfileId);assert.deepEqual(restoredOrder.responsibilityTransfers,o.responsibilityTransfers);assert.equal(restoredOrder.production.assigneeId,o.production.assigneeId);assert.equal(restoredOrder.production.workId,o.production.workId);assert.deepEqual(restoredOrder.production.movements,o.production.movements);}for(const c of commercialSource.customers){const restoredCustomer=commercialRestored.customers.find(r=>r.id===c.id);assert.equal(restoredCustomer.ownerProfileId,c.ownerProfileId);assert.deepEqual(restoredCustomer.responsibilityTransfers,c.responsibilityTransfers);}assert.deepEqual(commercialRestored.tasks,commercialSource.tasks);assert.deepEqual(commercialRestored.deals,commercialSource.deals);assert.deepEqual(commercialRestored.settings.sellerProfiles,commercialSource.settings.sellerProfiles.map(p=>({...p,memberId:''})));assert.deepEqual(await get(),commercialSource);assert.deepEqual((await draftRead(headers)).data,savedPrivateDraft);
  const commercialFilesResponse=await api('/api/crm/files?space=demo&customerId='+customer.id,{headers}),commercialFiles=await commercialFilesResponse.json();assert.equal(commercialFilesResponse.status,200);assert.equal(commercialFiles.length,3);for(const source of sources){const file=commercialFiles.find(f=>f.name===source.metadata.name);assert.ok(file);assert.notEqual(file.id,source.metadata.id);const response=await api('/api/crm/files?space=demo&id='+file.id,{headers});assert.equal(response.status,200);assert.equal(createHash('sha256').update(new Uint8Array(await response.arrayBuffer())).digest('hex'),source.sha256);}const restoredProductionOrder=commercialRestored.orders.find(o=>o.id===order.id),restoredProof=commercialFiles.find(f=>f.kind==='proof'),restoredPhoto=commercialFiles.find(f=>f.purpose==='production');assert.equal(restoredProductionOrder.proofFileId,restoredProof.id);assert.equal(restoredProductionOrder.production.sketchFileId,restoredProof.id);assert.equal(restoredPhoto.orderId,order.id);assert.equal(restoredPhoto.workId,restoredProductionOrder.production.workId);
  console.log(JSON.stringify({result:'PASS',runtime:'Cloudflare workerd + persisted local D1/R2 through built HTTP API',fileBytes:end.bytes,archiveBytes:bytes.length,files:end.files,proofLinks:true,photoLinks:true,hashesVerified:true,idempotentRetry:true,sourceUnchanged:true,anonymousDenied:true,homeRendered:true,privateWorkflowDraft:true,atomicWorkflowPublication:true,lateAutosaveDenied:true,commercialStableProfiles:true,commercialRequiredWork:true,commercialDoubleClick:true,commercialLostAckReplay:true,commercialProductionUnchanged:true,commercialAuditRestore:true,customerStableProfiles:true,customerDoubleClick:true,customerLostAckReplay:true,customerUnrelatedTablesUnchanged:true,customerAuditRestore:true,task_owner_profile_id_preserved:true,task_profile_audit_transfer_atomic:true,task_stream_restore_preserved:true,customer_owner_profile_id_preserved:true,blank_legacy_customer_ids_preserved:true,rawTables:runtimeTables.length,hostedProductionRestoreVerified:false}));
} finally {await mf.dispose();rmSync(statePath,{recursive:true,force:true});}
