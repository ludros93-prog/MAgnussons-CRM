import assert from 'node:assert/strict';
import * as core from '../work/core.mjs';
import {editableRecord,recordBasis} from '../work/record-conflicts.mjs';

// Synthetic rows are inserted before the existing audited profile retirement.
// They never use production bindings, real orders, accounts or acceptance.
export async function seedHistoricalCommercialCorrection({db,deal,order}){
 const lostIds=['runtime-history-stable-lost','runtime-history-blank-lost'];
 for(const [index,id] of lostIds.entries()){
  const lost=core.DealSchema.parse({...structuredClone(deal),id,title:'Syntetisk förlorad historik '+index,stage:'lost',confirmed:false,wonAt:'',ownerProfileId:index?'':deal.ownerProfileId,reason:'Syntetisk ursprunglig förlustorsak',createdAt:'2020-01-02T03:04:05.000Z',stageAt:'2020-02-03T04:05:06.000Z',nextAction:'Syntetiskt historiskt nästa steg',nextDate:'2020-03-04',priceChecked:true,priceCheckedAt:'2020-01-03T04:05:06.000Z',quotes:[{version:1,at:'2020-01-03T04:05:06.000Z',reference:'SYNTHETIC-HISTORY-QUOTE',lines:[],value:500,cost:300,deliveryDate:'2020-03-04',proofDeadline:'',orderDeadline:''}]});
  await db.prepare('INSERT INTO crm_deals(space,id,customer_id,data) VALUES(?,?,?,?)').bind('live',id,lost.customerId,JSON.stringify(lost)).run();
 }
 const blankDeal=core.DealSchema.parse({...structuredClone(deal),id:'runtime-history-blank-won',ownerProfileId:''}),blankOrder=core.OrderSchema.parse({...structuredClone(order),id:'runtime-history-blank-order',dealId:blankDeal.id,ownerProfileId:''});
 await db.prepare('INSERT INTO crm_deals(space,id,customer_id,data) VALUES(?,?,?,?)').bind('live',blankDeal.id,blankDeal.customerId,JSON.stringify(blankDeal)).run();
 await db.prepare('INSERT INTO crm_orders(space,id,customer_id,deal_id,data) VALUES(?,?,?,?,?)').bind('live',blankOrder.id,blankOrder.customerId,blankOrder.dealId,JSON.stringify(blankOrder)).run();
 return {lostIds,orderIds:[order.id,blankOrder.id],wonId:deal.id,blankWonId:blankDeal.id};
}

// The built native Worker and migrated local D1/R2 receive the same ordinary
// deal/order API commands as the editor. No mutation handler is mocked.
export async function verifyHistoricalCommercialCorrectionNative({db,get,raw,ready,headers,fixtures,roles,today}){
 const endpoint=new URL('/api/crm',ready);
 const send=async(payload,identity=headers)=>{
  const response=await fetch(endpoint,{method:'POST',headers:{...identity,'Content-Type':'application/json',Origin:endpoint.origin},body:JSON.stringify(payload)});
  return {status:response.status,data:await response.json()};
 };
 const payload=(type,row,changes,snapshot,requestId=crypto.randomUUID())=>({space:'live',version:snapshot.version,requestId,type,expectedRecord:recordBasis(editableRecord(snapshot,type,row.id)),data:{...structuredClone(row),...changes}});
 const unchanged=async(intent,status,label,identity=headers)=>{
  const before=await raw(),response=await send(intent,identity);assert.equal(response.status,status,label+': '+JSON.stringify(response.data));assert.deepEqual(await raw(),before,label+' cannot change any of the 18 tables or any R2 byte.');return response;
 };
 const assertIsolation=(before,after,type,id,draftId)=>{
  const table=type==='deal'?'crm_deals':'crm_orders',allowed=new Set([table,'crm_spaces','crm_events','crm_mutations',...(draftId?['crm_drafts']:[])]);
  assert.equal(Object.keys(before.tables).length,18);
  for(const name of Object.keys(before.tables).filter(name=>!allowed.has(name)))assert.deepEqual(after.tables[name],before.tables[name],name+' remains byte-identical after historical text correction.');
  assert.deepEqual(after.tables[table].filter(row=>row.space!=='live'||row.id!==id),before.tables[table].filter(row=>row.space!=='live'||row.id!==id));
  for(const name of ['crm_events','crm_mutations'])assert.deepEqual(after.tables[name].filter(row=>row.space!=='live'),before.tables[name].filter(row=>row.space!=='live'));
  assert.deepEqual(after.tables.crm_spaces.filter(row=>row.id!=='live'),before.tables.crm_spaces.filter(row=>row.id!=='live'));
  if(draftId)assert.deepEqual(after.tables.crm_drafts.filter(row=>row.space!=='live'||row.user_id!==headers['oai-authenticated-user-id']||row.id!==draftId),before.tables.crm_drafts.filter(row=>row.space!=='live'||row.user_id!==headers['oai-authenticated-user-id']||row.id!==draftId),'Other private rows remain exact.');
  const space=rows=>rows.find(row=>row.id==='live');assert.deepEqual({...space(after.tables.crm_spaces),version:space(before.tables.crm_spaces).version,write_token:space(before.tables.crm_spaces).write_token},space(before.tables.crm_spaces),'Workspace settings survive the version/write-token CAS.');
  assert.deepEqual(after.r2,before.r2,'All existing file contents survive historical text correction.');
 };
 let state=await get();
 const present=await raw();for(const name of ['crm_drafts','outlook_connections','outlook_items','outlook_oauth_states','crm_files'])assert.ok(present.tables[name].length,name+' has real positive synthetic sentinels.');assert.ok(Object.keys(present.r2).length);
 const profile=state.settings.sellerProfiles.find(row=>row.id===state.orders.find(row=>row.id===fixtures.orderIds[0]).ownerProfileId);assert.ok(profile?.retirementHistory.length);assert.equal(profile.active,false);assert.equal(state.settings.owners.includes(profile.legacyOwnerName),false);
 const seller=roles.find(row=>row.id.endsWith('-seller'));assert.ok(seller);
 const changesFor=(type,text)=>type==='deal'?{reason:text}:{notes:text};
 for(const type of ['deal','order']){
  const row=state[type==='deal'?'deals':'orders'].find(row=>row.id===(type==='deal'?fixtures.lostIds[0]:fixtures.orderIds[0])),intent=payload(type,row,changesFor(type,'Syntetisk tillåten text'),state);
  await unchanged(intent,401,type+' anonymous denied',{});
  for(const role of roles.filter(row=>!row.id.endsWith('-seller')))await unchanged(intent,403,type+' operative/read-only role denied',{'oai-authenticated-user-id':role.id,'oai-authenticated-user-email':role.email});
 }
 const identities=[headers,{'oai-authenticated-user-id':seller.id,'oai-authenticated-user-email':seller.email}];
 for(const [type,ids,field] of [['deal',fixtures.lostIds,'reason'],['order',fixtures.orderIds,'notes']])for(const [index,id] of ids.entries()){
  state=await get();const original=structuredClone(state[type==='deal'?'deals':'orders'].find(row=>row.id===id)),before=state,beforeRaw=await raw(),identity=identities[index],intent=payload(type,original,{[field]:'Syntetiskt korrigerad historisk text '+index},before);
  const clicks=await Promise.all([send(intent,identity),send(intent,identity)]);for(const response of clicks)assert.equal(response.status,200,type+' double click: '+JSON.stringify(response.data));
  state=await get();assert.equal(state.version,before.version+1);const saved=state[type==='deal'?'deals':'orders'].find(row=>row.id===id);assert.deepEqual(saved,{...original,[field]:intent.data[field]},'Only the declared historical text changes; the original owner ID remains exact.');assert.equal(saved.ownerProfileId,index?'':profile.id);
  const addedEvents=state.events.filter(row=>!before.events.some(old=>old.id===row.id));assert.equal(addedEvents.length,1,'One explicit historical correction produces one event.');assert.equal(addedEvents[0].customerId,original.customerId);assert.equal(addedEvents[0].dealId,type==='deal'?original.id:original.dealId);assert.equal(addedEvents[0].kind,'historical_commercial_correction');const actor=beforeRaw.tables.crm_members.find(member=>member.user_id===identity['oai-authenticated-user-id']);assert.deepEqual(addedEvents[0].actor,{id:actor.user_id,name:actor.name});
  for(const name of ['customers','tasks','meetings','settings','notices','companyEvents','articles','leads',type==='deal'?'orders':'deals'])assert.deepEqual(state[name],before[name],name+' is unaffected by correction.');
  const afterRaw=await raw();assertIsolation(beforeRaw,afterRaw,type,id);assert.equal(afterRaw.tables.crm_mutations.filter(row=>row.space==='live'&&row.id===intent.requestId).length,1);
  const replay=await send(intent,identity);assert.equal(replay.status,200);assert.deepEqual(await raw(),afterRaw,'Lost acknowledgement replay creates no extra mutation, event or text update.');
  await unchanged({...intent,data:{...intent.data,[field]:'Another synthetic request body'}},409,type+' reused request ID with changed text denied',identity);
  const stale=await unchanged({...intent,requestId:crypto.randomUUID(),data:{...intent.data,[field]:'Syntetisk text från gammalt underlag'}},409,type+' exact old record CAS denied',identity);assert.equal(stale.data.code,'record_conflict');
  await unchanged({...intent,requestId:crypto.randomUUID(),expectedRecord:undefined,data:{...saved,[field]:'Syntetisk text utan granskat underlag'}},409,type+' missing record basis denied',identity);
 }
 state=await get();
 const lost=state.deals.find(row=>row.id===fixtures.lostIds[0]),closed=state.orders.find(row=>row.id===fixtures.orderIds[0]),activeOwner=state.settings.owners[0],activeProfile=state.settings.sellerProfiles.find(row=>row.active&&row.legacyOwnerName===activeOwner);
 assert.ok(activeProfile);
 const dealChanges=[['reopen lost deal',{stage:'identified'}],['pause lost deal',{stage:'paused'}],['replace owner',{owner:activeOwner}],['replace stable ID',{ownerProfileId:activeProfile.id}],['remove stable ID',{ownerProfileId:''}],['replace customer',{customerId:state.customers.find(row=>row.id!==lost.customerId).id}],['change historical title',{title:'Ändrad syntetisk affärsrubrik'}],['change value',{value:501}],['change cost',{cost:301}],['change next action',{nextAction:'Skapa nytt syntetiskt arbete'}],['change next date',{nextDate:today}],['change quote history',{quotes:[]}],['change original date',{createdAt:'2020-04-05T06:07:08.000Z'}],['change stage date',{stageAt:'2020-04-05T06:07:08.000Z'}],['change price validation',{priceChecked:false}],['clear loss reason',{reason:'   '}]];
 for(const [label,changes] of dealChanges)await unchanged(payload('deal',lost,{reason:'Syntetisk korrigering',...changes},state),400,label);
 const orderChanges=[['reopen completed order',{stage:'delivered'}],['replace order owner',{owner:activeOwner}],['replace order stable ID',{ownerProfileId:activeProfile.id}],['remove order stable ID',{ownerProfileId:''}],['change invoice value',{invoiceValue:501}],['change invoice cost',{actualCost:301}],['change invoice reference',{invoiceRef:'SYNTHETIC-OTHER-INVOICE'}],['change invoice date',{invoiceDate:'2020-04-05'}],['change invoice owner',{invoiceOwner:activeOwner}],['change invoice owner UUID',{invoiceOwnerId:activeProfile.id}],['change invoice attribution source',{invoiceOwnerSource:'legacy_fallback'}],['change customer receipt',{receivedBy:'Annan syntetisk uppgift'}],['change receipt note',{receiptNote:'Annan syntetisk mottagandeanteckning'}],['change delivery problem',{deliveryIssue:'Nytt syntetiskt mottagningshinder'}],['change delivery checkpoint',{deliveryNextCheck:today}],['change commercial revision',{commercialVersion:closed.commercialVersion+1}],['change commercial value',{commercialValue:501}],['change production work ID',{production:{...closed.production,workId:'runtime-history-forged-work'}}],['change proof approval',{proofApproved:!closed.proofApproved}]];
 for(const [label,changes] of orderChanges)await unchanged(payload('order',closed,{notes:'Syntetisk korrigering',...changes},state),400,label);
 const won=state.deals.find(row=>row.id===fixtures.wonId);await unchanged(payload('deal',won,{reason:'Syntetisk ändring på vunnen affär'},state),400,'won commercial result remains locked');
 await unchanged({space:'live',version:state.version,requestId:crypto.randomUUID(),type:'deal',data:{...lost,id:'',reason:'Syntetiskt nytt underlag'}},400,'new deal cannot reuse retired responsibility');
 // A missing invoice field is established only in this isolated fixture. The
 // rejection cannot fill it, infer a cost or invent an invoice attribution.
 for(const missing of [{invoiceDate:''},{invoiceRef:''},{invoiceValue:null}]){
  const incomplete={...closed,...missing};await db.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').bind(JSON.stringify(incomplete),'live',closed.id).run();const snapshot=await get(),row=snapshot.orders.find(row=>row.id===closed.id);await unchanged(payload('order',row,{notes:'Syntetisk text utan komplett faktura'},snapshot),400,'incomplete invoice does not unlock correction');
  await db.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').bind(JSON.stringify(closed),'live',closed.id).run();
 }
 // The existing generic editor's actual FormDraft envelope remains private.
 // A historical reader must not publish hidden older financial edits simply
 // because the visible editor now exposes only its notes textarea.
 const draftEndpoint=new URL('/api/crm/drafts',ready),draftId=crypto.randomUUID(),draftUser=headers['oai-authenticated-user-id'];
 const writeDraft=async(data)=>{const response=await fetch(draftEndpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:draftEndpoint.origin},body:JSON.stringify({space:'live',...data})});return {status:response.status,data:await response.json()};};
 const readDraft=async()=>{const response=await fetch(new URL('/api/crm/drafts?'+new URLSearchParams({space:'live',id:draftId}),ready),{headers});assert.equal(response.status,200);return (await response.json())[0];};
 const assertOnlyDraft=(before,after)=>{for(const table of Object.keys(before.tables).filter(name=>name!=='crm_drafts'))assert.deepEqual(after.tables[table],before.tables[table],table+' is untouched by private generic autosave.');assert.deepEqual(after.tables.crm_drafts.filter(row=>row.space!=='live'||row.user_id!==draftUser||row.id!==draftId),before.tables.crm_drafts.filter(row=>row.space!=='live'||row.user_id!==draftUser||row.id!==draftId));assert.deepEqual(after.r2,before.r2);};
 state=await get();const draftBase=structuredClone(state.orders.find(row=>row.id===fixtures.orderIds[0])),basis=recordBasis(draftBase),broadValues={...draftBase,notes:'  Syntetisk äldre privat originaltext\n  ',invoiceValue:draftBase.invoiceValue+7},envelope={draftId,type:'order',data:broadValues,base:structuredClone(draftBase),expectedRecord:basis,initialData:basis};
 const privateBefore=await raw(),firstDraft=await writeDraft({id:draftId,kind:'form',context:'order',revision:0,requestId:crypto.randomUUID(),title:'Syntetisk äldre bred orderredigering',data:envelope});assert.equal(firstDraft.status,200,JSON.stringify(firstDraft.data));assert.equal(firstDraft.data.revision,1);assert.deepEqual(firstDraft.data.data,envelope);assertOnlyDraft(privateBefore,await raw());assert.deepEqual((await readDraft()).data,envelope);
 const publishDraft=(draft,snapshot=state,requestId=crypto.randomUUID())=>({space:'live',version:snapshot.version,requestId,type:'order',expectedRecord:draft.data.expectedRecord,data:{...structuredClone(draft.data.data),draft:{id:draft.id,revision:draft.revision}}});
 await unchanged(publishDraft(firstDraft.data),400,'hidden broader private invoice edit stays rejected and unarchived');assert.deepEqual(await readDraft(),firstDraft.data);
 const notesEnvelope={...envelope,data:{...draftBase,notes:'  Syntetiskt granskat privat anteckningsunderlag\n  '}};
 const revisionBefore=await raw(),secondDraft=await writeDraft({...firstDraft.data,requestId:crypto.randomUUID(),data:notesEnvelope});assert.equal(secondDraft.status,200,JSON.stringify(secondDraft.data));assert.equal(secondDraft.data.revision,2);assertOnlyDraft(revisionBefore,await raw());
 await unchanged(publishDraft({...firstDraft.data,data:notesEnvelope}),409,'unacknowledged stale own private revision cannot archive or update shared notes');assert.deepEqual(await readDraft(),secondDraft.data);
 const rollbackIntent=publishDraft(secondDraft.data),trigger='runtime_historical_form_atomic_failure';
 await db.prepare(`CREATE TRIGGER ${trigger} BEFORE INSERT ON crm_mutations WHEN NEW.space='live' AND NEW.id='${rollbackIntent.requestId}' BEGIN SELECT RAISE(ABORT,'synthetic historical form transaction failure'); END`).run();
 try{await unchanged(rollbackIntent,503,'native transaction failure rolls back shared notes, event, ledger, version and private archive');assert.deepEqual(await readDraft(),secondDraft.data);}finally{await db.prepare('DROP TRIGGER '+trigger).run();}
 const publishedBefore=await get(),publishedRaw=await raw(),intent=publishDraft(secondDraft.data,publishedBefore),clicks=await Promise.all([send(intent),send(intent)]);for(const response of clicks)assert.equal(response.status,200,JSON.stringify(response.data));state=await get();assert.equal(state.version,publishedBefore.version+1);const savedOrder=state.orders.find(row=>row.id===draftBase.id);assert.deepEqual(savedOrder,{...draftBase,notes:notesEnvelope.data.notes.trim()});
 const addedEvents=state.events.filter(row=>!publishedBefore.events.some(old=>old.id===row.id));assert.equal(addedEvents.length,1);assert.equal(addedEvents[0].kind,'historical_commercial_correction');assert.equal(addedEvents[0].actor.id,draftUser);for(const name of ['customers','tasks','deals','settings','meetings','articles','notices','leads','companyEvents'])assert.deepEqual(state[name],publishedBefore[name]);
 const publishedAfter=await raw();assertIsolation(publishedRaw,publishedAfter,'order',draftBase.id,draftId);const beforePrivate=publishedRaw.tables.crm_drafts.find(row=>row.space==='live'&&row.user_id===draftUser&&row.id===draftId),afterPrivate=publishedAfter.tables.crm_drafts.find(row=>row.space==='live'&&row.user_id===draftUser&&row.id===draftId);assert.equal(afterPrivate.archived,1);assert.equal(afterPrivate.revision,beforePrivate.revision+1);assert.equal(new Date(afterPrivate.updated_at).toISOString(),afterPrivate.updated_at);assert.deepEqual({...afterPrivate,archived:beforePrivate.archived,revision:beforePrivate.revision,updated_at:beforePrivate.updated_at},beforePrivate);assert.equal(publishedAfter.tables.crm_mutations.filter(row=>row.space==='live'&&row.id===intent.requestId).length,1);
 const archived=await readDraft();assert.equal(archived.archived,true);assert.equal(archived.revision,secondDraft.data.revision+1);assert.deepEqual(archived.data,notesEnvelope);const replay=await send(intent);assert.equal(replay.status,200);assert.deepEqual(await raw(),publishedAfter,'Exact private form publication replay cannot archive twice.');await unchanged({...intent,data:{...intent.data,notes:'Annat syntetiskt innehåll'}},409,'changed same-ID private publication denied');await unchanged({...intent,requestId:crypto.randomUUID(),expectedRecord:recordBasis(savedOrder),data:{...savedOrder,draft:{id:draftId,revision:secondDraft.data.revision}}},409,'a consumed private draft cannot publish again');
 const lateBefore=await raw(),late=await writeDraft({...secondDraft.data,requestId:crypto.randomUUID(),data:{...notesEnvelope,data:{...notesEnvelope.data,notes:'Sen syntetisk autosparning'}}});assert.equal(late.status,409);assert.deepEqual(await raw(),lateBefore,'Late autosave preserves the acknowledged archive and shared historical text.');
 return {historicalCommercialNativeStableAndBlankIdentity:true,historicalCommercialNativeSellerRightsRetained:true,historicalCommercialNativeRoleDenials:true,historicalCommercialNativeRecordCAS:true,historicalCommercialNativeDoubleClick:true,historicalCommercialNativeLostAcknowledgementReplay:true,historicalCommercialNativeChangedBodyDenied:true,historicalCommercialNativeOnlyReasonOrNotes:true,historicalCommercialNativeLifecycleFinanceAndResponsibilityDenied:true,historicalCommercialNativeFull18TableAndR2Isolation:true,historicalCommercialNativeGenericPrivateBroadEditDenied:true,historicalCommercialNativeGenericPrivateRevisionCAS:true,historicalCommercialNativeGenericPrivateAtomicPublication:true,historicalCommercialNativeGenericPrivateRealSQLRollback:true,historicalCommercialNativeGenericPrivateArchiveReplayAndLateWriteDenied:true};
}
