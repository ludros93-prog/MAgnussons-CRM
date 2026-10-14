import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import ts from 'typescript';

export async function verifyOrderGuideNextStep(){
 const directory='work/order-guide-next-step';mkdirSync(directory,{recursive:true});
 const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 writeFileSync(directory+'/helpers.mjs',`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Input=host('input'),Button=host('button'),Checkbox=host('input'),Textarea=host('textarea'),F=host('label'),Pick=host('select');
export const Check=host('span'),Paperclip=host('span'),Send=host('span'),LockKeyhole=host('span'),ArrowRight=host('span');
export const OrderChanges=()=>null,DraftStatus=()=>null,day=()=> '2026-10-14',orderBasis=o=>o.basis,variantLabel=()=>'';
export const ProductionSchema={parse:v=>v},LineSchema={parse:v=>v};
export let current; export function setCurrent(value){current=value;}
const forbidden=()=>{throw Error('Navigation must not save or modify draft/CRM data')};
export const useDrafts=()=>({ready:true,records:current?[current]:[],create:forbidden,update:forbidden,flush:forbidden,consume:forbidden});
`);
 const nextSource=readFileSync('components/order-preparation-next-step.tsx','utf8').replace("@/components/ui/button","./helpers.mjs");
 writeFileSync(directory+'/next.mjs',transpile(nextSource));
 const guideSource=readFileSync('components/order-guide.tsx','utf8');
 assert.match(guideSource,/OrderPreparationNextStep checks=\{checks\.map/,'Use the existing guide checklist, not a second validation rule.');
 writeFileSync(directory+'/guide.mjs',transpile(`import React,{useEffect,useState,useRef} from 'react';
import {OrderPreparationNextStep} from './next.mjs';
import {OrderChanges,Input,Button,Checkbox,Textarea,F,Pick,Check,Paperclip,Send,LockKeyhole,ArrowRight,day,orderBasis,variantLabel,ProductionSchema,LineSchema,DraftStatus,useDrafts} from './helpers.mjs';
${guideSource.slice(guideSource.indexOf('export function OrderGuide'))}`));
 const {OrderGuide}=await import(pathToFileURL(directory+'/guide.mjs').href),{setCurrent}=await import(pathToFileURL(directory+'/helpers.mjs').href);
 const previousFetch=globalThis.fetch,previousDocument=globalThis.document,previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT;
 globalThis.fetch=async()=>({ok:true,json:async()=>[]});
 let scrolls=0,focuses=0,renderer;
 globalThis.document={querySelector:()=>({scrollIntoView:()=>scrolls++})};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const text=node=>node==null?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.children);
 const forbidden=()=>{throw Error('Navigation must not save, refresh or close the order')};
 const fixture=()=>({o:{id:'synthetic-order',customerId:'synthetic-customer',dealId:'synthetic-deal',owner:'Testroll',basis:'current-basis',pendingAmendment:null},st:{customers:[{id:'synthetic-customer',name:'Fiktiv testkund'}],deals:[{id:'synthetic-deal',title:'Syntetisk order',lines:[]}]},draft:{id:'synthetic-draft',kind:'production',context:'synthetic-order',status:'saved',data:{expectedOrder:'current-basis',approval:{proofRequired:true,proofApproved:false,approvedBy:'',approvedDate:'',supplierConfirmed:false,deliveryDate:''},deliveryAddress:{street:'',postalCode:'',city:''},production:{lines:[{article:'T1',description:'Testartikel',quantity:2}],sketchFileId:'',instructions:'',printDeadline:'',dispatchDeadline:''}}}});
 async function render(f,busy=false){setCurrent(f.draft);await act(async()=>{const element=React.createElement(OrderGuide,{...f,space:'demo',save:forbidden,refresh:forbidden,onClose:forbidden,onAdvanced:forbidden,busy});if(renderer)renderer.update(element);else renderer=TestRenderer.create(element,{createNodeMock:()=>({querySelector:()=>({focus:()=>focuses++})})});});}
 const panel=()=>renderer.root.findByProps({'aria-label':'Nästa steg i orderförberedelsen'});
 const action=()=>panel().findAll(node=>node.type==='button')[0];
 const activeStep=()=>renderer.root.findAll(node=>node.type==='section'&&String(node.props.className).startsWith('guide-step')&&!node.props.hidden)[0];
 const complete=f=>{Object.assign(f.draft.data.deliveryAddress,{street:'Testgatan',postalCode:'12345',city:'Testort'});Object.assign(f.draft.data.production,{sketchFileId:'synthetic-file',instructions:'Fiktivt testtryck',printDeadline:'2026-10-15',dispatchDeadline:'2026-10-16'});Object.assign(f.draft.data.approval,{proofApproved:true,approvedBy:'Syntetisk godkännare',approvedDate:'2026-10-14',supplierConfirmed:true,deliveryDate:'2026-10-17'});};
 try{
  let f=fixture(),before=JSON.stringify(f);await render(f);
  assert.match(text(panel()),/5 av 6 kontroller/);assert.equal(text(action()),'Komplettera: Leveransadress');
  await act(async()=>action().props.onClick());assert.match(text(activeStep()),/Kund & leveransadress/);assert.equal(JSON.stringify(f),before);
  Object.assign(f.draft.data.deliveryAddress,{street:'Testgatan',postalCode:'12345',city:'Testort'});before=JSON.stringify(f);await render(f);
  assert.equal(text(action()),'Komplettera: Skiss och tryckinstruktion');await act(async()=>action().props.onClick());assert.match(text(activeStep()),/Skiss & kundens godkännande/);assert.equal(JSON.stringify(f),before);
  complete(f);before=JSON.stringify(f);await render(f);assert.equal(text(action()),'Granska ordern');
  await act(async()=>action().props.onClick());assert.match(text(activeStep()),/Kontrollera & lämna till tryck/);assert.equal(JSON.stringify(f),before);assert.ok(scrolls>=3&&focuses>=3,'Existing scroll/focus navigation is retained.');
  assert.match(text(panel()),/får sparbesked/);assert.doesNotMatch(text(panel()),/Ordern är lämnad/);
  await render(f,true);assert.equal(action().props.disabled,true);
  for(const [change,expected] of [
   [f=>f.o.basis='new-basis',/Läs in aktuella orderuppgifter/],
   [f=>f.o.pendingAmendment={reason:'syntetisk'},/Hantera orderns ändringsförslag/],
   [f=>f.draft.status='conflict',/Lös utkastkonflikten/],
  ]){f=fixture();complete(f);change(f);await render(f);assert.match(text(panel()),expected);assert.equal(action(),undefined);}
  f=fixture();complete(f);f.draft.data.production.dispatchDeadline='2026-10-14';await render(f);assert.equal(text(action()),'Komplettera: Datum i rätt ordning');
  f=fixture();complete(f);f.draft.data.approval.approvedDate='2026-10-15';await render(f);assert.equal(text(action()),'Komplettera: Kundgodkännande');
  console.log('PASS order guide next step: actual guide navigation, missing-field priority, review-only completion, busy state, stale order/amendment/draft conflict, dates, focus and no data writes.');
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.fetch=previousFetch;globalThis.document=previousDocument;globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyOrderGuideNextStep();
