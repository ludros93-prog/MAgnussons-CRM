import {RoleSchema} from '@/lib/operations';
import { z } from 'zod';
import { database } from '@/lib/crm-db';
import { member,AccessError,sameOrigin } from '@/lib/crm-auth';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>{if(e instanceof AccessError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues.map(i=>i.message).join(' ')},400);console.error('CRM team failed',e);return response({error:'Teamet kunde inte uppdateras.'},503)};
export async function GET(req:Request){try{await member(req,false,true);return response((await database().prepare('SELECT id,email,name,role,owner,active,user_id IS NOT NULL AS connected FROM crm_members ORDER BY name').all()).results)}catch(e){return fail(e)}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=await member(req,true,true);const v=z.object({email:z.string().email().transform(s=>s.toLowerCase().trim()),name:z.string().trim().min(1).max(150),role:RoleSchema,owner:z.string().max(150).default(''),active:z.boolean().default(true)}).parse(await req.json());
 if(v.email===user.email&&(!v.active||v.role!=='admin'))throw new AccessError('Ditt eget administratörskonto kan inte stängas av här.');
 if(v.active&&v.role==='seller'&&!v.owner)throw new AccessError('Koppla en aktiv säljare till en kundansvarig för att ordernotiser ska hamna rätt.');
 const db=database();if(v.owner){const spaces=await db.prepare('SELECT settings FROM crm_spaces').all<{settings:string}>();if(!spaces.results.some(s=>JSON.parse(s.settings).owners.includes(v.owner)))throw new AccessError('Lägg till den ansvariga säljaren i inställningarna först.');}
 if(v.owner&&v.active){const other=await db.prepare('SELECT id FROM crm_members WHERE owner=? AND active=1 AND email<>?').bind(v.owner,v.email).first();if(other)throw new AccessError('Den ansvariga säljaren är redan kopplad till ett annat konto.');}
 await db.prepare('INSERT INTO crm_members(id,email,name,role,owner,active) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,owner=excluded.owner,active=excluded.active').bind(crypto.randomUUID(),v.email,v.name,v.role,v.owner,v.active?1:0).run();return response({ok:true});
 }catch(e){return fail(e)}}
