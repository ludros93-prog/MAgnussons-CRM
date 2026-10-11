import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

export const MUTATION_EXPORT_LIMIT=16000000;
export const MUTATION_EXPORT_ERROR='Ändringen skulle göra CRM-data och historik för stora för dataexport inom 16 MB. Inga uppgifter från ändringen har sparats. Bevara ditt underlag och kontakta administratören.';
const at='2026-10-11T20:00:00.000Z',version=9,uuid='00000000-0000-0000-0000-000000000000';
const digest=value=>createHash('sha256').update(value).digest('hex');
const utf8=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
const basis=value=>value===undefined?'undefined':value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(basis).join(',')+']':'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+basis(value[key])).join(',')+'}';

// Independent wire oracle: neither the mutation reducer nor the producer's
// backup/header/budget helper calculates expected bytes or generated history.
export function mutationExportHeader(state,{space='live',exportedAt=at}={}){
 const {viewer:_,...data}=state;
 return {type:'header',format:'magnussons-crm-backup-2',exportedAt,sourceSpace:space,state:data,files:[]};
}
export function mutationExportJsonCopy(state,{space='live',exportedAt=at}={}){
 const {viewer:_,...data}=state;
 return {format:'magnussons-crm-backup-1',exportedAt,sourceSpace:space,state:data,files:[]};
}
export function mutationExportAction(core,state,type='note'){
 const customer=state.customers[0],task=state.tasks[0],today=core.day(),nextDate=core.plusDays(today,3),text='Fiktiv bevarad text Å😀 "citat" \\ rad\nfortsättning\t\u0000';
 if(type==='note')return {customerId:customer.id,text,contact:false,nextReview:''};
 if(type==='customer_note')return {customerId:customer.id,title:'Fiktiv kundnotering Å😀',text:'  '+text+'\n  ',meetingDate:today,sourceFiles:[],contact:false,nextAction:'Fiktiv nästa aktivitet',nextDate,owner:customer.owner};
 if(type==='follow_up')return {taskId:task.id,expectedContext:basis({task,deal:null,customerContext:null}),outcome:'internal',occurredOn:today,note:text,completed:true,nextAction:'Fiktiv nästa uppföljning',nextDate};
 if(type==='customer')return {...structuredClone(customer),email:'synthetic-correction@example.test'};
 throw Error('Unknown synthetic mutation fixture '+type);
}
export function mutationExportProjection(core,state,{type='note',data=mutationExportAction(core,state,type),space='live',version=state.version,actor={id:'synthetic-mutation-user-admin',name:'Fiktiv skribent Å😀 "citat" \\'},timestamp=at}={}){
 const next=structuredClone(state);next.version=version+1;const customer=next.customers[0];
 const event=(text,kind='note',note)=>({id:uuid,customerId:customer.id,dealId:'',text,at:timestamp,kind,...(note?{note}:{}),actor:{id:actor.id,name:actor.name}});
 if(type==='note')next.events.unshift(event(data.text.trim(),data.contact?'contact':'note'));
 else if(type==='customer_note'){
  next.tasks.push(core.TaskSchema.parse({id:uuid,customerId:customer.id,owner:data.owner,title:data.nextAction.trim(),due:data.nextDate,kind:'meeting_followup'}));
  next.events.unshift(event(data.text,'customer_note',{title:data.title.trim()||'Mötesanteckning',meetingDate:data.meetingDate,sourceFiles:data.sourceFiles}));
 }else if(type==='follow_up'){
  const task=next.tasks.find(row=>row.id===data.taskId),previousTitle=task.title;
  const successor=core.TaskSchema.parse({...task,id:uuid,responsibilityTransfers:[],title:data.nextAction.trim(),due:data.nextDate,done:false,doneAt:''});
  task.done=true;task.doneAt=timestamp;next.tasks.push(successor);
  next.events.unshift(event('Arbete med aktivitet · '+data.occurredOn+'\n\n'+data.note.trim()+'\n\nNästa steg: '+data.nextAction.trim()+' · '+data.nextDate,'customer_note',{title:'Uppföljning: '+previousTitle,meetingDate:data.occurredOn,sourceFiles:[]}));
 }else if(type==='customer'){
  const previousEmail=customer.email;customer.email=data.email;
  next.events.unshift(event('Kundkort uppdaterat','change'));
  if(previousEmail!==data.email)next.events.unshift(event('Ändrade uppgifter\nE-post: '+previousEmail+' → '+data.email,'change'));
 }else throw Error('Unknown synthetic mutation projection '+type);
 const header=mutationExportHeader(next,{space});return {state:next,header,bytes:utf8(header)};
}
export function mutationExportFixture(core,{target=MUTATION_EXPORT_LIMIT,layout='cjk',type='note',data,version=9,actor,space='live'}={}){
 const state=core.emptyState();state.version=version;state.settings.owners=['Fiktivt arbetsansvar'];
 state.customers=[core.CustomerSchema.parse({id:'synthetic-mutation-customer',name:'Fiktiv exportkund',owner:state.settings.owners[0],status:'active'})];
 state.tasks=[core.TaskSchema.parse({id:'synthetic-mutation-task',customerId:state.customers[0].id,owner:state.settings.owners[0],title:'Fiktiv uppgift Å😀',due:core.plusDays(core.day(),1),kind:'manual'})];
 const unit=layout==='emoji'?'😀':layout==='ascii'?'A':'界',width=utf8(unit),count=Math.max(2,Math.ceil(target/(50000*width/unit.length))+2);
 state.events=Array.from({length:count},(_,i)=>({id:'synthetic-mutation-padding-'+String(i).padStart(4,'0'),customerId:state.customers[0].id,dealId:'',text:'',at,kind:'note'}));
 state.events[0].text='Ä😀 "citat" \\ rad\nbevarad\t\u0000 '+layout+' ';
 state.events[0].actor={id:'synthetic-original-actor',name:'Fiktiv ursprunglig kollega Å😀'};
 state.events[0].note={title:'Fiktiv historik "ö" \\ 😀',meetingDate:'',sourceFiles:['syntetiskt-underlag.txt']};
 core.normalizeState(state);data=data?structuredClone(data):mutationExportAction(core,state,type);
 const options={type,data,version,space,...(actor?{actor}:{})};let remaining=target-mutationExportProjection(core,state,options).bytes;assert.ok(remaining>=0,'Fixture target fits its actual mutation metadata');
 for(const row of state.events){const n=Math.min(Math.floor((50000-row.text.length)/unit.length),Math.floor(remaining/width));row.text+=unit.repeat(n);remaining-=n*width;}
 for(const row of state.events){const n=Math.min(50000-row.text.length,remaining);row.text+='H'.repeat(n);remaining-=n;}
 assert.equal(remaining,0);assert.ok(state.events.every(row=>row.text.length<=50000));
 const projection=mutationExportProjection(core,state,options);assert.equal(projection.bytes,target);
 assert.ok(utf8(mutationExportHeader(state,{space}))<MUTATION_EXPORT_LIMIT,'Persisted fixture fits before ordinary mutation');
 return {state,data,projection,expectedRecord:type==='customer'?basis(state.customers[0]):undefined};
}

export async function verifyMutationExportBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 const started=performance.now();mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/mutation-export-')),compiled=new Set(),sourceBytes=new Map();
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
 const original=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));let commits=0,probes=0,puts=0,deletes=0,requests=0,loseAck=false,lostAcks=0,race=false,races=0,revoke=false,revocations=0,draftRace=false,draftRaces=0,budgetRace=false,budgetRaces=0,budgetRaceId='';
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
  if(mutating){commits++;if(race){race=false;races++;sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='live'").run();}if(revoke){revoke=false;revocations++;sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id);}if(draftRace){draftRace=false;draftRaces++;sqlite.prepare("UPDATE crm_drafts SET revision=revision+1 WHERE space='live' AND id='synthetic-publication-draft'").run();}if(budgetRace){budgetRace=false;budgetRaces++;const raw=JSON.parse(sqlite.prepare("SELECT data FROM crm_events WHERE space='live' ORDER BY length(json_extract(data,'$.text')),id LIMIT 1").get().data);budgetRaceId=raw.id;assert.ok(raw.text.length<50000);raw.text+='H';sqlite.prepare("UPDATE crm_events SET data=? WHERE space='live' AND id=?").run(JSON.stringify(raw),raw.id);sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='live'").run();}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(mutating&&loseAck){loseAck=false;lostAcks++;throw Error('Synthetic mutation-budget lost ACK after actual COMMIT');}return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{const bytes=objects.get(key);return bytes?{size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer}:null;},put:async()=>{puts++;assert.fail('Ordinary CRM mutation must not stage R2');},delete:async()=>{deletes++;assert.fail('Ordinary CRM mutation must not delete R2');}}};
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,bytes])=>[key,bytes.slice()]))});
 const counters=()=>{commits=probes=puts=deletes=0;loseAck=race=revoke=draftRace=budgetRace=false;};
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:tables.length,httpRequests:0,accepted:[],denials:[],roles:[],lostAcks:0,casRaces:0,revocations:0,draftRaces:0,budgetRaces:0,sourceManifest:{}};
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
  const fixture=({type='note',user=account,...options}={})=>{const entry={type,...mutationExportFixture(core,{type,actor:{id:user.user,name:user.name},...options})};if(type==='follow_up')assert.equal(entry.data.expectedContext,followups.followupBasis(entry.state,entry.data.taskId));return entry;};
  const stats=entry=>({type:entry.type,inputUtf16:payload(entry).length,inputUtf8:utf8(payload(entry)),sourceHeaderBytes:utf8(mutationExportHeader(entry.state)),futureHeaderBytes:entry.projection.bytes,sourceEvents:entry.state.events.length,generatedEvents:entry.projection.state.events.length-entry.state.events.length,largestEventRowBytes:Math.max(...entry.projection.state.events.map(row=>budget.sqliteRecordBytes(store.crmEntityStorageRow('live','events',row).values)))});
  const outsidePreserved=(before,after,{publication=false}={})=>{
   for(const table of tables){const outsideRows=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');assert.deepEqual(outsideRows(after.tables[table]),outsideRows(before.tables[table]),table+' outside destination');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states']){const protectedRows=rows=>table==='crm_drafts'&&publication?rows.filter(row=>row.id!=='synthetic-publication-draft'):rows;assert.deepEqual(protectedRows(after.tables[table]),protectedRows(before.tables[table]),table+' raw private sentinel');}
   assert.deepEqual(after.r2,before.r2);
  };
  const publication=entry=>{
   const kind=entry.type==='customer_note'?'note':entry.type==='follow_up'?'followup':'form',context=entry.type==='customer_note'?entry.data.customerId:entry.type==='follow_up'?entry.data.taskId:entry.type;
   sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('live',account.user,'synthetic-publication-draft',kind,context,3,crypto.randomUUID(),'Fiktivt eget publiceringsutkast',JSON.stringify({text:'  SYNTHETIC PRIVATE PUBLICATION SENTINEL\n  ',values:entry.data}),0,at);
   entry.data={...entry.data,draft:{id:'synthetic-publication-draft',revision:3}};return entry;
  };
  const deny=async(entry,label,{status=400,user=account,id,requestedVersion=entry.state.version,exportGuard=false}={})=>{
   const before=snapshot();counters();const response=await post(entry,{user,id,requestedVersion}),body=await response.json();assert.equal(response.status,status,label+' '+body.error);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(typeof body.error==='string');assert.ok(!JSON.stringify(body).includes(secret));
   if(exportGuard)assert.equal(body.error,MUTATION_EXPORT_ERROR,label+' exact actionable budget error');
   assert.equal(commits,0);assert.equal(probes,0);assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(snapshot(),before,label+' preserves all18 positive tables and both R2 objects');
   report.denials.push({label,status:response.status,error:body.error,...stats(entry),commits,probes,puts,deletes});
  };
  const accept=async(entry,label,{lost=false,roundtrip=false,user=account,withDraft=false}={})=>{
   seed(entry.state);if(withDraft)publication(entry);const before=snapshot(),id=crypto.randomUUID(),measured=stats(entry);assert.ok(measured.inputUtf16<10000000);assert.ok(measured.largestEventRowBytes<2000000);if(lost)loseAck=true;
   const response=await post(entry,{id,user}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+body.error);assert.equal(commits,1);assert.equal(probes,0);assert.equal(puts,0);assert.equal(deletes,0);outsidePreserved(before,snapshot(),{publication:withDraft});
   const value=lost?await get():body;assert.equal(value.version,entry.state.version+1);
   const originalIds=new Set(entry.state.events.map(row=>row.id)),byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(value.events.filter(row=>originalIds.has(row.id))),byId(entry.state.events),'Full Unicode/escapes, actor and note history remain untruncated');
   const generated=value.events.filter(row=>!originalIds.has(row.id));assert.equal(generated.length,measured.generatedEvents);assert.ok(generated.every(row=>row.actor.id===user.user&&row.actor.name===user.name));
   // Persisted rows with tied timestamps have no reducer-array ordering
   // contract. Compare complete audit objects as a multiset, retaining counts.
   const auditMultiset=rows=>rows.map(row=>({...row,id:uuid,at})).sort((left,right)=>{const a=basis(left),b=basis(right);return a<b?-1:a>b?1:0;});
   assert.deepEqual(auditMultiset(generated),auditMultiset(entry.projection.state.events.filter(row=>!originalIds.has(row.id))),'Independent complete generated audit content and actor, including edit audit counts');
   if(entry.type==='follow_up'){const old=value.tasks.find(row=>row.id===entry.state.tasks[0].id);assert.equal(old.done,true);assert.equal(old.doneAt.length,24);assert.equal(value.tasks.find(row=>row.id!==old.id).title,entry.data.nextAction);}
   if(withDraft){const previous=before.tables.crm_drafts.find(row=>row.id==='synthetic-publication-draft'),current=sqlite.prepare("SELECT * FROM crm_drafts WHERE space='live' AND id='synthetic-publication-draft'").get();assert.deepEqual({...current,revision:previous.revision,archived:previous.archived,updated_at:previous.updated_at},{...previous},'Every raw draft column remains exact except atomic revision/archive/timestamp');assert.equal(current.archived,1);assert.equal(current.revision,4);}
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id),result=JSON.parse(receipt.result_json);assert.equal(receipt.user_id,user.user);assert.equal(receipt.request_hash,await store.requestHash(entry.type,entry.data));
   const read=await get(),actualHeaderBytes=utf8(mutationExportHeader(read));assert.equal(actualHeaderBytes,measured.futureHeaderBytes,'Independent oracle includes actual final state, destination9→10, actor and all generated audits');assert.deepEqual(byId(read.events),byId(value.events));
   const exports={};if(baseline||roundtrip)for(const format of ['json','stream']){
    // Legacy format1 JSON omits the format2 header's type field. Crossing the
    // NDJSON header by one byte does not imply that this smaller JSON copy fails.
    requests++;const exported=await backupApi.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:identity(account)}));assert.equal(exported.status,baseline&&format==='stream'?400:200,format+' actual backup handler');assert.equal(exported.headers.get('cache-control'),'no-store');
    if(baseline&&format==='stream'){exports[format]={status:exported.status,error:(await exported.json()).error};continue;}
    const text=await exported.text(),lines=format==='stream'?text.split('\n'):[],copy=JSON.parse(format==='stream'?lines[0]:text);assert.ok(!text.includes(secret));assert.deepEqual(byId(copy.state.events),byId(read.events));assert.equal(restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:copy.state},true).events.length,read.events.length);assert.deepEqual(copy.files,[]);
    if(format==='stream'){assert.equal(lines.length,3);assert.equal(lines[2],'');assert.equal(utf8(lines[0]),actualHeaderBytes);assert.deepEqual(JSON.parse(lines[1]),{type:'end',files:0,bytes:0,sha256:digest(lines[0])});assert.equal(Number(exported.headers.get('X-Magnussons-Backup-Length')),utf8(text));}else{const expected=mutationExportJsonCopy(read,{exportedAt:copy.exportedAt});assert.deepEqual(copy,expected,'Independent legacy format1 wire contract');assert.equal(utf8(text),utf8(expected));assert.ok(utf8(text)<=MUTATION_EXPORT_LIMIT);}
    exports[format]={status:exported.status,bytes:utf8(text),headerBytes:format==='stream'?utf8(lines[0]):undefined,count:copy.state.events.length};
   }
   const replayBefore=snapshot();counters();const replay=await post(entry,{id,user,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,result);assert.equal(commits,0);assert.equal(probes,0);assert.deepEqual(snapshot(),replayBefore,'Exact double-click/stale completed retry preserves every row, draft and receipt');
   report.accepted.push({label,...measured,actualHeaderBytes,preservedSourceHistory:true,version:read.version,exactReplayNoWrites:true,lostAcknowledgement:lost,privateDraftConsumedAtomically:withDraft,exports});return {id,result,entry};
  };
  if(baseline){
   const entry=fixture({target:MUTATION_EXPORT_LIMIT+1});assert.ok(stats(entry).sourceHeaderBytes<MUTATION_EXPORT_LIMIT);await accept(entry,'ordinary note crosses data export header by one byte',{roundtrip:true});
  }else{
   for(const layout of ['cjk','emoji'])for(const target of [MUTATION_EXPORT_LIMIT,MUTATION_EXPORT_LIMIT+1]){
    const entry=fixture({layout,target});if(target===MUTATION_EXPORT_LIMIT)await accept(entry,layout+' ordinary note exactly16M',{roundtrip:true});else{seed(entry.state);await deny(entry,layout+' ordinary note16M+1',{exportGuard:true});}
   }
   for(const type of ['customer_note','follow_up','customer'])for(const target of [MUTATION_EXPORT_LIMIT,MUTATION_EXPORT_LIMIT+1]){
    const entry=fixture({type,target});if(target===MUTATION_EXPORT_LIMIT)await accept(entry,type+' exactly16M with actual generated history',{withDraft:type!=='customer',roundtrip:true});else{seed(entry.state);if(type!=='customer')publication(entry);await deny(entry,type+'16M+1 preserves private draft and all rows',{exportGuard:true});}
   }
   await accept(fixture({layout:'ascii',target:1000000}),'ASCII and escaped controls',{roundtrip:true});
   for(const user of accounts.filter(user=>['reader','production','print','warehouse'].includes(user.role))){const entry=fixture({layout:'ascii',target:5000});seed(entry.state);await deny(entry,user.role+' forbidden',{status:403,user});report.roles.push(user.role);}
   await accept(fixture({layout:'ascii',target:5000,user:accounts.find(user=>user.role==='seller')}),'seller ordinary note allowed',{user:accounts.find(user=>user.role==='seller')});
   const small=fixture({layout:'ascii',target:5000});seed(small.state);await deny(small,'stale workspace before budget',{status:409,requestedVersion:version-1});
   seed(small.state);const staleRecord=fixture({type:'customer',layout:'ascii',target:5000});staleRecord.expectedRecord='stale synthetic record';await deny(staleRecord,'stale record before budget',{status:409});
   seed(small.state);const invalid={...small,data:{...small.data,text:'   '}};await deny(invalid,'invalid action cannot reach commit',{status:400});
   seed(small.state);const casBefore=snapshot();race=true;const raced=await post(small);assert.equal(raced.status,409);assert.equal(commits,1);casBefore.tables.crm_spaces.find(row=>row.id==='live').version++;assert.deepEqual(snapshot(),casBefore,'Losing unsafe CAS contains only independently injected workspace revision');
   seed(small.state);const roleBefore=snapshot();revoke=true;const revoked=await post(small);assert.equal(revoked.status,403);assert.equal(commits,1);roleBefore.tables.crm_members.find(row=>row.id===account.id).active=0;assert.deepEqual(snapshot(),roleBefore,'Commit actor revocation creates no CRM entity, audit or receipt');
   const draftEntry=fixture({type:'customer_note',layout:'ascii',target:5000});seed(draftEntry.state);publication(draftEntry);const draftBefore=snapshot();draftRace=true;const changedDraft=await post(draftEntry);assert.equal(changedDraft.status,409);assert.equal(commits,1);draftBefore.tables.crm_drafts.find(row=>row.id==='synthetic-publication-draft').revision++;assert.deepEqual(snapshot(),draftBefore,'Private draft revision race contains only independent draft revision, no partial publication');
   const budgetEntry=fixture({type:'customer_note',target:MUTATION_EXPORT_LIMIT});seed(budgetEntry.state);publication(budgetEntry);const budgetBefore=snapshot();budgetRace=true;const changedBudget=await post(budgetEntry),changedBudgetBody=await changedBudget.json();assert.equal(changedBudget.status,400);assert.equal(changedBudgetBody.error,MUTATION_EXPORT_ERROR);assert.equal(commits,1,'Retry denies before a second attempted commit');const changedRow=budgetBefore.tables.crm_events.find(row=>row.id===budgetRaceId);const changedRaw=JSON.parse(changedRow.data);changedRaw.text+='H';changedRow.data=JSON.stringify(changedRaw);budgetBefore.tables.crm_spaces.find(row=>row.id==='live').version++;assert.deepEqual(snapshot(),budgetBefore,'Safe CAS retry remeasures final header after actual competing growth and preserves private draft');
   const lost=await accept(fixture({type:'customer_note',layout:'ascii',target:5000}),'private publication lost acknowledgment',{lost:true,withDraft:true});
   await deny(lost.entry,'completed request changed actor',{status:409,user:other,id:lost.id});const changed={...lost.entry,data:{...lost.entry.data,text:lost.entry.data.text+' changed synthetic intent'}};await deny(changed,'completed request changed intent',{status:409,id:lost.id});
   // A completed receipt does not submit again, even if an independently
   // seeded legacy/concurrent state has since crossed the data-header limit.
   const original=JSON.parse(sqlite.prepare("SELECT data FROM crm_events WHERE space='live' AND id='synthetic-mutation-padding-0000'").get().data);const padding=fixture({target:MUTATION_EXPORT_LIMIT});for(const row of padding.state.events){const stored=store.crmEntityStorageRow('live','events',row);sqlite.prepare('INSERT INTO '+stored.table+'('+stored.columns.join(',')+') VALUES('+stored.columns.map(()=>'?').join(',')+') ON CONFLICT(space,id) DO UPDATE SET data=excluded.data').run(...stored.values);}const over=await get();assert.ok(utf8(mutationExportHeader(over))>MUTATION_EXPORT_LIMIT);const historicalBefore=snapshot();counters();const replay=await post(lost.entry,{id:lost.id,requestedVersion:0});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).mutationResult,lost.result);assert.equal(commits,0);assert.deepEqual(snapshot(),historicalBefore);report.completedOversizedReplay={status:200,actualHeaderBytes:utf8(mutationExportHeader(over)),commits,probes,puts,deletes,syntheticConcurrentGrowth:true};assert.ok(original.text);
   const noGrowth={data:{...over.customers[0]},expectedRecord:conflicts.recordBasis(over.customers[0]),type:'customer',state:over,projection:mutationExportProjection(core,over,{type:'customer',data:over.customers[0],actor:{id:account.user,name:account.name}})};await deny(noGrowth,'legacy oversized state stays fail closed on new ordinary write',{exportGuard:true});
  }
  report.elapsedMs=Math.round(performance.now()-started);report.httpRequests=requests;report.lostAcks=lostAcks;report.casRaces=races;report.revocations=revocations;report.draftRaces=draftRaces;report.budgetRaces=budgetRaces;report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,digest(input)]));
  for(const [file,input] of sourceBytes)assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source stayed fixed: '+file);
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('PASS: '+(baseline?'baseline ordinary note commits an unexportable header':'candidate bounds every tested ordinary mutation header')+'; '+requests+' authenticated Node calls, '+report.accepted.length+' accepts, '+report.denials.length+' unchanged-table denials, '+lostAcks+' lost ACK, '+races+' CAS race, '+revocations+' role revocation, '+draftRaces+' private draft race, '+budgetRaces+' budget-changing safe retry. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
