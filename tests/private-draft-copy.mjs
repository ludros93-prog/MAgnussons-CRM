import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Domain validation and actual authenticated handlers against migrated SQLite.
// Every row, account and R2 byte below is synthetic and local. A checksum proves
// accidental integrity only; a person can edit a file and recompute its hash.
const bytes=value=>new TextEncoder().encode(value).byteLength;
const digest=records=>createHash('sha256').update(JSON.stringify(records),'utf8').digest('hex');
const shape=(id,dataRaw='  {"unfinished":"45,", "date":"2026-02-30"}\n')=>({id,kind:'form',context:'year-need',revision:7,requestId:'legacy-request-id',title:'Privat syntetiskt behov åäö 😀',dataRaw,archived:false,updatedAt:'legacy unparsed time'});

export async function verifyPrivateDraftCopyDomain(copy){
 const ownerUserId='private-copy-user',space='live',exportedAt='2026-10-09T08:00:00.000Z',expected={ownerUserId,space};
 const records=[shape('draft-one'),{...shape('draft-two','{"future": [invalid unfinished raw'),kind:'future-draft-kind-v999',context:'missing-deleted-customer',archived:true},shape('draft-three','"\\\n\u0000\t<svg onload=alert(1)> 😀')];
 const original=structuredClone(records),value=await copy.createPrivateDraftCopy({ownerUserId,space,records,exportedAt});
 assert.deepEqual(records,original,'Creating a private copy must not normalize raw source records.');
 assert.deepEqual(value,{format:'magnussons-private-drafts-1',exportedAt,ownerUserId,space,records:original,integrity:{recordCount:3,sha256:digest(original)}});
 assert.deepEqual(await copy.verifyPrivateDraftCopy(value,expected),value);
 assert.deepEqual(await copy.parsePrivateDraftCopy(JSON.stringify(value),expected),value);
 const changing=structuredClone(value),verification=copy.verifyPrivateDraftCopy(changing,expected);changing.records[0].dataRaw='Late mutation while checksum is pending';assert.deepEqual(await verification,value,'The checked copy must remain frozen across its asynchronous checksum.');
 assert.equal(value.records[1].dataRaw,records[1].dataRaw,'Malformed and unknown future envelopes are preserved without JSON parsing.');
 const empty=await copy.createPrivateDraftCopy({ownerUserId,space,records:[],exportedAt});assert.deepEqual(empty.integrity,{recordCount:0,sha256:digest([])});
 let rejected=0;
 const reject=async(label,change,{rehash=false}={})=>{const changed=structuredClone(value);change(changed);if(rehash&&Array.isArray(changed.records)){changed.integrity.recordCount=changed.records.length;changed.integrity.sha256=digest(changed.records);}await assert.rejects(async()=>copy.verifyPrivateDraftCopy(changed,expected),undefined,label);rejected++;};
 for(const [label,change,rehash] of [
  ['wrong format',v=>v.format='magnussons-crm-backup-1'],['missing raw records',v=>delete v.records],['wrong record container',v=>v.records={}],['extra top-level field',v=>v.crmState={customers:[]}],['extra integrity field',v=>v.integrity.signed=true],
  ['foreign owner',v=>v.ownerUserId='another-private-copy-user'],['foreign workspace',v=>v.space='demo'],['invalid workspace',v=>v.space='team'],['empty owner identity',v=>v.ownerUserId=''],['invalid exported date',v=>v.exportedAt='2026-02-30T08:00:00.000Z'],['noncanonical exported instant',v=>v.exportedAt='2026-10-09T08:00:00Z'],
  ['missing revision',v=>delete v.records[0].revision,true],['negative revision',v=>v.records[0].revision=-1,true],['fractional revision',v=>v.records[0].revision=1.1,true],['unsafe revision',v=>v.records[0].revision=Number.MAX_SAFE_INTEGER+1,true],['numeric archive flag',v=>v.records[0].archived=1,true],['parsed instead of raw data',v=>v.records[0].dataRaw={text:'unsaved'},true],['empty ID',v=>v.records[0].id='',true],['extra row ownership field',v=>v.records[0].ownerUserId='another-user',true],['duplicate ID',v=>v.records[1].id=v.records[0].id,true],
  ['count mismatch',v=>v.integrity.recordCount++],['hash mismatch',v=>v.integrity.sha256='0'.repeat(64)],['malformed hash',v=>v.integrity.sha256='not-a-hash'],['modified raw data',v=>v.records[0].dataRaw+='changed'],['truncated record list',v=>v.records.pop()]
 ])await reject(label,change,{rehash:!!rehash});
 for(const raw of ['',JSON.stringify(value).slice(0,-1),JSON.stringify(value).slice(0,100),'{"format":"magnussons-private-drafts-1"}']){await assert.rejects(()=>copy.parsePrivateDraftCopy(raw,expected));rejected++;}
 await assert.rejects(()=>copy.parsePrivateDraftCopy(' '.repeat(copy.PRIVATE_DRAFT_COPY_MAX_FILE_BYTES+1),expected));rejected++;
 const utf8Oversize='😀'.repeat(Math.floor(copy.PRIVATE_DRAFT_COPY_MAX_FILE_BYTES/4)+1);assert.ok(utf8Oversize.length<copy.PRIVATE_DRAFT_COPY_MAX_FILE_BYTES);await assert.rejects(()=>copy.parsePrivateDraftCopy(utf8Oversize,expected),error=>error.reason==='too-large','The local-file bound must use UTF-8 bytes before attempting JSON parsing.');rejected++;
 await assert.rejects(()=>copy.createPrivateDraftCopy({ownerUserId,space,exportedAt,records:Array.from({length:copy.PRIVATE_DRAFT_COPY_MAX_RECORDS+1},(_,i)=>shape('count-'+i))}));rejected++;
 // Limits use actual escaped UTF-8 bytes, rather than string length or raw data
 // alone. One accepted source boundary and one byte over exercise the contract.
 const bounded=shape('exact-source',''),padding=copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES-bytes(JSON.stringify([bounded]));bounded.dataRaw='x'.repeat(padding);assert.equal(bytes(JSON.stringify([bounded])),copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES);
 const exact=await copy.createPrivateDraftCopy({ownerUserId,space,exportedAt,records:[bounded]});assert.equal(exact.records[0].dataRaw,bounded.dataRaw);
 for(const dataRaw of [bounded.dataRaw+'x','😀'.repeat(2_000_000),'\\'.repeat(4_000_000)]){await assert.rejects(()=>copy.createPrivateDraftCopy({ownerUserId,space,exportedAt,records:[{...bounded,dataRaw}]}));rejected++;}
 const edited=structuredClone(value);edited.records[0].dataRaw='Changed by whoever holds this local file';edited.integrity.sha256=digest(edited.records);assert.deepEqual(await copy.verifyPrivateDraftCopy(edited,expected),edited,'A recomputed checksum is integrity, not a signature or permission to restore.');
 console.log('PASS private draft copy domain: exact malformed/future/archived raw records, Unicode/escapes, empty copy, '+rejected+' format/ownership/workspace/schema/truncation/hash/byte/count rejections and accidental-integrity limits. No restore or authenticity is inferred.');
}

export async function verifyPrivateDraftCopy(h={}){
 const copy=h.copy||await import('../work/private-draft-copy.mjs'),api=h.copyApi||await import('../work/private-draft-copy-api.mjs');
 await verifyPrivateDraftCopyDomain(copy);
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
 const tables=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);assert.equal(tables.length,18,'Audit every migrated CRM/Outlook table.');
 const account={id:'private-copy-member',user:'private-copy-user',email:'private-copy@example.com'},other={id:'private-copy-other-member',user:'private-copy-other-user',email:'private-copy-other@example.com'},marker='SYNTHETIC-OTHER-PRIVATE-DO-NOT-DISCLOSE';
 const headers={'oai-authenticated-user-id':account.user,'oai-authenticated-user-email':account.email};
 let sqlWrites=0,r2Reads=0,r2Writes=0,queries=[],beforeQuery,afterQuery,mapSnapshot,snapshotResult;
 class Prepared{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Prepared(this.sql,values);}
  async first(){return (await this.read('first'))[0]||null;}
  async all(){let value={success:true,results:await this.read('all'),meta:{changes:0}};if(/\bcrm_drafts\b/i.test(this.sql)){if(mapSnapshot)value=mapSnapshot(value);snapshotResult=value;}return value;}
  async read(method){queries.push({sql:this.sql,method});if(beforeQuery)await beforeQuery(this.sql,method);const rows=sqlite.prepare(this.sql).all(...this.values);if(afterQuery)await afterQuery(this.sql,method);return rows;}
  async run(){const statement=sqlite.prepare(this.sql);if(statement.columns().length)return this.all();sqlWrites++;return{results:[],meta:{changes:Number(statement.run(...this.values).changes)}};}
 }
 const db={prepare:sql=>new Prepared(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const values=[];for(const statement of statements)values.push(await statement.run());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const env=globalThis.__crmEnv,previous={DB:env.DB,BUCKET:env.BUCKET,CRM_BOOTSTRAP_ADMINS:env.CRM_BOOTSTRAP_ADMINS},objects=new Map([['live/synthetic-customer/synthetic-file',new Uint8Array([0,255,128,4])]]),originalObjects=new Map(objects);
 env.DB=db;env.CRM_BOOTSTRAP_ADMINS=JSON.stringify([{email:account.email,name:'Syntetisk bootstrapadmin',owner:''}]);env.BUCKET={get:async()=>{r2Reads++;throw Error('Private copies must never read customer R2 files');},put:async()=>{r2Writes++;throw Error('Private copies must never upload R2');},delete:async()=>{r2Writes++;throw Error('Private copies must never delete R2');}};
 const snapshot=()=>JSON.stringify(Object.fromEntries(tables.map(table=>[table,sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])));
 const reset=(role='seller',user=account.user)=>{beforeQuery=afterQuery=mapSnapshot=snapshotResult=undefined;sqlite.prepare('DELETE FROM crm_members WHERE email=? OR id=?').run(account.email,'replacement-member');sqlite.prepare('INSERT OR REPLACE INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(account.id,account.email,user,'Syntetisk kopieanvändare',role,'Syntetisk säljprofil');sqlWrites=r2Reads=r2Writes=0;queries=[];};
 const insert=(record,space='live',user=account.user)=>sqlite.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(space,user,record.id,record.kind,record.context,record.revision,record.requestId,record.title,record.dataRaw,record.archived?1:0,record.updatedAt);
 const ownRecords=(space='live')=>sqlite.prepare('SELECT * FROM crm_drafts WHERE space=? AND user_id=? ORDER BY id').all(space,account.user).map(row=>({id:row.id,kind:row.kind,context:row.context,revision:row.revision,requestId:row.request_id,title:row.title,dataRaw:row.data,archived:!!row.archived,updatedAt:row.updated_at}));
 const request=(params={space:'live'},auth=headers)=>new Request('https://crm.test/api/crm/drafts/copy?'+new URLSearchParams(params),{headers:auth});
 const isSnapshot=sql=>/\bcrm_drafts\b/i.test(sql);
 const unchanged=(before,{writes=0}={})=>{assert.equal(snapshot(),before,'Read-only private copy must preserve every migrated table, version/token, ledger, private Outlook sentinels and draft revision.');assert.equal(sqlWrites,writes,'Authorization rechecks must not bootstrap or rebind a deleted/unbound account.');assert.equal(r2Reads,0);assert.equal(r2Writes,0);assert.deepEqual(objects,originalObjects);};
 const errorOnly=async(response,status,label)=>{assert.equal(response.status,status,label);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Content-Disposition'),null,'An error must never advertise a partial private download.');const body=await response.json();assert.deepEqual(Object.keys(body),['error'],label+' must expose no copy/current/viewer/private row.');assert.equal(typeof body.error,'string');assert.ok(!JSON.stringify(body).includes(marker),label+' must not disclose another user or private source error.');if(status===413){assert.equal(snapshotResult.results.length,1,'The SQL budget guard must return one metadata sentinel, not a partial raw archive.');const row=snapshotResult.results[0];assert.equal(row.present,0);for(const key of ['id','kind','context','revision','requestId','title','dataRaw','archived','updatedAt'])assert.equal(row[key],null,'The over-budget SELECT must not return raw '+key);}};
 const success=async(response,expected,space='live')=>{assert.equal(response.status,200);assert.match(response.headers.get('Content-Type')||'',/^application\/json/);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.match(response.headers.get('Content-Disposition')||'',/^attachment; filename="[^"\r\n]+\.json"$/);const raw=await response.text(),value=await copy.parsePrivateDraftCopy(raw,{ownerUserId:account.user,space});assert.deepEqual([...value.records].sort((a,b)=>a.id.localeCompare(b.id)),[...expected].sort((a,b)=>a.id.localeCompare(b.id)));assert.equal(value.integrity.sha256,digest(value.records));assert.equal(value.integrity.recordCount,expected.length);assert.ok(!raw.includes(marker),'The exported response must omit other users, other workspaces and Outlook/customer sentinels.');assert.equal(queries.filter(q=>isSnapshot(q.sql)).length,1,'One owner-filtered SQL snapshot must produce all records and budgets atomically.');return value;};
 const changes=[
  ['inactive',()=>sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id)],
  ['corrupt active flag',()=>sqlite.prepare('UPDATE crm_members SET active=2 WHERE id=?').run(account.id)],
  ['reader',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('reader',account.id)],
  ['production',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('production',account.id)],
  ['allowed role change',()=>sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('admin',account.id)],
  ['identity binding',()=>sqlite.prepare('UPDATE crm_members SET user_id=? WHERE id=?').run('different-'+account.user,account.id)],
  ['unbound identity',()=>sqlite.prepare('UPDATE crm_members SET user_id=NULL WHERE id=?').run(account.id)],
  ['owner profile',()=>sqlite.prepare('UPDATE crm_members SET owner=? WHERE id=?').run('Changed synthetic owner',account.id)],
  ['email',()=>sqlite.prepare('UPDATE crm_members SET email=? WHERE id=?').run('changed-private-copy@example.com',account.id)],
  ['account deletion',()=>sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id)],
  ['recreated membership',()=>{sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id);sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run('replacement-member',account.email,account.user,'Different synthetic membership','seller','Syntetisk säljprofil');}]
 ];
 let revoked=0,denials=0,finalCheckEpochs=0;
 try{
  // Opaque shared data is sufficient: this route may not load, normalize or
  // export any shared CRM state or private Outlook tokens/items/OAuth verifier.
  for(const space of ['demo','live']){
   sqlite.prepare('INSERT INTO crm_spaces(id,version,write_token,settings) VALUES(?,77,?,?)').run(space,'synthetic-'+space+'-token',JSON.stringify({owners:['Syntetisk säljprofil']}));
   sqlite.prepare('INSERT INTO crm_customers(id,space,data) VALUES(?,?,?)').run('synthetic-customer',space,JSON.stringify({name:marker}));
   sqlite.prepare('INSERT INTO crm_deals(id,space,customer_id,data) VALUES(?,?,?,?)').run('synthetic-deal',space,'synthetic-customer',JSON.stringify({private:marker}));
   sqlite.prepare('INSERT INTO crm_orders(id,space,customer_id,deal_id,data) VALUES(?,?,?,?,?)').run('synthetic-order',space,'synthetic-customer','synthetic-deal',JSON.stringify({private:marker}));
   for(const table of ['crm_events','crm_tasks','crm_meetings'])sqlite.prepare('INSERT INTO '+table+'(id,space,customer_id,data) VALUES(?,?,?,?)').run('synthetic-'+table,space,'synthetic-customer',JSON.stringify({private:marker}));
   for(const table of ['crm_articles','crm_company_events','crm_leads','crm_notices'])sqlite.prepare('INSERT INTO '+table+'(id,space,data) VALUES(?,?,?)').run('synthetic-'+table,space,JSON.stringify({private:marker}));
   sqlite.prepare('INSERT INTO crm_mutations(space,id,result_json,user_id,request_hash) VALUES(?,?,?,?,?)').run(space,'synthetic-ledger',JSON.stringify({private:marker}),other.user,'synthetic-request-hash');
  }
  sqlite.prepare('INSERT INTO crm_files(id,space,customer_id,object_key,data) VALUES(?,?,?,?,?)').run('synthetic-file','live','synthetic-customer','live/synthetic-customer/synthetic-file',JSON.stringify({private:marker}));
  sqlite.prepare('INSERT INTO outlook_connections(user_id,microsoft_id,email,tokens) VALUES(?,?,?,?)').run(other.user,'synthetic-ms','synthetic-outlook@example.com',marker+'-tokens');
  sqlite.prepare('INSERT INTO outlook_items(id,user_id,kind,data,happened_at,seen_at) VALUES(?,?,?,?,?,?)').run('synthetic-outlook-item',other.user,'email',marker+'-private-item','2026-10-09','2026-10-09');
  sqlite.prepare('INSERT INTO outlook_oauth_states(hash,user_id,verifier,expires) VALUES(?,?,?,?)').run('synthetic-oauth-hash',other.user,marker+'-verifier',123456789);
  sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(other.id,other.email,other.user,'Annan syntetisk administratör','admin','Syntetisk säljprofil');
  const active=shape('own-active'),archived={...shape('own-archived','{"unfinished":'),kind:'future-private-kind',context:'deleted-order',archived:true},unicode=shape('own-unicode','  åäö 😀 "\\\n\t\u0000  '),demo=shape('own-demo','SYNTHETIC-DEMO-ONLY');for(const row of [active,archived,unicode])insert(row);insert(demo,'demo');insert(shape('other-private',marker),'live',other.user);
  // Other users must not spend this owner's row or byte allowance. Every cell
  // stays below the native D1 2 MB limit; the other user's aggregate is large.
  for(let i=0;i<1001;i++)insert(shape('foreign-count-'+i,marker),'live',other.user);for(let i=0;i<9;i++)insert(shape('foreign-large-'+i,marker+'x'.repeat(1_000_000)),'live',other.user);
  for(const role of ['seller','admin']){reset(role);const before=snapshot();await success(await api.GET(request()),ownRecords());unchanged(before);}
  reset();let before=snapshot();await success(await api.GET(request({space:'demo'})),[demo],'demo');unchanged(before);
  sqlite.prepare('DELETE FROM crm_drafts WHERE user_id=? AND space=?').run(account.user,'demo');reset();before=snapshot();await success(await api.GET(request({space:'demo'})),[],'demo');unchanged(before);insert(demo,'demo');
  reset();before=snapshot();const guessed=await api.GET(request({space:'live',id:'other-private',user_id:other.user,ownerUserId:other.user}));if(guessed.status===200)await success(guessed,ownRecords());else{await errorOnly(guessed,400,'Unrecognized other-owner selector');denials++;}unchanged(before);
  for(const role of ['reader','production','print','warehouse']){reset(role);before=snapshot();await errorOnly(await api.GET(request()),403,'Initial '+role+' access');unchanged(before);denials++;}
  reset();sqlite.prepare('UPDATE crm_members SET active=0 WHERE id=?').run(account.id);before=snapshot();await errorOnly(await api.GET(request()),403,'Inactive initial account');unchanged(before);denials++;
  reset();sqlite.prepare('UPDATE crm_members SET active=2 WHERE id=?').run(account.id);before=snapshot();await errorOnly(await api.GET(request()),403,'Corrupt active flag');unchanged(before);denials++;
  for(const [label,auth,status] of [['anonymous',{},401],['identity mismatch',{...headers,'oai-authenticated-user-id':'different-user'},403],['unknown email',{...headers,'oai-authenticated-user-email':'unknown-copy@example.com'},403]]){reset();before=snapshot();await errorOnly(await api.GET(request({space:'live'},auth)),status,label);unchanged(before);denials++;}
  reset('seller',null);before=snapshot();await errorOnly(await api.GET(request()),403,'Unbound initial account cannot be bound by export');unchanged(before);denials++;
  reset();sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id);before=snapshot();await errorOnly(await api.GET(request()),403,'Configured bootstrap email cannot create an account during export');unchanged(before);denials++;
  for(const params of [{},{space:'team'}]){reset();before=snapshot();await errorOnly(await api.GET(request(params)),400,'Invalid workspace');unchanged(before);denials++;}

  // Revoke before/after the snapshot and at the distinct final authorization
  // lookup, after the real asynchronous checksum has completed. Every lookup
  // uses the original membership ID without rebootstrap/rebind.
  for(const phase of ['before snapshot','after snapshot','final member read'])for(const [label,revoke] of changes){
   reset();let injected=false,expected,memberReads=0,snapshotCompleted=false,digestCompleted=0,injectedAtMemberRead;
   const inject=()=>{assert.equal(injected,false);injected=true;revoke();expected=snapshot();};
   if(phase==='before snapshot')beforeQuery=async sql=>{if(!injected&&isSnapshot(sql))inject();};
   if(phase==='after snapshot')afterQuery=async sql=>{if(!injected&&isSnapshot(sql))inject();};
   const subtle=crypto.subtle,digestDescriptor=Object.getOwnPropertyDescriptor(subtle,'digest'),realDigest=subtle.digest;
   if(phase==='final member read'){
    Object.defineProperty(subtle,'digest',{configurable:true,writable:true,value:async function(...args){const result=await realDigest.apply(this,args);assert.equal(memberReads,2,'The real checksum must follow the post-snapshot authorization lookup.');assert.ok(snapshotCompleted);digestCompleted++;return result;}});
    afterQuery=async sql=>{if(isSnapshot(sql))snapshotCompleted=true;};
    beforeQuery=async sql=>{if(/FROM crm_members WHERE id=\?/i.test(sql)&&++memberReads===3){assert.ok(snapshotCompleted,'The final lookup must follow the complete SQL snapshot.');assert.equal(digestCompleted,1,'Inject only after the real asynchronous checksum has completed.');injectedAtMemberRead=memberReads;inject();}};
   }
   let response;try{response=await api.GET(request());}finally{beforeQuery=afterQuery=undefined;if(phase==='final member read'){if(digestDescriptor)Object.defineProperty(subtle,'digest',digestDescriptor);else delete subtle.digest;}}
   assert.ok(injected,phase+' hook '+label);if(phase==='final member read'){assert.equal(injectedAtMemberRead,3);assert.equal(digestCompleted,1);assert.equal(memberReads,4,'Final lookup revocation must also fail the readonly error-boundary recheck.');finalCheckEpochs++;}await errorOnly(response,403,phase+' '+label);unchanged(expected);revoked++;
  }
  // A legitimate binding made by another workflow before this request gives
  // export no right to rebind it after a revocation while reading the copy.
  reset();let injected=false,expected;afterQuery=async sql=>{if(!injected&&isSnapshot(sql)){injected=true;sqlite.prepare('UPDATE crm_members SET user_id=NULL WHERE id=?').run(account.id);expected=snapshot();}};await errorOnly(await api.GET(request()),403,'Unbound after established initial authorization');beforeQuery=afterQuery=undefined;assert.ok(injected);unchanged(expected);revoked++;
  // A private database failure after revocation cannot leak its error text or
  // turn the deleted bootstrap account into a new CRM member.
  reset();injected=false;afterQuery=async sql=>{if(!injected&&isSnapshot(sql)){injected=true;sqlite.prepare('DELETE FROM crm_members WHERE id=?').run(account.id);expected=snapshot();throw Error(marker+'-private-database-error');}};await errorOnly(await api.GET(request()),403,'Deleted member with private snapshot error');beforeQuery=afterQuery=undefined;unchanged(expected);revoked++;
  reset();before=snapshot();afterQuery=async sql=>{if(isSnapshot(sql))throw Error(marker+'-private-database-error');};await errorOnly(await api.GET(request()),503,'Authorized private snapshot error');beforeQuery=afterQuery=undefined;unchanged(before);denials++;

  // D1 transport/projection corruption cannot turn a dropped prefix into a
  // complete file, even when every row still comes from a legitimate read.
  for(const [label,map] of [
   ['unsuccessful query',v=>({...v,success:false})],['missing results',v=>({...v,results:undefined})],['non-array results',v=>({...v,results:{rows:v.results}})],['empty result',v=>({...v,results:[]})],['dropped final row',v=>({...v,results:v.results.slice(0,-1)})],
   ['inconsistent budget',v=>({...v,results:v.results.map((row,i)=>i?row:{...row,source_bytes:row.source_bytes+1})})],['uniform inflated budget',v=>({...v,results:v.results.map(row=>({...row,source_bytes:row.source_bytes+1}))})],['duplicate row ID',v=>({...v,results:v.results.map((row,i)=>i?{...row,id:v.results[0].id}:row)})],['missing raw field',v=>({...v,results:v.results.map((row,i)=>i?row:{...row,dataRaw:undefined})})],['unsafe count metadata',v=>({...v,results:v.results.map(row=>({...row,record_count:Number.MAX_SAFE_INTEGER+1}))})],['underestimated byte budget',v=>({...v,results:v.results.map(row=>({...row,source_bytes:2}))})]
  ]){reset();before=snapshot();mapSnapshot=map;await errorOnly(await api.GET(request()),503,'Incomplete/corrupt D1 '+label);mapSnapshot=undefined;unchanged(before);denials++;}

  // Simulate a peer's committed revision on both rows immediately before or
  // immediately after the snapshot await. The copy is one complete side of the
  // transaction, never a mixture or an export that changed the source itself.
  const storedBefore=ownRecords();
  for(const phase of ['before','after']){
   reset();const old=ownRecords();injected=false;
   const peer=()=>{injected=true;sqlite.exec('BEGIN');for(const row of [active,archived])sqlite.prepare('UPDATE crm_drafts SET revision=revision+1,data=? WHERE space=? AND user_id=? AND id=?').run('Peer-'+phase+'-'+row.id,'live',account.user,row.id);sqlite.exec('COMMIT');expected=snapshot();};
   if(phase==='before')beforeQuery=async sql=>{if(!injected&&isSnapshot(sql))peer();};else afterQuery=async sql=>{if(!injected&&isSnapshot(sql))peer();};
   const response=await api.GET(request());beforeQuery=afterQuery=undefined;assert.ok(injected);await success(response,phase==='before'?ownRecords():old);unchanged(expected);
  }
  for(const row of storedBefore)sqlite.prepare('UPDATE crm_drafts SET revision=?,data=? WHERE space=? AND user_id=? AND id=?').run(row.revision,row.dataRaw,'live',account.user,row.id);

  // Count and source-byte overflow deny the whole download, without allocating
  // or returning a prefix archive. Foreign rows above remain irrelevant.
  sqlite.prepare('DELETE FROM crm_drafts WHERE user_id=? AND space=?').run(account.user,'live');
  for(let i=0;i<copy.PRIVATE_DRAFT_COPY_MAX_RECORDS;i++)insert(shape('own-count-'+String(i).padStart(4,'0'),'{}'));
  reset();before=snapshot();await success(await api.GET(request()),ownRecords());unchanged(before);
  insert(shape('own-count-over','{}'));reset();before=snapshot();await errorOnly(await api.GET(request()),413,'More than 1000 owner rows');unchanged(before);denials++;
  sqlite.prepare('DELETE FROM crm_drafts WHERE user_id=? AND space=?').run(account.user,'live');
  const bounded=shape('owner-byte-boundary','x'.repeat(250_000));insert(bounded);reset();before=snapshot();await success(await api.GET(request()),[bounded]);unchanged(before);
  // SQL uses a conservative pre-allocation JSON-escape allowance. It can deny
  // a source whose exact serialized size is below 8 MB, rather than returning
  // an unsafe prefix or constructing a D1 cell larger than its native limit.
  for(const [label,dataRaw] of [['ASCII conservative source overflow','x'.repeat(Math.ceil(copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES/6))],['Unicode conservative byte overflow','😀'.repeat(Math.ceil(copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES/24))],['escaped conservative byte overflow','\\'.repeat(Math.ceil(copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES/6))]]){assert.ok(bytes(dataRaw)<2_000_000,'Synthetic source cells must respect D1 native size.');assert.ok(bytes(JSON.stringify([shape(bounded.id,dataRaw)]))<copy.PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES,'This case documents conservative denial below the exact final file limit.');sqlite.prepare('UPDATE crm_drafts SET data=? WHERE user_id=? AND space=?').run(dataRaw,account.user,'live');reset();before=snapshot();await errorOnly(await api.GET(request()),413,label);unchanged(before);denials++;}
  sqlite.prepare('DELETE FROM crm_drafts WHERE user_id=? AND space=?').run(account.user,'live');for(let i=0;i<9;i++)insert(shape('owner-total-over-'+i,'x'.repeat(1_000_000)));reset();before=snapshot();await errorOnly(await api.GET(request()),413,'Aggregate serialized source over 8 MB with individually bounded D1 cells');unchanged(before);denials++;
  // Corrupt relational metadata cannot be returned as a misleading valid file.
  sqlite.prepare('DELETE FROM crm_drafts WHERE user_id=? AND space=?').run(account.user,'live');insert(shape('invalid-stored-metadata','{}'));
  sqlite.prepare('UPDATE crm_drafts SET data=?,archived=? WHERE user_id=? AND space=?').run('{}',2,account.user,'live');reset();before=snapshot();const invalidMetadata=await api.GET(request());assert.ok(invalidMetadata.status>=400);await errorOnly(invalidMetadata,invalidMetadata.status,'Invalid stored archive metadata');unchanged(before);denials++;
  assert.equal(finalCheckEpochs,changes.length,'Every membership revocation must reach the distinct post-digest final authorization epoch.');
  console.log('PASS private draft copy authenticated API: seller/admin own-only active+archived exact raw data; demo/live and known-other-ID isolation; '+denials+' initial/schema/error/budget denials; '+revoked+' original-member authorization revocations including '+finalCheckEpochs+' distinct post-digest final checks, with no rebinding/bootstrap; atomic peer snapshots; exact 1000-row boundary, conservative UTF-8/escaping and aggregate source overflow with bounded D1 cells; all 18 migrated tables, ledger/version/Outlook sentinels and R2 unchanged.');
 }finally{env.DB=previous.DB;env.BUCKET=previous.BUCKET;env.CRM_BOOTSTRAP_ADMINS=previous.CRM_BOOTSTRAP_ADMINS;sqlite.close();}
}
