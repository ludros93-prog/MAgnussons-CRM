import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

export const DATA_RESTORE_HISTORY_ERROR='CRM-kopian lämnar inte plats för återställningens historik. Inga uppgifter återställs och befintlig historik tas inte bort.';
const at='2026-10-11T20:00:00.000Z',version=127;
const digest=value=>createHash('sha256').update(value).digest('hex');
// The input fits the existing 50,000-event reader. Customer restore audits
// are absent here: the authenticated product handler must generate them.
export function dataRestoreHistoryFixture(core,{eventCount=50000,customerCount=1}={}){
 const state=core.emptyState();state.settings.owners=['Fiktivt historikansvar'];
 state.customers=Array.from({length:customerCount},(_,i)=>core.CustomerSchema.parse({id:'synthetic-history-c'+i,name:'Fiktiv historikkund '+i,owner:state.settings.owners[0]}));
 state.events=Array.from({length:eventCount},(_,i)=>({id:'synthetic-history-e'+String(i).padStart(5,'0'),customerId:state.customers[i%customerCount].id,dealId:'',text:'Fiktiv historik '+i,kind:'note',at}));
 if(eventCount){state.events[0].actor={id:'synthetic-source-actor',name:'Fiktiv ursprunglig kollega'};state.events.at(-1).note={title:'Fiktiv bevarad notering Å😀',meetingDate:'',sourceFiles:[]};}
 return state;
}

export async function verifyDataRestoreHistoryBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 const started=performance.now();mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/data-restore-history-')),compiled=new Set(),sourceBytes=new Map();
 const targetFor=file=>resolve(directory,file.replace(/\.ts$/,'.mjs'));
 function compile(file){
  const target=targetFor(file);if(compiled.has(file))return target;compiled.add(file);assert.ok(file.startsWith('lib/')||['app/api/crm/route.ts','app/api/crm/backup/route.ts'].includes(file));
  const input=readFileSync(resolve(sourceRoot,file));sourceBytes.set(file,input);
  const source=input.toString('utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__crmEnv;");
  let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(relative(resolve('.'),resolve(dirname(file),specifier)).split(sep).join('/')+'.ts');else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(resolve(sourceRoot,'drizzle')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(resolve(sourceRoot,'drizzle',file),'utf8'));
 const original=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));let commits=0,probes=0,puts=0,deletes=0,requests=0,loseAck=false,lostAcks=0,race=false,races=0,revoke=false,revocations=0;
 const objects=new Map([['synthetic-private-r2',new Uint8Array([9,8,7])]]);
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe'){probes++;assert.deepEqual(this.values,['A😀']);}return sqlite.prepare(this.sql).get(...this.values)||null;}
  async all(){return this.exec();}async run(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{success:true,results:statement.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-history-member-'+role,user:'synthetic-history-user-'+role,email:'synthetic-history-'+role+'@example.test',name:'Fiktiv historikåterställare',role:role==='other'?'admin':role,owner:''})),account=accounts[0],other=accounts[1];
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(restoring){commits++;if(race){race=false;races++;sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='live'").run();}if(revoke){revoke=false;revocations++;sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id);}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(restoring&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic history lost ACK after actual COMMIT');}return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{const bytes=objects.get(key);return bytes?{size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}:null;},put:async()=>{puts++;assert.fail('Data-only restore must not stage R2');},delete:async()=>{deletes++;assert.fail('Data-only restore must not delete R2');}}};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,bytes])=>[key,bytes.slice()]))});
 const counters=()=>{commits=probes=puts=deletes=0;loseAck=race=revoke=false;};
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:tables.length,httpRequests:0,accepted:[],denials:[],roles:[],lostAcks:0,casRaces:0,revocations:0,sourceManifest:{}};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  // Node models byte validation; the separate native HTTP test uses workerd's stream.
  Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/route.ts')).href),backupApi=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href);
  for(const user of accounts)sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,user.role,user.owner);
  for(const space of ['demo','live'])await store.initialize(space);
  const secret='SYNTHETIC PRIVATE HISTORY SENTINEL',customer=core.CustomerSchema.parse({id:'synthetic-outside-customer',name:'Fiktiv bevarad kund',owner:'Fiktivt ansvar'});
  sqlite.prepare('INSERT INTO crm_customers(id,space,data) VALUES(?,?,?)').run(customer.id,'demo',JSON.stringify(customer));
  for(const space of ['demo','live'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'synthetic-private-'+space,'note',customer.id,3,crypto.randomUUID(),secret,JSON.stringify({text:'  '+secret+'\n  '}),0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(account.user,'synthetic-history-ms',account.email,secret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-history-mail-'+shared,account.user,'mail',JSON.stringify({subject:secret}),customer.id,shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-history-oauth',account.user,secret,1);
  const metadata={id:'synthetic-outside-file',name:'synthetic-private.bin',kind:'document',version:'v1',size:3,at,uploadedBy:account.user};
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(metadata.id,'demo',customer.id,'synthetic-private-r2',JSON.stringify(metadata));
  const reset=()=>{
   sqlite.exec('BEGIN');for(const name of [...store.names].reverse())sqlite.prepare('DELETE FROM '+store.tables[name]+" WHERE space='live'").run();sqlite.prepare("DELETE FROM crm_mutations WHERE space='live'").run();sqlite.exec('COMMIT');
   sqlite.prepare("UPDATE crm_spaces SET version=?,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id='live'").run(version,JSON.stringify(core.emptyState().settings));
   sqlite.prepare('UPDATE crm_members SET active=1 WHERE id=?').run(account.id);counters();
  };
  const identity=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test','Content-Type':'application/json'});
  const post=async(state,{user=account,id=crypto.randomUUID(),requestedVersion=version}={})=>{requests++;return api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:identity(user),body:JSON.stringify({space:'live',type:'restore',version:requestedVersion,requestId:id,data:{format:'magnussons-crm-1',state}})}));};
  const get=async()=>{requests++;const response=await api.GET(new Request('https://crm.test/api/crm?space=live',{headers:identity(account)}));assert.equal(response.status,200);return response.json();};
  const outsidePreserved=(before,after)=>{
   for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside destination');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' raw private sentinel');assert.deepEqual(after.r2,before.r2);
  };
  const deny=async(state,label,{status=400,user=account,id,requestedVersion=version,countGuard=false}={})=>{
   const before=snapshot();counters();const response=await post(state,{user,id,requestedVersion}),body=await response.json();assert.equal(response.status,status,label+' '+body.error);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(typeof body.error==='string');assert.ok(!JSON.stringify(body).includes(secret));
   if(countGuard){assert.equal(body.error,DATA_RESTORE_HISTORY_ERROR);assert.equal(probes,0,'Count gate precedes encoding/storage preflight');}
   assert.equal(commits,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),before,label+' preserves all18 tables and R2');
   report.denials.push({label,status:response.status,error:body.error,sourceEvents:state.events.length,customers:state.customers.length,finalCount:state.events.length+state.customers.length,commits,probes,puts,deletes});
   if(evidencePath&&countGuard&&state.events.length===50000){const folder=resolve(dirname(evidencePath),'browser-input');mkdirSync(folder,{recursive:true,mode:0o700});const payload=JSON.stringify({format:'magnussons-crm-1',state})+'\n',payloadPath=resolve(folder,'rejected-history-export.json'),receiptPath=resolve(folder,'rejected-history-export-receipt.json');writeFileSync(payloadPath,payload,{mode:0o600});const receipt={...report.denials.at(-1),payloadPath,payloadBytes:Buffer.byteLength(payload),payloadSha256:digest(payload),sourceRoot};writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});report.browserRejectedFixture={payloadPath,receiptPath,payloadSha256:receipt.payloadSha256};}
  };
  const accept=async(state,label,{lost=false,roundtrip=false}={})=>{
   reset();restore.restoreState({...core.emptyState(),version},{format:'magnussons-crm-1',state});const before=snapshot(),sourceDigest=digest(JSON.stringify(state)),id=crypto.randomUUID();if(lost)loseAck=true;
   const response=await post(state,{id}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+body.error);assert.equal(commits,1);assert.equal(probes,1);assert.equal(puts,0);assert.equal(deletes,0);
   outsidePreserved(before,snapshot());const value=lost?await get():body;assert.equal(value.version,version+1);assert.equal(value.events.length,state.events.length+state.customers.length);
   const originalIds=new Set(state.events.map(row=>row.id)),byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(value.events.filter(row=>originalIds.has(row.id))),byId(state.events),'Every original event, actor and note remains unchanged');assert.equal(digest(JSON.stringify(state)),sourceDigest,'Input stays unchanged');
   const generated=value.events.filter(row=>!originalIds.has(row.id));assert.equal(generated.length,state.customers.length);assert.deepEqual(generated.map(row=>row.customerId).sort(),state.customers.map(row=>row.id).sort());assert.ok(generated.every(row=>row.kind==='restore'&&row.text==='Kundens CRM-data återställd från export'&&row.actor.id===account.user&&row.actor.name===account.name));
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id),result=JSON.parse(receipt.result_json);assert.equal(receipt.user_id,account.user);assert.equal(receipt.request_hash,await store.requestHash('restore',{format:'magnussons-crm-1',state}));
   const read=await get();assert.equal(digest(JSON.stringify(read.events)),digest(JSON.stringify(value.events)));assert.equal(read.events.length,value.events.length);
   const exportResult={};
   if(baseline){assert.throws(()=>restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:read}),error=>error.issues?.some(issue=>issue.path.join('.')==='state.events'&&issue.maximum===50000),'Existing reader rejects the actual restored 50,001-event state');exportResult.dataReaderRejected=true;
    for(const format of ['json','stream']){requests++;const exported=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(exported.status,400,format+' backup export rejects actual over-count state');exportResult[format]={status:exported.status,error:(await exported.json()).error};}
   }else if(roundtrip){
    const {viewer:_,...dataState}=read;assert.equal(restore.restoreState(core.emptyState(),JSON.parse(JSON.stringify({format:'magnussons-crm-1',state:dataState}))).events.length,50000);exportResult.dataReaderCount=50000;
    for(const format of ['json','stream']){requests++;const exported=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(exported.status,200,format+' backup export');assert.equal(exported.headers.get('cache-control'),'no-store');const text=await exported.text(),lines=format==='stream'?text.split('\n'):[];if(format==='stream'){assert.equal(lines.length,3);assert.equal(lines[2],'');const end=JSON.parse(lines[1]);assert.deepEqual(end,{type:'end',files:0,bytes:0,sha256:digest(lines[0])});assert.equal(Number(exported.headers.get('X-Magnussons-Backup-Length')),Buffer.byteLength(text));}const copy=JSON.parse(format==='stream'?lines[0]:text);assert.equal(copy.state.events.length,50000);assert.deepEqual(copy.files,[]);assert.equal(restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).events.length,50000);assert.equal(digest(JSON.stringify(copy.state.events)),digest(JSON.stringify(read.events)));exportResult[format]={status:exported.status,bytes:Buffer.byteLength(text),count:copy.state.events.length};}
   }
   const replayBefore=snapshot();counters();const replay=await post(state,{id,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,result);assert.equal(commits,0);assert.equal(probes,0);assert.deepEqual(snapshot(),replayBefore,'Exact double click/stale completed retry preserves every row and receipt');
   if(!baseline&&state.events.length<100){await deny(state,label+' changed actor',{status:409,user:other,id});const changed=structuredClone(state);changed.customers[0].name+=' ändrad avsikt';await deny(changed,label+' changed intent',{status:409,id});}
   report.accepted.push({label,sourceEvents:state.events.length,customers:state.customers.length,finalCount:read.events.length,sourceHistoryDigest:digest(JSON.stringify(state.events)),preservedSourceHistory:true,generatedAudits:generated.length,version:read.version,exactReplayNoWrites:true,lostAcknowledgement:lost,exports:exportResult});
  };
  for(const [eventCount,customerCount] of [[50000,1],[49999,2]]){const state=dataRestoreHistoryFixture(core,{eventCount,customerCount});if(baseline)await accept(state,eventCount+' + '+customerCount+' baseline');else{reset();restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state});await deny(state,eventCount+' + '+customerCount+' overflow',{countGuard:true});}}
  if(!baseline){
   for(const [eventCount,customerCount] of [[49999,1],[49998,2]])await accept(dataRestoreHistoryFixture(core,{eventCount,customerCount}),eventCount+' + '+customerCount+' exact',{roundtrip:customerCount===1});
   const small=dataRestoreHistoryFixture(core,{eventCount:2,customerCount:1});
   for(const user of accounts.filter(user=>!['admin','other'].includes(user.role))){reset();await deny(small,user.role+' forbidden',{status:403,user});report.roles.push(user.role);}
   reset();await deny(small,'stale workspace',{status:409,requestedVersion:version-1});
   reset();const before=snapshot();race=true;const raced=await post(small);assert.equal(raced.status,409);assert.equal(commits,1);before.tables.crm_spaces.find(row=>row.id==='live').version++;assert.deepEqual(snapshot(),before,'Losing CAS only contains the independently injected revision');
   reset();const roleBefore=snapshot();revoke=true;const revoked=await post(small);assert.equal(revoked.status,403);assert.equal(commits,1);roleBefore.tables.crm_members.find(row=>row.id===account.id).active=0;assert.deepEqual(snapshot(),roleBefore,'Revoked atomic actor writes no CRM entity, audit or receipt');
   await accept(small,'small lost acknowledgment',{lost:true});
   // A real stored receipt is a completed historical contract, not a fresh
   // restore. Even an old over-count input must replay before first-write gates.
   const historical=dataRestoreHistoryFixture(core),historicalId=crypto.randomUUID(),historicalResult={customerId:small.customers[0].id,eventId:small.events[0].id};
   sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) VALUES(?,?,?,?,?)').run('live',historicalId,JSON.stringify(historicalResult),account.user,await store.requestHash('restore',{format:'magnussons-crm-1',state:historical}));
   const historicalBefore=snapshot();counters();const historicalReplay=await post(historical,{id:historicalId,requestedVersion:0}),historicalBody=await historicalReplay.json();assert.equal(historicalReplay.status,200);assert.deepEqual(historicalBody.mutationResult,historicalResult);assert.equal(historicalBody.events.length,3);assert.equal(commits,0);assert.equal(probes,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),historicalBefore);
   report.historicalOversizedReplay={syntheticReceipt:true,sourceEvents:50000,customers:1,firstWriteWouldCount:50001,status:200,currentEvents:historicalBody.events.length,commits,probes,puts,deletes};
  }
  report.elapsedMs=Math.round(performance.now()-started);report.httpRequests=requests;report.lostAcks=lostAcks;report.casRaces=races;report.revocations=revocations;report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,digest(input)]));
  for(const [file,input] of sourceBytes)assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source stayed fixed: '+file);
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('PASS: '+(baseline?'baseline accepts unexportable':'candidate bounds')+' data-only restored history; '+requests+' authenticated Node calls, '+report.accepted.length+' accepts, '+report.denials.length+' unchanged-table denials, '+lostAcks+' lost ACK, '+races+' CAS race, '+revocations+' role revocation. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
