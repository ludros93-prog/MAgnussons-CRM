import {z} from 'zod';
import {database} from '@/lib/crm-db';
import {member,AccessError,type Member} from '@/lib/crm-auth';
import {load,projectState} from '@/lib/crm-store';
import {productionAssignmentBasis,productionAssignmentBlockedReason,productionAssignmentRole,productionAssignmentTargetBasis,type ProductionAssignmentCandidate,type ProductionAssignmentReview} from '@/lib/production-assignment';

const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
 const actor=await member(req,false,true),params=new URL(req.url).searchParams;
 if(new Set(params.keys()).size!==Array.from(params.keys()).length)return reply({error:'Ange granskningen utan upprepade parametrar.'},400);
 const query=z.object({space:z.enum(['demo','live']),orderId:z.string().trim().min(1).max(100),workId:z.string().trim().min(1).max(100),purpose:z.enum(['transfer','resolve_legacy']).default('transfer')}).strict().parse(Object.fromEntries(params));
 const current=projectState(await load(query.space),query.space),expectedContext=productionAssignmentBasis(current,query.orderId,query.purpose),blockedReason=productionAssignmentBlockedReason(current,query.orderId,query.workId,query.purpose),order=current.orders.find(order=>order.id===query.orderId);
 const rows=await database().prepare("SELECT id,user_id,name,role,active FROM crm_members AS candidate WHERE active=1 AND user_id IS NOT NULL AND user_id<>'' AND role IN ('admin','production','print','warehouse') AND NOT EXISTS(SELECT 1 FROM crm_members AS other WHERE other.user_id=candidate.user_id AND other.id<>candidate.id) ORDER BY name,id").all<Pick<Member,'id'|'user_id'|'name'|'role'|'active'>>();
 const candidates:ProductionAssignmentCandidate[]=[];
 if(!blockedReason)for(const row of rows.results){
  if(!row.user_id||row.user_id!==row.user_id.trim()||row.id!==row.id.trim()||row.id.length>100||!row.name.trim()||!productionAssignmentRole(row.role)||row.user_id===order?.production.assigneeId)continue;
  const expectedTarget=await productionAssignmentTargetBasis({memberId:row.id,userId:row.user_id,name:row.name,role:row.role,active:1});candidates.push({memberId:row.id,name:row.name,role:row.role,expectedTarget});
 }
 const changed=query.purpose==='resolve_legacy'&&productionAssignmentBasis(projectState(await load(query.space),query.space),query.orderId,query.purpose)!==expectedContext;
 // No account directory is released after loss of admin access during reads.
 const fresh=await member(req,false,true);if(fresh.id!==actor.id||fresh.user_id!==actor.user_id)throw new AccessError('Administratörskontot har ändrats. Logga in igen.');
 if(changed)return reply({error:'Arbetsordern ändrades under granskningen. Hämta aktuellt underlag och granska igen.'},409);
 const review:ProductionAssignmentReview={purpose:query.purpose,orderId:query.orderId,workId:query.workId,expectedContext,candidates,blockedReason:blockedReason||(!candidates.length?'Det finns inget '+(query.purpose==='transfer'?'annat ':'')+'aktivt och anslutet tryck-, lager-, produktions- eller administratörskonto.':'')};return reply(review);
 }catch(error){if(error instanceof AccessError)return reply({error:error.message},error.status);if(error instanceof z.ZodError)return reply({error:'Ange rätt arbetsyta, order och arbetsversion.'},400);console.error('Production assignment review failed',error);return reply({error:'Ansvarskontona kunde inte hämtas. Försök igen.'},503)}
}
