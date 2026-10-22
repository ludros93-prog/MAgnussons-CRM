import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import ts from 'typescript';

export async function verifyProductionDateOverview(){
 const dir='work/production-date-overview';mkdirSync(dir,{recursive:true});
 const source=readFileSync('components/production-date-overview.tsx','utf8')
  .replace("import {day} from '@/lib/crm';","const day=()=> '2026-10-22';")
  .replace("import {Button} from './ui/button';","const Button='button';")
  .replace("import {Input} from './ui/input';","const Input='input';");
 writeFileSync(dir+'/component.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
 const {ProductionDateOverview}=await import(pathToFileURL(dir+'/component.mjs').href);
 const orders=[
  {id:'fake-a',customerId:'fake-c',dealId:'fake-d',production:{printDeadline:'2026-10-22',dispatchDeadline:'2026-10-22',deliveryDate:'2026-11-01',assigneeName:'Testperson',issue:'Fiktivt hinder'}},
  {id:'fake-b',customerId:'fake-c',dealId:'fake-e',production:{printDeadline:'2026-10-31',dispatchDeadline:'2026-11-01',deliveryDate:'',assigneeName:'',issue:''}},
 ];
 const st={customers:[{id:'fake-c',name:'Fiktiv kund'}],deals:[{id:'fake-d',title:'Testjobb A'},{id:'fake-e',title:'Testjobb B'}]};
 const before=JSON.stringify({orders,st}),picked=[];
 const previous=globalThis.IS_REACT_ACT_ENVIRONMENT;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let renderer;
 const text=n=>n==null?'':typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n.children);
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(ProductionDateOverview,{orders,st,onSelect:id=>picked.push(id)}));});
  const root=()=>renderer.root;
  const controls=()=>root().findAllByType('select');
  const summary=()=>text(root().findByProps({'aria-live':'polite'})).replace(/\s+/g,' ');
  assert.match(summary(),/2 jobb · 3 datumhändelser/);
  assert.match(text(root()),/saknar minst ett valt datum/);
  await act(async()=>controls()[0].props.onChange({target:{value:'day'}}));
  assert.match(summary(),/1 jobb · 2 datumhändelser/);
  await act(async()=>controls()[1].props.onChange({target:{value:'dispatchDeadline'}}));
  assert.match(summary(),/1 jobb · 1 datumhändelser/);
  await act(async()=>root().findAllByType('button').find(n=>n.props['data-production-work-open']).props.onClick());
  assert.deepEqual(picked,['fake-a']);
  await act(async()=>root().findByType('input').props.onChange({target:{value:'2026-11-01'}}));
  assert.match(summary(),/1 jobb · 1 datumhändelser/);
  await act(async()=>root().findByType('input').props.onChange({target:{value:''}}));
  assert.match(text(root()),/Välj en period/);assert.match(summary(),/0 jobb/);
  await act(async()=>root().findAllByType('button').find(n=>text(n)==='Idag').props.onClick());
  assert.equal(root().findByType('input').props.value,'2026-10-22');
  await act(async()=>renderer.update(React.createElement(ProductionDateOverview,{orders:[],st,onSelect:id=>picked.push(id)})));
  assert.match(text(root()),/Inga datumhändelser/);assert.match(summary(),/0 jobb/);
  assert.equal(JSON.stringify({orders,st}),before);
  console.log('PASS production date overview: actual React month/day/filter navigation, month boundary, unique jobs, missing dates, empty date/search, open job and unchanged input.');
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.IS_REACT_ACT_ENVIRONMENT=previous;}
}
