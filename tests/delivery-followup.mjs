import assert from 'node:assert/strict';

export async function verifyDeliveryFollowUp(h){
 const {core,get,post,draftWrite,draftRead,sqlite,headers}=h;
 const followups=await import('../work/follow-up.mjs'),direct=await import('../work/direct-delivery.mjs');
 const today=core.day(),oldContact=core.plusDays(today,-10),reviewOn=core.plusDays(today,30);
 let state=await get('live');
 const owner=state.settings.owners[0];
 async function save(type,data){const r=await post(state,type,data,'live');assert.equal(r.status,200,JSON.stringify(r.data));state=r.data;return r;}
 const created=await save('customer',{name:'Syntetiskt leveransuppföljningsprov',contact:'Syntetisk inköpare',owner,status:'active',lastContact:oldContact,nextReview:reviewOn});
 const customerId=created.data.mutationResult.customerId;
 const accepted=await save('catalog_order',{customerId,owner,title:'Syntetisk mottagen order att följa upp',lines:[{id:'delivery-followup-line',article:'TEST-FOLLOWUP',description:'Syntetiska testplagg',quantity:2,unitPrice:150,unitCost:70}],deliveryDate:today,accepted:true,nextDate:today});
 const orderId=accepted.data.mutationResult.orderId,dealId=accepted.data.mutationResult.dealId;
 const order=()=>state.orders.find(o=>o.id===orderId),customer=()=>state.customers.find(c=>c.id===customerId);
 await save('direct_dispatch',{orderId,expectedContext:direct.directBasis(state,orderId),entries:[{lineId:'delivery-followup-line',quantity:2}],dispatchedOn:today,method:'collection',recipient:'Syntetisk mottagare',address:{},evidence:'Fiktiv kvittens TEST-FOLLOWUP-1',supplierConfirmed:true,noProofNeeded:true});
 assert.equal(order().stage,'shipping');assert.equal(order().deliveredDate,'');
 // Operational gates must still open their dedicated flows rather than the
 // contact dialog, even though all of them are linked to the same order.
 for(const kind of ['receipt','handover','invoice_ready','proof_deadline','order_deadline']){
  assert.equal(followups.canFollowUp(core.TaskSchema.parse({customerId,dealId,owner,title:'Syntetisk spärr '+kind,due:today,kind})),false);
 }
 for(const task of state.tasks.filter(t=>t.dealId===dealId&&['receipt','handover','invoice_ready'].includes(t.kind)&&!t.done)){
  const before=await get('live'),r=await post(before,'follow_up',{taskId:task.id,expectedContext:followups.followupBasis(before,task.id),outcome:'contact',occurredOn:today,note:'Detta får inte avsluta ett operativt steg.',completed:true,nextAction:'',nextDate:''},'live');
  assert.equal(r.status,400);assert.deepEqual(await get('live'),before);
 }
 await save('order',{...order(),invoiceValue:300,actualCost:140,invoiceDate:today,invoiceRef:'TEST-FOLLOWUP-INVOICE'});
 await save('receipt_confirm',{orderId,deliveredDate:today,receivedBy:'Syntetisk mottagare bekräftar hela leveransen',note:'Fiktivt mottagningsunderlag'});
 const initialTask=state.tasks.find(t=>t.dealId===dealId&&t.kind==='delivery'&&!t.done);
 assert.ok(initialTask,'Actual receipt must create a post-delivery contact task.');
 assert.equal(order().stage,'delivered');assert.equal(order().deliveredDate,today);
 assert.equal(followups.canFollowUp(initialTask),true,'A post-delivery contact task must use the focused follow-up workflow.');
 const protectedOrder=structuredClone(order()),protectedDeal=structuredClone(state.deals.find(d=>d.id===dealId)),protectedSettings=structuredClone(state.settings),protectedPlan=structuredClone(customer().plan),protectedOnboarding=structuredClone(customer().onboarding);
 function invariant(){
  assert.deepEqual(order(),protectedOrder,'Contact follow-up must preserve order, production, receipt, invoice and historical attribution.');
  assert.deepEqual(state.deals.find(d=>d.id===dealId),protectedDeal,'The accepted deal must remain unchanged.');
  assert.deepEqual(state.settings,protectedSettings);assert.deepEqual(customer().plan,protectedPlan);assert.deepEqual(customer().onboarding,protectedOnboarding);
  assert.equal(customer().nextReview,reviewOn,'A delivery contact task cannot move the separate customer review date.');
 }
 let task=initialTask;
 const input=(extra={})=>({taskId:task.id,expectedContext:followups.followupBasis(state,task.id),outcome:'contact',occurredOn:today,note:'Syntetisk återkoppling efter leveransen',completed:false,nextAction:'Stäm av passform',nextDate:core.plusDays(today,1),...extra});
 const snapshots=()=>({crm:sqlite.prepare('SELECT version,settings FROM crm_spaces WHERE id=?').get('live'),tasks:sqlite.prepare('SELECT * FROM crm_tasks WHERE space=? ORDER BY id').all('live'),events:sqlite.prepare('SELECT * FROM crm_events WHERE space=? ORDER BY id').all('live'),drafts:sqlite.prepare('SELECT * FROM crm_drafts WHERE space=? ORDER BY user_id,id').all('live')});
 const noReply=input({outcome:'no_reply',note:'Inget svar på det syntetiska kontaktförsöket',nextAction:'Ring igen'}),beforeNoReply=state,noReplyResult=await save('follow_up',noReply);
 assert.equal(customer().lastContact,oldContact);assert.equal(state.tasks.find(t=>t.id===task.id).done,false);assert.equal(state.tasks.find(t=>t.id===task.id).title,'Ring igen');
 assert.equal(state.tasks.filter(t=>t.dealId===dealId&&t.kind==='delivery'&&!t.done).length,1);invariant();
 const noReplyEvent=state.events.find(e=>e.id===noReplyResult.data.mutationResult.eventId);
 assert.equal(noReplyEvent.customerId,customerId);assert.equal(noReplyEvent.dealId,dealId);assert.match(noReplyEvent.text,/Kontaktförsök utan svar/);assert.match(noReplyEvent.text,/Inget svar på det syntetiska kontaktförsöket/);assert.equal(noReplyEvent.note.meetingDate,today);assert.equal(noReplyEvent.actor.id,headers['oai-authenticated-user-id']);
 const replaySnapshot=snapshots(),replay=await post(beforeNoReply,'follow_up',noReply,'live',noReplyResult.id);assert.equal(replay.status,200);assert.deepEqual(snapshots(),replaySnapshot,'Exact replay cannot duplicate a note, activity or mutation.');
 assert.equal((await post(state,'follow_up',{...noReply,note:'Ändrat innehåll med samma request-ID'},'live',noReplyResult.id)).status,409);assert.deepEqual(snapshots(),replaySnapshot);
 const stale=await post(state,'follow_up',{...noReply,note:'Min text från det gamla underlaget'},'live');assert.equal(stale.status,409);assert.equal(stale.data.code,'followup_conflict');assert.deepEqual(snapshots(),replaySnapshot);
 const staleAgain=await post(stale.data.state,'follow_up',{...noReply,note:'Min text från det gamla underlaget'},'live',stale.id);assert.equal(staleAgain.status,409);assert.deepEqual(snapshots(),replaySnapshot);
 const internal=await save('follow_up',input({outcome:'internal',note:'Syntetiskt internt arbete utan kundkontakt',completed:true,nextAction:'Ring om användningen',nextDate:core.plusDays(today,2)}));
 assert.equal(customer().lastContact,oldContact);assert.equal(state.tasks.find(t=>t.id===task.id).done,true);assert.ok(state.tasks.find(t=>t.id===task.id).doneAt);
 task=state.tasks.find(t=>t.dealId===dealId&&t.kind==='delivery'&&!t.done);assert.ok(task);assert.notEqual(task.id,initialTask.id);assert.equal(task.title,'Ring om användningen');assert.equal(task.owner,owner);assert.equal(task.customerId,customerId);assert.equal(task.due,core.plusDays(today,2));assert.equal(state.tasks.filter(t=>t.dealId===dealId&&t.kind==='delivery'&&!t.done).length,1);assert.match(state.events.find(e=>e.id===internal.data.mutationResult.eventId).text,/Arbete med aktivitet/);invariant();
 // A private revision is consumed only in the same successful transaction as
 // the contact note and activity completion. A newer device revision blocks it.
 let payload=input({completed:true,nextAction:'',nextDate:'',note:'Syntetisk kund återkopplade om passform'});
 let draft=(await draftWrite({id:crypto.randomUUID(),kind:'followup',context:task.id,revision:0,requestId:crypto.randomUUID(),title:'Privat leveransuppföljning',data:payload}));assert.equal(draft.status,200);draft=draft.data;
 const badVersion=snapshots(),bad=await post(state,'follow_up',{...payload,draft:{id:draft.id,revision:draft.revision+1}},'live');assert.equal(bad.status,409);assert.deepEqual(snapshots(),badVersion);assert.equal((await draftRead(draft.id)).data[0].archived,false);
 const db=globalThis.__crmEnv.DB,normalBatch=db.batch,beforeRace=await get('live');let injected=false,raced;
 db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;const update=await draftWrite({...draft,requestId:crypto.randomUUID(),data:{...payload,note:'Nyare text från syntetisk andra enhet'}});assert.equal(update.status,200);}return normalBatch(statements);};
 try{raced=await post(state,'follow_up',{...payload,draft:{id:draft.id,revision:draft.revision}},'live');}finally{db.batch=normalBatch;}
 assert.ok(injected);assert.equal(raced.status,409);state=await get('live');assert.deepEqual(state,beforeRace,'Losing the private draft gate must preserve the whole CRM state.');
 draft=(await draftRead(draft.id)).data[0];assert.equal(draft.archived,false);assert.equal(draft.revision,2);payload=draft.data;invariant();
 const contactBefore=state,contact=await save('follow_up',{...payload,draft:{id:draft.id,revision:draft.revision}});
 assert.equal(customer().lastContact,today);assert.equal(state.tasks.find(t=>t.id===task.id).done,true);assert.equal(state.tasks.filter(t=>t.dealId===dealId&&t.kind==='delivery'&&!t.done).length,0);assert.equal(followups.canFollowUp(state.tasks.find(t=>t.id===task.id)),false);assert.match(state.events.find(e=>e.id===contact.data.mutationResult.eventId).text,/Kundkontakt/);assert.match(state.events.find(e=>e.id===contact.data.mutationResult.eventId).text,/Nyare text från syntetisk andra enhet/);invariant();
 const archived=(await draftRead(draft.id)).data[0];assert.equal(archived.archived,true);assert.equal(archived.revision,draft.revision+1);
 const finalSnapshot=snapshots(),contactReplay=await post(contactBefore,'follow_up',{...payload,draft:{id:draft.id,revision:draft.revision}},'live',contact.id);assert.equal(contactReplay.status,200);assert.deepEqual(snapshots(),finalSnapshot);
 assert.equal((await draftWrite({...draft,requestId:crypto.randomUUID(),data:{...payload,note:'Sen autosparning efter inlämning'}})).status,409);assert.deepEqual(snapshots(),finalSnapshot);
 console.log('PASS delivery follow-up: actual dispatch/invoice/receipt fixture, dedicated operational gates, no-reply/internal/contact outcomes, completion and next activity, unchanged order/history/review, stale context, exact replay and atomic private draft consumption.');
}
