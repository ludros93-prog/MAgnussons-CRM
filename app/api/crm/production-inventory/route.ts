import {z} from 'zod';
import {database} from '@/lib/crm-db';
import {member,AccessError} from '@/lib/crm-auth';
import {load,projectState} from '@/lib/crm-store';
import {buildProductionInventory,productionInventoryBasis,productionInventoryInput,ProductionInventoryReviewSchema,type ProductionInventoryMember} from '@/lib/production-inventory';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
 const actor=await member(req,false,true),params=new URL(req.url).searchParams;
 if(new Set(params.keys()).size!==Array.from(params.keys()).length)return reply({error:'Ange en arbetsyta utan upprepade parametrar.'},400);
 const parsedQuery=z.object({space:z.enum(['demo','live'])}).strict().safeParse(Object.fromEntries(params));
 if(!parsedQuery.success)return reply({error:'Ange rätt arbetsyta utan andra parametrar.'},400);
 const query=parsedQuery.data;
 const current=projectState(await load(query.space),query.space);
 const members=await database().prepare('SELECT id,user_id,name,role,active FROM crm_members ORDER BY name,id').all<ProductionInventoryMember>();
 const inventory=buildProductionInventory(current,members.results);
 const latest=projectState(await load(query.space),query.space);
 // Do not join an account snapshot onto jobs that changed during the read.
 const changed=productionInventoryInput(current)!==productionInventoryInput(latest);
 const expectedContext=await productionInventoryBasis(current);
 // No account directory is released after loss of admin access during reads.
 const fresh=await member(req,false,true);
 if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 if(changed)return reply({error:'Produktionsjobben ändrades under hämtningen. Läs in aktuellt underlag igen.'},409);
 const review=ProductionInventoryReviewSchema.safeParse({expectedContext,...inventory});
 if(!review.success)throw Error('Invalid production inventory data');
 return reply(review.data);
 }catch(error){
  if(error instanceof AccessError)return reply({error:error.message},error.status);
  console.error('Production inventory read failed');
  return reply({error:'Produktionsjobben och kontona kunde inte hämtas. Försök igen.'},503);
 }
}
