import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {mutationExportAction,mutationExportProjection,mutationExportHeader,mutationExportJsonCopy} from './mutation-export-budget.mjs';

export const RESTORABLE_TASK_LIMIT=30000;
export const RESTORABLE_TASK_ERROR='CRM-kopian kan innehålla högst 30 000 uppgifter. Inga uppgifter från ändringen har sparats. Bevara ditt underlag och kontakta administratören.';
const at='2026-10-11T20:00:00.000Z',version=9,uuid='00000000-0000-0000-0000-000000000000';
const digest=value=>createHash('sha256').update(value).digest('hex');
const utf8=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
const basis=value=>value===undefined?'undefined':value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(basis).join(',')+']':'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+basis(value[key])).join(',')+'}';

// Compact persisted tasks are independent of mutation/backup/restore producers.
// Schema defaults keep fixtures domain-valid; the action projection below does
// not invoke the reducer, restore reader, export serializer or new count gate.
export function restorableTaskFixture(core,{taskCount=29999,type='customer_note',version=9,completed=true,actor={id:'synthetic-mutation-user-admin',name:'Fiktiv skribent Å😀 "citat" \\'},space='live'}={}){
 const state=core.emptyState();state.version=version;state.settings.owners=['Fiktivt arbetsansvar'];
 state.customers=[core.CustomerSchema.parse({id:'synthetic-mutation-customer',name:'Fiktiv uppgiftskund',owner:state.settings.owners[0],status:'active'})];
 const template=core.TaskSchema.parse({customerId:state.customers[0].id,owner:state.settings.owners[0],title:'Fiktiv uppgift',due:core.plusDays(core.day(),1),kind:'manual'});
 state.tasks=Array.from({length:taskCount},(_,i)=>({...structuredClone(template),id:'synthetic-task-'+String(i).padStart(5,'0')}));
 if(taskCount){state.tasks[0].title='Fiktiv uppgift Å😀 "citat" \\';state.tasks.at(-1).done=true;state.tasks.at(-1).doneAt=at;}
 state.events=[{id:'synthetic-original-event',customerId:state.customers[0].id,dealId:'',text:'Ä😀 "citat" \\ rad\nbevarad\t\u0000',at,kind:'note',actor:{id:'synthetic-original-actor',name:'Fiktiv ursprunglig kollega Å😀'}}];
 core.normalizeState(state);
 let data,expectedRecord;
 if(type==='customer_note')data=mutationExportAction(core,state,type);
 else if(type==='follow_up'){data=mutationExportAction(core,state,type);data.completed=completed;}
 else if(type==='meeting')data=core.MeetingSchema.parse({customerId:state.customers[0].id,title:'Fiktivt genomfört möte Å😀',owner:state.settings.owners[0],date:core.day(),time:'10:00',duration:30,status:'done'});
 else if(type==='task'){data={...structuredClone(state.tasks[0]),title:state.tasks[0].title+' ändrad'};expectedRecord=basis(state.tasks[0]);}
 else if(type==='settings'){data={...structuredClone(state.settings),followupDays:state.settings.followupDays+1};expectedRecord=basis(state.settings);}
 else if(type==='import_customers')data={customers:[core.CustomerSchema.parse({name:'Fiktiv samtidigt importerad kund',owner:state.settings.owners[0],status:'active'})]};
 else throw Error('Unknown synthetic task action '+type);
 const next=structuredClone(state);next.version=version+1;
 const event=(text,kind='change',note)=>({id:uuid,customerId:state.customers[0].id,dealId:'',text,at,kind,...(note?{note}:{}),actor:{id:actor.id,name:actor.name}});
 if(type==='customer_note'||type==='follow_up'&&completed){const projected=mutationExportProjection(core,state,{type,data,version,actor,space});Object.assign(next,projected.state);}
 else if(type==='follow_up'){
  const task=next.tasks[0],title=task.title;task.title=data.nextAction.trim();task.due=data.nextDate;
  next.events.unshift(event('Arbete med aktivitet · '+data.occurredOn+'\n\n'+data.note.trim()+'\n\nNästa steg: '+data.nextAction.trim()+' · '+data.nextDate,'customer_note',{title:'Uppföljning: '+title,meetingDate:data.occurredOn,sourceFiles:[]}));
 }else if(type==='meeting'){
  next.meetings.push({...data,id:uuid});next.tasks.push(core.TaskSchema.parse({id:uuid,customerId:data.customerId,owner:data.owner,ownerProfileId:'',title:'Följ upp mötet: '+data.title,due:core.day(),kind:'meeting_followup'}));next.events.unshift(event('Möte genomfört: '+data.title));
 }else if(type==='task'){next.tasks[0]=structuredClone(data);next.events.unshift(event('Uppgift sparad: '+data.title));}
 else if(type==='settings')next.settings=structuredClone(data);
 // Import is used only for a losing unsafe-CAS assertion, never as a byte/audit oracle.
 else if(type==='import_customers')next.tasks.push({...structuredClone(template),id:uuid});
 const header=mutationExportHeader(next,{space}),projection={state:next,header,bytes:utf8(header)};
 assert.ok(utf8(mutationExportHeader(state,{space}))<16000000,'Task-count source independently fits the distinct16MB header limit');
 assert.ok(projection.bytes<16000000,'Task-count crossing independently stays below16MB');
 return {state,data,type,projection,expectedRecord,completed,space};
}

export async function verifyRestorableTaskBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 const started=performance.now(),helperInputs=new Map([['tests/restorable-task-budget.mjs',readFileSync(new URL(import.meta.url))],['tests/mutation-export-budget.mjs',readFileSync(new URL('./mutation-export-budget.mjs',import.meta.url))]]),compilerPath=import.meta.resolve('typescript').replace('file://',''),compilerInput=readFileSync(compilerPath);mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/restorable-task-')),compiled=new Set(),sourceBytes=new Map(),moduleBytes=new Map(),migrationBytes=new Map();
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
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);moduleBytes.set(file.replace(/\.ts$/,".mjs"),Buffer.from(output));return target;
 }
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(resolve(sourceRoot,'drizzle')).filter(name=>name.endsWith('.sql')).sort()){const input=readFileSync(resolve(sourceRoot,'drizzle',file));migrationBytes.set('drizzle/'+file,input);sqlite.exec(input.toString());}
 const original=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));let commits=0,probes=0,gets=0,puts=0,deletes=0,requests=0,loseAck=false,lostAcks=0,revoke=false,revocations=0,draftRace=false,draftRaces=0,countRaces=0,beforeCommit;
 const objects=new Map([['synthetic-private-r2',new Uint8Array([9,8,7])],['synthetic-private-r2-other',new Uint8Array([6,5,4])]]);
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe'){probes++;assert.deepEqual(this.values,['A😀']);}return sqlite.prepare(this.sql).get(...this.values)||null;}
  async all(){return this.exec();}async run(){return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{success:true,results:statement.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-mutation-member-'+role,user:'synthetic-mutation-user-'+role,email:'synthetic-mutation-'+role+'@example.test',name:role==='admin'?'Fiktiv skribent Å😀 "citat" \\':'Annan fiktiv skribent',role:role==='other'?'admin':role,owner:''})),account=accounts[0],other=accounts[1];
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const mutating=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(mutating){commits++;if(revoke){revoke=false;revocations++;sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id);}if(draftRace){draftRace=false;draftRaces++;sqlite.prepare("UPDATE crm_drafts SET revision=revision+1 WHERE space='live' AND id='synthetic-publication-draft'").run();}if(beforeCommit){const hook=beforeCommit;beforeCommit=undefined;await hook();}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(mutating&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic restorable-task lost ACK after actual COMMIT');}return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{gets++;const bytes=objects.get(key);return bytes?{size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}:null;},put:async()=>{puts++;assert.fail('Ordinary CRM mutation must not stage R2');},delete:async()=>{deletes++;assert.fail('Ordinary CRM mutation must not delete R2');}}};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,bytes])=>[key,bytes.slice()]))});
 const counters=()=>{commits=probes=gets=puts=deletes=0;loseAck=revoke=draftRace=false;beforeCommit=undefined;};
 const report={temporaryCompilerRoot:directory,syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:tables.length,httpRequests:0,accepted:[],denials:[],roles:[],lostAcks:0,casRaces:0,revocations:0,draftRaces:0,countRaces:0,sourceManifest:{}};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  // Node proves bytes; the separate native HTTP test uses workerd's stream.
  Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),conflicts=await import(pathToFileURL(compile('lib/record-conflicts.ts')).href),followups=await import(pathToFileURL(compile('lib/follow-up.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),budget=await import(pathToFileURL(compile('lib/crm-storage-budget.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/route.ts')).href),backupApi=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href);
  for(const user of accounts)sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,user.role,user.owner);
  for(const space of ['demo','live'])await store.initialize(space);
  const secret='SYNTHETIC PRIVATE EXPORT SENTINEL',outside=core.emptyState();outside.settings.owners=['Fiktivt bevarat ansvar'];const owner=outside.settings.owners[0],customer=core.CustomerSchema.parse({id:'synthetic-outside-customer',name:'Fiktiv bevarad kund',owner});outside.customers=[customer];
  const deal=core.DealSchema.parse({id:'synthetic-outside-deal',customerId:customer.id,owner,title:'Fiktiv bevarad affär'});outside.deals=[deal];
  outside.orders=[core.OrderSchema.parse({id:'synthetic-outside-order',customerId:customer.id,dealId:deal.id,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat underlag'})];outside.tasks=[core.TaskSchema.parse({id:'synthetic-outside-task',customerId:customer.id,dealId:deal.id,owner,title:'Fiktiv bevarad uppgift',due:'2026-11-01'})];outside.meetings=[core.MeetingSchema.parse({id:'synthetic-outside-meeting',customerId:customer.id,owner,title:'Fiktivt bevarat möte',date:'2026-11-01',time:'10:00',duration:30})];
  outside.events=[{id:'synthetic-outside-event',customerId:customer.id,dealId:'',text:'Fiktiv bevarad historik',at,kind:'note'}];outside.articles=[ops.ArticleSchema.parse({id:'synthetic-outside-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];outside.notices=[ops.NoticeSchema.parse({id:'synthetic-outside-notice',title:'Fiktiv notis',audience:'team',at})];outside.leads=[ops.LeadSchema.parse({id:'synthetic-outside-lead',name:'Fiktivt prospekt',source:'synthetic'})];outside.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-outside-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const name of store.names)for(const item of outside[name]){const row=store.crmEntityStorageRow('demo',name,item);sqlite.prepare('INSERT INTO '+row.table+'('+row.columns.join(',')+') VALUES('+row.columns.map(()=>'?').join(',')+')').run(...row.values);}
  sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) VALUES(?,?,?,?,?)').run('demo',crypto.randomUUID(),'{}',account.user,'synthetic-outside-hash');
  for(const space of ['demo','live'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'synthetic-private-'+space,'note',customer.id,3,crypto.randomUUID(),secret,JSON.stringify({text:'  '+secret+'\n  '}),0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(account.user,'synthetic-mutation-ms',account.email,secret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-mutation-mail-'+shared,account.user,'mail',JSON.stringify({subject:secret}),customer.id,shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-mutation-oauth',account.user,secret,1);
  const metadata={id:'synthetic-outside-file',name:'synthetic-private.bin',kind:'document',version:'v1',size:3,at,uploadedBy:account.user};
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(metadata.id,'demo',customer.id,'synthetic-private-r2',JSON.stringify(metadata));
  assert.ok(tables.every(table=>snapshot().tables[table].length>0),'All18 tables contain positive sentinels');report.allTablesPositive=true;report.r2Sentinels=objects.size;
  const seed=state=>{
   sqlite.exec('BEGIN');
   for(const name of [...store.names].reverse())sqlite.prepare('DELETE FROM '+store.tables[name]+" WHERE space='live'").run();
   sqlite.prepare("DELETE FROM crm_mutations WHERE space='live'").run();
   sqlite.prepare("DELETE FROM crm_drafts WHERE space='live' AND id='synthetic-publication-draft'").run();
   for(const name of store.names)for(const item of state[name]){const row=store.crmEntityStorageRow('live',name,item);sqlite.prepare('INSERT INTO '+row.table+'('+row.columns.join(',')+') VALUES('+row.columns.map(()=>'?').join(',')+')').run(...row.values);}
   sqlite.prepare("UPDATE crm_spaces SET version=?,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id='live'").run(state.version,JSON.stringify(state.settings));
   sqlite.prepare('UPDATE crm_members SET active=1 WHERE id=?').run(account.id);sqlite.exec('COMMIT');counters();
  };
  const identity=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test','Content-Type':'application/json'});
  const payload=(fixture,{id=uuid,requestedVersion=fixture.state.version}={})=>JSON.stringify({space:'live',type:fixture.type,version:requestedVersion,requestId:id,...(fixture.expectedRecord?{expectedRecord:fixture.expectedRecord}:{}),data:fixture.data});
  const post=async(fixture,{user=account,id=crypto.randomUUID(),requestedVersion=fixture.state.version}={})=>{requests++;return api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:identity(user),body:payload(fixture,{id,requestedVersion})}));};
  const get=async()=>{requests++;const response=await api.GET(new Request('https://crm.test/api/crm?space=live',{headers:identity(account)}));assert.equal(response.status,200);return response.json();};
  const fixture=({type='customer_note',user=account,...options}={})=>{const entry=restorableTaskFixture(core,{type,actor:{id:user.user,name:user.name},...options});if(type==='follow_up')assert.equal(entry.data.expectedContext,followups.followupBasis(entry.state,entry.data.taskId));return entry;};
  const stats=entry=>({type:entry.type,inputUtf16:payload(entry).length,inputUtf8:utf8(payload(entry)),sourceHeaderBytes:utf8(mutationExportHeader(entry.state)),futureHeaderBytes:entry.projection.bytes,sourceTasks:entry.state.tasks.length,futureTasks:entry.projection.state.tasks.length,sourceEvents:entry.state.events.length,generatedEvents:entry.projection.state.events.length-entry.state.events.length,largestEventRowBytes:Math.max(...entry.projection.state.events.map(row=>budget.sqliteRecordBytes(store.crmEntityStorageRow('live','events',row).values)))});
  const outsidePreserved=(before,after,{publication=false}={})=>{
   for(const table of tables){const outsideRows=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');assert.deepEqual(outsideRows(after.tables[table]),outsideRows(before.tables[table]),table+' outside destination');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states']){const protectedRows=rows=>table==='crm_drafts'&&publication?rows.filter(row=>row.id!=='synthetic-publication-draft'):rows;assert.deepEqual(protectedRows(after.tables[table]),protectedRows(before.tables[table]),table+' raw private sentinel');}
   assert.deepEqual(after.r2,before.r2);
  };
  const publication=entry=>{
   const kind=entry.type==='customer_note'?'note':entry.type==='follow_up'?'followup':'form',context=entry.type==='customer_note'?entry.data.customerId:entry.type==='follow_up'?entry.data.taskId:entry.type;
   sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('live',account.user,'synthetic-publication-draft',kind,context,3,crypto.randomUUID(),'Fiktivt eget publiceringsutkast',JSON.stringify({text:'  '+secret+' PUBLICATION\n  ',values:entry.data}),0,at);
   entry.data={...entry.data,draft:{id:'synthetic-publication-draft',revision:3}};return entry;
  };
  const deny=async(entry,label,{status=400,user=account,id,requestedVersion=entry.state.version,countGuard=false}={})=>{
   const before=snapshot();counters();const response=await post(entry,{user,id,requestedVersion}),body=await response.json();assert.equal(response.status,status,label+' '+body.error);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(typeof body.error==='string');assert.ok(!JSON.stringify(body).includes(secret));
   if(countGuard)assert.equal(body.error,RESTORABLE_TASK_ERROR,label+' exact actionable task count error');
   assert.equal(commits,0);assert.equal(probes,0);assert.equal(gets,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),before,label+' preserves all18 positive tables and both R2 objects');
   report.denials.push({label,status:response.status,error:body.error,...stats(entry),commits,probes,puts,deletes});

  };
  const accept=async(entry,label,{lost=false,roundtrip=false,user=account,withDraft=false}={})=>{
   const caseStarted=performance.now();
   seed(entry.state);if(withDraft)publication(entry);const before=snapshot(),id=crypto.randomUUID(),measured=stats(entry);assert.ok(measured.inputUtf16<10000000);assert.ok(measured.largestEventRowBytes<2000000);if(lost)loseAck=true;
   const response=await post(entry,{id,user}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+body.error);assert.ok(!JSON.stringify(body).includes(secret),'Ordinary/public mutation response excludes both own and foreign private payloads');assert.equal(commits,1);assert.equal(probes,0);assert.equal(gets,0);assert.equal(puts,0);assert.equal(deletes,0);outsidePreserved(before,snapshot(),{publication:withDraft});
   const value=lost?await get():body;assert.equal(value.version,entry.state.version+1);
   const originalIds=new Set(entry.state.events.map(row=>row.id)),byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(value.events.filter(row=>originalIds.has(row.id))),byId(entry.state.events),'Full Unicode/escapes, actor and note history remain untruncated');
   const generated=value.events.filter(row=>!originalIds.has(row.id));assert.equal(generated.length,measured.generatedEvents);assert.ok(generated.every(row=>row.actor.id===user.user&&row.actor.name===user.name));
   // Persisted rows with tied timestamps have no reducer-array ordering
   // contract. Compare complete audit objects as a multiset, retaining counts.
   const auditMultiset=rows=>rows.map(row=>({...row,id:uuid,at})).sort((left,right)=>{const a=basis(left),b=basis(right);return a<b?-1:a>b?1:0;});
   assert.deepEqual(auditMultiset(generated),auditMultiset(entry.projection.state.events.filter(row=>!originalIds.has(row.id))),'Independent complete generated audit content and actor, including edit audit counts');
   assert.equal(value.tasks.length,entry.projection.state.tasks.length,'Actual complete task count includes generated followup tasks');const originalTaskIds=new Set(entry.state.tasks.map(row=>row.id));const taskMultiset=rows=>rows.map(row=>({...row,id:originalTaskIds.has(row.id)?row.id:uuid,...(entry.type==='follow_up'&&entry.completed&&row.id===entry.state.tasks[0].id?{doneAt:at}:{})})).sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(taskMultiset(value.tasks),taskMultiset(entry.projection.state.tasks),'All original/new task identities, fields, status and provenance match independent action projection; no truncation');if(entry.type==='follow_up'){const old=value.tasks.find(row=>row.id===entry.state.tasks[0].id);assert.equal(old.done,entry.completed);if(entry.completed){assert.equal(old.doneAt.length,24);const priorIds=new Set(entry.state.tasks.map(row=>row.id));assert.equal(value.tasks.find(row=>!priorIds.has(row.id)).title,entry.data.nextAction);}else{assert.equal(old.title,entry.data.nextAction);assert.equal(old.due,entry.data.nextDate);}}
   if(withDraft){const previous=before.tables.crm_drafts.find(row=>row.id==='synthetic-publication-draft'),current=sqlite.prepare("SELECT * FROM crm_drafts WHERE space='live' AND id='synthetic-publication-draft'").get();assert.deepEqual({...current,revision:previous.revision,archived:previous.archived,updated_at:previous.updated_at},{...previous},'Every raw draft column remains exact except atomic revision/archive/timestamp');assert.equal(current.archived,1);assert.equal(current.revision,4);}
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id),result=JSON.parse(receipt.result_json);assert.equal(receipt.user_id,user.user);assert.equal(receipt.request_hash,await store.requestHash(entry.type,entry.data));
   const read=await get(),actualHeaderBytes=utf8(mutationExportHeader(read));assert.equal(actualHeaderBytes,measured.futureHeaderBytes,'Independent oracle includes actual final state, destination9→10, actor and all generated audits');assert.deepEqual(byId(read.events),byId(value.events));
   const exports={},archives={};
   if(baseline){
    assert.equal(read.tasks.length,30001);assert.ok(actualHeaderBytes<16000000);
    assert.throws(()=>restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:read},true),error=>error.issues?.some(issue=>issue.path.join('.')==='state.tasks'&&issue.maximum===30000),'Unchanged data reader rejects the actual committed30001-task state');
    exports.dataReaderRejected=true;
   }
   if(baseline||roundtrip)for(const format of ['json','stream']){
    requests++;const exported=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(exported.headers.get('cache-control'),'no-store');
    if(baseline){const responseBody=await exported.json();exports[format]={status:exported.status,error:responseBody.error};assert.equal(exported.status,400,format+' actual unchanged backup reader rejects over-count state');continue;}
    assert.equal(exported.status,200,format+' actual backup export at boundary');
    const text=await exported.text(),lines=format==='stream'?text.split('\n'):[],copy=JSON.parse(format==='stream'?lines[0]:text);archives[format]=format==='stream'?text:copy;assert.ok(!text.includes(secret));assert.deepEqual(byId(copy.state.events),byId(read.events));assert.deepEqual(byId(copy.state.tasks),byId(read.tasks));assert.equal(restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).events.length,read.events.length);assert.deepEqual(copy.files,[]);
    if(format==='stream'){assert.equal(lines.length,3);assert.equal(lines[2],'');assert.equal(utf8(lines[0]),actualHeaderBytes);assert.deepEqual(JSON.parse(lines[1]),{type:'end',files:0,bytes:0,sha256:digest(lines[0])});assert.equal(Number(exported.headers.get('X-Magnussons-Backup-Length')),utf8(text));}else{const expected=mutationExportJsonCopy(read,{exportedAt:copy.exportedAt});assert.deepEqual(copy,expected,'Independent legacy format1 wire contract');assert.equal(utf8(text),utf8(expected));assert.ok(utf8(text)<=16000000);}
    exports[format]={status:exported.status,bytes:utf8(text),count:copy.state.tasks.length,dataReaderCount:restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).tasks.length};
   }
   const replayBefore=snapshot();counters();const replay=await post(entry,{id,user,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,result);assert.equal(commits,0);assert.equal(probes,0);assert.deepEqual(snapshot(),replayBefore,'Exact double-click/stale completed retry preserves every row, draft and receipt');
   report.accepted.push({label,elapsedMs:Math.round(performance.now()-caseStarted),...measured,actualHeaderBytes,preservedSourceHistory:true,version:read.version,exactReplayNoWrites:true,lostAcknowledgement:lost,privateDraftConsumedAtomically:withDraft,exports});console.log('PASS case: '+label+' ('+report.accepted.at(-1).elapsedMs+'ms)');return {id,result,entry,archives,read};
  };
  const roundtrip=async accepted=>{
   for(const format of ['json','stream']){
    const empty=core.emptyState();empty.version=9;seed(empty);/* Existing restore contract requires no open target drafts. Archive only this synthetic target's fixture before the measured restore, retaining all raw columns. */sqlite.prepare("UPDATE crm_drafts SET archived=1 WHERE space='live'").run();assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM crm_drafts WHERE space='live' AND archived=0").get().n,0);const before=snapshot(),id=crypto.randomUUID();requests++;
    const response=await backupApi.POST(new Request('https://crm.test/api/crm/backup'+(format==='stream'?'?space=live&version=9&requestId='+id:''),{method:'POST',headers:{...identity(account),'Content-Type':format==='stream'?'application/x-ndjson':'application/json'},body:format==='stream'?accepted.archives.stream:JSON.stringify({space:'live',version:9,requestId:id,backup:accepted.archives.json})}));
    const restored=await response.json();assert.equal(response.status,200,format+' actual isolated restore '+restored.error);assert.equal(commits,1);assert.equal(restored.tasks.length,30000);assert.deepEqual(restored.tasks.slice().sort((a,b)=>a.id.localeCompare(b.id)),accepted.read.tasks.slice().sort((a,b)=>a.id.localeCompare(b.id)),'Complete task identities/responsibilities/content restored');outsidePreserved(before,snapshot());assert.equal(puts,0);assert.equal(deletes,0);
    const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id);assert.equal(receipt.user_id,account.user);assert.ok(receipt.request_hash);assert.equal(restored.events.filter(row=>row.kind==='restore').length,1);
    report.restores??=[];report.restores.push({format,status:response.status,tasks:restored.tasks.length,actualAuthenticatedHandler:true,commits,sourceSpace:'live',isolatedTargetSpace:'live',sourceRemovedOnlyInSyntheticHarness:true,syntheticTargetPrivateDraftsArchivedBeforeSnapshot:true});
   }
  };
  if(baseline){
   const entry=fixture({taskCount:30000});seed(entry.state);const beforeExports=snapshot();report.initialExports={};
   for(const format of ['json','stream']){requests++;const response=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(response.status,200,format+' actual export before ordinary mutation');const text=await response.text(),copy=JSON.parse(format==='stream'?text.split('\n')[0]:text);assert.equal(copy.state.tasks.length,30000);assert.equal(restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).tasks.length,30000);report.initialExports[format]={status:response.status,bytes:utf8(text),count:copy.state.tasks.length,tasksSha256:digest(JSON.stringify(copy.state.tasks))};}
   assert.deepEqual(snapshot(),beforeExports,'Baseline export performs no writes');await accept(entry,'customer_note30000→30001 below16MB',{roundtrip:true});
  }else{
   const accepted=await accept(fixture({taskCount:29999}),'customer_note29999→30000',{roundtrip:true});await roundtrip(accepted);
   await accept(fixture({type:'follow_up',taskCount:29999}),'completed followup29999→30000 consumes own private draft',{withDraft:true});
   await accept(fixture({type:'task',taskCount:30000}),'existing task edit at30000');
   await accept(fixture({type:'follow_up',taskCount:30000,completed:false}),'unfinished followup at30000 updates actual task');
   for(const type of ['customer_note','follow_up','meeting']){const entry=fixture({type,taskCount:30000});seed(entry.state);publication(entry);await deny(entry,type+' rejects generated30001 before commit',{countGuard:true});}
   for(const user of accounts.filter(user=>['reader','production','print','warehouse'].includes(user.role))){const entry=fixture({taskCount:3});seed(entry.state);await deny(entry,user.role+' forbidden',{status:403,user});report.roles.push(user.role);}
   await accept(fixture({taskCount:3,user:accounts.find(user=>user.role==='seller')}),'seller legitimate followup task remains allowed',{user:accounts.find(user=>user.role==='seller')});
   const small=fixture({taskCount:3});seed(small.state);const roleBefore=snapshot();revoke=true;const revoked=await post(small);assert.equal(revoked.status,403);assert.equal(commits,1);roleBefore.tables.crm_members.find(row=>row.id===account.id).active=0;assert.deepEqual(snapshot(),roleBefore,'Actual commit actor revocation leaves only independent member change');
   const draftEntry=fixture({taskCount:3});seed(draftEntry.state);publication(draftEntry);const draftBefore=snapshot();draftRace=true;const changedDraft=await post(draftEntry);assert.equal(changedDraft.status,409);assert.equal(commits,1);draftBefore.tables.crm_drafts.find(row=>row.id==='synthetic-publication-draft').revision++;assert.deepEqual(snapshot(),draftBefore,'Private draft CAS loser retains all original data except independent draft revision');
   for(const type of ['customer_note','import_customers']){
    const entry=fixture({type,taskCount:29999});seed(entry.state);if(type==='customer_note')publication(entry);let winnerSnapshot,winnerId;
    beforeCommit=async()=>{countRaces++;const winner=fixture({taskCount:29999,user:other});winnerId=crypto.randomUUID();const response=await post(winner,{id:winnerId,user:other});assert.equal(response.status,200,'Actual separately authenticated winner saves the last task');assert.equal((await response.json()).tasks.length,30000);winnerSnapshot=snapshot();};
    const loser=await post(entry),body=await loser.json();assert.equal(loser.status,type==='customer_note'?400:409,type+' losing revision '+body.error);if(type==='customer_note')assert.equal(body.error,RESTORABLE_TASK_ERROR);assert.equal(commits,2,'One real winning and one losing atomic attempt; no second loser commit');assert.deepEqual(snapshot(),winnerSnapshot,'Only independently authenticated winning task/audit/receipt persist; loser draft exact');assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM crm_mutations WHERE space='live'").get().n,1);assert.equal(sqlite.prepare("SELECT id FROM crm_mutations WHERE space='live'").get().id,winnerId);report.concurrentCases??=[];report.concurrentCases.push({type,status:loser.status,actualWinnerHandler:true,actualWinnerTasks:30000,atomicAttempts:commits,safeRetryRemeasured:type==='customer_note'});
   }
   const lost=await accept(fixture({taskCount:3}),'private publication lost acknowledgment',{lost:true,withDraft:true});
   await deny(lost.entry,'completed request changed actor',{status:409,user:other,id:lost.id});const changed={...lost.entry,data:{...lost.entry.data,text:lost.entry.data.text+' changed synthetic intent'}};await deny(changed,'completed request changed intent',{status:409,id:lost.id});
   // This is independent synthetic later growth, not a claimed committed real history.
   const padding=fixture({taskCount:30001});for(const row of padding.state.tasks){const stored=store.crmEntityStorageRow('live','tasks',row);sqlite.prepare('INSERT INTO '+stored.table+'('+stored.columns.join(',')+') VALUES('+stored.columns.map(()=>'?').join(',')+') ON CONFLICT(space,id) DO UPDATE SET data=excluded.data').run(...stored.values);}const over=await get();assert.ok(over.tasks.length>30000);assert.ok(utf8(mutationExportHeader(over))<16000000);const historicalBefore=snapshot();counters();const replay=await post(lost.entry,{id:lost.id,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,lost.result);assert.equal(commits,0);assert.deepEqual(snapshot(),historicalBefore);report.completedOverCountReplay={status:200,actualTasks:over.tasks.length,actualHeaderBytes:utf8(mutationExportHeader(over)),commits,probes,puts,deletes,syntheticLaterGrowth:true};
   const noGrowth={data:{...over.settings,followupDays:over.settings.followupDays+1},expectedRecord:basis(over.settings),type:'settings',state:over,projection:{state:over,bytes:utf8(mutationExportHeader(over))}};await deny(noGrowth,'legacy over-task state fails closed on new no-task write',{countGuard:true});
  }
  report.elapsedMs=Math.round(performance.now()-started);report.httpRequests=requests;report.lostAcks=lostAcks;report.casRaces=countRaces;report.revocations=revocations;report.draftRaces=draftRaces;report.countRaces=countRaces;report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,digest(input)]));
  for(const [file,input] of [...sourceBytes,...migrationBytes])assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source/migration stayed fixed: '+file);for(const [file,input] of moduleBytes)assert.deepEqual(readFileSync(resolve(directory,file)),input,'Compiled module stayed fixed: '+file);report.moduleManifest=Object.fromEntries([...moduleBytes].map(([file,input])=>[file,digest(input)]));report.migrationManifest=Object.fromEntries([...migrationBytes].map(([file,input])=>[file,digest(input)]));for(const [file,input]of helperInputs)assert.deepEqual(readFileSync(new URL(file.slice(6),import.meta.url)),input,'Actual helper unchanged '+file);assert.deepEqual(readFileSync(compilerPath),compilerInput,'Actual TypeScript compiler unchanged');report.helperManifest=Object.fromEntries([...helperInputs].map(([file,input])=>[file,digest(input)]));report.compiler={version:ts.version,sha256:digest(compilerInput)};
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('PASS: '+(baseline?'baseline ordinary customer note commits30001 tasks unreadable by both backup exports':'candidate bounds actual prospective tasks without truncation')+'; '+requests+' authenticated Node calls, '+report.accepted.length+' accepts, '+report.denials.length+' unchanged-table denials, '+lostAcks+' lost ACK, '+countRaces+' actual CAS competitor, '+revocations+' role revocation, '+draftRaces+' private draft race, '+(baseline?0:1)+' safe retry remeasures last task, '+(baseline?0:1)+' unsafe import conflict. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
