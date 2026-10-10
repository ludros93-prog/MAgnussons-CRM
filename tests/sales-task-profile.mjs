import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Immutable actual pre-change source, captured from main 96936a26105d6434ea59fe6aecc56bb6e6232e4a.
// SHA-256 2dd94e0335f5b0d151d3816df26550bc0e0dc1e5ff5c5136e8d941fe1fc44529. Compile it to compare every non-task metric;
// no rewritten financial formula, synthetic provider, or text-search assertion is used.
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

export function salesMetrics(st:State,month:string,owner:string){
 const year=month.slice(0,4),operationalOwner=resultOperationalOwner(st,owner),matches=(r:{owner:string})=>owner==='all'||!!operationalOwner&&r.owner===operationalOwner;
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
 return {invoices,yearInvoices,known,revenue:invoices.reduce((n,o)=>n+o.invoiceValue!,0),target:(owner==='all'?st.settings.budgets[month]:goals?.revenue)??null,profit:known.length?knownRevenue-knownCost:null,profitTarget:goals?.grossProfit??null,margin:margin(knownRevenue,knownCost),yearRevenue:yearInvoices.reduce((n,o)=>n+o.invoiceValue!,0),yearTarget,yearTargetSource:explicitYear!=null?'annual':yearMonths.length===12?'months':'missing',configuredMonths:yearMonths.length,qualified:qualified.length,qualifiedTarget:goals?.qualified??null,open,pipeline:open.reduce((n,d)=>n+(d.value||0),0),unpriced:open.filter(d=>d.value===null).length,repeat:invoices.filter(o=>st.deals.find(d=>d.id===o.dealId)?.type==='repeat').length,tasks:st.tasks.filter(t=>matches(t)&&!t.done).sort((a,b)=>a.due.localeCompare(b.due)),customers:st.customers.filter(matches),orders:st.orders.filter(matches),meetings:st.meetings.filter(m=>(owner==='all'||(m.ownerProfileId?st.settings.sellerProfilesInitialized&&m.ownerProfileId===owner:!!operationalOwner&&m.owner===operationalOwner))&&m.status==='planned'&&m.date>=day()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),unattributedInvoices,unattributedRevenue:unattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),yearUnattributedInvoices,yearUnattributedRevenue:yearUnattributedInvoices.reduce((sum,o)=>sum+o.invoiceValue!,0),unattributedQualified:unattributedQualified.length};
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

// Production domains, SalesDashboard, and TeamDashboard run unchanged. Only
// visual primitives and the chart surface are controlled observation boundaries.
// Accepted fixtures pass the real profile/task reference validators. Crossed-ID
// cases are separately labelled defensive and explicitly rejected by validation.
export async function verifySalesTaskProfile(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/sales-task-profile-'));
 const compiled=new Set(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Input=host('input'),Progress=host('progress'),Tabs=host('div'),TabsList=host('div'),TabsTrigger=host('button'),Switch=host('input');
export const Table=host('table'),TableBody=host('tbody'),TableCell=host('td'),TableHead=host('th'),TableHeader=host('thead'),TableRow=host('tr'),BusinessField=host('label');
export const SalesTrend=()=>null;
`);
 const formatterSource=readFileSync('components/business-ui.tsx','utf8'),formatterAst=ts.createSourceFile('business-ui.tsx',formatterSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const formatters=formatterAst.statements.filter(statement=>ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&['money','displayDate'].includes(declaration.name.text)));
 assert.equal(formatters.length,2);const formatterTarget=resolve(directory,'formatters.mjs');writeFileSync(formatterTarget,ts.transpileModule(formatters.map(statement=>statement.getText(formatterAst)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText+"\nexport {BusinessField} from './helpers.mjs';\n");
 function compile(file,source){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||['components/sales-dashboard.tsx','components/team-dashboard.tsx'].includes(file));
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(source??readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
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
 const fetchDescriptor=Object.getOwnPropertyDescriptor(globalThis,'fetch'),actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');
 let renderer,calls=[],fetchCalls=[],acceptedCases=0,defensiveCases=0,financialComparisons=0,uiCases=0;
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const content=()=>text(renderer.toJSON()),byClass=name=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props.className?.split(' ').includes(name));
 const taskButtons=()=>byClass('result-next-task'),visibleTasks=()=>taskButtons().map(node=>text(node.findByType('b'))),button=caption=>renderer.root.findAllByType('button').find(node=>text(node)===caption);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null;}}
 async function isolated(label,test,{defensive=false,ui=false}={}){await unmount();calls=[];await test();await unmount();assert.equal(fetchCalls.length,0,'Zero HTTP in '+label);if(defensive)defensiveCases++;else acceptedCases++;if(ui)uiCases++;console.log('PASS Sales task profile '+(defensive?'DEFENSIVE':'accepted')+': '+label);}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{fetchCalls.push(args);throw new Error('Result selection must not perform HTTP');}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),profiles=await import(pathToFileURL(compile('lib/seller-profiles.ts')).href),responsibility=await import(pathToFileURL(compile('lib/task-responsibility.ts')).href);
  const baseline=await import(pathToFileURL(compile('lib/baseline-sales-dashboard.ts',baselineSource)).href),{SalesDashboard}=await import(pathToFileURL(compile('components/sales-dashboard.tsx')).href);
  const a='b5746101-f76b-4ec7-9f44-90d7e9c5a001',b='b5746101-f76b-4ec7-9f44-90d7e9c5a002',unknown='b5746101-f76b-4ec7-9f44-90d7e9c5a099',nameA='Syntetisk ansvarig A',nameB='Syntetisk ansvarig B',today=core.day(),month='2026-09';
  const fixture=({link='a',role='seller',owner=nameA,initialized=true,inactive=false}={})=>{
   const st=core.emptyState();st.viewer={id:'synthetic-session',memberId:'synthetic-member',name:'Samma visningsnamn',email:'synthetic@example.test',role,owner};st.settings.owners=[nameA,nameB];st.settings.sellerProfilesInitialized=initialized;
   st.settings.sellerProfiles=initialized?[{id:a,legacyOwnerName:nameA,displayName:'Samma visningsnamn',memberId:link==='a'?'synthetic-member':'',active:!inactive,linkHistory:[],retirementHistory:[]},{id:b,legacyOwnerName:nameB,displayName:'Samma visningsnamn',memberId:link==='b'?'synthetic-member':'',active:true,linkHistory:[],retirementHistory:[]}]:[];
   st.customers=[core.CustomerSchema.parse({id:'synthetic-customer',name:'Syntetisk kund Alfa',owner:nameA}),core.CustomerSchema.parse({id:'synthetic-customer-b',name:'Syntetisk kund Beta',owner:nameB})];return st;
  };
  const task=(id,profile='',owner=nameA,extra={})=>core.TaskSchema.parse({id,ownerProfileId:profile,customerId:'synthetic-customer',owner,title:'Uppgift '+id,due:today,...extra});
  const work=st=>{st.tasks=[task('own-id',a),task('peer-id',b,nameB),task('legacy-own'),task('legacy-peer','',nameB),task('own-done',a,nameA,{done:true})];return st;};
  function validate(st){profiles.validateSellerProfileReferences(st);responsibility.validateTaskResponsibilityReferences(st);}
  function measured(st,scope=dashboard.personalResultScope(st),mode='personal',{defensive=false}={}){
   if(defensive)assert.throws(()=>validate(st));else validate(st);const before=JSON.stringify(st);freeze(st);const stats=dashboard.salesMetrics(st,month,scope,mode);assert.equal(JSON.stringify(st),before);return stats;
  }
  function selected(st,expected,scope=dashboard.personalResultScope(st),mode='personal',options){assert.deepEqual(measured(st,scope,mode,options).tasks.map(row=>row.id),expected);}
  function scoped(st,scope=dashboard.personalResultScope(st),mode='personal'){validate(st);const before=JSON.stringify(st);freeze(st);const value=dashboard.resultTaskScope(st,scope,mode);assert.equal(JSON.stringify(st),before);return value;}
  async function render(st,{mode='personal',update=false,onTask}={}){
   validate(st);const before=JSON.stringify(st);freeze(st);const record=kind=>(...args)=>calls.push({kind,args});const element=React.createElement(SalesDashboard,{st,mode,month,onMonth:record('month'),onMode:record('mode'),onView:record('view'),onCustomer:record('customer'),onTask:onTask??record('task')});
   await act(async()=>{if(update){assert.ok(renderer);renderer.update(element);}else renderer=create(element);});assert.equal(JSON.stringify(st),before);return ()=>assert.equal(JSON.stringify(st),before,'Render/callbacks must not mutate CRM or viewer');
  }
  async function click(caption){const node=button(caption);assert.ok(node,'Visible action '+caption);assert.notEqual(node.props.disabled,true);await act(async()=>node.props.onClick());}
  function diagnostic(kind){const panels=byClass('result-next');assert.equal(panels.length,1);assert.equal(panels[0].props['data-profile-diagnostic']||'',kind);const notices=byClass('result-task-notice');assert.equal(notices.length,kind?1:0);if(kind){assert.equal(notices[0].props.role,'status');assert.equal(notices[0].findAllByType('h3').some(node=>node.props.id===notices[0].props['aria-labelledby']),true);assert.match(text(panels[0]),/synligt urval/i);}}

  await isolated('matching linked profile keeps anchored and blank-ID legacy tasks',async()=>{const st=work(fixture());selected(st,['own-id','legacy-own']);assert.deepEqual(scoped(st),{team:false,profileId:a,legacyOwner:nameA,diagnostic:''});});
  await isolated('removed operative alias retains accepted linked-ID historical tasks without blank-ID fallback',async()=>{const st=work(fixture({inactive:true}));st.settings.owners=[nameB];selected(st,['own-id']);assert.equal(scoped(st).diagnostic,'operational-missing');assert.equal(st.settings.sellerProfiles[0].active,false);});
  await isolated('missing account owner does not adopt historical profile alias',async()=>{const st=work(fixture({owner:''}));selected(st,['own-id']);assert.equal(scoped(st).legacyOwner,'');assert.equal(scoped(st).diagnostic,'operational-missing');});
  await isolated('unlisted account owner excludes stale blank-ID tasks',async()=>{const st=work(fixture({owner:'Syntetisk tidigare alias'}));st.tasks.push(task('stale','','Syntetisk tidigare alias'));selected(st,['own-id']);assert.equal(scoped(st).diagnostic,'operational-missing');});
  await isolated('personal member profile A and current account alias B remain distinct',async()=>{const st=work(fixture({owner:nameB}));selected(st,['own-id','legacy-peer']);assert.deepEqual(scoped(st),{team:false,profileId:a,legacyOwner:nameB,diagnostic:'mismatch'});});
  await isolated('default explicit profile A is independent of viewer alias B',async()=>{const st=work(fixture({owner:nameB}));selected(st,['own-id','legacy-own'],a,'profile');assert.deepEqual(scoped(st,a,'profile'),{team:false,profileId:a,legacyOwner:nameA,diagnostic:''});assert.deepEqual(dashboard.salesMetrics(st,month,a).tasks.map(row=>row.id),['own-id','legacy-own']);});
  await isolated('explicit profile B selects B records and never substitutes linked viewer profile A',async()=>{const st=work(fixture());selected(st,['peer-id','legacy-peer'],b,'profile');});
  await isolated('profile-mode all retains every open task once',async()=>{const st=work(fixture({owner:''}));selected(st,['own-id','peer-id','legacy-own','legacy-peer'],'all','profile');assert.deepEqual(scoped(st,'all','profile'),{team:true,profileId:'',legacyOwner:'',diagnostic:''});});
  await isolated('personal mode injected team scope fails closed',async()=>{const st=work(fixture());selected(st,[],'all');assert.equal(scoped(st,'all').team,false);});
  await isolated('personal mode injected foreign known profile fails closed',async()=>{const st=work(fixture());selected(st,[],b);assert.equal(scoped(st,b).profileId,'');assert.equal(scoped(st,b).legacyOwner,'');});
  await isolated('unknown explicit profile and reserved sentinel cannot adopt alias or team work',async()=>{for(const scope of [unknown,'_unassigned','']){const st=work(fixture());selected(st,[],scope,'profile');assert.equal(scoped(st,scope,'profile').profileId,'');assert.equal(scoped(st,scope,'profile').legacyOwner,'');}});
  await isolated('missing member link returns only actual current-alias legacy work and diagnostic',async()=>{const st=work(fixture({link:''}));selected(st,['legacy-own']);assert.equal(scoped(st).diagnostic,'missing');assert.equal(scoped(st).profileId,'');});
  await isolated('absent member ID cannot infer linkage from display name, email or operative owner',async()=>{const st=work(fixture());delete st.viewer.memberId;selected(st,['legacy-own']);assert.equal(scoped(st).diagnostic,'missing');});
  await isolated('missing link and owner return no personal work',async()=>{const st=work(fixture({link:'',owner:''}));selected(st,[]);assert.equal(scoped(st).diagnostic,'missing');});
  await isolated('pre-initialization personal scope uses only the accepted real operative alias',async()=>{const st=fixture({initialized:false});st.tasks=[task('legacy-own'),task('legacy-peer','',nameB)];selected(st,['legacy-own']);assert.deepEqual(scoped(st),{team:false,profileId:'',legacyOwner:nameA,diagnostic:''});});
  await isolated('pre-initialization explicit alias remains independent of current viewer',async()=>{const st=fixture({initialized:false});st.tasks=[task('legacy-own'),task('legacy-peer','',nameB)];selected(st,['legacy-peer'],nameB,'profile');});
  await isolated('pre-initialization removed or absent owner never guesses a person',async()=>{for(const owner of ['',nameA,'Syntetisk tidigare alias']){const st=fixture({initialized:false,owner});st.settings.owners=[nameB];st.tasks=[task('legacy-own'),task('legacy-peer','',nameB)];selected(st,[]);assert.equal(scoped(st).legacyOwner,'');}});
  await isolated('inactive linked profile keeps accepted ID history without relinking or activation',async()=>{const st=work(fixture({inactive:true,owner:''}));selected(st,['own-id']);selected(st,['own-id','legacy-own'],a,'profile');assert.equal(st.settings.sellerProfiles[0].active,false);});
  for(const role of ['seller','reader','admin'])await isolated(role+' personal identity never inherits team or another profile from role',async()=>{const st=work(fixture({role,owner:nameB}));selected(st,['own-id','legacy-peer']);selected(st,['peer-id','legacy-peer'],b,'profile');});
  await isolated('no viewer keeps personal selection empty while explicit profile reading remains available',async()=>{const st=work(fixture());delete st.viewer;selected(st,[]);selected(st,['own-id','legacy-own'],a,'profile');});
  await isolated('default team rows keep exact profile late counts independent of viewer mismatch',async()=>{const st=work(fixture({owner:nameB}));st.tasks=st.tasks.map(row=>({...row,due:core.plusDays(today,-1)}));validate(st);freeze(st);const rows=dashboard.teamSalesRows(st,month);assert.equal(rows.find(row=>row.id===a).late,2);assert.equal(rows.find(row=>row.id===b).late,2);selected(st,['own-id','legacy-peer']);});
  await isolated('open selection excludes done work and keeps original due ordering without input sort',async()=>{const st=work(fixture());st.tasks=[task('future',a,nameA,{due:core.plusDays(today,2)}),task('done',a,nameA,{done:true,due:core.plusDays(today,-9)}),task('yesterday',a,nameA,{due:core.plusDays(today,-1)}),task('oldest'),task('today',a)];st.tasks[3].due=core.plusDays(today,-3);selected(st,['oldest','yesterday','today','future']);});

  await isolated('crossed peer ID with own alias is rejected by validation and never counted as own anchored work',async()=>{const st=work(fixture());st.tasks.push(task('crossed-peer',b,nameA));selected(st,['own-id','legacy-own'],a,'personal',{defensive:true});},{defensive:true});
  await isolated('crossed own ID with peer alias is rejected by validation but defensive reader keeps explicit own ID',async()=>{const st=work(fixture());st.tasks.push(task('crossed-own',a,nameB));selected(st,['own-id','legacy-own','crossed-own'],a,'personal',{defensive:true});},{defensive:true});
  await isolated('unknown anchored ID with own alias is rejected and cannot fall back to legacy ownership',async()=>{const st=work(fixture());st.tasks.push(task('unknown-id',unknown));selected(st,['own-id','legacy-own'],a,'personal',{defensive:true});},{defensive:true});
  await isolated('pre-initialization nonempty anchored IDs are rejected and cannot enter alias-only selection',async()=>{const st=fixture({initialized:false});st.tasks=[task('legacy-own'),task('uninitialized-id',a)];selected(st,['legacy-own'],nameA,'personal',{defensive:true});},{defensive:true});

  // Compare every returned key except the intentionally changed task selection.
  // The complete captured baseline function also checks untouched helpers,
  // financial attribution, yearly trends and profile rows against real code.
  const invoice=(id,owner,profile,value,cost,date,extra={})=>core.OrderSchema.parse({id,customerId:'synthetic-customer',dealId:'synthetic-deal-'+id,owner,stage:'handover',proofRequired:false,proofApproved:false,supplierConfirmed:false,deliveryDate:'',deliveredDate:'',invoiceDate:date,invoiceRef:'Syntetisk referens '+id,invoiceValue:value,actualCost:cost,notes:'',invoiceOwner:owner,invoiceOwnerId:profile,invoiceOwnerSource:'recorded',...extra});
  function financialFixture(variant){
   const st=work(fixture({owner:variant===1?'':variant===2?nameB:nameA,initialized:variant!==5}));if(variant===5)st.tasks=st.tasks.filter(row=>!row.ownerProfileId);
   const idA=st.settings.sellerProfilesInitialized?a:'',idB=st.settings.sellerProfilesInitialized?b:'';
   st.orders=[invoice('a-known',nameA,idA,120.5,60.25,month+'-03'),invoice('a-unknown',nameA,idA,50.75,null,month+'-04'),invoice('a-year',nameA,idA,300,100,'2026-08-04'),invoice('b-known',nameB,idB,1000,700,month+'-05'),invoice('not-invoiced',nameA,idA,null,null,month+'-01'),invoice('other-year',nameA,idA,3000,0,'2025-12-31'),invoice('zero',nameA,idA,0,0,month+'-06'),invoice('unattributed',nameA,'',25,null,month+'-07',{invoiceOwner:'',invoiceOwnerSource:'legacy_fallback'})];
   st.deals=[core.DealSchema.parse({id:'synthetic-deal-a-known',customerId:'synthetic-customer',owner:nameA,title:'Syntetiskt återköp',stage:'won',type:'repeat',value:600}),core.DealSchema.parse({id:'synthetic-open',customerId:'synthetic-customer',owner:nameA,title:'Syntetiskt öppet behov',stage:'identified',value:500}),core.DealSchema.parse({id:'synthetic-unpriced',customerId:'synthetic-customer',owner:nameA,title:'Syntetiskt oprissatt behov',stage:'quoted',value:null}),core.DealSchema.parse({id:'synthetic-other',customerId:'synthetic-customer-b',owner:nameB,title:'Syntetiskt annat behov',stage:'needs',value:900})];
   st.customers.push(core.CustomerSchema.parse({id:'synthetic-qualified',name:'Syntetisk första kvalificering',owner:nameB,prospecting:{qualifiedOwner:nameA,qualifiedOwnerId:idA,qualifiedAt:'2026-08-31T22:30:00.000Z'}}),core.CustomerSchema.parse({id:'synthetic-unattributed',name:'Syntetiskt ej tilldelat underlag',owner:nameB,prospecting:{qualifiedOwner:'',qualifiedOwnerId:'',qualifiedAt:'2026-09-10T12:00:00.000Z'}}),core.CustomerSchema.parse({id:'synthetic-other-month',name:'Syntetisk annan månad',owner:nameA,prospecting:{qualifiedOwner:nameA,qualifiedOwnerId:idA,qualifiedAt:'2026-07-31T22:30:00.000Z'}}));
   st.meetings=[core.MeetingSchema.parse({id:'synthetic-meeting-a',customerId:'synthetic-customer',title:'Syntetiskt möte A',owner:nameA,ownerProfileId:idA,date:today,time:'10:00',duration:30}),core.MeetingSchema.parse({id:'synthetic-meeting-b',customerId:'synthetic-customer-b',title:'Syntetiskt möte B',owner:nameB,ownerProfileId:idB,date:core.plusDays(today,1),time:'11:00',duration:30})];
   st.settings.budgets[month]=10000;st.settings.annualBudgets['2026']=200000;
   const goals=variant===5?'sellerGoals':'sellerGoalsById',annual=variant===5?'sellerAnnualGoals':'sellerAnnualGoalsById',keyA=idA||nameA,keyB=idB||nameB;
   st.settings[goals][keyA]={[month]:{revenue:200,grossProfit:80,qualified:3}};st.settings[goals][keyB]={[month]:{revenue:null,grossProfit:null,qualified:null}};st.settings[annual][keyA]={'2026':1000};
   if(variant===0)st.orders=[];
   if(variant===1)st.orders=st.orders.map(row=>({...row,actualCost:null}));
   if(variant===2){st.settings[annual][keyA]['2026']=0;st.settings[goals][keyA][month].revenue=0;}
   if(variant===3){delete st.settings[annual][keyA]['2026'];st.settings[goals][keyA]=Object.fromEntries(Array.from({length:12},(_,i)=>['2026-'+String(i+1).padStart(2,'0'),{revenue:100,grossProfit:null,qualified:null}]));}
   if(variant===4){delete st.settings[annual][keyA]['2026'];st.orders=st.orders.map(row=>({...row,actualCost:row.invoiceValue===null?null:row.invoiceValue*2}));}
   return st;
  }
  const omit=(object,...keys)=>Object.fromEntries(Object.entries(object).filter(([key])=>!keys.includes(key)));
  for(let variant=0;variant<6;variant++)await isolated('every non-task metric equals actual baseline for financial fixture '+variant,async()=>{
   const st=financialFixture(variant);validate(st);freeze(st);const before=JSON.stringify(st),scopes=st.settings.sellerProfilesInitialized?[a,b,'all','','unknown']:[nameA,nameB,'all','','unknown'];
   for(const reportMonth of ['2026-09','2026-08','2025-12'])for(const scope of scopes){const old=baseline.salesMetrics(st,reportMonth,scope);for(const activityMode of ['profile','personal']){const current=dashboard.salesMetrics(st,reportMonth,scope,activityMode);assert.deepEqual(omit(current,'tasks'),omit(old,'tasks'));financialComparisons++;}assert.deepEqual(dashboard.salesYearSeries(st,reportMonth.slice(0,4),scope),baseline.salesYearSeries(st,reportMonth.slice(0,4),scope));}
   assert.deepEqual(dashboard.teamSalesRows(st,month).map(row=>omit(row,'late')),baseline.teamSalesRows(st,month).map(row=>omit(row,'late')));assert.equal(JSON.stringify(st),before);
   if(variant===1){const stats=dashboard.salesMetrics(st,month,a,'personal');assert.equal(stats.margin,null);assert.equal(stats.profit,null);assert.equal(stats.known.length,0);}
   if(variant===4)assert.equal(dashboard.salesMetrics(st,month,a,'personal').margin,-100);
  });

  await isolated('actual personal result shows healthy own due work and preserves financial KPI labels',async()=>{const st=work(fixture()),unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift own-id','Uppgift legacy-own']);diagnostic('');assert.match(content(),/Försäljning/);assert.match(content(),/Marginal/);assert.match(content(),/Nya kvalificerade prospects/);assert.match(content(),/Fortnox är inte anslutet/);assert.equal(byClass('result-kpi').length,4);unchanged();},{ui:true});
  await isolated('actual personal result with no operative alias shows accepted own-ID task and incomplete-work warning',async()=>{const st=work(fixture({owner:''})),unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift own-id']);diagnostic('operational-missing');assert.match(content(),/Kundansvar saknas/);assert.equal(!!button('Öppna Konton & roller'),false);assert.match(content(),/administratör/i);unchanged();},{ui:true});
  await isolated('actual mismatch result uses member ID plus current alias legacy tasks while explicit profile rows stay separate',async()=>{const st=work(fixture({owner:nameB})),unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift own-id','Uppgift legacy-peer']);diagnostic('mismatch');assert.match(content(),/Kontokopplingen behöver kontrolleras/);assert.ok(content().includes(nameA));assert.ok(content().includes(nameB));assert.equal(!!button('Öppna Mål & inställningar'),false);unchanged();},{ui:true});
  await isolated('actual removed and unlisted account aliases cannot show stale or historic alias-only tasks',async()=>{for(const owner of [nameA,'Syntetisk tidigare alias']){const st=work(fixture({owner}));st.settings.owners=[nameB];const unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift own-id']);diagnostic('operational-missing');unchanged();await unmount();}},{ui:true});
  await isolated('actual incomplete empty personal result does not imply complete zero activities',async()=>{const st=fixture({owner:''});st.tasks=[task('peer-id',b,nameB)];const unchanged=await render(st);assert.deepEqual(visibleTasks(),[]);diagnostic('operational-missing');assert.match(content(),/Inga aktiviteter visas till idag\. Listan kan vara ofullständig\./);assert.equal(content().includes('Inget försenat eller planerat idag'),false);unchanged();},{ui:true});
  for(const role of ['seller','reader','admin'])await isolated('actual '+role+' missing-profile financial gate remains closed with truthful help',async()=>{const st=work(fixture({role,link:''})),unchanged=await render(st);assert.equal(byClass('personal-unmapped').length,1);assert.equal(byClass('result-next').length,0);assert.equal(byClass('result-kpi').length,0);assert.deepEqual(visibleTasks(),[]);assert.match(content(),/inte kopplat till en egen resultatprofil/);if(role==='admin'){assert.ok(button('Öppna teamets resultat'));await click('Öppna teamets resultat');assert.deepEqual(calls,[{kind:'mode',args:['team']}]);}else{assert.match(content(),/administratör/i);assert.equal(!!button('Öppna teamets resultat'),false);}unchanged();},{ui:true});
  await isolated('actual administrator missing-alias help opens existing accounts only',async()=>{const st=work(fixture({role:'admin',owner:''})),unchanged=await render(st);diagnostic('operational-missing');await click('Öppna Konton & roller');assert.deepEqual(calls,[{kind:'view',args:['accounts',nameA]}]);unchanged();},{ui:true});
  await isolated('actual administrator mismatch help opens existing settings only',async()=>{const st=work(fixture({role:'admin',owner:nameB})),unchanged=await render(st);diagnostic('mismatch');await click('Öppna Mål & inställningar');assert.deepEqual(calls,[{kind:'view',args:['settings',nameA]}]);unchanged();},{ui:true});
  await isolated('actual reader own result retains task observation without account-repair controls or mutation',async()=>{const st=work(fixture({role:'reader',owner:''})),unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift own-id']);diagnostic('operational-missing');assert.equal(!!button('Öppna Konton & roller'),false);await act(async()=>taskButtons()[0].props.onClick());assert.equal(calls.length,1);assert.equal(calls[0].kind,'task');assert.equal(calls[0].args[0],st.tasks[0]);assert.equal(st.tasks[0].done,false);unchanged();},{ui:true});
  await isolated('actual due count, late count, top-three order and onTask object identity follow selected personal tasks',async()=>{const st=fixture({owner:''});st.tasks=[task('future',a,nameA,{due:core.plusDays(today,2)}),task('today',a),task('peer-late',b,nameB,{due:core.plusDays(today,-10)}),task('oldest',a,nameA,{due:core.plusDays(today,-4)}),task('yesterday',a,nameA,{due:core.plusDays(today,-1)}),task('fourth',a,nameA,{due:core.plusDays(today,-2)}),task('done',a,nameA,{due:core.plusDays(today,-12),done:true})];const unchanged=await render(st);assert.deepEqual(visibleTasks(),['Uppgift oldest','Uppgift fourth','Uppgift yesterday']);assert.match(text(byClass('result-next')[0]),/4 aktiviteter att hantera · synligt urval/);assert.match(text(byClass('result-next')[0]),/3 försenade/);for(const node of taskButtons())await act(async()=>node.props.onClick());assert.deepEqual(calls.map(call=>call.args[0].id),['oldest','fourth','yesterday']);for(const call of calls)assert.equal(call.args[0],st.tasks.find(row=>row.id===call.args[0].id));unchanged();},{ui:true});
  await isolated('actual team attention stays aggregate without personal diagnostics and profile rows use their own late work',async()=>{const st=work(fixture({role:'admin',owner:nameB}));st.tasks=st.tasks.map(row=>({...row,due:core.plusDays(today,-1)}));const unchanged=await render(st,{mode:'team'});diagnostic('');assert.match(text(byClass('result-next')[0]),/4 aktiviteter att hantera/);assert.match(text(byClass('result-next')[0]),/4 försenade/);assert.equal(byClass('result-task-notice').length,0);const rows=renderer.root.findAllByType('tbody')[0].findAllByType('tr');assert.deepEqual(rows.map(row=>text(row.findAllByType('td').at(-1))),['2','2']);unchanged();},{ui:true});
  await isolated('actual mounted result re-evaluates member and workspace links without retaining previous tasks',async()=>{const first=work(fixture({owner:''})),checks=[];checks.push(await render(first));assert.deepEqual(visibleTasks(),['Uppgift own-id']);const second=work(fixture({link:'b',owner:''}));second.viewer={...second.viewer,id:'synthetic-new-session',memberId:'synthetic-other-member'};second.settings.sellerProfiles[1].memberId='synthetic-other-member';checks.push(await render(second,{update:true}));assert.deepEqual(visibleTasks(),['Uppgift peer-id']);const unmapped=structuredClone(second);unmapped.settings.sellerProfiles[1].memberId='';checks.push(await render(unmapped,{update:true}));assert.equal(byClass('personal-unmapped').length,1);assert.deepEqual(visibleTasks(),[]);checks.push(await render(structuredClone(first),{update:true}));assert.deepEqual(visibleTasks(),['Uppgift own-id']);assert.deepEqual(calls,[]);for(const check of checks)check();},{ui:true});
  await isolated('actual negative margin and unknown-cost rendering retain baseline KPI and source messages',async()=>{for(const variant of [1,4]){const st=financialFixture(variant),unchanged=await render(st);assert.equal(byClass('result-kpi').length,4);if(variant===1){assert.equal(text(byClass('result-kpi-margin')[0].findByType('strong')),'—');assert.match(content(),/Ofullständigt underlag/);assert.equal(content().includes('0 %'),false);}else assert.equal(text(byClass('result-kpi-margin')[0].findByType('strong')),(-100).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %');assert.match(content(),/Fortnox är inte anslutet/);unchanged();await unmount();}},{ui:true});

  // Extract and execute complete production callback expressions, not copied
  // navigation. Setters/openActivity below only observe the actual boundary.
  const pageSource=readFileSync('app/page.tsx','utf8'),pageAst=ts.createSourceFile('page.tsx',pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),contracts=[];
  function findParent(node){if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(pageAst)==='SalesDashboard'){const value=name=>{const attribute=node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(pageAst)===name),init=attribute?.initializer;assert.ok(init&&ts.isJsxExpression(init)&&init.expression);return init.expression.getText(pageAst);};contracts.push({onView:value('onView'),onTask:value('onTask')});}ts.forEachChild(node,findParent);}findParent(pageAst);assert.equal(contracts.length,1);
  const parentTarget=resolve(directory,'actual-result-parent.mjs');writeFileSync(parentTarget,ts.transpileModule('export function callbacks(st,personalOwner,setOwner,setSearch,setFilter,setView,openActivity){return {onView:('+contracts[0].onView+'),onTask:('+contracts[0].onTask+')};}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);const parent=await import(pathToFileURL(parentTarget).href);
  await isolated('entire actual parent onTask expression passes the exact selected task to existing follow-up entry',async()=>{const st=work(fixture({owner:''})),record=(...args)=>calls.push({kind:'activity',args}),noop=()=>{},callbacks=parent.callbacks(st,dashboard.personalOwner,noop,noop,noop,noop,record),unchanged=await render(st,{onTask:callbacks.onTask});await act(async()=>taskButtons()[0].props.onClick());assert.equal(calls.length,1);assert.equal(calls[0].args[0],st.tasks[0]);unchanged();},{ui:true});
  await isolated('entire actual result-to-Min day parent navigation chooses current account alias instead of historical result alias',async()=>{const st=work(fixture({owner:nameB})),selected={},setter=key=>value=>{selected[key]=value;},callbacks=parent.callbacks(st,dashboard.personalOwner,setter('owner'),setter('search'),setter('filter'),setter('view'),()=>{});validate(st);freeze(st);callbacks.onView('today',dashboard.resultOperationalOwner(st,a));assert.deepEqual(selected,{owner:nameB,search:'',view:'today'});});
  const count=acceptedCases+defensiveCases;console.log('PASS Sales task profile: '+count+' cases ('+acceptedCases+' accepted-reference, '+defensiveCases+' defensive), '+uiCases+' actual React/parent UI cases; '+financialComparisons+' exact non-task baseline metric comparisons; immutable input, zero HTTP. Synthetic fixtures/visual observations; no browser, account, integration or staff acceptance claimed.');return {cases:count,acceptedCases,defensiveCases,uiCases,financialComparisons,httpRequests:fetchCalls.length};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of [['fetch',fetchDescriptor],['IS_REACT_ACT_ENVIRONMENT',actDescriptor]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
