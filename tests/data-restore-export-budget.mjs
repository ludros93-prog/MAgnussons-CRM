import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

export const DATA_RESTORE_EXPORT_LIMIT=16000000;
export const DATA_RESTORE_EXPORT_ERROR='CRM-kopian lämnar inte plats för återställningens data och historik inom 16 MB. Inga uppgifter återställs och befintlig historik tas inte bort.';
const at='2026-10-11T20:00:00.000Z',version=9;
const digest=value=>createHash('sha256').update(value).digest('hex');
const utf8=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
// Independent wire oracle: do not call the producer's header/budget helper.
export function dataRestoreExportHeader(state,{space='live',exportedAt=at}={}){
 const {viewer:_,...data}=state;
 return {type:'header',format:'magnussons-crm-backup-2',exportedAt,sourceSpace:space,state:data,files:[]};
}
export function dataRestoreExportProjection(state,{space='live',version=9,actor={id:'synthetic-export-user-admin',name:'Fiktiv återställare Å😀 "citat" \\'}}={}){
 const next=structuredClone(state);next.version=version+1;
 next.settings.sellerProfiles=next.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
 for(const customer of next.customers)next.events.push({id:'0'.repeat(36),customerId:customer.id,dealId:'',text:'Kundens CRM-data återställd från export',kind:'restore',at,actor:{id:actor.id,name:actor.name}});
 return {state:next,header:dataRestoreExportHeader(next,{space}),bytes:utf8(dataRestoreExportHeader(next,{space}))};
}
export function dataRestoreExportFixture(core,{target=DATA_RESTORE_EXPORT_LIMIT,layout='cjk',baseline=false,space='live',version=9,actor,baseState}={}){
 const state=baseState?structuredClone(baseState):core.emptyState();
 if(!baseState){state.settings.owners=['Fiktivt exportansvar'];state.customers=[core.CustomerSchema.parse({id:'synthetic-export-customer',name:'Fiktiv exportkund',owner:state.settings.owners[0]})];}
 assert.ok(state.customers.length);state.version=version;
 const unit=layout==='emoji'?'😀':layout==='ascii'?'A':'界',width=utf8(unit),count=baseline?160:Math.max(2,Math.ceil(target/(50000*width/unit.length))+2);
 state.events=Array.from({length:count},(_,i)=>({id:'synthetic-export-event-'+String(i).padStart(4,'0'),customerId:state.customers[i%state.customers.length].id,dealId:'',text:baseline?unit.repeat(49500):'',at,kind:'note'}));
 state.events[0].actor={id:'synthetic-original-actor',name:'Fiktiv ursprunglig kollega Å😀'};
 state.events[0].note={title:'Fiktiv bevarad notering "ö" \\ 😀',meetingDate:'',sourceFiles:['syntetiskt-underlag.txt']};
 if(!baseline)state.events[0].text='Ä😀 "citat" \\ rad\nbevarad\t\u0000 '+layout+' ';
 core.normalizeState(state);
 const options={space,version,...(actor?{actor}:{})};
 if(!baseline){
  let remaining=target-dataRestoreExportProjection(state,options).bytes;assert.ok(remaining>=0,'Fixture target fits metadata');
  for(const event of state.events){const n=Math.min(Math.floor((50000-event.text.length)/unit.length),Math.floor(remaining/width));event.text+=unit.repeat(n);remaining-=n*width;}
  for(const event of state.events){const n=Math.min(50000-event.text.length,remaining);event.text+='H'.repeat(n);remaining-=n;}
  assert.equal(remaining,0);assert.equal(dataRestoreExportProjection(state,options).bytes,target);
 }
 assert.ok(state.events.every(event=>event.text.length<=50000));return state;
}

export async function verifyDataRestoreExportBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 const started=performance.now();mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/data-restore-export-')),compiled=new Set(),sourceBytes=new Map();
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
 const objects=new Map([['synthetic-private-r2',new Uint8Array([9,8,7])],['synthetic-private-r2-other',new Uint8Array([6,5,4])]]);
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe'){probes++;assert.deepEqual(this.values,['A😀']);}return sqlite.prepare(this.sql).get(...this.values)||null;}
  async all(){return this.exec();}async run(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{success:true,results:statement.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-export-member-'+role,user:'synthetic-export-user-'+role,email:'synthetic-export-'+role+'@example.test',name:role==='admin'?'Fiktiv återställare Å😀 "citat" \\':'Annan fiktiv återställare',role:role==='other'?'admin':role,owner:''})),account=accounts[0],other=accounts[1];
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(restoring){commits++;if(race){race=false;races++;sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='live'").run();}if(revoke){revoke=false;revocations++;sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id);}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(restoring&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic export-budget lost ACK after actual COMMIT');}return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{const bytes=objects.get(key);return bytes?{size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}:null;},put:async()=>{puts++;assert.fail('Data-only restore must not stage R2');},delete:async()=>{deletes++;assert.fail('Data-only restore must not delete R2');}}};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,bytes])=>[key,bytes.slice()]))});
 const counters=()=>{commits=probes=puts=deletes=0;loseAck=race=revoke=false;};
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:tables.length,httpRequests:0,accepted:[],denials:[],roles:[],lostAcks:0,casRaces:0,revocations:0,sourceManifest:{}};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  // Node proves bytes; the separate native HTTP test uses workerd's stream.
  Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),budget=await import(pathToFileURL(compile('lib/crm-storage-budget.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/route.ts')).href),backupApi=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href);
  for(const user of accounts)sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,user.role,user.owner);
  for(const space of ['demo','live'])await store.initialize(space);
  const secret='SYNTHETIC PRIVATE EXPORT SENTINEL',outside=core.emptyState(),owner=outside.settings.owners[0],customer=core.CustomerSchema.parse({id:'synthetic-outside-customer',name:'Fiktiv bevarad kund',owner});outside.customers=[customer];
  const deal=core.DealSchema.parse({id:'synthetic-outside-deal',customerId:customer.id,owner,title:'Fiktiv bevarad affär'});outside.deals=[deal];
  outside.orders=[core.OrderSchema.parse({id:'synthetic-outside-order',customerId:customer.id,dealId:deal.id,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat underlag'})];outside.tasks=[core.TaskSchema.parse({id:'synthetic-outside-task',customerId:customer.id,dealId:deal.id,owner,title:'Fiktiv bevarad uppgift',due:'2026-11-01'})];outside.meetings=[core.MeetingSchema.parse({id:'synthetic-outside-meeting',customerId:customer.id,owner,title:'Fiktivt bevarat möte',date:'2026-11-01',time:'10:00',duration:30})];
  outside.events=[{id:'synthetic-outside-event',customerId:customer.id,dealId:'',text:'Fiktiv bevarad historik',at,kind:'note'}];outside.articles=[ops.ArticleSchema.parse({id:'synthetic-outside-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];outside.notices=[ops.NoticeSchema.parse({id:'synthetic-outside-notice',title:'Fiktiv notis',audience:'team',at})];outside.leads=[ops.LeadSchema.parse({id:'synthetic-outside-lead',name:'Fiktivt prospekt',source:'synthetic'})];outside.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-outside-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const name of store.names)for(const item of outside[name]){const row=store.crmEntityStorageRow('demo',name,item);sqlite.prepare('INSERT INTO '+row.table+'('+row.columns.join(',')+') VALUES('+row.columns.map(()=>'?').join(',')+')').run(...row.values);}
  sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) VALUES(?,?,?,?,?)').run('demo',crypto.randomUUID(),'{}',account.user,'synthetic-outside-hash');
  for(const space of ['demo','live'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'synthetic-private-'+space,'note',customer.id,3,crypto.randomUUID(),secret,JSON.stringify({text:'  '+secret+'\n  '}),0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(account.user,'synthetic-export-ms',account.email,secret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-export-mail-'+shared,account.user,'mail',JSON.stringify({subject:secret}),customer.id,shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-export-oauth',account.user,secret,1);
  const metadata={id:'synthetic-outside-file',name:'synthetic-private.bin',kind:'document',version:'v1',size:3,at,uploadedBy:account.user};
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(metadata.id,'demo',customer.id,'synthetic-private-r2',JSON.stringify(metadata));
  assert.ok(tables.every(table=>snapshot().tables[table].length>0),'All18 tables contain positive sentinels');report.allTablesPositive=true;report.r2Sentinels=objects.size;
  const reset=()=>{
   sqlite.exec('BEGIN');for(const name of [...store.names].reverse())sqlite.prepare('DELETE FROM '+store.tables[name]+" WHERE space='live'").run();sqlite.prepare("DELETE FROM crm_mutations WHERE space='live'").run();sqlite.exec('COMMIT');
   sqlite.prepare("UPDATE crm_spaces SET version=?,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id='live'").run(version,JSON.stringify(core.emptyState().settings));sqlite.prepare('UPDATE crm_members SET active=1 WHERE id=?').run(account.id);counters();
  };
  const identity=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test','Content-Type':'application/json'});
  const payload=(state,{id='00000000-0000-0000-0000-000000000000',requestedVersion=version}={})=>JSON.stringify({space:'live',type:'restore',version:requestedVersion,requestId:id,data:{format:'magnussons-crm-1',state}});
  const post=async(state,{user=account,id=crypto.randomUUID(),requestedVersion=version}={})=>{requests++;return api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:identity(user),body:payload(state,{id,requestedVersion})}));};
  const get=async()=>{requests++;const response=await api.GET(new Request('https://crm.test/api/crm?space=live',{headers:identity(account)}));assert.equal(response.status,200);return response.json();};
  const projection=state=>dataRestoreExportProjection(state,{version,actor:{id:account.user,name:account.name}});
  const fixture=options=>dataRestoreExportFixture(core,{version,actor:{id:account.user,name:account.name},...options});
  const stats=state=>({inputStateVersion:state.version,inputUtf16:payload(state).length,inputUtf8:utf8(payload(state)),sourceHeaderBytes:utf8(dataRestoreExportHeader(state)),futureHeaderBytes:projection(state).bytes,sourceEvents:state.events.length,customers:state.customers.length,largestEventRowBytes:Math.max(...projection(state).state.events.map(event=>budget.sqliteRecordBytes(store.crmEntityStorageRow('live','events',event).values)))});
  const outsidePreserved=(before,after)=>{
   for(const table of tables){const outsideRows=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');assert.deepEqual(outsideRows(after.tables[table]),outsideRows(before.tables[table]),table+' outside destination');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' raw private sentinel');assert.deepEqual(after.r2,before.r2);
  };
  const deny=async(state,label,{status=400,user=account,id,requestedVersion=version,exportGuard=false}={})=>{
   const before=snapshot();counters();const response=await post(state,{user,id,requestedVersion}),body=await response.json();assert.equal(response.status,status,label+' '+body.error);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(typeof body.error==='string');assert.ok(!JSON.stringify(body).includes(secret));
   if(exportGuard){assert.equal(body.error,DATA_RESTORE_EXPORT_ERROR);assert.equal(probes,0,'Header gate precedes encoding/storage preflight');}
   assert.equal(commits,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),before,label+' preserves all18 positive tables and both R2 objects');
   report.denials.push({label,status:response.status,error:body.error,...stats(state),commits,probes,puts,deletes});
   if(evidencePath&&label==='cjk final header 16M+1'){
    const folder=resolve(dirname(evidencePath),'browser-input');mkdirSync(folder,{recursive:true,mode:0o700});const text=JSON.stringify({format:'magnussons-crm-1',state})+'\n',payloadPath=resolve(folder,'rejected-export-budget.json'),receiptPath=resolve(folder,'rejected-export-budget-receipt.json');writeFileSync(payloadPath,text,{mode:0o600});const receipt={...report.denials.at(-1),payloadPath,payloadBytes:utf8(text),payloadSha256:digest(text),sourceRoot};writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});report.browserRejectedFixture={payloadPath,receiptPath,payloadSha256:receipt.payloadSha256};
   }
  };
  const accept=async(state,label,{lost=false,roundtrip=false}={})=>{
   reset();restore.restoreState({...core.emptyState(),version},{format:'magnussons-crm-1',state});const before=snapshot(),sourceDigest=digest(JSON.stringify(state)),id=crypto.randomUUID(),measured=stats(state);assert.ok(measured.inputUtf16<10000000);assert.ok(measured.largestEventRowBytes<2000000);if(lost)loseAck=true;
   const response=await post(state,{id}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+body.error);assert.equal(commits,1);assert.equal(probes,1);assert.equal(puts,0);assert.equal(deletes,0);outsidePreserved(before,snapshot());const value=lost?await get():body;assert.equal(value.version,version+1);
   const originalIds=new Set(state.events.map(row=>row.id)),byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(value.events.filter(row=>originalIds.has(row.id))),byId(state.events),'Full Unicode/escapes, actor and note survive without truncation');assert.equal(digest(JSON.stringify(state)),sourceDigest);
   const generated=value.events.filter(row=>!originalIds.has(row.id));assert.equal(generated.length,state.customers.length);assert.ok(generated.every(row=>row.kind==='restore'&&row.text==='Kundens CRM-data återställd från export'&&row.actor.id===account.user&&row.actor.name===account.name));
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id),result=JSON.parse(receipt.result_json);assert.equal(receipt.user_id,account.user);assert.equal(receipt.request_hash,await store.requestHash('restore',{format:'magnussons-crm-1',state}));
   const read=await get(),actualHeaderBytes=utf8(dataRestoreExportHeader(read));assert.equal(actualHeaderBytes,measured.futureHeaderBytes,'Oracle includes actual normalized state, final version and generated audit');assert.deepEqual(byId(read.events),byId(value.events));
   const exportResult={dataReaderCount:restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:read}).events.length};
   if(baseline||roundtrip)for(const format of ['json','stream']){
    requests++;const exported=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(exported.status,baseline?400:200,format+' backup export');assert.equal(exported.headers.get('cache-control'),'no-store');
    if(baseline){exportResult[format]={status:exported.status,error:(await exported.json()).error};continue;}
    const text=await exported.text(),lines=format==='stream'?text.split('\n'):[],copy=JSON.parse(format==='stream'?lines[0]:text);assert.ok(!text.includes(secret));assert.deepEqual(byId(copy.state.events),byId(read.events));assert.equal(restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).events.length,read.events.length);assert.deepEqual(copy.files,[]);
    if(format==='stream'){assert.equal(lines.length,3);assert.equal(lines[2],'');assert.equal(utf8(lines[0]),actualHeaderBytes);assert.deepEqual(JSON.parse(lines[1]),{type:'end',files:0,bytes:0,sha256:digest(lines[0])});assert.equal(Number(exported.headers.get('X-Magnussons-Backup-Length')),utf8(text));}
    exportResult[format]={status:exported.status,bytes:utf8(text),headerBytes:format==='stream'?utf8(lines[0]):undefined,count:copy.state.events.length};
   }
   const replayBefore=snapshot();counters();const replay=await post(state,{id,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,result);assert.equal(commits,0);assert.equal(probes,0);assert.deepEqual(snapshot(),replayBefore,'Exact double click/stale completed retry preserves every row and receipt');
   if(!baseline&&measured.futureHeaderBytes<10000){await deny(state,label+' changed actor',{status:409,user:other,id});const changed=structuredClone(state);changed.customers[0].name+=' ändrad avsikt';await deny(changed,label+' changed intent',{status:409,id});}
   report.accepted.push({label,...measured,actualHeaderBytes,preservedSourceHistory:true,generatedAudits:generated.length,version:read.version,exactReplayNoWrites:true,lostAcknowledgement:lost,exports:exportResult});
  };
  const large=fixture({baseline:true});assert.ok(stats(large).futureHeaderBytes>DATA_RESTORE_EXPORT_LIMIT);assert.ok(payload(large).length<10000000);restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:large});
  if(baseline)await accept(large,'160 × 49,500 CJK baseline',{roundtrip:true});
  else{
   reset();await deny(large,'baseline oversized CJK',{exportGuard:true});
   for(const layout of ['cjk','emoji'])for(const target of [DATA_RESTORE_EXPORT_LIMIT,DATA_RESTORE_EXPORT_LIMIT+1]){
    const state=fixture({layout,target});if(layout==='cjk'&&target===DATA_RESTORE_EXPORT_LIMIT)state.version=123456789;
    const measured=stats(state);restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state});assert.equal(measured.futureHeaderBytes,target);assert.ok(measured.sourceHeaderBytes<DATA_RESTORE_EXPORT_LIMIT,'Input header fits but final audit/version growth crosses the boundary');assert.ok(measured.inputUtf16<10000000);
    if(target===DATA_RESTORE_EXPORT_LIMIT)await accept(state,layout+' final header exactly 16M',{roundtrip:true});else{reset();await deny(state,layout+' final header 16M+1',{exportGuard:true});}
   }
   await accept(fixture({layout:'ascii',target:1000000}),'ASCII and escaped controls',{roundtrip:true});
   const small=fixture({layout:'ascii',target:5000});
   for(const user of accounts.filter(user=>!['admin','other'].includes(user.role))){reset();await deny(small,user.role+' forbidden',{status:403,user});report.roles.push(user.role);}
   reset();await deny(small,'stale workspace',{status:409,requestedVersion:version-1});
   reset();const before=snapshot();race=true;const raced=await post(small);assert.equal(raced.status,409);assert.equal(commits,1);before.tables.crm_spaces.find(row=>row.id==='live').version++;assert.deepEqual(snapshot(),before,'Losing CAS only contains the independently injected revision');
   reset();const roleBefore=snapshot();revoke=true;const revoked=await post(small);assert.equal(revoked.status,403);assert.equal(commits,1);roleBefore.tables.crm_members.find(row=>row.id===account.id).active=0;assert.deepEqual(snapshot(),roleBefore,'Revoked atomic actor writes no CRM entity, audit or receipt');
   await accept(small,'small lost acknowledgment',{lost:true});
   // An explicit synthetic completed historical receipt is not a new restore.
   const historicalId=crypto.randomUUID(),historicalResult={customerId:small.customers[0].id,eventId:small.events[0].id};
   sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) VALUES(?,?,?,?,?)').run('live',historicalId,JSON.stringify(historicalResult),account.user,await store.requestHash('restore',{format:'magnussons-crm-1',state:large}));
   const historicalBefore=snapshot();counters();const replay=await post(large,{id:historicalId,requestedVersion:0}),replayed=await replay.json();assert.equal(replay.status,200);assert.deepEqual(replayed.mutationResult,historicalResult);assert.equal(replayed.events.length,small.events.length+1);assert.equal(commits,0);assert.equal(probes,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),historicalBefore);
   report.historicalOversizedReplay={syntheticReceipt:true,firstWriteHeaderBytes:stats(large).futureHeaderBytes,status:200,currentEvents:replayed.events.length,commits,probes,puts,deletes};
   await deny(large,'historical oversized changed actor',{status:409,user:other,id:historicalId});const changed=structuredClone(large);changed.customers[0].name+=' ändrad';await deny(changed,'historical oversized changed intent',{status:409,id:historicalId});
  }
  report.elapsedMs=Math.round(performance.now()-started);report.httpRequests=requests;report.lostAcks=lostAcks;report.casRaces=races;report.revocations=revocations;report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,digest(input)]));
  for(const [file,input] of sourceBytes)assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source stayed fixed: '+file);
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('PASS: '+(baseline?'baseline accepts unexportable':'candidate bounds')+' data-only future UTF-8 header; '+requests+' authenticated Node calls, '+report.accepted.length+' accepts, '+report.denials.length+' unchanged-table denials, '+lostAcks+' lost ACK, '+races+' CAS race, '+revocations+' role revocation. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
