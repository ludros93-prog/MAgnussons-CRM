import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

// Real migrated SQLite and API handlers; all identities and bytes are synthetic.
// Swap only the test environment bindings, preserving the surrounding suite.
export async function verifyBackupAuthorization({core}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Prepared(this.sql,values);}
  async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
  async run(){return this.exec();}async all(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);if(statement.columns().length)return{results:statement.all(...this.values),meta:{changes:0}};return{results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const objects=new Map(),removed=[],db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  sqlite.exec('BEGIN');try{const result=statements.map(s=>s.exec());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}
 }};
 const env=globalThis.__crmEnv,previous={DB:env.DB,BUCKET:env.BUCKET,CRM_BOOTSTRAP_ADMINS:env.CRM_BOOTSTRAP_ADMINS};
 env.DB=db;env.CRM_BOOTSTRAP_ADMINS='[]';env.BUCKET={
  put:async(key,body)=>objects.set(key,new Uint8Array(await new Response(body).arrayBuffer())),
  get:async key=>objects.has(key)?{size:objects.get(key).byteLength,arrayBuffer:async()=>objects.get(key).slice().buffer}:null,
  delete:async key=>{removed.push(key);objects.delete(key);}
 };
 try{
  const store=await import('../work/crm-store.mjs'),backup=await import('../work/crm-backup.mjs'),stream=await import('../work/crm-backup-stream.mjs'),api=await import('../work/backup-api.mjs');
  const account={id:'synthetic-backup-member',user:'synthetic-backup-user',email:'backup-authorization@example.com'},headers={'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email,Origin:'https://crm.test'};
  const actorReset=()=>{
   sqlite.exec('DELETE FROM crm_members');
   sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,account.user,'Syntetisk administratör','admin','');
  };
  actorReset();await store.initialize('live');await store.initialize('demo');
  const state=core.emptyState(),customer=core.CustomerSchema.parse({id:'synthetic-backup-customer',name:'Syntetisk backupkund',owner:state.settings.owners[0]});state.customers=[customer];
  assert.equal(await store.commit('live',await store.load('live'),state,crypto.randomUUID()),true);
  const bytes=new Uint8Array([0,255,31,128]),sourceKey='live/'+customer.id+'/synthetic-source-file',metadata={id:'synthetic-source-file',name:'syntetiskt-underlag.pdf',version:'synthetic-v1',kind:'document',size:bytes.byteLength,at:'2026-10-06T00:00:00Z',uploadedBy:'Syntetiskt test'};
  objects.set(sourceKey,bytes);
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(metadata.id,'live',customer.id,sourceKey,JSON.stringify(metadata));
  const json=await backup.exportBackup('live'),ndjson=await new Response(await stream.exportBackupStream('live')).text(),sourceBefore=await store.load('live'),sourceFiles=sqlite.prepare('SELECT * FROM crm_files WHERE space=?').all('live');
  const tables=['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_drafts','crm_mutations'];
  const reset=()=>{
   for(const table of tables)sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run('demo');
   sqlite.prepare('UPDATE crm_spaces SET version=1,write_token=?,settings=? WHERE id=?').run('',JSON.stringify(core.emptyState().settings),'demo');
   for(const key of [...objects.keys()])if(key.startsWith('demo/'))objects.delete(key);
   removed.length=0;actorReset();
  };
  const request=(format,id)=>new Request('https://crm.test/api/crm/backup'+(format==='stream'?'?space=demo&version=1&requestId='+id:''),{method:'POST',headers:{...headers,'Content-Type':format==='stream'?'application/x-ndjson':'application/json'},body:format==='stream'?ndjson:JSON.stringify({space:'demo',version:1,requestId:id,backup:json})});
  const changes={
   inactive:()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id),
   seller:()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',account.id),
   reader:()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',account.id),
   deleted:()=>sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id),
   identity:()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('other-synthetic-user',account.id),
   owner:()=>sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run('Ändrat syntetiskt ansvar',account.id),
   memberId:()=>sqlite.prepare('UPDATE crm_members SET id=? WHERE id=?').run('replacement-synthetic-member',account.id)
  };
  const normalBatch=db.batch,normalPrepare=db.prepare;
  const sourceUnchanged=async()=>{
   assert.deepEqual(await store.load('live'),sourceBefore);assert.deepEqual(sqlite.prepare('SELECT * FROM crm_files WHERE space=?').all('live'),sourceFiles);assert.deepEqual(objects.get(sourceKey),bytes);
  };
  const noPrivateResult=async(response,label)=>{
   assert.equal(response.status,403,label);const result=await response.json();assert.deepEqual(Object.keys(result),['error'],label+' must not return CRM data');assert.equal(typeof result.error,'string');
  };
  for(const format of ['json','stream']){
   for(const [change,revoke] of Object.entries(changes)){
    reset();const before=await store.load('demo'),id=crypto.randomUUID();let injected=false,staged=0;
    db.batch=async statements=>{
     if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;staged=[...objects.keys()].filter(k=>k.startsWith('demo/')).length;revoke();}
     return normalBatch(statements);
    };
    let response;try{response=await api.POST(request(format,id));}finally{db.batch=normalBatch;}
    await noPrivateResult(response,format+' precommit '+change);assert.equal(injected,true);assert.equal(staged,1);
    assert.deepEqual(await store.load('demo'),before);
    for(const table of tables)assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM '+table+' WHERE space=?').get('demo').n,0,table+' must remain unchanged');
    assert.equal(sqlite.prepare('SELECT write_token FROM crm_spaces WHERE id=?').get('demo').write_token,'');
    assert.equal([...objects.keys()].filter(k=>k.startsWith('demo/')).length,0);assert.equal(removed.length,1);assert.ok(removed[0].startsWith('demo/'));await sourceUnchanged();
   }
   reset();const id=crypto.randomUUID();
   assert.equal((await api.POST(request(format,id))).status,200);
   const committed=await store.load('demo'),files=sqlite.prepare('SELECT * FROM crm_files WHERE space=?').all('demo'),allKeys=[...objects.keys()];
   assert.equal(committed.version,2);assert.equal(files.length,1);assert.deepEqual(objects.get(files[0].object_key),bytes);
   assert.equal(committed.events.find(e=>e.kind==='restore').actor.id,account.user,'History uses stable user ID, not member ID');
   assert.equal(sqlite.prepare('SELECT user_id FROM crm_mutations WHERE space=? AND id=?').get('demo',id).user_id,account.user);
   assert.equal((await api.POST(request(format,id))).status,200,'Authorized exact replay remains valid');assert.deepEqual(await store.load('demo'),committed);assert.deepEqual([...objects.keys()],allKeys);
   let replayRevoked=false;
   db.prepare=sql=>{if(!replayRevoked&&sql.startsWith('SELECT user_id,request_hash FROM crm_mutations')){replayRevoked=true;changes.inactive();}return normalPrepare(sql);};
   let replay;try{replay=await api.POST(request(format,id));}finally{db.prepare=normalPrepare;}
   await noPrivateResult(replay,format+' revoked replay');assert.equal(replayRevoked,true);assert.deepEqual(await store.load('demo'),committed);assert.deepEqual([...objects.keys()],allKeys);assert.equal(removed.length,0);await sourceUnchanged();
   for(const lostAck of [false,true]){
    reset();let injected=false;const mutationId=crypto.randomUUID();
    db.batch=async statements=>{const result=await normalBatch(statements);if(!injected&&statements[0].sql.startsWith('UPDATE crm_spaces')){injected=true;changes.inactive();if(lostAck)throw new Error('Synthetic lost acknowledgement after authorized commit');}return result;};
    let response;try{response=await api.POST(request(format,mutationId));}finally{db.batch=normalBatch;}
    await noPrivateResult(response,format+' postcommit revocation, lost ACK='+lostAck);assert.equal(injected,true);
    const actual=await store.load('demo'),rows=sqlite.prepare('SELECT * FROM crm_files WHERE space=?').all('demo');
    assert.equal(actual.version,2);assert.equal(actual.customers.length,1);assert.equal(actual.events.filter(e=>e.kind==='restore').length,1);assert.equal(rows.length,1);assert.deepEqual(objects.get(rows[0].object_key),bytes);assert.equal(removed.length,0,'An authorized committed file must survive response denial');
    assert.ok(sqlite.prepare('SELECT id FROM crm_mutations WHERE space=? AND id=?').get('demo',mutationId));await sourceUnchanged();
   }
  }
  console.log('PASS: JSON/NDJSON restore membership at atomic commit (14 races), fresh replay/success/lost-ACK response authorization, stable actor IDs, unchanged source, losing-stage cleanup and committed-file preservation.');
 }finally{env.DB=previous.DB;env.BUCKET=previous.BUCKET;env.CRM_BOOTSTRAP_ADMINS=previous.CRM_BOOTSTRAP_ADMINS;sqlite.close();}
}
