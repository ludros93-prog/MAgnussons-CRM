import {revisionBasis} from '@/lib/order-revisions';
import {directBasis} from '@/lib/direct-delivery';
import {restoreState} from '@/lib/crm-restore';
import {load,commit,initialize,projectState,mutationResult,requestHash,type MutationMeta} from '@/lib/crm-store';
import {followupBasis} from '@/lib/follow-up';
import {assignmentBasis,productionBasis} from '@/lib/production-quantities';
import {editableRecord,recordBasis,fieldLabels,customerWorkflowTypes,customerWorkflowBasis,companyEventBasis,leadContactBasis,sellerProfilesBasis} from '@/lib/record-conflicts';
import {SellerProfilesInitSchema,SellerProfileInputSchema} from '@/lib/seller-profiles';
import {isCustomerWorkflowDraft,validateCustomerWorkflowDraftConsumption} from '@/lib/customer-workflow-drafts';
import {validateReceiptDraftConsumption} from '@/lib/receipt-drafts';
import {validateArticleDraftConsumption} from '@/lib/article-drafts';
import {validateCompanyEventDraftConsumption} from '@/lib/company-event-drafts';
import {CommercialResponsibilityTransferSchema,commercialResponsibilityBasis} from '@/lib/commercial-responsibility';
import {CustomerResponsibilityTransferSchema,customerResponsibilityBasis} from '@/lib/customer-responsibility';
import {TaskResponsibilityTransferSchema,taskResponsibilityBasis} from '@/lib/task-responsibility';
import {MeetingResponsibilityTransferSchema,meetingResponsibilityBasis} from '@/lib/meeting-responsibility';
import {OnboardingResponsibilityTransferSchema,onboardingResponsibilityBasis} from '@/lib/onboarding-responsibility';
import {IssueResponsibilityTransferSchema,issueResponsibilityBasis,isIssueResponsibilityUnassigned} from '@/lib/issue-responsibility';
import {YearwheelResponsibilityTransferSchema,yearwheelResponsibilityBasis,yearNeedEditBasis} from '@/lib/yearwheel-responsibility';
import {NeedSchema} from '@/lib/business';
import {collectFileReferences} from '@/lib/export-references';
import {orderBasis,receiptBasis,ensureReceiptTasks,awaitingReceipt} from '@/lib/order-work';
import {roleActions,ArticleSchema,NoticeSchema,LeadSchema,CompanyEventSchema,type Role} from '@/lib/operations';
import {visibleState} from '@/lib/crm-visibility';
import { database } from '@/lib/crm-db';
import { member,viewer,AccessError } from '@/lib/crm-auth';
import { z } from 'zod';
import { normalizeState, applyAction, emptyState, seedState, day, RuleError, type State,PlanSchema,CustomerSchema,DealSchema,OrderSchema,TaskSchema,MeetingSchema,SettingsSchema } from '@/lib/crm';
const db=database;
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function authorizeAction(role:Role,type:string){
 if(roleActions[role]&&!roleActions[role]!.has(type))throw new AccessError('Din roll får inte utföra denna åtgärd.');
 if(['yearwheel_responsibility_transfer','issue_responsibility_transfer','onboarding_responsibility_transfer','meeting_responsibility_transfer','task_responsibility_transfer','commercial_responsibility_transfer','customer_responsibility_transfer','settings','seller_profiles_init','seller_profile','import_customers','restore','article','article_import','lead_import'].includes(type)&&role!=='admin')throw new AccessError('Denna åtgärd kräver administratör.');
}
async function profileAuthorization(req:Request,current:State,type:string,data:unknown):Promise<NonNullable<MutationMeta['sellerProfileAuthorization']>>{
 const initialIssue=type==='plan',initialYearwheel=type==='year_need',initialAssignment=initialIssue||initialYearwheel,actor=await member(req,true,!initialAssignment);
 if(initialAssignment&&!['admin','seller'].includes(actor.role))throw new AccessError((initialYearwheel?'Det nya inköpsbehovet':'Det nya kundärendet')+' kräver säljar- eller administratörsbehörighet.');
 const links:{id:string;owner:string}[]=[];
 if(type==='yearwheel_responsibility_transfer'||type==='issue_responsibility_transfer'||type==='onboarding_responsibility_transfer'||type==='meeting_responsibility_transfer'||type==='task_responsibility_transfer'||type==='customer_responsibility_transfer'||type==='commercial_responsibility_transfer'){
  const input=(type==='yearwheel_responsibility_transfer'?YearwheelResponsibilityTransferSchema:type==='issue_responsibility_transfer'?IssueResponsibilityTransferSchema:type==='onboarding_responsibility_transfer'?OnboardingResponsibilityTransferSchema:type==='meeting_responsibility_transfer'?MeetingResponsibilityTransferSchema:type==='task_responsibility_transfer'?TaskResponsibilityTransferSchema:type==='customer_responsibility_transfer'?CustomerResponsibilityTransferSchema:CommercialResponsibilityTransferSchema).parse(data),target=current.settings.sellerProfiles.find(profile=>profile.id===input.targetProfileId);
  if(target?.memberId)links.push({id:target.memberId,owner:target.legacyOwnerName});
 }else if(initialIssue){
  const input=z.object({plan:PlanSchema}).parse(data),target=current.settings.sellerProfiles.find(profile=>profile.id===input.plan.issueOwnerProfileId);
  if(target?.memberId)links.push({id:target.memberId,owner:target.legacyOwnerName});
 }else if(initialYearwheel){
  const input=z.object({need:NeedSchema}).parse(data),target=current.settings.sellerProfiles.find(profile=>profile.id===input.need.ownerProfileId);
  if(target?.memberId)links.push({id:target.memberId,owner:target.legacyOwnerName});
 }else if(type==='seller_profiles_init'){
  for(const profile of SellerProfilesInitSchema.parse(data).profiles)if(profile.memberId)links.push({id:profile.memberId,owner:profile.legacyOwnerName});
 }else{
  const input=SellerProfileInputSchema.parse(data),old=current.settings.sellerProfiles.find(profile=>profile.id===input.id);
  if(input.memberId&&input.memberId!==old?.memberId)links.push({id:input.memberId,owner:old?.legacyOwnerName||input.legacyOwnerName||''});
 }
 for(const link of links){
  const target=await db().prepare('SELECT id,owner,role,active FROM crm_members WHERE id=?').bind(link.id).first<{id:string;owner:string;role:string;active:number}>();
  if(!target||!target.active||!['admin','seller'].includes(target.role)||target.owner!==link.owner)throw new AccessError('Välj ett aktivt säljar- eller administratörskonto med rätt ansvarskoppling. Kontot kan ha ändrats; läs in kontolistan igen.');
 }
 return {actorMemberId:actor.id,actorUserId:actor.user_id!,links,...(initialIssue?{issueInitialActorRole:actor.role as 'admin'|'seller'}:initialYearwheel?{yearwheelInitialActorRole:actor.role as 'admin'|'seller'}:{})};
}
export async function GET(req:Request){try{const user=await member(req);const space=z.enum(['demo','live']).parse(new URL(req.url).searchParams.get('space')||'demo');return reply(visibleState(projectState(await load(space),space),viewer(user)));}catch(e){if(e instanceof AccessError)return reply({error:e.message},e.status);console.error('CRM read failed',e);return reply({error:'Arbetsytan kunde inte hämtas. Försök igen.'},503)}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return reply({error:'Ogiltigt ursprung.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON krävs.'},415);
 const body=await req.text();if(body.length>10000000)return reply({error:'För stor begäran.'},413);
 let user=await member(req,true);
 const p=z.object({space:z.enum(['demo','live']),version:z.number().int().nonnegative(),requestId:z.string().uuid(),expectedRecord:z.string().max(3000000).optional(),type:z.enum(['yearwheel_responsibility_transfer','issue_responsibility_transfer','onboarding_responsibility_transfer','meeting_responsibility_transfer','task_responsibility_transfer','commercial_responsibility_transfer','customer_responsibility_transfer','production_claim','production_release','prepare_order','receipt_confirm','receipt_issue','customer','deal','order','task','meeting','note','customer_note','follow_up','settings','seller_profiles_init','seller_profile','prospecting','qualify','onboarding','plan','year_need','complete_need','need_deal','products','repeat_order','import_customers','restore','article','article_import','catalog_order','production_submit','production_accept','production_received','production_printed','production_dispatched','production_issue','production_issue_resolve','direct_dispatch','production_cancel','production_scrap_unprinted','production_scrap_printed','order_shortfall','order_amend','order_amend_accept','order_amend_discard','notice_read','lead_import','lead_convert','lead_contact','company_event']),data:z.unknown()}).parse(JSON.parse(body));
 authorizeAction(user.role,p.type);
 await initialize(p.space);const hash=await requestHash(p.type,p.data);
 const profileMutation=p.type==='seller_profiles_init'||p.type==='seller_profile',responsibilityMutation=['yearwheel_responsibility_transfer','issue_responsibility_transfer','onboarding_responsibility_transfer','meeting_responsibility_transfer','task_responsibility_transfer','customer_responsibility_transfer','commercial_responsibility_transfer'].includes(p.type);
 // Private article and company-event publication carry frozen, server-checked
 // original data and exact draft revisions. Every private CAS retry rechecks
 // that envelope; direct article/import requests retain their workspace CAS.
 const safe=p.type==='year_need'&&typeof(p.data as any)?.need?.id==='string'&&(p.data as any).need.id.trim()!==''&&typeof(p.data as any)?.expectedContext==='string'||p.type==='article'&&!!(p.data as any)?.draft||responsibilityMutation||profileMutation||p.type==='lead_contact'||p.type==='company_event'||customerWorkflowTypes.has(p.type)||['receipt_issue','receipt_confirm','production_claim','production_release','customer','deal','order','task','meeting','customer_note','follow_up','production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed','order_shortfall','direct_dispatch','production_issue','production_issue_resolve','order_amend','order_amend_accept','order_amend_discard','prepare_order','notice_read'].includes(p.type);
 for(let attempt=0;attempt<4;attempt++){
 user=await member(req,true);authorizeAction(user.role,p.type);
 const persisted=await load(p.space),current=projectState(persisted,p.space);
 const previous=await db().prepare('SELECT result_json,user_id,request_hash FROM crm_mutations WHERE space=? AND id=?').bind(p.space,p.requestId).first<{result_json:string|null;user_id:string;request_hash:string}>();
 if(previous){if(previous.user_id&&previous.user_id!==user.user_id||previous.request_hash&&previous.request_hash!==hash)return reply({error:'Begäran har redan använts för en annan ändring.'},409);return reply({...visibleState(projectState(await load(p.space),p.space),viewer(user)),mutationResult:JSON.parse(previous.result_json||'{}')});}
 let sellerProfileAuthorization:MutationMeta['sellerProfileAuthorization'];
 if(p.type==='yearwheel_responsibility_transfer'){
  const input=YearwheelResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==yearwheelResponsibilityBasis(current,input.customerId,input.needId))return reply({error:'Inköpsbehovet eller ansvarsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'yearwheel_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='year_need'){
  const input=z.object({customerId:z.string().min(1),need:NeedSchema,expectedContext:z.string().min(1).max(3000000).optional()}).parse(p.data);
  if(input.need.id&&input.expectedContext&&input.expectedContext!==yearNeedEditBasis(current,input.customerId,input.need.id))return reply({error:'Inköpsbehovet har ändrats. Dina uppgifter finns kvar. Läs in och granska aktuellt behov innan du sparar.',state:visibleState(current,viewer(user)),code:'year_need_conflict'},409);
 }
 if(p.type==='issue_responsibility_transfer'){
  const input=IssueResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==issueResponsibilityBasis(current,input.customerId))return reply({error:'Kundplanen eller ansvarsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'issue_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='onboarding_responsibility_transfer'){
  const input=OnboardingResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==onboardingResponsibilityBasis(current,input.customerId))return reply({error:'Onboarding eller ansvarsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'onboarding_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='meeting_responsibility_transfer'){
  const input=MeetingResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==meetingResponsibilityBasis(current,input.meetingId))return reply({error:'Mötet eller ansvarsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'meeting_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='task_responsibility_transfer'){
  const input=TaskResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==taskResponsibilityBasis(current,input.taskId))return reply({error:'Uppgiften eller ansvarsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'task_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='commercial_responsibility_transfer'){
  const input=CommercialResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==commercialResponsibilityBasis(current,input.targetType,input.targetId))return reply({error:'Ansvaret eller överlämningsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag.',state:visibleState(current,viewer(user)),code:'commercial_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='customer_responsibility_transfer'){
  const input=CustomerResponsibilityTransferSchema.parse(p.data);
  if(input.expectedContext!==customerResponsibilityBasis(current,input.customerId))return reply({error:'Kundansvaret eller överlämningsunderlaget har ändrats. Dina val och din orsak finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'customer_responsibility_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(profileMutation){
  const input=z.object({expectedContext:z.string().min(1).max(3000000)}).parse(p.data);
  if(input.expectedContext!==sellerProfilesBasis(current))return reply({error:'Säljarprofilerna eller resultatunderlaget har ändrats. Dina val finns kvar. Läs in och granska aktuellt underlag innan du sparar.',state:visibleState(current,viewer(user)),code:'seller_profile_conflict'},409);
  sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 const record=editableRecord(current,p.type,(p.data as any)?.id||'');if(record&&p.expectedRecord!==recordBasis(record))return reply({error:'Underlaget har ändrats eller öppnats i en äldre version. Dina ändringar finns kvar. Läs in aktuell version innan du sparar.',state:visibleState(current,viewer(user)),code:'record_conflict'},409);
 if(customerWorkflowTypes.has(p.type)){const input=z.object({customerId:z.string().min(1),expectedContext:z.string().min(1).max(3000000)}).parse(p.data);if(input.expectedContext!==customerWorkflowBasis(current,p.type,input.customerId))return reply({error:'Kundens underlag har ändrats. Dina uppgifter finns kvar. Läs in aktuell version innan du sparar.',state:visibleState(current,viewer(user)),code:'customer_workflow_conflict'},409);}
 if(p.type==='lead_contact'){const input=z.object({id:z.string().min(1),expectedContext:z.string().min(1).max(3000000)}).parse(p.data);if(input.expectedContext!==leadContactBasis(current,input.id))return reply({error:'Kontaktspärren eller företaget har ändrats. Din orsak finns kvar. Läs in aktuellt underlag.',state:visibleState(current,viewer(user)),code:'lead_contact_conflict'},409);}
 if(p.type==='company_event'){const input=z.object({id:z.string().default(''),expectedContext:z.string().min(1).max(3000000)}).parse(p.data);if(input.expectedContext!==companyEventBasis(current,input.id))return reply({error:'Företagsaktiviteten har ändrats. Dina uppgifter finns kvar. Läs in aktuell version innan du sparar.',state:visibleState(current,viewer(user)),code:'company_event_conflict'},409);}
 if(['receipt_issue','receipt_confirm'].includes(p.type)){const refresh='Ladda om CRM-sidan för att granska det aktuella leveransunderlaget. Kopiera först din osparade text.';const input=z.object({orderId:z.string().min(1),expectedContext:z.string({required_error:refresh,invalid_type_error:refresh}).min(1,refresh).max(3000000)}).parse(p.data);if(input.expectedContext!==receiptBasis(current,input.orderId))return reply({error:'Leveransunderlaget eller bevakningen har ändrats. Dina uppgifter finns kvar. Granska aktuell leverans innan du sparar.',state:visibleState(current,viewer(user)),code:'receipt_conflict'},409);}
 if(p.type==='direct_dispatch'){const input=z.object({orderId:z.string(),expectedContext:z.string()}).parse(p.data);if(input.expectedContext!==directBasis(current,input.orderId))return reply({error:'Ordern eller leveransunderlaget har ändrats. Din registrering finns kvar.',state:visibleState(current,viewer(user)),code:'direct_delivery_conflict'},409);}
 if(['order_amend','order_amend_accept','order_amend_discard'].includes(p.type)){const input=z.object({orderId:z.string(),expectedContext:z.string()}).parse(p.data);if(input.expectedContext!==revisionBasis(current,input.orderId))return reply({error:'Ordern eller offerten har ändrats. Ditt ändringsförslag finns kvar. Läs in aktuellt underlag.',state:visibleState(current,viewer(user)),code:'order_revision_conflict'},409);}
 if(['production_claim','production_release'].includes(p.type)){const input=z.object({orderId:z.string(),expectedAssignment:z.string()}).parse(p.data),o=current.orders.find(o=>o.id===input.orderId);if(o&&input.expectedAssignment!==assignmentBasis(o.production))return reply({error:'Jobbets ansvar har ändrats. Kontrollera vem som har det nu.',state:visibleState(current,viewer(user)),code:'production_assignment_conflict'},409);}
 if(p.type==='follow_up'){const input=z.object({taskId:z.string(),expectedContext:z.string()}).parse(p.data);if(input.expectedContext!==followupBasis(current,input.taskId))return reply({error:'Aktiviteten har ändrats. Din anteckning finns kvar. Läs in aktuellt nästa steg.',state:visibleState(current,viewer(user)),code:'followup_conflict'},409);}
 if(!safe&&current.version!==p.version)return reply({error:'Arbetsytan har ändrats. Din text finns kvar. Ladda om underlaget och spara igen.',state:visibleState(current,viewer(user))},409);
 if(['production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed','order_shortfall','production_issue','production_issue_resolve'].includes(p.type)){const input=z.object({orderId:z.string(),expectedProduction:z.string().optional()}).parse(p.data);const order=current.orders.find(o=>o.id===input.orderId);if(order&&input.expectedProduction!==productionBasis(order.production))return reply({error:'Orderns antal har ändrats. Läs in aktuella antal innan du registrerar.',state:visibleState(current,viewer(user)),code:'production_conflict'},409);}
 const draftInput=z.object({draft:z.object({id:z.string().min(1).max(160),revision:z.number().int().positive()}).optional()}).passthrough().parse(p.data);const draft=draftInput.draft?{...draftInput.draft,userId:user.user_id!}:undefined;
 if(draft){if(!['catalog_order','prepare_order','customer_note','follow_up','customer','deal','order','task','meeting','note','receipt_issue','receipt_confirm','article','company_event'].includes(p.type)&&!isCustomerWorkflowDraft(p.type))throw new RuleError('Utkastet kan inte användas för denna åtgärd.');const row=await db().prepare('SELECT kind,context,revision,archived,data FROM crm_drafts WHERE space=? AND user_id=? AND id=?').bind(p.space,user.user_id!,draft.id).first<{kind:string;context:string;revision:number;archived:number;data:string}>();if(!row||row.archived||row.revision!==draft.revision)return reply({error:'Utkastet har ändrats. Kontrollera den sparade versionen innan du fortsätter.'},409);const receipt=['receipt_issue','receipt_confirm'].includes(p.type);const expectedKind=receipt?'receipt':p.type==='catalog_order'?'catalog':p.type==='prepare_order'?'production':p.type==='customer_note'?'note':p.type==='follow_up'?'followup':isCustomerWorkflowDraft(p.type)?p.type:'form';const expectedContext=receipt||p.type==='prepare_order'?(p.data as any).orderId:p.type==='customer_note'||isCustomerWorkflowDraft(p.type)?(p.data as any).customerId:p.type==='follow_up'?(p.data as any).taskId:p.type;if(row.kind!==expectedKind||(expectedKind!=='catalog'&&row.context!==expectedContext))throw new RuleError('Utkastet hör inte till denna beställning.');if(receipt)validateReceiptDraftConsumption(p.type,p.data,JSON.parse(row.data));if(isCustomerWorkflowDraft(p.type))validateCustomerWorkflowDraftConsumption(p.type,p.data,JSON.parse(row.data),day());if(p.type==='article')validateArticleDraftConsumption(p.data,JSON.parse(row.data),p.expectedRecord,current.articles,draft.id);if(p.type==='company_event')validateCompanyEventDraftConsumption(p.data,JSON.parse(row.data),current.companyEvents,draft.id);}
 if(p.type==='prepare_order'){const input=z.object({orderId:z.string(),expectedOrder:z.string(),approval:z.object({proofRequired:z.boolean(),proofApproved:z.boolean(),proofFileId:z.string(),proofVersion:z.string()}),production:z.object({sketchFileId:z.string(),sketchVersion:z.string()})}).parse(p.data),o=current.orders.find(o=>o.id===input.orderId);if(!o)throw new RuleError('Ordern finns inte.');if(orderBasis(o)!==input.expectedOrder)return reply({error:'Ordern har ändrats medan du arbetade. Ditt utkast finns kvar. Läs in aktuella orderuppgifter och granska igen.',state:visibleState(current,viewer(user))},409);const file=await db().prepare('SELECT data FROM crm_files WHERE id=? AND space=? AND customer_id=?').bind(input.production.sketchFileId,p.space,o.customerId).first<{data:string}>();if(!file||JSON.parse(file.data).version!==input.production.sketchVersion)throw new RuleError('Välj en uppladdad skiss med rätt version.');if(input.approval.proofRequired&&(JSON.parse(file.data).kind!=='proof'||input.approval.proofFileId!==input.production.sketchFileId||input.approval.proofVersion!==input.production.sketchVersion))throw new RuleError('Korrekturgodkännandet ska gälla samma korrekturfil som tryckskissen.');}
 if(p.type==='order'){const o=p.data as Record<string,unknown>;if(o.proofRequired&&o.proofApproved&&o.proofFileId){const file=await db().prepare('SELECT data FROM crm_files WHERE id=? AND space=? AND customer_id=?').bind(o.proofFileId,p.space,o.customerId).first<{data:string}>();if(!file)throw new RuleError('Korrekturfilen finns inte på kunden.');const f=JSON.parse(file.data);if(f.kind!=='proof')throw new RuleError('Välj en korrekturfil.');if(f.version!==o.proofVersion)throw new RuleError('Korrekturversionen stämmer inte med vald fil.');}}
 if(p.type==='production_submit'){const input=z.object({orderId:z.string(),production:z.object({sketchFileId:z.string(),sketchVersion:z.string()})}).parse(p.data),order=current.orders.find(o=>o.id===input.orderId);if(!order)throw new RuleError('Ordern finns inte.');const file=await db().prepare('SELECT data FROM crm_files WHERE id=? AND space=? AND customer_id=?').bind(input.production.sketchFileId,p.space,order.customerId).first<{data:string}>();if(!file||JSON.parse(file.data).version!==input.production.sketchVersion)throw new RuleError('Välj rätt skissversion från orderns kundkort.');}
 const next=p.type==='restore'?restoreState(current,p.data):applyAction(current,{type:p.type,data:p.data},{id:user.user_id!,memberId:user.id,name:user.name,role:user.role,owner:user.owner});
 if(p.type==='plan'){
  const customerId=(p.data as {customerId:string}).customerId,old=current.customers.find(row=>row.id===customerId)?.plan,plan=next.customers.find(row=>row.id===customerId)?.plan;
  if(old&&isIssueResponsibilityUnassigned(old)&&plan?.issueOwnerProfileId)sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(p.type==='year_need'){
  const input=z.object({customerId:z.string(),need:NeedSchema}).parse(p.data);
  if(!input.need.id&&next.customers.find(customer=>customer.id===input.customerId)?.yearNeeds.some(yearNeed=>!current.customers.find(customer=>customer.id===input.customerId)?.yearNeeds.some(old=>old.id===yearNeed.id)&&yearNeed.ownerProfileId))sellerProfileAuthorization=await profileAuthorization(req,current,p.type,p.data);
 }
 if(record&&['customer','deal','order','task','meeting'].includes(p.type)){
  const after=editableRecord(next,p.type,String(record.id));
  const fields=['owner','email','phone','stage','status','due','nextDate','nextAction','value','cost','deliveryDate','deliveredDate','proofRequired','proofApproved','proofFileId','proofVersion','approvedBy','approvedDate','supplierConfirmed','invoiceRef','invoiceDate','invoiceValue','actualCost'];
  const changes=after?fields.filter(k=>recordBasis(record[k])!==recordBasis(after[k])).map(k=>(fieldLabels[k]||k)+': '+String(record[k]??'Ej angivet')+' → '+String(after[k]??'Ej angivet')):[];
  if(changes.length)next.events.unshift({id:crypto.randomUUID(),customerId:String(p.type==='customer'?record.id:record.customerId),dealId:String(p.type==='deal'?record.id:record.dealId||''),text:'Ändrade uppgifter\n'+changes.join('\n'),kind:'change',at:new Date().toISOString()});
 }
 const before=new Set(current.events.map(e=>e.id));if(p.type!=='restore'){for(const e of next.events)if(!before.has(e.id))e.actor={id:user.user_id!,name:user.name};}else for(const c of next.customers)next.events.push({id:crypto.randomUUID(),customerId:c.id,dealId:'',text:'Kundens CRM-data återställd från export',kind:'restore',at:new Date().toISOString(),actor:{id:user.user_id!,name:user.name}});
const result=mutationResult(current,next,p.type,p.data);
 if(!await commit(p.space,persisted,next,p.requestId,draft,{result,userId:user.user_id!,hash,actorAuthorization:{memberId:user.id,userId:user.user_id!,role:user.role,owner:user.owner},sellerProfileAuthorization})){user=await member(req,true);authorizeAction(user.role,p.type);if(p.type==='year_need'&&sellerProfileAuthorization)await profileAuthorization(req,current,p.type,p.data);if(safe)continue;return reply({error:'Underlaget har ändrats. Dina uppgifter finns kvar.',state:visibleState(projectState(await load(p.space),p.space),viewer(user))},409);}
 return reply({...visibleState(projectState(await load(p.space),p.space),viewer(user)),mutationResult:result});
 }
 return reply({error:'Flera kollegor sparar samtidigt. Dina uppgifter finns kvar; försök igen.',state:visibleState(projectState(await load(p.space),p.space),viewer(user))},409);
 }catch(e){if(e instanceof AccessError)return reply({error:e.message},e.status);if(e instanceof z.ZodError)return reply({error:e.issues.map(i=>i.message).join(' ')},400);if(e instanceof RuleError)return reply({error:e.message},400);console.error('CRM write failed',e);return reply({error:'Det gick inte att spara. Dina uppgifter finns kvar i formuläret.'},503)}}
