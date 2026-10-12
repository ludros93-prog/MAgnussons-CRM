import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';

export const FILE_HEADER_COPY_LIMIT=16000000;
export const FILE_HEADER_COPY_ERROR='Filen skulle göra CRM-kopians filförteckning och historik för stor (högst 16 MB). Ingen ny fil har sparats. Bevara filen och kontakta administratören.';
export const FILE_HEADER_INPUT_ERROR='CRM-kopians underlag kunde inte verifieras. Ingen ny fil har sparats. Bevara filen och kontakta administratören.';
export const FILE_HEADER_CONFLICT_ERROR='En annan ändring hann före. Välj filen igen och försök på nytt.';
export const FILE_HEADER_FIXTURE_AT='2026-10-12T00:00:00.000Z';
export const FILE_HEADER_FIXTURE_ACTOR={id:'synthetic-file-header-user-admin',name:'Fiktiv filskribent Å😀 "citat" \\'};
const uuid='00000000-0000-0000-0000-000000000000',origin='https://crm.test';
const pdf=new Uint8Array([37,80,68,70,45]),png=new Uint8Array([137,80,78,71,13,10,26,10]);
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const sameJson=(actual,expected,label)=>assert.equal(hash(JSON.stringify(canonical(actual))),hash(JSON.stringify(canonical(expected))),label);
export const fileUploadUtf8Bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
const stripViewer=({viewer:_,mutationResult:__,...state})=>state;

// Independent wire oracle. Expected bytes never come from the production
// serializer, upload preflight or reducer. Timestamp and UUID contents vary,
// but their ISO/ASCII widths are fixed and verified on actual saved rows.
export function fileUploadHeader(state,files,{space='live',exportedAt=FILE_HEADER_FIXTURE_AT}={}){
 return {type:'header',format:'magnussons-crm-backup-2',exportedAt,sourceSpace:space,state:stripViewer(state),files};
}
export function fileUploadProjection(core,entry,{actor=FILE_HEADER_FIXTURE_ACTOR,timestamp=FILE_HEADER_FIXTURE_AT,id=uuid,eventId=uuid,space=entry.space||'live'}={}){
 const state=core.normalizeState(structuredClone(entry.state));state.version=entry.state.version+1;
 const name=entry.name.replace(/[\r\n]/g,'').slice(0,200),version=entry.version.replace(/\r\n|\r|\n/g,'\r\n').trim(),order=entry.state.orders[0];
 const metadata={id,name,kind:entry.kind,version,size:entry.bytes.length,at:timestamp,uploadedBy:actor.name,...(entry.photo?{purpose:'production',orderId:order.id,workId:order.production.workId}:{})};
 const event={id:eventId,customerId:entry.state.customers[0].id,dealId:entry.photo?order.dealId:'',text:(entry.photo?'Arbetsfoto sparat: ':'Fil sparad: ')+name+' · version '+version,at:timestamp,kind:entry.photo?'production':'file',actor:{id:actor.id,name:actor.name}};
 state.events.push(event);
 const files=[...entry.oldFiles.map(row=>({customerId:row.customer_id,metadata:JSON.parse(row.data)})),{customerId:entry.state.customers[0].id,metadata}];
 const header=fileUploadHeader(state,files,{space});return {state,metadata,event,files,header,bytes:fileUploadUtf8Bytes(header)};
}

// Every large value is synthetic. History rows stay below 50,000 UTF-16
// units; metadata-heavy rows stay well below the separate 2 MB row limit.
// Two customers and escaped metadata make a files:[] or raw-SUM oracle fail.
export function fileUploadHeaderFixture(core,{target=FILE_HEADER_COPY_LIMIT,layout='cjk',photo=false,actor=FILE_HEADER_FIXTURE_ACTOR,space='live',revision=9,fileCount=layout==='metadata'?16:7,targetFiles=3,eventCount}={}){
 const at=FILE_HEADER_FIXTURE_AT,state=core.emptyState();state.version=revision;state.settings.owners=['Fiktivt filarbetsansvar'];
 const owner=state.settings.owners[0],customerId='synthetic-header-upload-customer',dealId='synthetic-header-upload-deal';
 state.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv filkopiekund Å😀',owner})];
 const unit=layout==='emoji'?'😀':layout==='ascii'?'A':'界',width=fileUploadUtf8Bytes(unit);
 const count=eventCount??(layout==='metadata'?3:Math.max(3,Math.ceil(target/(50000*width/unit.length))+8));
 state.events=Array.from({length:count},(_,i)=>({id:'synthetic-header-event-'+String(i).padStart(5,'0'),customerId,dealId:'',text:'',at,kind:'note'}));
 if(count){state.events[0].text='Å😀 "citat" \\ rad\nbevarad\t\u0000 '+layout+' ';state.events[0].actor={id:'synthetic-original-header-actor',name:'Fiktiv ursprunglig kollega Å😀'};state.events[0].note={title:'Fiktivt bevarat underlag "ö" \\ 😀',meetingDate:'',sourceFiles:[]};}
 if(photo){
  state.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Fiktiv faktisk arbetskoppling'})];
  state.orders=[core.OrderSchema.parse({id:'synthetic-header-upload-order',customerId,dealId,owner,stage:'production',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:'',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat orderunderlag',production:{status:'submitted',workId:'synthetic-header-upload-work',instructions:'Fiktivt arbetsfoto',lines:[]}})];
 }
 const oldFiles=Array.from({length:fileCount},(_,i)=>{
  const fileCustomer=i<targetFiles?customerId:'synthetic-header-other-customer-'+Math.floor((i-targetFiles)/190);
  if(!state.customers.some(row=>row.id===fileCustomer))state.customers.push(core.CustomerSchema.parse({id:fileCustomer,name:'Fiktiv annan filkund '+i,owner}));
  const id='synthetic-header-file-'+String(i).padStart(5,'0'),metadata={id,name:'fiktiv-bevarad-Å😀-"ö"-'+i+'.pdf',version:'bevarad "ö" \\ 😀',kind:'document',size:pdf.length,at,uploadedBy:'Fiktiv tidigare kollega Å😀 "ö" \\ \n\t\u0000 '};
  return {id,space,customer_id:fileCustomer,object_key:space+'/'+fileCustomer+'/'+id,data:JSON.stringify(metadata)};
 });
 core.normalizeState(state);
 const entry={state,oldFiles,space,layout,photo,name:photo?'fiktivt-arbetsfoto-Å😀.png':'fiktivt-underlag-Å😀.pdf',kind:photo?'document':'proof',version:'  fiktiv "ö" \\ 😀\nversion  ',bytes:(photo?png:pdf).slice(),fileCount,targetFiles,actor};
 let remaining=target-fileUploadProjection(core,entry,{actor}).bytes;assert.ok(remaining>=0,'Fixture target contains its full metadata/audit overhead');
 if(layout==='metadata'){
  const metadata=oldFiles.map(row=>JSON.parse(row.data));
  for(const row of metadata){const n=Math.min(499000-row.uploadedBy.length,Math.floor(remaining/width));row.uploadedBy+=unit.repeat(n);remaining-=n*width;}
  for(const row of metadata){const n=Math.min(499000-row.uploadedBy.length,remaining);row.uploadedBy+='H'.repeat(n);remaining-=n;}
  oldFiles.forEach((row,i)=>{row.data=JSON.stringify(metadata[i]);assert.ok(fileUploadUtf8Bytes(row.data)<1800000,'Synthetic metadata row independently fits 2 MB');});
 }else{
  for(const row of state.events){const n=Math.min(Math.floor((50000-row.text.length)/unit.length),Math.floor(remaining/width));row.text+=unit.repeat(n);remaining-=n*width;}
  for(const row of state.events){const n=Math.min(50000-row.text.length,remaining);row.text+='H'.repeat(n);remaining-=n;}
 }
 assert.equal(remaining,0,'Fixture can fill the requested exact byte boundary');assert.ok(state.events.every(row=>row.text.length<=50000));
 entry.projection=fileUploadProjection(core,entry,{actor});assert.equal(entry.projection.bytes,target);
 entry.sourceHeaderBytes=fileUploadUtf8Bytes(fileUploadHeader(state,oldFiles.map(row=>({customerId:row.customer_id,metadata:JSON.parse(row.data)})),{space}));
 entry.totalFileBytes=fileCount*pdf.length+entry.bytes.length;
 assert.ok(entry.sourceHeaderBytes<target);assert.ok(entry.totalFileBytes<10000000,'Fixture isolates header bytes from the JSON 10 MB payload limit');
 return entry;
}

export async function verifyFileUploadHeaderBudget({sourceRoot=resolve('.'),baseline=false,evidencePath,denialEvidencePath}={}){
 const startedAt=new Date().toISOString(),started=performance.now(),root=resolve(sourceRoot),work=resolve('work');mkdirSync(work,{recursive:true});
 const helperPath=fileURLToPath(import.meta.url),helperInput=readFileSync(helperPath),dependencyInputs=Object.fromEntries(['package.json','pnpm-lock.yaml'].map(file=>[file,readFileSync(resolve(root,file))]));
 const directory=mkdtempSync(resolve(work,'file-upload-header-')),sources=new Map(),compiled=new Map();
 function compile(file){
  if(compiled.has(file))return compiled.get(file).target;
  assert.ok(file.startsWith('lib/')||['app/api/crm/route.ts','app/api/crm/files/route.ts','app/api/crm/backup/route.ts'].includes(file));
  const input=readFileSync(resolve(root,file)),target=resolve(directory,file.replace(/\.ts$/,'.mjs'));sources.set(file,input);compiled.set(file,{target,moduleSha256:null});
  const source=input.toString('utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__crmEnv;");
  let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('.'))dependency=compile(relative(root,resolve(dirname(resolve(root,file)),specifier)).split(sep).join('/')+'.ts');else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);compiled.get(file).moduleSha256=hash(output);return target;
 }
 const fixed=()=>{
  assert.equal(hash(readFileSync(helperPath)),hash(helperInput),'Actual helper remained fixed');
  for(const[file,input]of Object.entries(dependencyInputs))assert.equal(hash(readFileSync(resolve(root,file))),hash(input),'Actual dependency input remained fixed: '+file);
  for(const[file,input]of sources)assert.equal(hash(readFileSync(resolve(root,file))),hash(input),'Actual source remained fixed: '+file);
  for(const[file,row]of compiled)assert.equal(hash(readFileSync(row.target)),row.moduleSha256,'Actual compiled module remained fixed: '+file);
 };
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 const migrations=Object.fromEntries(readdirSync(resolve(root,'drizzle')).filter(file=>file.endsWith('.sql')).sort().map(file=>['drizzle/'+file,readFileSync(resolve(root,'drizzle',file))]));for(const input of Object.values(migrations))sqlite.exec(input.toString('utf8'));
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const originals=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),cryptoUuidDescriptor=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
 const objects=new Map();let requests=0,trace=[],afterCapacity=null,afterReadSnapshot=null,beforeCommit=null,afterCommit=null,loseAck=false,loseLookupAck=false,unavailableCommit=false,unavailableSnapshot=false;
 let lostAcks=0,lostLookups=0,rollbacks=0;
 const objectCopy=row=>({bytes:row.bytes.slice(),httpMetadata:structuredClone(row.httpMetadata),customMetadata:structuredClone(row.customMetadata)});
 const snapshot=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,row])=>[key,objectCopy(row)]))});
 const same=(actual,expected,label)=>assert.equal(hash(serializeSnapshot(actual)),hash(serializeSnapshot(expected)),label);
 const serializeSnapshot=value=>JSON.stringify({tables:value.tables,r2:[...value.r2].map(([key,row])=>[key,{sha256:hash(row.bytes),bytes:row.bytes.length,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}])});
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){
   const result=sqlite.prepare(this.sql).get(...this.values)||null;
   if(this.sql.startsWith('SELECT version')&&this.sql.includes(' AS customer_count')){trace.push({stage:'capacity',version:result?.version,eventCount:result?.event_count,fileCount:result?.file_count,customerCount:result?.customer_count});if(afterCapacity){const hook=afterCapacity;afterCapacity=null;await hook();}}
   if(this.sql==='SELECT id FROM crm_files WHERE object_key=?'){trace.push({stage:'outcome',key:this.values[0],committed:!!result});if(loseLookupAck){loseLookupAck=false;lostLookups++;throw Error('Synthetic outcome lookup ACK lost');}}
   return result;
  }
  async all(){return this.exec();}async run(){trace.push({stage:'direct_write'});return this.exec();}
  exec(){const statement=sqlite.prepare(this.sql);return statement.columns().length?{success:true,results:statement.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const mutating=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token='),fullSnapshot=!mutating&&statements.some(row=>/^SELECT customer_id\s*,\s*data FROM crm_files/.test(row.sql));
  if(fullSnapshot){trace.push({stage:'full_snapshot_before'});if(unavailableSnapshot){unavailableSnapshot=false;throw Error('Synthetic read-only batch unavailable');}}
  if(mutating){trace.push({stage:'commit_before',statements:statements.length});if(beforeCommit){const hook=beforeCommit;beforeCommit=null;await hook();}if(unavailableCommit){unavailableCommit=false;throw Error('Synthetic commit unavailable');}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(row=>row.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');if(mutating){rollbacks++;trace.push({stage:'commit_rollback'});}throw error;}
  if(fullSnapshot){trace.push({stage:'full_snapshot_after',version:result[0].results[0]?.version,statements:statements.length,files:result.at(-1).results.length});if(afterReadSnapshot){const hook=afterReadSnapshot;afterReadSnapshot=null;await hook();}}
  if(mutating){trace.push({stage:'commit_after',changes:result.map(row=>row.meta.changes)});if(afterCommit){const hook=afterCommit;afterCommit=null;await hook();}if(loseAck){loseAck=false;lostAcks++;throw Error('Synthetic COMMIT ACK lost');}}
  return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{
  get:async key=>{const row=objects.get(key);trace.push({stage:'r2_get',key});if(!row)return null;const bytes=row.bytes.slice();return {size:bytes.length,httpMetadata:structuredClone(row.httpMetadata),customMetadata:structuredClone(row.customMetadata),arrayBuffer:async()=>bytes.slice().buffer,body:new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}})};},
  put:async(key,input,options={})=>{const bytes=new Uint8Array(await new Response(input).arrayBuffer());objects.set(key,{bytes,httpMetadata:structuredClone(options.httpMetadata||{}),customMetadata:structuredClone(options.customMetadata||{})});trace.push({stage:'r2_put',key,bytes:bytes.length});},
  delete:async key=>{trace.push({stage:'r2_delete',key});objects.delete(key);}
 }};
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-file-header-member-'+role,user_id:'synthetic-file-header-user-'+role,email:'synthetic-file-header-'+role+'@example.test',name:role==='admin'?FILE_HEADER_FIXTURE_ACTOR.name:'Annan fiktiv filskribent Å😀',role:role==='other'?'admin':role,owner:'',active:1})),actor=accounts[0];
 const identity=user=>({'oai-authenticated-user-id':user.user_id,'oai-authenticated-user-email':user.email});
 const resetTrace=()=>{trace=[];afterCapacity=afterReadSnapshot=beforeCommit=afterCommit=null;loseAck=loseLookupAck=unavailableCommit=unavailableSnapshot=false;};
 const report={startedAt,sourceRoot:root,syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLiteTransactions:true,rawTables:tables.length,headerLimit:FILE_HEADER_COPY_LIMIT,requests:0,cases:[],actualBudgetDenials:[],persistentFileReplay:false,hostedProductionWriteVerified:false,personnelAcceptance:false,jsonTotalAndBase64Guarantee:false,restoreAuditRoomGuarantee:false};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  Object.defineProperty(crypto,'randomUUID',{configurable:true,writable:true,value:()=>{const id=randomUUID();trace.push({stage:'uuid',id});return id;}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),filesApi=await import(pathToFileURL(compile('app/api/crm/files/route.ts')).href),crmApi=await import(pathToFileURL(compile('app/api/crm/route.ts')).href),backupApi=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href),backup=await import(pathToFileURL(compile('lib/crm-backup.ts')).href);
  const insert=(table,row)=>{const columns=Object.keys(row);sqlite.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').run(...columns.map(key=>row[key]));};
  const seedEntities=(space,state)=>{for(const name of store.names)for(const item of state[name]){const row=store.crmEntityStorageRow(space,name,item);sqlite.prepare('INSERT INTO '+row.table+'('+row.columns.join(',')+')VALUES('+row.columns.map(()=>'?').join(',')+')').run(...row.values);}};
  const privateSentinel='SYNTHETIC PRIVATE FILE HEADER SENTINEL',outside=core.emptyState();outside.settings.owners=['Fiktivt bevarat ansvar'];const owner=outside.settings.owners[0],customerId='synthetic-outside-header-customer',dealId='synthetic-outside-header-deal',at=FILE_HEADER_FIXTURE_AT;
  outside.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv bevarad kund',owner})];outside.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Fiktiv bevarad affär'})];
  outside.orders=[core.OrderSchema.parse({id:'synthetic-outside-header-order',customerId,dealId,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt bevarat underlag'})];
  outside.tasks=[core.TaskSchema.parse({id:'synthetic-outside-header-task',customerId,dealId,owner,title:'Fiktiv bevarad uppgift',due:'2026-11-01'})];outside.meetings=[core.MeetingSchema.parse({id:'synthetic-outside-header-meeting',customerId,owner,title:'Fiktivt bevarat möte',date:'2026-11-01',time:'10:00',duration:30})];outside.events=[{id:'synthetic-outside-header-event',customerId,dealId:'',text:'Fiktiv bevarad historik',at,kind:'note'}];
  outside.articles=[ops.ArticleSchema.parse({id:'synthetic-outside-header-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];outside.notices=[ops.NoticeSchema.parse({id:'synthetic-outside-header-notice',title:'Fiktiv notis',audience:'team',at})];outside.leads=[ops.LeadSchema.parse({id:'synthetic-outside-header-lead',name:'Fiktivt prospekt',source:'synthetic'})];outside.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-outside-header-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const space of ['demo','live'])insert('crm_spaces',{id:space,version:9,write_token:'SYNTHETIC-UNTOUCHED',settings:JSON.stringify(outside.settings)});seedEntities('demo',outside);for(const user of accounts)insert('crm_members',user);
  insert('crm_mutations',{space:'demo',id:randomUUID(),result_json:' {"private":"'+privateSentinel+'"}\n',user_id:actor.user_id,request_hash:'0'.repeat(64)});
  for(const space of ['demo','live'])for(const user of accounts.slice(0,2))insert('crm_drafts',{space,user_id:user.user_id,id:'synthetic-header-private-'+space+'-'+user.id,kind:'note',context:customerId,revision:3,request_id:randomUUID(),title:'Fiktivt privat utkast',data:' {"text":"  '+privateSentinel+'"}\n',archived:0,updated_at:at});
  for(const user of accounts.slice(0,2)){insert('outlook_connections',{user_id:user.user_id,microsoft_id:'synthetic-header-ms-'+user.id,email:user.email,tokens:privateSentinel,last_sync:at});for(const shared of [0,1])insert('outlook_items',{id:'synthetic-header-mail-'+user.id+'-'+shared,user_id:user.user_id,kind:'mail',data:' {"body":"'+privateSentinel+'"}\n',customer_id:customerId,deal_id:'',shared,happened_at:at,seen_at:at});insert('outlook_oauth_states',{hash:'synthetic-header-oauth-'+user.id,user_id:user.user_id,verifier:privateSentinel,expires:1999999999000});}
  const outsideMetadata={id:'synthetic-outside-header-file',name:'fiktiv-private.pdf',version:'v1',kind:'document',size:pdf.length,at,uploadedBy:'Fiktiv bevarad filskribent'};
  insert('crm_files',{id:outsideMetadata.id,space:'demo',customer_id:customerId,object_key:'synthetic-header-outside-r2',data:JSON.stringify(outsideMetadata)});
  objects.set('synthetic-header-outside-r2',{bytes:pdf.slice(),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'outside'}});objects.set('synthetic-header-private-r2',{bytes:new TextEncoder().encode(privateSentinel+'\n\0 Å😀'),httpMetadata:{contentType:'text/plain'},customMetadata:{synthetic:'private'}});
  const initial=snapshot();assert.ok(tables.every(table=>initial.tables[table].length>0),'All 18 migrated tables contain positive sentinels');report.allTablesPositive=true;
  const fixture=options=>fileUploadHeaderFixture(core,options);
  const seed=entry=>{
   const oldKeys=sqlite.prepare('SELECT object_key FROM crm_files WHERE space=?').all(entry.space).map(row=>row.object_key);for(const key of oldKeys)objects.delete(key);
   sqlite.exec('BEGIN');try{sqlite.prepare('DELETE FROM crm_files WHERE space=?').run(entry.space);for(const name of [...store.names].reverse())sqlite.prepare('DELETE FROM '+store.tables[name]+' WHERE space=?').run(entry.space);seedEntities(entry.space,entry.state);for(const row of entry.oldFiles){insert('crm_files',row);objects.set(row.object_key,{bytes:pdf.slice(),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'preserved-header-file'}});}sqlite.prepare("UPDATE crm_spaces SET version=?,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id=?").run(entry.state.version,JSON.stringify(entry.state.settings),entry.space);sqlite.prepare('UPDATE crm_members SET active=1').run();sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}resetTrace();
  };
  const upload=async(entry,{user=actor,authenticated=true,requestOrigin=origin,workId=entry.state.orders[0]?.production.workId||''}={})=>{
   const form=new FormData();form.set('space',entry.space);form.set('customerId',entry.state.customers[0].id);form.set('version',entry.version);form.set('kind',entry.kind);form.set('file',new File([entry.bytes],entry.name));if(entry.photo){form.set('purpose','production');form.set('orderId',entry.state.orders[0].id);form.set('workId',workId);}
   requests++;const response=await filesApi.POST(new Request(origin+'/api/crm/files',{method:'POST',headers:{...(authenticated?identity(user):{}),Origin:requestOrigin},body:form}));const data=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!JSON.stringify(data).includes(privateSentinel));return {status:response.status,data};
  };
  const get=async(entry)=>{requests++;const response=await crmApi.GET(new Request(origin+'/api/crm?space='+entry.space,{headers:identity(actor)}));assert.equal(response.status,200);return stripViewer(await response.json());};
  const noStaging=(uuids,label)=>{assert.equal(trace.filter(row=>row.stage==='uuid').length,uuids,label+' UUID count');assert.equal(trace.filter(row=>['r2_put','r2_delete','commit_before','outcome','direct_write'].includes(row.stage)).length,0,label+' precedes object ownership, R2, SQL writes and outcome lookup');};
  const preserved=(before,after,{space='live',allowed=[]}={})=>{
   for(const table of tables){const untouched=rows=>allowed.includes(table)?rows.filter(row=>table==='crm_spaces'?row.id!==space:table==='crm_members'?row.id!==actor.id:row.space!==space):rows;assert.equal(hash(JSON.stringify(untouched(after.tables[table]))),hash(JSON.stringify(untouched(before.tables[table]))),table+' outside/private raw rows preserved');}
   for(const[key,row]of before.r2)assert.equal(hash(JSON.stringify({...objectCopy(after.r2.get(key)),bytes:[...after.r2.get(key).bytes]})),hash(JSON.stringify({...objectCopy(row),bytes:[...row.bytes]})),'Original R2 content/metadata preserved: '+key);
  };
  const saved=async(entry,response,before,{user=actor}={})=>{
   assert.equal(response.status,200,response.data.error);const metadata=response.data;assert.match(metadata.id,/^[0-9a-f-]{36}$/);assert.match(metadata.at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
   const after=snapshot(),oldIds=new Set(before.tables.crm_events.filter(row=>row.space===entry.space).map(row=>row.id)),newEvents=after.tables.crm_events.filter(row=>row.space===entry.space&&!oldIds.has(row.id));assert.equal(newEvents.length,1);const event=JSON.parse(newEvents[0].data);
   const expected=fileUploadProjection(core,entry,{actor:{id:user.user_id,name:user.name},timestamp:metadata.at,id:metadata.id,eventId:event.id});assert.deepEqual(metadata,expected.metadata);assert.deepEqual(event,expected.event);assert.match(event.id,/^[0-9a-f-]{36}$/);
   preserved(before,after,{space:entry.space,allowed:['crm_spaces','crm_files','crm_events']});
   const oldSpace=before.tables.crm_spaces.find(row=>row.id===entry.space),newSpace=after.tables.crm_spaces.find(row=>row.id===entry.space);assert.equal(newSpace.version,oldSpace.version+1);assert.equal(newSpace.settings,oldSpace.settings);assert.match(newSpace.write_token,/^[0-9a-f-]{36}$/);
   const rows=after.tables.crm_files.filter(row=>row.space===entry.space),row=rows.find(row=>row.id===metadata.id),key=entry.space+'/'+entry.state.customers[0].id+'/'+metadata.id;assert.equal(rows.length,entry.oldFiles.length+1);assert.equal(row.data,JSON.stringify(expected.metadata));assert.equal(row.object_key,key);assert.equal(row.customer_id,entry.state.customers[0].id);assert.equal(after.r2.size,before.r2.size+1);assert.equal(hash(after.r2.get(key).bytes),hash(entry.bytes));sameJson(after.r2.get(key).httpMetadata,{contentType:'application/octet-stream'},'New R2 HTTP metadata');sameJson(after.r2.get(key).customMetadata,{},'New R2 custom metadata');
   const fileMap=new Map(after.tables.crm_files.map(row=>[row.space+'\0'+row.id,row])),eventMap=new Map(after.tables.crm_events.map(row=>[row.space+'\0'+row.id,row]));for(const row of before.tables.crm_files)assert.equal(hash(JSON.stringify(fileMap.get(row.space+'\0'+row.id))),hash(JSON.stringify(row)),'Every original file row preserved');for(const row of before.tables.crm_events)assert.equal(hash(JSON.stringify(eventMap.get(row.space+'\0'+row.id))),hash(JSON.stringify(row)),'Every original event row preserved');
   const state=await get(entry),ordered=value=>({...value,...Object.fromEntries(store.names.map(name=>[name,[...value[name]].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)]))});sameJson(ordered(state),ordered(expected.state),'Actual read has every independently projected record');return {metadata,event,key,after,state,headerBytes:expected.bytes};
  };
  const copies=async(entry,{expectedHeaderBytes,streamStatus=200}={})=>{
   const before=snapshot(),state=await get(entry),rows=before.tables.crm_files.filter(row=>row.space===entry.space).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),descriptors=rows.map(row=>({customerId:row.customer_id,metadata:JSON.parse(row.data)}));
   const read=restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state},true);backup.validateBackupFiles(read,descriptors,Infinity);
   const headerBytes=fileUploadUtf8Bytes(fileUploadHeader(state,descriptors,{space:entry.space}));if(expectedHeaderBytes!==undefined)assert.equal(headerBytes,expectedHeaderBytes);
   const result={};
   for(const format of ['stream','json']){
    requests++;const response=await backupApi.GET(new Request(origin+'/api/crm/backup?space='+entry.space+(format==='stream'?'&format=stream':''),{headers:identity(actor)}));const text=await response.text();assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!text.includes(privateSentinel));
    if(format==='stream'){
     assert.equal(response.status,streamStatus,'Actual NDJSON header response');
     if(streamStatus!==200){assert.deepEqual(JSON.parse(text),{error:'CRM-data och filförteckning får vara högst 16 MB.'});result.stream={status:response.status,headerBytes};continue;}
     const lines=text.split('\n');assert.equal(lines.at(-1),'');assert.equal(lines.length,rows.length+3);const header=JSON.parse(lines[0]);sameJson(header,fileUploadHeader(state,descriptors,{space:entry.space,exportedAt:header.exportedAt}),'Independent NDJSON envelope/state/descriptors');assert.equal(fileUploadUtf8Bytes(lines[0]),headerBytes);sameJson(backup.BackupStreamHeader.parse(header),header,'Existing stream header reader accepts the exact header');assert.equal(Number(response.headers.get('X-Magnussons-Backup-Length')),fileUploadUtf8Bytes(text));
     let digest=hash(lines[0]),payloadBytes=0;for(let i=0;i<rows.length;i++){const record=JSON.parse(lines[i+1]),object=before.r2.get(rows[i].object_key);assert.equal(record.type,'file');assert.equal(record.id,rows[i].id);assert.equal(record.sha256,hash(object.bytes));assert.equal(hash(Buffer.from(record.content,'base64')),hash(object.bytes),'Every original/new file body is byte exact');digest=hash(digest+':'+hash(lines[i+1]));payloadBytes+=object.bytes.length;}
     assert.deepEqual(JSON.parse(lines.at(-2)),{type:'end',files:rows.length,bytes:payloadBytes,sha256:digest});result.stream={status:200,headerBytes,totalBytes:fileUploadUtf8Bytes(text),files:rows.length,payloadBytes,readerAccepted:true,fullEndDigestVerified:true};
    }else{
     const expected={format:'magnussons-crm-backup-1',exportedAt:FILE_HEADER_FIXTURE_AT,sourceSpace:entry.space,state,files:descriptors.map((descriptor,i)=>({...descriptor,content:Buffer.from(before.r2.get(rows[i].object_key).bytes).toString('base64'),sha256:hash(before.r2.get(rows[i].object_key).bytes)}))},expectedBytes=fileUploadUtf8Bytes(expected);assert.equal(response.status,expectedBytes>FILE_HEADER_COPY_LIMIT?400:200,'JSON has its distinct total/base64 envelope');
     if(response.status===400)assert.deepEqual(JSON.parse(text),{error:'CRM-kopian är större än 16 MB. Ingen ofullständig kopia skapas.'});else{const copy=JSON.parse(text);expected.exportedAt=copy.exportedAt;sameJson(copy,expected,'Independent legacy JSON envelope and file payloads');assert.equal(fileUploadUtf8Bytes(text),expectedBytes);}result.json={status:response.status,totalBytes:expectedBytes,separateTotalBudget:true};
    }
   }
   same(snapshot(),before,'Export is read-only across all 18 raw tables and R2');return result;
  };
  const deny=async(entry,label,{status=400,error=FILE_HEADER_COPY_ERROR,uuids=2,...options}={})=>{
   seed(entry);const before=snapshot(),response=await upload(entry,options);assert.equal(response.status,status,label+' '+response.data.error);if(error)assert.deepEqual(response.data,{error});noStaging(uuids,label);same(snapshot(),before,'Denial preserves all 18 raw tables and R2');
   const record={label,status,sourceHeaderBytes:entry.sourceHeaderBytes,projectedHeaderBytes:entry.projection.bytes,uuids,noOwnedStagingOrOutcome:true,all18TablesAndR2Unchanged:true};report.cases.push(record);
   if(error===FILE_HEADER_COPY_ERROR){report.actualBudgetDenials.push({...record,response});if(denialEvidencePath&&report.actualBudgetDenials.length===1)writeFileSync(denialEvidencePath,JSON.stringify({syntheticOnly:true,actualAuthenticatedNodeHandler:true,...record,response},null,2)+'\n',{mode:0o600});}return response;
  };
  if(baseline){
   for(const photo of [false,true]){const entry=fixture({target:FILE_HEADER_COPY_LIMIT+1,photo});assert.ok(entry.sourceHeaderBytes<FILE_HEADER_COPY_LIMIT);seed(entry);const initialCopies=await copies(entry,{expectedHeaderBytes:entry.sourceHeaderBytes}),before=snapshot();resetTrace();const response=await upload(entry),actual=await saved(entry,response,before);assert.equal(actual.headerBytes,FILE_HEADER_COPY_LIMIT+1);const exported=await copies(entry,{expectedHeaderBytes:FILE_HEADER_COPY_LIMIT+1,streamStatus:400});report.cases.push({label:(photo?'production photo':'ordinary file')+' baseline commits one-byte-over full header',status:200,sourceHeaderBytes:entry.sourceHeaderBytes,actualHeaderBytes:actual.headerBytes,initialCopies,exports:exported,preservedOriginalRowsAndR2:true});}
  }else{
   for(const[layout,photo]of[['cjk',false],['emoji',false],['metadata',false],['cjk',true]]){
    const entry=fixture({layout,photo,target:FILE_HEADER_COPY_LIMIT});seed(entry);const before=snapshot(),response=await upload(entry),actual=await saved(entry,response,before);assert.equal(actual.headerBytes,FILE_HEADER_COPY_LIMIT);assert.equal(trace.filter(row=>row.stage==='uuid').length,3);assert.deepEqual(trace.filter(row=>row.stage==='commit_after').map(row=>row.changes),[[1,1,1]]);const exports=await copies(entry,{expectedHeaderBytes:FILE_HEADER_COPY_LIMIT});report.cases.push({label:layout+(photo?' production photo':' ordinary file')+' exact 16MB accepts',status:200,sourceHeaderBytes:entry.sourceHeaderBytes,actualHeaderBytes:actual.headerBytes,nextRevision:10,exports,preservedOriginalRowsAndR2:true});
    await deny(fixture({layout,photo,target:FILE_HEADER_COPY_LIMIT+1}),layout+(photo?' production photo':' ordinary file')+' one byte over denies');
   }
   // Tiny payloads make this solely a full-header limit; omitted existing
   // descriptors, a pre-audit state or revision 9 all incorrectly fit.
   const omissions=fixture({target:FILE_HEADER_COPY_LIMIT+1});assert.ok(fileUploadUtf8Bytes(fileUploadHeader(omissions.projection.state,[]))<FILE_HEADER_COPY_LIMIT);assert.ok(fileUploadUtf8Bytes(fileUploadHeader({...omissions.projection.state,events:omissions.state.events},omissions.projection.files))<FILE_HEADER_COPY_LIMIT);assert.equal(fileUploadUtf8Bytes(fileUploadHeader({...omissions.projection.state,version:9},omissions.projection.files)),FILE_HEADER_COPY_LIMIT);report.independentOmissionOracles={existingDescriptorsRequired:true,newAuditRequired:true,nextRevisionRequired:true};
   const compact=fixture({target:20000});
   for(const user of accounts.filter(user=>['admin','seller'].includes(user.role)&&user.id!==accounts[1].id)){const entry=fixture({target:20000,actor:{id:user.user_id,name:user.name}});seed(entry);const before=snapshot(),response=await upload(entry,{user});await saved(entry,response,before,{user});report.cases.push({label:user.role+' ordinary upload allowed',status:200});}
   for(const user of accounts.filter(user=>['admin','production','print','warehouse'].includes(user.role)&&user.id!==accounts[1].id)){const entry=fixture({target:20000,photo:true,actor:{id:user.user_id,name:user.name}});seed(entry);const before=snapshot(),response=await upload(entry,{user});await saved(entry,response,before,{user});report.cases.push({label:user.role+' linked photo allowed',status:200});}
   for(const user of accounts.filter(user=>['reader','production','print','warehouse'].includes(user.role)))await deny(compact,user.role+' ordinary upload forbidden before snapshot',{user,status:403,error:null,uuids:0});
   await deny(fixture({target:20000,photo:true}),'seller photo forbidden',{user:accounts.find(user=>user.role==='seller'),status:403,error:'Du kan inte lägga till ett arbetsfoto.',uuids:0});await deny(compact,'unauthenticated upload denied',{authenticated:false,status:401,error:null,uuids:0});await deny(compact,'foreign origin upload denied',{requestOrigin:'https://other.test',status:403,error:'Ogiltigt ursprung.',uuids:0});await deny(fixture({target:20000,photo:true}),'stale work rejected before snapshot',{workId:'synthetic-wrong-work',status:409,error:'Välj en aktiv arbetsorder med aktuellt underlag.',uuids:0});
   // Fast scalar guards keep their order and avoid the new full-state read.
   for(const[customerFiles,events,files,error]of[[200,50000,2000,'Kunden har nått gränsen 200 filer.'],[199,50000,2000,'Filen skulle göra CRM-historiken för stor för dataexport (högst 50 000 händelser). Ingen ny fil har sparats. Bevara filen och kontakta administratören.'],[199,3,2000,'Filen skulle göra CRM-kopian för stor (högst 2 000 kundfiler). Ingen ny fil har sparats. Bevara filen och kontakta administratören.']]){
    const entry=fixture({target:20000000,layout:'metadata',fileCount:files,targetFiles:customerFiles,eventCount:events});seed(entry);const before=snapshot(),response=await upload(entry);assert.equal(response.status,400);assert.deepEqual(response.data,{error});noStaging(0,'Original count denial');assert.equal(trace.filter(row=>row.stage==='full_snapshot_before').length,0);same(snapshot(),before,'Original count priority remains atomic and read-only');report.cases.push({label:'customer/history/global priority retained',customerFiles,events,files,status:400,uuids:0,noFullStateRead:true});
   }
   // Same customer ID in another workspace cannot enter this header. Its
   // metadata would alone push this exact fit over the byte boundary.
   const scoped=fixture({target:FILE_HEADER_COPY_LIMIT});seed(scoped);const scopedCustomer=core.CustomerSchema.parse({...scoped.state.customers[0],name:'Fiktiv samma kund-ID i annan arbetsyta'});const scopedRow=store.crmEntityStorageRow('demo','customers',scopedCustomer);sqlite.prepare('INSERT INTO '+scopedRow.table+'('+scopedRow.columns.join(',')+')VALUES('+scopedRow.columns.map(()=>'?').join(',')+')').run(...scopedRow.values);const foreignMetadata={id:'synthetic-header-foreign-file',name:'fiktiv-annan-arbetsyta.pdf',version:'v1',kind:'document',size:pdf.length,at,uploadedBy:'Fiktiv främmande '+ '界'.repeat(10000)},foreignKey='demo/'+scopedCustomer.id+'/'+foreignMetadata.id;insert('crm_files',{id:foreignMetadata.id,space:'demo',customer_id:scopedCustomer.id,object_key:foreignKey,data:JSON.stringify(foreignMetadata)});objects.set(foreignKey,{bytes:pdf.slice(),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'foreign'}});const scopedBefore=snapshot(),scopedResponse=await upload(scoped);await saved(scoped,scopedResponse,scopedBefore);report.cases.push({label:'exact live header excludes demo same-customer metadata',status:200,foreignMetadataBytes:fileUploadUtf8Bytes(foreignMetadata),allForeignRawRowsAndR2Preserved:true});
   // A winner between scalar capacities and the full read must not silently
   // become this request's new CAS baseline or reserve another UUID/object.
   for(const growth of ['state','files']){
    const entry=fixture({target:20000});seed(entry);let expected;
    afterCapacity=async()=>{if(growth==='state'){const row=sqlite.prepare('SELECT data FROM crm_events WHERE space=? AND id=?').get(entry.space,entry.state.events[0].id),event=JSON.parse(row.data);event.text+='H';sqlite.prepare('UPDATE crm_events SET data=? WHERE space=? AND id=?').run(JSON.stringify(event),entry.space,event.id);sqlite.prepare('UPDATE crm_spaces SET version=version+1 WHERE id=?').run(entry.space);}else{const winner=await upload({...entry,name:'fiktiv-oberoende-vinnare.pdf'});assert.equal(winner.status,200);}expected=snapshot();};
    const response=await upload(entry);assert.equal(response.status,409);assert.deepEqual(response.data,{error:FILE_HEADER_CONFLICT_ERROR});assert.ok(expected);same(snapshot(),expected,'Stale request preserves exactly the concurrent winner');const capacity=trace.find(row=>row.stage==='capacity');assert.equal(capacity.version,9);assert.ok(trace.some(row=>row.stage==='full_snapshot_after'&&row.version===10));if(growth==='state')noStaging(0,'Stale revision before preflight');else{assert.equal(trace.filter(row=>row.stage==='uuid').length,3);assert.equal(trace.filter(row=>row.stage==='r2_put').length,1);assert.equal(trace.filter(row=>row.stage==='commit_before').length,1);}report.cases.push({label:growth+' growth between capacity and atomic full read',status:409,noImplicitRebase:true,noLosingObjectStaged:true});
   }
   // A race after the atomic read is handled by the unchanged write CAS.
   const racing=fixture({target:FILE_HEADER_COPY_LIMIT});seed(racing);const racingBefore=snapshot();let winnerAfter,winner;
   afterReadSnapshot=async()=>{winner=await upload({...racing,name:'fiktiv-vinnare.pdf'});assert.equal(winner.status,200);winnerAfter=snapshot();};
   const loser=await upload(racing);assert.equal(loser.status,409);assert.deepEqual(loser.data,{error:FILE_HEADER_CONFLICT_ERROR});same(snapshot(),winnerAfter,'Only actual competing upload survives CAS conflict');preserved(racingBefore,snapshot(),{allowed:['crm_spaces','crm_files','crm_events']});const staged=trace.filter(row=>row.stage==='r2_put'),removed=trace.filter(row=>row.stage==='r2_delete');assert.equal(staged.length,2);assert.equal(removed.length,1);assert.equal(removed[0].key,staged.find(row=>!winnerAfter.tables.crm_files.some(file=>file.object_key===row.key)).key);assert.ok(trace.some(row=>row.stage==='commit_after'&&row.changes.every(n=>n===0)));report.cases.push({label:'actual post-snapshot upload race loses CAS and cleans only own object',status:409,winnerStatus:200,ownedCleanupOnly:true});
   for(const mode of ['role','work']){
    const entry=fixture({target:20000,photo:mode==='work'});seed(entry);let expected;
    beforeCommit=async()=>{if(mode==='role')sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(actor.id);else{const order=JSON.parse(sqlite.prepare('SELECT data FROM crm_orders WHERE space=? AND id=?').get(entry.space,entry.state.orders[0].id).data);order.production.workId='synthetic-independent-work';sqlite.prepare('UPDATE crm_orders SET data=? WHERE space=? AND id=?').run(JSON.stringify(order),entry.space,order.id);}expected=snapshot();for(const row of trace.filter(row=>row.stage==='r2_put'))expected.r2.delete(row.key);};
    const response=await upload(entry);assert.equal(response.status,mode==='role'?403:409);assert.ok(expected);same(snapshot(),expected,'Commit authorization/order drift preserves only independent change');assert.deepEqual(trace.filter(row=>row.stage==='commit_after').map(row=>row.changes),[[0,0,0]]);assert.equal(trace.filter(row=>row.stage==='r2_delete').length,1);report.cases.push({label:mode+' drift retains unchanged commit gate and own cleanup',status:response.status});
   }
   // Malformed private full-state/metadata values never enter operational
   // users' error text. Internal validation is generic; D1 read failure503.
   for(const corruption of ['settings','entity','metadata'])for(const user of accounts.filter(row=>['production','print','warehouse'].includes(row.role))){
    const entry=fixture({target:20000,photo:true});seed(entry);if(corruption==='settings')sqlite.prepare('UPDATE crm_spaces SET settings=? WHERE id=?').run('{"private":"'+privateSentinel+'"',entry.space);else if(corruption==='entity')sqlite.prepare('UPDATE crm_customers SET data=? WHERE space=? AND id=?').run(JSON.stringify({...entry.state.customers[0],owner:privateSentinel,ownerProfileId:privateSentinel}),entry.space,entry.state.customers[0].id);else sqlite.prepare('UPDATE crm_files SET data=? WHERE space=? AND id=?').run(JSON.stringify({...JSON.parse(entry.oldFiles[0].data),kind:privateSentinel}),entry.space,entry.oldFiles[0].id);
    const before=snapshot(),response=await upload(entry,{user});assert.equal(response.status,400);sameJson(response.data,{error:FILE_HEADER_INPUT_ERROR},'Internal validation response stays generic');noStaging(2,'Malformed internal snapshot');same(snapshot(),before,'Malformed snapshot leaves all raw data untouched');report.cases.push({label:'private '+corruption+' validation is generic for '+user.role+' role',status:400,privateValuesNotEchoed:true});
   }
   seed(compact);const unavailableBefore=snapshot();unavailableSnapshot=true;const unavailable=await upload(compact);assert.equal(unavailable.status,503);assert.deepEqual(unavailable.data,{error:'Filen kunde inte hanteras. Försök igen.'});noStaging(0,'Unavailable read-only batch');same(snapshot(),unavailableBefore,'DB read failure is read-only');report.cases.push({label:'full snapshot database failure stays503 before staging',status:503});
   // Keep existing cleanup/uncertain outcomes. Uploads have no persistent
   // request ledger: this lookup only proves this ongoing object's COMMIT.
   seed(compact);const rollbackBefore=snapshot();sqlite.exec("CREATE TRIGGER synthetic_header_atomic_failure BEFORE INSERT ON crm_events WHEN NEW.space='live' BEGIN SELECT RAISE(ABORT,'Synthetic header upload rollback'); END");try{const response=await upload(compact);assert.equal(response.status,503);assert.equal(trace.filter(row=>row.stage==='commit_rollback').length,1);assert.equal(trace.filter(row=>row.stage==='r2_delete').length,1);same(snapshot(),rollbackBefore,'Real SQLite-trigger rollback cleans only own staged object');report.cases.push({label:'actual SQL rollback preserves tables and cleans own R2',status:503});}finally{sqlite.exec('DROP TRIGGER synthetic_header_atomic_failure');}
   seed(compact);const ackBefore=snapshot();loseAck=true;const recovered=await upload(compact);await saved(compact,recovered,ackBefore);assert.ok(trace.some(row=>row.stage==='outcome'&&row.committed));assert.equal(trace.filter(row=>row.stage==='r2_delete').length,0);report.cases.push({label:'same ongoing request recovers committed metadata after lost ACK',status:200,noPersistentReplayClaim:true});
   for(const committed of [true,false]){
    seed(compact);const before=snapshot();loseLookupAck=true;if(committed)loseAck=true;else unavailableCommit=true;const response=await upload(compact);assert.equal(response.status,503);assert.deepEqual(response.data,{error:'Filen kunde inte hanteras. Försök igen.'});const stage=trace.find(row=>row.stage==='r2_put');assert.ok(stage);assert.equal(trace.filter(row=>row.stage==='r2_delete').length,0);assert.ok(snapshot().r2.has(stage.key));if(committed){const row=sqlite.prepare('SELECT data FROM crm_files WHERE object_key=?').get(stage.key);assert.ok(row);await saved(compact,{status:200,data:JSON.parse(row.data)},before);}else{const after=snapshot();after.r2.delete(stage.key);same(after,before,'Unverifiable uncommitted outcome retains only its staged object');}report.cases.push({label:'unknown commit/outcome retains own object',status:503,committed,ownedStagedObjectRetained:true});
   }
  }
  fixed();for(const[file,input]of Object.entries(migrations))assert.equal(hash(readFileSync(resolve(root,file))),hash(input),'Actual migration remained fixed: '+file);
  report.requests=requests;report.lostAcknowledgments=lostAcks;report.lostOutcomeLookups=lostLookups;report.atomicRollbacks=rollbacks;report.elapsedMs=Math.round(performance.now()-started);report.completedAt=new Date().toISOString();report.sourceManifest=Object.fromEntries([...sources].map(([file,input])=>[file,{sourceSha256:hash(input),moduleSha256:compiled.get(file).moduleSha256}]));report.helperSha256=hash(helperInput);report.dependencyInputs=Object.fromEntries(Object.entries(dependencyInputs).map(([file,input])=>[file,hash(input)]));report.migrationInputs=Object.fromEntries(Object.entries(migrations).map(([file,input])=>[file,hash(input)]));report.compiler={name:'typescript',version:ts.version,target:'ES2022',module:'ES2022'};report.allTransitiveSourcesAndModulesUnchanged=true;report.fullR2BeforeAfterBodyAndMetadataAudit=true;
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('PASS: '+(baseline?'baseline upload commits a one-byte-over complete NDJSON header':'candidate upload bounds complete NDJSON header and preserves CAS/cleanup outcomes')+'; '+requests+' actual Node handler calls, '+report.cases.length+' cases. Isolated synthetic SQLite/R2 only.');return report;
 }finally{sqlite.close();if(cryptoUuidDescriptor)Object.defineProperty(crypto,'randomUUID',cryptoUuidDescriptor);else delete crypto.randomUUID;for(const[key,descriptor]of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await verifyFileUploadHeaderBudget({sourceRoot:process.env.CRM_FILE_HEADER_SOURCE_ROOT||fileURLToPath(new URL('../',import.meta.url)),baseline:process.argv.includes('--baseline'),evidencePath:process.env.CRM_FILE_HEADER_EVIDENCE_PATH,denialEvidencePath:process.env.CRM_FILE_HEADER_DENIAL_EVIDENCE_PATH});console.log(JSON.stringify({requests:report.requests,cases:report.cases.length,baseline:report.baseline,helperSha256:report.helperSha256}));}
