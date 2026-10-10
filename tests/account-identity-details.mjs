import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

// Execute the real account workspace, identity display, read validation, React
// effects and profile/review domains. Only visual primitives and transport are
// synthetic. No server HTTP, real account, personal login or staff acceptance is
// exercised here. Assessment cases forbid even a synthetic POST; explicit save
// contract cases below use only the controlled in-memory transport.
export async function verifyAccountIdentityDetails(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/account-identity-'));
 const compiled=new Set(),target=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs')),helpers=resolve(directory,'helpers.mjs');
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Input=host('input'),SheetContent=host('aside'),SheetHeader=host('header'),SheetTitle=host('h2'),SheetDescription=host('p');
export const Checkbox=props=>React.createElement('input',{...props,type:'checkbox'});
export const Sheet=({open,children})=>open?React.createElement('div',{'data-sheet':true},children):null;
export const BusinessField=({label,children})=>React.createElement('label',null,label,children);
export const Pick=({label,items,...props})=>React.createElement('select',{'aria-label':label,...props},items.map(item=>React.createElement('option',{key:item.id,value:item.id},item.label)));
export const AccountReviewWork=()=>null;
export const toast={success:value=>globalThis.__accountIdentityToasts.push({kind:'success',value}),warning:value=>globalThis.__accountIdentityToasts.push({kind:'warning',value})};
`);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');
  assert.ok(file.startsWith('lib/')||['components/team-accounts.tsx','components/account-identity-details.tsx'].includes(file),'Unexpected source boundary '+file);
  const outputPath=target(file);if(compiled.has(file))return outputPath;compiled.add(file);
  let output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(file==='components/team-accounts.tsx'&&specifier==='./account-identity-details')dependency=compile('components/account-identity-details.tsx');
   else if(specifier==='sonner'||specifier.startsWith('@/components/')||file==='components/team-accounts.tsx'&&specifier.startsWith('./'))dependency=helpers;
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(outputPath),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });
  mkdirSync(dirname(outputPath),{recursive:true});writeFileSync(outputPath,output);return outputPath;
 }
 const descriptors=Object.fromEntries(['fetch','document','HTMLElement','IS_REACT_ACT_ENVIRONMENT','__accountIdentityToasts'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
 const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 let renderer,calls=[],refreshes=0,allowSave=false,count=0,assessmentCases=0,saveContractCases=0,readRequests=0,writeRequests=0;
 const content=()=>text(renderer.toJSON());
 const sections=()=>renderer.root.findAllByType('section');
 const section=heading=>sections().find(node=>node.findAllByType('h2').some(title=>text(title)===heading));
 const registered=()=>section('Registrerade CRM-konton');
 const row=id=>registered().findAll(node=>node.type==='article'&&node.props.className?.split(' ').includes('account-registered')).find(node=>text(node).includes('Konto-ID: '+id));
 const roster=()=>renderer.root.findAll(node=>node.type==='div'&&node.props.className==='account-roster')[0];
 const button=label=>renderer.root.findAllByType('button').find(node=>text(node)===label);
 const picker=label=>renderer.root.findAllByType('select').find(node=>node.props['aria-label']===label);
 const unchangedInputs=[];
 async function drain(){for(let index=0;index<6;index++)await Promise.resolve();}
 async function unmount(){if(renderer){await act(async()=>{renderer.unmount();await drain();});renderer=null;}}
 async function click(node){assert.ok(node,'Expected visible action');assert.ok(!node.props.disabled,'Expected enabled action');await act(async()=>{node.props.onClick();await drain();});}
 async function respond(call,data,status=200){assert.ok(call);await act(async()=>{call.reply.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));await drain();});}
 async function mount(st,accounts,{pending=false,strict=false}={}){
  unchangedInputs.push({value:st,before:JSON.stringify(st)},{value:accounts,before:JSON.stringify(accounts)});freeze(st);freeze(accounts);
  await act(async()=>{const node=React.createElement(TeamAccounts,{st,refresh:async()=>{refreshes++;}});renderer=create(strict?React.createElement(React.StrictMode,null,node):node);await drain();});
  if(!pending)await respond(calls.at(-1),accounts);
 }
 async function update(st){unchangedInputs.push({value:st,before:JSON.stringify(st)});freeze(st);await act(async()=>{renderer.update(React.createElement(TeamAccounts,{st,refresh:async()=>{refreshes++;}}));await drain();});}
 async function isolated(label,test,{save=false,expectedRefreshes=0}={}){
  await unmount();calls=[];refreshes=0;allowSave=save;unchangedInputs.length=0;globalThis.__accountIdentityToasts=[];
  await test();await unmount();for(const {value,before} of unchangedInputs)assert.equal(JSON.stringify(value),before,'Input bytes must remain unchanged in '+label);
  if(!save){assert.equal(calls.some(call=>call.method!=='GET'),false,'Assessment cannot write in '+label);assert.equal(refreshes,expectedRefreshes,'Only an explicitly exercised existing reload may refresh work in '+label);assert.equal(globalThis.__accountIdentityToasts.length,0);assessmentCases++;}else saveContractCases++;
  count++;console.log('PASS account identity: '+label);
 }
 let TeamAccounts,core,profiles,dashboard,reviewSchema;
 const a='e8f193d5-669d-468a-b1b1-efd272cf0001',b='e8f193d5-669d-468a-b1b1-efd272cf0002',aliasA='Syntetiskt kundansvar A',aliasB='Syntetiskt kundansvar B',aliasOther='Syntetiskt annat arbetsyteansvar';
 const account=(id='synthetic-member-a',owner=aliasA,extra={})=>({id,email:id+'@example.com',name:'Samma syntetiska visningsnamn',role:'seller',owner,active:true,connected:true,expectedAccount:'a'.repeat(64),...extra});
 const profile=(id=a,alias=aliasA,memberId='',active=true)=>({id,legacyOwnerName:alias,displayName:'Samma syntetiska visningsnamn',memberId,active,linkHistory:[],retirementHistory:[]});
 function fixture({owners=[aliasA,aliasB],sellerProfiles=[profile(),profile(b,aliasB)],initialized=true,viewer={}}={}){
  const st=core.emptyState();st.viewer={id:'synthetic-admin-user',memberId:'synthetic-admin-member',email:'synthetic-admin@example.com',name:'Syntetisk administratör',role:'admin',owner:'',...viewer};
  st.settings=core.SettingsSchema.parse({...st.settings,owners,sellerProfiles,sellerProfilesInitialized:initialized});return st;
 }
 const personal=(st,member)=>({...st,viewer:{id:'synthetic-user-'+member.id,memberId:member.id,email:member.email,name:member.name,role:member.role,owner:member.owner}});
 try{
  for(const [key,value] of Object.entries({IS_REACT_ACT_ENVIRONMENT:true,document:{activeElement:null},HTMLElement:class {},__accountIdentityToasts:[]}))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(url,options={})=>{
   const method=options.method||'GET';assert.ok(url==='/api/crm/members'||url.startsWith('/api/crm/account-change-review?'),'Unexpected endpoint '+url);
   assert.ok(options.signal instanceof AbortSignal,'Account requests must retain cancellation');
   if(method!=='GET'){assert.ok(allowSave,'Read-only assessment cannot POST');assert.equal(url,'/api/crm/members');assert.equal(method,'POST');writeRequests++;}else{assert.equal(options.cache,'no-store');readRequests++;}
   const reply=deferred(),call={url,method,body:options.body?JSON.parse(options.body):null,signal:options.signal,reply};calls.push(call);return reply.promise;
  }});
  ({TeamAccounts}=await import(pathToFileURL(compile('components/team-accounts.tsx')).href));
  core=await import(pathToFileURL(compile('lib/crm.ts')).href);profiles=await import(pathToFileURL(compile('lib/seller-profiles.ts')).href);dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href);reviewSchema=await import(pathToFileURL(compile('lib/account-change-review-schema.ts')).href);

  await isolated('a registered login link cannot substitute for a missing exact seller member link',async()=>{
   const st=fixture(),member=account();profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.match(actual,/Registrerat inloggningskonto kopplat/);assert.match(actual,/Ingen säljarprofil kopplad till konto-ID:t/);assert.ok(!actual.includes('Har loggat in'));assert.ok(!actual.includes('Profil-ID: '+a));
   const details=row(member.id).findByProps({'aria-label':'Kontokopplingar'});assert.deepEqual(details.findAllByType('dt').map(text),['Inloggningskonto','Kundansvar','Säljarprofil']);
   assert.equal(dashboard.personalResultScope(personal(st,member)),'');assert.match(content(),/själv.*inloggning/i);
  });
  await isolated('member ID wins over identical display names when the exact profile disagrees with operational ownership',async()=>{
   const st=fixture({sellerProfiles:[profile(),profile(b,aliasB,'synthetic-member-a')]}),member=account();profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.match(actual,new RegExp('Profil-ID: '+b));assert.ok(!actual.includes('Profil-ID: '+a));assert.match(actual,/Kundansvar skiljer sig från säljarprofilen/);assert.ok(actual.includes(aliasA)&&actual.includes(aliasB));
   assert.equal(dashboard.personalOwner(personal(st,member)),aliasA);assert.equal(dashboard.personalResultScope(personal(st,member)),b);
  });
  await isolated('an exact profile remains visible when an administrator has no operational owner',async()=>{
   const st=fixture({sellerProfiles:[profile(a,aliasA,'synthetic-member-a'),profile(b,aliasB)]}),member=account(undefined,'',{role:'admin'});profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.ok(actual.includes('Profil-ID: '+a));assert.ok(!actual.includes('Ingen personlig säljarprofil'));assert.ok(!actual.includes('Ingen säljarprofil kopplad'));assert.equal(dashboard.personalOwner(personal(st,member)),'');assert.equal(dashboard.personalResultScope(personal(st,member)),a);
  });
  await isolated('inactive accounts are still listed under their explicit customer responsibility and exact profile',async()=>{
   const st=fixture({sellerProfiles:[profile(a,aliasA,'synthetic-member-a'),profile(b,aliasB)]}),member=account(undefined,undefined,{active:false});profiles.validateSellerProfileReferences(st);await mount(st,[member]);
   assert.ok(text(roster()).includes(member.id));assert.match(text(row(member.id)),/Inaktiverat/);assert.ok(text(row(member.id)).includes('Profil-ID: '+a));assert.ok(!text(roster()).includes('Säljarprofil utan konto'));
  });
  await isolated('historical inactive exact profiles are retained without rewriting current workspace responsibility',async()=>{
   const st=fixture({owners:[aliasB],sellerProfiles:[profile(a,aliasA,'synthetic-member-a',false),profile(b,aliasB)]}),member=account(undefined,undefined,{role:'admin'});profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.ok(actual.includes('Profil-ID: '+a));assert.match(actual,/Inaktiv profil; kontokopplingen finns kvar/);assert.ok(actual.includes(aliasA));assert.equal(dashboard.personalOwner(personal(st,member)),'');assert.equal(dashboard.personalResultScope(personal(st,member)),a);
  });
  await isolated('unreviewed seller profiles are described as unreviewed instead of inventing an exact missing link',async()=>{
   const st=fixture({sellerProfiles:[],initialized:false}),member=account();profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.match(actual,/Säljarprofilerna är inte granskade i den här arbetsytan/);assert.ok(!actual.includes('Ingen säljarprofil kopplad till konto-ID:t'));assert.equal(dashboard.personalResultScope(personal(st,member)),aliasA);
  });
  await isolated('the unreviewed role guide and seller/manager editor describe existing legacy sales scope truthfully',async()=>{
   const st=fixture({sellerProfiles:[],initialized:false}),member=account();await mount(st,[member]);
   const guide=renderer.root.findAll(node=>node.type==='div'&&node.props.className==='account-role-guide')[0];assert.match(text(guide),/äldre kundansvar för personliga mål och försäljning/);assert.ok(!text(guide).includes('kräver en separat granskad säljarprofil'));
   await click(row(member.id).findAllByType('button')[0]);const callout=()=>renderer.root.findAll(node=>node.type==='div'&&node.props.className==='biz-callout')[0];assert.match(text(callout()),/äldre kundansvar för personliga mål och försäljning/);
   await act(async()=>picker('Roll och arbetsvy').props.onChange('manager'));assert.match(text(callout()),/äldre kundansvar för personliga mål och försäljning/);assert.equal(calls.length,1,'An increase in role capability does not start the reduction-review or a save.');
  });
  await isolated('an operational alias outside this workspace is explicitly qualified and never matched by display name',async()=>{
   const st=fixture(),member=account('synthetic-other-member',aliasOther,{role:'admin'});profiles.validateSellerProfileReferences(st);await mount(st,[member]);const actual=text(row(member.id));
   assert.ok(actual.includes(aliasOther));assert.match(actual,/finns inte.*arbetsytan|inte.*aktuell.*arbetsyta/i);assert.match(actual,/Ingen säljarprofil kopplad till konto-ID:t/);assert.equal(dashboard.personalOwner(personal(st,member)),'');assert.equal(dashboard.personalResultScope(personal(st,member)),'');
  });
  await isolated('defensive multiple active accounts sharing an alias show every member rather than selecting the first',async()=>{
   // Permitted by the strict GET shape, while ordinary atomic member writes
   // prevent assigning a second active account to the same owner alias.
   const st=fixture(),first=account(),second=account('synthetic-member-b');await mount(st,[first,second]);const actual=text(roster());
   assert.ok(actual.includes(first.id)&&actual.includes(second.id));assert.ok(actual.includes(first.email)&&actual.includes(second.email));assert.match(actual,/Flera aktiva konton har samma kundansvar/);assert.match(actual,/inget konto väljs automatiskt/i);
  });
  await isolated('defensive ambiguous exact links are exposed without arbitrarily choosing a stable profile ID',async()=>{
   // This raw display fixture is rejected by the actual seller-profile domain;
   // it is not a valid persisted CRM state or a newly allowed account mapping.
   const st=fixture({sellerProfiles:[profile(a,aliasA,'synthetic-member-a'),profile(b,aliasB,'synthetic-member-a')]});assert.throws(()=>profiles.validateSellerProfileReferences(st),/dubbla/);await mount(st,[account()]);const actual=text(row('synthetic-member-a'));
   assert.match(actual,/Flera säljarprofiler/);assert.ok(actual.includes('Profil-ID: '+a)&&actual.includes('Profil-ID: '+b),'Every ambiguous exact link is exposed, rather than silently choosing the first.');
  });
  await isolated('missing optional login metadata remains unknown rather than being normalized to disconnected',async()=>{
   const st=fixture(),member=account();delete member.connected;await mount(st,[member]);const actual=text(row(member.id));
   assert.match(actual,/Inloggningskopplingen framgår inte av kontolistan/);assert.ok(!actual.includes('Registrerat inloggningskonto kopplat'));assert.ok(!actual.includes('Inget registrerat inloggningskonto kopplat'));
  });
  for(const role of ['production','print','warehouse','reader','admin'])await isolated('a missing seller profile is neutral for the '+role+' role without customer responsibility',async()=>{
   const st=fixture(),member=account('synthetic-'+role,'',{role,connected:false});await mount(st,[member]);const actual=text(row(member.id));
   assert.match(actual,/Inget registrerat inloggningskonto kopplat/);assert.match(actual,/Säljarprofil är inget krav för kontots roll/);assert.ok(!actual.includes('Inväntar första inloggning'));
  });

  await isolated('unresolved and failed account reads never manufacture ready account/profile assessment',async()=>{
   const st=fixture();await mount(st,[],{pending:true});assert.equal(roster(),undefined);assert.equal(registered().findAll(node=>node.props['aria-label']==='Kontokopplingar').length,0);assert.match(content(),/Hämtar/);
   await respond(calls[0],{error:'Syntetiskt läshinder'},503);assert.equal(roster(),undefined);assert.match(content(),/Syntetiskt läshinder/);assert.equal(row('synthetic-member-a'),undefined);assert.ok(button('Förbered nytt konto').props.disabled);
  });
  await isolated('invalid or duplicated account identity responses fail the real read schema before displaying any identity card',async()=>{
   await mount(fixture(),[],{pending:true});await respond(calls[0],[account(),account()]);assert.equal(roster(),undefined);assert.match(content(),/oväntat format/);assert.equal(row('synthetic-member-a'),undefined);
  });
  await isolated('a late abandoned identity read cannot populate the new administrator session',async()=>{
   const old=fixture(),next=fixture({viewer:{id:'synthetic-second-admin-user',memberId:'synthetic-second-admin-member'}});await mount(old,[account()],{pending:true});const abandoned=calls[0];await update(next);assert.equal(abandoned.signal.aborted,true);assert.equal(calls.length,2);
   await respond(abandoned,[account('synthetic-old-private-member')]);assert.ok(!content().includes('synthetic-old-private-member'));assert.equal(roster(),undefined);await respond(calls[1],[account('synthetic-current-member')]);assert.ok(content().includes('synthetic-current-member'));assert.ok(!content().includes('synthetic-old-private-member'));
  });
  await isolated('changing only membership hides loaded private account details and clears the old editor before the new read finishes',async()=>{
   const st=fixture(),member=account('synthetic-first-membership-row');await mount(st,[member]);await click(row(member.id).findAllByType('button')[0]);assert.equal(renderer.root.findAllByType('aside').length,1);
   await update(fixture({viewer:{memberId:'synthetic-replacement-admin-member'}}));assert.equal(calls.length,2);assert.equal(roster(),undefined);assert.ok(!content().includes(member.email));assert.equal(renderer.root.findAllByType('aside').length,0);
   await respond(calls[1],[account('synthetic-replacement-visible-row')]);assert.ok(content().includes('synthetic-replacement-visible-row'));assert.ok(!content().includes(member.email));
  });
  await isolated('losing the admin role hides loaded account diagnostics and ignores a later cancelled read',async()=>{
   const old=fixture();await mount(old,[account('synthetic-private-admin-row')]);assert.ok(content().includes('synthetic-private-admin-row'));
   await click(button('Hämta aktuell kontolista'));const pending=calls.at(-1);await update(fixture({viewer:{role:'seller'}}));assert.equal(renderer.toJSON(),null);assert.equal(pending.signal.aborted,true);await respond(pending,[account('synthetic-late-admin-row')]);assert.equal(renderer.toJSON(),null);
  },{expectedRefreshes:1});
  await isolated('the account form explicitly edits customer responsibility rather than the separate stable seller member link',async()=>{
   const st=fixture({sellerProfiles:[profile(a,aliasA,'synthetic-member-a'),profile(b,aliasB)]}),member=account();await mount(st,[member]);await click(row(member.id).findAllByType('button')[0]);const control=picker('Kundansvar för kontot');assert.ok(control);assert.equal(control.props.value,aliasA);assert.ok(control.findAllByType('option').some(option=>option.props.value===aliasB));assert.ok(!control.findAllByType('option').some(option=>option.props.value===a||option.props.value===b));
   assert.match(content(),/Mål & inställningar/);assert.ok(!content().includes('Kopplad säljarprofil'));await act(async()=>control.props.onChange(aliasB));assert.equal(picker('Kundansvar för kontot').props.value,aliasB);assert.equal(st.settings.sellerProfiles[0].memberId,member.id);assert.equal(calls.length,1);
  });
  await isolated('an unmapped customer responsibility prepares an empty person instead of guessing identity or administrator rights',async()=>{
   await mount(fixture(),[]);const prepare=renderer.root.findAllByType('button').find(node=>node.props['aria-label']==='Förbered konto med kundansvar '+aliasA);await click(prepare);
   const nameField=renderer.root.findAllByType('label').find(node=>text(node).startsWith('Namn')),emailField=renderer.root.findAllByType('label').find(node=>text(node).startsWith('Personlig inloggningsadress'));
   assert.equal(nameField.findByType('input').props.value,'');assert.equal(emailField.findByType('input').props.value,'');assert.equal(picker('Roll och arbetsvy').props.value,'seller');assert.equal(picker('Kundansvar för kontot').props.value,aliasA);assert.ok(button('Spara CRM-konto').props.disabled);assert.equal(calls.length,1);
  });
  await isolated('owner metadata save retains the existing exact payload and one-request double-click guard',async()=>{
   const st=fixture({sellerProfiles:[profile(a,aliasA,'synthetic-member-a'),profile(b,aliasB)]}),member=account();await mount(st,[member]);await click(row(member.id).findAllByType('button')[0]);await act(async()=>picker('Kundansvar för kontot').props.onChange(aliasB));const save=button('Spara CRM-konto');assert.ok(!save.props.disabled);await act(async()=>{save.props.onClick();save.props.onClick();await drain();});
   const writes=calls.filter(call=>call.method==='POST');assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{email:member.email,name:member.name,role:member.role,owner:aliasB,active:true});assert.equal(calls.some(call=>call.url.startsWith('/api/crm/account-change-review')),false);
   await respond(writes[0],{ok:true});const reread=calls.at(-1);assert.equal(reread.method,'GET');await respond(reread,[{...member,owner:aliasB}]);assert.equal(refreshes,1);assert.match(content(),/sparat och översikten har uppdaterats/);assert.equal(st.settings.sellerProfiles[0].memberId,member.id);
  },{save:true});
  await isolated('an account-rights reduction still requires the existing reviewed server envelope and explicit confirmation',async()=>{
   const st=fixture(),member=account('synthetic-production-member','',{role:'production'});await mount(st,[member]);await click(row(member.id).findAllByType('button')[0]);await act(async()=>picker('Roll och arbetsvy').props.onChange('reader'));
   const request=calls.at(-1);assert.equal(request.method,'GET');const query=new URL(request.url,'https://synthetic.invalid').searchParams;assert.deepEqual(Object.fromEntries(query),{memberId:member.id,role:'reader',active:'true'});assert.ok(button('Spara CRM-konto').props.disabled);
   const review=reviewSchema.AccountChangeReviewSchema.parse({expectedContext:'b'.repeat(64),expectedAccount:member.expectedAccount,target:{memberId:member.id,name:member.name,role:member.role,active:true},requested:{role:'reader',active:true},workspaces:[{id:'live',jobCount:0,issueCount:0,unresolvedCount:0}],blocked:false,reason:''});await respond(request,review);assert.ok(button('Spara CRM-konto').props.disabled);
   const confirm=renderer.root.findAllByType('input').find(node=>node.props.type==='checkbox'&&node.props.id);assert.ok(confirm);await act(async()=>confirm.props.onCheckedChange(true));await click(button('Spara CRM-konto'));const post=calls.at(-1);assert.equal(post.method,'POST');assert.deepEqual(post.body,{email:member.email,name:member.name,role:'reader',owner:'',active:true,accountReview:{memberId:member.id,expectedAccount:member.expectedAccount,expectedContext:review.expectedContext,confirmed:true}});
   await respond(post,{ok:true});await respond(calls.at(-1),[{...member,role:'reader'}]);assert.equal(refreshes,1);assert.equal(calls.filter(call=>call.method==='POST').length,1);
  },{save:true});

  console.log('PASS account identity: '+count+' actual React workspace/identity/schema/domain cases; '+assessmentCases+' immutable read-only assessments and '+saveContractCases+' controlled save contracts; transport/visual boundaries synthetic, no personal login or staff acceptance claimed.');
  return {cases:count,assessmentCases,saveContractCases,syntheticReadRequests:readRequests,syntheticWriteRequests:writeRequests,compiledModules:compiled.size,actualHttpRequests:0};
 }finally{await unmount();rmSync(directory,{recursive:true,force:true});for(const [key,descriptor] of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
