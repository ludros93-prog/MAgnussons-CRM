import {RoleSchema} from '@/lib/operations';
import { z } from 'zod';
import { database } from '@/lib/crm-db';
import { member,AccessError,sameOrigin } from '@/lib/crm-auth';
import {AccountReviewEnvelopeSchema,accountExpectedBasis,accountChangeNeedsReview,readAccountChangeInput,buildAccountChangeReview,accountChangeWriteGuard,assertAccountChangeTarget,type AccountChangeTarget} from '@/lib/account-change-review';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>{if(e instanceof AccessError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues.map(i=>i.message).join(' ')},400);console.error('CRM team failed',e);return response({error:'Teamet kunde inte uppdateras.'},503)};
export async function GET(req:Request){try{
 const actor=await member(req,false,true),rows=await database().prepare('SELECT id,email,user_id,name,role,owner,active,user_id IS NOT NULL AS connected FROM crm_members ORDER BY name').all<AccountChangeTarget&{connected:number}>();
 const accounts=await Promise.all(rows.results.map(async row=>{const {user_id,...account}=row;return {...account,expectedAccount:await accountExpectedBasis(row)};}));
 const fresh=await member(req,false,true);if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 return response(accounts);
 }catch(e){return fail(e)}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=await member(req,true,true);const v=z.object({email:z.string().email().transform(s=>s.toLowerCase().trim()),name:z.string().trim().min(1).max(150),role:RoleSchema,owner:z.string().max(150).default(''),active:z.boolean().default(true),accountReview:AccountReviewEnvelopeSchema.optional()}).parse(await req.json());
 if(v.email===user.email&&(!v.active||v.role!=='admin'))throw new AccessError('Ditt eget administratörskonto kan inte stängas av här.');
 if(v.active&&v.role==='seller'&&!v.owner)throw new AccessError('Koppla en aktiv säljare till en kundansvarig för att ordernotiser ska hamna rätt.');
 const db=database(),target=await db.prepare('SELECT id,email,user_id,name,role,owner,active FROM crm_members WHERE email=?').bind(v.email).first<AccountChangeTarget>(),requested={role:v.role,active:v.active};
 if(target)assertAccountChangeTarget(target);
 const dangerous=!!target&&accountChangeNeedsReview(target,requested);
 if(dangerous){
  if(!v.accountReview)return response({error:'Granska kontots produktionsansvar i alla lagrade arbetsytor innan åtkomsten minskas.',code:'account_review_required'},409);
  if(v.accountReview.memberId!==target!.id||v.accountReview.expectedAccount!==await accountExpectedBasis(target!))return response({error:'Kontot har ändrats. Dina val finns kvar. Läs in kontolistan och granska kontot igen.',code:'account_review_conflict'},409);
  const input=await readAccountChangeInput(),current=input.members.find(account=>account.id===target!.id);
  if(!current||await accountExpectedBasis(current)!==v.accountReview.expectedAccount)return response({error:'Kontot har ändrats. Dina val finns kvar. Läs in kontolistan och granska kontot igen.',code:'account_review_conflict'},409);
  const review=await buildAccountChangeReview(input,current,requested);
  if(review.expectedContext!==v.accountReview.expectedContext)return response({error:'Produktionsansvaret eller ändringen har ändrats. Dina val finns kvar. Granska underlaget igen.',code:'account_review_conflict'},409);
  if(review.blocked)return response({error:review.reason,code:'account_change_blocked'},409);
 }
 if(v.owner){const spaces=await db.prepare('SELECT settings FROM crm_spaces').all<{settings:string}>();if(!spaces.results.some(s=>JSON.parse(s.settings).owners.includes(v.owner)))throw new AccessError('Lägg till den ansvariga säljaren i inställningarna först.');}
 if(v.owner&&v.active){const other=await db.prepare('SELECT id FROM crm_members WHERE owner=? AND active=1 AND email<>?').bind(v.owner,v.email).first();if(other)throw new AccessError('Den ansvariga säljaren är redan kopplad till ett annat konto.');}
 // Check these invariants in the write itself: a concurrent admin may have
 // assigned the same profile or removed the actor's administrative role.
 const targetGate=target?' AND EXISTS(SELECT 1 FROM crm_members WHERE id=? AND email=? AND user_id IS ? AND name=? AND role=? AND owner=? AND active=?)':' AND NOT EXISTS(SELECT 1 FROM crm_members WHERE email=?)';
 const targetValues=target?[target.id,target.email,target.user_id,target.name,target.role,target.owner,target.active]:[v.email],workGuard=target?accountChangeWriteGuard(target,requested):{sql:'',values:[]};
 const result=await db.prepare(`INSERT INTO crm_members(id,email,name,role,owner,active)
 SELECT ?,?,?,?,?,? WHERE
 EXISTS(SELECT 1 FROM crm_members WHERE id=? AND user_id=? AND email=? AND role='admin' AND active=1)
 AND (?='' OR ?=0 OR NOT EXISTS(SELECT 1 FROM crm_members WHERE owner=? AND active=1 AND email<>?))
 AND (?=1 AND ?='admin' OR NOT EXISTS(SELECT 1 FROM crm_members WHERE email=? AND role='admin' AND active=1)
 OR EXISTS(SELECT 1 FROM crm_members WHERE email<>? AND role='admin' AND active=1))${targetGate}${workGuard.sql}
 ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,owner=excluded.owner,active=excluded.active`)
 .bind(crypto.randomUUID(),v.email,v.name,v.role,v.owner,v.active?1:0,user.id,user.user_id!,user.email,v.owner,v.active?1:0,v.owner,v.email,v.active?1:0,v.role,v.email,v.email,...targetValues,...workGuard.values).run();
 if(result.meta.changes!==1){const fresh=await member(req,true,true);if(fresh.id!==user.id||fresh.user_id!==user.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');return response({error:dangerous?'Kontot, teamet eller produktionsansvaret har ändrats. Dina val finns kvar. Granska aktuellt underlag igen.':'Teamet har ändrats. Kontrollera kontots roll och säljarprofil innan du försöker igen.',code:'account_change_conflict'},409);}
 return response({ok:true});
 }catch(e){return fail(e)}}
