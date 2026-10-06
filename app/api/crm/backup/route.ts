import {z} from 'zod';
import {member,viewer,AccessError,sameOrigin,type Member} from '@/lib/crm-auth';
import {RuleError} from '@/lib/crm';
import {database} from '@/lib/crm-db';
import {visibleState} from '@/lib/crm-visibility';
import {exportBackup,importBackup,BACKUP_MAX_BYTES} from '@/lib/crm-backup';
import {exportBackupStream,importBackupStream} from '@/lib/crm-backup-stream';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>e instanceof AccessError?reply({error:e.message},e.status):e instanceof RuleError?reply({error:e.message},400):e instanceof z.ZodError||e instanceof SyntaxError||e instanceof TypeError?reply({error:'CRM-kopian har ett ogiltigt eller avbrutet format.'},400):reply({error:'CRM-kopian kunde inte hanteras. Inga befintliga kunduppgifter skrivs över.'},503);
async function currentRestoreMember(req:Request,initial:Member){
 const current=await member(req,true,true);
 if(current.id!==initial.id||current.user_id!==initial.user_id||current.owner!==initial.owner)throw new AccessError('Kontots identitet eller ansvar har ändrats. Läs in aktuella uppgifter och försök igen.');
 return current;
}
async function currentExportMember(initial:Member){
 // Read the original membership only: a deleted or unbound account must not be
 // bootstrapped or rebound by a check during an in-flight export.
 const current=await database().prepare('SELECT * FROM crm_members WHERE id=?').bind(initial.id).first<Member>();
 if(!current?.active||current.role!=='admin'||current.user_id!==initial.user_id||current.owner!==initial.owner||current.email!==initial.email)throw new AccessError('Behörigheten till CRM-kopian har ändrats. Läs in aktuella uppgifter och försök igen.');
}
export async function GET(req:Request){let initial:Member|undefined;try{
 initial=await member(req,false,true);const user=initial,authorize=()=>currentExportMember(user),params=new URL(req.url).searchParams,space=z.enum(['demo','live']).parse(params.get('space'));
 if(params.get('format')==='stream'){const body=await exportBackupStream(space,authorize);await authorize();return new Response(body,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','Content-Disposition':'attachment; filename="magnussons-crm-med-filer-'+space+'.ndjson"'}});}
 const value=await exportBackup(space,authorize),body=JSON.stringify(value);if(new TextEncoder().encode(body).byteLength>BACKUP_MAX_BYTES)throw new RuleError('CRM-kopian är större än 16 MB. Ingen ofullständig kopia skapas.');await authorize();return new Response(body,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="magnussons-crm-med-filer-'+space+'.json"'}});
 }catch(e){if(initial)try{await currentExportMember(initial)}catch(access){return fail(access)}return fail(e)}}
export async function POST(req:Request){let initial:Member|undefined;try{
 sameOrigin(req);const user=await member(req,true,true);initial=user;const actor={id:user.user_id!,memberId:user.id,name:user.name,role:user.role,owner:user.owner};
 if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()==='application/x-ndjson'){
  const params=new URL(req.url).searchParams,p=z.object({space:z.enum(['demo','live']),requestId:z.string().uuid(),version:z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))}).parse({space:params.get('space'),requestId:params.get('requestId'),version:params.get('version')??undefined});
  if(!req.body)throw new RuleError('Kopian saknas.');const st=await importBackupStream(p.space,req.body,p.requestId,p.version,actor);return reply(visibleState(st,viewer(await currentRestoreMember(req,user))));
 }
 const reader=req.body?.getReader();if(!reader)throw new RuleError('Kopian saknas.');const chunks:Uint8Array[]=[];let size=0;while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>BACKUP_MAX_BYTES+1000){await reader.cancel();throw new RuleError('CRM-kopian får vara högst 16 MB.');}chunks.push(item.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
 const p=z.object({space:z.enum(['demo','live']),requestId:z.string().uuid(),version:z.number().int().nonnegative(),backup:z.unknown()}).parse(JSON.parse(new TextDecoder().decode(bytes)));
 const st=await importBackup(p.space,p.backup,p.requestId,p.version,actor);return reply(visibleState(st,viewer(await currentRestoreMember(req,user))));
 }catch(e){
 // Import has already classified the commit outcome and cleaned only proven
 // losing uploads. Recheck access before returning any result or error.
 if(initial)try{await currentRestoreMember(req,initial)}catch(access){return fail(access)}
 return fail(e);
 }}
