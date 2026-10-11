import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

export const profileA='da746101-f76b-4ec7-9f44-90d7e9c5a001',profileB='da746101-f76b-4ec7-9f44-90d7e9c5a002';
export const nameA='Syntetiskt kundansvar A',nameB='Syntetiskt kundansvar B',removedName='Syntetiskt borttaget kundansvar',memberId='synthetic-picker-member';

// Fictional records pass the actual reference/identity validators before any
// rendering. Equal profile display names cannot identify the viewing member.
export function customerPickerScopeFixture(core,{link='b',owner=nameA,role='seller',initialized=true,inactive=false,member=memberId,owners=[nameA,nameB],crowded=false}={}){
 const st=core.emptyState();st.viewer={id:'synthetic-picker-session',memberId:member,name:'Syntetisk person',email:'synthetic-picker@example.test',owner,role};
 st.settings.owners=owners;st.settings.sellerProfilesInitialized=initialized;
 st.settings.sellerProfiles=initialized?[
  {id:profileA,legacyOwnerName:nameA,displayName:'Samma syntetiska visningsnamn',memberId:link==='a'?memberId:'',active:true,linkHistory:[],retirementHistory:[]},
  {id:profileB,legacyOwnerName:nameB,displayName:'Samma syntetiska visningsnamn',memberId:link==='b'?memberId:'',active:!inactive,linkHistory:[],retirementHistory:[]}
 ]:[];
 const customer=(id,name,profile='',assigned=nameA)=>core.CustomerSchema.parse({id,name,contact:'Syntetisk kontakt '+id,email:id+'@example.test',organizationNumber:'SYNTHETIC-'+id,owner:assigned,ownerProfileId:initialized?profile:'',status:'active'});
 st.customers=crowded?[
  ...Array.from({length:30},(_,index)=>{const suffix=String(index).padStart(2,'0');return customer('profile-a-'+suffix,'A Syntetisk främmande kund '+suffix,profileA,nameA)}),
  customer('profile-b','Z Syntetisk egen kund',profileB,nameB)
 ]:[
  ...(initialized?[customer('profile-a','A Syntetisk profilkund A',profileA,nameA),customer('profile-b','Z Syntetisk profilkund B',profileB,nameB)]:[]),
  customer('legacy-a','B Syntetisk äldre kund A'),customer('legacy-b','Y Syntetisk äldre kund B','',nameB),
  customer('removed','C Syntetisk borttaget ansvar','',removedName),customer('sentinel','D Syntetisk ogiltigt ansvar','','_unassigned')
 ];
 return core.normalizeState(st);
}

// Complete production component and imported domains execute unchanged.
// Only visual primitives are adapters; no HTTP, browser or account proof.
export async function verifyCustomerPickerScope(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/customer-picker-scope-')),helpers=resolve(directory,'helpers.mjs');
 const compiled=new Set(),sourceBytes=new Map(),toTarget=file=>resolve(directory,file.replace(/\.tsx?$/,'.mjs'));
 const remember=file=>{const bytes=readFileSync(file);if(sourceBytes.has(file))assert.deepEqual(bytes,sourceBytes.get(file));else sourceBytes.set(file,bytes);return bytes.toString('utf8');};
 writeFileSync(helpers,`import React from 'react';const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));export const Dialog=host('dialog'),DialogContent=host('dialog-content'),DialogHeader=host('dialog-header'),DialogTitle=host('dialog-title'),DialogDescription=host('dialog-description'),Button=host('button'),Input=host('input');`);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');assert.ok(file.startsWith('lib/')||file==='components/customer-picker.tsx','Only actual production source: '+file);
  const target=toTarget(file);if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(remember(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;if(specifier.startsWith('@/components/ui/'))dependency=helpers;else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const originals=Object.fromEntries(['fetch','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let renderer=null,count=0,calls=[];const http=[];
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';
 const rows=()=>renderer.root.findAll(node=>node.type==='article'&&node.props.className==='picker-result'),ids=()=>rows().map(row=>row.props['data-customer-id']);
 const ownIds=()=>rows().filter(row=>text(row.findByType('small')).endsWith(' · Din kund')).map(row=>row.props['data-customer-id']);
 const content=()=>text(renderer.toJSON()),button=label=>renderer.root.findAllByType('button').find(node=>text(node)===label);
 async function unmount(){if(renderer){await act(async()=>renderer.unmount());renderer=null;}}
 async function scenario(label,run){await unmount();calls=[];await run();await unmount();assert.equal(http.length,0,'Zero HTTP in '+label);count++;console.log('PASS Customer picker scope: '+label);}
 async function query(value){await act(async()=>renderer.root.findByType('input').props.onChange({target:{value}}));assert.equal(renderer.root.findByType('input').props.value,value,'Raw search text remains available');}
 try{
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,writable:true,value:true});
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:async(...args)=>{http.push(args);throw Error('Customer picker scope must not perform HTTP');}});
  const core=await import(pathToFileURL(compile('lib/crm.ts')).href),dashboard=await import(pathToFileURL(compile('lib/sales-dashboard.ts')).href),domain=await import(pathToFileURL(compile('lib/customer-scope.ts')).href),{CustomerPicker}=await import(pathToFileURL(compile('components/customer-picker.tsx')).href);
  const fixture=options=>customerPickerScopeFixture(core,options);
  async function render(st,{purpose='search',update=false}={}){
   const before=JSON.stringify(st);freeze(st);const record=kind=>(...args)=>calls.push({kind,args}),props={st,purpose,onSelect:record('select'),onClose:record('close'),onNew:record('new')};
   await act(async()=>{if(update){assert.ok(renderer);renderer.update(React.createElement(CustomerPicker,props));}else renderer=create(React.createElement(CustomerPicker,props));});
   const unchanged=()=>assert.equal(JSON.stringify(st),before,'Entire normalized input stays unchanged');unchanged();return unchanged;
  }
  function diagnostic(kind){
   const regions=renderer.root.findAll(node=>node.type==='section'&&node.props.role==='status');assert.equal(regions.length,kind?1:0);
   if(kind){const region=regions[0];assert.equal(region.props['data-profile-diagnostic'],kind);assert.ok(region.findAllByType('p').some(node=>node.props.id===region.props['aria-labelledby']));assert.match(text(region),/”Din kund”/);assert.match(text(region),/prioriter/);assert.match(text(region),/Sökningen omfattar alla tillgängliga kunder/);assert.doesNotMatch(text(region),/synligt urval|fullständig kundlista|inga kunder/i);assert.equal(region.findAllByType('button').length,0,'Diagnostic never introduces a privileged action');}
  }
  const allDefault=['legacy-a','profile-b','profile-a','removed','sentinel','legacy-b'];
  await scenario('equal own counts expose wrong IDs despite identical profile names',async()=>{
   const st=fixture(),unchanged=await render(st),legacyOwn=st.customers.filter(c=>c.owner===st.viewer.owner).map(c=>c.id);assert.deepEqual(legacyOwn,['profile-a','legacy-a']);assert.deepEqual(ids(),allDefault);assert.deepEqual(ownIds(),['legacy-a','profile-b']);assert.equal(ownIds().length,legacyOwn.length);assert.notDeepEqual(ownIds(),legacyOwn);assert.equal(ids().length,st.customers.length,'Global search retains foreign and legacy customers');diagnostic('mismatch');unchanged();
  });
  await scenario('thirty foreign alias-matched customers cannot bury the actual linked customer',async()=>{
   const st=fixture({crowded:true}),unchanged=await render(st),aIds=Array.from({length:30},(_,index)=>'profile-a-'+String(index).padStart(2,'0'));
   assert.deepEqual(ids(),['profile-b',...aIds.slice(0,29)]);assert.deepEqual(ownIds(),['profile-b']);assert.equal(ids().length,30);assert.notDeepEqual(ids(),aIds);assert.match(content(),/begränsa 31 träffar/);await query('PROFILE-A-29');assert.deepEqual(ids(),['profile-a-29']);assert.deepEqual(ownIds(),[]);unchanged();
  });
  const matrix=[
   ['blank current alias',{owner:''},['profile-b'],['profile-b','profile-a','legacy-a','removed','sentinel','legacy-b'],'operational-missing'],
   ['removed current alias',{owner:removedName},['profile-b'],['profile-b','profile-a','legacy-a','removed','sentinel','legacy-b'],'operational-missing'],
   ['padded current alias',{owner:' '+nameA+' '},['profile-b'],['profile-b','profile-a','legacy-a','removed','sentinel','legacy-b'],'operational-missing'],
   ['missing exact member link',{link:''},['legacy-a'],['legacy-a','profile-a','removed','sentinel','legacy-b','profile-b'],'missing'],
   ['missing immutable member ID',{member:''},['legacy-a'],['legacy-a','profile-a','removed','sentinel','legacy-b','profile-b'],'missing'],
   ['missing link and alias',{link:'',owner:''},[],['profile-a','legacy-a','removed','sentinel','legacy-b','profile-b'],'missing'],
   ['inactive exact linked B',{inactive:true},['legacy-a','profile-b'],allDefault,'mismatch'],
   ['inactive B with historical alias removed',{inactive:true,owner:'',owners:[nameA]},['profile-b'],['profile-b','profile-a','legacy-a','removed','sentinel','legacy-b'],'operational-missing'],
   ['healthy exact linked A',{link:'a'},['profile-a','legacy-a'],['profile-a','legacy-a','removed','sentinel','legacy-b','profile-b'],''],
   ['before profile initialization',{initialized:false},['legacy-a'],['legacy-a','removed','sentinel','legacy-b'],''],
   ['before initialization with no valid alias',{initialized:false,owner:''},[],['legacy-a','removed','sentinel','legacy-b'],''],
   ['literal unassigned sentinel is never an own alias',{owner:'_unassigned',link:''},[],['profile-a','legacy-a','removed','sentinel','legacy-b','profile-b'],'missing'],
   ['uninitialized sentinel is never an own alias',{initialized:false,owner:'_unassigned'},[],['legacy-a','removed','sentinel','legacy-b'],'']
  ];
  for(const [label,options,owned,ordered,kind] of matrix)await scenario(label+' preserves all rows with exact own identity',async()=>{const st=fixture(options),unchanged=await render(st);assert.deepEqual(ids(),ordered);assert.deepEqual(ownIds(),owned);diagnostic(kind);assert.equal(ids().length,st.customers.length);unchanged();});
  await scenario('runtime user ID cannot replace a missing member link',async()=>{const st=fixture({member:''});st.viewer.id=memberId;core.normalizeState(st);const unchanged=await render(st);assert.equal(dashboard.personalResultScope(st),'');assert.deepEqual(ownIds(),['legacy-a']);diagnostic('missing');unchanged();});
  for(const role of ['seller','reader','admin'])await scenario(role+' keeps global selection and appropriate diagnostic help',async()=>{
   const st=fixture({role}),unchanged=await render(st);assert.deepEqual(ids(),allDefault);assert.deepEqual(ownIds(),['legacy-a','profile-b']);diagnostic('mismatch');assert.equal(!!button('Lägg till en ny kund'),role!=='reader');const region=renderer.root.find(node=>node.type==='section'&&node.props.role==='status');assert.match(text(region),role==='admin'?/Kontrollera konto- och profilkopplingen i Mål & inställningar/:/Be en administratör kontrollera/);unchanged();
  });
  for(const role of ['seller','reader','admin'])await scenario(role+' missing operational alias explains legacy priority without filtering search',async()=>{const st=fixture({role,owner:''}),unchanged=await render(st);diagnostic('operational-missing');assert.match(content(),/Konton & roller/);assert.deepEqual(ownIds(),['profile-b']);assert.equal(ids().length,st.customers.length);unchanged();});
  for(const role of ['production','print','warehouse'])await scenario(role+' retains the existing global rows, callback and new-customer guard',async()=>{const st=fixture({role,initialized:false,owner:''}),unchanged=await render(st);assert.equal(ids().length,st.customers.length);assert.deepEqual(ownIds(),[]);diagnostic('');assert.ok(button('Lägg till en ny kund'));await act(async()=>rows()[0].findByType('button').props.onClick());await act(async()=>button('Lägg till en ny kund').props.onClick());assert.deepEqual(calls,[{kind:'select',args:[ids()[0]]},{kind:'new',args:[]}]);unchanged();});
  for(const [field,value] of [['name','SÖK FÖRETAG ÅÄÖ'],['contact','SÖK KONTAKT ÅÄÖ'],['email','scope-search@example.test'],['organizationNumber','SÖK ORG ÅÄÖ']])await scenario('foreign customer remains searchable by '+field+' with Swedish case and trimmed query',async()=>{
   const st=fixture();st.customers.find(c=>c.id==='profile-a')[field]=value;core.normalizeState(st);const unchanged=await render(st);await query('  '+value.toLocaleLowerCase('sv')+'  ');assert.deepEqual(ids(),['profile-a']);assert.deepEqual(ownIds(),[]);await act(async()=>rows()[0].findByType('button').props.onClick());assert.deepEqual(calls,[{kind:'select',args:['profile-a']}]);unchanged();
  });
  await scenario('whitespace search retains all customers and unmatched search keeps honest global empty text',async()=>{const st=fixture(),unchanged=await render(st);await query('   ');assert.deepEqual(ids(),allDefault);await query('SYNTHETIC-NO-MATCH');assert.deepEqual(ids(),[]);assert.match(content(),/Ingen kund matchar sökningen/);diagnostic('mismatch');unchanged();});
  for(const purpose of ['search','notes','deal','task','meeting'])await scenario(purpose+' preserves exact foreign/own selection and accessible action/name references',async()=>{
   const st=fixture(),unchanged=await render(st,{purpose}),action=purpose==='search'?'Öppna kundkort':'Välj kund';for(const id of ['profile-a','profile-b']){const row=rows().find(node=>node.props['data-customer-id']===id),button=row.findByType('button'),references=button.props['aria-labelledby'].split(' ');assert.match(text(button),new RegExp(action));assert.equal(references.length,2);assert.ok(row.findAllByType('b').some(node=>node.props.id===references[1]));assert.ok(button.findAllByType('span').some(node=>node.props.id===references[0]));await act(async()=>button.props.onClick());}assert.deepEqual(calls,[{kind:'select',args:['profile-a']},{kind:'select',args:['profile-b']}]);unchanged();
  });
  await scenario('closing and new-customer actions preserve their existing callback contracts',async()=>{const st=fixture(),unchanged=await render(st);await act(async()=>renderer.root.findByType('dialog').props.onOpenChange(true));assert.deepEqual(calls,[]);await act(async()=>renderer.root.findByType('dialog').props.onOpenChange(false));await act(async()=>button('Lägg till en ny kund').props.onClick());assert.deepEqual(calls,[{kind:'close',args:[]},{kind:'new',args:[]}]);unchanged();});
  await scenario('member/alias changes recompute own priority while preserving the search draft',async()=>{
   const b=fixture(),unchangedB=await render(b);await query('  syntetisk  ');assert.deepEqual(ownIds(),['legacy-a','profile-b']);
   const a=fixture({link:'a',owner:nameB});a.viewer.id='synthetic-other-picker-user';a.viewer.memberId='synthetic-other-picker-member';a.settings.sellerProfiles[0].memberId=a.viewer.memberId;core.normalizeState(a);const unchangedA=await render(a,{update:true});assert.equal(renderer.root.findByType('input').props.value,'  syntetisk  ');assert.deepEqual(ownIds(),['profile-a','legacy-b']);assert.deepEqual(ids(),['profile-a','legacy-b','legacy-a','removed','sentinel','profile-b']);diagnostic('mismatch');
   const missing=fixture({link:'',owner:''}),unchangedMissing=await render(missing,{update:true});assert.deepEqual(ownIds(),[]);diagnostic('missing');assert.equal(renderer.root.findByType('input').props.value,'  syntetisk  ');unchangedB();unchangedA();unchangedMissing();
  });
  await scenario('empty global register preserves search empty text without inventing own customer attribution',async()=>{const st=fixture({link:'',owner:''});st.customers=[];core.normalizeState(st);const unchanged=await render(st);assert.deepEqual(ids(),[]);diagnostic('missing');assert.match(content(),/Ingen kund matchar sökningen/);unchanged();});
  await scenario('selectors and picker leave complete historical/profile/team metric representations unchanged',async()=>{
   const st=fixture(),scopes=[profileA,profileB,'all'],month='2026-10';
   for(const [suffix,profile,owner,value,cost] of [['a',profileA,nameA,100,50],['b',profileB,nameB,200,80]]){
    const customer=st.customers.find(row=>row.id==='profile-'+suffix);Object.assign(customer.prospecting,{qualifiedAt:month+'-01T10:00:00Z',qualifiedOwner:owner,qualifiedOwnerId:profile});
    const deal=core.DealSchema.parse({id:'synthetic-picker-history-deal-'+suffix,customerId:customer.id,owner,ownerProfileId:profile,title:'Syntetisk fakturerad affär '+suffix,stage:'won',confirmed:true,wonAt:month+'-01',value,cost});st.deals.push(deal);
    st.orders.push(core.OrderSchema.parse({id:'synthetic-picker-history-order-'+suffix,customerId:customer.id,dealId:deal.id,owner,ownerProfileId:profile,stage:'followed',proofRequired:false,proofApproved:false,supplierConfirmed:true,deliveryDate:month+'-01',deliveredDate:month+'-01',receivedBy:'Syntetiskt mottagningsunderlag',invoiceDate:month+'-01',invoiceRef:'SYNTHETIC-PICKER-'+suffix,invoiceValue:value,actualCost:cost,invoiceOwner:owner,invoiceOwnerId:profile,invoiceOwnerSource:'recorded',notes:'Syntetiskt historiskt underlag'}));
    st.settings.sellerGoalsById[profile]={[month]:{revenue:value*2,grossProfit:100,qualified:2}};st.settings.sellerAnnualGoalsById[profile]={'2026':value*24};
   }
   st.settings.budgets[month]=600;st.settings.annualBudgets['2026']=7200;core.normalizeState(st);
   const before=scopes.map(scope=>dashboard.salesMetrics(st,month,scope));assert.deepEqual(before.map(metrics=>metrics.revenue),[100,200,300]);assert.deepEqual(before.map(metrics=>metrics.yearRevenue),[100,200,300]);assert.deepEqual(before.map(metrics=>metrics.qualified),[1,1,2]);
   const unchanged=await render(st);await query('SYNTHETIC-profile-a');domain.customerScope(st,dashboard.personalOwner(st)||'_unassigned');assert.deepEqual(scopes.map(scope=>dashboard.salesMetrics(st,month,scope)),before);unchanged();
  });
  for(const [file,bytes] of sourceBytes)assert.deepEqual(readFileSync(file),bytes,'Actual compiled source bytes unchanged: '+file);
  console.log('PASS Customer picker scope total: '+count+' cases; '+compiled.size+' actual source modules unchanged; zero HTTP.');
  return {cases:count,modules:compiled.size,httpCalls:http.length};
 }finally{
  await unmount();for(const [key,descriptor] of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];rmSync(directory,{recursive:true,force:true});
 }
}
