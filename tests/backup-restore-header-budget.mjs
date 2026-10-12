import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

// Real backup routes and migrated SQLite with synthetic private/account/R2
// fixtures. The independent size oracle does not call the writer's helper.
export async function verifyBackupRestoreHeaderBudget(h){
 const {core}=h,api=h.backupApi||await import('../work/backup-api.mjs'),store=h.store||await import('../work/crm-store.mjs');
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}async run(){return this.exec();}async all(){return this.exec();}
  exec(){const s=sqlite.prepare(this.sql);if(s.columns().length)return{success:true,results:s.all(...this.values),meta:{changes:0}};return{success:true,results:[],meta:{changes:Number(s.run(...this.values).changes)}};}
 }
 let puts=0,deletes=0,commits=0,loseAck=false,lostAcks=0,requests=0;
 const objects=new Map(),db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');if(restoring)commits++;
  sqlite.exec('BEGIN');let result;try{result=statements.map(s=>s.exec());sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
  if(restoring&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic lost response after header-budget COMMIT');}return result;
 }};
 const env=globalThis.__crmEnv,previous={DB:env.DB,BUCKET:env.BUCKET,CRM_BOOTSTRAP_ADMINS:env.CRM_BOOTSTRAP_ADMINS};
 const account={id:'header-budget-member',user:'header-budget-user',email:'header-budget@example.test',name:'Syntetisk Ägare "Å" \\ 😀'},at='2026-10-11T15:00:00.000Z',secret='SYNTHETIC HEADER PRIVATE SENTINEL';
 const headersFor=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test'}),headers=headersFor(account);
 const other={id:'header-other-member',user:'header-other-user',email:'header-other@example.test',name:'Annan syntetisk återställare'};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,value])=>[key,{...value,bytes:value.bytes.slice()}]))});
 const counters=()=>{puts=deletes=commits=0;loseAck=false;};
 const hash=value=>createHash('sha256').update(value).digest('hex'),size=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
 const records=text=>{assert.ok(text.endsWith('\n'));return text.slice(0,-1).split('\n');};
 const verifyStream=text=>{
  const lines=records(text),head=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(head.type,'header');assert.equal(head.format,'magnussons-crm-backup-2');assert.equal(end.type,'end');assert.equal(lines.length,head.files.length+2);
  let digest=hash(lines[0]),bytes=0;for(let i=0;i<head.files.length;i++){const row=JSON.parse(lines[i+1]),body=Buffer.from(row.content,'base64');assert.equal(row.type,'file');assert.equal(row.id,head.files[i].metadata.id);assert.equal(body.length,head.files[i].metadata.size);assert.equal(row.sha256,hash(body));bytes+=body.length;digest=hash(digest+':'+hash(lines[i+1]));}
  assert.equal(end.files,head.files.length);assert.equal(end.bytes,bytes);assert.equal(end.sha256,digest);return head;
 };
 const rebuildStream=lines=>{let digest=hash(lines[0]);for(const line of lines.slice(1,-1))digest=hash(digest+':'+hash(line));const end=JSON.parse(lines.at(-1));end.sha256=digest;lines[lines.length-1]=JSON.stringify(end);return lines.join('\n')+'\n';};
 const envelope=(state,files,space='live')=>({type:'header',format:'magnussons-crm-backup-2',exportedAt:at,sourceSpace:space,state,files});
 const oracle=(state,files,version=9,format='stream')=>{
  const next=structuredClone(state);next.version=version+1;next.settings.sellerProfiles=next.settings.sellerProfiles.map(p=>({...p,memberId:''}));
  const mapped=new Map(files.map((file,i)=>[file.metadata.id,String(i).padStart(36,'0')]));
  for(const order of next.orders){order.proofFileId=mapped.get(order.proofFileId)||'';order.production.sketchFileId=mapped.get(order.production.sketchFileId)||'';for(const p of order.productionHistory)p.sketchFileId=mapped.get(p.sketchFileId)||'';}
  for(const deal of next.deals)if(deal.repeatRecipe)deal.repeatRecipe.sketchFileId=mapped.get(deal.repeatRecipe.sketchFileId)||'';
  for(const customer of next.customers)next.events.push({id:'0'.repeat(36),customerId:customer.id,dealId:'',text:'CRM-data och kundfiler återställda från kopia daterad '+at,at,kind:'restore',actor:{id:account.user,name:account.name}});
  const remapped=files.map(file=>({customerId:file.customerId,metadata:{...file.metadata,id:mapped.get(file.metadata.id)}}));
  if(format==='json'){const names=['syntetiskt-korrektur.pdf','syntetisk-sketch.txt','syntetiskt-arkiv.txt','syntetisk-logotyp.png'];return size({format:'magnussons-crm-backup-1',exportedAt:at,sourceSpace:'demo',state:next,files:remapped.map(file=>{const body=bodies[names.indexOf(file.metadata.name)];return{...file,content:Buffer.from(body).toString('base64'),sha256:hash(body)};})});}
  return size(envelope(next,remapped,'demo'));
 };
 const clearRows=space=>{for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run(space);};
 const clearDestination=()=>{clearRows('demo');sqlite.prepare('UPDATE crm_spaces SET version=9,write_token=?,settings=? WHERE id=?').run('header-destination-before',JSON.stringify(core.emptyState().settings),'demo');for(const key of [...objects.keys()])if(key.startsWith('demo/'))objects.delete(key);};
 const bodies=[new Uint8Array([37,80,68,70,0,255]),new Uint8Array([0,128,255]),new Uint8Array([1,2,3,4]),new Uint8Array([137,80,78,71])];
 const fixture=(target,{long=false,input=false}={})=>{
  const state=core.emptyState();state.version=9;const customer=core.CustomerSchema.parse({id:'header-budget-customer',name:'Syntetisk budgetkund',owner:state.settings.owners[0]});state.customers=[customer];
  const ids=['p','s','a','l'].map((id,i)=>long?id+'x'.repeat(99):id),fileVersion='synthetic-header-v1';
  state.deals=[core.DealSchema.parse({id:'header-budget-deal',customerId:customer.id,owner:customer.owner,title:'Syntetisk referensaffär',repeatRecipe:{sourceOrderId:'header-budget-order',sourceWorkId:'header-budget-current-work',instructions:'Äldre underlag "ö" \\ 😀',sketchFileId:ids[1],sketchVersion:fileVersion}})];
  state.orders=[core.OrderSchema.parse({id:'header-budget-order',customerId:customer.id,dealId:state.deals[0].id,owner:customer.owner,stage:'handover',proofRequired:true,proofApproved:false,proofFileId:ids[0],proofVersion:fileVersion,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Syntetiskt original',production:{workId:'header-budget-current-work',sketchFileId:ids[1],sketchVersion:fileVersion},productionHistory:[{workId:'header-budget-archived-work',status:'cancelled',sketchFileId:ids[2],sketchVersion:fileVersion}]})];
  state.events=Array.from({length:320},(_,i)=>({id:'header-budget-event-'+String(i).padStart(3,'0'),customerId:customer.id,dealId:i===0?state.deals[0].id:'',text:i===0?'Ä 😀 "citat" \\ rad\nbevarad\t\u0000':'',at,kind:'note',actor:{id:'synthetic-original-author',name:'Syntetisk historik'},...(i===0?{note:{title:'Bevarat underlag',meetingDate:'2026-10-10',sourceFiles:['syntetiskt-original.txt']}}:{})}));
  const normalized=core.normalizeState(state),files=ids.map((id,i)=>({customerId:customer.id,metadata:{id,name:['syntetiskt-korrektur.pdf','syntetisk-sketch.txt','syntetiskt-arkiv.txt','syntetisk-logotyp.png'][i],version:fileVersion,kind:['proof','document','document','logo'][i],size:bodies[i].length,at,uploadedBy:'Syntetisk tidigare aktör'}}));
  const measure=()=>input?size(envelope(normalized,files)):oracle(normalized,files);let remaining=target-measure();assert.ok(remaining>=0);
  for(const event of normalized.events){const n=Math.min(50000-event.text.length,remaining);event.text+='H'.repeat(n);remaining-=n;}assert.equal(remaining,0);assert.equal(measure(),target);assert.ok(normalized.events.every(event=>event.text.length<=50000));return{state:normalized,files};
 };
 const seedSource=({state,files})=>{
  clearRows('live');for(const key of [...objects.keys()])if(key.startsWith('live/'))objects.delete(key);
  sqlite.exec('BEGIN');try{
   sqlite.prepare('UPDATE crm_spaces SET version=9,write_token=?,settings=? WHERE id=?').run('header-source-sentinel',JSON.stringify(state.settings),'live');
   for(const c of state.customers)sqlite.prepare('INSERT INTO crm_customers(id,space,data)VALUES(?,?,?)').run(c.id,'live',JSON.stringify(c));
   for(const d of state.deals)sqlite.prepare('INSERT INTO crm_deals(id,space,customer_id,data)VALUES(?,?,?,?)').run(d.id,'live',d.customerId,JSON.stringify(d));
   for(const o of state.orders)sqlite.prepare('INSERT INTO crm_orders(id,space,customer_id,deal_id,data)VALUES(?,?,?,?,?)').run(o.id,'live',o.customerId,o.dealId,JSON.stringify(o));
   for(const e of state.events)sqlite.prepare('INSERT INTO crm_events(id,space,customer_id,data)VALUES(?,?,?,?)').run(e.id,'live',e.customerId,JSON.stringify(e));
   for(const [i,file] of files.entries()){const key='live/'+file.customerId+'/'+file.metadata.id;sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data)VALUES(?,?,?,?,?)').run(file.metadata.id,'live',file.customerId,key,JSON.stringify(file.metadata));objects.set(key,{bytes:bodies[i].slice(),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'header-source-sentinel'}});}
   sqlite.exec('COMMIT');
  }catch(e){sqlite.exec('ROLLBACK');throw e;}
 };
 const getStream=async(space)=>{requests++;const response=await api.GET(new Request('https://crm.test/api/crm/backup?space='+space+'&format=stream',{headers}));assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes(secret));const head=verifyStream(text);return{head,text,headerBytes:Buffer.byteLength(records(text)[0],'utf8')};};
 const exportSource=async({json=true}={})=>{
  const before=snapshot(),stream=await getStream('live');assert.ok(stream.headerBytes<=16000000);let archive;
  if(json){requests++;const response=await api.GET(new Request('https://crm.test/api/crm/backup?space=live',{headers}));assert.equal(response.status,200);const text=await response.text();assert.ok(Buffer.byteLength(text)<=16000000,'The actual JSON server archive is within its input budget');archive=JSON.parse(text);assert.deepEqual(archive.state,stream.head.state);assert.ok(!text.includes(secret));}
  assert.deepEqual(snapshot(),before,'Genuine exports preserve all 18 raw tables and R2 bytes');return{...stream,json:archive};
 };
 const post=(format,archive,id=crypto.randomUUID(),version=9,user=account)=>{requests++;return api.POST(new Request('https://crm.test/api/crm/backup'+(format==='stream'?'?space=demo&version='+version+'&requestId='+id:''),{method:'POST',headers:{...headersFor(user),'Content-Type':format==='stream'?'application/x-ndjson':'application/json'},body:format==='stream'?archive:JSON.stringify({space:'demo',version,requestId:id,backup:archive})}));};
 const denied=async(format,archive,label,id,user)=>{
  const before=snapshot();counters();const response=await post(format,archive,id,9,user);assert.equal(response.status,400,label);assert.equal(response.headers.get('cache-control'),'no-store');const result=await response.json();assert.deepEqual(Object.keys(result),['error']);assert.equal(typeof result.error,'string');assert.ok(!JSON.stringify(result).includes(secret));assert.equal(puts,0,label+' before first R2 put');assert.equal(deletes,0,label+' without cleanup disguising staging');assert.equal(commits,0,label+' before COMMIT');assert.deepEqual(snapshot(),before,label+' preserves all raw tables/R2');return result.error;
 };
 const outsidePreserved=(before,after)=>{
  for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside destination');}
  for(const table of ['crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' positive private/account sentinel');
  for(const [key,value] of before.r2)assert.deepEqual(after.r2.get(key),value,'Original/source/private R2 '+key);
 };
 const assertRestored=(restored,original,after)=>{
  assert.equal(restored.version,10);const oldIds=new Set(original.events.map(event=>event.id));assert.deepEqual(restored.events.filter(event=>oldIds.has(event.id)),original.events,'All original events, full text, Unicode/escapes and provenance survive without truncation');
  const audits=restored.events.filter(event=>!oldIds.has(event.id));assert.equal(audits.length,1);assert.equal(audits[0].kind,'restore');assert.deepEqual(audits[0].actor,{id:account.user,name:account.name});assert.equal(audits[0].text,'CRM-data och kundfiler återställda från kopia daterad '+at);
  const rows=after.tables.crm_files.filter(row=>row.space==='demo');assert.equal(rows.length,4);const byName=new Map(rows.map(row=>[JSON.parse(row.data).name,row]));
  const names=['syntetiskt-korrektur.pdf','syntetisk-sketch.txt','syntetiskt-arkiv.txt','syntetisk-logotyp.png'];
  for(const file of original.files){const i=names.indexOf(file.metadata.name),row=byName.get(file.metadata.name);assert.ok(row);assert.match(row.id,/^[a-f0-9-]{36}$/);assert.notEqual(row.id,file.metadata.id);assert.deepEqual(after.r2.get(row.object_key).bytes,bodies[i]);assert.deepEqual(JSON.parse(row.data),{...file.metadata,id:row.id});}
  const ids=names.map(name=>byName.get(name).id),order=restored.orders[0];assert.equal(order.proofFileId,ids[0]);assert.equal(order.production.sketchFileId,ids[1]);assert.equal(order.productionHistory[0].sketchFileId,ids[2]);assert.equal(restored.deals[0].repeatRecipe.sketchFileId,ids[1]);return audits;
 };
 env.DB=db;env.CRM_BOOTSTRAP_ADMINS='[]';env.BUCKET={put:async(key,body,options={})=>{puts++;objects.set(key,{bytes:new Uint8Array(await new Response(body).arrayBuffer()),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}});},get:async key=>{const value=objects.get(key);return value?{size:value.bytes.length,arrayBuffer:async()=>value.bytes.slice().buffer}:null;},delete:async key=>{deletes++;objects.delete(key);}};
 try{
  for(const user of [account,other])sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,'admin','');
  sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active)VALUES(?,?,?,?,?,?,1)').run('header-private-member','header-private@example.test','header-private-user',secret,'reader','');
  await store.initialize('live');await store.initialize('demo');
  for(const space of ['live','demo'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'header-private-draft-'+space,'form','customer',3,crypto.randomUUID(),secret,' {"raw":"'+secret+'"}\n',space==='demo'?1:0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync)VALUES(?,?,?,?,?)').run(account.user,'synthetic-header-ms',account.email,secret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at)VALUES(?,?,?,?,?,?,?,?)').run('header-outlook-'+shared,account.user,'mail',JSON.stringify({body:secret}),'header-budget-customer',shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires)VALUES(?,?,?,?)').run('synthetic-header-oauth',account.user,secret,1999999999000);
  objects.set('synthetic-private/header-unrelated',{bytes:new TextEncoder().encode(secret),httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private-header-sentinel'}});
  // Adjacent byte boundaries include source -> destination envelope, all four
  // UUID file IDs and references, one generated audit, and version 9 -> 10.
  for(const target of [16000000,16000001]){
   const input=fixture(target);seedSource(input);clearDestination();let archives=await exportSource();
   // A readable but different 24-byte ISO does not change the byte budget.
   archives.json.exportedAt=at;const lines=records(archives.text),head=JSON.parse(lines[0]);head.exportedAt=at;lines[0]=JSON.stringify(head);archives.text=rebuildStream(lines);verifyStream(archives.text);
   assert.equal(oracle(archives.head.state,archives.head.files),target);assert.equal(oracle(archives.head.state,archives.head.files,8),target-1,'9 -> 10 costs exactly one extra serialized digit');
   for(const format of ['json','stream']){
    clearDestination();const archive=format==='json'?archives.json:archives.text;
    if(target>16000000){assert.match(await denied(format,archive,format+' generated future header at 16MB + one byte'),/16 MB/);continue;}
    if(format==='json'){const wholeJsonBytes=oracle(archives.head.state,archives.head.files,9,'json');assert.ok(wholeJsonBytes>16000000,'Preserved old header-exact fixture exceeds whole JSON only after content/hash envelopes');assert.match(await denied(format,archive,'JSON header-exact fixture still exceeds whole reexport wire budget'),/JSON.*16 MB/);continue;}
    const before=snapshot(),id=crypto.randomUUID();counters();loseAck=true;const response=await post(format,archive,id);assert.equal(response.status,200);const restored=await response.json();assert.equal(loseAck,false);assert.equal(commits,1);assert.equal(puts,4);assert.equal(deletes,0);const after=snapshot();outsidePreserved(before,after);assertRestored(restored,{...archives.head.state,files:archives.head.files},after);
    const exported=await getStream('demo');assert.equal(exported.headerBytes,16000000,'Exactly 16,000,000 UTF-8 bytes excluding LF remain exportable');assert.deepEqual(exported.head.state.events,restored.events);assert.deepEqual(exported.head.state.orders,restored.orders);assert.deepEqual(exported.head.state.deals,restored.deals);
    counters();const replay=await post(format,archive,id);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),restored);assert.equal(puts,0);assert.equal(deletes,0);assert.equal(commits,0);assert.deepEqual(snapshot(),after,'Exact retry does not add audits or remap files twice');
    await denied(format,archive,format+' different actor cannot claim committed receipt',id,other);
   }
   if(target===16000001){
    // Legitimate previous receipts bypass today's first-write header budget.
    // The full stream still proves every file and its end digest before replay.
    for(const format of ['json','stream']){
     clearDestination();const archive=format==='json'?archives.json:archives.text,id=crypto.randomUUID(),requestHash=format==='json'?await store.requestHash('backup_restore',archive):await store.requestHash('backup_restore_stream',{sha256:JSON.parse(records(archive).at(-1)).sha256});
     sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash)VALUES(?,?,?,?,?)').run('demo',id,'{}',account.user,requestHash);const before=snapshot(),current=await store.load('demo');counters();const replay=await post(format,archive,id);assert.equal(replay.status,200);const {viewer,...loaded}=await replay.json();assert.equal(viewer.id,account.user);assert.equal(viewer.role,'admin');assert.deepEqual(loaded,current);assert.equal(puts,0);assert.equal(deletes,0);assert.equal(commits,0);assert.deepEqual(snapshot(),before,'Old valid receipt remains exact, write-free and compatible');
     await denied(format,archive,'Old receipt different actor',id,other);
     let changed;if(format==='json')changed={...archive,exportedAt:'2026-10-12T15:00:00.000Z'};else{const changedLines=records(archive),changedHead=JSON.parse(changedLines[0]);changedHead.exportedAt='2026-10-12T15:00:00.000Z';changedLines[0]=JSON.stringify(changedHead);changed=rebuildStream(changedLines);verifyStream(changed);}
     await denied(format,changed,'Old receipt changed intent with valid archive integrity',id);
     if(format==='stream'){const bad=records(archive),file=JSON.parse(bad[1]);const changedBytes=Buffer.from(file.content,'base64');changedBytes[0]^=255;file.content=changedBytes.toString('base64');bad[1]=JSON.stringify(file);assert.match(await denied(format,rebuildStream(bad),'Old receipt must validate same-sized file digest',id),/Kontrollsumman/);const badEnd=records(archive),end=JSON.parse(badEnd.at(-1));end.sha256='0'.repeat(64);badEnd[badEnd.length-1]=JSON.stringify(end);assert.match(await denied(format,badEnd.join('\n')+'\n','Old receipt must validate complete end digest',id),/slutkontroll/);}
    }
   }
  }
  // Long source IDs shrink to UUIDs. Rejecting by a conservative source-size
  // estimate would lose this valid archive; measure the actual mapped result.
  const long=fixture(16000000,{long:true,input:true});assert.ok(oracle(long.state,long.files)<16000000);seedSource(long);clearDestination();const longArchive=await exportSource({json:false});assert.equal(longArchive.headerBytes,16000000);const longLines=records(longArchive.text),longHead=JSON.parse(longLines[0]);longHead.exportedAt=at;longLines[0]=JSON.stringify(longHead);longArchive.text=rebuildStream(longLines);verifyStream(longArchive.text);const before=snapshot();counters();const response=await post('stream',longArchive.text);assert.equal(response.status,200);const restored=await response.json();assert.equal(puts,4);assert.equal(commits,1);assert.equal(deletes,0);outsidePreserved(before,snapshot());assertRestored(restored,{...longArchive.head.state,files:longArchive.head.files},snapshot());const exported=await getStream('demo');assert.equal(exported.headerBytes,oracle(longArchive.head.state,longArchive.head.files));assert.ok(exported.headerBytes<16000000);
  assert.equal(lostAcks,1);console.log('PASS restore header budget: genuine JSON/NDJSON archives; NDJSON exact 16,000,000 UTF-8 bytes excluding LF reexported, preserved JSON header-exact fixture independently exceeds whole-wire limit and is rejected, +1 rejected before any R2 put/delete/COMMIT; Unicode/JSON escapes, version 9->10, generated audit, proof/current and archived sketch/repeat-recipe UUID remap, long-ID shrink, original history, all 18 raw tables and positive private/Outlook/member/R2 sentinels, lost COMMIT ACK, exact and old receipts, actor/intent/file/end-integrity negatives. '+requests+' isolated HTTP requests; no hosted restoration or personnel acceptance.');
  return{requests,lostAcks,exactHeaderBytes:16000000,overflowHeaderBytes:16000001,longMappedHeaderBytes:exported.headerBytes};
 }finally{env.DB=previous.DB;env.BUCKET=previous.BUCKET;env.CRM_BOOTSTRAP_ADMINS=previous.CRM_BOOTSTRAP_ADMINS;sqlite.close();}
}
