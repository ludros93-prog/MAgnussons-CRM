import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import React,{act,useState} from 'react';
import {create} from 'react-test-renderer';

// Run the production hook through React. Transport, browser interaction and
// time are controlled; server authorization is not reimplemented in this test.
mkdirSync('work',{recursive:true});
writeFileSync('work/use-crm-poll.mjs',ts.transpileModule(readFileSync('lib/use-crm-poll.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {useCRMPoll}=await import('../work/use-crm-poll.mjs');
const original={fetch:globalThis.fetch,interval:globalThis.setInterval,clear:globalThis.clearInterval,timeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,document:Object.getOwnPropertyDescriptor(globalThis,'document'),window:Object.getOwnPropertyDescriptor(globalThis,'window'),act:Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT')};
class BrowserEvents extends EventTarget{
 listeners=new Map();
 addEventListener(type,callback,options){super.addEventListener(type,callback,options);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback)}
 removeEventListener(type,callback,options){super.removeEventListener(type,callback,options);this.listeners.get(type)?.delete(callback)}
 count(){return [...this.listeners.values()].reduce((total,callbacks)=>total+callbacks.size,0)}
}
const windowEvents=new BrowserEvents(),documentEvents=new BrowserEvents();
const calls=[],intervals=new Map(),timeouts=new Map(),createdIntervals=[],stateEvents=[],deniedEvents=[],queuedPublications=[];
let timerId=0,timeoutId=100000,context,renderer,props,strict=false,hidden=false,cooperativeAbort=false,deferPublication=false;
const dom={details:false,dialog:false,alertDialog:false,editing:false};
const saving={current:false};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const viewer=(changes={})=>({id:'synthetic-user-a',memberId:'synthetic-member-a',role:'admin',owner:'Synthetic owner',...changes});
const state=(marker='original',{version=7,identity=viewer()}={})=>({version,viewer:identity,customers:[{id:marker}],tasks:[],privateMarker:marker});
const marker=()=>context.state?.privateMarker||null;
function Probe({initial,space,view}){
 const [current,setCurrent]=useState(initial);
 const invalidate=useCRMPoll({space,state:current,view,saving,
  onState:(expected,next,isCurrent)=>{stateEvents.push({expected,next});const update=value=>value===expected&&isCurrent()?next:value;if(deferPublication)queuedPublications.push(update);else setCurrent(update)},
  onAccessDenied:(expected,message,isCurrent)=>{deniedEvents.push({expected,message});const update=value=>value===expected&&isCurrent()?null:value;if(deferPublication)queuedPublications.push(update);else setCurrent(update)}});
 context={state:current,setState:setCurrent,invalidate};return null;
}
async function drain(){for(let i=0;i<12;i++)await Promise.resolve()}
async function mount({initial=state(),space='live',view='today',strictMode=false}={}){strict=strictMode;props={initial,space,view};await act(async()=>{const probe=React.createElement(Probe,props);renderer=create(strict?React.createElement(React.StrictMode,null,probe):probe);await drain()})}
async function change(next){props={...props,...next};await act(async()=>{const probe=React.createElement(Probe,props);renderer.update(strict?React.createElement(React.StrictMode,null,probe):probe);await drain()})}
async function replace(next){await act(async()=>{context.setState(next);await drain()})}
async function unmount(){if(renderer){await act(async()=>{renderer.unmount();await drain()});renderer=null}}
function poller(){assert.equal(intervals.size,1,'Exactly one active CRM interval is needed.');return [...intervals.values()][0].fn}
async function trigger(callback=poller()){await act(async()=>{callback();await drain()});return calls.at(-1)}
async function event(target,type){await act(async()=>{target.dispatchEvent(new Event(type));await drain()});return calls.at(-1)}
async function respond(call,body,{status=200,jsonError=null}={}){await act(async()=>{call.reply.resolve({ok:status>=200&&status<300,status,json:async()=>{if(jsonError)throw jsonError;return body}});await drain()})}
async function fail(call,error=new Error('Synthetic network failure')){await act(async()=>{call.reply.reject(error);await drain()})}
async function invalidate(){await act(async()=>{context.invalidate();await drain()})}
async function isolated(name,verify){
 await unmount();assert.equal(intervals.size,0);assert.equal(windowEvents.count(),0);assert.equal(documentEvents.count(),0);
 calls.length=0;createdIntervals.length=0;stateEvents.length=0;deniedEvents.length=0;queuedPublications.length=0;saving.current=false;hidden=false;cooperativeAbort=false;deferPublication=false;Object.assign(dom,{details:false,dialog:false,alertDialog:false,editing:false});
 await verify();await unmount();assert.equal(intervals.size,0,'No polling interval may survive '+name);assert.equal(timeouts.size,0,'No completed request timeout may survive '+name);assert.equal(windowEvents.count(),0,'No window listener may survive '+name);assert.equal(documentEvents.count(),0,'No document listener may survive '+name);
 console.log('PASS CRM access poll: '+name);
}

try{
 Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
 Object.defineProperties(documentEvents,{hidden:{get:()=>hidden},visibilityState:{get:()=>hidden?'hidden':'visible'},activeElement:{get:()=>({matches:()=>dom.editing})},querySelector:{value:selector=>selector.split(',').some(part=>part==='details[open]'&&dom.details||part==='[role=dialog]'&&dom.dialog||part==='[role=alertdialog]'&&dom.alertDialog)?{}:null}});
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:documentEvents});
 Object.defineProperty(globalThis,'window',{configurable:true,writable:true,value:windowEvents});
 globalThis.fetch=async(url,options={})=>{
  assert.equal(url,'/api/crm?space='+encodeURIComponent(props.space));assert.equal(options.method||'GET','GET');assert.equal(options.body,undefined,'Access polling must never write.');assert.equal(options.cache,'no-store','Current access cannot rely on a cached CRM response.');assert.ok(options.signal instanceof AbortSignal);
  const reply=deferred(),call={url,options,signal:options.signal,reply};calls.push(call);
  // Ignore abort by default to test late transports independently of a
  // cooperative Fetch implementation. Cleanup still has to abort the signal.
  if(cooperativeAbort)options.signal.addEventListener('abort',()=>reply.reject(new DOMException('Synthetic fetch aborted','AbortError')),{once:true});
  return reply.promise;
 };
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,30000);const id=++timerId,row={id,fn,ms};intervals.set(id,row);createdIntervals.push(row);return id};
 globalThis.clearInterval=id=>intervals.delete(id);
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms!==15000)return original.timeout(fn,ms,...args);const id=++timeoutId;timeouts.set(id,fn);return id};
 globalThis.clearTimeout=id=>{if(!timeouts.delete(id))original.clearTimeout(id)};

 await isolated('mount is silent and an unresolved state cannot begin polling',async()=>{
  await mount({initial:null});assert.equal(calls.length,0);await trigger();await event(windowEvents,'focus');await event(documentEvents,'visibilitychange');assert.equal(calls.length,0);
  await replace(state('resolved'));assert.equal(calls.length,0);const call=await trigger();assert.equal(calls.length,1);await respond(call,state('newer',{version:8}));assert.equal(marker(),'newer');assert.equal(stateEvents.length,1);
 });

 await isolated('fresh higher-version CRM data updates an idle visible workspace',async()=>{
  await mount();const originalState=context.state,call=await trigger();assert.equal(marker(),'original');const next=state('newer',{version:8});await respond(call,next);assert.equal(context.state,next);assert.equal(stateEvents[0].expected,originalState);assert.equal(deniedEvents.length,0);
 });

 await isolated('same-version identity changes replace state while each UI pause is active',async()=>{
  const pauses=[['dialog',()=>{dom.dialog=true}],['alertdialog',()=>{dom.alertDialog=true}],['details',()=>{dom.details=true}],['focused control',()=>{dom.editing=true}],['catalog',async()=>{await change({view:'catalog'})}],['settings',async()=>{await change({view:'settings'})}]];
  await mount();for(const [label,pause] of pauses){Object.assign(dom,{details:false,dialog:false,alertDialog:false,editing:false});await change({view:'today'});await pause();const before=calls.length,call=await trigger();assert.equal(calls.length,before+1,label+' must not suppress an access read.');const next=state(label,{identity:viewer({memberId:'synthetic-member-'+label})});await respond(call,next);assert.equal(context.state,next,label+' must accept changed authority at unchanged CRM version.');}
  assert.equal(deniedEvents.length,0);
 });

 await isolated('user ID, member ID, role and seller association are independent access boundaries at unchanged version',async()=>{
  await mount();dom.dialog=true;for(const identity of [viewer({id:'synthetic-user-b'}),viewer({id:'synthetic-user-b',memberId:'synthetic-member-b'}),viewer({id:'synthetic-user-b',memberId:'synthetic-member-b',role:'reader'}),viewer({id:'synthetic-user-b',memberId:'synthetic-member-b',role:'reader',owner:'Synthetic other owner'})]){const call=await trigger(),next=state(identity.role,{identity});await respond(call,next);assert.equal(context.state,next);assert.equal(context.state.version,7)}assert.equal(stateEvents.length,4);
 });

 await isolated('ordinary data cannot replace a dialog, details, focused field, catalog or settings interaction',async()=>{
  await mount();const pauses=[()=>{dom.dialog=true},()=>{dom.alertDialog=true},()=>{dom.details=true},()=>{dom.editing=true},async()=>{await change({view:'catalog'})},async()=>{await change({view:'settings'})}];
  for(const pause of pauses){Object.assign(dom,{details:false,dialog:false,alertDialog:false,editing:false});await change({view:'today'});await pause();const call=await trigger();await respond(call,state('paused-change',{version:8}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0)}
 });

 await isolated('an interaction starting after GET also prevents ordinary data publication',async()=>{
  await mount();for(const pause of [()=>{dom.dialog=true},()=>{dom.alertDialog=true},()=>{dom.details=true},()=>{dom.editing=true},async()=>{await change({view:'settings'})}]){Object.assign(dom,{details:false,dialog:false,alertDialog:false,editing:false});await change({view:'today'});const call=await trigger();await pause();await respond(call,state('late-pause',{version:8}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0)}
 });

 await isolated('a paused-at-start data read stays held after that interaction closes',async()=>{
  await mount();dom.dialog=true;const call=await trigger();dom.dialog=false;await respond(call,state('read-before-close',{version:8}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);const fresh=await trigger();await respond(fresh,state('read-after-close',{version:8}));assert.equal(marker(),'read-after-close');
 });

 await isolated('operational details do not freeze idle order, print, warehouse or production queues',async()=>{
  await mount();dom.details=true;let version=7;for(const view of ['orders','print','warehouse','production']){await change({view});const call=await trigger(),next=state(view,{version:++version});await respond(call,next);assert.equal(context.state,next)}assert.equal(stateEvents.length,4);
 });

 await isolated('same or older ordinary CRM revisions do not overwrite the current state',async()=>{
  await mount();for(const version of [7,6]){const call=await trigger();await respond(call,state('older',{version}));assert.equal(marker(),'original')}assert.equal(stateEvents.length,0);
 });

 await isolated('a regressed CRM revision cannot revive older authority even while UI is paused',async()=>{
  await mount();dom.dialog=true;const call=await trigger();await respond(call,state('old-role',{version:6,identity:viewer({role:'reader'})}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);
 });

 await isolated('malformed successful snapshots cannot replace authoritative current state',async()=>{
  await mount();for(const invalid of [null,{},state('fractional',{version:7.5}),state('negative',{version:-1}),state('missing-id',{version:8,identity:viewer({id:''})}),state('unknown-role',{version:8,identity:viewer({role:'unknown'})})]){const call=await trigger();await respond(call,invalid);assert.equal(marker(),'original')}assert.equal(stateEvents.length,0);assert.equal(deniedEvents.length,0);
 });

 await isolated('401 while editing clears the former authorized state without trusting server error text',async()=>{
  await mount();dom.dialog=true;dom.editing=true;const before=context.state,call=await trigger();await respond(call,{error:'Synthetic private provider detail'},{status:401});assert.equal(context.state,null);assert.equal(stateEvents.length,0);assert.equal(deniedEvents.length,1);assert.equal(deniedEvents[0].expected,before);assert.ok(deniedEvents[0].message);assert.ok(!deniedEvents[0].message.includes('Synthetic private'));await trigger();assert.equal(calls.length,1,'A denied state cannot keep polling old identity data.');
 });

 await isolated('403 while details are open clears the former authorized state even if error JSON cannot be read',async()=>{
  await mount();dom.details=true;const call=await trigger();await respond(call,null,{status:403,jsonError:new Error('Synthetic unreadable body')});assert.equal(context.state,null);assert.equal(deniedEvents.length,1);assert.ok(deniedEvents[0].message);assert.ok(!deniedEvents[0].message.includes('unreadable'));
 });

 await isolated('503, network failure and malformed success preserve state and permit the next access read',async()=>{
  await mount();let call=await trigger();await respond(call,{error:'Synthetic temporary outage'},{status:503});assert.equal(marker(),'original');call=await trigger();await fail(call);assert.equal(marker(),'original');call=await trigger();await respond(call,null,{jsonError:new Error('Synthetic malformed JSON')});assert.equal(marker(),'original');call=await trigger();await respond(call,state('recovered',{version:8}));assert.equal(marker(),'recovered');assert.equal(deniedEvents.length,0);assert.equal(stateEvents.length,1);
 });

 await isolated('overlapping interval, focus and visibility events use one in-flight access request',async()=>{
  await mount();const call=await trigger();await trigger();await event(windowEvents,'focus');await event(documentEvents,'visibilitychange');assert.equal(calls.length,1);await respond(call,state('first',{version:8}));const next=await event(windowEvents,'focus');assert.equal(calls.length,2);await respond(next,state('second',{version:9}));assert.equal(marker(),'second');
 });

 await isolated('hidden tabs skip interval, focus and hidden visibility events; visibility return reads current access',async()=>{
  await mount();hidden=true;await trigger();await event(windowEvents,'focus');await event(documentEvents,'visibilitychange');assert.equal(calls.length,0);hidden=false;dom.dialog=true;const call=await event(documentEvents,'visibilitychange');assert.equal(calls.length,1);await respond(call,state('returned-role',{identity:viewer({role:'reader'})}));assert.equal(marker(),'returned-role');
 });

 await isolated('focus return reads changed authority while a dialog stays open',async()=>{
  await mount();dom.dialog=true;const call=await event(windowEvents,'focus');assert.equal(calls.length,1);await respond(call,state('focused-role',{identity:viewer({role:'seller'})}));assert.equal(marker(),'focused-role');
 });

 await isolated('an in-flight read cannot publish when the tab became hidden',async()=>{
  await mount();const call=await trigger();hidden=true;await respond(call,state('hidden-data',{version:8}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);hidden=false;const fresh=await event(documentEvents,'visibilitychange');await respond(fresh,state('visible-data',{version:8}));assert.equal(marker(),'visible-data');
 });

 await isolated('saving prevents reads and all in-flight publications until an explicit fresh read',async()=>{
  await mount();const old=await trigger();saving.current=true;await invalidate();assert.equal(old.signal.aborted,true);await trigger();await event(windowEvents,'focus');await event(documentEvents,'visibilitychange');assert.equal(calls.length,1);await respond(old,state('must-not-replace-save',{identity:viewer({role:'reader'})}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);saving.current=false;await invalidate();const fresh=await trigger();await respond(fresh,state('after-save',{version:8}));assert.equal(marker(),'after-save');
 });

 await isolated('a save that starts and finishes before the old read returns still invalidates that result',async()=>{
  await mount();const old=await trigger();saving.current=true;await invalidate();saving.current=false;await invalidate();await respond(old,state('old-after-failed-save',{version:9}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);const fresh=await trigger();await respond(fresh,state('fresh-after-attempt',{version:8}));assert.equal(marker(),'fresh-after-attempt');
 });

 await isolated('a queued React publication is rechecked when saving starts before its updater runs',async()=>{
  await mount();deferPublication=true;let call=await trigger();await respond(call,state('queued-data',{version:8}));assert.equal(queuedPublications.length,1);saving.current=true;await invalidate();await act(async()=>{context.setState(queuedPublications.shift());await drain()});assert.equal(marker(),'original');saving.current=false;await invalidate();call=await trigger();await respond(call,{error:'Synthetic old denial'},{status:403});assert.equal(queuedPublications.length,1);saving.current=true;await invalidate();await act(async()=>{context.setState(queuedPublications.shift());await drain()});assert.equal(marker(),'original');saving.current=false;await invalidate();deferPublication=false;const fresh=await trigger();await respond(fresh,state('after-queued-attempt',{version:8}));assert.equal(marker(),'after-queued-attempt');
 });

 await isolated('a same-version state replacement protects manual refresh from an older access read',async()=>{
  await mount();const old=await trigger(),replacement=state('manual-refresh');await replace(replacement);assert.equal(old.signal.aborted,true);await respond(old,state('obsolete-after-refresh',{identity:viewer({role:'reader'})}));assert.equal(context.state,replacement);assert.equal(stateEvents.length,0);const fresh=await trigger();await respond(fresh,state('fresh-manual',{version:8}));assert.equal(marker(),'fresh-manual');
 });

 await isolated('a committed newer mutation is not overwritten by the earlier poll or its denial',async()=>{
  await mount();let old=await trigger();await replace(state('mutation',{version:9}));await respond(old,state('poll',{version:8}));assert.equal(marker(),'mutation');old=await trigger();await replace(state('next-mutation',{version:10}));await respond(old,{error:'Old denial'},{status:403});assert.equal(marker(),'next-mutation');assert.equal(stateEvents.length,0);assert.equal(deniedEvents.length,0);
 });

 await isolated('a workspace switch rejects an old success and the old captured poll callback',async()=>{
  await mount();const oldPoll=poller(),old=await trigger();await change({space:'demo'});assert.equal(old.signal.aborted,true);await trigger(oldPoll);assert.equal(calls.length,1);await respond(old,state('abandoned-live',{identity:viewer({role:'reader'})}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);const fresh=await trigger();assert.equal(fresh.url,'/api/crm?space=demo');await respond(fresh,state('demo',{version:8}));assert.equal(marker(),'demo');
 });

 await isolated('an identity switch during response JSON parsing cannot publish the former response',async()=>{
  await mount();const old=await trigger(),body=deferred();let parsing=false;await act(async()=>{old.reply.resolve({ok:true,status:200,json:()=>{parsing=true;return body.promise}});await drain()});assert.equal(parsing,true);const replacement=state('current-identity',{identity:viewer({id:'synthetic-user-b'})});await replace(replacement);assert.equal(old.signal.aborted,true);await act(async()=>{body.resolve(state('old-json',{version:9}));await drain()});assert.equal(context.state,replacement);assert.equal(stateEvents.length,0);
 });

 await isolated('late failure from an abandoned request cannot release the replacement in-flight lock',async()=>{
  await mount();const old=await trigger();await invalidate();const fresh=await trigger();assert.equal(calls.length,2);await fail(old);await trigger();await event(windowEvents,'focus');assert.equal(calls.length,2);await respond(fresh,state('locked-current',{version:8}));assert.equal(marker(),'locked-current');
 });

 await isolated('a timed-out stalled read releases its lock without accepting late data or an old denial',async()=>{
  await mount();const old=await trigger();assert.equal(timeouts.size,1);const timeout=[...timeouts.values()][0];await trigger(timeout);assert.equal(old.signal.aborted,true);const fresh=await trigger();assert.equal(calls.length,2);await respond(old,{error:'Synthetic late denial'},{status:403});assert.equal(marker(),'original');assert.equal(deniedEvents.length,0);await trigger();assert.equal(calls.length,2,'The old timeout or finally cannot release the replacement lock.');await respond(fresh,state('after-timeout',{version:8}));assert.equal(marker(),'after-timeout');
 });

 await isolated('hiding and returning a tab aborts the old read and obtains a fresh access snapshot',async()=>{
  await mount();const old=await trigger();hidden=true;await event(documentEvents,'visibilitychange');assert.equal(old.signal.aborted,true);hidden=false;dom.dialog=true;const fresh=await event(documentEvents,'visibilitychange');assert.equal(calls.length,2);await respond(old,state('hidden-old-authority',{identity:viewer({role:'reader'})}));assert.equal(marker(),'original');assert.equal(stateEvents.length,0);await respond(fresh,state('visible-current-authority',{identity:viewer({role:'seller'})}));assert.equal(marker(),'visible-current-authority');
 });

 await isolated('cooperative cleanup AbortError is silent and a replacement read can finish',async()=>{
  cooperativeAbort=true;await mount();const old=await trigger();await invalidate();assert.equal(old.signal.aborted,true);assert.equal(deniedEvents.length,0);const fresh=await trigger();await respond(fresh,state('after-abort',{version:8}));assert.equal(marker(),'after-abort');
 });

 await isolated('StrictMode replay leaves one interval and listener set while old callbacks are inert',async()=>{
  await mount({strictMode:true});assert.equal(calls.length,0);assert.equal(intervals.size,1);assert.equal(createdIntervals.length,2);assert.equal(windowEvents.listeners.get('focus').size,1);assert.equal(documentEvents.listeners.get('visibilitychange').size,1);await trigger(createdIntervals[0].fn);assert.equal(calls.length,0);const current=await trigger();await respond(current,state('strict-current',{version:8}));assert.equal(marker(),'strict-current');
 });

 await isolated('unmount aborts pending transport, removes listeners and blocks every captured continuation',async()=>{
  await mount();const oldPoll=poller(),oldFocus=[...windowEvents.listeners.get('focus')][0],oldVisibility=[...documentEvents.listeners.get('visibilitychange')][0],call=await trigger(),oldInvalidate=context.invalidate;await unmount();assert.equal(call.signal.aborted,true);await trigger(oldPoll);await trigger(oldFocus);await trigger(oldVisibility);oldInvalidate();await respond(call,state('unmounted',{version:8}));assert.equal(calls.length,1);assert.equal(stateEvents.length,0);assert.equal(deniedEvents.length,0);
 });

 console.log('PASS: 31 React lifecycle groups run the actual production CRM access poll. Synthetic Fetch, EventTarget/DOM interaction and polling time are controlled; no live CRM account, browser DOM or customer write is exercised by this suite.');
}finally{
 await unmount();globalThis.fetch=original.fetch;globalThis.setInterval=original.interval;globalThis.clearInterval=original.clear;globalThis.setTimeout=original.timeout;globalThis.clearTimeout=original.clearTimeout;
 for(const [name,descriptor] of [['document',original.document],['window',original.window],['IS_REACT_ACT_ENVIRONMENT',original.act]]){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}
}
