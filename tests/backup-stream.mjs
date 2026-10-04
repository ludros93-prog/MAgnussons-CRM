import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Real SQLite/migrations and binary bytes; R2 is replaced by the isolated harness.
export async function verifyBackupStream(h){
 const {core,sqlite,objects,headers,get,roleHeaders}=h;
 const backup=await import('../work/crm-backup.mjs'),stream=await import('../work/crm-backup-stream.mjs'),store=await import('../work/crm-store.mjs'),api=await import('../work/backup-api.mjs'),refs=await import('../work/export-references.mjs');
 const actor={id:'test-admin',name:'Test admin',role:'admin',owner:''},db=globalThis.__crmEnv.DB,bucket=globalThis.__crmEnv.BUCKET,normalBatch=db.batch,normalPut=bucket.put,normalGet=bucket.get;
 const source=await store.load('live'),customer=source.customers[0];
 for(let n=0;n<2;n++){
  const bytes=new Uint8Array(5000000);for(let i=0;i<bytes.length;i++)bytes[i]=(i+n*71)%251;
  const id=crypto.randomUUID(),key='live/'+customer.id+'/'+id,metadata={id,name:'större-kopia-'+n+'.pdf',version:'stream-test',kind:'document',size:bytes.length,at:new Date().toISOString(),uploadedBy:'Isolerat test'};
  objects.set(key,bytes);sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(id,'live',customer.id,key,JSON.stringify(metadata));
 }
 const originalState=await store.load('live'),originalRows=sqlite.prepare('SELECT id,customer_id,object_key,data FROM crm_files WHERE space=? ORDER BY id').all('live'),sourceObjects=new Map(originalRows.map(r=>[r.object_key,objects.get(r.object_key)]));
 assert.ok(originalRows.reduce((sum,r)=>sum+JSON.parse(r.data).size,0)>10000000);
 await assert.rejects(()=>backup.exportBackup('live'),/10 MB/);
 async function reset(){for(const key of [...objects.keys()])if(key.startsWith('demo/'))objects.delete(key);for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');await store.initialize('demo');sqlite.prepare('UPDATE crm_spaces SET version=1 WHERE id=?').run('demo');}
 // The exporter only reads as its consumer advances and cancellation stops further R2 reads.
 let reads=0;bucket.get=async key=>{reads++;return normalGet(key)};
 try{const incremental=await stream.exportBackupStream('live');assert.equal(reads,0);const reader=incremental.getReader();assert.equal(JSON.parse(new TextDecoder().decode((await reader.read()).value)).type,'header');await reader.cancel();const stopped=reads;assert.ok(stopped<=1);await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,stopped);}finally{bucket.get=normalGet;}
 const exportResponse=await api.GET(new Request('https://crm.test/api/crm/backup?space=live&format=stream',{headers}));assert.equal(exportResponse.status,200);assert.equal(exportResponse.headers.get('content-type'),'application/x-ndjson');
 const text=await exportResponse.text(),lines=text.trimEnd().split('\n'),header=JSON.parse(lines[0]),end=JSON.parse(lines.at(-1));assert.equal(header.format,'magnussons-crm-backup-2');assert.equal(end.files,originalRows.length);assert.ok(end.bytes>10000000);assert.ok(text.length>16000000);
 // Deliberately split records, Unicode and base64 across transport chunks.
 const body=(value=text)=>{const bytes=new TextEncoder().encode(value);let offset=0;return new ReadableStream({pull(controller){if(offset===bytes.length)return controller.close();const size=offset===0?107:65521;controller.enqueue(bytes.subarray(offset,offset+size));offset=Math.min(bytes.length,offset+size);}})};
 const restore=async(value=text,id=crypto.randomUUID(),extraHeaders=headers,version='1')=>{
  const r=await api.POST(new Request('https://crm.test/api/crm/backup?space=demo&version='+version+'&requestId='+id,{method:'POST',headers:{...extraHeaders,'Content-Type':'application/x-ndjson; charset=utf-8',Origin:'https://crm.test'},body:body(value),duplex:'half'}));return {status:r.status,data:await r.json()};
 };
 const empty=async()=>{assert.equal((await store.load('demo')).customers.length,0);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_files WHERE space=?').get('demo').n,0);assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,0);};
 await reset();const id=crypto.randomUUID(),restored=await restore(text,id);assert.equal(restored.status,200,JSON.stringify(restored.data));assert.equal(restored.data.orders.length,originalState.orders.length);
 const copiedRows=sqlite.prepare('SELECT id,customer_id,object_key,data FROM crm_files WHERE space=?').all('demo');assert.equal(copiedRows.length,originalRows.length);
 for(const row of originalRows){const metadata=JSON.parse(row.data),copy=copiedRows.find(r=>JSON.parse(r.data).name===metadata.name&&JSON.parse(r.data).version===metadata.version);assert.ok(copy);assert.notEqual(copy.id,row.id);assert.deepEqual(objects.get(copy.object_key),objects.get(row.object_key));}
 for(const ref of refs.collectFileReferences(restored.data)){const file=copiedRows.find(r=>r.id===ref.id);assert.ok(file);assert.equal(file.customer_id,ref.customerId);assert.equal(JSON.parse(file.data).version,ref.version);}
 const photos=copiedRows.filter(r=>JSON.parse(r.data).purpose==='production');assert.ok(photos.length);for(const photo of photos){const m=JSON.parse(photo.data),order=restored.data.orders.find(o=>o.id===m.orderId);assert.ok([order.production,...order.productionHistory].some(p=>p.workId===m.workId));}
 assert.deepEqual(restored.data.orders.map(o=>o.proofApproved),originalState.orders.map(o=>o.proofApproved));
 const count=objects.size,retry=await restore(text,id);assert.equal(retry.status,200);assert.equal(retry.data.version,restored.data.version);assert.equal(objects.size,count);
 const rebuild=async(records)=>{let digest=await backup.checksum(new TextEncoder().encode(records[0]));for(const record of records.slice(1,-1))digest=await backup.checksum(new TextEncoder().encode(digest+':'+await backup.checksum(new TextEncoder().encode(record))));const last=JSON.parse(records.at(-1));last.sha256=digest;return [...records.slice(0,-1),JSON.stringify(last)].join('\n')+'\n';};
 const changed=lines.slice(),changedHeader=JSON.parse(changed[0]);changedHeader.exportedAt='2026-01-01T00:00:00Z';changed[0]=JSON.stringify(changedHeader);assert.equal((await restore(await rebuild(changed),id)).status,400);
 await reset();
 for(const broken of [lines.slice(0,-1).join('\n')+'\n',text.slice(0,-1),text+'{}\n',text.replace(/"sha256":"[a-f0-9]{64}"/, '"sha256":"'+'0'.repeat(64)+'"')]){const r=await restore(broken);assert.equal(r.status,400,JSON.stringify(r.data));await empty();}
 // A valid per-file hash cannot disguise a changed header or a removed file.
 const badHeader=lines.slice(),badHeaderData=JSON.parse(badHeader[0]);badHeaderData.state.customers[0].name+=' corrupted';badHeader[0]=JSON.stringify(badHeaderData);assert.equal((await restore(badHeader.join('\n')+'\n')).status,400);await empty();
 const missing=lines.slice();missing.splice(1,1);assert.equal((await restore(missing.join('\n')+'\n')).status,400);await empty();
 const invalidLink=lines.slice(),invalid=JSON.parse(invalidLink[0]),ref=refs.collectFileReferences(invalid.state)[0];invalid.files.find(f=>f.metadata.id===ref.id).metadata.version='wrong';invalidLink[0]=JSON.stringify(invalid);assert.equal((await restore(invalidLink.join('\n')+'\n')).status,400);await empty();
 // Explicit header, file and record bounds, before any database commit.
 assert.equal((await restore(JSON.stringify({type:'header',padding:'x'.repeat(16000000)})+'\n')).status,400);await empty();
 const oversized=lines.slice(),oversizedHeader=JSON.parse(oversized[0]);oversizedHeader.files[0].metadata.size=5000001;oversized[0]=JSON.stringify(oversizedHeader);assert.equal((await restore(oversized.join('\n')+'\n')).status,400);await empty();
 assert.equal((await restore(lines[0]+'\n'+JSON.stringify({type:'file',id:'x',content:'A'.repeat(6700001),sha256:'0'.repeat(64)})+'\n')).status,400);await empty();
 let uploaded=0;bucket.put=async(...args)=>{if(++uploaded===2)throw Error('R2 unavailable');return normalPut(...args)};try{const r=await restore();assert.equal(r.status,503);}finally{bucket.put=normalPut;}await empty();
 let raced=false;db.batch=async statements=>{if(!raced&&statements[0].sql.startsWith('UPDATE crm_spaces')){raced=true;sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run('demo');}return normalBatch(statements)};
 try{const r=await restore();assert.equal(r.status,400);}finally{db.batch=normalBatch;}await empty();await reset();
 // Simultaneous retries with the same request commit once and remove only the losing upload.
 const concurrentId=crypto.randomUUID();let competing=false;db.batch=async statements=>{if(!competing&&statements[0].sql.startsWith('UPDATE crm_spaces')){competing=true;assert.equal((await restore(text,concurrentId)).status,200);}return normalBatch(statements)};
 try{assert.equal((await restore(text,concurrentId)).status,200);}finally{db.batch=normalBatch;}
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_files WHERE space=?').get('demo').n,originalRows.length);assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,originalRows.length);await reset();
 let lost=false;db.batch=async statements=>{const result=await normalBatch(statements);if(!lost&&statements[0].sql.startsWith('UPDATE crm_spaces')){lost=true;throw Error('Connection lost after COMMIT')}return result};
 let recovered;try{recovered=await restore();assert.equal(recovered.status,200,JSON.stringify(recovered.data));}finally{db.batch=normalBatch;}
 for(const row of sqlite.prepare('SELECT object_key FROM crm_files WHERE space=?').all('demo'))assert.ok(objects.has(row.object_key));
 await reset();
 // A commit succeeded but neither its response nor outcome lookup is available: preserve files.
 const normalPrepare=db.prepare;let unknown=false;
 db.batch=async statements=>{const result=await normalBatch(statements);if(statements[0].sql.startsWith('UPDATE crm_spaces')){unknown=true;throw Error('Commit response unavailable')}return result};
 db.prepare=sql=>{if(unknown&&sql.startsWith('SELECT user_id,request_hash FROM crm_mutations'))throw Error('Outcome lookup unavailable');return normalPrepare(sql)};
 try{assert.equal((await restore()).status,503);}finally{db.batch=normalBatch;db.prepare=normalPrepare;}
 for(const row of sqlite.prepare('SELECT object_key FROM crm_files WHERE space=?').all('demo'))assert.ok(objects.has(row.object_key));assert.ok((await store.load('demo')).customers.length>0);await reset();
 for(const role of ['production','print','warehouse']){
  assert.equal((await api.GET(new Request('https://crm.test/api/crm/backup?space=live&format=stream',{headers:roleHeaders(role)}))).status,403);
  assert.equal((await restore(text,crypto.randomUUID(),roleHeaders(role))).status,403);
 }
 sqlite.prepare('UPDATE crm_spaces SET version=0 WHERE id=?').run('demo');assert.equal((await restore(text,crypto.randomUUID(),headers,'')).status,400);await empty();
 const missingVersion=await api.POST(new Request('https://crm.test/api/crm/backup?space=demo&requestId='+crypto.randomUUID(),{method:'POST',headers:{...headers,'Content-Type':'application/x-ndjson',Origin:'https://crm.test'},body:body(),duplex:'half'}));assert.equal(missingVersion.status,400);await empty();await reset();
 // Missing R2 object and changes to file metadata/state with unchanged global version stop export.
 const first=originalRows[0],savedObject=objects.get(first.object_key);objects.delete(first.object_key);try{await assert.rejects(async()=>new Response(await stream.exportBackupStream('live')).text(),/saknas/);}finally{objects.set(first.object_key,savedObject);}
 let changedManifest=false;bucket.get=async key=>{const object=await normalGet(key);if(!changedManifest){changedManifest=true;const meta=JSON.parse(first.data);meta.name+=' renamed';sqlite.prepare('UPDATE crm_files SET data=? WHERE id=?').run(JSON.stringify(meta),first.id);}return object};
 try{await assert.rejects(async()=>new Response(await stream.exportBackupStream('live')).text(),/ändrades/);}finally{bucket.get=normalGet;sqlite.prepare('UPDATE crm_files SET data=? WHERE id=?').run(first.data,first.id);}
 let changedState=false;const oldCustomer=sqlite.prepare('SELECT data FROM crm_customers WHERE space=? AND id=?').get('live',customer.id).data;bucket.get=async key=>{const object=await normalGet(key);if(!changedState){changedState=true;const data=JSON.parse(oldCustomer);data.name+=' changed';sqlite.prepare('UPDATE crm_customers SET data=? WHERE space=? AND id=?').run(JSON.stringify(data),'live',customer.id);}return object};
 try{await assert.rejects(async()=>new Response(await stream.exportBackupStream('live')).text(),/ändrades/);}finally{bucket.get=normalGet;sqlite.prepare('UPDATE crm_customers SET data=? WHERE space=? AND id=?').run(oldCustomer,'live',customer.id);}
 assert.deepEqual(await store.load('live'),originalState);assert.deepEqual(sqlite.prepare('SELECT id,customer_id,object_key,data FROM crm_files WHERE space=? ORDER BY id').all('live'),originalRows);for(const [key,bytes] of sourceObjects)assert.deepEqual(objects.get(key),bytes);
 console.log('PASS streaming backup: >10 MB real binary files, proof/photo/work links, unchanged source, full EOF/integrity checks, truncation/corruption/missing rejection, role gates, idempotent retry, R2 cleanup, CAS conflict, lost/uncertain commit and changed export manifest/state.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)setImmediate(()=>import('./crm.mjs').catch(error=>{console.error(error);process.exitCode=1;}));
