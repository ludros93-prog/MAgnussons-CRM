import {z} from 'zod';
import {member,AccessError} from '@/lib/crm-auth';
import {RoleSchema} from '@/lib/operations';
import {readAccountChangeInput,buildAccountChangeReview,buildAccountChangeWork} from '@/lib/account-change-review';
import {ACCOUNT_CHANGE_WORK_PAGE_SIZE,AccountChangeWorkSchema} from '@/lib/account-change-work-schema';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const offsetSchema=z.string().max(16).regex(/^(?:0|[1-9]\d*)$/).transform(Number).refine(Number.isSafeInteger).default('0');
export async function GET(req:Request){try{
 const actor=await member(req,false,true),params=new URL(req.url).searchParams;
 if(new Set(params.keys()).size!==Array.from(params.keys()).length)return reply({error:'Ange kontoändringen utan upprepade parametrar.'},400);
 const parsed=z.object({memberId:z.string().min(1).max(100),role:RoleSchema,active:z.enum(['true','false']),expectedContext:z.string().regex(/^[a-f0-9]{64}$/),offset:offsetSchema}).strict().safeParse(Object.fromEntries(params));
 if(!parsed.success)return reply({error:'Ange kontoändringens aktuella granskning och en giltig sida.'},400);
 const requested={role:parsed.data.role,active:parsed.data.active==='true'},input=await readAccountChangeInput(),matches=input.members.filter(account=>account.id===parsed.data.memberId);
 if(matches.length!==1)return reply({error:'Kontot finns inte längre. Läs in kontolistan igen.'},404);
 const review=await buildAccountChangeReview(input,matches[0],requested),rows=buildAccountChangeWork(input,matches[0],requested);
 const latest=await readAccountChangeInput(),latestTarget=latest.members.filter(account=>account.id===parsed.data.memberId);
 const current=latestTarget.length===1?await buildAccountChangeReview(latest,latestTarget[0],requested):undefined;
 const fresh=await member(req,false,true);
 if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 if(review.expectedContext!==parsed.data.expectedContext||!current||current.expectedContext!==review.expectedContext)return reply({error:'Kontot eller produktionsansvaret ändrades. Hämta kontoändringens granskning igen innan du läser ansvarsdelarna.'},409);
 const offset=parsed.data.offset,total=rows.length;
 if(offset>total)return reply({error:'Sidan finns inte i det aktuella granskningsunderlaget. Börja från första sidan.'},400);
 const pageRows=rows.slice(offset,offset+ACCOUNT_CHANGE_WORK_PAGE_SIZE),nextOffset=offset+pageRows.length<total?offset+pageRows.length:null;
 return reply(AccountChangeWorkSchema.parse({expectedContext:review.expectedContext,total,offset,nextOffset,rows:pageRows}));
 }catch(error){
  if(error instanceof AccessError)return reply({error:error.message},error.status);
  console.error('Account change work read failed');
  return reply({error:'Ansvarsdelarna kunde inte hämtas. Tidigare detaljunderlag används inte. Försök igen eller hämta kontoändringens granskning på nytt.'},503);
 }
}
