import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
import {orderScopeFixture} from './order-scope.mjs';

// Actual immutable main immediately before CRM99. All returned metric fields
// except intentional personal orders remain exact baseline. Explicit-profile,
// team, yearly series and team rows retain the entire baseline.
// Main b638c72593724fbbb842e9820b5c49ff85f570f7; source SHA-256
// f04cba18c0f86ba9abcd6a1e367015585710f10e0ff98e97fc3dc4dea6b12e49.
const baselineSource=String.raw`import {type State,day,isOpen,margin} from './crm';
import {legacySellerNames,personalSellerId,sellerProfileById} from './seller-profiles';

// Operational ownership stays on its existing alias until the separate
// operational-ID migration is complete. Result attribution never follows it
// once explicit seller profiles have been initialized.
export const personalOwner=(st:State)=>st.viewer?.owner&&st.settings.owners.includes(st.viewer.owner)?st.viewer.owner:'';
export const personalResultScope=(st:State)=>st.settings.sellerProfilesInitialized?personalSellerId(st):personalOwner(st);
export function resultOperationalOwner(st:State,scope:string){
 if(scope==='all')return 'all';
 const alias=st.settings.sellerProfilesInitialized?sellerProfileById(st.settings,scope)?.legacyOwnerName||'':scope;
 return st.settings.owners.includes(alias)?alias:'';
}
// Task responsibility can be anchored to a profile independently of the
// current account's operational alias. Profile rows must not inherit the
// viewing account's alias; the personal activity card uses that actual alias
// only for older tasks without a registered profile ID.
export function resultTaskScope(st:State,scope:string,activityMode:'profile'|'personal'='profile'){
 const empty={team:false,profileId:'',legacyOwner:'',diagnostic:'' as ''|'missing'|'mismatch'|'operational-missing'};
 const personal=activityMode==='personal',team=!personal&&scope==='all';
 if(team)return {...empty,team:true};
 const ownScope=personalResultScope(st);
 if(personal&&scope!==ownScope)return empty;
 const profileId=st.settings.sellerProfilesInitialized?(personal?ownScope:sellerProfileById(st.settings,scope)?.id||''):'';
 const legacyOwner=personal?personalOwner(st):resultOperationalOwner(st,scope),profile=profileId?sellerProfileById(st.settings,profileId):undefined;
 const diagnostic:typeof empty.diagnostic=personal&&st.settings.sellerProfilesInitialized?(!profileId?'missing':!legacyOwner?'operational-missing':profile&&profile.legacyOwnerName!==legacyOwner?'mismatch':''):'';
 return {team:false,profileId,legacyOwner,diagnostic};
}
export function swedishMonth(at:string){if(!at)return '';const date=new Date(at);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(date);}

function invoiceInScope(st:State,o:State['orders'][number],scope:string){
 if(scope==='all')return true;
 if(!scope)return false;
 return st.settings.sellerProfilesInitialized?!!sellerProfileById(st.settings,scope)&&o.invoiceOwnerId===scope:(o.invoiceOwner||o.owner)===scope;
}
function qualificationInScope(st:State,c:State['customers'][number],scope:string){
 if(scope==='all')return true;
 if(!scope)return false;
 return st.settings.sellerProfilesInitialized?!!sellerProfileById(st.settings,scope)&&c.prospecting.qualifiedOwnerId===scope:(c.prospecting.qualifiedOwner||c.owner)===scope;
}
function sellerGoals(st:State,scope:string){return st.settings.sellerProfilesInitialized?st.settings.sellerGoalsById[scope]:st.settings.sellerGoals[scope];}
function sellerAnnualGoals(st:State,scope:string){return st.settings.sellerProfilesInitialized?st.settings.sellerAnnualGoalsById[scope]:st.settings.sellerAnnualGoals[scope];}

export function salesMetrics(st:State,month:string,owner:string,activityMode:'profile'|'personal'='profile'){
 const year=month.slice(0,4),operationalOwner=resultOperationalOwner(st,owner),matches=(r:{owner:string})=>owner==='all'||!!operationalOwner&&r.owner===operationalOwner;
 const taskScope=resultTaskScope(st,owner,activityMode),matchesWork=(r:{owner:string;ownerProfileId?:string})=>taskScope.team||(r.ownerProfileId?!!taskScope.profileId&&r.ownerProfileId===taskScope.profileId:!!taskScope.legacyOwner&&r.owner===taskScope.legacyOwner);
 const invoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(month+'-'));
 const yearInvoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-'));
 const known=invoices.filter(o=>o.actualCost!==null),knownRevenue=known.reduce((n,o)=>n+o.invoiceValue!,0),knownCost=known.reduce((n,o)=>n+o.actualCost!,0);
 // The personal live pipeline follows current registered responsibility and
 // the account's valid alias for older deals, separately from result history.
 const open=st.deals.filter(d=>(activityMode==='personal'?matchesWork(d):matches(d))&&isOpen(d)),goals=owner==='all'?undefined:sellerGoals(st,owner)?.[month];
 const yearMonths=Object.entries(sellerGoals(st,owner)||{}).filter(([date,g])=>date.startsWith(year+'-')&&g.revenue!==null);
 const explicitYear=owner==='all'?st.settings.annualBudgets[year]:sellerAnnualGoals(st,owner)?.[year];
 const yearTarget=explicitYear??(owner!=='all'&&yearMonths.length===12?yearMonths.reduce((n,[,g])=>n+g.revenue!,0):null);
 const unattributedInvoices=st.settings.sellerProfilesInitialized?invoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const yearUnattributedInvoices=st.settings.sellerProfilesInitialized?yearInvoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const qualified=st.customers.filter(c=>qualificationInScope(st,c,owner)&&swedishMonth(c.prospecting.qualifiedAt)===month);
 const unattributedQualified=st.settings.sellerProfilesInitialized?qualified.filter(c=>!c.prospecting.qualifiedOwnerId||!sellerProfileById(st.settings,c.prospecting.qualifiedOwnerId)):[];
 return {invoices,yearInvoices,known,revenue:invoices.reduce((n,o)=>n+o.invoiceValue!,0),target:(owner==='all'?st.settings.budgets[month]:goals?.revenue)??null,profit:known.length?knownRevenue-knownCost:null,profitTarget:goals?.grossProfit??null,margin:margin(knownRevenue,knownCost),yearRevenue:yearInvoices.reduce((n,o)=>n+o.invoiceValue!,0),yearTarget,yearTargetSource:explicitYear!=null?'annual':yearMonths.length===12?'months':'missing',configuredMonths:yearMonths.length,qualified:qualified.length,qualifiedTarget:goals?.qualified??null,open,pipeline:open.reduce((n,d)=>n+(d.value||0),0),unpriced:open.filter(d=>d.value===null).length,repeat:invoices.filter(o=>st.deals.find(d=>d.id===o.dealId)?.type==='repeat').length,tasks:st.tasks.filter(t=>matchesWork(t)&&!t.done).sort((a,b)=>a.due.localeCompare(b.due)),customers:st.customers.filter(matches),orders:st.orders.filter(matches),meetings:st.meetings.filter(m=>(owner==='all'||(m.ownerProfileId?st.settings.sellerProfilesInitialized&&m.ownerProfileId===owner:!!operationalOwner&&m.owner===operationalOwner))&&m.status==='planned'&&m.date>=day()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),unattributedInvoices,unattributedRevenue:unattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),yearUnattributedInvoices,yearUnattributedRevenue:yearUnattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),unattributedQualified:unattributedQualified.length};
}
export function noticeInScope(st:State,n:State['notices'][number],owner:string){if(owner==='all'||['print','warehouse','production'].includes(st.viewer?.role||''))return true;if(n.audience==='team')return true;if(!owner||owner==='_unassigned')return false;return n.owner===owner||!!n.orderId&&st.orders.some(o=>o.id===n.orderId&&o.owner===owner);}

export function salesYearSeries(st:State,year:string,owner:string){
 const invoices=st.orders.filter(o=>o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-')&&invoiceInScope(st,o,owner));
 let cumulativeRevenue=0,cumulativeTarget:number|null=0;
 return Array.from({length:12},(_,i)=>{
  const month=year+'-'+String(i+1).padStart(2,'0'),rows=invoices.filter(o=>o.invoiceDate.startsWith(month+'-'));
  const target=(owner==='all'?st.settings.budgets[month]:sellerGoals(st,owner)?.[month]?.revenue)??null;
  const revenue=rows.reduce((sum,o)=>sum+o.invoiceValue!,0);cumulativeRevenue+=revenue;
  cumulativeTarget=target===null||cumulativeTarget===null?null:cumulativeTarget+target;
  return {month,label:new Date(month+'-01T12:00:00').toLocaleDateString('sv-SE',{month:'short'}),revenue,target,invoices:rows.length,cumulativeRevenue,cumulativeTarget};
 });
}

// Include inactive profiles so former sellers' history remains visible.
export function teamSalesRows(st:State,month:string){
 const profiles=st.settings.sellerProfilesInitialized?st.settings.sellerProfiles:legacySellerNames(st).map(owner=>({id:owner,legacyOwnerName:owner,displayName:owner,active:st.settings.owners.includes(owner)}));
 return profiles.map(profile=>{
  const stats=salesMetrics(st,month,profile.id),goal=sellerGoals(st,profile.id)?.[month];
  return {id:profile.id,ownerId:st.settings.sellerProfilesInitialized?profile.id:'',owner:profile.legacyOwnerName,displayName:profile.displayName,active:profile.active,revenue:stats.revenue,profit:stats.profit,margin:stats.margin,known:stats.known.length,invoices:stats.invoices.length,qualified:stats.qualified,goal,attainment:stats.target!==null&&stats.target>0?stats.revenue/stats.target:null,repeat:stats.repeat,late:stats.tasks.filter(t=>t.due<day()).length};
 });
}
`;

const profileA='d5746101-f76b-4ec7-9f44-90d7e9c5a001',profileB='d5746101-f76b-4ec7-9f44-90d7e9c5a002';
const nameA='Syntetiskt orderansvar A',nameB='Syntetiskt orderansvar B',removedName='Syntetiskt borttaget orderansvar';
const groups=['active','receipt','invoice','history'],responsibilities=['a','b','legacy-a','legacy-b','sentinel','removed'];
const expected=(suffixes,stages=groups)=>stages.flatMap(stage=>suffixes.map(suffix=>stage+'-'+suffix));

// Existing accepted order fixture retains separate customer/deal responsibility,
// invoice attribution, physical/direct delivery and frozen receipt projections.
// Additional financial, goal, task, meeting and prospect values are synthetic.
export function resultOrderScopeFixture(core,options={}){
 const st=orderScopeFixture(core,options),initialized=st.settings.sellerProfilesInitialized;
 st.settings.budgets['2026-10']=8000;st.settings.annualBudgets['2026']=96000;
 const goals=initialized?'sellerGoalsById':'sellerGoals',annual=initialized?'sellerAnnualGoalsById':'sellerAnnualGoals';
 for(const [id,owner,monthly] of [[profileA,nameA,2000],[profileB,nameB,5000]]){const key=initialized?id:owner;st.settings[goals][key]={'2026-10':{revenue:monthly,grossProfit:monthly/2,qualified:3}};st.settings[annual][key]={'2026':monthly*12};}
 st.customers[0].prospecting={...st.customers[0].prospecting,qualifiedAt:'2026-10-09T10:00:00.000Z',qualifiedOwner:nameB,qualifiedOwnerId:initialized?profileB:''};
 st.tasks.push(...(initialized?[core.TaskSchema.parse({id:'synthetic-result-order-profile-task',customerId:st.customers[0].id,owner:nameB,ownerProfileId:profileB,title:'Syntetisk separat profilaktivitet',due:'2026-10-20'})]:[]),core.TaskSchema.parse({id:'synthetic-result-order-alias-task',customerId:st.customers[0].id,owner:nameA,title:'Syntetisk separat äldre aktivitet',due:'2026-10-20'}));
 st.meetings=[core.MeetingSchema.parse({id:'synthetic-result-order-meeting',customerId:st.customers[0].id,title:'Syntetiskt separat möte',owner:nameB,ownerProfileId:initialized?profileB:'',date:'2026-10-20',time:'10:00',duration:30})];
 const source=st.deals[0];st.deals.push(core.DealSchema.parse({...source,id:'synthetic-result-order-open',stage:'quoted',wonAt:'',owner:nameB,ownerProfileId:initialized?profileB:'',title:'Syntetisk separat öppen affär',value:500}));
 return core.normalizeState(st);
}

// Real domain modules, whole Resultat/Orders components and actual page JSX
// and callback run. Boundaries are visual primitives, chart surfaces and closed
// unrelated dialogs. No HTTP, actual account, live records or browser is used.
export async function verifyResultOrderScope(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/result-order-scope-'));
 const compiled=new Set(),sourceBytes=new Map(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 const remember=file=>{const bytes=readFileSync(file);if(sourceBytes.has(file))assert.deepEqual(bytes,sourceBytes.get(file));else sourceBytes.set(file,bytes);return bytes.toString('utf8');};
 writeFileSync(helpers,`import React from 'react';const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));export const Button=host('button'),Input=host('input'),Textarea=host('textarea'),Progress=host('progress'),Tabs=host('tabs'),TabsList=host('tabs-list'),TabsTrigger=host('tabs-trigger'),Switch=host('input'),Table=host('table'),TableBody=host('tbody'),TableCell=host('td'),TableHead=host('th'),TableHeader=host('thead'),TableRow=host('tr'),BusinessField=host('label'),Pick=host('pick');export const Sheet=({open,children})=>open?React.createElement('sheet',{},children):null,SheetContent=host('sheet-content'),SheetHeader=host('sheet-header'),SheetTitle=host('sheet-title'),SheetDescription=host('sheet-description');export const SalesTrend=()=>null,OrderChanges=()=>null,ProductionProgress=()=>null,QuantityDialog=()=>null,ProductionIssueResponsibilityHistory=()=>null;`);
 const formatterSource=remember('components/business-ui.tsx'),formatterAST=ts.createSourceFile('components/business-ui.tsx',formatterSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),formatters=formatterAST.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&['money','displayDate'].includes(d.name.text)));
 assert.equal(formatters.length,2);const formatterTarget=resolve(directory,'formatters.mjs');writeFileSync(formatterTarget,ts.transpileModule(formatters.map(n=>n.getText(formatterAST)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText+"\nexport {BusinessField,Pick} from './helpers.mjs';\n");
 const actualComponents=new Set(['components/sales-dashboard.tsx','components/team-dashboard.tsx','components/production-board.tsx']);
 function compile(file,source){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||actualComponents.has(file));
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(source??remember(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier.startsWith('@/components/ui/')||specifier==='./sales-trend')dependency=helpers;
   else if(specifier==='./business-ui')dependency=formatterTarget;
   else if(specifier==='./team-dashboard')dependency=compile('components/team-dashboard.tsx');
   else if(actualComponents.has(file)&&specifier.startsWith('./'))dependency=helpers;
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const original=Object.fromEntries(['fetch','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let renderer,calls=[],http=[],cases=0,uiCases=0,defensiveCases=0,baselineComparisons=0,completeModeComparisons=0,scopeComparisons=0;
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const byClass=name=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props.className?.split(' ').includes(name));
 const button=caption=>renderer.root.findAllByType('button').find(node=>text(node)===caption);
 // CRM101 intentionally changes only personal current customer selection;
 // the captured pre-CRM99 baseline remains byte unchanged below.
 const omitOrders=(metrics,mode)=>Object.fromEntries(Object.entries(metrics).filter(([key])=>key!=='orders'&&(mode!=='personal'||key!=='customers')));
 const issueRows=orders=>orders.filter(order=>['submitted','printed'].includes(order.production.status)&&order.production.issue);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null}}
 async function scenario(label,run,{ui=false,defensive=false}={}){await unmount();calls=[];await run();await unmount();assert.equal(http.length,0,'Zero HTTP in '+label);cases++;if(ui)uiCases++;if(defensive)defensiveCases++;console.log('PASS Result order scope: '+label);}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{http.push(args);throw Error('Result order scope must not perform HTTP')}});
  assert.equal(createHash('sha256').update(baselineSource).digest('hex'),'f04cba18c0f86ba9abcd6a1e367015585710f10e0ff98e97fc3dc4dea6b12e49');
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),baseline=await import(pathToFileURL(compile('lib/result-order-baseline.ts',baselineSource)).href),domain=await import(pathToFileURL(compile('lib/order-scope.ts')).href),customerDomain=await import(pathToFileURL(compile('lib/customer-scope.ts')).href);
  const source=remember('app/page.tsx'),ast=ts.createSourceFile('app/page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];(function visit(node){nodes.push(node);ts.forEachChild(node,visit)})(ast);
  const variable=name=>{const matches=nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name);assert.equal(matches.length,1,'Unique actual declaration '+name);return matches[0].initializer.getText(ast);};
  const result=nodes.filter(node=>ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)&&node.expression.left.getText(ast)==="['overview','team'].includes(view)"&&node.expression.right.getText(ast).includes('<SalesDashboard '));assert.equal(result.length,1,'Whole actual Resultat parent fragment');
  const board=nodes.filter(node=>ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)&&node.expression.right.getText(ast).startsWith('<ProductionBoard '));assert.equal(board.length,1,'Whole actual Orders board parent fragment');
  const parentTarget=resolve(directory,'actual-result-order-parent.mjs'),parentCode=`import React from 'react';import {SalesDashboard} from ${JSON.stringify(pathToFileURL(compile('components/sales-dashboard.tsx')).href)};import {ProductionBoard} from ${JSON.stringify(pathToFileURL(compile('components/production-board.tsx')).href)};import {personalOwner,personalResultScope,resultOperationalOwner} from ${JSON.stringify(pathToFileURL(compile('lib/sales-dashboard.ts')).href)};
export function frame(st,selectedView,month,calls){const viewerReady=(${variable('viewerReady')}),department=(${variable('department')}),view=(${variable('view')}),record=kind=>(value)=>calls.push({kind,value}),setOwner=record('owner'),setSearch=record('search'),setFilter=record('filter'),setView=record('view'),setMonth=record('month'),navigate=record('navigate'),showCustomer=record('customer'),openActivity=record('task');return (${result[0].expression.getText(ast)});}
export function orders(st,owner,calls){const selectedView='orders',viewerReady=(${variable('viewerReady')}),department=(${variable('department')}),view=(${variable('view')}),space='synthetic-result-order-space',busy=false,save=(...args)=>calls.push({kind:'save',args}),open=(type,data)=>calls.push({kind:'open',type,data}),setCommercialTransfer=data=>calls.push({kind:'transfer',data}),openOrderAnchor=data=>calls.push({kind:'anchor',data}),openProductionAssignment=data=>calls.push({kind:'assignment',data}),openProductionIssueResponsibility=data=>calls.push({kind:'issueResponsibility',data});return (${board[0].expression.getText(ast)});}`;
  writeFileSync(parentTarget,ts.transpileModule(parentCode,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);const parent=await import(pathToFileURL(parentTarget).href);
  const fixture=options=>resultOrderScopeFixture(core,options),own=st=>dashboard.personalOwner(st)||'_unassigned';
  function actualOrders(st){const scope=domain.orderScope(st,own(st));return st.orders.filter(order=>domain.orderInScope(order,scope));}
  function metrics(st,ids,{scope=dashboard.personalResultScope(st),mode='personal',month='2026-10'}={}){
   assert.deepEqual(core.normalizeState(structuredClone(st)),st,'Actual accepted normalization is idempotent');const before=JSON.stringify(st);freeze(st);
   const measured=dashboard.salesMetrics(st,month,scope,mode),old=baseline.salesMetrics(st,month,scope,mode);assert.deepEqual(measured.orders.map(order=>order.id),ids);
   assert.deepEqual(Object.keys(measured),Object.keys(old),'No other metric field added or removed');assert.deepEqual(omitOrders(measured,mode),omitOrders(old,mode),'Every protected metric including pipeline/tasks and historical financial attribution stays exact current-main');baselineComparisons++;
   if(mode==='personal')assert.deepEqual(measured.customers,scope===dashboard.personalResultScope(st)&&scope!=='all'?st.customers.filter(customer=>customerDomain.customerInScope(customer,customerDomain.customerScope(st,own(st)))):[],'CRM101 personal current customers match established Mina kunder, separately from order and financial attribution');
   if(mode==='profile'){assert.deepEqual(measured,old,'Entire explicit-profile/team result retains main');completeModeComparisons++;assert.deepEqual(dashboard.salesMetrics(st,month,scope),old);}
   if(mode==='personal'&&scope===dashboard.personalResultScope(st)){const expectedRows=actualOrders(st);assert.deepEqual(measured.orders,expectedRows,'Exact orderScope/orderInScope rows and data, not only counts');assert.deepEqual(issueRows(measured.orders),issueRows(expectedRows));scopeComparisons++;}
   assert.deepEqual(dashboard.salesYearSeries(st,month.slice(0,4),scope),baseline.salesYearSeries(st,month.slice(0,4),scope));assert.deepEqual(dashboard.teamSalesRows(st,month),baseline.teamSalesRows(st,month));assert.equal(JSON.stringify(st),before);return measured;
  }
  async function renderResult(st,{view='overview',month='2026-10',update=false}={}){const before=JSON.stringify(st);freeze(st);await act(async()=>{const tree=parent.frame(st,view,month,calls);if(update){assert.ok(renderer);renderer.update(tree)}else renderer=create(tree)});assert.equal(JSON.stringify(st),before);return()=>assert.equal(JSON.stringify(st),before,'Result callbacks preserve frozen CRM');}
  function issuesUI(count,diagnostic=''){
   const match=byClass('result-attention').filter(node=>/^\d+ order har ett hinder/.test(text(node.findByType('b'))));assert.equal(match.length,1);const node=match[0];assert.equal(text(node.findByType('b')),count+' order har ett hinder'+(diagnostic?' · synligt urval':''));assert.equal(node.props['data-urgent'],count>0);assert.equal(node.props['data-profile-diagnostic']||'',diagnostic);
   assert.equal(text(node.findByType('small')),diagnostic?(count?'Hinder i order som kan kopplas till dig':'Inga hinder visas i urvalet. Listan kan vara ofullständig.'):'Hjälp tryck och lager vidare');return node;
  }
  async function drillOrders(st,issueButton,expectedActive,expectedOwner=own(st)){await act(async()=>issueButton.props.onClick());assert.deepEqual(calls,[{kind:'owner',value:expectedOwner},{kind:'search',value:''},{kind:'view',value:'orders'}]);const selected=calls[0].value;calls=[];await unmount();await act(async()=>renderer=create(parent.orders(st,selected,calls)));const cards=byClass('production-card'),ids=cards.map(node=>text(node.findAllByType('h3')[0]).replace('Syntetisk order ',''));assert.deepEqual(ids,expectedActive.slice().sort());assert.equal(calls.length,0);return ids;}

  await scenario('crossed exact B/current A replaces former B alias even when counts match',async()=>{const st=fixture(),old=baseline.salesMetrics(st,'2026-10',dashboard.personalResultScope(st),'personal'),current=metrics(st,expected(['b','legacy-a']));assert.equal(old.orders.length,current.orders.length);assert.notDeepEqual(old.orders.map(order=>order.id),current.orders.map(order=>order.id));assert.deepEqual(issueRows(old.orders).map(order=>order.id),['active-b','active-legacy-b']);assert.deepEqual(issueRows(current.orders).map(order=>order.id),['active-b','active-legacy-a']);assert.equal(current.revenue,100);assert.equal(current.profit,80);assert.equal(current.target,5000);assert.equal(current.yearTarget,60000);assert.equal(current.qualified,1);assert.equal(current.pipeline,500);});
  await scenario('matching B keeps exact B and older B without borrowing identical display names',async()=>{metrics(fixture({owner:nameB}),expected(['b','legacy-b']));});
  await scenario('exact member A/current B does not borrow identically named B',async()=>{metrics(fixture({link:'a',owner:nameB}),expected(['a','legacy-b']));});
  for(const [label,options] of [['empty alias',{owner:''}],['removed alias',{owner:removedName}],['alias removed from roster',{owners:[nameB]}]])await scenario(label+' keeps exact registered B without sentinel or stale alias',async()=>{metrics(fixture(options),expected(['b']));});
  await scenario('retired B alias preserves exact current member B orders',async()=>{metrics(fixture({owners:[nameA]}),expected(['b','legacy-a']));});
  await scenario('inactive exact B reads accepted responsibility without activation',async()=>{const st=fixture({inactive:true,owner:'',owners:[nameA]});metrics(st,expected(['b']));assert.equal(st.settings.sellerProfiles[1].active,false);});
  for(const options of [{link:''},{memberId:''}])await scenario('missing exact immutable member link keeps only valid older A in domain',async()=>{metrics(fixture(options),expected(['legacy-a']));});
  await scenario('runtime user ID cannot substitute for missing immutable member ID',async()=>{const st=fixture({memberId:''});st.viewer.id='synthetic-order-member';metrics(st,expected(['legacy-a']));});
  await scenario('missing profile and alias never borrow sentinel or removed order responsibility',async()=>{metrics(fixture({link:'',owner:''}),[]);});
  await scenario('pre-profile valid alias retains existing older responsibility only',async()=>{metrics(fixture({initialized:false}),expected(['legacy-a']));});
  await scenario('pre-profile empty alias fails closed',async()=>{metrics(fixture({initialized:false,owner:''}),[]);});
  for(const supplied of ['all',profileA,'_unassigned','unknown-profile'])await scenario('foreign injected personal scope '+supplied+' fails closed only for personal order work',async()=>{metrics(fixture(),[],{scope:supplied});});
  await scenario('display-name rename and independent parent customer/deal changes never move order work',async()=>{const st=fixture();for(const profile of st.settings.sellerProfiles)profile.displayName='Samma ändrade syntetiska namn';st.customers[0]={...st.customers[0],owner:nameB,ownerProfileId:profileB};st.deals=st.deals.map(deal=>({...deal,owner:nameB,ownerProfileId:profileB}));core.normalizeState(st);metrics(st,expected(['b','legacy-a']));});
  await scenario('contradictory recorded order profile/alias is rejected by actual normalizer rather than accepted as work',async()=>{const st=fixture();st.orders=st.orders.map(order=>order.ownerProfileId===profileB?{...order,owner:nameA}:order);assert.throws(()=>core.normalizeState(st),/stabila ansvarskoppling saknas eller motsäger/);},{defensive:true});
  await scenario('only current submitted/printed nonempty issues count, archived completed draft cancelled remain distinct',async()=>{const st=fixture();for(const [id,status] of [['active-b','printed'],['receipt-b','dispatched'],['invoice-b','cancelled'],['history-b','draft']]){const order=st.orders.find(order=>order.id===id);order.production.status=status;order.production.issue='SYNTHETIC_STATUS_'+id;order.production.issueRevision=3;}const older=structuredClone(st.orders.find(order=>order.id==='active-b').production);older.status='cancelled';older.issue='SYNTHETIC_ARCHIVED_ISSUE';st.orders.find(order=>order.id==='active-b').productionHistory=[older];core.normalizeState(st);const current=metrics(st,expected(['b','legacy-a']));assert.deepEqual(issueRows(current.orders).map(order=>order.id),['active-b','active-legacy-a']);assert.ok(current.orders.some(order=>order.stage==='followed'));assert.equal(current.orders.find(order=>order.id==='active-b').production.issueRevision,3);});
  await scenario('empty issues keep actual own order rows and no inferred readiness claim',async()=>{const st=fixture();st.orders=st.orders.map(order=>({...order,production:{...order.production,issue:''}}));core.normalizeState(st);assert.equal(issueRows(metrics(st,expected(['b','legacy-a'])) .orders).length,0);});
  for(let variant=0;variant<6;variant++)await scenario('complete protected metric matrix '+variant+' across personal/profile/team and reporting months',async()=>{const seed=fixture();if(variant===0){seed.orders=[];seed.tasks=seed.tasks.filter(task=>task.kind!=='receipt')}if(variant===1)seed.orders=seed.orders.map(order=>({...order,actualCost:null}));if(variant===2){seed.settings.sellerAnnualGoalsById[profileB]={};seed.settings.sellerGoalsById[profileB]=Object.fromEntries(Array.from({length:12},(_,i)=>['2026-'+String(i+1).padStart(2,'0'),{revenue:1000,grossProfit:500,qualified:1}]))}if(variant===3){seed.settings.sellerGoalsById[profileB]={};seed.customers[0].prospecting={...seed.customers[0].prospecting,qualifiedAt:'',qualifiedOwner:'',qualifiedOwnerId:''}}if(variant===4)seed.orders=seed.orders.map(order=>({...order,actualCost:order.invoiceValue===null?null:order.invoiceValue*2}));if(variant===5){seed.viewer.owner='';seed.settings.owners=[nameA];seed.settings.sellerProfiles[1].active=false}core.normalizeState(seed);for(const month of ['2026-10','2026-08','2025-12']){const personal=structuredClone(seed);metrics(personal,actualOrders(personal).map(order=>order.id),{month});for(const scope of [profileA,profileB,'all','unknown-profile']){const st=structuredClone(seed),old=baseline.salesMetrics(st,month,scope,'profile');metrics(st,old.orders.map(order=>order.id),{month,scope,mode:'profile'});}}});
  for(const role of ['seller','reader','admin'])await scenario(role+' whole personal Resultat order count and real Orders drill follow exact own rows',async()=>{const st=fixture({role}),unchanged=await renderResult(st),node=issuesUI(2,'mismatch');assert.equal(byClass('result-kpi').length,4);await drillOrders(st,node,['active-b','active-legacy-a']);unchanged();},{ui:true});
  for(const [options,diagnostic,count,active] of [[{owner:''},'operational-missing',1,['active-b']],[{owner:removedName},'operational-missing',1,['active-b']],[{inactive:true,owner:'',owners:[nameA]},'operational-missing',1,['active-b']],[{owner:nameB},'',2,['active-b','active-legacy-b']],[{link:'a',owner:nameB},'mismatch',2,['active-a','active-legacy-b']],[{initialized:false},'',1,['active-legacy-a']]])await scenario('actual order count and drill '+JSON.stringify(options),async()=>{const st=fixture(options),unchanged=await renderResult(st);await drillOrders(st,issuesUI(count,diagnostic),active);unchanged();},{ui:true});
  await scenario('diagnostic zero issue count describes incomplete subset rather than verified empty queue',async()=>{const st=fixture();st.orders=st.orders.filter(order=>order.id!=='active-b'&&order.id!=='active-legacy-a');core.normalizeState(st);const unchanged=await renderResult(st);issuesUI(0,'mismatch');assert.ok(st.orders.some(order=>order.production.issue));unchanged();},{ui:true});
  await scenario('healthy zero issue keeps original helpful caption',async()=>{const st=fixture({owner:nameB});st.orders=st.orders.map(order=>({...order,production:{...order.production,issue:''}}));core.normalizeState(st);const unchanged=await renderResult(st);issuesUI(0);unchanged();},{ui:true});
  for(const options of [{link:''},{memberId:''},{link:'',owner:''},{initialized:false,owner:''}])await scenario('missing personal result profile retains financial gate '+JSON.stringify(options),async()=>{const st=fixture(options),unchanged=await renderResult(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-kpi').length,0);assert.equal(byClass('result-attention').length,0);assert.equal(byClass('result-pipeline').length,0);unchanged();},{ui:true});
  await scenario('admin team keeps all order issues and no personal subset diagnostic',async()=>{const st=fixture({role:'admin'}),unchanged=await renderResult(st,{view:'team'});const node=issuesUI(6);await drillOrders(st,node,expected(responsibilities,['active']),'all');unchanged();},{ui:true});
  for(const role of ['seller','reader'])await scenario(role+' remembered team route retains actual personal count and own scope',async()=>{const st=fixture({role}),unchanged=await renderResult(st,{view:'team'});assert.equal(button('Teamets resultat'),undefined);await drillOrders(st,issuesUI(2,'mismatch'),['active-b','active-legacy-a']);unchanged();},{ui:true});
  for(const role of ['production','print','warehouse'])await scenario(role+' Resultat parent remains in operative workspace without result cards',async()=>{const st=fixture({role}),unchanged=await renderResult(st);assert.equal(renderer.toJSON(),null);assert.deepEqual(calls,[]);unchanged();},{ui:true});
  await scenario('report month changes financial context without moving live personal order selection',async()=>{const st=fixture();for(const month of ['2026-10','2026-08','2025-12']){metrics(st,expected(['b','legacy-a']),{month});const unchanged=await renderResult(st,{month});issuesUI(2,'mismatch');unchanged();await unmount();}},{ui:true});
  await scenario('same mounted actual parent rereads member alias and removed link without stale issues',async()=>{const first=fixture(),checks=[await renderResult(first)];issuesUI(2,'mismatch');const next=fixture({link:'a',owner:nameB});next.viewer.id='synthetic-next-session';next.viewer.memberId='synthetic-next-member';next.settings.sellerProfiles[0].memberId='synthetic-next-member';core.normalizeState(next);checks.push(await renderResult(next,{update:true}));issuesUI(2,'mismatch');metrics(next,expected(['a','legacy-b']));const missing=fixture({link:'',owner:''});checks.push(await renderResult(missing,{update:true}));assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-attention').length,0);assert.deepEqual(calls,[]);for(const check of checks)check();},{ui:true});
  for(const [file,bytes] of sourceBytes)assert.deepEqual(readFileSync(file),bytes,'Actual production source remains byte unchanged during test '+file);
  const proof=Object.fromEntries([...sourceBytes].sort(([a],[b])=>a.localeCompare(b)).map(([file,bytes])=>[file,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]));
  console.log('PASS Result order scope: '+cases+' normalized domain/actual parent/React cases ('+(cases-defensiveCases)+' accepted, '+defensiveCases+' rejected contradictory fixture), '+uiCases+' UI cases, '+baselineComparisons+' protected complete-field comparisons, '+completeModeComparisons+' complete profile/team comparisons, '+scopeComparisons+' exact own-order comparisons, '+(compiled.size-1)+' byte-verified production modules, immutable inputs, zero HTTP. Visual/chart/closed-dialog boundaries; no browser, login, integration or staff acceptance.');
  return {cases,uiCases,defensiveCases,baselineComparisons,completeModeComparisons,scopeComparisons,compiledModules:compiled.size-1,httpRequests:http.length,sourceProof:proof};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
