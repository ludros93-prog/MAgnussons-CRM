import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';

export async function verifyProspectResults(){
 mkdirSync('work',{recursive:true});const directory=mkdtempSync(resolve('work/prospect-results-')),helpers=resolve(directory,'helpers.mjs'),compiled=new Set();
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Input=host('input'),Textarea=host('textarea'),Button=host('button'),BusinessField=host('label'),Pick=host('select');
export const Sheet=({open,children})=>open?React.createElement('aside',{},children):null;
export const SheetContent=host('div'),SheetHeader=host('header'),SheetTitle=host('h2'),SheetDescription=host('p');
export const RecordImporter=()=>null,csvNumber=Number;
`);
 function compile(file){
  file=relative(resolve('.'),resolve(file)).split(sep).join('/');
  assert.ok(file.startsWith('lib/')||['components/prospect-search.tsx','components/prospect-results.tsx'].includes(file));
  const target=resolve(directory,file.replace(/\.tsx?$/,'.mjs'));if(compiled.has(file))return target;compiled.add(file);
  let output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  output=output.replace(/(from\s+|import\s*)['"]([^'"]+)['"]/g,(whole,prefix,specifier)=>{
   let dependency;
   if(specifier.startsWith('@/components/ui/')||['./business-ui','./record-importer'].includes(specifier))dependency=helpers;
   else if(specifier==='./prospect-results')dependency=compile('components/prospect-results.tsx');
   else if(specifier.startsWith('@/lib/'))dependency=compile('lib/'+specifier.slice(6)+'.ts');
   else if(specifier.startsWith('./')||specifier.startsWith('../'))dependency=compile(resolve(dirname(file),specifier)+'.ts');
   else return whole;
   let local=relative(dirname(target),dependency).split(sep).join('/');if(!local.startsWith('.'))local='./'+local;
   return prefix+JSON.stringify(local);
  });mkdirSync(dirname(target),{recursive:true});writeFileSync(target,output);return target;
 }
 const component=compile('components/prospect-search.tsx');
 const {ProspectSearch}=await import(pathToFileURL(component).href),core=await import(pathToFileURL(compile('lib/crm.ts')).href),ops=await import(pathToFileURL(compile('lib/operations.ts')).href);
 const st=core.emptyState();st.viewer={id:'synthetic-viewer',name:'Syntetisk säljare',email:'seller@example.test',owner:'Testroll',role:'seller'};st.settings.owners=['Testroll'];
 st.leads=Array.from({length:237},(_,i)=>ops.LeadSchema.parse({id:'synthetic-'+i,name:'Testföretag '+String(i).padStart(3,'0'),source:'Syntetiskt underlag',sourceRecordId:String(i),industry:'Testbransch',city:i<120?'Testort A':'Testort B',employees:10,latitude:56.104866,longitude:13.913155,contacts:[{name:'Testkontakt',role:'Testroll',email:'contact@example.test'}]}));
 const blocked=st.leads[236];blocked.contactHistory=[{id:'synthetic-block',identity:ops.leadIdentity(blocked),revision:1,blocked:true,reason:'Syntetisk spärr',at:'2026-10-14T10:00:00Z',byId:'synthetic-viewer',byName:'Testroll'}];
 st.leads[235].customerId='synthetic-existing-customer';
 const original=JSON.stringify(st),previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT,previousFetch=globalThis.fetch;
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.fetch=()=>{throw Error('Browsing must not request or write data')};
 let renderer;const focused=[],opened=[];
 const text=node=>node==null?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.children);
 const save=()=>{throw Error('Browsing must not save CRM records')};
 const render=async()=>act(async()=>{const element=React.createElement(ProspectSearch,{st,save,busy:false,onCustomer:id=>opened.push(id)});if(renderer)renderer.update(element);else renderer=TestRenderer.create(element,{createNodeMock:element=>element.props.className==='production-grid'?{children:{item:index=>({focus:()=>focused.push(index)})}}:null});});
 const cards=()=>renderer.root.findAll(node=>node.type==='article'&&node.props.className==='production-card lead-card');
 const more=()=>renderer.root.findAll(node=>node.type==='button'&&/^Visa \d+ fler företag$/.test(text(node)))[0];
 const clickMore=async()=>act(async()=>more().props.onClick());
 const filter=async(label,value)=>{const field=renderer.root.findAll(node=>node.type==='label'&&node.props.label===label)[0],input=field.findByType(label==='Kontaktstatus'?'select':'input');await act(async()=>input.props.onChange(label==='Kontaktstatus'?value:{target:{value}}));};
 try{
  await render();assert.equal(cards().length,100);assert.match(text(renderer.toJSON()),/Visar 100 av 236 företag/);assert.equal(focused.length,0);
  assert.equal(more().props.type,'button');assert.ok(more().props['aria-controls']);
  await clickMore();assert.equal(cards().length,200);assert.deepEqual(focused,[100]);assert.equal(text(more()),'Visa 36 fler företag');
  await clickMore();assert.equal(cards().length,236);assert.equal(more(),undefined);assert.deepEqual(focused,[100,200]);
  assert.equal(new Set(cards().map(c=>c.props['aria-label'])).size,236);assert.equal(cards()[235].props.tabIndex,-1);
  await act(async()=>cards()[235].findAll(node=>node.type==='button'&&text(node)==='Öppna kundkort')[0].props.onClick());assert.deepEqual(opened,['synthetic-existing-customer']);
  for(const [label,value] of [['Företag / org.nr','Test'],['Bransch','Test'],['Ort','Test'],['Minst anställda','1'],['Högst anställda','20'],['Kontaktens befattning','Test'],['Radie från Vinslöv, km','10'],['Kontaktstatus','all']]){
   await filter(label,value);assert.equal(cards().length,100,label+' resets the visible batch');await clickMore();assert.equal(cards().length,200);
  }
  await filter('Kontaktstatus','blocked');assert.equal(cards().length,1);assert.equal(more(),undefined);assert.match(text(cards()[0]),/Spärrad för prospektering/);
  assert.equal(cards()[0].findAll(node=>node.type==='a'&&String(node.props.href).startsWith('mailto:')).length,0);
  assert.equal(cards()[0].findAll(node=>node.type==='button'&&text(node)==='Börja bearbeta').length,0);
  await filter('Kontaktstatus','available');await clickMore();await filter('Ort','Testort A');assert.equal(cards().length,100);await clickMore();assert.equal(cards().length,120);assert.equal(more(),undefined);
  await filter('Företag / org.nr','finns inte');assert.equal(cards().length,0);assert.equal(more(),undefined);assert.match(text(renderer.toJSON()),/Inga företag matchar/);
  await filter('Företag / org.nr','Test');assert.equal(cards().length,100);
  st.viewer.role='reader';await render();await clickMore();assert.equal(cards().length,120);assert.equal(cards().flatMap(c=>c.findAll(node=>node.type==='button'&&['Börja bearbeta','Spärra prospektering'].includes(text(node)))).length,0);
  st.viewer.role='seller';assert.equal(JSON.stringify(st),original,'Browsing leaves all input records unchanged.');
  console.log('PASS prospect results: actual parent and domains, 237 synthetic leads, all batches reachable, no duplicates, each filter resets, focus, existing-customer link, blocked contacts, reader actions, empty results and no writes.');
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;globalThis.fetch=previousFetch;rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyProspectResults();
