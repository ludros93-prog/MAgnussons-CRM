import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Synthetic fixture writes only. Export requests use ordinary built HTTP against
// real migrated D1; every request must preserve all 18 tables and R2 bytes.
export async function verifyPrivateDraftCopyNative({db,raw,headers,ready}) {
 const suffix=crypto.randomUUID(), prefix='copy-native-'+suffix, members=[], drafts=[];
 const initial=await raw(), own=headers['oai-authenticated-user-id'];
 const call=async(space='live',who=headers,method='GET',extra='')=>{
  const response=await fetch(new URL('/api/crm/drafts/copy?space='+space+extra,ready),{method,headers:who});
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{}
  return {status:response.status,headers:response.headers,text,data};
 };
 const checked=async(...args)=>{const before=await raw(),result=await call(...args);assert.deepEqual(await raw(),before,'Native draft-copy HTTP must not write any table, account, version or R2 object.');return result;};
 const identity=async(role,active=1,bound=true)=>{
  const id=prefix+'-'+members.length,email=id+'@example.test';members.push(id);
  await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,?)').bind(id,email,bound?id:null,'Syntetiskt kopiekonto',role,'',active).run();
  return {'oai-authenticated-user-id':id,'oai-authenticated-user-email':email};
 };
 const insert=async({space='live',user=own,id=prefix+'-draft-'+drafts.length,data='{}',archived=0,kind='form'})=>{
  const row={space,user,id,kind,context:'year_need',revision:17,requestId:crypto.randomUUID(),title:'Syntetisk privat utkastkopia',data,archived,updatedAt:'2026-10-09T09:00:00.000Z'};drafts.push(row);
  await db.prepare('INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.space,row.user,row.id,row.kind,row.context,row.revision,row.requestId,row.title,row.data,row.archived,row.updatedAt).run();return row;
 };
 const verify=result=>{
  assert.equal(result.status,200,result.text.slice(0,400));assert.equal(result.data.format,'magnussons-private-drafts-1');
  assert.equal(result.data.integrity.recordCount,result.data.records.length);
  assert.equal(result.data.integrity.sha256,createHash('sha256').update(JSON.stringify(result.data.records)).digest('hex'));
  assert.match(result.headers.get('cache-control')||'',/\bno-store\b/);assert.equal(result.headers.get('x-content-type-options'),'nosniff');
  assert.match(result.headers.get('content-disposition')||'',/^attachment; filename="magnussons-/);
 };
 try {
  const seller=await identity('seller'),other=await identity('seller');
  const active=await insert({data:' { "values": {"leadDays":" 3e ","due":"inte valt","notes":"🙂\\n\\u0000"}, "future": true }\n'});
  const archived=await insert({data:'unfinished { raw copied exactly',archived:1,kind:'future_kind'});
  const demo=await insert({space:'demo',data:'{"private":"DEMO COPY POSITIVE"}'});
  const sellerDraft=await insert({user:seller['oai-authenticated-user-id'],data:'{"private":"SELLER COPY POSITIVE"}'});
  await insert({user:other['oai-authenticated-user-id'],data:'{"private":"OTHER COPY DO NOT RELEASE"}'});
  const adminCopy=await checked('live');verify(adminCopy);assert.equal(adminCopy.data.ownerUserId,own);assert.equal(adminCopy.data.space,'live');
  const record=id=>adminCopy.data.records.find(row=>row.id===id);
  for(const expected of [active,archived])assert.deepEqual(record(expected.id),{id:expected.id,kind:expected.kind,context:expected.context,revision:17,requestId:expected.requestId,title:expected.title,dataRaw:expected.data,archived:!!expected.archived,updatedAt:expected.updatedAt});
  assert.ok(!adminCopy.text.includes('OTHER COPY DO NOT RELEASE'));assert.ok(!adminCopy.text.includes('SELLER COPY POSITIVE'));assert.ok(!adminCopy.text.includes('DEMO COPY POSITIVE'));
  const sellerCopy=await checked('live',seller);verify(sellerCopy);assert.deepEqual(sellerCopy.data.records.map(row=>row.id),[sellerDraft.id]);
  const demoCopy=await checked('demo');verify(demoCopy);assert.ok(demoCopy.data.records.some(row=>row.id===demo.id));assert.ok(!demoCopy.text.includes(active.id));
  // User-supplied selectors never change the authenticated private scope.
  const fakeSelector=await checked('live',headers,'GET','&user_id='+other['oai-authenticated-user-id']+'&id='+sellerDraft.id);verify(fakeSelector);assert.deepEqual(fakeSelector.data.records,adminCopy.data.records);
  for(const role of ['reader','production','print','warehouse']){const who=await identity(role);const result=await checked('live',who);assert.equal(result.status,403);assert.ok(!result.text.includes(active.id));assert.equal(result.headers.get('content-disposition'),null);}
  for(const who of [{},await identity('seller',0),await identity('seller',1,false)]){const result=await checked('live',who);assert.equal(result.status,Object.keys(who).length?403:401);assert.equal(result.headers.get('content-disposition'),null);}
  assert.equal((await checked('other-workspace')).status,400);
  assert.equal((await checked('live',headers,'POST')).status,405);
  assert.equal((await checked('live',headers,'DELETE')).status,405);
  // .all() rowset avoids D1's 2 MB single-string limit. The resulting local
  // JSON copy is intentionally >2 MB, although each original D1 row is smaller.
  const wide=await identity('seller'),wideDraft=await insert({user:wide['oai-authenticated-user-id'],data:'"'.repeat(1100000),kind:'future_kind'});
  const wideCopy=await checked('live',wide);verify(wideCopy);assert.ok(new TextEncoder().encode(wideCopy.text).byteLength>2000000);assert.equal(wideCopy.data.records[0].dataRaw,wideDraft.data);
  const tooWide=await insert({user:wide['oai-authenticated-user-id'],data:'🙂'.repeat(70000),kind:'future_kind'});
  const bounded=await checked('live',wide);assert.equal(bounded.status,413);assert.ok(!bounded.text.includes(wideDraft.id));assert.ok(!bounded.text.includes(tooWide.id));assert.equal(bounded.headers.get('content-disposition'),null);
  const many=await identity('seller'),manyUser=many['oai-authenticated-user-id'];
  await db.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1001) INSERT INTO crm_drafts(space,user_id,id,kind,context,revision,request_id,title,data,archived,updated_at) SELECT 'live',?,?||x,'note','',1,?,'Syntetisk arkivpost','{}',1,'2026-10-09T09:00:00.000Z' FROM n`).bind(manyUser,prefix+'-many-',crypto.randomUUID()).run();
  const overflow=await checked('live',many);assert.equal(overflow.status,413);assert.ok(!overflow.text.includes(prefix+'-many-'));assert.equal(overflow.headers.get('content-disposition'),null);
  const empty=await identity('seller'),emptyCopy=await checked('live',empty);verify(emptyCopy);assert.deepEqual(emptyCopy.data.records,[]);
  console.log('PASS private draft copy native built HTTP: exact raw active/archive, all private scopes, roles, readonly accounts, UTF8/escaping and complete bounded snapshot.');
  return {privateDraftCopyNativeOwnActiveArchivedRaw:true,privateDraftCopyNativeSellerAdminIsolation:true,privateDraftCopyNativeWorkspaceIsolation:true,privateDraftCopyNativeRoleAndUnboundDenied:true,privateDraftCopyNativeNoWriteMethods:true,privateDraftCopyNativeNo18TableOrR2Writes:true,privateDraftCopyNativeOver2MBJSONRowset:true,privateDraftCopyNativeUTF8BudgetAnd1001FailClosed:true,privateDraftCopyNativeIntegrity:true};
 } finally {
  // Remove only this test's synthetic rows; no CRM version or unrelated data.
  await db.prepare('DELETE FROM crm_drafts WHERE id LIKE ?').bind(prefix+'-%').run();
  for(const id of members)await db.prepare('DELETE FROM crm_members WHERE id=?').bind(id).run();
  assert.deepEqual(await raw(),initial,'Private-copy synthetic fixture cleanup preserves the pretest full snapshot.');
 }
}
