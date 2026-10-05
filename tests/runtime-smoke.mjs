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
  const exported=await api('/api/crm/backup?space=live&format=stream',{headers});assert.equal(exported.status,200);
  const bytes=new Uint8Array(await exported.arrayBuffer()), records=new TextDecoder().decode(bytes).trimEnd().split('\n');
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
  console.log(JSON.stringify({result:'PASS',runtime:'Cloudflare workerd + persisted local D1/R2 through built HTTP API',fileBytes:end.bytes,archiveBytes:bytes.length,files:end.files,proofLinks:true,photoLinks:true,hashesVerified:true,idempotentRetry:true,sourceUnchanged:true,anonymousDenied:true,homeRendered:true,privateWorkflowDraft:true,atomicWorkflowPublication:true,lateAutosaveDenied:true,hostedProductionRestoreVerified:false}));
} finally {await mf.dispose();rmSync(statePath,{recursive:true,force:true});}
