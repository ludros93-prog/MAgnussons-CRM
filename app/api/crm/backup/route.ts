import {z} from 'zod';
import {member,viewer,AccessError,sameOrigin} from '@/lib/crm-auth';
import {RuleError} from '@/lib/crm';
import {visibleState} from '@/lib/crm-visibility';
import {exportBackup,importBackup,BACKUP_MAX_BYTES} from '@/lib/crm-backup';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>e instanceof AccessError?reply({error:e.message},e.status):e instanceof RuleError?reply({error:e.message},400):e instanceof z.ZodError?reply({error:'CRM-kopian har ett ogiltigt format.'},400):reply({error:'CRM-kopian kunde inte hanteras. Inga befintliga kunduppgifter skrivs över.'},503);
export async function GET(req:Request){try{await member(req,false,true);const space=z.enum(['demo','live']).parse(new URL(req.url).searchParams.get('space'));const value=await exportBackup(space),body=JSON.stringify(value);if(new TextEncoder().encode(body).byteLength>BACKUP_MAX_BYTES)throw new RuleError('CRM-kopian är större än 16 MB. Ingen ofullständig kopia skapas.');return new Response(body,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="magnussons-crm-med-filer-'+space+'.json"'}});}catch(e){return fail(e)}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=await member(req,true,true);const reader=req.body?.getReader();if(!reader)throw new RuleError('Kopian saknas.');const chunks:Uint8Array[]=[];let size=0;while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>BACKUP_MAX_BYTES+1000){await reader.cancel();throw new RuleError('CRM-kopian får vara högst 16 MB.');}chunks.push(item.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
 const p=z.object({space:z.enum(['demo','live']),requestId:z.string().uuid(),version:z.number().int().nonnegative(),backup:z.unknown()}).parse(JSON.parse(new TextDecoder().decode(bytes)));
 const st=await importBackup(p.space,p.backup,p.requestId,p.version,{id:user.user_id!,name:user.name,role:user.role,owner:user.owner});return reply(visibleState(st,viewer(user)));
 }catch(e){return fail(e)}}
