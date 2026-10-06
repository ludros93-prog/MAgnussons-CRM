import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

// Actual API handlers and migrated SQLite; only R2/identities are synthetic.
// Optional module arguments keep focused compilation separate from work/*.mjs.
export async function verifyBackupExportAuthorization(h){
 const {core}=h,api=h.backupApi||await import('../work/backup-api.mjs'),backup=h.backup||await import('../work/crm-backup.mjs'),stream=h.stream||await import('../work/crm-backup-stream.mjs');
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 let sqlWrites=0,r2Writes=0,readQueries=0,afterBatch,onGet,onChunk,onCancel,reads=[],chunks=[],cancelled=[],closed=[],declaredLengths=[];
 const previousFixedLength=globalThis.FixedLengthStream;
 assert.equal(typeof previousFixedLength,'function','The Node harness must provide a byte-validating FixedLengthStream shim.');
 globalThis.FixedLengthStream=class extends previousFixedLength{constructor(length){declaredLengths.push(length);super(length);}};
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Prepared(this.sql,values);}
  async first(){readQueries++;return sqlite.prepare(this.sql).get(...this.values)||null;}
  async run(){return this.exec();}async all(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);if(statement.columns().length){readQueries++;return{results:statement.all(...this.values),meta:{changes:0}};}sqlWrites++;return{results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{sqlite.exec('BEGIN');let result;try{result=statements.map(s=>s.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}if(afterBatch)await afterBatch(statements);return result;}};
 const env=globalThis.__crmEnv,previous={DB:env.DB,BUCKET:env.BUCKET,CRM_BOOTSTRAP_ADMINS:env.CRM_BOOTSTRAP_ADMINS};
 const account={id:'export-auth-member',user:'export-auth-user',email:'export-auth@example.com'},headers={'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email},marker='PRIVATE-SYNTHETIC-EXPORT';
 const objects=new Map(),files=[],encoder=new TextEncoder(),tables=['crm_spaces','crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'];
 const snapshot=()=>Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]));
 const memberRows=()=>sqlite.prepare('SELECT * FROM crm_members ORDER BY id').all();
 const reset=()=>{afterBatch=onGet=onChunk=onCancel=undefined;reads=[];chunks=[];cancelled=[];closed=[];declaredLengths=[];sqlWrites=r2Writes=readQueries=0;sqlite.exec('DELETE FROM crm_members');sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,account.user,'Syntetisk exportadministratör','admin','');};
 const request=(format='json')=>new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers});
 env.DB=db;env.CRM_BOOTSTRAP_ADMINS=JSON.stringify([{email:account.email,name:'Syntetisk bootstrapadmin',owner:''}]);
 env.BUCKET={put:async()=>{r2Writes++;throw Error('Export must not upload objects');},delete:async()=>{r2Writes++;throw Error('Export must not delete objects');},get:async key=>{
  reads.push(key);const bytes=objects.get(key);if(!bytes)return null;let offset=0,stopped=false;
  const body=new ReadableStream({async pull(controller){if(offset===bytes.length){closed.push(key);controller.close();return;}const index=chunks.filter(c=>c.key===key).length;chunks.push({key,index});if(onChunk)await onChunk(key,index);if(stopped)return;const next=bytes.subarray(offset,Math.min(offset+3,bytes.length));offset+=next.length;controller.enqueue(next);},cancel(){stopped=true;cancelled.push(key);onCancel?.(key);}},{highWaterMark:0});
  if(onGet)await onGet(key);return{size:bytes.byteLength,body,arrayBuffer:async()=>{throw Error('A real R2 body must remain cancellable instead of using arrayBuffer');}};
 }};
 const changes={
  inactive:()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id),
  seller:()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',account.id),
  reader:()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',account.id),
  deleted:()=>sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id),
  recreated:()=>{sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id);sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run('new-'+account.id,account.email,account.user,'Annan syntetisk administratör','admin','');},
  identity:()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('different-'+account.user,account.id),
  owner:()=>sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run('Ändrat syntetiskt ansvar',account.id)
 };
 // This callback mirrors the route's readonly identity contract. Direct-source
 // cases verify producer boundaries, not atomicity at an HTTP consumer read.
 const authorizeProducer=async()=>{const current=await db.prepare('SELECT * FROM crm_members WHERE id=?').bind(account.id).first();if(!current?.active||current.role!=='admin'||current.user_id!==account.user||current.owner!==''||current.email!==account.email){const error=Error('Exportåtkomsten har ändrats.');error.status=403;throw error;}};
 const producer=()=>stream.exportBackupStream('live',authorizeProducer);
 const denied=async(response,label)=>{assert.equal(response.status,403,label);const value=await response.json();assert.deepEqual(Object.keys(value),['error']);assert.equal(typeof value.error,'string');assert.ok(!JSON.stringify(value).includes(marker),'Access errors must not expose private customer/file details.');};
 const linesOf=reader=>{const decoder=new TextDecoder();let buffer='',text='';return{get text(){return text;},async next(){while(!buffer.includes('\n')){const part=await reader.read();if(part.done){assert.equal(buffer,'','A successful stream must not finish with a partial record.');return null;}const value=decoder.decode(part.value,{stream:true});buffer+=value;text+=value;}const at=buffer.indexOf('\n'),raw=buffer.slice(0,at);buffer=buffer.slice(at+1);return{raw,value:JSON.parse(raw)};}};};
 const deniedStream=async(lines,label)=>{let error;try{while(await lines.next()){}}catch(e){error=e;}assert.ok(error,label+' must fail instead of silently producing a valid copy');assert.equal(error.status,403,label);assert.ok(!String(error.message).includes(marker),'A late stream error must not expose private file details.');assert.ok(!lines.text.includes('"type":"end"'),label+' must not emit a valid end record');};
 const timeout=async(promise,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' did not settle after cancellation')),2000);})]);}finally{clearTimeout(timer);}};
 try{
  const state=core.emptyState(),customer=core.CustomerSchema.parse({id:'export-auth-customer',name:marker,owner:state.settings.owners[0]});
  sqlite.prepare('INSERT INTO crm_spaces(id,version,write_token,settings) VALUES(?,7,?,?)').run('live','original-token',JSON.stringify(state.settings));
  sqlite.prepare('INSERT INTO crm_customers(space,id,data) VALUES(?,?,?)').run('live',customer.id,JSON.stringify(customer));
  for(let i=0;i<3;i++){const id='export-auth-file-'+i,key='live/'+customer.id+'/'+id,bytes=new Uint8Array([0,255,i,128,10,20,30,40,50,60+i]);const metadata={id,name:marker+'-underlag-'+i+'.pdf',version:'synthetic-v1',kind:'document',size:bytes.length,at:'2026-10-06T01:00:00Z',uploadedBy:'Syntetiskt test'};objects.set(key,bytes);files.push({key,metadata});sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(id,'live',customer.id,key,JSON.stringify(metadata));}
  const original=snapshot(),originalObjects=new Map(objects);
  const unchanged=expectedMembers=>{assert.deepEqual(snapshot(),original,'Export must not change CRM/version/token/file/draft/ledger data.');assert.deepEqual(objects,originalObjects);assert.equal(sqlWrites,0,'Export callbacks must not bootstrap or rebind accounts.');assert.equal(r2Writes,0);if(expectedMembers)assert.deepEqual(memberRows(),expectedMembers,'Only the injected membership change may persist.');};

  // The bounded current file may finish privately after revocation. No record
  // from it or a later file may be sent, and its body must be closed/cancelled.
  for(const [label,revoke] of Object.entries(changes)){
   reset();let members;onChunk=async(key,index)=>{if(key===files[0].key&&index===0){revoke();members=memberRows();}};
   await denied(await api.GET(request()),'JSON body '+label);assert.equal(reads.length,1);assert.ok(closed.includes(files[0].key)||cancelled.includes(files[0].key));unchanged(members);
   reset();members=undefined;onChunk=async(key,index)=>{if(key===files[0].key&&index===0){revoke();members=memberRows();}};
   const response=await api.GET(request('stream'));assert.equal(response.status,200);const reader=response.body.getReader(),lines=linesOf(reader);await deniedStream(lines,'HTTP NDJSON body '+label);assert.equal(reads.length,1);assert.ok(!lines.text.includes('"type":"file"'),'A file read across revocation must never be emitted.');assert.ok(closed.includes(files[0].key)||cancelled.includes(files[0].key));unchanged(members);
  }

  for(const [label,revoke] of Object.entries(changes)){
   reset();const unopened=await producer();revoke();const unopenedMembers=memberRows(),unopenedLines=linesOf(unopened.getReader());await deniedStream(unopenedLines,'Producer before first header '+label);assert.equal(unopenedLines.text,'','Revocation before production must release no header or customer data');assert.equal(reads.length,0);unchanged(unopenedMembers);
   reset();const source=await producer();assert.equal(reads.length,0,'An unconsumed direct source must not prefetch any R2 file.');const reader=source.getReader(),lines=linesOf(reader);assert.equal((await lines.next()).value.type,'header');await new Promise(resolve=>setImmediate(resolve));assert.equal(reads.length,0,'The zero-HWM direct source must not prefetch beyond its header.');revoke();const members=memberRows();await deniedStream(lines,'Producer after header '+label);assert.equal(reads.length,0);unchanged(members);
   reset();const beforeEnd=await producer(),endReader=beforeEnd.getReader(),endLines=linesOf(endReader);assert.equal((await endLines.next()).value.type,'header');for(let i=0;i<files.length;i++)assert.equal((await endLines.next()).value.type,'file');revoke();const finalMembers=memberRows();await deniedStream(endLines,'Producer before end '+label);assert.equal(reads.length,3);unchanged(finalMembers);
  }

  // Late database awaits must not bypass response/end authorization after all
  // file bodies were read. Checks use the original member ID, never its email.
  for(const format of ['json','stream']){
   for(const [label,revoke] of Object.entries(changes)){
    reset();let loads=0,members;afterBatch=async statements=>{if(statements[0].sql==='SELECT version,settings FROM crm_spaces WHERE id=?'&&++loads===2){revoke();members=memberRows();}};
    const response=await api.GET(request(format));if(format==='json')await denied(response,'JSON final-state await '+label);else{assert.equal(response.status,200);await deniedStream(linesOf(response.body.getReader()),'NDJSON final-state await '+label);}assert.equal(loads,2);assert.equal(reads.length,3);unchanged(members);
   }
  }

  for(const format of ['json','stream']){
   // An object returned after revocation still owns an unread R2 body, which
   // must be cancelled even though no reader has yet been acquired.
   reset();let members;onGet=async key=>{if(key===files[0].key){changes.inactive();members=memberRows();}};
   const response=await api.GET(request(format));if(format==='json')await denied(response,'JSON unread object body');else await deniedStream(linesOf(response.body.getReader()),'NDJSON unread object body');assert.equal(reads.length,1);assert.equal(chunks.length,0);assert.deepEqual(cancelled,[files[0].key]);unchanged(members);
   reset();members=undefined;onChunk=async(key,index)=>{if(key===files[0].key&&index===0){sqlite.prepare('UPDATE crm_members SET user_id=NULL WHERE id=?').run(account.id);members=memberRows();}};
   const unbound=await api.GET(request(format));if(format==='json')await denied(unbound,'JSON unbound user ID');else await deniedStream(linesOf(unbound.body.getReader()),'NDJSON unbound user ID');assert.equal(reads.length,1);unchanged(members);
   // A private R2 failure after revocation must be replaced by the access error.
   reset();members=undefined;onChunk=async()=>{changes.inactive();members=memberRows();throw Error(marker+' private R2 failure');};
   const failed=await api.GET(request(format));if(format==='json')await denied(failed,'JSON private body error');else await deniedStream(linesOf(failed.body.getReader()),'NDJSON private body error');assert.equal(reads.length,1);unchanged(members);
  }

  // Cancellation releases a currently pending read. The blocked source resumes
  // only for test cleanup, so iterator.return() alone would deadlock this case.
  reset();const entered=Promise.withResolvers(),resume=Promise.withResolvers(),bodyCancelled=Promise.withResolvers();onCancel=key=>{if(key===files[0].key)bodyCancelled.resolve();};onChunk=async(key,index)=>{if(key===files[0].key&&index===0){entered.resolve();await resume.promise;}};
  const cancellable=await api.GET(request('stream')),cancelReader=cancellable.body.getReader(),cancelLines=linesOf(cancelReader);assert.equal((await cancelLines.next()).value.type,'header');const pending=cancelReader.read();
  try{await timeout(entered.promise,'R2 pending read');await timeout(cancelReader.cancel(),'HTTP pipeline cancel');await timeout(bodyCancelled.promise,'HTTP cancellation reaching the R2 reader');assert.equal((await pending).done,true);assert.deepEqual(cancelled,[files[0].key]);assert.equal(reads.length,1,'Cancellation must prevent the next file from starting.');unchanged(memberRows());}finally{resume.resolve();await pending.catch(()=>{});}
  reset();const headerOnly=await producer(),headerReader=headerOnly.getReader();assert.equal((await linesOf(headerReader).next()).value.type,'header');await timeout(headerReader.cancel(),'Direct producer header-only cancel');assert.equal(reads.length,0);unchanged(memberRows());
  // FixedLengthStream adds a bounded pipeline stage. Its authorized header may
  // cause the current R2 get to begin before the HTTP consumer asks for a file;
  // cancellation must still close that unread body and never begin the next.
  reset();const getEntered=Promise.withResolvers(),getResume=Promise.withResolvers(),getCancelled=Promise.withResolvers();onCancel=key=>{if(key===files[0].key)getCancelled.resolve();};onGet=async key=>{if(key===files[0].key){getEntered.resolve();await getResume.promise;}};
  const pendingGet=await api.GET(request('stream')),getReader=pendingGet.body.getReader();assert.equal((await linesOf(getReader).next()).value.type,'header');const getRead=getReader.read();
  try{await timeout(getEntered.promise,'Pending R2 get');assert.equal(reads.length,1,'The controlled HTTP pipeline may begin only its bounded current file.');const stopping=getReader.cancel();getResume.resolve();await timeout(stopping,'Cancel before R2 get resolves');await timeout(getCancelled.promise,'Pipeline cancellation of an unread R2 body');assert.equal((await getRead).done,true);assert.equal(reads.length,1);assert.equal(chunks.length,0);assert.deepEqual(cancelled,[files[0].key]);unchanged(memberRows());}finally{getResume.resolve();await getRead.catch(()=>{});}

  // Complete authorized exports retain the original formats, bytes and hashes.
  reset();const jsonResponse=await api.GET(request());assert.equal(jsonResponse.status,200);const json=await jsonResponse.json();assert.equal(json.format,'magnussons-crm-backup-1');assert.equal(json.state.customers[0].name,marker);assert.equal(json.files.length,3);
  for(const file of json.files){const source=files.find(f=>f.metadata.id===file.metadata.id);assert.deepEqual(backup.decodeBackupFile(file.content),objects.get(source.key));assert.equal(file.sha256,await backup.checksum(objects.get(source.key)));}assert.equal(reads.length,3);unchanged(memberRows());
  reset();const streamResponse=await api.GET(request('stream'));assert.equal(streamResponse.status,200);const archive=new Uint8Array(await streamResponse.arrayBuffer()),text=new TextDecoder().decode(archive),raw=text.trimEnd().split('\n'),records=raw.map(line=>JSON.parse(line)),end=records.at(-1);assert.equal(declaredLengths.length,1,'The HTTP export must use exactly one fixed-length framing stream.');assert.ok(Number.isSafeInteger(declaredLengths[0])&&declaredLengths[0]>0);assert.equal(archive.byteLength,declaredLengths[0],'The declared wire length must equal all received UTF-8 bytes.');assert.equal(records[0].format,'magnussons-crm-backup-2');assert.equal(records[0].state.customers[0].name,marker);assert.equal(end.type,'end');assert.equal(end.files,3);assert.equal(end.bytes,[...objects.values()].reduce((n,b)=>n+b.length,0));
  let digest=await backup.checksum(encoder.encode(raw[0]));for(const line of raw.slice(1,-1))digest=await backup.checksum(encoder.encode(digest+':'+await backup.checksum(encoder.encode(line))));assert.equal(end.sha256,digest);
  for(const file of records.slice(1,-1)){const source=files.find(f=>f.metadata.id===file.id);assert.deepEqual(backup.decodeBackupFile(file.content),objects.get(source.key));assert.equal(file.sha256,await backup.checksum(objects.get(source.key)));}assert.equal(reads.length,3);unchanged(memberRows());
  // A meaningful batch of tiny files must not spend one D1 query per body
  // chunk. This is a synthetic regression budget, not a hosting-limit claim.
  for(let i=3;i<110;i++){const id='export-auth-file-'+i,key='live/'+customer.id+'/'+id,bytes=new Uint8Array([i,0,255,128]),metadata={id,name:'synthetic-small-'+i+'.pdf',version:'synthetic-v1',kind:'document',size:bytes.length,at:'2026-10-06T01:00:00Z',uploadedBy:'Syntetiskt test'};objects.set(key,bytes);sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(id,'live',customer.id,key,JSON.stringify(metadata));}
  reset();const volumeBefore=snapshot(),volumeObjects=new Map(objects),volume=await api.GET(request('stream'));assert.equal(volume.status,200);const volumeRecords=(await volume.text()).trimEnd().split('\n').map(JSON.parse);assert.equal(volumeRecords.at(-1).type,'end');assert.equal(volumeRecords.at(-1).files,110);assert.equal(volumeRecords.filter(r=>r.type==='file').length,110);assert.equal(reads.length,110);assert.ok(readQueries<=600,'110 tiny files exceeded the synthetic 600-D1-query budget: '+readQueries);assert.equal(sqlWrites,0);assert.equal(r2Writes,0);assert.deepEqual(snapshot(),volumeBefore);assert.deepEqual(objects,volumeObjects);
  const volumeQueryCount=readQueries;
  // Validate byte framing independently of ASCII-only examples. JSON escaping
  // and UTF-8 must be measured as bytes, and sizes 1/2/3 cover base64 residues.
  sqlite.exec('DELETE FROM crm_files');objects.clear();files.length=0;
  customer.name='Privat åäö "+\\\n 😀';sqlite.prepare('UPDATE crm_customers SET data=? WHERE space=? AND id=?').run(JSON.stringify(customer),'live',customer.id);
  for(let i=0;i<3;i++){const id='utf8-å-"-\\-'+i,key='live/'+customer.id+'/'+id,bytes=new Uint8Array(Array.from({length:i+1},(_,j)=>128+i+j)),metadata={id,name:'Underlag åäö " \\ 😀 '+i+'.pdf',version:'synthetic-v1',kind:'document',size:bytes.length,at:'2026-10-06T01:00:00Z',uploadedBy:'Syntetiskt test'};objects.set(key,bytes);files.push({key,metadata});sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(id,'live',customer.id,key,JSON.stringify(metadata));}
  reset();const unicodeBefore=snapshot(),unicodeObjects=new Map(objects),unicodeResponse=await api.GET(request('stream'));assert.equal(unicodeResponse.status,200);const unicodeBytes=new Uint8Array(await unicodeResponse.arrayBuffer()),unicodeText=new TextDecoder().decode(unicodeBytes),unicodeRaw=unicodeText.trimEnd().split('\n'),unicodeRecords=unicodeRaw.map(JSON.parse);assert.equal(declaredLengths.length,1);assert.equal(unicodeBytes.byteLength,declaredLengths[0],'Fixed-length framing must include UTF-8, JSON escapes and base64 padding exactly.');assert.ok(unicodeBytes.byteLength>unicodeText.length,'The fixture must exercise multibyte UTF-8.');assert.equal(unicodeRecords[0].state.customers[0].name,customer.name);assert.equal(unicodeRecords.at(-1).files,3);assert.equal(unicodeRecords.at(-1).bytes,6);assert.deepEqual(unicodeRecords.slice(1,-1).map(f=>f.id),[...files].sort((a,b)=>a.metadata.id.localeCompare(b.metadata.id)).map(f=>f.metadata.id));
  let unicodeDigest=await backup.checksum(encoder.encode(unicodeRaw[0]));for(const line of unicodeRaw.slice(1,-1)){const record=JSON.parse(line),source=files.find(f=>f.metadata.id===record.id);assert.deepEqual(backup.decodeBackupFile(record.content),objects.get(source.key));assert.equal(record.content.length,4*Math.ceil(source.metadata.size/3));assert.equal(record.sha256,await backup.checksum(objects.get(source.key)));unicodeDigest=await backup.checksum(encoder.encode(unicodeDigest+':'+await backup.checksum(encoder.encode(line))));}assert.equal(unicodeRecords.at(-1).sha256,unicodeDigest);assert.equal(sqlWrites,0);assert.equal(r2Writes,0);assert.deepEqual(snapshot(),unicodeBefore);assert.deepEqual(objects,unicodeObjects);
  // A valid archive can contain no files; a zero-byte file is forbidden by the
  // existing metadata schema and is deliberately not manufactured here.
  sqlite.exec('DELETE FROM crm_files');objects.clear();reset();const emptyBefore=snapshot(),emptyResponse=await api.GET(request('stream'));assert.equal(emptyResponse.status,200);const emptyBytes=new Uint8Array(await emptyResponse.arrayBuffer()),emptyRaw=new TextDecoder().decode(emptyBytes).trimEnd().split('\n'),emptyRecords=emptyRaw.map(JSON.parse);assert.equal(declaredLengths.length,1);assert.ok(Number.isSafeInteger(declaredLengths[0])&&declaredLengths[0]>0);assert.equal(emptyBytes.byteLength,declaredLengths[0],'An empty file collection must still have the exact header/end wire length.');assert.deepEqual(emptyRecords.map(r=>r.type),['header','end']);assert.deepEqual(emptyRecords[0].files,[]);assert.equal(emptyRecords[1].files,0);assert.equal(emptyRecords[1].bytes,0);assert.equal(emptyRecords[1].sha256,await backup.checksum(encoder.encode(emptyRaw[0])));assert.equal(reads.length,0);assert.equal(sqlWrites,0);assert.equal(r2Writes,0);assert.deepEqual(snapshot(),emptyBefore);assert.equal(objects.size,0);
  console.log('PASS backup export authorization: seven membership changes across actual JSON/HTTP-body/final awaits; direct producer header/body/end boundaries; readonly identity checks, pending/unread R2 pipeline cancellation, exact fixed-length UTF-8/escaped-ID/base64/empty-file framing, complete hashes and unchanged source; 110 small files use '+volumeQueryCount+' D1 reads. HTTP pipeline buffering is bounded; already sent bytes cannot be recalled.');
 }finally{globalThis.FixedLengthStream=previousFixedLength;env.DB=previous.DB;env.BUCKET=previous.BUCKET;env.CRM_BOOTSTRAP_ADMINS=previous.CRM_BOOTSTRAP_ADMINS;sqlite.close();}
}
