import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

const profileA='c5746101-f76b-4ec7-9f44-90d7e9c5a001',profileB='c5746101-f76b-4ec7-9f44-90d7e9c5a002';
const nameA='Syntetiskt behovsansvar A',nameB='Syntetiskt behovsansvar B',removedName='Syntetiskt borttaget behovsansvar';
const responsibilities=['a','b','legacy-a','legacy-b','sentinel','removed'];
const responsibilityOf=need=>need.id.replace(/^need-[^-]+-/, '');

// Actual normalization checks all profile references. Needs deliberately have
// another responsibility than their customer relation. These are synthetic
// records only; the exported fixture can also support isolated browser QA.
export function yearwheelScopeFixture(core,{link='b',owner=nameA,role='seller',initialized=true,inactive=false,memberId='synthetic-year-member',owners=[nameA,nameB]}={}){
 const st=core.emptyState(),today=core.day(),year=today.slice(0,4),nextYear=String(Number(year)+1);
 st.viewer={id:'synthetic-year-session',memberId,name:'Syntetisk person',email:'synthetic-year-person@example.test',role,owner};
 st.settings.owners=owners;st.settings.sellerProfilesInitialized=initialized;
 st.settings.sellerProfiles=initialized?[
  {id:profileA,legacyOwnerName:nameA,displayName:'Samma syntetiska visningsnamn',memberId:link==='a'?'synthetic-year-member':'',active:true,linkHistory:[],retirementHistory:[]},
  {id:profileB,legacyOwnerName:nameB,displayName:'Samma syntetiska visningsnamn',memberId:link==='b'?'synthetic-year-member':'',active:!inactive,linkHistory:[],retirementHistory:[]}
 ]:[];
 const periods=[['past',core.plusDays(today,-1),0,'planned'],['today',today,0,'planned'],['future',core.plusDays(today,1),0,'planned'],['lead',core.plusDays(today,5),5,'planned'],['next',nextYear+'-01-15',0,'planned'],['done',today,0,'done'],['cancelled',today,0,'cancelled']];
 for(const [period,due,leadDays,status] of periods)for(const responsibility of responsibilities){
  if(!initialized&&['a','b'].includes(responsibility))continue;
  const id=period+'-'+responsibility,assigned=responsibility==='b'||responsibility==='legacy-b'?nameB:responsibility==='sentinel'?'_unassigned':responsibility==='removed'?removedName:nameA;
  const profile=responsibility==='a'?profileA:responsibility==='b'?profileB:'';
  st.customers.push(core.CustomerSchema.parse({id:'customer-'+id,name:'Syntetisk årskund '+id,contact:'Syntetisk kontakt '+responsibility,owner:assigned===nameB?nameA:nameB,ownerProfileId:initialized?(assigned===nameB?profileA:profileB):'',status:'closed',yearNeeds:[{id:'need-'+id,title:'Syntetiskt behov '+id,notes:'Förberedelser '+responsibility,category:'Syntetiskt inköpsbehov',due,leadDays,status,owner:assigned,ownerProfileId:profile}]}));
 }
 return core.normalizeState(st);
}

// Actual domain, YearWheel, diagnostic, full/compact page expressions and
// navigation execute. Visual hosts, ready-empty private draft loading and
// unopened editors are controlled boundaries. No browser, HTTP or CRM write.
export async function verifyYearwheelScope(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/yearwheel-scope-'));
 const compiled=new Set(),sourceBytes=new Map(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 const remember=file=>{const bytes=readFileSync(file);if(sourceBytes.has(file))assert.deepEqual(bytes,sourceBytes.get(file));else sourceBytes.set(file,bytes);return bytes.toString('utf8');};
 writeFileSync(helpers,`import React from 'react';const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Input=host('input'),Select=host('select-control'),SelectContent=host('select-content'),SelectItem=host('select-item'),SelectTrigger=host('select-trigger'),SelectValue=host('select-value');
export const Sheet=({open,children})=>open?React.createElement('sheet',{},children):null,SheetContent=host('sheet-content'),SheetHeader=host('sheet-header'),SheetTitle=host('h2'),SheetDescription=host('p'),BusinessField=host('field');
export const useDrafts=()=>({ready:true,records:[],get:()=>{throw Error('Unrelated draft editor must remain closed')},archive:async()=>{throw Error('No private draft writes')}});
export const DraftStatus=()=>null;
export const YearNeedEditor=()=>{throw Error('Unrelated need editor must remain closed')},YearNeedDraftPreview=()=>{throw Error('Fixture has no private draft rows')},YearwheelResponsibilityDialog=()=>{throw Error('Unrelated responsibility editor must remain closed')};`);
 const formatterSource=remember('components/business-ui.tsx'),formatterAst=ts.createSourceFile('business-ui.tsx',formatterSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),formatters=formatterAst.statements.filter(statement=>ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text==='displayDate'));
 assert.equal(formatters.length,1,'Actual date formatter');const formatterFile=resolve(directory,'formatters.mjs');
 writeFileSync(formatterFile,ts.transpileModule(formatters[0].getText(formatterAst)+`\nexport {BusinessField} from ${JSON.stringify(pathToFileURL(helpers).href)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const actualComponents=new Set(['components/year-wheel.tsx','components/yearwheel-scope-notice.tsx']);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||actualComponents.has(file),'Only actual domains and target components');
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(remember(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier==='./yearwheel-scope-notice')dependency=compile('components/yearwheel-scope-notice.tsx');
   else if(actualComponents.has(file)&&specifier==='./business-ui')dependency=formatterFile;
   else if(specifier.startsWith('@/components/')||actualComponents.has(file)&&specifier.startsWith('./'))dependency=helpers;
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const originals=Object.fromEntries(['fetch','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let renderer,count=0,calls=[],http=[];
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const byClass=name=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props.className?.split(' ').includes(name));
 const button=label=>renderer.root.findAllByType('button').find(node=>text(node)===label);
 const cards=()=>byClass('need-card'),cardIds=()=>cards().map(node=>node.props['data-need-id']);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null}}
 async function scenario(label,run){await unmount();calls=[];await run();await unmount();assert.equal(http.length,0,'Zero HTTP in '+label);count++;console.log('PASS Yearwheel scope: '+label)}
 async function click(label){const node=button(label);assert.ok(node,'Expected '+label);assert.ok(!node.props.disabled,'Enabled '+label);await act(async()=>node.props.onClick())}
 async function input(label,value){const node=renderer.root.findAllByType('input').find(row=>row.props['aria-label']===label);assert.ok(node,'Expected field '+label);await act(async()=>node.props.onChange({target:{value}}))}
 function diagnostic(kind){const nodes=renderer.root.findAll(node=>node.type==='section'&&node.props['data-profile-diagnostic']);assert.equal(nodes.length,kind?1:0);if(kind){const notice=nodes[0];assert.equal(notice.props['data-profile-diagnostic'],kind);assert.equal(notice.props.role,'status');assert.ok(notice.findAllByType('h2').some(heading=>heading.props.id===notice.props['aria-labelledby']));assert.match(text(notice),/inte en bekräftad fullständig/);assert.equal(text(byClass('yearwheel-heading')[0]),'Mina behov · synligt urval');assert.match(text(byClass('yearwheel-contact')[0]),/ditt synliga urval/);assert.match(byClass('year-months')[0].props['aria-label'],/ · synligt urval$/);const hosts=renderer.root.findAll(node=>typeof node.type==='string'),toolbar=byClass('yearwheel-toolbar')[0];assert.ok(hosts.indexOf(notice)>=0&&hosts.indexOf(notice)<hosts.indexOf(toolbar),'Diagnostic precedes filter controls')}}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{http.push(args);throw Error('Yearwheel scope must not perform HTTP')}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),domain=await import(pathToFileURL(compile('lib/yearwheel-scope.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),{YearWheel}=await import(pathToFileURL(compile('components/year-wheel.tsx')).href);
  const source=remember('app/page.tsx'),ast=ts.createSourceFile('app/page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];(function visit(node){nodes.push(node);ts.forEachChild(node,visit)})(ast);
  const variable=name=>{const matches=nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name);assert.equal(matches.length,1,'One actual '+name);return matches[0].initializer.getText(ast)};
  const declarations=nodes.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='navigate');assert.equal(declarations.length,1);
  const wheels=nodes.filter(node=>ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='YearWheel');assert.equal(wheels.length,2,'One full and one compact actual YearWheel');
  const compactAttribute=node=>node.attributes.properties.some(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(ast)==='compact');
  const expression=node=>{while(!ts.isJsxExpression(node)){assert.ok(node.parent);node=node.parent}assert.ok(node.expression);return node.expression.getText(ast)};
  const full=wheels.find(node=>!compactAttribute(node)),compact=wheels.find(compactAttribute);assert.ok(full);assert.ok(compact);
  assert.ok(full.attributes.properties.some(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(ast)==='onView'),'Full page supplies actual settings navigation');
  assert.equal(compact.attributes.properties.some(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(ast)==='onView'),false,'Compact page has no personal scope navigation');
  const parentFile=resolve(directory,'actual-parent.mjs');
  writeFileSync(parentFile,ts.transpileModule(`import React from 'react';import {YearWheel} from ${JSON.stringify(pathToFileURL(compile('components/year-wheel.tsx')).href)};import {personalOwner} from ${JSON.stringify(pathToFileURL(compile('lib/sales-dashboard.ts')).href)};
const groups=(${variable('groups')}),groupOf=(${variable('groupOf')});
export function frame(st,selectedView,space,busy,calls,compactMode=false,selectedId=''){const viewerReady=(${variable('viewerReady')}),department=(${variable('department')}),view=(${variable('view')}),customerTab=compactMode?'planning':'overview',selected=st.customers.find(c=>c.id===selectedId),workspaceReturn={current:null};
const setResumeDraft=value=>calls.push({kind:'draft',value}),setResumeArticleDraft=value=>calls.push({kind:'articleDraft',value}),setSearch=value=>calls.push({kind:'search',value}),setOwner=value=>calls.push({kind:'owner',value}),setView=value=>calls.push({kind:'view',value}),showCustomer=id=>calls.push({kind:'customer',id});
const save=()=>{throw Error('No CRM save in selection tests')},refreshResponsibility=()=>{throw Error('No CRM refresh')},resumeYearNeedDraft='',setResumeYearNeedDraft=()=>{},resumeResponsibilityDraft='',setResumeResponsibilityDraft=()=>{};
${declarations[0].getText(ast)}return <>{compactMode?(${expression(compact)}):(${expression(full)})}</>;}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
  const parent=await import(pathToFileURL(parentFile).href),fixture=options=>yearwheelScopeFixture(core,options),today=core.day(),thisYear=today.slice(0,4),nextYear=String(Number(thisYear)+1);
  async function render(st,{compact=false,selectedId='',view='year',space='synthetic-year-space',busy=false,update=false,direct=false,onView=true}={}){const before=JSON.stringify(st);freeze(st);await act(async()=>{const tree=direct?React.createElement(YearWheel,{st,customers:st.customers,space,busy,refresh:()=>{throw Error('No CRM refresh')},save:()=>{throw Error('No CRM save')},onCustomer:id=>calls.push({kind:'customer',id}),...(onView?{onView:view=>calls.push({kind:'direct-view',view})}:{})}):parent.frame(st,view,space,busy,calls,compact,selectedId),host=React.createElement('scope-test-host',null,tree);if(update){assert.ok(renderer);renderer.update(host)}else renderer=create(host)});assert.equal(JSON.stringify(st),before,'Rendering preserves normalized input');return()=>assert.equal(JSON.stringify(st),before,'Callbacks preserve normalized input')}
  const selectedNeeds=(st,suffixes,{year=thisYear,handled=false,compact=false,selectedId='',search=''}={})=>st.customers.flatMap(customer=>customer.yearNeeds.map(need=>({customer,need}))).filter(({customer,need})=>suffixes.includes(responsibilityOf(need))&&(handled||need.status==='planned')&&(compact?customer.id===selectedId:need.due.startsWith(year))&&(!search||[customer.name,customer.contact,need.title,need.notes,need.owner].join(' ').toLocaleLowerCase('sv').includes(search.toLocaleLowerCase('sv')))).sort((a,b)=>a.need.due.localeCompare(b.need.due)||a.need.id.localeCompare(b.need.id));
  function consistency(expected,{year=thisYear,compact=false}={}){
   assert.deepEqual(cardIds(),expected.map(({need})=>need.id),'Cards show exactly expected own responsibility records');
   for(const [index,{customer,need}] of expected.entries()){const card=cards()[index];assert.equal(card.props['data-customer-id'],customer.id);assert.equal(card.props['data-due'],need.status==='planned'&&core.plusDays(need.due,-need.leadDays)<=today);assert.ok(text(card).includes(need.title))}
   if(compact){assert.equal(byClass('year-months').length,0);assert.equal(byClass('yearwheel-contact').length,0);assert.equal(byClass('yearwheel-scope').length,0);diagnostic('');return}
   const contact=byClass('yearwheel-contact');assert.equal(contact.length,1);assert.equal(Number(text(contact[0].findByType('b'))),expected.filter(({need})=>need.status==='planned'&&core.plusDays(need.due,-need.leadDays)<=today).length);assert.ok(text(contact[0]).includes(year));
   const months=byClass('year-months')[0].children;assert.equal(months.length,12);for(let index=0;index<12;index++){const month=year+'-'+String(index+1).padStart(2,'0'),items=expected.filter(({need})=>need.due.startsWith(month));assert.equal(Number(text(months[index].findAllByType('b')[0])),items.filter(({need})=>need.status==='planned').length,'Monthly planned count '+month);const monthRows=months[index].findAll(node=>node.type==='div'&&node.props.className==='yearwheel-month-need');assert.equal(monthRows.length,Math.min(2,items.length));for(const [position,item] of items.slice(0,2).entries()){assert.ok(text(monthRows[position]).includes(item.need.title));assert.equal(monthRows[position].findByType('button').props['data-customer-id'],item.customer.id)}}
  }
  async function check(st,suffixes,options={}){const before=JSON.stringify(st);freeze(st);const scope=domain.yearwheelScope(st,options.team?'team':'mine');assert.equal(scope.team,!!options.team);assert.equal(scope.personal,!options.team);assert.deepEqual(st.customers.flatMap(customer=>customer.yearNeeds).filter(need=>domain.yearNeedInScope(need,scope)).map(need=>need.id),st.customers.flatMap(customer=>customer.yearNeeds).filter(need=>suffixes.includes(responsibilityOf(need))).map(need=>need.id));assert.equal(JSON.stringify(st),before);consistency(selectedNeeds(st,suffixes,options),options)}

  await scenario('member-linked B and valid legacy A remain separate from customer owner and duplicate display names',async()=>{const st=fixture(),unchanged=await render(st);await check(st,['b','legacy-a']);assert.equal(domain.yearwheelScope(st,'mine').profileId,profileB);assert.equal(domain.yearwheelScope(st,'mine').legacyOwner,nameA);diagnostic('mismatch');assert.ok(text(renderer.toJSON()).includes(nameA));assert.ok(text(renderer.toJSON()).includes(nameB));const card=cards()[0],id=card.props['data-customer-id'];await act(async()=>card.findAllByType('button').find(node=>node.props['data-customer-id']===id).props.onClick());assert.deepEqual(calls,[{kind:'customer',id}]);unchanged()});
  await scenario('missing member link never adopts the matching alias profile',async()=>{const st=fixture({link:''}),unchanged=await render(st);await check(st,['legacy-a']);assert.equal(domain.yearwheelScope(st,'mine').profileId,'');diagnostic('missing');unchanged()});
  await scenario('runtime session ID never substitutes for the immutable member link',async()=>{const st=fixture({memberId:''});st.viewer.id='synthetic-year-member';const unchanged=await render(st);await check(st,['legacy-a']);diagnostic('missing');unchanged()});
  await scenario('no operational owner retains exact linked B but no historic alias fallback',async()=>{const st=fixture({owner:''}),unchanged=await render(st);await check(st,['b']);assert.equal(domain.yearwheelScope(st,'mine').legacyOwner,'');diagnostic('operational-missing');unchanged()});
  await scenario('removed operational alias never becomes a personal legacy responsibility',async()=>{const st=fixture({owner:removedName,owners:[nameB]}),unchanged=await render(st);await check(st,['b']);assert.equal(domain.yearwheelScope(st,'mine').legacyOwner,'');diagnostic('operational-missing');unchanged()});
  await scenario('missing link and invalid sentinel owner produce an explained empty selection',async()=>{const st=fixture({link:'',owner:'_unassigned'}),unchanged=await render(st);await check(st,[]);diagnostic('missing');assert.equal(byClass('biz-empty').length,1);unchanged()});
  await scenario('no profile and no owner do not adopt unassigned or removed rows',async()=>{const st=fixture({link:'',owner:''}),unchanged=await render(st);await check(st,[]);diagnostic('missing');unchanged()});
  await scenario('inactive exact linked profile preserves visible history without activation or relinking',async()=>{const st=fixture({inactive:true,owner:'',owners:[nameA]}),unchanged=await render(st);await check(st,['b']);diagnostic('operational-missing');assert.equal(st.settings.sellerProfiles[1].active,false);for(const card of cards())assert.equal(card.findAllByType('button').find(node=>text(node)==='Skapa affär').props.disabled,true);unchanged()});
  await scenario('valid matching profile includes own registered and own blank-ID legacy needs without notice',async()=>{const st=fixture({owner:nameB}),unchanged=await render(st);await check(st,['b','legacy-b']);diagnostic('');unchanged()});
  await scenario('uninitialized storage preserves operational legacy owner and does not invent a missing profile',async()=>{const st=fixture({initialized:false}),unchanged=await render(st);await check(st,['legacy-a']);assert.equal(domain.yearwheelScope(st,'mine').profileId,'');assert.equal(domain.yearwheelScope(st,'mine').legacyOwner,nameA);diagnostic('');unchanged()});
  await scenario('uninitialized storage with no valid owner never adopts sentinel or historic names',async()=>{const st=fixture({initialized:false,owner:removedName}),unchanged=await render(st);await check(st,[]);diagnostic('');unchanged()});
  await scenario('Teamets behov includes registered, legacy, unassigned and removed responsibility',async()=>{const st=fixture(),unchanged=await render(st);await click('Teamets behov');await check(st,responsibilities,{team:true});diagnostic('');assert.equal(button('Teamets behov').props['aria-pressed'],true);await click('Mina behov');await check(st,['b','legacy-a']);diagnostic('mismatch');unchanged()});
  await scenario('search, current/next year and handled filters keep cards, contact counts and month summaries consistent',async()=>{const st=fixture(),unchanged=await render(st);await check(st,['b','legacy-a']);await input('Sök kund eller behov','legacy-a');await check(st,['b','legacy-a'],{search:'legacy-a'});await click('Visa även hanterade');await check(st,['b','legacy-a'],{search:'legacy-a',handled:true});await input('Sök kund eller behov','');await check(st,['b','legacy-a'],{handled:true});await input('År för årshjul',nextYear);await check(st,['b','legacy-a'],{handled:true,year:nextYear});await input('Sök kund eller behov','SYNTEtisk Kontakt b');await check(st,['b','legacy-a'],{handled:true,year:nextYear,search:'syntetisk kontakt b'});await input('Sök kund eller behov','saknat syntetiskt sökord');await check(st,['b','legacy-a'],{handled:true,year:nextYear,search:'saknat syntetiskt sökord'});assert.equal(byClass('biz-empty').length,1);unchanged()});
  await scenario('team search and handled selection include all responsibilities without a personal diagnostic',async()=>{const st=fixture({link:'',owner:''}),unchanged=await render(st);await click('Teamets behov');await click('Visa även hanterade');await input('Sök kund eller behov','sentinel');await check(st,responsibilities,{team:true,handled:true,search:'sentinel'});diagnostic('');unchanged()});
  for(const [options,expectedView,label] of [[{role:'admin'},'settings','mismatch'],[{role:'admin',link:''},'settings','missing'],[{role:'admin',owner:''},'accounts','operational-missing']])await scenario('actual admin '+label+' notice navigates through the page to '+expectedView,async()=>{const st=fixture(options),unchanged=await render(st);diagnostic(label);await click(expectedView==='accounts'?'Öppna Konton & roller':'Öppna Mål & inställningar');assert.deepEqual(calls,[{kind:'search',value:''},{kind:'view',value:expectedView}]);unchanged()});
  await scenario('reader sees the same exact personal scope and support text with no write or admin action',async()=>{const st=fixture({role:'reader'}),unchanged=await render(st);await check(st,['b','legacy-a']);diagnostic('mismatch');assert.ok(text(renderer.toJSON()).includes('Be en administratör'));for(const label of ['Nytt behov','Ändra behov','Skapa affär','Markera hanterat','Byt behovsansvar','Förankra behovsansvar','Öppna Mål & inställningar','Öppna Konton & roller'])assert.equal(button(label),undefined,'No reader action '+label);unchanged()});
  await scenario('seller has no administrative shortcut and missing optional navigation cannot expose a dead admin button',async()=>{const seller=fixture(),checks=[await render(seller)];assert.equal(button('Öppna Mål & inställningar'),undefined);diagnostic('mismatch');await unmount();const admin=fixture({role:'admin'});checks.push(await render(admin,{direct:true,onView:false}));diagnostic('mismatch');assert.equal(button('Öppna Mål & inställningar'),undefined);assert.deepEqual(calls,[]);checks.forEach(check=>check())});
  for(const role of ['production','print','warehouse'])await scenario('actual parent routes remembered year view to '+role+' operational workspace',async()=>{const st=fixture({role}),unchanged=await render(st);assert.equal(byClass('yearwheel').length,0);assert.deepEqual(calls,[]);unchanged()});
  await scenario('compact customer planning stays unfiltered by personal identity and current year with no notice',async()=>{const st=fixture({link:'',owner:''}),checks=[];for(const id of ['customer-today-a','customer-next-b','customer-today-sentinel','customer-today-removed']){await unmount();checks.push(await render(st,{compact:true,selectedId:id}));consistency(selectedNeeds(st,responsibilities,{compact:true,selectedId:id}),{compact:true});assert.equal(button('Teamets behov'),undefined);assert.equal(button('Mina behov'),undefined)}await unmount();checks.push(await render(st,{compact:true,selectedId:'customer-done-b'}));consistency([],{compact:true});assert.equal(byClass('biz-empty').length,1);checks.forEach(check=>check())});
  await scenario('mounted direct YearWheel recomputes member-linked responsibility after an account and workspace change',async()=>{const first=fixture(),checks=[await render(first,{direct:true})];await check(first,['b','legacy-a']);const next=fixture({link:'a',owner:nameB});next.viewer.id='synthetic-year-next-session';next.viewer.memberId='synthetic-year-next-member';next.settings.sellerProfiles[0].memberId='synthetic-year-next-member';core.normalizeState(next);checks.push(await render(next,{direct:true,update:true,space:'synthetic-year-next-space'}));await check(next,['a','legacy-b']);diagnostic('mismatch');const missing=fixture({link:'',owner:''});checks.push(await render(missing,{direct:true,update:true,space:'synthetic-year-next-space'}));await check(missing,[]);diagnostic('missing');assert.deepEqual(calls,[]);checks.forEach(check=>check())});
  for(const [file,bytes] of sourceBytes)assert.deepEqual(readFileSync(file),bytes,'Actual source remains byte unchanged: '+file);
  const proof=Object.fromEntries([...sourceBytes].sort(([a],[b])=>a.localeCompare(b)).map(([file,bytes])=>[file,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]));
  console.log('PASS Yearwheel scope: '+count+' normalized domain/actual page/React cases; immutable inputs, '+compiled.size+' byte-verified production modules, zero HTTP. Synthetic presentation/private-draft boundaries; no browser, personal login, integration or staff acceptance.');
  return {cases:count,compiledModules:compiled.size,httpRequests:http.length,sourceProof:proof};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
}
