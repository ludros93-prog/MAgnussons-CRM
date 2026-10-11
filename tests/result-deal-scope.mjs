import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
import {dealScopeFixture} from './deal-scope.mjs';

// Actual immutable main before CRM98, including the previously corrected task
// selector. Compare EVERY returned field except the three intentional personal
// live-pipeline fields. Explicit-profile/team results retain the whole baseline.
// Main da36abb16b71e023ceb9df135d6c4f993e8eee2b; SHA-256 9229f33ed9b852e6aba0e9f767b05cabfb767ba81eee499964dc71d92f3cc681.
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
 const taskScope=resultTaskScope(st,owner,activityMode),matchesTask=(t:State['tasks'][number])=>taskScope.team||(t.ownerProfileId?!!taskScope.profileId&&t.ownerProfileId===taskScope.profileId:!!taskScope.legacyOwner&&t.owner===taskScope.legacyOwner);
 const invoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(month+'-'));
 const yearInvoices=st.orders.filter(o=>invoiceInScope(st,o,owner)&&o.invoiceValue!==null&&o.invoiceDate.startsWith(year+'-'));
 const known=invoices.filter(o=>o.actualCost!==null),knownRevenue=known.reduce((n,o)=>n+o.invoiceValue!,0),knownCost=known.reduce((n,o)=>n+o.actualCost!,0);
 const open=st.deals.filter(d=>matches(d)&&isOpen(d)),goals=owner==='all'?undefined:sellerGoals(st,owner)?.[month];
 const yearMonths=Object.entries(sellerGoals(st,owner)||{}).filter(([date,g])=>date.startsWith(year+'-')&&g.revenue!==null);
 const explicitYear=owner==='all'?st.settings.annualBudgets[year]:sellerAnnualGoals(st,owner)?.[year];
 const yearTarget=explicitYear??(owner!=='all'&&yearMonths.length===12?yearMonths.reduce((n,[,g])=>n+g.revenue!,0):null);
 const unattributedInvoices=st.settings.sellerProfilesInitialized?invoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const yearUnattributedInvoices=st.settings.sellerProfilesInitialized?yearInvoices.filter(o=>!o.invoiceOwnerId||!sellerProfileById(st.settings,o.invoiceOwnerId)):[];
 const qualified=st.customers.filter(c=>qualificationInScope(st,c,owner)&&swedishMonth(c.prospecting.qualifiedAt)===month);
 const unattributedQualified=st.settings.sellerProfilesInitialized?qualified.filter(c=>!c.prospecting.qualifiedOwnerId||!sellerProfileById(st.settings,c.prospecting.qualifiedOwnerId)):[];
 return {invoices,yearInvoices,known,revenue:invoices.reduce((n,o)=>n+o.invoiceValue!,0),target:(owner==='all'?st.settings.budgets[month]:goals?.revenue)??null,profit:known.length?knownRevenue-knownCost:null,profitTarget:goals?.grossProfit??null,margin:margin(knownRevenue,knownCost),yearRevenue:yearInvoices.reduce((n,o)=>n+o.invoiceValue!,0),yearTarget,yearTargetSource:explicitYear!=null?'annual':yearMonths.length===12?'months':'missing',configuredMonths:yearMonths.length,qualified:qualified.length,qualifiedTarget:goals?.qualified??null,open,pipeline:open.reduce((n,d)=>n+(d.value||0),0),unpriced:open.filter(d=>d.value===null).length,repeat:invoices.filter(o=>st.deals.find(d=>d.id===o.dealId)?.type==='repeat').length,tasks:st.tasks.filter(t=>matchesTask(t)&&!t.done).sort((a,b)=>a.due.localeCompare(b.due)),customers:st.customers.filter(matches),orders:st.orders.filter(matches),meetings:st.meetings.filter(m=>(owner==='all'||(m.ownerProfileId?st.settings.sellerProfilesInitialized&&m.ownerProfileId===owner:!!operationalOwner&&m.owner===operationalOwner))&&m.status==='planned'&&m.date>=day()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),unattributedInvoices,unattributedRevenue:unattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),yearUnattributedInvoices,yearUnattributedRevenue:yearUnattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),unattributedQualified:unattributedQualified.length};
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

const profileA='c5746101-f76b-4ec7-9f44-90d7e9c5a001',profileB='c5746101-f76b-4ec7-9f44-90d7e9c5a002';
const nameA='Syntetisk affärsansvarig A',nameB='Syntetisk affärsansvarig B',removedName='Syntetisk borttagen affärsansvarig';
const stages=['identified','contact','needs','solution','costing','quoted','decision'];
const bOpen=stages.map(stage=>'profile-b-'+stage),bValues=[0,200,300,400,500,600,700];
const currentWorkKeys=['open','pipeline','unpriced','orders'];

// All state fixtures pass the actual CRM normalizer and reference validators.
// Financial amounts, dates, contacts and acceptances below are synthetic only.
export function resultDealScopeFixture(core,options={}){
 const st=dealScopeFixture(core,options),initialized=st.settings.sellerProfilesInitialized;
 const task=(id,profile,owner)=>core.TaskSchema.parse({id,title:'Syntetisk resultataktivitet '+id,owner,ownerProfileId:profile,customerId:'synthetic-deal-customer-b',due:'2026-10-20'});
 st.tasks=[...(initialized?[task('synthetic-result-profile-b',profileB,nameB)]:[]),task('synthetic-result-legacy-a','',nameA),task('synthetic-result-legacy-b','',nameB)];
 st.meetings=[core.MeetingSchema.parse({id:'synthetic-result-meeting',customerId:'synthetic-deal-customer-b',title:'Syntetiskt resultatmöte',owner:nameB,ownerProfileId:initialized?profileB:'',date:'2026-10-20',time:'10:00',duration:30})];
 st.settings.budgets['2026-10']=8000;st.settings.annualBudgets['2026']=96000;
 const goals=initialized?'sellerGoalsById':'sellerGoals',annual=initialized?'sellerAnnualGoalsById':'sellerAnnualGoals';
 for(const [id,owner,monthly] of [[profileA,nameA,2000],[profileB,nameB,5000]]){const key=initialized?id:owner;st.settings[goals][key]={'2026-10':{revenue:monthly,grossProfit:monthly/2,qualified:3}};st.settings[annual][key]={'2026':monthly*12};}
 st.customers[1].prospecting={...st.customers[1].prospecting,qualifiedAt:'2026-10-09T10:00:00.000Z',qualifiedOwner:nameB,qualifiedOwnerId:initialized?profileB:''};
 return core.normalizeState(st);
}

// Actual domains, whole SalesDashboard JSX, TeamDashboard, complete parent
// route/props/callback, and the actual Offers selector run. Visual primitives
// and chart surfaces are controlled; no transport or personal login is tested.
export async function verifyResultDealScope(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/result-deal-scope-'));
 const compiled=new Set(),sourceBytes=new Map(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 const remember=file=>{const bytes=readFileSync(file);if(sourceBytes.has(file))assert.deepEqual(bytes,sourceBytes.get(file));else sourceBytes.set(file,bytes);return bytes.toString('utf8');};
 writeFileSync(helpers,`import React from 'react';const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));export const Button=host('button'),Input=host('input'),Progress=host('progress'),Tabs=host('div'),TabsList=host('div'),TabsTrigger=host('button'),Switch=host('input'),Table=host('table'),TableBody=host('tbody'),TableCell=host('td'),TableHead=host('th'),TableHeader=host('thead'),TableRow=host('tr'),BusinessField=host('label');export const SalesTrend=()=>null;`);
 const formatterSource=remember('components/business-ui.tsx'),formatterAST=ts.createSourceFile('components/business-ui.tsx',formatterSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),formatters=formatterAST.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&['money','displayDate'].includes(d.name.text)));
 assert.equal(formatters.length,2);const formatterTarget=resolve(directory,'formatters.mjs');writeFileSync(formatterTarget,ts.transpileModule(formatters.map(n=>n.getText(formatterAST)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText+"\nexport {BusinessField} from './helpers.mjs';\n");
 function compile(file,source){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||['components/sales-dashboard.tsx','components/team-dashboard.tsx'].includes(file));
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(source??remember(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier.startsWith('@/components/ui/')||specifier==='./sales-trend')dependency=helpers;
   else if(specifier==='./business-ui')dependency=formatterTarget;
   else if(specifier==='./team-dashboard')dependency=compile('components/team-dashboard.tsx');
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const original=Object.fromEntries(['fetch','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let renderer,calls=[],http=[],cases=0,uiCases=0,baselineComparisons=0;
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const byClass=name=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props.className?.split(' ').includes(name));
 const button=caption=>renderer.root.findAllByType('button').find(node=>text(node)===caption);
 // CRM101 adds only personal current customers to the intentional changes;
 // explicit-profile/team and the immutable inline baseline remain exact.
 const omitCurrentWork=(metrics,mode)=>Object.fromEntries(Object.entries(metrics).filter(([key])=>!currentWorkKeys.includes(key)&&(mode!=='personal'||key!=='customers')));
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null}}
 async function scenario(label,run,{ui=false}={}){await unmount();calls=[];await run();await unmount();assert.equal(http.length,0,'No HTTP in '+label);cases++;if(ui)uiCases++;console.log('PASS Result deal scope: '+label);}
 async function click(caption){const node=button(caption);assert.ok(node,'Actual action '+caption);assert.notEqual(node.props.disabled,true);await act(async()=>node.props.onClick());}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{http.push(args);throw Error('Result deal scope must not perform HTTP')}});
  assert.equal(createHash('sha256').update(baselineSource).digest('hex'),'9229f33ed9b852e6aba0e9f767b05cabfb767ba81eee499964dc71d92f3cc681');
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),orderDomain=await import(pathToFileURL(compile('lib/order-scope.ts')).href),customerDomain=await import(pathToFileURL(compile('lib/customer-scope.ts')).href),baseline=await import(pathToFileURL(compile('lib/result-deal-baseline.ts',baselineSource)).href),{SalesDashboard}=await import(pathToFileURL(compile('components/sales-dashboard.tsx')).href);
  assert.deepEqual(core.PIPELINE.map(s=>s.id),stages);
  const source=remember('app/page.tsx'),ast=ts.createSourceFile('app/page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];(function visit(node){nodes.push(node);ts.forEachChild(node,visit)})(ast);
  const variable=name=>{const matches=nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name);assert.equal(matches.length,1,'Unique actual declaration '+name);return matches[0].initializer.getText(ast);};
  const result=nodes.filter(node=>ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)&&node.expression.left.getText(ast)==="['overview','team'].includes(view)"&&node.expression.right.getText(ast).includes('<SalesDashboard '));assert.equal(result.length,1,'Unique whole actual Resultat parent fragment');
  const parentTarget=resolve(directory,'actual-result-parent.mjs'),parentCode=`import React from 'react';import {SalesDashboard} from ${JSON.stringify(pathToFileURL(compile('components/sales-dashboard.tsx')).href)};import {personalOwner,personalResultScope,resultOperationalOwner} from ${JSON.stringify(pathToFileURL(compile('lib/sales-dashboard.ts')).href)};import {dealScope,dealInScope} from ${JSON.stringify(pathToFileURL(compile('lib/deal-scope.ts')).href)};
export function selected(st,owner,search=''){const dealScopeState=(${variable('dealScopeState')}),deals=(${variable('deals')});return deals;}
export function frame(st,selectedView,month,calls){const viewerReady=(${variable('viewerReady')}),department=(${variable('department')}),view=(${variable('view')}),record=kind=>(value)=>calls.push({kind,value}),setOwner=record('owner'),setSearch=record('search'),setFilter=record('filter'),setView=record('view'),setMonth=record('month'),navigate=record('navigate'),showCustomer=record('customer'),openActivity=record('task');return (${result[0].expression.getText(ast)});}`;
  writeFileSync(parentTarget,ts.transpileModule(parentCode,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);const parent=await import(pathToFileURL(parentTarget).href),{money}=await import(pathToFileURL(formatterTarget).href);
  const fixture=options=>resultDealScopeFixture(core,options),own=st=>dashboard.personalOwner(st)||'_unassigned';
  function metrics(st,expectedIds,expectedValue,expectedUnpriced,{scope=dashboard.personalResultScope(st),mode='personal'}={}){
   assert.deepEqual(core.normalizeState(st),st,'Accepted normalized fixture is idempotent');const before=JSON.stringify(st);freeze(st);
   const measured=dashboard.salesMetrics(st,'2026-10',scope,mode),old=baseline.salesMetrics(st,'2026-10',scope,mode);
   assert.deepEqual(measured.open.map(d=>d.id),expectedIds);assert.equal(measured.pipeline,expectedValue);assert.equal(measured.unpriced,expectedUnpriced);
   assert.deepEqual(omitCurrentWork(measured,mode),omitCurrentWork(old,mode),'Every protected metric, including current tasks and historical financial attribution, retains the recorded baseline');baselineComparisons++;
   if(mode==='personal')assert.deepEqual(measured.customers,scope===dashboard.personalResultScope(st)&&scope!=='all'?st.customers.filter(customer=>customerDomain.customerInScope(customer,customerDomain.customerScope(st,own(st)))):[],'CRM101 personal current customers match established Mina kunder, separately from deal and financial attribution');
   if(mode==='personal')assert.deepEqual(measured.orders,scope===dashboard.personalResultScope(st)&&scope!=='all'?st.orders.filter(order=>orderDomain.orderInScope(order,orderDomain.orderScope(st,own(st)))):[],'Personal orders match the established Mina order selection, independently of financial attribution');
   if(mode==='profile')assert.deepEqual(measured,old,'Every explicit-profile/team key retains exact baseline');
   for(const month of ['2026-10','2026-08','2025-12']){assert.deepEqual(dashboard.salesYearSeries(st,month.slice(0,4),scope),baseline.salesYearSeries(st,month.slice(0,4),scope));assert.deepEqual(dashboard.teamSalesRows(st,month),baseline.teamSalesRows(st,month));}
   assert.equal(JSON.stringify(st),before);return measured;
  }
  async function render(st,{view='overview',update=false}={}){const before=JSON.stringify(st);freeze(st);await act(async()=>{const tree=parent.frame(st,view,'2026-10',calls);if(update){assert.ok(renderer);renderer.update(tree)}else renderer=create(tree)});assert.equal(JSON.stringify(st),before);return()=>assert.equal(JSON.stringify(st),before,'Actual callbacks leave CRM/viewer unchanged');}
  function pipelineUI(expectedIds,value,unpriced,diagnostic='',values=bValues){
   const panels=byClass('result-pipeline');assert.equal(panels.length,1);const panel=panels[0];assert.equal(panel.props['data-profile-diagnostic']||'',diagnostic);
   assert.equal(text(panel.findByType('h2')),money(value)+' i offertvärde');const heading=panel.findAllByProps({className:'result-panel-heading'})[0];assert.equal(text(heading.findByType('p')),expectedIds.length+' pågående affärer'+(unpriced?' · '+unpriced+' saknar värde':'')+(diagnostic?' · synligt urval':''));
   const columns=panel.findByProps({className:'result-stage-grid'}).findAllByType('button');assert.equal(columns.length,7);
   for(const [index,column] of columns.entries()){const count=expectedIds.filter(id=>id==='profile-b-'+stages[index]||(stages[index]==='identified'&&['profile-a','legacy-a','legacy-b','sentinel','removed-alias'].includes(id))).length;assert.equal(text(column.findByType('b')),String(count));assert.equal(column.findByType('progress').props['aria-label'],core.PIPELINE[index].label+': '+count+' affärer');assert.equal(column.findByType('progress').props.value,expectedIds.length?count/expectedIds.length*100:0);assert.equal(text(column.findByType('small')),money(values[index]));}
   const statuses=panel.findAll(node=>typeof node.type==='string'&&node.props.role==='status');assert.equal(statuses.length,diagnostic?1:0);if(diagnostic){assert.match(text(statuses[0]),/värde, antal och steg/);assert.match(text(statuses[0]),/konto- och profilkopplingen/);}assert.match(text(panel),/inte fakturerad försäljning/);
  }

  await scenario('accepted linked B and current A have exact own seven stages plus older A, not former B alias',async()=>{const st=fixture(),stats=metrics(st,[...bOpen,'legacy-a'],2850,1);assert.deepEqual(stats.open,parent.selected(st,own(st)).filter(core.isOpen));assert.equal(stats.revenue,900);assert.equal(stats.profit,880);assert.equal(stats.target,5000);assert.equal(stats.yearTarget,60000);assert.equal(stats.qualified,1);assert.equal(stats.tasks.some(t=>t.id==='synthetic-result-legacy-a'),true);});
  await scenario('matching B retains B anchors and B legacy without duplicate display-name borrowing',async()=>{const st=fixture({owner:nameB});metrics(st,[...bOpen,'legacy-b'],3050,1);});
  await scenario('exact member A and operative B never borrow identically named B profile',async()=>{metrics(fixture({link:'a',owner:nameB}),['profile-a','legacy-b'],550,0);});
  for(const [label,options] of [['empty alias',{owner:''}],['removed alias',{owner:removedName}],['alias removed from roster',{owners:[nameB]}]])await scenario(label+' retains exact B and excludes literal unassigned and stale aliases',async()=>{metrics(fixture(options),bOpen,2700,1);});
  await scenario('retired historical B alias retains exact member-linked current deals',async()=>{metrics(fixture({owners:[nameA]}),[...bOpen,'legacy-a'],2850,1);});
  await scenario('inactive exact linked B retains its accepted history without activation',async()=>{const st=fixture({inactive:true,owner:'',owners:[nameA]});metrics(st,bOpen,2700,1);assert.equal(st.settings.sellerProfiles[1].active,false);});
  for(const options of [{link:''},{memberId:''}])await scenario('missing immutable member link retains domain legacy A while actual financial gate remains closed',async()=>{const st=fixture(options);metrics(st,['legacy-a'],150,0);await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);assert.equal(byClass('result-kpi').length,0);},{ui:true});
  await scenario('runtime session ID matching a member does not replace absent memberId',async()=>{const st=fixture({memberId:''});st.viewer.id='synthetic-deal-member';metrics(st,['legacy-a'],150,0);await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);},{ui:true});
  await scenario('missing profile and missing operational alias have zero domain pipeline, closed UI gate',async()=>{const st=fixture({link:'',owner:''});metrics(st,[],0,0);await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);},{ui:true});
  for(const injected of ['all',profileA,'_unassigned','unknown-profile'])await scenario('foreign injected personal scope '+injected+' fails closed for three pipeline fields only',async()=>{metrics(fixture(),[],0,0,{scope:injected});});
  for(const [scope,ids,value,unpriced] of [[profileA,['profile-a','legacy-a'],350,0],[profileB,[...bOpen,'legacy-b'],3050,1],['all',['profile-a',...bOpen,'legacy-a','legacy-b','sentinel','removed-alias'],4400,1],['unknown-profile',[],0,0]])await scenario('default explicit/profile '+scope+' preserves complete prior metrics even in crossed account',async()=>{const st=fixture();const stats=metrics(st,ids,value,unpriced,{scope,mode:'profile'});assert.deepEqual(dashboard.salesMetrics(st,'2026-10',scope),stats);});
  await scenario('pre-initialization valid alias retains legacy selection and no invented profile diagnostic',async()=>{const st=fixture({initialized:false});metrics(st,['legacy-a'],150,0);await render(st);pipelineUI(['legacy-a'],150,0,'',[150,0,0,0,0,0,0]);},{ui:true});
  await scenario('pre-initialization no alias fails closed and keeps existing unmapped gate',async()=>{const st=fixture({initialized:false,owner:''});metrics(st,[],0,0);await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);},{ui:true});
  await scenario('accepted won paused and lost stay out of live pipeline while invoice history remains',async()=>{const st=fixture(),stats=metrics(st,[...bOpen,'legacy-a'],2850,1);assert.ok(st.deals.some(d=>d.stage==='won'));assert.ok(st.deals.some(d=>d.stage==='paused'));assert.ok(st.deals.some(d=>d.stage==='lost'));assert.ok(stats.open.every(d=>!['won','paused','lost'].includes(d.stage)));assert.equal(stats.invoices.length,1);assert.equal(stats.revenue,900);});
  await scenario('zero price remains known while null stays unpriced across actual stage/value aggregates',async()=>{const st=fixture();st.deals.find(d=>d.id==='legacy-a').value=0;metrics(st,[...bOpen,'legacy-a'],2700,1);await render(st);pipelineUI([...bOpen,'legacy-a'],2700,1,'mismatch',bValues);},{ui:true});
  await scenario('renaming identical profile display names never changes scope, money or immutable attribution',async()=>{const st=fixture();for(const profile of st.settings.sellerProfiles)profile.displayName='Samma ändrade syntetiska visningsnamn';metrics(st,[...bOpen,'legacy-a'],2850,1);});
  for(const role of ['seller','reader','admin'])await scenario('whole '+role+' personal JSX shows exact count, value, all stages and visible-subset warning',async()=>{const st=fixture({role}),unchanged=await render(st);pipelineUI([...bOpen,'legacy-a'],2850,1,'mismatch',[150,...bValues.slice(1)]);assert.equal(byClass('result-kpi').length,4);await click('Öppna affärstavlan');assert.deepEqual(calls,[{kind:'owner',value:nameA},{kind:'search',value:''},{kind:'filter',value:'open'},{kind:'view',value:'deals'}]);assert.deepEqual(parent.selected(st,calls[0].value).filter(core.isOpen).map(d=>d.id),[...bOpen,'legacy-a']);unchanged();},{ui:true});
  await scenario('matching actual personal result has no incomplete warning and each stage click uses same destination',async()=>{const st=fixture({owner:nameB}),unchanged=await render(st);pipelineUI([...bOpen,'legacy-b'],3050,1,'',[350,...bValues.slice(1)]);const columns=byClass('result-stage-grid')[0].findAllByType('button');for(const column of columns){calls.length=0;await act(async()=>column.props.onClick());assert.deepEqual(calls,[{kind:'owner',value:nameB},{kind:'search',value:''},{kind:'filter',value:'open'},{kind:'view',value:'deals'}]);}unchanged();},{ui:true});
  for(const [options,diagnostic,caption,destination] of [[{role:'admin'},'mismatch','Öppna Mål & inställningar','settings'],[{role:'admin',owner:''},'operational-missing','Öppna Konton & roller','accounts']])await scenario('actual administrator '+diagnostic+' help follows existing route without changing identity',async()=>{const st=fixture(options),unchanged=await render(st);assert.equal(byClass('result-pipeline')[0].props['data-profile-diagnostic'],diagnostic);await click(caption);assert.deepEqual(calls,[{kind:'owner',value:nameB},{kind:'search',value:''},{kind:'view',value:destination}]);unchanged();},{ui:true});
  for(const role of ['seller','reader','admin'])await scenario(role+' missing-link gate keeps pipeline hidden and help role-limited',async()=>{const st=fixture({role,link:''}),unchanged=await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);if(role==='admin'){await click('Resultatprofiler & mål');assert.deepEqual(calls,[{kind:'owner',value:'_unassigned'},{kind:'search',value:''},{kind:'view',value:'settings'}]);}else{assert.equal(button('Resultatprofiler & mål'),undefined);assert.equal(button('Öppna teamets resultat'),undefined);}unchanged();},{ui:true});
  await scenario('actual administrator team result remains complete and no personal subset diagnostic',async()=>{const st=fixture({role:'admin'}),unchanged=await render(st,{view:'team'});pipelineUI(['profile-a',...bOpen,'legacy-a','legacy-b','sentinel','removed-alias'],4400,1,'',[1700,...bValues.slice(1)]);await click('Öppna affärstavlan');assert.deepEqual(calls,[{kind:'owner',value:'all'},{kind:'search',value:''},{kind:'filter',value:'open'},{kind:'view',value:'deals'}]);unchanged();},{ui:true});
  for(const role of ['seller','reader'])await scenario('actual '+role+' remembered team route keeps personal mode and own pipeline',async()=>{const st=fixture({role}),unchanged=await render(st,{view:'team'});pipelineUI([...bOpen,'legacy-a'],2850,1,'mismatch',[150,...bValues.slice(1)]);assert.equal(button('Teamets resultat'),undefined);unchanged();},{ui:true});
  for(const role of ['production','print','warehouse'])await scenario('actual '+role+' parent remembered Resultat routes to operational workspace',async()=>{const st=fixture({role}),unchanged=await render(st);assert.equal(renderer.toJSON(),null);assert.deepEqual(calls,[]);unchanged();},{ui:true});
  await scenario('mounted actual result re-reads current member, alias and missing link without stale previous pipeline',async()=>{const a=fixture(),checks=[await render(a)];pipelineUI([...bOpen,'legacy-a'],2850,1,'mismatch',[150,...bValues.slice(1)]);const b=fixture({link:'a',owner:nameB});b.viewer.id='synthetic-other-session';b.viewer.memberId='synthetic-other-member';b.settings.sellerProfiles[0].memberId='synthetic-other-member';checks.push(await render(b,{update:true}));pipelineUI(['profile-a','legacy-b'],550,0,'mismatch',[550,0,0,0,0,0,0]);const unmapped=fixture({link:'',owner:''});checks.push(await render(unmapped,{update:true}));assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-pipeline').length,0);checks.push(await render(structuredClone(a),{update:true}));pipelineUI([...bOpen,'legacy-a'],2850,1,'mismatch',[150,...bValues.slice(1)]);assert.deepEqual(calls,[]);for(const check of checks)check();},{ui:true});
  for(const [file,bytes] of sourceBytes)assert.deepEqual(readFileSync(file),bytes,'Production source remains byte unchanged '+file);
  const proof=Object.fromEntries([...sourceBytes].sort(([a],[b])=>a.localeCompare(b)).map(([file,bytes])=>[file,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]));
  console.log('PASS Result deal scope: '+cases+' accepted normalized domain/actual parent/React cases, '+uiCases+' UI cases, '+baselineComparisons+' complete protected baseline comparisons, '+(compiled.size-1)+' byte-verified production modules, immutable inputs, zero HTTP. Controlled visuals/chart; no browser, login, integration or staff acceptance.');
  return {cases,uiCases,baselineComparisons,compiledModules:compiled.size-1,httpRequests:http.length,sourceProof:proof};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
