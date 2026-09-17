import {z} from 'zod';
import {database,bucket} from './crm-db';
import {load,commit,initialize,requestHash,type StoredFile} from './crm-store';
import {restoreState} from './crm-restore';
import {collectFileReferences} from './export-references';
import {RuleError,emptyState,type State,type Actor} from './crm';

export const BACKUP_MAX_BYTES=16000000;
const FILE_BYTES=10000000;
const FileMeta=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(200),version:z.string().min(1).max(100),kind:z.enum(['logo','proof','document']),size:z.number().int().positive().max(5000000),at:z.string(),uploadedBy:z.string(),purpose:z.literal('production').optional(),orderId:z.string().min(1).max(100).optional(),workId:z.string().min(1).max(100).optional()});
const BackupSchema=z.object({format:z.literal('magnussons-crm-backup-1'),exportedAt:z.string(),sourceSpace:z.enum(['demo','live']),state:z.unknown(),files:z.array(z.object({customerId:z.string().min(1).max(100),metadata:FileMeta,content:z.string().max(6700000),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).max(2000)});
const need=(v:unknown,message:string)=>{if(!v)throw new RuleError(message)};
export async function checksum(bytes:Uint8Array){const hash=await crypto.subtle.digest('SHA-256',bytes as BufferSource);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
const encode=(bytes:Uint8Array)=>{let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(raw)};
const decode=(value:string)=>{need(value.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(value),'Filinnehållet är felaktigt.');const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0));};
function validateFiles(st:State,files:z.infer<typeof BackupSchema>['files']){
 for(const f of files){const m=f.metadata;if(m.purpose||m.orderId||m.workId){const o=st.orders.find(o=>o.id===m.orderId&&o.customerId===f.customerId);need(m.purpose==='production'&&m.kind==='document'&&!!o&&[o.production,...o.productionHistory].some(p=>p.workId===m.workId),'Ett arbetsfoto saknar giltig koppling till order och arbetsversion.');}}
 const customers=new Set(st.customers.map(c=>c.id)),seen=new Set<string>(),counts=new Map<string,number>();let total=0;
 for(const f of files){need(!seen.has(f.metadata.id),'Kopian innehåller dubbla fil-ID:n.');seen.add(f.metadata.id);need(customers.has(f.customerId),'En kundfil saknar sin kund.');const count=(counts.get(f.customerId)||0)+1;need(count<=200,'Högst 200 filer per kund.');counts.set(f.customerId,count);total+=f.metadata.size;need(total<=FILE_BYTES,'CRM-kopian stöder högst 10 MB kundfiler totalt.');}
 for(const ref of collectFileReferences(st)){const f=files.find(f=>f.metadata.id===ref.id);need(f&&f.customerId===ref.customerId&&f.metadata.version===ref.version&&(ref.kind!=='proof'||f.metadata.kind==='proof'),'En korrektur- eller skissreferens saknar rätt kundfil och version.');}
}
export async function exportBackup(space:string){
 const st=await load(space),rows=await database().prepare('SELECT customer_id,object_key,data FROM crm_files WHERE space=? ORDER BY id').bind(space).all<{customer_id:string;object_key:string;data:string}>();
 const files:z.infer<typeof BackupSchema>['files']=[];let total=0;
 for(const row of rows.results){
  const metadata=FileMeta.parse(JSON.parse(row.data));total+=metadata.size;need(total<=FILE_BYTES,'CRM-kopian stöder högst 10 MB kundfiler totalt. Ingen ofullständig kopia skapas.');
  const object=await bucket().get(row.object_key);need(object,'Kundfilen '+metadata.name+' saknas i fillagringen. Kopian stoppades.');
  const bytes=new Uint8Array(await object!.arrayBuffer());need(bytes.byteLength===metadata.size,'Filstorleken stämmer inte för '+metadata.name+'.');
  files.push({customerId:row.customer_id,metadata,content:encode(bytes),sha256:await checksum(bytes)});
 }
 const current=await load(space);need(current.version===st.version,'Arbetsytan ändrades under exporten. Försök igen.');
 const {viewer:_,...state}=st;
 const result=BackupSchema.parse({format:'magnussons-crm-backup-1',exportedAt:new Date().toISOString(),sourceSpace:space,state,files});
 const validated=restoreState(emptyState(),{format:'magnussons-crm-1',state:result.state},true);validateFiles(validated,result.files);return result;
}
export async function importBackup(space:string,input:unknown,requestId:string,version:number,actor:Actor){
 const data=BackupSchema.parse(input),hash=await requestHash('backup_restore',data),db=database();
 const previous=await db.prepare('SELECT user_id,request_hash FROM crm_mutations WHERE space=? AND id=?').bind(space,requestId).first<{user_id:string;request_hash:string}>();
 if(previous){need(previous.user_id===actor.id&&previous.request_hash===hash,'Begäran används redan för en annan återställning.');return load(space);}
 await initialize(space);const current=await load(space);need(current.version===version,'Arbetsytan har ändrats. Läs in den igen före återställning.');
 need(!await db.prepare('SELECT id FROM crm_files WHERE space=? LIMIT 1').bind(space).first(),'Återställningen kräver en arbetsyta utan kundfiler.');
 need(!await db.prepare('SELECT id FROM crm_drafts WHERE space=? AND archived=0 LIMIT 1').bind(space).first(),'Återställningen kräver en arbetsyta utan öppna privata utkast.');
 const next=restoreState(current,{format:'magnussons-crm-1',state:data.state},true);validateFiles(next,data.files);
 const decoded:{file:typeof data.files[number];bytes:Uint8Array}[]=[];
 for(const file of data.files){
  const bytes=decode(file.content);need(bytes.length===file.metadata.size&&await checksum(bytes)===file.sha256,'Kontrollsumman stämmer inte för '+file.metadata.name+'. Inga uppgifter återställs.');decoded.push({file,bytes});
 }
 const ids=new Map(data.files.map(f=>[f.metadata.id,crypto.randomUUID()]));
 for(const o of next.orders){if(o.proofFileId)o.proofFileId=ids.get(o.proofFileId)!;for(const p of [o.production,...o.productionHistory])if(p.sketchFileId)p.sketchFileId=ids.get(p.sketchFileId)!;}
 for(const d of next.deals)if(d.repeatRecipe?.sketchFileId)d.repeatRecipe.sketchFileId=ids.get(d.repeatRecipe.sketchFileId)!;
 const stored:StoredFile[]=decoded.map(({file})=>{const id=ids.get(file.metadata.id)!;return {id,customerId:file.customerId,objectKey:space+'/'+file.customerId+'/'+id,metadata:{...file.metadata,id}}});
 const staged:string[]=[];let committed=false,uncertain=false;
 try{
  for(let i=0;i<stored.length;i++){staged.push(stored[i].objectKey);await bucket().put(stored[i].objectKey,decoded[i].bytes as unknown as ArrayBuffer,{httpMetadata:{contentType:'application/octet-stream'}});}
  const now=new Date().toISOString();for(const c of next.customers)next.events.push({id:crypto.randomUUID(),customerId:c.id,dealId:'',kind:'restore',at:now,text:'CRM-data och kundfiler återställda från kopia daterad '+data.exportedAt,actor:{id:actor.id,name:actor.name}});
  try{committed=await commit(space,current,next,requestId,undefined,{result:{},userId:actor.id,hash,restoreEmpty:true},stored);}
  catch(error){
   uncertain=true;
   try{const recorded=await db.prepare('SELECT user_id,request_hash FROM crm_mutations WHERE space=? AND id=?').bind(space,requestId).first<{user_id:string;request_hash:string}>();committed=recorded?.user_id===actor.id&&recorded?.request_hash===hash;uncertain=false;}catch{ /* Keep objects when the commit outcome cannot be established. */ }
   if(!committed)throw error;
  }
  need(committed,'Arbetsytan ändrades under återställningen. Inga uppgifter har skrivits över.');
  return await load(space);
 }finally{if(!committed&&!uncertain)for(const key of staged)try{await bucket().delete(key)}catch{console.error('Could not remove staged recovery object',key)}}
}
