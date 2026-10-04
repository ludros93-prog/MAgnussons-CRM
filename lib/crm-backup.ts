import {z} from 'zod';
import {database,bucket} from './crm-db';
import {load,commit,initialize,requestHash,type StoredFile} from './crm-store';
import {restoreState} from './crm-restore';
import {collectFileReferences} from './export-references';
import {RuleError,emptyState,type State,type Actor} from './crm';

export const BACKUP_MAX_BYTES=16000000;
const FILE_BYTES=10000000;
export const BackupFileMeta=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(200),version:z.string().min(1).max(100),kind:z.enum(['logo','proof','document']),size:z.number().int().positive().max(5000000),at:z.string(),uploadedBy:z.string(),purpose:z.literal('production').optional(),orderId:z.string().min(1).max(100).optional(),workId:z.string().min(1).max(100).optional()});
export const BackupFileDescriptor=z.object({customerId:z.string().min(1).max(100),metadata:BackupFileMeta});
export type BackupFile=z.infer<typeof BackupFileDescriptor>;
const BackupSchema=z.object({format:z.literal('magnussons-crm-backup-1'),exportedAt:z.string(),sourceSpace:z.enum(['demo','live']),state:z.unknown(),files:z.array(BackupFileDescriptor.extend({content:z.string().max(6700000),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).max(2000)});
export const backupNeed=(v:unknown,message:string)=>{if(!v)throw new RuleError(message)};
const need=backupNeed;
export async function checksum(bytes:Uint8Array){const hash=await crypto.subtle.digest('SHA-256',bytes as BufferSource);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
export const encodeBackupFile=(bytes:Uint8Array)=>{let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(raw)};
export const decodeBackupFile=(value:string,canonical=false)=>{need(value.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(value),'Filinnehållet är felaktigt.');const raw=atob(value);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(canonical)need(encodeBackupFile(bytes)===value,'Filinnehållet är felaktigt.');return bytes;};
export function validateBackupFiles(st:State,files:BackupFile[],totalLimit=FILE_BYTES){
 need(files.length<=2000,'Högst 2 000 kundfiler per kopia.');
 for(const f of files){const m=f.metadata;if(m.purpose||m.orderId||m.workId){const o=st.orders.find(o=>o.id===m.orderId&&o.customerId===f.customerId);need(m.purpose==='production'&&m.kind==='document'&&!!o&&[o.production,...o.productionHistory].some(p=>p.workId===m.workId),'Ett arbetsfoto saknar giltig koppling till order och arbetsversion.');}}
 const customers=new Set(st.customers.map(c=>c.id)),seen=new Set<string>(),counts=new Map<string,number>();let total=0;
 for(const f of files){need(!seen.has(f.metadata.id),'Kopian innehåller dubbla fil-ID:n.');seen.add(f.metadata.id);need(customers.has(f.customerId),'En kundfil saknar sin kund.');const count=(counts.get(f.customerId)||0)+1;need(count<=200,'Högst 200 filer per kund.');counts.set(f.customerId,count);total+=f.metadata.size;need(total<=totalLimit,'CRM-kopian stöder högst 10 MB kundfiler totalt.');}
 const byId=new Map(files.map(f=>[f.metadata.id,f]));
 for(const ref of collectFileReferences(st)){const f=byId.get(ref.id);need(f&&f.customerId===ref.customerId&&f.metadata.version===ref.version&&(ref.kind!=='proof'||f.metadata.kind==='proof'),'En korrektur- eller skissreferens saknar rätt kundfil och version.');}
}
export async function backupMutation(space:string,requestId:string){return database().prepare('SELECT user_id,request_hash FROM crm_mutations WHERE space=? AND id=?').bind(space,requestId).first<{user_id:string;request_hash:string}>();}
export async function backupRestoreTarget(space:string,version:number){
 await initialize(space);const current=await load(space);need(current.version===version,'Arbetsytan har ändrats. Läs in den igen före återställning.');
 need(!await database().prepare('SELECT id FROM crm_files WHERE space=? LIMIT 1').bind(space).first(),'Återställningen kräver en arbetsyta utan kundfiler.');
 need(!await database().prepare('SELECT id FROM crm_drafts WHERE space=? AND archived=0 LIMIT 1').bind(space).first(),'Återställningen kräver en arbetsyta utan öppna privata utkast.');
 return current;
}
export function remapBackupFiles(space:string,next:State,files:BackupFile[]):StoredFile[]{
 const ids=new Map(files.map(f=>[f.metadata.id,crypto.randomUUID()]));
 for(const o of next.orders){if(o.proofFileId)o.proofFileId=ids.get(o.proofFileId)!;for(const p of [o.production,...o.productionHistory])if(p.sketchFileId)p.sketchFileId=ids.get(p.sketchFileId)!;}
 for(const d of next.deals)if(d.repeatRecipe?.sketchFileId)d.repeatRecipe.sketchFileId=ids.get(d.repeatRecipe.sketchFileId)!;
 return files.map(file=>{const id=ids.get(file.metadata.id)!;return {id,customerId:file.customerId,objectKey:space+'/'+file.customerId+'/'+id,metadata:{...file.metadata,id}}});
}
export async function cleanupBackupFiles(keys:string[]){for(const key of keys)try{await bucket().delete(key)}catch{console.error('Could not remove staged recovery object',key)}}
// Both formats use the same atomic CAS, empty-target gate and uncertain-commit protection.
export async function finishBackupRestore(space:string,current:State,next:State,stored:StoredFile[],staged:string[],requestId:string,hash:string,exportedAt:string,actor:Actor){
 let committed=false,uncertain=false,replayed=false;
 try{
  const now=new Date().toISOString();for(const c of next.customers)next.events.push({id:crypto.randomUUID(),customerId:c.id,dealId:'',kind:'restore',at:now,text:'CRM-data och kundfiler återställda från kopia daterad '+exportedAt,actor:{id:actor.id,name:actor.name}});
  try{committed=await commit(space,current,next,requestId,undefined,{result:{},userId:actor.id,hash,restoreEmpty:true},stored);}
  catch(error){
   uncertain=true;
   try{const recorded=await backupMutation(space,requestId);replayed=recorded?.user_id===actor.id&&recorded?.request_hash===hash;uncertain=false;
    if(replayed){const rows=await database().prepare('SELECT object_key FROM crm_files WHERE space=?').bind(space).all<{object_key:string}>();const keys=new Set(rows.results.map(r=>r.object_key));committed=stored.every(f=>keys.has(f.objectKey));}
   }catch{uncertain=true; /* Preserve staged objects if the commit cannot be established. */}
   if(!committed&&!replayed)throw error;
  }
  if(!committed&&!replayed){const recorded=await backupMutation(space,requestId);replayed=recorded?.user_id===actor.id&&recorded?.request_hash===hash;}
  need(committed||replayed,'Arbetsytan ändrades under återställningen. Inga uppgifter har skrivits över.');
  return await load(space);
 }finally{if(!committed&&!uncertain)await cleanupBackupFiles(staged);}
}
export async function exportBackup(space:string){
 const st=await load(space),rows=await database().prepare('SELECT customer_id,object_key,data FROM crm_files WHERE space=? ORDER BY id').bind(space).all<{customer_id:string;object_key:string;data:string}>();
 const files:z.infer<typeof BackupSchema>['files']=[];let total=0;
 for(const row of rows.results){
  const metadata=BackupFileMeta.parse(JSON.parse(row.data));total+=metadata.size;need(total<=FILE_BYTES,'CRM-kopian stöder högst 10 MB kundfiler totalt. Ingen ofullständig kopia skapas.');
  const object=await bucket().get(row.object_key);need(object,'Kundfilen '+metadata.name+' saknas i fillagringen. Kopian stoppades.');
  const bytes=new Uint8Array(await object!.arrayBuffer());need(bytes.byteLength===metadata.size,'Filstorleken stämmer inte för '+metadata.name+'.');
  files.push({customerId:row.customer_id,metadata,content:encodeBackupFile(bytes),sha256:await checksum(bytes)});
 }
 const current=await load(space);need(current.version===st.version,'Arbetsytan ändrades under exporten. Försök igen.');
 const {viewer:_,...state}=st;
 const result=BackupSchema.parse({format:'magnussons-crm-backup-1',exportedAt:new Date().toISOString(),sourceSpace:space,state,files});
 const validated=restoreState(emptyState(),{format:'magnussons-crm-1',state:result.state},true);validateBackupFiles(validated,result.files);return result;
}
export async function importBackup(space:string,input:unknown,requestId:string,version:number,actor:Actor){
 const data=BackupSchema.parse(input),hash=await requestHash('backup_restore',data),previous=await backupMutation(space,requestId);
 if(previous){need(previous.user_id===actor.id&&previous.request_hash===hash,'Begäran används redan för en annan återställning.');return load(space);}
 const current=await backupRestoreTarget(space,version),next=restoreState(current,{format:'magnussons-crm-1',state:data.state},true);validateBackupFiles(next,data.files);
 const decoded=data.files.map(file=>({file,bytes:decodeBackupFile(file.content)}));
 for(const {file,bytes} of decoded)need(bytes.length===file.metadata.size&&await checksum(bytes)===file.sha256,'Kontrollsumman stämmer inte för '+file.metadata.name+'. Inga uppgifter återställs.');
 const stored=remapBackupFiles(space,next,data.files),staged:string[]=[];let finalizing=false;
 try{
  for(let i=0;i<stored.length;i++){staged.push(stored[i].objectKey);await bucket().put(stored[i].objectKey,decoded[i].bytes as unknown as ArrayBuffer,{httpMetadata:{contentType:'application/octet-stream'}});}
  finalizing=true;return await finishBackupRestore(space,current,next,stored,staged,requestId,hash,data.exportedAt,actor);
 }finally{if(!finalizing)await cleanupBackupFiles(staged);}
}
