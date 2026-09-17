import assert from 'node:assert/strict';

// Runs against the isolated SQLite/R2 harness in crm.mjs, never hosted customer data.
export async function verifyV12(h){
 const {core,ops,business,quantities,sqlite,objects,headers,get,post,rolePost,roleGet,draftWrite,draftRead,catalogInput,productionData,own,cust}=h;
 const revisions=await import('../work/order-revisions.mjs'),follow=await import('../work/follow-up.mjs'),backup=await import('../work/crm-backup.mjs'),store=await import('../work/crm-store.mjs'),signals=await import('../work/automation-signals.mjs'),visibility=await import('../work/crm-visibility.mjs'),backupApi=await import('../work/backup-api.mjs');
 const actor={id:'test-admin',name:'Test admin',role:'admin',owner:own},today=core.day();
 let s=await get('live');
 const act=(type,data)=>{s=core.applyAction(s,{type,data},actor);return s};
 const order=id=>s.orders.find(o=>o.id===id);
 function makeOrder(title,n=50,submit=true){
  const line=business.LineSchema.parse({...catalogInput.lines[0],id:crypto.randomUUID(),quantity:n,unitPrice:100,unitCost:50});
  const before=new Set(s.orders.map(o=>o.id));act('catalog_order',{...catalogInput,title,lines:[line],accepted:true});
  const o=s.orders.find(o=>!before.has(o.id));act('order',{...o,proofRequired:false,proofApproved:false,supplierConfirmed:true});
  if(submit)act('production_submit',{orderId:o.id,production:{...productionData.production,lines:[line]}});
  return {id:o.id,line};
 }
 function move(id,kind,n){const o=order(id);return act('production_'+kind,{orderId:id,expectedProduction:quantities.productionBasis(o.production),entries:[{lineId:o.production.lines[0].id,quantity:n}],address:o.production.deliveryAddress,message:kind.startsWith('scrap')?'Fel på plagget':''});}
 function reduce(id,n){const o=order(id);return {orderId:id,expectedProduction:quantities.productionBasis(o.production),entries:[{lineId:o.production.lines[0].id,quantity:n}],reason:'Leverantören kan inte leverera resten',customerApprovedBy:'Anna, inköpare',customerApprovedOn:today,agreedValue:(o.production.lines[0].quantity-n)*100};}

 const short=makeOrder('48 av 50');for(const kind of ['received','printed','dispatched'])move(short.id,kind,48);
 assert.equal(order(short.id).production.status,'submitted');
 // Commercial acceptance days later must retain the actual earlier shipment date.
 order(short.id).production.movements.find(m=>m.kind==='dispatched').at=core.plusDays(today,-3)+'T10:00:00Z';
 const shortInput=reduce(short.id,2);act('order_shortfall',shortInput);
 assert.equal(order(short.id).production.status,'dispatched');assert.equal(order(short.id).stage,'shipping');assert.equal(order(short.id).commercialValue,4800);
 assert.equal(order(short.id).production.dispatchedAt.slice(0,10),core.plusDays(today,-3));
 assert.equal(quantities.productionProgress(order(short.id).production)[0].remaining,0);
 assert.equal(s.tasks.filter(t=>t.dealId===order(short.id).dealId&&t.kind==='invoice_ready').length,1);
 assert.throws(()=>act('order_shortfall',shortInput));
 act('order',{...order(short.id),invoiceValue:4800,invoiceRef:'V12-48',invoiceDate:today});
 act('receipt_confirm',{orderId:short.id,receivedBy:'Anna',deliveredDate:core.plusDays(today,-2)});
 assert.equal(order(short.id).stage,'delivered');

 const reduced=makeOrder('Avtalad minskning före mottagning');act('order_shortfall',reduce(reduced.id,2));
 assert.throws(()=>act('production_cancel',{orderId:reduced.id,message:'Byt arbetsversion'}),/antaländring/);
 assert.throws(()=>act('order_shortfall',reduce(reduced.id,50)));
 const scrap=makeOrder('Kassation med ersättningsvaror');move(scrap.id,'received',50);move(scrap.id,'scrap_unprinted',2);
 let r=quantities.productionProgress(order(scrap.id).production)[0];assert.equal(r.target,50);assert.equal(r.toReceive,2);assert.equal(r.toPrint,48);
 move(scrap.id,'printed',48);move(scrap.id,'received',2);move(scrap.id,'printed',2);assert.equal(order(scrap.id).production.status,'printed');
 move(scrap.id,'scrap_printed',3);assert.equal(order(scrap.id).production.status,'submitted');assert.equal(order(scrap.id).production.printedAt,'');
 r=quantities.productionProgress(order(scrap.id).production)[0];assert.equal(r.toReceive,3);assert.equal(r.toDispatch,47);assert.throws(()=>move(scrap.id,'dispatched',48));
 move(scrap.id,'received',3);move(scrap.id,'printed',3);move(scrap.id,'dispatched',50);assert.equal(order(scrap.id).production.status,'dispatched');
 assert.equal(order(scrap.id).production.movements.filter(m=>m.kind.startsWith('scrap')).length,2);

 const amend=makeOrder('40 blir 45',40,false),oldWon=s.deals.find(d=>d.id===order(amend.id).dealId).wonAt;
 const proposal={orderId:amend.id,expectedContext:revisions.revisionBasis(s,amend.id),reason:'Kunden lägger till fem jackor',snapshot:{reference:'ÄNDRING-45',lines:[{...amend.line,quantity:45}],deliveryDate:order(amend.id).deliveryDate,proofDeadline:'',orderDeadline:''}};
 act('order_amend',proposal);assert.equal(s.deals.find(d=>d.id===order(amend.id).dealId).lines[0].quantity,40);
 assert.throws(()=>act('order',{...order(amend.id),stage:'shipping'}),/orderändringen/);
 assert.throws(()=>act('production_submit',{orderId:amend.id,production:{...productionData.production,lines:[amend.line]}}),/godkänna/);
 assert.throws(()=>act('order_amend_accept',{orderId:amend.id,expectedContext:proposal.expectedContext,amendmentId:order(amend.id).pendingAmendment.id,customerApprovedBy:'Anna',customerApprovedOn:today}),/ändrats/);
 act('order_amend_accept',{orderId:amend.id,expectedContext:revisions.revisionBasis(s,amend.id),amendmentId:order(amend.id).pendingAmendment.id,customerApprovedBy:'Anna',customerApprovedOn:today});
 const amendedDeal=s.deals.find(d=>d.id===order(amend.id).dealId);assert.equal(amendedDeal.lines[0].quantity,45);assert.equal(amendedDeal.value,4500);assert.equal(amendedDeal.wonAt,oldWon);assert.equal(order(amend.id).supplierConfirmed,false);assert.equal(order(amend.id).proofApproved,false);assert.equal(order(amend.id).revisions.length,2);assert.equal(order(amend.id).pendingAmendment,null);
 assert.throws(()=>act('order_amend',{...proposal,orderId:scrap.id,expectedContext:revisions.revisionBasis(s,scrap.id)}),/före tryck/);
 const visibleTest=structuredClone(s);visibleTest.orders.find(o=>o.id===amend.id).production.status='submitted';const hidden=visibility.visibleState(visibleTest,{id:'print',email:'print@example.com',name:'Tryck',role:'print',owner:''});
 assert.equal(hidden.orders.find(o=>o.id===amend.id).revisions.length,0);assert.equal(hidden.orders.find(o=>o.id===short.id).commercialValue,null);
 assert.equal(ops.roleActions.seller.has('production_scrap_printed'),false);
 console.log('PASS v12: accepted quantity shortfall, earlier actual shipment/receipt, single invoice task, scrap and replacements, reset prevention, 40→45 amendment with renewed acceptance and department redaction.');

 // Customer-care source deadlines survive a contact follow-up.
 const c=core.CustomerSchema.parse({id:'care-v12',name:'Kund utan plan',owner:own,status:'active'});s.customers.push(c);
 assert.ok(core.concerns(c,today,s).includes('Aktiv kund utan planerad aktivitet'));
 const protectedTask=core.TaskSchema.parse({id:'need-v12',customerId:c.id,owner:own,title:'Behov inför mässa',due:core.plusDays(today,20),kind:'csm_need'});s.tasks.push(protectedTask);c.plan.nextNeedDate=core.plusDays(today,34);
 act('follow_up',{taskId:protectedTask.id,expectedContext:follow.followupBasis(s,protectedTask.id),outcome:'no_reply',occurredOn:today,note:'Ring igen',completed:false,nextAction:'Ring inköparen',nextDate:core.plusDays(today,2)});
 assert.equal(s.tasks.find(t=>t.id===protectedTask.id).due,protectedTask.due);assert.equal(s.customers.find(v=>v.id===c.id).plan.nextNeedDate,c.plan.nextNeedDate);assert.equal(s.tasks.filter(t=>t.customerId===c.id&&t.kind==='manual').length,1);assert.equal(s.customers.find(v=>v.id===c.id).lastContact,'');
 assert.throws(()=>act('follow_up',{taskId:protectedTask.id,expectedContext:follow.followupBasis(s,protectedTask.id),outcome:'contact',occurredOn:today,note:'Klart',completed:true,nextAction:'Ring',nextDate:today}));
 let care=s.customers.find(v=>v.id===c.id);care.plan.issueStatus='open';care.plan.issueAction='Undersök';care.plan.issueDue=today;
 s.tasks.push(core.TaskSchema.parse({id:'issue-v12',customerId:c.id,owner:own,title:'Undersök',due:today,kind:'csm_issue'}));
 act('follow_up',{taskId:'issue-v12',expectedContext:follow.followupBasis(s,'issue-v12'),outcome:'contact',occurredOn:today,note:'Ny tid avtalad',completed:false,nextAction:'Återkom med besked',nextDate:core.plusDays(today,3)});
 care=s.customers.find(v=>v.id===c.id);assert.equal(care.plan.issueDue,core.plusDays(today,3));assert.equal(care.plan.issueStatus,'open');
 const reviewBefore=care.nextReview;act('note',{customerId:c.id,text:'Kort samtal',contact:true});assert.equal(s.customers.find(v=>v.id===c.id).nextReview,reviewBefore);
 act('import_customers',{customers:[{name:'Importerad aktiv V12',owner:own,status:'active'}]});const imported=s.customers.find(c=>c.name==='Importerad aktiv V12');assert.equal(imported.nextReview,core.plusDays(today,7));assert.ok(s.tasks.some(t=>t.customerId===imported.id&&t.kind==='csm'&&!t.done));
 const signalState=core.seedState(),quote=signalState.deals.find(d=>!['won','lost'].includes(d.stage));quote.stage='quoted';quote.nextDate=core.plusDays(today,-6);quote.nextAction='Följ upp';signalState.tasks.push(core.TaskSchema.parse({id:'signal-v12',customerId:quote.customerId,dealId:quote.id,owner:quote.owner,title:'Följ upp',due:quote.nextDate,kind:'quote'}));
 assert.ok(signals.workSignals(signalState).some(v=>v.taskId==='signal-v12'&&v.escalated));quote.nextDate=core.plusDays(today,1);signalState.tasks.find(t=>t.id==='signal-v12').due=quote.nextDate;assert.ok(!signals.workSignals(signalState).some(v=>v.taskId==='signal-v12'));
 console.log('PASS v12: protected business deadlines, separate callback, open issue synchronization, no false contact/review, actionable imported customers and condition-based signals.');

 // Two callers change unrelated customers from the same old view.
 let live=await get('live'),a=live.customers[0],b=live.customers.find(c=>c.id!==a.id);const start=live;
 const both=await Promise.all([post(start,'customer',{...a,phone:'parallel-a'},'live'),post(start,'customer',{...b,phone:'parallel-b'},'live')]);for(const r of both)assert.equal(r.status,200,JSON.stringify(r.data));
 live=await get('live');assert.equal(live.customers.find(c=>c.id===a.id).phone,'parallel-a');assert.equal(live.customers.find(c=>c.id===b.id).phone,'parallel-b');
 assert.equal((await post(start,'customer',{...a,phone:'stale'},'live')).data.code,'record_conflict');
 // Force a real workspace CAS miss between validation and commit.
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false;
 db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;const other=await post(live,'customer_note',{customerId:b.id,text:'Samtidigt från kollega'},'live');assert.equal(other.status,200);}return normalBatch(statements)};
 const retry=await post(live,'customer_note',{customerId:a.id,text:'CAS retry preserves this note'},'live');db.batch=normalBatch;assert.equal(retry.status,200);assert.equal(retry.data.events.filter(e=>e.text.includes('CAS retry preserves this note')).length,1);
 const requestId=crypto.randomUUID(),create={name:'Exakt nytt kund-ID',owner:own};const same=await Promise.all([post(retry.data,'customer',create,'live',requestId),post(retry.data,'customer',create,'live',requestId)]);for(const r of same){assert.equal(r.status,200);assert.ok(r.data.customers.some(c=>c.id===r.data.mutationResult.customerId));}assert.equal(same[0].data.mutationResult.customerId,same[1].data.mutationResult.customerId);
 assert.equal((await post(same[0].data,'customer',{...create,name:'Annat innehåll'},'live',requestId)).status,409);
 live=await get('live');const beforeRead=live.version;await get('live');assert.equal((await get('live')).version,beforeRead);
 // Draft consumption shares the CRM transaction, with customer context and private ownership.
 const newDraft=await draftWrite({id:crypto.randomUUID(),kind:'note',context:a.id,revision:0,requestId:crypto.randomUUID(),title:'Mobilanteckning',data:{text:'Hela mötesanteckningen'},archived:false});assert.equal(newDraft.status,200);
 const saved=await post(live,'customer_note',{customerId:a.id,text:'Hela mötesanteckningen',draft:{id:newDraft.data.id,revision:newDraft.data.revision}},'live');assert.equal(saved.status,200);assert.equal((await draftRead(newDraft.data.id)).data[0].archived,true);
 assert.equal((await rolePost('print',await roleGet('print'),'customer_note',{customerId:a.id,text:'Otillåten'})).status,403);
 const raceDraft=(await draftWrite({id:crypto.randomUUID(),kind:'form',context:'customer',revision:0,requestId:crypto.randomUUID(),title:'Två flikar',data:{name:'Flik A'},archived:false})).data;
 const normalPrepare=db.prepare;let draftRace=false;
 db.prepare=sql=>{const wrap=statement=>({sql:statement.sql,bind:(...values)=>wrap(statement.bind(...values)),first:()=>statement.first(),all:()=>statement.all(),run:async()=>{const result=await statement.run();if(!draftRace&&sql.startsWith('UPDATE crm_drafts SET revision=revision+1')){draftRace=true;sqlite.prepare('UPDATE crm_drafts SET revision=revision+1,request_id=?,data=? WHERE space=? AND id=?').run(crypto.randomUUID(),JSON.stringify({name:'Flik B'}),'live',raceDraft.id);}return result}});return wrap(normalPrepare(sql))};
 const raced=await draftWrite({...raceDraft,revision:raceDraft.revision,requestId:crypto.randomUUID(),data:{name:'Flik A ändrad'}});db.prepare=normalPrepare;assert.equal(raced.status,409);assert.equal(raced.data.current.data.name,'Flik B');
 const authConfig=globalThis.__crmEnv.CRM_BOOTSTRAP_ADMINS;globalThis.__crmEnv.CRM_BOOTSTRAP_ADMINS='{bad json';assert.equal((await get('live')).viewer.role,'admin');globalThis.__crmEnv.CRM_BOOTSTRAP_ADMINS=authConfig;
 console.log('PASS v12: concurrent unrelated records, same-record conflicts, actual CAS retry, exact idempotent result IDs, read-only GET, private note consumption and resilient existing-account access.');

 // Full application recovery, including a valid maximum-size file and existing source IDs.
 const largeBytes=new Uint8Array(5000000);for(let i=0;i<largeBytes.length;i++)largeBytes[i]=i%251;
 const largeId=crypto.randomUUID(),largeKey='live/'+a.id+'/'+largeId,largeMeta={id:largeId,name:'max-size.pdf',version:'v12',kind:'document',size:largeBytes.length,at:new Date().toISOString(),uploadedBy:'Test'};
 objects.set(largeKey,largeBytes);sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(largeId,'live',a.id,largeKey,JSON.stringify(largeMeta));
 const original=await backup.exportBackup('live'),sourceBefore=await get('live'),sourceKeys=[...objects.keys()].filter(k=>k.startsWith('live/'));
 async function resetDemo(){for(const key of [...objects.keys()])if(key.startsWith('demo/'))objects.delete(key);for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');await store.initialize('demo');sqlite.prepare('UPDATE crm_spaces SET version=1 WHERE id=?').run('demo');}
 await resetDemo();
 for(const fault of ['hash','missing','version']){const bad=structuredClone(original);if(fault==='hash')bad.files[0].sha256='0'.repeat(64);if(fault==='missing'){const refs=await import('../work/export-references.mjs'),ref=refs.collectFileReferences(bad.state)[0];bad.files=bad.files.filter(f=>f.metadata.id!==ref.id);}if(fault==='version'){const refs=await import('../work/export-references.mjs'),ref=refs.collectFileReferences(bad.state)[0];bad.files.find(f=>f.metadata.id===ref.id).metadata.version='wrong';}await assert.rejects(()=>backup.importBackup('demo',bad,crypto.randomUUID(),1,actor));assert.equal((await store.load('demo')).customers.length,0);assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,0);}
 const restoreId=crypto.randomUUID(),restored=await backup.importBackup('demo',original,restoreId,1,actor);assert.equal(restored.customers.length,sourceBefore.customers.length);assert.equal(restored.orders.length,sourceBefore.orders.length);assert.equal(restored.orders[0].proofApproved,sourceBefore.orders[0].proofApproved);
 const restoredFiles=sqlite.prepare('SELECT data,object_key FROM crm_files WHERE space=?').all('demo');assert.equal(restoredFiles.length,original.files.length);assert.ok(restoredFiles.every(r=>!original.files.some(f=>f.metadata.id===JSON.parse(r.data).id)));
 const largeCopy=restoredFiles.find(r=>JSON.parse(r.data).name==='max-size.pdf');assert.deepEqual(objects.get(largeCopy.object_key),largeBytes);assert.deepEqual([...objects.keys()].filter(k=>k.startsWith('live/')),sourceKeys);assert.equal((await get('live')).version,sourceBefore.version);
 assert.equal((await backup.importBackup('demo',original,restoreId,1,actor)).version,restored.version);
 await resetDemo();let uploadCount=0;const normalPut=globalThis.__crmEnv.BUCKET.put;globalThis.__crmEnv.BUCKET.put=async(...args)=>{if(++uploadCount===2)throw Error('R2 unavailable');return normalPut(...args)};await assert.rejects(()=>backup.importBackup('demo',original,crypto.randomUUID(),1,actor),/R2 unavailable/);globalThis.__crmEnv.BUCKET.put=normalPut;assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,0);assert.equal((await store.load('demo')).version,1);
 let restoreRace=true;db.batch=async statements=>{if(restoreRace&&statements[0].sql.startsWith('UPDATE crm_spaces')){restoreRace=false;sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run('demo');}return normalBatch(statements)};
 await assert.rejects(()=>backup.importBackup('demo',original,crypto.randomUUID(),1,actor),/ändrades/);db.batch=normalBatch;assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,0);assert.equal((await store.load('demo')).customers.length,0);await resetDemo();
 // A committed transaction with a lost response must not delete the committed files.
 let loseResponse=true;db.batch=async statements=>{const result=await normalBatch(statements);if(loseResponse&&statements[0].sql.startsWith('UPDATE crm_spaces')){loseResponse=false;throw Error('Connection lost after COMMIT')}return result};
 const recovered=await backup.importBackup('demo',original,crypto.randomUUID(),1,actor);db.batch=normalBatch;assert.equal(recovered.customers.length,original.state.customers.length);for(const row of sqlite.prepare('SELECT object_key FROM crm_files WHERE space=?').all('demo'))assert.ok(objects.has(row.object_key));
 const denied=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live',{headers:{'oai-authenticated-user-id':'print-user','oai-authenticated-user-email':'print@example.com'}}));assert.equal(denied.status,403);
 console.log('PASS v12: full recovery with remapped proof references and 5 MB binary file, corrupt/missing/version rejection before writes, unchanged source, idempotent restore, R2 rollback, committed-response-loss recovery and admin gate.');
 // The very first demo note can autosave without GET persisting the sample workspace.
 await resetDemo();sqlite.prepare('UPDATE crm_spaces SET version=0 WHERE id=?').run('demo');const virtual=await get('demo');assert.ok(virtual.customers.length>0);
 const firstNote=await draftWrite({id:crypto.randomUUID(),kind:'note',context:virtual.customers[0].id,revision:0,requestId:crypto.randomUUID(),title:'Första demoanteckningen',data:{text:'Sparat direkt'},archived:false},headers,'demo');assert.equal(firstNote.status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_customers WHERE space=?').get('demo').n,0);
 console.log('PASS v12: first-use demo draft validates virtual customer context without persisting sample CRM data.');
}
