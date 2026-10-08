import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Execute the actual production hook with React's effect/cleanup lifecycle.
// Only transport and polling time are controlled; no hook logic is duplicated.
mkdirSync('work',{recursive:true});
writeFileSync('work/use-outlook-hook.mjs',ts.transpileModule(readFileSync('lib/use-outlook.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {useOutlook}=await import('../work/use-outlook-hook.mjs');
const originals={fetch:globalThis.fetch,document:Object.getOwnPropertyDescriptor(globalThis,'document'),interval:globalThis.setInterval,clear:globalThis.clearInterval,act:Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT')};
const calls=[],intervals=new Map(),cleared=[];
let timerId=0,context,renderer,scope='',duringRender=null,cooperativeAbort=false;
const renders=[];
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const key=(space='live',user='user-a',member='member-a',role='seller')=>JSON.stringify([space,user,member,role]);
const A=key(),B=key('live','user-b','member-b'),M=key('live','user-a','member-new'),R=key('live','user-a','member-a','admin');
const state=(marker,{connected=false,stale=false}={})=>({configured:true,missing:[],signedIn:true,email:marker+'@example.test',connection:connected?{email:marker+'@example.test',status:'connected',lastSync:stale?'':new Date().toISOString(),syncNote:''}:null,items:[{id:marker,kind:'mail',subject:marker,body:'Synthetic private '+marker,at:'2026-10-08T12:00:00Z',end:'',sender:marker+'@example.test',recipients:[],location:'',webLink:'',conversationId:'',cancelled:false,removed:false,allDay:false,candidateIds:[],customerId:'',dealId:'',shared:false,mine:true,mailbox:marker+'@example.test',direction:'in'}],limited:false});
const marker=()=>context.state?.items[0]?.id||null;
const snapshot=()=>({state:context.state,busy:context.busy,error:context.error});
const blank=s=>{assert.equal(s.state,null);assert.equal(s.busy,false);assert.equal(s.error,'')};
function Probe({scopeKey}){
 context=useOutlook(scopeKey);renders.push({scope:scopeKey,...snapshot()});
 if(duringRender){const callback=duringRender;duringRender=null;callback()}
 return null;
}
async function drain(){for(let i=0;i<8;i++)await Promise.resolve()}
async function mount(value,{strict=false}={}){scope=value;await act(async()=>{const probe=React.createElement(Probe,{scopeKey:scope});renderer=create(strict?React.createElement(React.StrictMode,null,probe):probe);await drain()})}
async function change(value,onFirstRender){scope=value;const before=renders.length;duringRender=onFirstRender||null;await act(async()=>{renderer.update(React.createElement(Probe,{scopeKey:scope}));await drain()});return renders.slice(before).find(row=>row.scope===value)}
async function unmount(){if(renderer){await act(async()=>{renderer.unmount();await drain()});renderer=null}}
async function respond(call,body,ok=true){await act(async()=>{call.reply.resolve({ok,status:ok?200:503,json:async()=>body});await drain()})}
async function fail(call,error=new Error('Synthetic network failure')){await act(async()=>{call.reply.reject(error);await drain()})}
async function begin(body){let promise;await act(async()=>{promise=context.request(body);await drain()});return {promise,call:calls.at(-1)}}
async function isolated(name,verify){
 await unmount();assert.equal(intervals.size,0,'Every prior polling timer must be removed.');calls.length=0;renders.length=0;cleared.length=0;duringRender=null;cooperativeAbort=false;
 await verify();await unmount();assert.equal(intervals.size,0,'No interval may survive '+name);
 console.log('PASS Outlook hook: '+name);
}
function poller(){assert.equal(intervals.size,1);return [...intervals.values()][0].fn}

try{
 Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{visibilityState:'visible'}});
 globalThis.fetch=async(url,options={})=>{
  assert.equal(url,'/api/outlook');assert.ok(options.signal instanceof AbortSignal,'GET and POST need a cancellable session signal.');
  const reply=deferred(),call={url,method:options.method||'GET',body:options.body?JSON.parse(options.body):null,signal:options.signal,reply};calls.push(call);
  // Deliberately ignore abort here. A session check must also protect late
  // transports and response bodies, not just cooperative AbortSignal users.
  if(cooperativeAbort)options.signal.addEventListener('abort',()=>reply.reject(new DOMException('Synthetic fetch aborted','AbortError')),{once:true});
  return reply.promise;
 };
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,300000);const id=++timerId;intervals.set(id,{fn,ms});return id};
 globalThis.clearInterval=id=>{cleared.push(id);intervals.delete(id)};

 await isolated('unresolved/disabled session is silent; resolving live identity starts one cancellable read',async()=>{
  await mount('');blank(snapshot());assert.equal(calls.length,0);assert.equal(intervals.size,0);assert.equal(await context.request(),false);assert.equal(await context.request({action:'sync'}),false);assert.equal(calls.length,0);
  await change(A);assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(context.busy,true);await respond(calls[0],state('resolved-a'));assert.equal(marker(),'resolved-a');assert.equal(context.busy,false);
 });

 await isolated('allowed viewer change hides saved private state before effects and invalidates a captured manual callback',async()=>{
  await mount(A);await respond(calls[0],state('private-a'));const old=context.request;let stale;
  const first=await change(B,()=>{stale=old({action:'disconnect'})});blank(first);assert.equal(await stale,false);assert.equal(calls.length,2);assert.equal(marker(),null);
  await respond(calls[1],state('private-b'));assert.equal(marker(),'private-b');assert.equal(await old({action:'sync'}),false);assert.equal(calls.length,2);
 });

 await isolated('member ID alone starts a separate session even when user and allowed role are unchanged',async()=>{
  await mount(A);await respond(calls[0],state('old-member'));const old=context.request;const first=await change(M);blank(first);assert.equal(calls.length,2);assert.equal(await old({action:'share'}),false);await respond(calls[1],state('new-member'));assert.equal(marker(),'new-member');
 });

 await isolated('allowed role alone starts a separate session and clears the prior private error before effects',async()=>{
  await mount(A);await fail(calls[0],new Error('Old role error'));assert.equal(context.error,'Old role error');const old=context.request;const first=await change(R);blank(first);assert.equal(calls.length,2);assert.equal(await old(),false);await respond(calls[1],state('new-admin-role'));assert.equal(context.error,'');assert.equal(marker(),'new-admin-role');
 });

 await isolated('aborted old GET cannot show data or auto-sync when a later identity read is still running',async()=>{
  await mount(A);const old=calls[0];await change(B);assert.equal(old.signal.aborted,true);assert.equal(calls.length,2);
  await respond(old,state('abandoned-a',{connected:true,stale:true}));assert.equal(marker(),null);assert.equal(context.busy,true);assert.equal(calls.length,2,'Abandoned GET must not continue into sync.');
  const blocked=await context.request({action:'sync'});assert.equal(blocked,false);assert.equal(calls.length,2);await respond(calls[1],state('current-b'));assert.equal(marker(),'current-b');assert.equal(context.busy,false);
 });

 await isolated('late response json from an abandoned read cannot populate a new identity',async()=>{
  await mount(A);const old=calls[0],body=deferred();let parsing=false;
  await act(async()=>{old.reply.resolve({ok:true,status:200,json:()=>{parsing=true;return body.promise}});await drain()});assert.equal(parsing,true);
  await change(B);assert.equal(old.signal.aborted,true);await act(async()=>{body.resolve(state('late-json-a',{connected:true,stale:true}));await drain()});assert.equal(marker(),null);assert.equal(context.busy,true);assert.equal(calls.length,2);
  await respond(calls[1],state('current-json-b'));assert.equal(marker(),'current-json-b');
 });

 await isolated('old failure cannot replace a later session successful state or error',async()=>{
  await mount(A);const old=calls[0];await change(B);await respond(calls[1],state('successful-b'));await fail(old,new Error('Private old mailbox error'));assert.equal(marker(),'successful-b');assert.equal(context.error,'');assert.equal(context.busy,false);
 });

 await isolated('pending old POST returns false; old finally cannot release the new session request lock',async()=>{
  await mount(A);await respond(calls[0],state('a'));const old=context.request,pending=await begin({action:'share',id:'a',customerId:'synthetic-customer',shared:true});assert.equal(pending.call.method,'POST');
  await change(B);const readB=calls.at(-1);assert.equal(pending.call.signal.aborted,true);await respond(pending.call,state('old-post-a'));assert.equal(await pending.promise,false);assert.equal(context.busy,true);assert.equal(marker(),null);const count=calls.length;assert.equal(await context.request({action:'sync'}),false);assert.equal(calls.length,count);assert.equal(await old({action:'disconnect'}),false);
  await respond(readB,state('b'));const retry=await begin({action:'sync'});assert.equal(retry.call.method,'POST');await respond(retry.call,state('b-synced'));assert.equal(await retry.promise,true);assert.equal(marker(),'b-synced');
 });

 await isolated('disabling a resolved identity aborts work, hides data and blocks both old and new callbacks',async()=>{
  await mount(A);await respond(calls[0],state('a'));const old=context.request,pending=await begin({action:'sync'});const first=await change('');blank(first);blank(snapshot());assert.equal(pending.call.signal.aborted,true);assert.equal(intervals.size,0);const count=calls.length;assert.equal(await old({action:'share'}),false);assert.equal(await context.request(),false);assert.equal(calls.length,count);await respond(pending.call,state('abandoned-disabled'));assert.equal(await pending.promise,false);blank(snapshot());assert.equal(calls.length,count);
 });

 await isolated('A to B to A uses a fresh scope and never revives the first A callback or response',async()=>{
  await mount(A);const firstA=calls[0],oldA=context.request;await change(B);const oldB=calls[1],callbackB=context.request;await change(A);const newA=calls[2];assert.notEqual(context.request,oldA);assert.equal(firstA.signal.aborted,true);assert.equal(oldB.signal.aborted,true);
  assert.equal(await oldA({action:'disconnect'}),false);assert.equal(await callbackB({action:'sync'}),false);await respond(firstA,state('very-old-a',{connected:true,stale:true}));await respond(oldB,state('abandoned-b'));assert.equal(marker(),null);assert.equal(context.busy,true);assert.equal(calls.length,3);await respond(newA,state('fresh-a'));assert.equal(marker(),'fresh-a');
 });

 await isolated('poll cleanup and captured old interval cannot read or write under a new session',async()=>{
  await mount(A);await respond(calls[0],state('connected-a',{connected:true}));const oldPoll=poller();await change(B);assert.ok(cleared.length);await respond(calls[1],state('b'));const count=calls.length;await act(async()=>{oldPoll();await drain()});assert.equal(calls.length,count);
  const currentPoll=poller();globalThis.document.visibilityState='hidden';await act(async()=>{currentPoll();await drain()});assert.equal(calls.length,count);globalThis.document.visibilityState='visible';await act(async()=>{currentPoll();await drain()});assert.equal(calls.length,count+1);assert.equal(calls.at(-1).method,'GET');await respond(calls.at(-1),state('b-polled'));assert.equal(marker(),'b-polled');
 });

 await isolated('current connected polling and stale first read sync work once within the same live session',async()=>{
  await mount(A);await respond(calls[0],state('needs-sync',{connected:true,stale:true}));assert.equal(calls.length,2);assert.deepEqual(calls[1].body,{action:'sync'});assert.equal(context.busy,true);await respond(calls[1],state('synced-a',{connected:true}));assert.equal(marker(),'synced-a');
  const currentPoll=poller();await act(async()=>{currentPoll();currentPoll();await drain()});assert.equal(calls.length,3);assert.deepEqual(calls[2].body,{action:'sync'});await respond(calls[2],state('poll-synced-a',{connected:true}));assert.equal(marker(),'poll-synced-a');
 });

 await isolated('same-session double click sends one request; failure permits a successful exact retry',async()=>{
  await mount(A);await respond(calls[0],state('a'));const body={action:'share',id:'synthetic-item',customerId:'synthetic-customer',dealId:'',shared:true};let first,second;await act(async()=>{first=context.request(body);second=context.request(body);await drain()});assert.equal(await second,false);assert.equal(calls.length,2);assert.deepEqual(calls[1].body,body);await respond(calls[1],{error:'Synthetic provider unavailable'},false);assert.equal(await first,false);assert.equal(context.error,'Synthetic provider unavailable');assert.equal(context.busy,false);
  const retry=await begin(body);assert.deepEqual(retry.call.body,body);await respond(retry.call,state('shared-after-retry'));assert.equal(await retry.promise,true);assert.equal(context.error,'');assert.equal(marker(),'shared-after-retry');assert.equal(context.busy,false);
 });

 await isolated('cooperative AbortError from cleanup is silent and the next identity can finish its read',async()=>{
  cooperativeAbort=true;await mount(A);const old=calls[0];await change(B);assert.equal(old.signal.aborted,true);assert.equal(calls.length,2);assert.equal(context.error,'');assert.equal(context.busy,true);await respond(calls[1],state('b-after-abort'));assert.equal(marker(),'b-after-abort');assert.equal(context.error,'');
 });

 await isolated('StrictMode effect replay aborts the first read and starts a usable replacement without waiting for old transport',async()=>{
  await mount(A,{strict:true});assert.equal(calls.length,2,'Effect reactivation must not stay locked behind its abandoned first read.');assert.equal(calls[0].signal.aborted,true);assert.equal(calls[1].signal.aborted,false);assert.equal(context.busy,true);
  await respond(calls[0],state('abandoned-strict',{connected:true,stale:true}));assert.equal(marker(),null);assert.equal(context.busy,true);assert.equal(calls.length,2);assert.equal(await context.request({action:'sync'}),false);await respond(calls[1],state('replacement-strict'));assert.equal(marker(),'replacement-strict');assert.equal(context.busy,false);
 });

 await isolated('unmount aborts the session and late success/manual/poll continuations cannot start work',async()=>{
  await mount(A);const pending=calls[0],old=context.request,oldPoll=poller();await unmount();assert.equal(pending.signal.aborted,true);assert.equal(intervals.size,0);assert.equal(await old({action:'disconnect'}),false);await act(async()=>{oldPoll();await drain()});await respond(pending,state('unmounted',{connected:true,stale:true}));assert.equal(calls.length,1);
 });

 console.log('PASS: 16 React lifecycle groups use the actual production Outlook hook. Fetch, visibility and five-minute polling are controlled synthetic inputs; no Microsoft account or browser DOM is exercised by this suite.');
}finally{
 await unmount();globalThis.fetch=originals.fetch;globalThis.setInterval=originals.interval;globalThis.clearInterval=originals.clear;
 for(const [name,descriptor] of [['document',originals.document],['IS_REACT_ACT_ENVIRONMENT',originals.act]]){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}
}
