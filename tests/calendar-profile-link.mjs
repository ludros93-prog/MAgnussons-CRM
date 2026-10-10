import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Exercise the production calendar, CRM/profile domains and exact page parent
// expressions. Visual primitives and observation callbacks are synthetic;
// fixtures never leave memory, perform HTTP or change an account or CRM record.
export async function verifyCalendarProfileLink(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/calendar-profile-'));
 const compiled=new Set(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Checkbox=host('input');
`);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||file==='components/calendar-work.tsx');
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier.startsWith('@/components/ui/'))dependency=helpers;
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 let renderer,calls=[],fetchCalls=[],count=0;
 const fetchDescriptor=Object.getOwnPropertyDescriptor(globalThis,'fetch'),actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');
 const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const content=()=>text(renderer.toJSON()),rows=kind=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props['data-'+kind+'-id']),ids=kind=>rows(kind).map(node=>node.props['data-'+kind+'-id']);
 const buttons=()=>renderer.root.findAllByType('button'),button=caption=>buttons().find(node=>text(node)===caption);
 const diagnostics=()=>renderer.root.findAll(node=>node.type==='section'&&node.props['data-profile-diagnostic']);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null;}}
 async function isolated(caption,test){await unmount();calls=[];await test();await unmount();assert.equal(fetchCalls.length,0,'No HTTP in '+caption);count++;console.log('PASS Calendar profile link: '+caption);}
 async function click(caption){const node=button(caption);assert.ok(node,'Expected visible action '+caption);assert.ok(!node.props.disabled,'Action must be enabled: '+caption);await act(async()=>node.props.onClick());}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{fetchCalls.push(args);throw new Error('Calendar must not perform HTTP');}});
  const {CalendarWork,calendarActivityScope}=await import(pathToFileURL(compile('components/calendar-work.tsx')).href),core=await import(pathToFileURL(compile('lib/crm.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href);
  const a='b5746101-f76b-4ec7-9f44-90d7e9c5a001',b='b5746101-f76b-4ec7-9f44-90d7e9c5a002',nameA='Syntetisk ansvarig A',nameB='Syntetisk ansvarig B',today=core.day();
  const fixture=({link='a',role='seller',owner=nameA,initialized=true,inactive=false}={})=>{
   const st=core.emptyState();st.viewer={id:'synthetic-session',memberId:'synthetic-member',name:'Syntetisk person',role,owner};st.settings.owners=[nameA,nameB];st.settings.sellerProfilesInitialized=initialized;
   st.settings.sellerProfiles=initialized?[{id:a,legacyOwnerName:nameA,displayName:'Samma visningsnamn',memberId:link==='a'?'synthetic-member':'',active:!inactive,linkHistory:[],retirementHistory:[]},{id:b,legacyOwnerName:nameB,displayName:'Samma visningsnamn',memberId:link==='b'?'synthetic-member':'',active:true,linkHistory:[],retirementHistory:[]}]:[];
   st.customers=[core.CustomerSchema.parse({id:'synthetic-customer',name:'Syntetisk kund Alfa',owner:nameA}),core.CustomerSchema.parse({id:'synthetic-other-customer',name:'Syntetisk kund Beta',owner:nameB})];return st;
  };
  const task=(id,profile='',owner=nameA,extra={})=>core.TaskSchema.parse({id,ownerProfileId:profile,customerId:'synthetic-customer',owner,title:'Uppgift '+id,due:today,...extra});
  const meeting=(id,profile='',owner=nameA,extra={})=>core.MeetingSchema.parse({id,ownerProfileId:profile,customerId:'synthetic-customer',owner,title:'Möte '+id,date:today,time:'10:30',duration:30,...extra});
  const work=st=>{st.tasks=[task('own-id',a,nameB),task('peer-id-same-alias',b,nameA),task('legacy-own'),task('legacy-peer','',nameB),task('sentinel-legacy','','_unassigned')];st.meetings=[meeting('own-id',a,nameB),meeting('peer-id-same-alias',b,nameA),meeting('legacy-own'),meeting('legacy-peer','',nameB),meeting('sentinel-legacy','','_unassigned')];return st;};
  async function render(st,owner=dashboard.personalOwner(st)||'_unassigned',{search='',busy=false,update=false,parentCallbacks}={}){
   const before=JSON.stringify(st);freeze(st);const record=kind=>(...args)=>calls.push({kind,args});const component=React.createElement(CalendarWork,{st,owner,search,busy,onMeeting:record('meeting'),onTask:record('task'),onCreateTask:record('createTask'),onTransferMeeting:record('transfer'),onView:record('view'),...parentCallbacks});await act(async()=>{if(update){assert.ok(renderer);renderer.update(component);}else renderer=create(component);});assert.equal(JSON.stringify(st),before,'Actual render must preserve input bytes');return ()=>assert.equal(JSON.stringify(st),before,'Actual callbacks must preserve input bytes');
  }
  function scope(st,owner){const before=JSON.stringify(st);freeze(st);const result=calendarActivityScope(st,owner);assert.equal(JSON.stringify(st),before);return result;}
  function diagnostic(kind){assert.equal(diagnostics().length,kind?1:0);if(kind){const node=diagnostics()[0];assert.equal(node.props['data-profile-diagnostic'],kind);assert.equal(node.props.role,'status');assert.ok(node.findAllByType('h2').some(heading=>heading.props.id===node.props['aria-labelledby']));assert.equal(renderer.root.findAllByType('section')[0],node,'Diagnostic precedes calendar work');}}
  function selected(expectedTasks,expectedMeetings){assert.deepEqual(ids('task'),expectedTasks);assert.deepEqual(ids('meeting'),expectedMeetings);}
  async function openRow(kind,id){const row=rows(kind).find(node=>node.props['data-'+kind+'-id']===id);assert.ok(row);const target=row.findAllByType('button').find(node=>kind==='task'?node.props.className?.split(' ').includes('task-title'):node.props['aria-label']?.startsWith('Visa möte:'));assert.ok(target);await act(async()=>target.props.onClick());}
  function incompleteEmpty(){assert.match(content(),/synligt urval/i);assert.ok(!content().includes('Planera första kundmötet.'),'Missing profile cannot imply there are no CRM meetings');assert.ok(!content().includes('Inga öppna uppgifter. Planera nästa kundkontakt.'),'Missing profile cannot imply complete zero work');}

  await isolated('exact member ID wins over matching owner and identical display names for both tasks and meetings',async()=>{
   const st=work(fixture()),unchanged=await render(st);selected(['own-id','legacy-own'],['own-id','legacy-own']);diagnostic('');assert.equal(scope(st,nameA).profileId,a);await openRow('task','own-id');await openRow('meeting','own-id');assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]},{kind:'meeting',args:[st.meetings[0]]}]);unchanged();
  });
  await isolated('a mismatched operative alias shows the own linked profile and only actual-selected-alias legacy work',async()=>{
   const st=work(fixture({owner:nameB})),unchanged=await render(st);selected(['own-id','legacy-peer'],['own-id','legacy-peer']);diagnostic('mismatch');const s=scope(st,nameB);assert.equal(s.profileId,a);assert.equal(s.legacyOwner,nameB);assert.equal(s.personal,true);unchanged();
  });
  await isolated('missing operative ownership keeps own ID work without historic-alias or sentinel legacy fallback',async()=>{
   const st=work(fixture({owner:''})),unchanged=await render(st);selected(['own-id'],['own-id']);diagnostic('operational-missing');const s=scope(st,'_unassigned');assert.equal(s.profileId,a);assert.equal(s.legacyOwner,'');assert.equal(s.personal,true);unchanged();
  });
  await isolated('removed operative ownership keeps exact personal ID work and does not use the removed alias',async()=>{
   const st=work(fixture());st.settings.owners=[nameB];const unchanged=await render(st);selected(['own-id'],['own-id']);diagnostic('operational-missing');assert.equal(scope(st,'_unassigned').legacyOwner,'');unchanged();
  });
  await isolated('an unlisted account alias never adopts its stale legacy tasks or meetings',async()=>{
   const st=work(fixture({owner:'Syntetisk borttagen ansvarig'}));st.tasks.push(task('stale','','Syntetisk borttagen ansvarig'));st.meetings.push(meeting('stale','','Syntetisk borttagen ansvarig'));const unchanged=await render(st);selected(['own-id'],['own-id']);diagnostic('operational-missing');unchanged();
  });
  await isolated('member-linked history remains visible when the profile alias is no longer in the operative roster',async()=>{
   const st=work(fixture({owner:nameB}));st.settings.owners=[nameB];st.settings.sellerProfiles[0].active=false;const unchanged=await render(st);selected(['own-id','legacy-peer'],['own-id','legacy-peer']);diagnostic('mismatch');assert.equal(scope(st,nameB).profileId,a);unchanged();
  });
  await isolated('missing member link does not infer a profile from owner or display name and explains incomplete empty work',async()=>{
   const st=fixture({link:''});st.tasks=[task('peer-same-name',a)];st.meetings=[meeting('peer-same-name',a)];const unchanged=await render(st);selected([],[]);diagnostic('missing');assert.equal(scope(st,nameA).profileId,'');incompleteEmpty();unchanged();
  });
  await isolated('missing profile with a valid selected alias retains only blank-ID legacy records',async()=>{
   const st=work(fixture({link:''})),unchanged=await render(st);selected(['legacy-own'],['legacy-own']);diagnostic('missing');unchanged();
  });
  await isolated('missing both profile and operative alias excludes sentinel rows and explains incomplete work',async()=>{
   const st=work(fixture({link:'',owner:''})),unchanged=await render(st);selected([],[]);assert.equal(scope(st,'_unassigned').profileId,'');assert.equal(scope(st,'_unassigned').legacyOwner,'');assert.equal(diagnostics().length,1);incompleteEmpty();unchanged();
  });
  await isolated('pre-initialization keeps real valid-alias legacy work without accepting unrelated stable IDs',async()=>{
   const st=work(fixture({initialized:false})),unchanged=await render(st);selected(['legacy-own'],['legacy-own']);diagnostic('');assert.equal(scope(st,nameA).profileId,'');assert.equal(scope(st,nameA).legacyOwner,nameA);unchanged();
  });
  await isolated('pre-initialization missing ownership does not invent a name fallback',async()=>{
   const st=work(fixture({initialized:false,owner:''})),unchanged=await render(st);selected([],[]);assert.equal(scope(st,'_unassigned').legacyOwner,'');unchanged();
  });
  await isolated('inactive linked profile preserves exact ID history without activating or relinking it',async()=>{
   const st=work(fixture({inactive:true,owner:''})),unchanged=await render(st);selected(['own-id'],['own-id']);diagnostic('operational-missing');assert.equal(st.settings.sellerProfiles[0].active,false);unchanged();
  });
  for(const role of ['seller','reader','admin']){
   await isolated(role+' retains existing all-calendar reading instead of imposing Min dag team restrictions',async()=>{
    const st=work(fixture({role,link:'',owner:''})),unchanged=await render(st,'all');selected(st.tasks.map(t=>t.id),st.meetings.map(m=>m.id));diagnostic('');assert.equal(scope(st,'all').team,true);assert.equal(scope(st,'all').personal,false);unchanged();
   });
   await isolated(role+' explicit other operative alias selects that exact profile and its blank-ID legacy records',async()=>{
    const st=work(fixture({role})),unchanged=await render(st,nameB);selected(['peer-id-same-alias','legacy-peer'],['peer-id-same-alias','legacy-peer']);diagnostic('');const s=scope(st,nameB);assert.equal(s.personal,false);assert.equal(s.profileId,b);assert.equal(s.legacyOwner,nameB);unchanged();
   });
  }
  await isolated('an explicit alias absent from the roster cannot recover a retired profile or stale legacy record',async()=>{
   const st=work(fixture());st.settings.owners=[nameA];const unchanged=await render(st,nameB);selected([],[]);assert.equal(scope(st,nameB).profileId,'');assert.equal(scope(st,nameB).legacyOwner,'');unchanged();
  });
  await isolated('an explicit real roster alias with no profile still shows only its blank-ID legacy work',async()=>{
   const st=work(fixture());st.settings.sellerProfiles=st.settings.sellerProfiles.filter(p=>p.id!==b);const unchanged=await render(st,nameB);selected(['legacy-peer'],['legacy-peer']);assert.equal(scope(st,nameB).profileId,'');assert.equal(scope(st,nameB).legacyOwner,nameB);unchanged();
  });
  await isolated('a mounted calendar immediately follows current member, workspace data and a removed account link',async()=>{
   const first=work(fixture({owner:''})),unchanged=[];unchanged.push(await render(first));selected(['own-id'],['own-id']);
   const other=work(fixture({link:'b',owner:''}));other.viewer={...other.viewer,id:'synthetic-new-session',memberId:'synthetic-other-member'};other.settings.sellerProfiles[1].memberId='synthetic-other-member';unchanged.push(await render(other,'_unassigned',{update:true}));selected(['peer-id-same-alias'],['peer-id-same-alias']);
   const secondWorkspace=structuredClone(other);secondWorkspace.settings.sellerProfiles[1].memberId='';unchanged.push(await render(secondWorkspace,'_unassigned',{update:true}));selected([],[]);
   const restored=structuredClone(first);unchanged.push(await render(restored,'_unassigned',{update:true}));selected(['own-id'],['own-id']);for(const check of unchanged)check();assert.deepEqual(calls,[],'Identity/data changes must not write or navigate');
  });
  await isolated('reader preserves existing calendar observation controls without privileged repair, transfer or record mutation',async()=>{
   const st=work(fixture({role:'reader',owner:''})),unchanged=await render(st);selected(['own-id'],['own-id']);assert.equal(!!button('Uppgift'),true);assert.equal(!!button('Öppna Konton & roller'),false);assert.equal(renderer.root.findAllByType('input').length,1);assert.match(content(),/administratör/i);await openRow('task','own-id');await openRow('meeting','own-id');await click('Uppgift');await act(async()=>rows('task')[0].findByType('input').props.onCheckedChange());assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]},{kind:'meeting',args:[st.meetings[0]]},{kind:'createTask',args:[]},{kind:'task',args:[st.tasks[0]]}]);assert.equal(st.tasks[0].done,false);assert.equal(button('Byt mötesansvar')!==undefined,false);unchanged();
  });
  await isolated('administrator repair action opens existing accounts without changing calendar scope or records',async()=>{
   const st=work(fixture({role:'admin',owner:''})),unchanged=await render(st);diagnostic('operational-missing');await click('Öppna Konton & roller');assert.deepEqual(calls,[{kind:'view',args:['accounts']}]);unchanged();
  });
  await isolated('seller guidance has no privileged account shortcut and task completion only opens its actual activity',async()=>{
   const st=work(fixture({owner:''})),unchanged=await render(st);assert.equal(!!button('Öppna Konton & roller'),false);assert.match(content(),/administratör/i);const checkbox=rows('task')[0].findByType('input');await act(async()=>checkbox.props.onCheckedChange());assert.deepEqual(calls,[{kind:'task',args:[st.tasks[0]]}]);assert.equal(st.tasks[0].done,false);unchanged();
  });
  await isolated('administrator meeting transfer is available only for planned initialized meetings and observes the actual record',async()=>{
   const st=fixture({role:'admin'});st.meetings=[meeting('planned',a),meeting('done',a,nameA,{status:'done'}),meeting('cancelled',a,nameA,{status:'cancelled'}),meeting('legacy')];const unchanged=await render(st);assert.deepEqual(rows('meeting').map(row=>row.findAllByType('button').filter(node=>node.props.className?.includes('meeting-calendar-responsibility')).length),[1,0,0,1]);await click('Byt mötesansvar');await click('Förankra mötesansvar');assert.deepEqual(calls,[{kind:'transfer',args:[st.meetings[0]]},{kind:'transfer',args:[st.meetings[3]]}]);unchanged();
  });
  await isolated('busy state preserves existing create observation and disables task completion and meeting transfer controls',async()=>{
   const st=fixture({role:'admin'});st.tasks=[task('own',a)];st.meetings=[meeting('own',a)];const unchanged=await render(st,undefined,{busy:true});assert.notEqual(button('Uppgift').props.disabled,true);assert.equal(button('Byt mötesansvar').props.disabled,true);assert.equal(rows('task')[0].findByType('input').props.disabled,true);await click('Uppgift');assert.deepEqual(calls,[{kind:'createTask',args:[]}]);unchanged();
  });
  await isolated('meetings keep planned, completed and cancelled history sorted by full date and Swedish-local time',async()=>{
   const st=fixture();st.meetings=[meeting('late',a,nameA,{date:core.plusDays(today,1),time:'08:00'}),meeting('cancelled',a,nameA,{time:'09:30',status:'cancelled'}),meeting('done',a,nameA,{date:core.plusDays(today,-1),time:'17:00',status:'done'}),meeting('early',a,nameA,{time:'09:00'})];const unchanged=await render(st);selected([],['done','early','cancelled','late']);assert.match(content(),/Genomfört/);assert.match(content(),/Avbokat/);assert.match(content(),/09:30/);assert.ok(rows('meeting')[2].findAllByType('button')[0].props.className.includes('cancelled'));unchanged();
  });
  await isolated('case-insensitive meeting title and customer search preserve task selection and do not match owner names',async()=>{
   const st=fixture();st.tasks=[task('own',a)];st.meetings=[meeting('title',a,nameA,{title:'Behovsmöte Oktober'}),meeting('customer',a,nameA,{customerId:'synthetic-other-customer',title:'Återköp'})];const checks=[];checks.push(await render(st,undefined,{search:'OKTOBER'}));selected(['own'],['title']);checks.push(await render(st,undefined,{search:'kund BETA',update:true}));selected(['own'],['customer']);checks.push(await render(st,undefined,{search:nameA,update:true}));selected(['own'],[]);for(const check of checks)check();
  });
  await isolated('tasks exclude done work, preserve due-date ordering and cap the actual visible list at 100',async()=>{
   const st=fixture();st.tasks=[task('done',a,nameA,{due:core.plusDays(today,-5),done:true}),...Array.from({length:105},(_,i)=>task('open-'+i,a,nameA,{due:core.plusDays(today,105-i)}))];const unchanged=await render(st);assert.equal(ids('task').length,100);assert.deepEqual(ids('task'),Array.from({length:100},(_,i)=>'open-'+(104-i)));assert.equal(content().includes('Uppgift done'),false);unchanged();
  });
  await isolated('long real-limit profile, owner and customer labels stay exact and do not change identity matching',async()=>{
   const long='Syntetisk lång ansvarskoppling '+('Å'.repeat(118)),st=fixture({owner:long});st.settings.owners=[long,nameB];st.settings.sellerProfiles[0]={...st.settings.sellerProfiles[0],legacyOwnerName:long,displayName:'Syntetisk visning '+('Ö'.repeat(130))};st.customers[0].name='Syntetisk kund '+('Ä'.repeat(175));st.tasks=[task('own',a,long),task('peer',b,long),task('legacy','',long)];st.meetings=[meeting('own',a,long)];const unchanged=await render(st,long);selected(['own','legacy'],['own']);assert.ok(content().includes(st.customers[0].name));assert.ok(content().includes(st.settings.sellerProfiles[0].displayName));diagnostic('');unchanged();
  });

  // Locate complete production expressions. Their statements and conditionals
  // are transpiled unchanged; synthetic setters merely observe the outcome.
  const pageSource=readFileSync('app/page.tsx','utf8'),pageAst=ts.createSourceFile('page.tsx',pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),navigation=[],toolbar=[],calendarCallbacks=[],saveFunctions=[],inputLocks=[],submitLocks=[],readonlyStatuses=[];
  function parentContracts(node){if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(pageAst),attribute=name=>node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(pageAst)===name);
   const expression=name=>{const init=attribute(name)?.initializer;assert.ok(init&&ts.isJsxExpression(init)&&init.expression,'Expected full production expression '+name+' in '+tag);return init.expression.getText(pageAst);};
   if(tag==='SalesDashboard'){const init=attribute('onView')?.initializer;assert.ok(init&&ts.isJsxExpression(init)&&init.expression&&ts.isArrowFunction(init.expression));navigation.push(init.expression.getText(pageAst));}
   if(tag==='Choice'&&attribute('label')?.initializer&&ts.isStringLiteral(attribute('label').initializer)&&attribute('label').initializer.text==='Ansvarig'){const init=attribute('options')?.initializer;assert.ok(init&&ts.isJsxExpression(init)&&init.expression);toolbar.push(init.expression.getText(pageAst));}
   if(tag==='CalendarWork')calendarCallbacks.push(Object.fromEntries(['onMeeting','onTask','onCreateTask','onTransferMeeting','onView'].map(name=>[name,expression(name)])));
   if(tag==='fieldset'&&attribute('className')?.initializer&&ts.isStringLiteral(attribute('className').initializer)&&attribute('className').initializer.text==='form-input-lock')inputLocks.push(expression('disabled'));
   if(tag==='Button'&&attribute('type')?.initializer&&ts.isStringLiteral(attribute('type').initializer)&&attribute('type').initializer.text==='submit')submitLocks.push(expression('disabled'));
   if(tag==='GenericFormSaveStatus')readonlyStatuses.push(expression('readonly'));
  }if(ts.isFunctionDeclaration(node)&&node.name?.text==='save')saveFunctions.push(node.getText(pageAst));ts.forEachChild(node,parentContracts);}parentContracts(pageAst);for(const expressions of [navigation,toolbar,calendarCallbacks,saveFunctions,inputLocks,submitLocks,readonlyStatuses])assert.equal(expressions.length,1,'Exactly one production parent contract');
  const parentModule=resolve(directory,'actual-calendar-parent.mjs');writeFileSync(parentModule,ts.transpileModule('export function actualResultNavigation(st,personalOwner,setOwner,setSearch,setFilter,setView){return ('+navigation[0]+');} export function actualToolbarOptions(st,owner,view,personalOwner){return ('+toolbar[0]+');} export function actualCalendarCallbacks(openActivity,open,create,setMeetingTransferId,navigate){return {'+Object.entries(calendarCallbacks[0]).map(([name,value])=>name+':('+value+')').join(',')+'};} export function actualFormReadOnly(st,busy,recordConflict,historicalBlocked){return {inputs:('+inputLocks[0]+'),submit:('+submitLocks[0]+'),status:('+readonlyStatuses[0]+')};} export function actualParentSave(st,saving,activeSpace,space,toast){'+saveFunctions[0]+';return save;}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);const parent=await import(pathToFileURL(parentModule).href);
  function resultNavigation(st,view,scope){const before=JSON.stringify(st);freeze(st);const selected={owner:'old-owner',search:'old-search',filter:'old-filter',view:'overview'},observed=[],set=key=>value=>{selected[key]=value;observed.push({key,value});};parent.actualResultNavigation(st,dashboard.personalOwner,set('owner'),set('search'),set('filter'),set('view'))(view,scope);assert.equal(JSON.stringify(st),before);assert.deepEqual(observed,[{key:'owner',value:selected.owner},{key:'search',value:''},...(view==='deals'?[{key:'filter',value:'open'}]:[]),{key:'view',value:view}]);return selected;}
  function toolbarOptions(st,owner,view='calendar'){const before=JSON.stringify(st);freeze(st);const options=parent.actualToolbarOptions(st,owner,view,dashboard.personalOwner);assert.equal(JSON.stringify(st),before);assert.equal(new Set(options.map(option=>option.id)).size,options.length,'No duplicate actual toolbar choices');return options;}
  await isolated('actual personal result-to-calendar navigation uses missing account sentinel without a second scope click',async()=>{
   const st=work(fixture({owner:''})),selectedScope=dashboard.resultOperationalOwner(st,dashboard.personalResultScope(st));assert.equal(selectedScope,nameA);const next=resultNavigation(st,'calendar',selectedScope);assert.equal(next.owner,'_unassigned');assert.equal(next.view,'calendar');const unchanged=await render(st,next.owner);selected(['own-id'],['own-id']);diagnostic('operational-missing');assert.deepEqual(calls,[]);unchanged();
  });
  await isolated('actual result-to-calendar navigation separates current account alias from historic result alias',async()=>{
   const st=work(fixture({owner:nameB})),next=resultNavigation(st,'calendar',dashboard.resultOperationalOwner(st,dashboard.personalResultScope(st)));assert.equal(next.owner,nameB);const unchanged=await render(st,next.owner);selected(['own-id','legacy-peer'],['own-id','legacy-peer']);diagnostic('mismatch');assert.deepEqual(calls,[]);unchanged();
  });
  await isolated('actual admin team-result callback keeps calendar all while seller or reader injected result-all remains personal',async()=>{
   for(const role of ['admin','seller','reader']){const st=work(fixture({owner:'',role})),next=resultNavigation(st,'calendar','all');assert.equal(next.owner,role==='admin'?'all':'_unassigned');const unchanged=await render(st,next.owner);selected(role==='admin'?st.tasks.map(t=>t.id):['own-id'],role==='admin'?st.meetings.map(m=>m.id):['own-id']);unchanged();await unmount();}assert.deepEqual(calls,[]);
  });
  await isolated('actual result callback preserves other operational-view scopes, clears search and retains deal filter contract',async()=>{
   const st=fixture({owner:nameB});for(const view of ['deals','orders','care','settings']){const next=resultNavigation(st,view,nameA);assert.equal(next.owner,nameA);assert.equal(next.view,view);assert.equal(next.search,'');assert.equal(next.filter,view==='deals'?'open':'old-filter');}assert.equal(resultNavigation(st,'orders','').owner,'_unassigned');
  });
  await isolated('actual calendar toolbar always offers the personal sentinel even after all or explicit other selection',async()=>{
   for(const role of ['seller','reader','admin'])for(const selected of ['all',nameB,'_unassigned']){const st=fixture({owner:'',role}),options=toolbarOptions(st,selected);assert.equal(options.filter(option=>option.id==='_unassigned').length,1);assert.equal(options.find(option=>option.id==='_unassigned').label,'Mina aktiviteter');assert.ok(options.some(option=>option.id==='all'));assert.deepEqual(options.filter(option=>[nameA,nameB].includes(option.id)).map(option=>option.id),[nameA,nameB]);}
  });
  await isolated('actual calendar toolbar labels the valid own account alias and never uses the historical profile alias as personal',async()=>{
   const st=fixture({owner:nameB}),options=toolbarOptions(st,'all');assert.match(options.find(option=>option.id===nameB).label,/Mina aktiviteter/);assert.ok(options.find(option=>option.id===nameB).label.includes(nameB));assert.equal(options.find(option=>option.id===nameA).label,nameA);assert.equal(options.some(option=>option.id==='_unassigned'),false);
  });
  await isolated('actual other-view toolbar choices keep their established labels and sentinel condition',async()=>{
   const st=fixture({owner:''});for(const view of ['customers','care','deals']){assert.deepEqual(toolbarOptions(st,'all',view),[{id:'all',label:'Alla ansvariga'},{id:nameA,label:nameA},{id:nameB,label:nameB}]);assert.deepEqual(toolbarOptions(st,'_unassigned',view),[{id:'_unassigned',label:'Välj ansvarig'},{id:'all',label:'Alla ansvariga'},{id:nameA,label:nameA},{id:nameB,label:nameB}]);}
  });
  await isolated('actual CalendarWork parent callback expressions preserve task, meeting, create, transfer and repair routing',async()=>{
   const st=work(fixture({role:'admin',owner:''})),record=kind=>(...args)=>calls.push({kind,args}),parentCallbacks=parent.actualCalendarCallbacks(record('activity'),record('open'),record('create'),record('transferId'),record('navigate')),unchanged=await render(st,undefined,{parentCallbacks});await openRow('task','own-id');await openRow('meeting','own-id');await click('Uppgift');await click('Byt mötesansvar');await click('Öppna Konton & roller');assert.deepEqual(calls,[{kind:'activity',args:[st.tasks[0]]},{kind:'open',args:['meeting',st.meetings[0]]},{kind:'create',args:['task']},{kind:'transferId',args:['own-id']},{kind:'navigate',args:['accounts']}]);unchanged();
  });
  await isolated('actual parent form expressions keep reader fields and submission disabled with truthful readonly status',async()=>{
   for(const role of ['reader','seller','admin']){const st=fixture({role});freeze(st);assert.deepEqual(parent.actualFormReadOnly(st,false,false,false),{inputs:role==='reader',submit:role==='reader',status:role==='reader'});assert.deepEqual(parent.actualFormReadOnly(st,true,false,false),{inputs:true,submit:true,status:role==='reader'});assert.deepEqual(parent.actualFormReadOnly(st,false,true,false),{inputs:role==='reader',submit:true,status:role==='reader'});assert.deepEqual(parent.actualFormReadOnly(st,false,false,true),{inputs:role==='reader',submit:true,status:role==='reader'});}
  });
  await isolated('the entire actual parent save function rejects reader submission before any HTTP or private flush',async()=>{
   const st=fixture({role:'reader'}),before=JSON.stringify(st);freeze(st);const observed=[],saving={current:false},activeSpace={current:'synthetic'},toast={error:message=>observed.push({kind:'error',message})},save=parent.actualParentSave(st,saving,activeSpace,'synthetic',toast);
   assert.equal(await save('task',{id:'synthetic-task'}),false);assert.deepEqual(observed,[{kind:'error',message:'Ditt konto har läsbehörighet.'}]);observed.length=0;
   assert.equal(await save('task',{id:'synthetic-task'},false,{onFailure:(status,message)=>observed.push({kind:'failure',status,message})}),false);assert.deepEqual(observed,[{kind:'failure',status:403,message:'Ditt konto har läsbehörighet.'}]);assert.equal(JSON.stringify(st),before);assert.equal(saving.current,false);assert.equal(fetchCalls.length,0);
  });
  console.log('PASS Calendar profile link: '+count+' actual React component/domain/parent-expression cases; immutable input, zero HTTP; synthetic visual/callback boundaries, no browser, personal login or staff acceptance claimed.');return {cases:count,compiledDomains:compiled.size-1,httpRequests:fetchCalls.length};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of [['fetch',fetchDescriptor],['IS_REACT_ACT_ENVIRONMENT',actDescriptor]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
