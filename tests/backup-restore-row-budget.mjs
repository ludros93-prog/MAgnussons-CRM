import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

export const ROW_BUDGET=2_000_000;
const at='2026-10-11T17:00:00.000Z',uuid='00000000-0000-4000-8000-000000000001';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=value=>Buffer.byteLength(value,'utf8');
const collections={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const customerColumns=new Set(['deals','orders','tasks','meetings','events']);
function padString(row,key,target,measure){const prefix=row[key];let count=target-measure();for(let i=0;i<5;i++){assert.ok(count>=0);row[key]=prefix+'x'.repeat(count);const delta=target-measure();if(!delta)return;count+=delta;}assert.fail('Synthetic exact byte padding did not converge');}

// Independent SQLite record-format oracle. This does not import or call the
// product's budget implementation. dbstat below verifies it against real
// SQLite records, including their overflow pages, rather than JSON alone.
function varintBytes(value){let count=1;while(value>=128){value=Math.floor(value/128);count++;}return count;}
export function sqliteRecordBytes(values){
 const serial=values.map(value=>{
  if(value===null||value===undefined)return[0,0];
  if(typeof value==='string'){const n=bytes(value);return[13+2*n,n];}
  if(value instanceof Uint8Array)return[12+2*value.byteLength,value.byteLength];
  assert.equal(typeof value,'number');if(!Number.isInteger(value))return[7,8];assert.ok(Number.isSafeInteger(value),'SQLite integer oracle requires a safe integer');
  if(value===0)return[8,0];if(value===1)return[9,0];
  const widths=[[1,128],[2,32768],[3,8388608],[4,2147483648],[6,140737488355328]];
  const width=widths.find(([,limit])=>value>=-limit&&value<limit)?.[0]||8;
  return[{1:1,2:2,3:3,4:4,6:5,8:6}[width],width];
 });
 const serialHeader=serial.reduce((sum,[type])=>sum+varintBytes(type),0);
 let header=serialHeader+1;while(header!==serialHeader+varintBytes(header))header=serialHeader+varintBytes(header);
 return header+serial.reduce((sum,[,length])=>sum+length,0);
}

// A literal projection of the persisted columns in the migrated schemas.
// UUID content is irrelevant to size, but UUID width and every indexed text
// identity are included. Generated audit and detached seller bindings follow
// the documented restore contract, independently of its implementation.
export function backupRestoreRowProjection(state,{space='demo',version=9,files=[],actor={id:'synthetic-row-user',name:'Syntetisk återställare'},requestId=uuid,requestHash='a'.repeat(64),exportedAt=at}={}){
 const next=structuredClone(state);delete next.viewer;next.version=version+1;
 next.settings.sellerProfiles=next.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
 const ids=new Map(files.map((file,index)=>[file.metadata.id,'00000000-0000-4000-8000-'+String(index+1).padStart(12,'0')]));
 for(const order of next.orders){if(order.proofFileId)order.proofFileId=ids.get(order.proofFileId);for(const p of [order.production,...order.productionHistory])if(p.sketchFileId)p.sketchFileId=ids.get(p.sketchFileId);}
 for(const deal of next.deals)if(deal.repeatRecipe?.sketchFileId)deal.repeatRecipe.sketchFileId=ids.get(deal.repeatRecipe.sketchFileId);
 const generated=next.customers.map((customer,index)=>({id:'10000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),customerId:customer.id,dealId:'',kind:'restore',at,text:'CRM-data och kundfiler återställda från kopia daterad '+exportedAt,actor:{id:actor.id,name:actor.name}}));
 next.events.push(...generated);
 const rows=[{table:'crm_spaces',id:space,values:[space,version+1,uuid,JSON.stringify(next.settings)]}];
 for(const [name,table] of Object.entries(collections))for(const row of next[name])rows.push({table,id:row.id,values:[row.id,space,...(customerColumns.has(name)?[row.customerId]:[]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)]});
 const stored=files.map(file=>{const id=ids.get(file.metadata.id),metadata={...file.metadata,id};return{id,customerId:file.customerId,objectKey:space+'/'+file.customerId+'/'+id,metadata};});
 for(const file of stored)rows.push({table:'crm_files',id:file.id,values:[file.id,space,file.customerId,file.objectKey,JSON.stringify(file.metadata)]});
 rows.push({table:'crm_mutations',id:requestId,values:[space,requestId,'{}',actor.id,requestHash]});
 return{state:next,stored,generated,rows:rows.map(row=>({...row,bytes:sqliteRecordBytes(row.values)}))};
}

// Shared synthetic fixture for Node and native binding tests. Every returned
// state passes the actual restore schema; padding is never customer content.
export function rowBudgetFixture(core,{layout='event',bytes:target=ROW_BUDGET,fileId='s',baseState,space='demo',version=9,actor={id:'synthetic-row-user',name:'Syntetisk återställare'},files:initialFiles}={}){
 const state=structuredClone(baseState||core.emptyState());
 if(!state.customers.length)state.customers=[core.CustomerSchema.parse({id:'synthetic-row-customer',name:'Fiktiv radbudgetkund',owner:state.settings.owners[0]})];
 const customer=state.customers[0],owner=customer.owner;
 const files=structuredClone(initialFiles||[{customerId:customer.id,metadata:{id:fileId,name:'synthetic-sketch.txt',version:'synthetic-v1',kind:'document',size:1,at,uploadedBy:'Syntetisk källa'}}]);
 const actualActor={...actor};let selected;
 if(layout==='event'){
  const event={id:'synthetic-row-event',customerId:customer.id,dealId:'',text:'Fiktiv bevarad anteckning',at,kind:'note',note:{title:'Å😀 "\\\n\u0000\ud800',meetingDate:'',sourceFiles:[]},actor:{id:'synthetic-origin',name:'Fiktiv ursprunglig kollega'}};
  state.events.push(event);selected=()=>backupRestoreRowProjection(state,{space,version,files,actor:actualActor}).rows.find(row=>row.table==='crm_events'&&row.id===event.id);padString(event.note,'title',target,()=>selected().bytes);
 }else if(layout==='settings'){
  const prefix='Syntetiskt historiskt målnamn Å😀 "\\\n\u0000\ud800 ';state.settings.sellerGoals[prefix]={};
  selected=()=>backupRestoreRowProjection(state,{space,version,files,actor:actualActor}).rows.find(row=>row.table==='crm_spaces');let count=target-selected().bytes,last=prefix;
  for(let i=0;i<5;i++){delete state.settings.sellerGoals[last];last=prefix+'x'.repeat(count);state.settings.sellerGoals[last]={};const delta=target-selected().bytes;if(!delta)break;count+=delta;}
 }else if(layout==='file'){
  const file=files[0];file.metadata.uploadedBy='Syntetisk Å😀 "\\\n\u0000\ud800 ';selected=()=>backupRestoreRowProjection(state,{space,version,files,actor:actualActor}).rows.find(row=>row.table==='crm_files'&&row.id.endsWith('000000000001'));padString(file.metadata,'uploadedBy',target,()=>selected().bytes);
 }else if(layout==='audit'){
  // This name is read from a SQL TEXT member row; use valid Unicode here.
  // Lone surrogates are separately preserved as escaped source JSON text.
  actualActor.name='Syntetisk Å😀 "\\\n\u0000\ufffd ';selected=()=>backupRestoreRowProjection(state,{space,version,files,actor:actualActor}).rows.find(row=>row.table==='crm_events'&&row.id.startsWith('10000000-'));padString(actualActor,'name',target,()=>selected().bytes);
 }else if(layout==='order'){
  const deal=core.DealSchema.parse({id:'synthetic-row-deal',customerId:customer.id,owner,title:'Fiktiv radbudgetaffär'});state.deals.push(deal);
  const order=core.OrderSchema.parse({id:'synthetic-row-order',customerId:customer.id,dealId:deal.id,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Å😀 "\\\n\u0000\ud800',production:{workId:'synthetic-current',sketchFileId:files[0].metadata.id,sketchVersion:files[0].metadata.version,lines:Array.from({length:100},(_,i)=>({id:'synthetic-line-'+i,description:'Fiktiv rad '+i,quantity:1,unitPrice:1,unitCost:1}))},productionHistory:Array.from({length:100},(_,i)=>({workId:'synthetic-archive-'+i,status:'cancelled',sketchFileId:files[0].metadata.id,sketchVersion:files[0].metadata.version}))});state.orders.push(order);
  selected=()=>backupRestoreRowProjection(state,{space,version,files,actor:actualActor}).rows.find(row=>row.table==='crm_orders'&&row.id===order.id);
  let remaining=target-selected().bytes;
  for(const line of order.production.lines)for(const key of ['sourceId','article','variant']){const n=Math.min(4000,remaining);line[key]='P'.repeat(n);remaining-=n;}
  for(const production of order.productionHistory)for(const [row,key] of [[production,'instructions'],[production.deliveryAddress,'street']]){const n=Math.min(4000,remaining);row[key]='P'.repeat(n);remaining-=n;}
  assert.equal(remaining,0,'Bounded production fields provide the requested synthetic row');
  const delta=target-selected().bytes;assert.ok(Math.abs(delta)<=5,'Only SQLite serial-header width changes during padding');if(delta<0)order.production.lines[0].sourceId=order.production.lines[0].sourceId.slice(0,delta);else order.notes+='x'.repeat(delta);
 }else throw Error('Unknown synthetic row layout '+layout);
 assert.equal(selected().bytes,target,layout+' independent exact byte boundary');
 return{state,files,actor:actualActor,selected:selected(),projection:backupRestoreRowProjection(state,{space,version,files,actor:actualActor})};
}

export async function verifyBackupRestoreRowBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/backup-restore-row-budget-')),compiled=new Set(),sourceBytes=new Map();
 const toTarget=file=>resolve(directory,file.replace(/\.ts$/,'.mjs'));
 function compile(file){
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);assert.ok(file.startsWith('lib/')||file==='app/api/crm/backup/route.ts');
  const input=readFileSync(resolve(sourceRoot,file));sourceBytes.set(file,input);let source=input.toString('utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__crmEnv;");
  let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');else if(specifier.startsWith('./')||specifier.startsWith('../')){const base=resolve(dirname(file),specifier);dependency=compile(relative(resolve('.'),base).split(sep).join('/')+'.ts');}else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync(resolve(sourceRoot,'drizzle')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(resolve(sourceRoot,'drizzle',file),'utf8'));
 const original=Object.fromEntries(['__crmEnv','FixedLengthStream'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let puts=0,deletes=0,commits=0,requests=0,loseAck=false,lostAcks=0,race=false,races=0,probeOverride,probes=0;const writtenRows=[];
 class Prepared{constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}async first(){if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe'){probes++;assert.deepEqual(this.values,['A😀']);if(probeOverride instanceof Error)throw probeOverride;if(probeOverride!==undefined)return probeOverride;}return sqlite.prepare(this.sql).get(...this.values)||null;}async all(){return this.exec();}async run(){return this.exec();}exec(){const q=sqlite.prepare(this.sql);return q.columns().length?{success:true,results:q.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(q.run(...this.values).changes)}};}}
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(restoring){commits++;if(race){race=false;races++;sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='demo'").run();}}
  sqlite.exec('BEGIN');let result;try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(restoring){for(const table of Object.values(collections).concat(['crm_spaces','crm_files','crm_mutations'])){const columns=sqlite.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name);const rows=sqlite.prepare('SELECT * FROM '+table+(table==='crm_spaces'?" WHERE id='demo'":" WHERE space='demo'")).all();for(const row of rows)writtenRows.push({table,id:row.id,values:columns.map(column=>row[column]),bytes:sqliteRecordBytes(columns.map(column=>row[column]))});}if(loseAck){loseAck=false;lostAcks++;throw Error('Synthetic row-budget lost ACK after commit');}}
  return result;
 }};
 const objects=new Map(),env={CRM_BOOTSTRAP_ADMINS:'[]',DB:db,BUCKET:{put:async(key,body,options={})=>{puts++;objects.set(key,{bytes:new Uint8Array(await new Response(body).arrayBuffer()),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}});},get:async key=>{const value=objects.get(key);return value?{size:value.bytes.length,arrayBuffer:async()=>value.bytes.slice().buffer}:null;},delete:async key=>{deletes++;objects.delete(key);}}};
 const account={id:'synthetic-row-member',user:'synthetic-row-user',email:'row-budget@example.test',name:'Syntetisk återställare'},other={id:'synthetic-row-other-member',user:'synthetic-row-other-user',email:'row-other@example.test',name:'Annan syntetisk återställare'},secret='SYNTHETIC ROW PRIVATE RAW SENTINEL';
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const raw=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,value])=>[key,{...value,bytes:value.bytes.slice()}]))});
 const counters=()=>{puts=deletes=commits=probes=0;writtenRows.length=0;loseAck=race=false;};
 const header=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test'});
 const clear=space=>{sqlite.exec('BEGIN');for(const table of ['crm_files','crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_mutations'])sqlite.prepare('DELETE FROM '+table+' WHERE space=?').run(space);sqlite.exec('COMMIT');for(const key of objects.keys())if(key.startsWith(space+'/'))objects.delete(key);};
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:18,wholeRecordLimit:ROW_BUDGET,oracleCases:0,helperCases:0,layoutCases:[],encodingCases:0,httpRequests:0,denials:[],accepted:[],lostAcks:0,races:0,sourceManifest:{}};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});Object.defineProperty(globalThis,'FixedLengthStream',{configurable:true,writable:true,value:class extends TransformStream{constructor(length){let n=0;super({transform(chunk,controller){n+=chunk.byteLength;assert.ok(n<=length);controller.enqueue(chunk);},flush(){assert.equal(n,length);}});}}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),backup=await import(pathToFileURL(compile('lib/crm-backup.ts')).href),operations=await import(pathToFileURL(compile('lib/operations.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/backup/route.ts')).href);
  for(const user of [account,other])sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,'admin','');
  for(const space of ['demo','live'])await store.initialize(space);
  sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('live',account.user,'synthetic-private-live','note','synthetic-row-customer',2,uuid,secret,JSON.stringify({text:'  '+secret+'\n  '}),0,at);
  sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('demo',account.user,'synthetic-private-demo','note','synthetic-row-customer',7,uuid,secret,JSON.stringify({text:secret}),1,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(account.user,'synthetic-row-ms',account.email,secret,at);
  sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-private-mail',account.user,'mail',JSON.stringify({subject:secret}),'synthetic-row-customer',0,at,at);
  sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-shared-mail',account.user,'mail',JSON.stringify({subject:secret}),'synthetic-row-customer',1,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-row-oauth',account.user,secret,1);
  objects.set('synthetic-private-r2',{bytes:new Uint8Array([9,8,7]),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{private:secret}});
  // Real SQLite dbstat independently verifies physical record sizes across
  // integer widths, serial/header varints and escaped UTF-8 JSON text.
  const physicalRecord=values=>{const oracle=new DatabaseSync(':memory:');try{oracle.exec('CREATE TABLE probe('+values.map((value,i)=>'c'+i+(typeof value==='number'?(Number.isInteger(value)?' INTEGER':' REAL'):value instanceof Uint8Array?' BLOB':' TEXT')).join(',')+')');oracle.prepare('INSERT INTO probe VALUES('+values.map(()=>'?').join(',')+')').run(...values);const measured=Number(oracle.prepare("SELECT SUM(payload) AS n FROM dbstat WHERE name='probe'").get().n);assert.equal(measured,sqliteRecordBytes(values));report.oracleCases++;return measured;}finally{oracle.close();}};
  const oracleValues=[[null,'','a'],[0,1,-128,127,128,-32768,32767,32768,-8388608,8388607,8388608,-2147483648,2147483647,2147483648,-140737488355328,140737488355327,140737488355328,Number.MAX_SAFE_INTEGER],['Å😀',JSON.stringify('"\\\n\u0000\ud800')],[new Uint8Array([0,1,255]),1.5],Array(130).fill('a'),['x'.repeat(ROW_BUDGET-12),'a','demo']];for(const values of oracleValues)physicalRecord(values);
  const base=core.emptyState();base.settings.owners=['Fiktivt kommersiellt ansvar'];const owner=base.settings.owners[0],customerId='synthetic-base-customer',dealId='synthetic-base-deal';
  base.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv grundkund',owner})];base.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Fiktiv grundaffär'})];
  base.orders=[core.OrderSchema.parse({id:'synthetic-base-order',customerId,dealId,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktiv bevarad ordertext'})];
  base.tasks=[core.TaskSchema.parse({id:'synthetic-base-task',customerId,dealId,owner,title:'Fiktiv uppföljning',due:'2026-11-01'})];base.meetings=[core.MeetingSchema.parse({id:'synthetic-base-meeting',customerId,owner,title:'Fiktivt möte',date:'2026-11-01',time:'10:00',duration:30})];
  base.articles=[operations.ArticleSchema.parse({id:'synthetic-base-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];base.notices=[operations.NoticeSchema.parse({id:'synthetic-base-notice',title:'Fiktiv avisering',audience:'team',at})];base.leads=[operations.LeadSchema.parse({id:'synthetic-base-lead',name:'Fiktivt prospekt',source:'synthetic'})];base.companyEvents=[operations.CompanyEventSchema.parse({id:'synthetic-base-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  const fixtureFor=(layout,target,fileId='s')=>rowBudgetFixture(core,{layout,bytes:target,fileId,baseState:base});
  if(!baseline){
   const budget=await import(pathToFileURL(compile('lib/crm-storage-budget.ts')).href);assert.equal(budget.D1_MAX_ROW_BYTES,ROW_BUDGET);
   for(const values of oracleValues){assert.equal(budget.sqliteRecordBytes(values),sqliteRecordBytes(values));report.helperCases++;}
   const complete=fixtureFor('event',ROW_BUDGET),layoutRows=backupRestoreRowProjection(complete.state,{files:complete.files}).rows;
   assert.deepEqual([...new Set(layoutRows.map(row=>row.table))].sort(),Object.values(collections).concat(['crm_spaces','crm_files','crm_mutations']).sort());
   // Serialization probes of each real SQL layout. They are not fed to the
   // domain restore API: domain-valid large fixtures are tested separately.
   for(const row of layoutRows.filter((row,index,rows)=>rows.findIndex(other=>other.table===row.table)===index))for(const target of [ROW_BUDGET,ROW_BUDGET+1]){const values=row.values.slice(),index=values.length-1;values[index]='SYNTHETIC LAYOUT ';padString(values,index,target,()=>sqliteRecordBytes(values));assert.equal(budget.sqliteRecordBytes(values),physicalRecord(values));if(target===ROW_BUDGET)assert.doesNotThrow(()=>budget.assertStorageRowBudget(values));else assert.throws(()=>budget.assertStorageRowBudget(values),/2 000 000/);report.helperCases++;report.layoutCases.push({table:row.table,bytes:target,accepted:target===ROW_BUDGET});}
  }
  const reset=()=>{clear('demo');sqlite.prepare("UPDATE crm_spaces SET version=9,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id='demo'").run(JSON.stringify(core.emptyState().settings));sqlite.prepare('UPDATE crm_members SET name=? WHERE id=?').run(account.name,account.id);probeOverride=undefined;counters();};
  const seed=fixture=>{clear('live');sqlite.prepare("UPDATE crm_spaces SET version=7,settings=? WHERE id='live'").run(JSON.stringify(fixture.state.settings));for(const [name,table] of Object.entries(collections))for(const row of fixture.state[name]){const columns=['id','space',...(customerColumns.has(name)?['customer_id']:[]),...(name==='orders'?['deal_id']:[]),'data'];sqlite.prepare('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').run(row.id,'live',...(customerColumns.has(name)?[row.customerId]:[]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row));}for(const file of fixture.files){const key='live/'+file.customerId+'/'+file.metadata.id;sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(file.metadata.id,'live',file.customerId,key,JSON.stringify(file.metadata));objects.set(key,{bytes:new Uint8Array([42]),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{synthetic:'source'}});}};
  const streamLines=text=>{assert.ok(text.endsWith('\n'));return text.slice(0,-1).split('\n');};
  const rebuild=lines=>{let digest=hash(lines[0]);for(const line of lines.slice(1,-1))digest=hash(digest+':'+hash(line));const end=JSON.parse(lines.at(-1));end.sha256=digest;lines[lines.length-1]=JSON.stringify(end);return lines.join('\n')+'\n';};
  const exportSource=async fixture=>{seed(fixture);const before=raw(),result={};for(const format of ['json','stream']){requests++;const response=await api.GET(new Request('https://crm.test/api/crm/backup?space=live'+(format==='stream'?'&format=stream':''),{headers:header(account)}));assert.equal(response.status,200,await response.clone().text());const text=await response.text();assert.ok(!text.includes(secret));if(format==='json'){result.json=JSON.parse(text);result.json.exportedAt=at;}else{const lines=streamLines(text),head=JSON.parse(lines[0]);head.exportedAt=at;lines[0]=JSON.stringify(head);result.stream=rebuild(lines);}assert.ok(bytes(text)<16_000_000);}assert.deepEqual(raw(),before,'Actual exports preserve all 18 raw tables and R2');return result;};
  const post=async(format,archive,{id=crypto.randomUUID(),version=9,user=account}={})=>{requests++;return api.POST(new Request('https://crm.test/api/crm/backup'+(format==='stream'?'?space=demo&version='+version+'&requestId='+id:''),{method:'POST',headers:{...header(user),'Content-Type':format==='stream'?'application/x-ndjson':'application/json'},body:format==='stream'?archive:JSON.stringify({space:'demo',version,requestId:id,backup:archive})}));};
  const preserveOutside=(before,after)=>{for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='demo':row.space!=='demo');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside destination');}for(const table of ['crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' positive private sentinel');for(const [key,value] of before.r2)assert.deepEqual(after.r2.get(key),value,'Preserved source/private R2 '+key);};
  const deny=async(format,archive,label)=>{const before=raw();counters();const response=await post(format,archive),value=await response.json();assert.equal(response.status,400,label+' '+JSON.stringify(value));assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(Object.keys(value),['error']);assert.match(value.error,/2 MB|2 000 000|lagrings|databas|rad/i);assert.ok(!JSON.stringify(value).includes(secret));assert.equal(puts,0,label+' no staging');assert.equal(deletes,0,label+' no disguised staging cleanup');assert.equal(commits,0,label+' no restoring D1 batch');assert.deepEqual(raw(),before,label+' all 18 raw tables/R2 unchanged');report.denials.push({format,label,status:response.status,error:value.error,puts,deletes,commits});};
  const accept=async(format,archive,fixture,label,{lost=false}={})=>{reset();sqlite.prepare('UPDATE crm_members SET name=? WHERE id=?').run(fixture.actor.name,account.id);const before=raw(),id=crypto.randomUUID();if(lost)loseAck=true;const response=await post(format,archive,{id}),value=await response.json();assert.equal(response.status,200,label+' '+JSON.stringify(value.error));assert.equal(value.version,10);assert.equal(puts,fixture.files.length);assert.equal(commits,1);assert.equal(deletes,0);const after=raw();preserveOutside(before,after);assert.equal(writtenRows.filter(row=>row.table===fixture.selected.table&&row.id===fixture.selected.id||fixture.selected.table==='crm_files'&&row.table==='crm_files'||fixture.selected.table==='crm_spaces'&&row.table==='crm_spaces'||label.startsWith('audit')&&row.table==='crm_events'&&JSON.parse(row.values.at(-1)).kind==='restore').at(-1).bytes,fixture.selected.bytes,label+' independently sized actual persisted row');assert.ok(writtenRows.every(row=>row.bytes<=ROW_BUDGET)||baseline);const oldEvents=fixture.state.events.map(event=>event.id);assert.deepEqual(value.events.filter(event=>oldEvents.includes(event.id)),fixture.state.events,'Full original Unicode/escaping/provenance survives');assert.equal(value.events.length,fixture.state.events.length+fixture.state.customers.length);const generated=value.events.filter(event=>!oldEvents.includes(event.id));assert.ok(generated.every(event=>event.kind==='restore'&&event.text==='CRM-data och kundfiler återställda från kopia daterad '+at&&event.actor.id===account.user&&event.actor.name===fixture.actor.name));if(fixture.state.orders.some(order=>order.id==='synthetic-row-order')){const order=value.orders.find(order=>order.id==='synthetic-row-order');assert.equal(order.productionHistory.length,100);assert.equal(new Set([order.production,...order.productionHistory].map(p=>p.sketchFileId)).size,1);assert.match(order.production.sketchFileId,/^[a-f0-9-]{36}$/);assert.equal(order.production.lines.length,100);}
   for(const exportFormat of ['json','stream']){requests++;const exported=await api.GET(new Request('https://crm.test/api/crm/backup?space=demo'+(exportFormat==='stream'?'&format=stream':''),{headers:header(account)}));assert.equal(exported.status,200);const text=await exported.text();assert.ok(!text.includes(secret));const st=exportFormat==='json'?JSON.parse(text).state:JSON.parse(streamLines(text)[0]).state;const {viewer,...expected}=value;assert.deepEqual(st,expected,'Accepted whole row can be completely re-exported');}
   const replayBefore=raw();counters();probeOverride=new Error('Synthetic unreadable encoding on replay');const replay=await post(format,archive,{id});assert.equal(replay.status,200);assert.deepEqual(await replay.json(),value);assert.equal(puts,0);assert.equal(deletes,0);assert.equal(commits,0);assert.equal(probes,0,'Completed receipt replay bypasses first-write encoding/preflight');assert.deepEqual(raw(),replayBefore,'Exact double click/replay does not rewrite existing rows or audit');const actorReplay=await post(format,archive,{id,user:other});assert.equal(actorReplay.status,400);assert.equal(puts,0);assert.equal(commits,0);assert.deepEqual(raw(),replayBefore,'Changed actor never reuses prior receipt');probeOverride=undefined;report.accepted.push({format,label,persistedRowBytes:fixture.selected.bytes,lostAcknowledgement:lost,exactReplayNoWrites:true,reexports:2,sourceValueBytes:bytes(JSON.stringify(fixture.state.events[0]||fixture.state.orders[0]||fixture.state.settings))});
  };
  if(baseline){const fixture=fixtureFor('event',ROW_BUDGET+1);assert.equal(physicalRecord(fixture.selected.values),ROW_BUDGET+1);restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:fixture.state},true);assert.ok(bytes(fixture.selected.values.at(-1))<ROW_BUDGET,'Even its JSON value fits; indexed columns/header make the complete row exceed D1');const archive=await exportSource(fixture);for(const format of ['json','stream'])await accept(format,archive[format],fixture,'event baseline overflow');}
  else{
   for(const layout of ['event','settings','file','audit','order'])for(const target of [ROW_BUDGET,ROW_BUDGET+1]){
    const fixture=fixtureFor(layout,target);assert.equal(physicalRecord(fixture.selected.values),target);restore.restoreState(core.emptyState(),{format:'magnussons-crm-1',state:fixture.state},true);assert.ok(fixture.projection.rows.every(row=>row.bytes<=ROW_BUDGET||row.id===fixture.selected.id),'Only the selected row reaches the boundary');const archive=await exportSource(fixture);
    if(evidencePath&&layout==='order'&&target===ROW_BUDGET+1){writeFileSync(resolve(dirname(evidencePath),'order-overflow.json'),JSON.stringify(archive.json)+'\n',{mode:0o600});writeFileSync(resolve(dirname(evidencePath),'order-overflow.ndjson'),archive.stream,{mode:0o600});}
    for(const format of ['json','stream'])if(target===ROW_BUDGET)await accept(format,archive[format],fixture,layout+' exact',{lost:layout==='order'});else{reset();sqlite.prepare('UPDATE crm_members SET name=? WHERE id=?').run(fixture.actor.name,account.id);await deny(format,archive[format],layout+' overflow');}
   }
   // Long legacy file IDs shrink at remapping. Checking source JSON instead
   // of the final record would reject this valid destination row.
   const shrinking=fixtureFor('order',ROW_BUDGET,'L'.repeat(100)),longOrder=shrinking.state.orders.find(order=>order.id==='synthetic-row-order');assert.ok(sqliteRecordBytes([longOrder.id,'live',longOrder.customerId,longOrder.dealId,JSON.stringify(longOrder)])>ROW_BUDGET);const shrinkArchive=await exportSource(shrinking);for(const format of ['json','stream'])await accept(format,shrinkArchive[format],shrinking,'order legacy UUID shrink');
   const fixture=fixtureFor('event',ROW_BUDGET),archive=await exportSource(fixture);
   for(const [name,override] of [['UTF-16LE',{storage_probe:'41003DD800DE'}],['UTF-16BE',{storage_probe:'0041D83DDE00'}],['unknown',null],['read failure',new Error('Synthetic unavailable encoding')]])for(const format of ['json','stream']){reset();probeOverride=override;await deny(format,archive[format],name+' encoding');assert.equal(probes,1,'First-write encoding is checked on each binding, without a cached success');report.encodingCases++;}
   for(const format of ['json','stream']){reset();const before=raw();race=true;const response=await post(format,archive[format]);assert.equal(response.status,400);assert.equal(commits,1);assert.equal(puts,1);assert.equal(deletes,1);const expected=before;expected.tables.crm_spaces.find(row=>row.id==='demo').version=10;assert.deepEqual(raw(),expected,'A competing CAS changes only its own version; the losing restore writes no rows, audits or receipt');}
  }
  report.httpRequests=requests;report.lostAcks=lostAcks;report.races=races;report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,hash(input)]));for(const [file,input] of sourceBytes)assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source remained fixed: '+file);
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log('PASS: '+(baseline?'baseline demonstrates':'candidate rejects')+' whole SQLite row overflow; '+requests+' actual handler requests, '+report.oracleCases+' physical SQLite oracle checks, '+report.denials.length+' pre-staging denials, '+report.accepted.length+' accepted boundaries, '+lostAcks+' lost ACKs, '+races+' CAS races. Synthetic isolated SQLite/R2; no hosted or personal account claim.');return report;
 }finally{sqlite.close();for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}rmSync(directory,{recursive:true,force:true});}
}
