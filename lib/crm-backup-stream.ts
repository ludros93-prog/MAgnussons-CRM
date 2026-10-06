import {z} from 'zod';
import {database,bucket} from './crm-db';
import {load,requestHash} from './crm-store';
import {restoreState} from './crm-restore';
import {emptyState,type Actor,type State} from './crm';
import {BACKUP_MAX_BYTES,BackupFileDescriptor,backupNeed as need,checksum,encodeBackupFile,decodeBackupFile,validateBackupFiles,backupMutation,backupRestoreTarget,remapBackupFiles,cleanupBackupFiles,finishBackupRestore,readBackupFile,trustedBackupExport,type BackupExportAuthorization} from './crm-backup';

export const BACKUP_STREAM_FORMAT='magnussons-crm-backup-2';
const FILE_RECORD_BYTES=6700000;
const Header=z.object({type:z.literal('header'),format:z.literal(BACKUP_STREAM_FORMAT),exportedAt:z.string(),sourceSpace:z.enum(['demo','live']),state:z.unknown(),files:z.array(BackupFileDescriptor).max(2000)}).strict();
const FileRecord=z.object({type:z.literal('file'),id:z.string().min(1).max(100),content:z.string().max(6666668),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const End=z.object({type:z.literal('end'),files:z.number().int().nonnegative().max(2000),bytes:z.number().int().nonnegative().max(10000000000),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const encoder=new TextEncoder();
const recordBytes=(record:unknown)=>encoder.encode(JSON.stringify(record));
const advanceDigest=async(previous:string,bytes:Uint8Array)=>checksum(encoder.encode(previous+':'+await checksum(bytes)));
type FileRow={id:string;customer_id:string;object_key:string;data:string};
const fileRows=async(space:string)=>(await database().prepare('SELECT id,customer_id,object_key,data FROM crm_files WHERE space=? ORDER BY id').bind(space).all<FileRow>()).results;

// pull(), rather than start(), keeps export memory to the header and one file record.
export async function exportBackupStream(space:string,authorize:BackupExportAuthorization=trustedBackupExport):Promise<ReadableStream<Uint8Array>>{
 await authorize();const st=await load(space);await authorize();const rows=await fileRows(space);await authorize();
 const files=rows.map(row=>{const file=BackupFileDescriptor.parse({customerId:row.customer_id,metadata:JSON.parse(row.data)});need(file.metadata.id===row.id,'Kundfilens metadata har ett felaktigt ID.');return file;});
 const {viewer:_,...state}=st;
 const header=Header.parse({type:'header',format:BACKUP_STREAM_FORMAT,exportedAt:new Date().toISOString(),sourceSpace:space,state,files});
 const headerBytes=recordBytes(header);need(headerBytes.byteLength<=BACKUP_MAX_BYTES,'CRM-data och filförteckning får vara högst 16 MB.');
 const validated=restoreState(emptyState(),{format:'magnussons-crm-1',state:header.state},true);validateBackupFiles(validated,files,Infinity);
 const abort=new AbortController();let stopped=false;
 const check=async()=>{abort.signal.throwIfAborted();await authorize();abort.signal.throwIfAborted();};
 async function* records(){
  let digest=await checksum(headerBytes),bytes=0,count=0;
  yield encoder.encode(JSON.stringify(header)+'\n');
  for(let i=0;i<files.length;i++){
   const file=files[i],object=await bucket().get(rows[i].object_key);
   // Keep the body cancellable even when access changed while get() awaited.
   let content:Uint8Array;try{if(!object){await check();need(object,'Kundfilen '+file.metadata.name+' saknas i fillagringen. Kopian stoppades.');}need(object!.size===undefined||object!.size===file.metadata.size,'Filstorleken stämmer inte för '+file.metadata.name+'.');content=await readBackupFile(object!,file.metadata.size,file.metadata.name,check,abort.signal);}catch(error){if(typeof object?.body?.cancel==='function'&&!object.body.locked)try{await object.body.cancel();}catch{}throw error;}
   const record=encoder.encode(JSON.stringify({type:'file',id:file.metadata.id,content:encodeBackupFile(content),sha256:await checksum(content)})+'\n');digest=await advanceDigest(digest,record.subarray(0,record.byteLength-1));count++;bytes+=content.byteLength;
   yield record;
  }
  // Files have separate mutations and can change without the workspace version changing.
  need(JSON.stringify(await load(space))===JSON.stringify(st)&&JSON.stringify(await fileRows(space))===JSON.stringify(rows),'Arbetsytan eller kundfilerna ändrades under exporten. Försök igen.');
  yield encoder.encode(JSON.stringify({type:'end',files:count,bytes,sha256:digest})+'\n');
 }
 const iterator=records();return new ReadableStream<Uint8Array>({
  async pull(controller){try{await check();const record=await iterator.next();await check();if(record.done){stopped=true;controller.close();}else controller.enqueue(record.value);}catch(error){if(stopped)return;try{await authorize();}catch(access){error=access;}if(stopped)return;stopped=true;abort.abort();controller.error(error);await iterator.return();}},
  async cancel(){stopped=true;abort.abort();await iterator.return();}
 },{highWaterMark:0});
}

// Split raw bytes before decoding, enforcing a bounded UTF-8 record even across chunks.
async function* readRecords(body:ReadableStream<Uint8Array>){
 const reader=body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let parts:Uint8Array[]=[],size=0,index=0;
 try{
  while(true){const item=await reader.read();if(item.done)break;let start=0;
   while(start<item.value.byteLength){const newline=item.value.indexOf(10,start),end=newline===-1?item.value.byteLength:newline,part=item.value.subarray(start,end);size+=part.byteLength;
    need(size<=(index===0?BACKUP_MAX_BYTES:FILE_RECORD_BYTES),index===0?'CRM-data och filförteckning får vara högst 16 MB.':'En filpost i CRM-kopian är för stor.');parts.push(part);
    if(newline===-1)break;
    need(size>0,'CRM-kopian innehåller en tom post.');const bytes=new Uint8Array(size);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    parts=[];size=0;index++;yield {bytes,value:JSON.parse(decoder.decode(bytes))};start=newline+1;
   }
  }
  need(size===0,'CRM-kopian är avbruten och saknar en fullständig slutpost.');
 }finally{try{await reader.cancel();}catch{/* A failed input stream is already closed. */}reader.releaseLock();}
}

export async function importBackupStream(space:string,body:ReadableStream<Uint8Array>,requestId:string,version:number,actor:Actor):Promise<State>{
 const previous=await backupMutation(space,requestId),staged:string[]=[];let finalizing=false;
 try{
  const iterator=readRecords(body)[Symbol.asyncIterator]();
  try{
   const first=await iterator.next();need(!first.done,'Kopian saknas.');const header=Header.parse(first.value!.value);
   const validated=restoreState(emptyState(),{format:'magnussons-crm-1',state:header.state},true);validateBackupFiles(validated,header.files,Infinity);
   const current=previous?undefined:await backupRestoreTarget(space,version);
   const next=current?restoreState(current,{format:'magnussons-crm-1',state:header.state},true):validated;
   const stored=previous?[]:remapBackupFiles(space,next,header.files);
   let digest=await checksum(first.value!.bytes),bytes=0;
   for(let i=0;i<header.files.length;i++){
    const item=await iterator.next();need(!item.done,'CRM-kopian är avbruten och saknar kundfiler eller slutpost.');const record=FileRecord.parse(item.value!.value),file=header.files[i];
    need(record.id===file.metadata.id,'Kopian saknar rätt fil eller innehåller en extra filpost.');
    const content=decodeBackupFile(record.content,true);need(content.byteLength===file.metadata.size&&await checksum(content)===record.sha256,'Kontrollsumman stämmer inte för '+file.metadata.name+'. Inga uppgifter återställs.');
    digest=await advanceDigest(digest,item.value!.bytes);bytes+=content.byteLength;
    if(!previous){staged.push(stored[i].objectKey);await bucket().put(stored[i].objectKey,content as unknown as ArrayBuffer,{httpMetadata:{contentType:'application/octet-stream'}});}
   }
   const final=await iterator.next();need(!final.done,'CRM-kopian är avbruten och saknar slutpost.');const end=End.parse(final.value!.value);
   need(end.files===header.files.length&&end.bytes===bytes&&end.sha256===digest,'CRM-kopians slutkontroll stämmer inte. Inga uppgifter återställs.');
   need((await iterator.next()).done,'CRM-kopian innehåller uppgifter efter slutposten.');
   const hash=await requestHash('backup_restore_stream',{sha256:digest});
   if(previous){need(previous.user_id===actor.id&&previous.request_hash===hash,'Begäran används redan för en annan återställning.');return await load(space);}
   finalizing=true;return await finishBackupRestore(space,current!,next,stored,staged,requestId,hash,header.exportedAt,actor);
  }finally{await iterator.return?.();}
 }finally{if(!finalizing)await cleanupBackupFiles(staged);}
}
