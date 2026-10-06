import assert from 'node:assert/strict';

// Recovery is read-only until the user chooses a version. Rejecting a server
// comparison must not normalize an incomplete original or mutate either body.
export function verifyArticleDraftServerVersions({ArticleSchema,contracts,conflicts}) {
 const id='article-server-comparison',base=ArticleSchema.parse({id:'synthetic-existing-article',sourceId:'synthetic-source',sku:'RECOVERY-SKU',name:'Syntetisk återhämtning'});
 const envelope=original=>({draftId:id,type:'article',base:original,data:{...original,name:'  Ofärdigt privat namn  ',url:'javascript:unfinished-private-url',price:-7,cost:null},expectedRecord:conflicts.recordBasis(original),initialData:conflicts.recordBasis(original)});
 const active={id,kind:'form',context:'article',revision:3,requestId:'f7e92f7e-3984-480a-95f8-5c87d856baf0',title:'  Privat rå titel  ',data:envelope(base),archived:false,updatedAt:'2026-10-06T23:00:00.000Z'};
 const archived={...active,revision:4,archived:true};
 const newBase=ArticleSchema.parse({sourceId:base.sourceId,sku:'RECOVERY-NEW',name:'Syntetisk ny artikel'}),newDraft={...active,data:envelope(newBase)};
 for(const record of [active,archived,newDraft]) {
  const before=JSON.stringify(record),selected=contracts.articleDraftServerVersion(record,id,record.data.base.id);
  assert.strictEqual(selected,record,'Inspection must return the exact raw server object, including unfinished private values.');
  assert.equal(JSON.stringify(record),before,'Inspecting a comparison cannot mutate its raw body.');
 }
 assert.equal(contracts.articleDraftServerVersion(archived,id,base.id).archived,true,'An archived server record stays archived; inspection must not revive it.');
 const otherBase={...base,id:'synthetic-other-article'},wrongTarget={...active,data:envelope(otherBase)};
 const invalid=[
  ['different requested draft',active,'another-private-draft',base.id],
  ['different envelope draft', {...active,data:{...active.data,draftId:'another-private-draft'}},id,base.id],
  ['wrong draft kind',{...active,kind:'catalog'},id,base.id],
  ['wrong draft context',{...active,context:'customer'},id,base.id],
  ['unsaved revision',{...active,revision:0},id,base.id],
  ['fractional revision',{...active,revision:1.5},id,base.id],
  ['invalid persisted request ID',{...active,requestId:'not-a-uuid'},id,base.id],
  ['changed original target',wrongTarget,id,base.id],
  ['malformed envelope',{...active,data:{...active.data,unexpected:'not an article envelope field'}},id,base.id],
  ['incomplete private values',{...active,data:{...active.data,data:{name:'only one unfinished field'}}},id,base.id]
 ];
 const missingArchive=structuredClone(active);delete missingArchive.archived;invalid.push(['missing explicit archived state',missingArchive,id,base.id]);
 // These envelopes pass the general parser: defaults/trim reconstruct the
 // canonical original. Recovery must reject that reconstruction rather than
 // silently presenting it as the server version the user is selecting.
 const missingDefault=structuredClone(active);delete missingDefault.data.base.active;
 const trimmedOriginal=structuredClone(active);trimmedOriginal.data.base.name='  '+base.name+'  ';
 const missingNewId=structuredClone(newDraft);delete missingNewId.data.base.id;
 for(const [label,record,articleId] of [['missing original default',missingDefault,base.id],['trimmed original basis',trimmedOriginal,base.id],['missing new-article ID',missingNewId,'']]) {
  assert.equal(contracts.ArticleDraftEnvelopeSchema.safeParse(record.data).success,true,'Fixture must exercise normalization rather than an already malformed envelope: '+label);
  invalid.push([label,record,id,articleId]);
 }
 for(const [label,record,draftId,articleId] of invalid) {
  const before=JSON.stringify(record);
  assert.equal(contracts.articleDraftServerVersion(record,draftId,articleId),null,'An unsafe comparison cannot be selected: '+label);
  assert.equal(JSON.stringify(record),before,'Rejected comparisons must retain their raw text for reading/copying: '+label);
 }
 console.log('PASS article draft server comparison: 3 exact raw active/archived/new records; '+invalid.length+' rejected identity, target, persisted-state and envelope/normalization cases; no input mutation.');
}

// Real authenticated handlers and the SQLite transaction gate. These articles,
// actors and private texts are fictitious and exist only in the isolated test.
export async function verifyArticleDrafts({core,sqlite,get,headers,api,draftApi,conflicts}) {
 const {ArticleSchema}=await import('../work/operations.mjs');
 const contracts=await import('../work/article-drafts.mjs');
 verifyArticleDraftServerVersions({ArticleSchema,contracts,conflicts});
 const store=await import('../work/crm-store.mjs');await store.initialize('live');await store.initialize('demo');
 const suffix=crypto.randomUUID(),space='live';let state=await get(space);
 await get('demo');
 const counts={privateWrites:0,articleRequests:0,rejected400:0,rejected403:0,rejected409:0,privateCasRaces:0,sqlDraftRaces:0,sqlWorkspaceRaces:0,directCasRaces:0,doubleClickPairs:0,exactReplays:0};
 const accounts=Object.fromEntries(['admin','other','seller','reader','production','warehouse','print'].map(role=>{
  const id='article-draft-'+role+'-'+suffix;
  return [role,{id,user:id+'-user',email:id+'@example.test',role:role==='other'?'admin':role}];
 }));
 for(const a of Object.values(accounts))sqlite.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').run(a.id,a.email,a.user,'Syntetisk privat artikelaktör',a.role,'');
 const identity=a=>({'oai-authenticated-user-id':a.user,'oai-authenticated-user-email':a.email});
 const tableNames=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(r=>r.name).filter(n=>/^(?:crm_|outlook_)[a-z_]+$/.test(n));
 const quoted=name=>'"'+name.replaceAll('"','""')+'"';
 const raw=()=>Object.fromEntries(tableNames.map(name=>{
  const columns=sqlite.prepare('PRAGMA table_info('+quoted(name)+')').all().map(c=>quoted(c.name));
  return [name,sqlite.prepare('SELECT * FROM '+quoted(name)+' ORDER BY '+columns.join(',')).all()];
 }));
 const unchanged=(before,message)=>assert.deepEqual(raw(),before,message);
 const unchangedExceptDrafts=(before,message)=>{const after=raw();for(const name of tableNames)if(name!=='crm_drafts')assert.deepEqual(after[name],before[name],message+' ('+name+')');};
 const source=state.settings.catalogSources[0]?.id;assert.ok(source,'The isolated fixture requires an article source.');
 const fresh=(label,patch={})=>ArticleSchema.parse({sourceId:source,sku:'PRIVATE-ARTICLE-'+label+'-'+suffix,name:'Syntetisk artikel '+label,...patch});
 const article=id=>state.articles.find(a=>a.id===id);
 const envelope=(base,data=base,draftId=crypto.randomUUID())=>({draftId,type:'article',data,base,expectedRecord:conflicts.recordBasis(base),initialData:conflicts.recordBasis(base)});
 const input=draft=>({...structuredClone(draft.data.data),draft:{id:draft.id,revision:draft.revision}});
 async function readDraft(id='',account=accounts.admin,workspace=space) {
  const r=await draftApi.GET(new Request('https://crm.test/api/crm/drafts?'+new URLSearchParams({space:workspace,...(id?{id}:{})}),{headers:identity(account)}));
  return {status:r.status,data:await r.json()};
 }
 async function writeDraft(data,account=accounts.admin,workspace=space) {
  counts.privateWrites++;
  const r=await draftApi.POST(new Request('https://crm.test/api/crm/drafts',{method:'POST',headers:{...identity(account),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,...data})}));
  return {status:r.status,data:await r.json()};
 }
 async function business(st,type,data,{account=accounts.admin,requestId=crypto.randomUUID(),workspace=space,expectedRecord,omitExpected=false}={}) {
  if(type==='article')counts.articleRequests++;
  const basis=expectedRecord??(data?.draft?undefined:conflicts.recordBasis(st.articles.find(a=>a.id===data?.id)));
  const r=await api.POST(new Request('https://crm.test/api/crm',{method:'POST',headers:{...identity(account),Origin:'https://crm.test','Content-Type':'application/json'},body:JSON.stringify({space:workspace,version:st.version,requestId,type,data,...(!omitExpected&&basis!==undefined?{expectedRecord:basis}:{})})}));
  const result={status:r.status,data:await r.json(),id:requestId};
  if(r.status===400)counts.rejected400++;if(r.status===403)counts.rejected403++;if(r.status===409)counts.rejected409++;return result;
 }
 async function fixture(base) {
  const r=await business(state,'article',base);assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);
  const saved=state.articles.find(a=>a.sourceId===base.sourceId&&a.sku===base.sku&&a.variantId===base.variantId&&a.color===base.color&&a.size===base.size&&a.variant===base.variant);assert.ok(saved);return saved;
 }
 async function makeDraft(base,data=base,{account=accounts.admin,draftId=crypto.randomUUID(),kind='form',context='article'}={}) {
  const before=raw(),r=await writeDraft({id:draftId,kind,context,revision:0,requestId:crypto.randomUUID(),title:'Privat syntetiskt artikelunderlag',data:envelope(base,data,draftId)},account);
  assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'Article autosave must not change business data');return r.data;
 }
 async function updateDraft(draft,data,account=accounts.admin) {
  const before=raw(),r=await writeDraft({...draft,data,requestId:crypto.randomUUID()},account);assert.equal(r.status,200,JSON.stringify(r.data));unchangedExceptDrafts(before,'Private article editing must not change business data');return r.data;
 }
 async function reject(draft,data=input(draft),status=400,options={}) {
  const before=raw(),r=await business(state,'article',data,{expectedRecord:draft.data.expectedRecord,...options});assert.equal(r.status,status,JSON.stringify(r.data));unchanged(before,'A rejected article publication must preserve all application tables');return r;
 }
 async function publish(draft,{requestId=crypto.randomUUID()}={}) {
  const before=state,data=input(draft),r=await business(before,'article',data,{requestId,expectedRecord:draft.data.expectedRecord});assert.equal(r.status,200,JSON.stringify(r.data));state=await get(space);assert.equal(state.version,before.version+1);
  const saved=(await readDraft(draft.id)).data[0];assert.equal(saved.archived,true);assert.equal(saved.revision,draft.revision+1);assert.deepEqual(saved.data,draft.data);assert.ok(!(await readDraft()).data.some(d=>d.id===draft.id));return {before,data,r,saved};
 }

 // Incomplete and unsafe publication fields remain intact in private storage.
 const base=fresh('incomplete'),unfinished={...base,sku:'',name:'',url:'javascript:PRIVATE UNFINISHED ARTICLE',price:-1,cost:null,variant:'  PRIVATE UNFINISHED variant  '};
 const incomplete=await makeDraft(base,unfinished);
 assert.deepEqual((await readDraft(incomplete.id)).data[0].data.data,unfinished);
 assert.ok(!JSON.stringify(await get(space)).includes('PRIVATE UNFINISHED'));
 assert.deepEqual((await readDraft(incomplete.id,accounts.other)).data,[],'Another administrator cannot read private article text.');
 assert.deepEqual((await readDraft(incomplete.id,accounts.seller)).data,[]);
 assert.deepEqual((await readDraft(incomplete.id,accounts.admin,'demo')).data,[]);
 const retryBefore=raw(),retry=await writeDraft({...incomplete,revision:0});assert.equal(retry.status,200);assert.equal(retry.data.revision,incomplete.revision);unchanged(retryBefore,'An exact private retry cannot add a revision');
 for(const patch of [
  {data:{...incomplete.data,data:{...incomplete.data.data,variant:'Different private content with the same request ID'}}},
  {title:'A different private title with the same request ID'},
  {archived:true},{kind:'catalog'},{context:'customer'}
 ]) {
  const before=raw(),r=await writeDraft({...incomplete,revision:0,...patch});assert.equal(r.status,409,JSON.stringify(r.data));assert.deepEqual(r.data.current,incomplete);unchanged(before,'Reusing a private article request ID for different content cannot acknowledge or write it');
 }
 // The new replay-body check is scoped to article drafts. Existing catalog and
 // ordinary form request replays still acknowledge their stored original row.
 for(const [kind,context] of [['catalog',''],['form','customer']]) {
  const original={id:crypto.randomUUID(),kind,context,revision:0,requestId:crypto.randomUUID(),title:'Syntetiskt befintligt privat format',data:{notes:'Stored non-article original'}};
  const stored=await writeDraft(original);assert.equal(stored.status,200);
  const before=raw(),replay=await writeDraft({...original,data:{notes:'Legacy replay content'}});assert.equal(replay.status,200);assert.deepEqual(replay.data,stored.data);unchanged(before,'Existing non-article replay semantics must remain unchanged');
 }
 const beforeIncomplete=raw(),invalid=await business(state,'article',{...unfinished,draft:{id:incomplete.id,revision:incomplete.revision}},{expectedRecord:incomplete.data.expectedRecord});assert.equal(invalid.status,400);unchanged(beforeIncomplete,'Incomplete private values cannot be published');assert.equal((await readDraft(incomplete.id)).data[0].archived,false);
 assert.equal(contracts.ArticleDraftValuesSchema.safeParse({...base,price:Infinity}).success,false);
 for(const patch of [{kind:'catalog'},{context:'customer'}]) {
  const before=raw(),r=await writeDraft({...incomplete,...patch,requestId:crypto.randomUUID()});assert.equal(r.status,400);unchanged(before,'The private draft kind and context are immutable');
 }
 for(const makeBad of [
  e=>({...e,draftId:crypto.randomUUID()}),e=>({...e,type:'customer'}),e=>({...e,expectedRecord:'spoofed original'}),e=>({...e,initialData:'spoofed original'}),
  e=>({...e,data:{...e.data,id:'different-record'}}),e=>({...e,data:{...e.data,extra:'unexpected private field'}}),e=>({...e,extra:'unexpected envelope field'}),
  e=>({...e,base:{...e.base,url:'javascript:invalid-base'}}),e=>({...e,data:{...e.data,price:'12'}})
 ]) {
  const id=crypto.randomUUID(),before=raw(),r=await writeDraft({id,kind:'form',context:'article',revision:0,requestId:crypto.randomUUID(),title:'Ogiltigt privat artikelunderlag',data:makeBad(envelope(base,base,id))});assert.equal(r.status,400,JSON.stringify(r.data));unchanged(before,'Malformed article envelopes must never write');
 }
 assert.equal((await draftApi.GET(new Request('https://crm.test/api/crm/drafts?space=live'))).status,401);
 for(const account of [accounts.seller,accounts.reader,accounts.production,accounts.warehouse,accounts.print]) {
  const before=raw(),id=crypto.randomUUID(),r=await writeDraft({id,kind:'form',context:'article',revision:0,requestId:crypto.randomUUID(),title:'Otillåten artikel',data:envelope(base,base,id)},account);assert.equal(r.status,403);
  if(account.role!=='seller')assert.equal((await readDraft('',account)).status,403);
  await reject(incomplete,{...unfinished,draft:{id:incomplete.id,revision:incomplete.revision}},403,{account});unchanged(before,'Article draft and publication role denials must preserve all tables');
 }

 // Local IDs are private to each identity, even for two administrators.
 {
  const id=crypto.randomUUID(),mine=await makeDraft(fresh('same-id-A'),undefined,{draftId:id}),other=await makeDraft(fresh('same-id-B'),undefined,{draftId:id,account:accounts.other});
  assert.deepEqual((await readDraft(id)).data[0],mine);assert.deepEqual((await readDraft(id,accounts.other)).data[0],other);assert.notDeepEqual(mine.data,other.data);
 }
 // Draft CAS protects two actual devices and returns the winning private body.
 {
  const draft=await makeDraft(fresh('two-devices')),before=raw();
  const writes=await Promise.all(['Enhet A','Enhet B'].map(name=>writeDraft({...draft,requestId:crypto.randomUUID(),data:{...draft.data,data:{...draft.data.data,name}}})));
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);counts.privateCasRaces++;
  const winner=writes.find(r=>r.status===200).data,loser=writes.find(r=>r.status===409).data;
  assert.equal(winner.revision,draft.revision+1);assert.deepEqual(loser.current,winner);assert.deepEqual((await readDraft(draft.id)).data[0],winner);unchangedExceptDrafts(before,'Two-device article CAS cannot change shared data');
 }

 const existing=await fixture(fresh('existing'));
 const protectedBusiness=()=>{const copy=structuredClone(state);delete copy.articles;delete copy.version;return copy;};
 const businessOriginal=protectedBusiness();
 const valid=await makeDraft(existing,{...existing,name:'  Publicerad syntetisk artikel  ',price:123.45,cost:null});
 const bound=input(valid);
 await reject(valid,{...bound,draft:{...bound.draft,revision:valid.revision+1}},409);
 await reject(valid,{...bound,draft:{...bound.draft,id:crypto.randomUUID()}},409);
 await reject(valid,bound,409,{account:accounts.other});
 await reject(valid,{...bound,name:'Annan text än det sparade utkastet'});
 await reject(valid,{...bound,name:bound.name.trim()},400);
 await reject(valid,{...bound,price:999});
 await reject(valid,{...bound,unexpected:'A publication cannot silently drop this field'});
 await reject(valid,bound,409,{expectedRecord:'spoofed original'});
 await reject(valid,bound,409,{omitExpected:true});
 const different=await fixture(fresh('different'));
 {
  const before=raw(),r=await writeDraft({...valid,requestId:crypto.randomUUID(),data:envelope(different,different,valid.id)});assert.equal(r.status,400);unchanged(before,'A private article draft cannot switch its persisted target ID');
 }
 const otherDraft=await makeDraft(different,{...different,name:'Ett annat sparat artikelunderlag'});
 await reject(valid,{...bound,draft:{id:otherDraft.id,revision:otherDraft.revision}});
 await reject(valid,{...bound,id:different.id},409);
 const wrongKind=await makeDraft(existing,existing,{kind:'catalog',context:''});
 await reject(valid,{...bound,draft:{id:wrongKind.id,revision:wrongKind.revision}});
 const demoBefore=raw(),crossSpace=await business(await get('demo'),'article',bound,{workspace:'demo',expectedRecord:valid.data.expectedRecord});assert.equal(crossSpace.status,409);unchanged(demoBefore,'A live private article draft cannot be consumed in demo');
 const published=await publish(valid);
 assert.equal(article(existing.id).name,'Publicerad syntetisk artikel');assert.equal(article(existing.id).price,123.45);assert.equal(article(existing.id).cost,null,'Unknown cost must stay unknown');
 assert.deepEqual(protectedBusiness(),businessOriginal,'Article publication cannot change accepted orders, customer care, sales attribution or activities');
 const replayBefore=raw(),replay=await business(published.before,'article',published.data,{requestId:published.r.id,expectedRecord:valid.data.expectedRecord});assert.equal(replay.status,200);counts.exactReplays++;unchanged(replayBefore,'A successful request retry must not publish or archive twice');
 await reject(valid,{...published.data,price:555},409,{requestId:published.r.id});
 await reject(valid,published.data,409);
 const archivedBefore=raw(),archivedSave=await writeDraft({...valid,requestId:crypto.randomUUID(),data:{...valid.data,data:{...valid.data.data,name:'Stale autosave'}}});assert.equal(archivedSave.status,409);unchanged(archivedBefore,'Archived article drafts cannot be revived by stale autosave');

 // Reopening the private original cannot silently adopt a colleague's article.
 {
  const original=article(existing.id),mine=await makeDraft(original,{...original,name:'Mitt äldre privata artikelarbete'}),opened=state;
  const peer=await business(opened,'article',{...original,name:'Kollegans aktuella artikel'},{account:accounts.other,expectedRecord:conflicts.recordBasis(original)});assert.equal(peer.status,200);state=await get(space);
  assert.deepEqual((await readDraft(mine.id)).data[0].data,mine.data);
  const first=await reject(mine,input(mine),409);assert.equal(first.data.code,'record_conflict');
  const retryBefore=raw(),retry=await business(first.data.state,'article',input(mine),{requestId:first.id,expectedRecord:mine.data.expectedRecord});assert.equal(retry.status,409);unchanged(retryBefore,'An unchanged retry cannot adopt newer article basis');
  await reject(mine,input(mine),400,{expectedRecord:conflicts.recordBasis(article(existing.id))});
  assert.equal((await readDraft(mine.id)).data[0].archived,false);
 }
 // A private autosave between validation and SQL commit rolls back all CRM work.
 {
  const original=article(existing.id),mine=await makeDraft(original,{...original,name:'Atomisk artikelpublicering'}),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterAutosave;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.sqlDraftRaces++;const r=await writeDraft({...mine,requestId:crypto.randomUUID(),data:{...mine.data,data:{...mine.data.data,name:'Nyare privat enhetstext'}}});assert.equal(r.status,200);afterAutosave=raw();}return normalBatch(statements);};
  let r;try{r=await business(state,'article',input(mine),{expectedRecord:mine.data.expectedRecord});}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,409,JSON.stringify(r.data));unchanged(afterAutosave,'Losing private article revision must roll back the entire CRM mutation');
  const active=(await readDraft(mine.id)).data[0];assert.equal(active.archived,false);assert.equal(active.revision,mine.revision+1);state=await get(space);
 }
 // A private publication retries an unrelated workspace CAS loss using the
 // frozen original and private revision, but never replaces the same article.
 for(const sameArticle of [false,true]) {
  const original=article(existing.id),mine=await makeDraft(original,{...original,name:'Mitt artikelarbete efter CRM-CAS'}),opened=state,peerId=sameArticle?existing.id:different.id,peer=article(peerId),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterPeer;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.sqlWorkspaceRaces++;const r=await business(opened,'article',{...peer,name:'Kollegans CRM-CAS-artikel '+sameArticle},{account:accounts.other,expectedRecord:conflicts.recordBasis(peer)});assert.equal(r.status,200,JSON.stringify(r.data));afterPeer=raw();}return normalBatch(statements);};
  let r;try{r=await business(opened,'article',input(mine),{expectedRecord:mine.data.expectedRecord});}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,sameArticle?409:200,JSON.stringify(r.data));
  if(sameArticle)unchanged(afterPeer,'Same-article CAS loss cannot consume or overwrite private work');
  state=await get(space);assert.equal((await readDraft(mine.id)).data[0].archived,!sameArticle);assert.equal(article(peerId).name,'Kollegans CRM-CAS-artikel '+sameArticle);if(!sameArticle)assert.equal(article(existing.id).name,'Mitt artikelarbete efter CRM-CAS');
 }
 // Direct article edits and source imports retain their conservative global
 // CAS behavior. Only the private, revision-bound article path can retry.
 for(const type of ['article','article_import']) {
  const original=article(existing.id),opened=state,peer=article(different.id),db=globalThis.__crmEnv.DB,normalBatch=db.batch;let injected=false,afterPeer;
  db.batch=async statements=>{if(!injected&&statements[0]?.sql.startsWith('UPDATE crm_spaces')){injected=true;counts.directCasRaces++;const r=await business(opened,'article',{...peer,name:'Kollegans CAS under '+type},{account:accounts.other,expectedRecord:conflicts.recordBasis(peer)});assert.equal(r.status,200);afterPeer=raw();}return normalBatch(statements);};
  const candidate={...original,name:'Opublicerat konservativt CAS-underlag '+type};let r;
  try{r=await business(opened,type,type==='article'?candidate:{articles:[candidate]},{expectedRecord:conflicts.recordBasis(original)});}finally{db.batch=normalBatch;}
  assert.ok(injected);assert.equal(r.status,409);unchanged(afterPeer,'Direct article/import CAS must not adopt a new workspace revision');state=await get(space);
 }

 // A new private article cannot upsert a colleague's natural-key match. Imports
 // retain their intentional refresh-by-source/SKU/variant behavior.
 {
  const collision=fresh('natural-key'),mine=await makeDraft(collision,{...collision,name:'Min nya privata artikel'});
  const peer=await fixture({...collision,name:'Kollegans artikel med samma nyckel',price:222,cost:111});
  await reject(mine);assert.equal(article(peer.id).name,'Kollegans artikel med samma nyckel');assert.equal((await readDraft(mine.id)).data[0].archived,false);
  const countBefore=state.articles.length,imported=await business(state,'article_import',{articles:[{...collision,name:'Avsiktlig syntetisk källuppdatering',price:333,cost:null}]});assert.equal(imported.status,200);state=await get(space);assert.equal(state.articles.length,countBefore);assert.equal(article(peer.id).name,'Avsiktlig syntetisk källuppdatering');assert.equal(article(peer.id).price,333);assert.equal(article(peer.id).cost,null);
 }
 // Double-click sends the exact same frozen body and request ID twice. One
 // article, one mutation record and one private archive acknowledge both calls.
 {
  const draft=await makeDraft(fresh('double-click')),opened=state,data=input(draft),requestId=crypto.randomUUID(),countBefore=opened.articles.length;
  const clicks=await Promise.all([business(opened,'article',data,{requestId,expectedRecord:draft.data.expectedRecord}),business(opened,'article',data,{requestId,expectedRecord:draft.data.expectedRecord})]);
  assert.deepEqual(clicks.map(r=>r.status),[200,200]);counts.doubleClickPairs++;state=await get(space);assert.equal(state.version,opened.version+1);assert.equal(state.articles.length,countBefore+1);assert.equal(state.articles.filter(a=>a.sku===draft.data.data.sku).length,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM crm_mutations WHERE space=? AND id=?').get(space,requestId).n,1);
  const archived=(await readDraft(draft.id)).data[0];assert.equal(archived.archived,true);assert.equal(archived.revision,draft.revision+1);
 }
 // A removed article's old ID cannot recreate it or archive the private draft.
 {
  const removed=await fixture(fresh('removed')),draft=await makeDraft(removed,{...removed,name:'Privat arbete för borttagen artikel'});
  sqlite.prepare('DELETE FROM crm_articles WHERE space=? AND id=?').run(space,removed.id);state=await get(space);
  await reject(draft);assert.equal((await readDraft(draft.id)).data[0].archived,false);assert.ok(!article(removed.id));
 }
 // An administrator downgraded to seller retains access to their own private
 // text and may explicitly archive it, but cannot edit or publish that text.
 {
  const draft=await makeDraft(fresh('downgraded'));
  sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('seller',accounts.admin.id);
  try {
   assert.deepEqual((await readDraft(draft.id)).data[0],draft);
   const before=raw(),edit=await writeDraft({...draft,requestId:crypto.randomUUID(),data:{...draft.data,data:{...draft.data.data,name:'Otillåten ändring'}}});assert.equal(edit.status,403);unchanged(before,'A downgraded actor cannot edit article drafts');
   const titleBefore=raw(),title=await writeDraft({...draft,requestId:crypto.randomUUID(),archived:true,title:'Otillåten titeländring'});assert.equal(title.status,403);unchanged(titleBefore,'Archiving cannot hide a private article edit after role downgrade');
   await reject(draft,input(draft),403);
   const beforeArchive=raw(),archived=await writeDraft({...draft,requestId:crypto.randomUUID(),archived:true});assert.equal(archived.status,200);assert.equal(archived.data.archived,true);unchangedExceptDrafts(beforeArchive,'Explicit private archive cannot change shared articles');
  } finally {sqlite.prepare('UPDATE crm_members SET role=? WHERE id=?').run('admin',accounts.admin.id);}
 }
 console.log('PASS private article drafts: incomplete authenticated persistence; strict owner/workspace/role and original basis; exact canonical consume; private and CRM CAS rollback; natural-key collision protected with import upsert retained; atomic create/archive, request replay and double-click. '+JSON.stringify(counts));
 return counts;
}
