import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {sqliteRecordBytes,ROW_BUDGET} from './backup-restore-row-budget.mjs';

const at='2026-10-11T20:00:00.000Z',uuid='00000000-0000-4000-8000-000000000001';
const hash=value=>createHash('sha256').update(value).digest('hex');
const byteLength=value=>Buffer.byteLength(value,'utf8');
const collections={customers:'crm_customers',deals:'crm_deals',orders:'crm_orders',tasks:'crm_tasks',meetings:'crm_meetings',events:'crm_events',articles:'crm_articles',notices:'crm_notices',leads:'crm_leads',companyEvents:'crm_company_events'};
const customerColumns=new Set(['deals','orders','tasks','meetings','events']);

// Literal data-only contract: no file ID remapping, its own generated audit,
// and the actual nonempty mutation-result receipt. Expected byte counts use
// the independently authored SQLite oracle, never the product budget helper.
export function dataRestoreRowProjection(state,{space='live',version=127,actor={id:'synthetic-data-user',name:'Syntetisk återställare'},requestId=uuid,requestHash='a'.repeat(64)}={}){
 const next=structuredClone(state);delete next.viewer;next.version=version+1;
 next.settings.sellerProfiles=next.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));
 const generated=next.customers.map((customer,index)=>({id:'10000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),customerId:customer.id,dealId:'',text:'Kundens CRM-data återställd från export',kind:'restore',at,actor:{id:actor.id,name:actor.name}}));
 next.events.push(...generated);
 const result={customerId:next.customers[0]?.id,dealId:next.deals[0]?.id,orderId:next.orders[0]?.id,taskId:next.tasks[0]?.id,eventId:next.events[0]?.id};
 const rows=[{table:'crm_spaces',id:space,values:[space,version+1,uuid,JSON.stringify(next.settings)]}];
 for(const [name,table] of Object.entries(collections))for(const row of next[name])rows.push({table,id:row.id,values:[space,row.id,...(customerColumns.has(name)?[row.customerId]:[]),...(name==='orders'?[row.dealId]:[]),JSON.stringify(row)]});
 rows.push({table:'crm_mutations',id:requestId,values:[space,requestId,JSON.stringify(result),actor.id,requestHash]});
 return{state:next,generated,result,rows:rows.map(row=>({...row,bytes:sqliteRecordBytes(row.values)}))};
}

function padString(row,key,target,measure){
 const prefix=row[key];let count=target-measure();
 for(let i=0;i<5;i++){assert.ok(count>=0);row[key]=prefix+'x'.repeat(count);const delta=target-measure();if(!delta)return;count+=delta;}
 assert.fail('Synthetic whole-record padding did not converge');
}

export function dataRestoreRowFixture(core,{layout='event',bytes:target=ROW_BUDGET,baseState,space='live',version=127,actor={id:'synthetic-data-user',name:'Syntetisk återställare'}}={}){
 const state=structuredClone(baseState||core.emptyState()),actualActor={...actor};
 if(!state.customers.length)state.customers=[core.CustomerSchema.parse({id:'synthetic-data-customer',name:'Fiktiv datakund',owner:state.settings.owners[0]})];
 if(!state.events.length)state.events.push({id:'synthetic-data-original-event',customerId:state.customers[0].id,dealId:'',text:'Fiktiv bevarad historik',at,kind:'note',actor:{id:'synthetic-source-user',name:'Fiktiv ursprunglig kollega'}});
 const customer=state.customers[0],projection=()=>dataRestoreRowProjection(state,{space,version,actor:actualActor});let selected;
 if(layout==='event'){
  const event={id:'synthetic-data-boundary-event',customerId:customer.id,dealId:'',text:'Fiktiv full historik',at,kind:'note',note:{title:'Å😀 "\\\n\u0000\ud800',meetingDate:'',sourceFiles:[]},actor:{id:'synthetic-source-user',name:'Fiktiv ursprunglig kollega'}};
  state.events.push(event);selected=()=>projection().rows.find(row=>row.table==='crm_events'&&row.id===event.id);
  padString(event.note,'title',target,()=>selected().bytes);
 }else if(layout==='settings'){
  const prefix='Fiktivt historiskt målnamn Å😀 "\\\n\u0000\ud800 ';let last=prefix;state.settings.sellerGoals[prefix]={};
  selected=()=>projection().rows.find(row=>row.table==='crm_spaces');let count=target-selected().bytes;
  for(let i=0;i<5;i++){delete state.settings.sellerGoals[last];last=prefix+'x'.repeat(count);state.settings.sellerGoals[last]={};const delta=target-selected().bytes;if(!delta)break;count+=delta;}
 }else if(layout==='audit'){
  actualActor.name='Fiktiv Å😀 "\\\n\u0000\ufffd ';selected=()=>projection().rows.find(row=>row.table==='crm_events'&&row.id.startsWith('10000000-'));
  // SQL TEXT member names use valid Unicode. Lone surrogates remain in the
  // separately tested JSON-stringified source rows, where they are escaped.
  padString(actualActor,'name',target,()=>selected().bytes);
 }else if(layout==='order'){
  const deal=core.DealSchema.parse({id:'synthetic-data-boundary-deal',customerId:customer.id,owner:customer.owner,title:'Fiktiv dataradsaffär'});state.deals.push(deal);
  const order=core.OrderSchema.parse({id:'synthetic-data-boundary-order',customerId:customer.id,dealId:deal.id,owner:customer.owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Å😀 "\\\n\u0000\ud800',production:{workId:'synthetic-data-current',quantityMode:'lines',lines:Array.from({length:100},(_,i)=>({id:'synthetic-data-line-'+i,description:'Fiktiv provrad '+i,quantity:1,unitPrice:1,unitCost:1}))},productionHistory:Array.from({length:100},(_,i)=>({workId:'synthetic-data-archive-'+i,status:'cancelled'}))});state.orders.push(order);
  selected=()=>projection().rows.find(row=>row.table==='crm_orders'&&row.id===order.id);let remaining=target-selected().bytes;
  for(const line of order.production.lines)for(const key of ['sourceId','article','variant']){const n=Math.min(4000,remaining);line[key]='P'.repeat(n);remaining-=n;}
  for(const production of order.productionHistory)for(const [row,key] of [[production,'instructions'],[production.deliveryAddress,'street']]){const n=Math.min(4000,remaining);row[key]='P'.repeat(n);remaining-=n;}
  assert.equal(remaining,0);const delta=target-selected().bytes;assert.ok(Math.abs(delta)<=5);
  if(delta<0)order.production.lines[0].sourceId=order.production.lines[0].sourceId.slice(0,delta);else order.notes+='x'.repeat(delta);
 }else throw Error('Unknown data-only layout '+layout);
 assert.equal(selected().bytes,target,layout+' independent exact record boundary');
 return{state,actor:actualActor,selected:selected(),projection:projection(),version,space};
}

export async function verifyDataRestoreRowBudget({sourceRoot=resolve('.'),baseline=false,evidencePath}={}){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/data-restore-row-budget-')),compiled=new Set(),sourceBytes=new Map();
 const targetFor=file=>resolve(directory,file.replace(/\.ts$/,'.mjs'));
 function compile(file){
  const target=targetFor(file);if(compiled.has(file))return target;compiled.add(file);assert.ok(file.startsWith('lib/')||file==='app/api/crm/route.ts');
  const input=readFileSync(resolve(sourceRoot,file));sourceBytes.set(file,input);
  let source=input.toString('utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__crmEnv;");
  let output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(relative(resolve('.'),resolve(dirname(file),specifier)).split(sep).join('/')+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(resolve(sourceRoot,'drizzle')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(resolve(sourceRoot,'drizzle',file),'utf8'));
 const original=Object.getOwnPropertyDescriptor(globalThis,'__crmEnv');
 let commits=0,requests=0,puts=0,deletes=0,probes=0,probeOverride,loseAck=false,lostAcks=0,race=false,races=0;const observedEncodings=new Set();
 const objects=new Map(),writtenRows=[];
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}bind(...values){return new Prepared(this.sql,values);}
  async first(){
   if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe'){probes++;assert.deepEqual(this.values,['A😀']);if(probeOverride instanceof Error)throw probeOverride;if(probeOverride!==undefined)return probeOverride;}
   const row=sqlite.prepare(this.sql).get(...this.values)||null;if(this.sql==='SELECT hex(CAST(? AS BLOB)) AS storage_probe')observedEncodings.add(row?.storage_probe);return row;
  }
  async all(){return this.exec();}async run(){return this.exec();}
  exec(){const q=sqlite.prepare(this.sql);return q.columns().length?{success:true,results:q.all(...this.values),meta:{changes:0}}:{success:true,results:[],meta:{changes:Number(q.run(...this.values).changes)}};}
 }
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{
  const restoring=statements[0].sql.startsWith('UPDATE crm_spaces SET version=version+1,write_token=');
  if(restoring){commits++;if(race){race=false;races++;sqlite.prepare("UPDATE crm_spaces SET version=version+1 WHERE id='live'").run();}}
  sqlite.exec('BEGIN');let result;
  try{result=statements.map(statement=>statement.exec());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  if(restoring){
   for(const table of Object.values(collections).concat(['crm_spaces','crm_mutations'])){
    const columns=sqlite.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name),rows=sqlite.prepare('SELECT * FROM '+table+(table==='crm_spaces'?" WHERE id='live'":" WHERE space='live'")).all();
    for(const row of rows)writtenRows.push({table,id:row.id,values:columns.map(column=>row[column]),bytes:sqliteRecordBytes(columns.map(column=>row[column]))});
   }
   if(loseAck){loseAck=false;lostAcks++;throw Error('Synthetic data-only lost ACK after actual COMMIT');}
  }
  return result;
 }};
 const env={DB:db,CRM_BOOTSTRAP_ADMINS:'[]',BUCKET:{get:async key=>{const value=objects.get(key);return value?{size:value.bytes.length,arrayBuffer:async()=>value.bytes.slice().buffer}:null;},put:async()=>{puts++;assert.fail('Data-only restore must never stage R2');},delete:async()=>{deletes++;assert.fail('Data-only restore must never delete R2');}}};
 const accounts=['admin','other','seller','reader','production','print','warehouse'].map(role=>({id:'synthetic-data-member-'+role,user:role==='admin'?'synthetic-data-user':'synthetic-data-user-'+role,email:'synthetic-data-'+role+'@example.test',name:'Syntetisk återställare',role:role==='other'?'admin':role,owner:''}));
 const account=accounts[0],other=accounts[1],secret='SYNTHETIC DATA PRIVATE RAW SENTINEL';
 const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name).filter(name=>/^(?:crm_|outlook_)[a-z_]+$/.test(name));assert.equal(tables.length,18);
 const raw=()=>({tables:Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])),r2:new Map([...objects].map(([key,value])=>[key,{...value,bytes:value.bytes.slice()}]))});
 const counters=()=>{commits=puts=deletes=probes=0;writtenRows.length=0;loseAck=race=false;};
 const report={syntheticOnly:true,baseline,actualAuthenticatedHandlers:true,actualSQLite:true,allTables:18,wholeRecordLimit:ROW_BUDGET,httpRequests:0,physicalOracleCases:0,accepted:[],denials:[],roles:[],encodingCases:0,lostAcks:0,casRaces:0,sourceManifest:{}};
 try{
  Object.defineProperty(globalThis,'__crmEnv',{configurable:true,writable:true,value:env});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href),restore=await import(pathToFileURL(compile('lib/crm-restore.ts')).href),store=await import(pathToFileURL(compile('lib/crm-store.ts')).href),api=await import(pathToFileURL(compile('app/api/crm/route.ts')).href);
  for(const user of accounts)sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(user.id,user.email,user.user,user.name,user.role,user.owner);
  for(const space of ['demo','live'])await store.initialize(space);
  const base=core.emptyState();base.settings.owners=['Fiktivt kommersiellt ansvar'];const owner=base.settings.owners[0],customerId='synthetic-data-customer',dealId='synthetic-data-deal';
  base.customers=[core.CustomerSchema.parse({id:customerId,name:'Fiktiv datakund',owner})];base.deals=[core.DealSchema.parse({id:dealId,customerId,owner,title:'Fiktiv dataaffär'})];
  base.orders=[core.OrderSchema.parse({id:'synthetic-data-order',customerId,dealId,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'2026-11-01',deliveredDate:'',invoiceDate:'',invoiceRef:'',invoiceValue:null,actualCost:null,notes:'Fiktivt fryst underlag'})];
  base.tasks=[core.TaskSchema.parse({id:'synthetic-data-task',customerId,dealId,owner,title:'Fiktiv nästa aktivitet',due:'2026-11-01'})];base.meetings=[core.MeetingSchema.parse({id:'synthetic-data-meeting',customerId,owner,title:'Fiktivt möte',date:'2026-11-01',time:'10:00',duration:30})];
  base.articles=[ops.ArticleSchema.parse({id:'synthetic-data-article',sourceId:'current',sku:'SYNTHETIC',name:'Fiktiv artikel'})];base.notices=[ops.NoticeSchema.parse({id:'synthetic-data-notice',title:'Fiktiv notis',audience:'team',at})];base.leads=[ops.LeadSchema.parse({id:'synthetic-data-lead',name:'Fiktivt prospekt',source:'synthetic'})];base.companyEvents=[ops.CompanyEventSchema.parse({id:'synthetic-data-company-event',title:'Fiktiv aktivitet',date:'2026-11-01',owner})];
  for(const space of ['demo','live'])sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,account.user,'synthetic-private-'+space,'note',customerId,3,uuid,secret,JSON.stringify({text:'  '+secret+'\n  '}),0,at);
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens,last_sync) VALUES(?,?,?,?,?)').run(account.user,'synthetic-data-ms',account.email,secret,at);
  for(const shared of [0,1])sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,customer_id,shared,happened_at,seen_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-data-mail-'+shared,account.user,'mail',JSON.stringify({subject:secret}),customerId,shared,at,at);
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-data-oauth',account.user,secret,1);
  sqlite.prepare('INSERT INTO crm_customers(id,space,data) VALUES(?,?,?)').run('synthetic-outside-customer','demo',JSON.stringify(core.CustomerSchema.parse({id:'synthetic-outside-customer',name:'Fiktiv bevarad kund',owner})));
  const metadata={id:'synthetic-outside-file',name:'synthetic-private.bin',kind:'document',version:'v1',size:3,at,uploadedBy:account.user};
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run(metadata.id,'demo','synthetic-outside-customer','synthetic-private-r2',JSON.stringify(metadata));
  objects.set('synthetic-private-r2',{bytes:new Uint8Array([9,8,7]),httpMetadata:{contentType:'application/octet-stream'},customMetadata:{private:secret}});
  const reset=(version=127)=>{
   sqlite.exec('BEGIN');for(const table of ['crm_orders','crm_tasks','crm_meetings','crm_events','crm_deals','crm_customers','crm_articles','crm_notices','crm_leads','crm_company_events','crm_mutations'])sqlite.prepare("DELETE FROM "+table+" WHERE space='live'").run();sqlite.exec('COMMIT');
   sqlite.prepare("UPDATE crm_spaces SET version=?,write_token='SYNTHETIC-UNTOUCHED',settings=? WHERE id='live'").run(version,JSON.stringify(core.emptyState().settings));
   sqlite.prepare('UPDATE crm_members SET name=?,role=?,active=1 WHERE id=?').run(account.name,'admin',account.id);probeOverride=undefined;counters();
  };
  const identity=user=>({'oai-authenticated-user-id':user.user,'oai-authenticated-user-email':user.email,Origin:'https://crm.test','Content-Type':'application/json'});
  const post=async(data,{user=account,id=crypto.randomUUID(),version=127}={})=>{requests++;return api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:identity(user),body:JSON.stringify({space:'live',type:'restore',version,requestId:id,data})}));};
  const get=async()=>{requests++;const response=await api.GET(new Request('https://crm.test/api/crm?space=live',{headers:identity(account)}));assert.equal(response.status,200);return response.json();};
  const fixtureFor=(layout,target=ROW_BUDGET)=>dataRestoreRowFixture(core,{layout,bytes:target,baseState:base});
  const validate=fixture=>restore.restoreState({...core.emptyState(),version:127},{format:'magnussons-crm-1',state:fixture.state});
  const physicalRecord=values=>{
   const oracle=new DatabaseSync(':memory:');try{
    oracle.exec('CREATE TABLE probe('+values.map((value,index)=>'c'+index+(typeof value==='number'?' INTEGER':' TEXT')).join(',')+')');oracle.prepare('INSERT INTO probe VALUES('+values.map(()=>'?').join(',')+')').run(...values);
    const measured=Number(oracle.prepare("SELECT SUM(payload) AS n FROM dbstat WHERE name='probe'").get().n);assert.equal(measured,sqliteRecordBytes(values));report.physicalOracleCases++;return measured;
   }finally{oracle.close();}
  };
  const outsidePreserved=(before,after)=>{
   for(const table of tables){const outside=rows=>rows.filter(row=>table==='crm_spaces'?row.id!=='live':row.space!=='live');assert.deepEqual(outside(after.tables[table]),outside(before.tables[table]),table+' outside destination');}
   for(const table of ['crm_files','crm_members','crm_drafts','outlook_connections','outlook_items','outlook_oauth_states'])assert.deepEqual(after.tables[table],before.tables[table],table+' positive raw sentinel');
   assert.deepEqual(after.r2,before.r2);
  };
  const deny=async(fixture,label,{status=400,user=account,id,version=127}={})=>{
   const before=raw();counters();const response=await post({format:'magnussons-crm-1',state:fixture.state},{user,id,version}),value=await response.json();
   assert.equal(response.status,status,label+' '+JSON.stringify(value.error));assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(typeof value.error==='string');assert.ok(!JSON.stringify(value).includes(secret));
   if(label.endsWith('overflow'))assert.equal(value.error,'CRM-kopian innehåller en databaspost som överskrider gränsen på 2 000 000 byte efter återställningen. Inga uppgifter återställs.');
   if(label.endsWith('encoding'))assert.equal(value.error,'Databasens textkodning kunde inte verifieras för säker återställning. Inga uppgifter återställs.');
   assert.equal(commits,0,label+' before atomic write');assert.equal(puts,0);assert.equal(deletes,0);assert.deepEqual(raw(),before,label+' preserves all18 raw tables and R2');
   report.denials.push({label,status:response.status,error:value.error,selectedRecordBytes:fixture.selected.bytes,commits,puts,deletes});
   if(evidencePath&&label==='event overflow'){
    const payloadPath=resolve(dirname(evidencePath),'rejected-data-export.json'),receiptPath=resolve(dirname(evidencePath),'rejected-data-export-receipt.json');
    writeFileSync(payloadPath,JSON.stringify({format:'magnussons-crm-1',state:fixture.state})+'\n',{mode:0o600});
    writeFileSync(receiptPath,JSON.stringify({label,status:response.status,error:value.error,bytes:fixture.selected.bytes,commits,puts,deletes},null,2)+'\n',{mode:0o600});report.browserRejectedFixture={payloadPath,receiptPath};
   }
   return value;
  };
  const accept=async(fixture,label,{lost=false}={})=>{
   reset(fixture.version);sqlite.prepare('UPDATE crm_members SET name=? WHERE id=?').run(fixture.actor.name,account.id);
   validate(fixture);assert.equal(physicalRecord(fixture.selected.values),fixture.selected.bytes);const before=raw(),id=crypto.randomUUID(),data={format:'magnussons-crm-1',state:fixture.state};if(lost)loseAck=true;
   const response=await post(data,{id,version:fixture.version}),body=await response.json();assert.equal(response.status,lost?503:200,label+' '+JSON.stringify(body.error));assert.equal(commits,1);assert.equal(puts,0);assert.equal(deletes,0);
   const after=raw();outsidePreserved(before,after);let value=lost?await get():body;assert.equal(value.version,fixture.version+1);
   const selected=writtenRows.find(row=>row.table===fixture.selected.table&&(row.id===fixture.selected.id||label.startsWith('audit')&&JSON.parse(row.values.at(-1)).kind==='restore'));
   assert.ok(selected);assert.equal(selected.bytes,fixture.selected.bytes,label+' actual persisted complete record');assert.ok(writtenRows.every(row=>row.bytes<=ROW_BUDGET)||baseline);
   const receipt=sqlite.prepare("SELECT * FROM crm_mutations WHERE space='live' AND id=?").get(id),result=JSON.parse(receipt.result_json);assert.deepEqual(result,JSON.parse(JSON.stringify(fixture.projection.result)));assert.equal(receipt.user_id,account.user);assert.equal(receipt.request_hash,await store.requestHash('restore',data));
   assert.equal(sqliteRecordBytes([receipt.space,receipt.id,receipt.result_json,receipt.user_id,receipt.request_hash]),fixture.projection.rows.find(row=>row.table==='crm_mutations').bytes,'Actual nonempty receipt included');
   const byId=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));
   const oldEvents=new Set(fixture.state.events.map(event=>event.id));assert.deepEqual(byId(value.events.filter(event=>oldEvents.has(event.id))),byId(fixture.state.events));
   const generated=value.events.filter(event=>!oldEvents.has(event.id));assert.equal(generated.length,fixture.state.customers.length);assert.ok(generated.every(event=>event.kind==='restore'&&event.text==='Kundens CRM-data återställd från export'&&event.actor.id===account.user&&event.actor.name===fixture.actor.name));
   const generatedAuditRows=writtenRows.filter(row=>row.table==='crm_events'&&!oldEvents.has(row.id)).map(row=>({id:row.id,bytes:row.bytes}));assert.equal(generatedAuditRows.length,generated.length);
   for(const name of Object.keys(collections))if(name!=='events')assert.deepEqual(byId(value[name]),byId(fixture.projection.state[name]),'Full '+name+' survives data-only restore');assert.deepEqual(value.settings,fixture.projection.state.settings);
   const read=await get();const {mutationResult:_,...expected}=value;assert.deepEqual(read,expected);
   const replayBefore=raw();counters();probeOverride=new Error('Synthetic encoding unavailable on already committed retry');const replay=await post(data,{id,version:0});assert.equal(replay.status,200);assert.deepEqual(await replay.json(),{...read,mutationResult:result});assert.equal(commits,0);assert.equal(probes,0);assert.deepEqual(raw(),replayBefore,'Completed retry/double click does not duplicate rows, history or receipt');
   await deny(fixture,label+' changed actor',{status:409,user:other,id});
   const changed=structuredClone(fixture);changed.state.customers[0].name+=' ändrad avsikt';await deny(changed,label+' changed intent',{status:409,id});probeOverride=undefined;
   report.accepted.push({label,bytes:selected.bytes,dataColumnBytes:byteLength(selected.values.at(-1)),version:read.version,lostAcknowledgement:lost,receipt:result,actualReceiptBytes:sqliteRecordBytes([receipt.space,receipt.id,receipt.result_json,receipt.user_id,receipt.request_hash]),generatedAuditRows,exactRetryNoWrites:true});
  };
  if(baseline){
   const fixture=fixtureFor('event',ROW_BUDGET+1);assert.ok(byteLength(fixture.selected.values.at(-1))<ROW_BUDGET,'The JSON column fits; the complete indexed record exceeds D1');await accept(fixture,'event baseline overflow');
  }else{
   for(const layout of ['event','settings','audit','order'])for(const target of [ROW_BUDGET,ROW_BUDGET+1]){
    const fixture=fixtureFor(layout,target);validate(fixture);assert.equal(physicalRecord(fixture.selected.values),target);
    if(target===ROW_BUDGET)await accept(fixture,layout+' exact');else{reset();sqlite.prepare('UPDATE crm_members SET name=? WHERE id=?').run(fixture.actor.name,account.id);await deny(fixture,layout+' overflow');}
   }
   const small=fixtureFor('event',3000);
   for(const user of accounts.filter(user=>!['admin','other'].includes(user.role))){reset();await deny(small,user.role+' forbidden',{status:403,user});report.roles.push(user.role);}
   for(const [name,override] of [['UTF-16LE',{storage_probe:'41003DD800DE'}],['UTF-16BE',{storage_probe:'0041D83DDE00'}],['unknown',null],['read failure',new Error('Synthetic encoding read failure')]]){reset();probeOverride=override;await deny(small,name+' encoding');assert.equal(probes,1);report.encodingCases++;}
   reset();await deny(small,'stale workspace',{status:409,version:126});
   reset();const withFiles=structuredClone(small);withFiles.state.orders[0].proofFileId=metadata.id;withFiles.state.orders[0].proofVersion=metadata.version;await deny(withFiles,'data-only source references file without archive');
   reset();const before=raw();race=true;const response=await post({format:'magnussons-crm-1',state:small.state}),value=await response.json();assert.equal(response.status,409);assert.ok(value.error);assert.equal(commits,1);const expected=before;expected.tables.crm_spaces.find(row=>row.id==='live').version=128;assert.deepEqual(raw(),expected,'A lost CAS writes no restored rows, audit or receipt');
   await accept(small,'event lost acknowledgment',{lost:true});
  }
  report.httpRequests=requests;report.lostAcks=lostAcks;report.casRaces=races;report.observedDatabaseBindingEncodings=[...observedEncodings];if(!baseline)assert.deepEqual(report.observedDatabaseBindingEncodings,['41F09F9880']);report.sourceManifest=Object.fromEntries([...sourceBytes].map(([file,input])=>[file,hash(input)]));
  for(const [file,input] of sourceBytes)assert.deepEqual(readFileSync(resolve(sourceRoot,file)),input,'Source stayed fixed: '+file);
  if(evidencePath)writeFileSync(evidencePath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('PASS: '+(baseline?'baseline accepts':'candidate guards')+' data-only restore row budget, '+requests+' actual handler calls, '+report.physicalOracleCases+' physical SQLite checks, '+report.denials.length+' no-commit denials, '+report.accepted.length+' accepted rows, '+lostAcks+' lost ACK, '+races+' CAS race. Synthetic isolated SQLite/R2; no native/hosting/person claim.');return report;
 }finally{sqlite.close();if(original)Object.defineProperty(globalThis,'__crmEnv',original);else delete globalThis.__crmEnv;rmSync(directory,{recursive:true,force:true});}
}
