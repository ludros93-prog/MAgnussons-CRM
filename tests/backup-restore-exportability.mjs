import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

// Actual backup HTTP handlers and migrated SQLite. All accounts, history and
// R2 bytes are synthetic; the surrounding suite's bindings are restored below.
export async function verifyBackupRestoreExportability(h){
 const {core}=h,api=h.backupApi||await import('../work/backup-api.mjs'),store=h.store||await import('../work/crm-store.mjs');
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Prepared(this.sql,values);}
  async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
  async run(){return this.exec();}async all(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);if(statement.columns().length)return{success:true,results:statement.all(...this.values),meta:{changes:0}};return{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 let puts=0,deletes=0,commits=0,loseAck=false,lostAcks=0;
 const objects=new Map(),db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(restoring)commits++;
  sqlite.exec('BEGIN');let result;try{result=statements.map(s=>s.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(restoring&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic response lost after restore COMMIT');}
  return result;
 }};
 const env=globalThis.__crmEnv,previous={DB:env.DB,BUCKET:env.BUCKET,CRM_BOOTSTRAP_ADMINS:env.CRM_BOOTSTRAP_ADMINS};
 const account={id:'restore-exportability-member',user:'restore-exportability-user',email:'restore-exportability@example.test',name:'Syntetisk återställare'};
 const privateSecret='SYNTHETIC RESTORE PRIVATE SENTINEL',at='2026-10-11T12:00:00.000Z',headers={'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email,Origin:'https://crm.test'};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,value])=>[key,{...value,bytes:value.bytes.slice()}]))});
 const counters=()=>{puts=deletes=commits=0;loseAck=false;};
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const streamRecords=text=>{assert.ok(text.endsWith('\n'),'A successful stream must include its final newline');return text.slice(0,-1).split('\n');};
 const verifyStream=text=>{
  const lines=streamRecords(text),head=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(head.type,'header');assert.equal(end.type,'end');assert.equal(lines.length,head.files.length+2);
  let digest=hash(lines[0]),size=0;
  for(let i=0;i<head.files.length;i++){const record=JSON.parse(lines[i+1]),bytes=Buffer.from(record.content,'base64');assert.equal(record.type,'file');assert.equal(record.id,head.files[i].metadata.id);assert.equal(bytes.length,head.files[i].metadata.size);assert.equal(hash(bytes),record.sha256);size+=bytes.length;digest=hash(digest+':'+hash(lines[i+1]));}
  assert.equal(end.files,head.files.length);assert.equal(end.bytes,size);assert.equal(end.sha256,digest);return head;
 };
 const changedDate=(archives,format,date)=>{
  if(format==='json')return{...archives.json,exportedAt:date};
  const lines=streamRecords(archives.stream),head=JSON.parse(lines[0]);head.exportedAt=date;lines[0]=JSON.stringify(head);
  let digest=hash(lines[0]);for(const line of lines.slice(1,-1))digest=hash(digest+':'+hash(line));const end=JSON.parse(lines.at(-1));end.sha256=digest;lines[lines.length-1]=JSON.stringify(end);
  const text=lines.join('\n')+'\n';verifyStream(text);return text;
 };
 const post=(format,archive,id=crypto.randomUUID(),version=7)=>api.POST(new Request('https://crm.test/api/crm/backup'+(format==='stream'?'?space=demo&version='+version+'&requestId='+id:''),{method:'POST',headers:{...headers,'Content-Type':format==='stream'?'application/x-ndjson':'application/json'},body:format==='stream'?archive:JSON.stringify({space:'demo',version,requestId:id,backup:archive})}));
 const exportArchives=async space=>{
  const before=snapshot(),jsonResponse=await api.GET(new Request('https://crm.test/api/crm/backup?space='+space,{headers}));assert.equal(jsonResponse.status,200);const jsonText=await jsonResponse.text(),json=JSON.parse(jsonText);
  const streamResponse=await api.GET(new Request('https://crm.test/api/crm/backup?space='+space+'&format=stream',{headers}));assert.equal(streamResponse.status,200);const text=await streamResponse.text(),head=verifyStream(text);
  assert.deepEqual(head.state,json.state);assert.ok(!jsonText.includes(privateSecret));assert.ok(!text.includes(privateSecret));assert.deepEqual(snapshot(),before,'Export preserves all 18 raw tables and R2 bytes/metadata');return{json,stream:text};
 };
 const clearRows=space=>{for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run(space);};
 const clearDestination=()=>{clearRows('demo');sqlite.prepare('UPDATE crm_spaces SET version=7,write_token=?,settings=? WHERE id=?').run('destination-before-restore',JSON.stringify(core.emptyState().settings),'demo');for(const key of [...objects.keys()])if(key.startsWith('demo/'))objects.delete(key);};
 const fileId='restore-exportability-proof',fileBytes=new Uint8Array([37,80,68,70,45,0,255,128]),fileVersion='synthetic-v1';
 const seedSource=(customerCount,eventCount)=>{
  clearRows('live');for(const key of [...objects.keys()])if(key.startsWith('live/'))objects.delete(key);
  const settings=core.emptyState().settings,customers=Array.from({length:customerCount},(_,i)=>core.CustomerSchema.parse({id:'restore-exportability-customer-'+i,name:'Syntetisk historikkund '+i,owner:settings.owners[0]})),deal=core.DealSchema.parse({id:'restore-exportability-deal',customerId:customers[0].id,owner:customers[0].owner,title:'Syntetisk bevarad affär'});
  const order=core.OrderSchema.parse({id:'restore-exportability-order',customerId:customers[0].id,dealId:deal.id,owner:customers[0].owner,stage:'handover',proofRequired:true,proofApproved:false,proofFileId:fileId,proofVersion:fileVersion,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Syntetiskt referensprov',production:{workId:'restore-exportability-work',sketchFileId:fileId,sketchVersion:fileVersion}});
  sqlite.exec('BEGIN');try{
   sqlite.prepare('UPDATE crm_spaces SET version=11,write_token=?,settings=? WHERE id=?').run('source-sentinel',JSON.stringify(settings),'live');
   for(const customer of customers)sqlite.prepare('INSERT INTO crm_customers(id,space,data)VALUES(?,?,?)').run(customer.id,'live',JSON.stringify(customer));
   sqlite.prepare('INSERT INTO crm_deals(id,space,customer_id,data)VALUES(?,?,?,?)').run(deal.id,'live',deal.customerId,JSON.stringify(deal));
   sqlite.prepare('INSERT INTO crm_orders(id,space,customer_id,deal_id,data)VALUES(?,?,?,?,?)').run(order.id,'live',order.customerId,order.dealId,JSON.stringify(order));
   const insert=sqlite.prepare('INSERT INTO crm_events(id,space,customer_id,data)VALUES(?,?,?,?)');
   for(let i=0;i<eventCount;i++){const event={id:'restore-exportability-event-'+i,customerId:customers[i%customerCount].id,dealId:i%customerCount===0?deal.id:'',text:i===0?'H'.repeat(50000):'Syntetisk originalhistorik '+i,at,kind:'note',actor:{id:'synthetic-original-author',name:'Syntetisk tidigare aktör'},...(i===0?{note:{title:'Bevarad originalanteckning',meetingDate:'2026-10-10',sourceFiles:['syntetiskt-original.txt']}}:{})};insert.run(event.id,'live',event.customerId,JSON.stringify(event));}
   const key='live/'+customers[0].id+'/'+fileId,metadata={id:fileId,name:'syntetiskt-korrektur.pdf',version:fileVersion,kind:'proof',size:fileBytes.length,at,uploadedBy:'Syntetisk tidigare aktör'};
   sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').run(fileId,'live',customers[0].id,key,JSON.stringify(metadata));objects.set(key,{bytes:fileBytes.slice(),httpMetadata:{contentType:'application/pdf'},customMetadata:{synthetic:'source-sentinel'}});
   sqlite.exec('COMMIT');
  }catch(error){sqlite.exec('ROLLBACK');throw error;}
 };
 const denied=async(format,archive,label,id)=>{
  const before=snapshot();counters();const response=await post(format,archive,id);assert.equal(response.status,400,label);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();assert.deepEqual(Object.keys(data),['error']);assert.equal(typeof data.error,'string');assert.ok(!JSON.stringify(data).includes(privateSecret));assert.equal(puts,0,label+' rejects before first R2 staging put');assert.equal(deletes,0,label+' does not disguise staging with cleanup');assert.equal(commits,0,label+' rejects before restore commit');assert.deepEqual(snapshot(),before,label+' preserves every raw table and object');
 };
 const preservedOutsideDestination=(before,after)=>{
  for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside destination');}
  for(const table of ['crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' positive private/account sentinel');
  for(const [key,value] of before.r2)assert.deepEqual(after.r2.get(key),value,'Source and private R2 object '+key);
 };
 const originalEventsPreserved=(restored,original)=>{
  const ids=new Set(original.map(event=>event.id));assert.deepEqual(restored.events.filter(event=>ids.has(event.id)),original,'Every original event, maximum text and provenance survives in its relative order');return restored.events.filter(event=>!ids.has(event.id));
 };
 env.DB=db;env.CRM_BOOTSTRAP_ADMINS='[]';env.BUCKET={
  put:async(key,body,options={})=>{puts++;objects.set(key,{bytes:new Uint8Array(await new Response(body).arrayBuffer()),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}});},
  get:async key=>{const object=objects.get(key);if(!object)return null;return{size:object.bytes.length,arrayBuffer:async()=>object.bytes.slice().buffer};},
  delete:async key=>{deletes++;objects.delete(key);}
 };
 try{
  sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,account.user,account.name,'admin','');
  sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,1)').run('restore-private-member','restore-private@example.test','restore-private-user',privateSecret,'reader','');
  await store.initialize('live');await store.initialize('demo');
  for(const space of ['live','demo'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'restore-private-draft-'+space,'form','customer',3,crypto.randomUUID(),privateSecret,' {"raw":"'+privateSecret+'"}\n',space==='demo'?1:0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync)VALUES(?,?,?,?,?)').run(account.user,'synthetic-restore-ms',account.email,privateSecret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?)').run('restore-outlook-'+shared,account.user,'mail',JSON.stringify({body:privateSecret}),'restore-exportability-customer-0',shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').run('synthetic-restore-oauth',account.user,privateSecret,1999999999000);
  objects.set('synthetic-private/unrelated',{bytes:new TextEncoder().encode(privateSecret),httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private-sentinel'}});
  seedSource(2,2);clearDestination();const small=await exportArchives('live');
  for(const format of ['json','stream'])await denied(format,changedDate(small,format,'X'.repeat(50000)),format+' oversized exportedAt with a genuine attached file');
  // The stored event limit measures UTF-16 code units, including surrogate
  // pairs. Adjacent values exercise both the exact generated-text boundary
  // and preservation of an original maximum-length note without truncation.
  for(const date of ['D'.repeat(49946),'😀'.repeat(24973)])for(const format of ['json','stream']){
   assert.equal(date.length,49946);clearDestination();const before=snapshot(),archive=changedDate(small,format,date);counters();const response=await post(format,archive);assert.equal(response.status,200);const restored=await response.json(),audits=originalEventsPreserved(restored,small.json.state.events);
   assert.equal(audits.length,2);for(const event of audits){assert.equal(event.text.length,50000);assert.ok(event.text.endsWith(date));}assert.equal(restored.events.length,4);assert.equal(commits,1);assert.equal(puts,1);assert.equal(deletes,0);preservedOutsideDestination(before,snapshot());assert.deepEqual((await exportArchives('demo')).json.state.events,restored.events);
   clearDestination();await denied(format,changedDate(small,format,date+'X'),format+' adjacent generated text overflow with '+(date.startsWith('😀')?'surrogate pairs':'ASCII'));
  }
  let historicalOverflow;
  for(const [customers,events] of [[1,50000],[2,49999]]){
   seedSource(customers,events);clearDestination();const archives=await exportArchives('live');assert.equal(archives.json.state.events.length,events);assert.equal(archives.json.state.customers.length,customers);
   if(customers===1)historicalOverflow=archives;
   for(const format of ['json','stream'])await denied(format,format==='json'?archives.json:archives.stream,format+' valid server copy with '+events+' events and '+customers+' customers');
  }
  seedSource(2,49998);clearDestination();const boundary=await exportArchives('live');assert.equal(boundary.json.state.events[0].text.length,50000);
  for(const format of ['json','stream']){
   clearDestination();const before=snapshot(),archive=format==='json'?boundary.json:boundary.stream,id=crypto.randomUUID();counters();loseAck=true;
   const response=await post(format,archive,id);assert.equal(response.status,200);const restored=await response.json();assert.equal(loseAck,false,'The actual commit must trigger the lost-ACK fixture');assert.equal(commits,1);assert.equal(puts,1);assert.equal(deletes,0,'A committed file survives its lost commit response');assert.equal(restored.version,8);assert.equal(restored.events.length,50000);
   const audits=originalEventsPreserved(restored,boundary.json.state.events);assert.equal(audits.length,2);assert.deepEqual(audits.map(event=>event.customerId).sort(),boundary.json.state.customers.map(customer=>customer.id).sort());for(const event of audits){assert.equal(event.kind,'restore');assert.ok(event.text.length<=50000);assert.deepEqual(event.actor,{id:account.user,name:account.name});}
   const after=snapshot();preservedOutsideDestination(before,after);const copied=after.tables.crm_files.filter(row=>row.space==='demo');assert.equal(copied.length,1);assert.notEqual(copied[0].id,fileId);assert.deepEqual(after.r2.get(copied[0].object_key).bytes,fileBytes);assert.equal(restored.orders[0].proofFileId,copied[0].id);assert.equal(restored.orders[0].production.sketchFileId,copied[0].id);assert.equal(restored.orders[0].proofVersion,fileVersion);assert.equal(restored.orders[0].production.sketchVersion,fileVersion);assert.equal(after.tables.crm_mutations.filter(row=>row.space==='demo').length,1);
   const exports=await exportArchives('demo');assert.deepEqual(exports.json.state.events,restored.events);assert.deepEqual(exports.json.state.orders,restored.orders);
   counters();const replay=await post(format,archive,id);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),restored);assert.equal(puts,0);assert.equal(commits,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),after,'Capacity-full exact replay preserves audit, ledger, version, files and private sentinels');
   const changed=changedDate(boundary,format,'2026-01-01T00:00:00.000Z');await denied(format,changed,format+' different intent under the committed request ID',id);
   // Synthetic receipts model requests accepted by the previous writer.
   // Current state may have evolved after that receipt: replay loads it and
   // does not repair history or repeat first-write capacity/date preparation.
   for(const [label,historical] of [
    ['old free-text date',changedDate(boundary,format,'Äldre registrerad datumtext')],
    ['old oversized date',changedDate(boundary,format,'X'.repeat(50000))],
    ['old maximum event count',format==='json'?historicalOverflow.json:historicalOverflow.stream]
   ]){
    const historicalId=crypto.randomUUID(),requestHash=format==='json'?await store.requestHash('backup_restore',historical):await store.requestHash('backup_restore_stream',{sha256:JSON.parse(streamRecords(historical).at(-1)).sha256});
    sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash)VALUES(?,?,?,?,?)').run('demo',historicalId,'{}',account.user,requestHash);const historicalBefore=snapshot();counters();const historicalReplay=await post(format,historical,historicalId);assert.equal(historicalReplay.status,200,label);assert.deepEqual(await historicalReplay.json(),restored);assert.equal(puts,0);assert.equal(commits,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),historicalBefore,'Existing '+label+' receipt replays without first-write mutation');
   }
  }
  assert.equal(lostAcks,2);
  console.log('PASS restore exportability: actual JSON/NDJSON oversized-date/adjacent ASCII and surrogate-pair text boundaries and valid capacity rejection before staging/commit; all 18 raw tables and positive private/Outlook/member/R2 sentinels; 49,998 original events plus two audits survive both exports, file links, lost commit ACK, exact capacity replay and old date/count receipts. This is isolated Node/SQLite evidence, not hosted capacity or restoration.');
 }finally{env.DB=previous.DB;env.BUCKET=previous.BUCKET;env.CRM_BOOTSTRAP_ADMINS=previous.CRM_BOOTSTRAP_ADMINS;sqlite.close();}
}
