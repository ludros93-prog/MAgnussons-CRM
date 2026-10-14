import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import ts from 'typescript';

export async function verifyCustomerImportPreview(){
 const directory='work/customer-import-preview';rmSync(directory,{recursive:true,force:true});mkdirSync(directory,{recursive:true});
 const helpers=directory+'/helpers.mjs',component=directory+'/data-tools.mjs';
 writeFileSync(helpers,`import React from 'react';
const host=tag=>React.forwardRef(({children,...props},ref)=>React.createElement(tag,{...props,ref},children));
export const Button=host('button'),Input=host('input'),Checkbox=host('input'),Table=host('table'),TableHeader=host('thead'),TableHead=host('th'),TableRow=host('tr'),TableBody=host('tbody'),TableCell=host('td'),F=host('label');
export const Pick=host('select'),BackupTools=()=>null,toast={error:()=>{}};
export const Download=host('span'),Upload=host('span'),Check=host('span'),AlertTriangle=host('span');
export const day=()=> '2026-10-14';
export const parseCSV=raw=>raw.trim().split(/\\r?\\n/).map(row=>row.split(';'));
export const CustomerSchema={safeParse:value=>value.name&&value.owner?{success:true,data:{...value,id:'',responsibilityTransfers:[],ownerProfileId:'',plan:{issueOwnerProfileId:'',issueResponsibilityTransfers:[]}}}:{success:false,error:{issues:[{message:'Fyll i obligatoriska uppgifter.'}]}}};
`);
 const source=readFileSync('components/data-tools.tsx','utf8'),body=source.slice(source.indexOf('function download'));
 const compiled=ts.transpileModule(`import React,{useMemo,useState} from 'react';import {Button,Input,Checkbox,Table,TableHeader,TableHead,TableRow,TableBody,TableCell,F,Pick,BackupTools,toast,Download,Upload,Check,AlertTriangle,day,parseCSV,CustomerSchema} from './helpers.mjs';\n${body}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 writeFileSync(component,compiled);
 const {DataTools}=await import(pathToFileURL(component).href),st={viewer:{role:'admin',owner:'Säljare'},settings:{owners:['Säljare'],reviewDays:90},customers:[]},calls=[];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;let renderer;
 const render=()=>React.createElement(DataTools,{st,space:'demo',busy:false,refresh:async()=>{},save:async(...args)=>{calls.push(args);return true}});
 const text=node=>node==null?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.children);
 const choose=async file=>{const input=renderer.root.findAll(node=>node.type==='input'&&node.props.type==='file')[0];await act(async()=>{input.props.onChange({target:{files:[file],value:'selected'}});await new Promise(resolve=>setImmediate(resolve));});};
 try{
  await act(async()=>{renderer=TestRenderer.create(render());});
  await choose({name:'fortnox-kunder.csv',size:80,text:async()=> 'Företagsnamn;Ansvarig;Kundnummer Fortnox\nFiktiv kund AB;Säljare;1001'});
  assert.match(text(renderer.toJSON()),/Förhandsgranskar\s+fortnox-kunder\.csv/);
  assert.ok(renderer.root.findAll(node=>node.type==='button'&&text(node).includes('Importera')).length>0);
  await choose({name:'felaktig.csv',size:1000001,text:async()=>{throw Error('ska inte läsas')}});
  const content=text(renderer.toJSON());
  assert.doesNotMatch(content,/fortnox-kunder\.csv/,'Den gamla filens förhandsgranskning ska tas bort direkt.');
  assert.match(content,/CSV-filen får vara högst 1 MB/);
  assert.equal(renderer.root.findAll(node=>node.type==='button'&&text(node).includes('Importera')).length,0);
  assert.deepEqual(calls,[],'Filval och fel får inte skriva kunddata.');
  console.log('PASS customer import preview: a rejected replacement file clears the prior preview and import action; valid filename and explicit no-write review are shown.');
 }finally{if(renderer)await act(async()=>renderer.unmount());rmSync(directory,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await verifyCustomerImportPreview();
