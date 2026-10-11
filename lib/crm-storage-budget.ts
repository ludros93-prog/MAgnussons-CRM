import {RuleError} from './crm-errors';

// D1 documents a decimal byte limit for a string, BLOB and table row. A row
// here is SQLite's record payload: header and declared column values, without
// B-tree cell, rowid, page, index or overflow-page overhead. Exact TEXT sizes
// require UTF-8, which the first-write backup preflight checks on its binding.
export const D1_MAX_ROW_BYTES=2000000;
export type StorageValue=string|number|null|Uint8Array;
const encoder=new TextEncoder();
const rowBudgetError='CRM-kopian innehåller en databaspost som överskrider gränsen på 2 000 000 byte efter återställningen. Inga uppgifter återställs.';

function varintBytes(value:number){
 let bytes=1;
 while(value>=128&&bytes<9){value=Math.floor(value/128);bytes++;}
 return bytes;
}
function columnRecord(value:StorageValue){
 if(value===null)return {serial:0,bytes:0};
 if(typeof value==='string'){const bytes=encoder.encode(value).byteLength;return {serial:13+2*bytes,bytes};}
 if(value instanceof Uint8Array){const bytes=value.byteLength;return {serial:12+2*bytes,bytes};}
 if(value===0||value===1)return {serial:value===0?8:9,bytes:0};
 if(Number.isInteger(value)){
  // SQLite INTEGER affinity uses the smallest signed representation. Values
  // outside the signed 64-bit range use REAL, also an eight-byte payload.
  for(const [bytes,serial] of [[1,1],[2,2],[3,3],[4,4],[6,5]] as const){
   const bound=2**(8*bytes-1);
   if(value>=-bound&&value<bound)return {serial,bytes};
  }
  return {serial:value>=-(2**63)&&value<2**63?6:7,bytes:8};
 }
 return {serial:7,bytes:8};
}
function recordBudget(values:readonly StorageValue[]){
 let serialBytes=0,payloadBytes=0,valueFits=true;
 for(const value of values){const column=columnRecord(value);serialBytes+=varintBytes(column.serial);payloadBytes+=column.bytes;if(column.bytes>D1_MAX_ROW_BYTES)valueFits=false;}
 // The header starts with its own length, including that length's varint.
 let headerBytes=serialBytes+1;
 while(headerBytes!==serialBytes+varintBytes(headerBytes))headerBytes=serialBytes+varintBytes(headerBytes);
 return {bytes:headerBytes+payloadBytes,valueFits};
}
export function sqliteRecordBytes(values:readonly StorageValue[]){return recordBudget(values).bytes;}
export function assertStorageRowBudget(values:readonly StorageValue[]){
 const budget=recordBudget(values);
 if(!budget.valueFits||budget.bytes>D1_MAX_ROW_BYTES)throw new RuleError(rowBudgetError);
}
