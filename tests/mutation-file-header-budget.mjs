import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
import {mutationExportFixture,mutationExportProjection,MUTATION_EXPORT_ERROR} from './mutation-export-budget.mjs';

export const MUTATION_FILE_HEADER_LIMIT=16000000;
export const MUTATION_FILE_HEADER_AT='2026-10-12T00:00:00.000Z';
export const MUTATION_FILE_HEADER_ACTOR={id:'synthetic-mutation-file-user-admin',name:'Fiktiv skribent Å😀 "citat" \\'};
const origin='https://crm.test',uuid='00000000-0000-0000-0000-000000000000';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(actual,expected,label)=>assert.equal(hash(JSON.stringify(canonical(actual))),hash(JSON.stringify(canonical(expected))),label);
// The complete wire oracle uses a separately stated format contract. It never
// calls the producer's schema, header serializer, snapshot or budget helper.
export function mutationFileHeader(state,files,{space='live',exportedAt=MUTATION_FILE_HEADER_AT}={}){
 const {viewer:_,mutationResult:__,...data}=state;
 return {type:'header',format:'magnussons-crm-backup-2',exportedAt,sourceSpace:space,state:data,files};
}
export function mutationFileHeaderProjection(core,entry,{actor=entry.actor||MUTATION_FILE_HEADER_ACTOR,timestamp=MUTATION_FILE_HEADER_AT}={}){
 const projected=mutationExportProjection(core,entry.state,{type:entry.type,data:entry.data,actor,space:entry.space,timestamp});
 const files=entry.files.map(row=>({customerId:row.customer_id,metadata:JSON.parse(row.data)}));
 const header=mutationFileHeader(projected.state,files,{space:entry.space});
 return {...projected,files,header,bytes:bytes(header)};
}
export function mutationFileHeaderFixture(core,{target=MUTATION_FILE_HEADER_LIMIT,layout='cjk',type='note',actor=MUTATION_FILE_HEADER_ACTOR,space='live',version=9}={}){
 const initial=mutationExportFixture(core,{target:10000,type,actor,space,version});
 const state=initial.state;state.events.forEach((event,i)=>{event.text=i?'':'Bevarad Å😀 "citat" \\ rad\n\t\u0000 ';});
 state.customers.push(core.CustomerSchema.parse({id:'synthetic-mutation-file-other-customer',name:'Fiktiv annan filkund',owner:state.settings.owners[0]}));
 const unit=layout==='emoji'?'😀':layout==='ascii'?'A':'界',width=bytes(unit);
 if(layout!=='metadata')while(state.events.length<Math.ceil(target/(50000*width/unit.length))+8)state.events.push({id:'synthetic-mutation-file-padding-'+String(state.events.length).padStart(5,'0'),customerId:state.customers[0].id,dealId:'',text:'',at:MUTATION_FILE_HEADER_AT,kind:'note'});
 const files=Array.from({length:layout==='metadata'?16:8},(_,i)=>{
  const id='synthetic-mutation-file-'+String(i).padStart(5,'0'),customerId=state.customers[i%2].id;
  const metadata={id,name:'fiktivt-bevarat-Å😀-"ö"-'+i+'.pdf',version:'v "ö" \\ 😀',kind:'document',size:i%4+1,at:MUTATION_FILE_HEADER_AT,uploadedBy:'Fiktiv tidigare kollega Å😀 "ö" \\ \n\t\u0000 '};
  return {id,space,customer_id:customerId,object_key:space+'/'+customerId+'/'+id,data:JSON.stringify(metadata)};
 });
 const entry={state,data:initial.data,type,expectedRecord:initial.expectedRecord,files,space,layout,actor};
 let remaining=target-mutationFileHeaderProjection(core,entry).bytes;assert.ok(remaining>=0);
 if(layout==='metadata'){
  const metadata=files.map(row=>JSON.parse(row.data));
  for(const row of metadata){const n=Math.min(499000-row.uploadedBy.length,Math.floor(remaining/width));row.uploadedBy+=unit.repeat(n);remaining-=n*width;}
  for(const row of metadata){const n=Math.min(499000-row.uploadedBy.length,remaining);row.uploadedBy+='H'.repeat(n);remaining-=n;}
  files.forEach((row,i)=>{row.data=JSON.stringify(metadata[i]);assert.ok(bytes(row.data)<1800000,'Each independent metadata row fits below 2 MB');});
 }else{
  for(const row of state.events){const n=Math.min(Math.floor((50000-row.text.length)/unit.length),Math.floor(remaining/width));row.text+=unit.repeat(n);remaining-=n*width;}
  for(const row of state.events){const n=Math.min(50000-row.text.length,remaining);row.text+='H'.repeat(n);remaining-=n;}
 }
 assert.equal(remaining,0);assert.ok(state.events.every(row=>row.text.length<=50000));
 entry.projection=mutationFileHeaderProjection(core,entry);assert.equal(entry.projection.bytes,target);
 entry.sourceHeaderBytes=bytes(mutationFileHeader(state,entry.projection.files,{space}));
 assert.ok(entry.sourceHeaderBytes<MUTATION_FILE_HEADER_LIMIT);
 assert.ok(bytes(mutationFileHeader(entry.projection.state,[],{space}))<MUTATION_FILE_HEADER_LIMIT,'Omitting actual descriptors hides this boundary');
 entry.objects=files.map((row,i)=>({key:row.object_key,bytes:new Uint8Array(i%4+1).fill(i+1)}));
 return entry;
}

export async function verifyMutationFileHeaderBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 const started=performance.now(),helperRoot=dirname(fileURLToPath(import.meta.url));mkdirSync('work',{recursive:true});
 const directory=mkdtempSync(resolve('work/mutation-file-header-')),sources=new Map(),modules=new Map(),migrations=new Map(),compiled=new Set(),helpers=new Map(['mutation-file-header-budget.mjs','mutation-export-budget.mjs'].map(file=>['tests/'+file,readFileSync(resolve(helperRoot,file))]));
 function compile(file){
  const target=resolve(directory,file.replace(/\.ts$/,'.mjs'));if(compiled.has(file))return target;compiled.add(file);
  assert.ok(file.startsWith('lib/')||['app/api/crm/route.ts','app/api/crm/backup/route.ts','app/api/crm/files/route.ts'].includes(file));
  const input=readFileSync(resolve(sourceRoot,file));sources.set(file,input);
  let output=ts.transpileModule(input.toString().replace("import { env } from 'cloudflare:workers';","const env=globalThis.__crmEnv;"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(relative(resolve('.'),resolve(dirname(file),specifier)).split(sep).join('/')+'.ts');else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);modules.set(file,Buffer.from(output));return target;
 }
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync(resolve(sourceRoot,'drizzle')).filter(name=>name.endsWith('.sql')).sort()){const input=readFileSync(resolve(sourceRoot,'drizzle',name));migrations.set('drizzle/'+name,input);sqlite.exec(input.toString());}
 const globals=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const objects=new Map([['synthetic-private-file-r2',new Uint8Array([9,8,7])],['synthetic-other-private-r2',new Uint8Array([6,5,4])]]);
 let requests=0,commits=0,gets=0,puts=0,deletes=0,snapshotReads=0,lostAcks=0,loseAck=false,beforeSnapshot,beforeCommit,uploading=false;
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-mutation-file-member-'+role,user:role==='admin'?MUTATION_FILE_HEADER_ACTOR.id:'synthetic-mutation-file-user-'+role,email:'synthetic-mutation-file-'+role+'@example.test',name:role==='admin'?MUTATION_FILE_HEADER_ACTOR.name:'Fiktiv annan skribent',role:role==='other'?'admin':role,owner:''})),actor=accounts[0];
 class Prepared{constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}async all(){return this.exec();}async run(){return this.exec();}exec(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{success:true,results:statement.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}}
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const mutation=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=')&&!uploading;
  const fileSnapshot=statements.some(row=>/^SELECT .*customer_id.*data FROM crm_files WHERE space=\? ORDER BY id$/.test(row.sql));
  if(fileSnapshot&&!uploading){snapshotReads++;if(beforeSnapshot){const hook=beforeSnapshot;beforeSnapshot=undefined;await hook();}}
  if(mutation){commits++;if(beforeCommit){const hook=beforeCommit;beforeCommit=undefined;await hook();}}
  sqlite.exec('BEGIN');let results;try{results=statements.map(row=>row.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(mutation&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic file-header mutation lost ACK after actual COMMIT');}return results;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{gets++;const body=objects.get(key);return body?{size:body.length,arrayBuffer:async()=>body.slice().buffer}:null;},put:async(key,body)=>{puts++;assert.ok(uploading,'Ordinary mutations do not stage R2');objects.set(key,new Uint8Array(await new Response(body).arrayBuffer()));},delete:async key=>{deletes++;assert.ok(uploading,'Ordinary mutations do not delete R2');objects.delete(key);}}};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:[...objects].map(([key,body])=>({key,bytes:[...body]}))});
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:tables.length,cases:[],requests:0};
 const insert=(table,row)=>{const columns=Object.keys(row);sqlite.prepare('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').run(...columns.map(column=>row[column]));};
 const reset=()=>{commits=gets=puts=deletes=snapshotReads=0;loseAck=false;beforeSnapshot=beforeCommit=undefined;};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/route.ts')).href),backup=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href),fileApi=await import(pathToFileURL(compile('app/api/crm/files/route.ts')).href);
  for(const account of accounts)insert('crm_members',{id:account.id,email:account.email,user_id:account.user,name:account.name,role:account.role,owner:account.owner,active:1});
  for(const space of ['demo','live'])await store.initialize(space);
  const secret='SYNTHETIC PRIVATE FILE HEADER SENTINEL',outside=core.emptyState();outside.settings.owners=['Fiktivt bevarat ansvar'];const owner=outside.settings.owners[0],customer=core.CustomerSchema.parse({id:'synthetic-file-outside-customer',name:'Fiktiv bevarad kund',owner});outside.customers=[customer];
  const deal=core.DealSchema.parse({id:'synthetic-file-outside-deal',customerId:customer.id,owner,title:'Fiktiv bevarad affär'});outside.deals=[deal];outside.orders=[core.OrderSchema.parse({id:'synthetic-file-outside-order',customerId:customer.id,dealId:deal.id,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat underlag'})];outside.tasks=[core.TaskSchema.parse({id:'synthetic-file-outside-task',customerId:customer.id,dealId:deal.id,owner,title:'Fiktiv bevarad uppgift',due:'2026-11-01'})];outside.meetings=[core.MeetingSchema.parse({id:'synthetic-file-outside-meeting',customerId:customer.id,owner,title:'Fiktivt bevarat möte',date:'2026-11-01',time:'10:00',duration:30})];outside.events=[{id:'synthetic-file-outside-event',customerId:customer.id,dealId:'',text:'Fiktiv bevarad historik',at:MUTATION_FILE_HEADER_AT,kind:'note'}];outside.articles=[ops.ArticleSchema.parse({id:'synthetic-file-outside-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];outside.notices=[ops.NoticeSchema.parse({id:'synthetic-file-outside-notice',title:'Fiktiv notis',audience:'team',at:MUTATION_FILE_HEADER_AT})];outside.leads=[ops.LeadSchema.parse({id:'synthetic-file-outside-lead',name:'Fiktivt prospekt',source:'synthetic'})];outside.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-file-outside-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const name of store.names)for(const item of outside[name]){const row=store.crmEntityStorageRow('demo',name,item);insert(row.table,Object.fromEntries(row.columns.map((key,i)=>[key,row.values[i]])));}
  insert('crm_mutations',{space:'demo',id:randomUUID(),result_json:'{}',user_id:actor.user,request_hash:'synthetic-outside-hash'});
  for(const space of ['demo','live'])insert('crm_drafts',{space,user_id:actor.user,id:'synthetic-private-'+space,kind:'note',context:customer.id,revision:3,request_id:randomUUID(),title:secret,data:JSON.stringify({text:'  '+secret+'\n  '}),archived:0,updated_at:MUTATION_FILE_HEADER_AT});
  insert('outlook_connections',{user_id:actor.user,microsoft_id:'synthetic-file-ms',email:actor.email,tokens:secret,last_sync:MUTATION_FILE_HEADER_AT});
  for(const shared of [0,1])insert('outlook_items',{id:'synthetic-file-mail-'+shared,user_id:actor.user,kind:'mail',data:JSON.stringify({subject:secret}),customer_id:customer.id,shared,happened_at:MUTATION_FILE_HEADER_AT,seen_at:MUTATION_FILE_HEADER_AT});
  insert('outlook_oauth_states',{hash:'synthetic-file-oauth',user_id:actor.user,verifier:secret,expires:1});
  insert('crm_files',{id:'synthetic-private-file',space:'demo',customer_id:customer.id,object_key:'synthetic-private-file-r2',data:JSON.stringify({id:'synthetic-private-file',name:'fiktiv-privat.pdf',kind:'document',version:'v1',size:3,at:MUTATION_FILE_HEADER_AT,uploadedBy:actor.name})});
  assert.ok(tables.every(table=>snapshot().tables[table].length>0));report.all18Positive=true;
  const seed=entry=>{
   sqlite.exec('BEGIN');sqlite.prepare("DELETE FROM crm_files WHERE space='live'").run();
   for(const name of [...store.names].reverse())sqlite.prepare('DELETE FROM '+store.tables[name]+" WHERE space='live'").run();
   sqlite.prepare("DELETE FROM crm_mutations WHERE space='live'").run();sqlite.prepare("DELETE FROM crm_drafts WHERE space='live' AND id='synthetic-file-publication'").run();
   for(const name of store.names)for(const item of entry.state[name]){const row=store.crmEntityStorageRow('live',name,item);insert(row.table,Object.fromEntries(row.columns.map((key,i)=>[key,row.values[i]])));}
   for(const row of entry.files)insert('crm_files',row);
   sqlite.prepare("UPDATE crm_spaces SET version=?,settings=?,write_token='SYNTHETIC UNTOUCHED' WHERE id='live'").run(entry.state.version,JSON.stringify(entry.state.settings));sqlite.prepare('UPDATE crm_members SET active=1 WHERE id=?').run(actor.id);sqlite.exec('COMMIT');
   for(const key of objects.keys())if(key.startsWith('live/'))objects.delete(key);for(const object of entry.objects)objects.set(object.key,object.bytes.slice());reset();
  };
  const identity=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:origin});
  const post=async(entry,{user=actor,id=randomUUID(),version=entry.state.version}={})=>{requests++;return api.POST(new Request(origin+'/api/crm',{method:'POST',headers:{...identity(user),'Content-Type':'application/json'},body:JSON.stringify({space:entry.space,type:entry.type,data:entry.data,version,requestId:id,...(entry.expectedRecord?{expectedRecord:entry.expectedRecord}:{})})}));};
  const get=async()=>{requests++;const response=await api.GET(new Request(origin+'/api/crm?space=live',{headers:identity(actor)}));assert.equal(response.status,200);return response.json();};
  const fixture=options=>mutationFileHeaderFixture(core,options);
  const publication=entry=>{insert('crm_drafts',{space:'live',user_id:actor.user,id:'synthetic-file-publication',kind:entry.type==='follow_up'?'followup':'note',context:entry.type==='follow_up'?entry.data.taskId:entry.data.customerId,revision:3,request_id:randomUUID(),title:secret,data:JSON.stringify({text:'  '+secret+'\n  ',values:entry.data}),archived:0,updated_at:MUTATION_FILE_HEADER_AT});entry.data={...entry.data,draft:{id:'synthetic-file-publication',revision:3}};};
  const protectedRows=(before,after,{draft=false}={})=>{
   for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');same(outside(after.tables[table]),outside(before.tables[table]),table+' outside live');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states']){const rows=value=>draft&&table==='crm_drafts'?value.filter(row=>row.id!=='synthetic-file-publication'):value;same(rows(after.tables[table]),rows(before.tables[table]),table+' private/raw preservation');}same(after.r2,before.r2,'All R2 bytes unchanged');
  };
  const exportWire=async(entry,{expect=200}={})=>{
   const before=snapshot();gets=0;requests++;const response=await backup.GET(new Request(origin+'/api/crm/backup?space=live&format=stream',{headers:identity(actor)}));assert.equal(response.status,expect);
   if(expect!==200){assert.equal(gets,0);same(snapshot(),before,'Denied export read-only');return {status:expect,error:(await response.json()).error};}
   const wire=await response.text(),lines=wire.split('\n'),header=JSON.parse(lines[0]),state=await get();
   const expected=mutationFileHeader(state,entry.files.map(row=>({customerId:row.customer_id,metadata:JSON.parse(row.data)})),{exportedAt:header.exportedAt});
   assert.deepEqual(header,expected,'Real header equals independent full wire contract');assert.equal(bytes(lines[0]),entry.projection.bytes);assert.equal(Number(response.headers.get('X-Magnussons-Backup-Length')),bytes(wire));assert.equal(lines.length,entry.files.length+3);
   let digest=hash(lines[0]);for(let i=0;i<entry.files.length;i++){const file=JSON.parse(lines[i+1]),object=entry.objects[i];assert.deepEqual(file,{type:'file',id:entry.files[i].id,content:Buffer.from(object.bytes).toString('base64'),sha256:hash(object.bytes)});digest=hash(digest+':'+hash(lines[i+1]));}
   assert.deepEqual(JSON.parse(lines.at(-2)),{type:'end',files:entry.files.length,bytes:entry.objects.reduce((sum,row)=>sum+row.bytes.length,0),sha256:digest});assert.equal(lines.at(-1),'');assert.ok(!wire.includes(secret));same(snapshot(),before,'Actual export changes no raw data/R2');return {status:200,headerBytes:bytes(lines[0]),wireBytes:bytes(wire),actualR2Gets:gets};
  };
  const deny=async(entry,label,{status=400,user=actor,id,version,error=MUTATION_EXPORT_ERROR}={})=>{
   const before=snapshot();reset();const response=await post(entry,{user,id,version}),body=await response.json();assert.equal(response.status,status,label+' '+body.error);if(error!==null)assert.equal(body.error,error);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!JSON.stringify(body).includes(secret));assert.equal(commits,0);assert.equal(gets,0);assert.equal(puts,0);assert.equal(deletes,0);same(snapshot(),before,label+' preserves all18 raw snapshots/R2');report.cases.push({label,status,commits,snapshotReads,noR2Reads:true});
  };
  const accept=async(entry,label,{lost=false,draft=false,wire=true,user=actor}={})=>{
   seed(entry);if(draft)publication(entry);const before=snapshot(),id=randomUUID();loseAck=lost;
   const response=await post(entry,{id,user}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+body.error);assert.equal(commits,1);assert.equal(gets,0);assert.equal(puts,0);assert.equal(deletes,0);protectedRows(before,snapshot(),{draft});
   const current=await get();assert.equal(current.version,entry.state.version+1);const previous=new Set(entry.state.events.map(row=>row.id));same(current.events.filter(row=>previous.has(row.id)).sort((a,b)=>a.id.localeCompare(b.id)),entry.state.events.slice().sort((a,b)=>a.id.localeCompare(b.id)),'Full original Unicode/escaped history retained');
   const generated=rows=>rows.filter(row=>!previous.has(row.id)).map(row=>({...row,id:uuid,at:MUTATION_FILE_HEADER_AT})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));same(generated(current.events),generated(entry.projection.state.events),'Actual generated audit complete independent projection');
   assert.equal(bytes(mutationFileHeader(current,entry.projection.files)),entry.projection.bytes);
   if(entry.type==='follow_up'){const task=current.tasks.find(row=>row.id===entry.state.tasks[0].id);assert.equal(task.done,true);const next=current.tasks.find(row=>row.id!==task.id);assert.equal(next.title,entry.data.nextAction);assert.equal(next.due,entry.data.nextDate);}
   if(draft){const row=sqlite.prepare("SELECT revision,archived FROM crm_drafts WHERE id='synthetic-file-publication'").get();assert.deepEqual({...row},{revision:4,archived:1});}
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id);assert.equal(receipt.user_id,user.user);assert.equal(receipt.request_hash,await store.requestHash(entry.type,entry.data));
   const exported=wire?await exportWire(entry,{expect:baseline?400:200}):undefined;
   const beforeReplay=snapshot();reset();const replay=await post(entry,{id,user,version:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,JSON.parse(receipt.result_json));assert.equal(commits,0);assert.equal(snapshotReads,0);assert.equal(gets,0);same(snapshot(),beforeReplay,'Exact completed stale retry bypasses first-write gate');
   report.cases.push({label,status:response.status,sourceHeaderBytes:entry.sourceHeaderBytes,actualFutureHeaderBytes:entry.projection.bytes,files:entry.files.length,exported,lostACK:lost,draftConsumed:draft,exactReplay:true});return {entry,id,result:JSON.parse(receipt.result_json)};
  };
  if(baseline){for(const type of ['note','follow_up'])await accept(fixture({type,target:MUTATION_FILE_HEADER_LIMIT+1,layout:'metadata'}),type+' old POST commits header unexportable solely due to file metadata');}
  else{
   for(const layout of ['cjk','emoji','metadata'])for(const target of [MUTATION_FILE_HEADER_LIMIT,MUTATION_FILE_HEADER_LIMIT+1]){const entry=fixture({layout,target});if(target===MUTATION_FILE_HEADER_LIMIT)await accept(entry,layout+' actual full header exactly16M');else{seed(entry);await deny(entry,layout+' metadata pushes full header16M+1');}}
   for(const type of ['follow_up','customer_note'])for(const target of [MUTATION_FILE_HEADER_LIMIT,MUTATION_FILE_HEADER_LIMIT+1]){const entry=fixture({type,target,layout:'metadata'});if(target===MUTATION_FILE_HEADER_LIMIT)await accept(entry,type+' exact full header consumes own draft',{draft:true});else{seed(entry);publication(entry);await deny(entry,type+' full header16M+1 keeps private draft');}}
   const omissions=fixture({target:MUTATION_FILE_HEADER_LIMIT+1});assert.equal(bytes(mutationFileHeader({...omissions.projection.state,version:9},omissions.projection.files)),MUTATION_FILE_HEADER_LIMIT);assert.ok(bytes(mutationFileHeader(omissions.projection.state,omissions.projection.files.filter(row=>row.customerId===omissions.state.customers[0].id)))<MUTATION_FILE_HEADER_LIMIT);report.independentOmissionOracles={nextRevisionRequired:true,everyCustomerDescriptorRequired:true,filesEmptyWouldFit:true};
   const tiny=fixture({layout:'ascii',target:30000});for(const user of accounts.filter(row=>['reader','production','print','warehouse'].includes(row.role))){seed(tiny);await deny(tiny,user.role+' retains server denial',{status:403,user,error:null});}
   await accept(fixture({target:30000,layout:'ascii',actor:{id:accounts[2].user,name:accounts[2].name}}),'seller keeps legitimate ordinary mutation',{user:accounts[2]});
   for(const [label,data] of [['malformed stored metadata JSON','{'],['invalid stored descriptor schema',JSON.stringify({...JSON.parse(tiny.files[0].data),size:0})]]){seed(tiny);sqlite.prepare('UPDATE crm_files SET data=? WHERE id=?').run(data,tiny.files[0].id);await deny(tiny,label,{error:'CRM-kopians underlag kunde inte verifieras. Inga uppgifter från ändringen har sparats. Bevara ditt underlag och kontakta administratören.'});}
   const winner=async entry=>{uploading=true;try{requests++;const form=new FormData();form.set('space','live');form.set('customerId',entry.state.customers[0].id);form.set('version','v1');form.set('kind','document');form.set('file',new File([new Uint8Array([37,80,68,70,45])],'fiktiv-oberoende-vinnare.pdf'));const response=await fileApi.POST(new Request(origin+'/api/crm/files',{method:'POST',headers:identity(actor),body:form}));assert.equal(response.status,200,'Real second upload handler commits');return await response.json();}finally{uploading=false;}};
   for(const type of ['note','customer_note']){const entry=fixture({type,target:30000,layout:'ascii'});seed(entry);let won;beforeSnapshot=async()=>{await winner(entry);won=snapshot();};const response=await post(entry);assert.equal(response.status,type==='note'?409:200);assert.ok(won);if(type==='note'){assert.equal(commits,0);same(snapshot(),won,'Unsafe snapshot mismatch preserves only real upload winner');}else{assert.equal(commits,1);assert.equal(snapshotReads,2);assert.equal(sqlite.prepare("SELECT version FROM crm_spaces WHERE id='live'").get().version,11);}report.cases.push({label:type+' snapshot mismatch after real upload',status:response.status,actualSecondHandler:true,safeRetry:type==='customer_note',snapshotReads,commits});}
   const exact=fixture({type:'follow_up',layout:'metadata',target:MUTATION_FILE_HEADER_LIMIT});seed(exact);let grown;beforeSnapshot=async()=>{await winner(exact);grown=snapshot();};const growthResponse=await post(exact);assert.equal(growthResponse.status,400);assert.equal((await growthResponse.json()).error,MUTATION_EXPORT_ERROR);assert.equal(commits,0);assert.equal(snapshotReads,2);same(snapshot(),grown,'Safe mismatch retry remeasures actual winning file metadata before commit');report.cases.push({label:'safe retry full header growth from real second upload',status:400,actualSecondHandler:true,snapshotReads,commits});
   seed(tiny);const roleBefore=snapshot();beforeCommit=async()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(actor.id);const revoked=await post(tiny);assert.equal(revoked.status,403);roleBefore.tables.crm_members.find(row=>row.id===actor.id).active=0;same(snapshot(),roleBefore,'Role change only, no losing audit or receipt');report.cases.push({label:'role revoked at unchanged write CAS',status:403,commits});
   const lost=await accept(fixture({type:'customer_note',target:30000,layout:'metadata'}),'lost ACK private publication exact receipt',{lost:true,draft:true});
   await deny(lost.entry,'completed receipt rejects changed identity',{status:409,user:accounts[1],id:lost.id,error:'Begäran har redan använts för en annan ändring.'});await deny({...lost.entry,data:{...lost.entry.data,text:lost.entry.data.text+'changed'}},'completed receipt rejects changed intent',{status:409,id:lost.id,error:'Begäran har redan använts för en annan ändring.'});
   for(const row of sqlite.prepare("SELECT * FROM crm_files WHERE space='live' ORDER BY id").all()){const metadata=JSON.parse(row.data);metadata.uploadedBy+='界'.repeat(360000);assert.ok(bytes(metadata)<1800000);sqlite.prepare('UPDATE crm_files SET data=? WHERE id=?').run(JSON.stringify(metadata),row.id);}const legacyBefore=snapshot();reset();const replay=await post(lost.entry,{id:lost.id,version:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,lost.result);assert.equal(commits,0);assert.equal(snapshotReads,0);same(snapshot(),legacyBefore,'Completed receipt replays despite synthetic legacy oversized metadata');report.cases.push({label:'completed receipt bypasses oversized legacy metadata',status:200,syntheticLegacyRows:true,snapshotReads:0,commits:0});
  }
  for(const [file,input] of [...sources,...migrations])assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Actual source/migration unchanged '+file);
  for(const [file,input] of modules)assert.deepEqual(readFileSync(resolve(directory,file.replace(/\.ts$/,'.mjs'))),input,'Actual compiled module unchanged '+file);
  report.requests=requests;report.lostAcks=lostAcks;report.elapsedMs=Math.round(performance.now()-started);report.sourceManifest=Object.fromEntries([...sources].map(([file,input])=>[file,hash(input)]));report.moduleManifest=Object.fromEntries([...modules].map(([file,input])=>[file.replace(/\.ts$/,'.mjs'),hash(input)]));report.migrationManifest=Object.fromEntries([...migrations].map(([file,input])=>[file,hash(input)]));for(const [file,input] of helpers)assert.deepEqual(readFileSync(resolve(helperRoot,file.slice(6))),input,'Actual test helper unchanged '+file);report.helperManifest=Object.fromEntries([...helpers].map(([file,input])=>[file,hash(input)]));
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('PASS: '+(baseline?'old ordinary POST loses full file-metadata exportability':'ordinary mutations include complete file metadata with revision-safe retries')+'; '+report.cases.length+' cases, '+requests+' actual handler calls, '+lostAcks+' lost ACK. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();for(const[key,descriptor]of Object.entries(globals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
