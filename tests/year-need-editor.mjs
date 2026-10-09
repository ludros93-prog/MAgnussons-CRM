import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Real editor + real DraftProvider effects. Only visual primitives and HTTP
// transport are controlled; server transaction checks live in the API tests.
mkdirSync('work',{recursive:true});
const compile=(path,target,replacements)=>{let source=readFileSync(path,'utf8');for(const [from,to] of replacements)source=source.replaceAll(from,to);writeFileSync(target,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);};
writeFileSync('work/year-ui-primitives.mjs',`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Input=host('input'),Textarea=host('textarea'),Checkbox=host('checkbox');
export const Sheet=host('sheet'),SheetContent=host('sheet-content'),SheetHeader=host('header'),SheetTitle=host('h2'),SheetDescription=host('p');
export const Select=host('select-control'),SelectContent=host('select-content'),SelectItem=host('select-item'),SelectTrigger=host('select-trigger'),SelectValue=host('select-value');
export const BusinessField=({label,children})=>React.createElement('field',{label},children);
export const Pick=host('pick');export const displayDate=value=>value;export const restoreHandoverFocus=()=>{};
// This editor lifecycle suite isolates its unrelated closed copy-tool wrapper;
// the actual copy UI is exercised separately against built HTTP in browser QA.
export const PrivateDraftCopyTools=({children})=>children;
`);
const libs=[['@/lib/yearwheel-responsibility-drafts','./yearwheel-responsibility-drafts.mjs'],['@/lib/crm','./core.mjs'],['@/lib/business','./business.mjs'],['@/lib/record-conflicts','./record-conflicts.mjs'],['@/lib/yearwheel-responsibility','./yearwheel-responsibility.mjs'],['@/lib/year-need-drafts','./year-need-drafts.mjs'],['@/lib/article-drafts','./article-drafts.mjs']];
compile('components/draft-workspace.tsx','work/year-draft-workspace-test.mjs',[...libs,['@/components/ui/button','./year-ui-primitives.mjs'],['@/components/private-draft-copy-tools','./year-ui-primitives.mjs']]);
compile('components/year-need-draft-preview.tsx','work/year-draft-preview-test.mjs',libs);
compile('components/year-need-editor.tsx','work/year-editor-test.mjs',[...libs,...['button','input','textarea','checkbox','select','sheet'].map(name=>['@/components/ui/'+name,'./year-ui-primitives.mjs']),['./business-ui','./year-ui-primitives.mjs'],['./handover-focus','./year-ui-primitives.mjs'],['./draft-workspace','./year-draft-workspace-test.mjs'],['./year-need-draft-preview','./year-draft-preview-test.mjs']]);
const {YearNeedEditor}=await import('../work/year-editor-test.mjs'),{DraftProvider,useDrafts}=await import('../work/year-draft-workspace-test.mjs');
const core=await import('../work/core.mjs'),contracts=await import('../work/year-need-drafts.mjs'),{NeedSchema}=await import('../work/business.mjs');
const originals=Object.fromEntries(['fetch','window','localStorage','requestAnimationFrame','setInterval','clearInterval','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let renderer,workspace,args,scope='identity-a',server=new Map(),storage=new Map(),calls=[],published=[],closed=0,loading=null,privateFailure=false,publishImplementation=null,timers=new Map(),timerId=0;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const clone=value=>structuredClone(value),key=(space,id)=>JSON.stringify([space,scope,id]);
const fixture=()=>{const st=core.emptyState();st.version=10;st.viewer={id:'identity-a',memberId:'member-a',role:'seller',owner:'Syntetisk ansvarig',name:'Syntetisk aktör'};st.settings.owners=['Syntetisk ansvarig'];st.settings.sellerProfilesInitialized=true;st.settings.sellerProfiles=[{id:'d14c4d5b-9f7c-4b51-abdc-1ace74531d23',displayName:'Syntetisk ansvarig',legacyOwnerName:'Syntetisk ansvarig',memberId:'member-a',active:true,linkHistory:[],retirementHistory:[]}];st.customers=[core.CustomerSchema.parse({id:'editor-customer',name:'Syntetisk redigeringskund',owner:'Syntetisk ansvarig',ownerProfileId:st.settings.sellerProfiles[0].id,status:'active',yearNeeds:[NeedSchema.parse({id:'editor-need',title:'Registrerat behov',due:'2027-01-15',owner:'Syntetisk ansvarig',ownerProfileId:st.settings.sellerProfiles[0].id})]})];return st;};
function Probe(){workspace=useDrafts();return null;}
function tree(){return React.createElement(DraftProvider,{space:args.space||'live',userId:scope,enabled:['seller','admin'].includes(args.st.viewer?.role),canEditArticles:false},React.createElement(Probe),React.createElement(YearNeedEditor,{...args,busy:false,publish:async(data,fail)=>{published.push(data);return publishImplementation?publishImplementation(data,fail):true;},refresh:async()=>args.refreshed||args.st,onClose:()=>closed++}));}
async function drain(){for(let i=0;i<15;i++)await Promise.resolve();}
async function render(next){args={...args,...next};await act(async()=>{renderer.update(tree());await drain();});}
async function mount(st=fixture(),request={customerId:'editor-customer',needId:'editor-need'},extra={}){args={st,request,...extra};await act(async()=>{renderer=create(tree());await drain();});}
async function unmount(){if(renderer){await act(async()=>{renderer.unmount();await drain();});renderer=null;}}
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
const button=label=>renderer.root.findAllByType('button').find(node=>text(node)===label);
const field=label=>renderer.root.findAllByType('field').find(node=>node.props.label===label).findByType(label==='Omfattning, anledning och förberedelser'?'textarea':'input');
async function click(label){const node=button(label);assert.ok(node,'Expected visible action '+label);assert.ok(!node.props.disabled,'Action must be explicitly enabled: '+label);await act(async()=>{node.props.onClick();await drain();});}
async function change(label,value){await act(async()=>{field(label).props.onChange({target:{value}});await drain();});}
async function check(){const box=renderer.root.findAllByType('checkbox').at(-1);assert.ok(box);await act(async()=>{box.props.onCheckedChange(true);await drain();});}
const local=()=>workspace.records[0],serverRow=()=>server.get(key(args.space||'live',local()?.id));
async function flush(){let result;await act(async()=>{result=await workspace.flush(local().id);await drain();});return result;}
async function isolated(label,test){await unmount();scope='identity-a';server=new Map();storage=new Map();calls=[];published=[];closed=0;loading=null;privateFailure=false;publishImplementation=null;await test();await unmount();assert.equal(timers.size,0,'Timers must not survive '+label);console.log('PASS yearwheel editor lifecycle: '+label);}
try{
 Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
 Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
 Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:fn=>{fn();return 1;}});
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,700);const id=++timerId;timers.set(id,fn);return id;};globalThis.clearInterval=id=>timers.delete(id);
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url,'https://crm.test'),call={method:options.method||'GET',url,scope,body:options.body?JSON.parse(options.body):null};calls.push(call);
  assert.equal(u.pathname,'/api/crm/drafts');assert.ok(options.signal instanceof AbortSignal);
  if(call.method==='GET'){if(loading){const job=loading;loading=null;return job.promise;}const space=u.searchParams.get('space'),id=u.searchParams.get('id');return Response.json([...server].filter(([k,d])=>{const [s,user,did]=JSON.parse(k);return s===space&&user===scope&&(!id||id===did)&&!!id||s===space&&user===scope&&!id&&!d.archived;}).map(([,d])=>clone(d)));}
  if(privateFailure)return Response.json({error:'Syntetiskt nätfel vid privat sparning'},{status:503});
  const p=call.body,k=key(p.space,p.id),old=server.get(k);
  if(old&&(old.archived||old.revision!==p.revision))return Response.json({error:'En annan privat version finns',current:clone(old)},{status:409});
  const row={id:p.id,kind:p.kind,context:p.context,revision:(old?.revision||0)+1,requestId:p.requestId,title:p.title,data:clone(p.data),archived:p.archived,updatedAt:'2026-10-09T08:00:00.000Z'};server.set(k,row);return Response.json(clone(row));
 };

 await isolated('opening before private load freezes original customer/need/profile context through a later CRM read',async()=>{
  const st=fixture(),original=clone(st),job=deferred();loading=job;await mount(st);assert.equal(workspace.ready,false);const later=clone(st);later.version++;later.customers[0].name='Senare registrerat kundnamn';later.customers[0].yearNeeds[0].notes='Kollegans senare behovsunderlag';await render({st:later});await act(async()=>{job.resolve(Response.json([]));await drain();});
  assert.equal(local().data.context.customer.name,original.customers[0].name);assert.equal(local().data.context.need.notes,original.customers[0].yearNeeds[0].notes);assert.equal(button('Spara behov och påminnelse').props.disabled,true);assert.equal(published.length,0);
 });
 await isolated('unfinished title/date/numeric text survives exact server flush and does not crash the real editor',async()=>{
  await mount();await change('Behov *','  ');await change('Behövs hos kunden *','2026-99-99');await change('Kontakta så många dagar före','30');await change('Omfattning, anledning och förberedelser','  Rå text\n  ');await change('Kontakta så många dagar före',' 3e ');await flush();
  const d=local();assert.equal(serverRow().data.values.due,'2026-99-99');assert.equal(serverRow().data.values.leadDays,' 3e ');assert.equal(serverRow().data.values.notes,'  Rå text\n  ');assert.equal(serverRow().data.values.title,'  ');assert.equal(published.length,0);assert.equal(d.status,'saved');
 });
 await isolated('close waits for a confirmed private save and retains failed work without CRM publication',async()=>{
  await mount();await change('Omfattning, anledning och förberedelser','  Behåll mitt arbete  ');privateFailure=true;await click('Spara utkast & stäng');assert.equal(closed,0);assert.equal(local().data.values.notes,'  Behåll mitt arbete  ');assert.equal(local().status,'error');assert.equal(published.length,0);privateFailure=false;await click('Spara utkast & stäng');assert.equal(closed,1);assert.equal(serverRow().data.values.notes,'  Behåll mitt arbete  ');
 });
 await isolated('new private need keeps explicit empty owner selection until an actual active profile is chosen',async()=>{
  await mount(fixture(),{customerId:'editor-customer',needId:''});assert.equal(local().data.context.need,null);assert.equal(local().data.values.owner,'');assert.equal(local().data.values.ownerProfileId,'');assert.equal(button('Spara behov och påminnelse').props.disabled,true);await flush();assert.equal(serverRow().data.values.owner,'');
  const select=renderer.root.findByType('select-control');await act(async()=>{select.props.onValueChange(args.st.settings.sellerProfiles[0].id);await drain();});assert.equal(local().data.values.owner,'Syntetisk ansvarig');assert.equal(local().data.values.ownerProfileId,args.st.settings.sellerProfiles[0].id);
 });
 await isolated('two-device conflict requires explicit comparison and invalidates reviewed choices when the server comparison changes',async()=>{
  await mount();await change('Omfattning, anledning och förberedelser','Min öppna text');await flush();const row=serverRow();server.set(key('live',row.id),{...row,revision:row.revision+1,requestId:crypto.randomUUID(),data:{...row.data,values:{...row.data.values,notes:'Annan enhets sparade text'}}});await act(async()=>{await workspace.reconcile(row.id);await drain();});
  assert.equal(local().status,'conflict');assert.equal(local().data.values.notes,'Min öppna text');assert.equal(button('Använd den visade serverversionen').props.disabled,true);await check();assert.equal(button('Använd den visade serverversionen').props.disabled,false);const newer=serverRow();server.set(key('live',newer.id),{...newer,revision:newer.revision+1,requestId:crypto.randomUUID(),data:{...newer.data,values:{...newer.data.values,notes:'Nyare separat enhetsversion'}}});await act(async()=>{await workspace.reconcile(newer.id);await drain();});assert.equal(button('Använd den visade serverversionen').props.disabled,true,'Changed server comparison invalidates the old review');await check();await click('Använd den visade serverversionen');assert.equal(local().data.values.notes,'Nyare separat enhetsversion');assert.equal(published.length,0);
 });
 await isolated('shared CRM reread stays separate from explicit reviewed adoption and preserves private content',async()=>{
  await mount();await change('Omfattning, anledning och förberedelser','  Min privata text  ');const previous=local().data.expectedContext,latest=clone(args.st);latest.version++;latest.customers[0].yearNeeds[0].notes='Kollegans nya text';latest.customers[0].yearNeeds[0].completedAt='2026-10-09';latest.customers[0].yearNeeds[0].due='2027-02-15';await render({st:latest,refreshed:latest});
  assert.equal(local().data.expectedContext,previous);assert.equal(button('Spara behov och påminnelse').props.disabled,true);await click('Hämta aktuellt CRM-underlag');assert.equal(local().data.expectedContext,previous);await click('Granska aktuellt CRM-underlag');assert.equal(button('Använd aktuellt underlag och behåll mina uppgifter').props.disabled,true);await check();assert.equal(button('Använd aktuellt underlag och behåll mina uppgifter').props.disabled,false);await change('Omfattning, anledning och förberedelser','  Ny privat text efter granskningen  ');assert.equal(button('Använd aktuellt underlag och behåll mina uppgifter'),undefined,'A private edit invalidates the earlier shared-context review');assert.equal(local().data.expectedContext,previous);await click('Granska aktuellt CRM-underlag');assert.equal(button('Använd aktuellt underlag och behåll mina uppgifter').props.disabled,true);await check();await click('Använd aktuellt underlag och behåll mina uppgifter');
  assert.equal(local().data.values.notes,'  Ny privat text efter granskningen  ');assert.equal(local().data.values.due,'2027-01-15');assert.equal(local().data.values.completedAt,'2026-10-09');assert.notEqual(local().data.expectedContext,previous);assert.equal(published.length,0);
 });
 await isolated('an unconfirmed mocked CRM response retries the exact frozen raw payload without a second private revision',async()=>{
  await mount();await change('Omfattning, anledning och förberedelser','  Exakt avsikt  ');publishImplementation=async(_data,fail)=>{fail(503,'Obekräftat');return false;};await click('Spara behov och påminnelse');assert.equal(published.length,1);const frozen=clone(published[0]),revision=serverRow().revision;assert.equal(closed,0);publishImplementation=async()=>true;await click('Försök samma CRM-sparning igen');assert.equal(published.length,2);assert.deepEqual(published[1],frozen);assert.equal(server.get(key('live',frozen.draft.id)).revision,revision);assert.equal(closed,1);assert.equal(workspace.records.length,0);
 });
 await isolated('malformed private record stays readable for recovery without offering a business save',async()=>{
  const st=fixture(),e=contracts.createYearNeedDraftEnvelope(st,'editor-customer',contracts.yearNeedDraftValues(st.customers[0].yearNeeds[0]),'malformed-editor-draft');e.values.unexpected='preserved malformed text';server.set(key('live',e.draftId),{id:e.draftId,kind:'form',context:'year_need',revision:1,requestId:crypto.randomUUID(),title:'Bevarat ogiltigt underlag',data:e,archived:false,updatedAt:'2026-10-09T08:00:00Z'});await mount(st,{customerId:'editor-customer',needId:'editor-need',draftId:e.draftId});assert.deepEqual(local().data,e);assert.equal(button('Spara behov och påminnelse').props.disabled,true);assert.match(text(renderer.toJSON()),/preserved malformed text/);assert.equal(published.length,0);
 });
 await isolated('a changed identity hides old work before a delayed private read can recreate it under a new account',async()=>{
  const st=fixture(),job=deferred();loading=job;await mount(st);scope='identity-b';const next=clone(st);next.viewer={...next.viewer,id:scope,memberId:'member-b'};await render({st:next});await act(async()=>{job.resolve(Response.json([]));await drain();});assert.equal(workspace.records.length,0);assert.equal(published.length,0);assert.ok(!calls.some(call=>call.method==='POST'));
 });
 console.log('PASS yearwheel editor: 9 production React + private-workspace lifecycle cases; visual primitives and HTTP mocked; no browser/account/staff acceptance claimed.');
}finally{await unmount();for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
