import {z} from 'zod';
import {member,AccessError} from '@/lib/crm-auth';
import {RoleSchema} from '@/lib/operations';
import {readAccountChangeInput,buildAccountChangeReview} from '@/lib/account-change-review';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
 const actor=await member(req,false,true),params=new URL(req.url).searchParams;
 if(new Set(params.keys()).size!==Array.from(params.keys()).length)return reply({error:'Ange kontot och ändringen utan upprepade parametrar.'},400);
 const parsed=z.object({memberId:z.string().min(1).max(100),role:RoleSchema,active:z.enum(['true','false'])}).strict().safeParse(Object.fromEntries(params));
 if(!parsed.success)return reply({error:'Ange ett registrerat konto, en roll och om kontot ska vara aktivt.'},400);
 const requested={role:parsed.data.role,active:parsed.data.active==='true'},input=await readAccountChangeInput(),matches=input.members.filter(account=>account.id===parsed.data.memberId);
 if(matches.length!==1)return reply({error:'Kontot finns inte längre. Läs in kontolistan igen.'},404);
 const review=await buildAccountChangeReview(input,matches[0],requested),latest=await readAccountChangeInput(),latestTarget=latest.members.filter(account=>account.id===parsed.data.memberId);
 const current=latestTarget.length===1?await buildAccountChangeReview(latest,latestTarget[0],requested):undefined;
 // A changed store or replaced account cannot be joined onto the old review.
 const fresh=await member(req,false,true);
 if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 if(!current||current.expectedContext!==review.expectedContext)return reply({error:'Kontot eller produktionsansvaret ändrades under hämtningen. Granska aktuellt underlag igen.'},409);
 return reply(review);
 }catch(error){
  if(error instanceof AccessError)return reply({error:error.message},error.status);
  console.error('Account change review failed');
  return reply({error:'Kontots produktionsansvar kunde inte kontrolleras. Ingen minskning av åtkomst kan godkännas innan underlaget har granskats.'},503);
 }
}
