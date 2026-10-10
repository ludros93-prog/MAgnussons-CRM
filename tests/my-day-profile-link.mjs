import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Render the actual MyDay component and its actual CRM/profile/filter domains.
// Visual primitives, unrelated closed dialogs, and the already-loaded private
// draft provider are synthetic boundaries. No account, browser, server or
// personal acceptance is inferred from this suite; no HTTP write is allowed.
export async function verifyMyDayProfileLink(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/my-day-profile-'));
 const compiled=new Set(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs'));
 const helpers=resolve(directory,'helpers.mjs');
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Progress=host('progress');
export const useDrafts=()=>({ready:true,records:[],archive:async()=>{throw new Error('Unexpected private draft write')}});
export const DraftStatus=()=>null,PrivateDraftCopyEntry=()=>null,ReceiptQueue=()=>null,ReceiptDraftPreview=()=>null,ArticleDraftPreview=()=>null,YearwheelResponsibilityDraftPreview=()=>null,YearNeedDraftPreview=()=>null,CompanyEventDraftPreview=()=>null,TaskResponsibility=()=>null,TaskResponsibilityHistory=()=>null,MeetingResponsibility=()=>null;
`);
 // Preserve the actual shared display formatters without loading their unrelated
 // form primitives. No MyDay statement or profile/filter implementation changes.
 const formatterSource=readFileSync('components/business-ui.tsx','utf8'),formatterAst=ts.createSourceFile('business-ui.tsx',formatterSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const formatters=formatterAst.statements.filter(statement=>ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&['money','displayDate'].includes(declaration.name.text)));
 assert.equal(formatters.length,2);writeFileSync(resolve(directory,'formatters.mjs'),ts.transpileModule(formatters.map(statement=>statement.getText(formatterAst)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||file==='components/my-day.tsx');
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(file==='components/my-day.tsx'&&specifier==='./business-ui')dependency=resolve(directory,'formatters.mjs');
   else if(specifier.startsWith('@/components/')||file==='components/my-day.tsx'&&specifier.startsWith('./'))dependency=helpers;
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 let renderer,calls=[],fetchCalls=[];
 const fetchDescriptor=Object.getOwnPropertyDescriptor(globalThis,'fetch'),actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');
 const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const ids=()=>renderer.root.findAll(node=>node.type==='div'&&node.props['data-task-id']).map(node=>node.props['data-task-id']);
 const byClass=name=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props.className?.split(' ').includes(name));
 const content=()=>text(renderer.toJSON());
 const diagnostic=()=>renderer.root.findAll(node=>node.type==='section'&&node.props['data-profile-diagnostic']);
 const button=label=>renderer.root.findAllByType('button').find(node=>text(node)===label);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null;}}
 async function click(label){const found=button(label);assert.ok(found,'Expected visible action '+label);assert.ok(!found.props.disabled);await act(async()=>found.props.onClick());}
 let count=0;
 async function isolated(label,test){await unmount();calls=[];await test();await unmount();assert.equal(fetchCalls.length,0,'No HTTP read or write in '+label);count++;console.log('PASS MyDay profile link: '+label);}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{fetchCalls.push(args);throw new Error('MyDay diagnostic must not perform HTTP');}});
  const {MyDay}=await import(pathToFileURL(compile('components/my-day.tsx')).href),core=await import(pathToFileURL(compile('lib/crm.ts')).href);
  const dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),a='b5746101-f76b-4ec7-9f44-90d7e9c5a001',b='b5746101-f76b-4ec7-9f44-90d7e9c5a002',nameA='Syntetisk ansvarig A',nameB='Syntetisk ansvarig B',today=core.day();
  function fixture({link='',role='seller',initialized=true,inactive=false,owner=nameA}={}){
   const st=core.emptyState();st.version=21;st.viewer={id:'synthetic-viewer',memberId:'synthetic-member',name:'Syntetisk visningsperson',role,owner};
   st.settings.owners=[nameA,nameB];st.settings.sellerProfilesInitialized=initialized;
   st.settings.sellerProfiles=initialized?[{id:a,legacyOwnerName:nameA,displayName:'Samma visningsnamn',memberId:link==='a'?'synthetic-member':'',active:!inactive,linkHistory:[],retirementHistory:[]},{id:b,legacyOwnerName:nameB,displayName:'Samma visningsnamn',memberId:link==='b'?'synthetic-member':'',active:true,linkHistory:[],retirementHistory:[]}]:[];
   st.customers=[core.CustomerSchema.parse({id:'synthetic-customer',name:'Syntetisk kund',owner:nameA,status:'closed'})];return st;
  }
  const task=(id,profile='',owner=nameA,extra={})=>core.TaskSchema.parse({id,ownerProfileId:profile,customerId:'synthetic-customer',owner,title:'Uppgift '+id,due:today,...extra});
  const meeting=(id,profile='',owner=nameA)=>core.MeetingSchema.parse({id,ownerProfileId:profile,customerId:'synthetic-customer',owner,title:'Möte '+id,date:today,time:'10:30',duration:30});
  async function render(st,owner,space='synthetic',update=false){const before=JSON.stringify(st);freeze(st);const record=kind=>(...args)=>calls.push({kind,args});const component=React.createElement(MyDay,{st,space,owner,busy:false,save:record('save'),saveResponsibility:record('saveResponsibility'),refreshResponsibility:async()=>st,onOwnerChange:record('owner'),onCustomer:record('customer'),onTask:record('task'),onCreate:record('create'),onOrder:record('order'),onProductionOrder:record('productionOrder'),onMeeting:record('meeting'),onReceipt:record('receipt'),onView:record('view'),onDraft:record('draft')});await act(async()=>{if(update){assert.ok(renderer,'Rerender requires the same mounted component');renderer.update(component);}else renderer=create(component);});assert.equal(JSON.stringify(st),before,'Rendering must leave all input bytes unchanged');return ()=>assert.equal(JSON.stringify(st),before,'Callbacks must leave all input bytes unchanged');}
  const mount=(st,owner=st.viewer.owner)=>render(st,owner),update=(st,owner,space='synthetic')=>render(st,owner,space,true);
  function diagnosed(kind){assert.equal(diagnostic().length,1,'Expected one visible top profile diagnostic');assert.equal(diagnostic()[0].props['data-profile-diagnostic'],kind);assert.equal(diagnostic()[0].props.role,'status');assert.ok(diagnostic()[0].findAllByType('h2').some(heading=>heading.props.id===diagnostic()[0].props['aria-labelledby']));const firstSections=renderer.root.findAllByType('section');assert.equal(firstSections[0],diagnostic()[0],'Profile diagnostic must appear before the next action');}
  function truthfulEmpty(){assert.ok(!text(byClass('day-focus')[0]).includes('Inga aktiviteter planerade till idag'));assert.ok(!text(byClass('day-task-panel')[0]).includes('Inget planerat till idag'));assert.ok(!text(byClass('day-meetings')[0]).includes('Inga planerade CRM-möten de närmaste sju dagarna.'));}

  await isolated('missing member link cannot turn name-matched stable-ID work into a reassuring empty day',async()=>{
   const st=fixture();st.tasks=[task('id-a',a)];st.meetings=[meeting('id-a',a)];const unchanged=await mount(st);diagnosed('missing');truthfulEmpty();assert.deepEqual(ids(),[]);assert.ok(!content().includes('Möte id-a'));assert.match(text(byClass('day-selection-note')[0]),/synligt urval.*antalen/i);assert.match(byClass('day-work-counts')[0].props['aria-label'],/synligt urval/i);assert.deepEqual(byClass('day-work-counts')[0].findAllByType('b').map(text),['0','0','0']);assert.equal(dashboard.personalResultScope(st),'');unchanged();
  });
  await isolated('legacy tasks and meetings remain actionable while missing stable-ID work stays excluded',async()=>{
   const st=fixture();st.tasks=[task('legacy'),task('id-a',a),task('other-name','',nameB)];st.meetings=[meeting('legacy'),meeting('id-a',a)];const unchanged=await mount(st);diagnosed('missing');assert.deepEqual(ids(),['legacy']);assert.ok(content().includes('Möte legacy'));assert.ok(!content().includes('Möte id-a'));assert.match(text(byClass('day-task-panel')[0]),/synligt urval/i);assert.match(text(byClass('day-meetings')[0]),/synligt urval/i);assert.deepEqual(byClass('day-work-counts')[0].findAllByType('b').map(text),['1','0','0']);const row=renderer.root.find(node=>node.type==='div'&&node.props['data-task-id']==='legacy');await act(async()=>row.findAllByType('button').at(-1).props.onClick());await act(async()=>byClass('day-meetings')[0].findAllByType('button').find(node=>text(node)==='Visa möte').props.onClick());assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]},{kind:'meeting',args:[st.meetings[0]]}]);unchanged();
  });
  await isolated('same display labels do not replace member-ID selection when the actual linked profile disagrees with operational ownership',async()=>{
   const st=fixture({link:'b'});st.tasks=[task('id-a',a),task('id-b',b),task('legacy')];st.meetings=[meeting('id-a',a),meeting('id-b',b),meeting('legacy')];const unchanged=await mount(st);diagnosed('mismatch');assert.equal(dashboard.personalResultScope(st),b);assert.deepEqual(ids(),['id-b','legacy']);assert.ok(content().includes('Möte id-b'));assert.ok(content().includes('Möte legacy'));assert.ok(!content().includes('Möte id-a'));unchanged();
  });
  await isolated('mismatched empty selection is described as incomplete rather than no planned work',async()=>{
   const st=fixture({link:'b'});const unchanged=await mount(st);diagnosed('mismatch');truthfulEmpty();unchanged();
  });
  await isolated('administrator diagnostic opens the existing settings view without saving or changing owner',async()=>{
   const st=fixture({role:'admin'});const unchanged=await mount(st);diagnosed('missing');await click('Öppna Mål & inställningar');assert.deepEqual(calls,[{kind:'view',args:['settings']}]);unchanged();
  });
  await isolated('seller receives administrator guidance without a settings or account-management action',async()=>{
   const st=fixture();const unchanged=await mount(st);diagnosed('missing');assert.match(text(diagnostic()[0]),/administratör/i);assert.equal(diagnostic()[0].findAllByType('button').length,0);assert.equal(button('Öppna Mål & inställningar'),undefined);assert.ok(!calls.length);unchanged();
  });
  await isolated('reader mismatch keeps read-only actions and has no privileged repair shortcut',async()=>{
   const st=fixture({role:'reader',link:'b'});st.tasks=[task('id-b',b)];const unchanged=await mount(st);diagnosed('mismatch');assert.match(text(diagnostic()[0]),/administratör/i);assert.equal(diagnostic()[0].findAllByType('button').length,0);assert.equal(button('Öppna Mål & inställningar'),undefined);assert.equal(button('Planera aktivitet'),undefined);assert.equal(button('Anteckna'),undefined);const row=renderer.root.find(node=>node.type==='div'&&node.props['data-task-id']==='id-b');await act(async()=>row.findAllByType('button').at(-1).props.onClick());assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]}]);unchanged();
  });
  await isolated('correct member link retains own ID and legacy work while excluding another ID despite matching names',async()=>{
   const st=fixture({link:'a'});st.tasks=[task('id-a',a),task('legacy'),task('id-b',b)];st.meetings=[meeting('id-a',a),meeting('id-b',b)];const unchanged=await mount(st);assert.equal(diagnostic().length,0);assert.deepEqual(ids(),['id-a','legacy']);assert.ok(content().includes('Möte id-a'));assert.ok(!content().includes('Möte id-b'));assert.ok(!content().includes('Synligt urval'));unchanged();
  });
  await isolated('a genuine zero-work correctly linked day keeps the ordinary reassuring empty states',async()=>{
   const st=fixture({link:'a'});const unchanged=await mount(st);assert.equal(diagnostic().length,0);assert.match(text(byClass('day-focus')[0]),/Inga aktiviteter planerade till idag/);assert.match(text(byClass('day-task-panel')[0]),/Inget planerat till idag/);assert.match(text(byClass('day-meetings')[0]),/Inga planerade CRM-möten de närmaste sju dagarna/);unchanged();
  });
  await isolated('team scope stays complete and has no personal profile warning even when the admin has no member link',async()=>{
   const st=fixture({role:'admin'});st.tasks=[task('id-a',a),task('id-b',b),task('legacy')];st.meetings=[meeting('id-a',a),meeting('id-b',b)];const unchanged=await mount(st,'all');assert.equal(diagnostic().length,0);assert.deepEqual(ids(),['id-a','id-b','legacy']);assert.ok(content().includes('Möte id-a'));assert.ok(content().includes('Möte id-b'));assert.ok(!content().includes('Synligt urval'));unchanged();
  });
  await isolated('pre-initialization retains the existing name-based day with no invented profile problem',async()=>{
   const st=fixture({initialized:false});st.tasks=[task('legacy'),task('other-name','',nameB)];st.meetings=[meeting('legacy')];const unchanged=await mount(st);assert.equal(diagnostic().length,0);assert.deepEqual(ids(),['legacy']);assert.ok(content().includes('Möte legacy'));unchanged();
  });
  await isolated('an inactive but correctly linked historical profile is not diagnosed or hidden merely for being inactive',async()=>{
   // Defensive display input: inactivity alone cannot replace an explicit
   // member identity. Retirement validation is exercised by separate API tests.
   const st=fixture({link:'a',inactive:true});st.tasks=[task('historical-id',a)];st.meetings=[meeting('historical-id',a)];const unchanged=await mount(st);assert.equal(diagnostic().length,0);assert.equal(dashboard.personalResultScope(st),a);assert.deepEqual(ids(),['historical-id']);assert.ok(content().includes('Möte historical-id'));unchanged();
  });
  await isolated('an invalid selected operational scope uses the existing start screen rather than a false profile diagnosis',async()=>{
   const st=fixture();st.tasks=[task('id-a',a),task('legacy')];const unchanged=await mount(st,nameB);assert.equal(diagnostic().length,0);assert.deepEqual(ids(),[]);assert.match(content(),/Din arbetsdag, på ett ställe/);unchanged();
  });

  // page.tsx intentionally represents a missing operational customer owner as
  // _unassigned. A member-linked historical profile is a separate identity;
  // its alias, matching labels and a team total cannot stand in for that owner.
  const currency=n=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:2}).format(n);
  function salesFixture(st){
   const month=today.slice(0,7);st.settings.budgets[month]=10000;
   st.settings.sellerGoalsById[a]={[month]:{revenue:500,grossProfit:100,qualified:2}};
   st.settings.sellerGoalsById[b]={[month]:{revenue:2000,grossProfit:null,qualified:null}};
   for(const [id,profile,value] of [['own-invoice',a,125],['other-invoice',b,875],['unattributed-invoice','',225]]){
    const deal=core.DealSchema.parse({id:id+'-deal',customerId:'synthetic-customer',owner:nameB,title:'Syntetisk '+id,stage:'won',confirmed:true,value,cost:50});st.deals.push(deal);
    st.orders.push(core.OrderSchema.parse({id,customerId:'synthetic-customer',dealId:deal.id,owner:nameB,invoiceOwner:nameB,invoiceOwnerId:profile,invoiceOwnerSource:'recorded',stage:'delivered',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:today,deliveredDate:today,invoiceDate:month+'-01',invoiceRef:'SYNTHETIC-'+id,invoiceValue:value,actualCost:50,notes:''}));
   }
   return st;
  }
  function workFixture(st){
   // Empty aliases below are explicitly defensive render input. Normal task
   // and meeting schema validation rejects empty operational responsibility.
   const blankTask={...task('blank-legacy'),owner:''},blankMeeting={...meeting('blank-legacy'),owner:''};
   st.tasks=[task('own-profile',a,nameB),task('other-profile',b,nameA),task('profile-alias-legacy','',nameA),task('other-legacy','',nameB),blankTask];
   st.meetings=[meeting('own-profile',a,nameB),meeting('other-profile',b,nameA),meeting('profile-alias-legacy','',nameA),meeting('other-legacy','',nameB),blankMeeting];
   st.customers[0]=core.CustomerSchema.parse({...st.customers[0],status:'risk',riskReason:'SYNTHETIC_ALIAS_CONTACT_SIGNAL'});
   const blocker=core.OrderSchema.parse({...st.orders[0],id:'alias-order-blocker',invoiceDate:'',invoiceValue:null,actualCost:null,stage:'production',production:{status:'submitted',issue:'SYNTHETIC_ALIAS_ORDER_ISSUE'}});blocker.owner=nameA;st.orders.push(blocker);return st;
  }
  function ownSales(){
   const cards=byClass('day-month-card');assert.equal(cards.length,1,'One actual personal monthly result card');const card=cards[0];assert.equal(card.props['aria-label'],'Försäljning denna månad');assert.equal(text(card.findByType('strong')),currency(125));assert.match(text(card),/DIN FÖRSÄLJNING/);assert.ok(text(card).includes('Mål '+currency(500)));assert.ok(text(card).includes('25 %'));assert.ok(!text(card).includes(currency(1225)));assert.ok(!text(card).includes('TEAMETS FÖRSÄLJNING'));assert.ok(text(card).includes('Fortnox är inte anslutet'));
  }
  function exactProfileWork(){
   assert.deepEqual(ids(),['own-profile']);assert.ok(content().includes('Möte own-profile'));for(const label of ['Möte other-profile','Möte profile-alias-legacy','Möte other-legacy','Möte blank-legacy','SYNTHETIC_ALIAS_CONTACT_SIGNAL','SYNTHETIC_ALIAS_ORDER_ISSUE'])assert.ok(!content().includes(label),'No inferred operational work: '+label);
   assert.deepEqual(byClass('day-work-counts')[0].findAllByType('b').map(text),['1','0','0']);assert.equal(renderer.root.findAll(node=>typeof node.type==='string'&&node.props.id==='daily-receipts').length,0,'Receipt work must not be opened through a guessed alias');
  }
  await isolated('member-linked seller with no customer owner sees own ID work and monthly result without profile-alias or empty-owner operational fallback',async()=>{
   const st=workFixture(salesFixture(fixture({link:'a',owner:''}))),unchanged=await mount(st,'_unassigned');diagnosed('operational-missing');exactProfileWork();ownSales();assert.match(text(diagnostic()[0]),/Kundansvar saknas/);assert.ok(!content().includes('Koppla säljarprofil'));assert.equal(diagnostic()[0].findAllByType('button').length,0);assert.equal(button('Mina uppgifter').props['aria-pressed'],true);assert.equal(button('Teamets uppgifter'),undefined);
   const row=renderer.root.find(node=>node.type==='div'&&node.props['data-task-id']==='own-profile');await act(async()=>row.findAllByType('button').at(-1).props.onClick());await act(async()=>byClass('day-meetings')[0].findAllByType('button').find(node=>text(node)==='Visa möte').props.onClick());await click('Öppna mitt resultat');assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]},{kind:'meeting',args:[st.meetings[0]]},{kind:'view',args:['overview']}]);unchanged();
  });
  await isolated('removed customer-owner alias cannot hide an exact profile or reuse that profile historical alias as current operational ownership',async()=>{
   const st=workFixture(salesFixture(fixture({link:'a',owner:'Syntetiskt borttaget kundansvar'})));st.settings.owners=[nameB];const unchanged=await mount(st,'_unassigned');assert.equal(dashboard.personalOwner(st),'');assert.equal(dashboard.personalResultScope(st),a);diagnosed('operational-missing');exactProfileWork();ownSales();unchanged();
  });
  await isolated('linked administrator without customer ownership can select own profile day and reach account guidance through read-only callbacks',async()=>{
   const st=salesFixture(fixture({link:'a',role:'admin',owner:''})),unchanged=await mount(st,'all');assert.equal(button('Mina uppgifter').props['aria-pressed'],false);await click('Mina uppgifter');assert.deepEqual(calls,[{kind:'owner',args:['_unassigned']}]);const updated=await update(st,'_unassigned');diagnosed('operational-missing');ownSales();assert.equal(button('Mina uppgifter').props['aria-pressed'],true);assert.equal(button('Teamets uppgifter').props['aria-pressed'],false);await click('Öppna Konton & roller');assert.deepEqual(calls,[{kind:'owner',args:['_unassigned']},{kind:'view',args:['accounts']}]);assert.ok(!content().includes('Koppla säljarprofil'));unchanged();updated();
  });
  await isolated('missing member link and no customer ownership keep the start screen without invented zero-result acceptance',async()=>{
   const st=salesFixture(fixture({owner:''})),unchanged=await mount(st,'_unassigned');assert.equal(diagnostic().length,0);assert.equal(byClass('day-month-card').length,0);assert.equal(byClass('day-work-counts').length,0);assert.deepEqual(ids(),[]);assert.match(content(),/Din arbetsdag, på ett ställe/);assert.equal(button('Mina uppgifter'),undefined);assert.equal(button('Teamets uppgifter'),undefined);assert.ok(!content().includes(currency(1225)));unchanged();
  });
  for(const link of ['a',''])await isolated('seller cannot turn an injected all selection into team work or team results '+(link?'with':'without')+' a linked profile',async()=>{
   const st=workFixture(salesFixture(fixture({link,owner:''}))),unchanged=await mount(st,'all');assert.deepEqual(ids(),[]);assert.equal(byClass('day-month-card').length,0);assert.equal(byClass('day-work-counts').length,0);assert.equal(button('Teamets uppgifter'),undefined);assert.ok(!content().includes('TEAMETS DAG'));assert.ok(!content().includes('Möte other-profile'));assert.ok(!content().includes(currency(1225)));if(link)assert.equal(button('Mina uppgifter').props['aria-pressed'],false);unchanged();
  });
  await isolated('reader with exact profile and no customer owner sees personal history and view actions without privileged repair or edit controls',async()=>{
   const st=workFixture(salesFixture(fixture({link:'a',role:'reader',owner:''}))),unchanged=await mount(st,'_unassigned');diagnosed('operational-missing');exactProfileWork();ownSales();assert.equal(diagnostic()[0].findAllByType('button').length,0);for(const label of ['Öppna Konton & roller','Öppna Mål & inställningar','Teamets uppgifter','Planera aktivitet','Anteckna','Byt uppgiftsansvar','Byt mötesansvar'])assert.equal(button(label),undefined,label+' must not be exposed');const row=renderer.root.find(node=>node.type==='div'&&node.props['data-task-id']==='own-profile');assert.equal(text(row.findAllByType('button').at(-1)),'Visa aktivitet');await act(async()=>row.findAllByType('button').at(-1).props.onClick());assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]}]);unchanged();
  });
  await isolated('operational-owner mismatch keeps the member-linked monthly result rather than switching it to the current customer owner',async()=>{
   const st=salesFixture(fixture({link:'a',owner:nameB})),unchanged=await mount(st,nameB);diagnosed('mismatch');ownSales();assert.equal(dashboard.personalResultScope(st),a);assert.match(text(byClass('day-month-card')[0]),/Ett ändrat kundansvar flyttar inte registrerat resultat/);unchanged();
  });
  await isolated('inactive exact historical profile retains its result and anchored work while removed operational ownership remains an explicit separate gap',async()=>{
   const st=workFixture(salesFixture(fixture({link:'a',inactive:true,owner:''})));st.settings.owners=[nameB];const unchanged=await mount(st,'_unassigned');diagnosed('operational-missing');exactProfileWork();ownSales();assert.equal(dashboard.personalResultScope(st),a);assert.ok(!content().includes('Koppla säljarprofil'));unchanged();
  });
  await isolated('pre-initialization without customer ownership cannot infer a profile from matching names or team totals',async()=>{
   const st=salesFixture(fixture({initialized:false,owner:''})),unchanged=await mount(st,'_unassigned');assert.equal(dashboard.personalResultScope(st),'');assert.equal(byClass('day-month-card').length,0);assert.deepEqual(ids(),[]);assert.equal(diagnostic().length,0);assert.equal(button('Mina uppgifter'),undefined);assert.ok(!content().includes(currency(1225)));unchanged();
  });
  await isolated('linked profile does not make another selected operational owner into the personal day',async()=>{
   const st=workFixture(salesFixture(fixture({link:'a',owner:''}))),unchanged=await mount(st,nameB);assert.equal(diagnostic().length,0);assert.deepEqual(ids(),[]);assert.equal(byClass('day-month-card').length,0);assert.equal(button('Mina uppgifter').props['aria-pressed'],false);assert.match(content(),/Välj din arbetsdag/);assert.ok(!content().includes('Ditt konto behöver kopplas'));await click('Öppna mina uppgifter');assert.deepEqual(calls,[{kind:'owner',args:['_unassigned']}]);unchanged();
  });
  await isolated('same mounted day drops previous member and workspace results and recalculates current exact identity without stale profile or team fallback',async()=>{
   const first=workFixture(salesFixture(fixture({link:'a',owner:''}))),checks=[await mount(first,'_unassigned')];diagnosed('operational-missing');exactProfileWork();ownSales();
   const session=workFixture(salesFixture(fixture({link:'a',owner:''})));session.viewer={...session.viewer,id:'synthetic-new-session',memberId:'unlinked-current-member'};checks.push(await update(session,'_unassigned'));assert.deepEqual(ids(),[]);assert.equal(byClass('day-month-card').length,0);assert.equal(diagnostic().length,0);assert.equal(button('Mina uppgifter'),undefined);
   const current=workFixture(salesFixture(fixture({link:'b',owner:''})));current.viewer={...current.viewer,id:'synthetic-new-session',memberId:'synthetic-other-member'};current.settings.sellerProfiles[1].memberId='synthetic-other-member';checks.push(await update(current,'_unassigned'));diagnosed('operational-missing');assert.deepEqual(ids(),['other-profile']);assert.equal(text(byClass('day-month-card')[0].findByType('strong')),currency(875));assert.ok(!content().includes('Möte own-profile'));assert.ok(content().includes('Möte other-profile'));
   const otherWorkspace=structuredClone(current);otherWorkspace.settings.sellerProfiles[1].memberId='';checks.push(await update(otherWorkspace,'_unassigned','synthetic-second-workspace'));assert.deepEqual(ids(),[]);assert.equal(byClass('day-month-card').length,0);assert.equal(button('Mina uppgifter'),undefined);
   const restored=structuredClone(current);restored.settings.sellerProfiles=restored.settings.sellerProfiles.map(profile=>({...profile,memberId:''}));checks.push(await update(restored,'_unassigned','synthetic-second-workspace'));assert.deepEqual(ids(),[]);assert.equal(byClass('day-month-card').length,0);assert.ok(!content().includes(currency(875)));
   checks.push(await update(first,'_unassigned','synthetic'));exactProfileWork();ownSales();const reader=structuredClone(first);reader.viewer.role='reader';checks.push(await update(reader,'_unassigned','synthetic'));assert.equal(button('Planera aktivitet'),undefined);assert.equal(button('Anteckna'),undefined);assert.equal(button('Öppna Konton & roller'),undefined);ownSales();for(const unchanged of checks)unchanged();assert.deepEqual(calls,[],'Identity and workspace rerenders must not write or navigate');
  });
  console.log('PASS MyDay profile link: '+count+' actual React component/filter/callback cases; synthetic visual/draft boundaries, immutable input, zero HTTP reads or writes; no personal login, browser or staff acceptance claimed.');return {cases:count,compiledDomains:compiled.size-1,httpRequests:fetchCalls.length};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of [['fetch',fetchDescriptor],['IS_REACT_ACT_ENVIRONMENT',actDescriptor]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
