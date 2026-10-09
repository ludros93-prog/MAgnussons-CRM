import {z} from 'zod';
import {database} from '@/lib/crm-db';
import {member,AccessError,type Member} from '@/lib/crm-auth';
import {load,projectState} from '@/lib/crm-store';
import {recordBasis} from '@/lib/record-conflicts';
import {productionIssueResponsibility,productionIssueResponsibilityBasis,productionIssueResponsibilityBlockedReason,productionIssueResponsibilityRole,productionIssueResponsibilityTargetBasis,ProductionIssueResponsibilityReviewSchema,type ProductionIssueResponsibilityCandidate} from '@/lib/production-issue-responsibility';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const readDirectory=()=>database().prepare("SELECT id,user_id,name,role,active FROM crm_members AS candidate WHERE active=1 AND user_id IS NOT NULL AND user_id<>'' AND role IN ('admin','seller','production','print','warehouse') AND NOT EXISTS(SELECT 1 FROM crm_members AS other WHERE other.user_id=candidate.user_id AND other.id<>candidate.id) ORDER BY name,id").all<Pick<Member,'id'|'user_id'|'name'|'role'|'active'>>();
const directoryBasis=(rows:readonly Pick<Member,'id'|'user_id'|'name'|'role'|'active'>[])=>recordBasis(rows.map(row=>recordBasis(row)).sort());
export async function GET(req:Request){try{
 const actor=await member(req,false,true),params=new URL(req.url).searchParams;
 if(new Set(params.keys()).size!==Array.from(params.keys()).length)return reply({error:'Ange granskningen utan upprepade parametrar.'},400);
 const parsed=z.object({space:z.enum(['demo','live']),orderId:z.string().trim().min(1).max(100),workId:z.string().trim().min(1).max(100)}).strict().safeParse(Object.fromEntries(params));
 if(!parsed.success)return reply({error:'Ange rätt arbetsyta, order och arbetsversion.'},400);
 const query=parsed.data;
 const current=projectState(await load(query.space),query.space),expectedContext=productionIssueResponsibilityBasis(current,query.orderId),blockedReason=productionIssueResponsibilityBlockedReason(current,query.orderId,query.workId),order=current.orders.find(order=>order.id===query.orderId),directory=await readDirectory();
 const source=order?productionIssueResponsibility(order.production):undefined,candidates:ProductionIssueResponsibilityCandidate[]=[];
 if(!blockedReason)for(const row of directory.results){
  if(!row.user_id||row.user_id!==row.user_id.trim()||row.id!==row.id.trim()||row.id.length>100||!row.name.trim()||!productionIssueResponsibilityRole(row.role)||row.user_id===source?.userId)continue;
  const expectedTarget=await productionIssueResponsibilityTargetBasis({memberId:row.id,userId:row.user_id,name:row.name,role:row.role,active:1});candidates.push({memberId:row.id,name:row.name,role:row.role,expectedTarget});
 }
 const latest=projectState(await load(query.space),query.space),latestDirectory=await readDirectory();
 // The final check precedes any release of the administrative account list.
 const fresh=await member(req,false,true);if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 if(productionIssueResponsibilityBasis(latest,query.orderId)!==expectedContext)return reply({error:'Hindret eller arbetsordern ändrades under granskningen. Hämta aktuellt underlag och granska igen.'},409);
 if(directoryBasis(directory.results)!==directoryBasis(latestDirectory.results))return reply({error:'Kontona ändrades under granskningen. Hämta aktuellt underlag och granska igen.'},409);
 return reply(ProductionIssueResponsibilityReviewSchema.parse({orderId:query.orderId,workId:query.workId,expectedContext,candidates,blockedReason:blockedReason||(!candidates.length?'Det finns inget annat aktivt och anslutet konto som får hantera produktionshinder.':'')}));
 }catch(error){if(error instanceof AccessError)return reply({error:error.message},error.status);console.error('Production issue responsibility review failed');return reply({error:'Hinderansvaret kunde inte hämtas. Försök igen.'},503)}
}
