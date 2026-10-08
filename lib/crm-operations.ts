import {recordProductionAssignment,validateProductionAssignmentReferences} from './production-assignment';
import {recordBasis} from './record-conflicts';
import {applyOrderRevision} from './order-revisions';
import {DirectShipmentSchema,directRows,directBasis,deliveryVerified,latestDispatch} from './direct-delivery';
import {normalizeProduction,productionProgress,productionBasis,assignmentBasis,hasPhysicalWork,materializeLegacy,quantity,type MovementKind} from './production-quantities';
import {z} from 'zod';
import {type State,type Action,type Actor,RuleError,CustomerSchema,DealSchema,TaskSchema,applyAction,day,plusDays} from './crm';
import {receivesNotice,ArticleSchema,ProductionSchema,MovementEntrySchema,LeadSchema,CompanyEventSchema,leadOrganizationKey,leadIdentity,leadContactDecision} from './operations';
import {leadContactBasis} from './record-conflicts';
import {orderBasis,ensureReceiptTasks,awaitingReceipt} from './order-work';
import {AddressSchema,validDate,LineSchema,calculateQuote} from './business';
import {swedishCalendarDay} from './swedish-calendar';
import {protectCompanyEventResponsibilities} from './company-event-responsibility';
import {protectCompanyActivityResponsibility,validateCompanyActivityResponsibilityReferences} from './company-activity-responsibility';
const text=z.string().trim().max(4000),id=text.min(1);const must=(v:unknown,m:string)=>{if(!v)throw new RuleError(m)};
export function applyOperations(st:State,action:Action,actor:Actor):State{
 const now=new Date().toISOString(),today=day(),uid=()=>crypto.randomUUID();
 const customer=(id:string)=>{const c=st.customers.find(c=>c.id===id);must(c,'Kunden finns inte.');return c!};
 const order=(id:string)=>{const o=st.orders.find(o=>o.id===id);must(o,'Ordern finns inte.');return o!};
 const owner=(value:string)=>must(st.settings.owners.includes(value),'Välj en ansvarig säljare.');
 const event=(customerId:string,dealId:string,message:string)=>st.events.unshift({id:uid(),customerId,dealId,text:message,at:now,kind:'production'});
 const notify=(audience:'print'|'warehouse'|'seller'|'team',title:string,body:string,customerId='',orderId='',owner='')=>st.notices.unshift({id:uid(),audience,title:title.slice(0,4000),body:body.slice(0,4000),customerId,orderId,owner,at:now,readBy:[]});
 const synchronize=(o:State['orders'][number])=>{
  const v=o.production,d=st.deals.find(d=>d.id===o.dealId)!,rows=productionProgress(v);
  const allReceived=rows.length>0&&rows.every(r=>r.toReceive===0),allPrinted=rows.length>0&&rows.every(r=>r.usablePrinted===r.target),allDispatched=rows.length>0&&rows.every(r=>r.remaining===0)&&rows.some(r=>r.dispatched>0)&&!v.issue;
  const wasDispatched=v.status==='dispatched';v.goodsReceived=allReceived;
  if(allReceived&&!v.goodsReceivedAt){v.goodsReceivedAt=now;v.goodsReceivedBy=actor.name;}
  if(allPrinted&&!v.printedAt){v.printedAt=now;v.printedBy=actor.name;}
  if(!allPrinted){v.printedAt='';v.printedBy='';}if(!allReceived){v.goodsReceivedAt='';v.goodsReceivedBy='';}
  v.status=allDispatched?'dispatched':allPrinted?'printed':'submitted';
  if(allDispatched&&!wasDispatched){
   const lastDispatch=v.movements.filter(m=>m.kind==='dispatched').sort((a,b)=>b.at.localeCompare(a.at))[0];v.dispatchedAt=lastDispatch?.at||now;v.dispatchedBy=lastDispatch?.by||actor.name;o.stage='shipping';ensureReceiptTasks(st);
   notify('seller','Hela överenskomna ordern skickad – faktureringsunderlag klart',d.title+'. Kundens mottagande återstår att bekräfta.',o.customerId,o.id,o.owner);
   if(!st.tasks.some(t=>t.dealId===o.dealId&&t.kind==='invoice_ready'&&!t.done))st.tasks.push(TaskSchema.parse({id:uid(),customerId:o.customerId,dealId:o.dealId,owner:o.owner,title:('Fakturera skickad order: '+d.title).slice(0,240),due:today,kind:'invoice_ready'}));
  }
  return {rows,allReceived,allPrinted,allDispatched};
 };
 if(['order_amend','order_amend_accept','order_amend_discard'].includes(action.type))return applyOrderRevision(st,action,actor);
 if(action.type==='direct_dispatch'){
  must(['admin','seller'].includes(actor.role),'Direktleverans registreras av säljare eller administratör.');
  const input=z.object({orderId:id,expectedContext:z.string().min(1).max(3000000),supplierConfirmed:z.literal(true),noProofNeeded:z.boolean().default(false)}).passthrough().parse(action.data),o=order(input.orderId),d=st.deals.find(d=>d.id===o.dealId)!;
  must(input.expectedContext===directBasis(st,o.id),'Ordern eller leveransunderlaget har ändrats. Läs in aktuellt underlag.');
  must(['draft','cancelled'].includes(o.production.status)&&!hasPhysicalWork(o.production)&&!o.productionHistory.some(hasPhysicalWork),'Direktleverans får inte ersätta registrerade varor eller intern produktion.');
  must(!o.pendingAmendment&&!o.production.issue,'Godkänn orderändringen och lös alla hinder före direktleverans.');
  const historical=['shipping','delivered','followed'].includes(o.stage);
  must(o.invoiceValue===null||historical,'En redan fakturerad order får bara kompletteras med historiskt leveransunderlag.');
  must(!o.proofRequired||o.proofApproved||input.noProofNeeded,'Bekräfta korrekturet eller ange uttryckligen att kundkorrektur inte behövs.');
  const shipment=DirectShipmentSchema.parse({...action.data as object,id:uid(),recordedAt:now,recordedById:actor.id,recordedBy:actor.name});
  must(shipment.dispatchedOn<=today,'Avsändningsdatum får inte ligga i framtiden.');
  if(o.deliveredDate)must(shipment.dispatchedOn<=o.deliveredDate,'Avsändningen kan inte ligga efter kundens mottagningsdatum.');
  if(shipment.method!=='collection')must(shipment.address.street&&shipment.address.postalCode&&shipment.address.city,'Ange adress, postnummer och ort för leveransen.');
  must(o.directShipments.length<1000,'Ordern har nått gränsen för försändelser.');
  const rows=directRows(d,o.directShipments),seen=new Set<string>();must(rows.length,'Komplettera ordern med accepterade artikelrader före leveransregistrering.');
  for(const e of shipment.entries){const row=rows.find(r=>r.line.id===e.lineId);must(row&&!seen.has(e.lineId),'Välj varje befintlig artikelrad högst en gång.');seen.add(e.lineId);must(e.quantity===quantity(e.quantity)&&e.quantity<=row!.remaining,'Antalet överstiger återstående åtagande eller har fler än sex decimaler.');}
  o.directShipments.push(shipment);o.supplierConfirmed=true;if(input.noProofNeeded)o.proofRequired=false;
  const complete=deliveryVerified(st,o);
  if(complete&&!historical){o.stage='shipping';ensureReceiptTasks(st);if(!st.tasks.some(t=>t.dealId===o.dealId&&t.kind==='invoice_ready'&&!t.done))st.tasks.push(TaskSchema.parse({id:uid(),customerId:o.customerId,dealId:o.dealId,owner:o.owner,title:('Fakturera skickad order: '+d.title).slice(0,240),due:today,kind:'invoice_ready'}));}
  if(!historical)for(const task of st.tasks)if(task.dealId===o.dealId&&task.kind==='handover'&&!task.done){task.done=true;task.doneAt=now;}
  event(o.customerId,o.dealId,'Direktleverans '+shipment.dispatchedOn+': '+shipment.entries.map(e=>e.quantity+' × '+rows.find(r=>r.line.id===e.lineId)!.line.description).join('; ')+'. Underlag: '+shipment.evidence);
  notify('seller',complete?'Hela ordern skickad – direktleverans bekräftad':'Delleverans registrerad',d.title+'. Kundmottagande registreras separat.',o.customerId,o.id,o.owner);
  return st;
 }
 if(action.type==='production_assignment_transfer')throw new RuleError('Arbetsansvaret kräver ett separat, servergranskat mottagarkonto.');
 if(['production_claim','production_release'].includes(action.type)){
  const p=z.object({orderId:id,expectedAssignment:z.string().max(100000)}).parse(action.data),o=order(p.orderId),v=o.production;
  must(['admin','production','print','warehouse'].includes(actor.role),'Arbetsansvar hanteras av produktionen eller administratör.');
  must(['submitted','printed'].includes(v.status),'Arbetsordern är inte aktiv.');must(p.expectedAssignment===assignmentBasis(v),'Arbetsansvaret har ändrats. Läs in aktuellt jobb.');
  if(action.type==='production_claim'){must(!v.assigneeId,'Jobbet har redan en ansvarig.');recordProductionAssignment(o,actor,{userId:actor.id,memberId:actor.memberId||'',name:actor.name},'claim','Jag tog ansvar för arbetsordern.',now);event(o.customerId,o.dealId,actor.name+' tog ansvar för arbetsordern.');}
  else {must(v.assigneeId,'Jobbet saknar ansvarig.');must(v.assigneeId===actor.id||actor.role==='admin','Bara den ansvariga eller administratören kan lämna tillbaka jobbet.');event(o.customerId,o.dealId,'Arbetsordern lämnades tillbaka till gemensam kö. Tidigare ansvarig: '+v.assigneeName);recordProductionAssignment(o,actor,{userId:'',memberId:'',name:''},'release','Arbetsordern lämnades tillbaka till gemensam kö.',now);}
  validateProductionAssignmentReferences(st);
 }else if(action.type==='order_shortfall'){
  must(['admin','seller'].includes(actor.role),'Kundens ändrade beställning registreras av säljare eller administratör.');
  const p=z.object({orderId:id,expectedProduction:z.string().min(1),entries:z.array(MovementEntrySchema).min(1).max(100),reason:id,customerApprovedBy:id,customerApprovedOn:validDate.refine(Boolean),agreedValue:z.number().finite().min(0).max(1e9)}).parse(action.data),o=order(p.orderId),v=o.production;
  must(!v.issue,'Lös det registrerade produktionshindret före kundgodkänd antalminskning.');
  must(['submitted','printed'].includes(v.status)&&o.invoiceValue===null,'Avvikelsen ska registreras på en aktiv, ännu inte fakturerad order.');
  must(p.expectedProduction===productionBasis(v),'Antalen har ändrats. Läs in aktuellt underlag.');
  const submittedOn=swedishCalendarDay(v.submittedAt,'Orderns inlämningstidpunkt är ogiltig. Kontrollera orderunderlaget innan kundens godkännande registreras.');
  must(p.customerApprovedOn<=today&&p.customerApprovedOn>=submittedOn,'Ange kundens godkännandedatum för denna order.');
  must(v.quantityAdjustments.length<100,'Ordern har nått gränsen för antal ändringar.');
  const rows=productionProgress(v),seen=new Set<string>();
  for(const e of p.entries){const r=rows.find(r=>r.line.id===e.lineId);must(r&&!seen.has(e.lineId),'Välj varje befintlig artikelrad högst en gång.');seen.add(e.lineId);must(e.quantity===quantity(e.quantity),'Antal får ha högst sex decimaler.');must(e.quantity<=r!.toReceive&&e.quantity<=r!.remaining,'Minskningen får bara avse varor som saknas. Hanterade varor måste först redovisas korrekt.');}
  const total=quantity(rows.reduce((n,r)=>n+r.target,0)-p.entries.reduce((n,e)=>n+e.quantity,0));must(total>0,'En helt avbeställd order ska inte registreras som en leverans.');
  materializeLegacy(v);const adjustment={id:uid(),entries:p.entries,reason:p.reason,customerApprovedBy:p.customerApprovedBy,customerApprovedOn:p.customerApprovedOn,recordedBy:actor.name,recordedAt:now};v.quantityAdjustments.push(adjustment);o.commercialValue=p.agreedValue;
  event(o.customerId,o.dealId,'Kunden har godkänt minskat leveransantal: '+p.entries.map(e=>e.quantity+' × '+rows.find(r=>r.line.id===e.lineId)!.line.description).join('; ')+'. '+p.reason+' · godkänt av '+p.customerApprovedBy+' '+p.customerApprovedOn);
  st.events.unshift({id:uid(),customerId:o.customerId,dealId:o.dealId,kind:'commercial_adjustment',at:now,text:'Överenskommet ordervärde efter antalavvikelse: '+p.agreedValue+' kr exkl. moms. Godkänt av '+p.customerApprovedBy+' · '+p.customerApprovedOn+'. '+p.reason});
  synchronize(o);notify('warehouse','Kunden har godkänt ett mindre antal',p.reason,o.customerId,o.id);
 }else if(action.type==='article'||action.type==='article_import'){
  const list=action.type==='article'?[ArticleSchema.parse(action.data)]:z.object({articles:z.array(ArticleSchema).min(1).max(200)}).parse(action.data).articles;
  for(const value of list){must(st.settings.catalogSources.some(s=>s.id===value.sourceId),'Välj en registrerad artikelkälla.');const sameVariant=(a:typeof value)=>a.sourceId===value.sourceId&&a.sku===value.sku&&a.variant===value.variant&&a.variantId===value.variantId&&a.color===value.color&&a.size===value.size;const old=st.articles.find(a=>value.id?a.id===value.id:sameVariant(a));must(!value.id||old,'Artikeln finns inte.');if(old){must(!st.articles.some(a=>a.id!==old.id&&sameVariant(a)),'Artikel och variant finns redan i denna källa.');Object.assign(old,value,{id:old.id,updatedAt:now})}else st.articles.push({...value,id:uid(),updatedAt:now});}
 }else if(action.type==='catalog_order'){
  const p=z.object({customerId:id,owner:id,title:id,lines:z.array(LineSchema).min(1).max(100),deliveryDate:id,accepted:z.boolean(),notes:text.default(''),nextDate:id}).parse(action.data),c=customer(p.customerId);owner(p.owner);const total=calculateQuote(p.lines);
  const data=DealSchema.parse({...p,...total,stage:p.accepted?'won':'identified',type:c.status==='prospect'?'new':'repeat',category:'Profilkläder',need:p.notes||p.title,solution:p.lines.map(l=>l.quantity+' × '+l.description+' '+l.variant).join('\n').slice(0,4000),decisionMaker:c.decisionMaker||c.contact,quoteRef:p.accepted?'DIREKT-'+uid().slice(0,8):'',decisionDate:today,confirmed:p.accepted,nextAction:'Kontrollera pris och underlag med kunden'});
  return applyAction(st,{type:'deal',data},actor);
 }else if(action.type==='prepare_order'){
  const p=z.object({orderId:id,expectedOrder:text.max(30000),approval:z.object({proofRequired:z.boolean(),proofApproved:z.boolean(),proofFileId:text,proofVersion:text,approvedBy:text,approvedDate:validDate,supplierConfirmed:z.boolean(),deliveryDate:validDate}),deliveryAddress:AddressSchema,production:ProductionSchema}).parse(action.data),o=order(p.orderId);must(orderBasis(o)===p.expectedOrder,'Ordern har ändrats. Ladda aktuellt orderunderlag innan du lämnar till tryck.');must(['draft','cancelled'].includes(o.production.status),'Arbetsordern är redan inlämnad.');
  const prepared=applyAction(st,{type:'order',data:{...o,...p.approval,shippingAddress:p.deliveryAddress,stage:'handover'}},actor);
  return applyOperations(prepared,{type:'production_submit',data:{orderId:o.id,production:p.production}},actor);
 }else if(action.type==='receipt_confirm'){
  const p=z.object({orderId:id,deliveredDate:validDate.refine(Boolean),receivedBy:id,note:text.default('')}).parse(action.data),o=order(p.orderId);must(awaitingReceipt(o),'Ordern väntar inte på mottagningsbekräftelse.');must(p.deliveredDate<=today,'Leveransdatum får inte ligga i framtiden.');must(deliveryVerified(st,o),'Komplettera leveransunderlaget innan kundens mottagande bekräftas.');must(!latestDispatch(o)||p.deliveredDate>=latestDispatch(o),'Mottagandet kan inte ligga före utleveransen.');
  const next=applyAction(st,{type:'order',data:{...o,stage:'delivered',deliveredDate:p.deliveredDate,receivedBy:p.receivedBy,receiptNote:p.note}},actor);next.events.unshift({id:uid(),customerId:o.customerId,dealId:o.dealId,at:now,kind:'delivery_receipt',text:'Kundmottagande bekräftat: '+p.receivedBy+' · '+p.deliveredDate+(p.note?' · '+p.note:'')});return next;
 }else if(action.type==='receipt_issue'){
  const p=z.object({orderId:id,message:id,nextCheck:validDate.refine(Boolean)}).parse(action.data),o=order(p.orderId);must(awaitingReceipt(o),'Ordern väntar inte på mottagningsbekräftelse.');must(p.nextCheck>=today,'Nästa kontroll behöver vara idag eller senare.');o.deliveryIssue=p.message;o.deliveryNextCheck=p.nextCheck;ensureReceiptTasks(st);const task=st.tasks.find(t=>t.dealId===o.dealId&&t.kind==='receipt')!;task.done=false;task.doneAt='';task.due=p.nextCheck;task.owner=o.owner;event(o.customerId,o.dealId,'Leverans behöver följas upp: '+p.message);notify('seller','Leverans behöver åtgärd',p.message+' · nästa kontroll '+p.nextCheck,o.customerId,o.id,o.owner);
 }else if(action.type==='production_submit'){
  const p=z.object({orderId:id,production:ProductionSchema}).parse(action.data),o=order(p.orderId),d=st.deals.find(d=>d.id===o.dealId)!;
  must(!o.directShipments.length,'Registrerad direktleverans får inte ersättas av en intern arbetsorder.');must(!o.pendingAmendment,'Kunden behöver godkänna orderändringen innan underlaget lämnas till tryck.');must(['draft','cancelled'].includes(o.production.status),'Tryckordern är redan inlämnad.');must(!o.production.quantityAdjustments.length,'En kundgodkänd antaländring får inte ersättas av en ny arbetsversion.');must(!hasPhysicalWork(o.production),'Den tidigare arbetsordern har registrerade varor eller produktion. Stäm av hanterade antal innan ett nytt underlag lämnas in.');must(!['delivered','followed','shipping'].includes(o.stage)&&o.invoiceValue===null,'En skickad eller fakturerad order kan inte skickas till tryck igen.');
  const v=p.production;must(['assigneeId','assigneeMemberId','assigneeName','assignedAt','assignmentRevision'].every(key=>!v[key as keyof typeof v]||v[key as keyof typeof v]===o.production[key as keyof typeof v])&&(!v.assignmentHistory.length||recordBasis(v.assignmentHistory)===recordBasis(o.production.assignmentHistory)),'Arbetsansvar och historik skapas av systemet, inte i inlämningsunderlaget.');must(v.lines.every(l=>l.quantity===quantity(l.quantity)),'Artikelantal får ha högst sex decimaler.');must(v.lines.length&&v.lines.every(l=>l.article&&l.quantity>0),'Ange artikelnummer, variant och antal på orderraderna.');must(v.instructions,'Beskriv tryckets placering och utförande.');must(v.sketchFileId&&v.sketchVersion,'Välj en uppladdad skiss och version.');must(v.printDeadline&&v.dispatchDeadline&&o.deliveryDate,'Ange tryckdeadline, utleveransdag och kundens leveransdag.');must(v.printDeadline<=v.dispatchDeadline&&v.dispatchDeadline<=o.deliveryDate,'Datumen ska följa tryck → utleverans → leverans.');must(o.supplierConfirmed,'Bekräfta leverantörens order och leveransdag först.');must(!o.proofRequired||(o.proofApproved&&o.proofFileId===v.sketchFileId&&o.proofVersion===v.sketchVersion&&o.approvedBy&&o.approvedDate),'Skissen behöver vara samma version som kundens registrerade korrekturgodkännande.');
  if(o.production.status==='cancelled'){must(o.productionHistory.length<100,'Högst 100 tidigare arbetsversioner per order.');o.productionHistory.push(structuredClone(o.production));}
  const products=d.lines.filter(l=>l.kind==='product');if(products.length){const key=(l:z.infer<typeof LineSchema>)=>JSON.stringify([l.sourceId,l.article,l.variant,l.variantId,l.color,l.size,l.unit,l.quantity]);must(JSON.stringify(products.map(key).sort())===JSON.stringify(v.lines.map(key).sort()),'Tryckorderns artiklar, varianter och antal måste motsvara den accepterade ordern.');}
  o.production=normalizeProduction(ProductionSchema.parse({workId:uid(),quantityMode:'lines',lines:v.lines,instructions:v.instructions,sketchFileId:v.sketchFileId,sketchVersion:v.sketchVersion,printDeadline:v.printDeadline,dispatchDeadline:v.dispatchDeadline,deliveryDate:o.deliveryDate,deliveryAddress:o.shippingAddress||customer(o.customerId).deliveryAddress,status:'submitted',submittedAt:now,submittedBy:actor.name}));o.stage='production';for(const t of st.tasks)if(t.dealId===o.dealId&&t.kind==='handover'&&!t.done){t.done=true;t.doneAt=now;}
  event(o.customerId,o.dealId,'Tryckorder inlämnad: '+d.title+' · tryck klart '+v.printDeadline+' · skickas '+v.dispatchDeadline);notify('print','Ny tryckorder',d.title+' · klart '+v.printDeadline,o.customerId,o.id);notify('warehouse','Ny order att planera',d.title+' · skickas '+v.dispatchDeadline,o.customerId,o.id);
 }else if(action.type.startsWith('production_')){
  const p=z.object({orderId:id,message:text.default(''),resolution:text.default(''),tracking:text.max(500).default(''),recipient:text.max(200).default(''),address:AddressSchema.optional(),expectedProduction:z.string().max(100000).optional(),entries:z.array(MovementEntrySchema).min(1).max(100).optional()}).parse(action.data),o=order(p.orderId),v=o.production,d=st.deals.find(d=>d.id===o.dealId)!;
  if(action.type==='production_cancel'){
   must(['submitted','printed'].includes(v.status),'Endast en oskickad tryckorder kan avbrytas.');
   must(!v.quantityAdjustments.length,'En kundgodkänd antaländring måste behållas. Rapportera ett hinder om arbetsordern behöver ändras.');
   must(!hasPhysicalWork(v),'Varor har redan registrerats. Rapportera ett hinder så att ändringen kan hanteras utan att mottagna, tryckta eller skickade antal försvinner.');
   must(p.message,'Ange varför tryckordern avbryts.');v.status='cancelled';v.cancellationReason=p.message;o.stage='handover';notify('print','Tryckorder avbruten',d.title+': '+p.message,o.customerId,o.id);notify('warehouse','Tryckorder avbruten',d.title+': '+p.message,o.customerId,o.id);event(o.customerId,o.dealId,'Tryckorder avbruten: '+p.message);
  }else{
   must(['submitted','printed'].includes(v.status)||(action.type==='production_issue_resolve'&&v.status==='dispatched'),'Ordern finns inte längre i den aktiva produktionskön.');
   if(action.type==='production_accept'){must(!v.acceptedAt,'Tryckordern är redan mottagen.');v.acceptedAt=now;v.acceptedBy=actor.name;event(o.customerId,o.dealId,'Tryck har tagit emot arbetsordern');}
   if(action.type==='production_issue'){must(p.expectedProduction===productionBasis(v),'Hindret eller arbetsordern har ändrats. Läs in aktuellt underlag.');must(p.message,'Beskriv hindret. Använd lösningshandlingen med orsak när hindret är löst.');must(!v.issue||v.issueOwnerId===actor.id||actor.role==='admin','Hindret ägs av '+(v.issueOwnerName||'en annan medarbetare')+'. Ägaren eller en administratör behöver ändra det.');v.issue=p.message;v.issueAt=now;v.issueOwnerId=actor.id;v.issueOwnerName=actor.name;v.issueRevision++;event(o.customerId,o.dealId,'Produktionshinder: '+p.message);notify('seller','Åtgärd behövs i order',d.title+': '+p.message,o.customerId,o.id,o.owner);}
   if(action.type==='production_issue_resolve'){
    must(v.issue,'Ordern har inget öppet produktionshinder.');must(v.issueOwnerId===actor.id||actor.role==='admin','Bara den som rapporterade hindret eller administratören får lösa det.');
    must(p.expectedProduction===productionBasis(v),'Hindret eller arbetsordern har ändrats. Läs in aktuellt underlag.');must(p.resolution,'Beskriv hur hindret löstes.');must(v.issueResolutions.length<1000,'Ordern har nått gränsen för lösningar.');
    v.issueResolutions.push({issue:v.issue,reportedAt:v.issueAt,reportedById:v.issueOwnerId,reportedBy:v.issueOwnerName,resolution:p.resolution,resolvedAt:now,resolvedById:actor.id,resolvedBy:actor.name});
    event(o.customerId,o.dealId,'Produktionshindret är löst: '+v.issue+'. Åtgärd: '+p.resolution);v.issue='';v.issueOwnerId='';v.issueOwnerName='';v.issueAt='';v.issueRevision++;
    notify('seller','Orderhindret är löst',d.title+': '+p.resolution,o.customerId,o.id,o.owner);
   }
   if(['production_received','production_printed','production_dispatched','production_scrap_unprinted','production_scrap_printed'].includes(action.type)){
    must(p.expectedProduction===productionBasis(v),'Registreringen utgår från äldre antal. Läs in de aktuella antalen och kontrollera din registrering.');
    must(p.entries?.length,'Ange vilka artikelrader och antal som registreras.');
    must(v.lines.length,'Ordern saknar artikelrader.');
    const kind=action.type.slice('production_'.length) as MovementKind,progress=productionProgress(v);
    if(kind==='printed'||kind==='dispatched')must(!v.issue,'Lös det registrerade produktionshindret först.');
    const ids=new Set<string>();
    for(const entry of p.entries!){
     must(!ids.has(entry.lineId),'Samma artikelrad får bara förekomma en gång per registrering.');ids.add(entry.lineId);
     const row=progress.find(r=>r.line.id===entry.lineId);must(row,'Artikelraden finns inte i denna arbetsorder.');
     const available=kind==='received'?row!.toReceive:kind==='printed'||kind==='scrap_unprinted'?row!.toPrint:row!.toDispatch;
     must(entry.quantity<=available,'Antalet överstiger tillgängligt antal för '+row!.line.description+' '+[row!.line.color,row!.line.size,row!.line.variant].filter(Boolean).join(' · ')+'. Tillgängligt: '+available+'.');
     must(quantity(entry.quantity)>0&&Math.abs(quantity(entry.quantity)-entry.quantity)<1e-10,'Ange antal med högst sex decimaler.');
    }
    if(kind.startsWith('scrap_'))must(p.message,'Ange varför varorna kasseras. Kunden har fortfarande rätt till beställt antal.');
    if(kind==='dispatched'){must(p.address?.street&&p.address?.postalCode&&p.address?.city,'Ange adress, postnummer och ort för denna utleverans.');}
    materializeLegacy(v);must(v.movements.length<1000,'Arbetsordern har nått gränsen för registreringar.');
    v.movements.push({id:uid(),kind,entries:p.entries!,at:now,by:actor.name,reason:kind.startsWith('scrap_')?p.message:'',tracking:kind==='dispatched'?p.tracking:'',recipient:kind==='dispatched'?p.recipient:'',address:kind==='dispatched'?p.address!:null,legacy:false});
    const {rows,allReceived,allPrinted,allDispatched}=synchronize(o);
    const description=p.entries!.map(e=>{const row=rows.find(r=>r.line.id===e.lineId)!;return e.quantity+' '+(row.line.unit||'st')+' '+row.line.description+' '+[row.line.color,row.line.size,row.line.variant].filter(Boolean).join(' · ');}).join('; ').slice(0,3000);
    event(o.customerId,o.dealId,({received:'Varor mottagna: ',printed:'Färdigtryckt: ',dispatched:'Utleverans: ',scrap_unprinted:'Kasserat före tryck: ',scrap_printed:'Kasserat efter tryck: '}[kind])+description+(p.tracking?' · '+p.tracking:'')+(p.message?' · '+p.message:''));
    if(kind.startsWith('scrap_'))notify('seller','Ersättningsvaror behövs efter kassation',d.title+' · '+description+'. Orsak: '+p.message+'. Kundens beställda antal gäller fortfarande.',o.customerId,o.id,o.owner);
    if(kind==='received')notify('print',allReceived?'Alla varor mottagna':'Delmottagning registrerad',d.title+' · '+description,o.customerId,o.id);
    if(kind==='printed'){notify('warehouse',allPrinted?'Hela ordern färdigtryckt':'Del av order färdigtryckt',d.title+' · '+description,o.customerId,o.id);if(allPrinted)notify('seller','Ordern är färdigtryckt',d.title,o.customerId,o.id,o.owner);}
    if(kind==='dispatched'){
     v.tracking=p.tracking;
     if(!allDispatched)notify('seller','Delleverans skickad',d.title+' · '+description+'. Återstår: '+rows.filter(r=>r.remaining>0).map(r=>r.remaining+' '+(r.line.unit||'st')+' '+r.line.description).join('; '),o.customerId,o.id,o.owner);
    }
   }
  }
 }else if(action.type==='notice_read'){
  const p=z.object({id}).parse(action.data),n=st.notices.find(n=>n.id===p.id);must(n,'Notisen finns inte.');must(receivesNotice(actor.role,n!.audience,actor.owner,n!.owner),'Notisen är inte riktad till dig.');if(!n!.readBy.includes(actor.id))n!.readBy.push(actor.id);
 }else if(action.type==='lead_contact'){
  must(['admin','seller'].includes(actor.role),'Kontaktspärrar hanteras av säljare eller administratör.');
  const p=z.object({id,blocked:z.boolean(),reason:id,expectedContext:z.string().min(1).max(3000000)}).parse(action.data),l=st.leads.find(l=>l.id===p.id);must(l,'Företaget finns inte.');
  must(p.expectedContext===leadContactBasis(st,p.id),'Kontaktspärren eller företaget har ändrats. Läs in aktuellt underlag.');
  must(Boolean(leadContactDecision(st.leads,l!)?.blocked)!==p.blocked,p.blocked?'Företaget är redan spärrat för prospektering.':'Företaget är inte spärrat för prospektering.');
  must(l!.contactHistory.length<1000,'Företaget har nått gränsen för spärrhistorik.');
  const revision=st.leads.reduce((n,l)=>l.contactHistory.reduce((n,e)=>Math.max(n,e.revision),n),0)+1;
  l!.contactHistory.push({id:uid(),identity:leadIdentity(l!),revision,blocked:p.blocked,reason:p.reason,at:now,byId:actor.id,byName:actor.name});
 }else if(action.type==='lead_import'){
  must(actor.role==='admin','Företagsimport kräver administratör.');
  const p=z.object({leads:z.array(LeadSchema).min(1).max(500)}).parse(action.data);
  for(const l of p.leads){
   const key=leadOrganizationKey(l.organizationNumber),sourceMatch=l.sourceRecordId?st.leads.find(x=>x.source===l.source&&x.sourceRecordId===l.sourceRecordId):undefined;
   must(!l.organizationNumber||key,'Ange ett svenskt organisationsnummer med tio siffror, eventuellt bindestreck eller prefix 16. Momsnummer och andra format kan inte användas som företagsidentitet.');
   must(!sourceMatch||!key||!leadOrganizationKey(sourceMatch.organizationNumber)||leadOrganizationKey(sourceMatch.organizationNumber)===key,'Källans företags-ID har ett annat organisationsnummer. Kontrollera underlaget.');
   const old=(key?st.leads.find(x=>leadOrganizationKey(x.organizationNumber)===key):undefined)||sourceMatch;
   const normalized=(v:string)=>v.trim().toLocaleLowerCase('sv').replace(/\s+/g,' ');
   if(!old)must(!st.leads.some(x=>normalized(x.name)===normalized(l.name)&&normalized(x.city)===normalized(l.city)&&(!key||!leadOrganizationKey(x.organizationNumber))&&leadContactDecision(st.leads,x)?.blocked),'Importen kan motsvara en spärrad post, men företagsidentiteten är osäker. Ange ett säkert organisationsnummer eller samma datakälla och företags-ID som den spärrade posten.');
   if(old){const contacts=[...old.contacts];for(const contact of l.contacts)if(!contacts.some(c=>c.name.toLowerCase()===contact.name.toLowerCase()&&c.email.toLowerCase()===contact.email.toLowerCase()))contacts.push(contact);must(contacts.length<=30,'Högst 30 kontaktpersoner per företag.');Object.assign(old,l,{id:old.id,customerId:old.customerId,organizationNumber:l.organizationNumber||old.organizationNumber,contactHistory:old.contactHistory,contacts});}
   else st.leads.push({...l,id:uid(),customerId:'',contactHistory:[]});
  }
 }else if(action.type==='lead_convert'){
  must(['admin','seller'].includes(actor.role),'Bearbetning startas av säljare eller administratör.');
  const p=z.object({id,owner:id,contactIndex:z.number().int().min(0).default(0),nextDate:id,nextAction:id}).parse(action.data),l=st.leads.find(l=>l.id===p.id);must(l,'Företaget finns inte.');must(!leadContactDecision(st.leads,l!)?.blocked,'Företaget är spärrat för prospektering. Återöppna kontakten med en dokumenterad orsak först.');must(!l!.customerId,'Företaget har redan lagts in i CRM.');owner(p.owner);const org=leadOrganizationKey(l!.organizationNumber);const match=st.customers.find(c=>org?leadOrganizationKey(c.organizationNumber)===org:!c.organizationNumber&&c.name.toLowerCase()===l!.name.toLowerCase());if(match){l!.customerId=match.id;return st;}const person=l!.contacts[p.contactIndex];const c=CustomerSchema.parse({id:uid(),name:l!.name,owner:p.owner,organizationNumber:org&&l!.organizationNumber.replace(/[ -]/g,'').length===12?org:l!.organizationNumber,segment:l!.industry,website:l!.website,deliveryAddress:{street:l!.address,city:l!.city},contact:person?.name||'',email:person?.email||'',phone:person?.phone||'',source:l!.source,createdAt:now,prospecting:{reason:'Utvalt från företagsökningen: '+l!.source,nextAction:p.nextAction,nextDate:p.nextDate},plan:{contacts:l!.contacts.map(p=>({...p,role:p.role||'Kontakt'}))}});st.customers.push(c);l!.customerId=c.id;st.tasks.push(TaskSchema.parse({id:uid(),customerId:c.id,owner:c.owner,title:p.nextAction,due:p.nextDate,kind:'prospecting'}));st.events.unshift({id:uid(),customerId:c.id,dealId:'',text:'Prospekt skapat från '+l!.source,at:now,kind:'change'});
 }else if(action.type==='company_event'){
  const v=CompanyEventSchema.parse(action.data);must(!v.endDate||v.endDate>=v.date,'Slutdatum får inte ligga före startdatum.');must(new Set(v.checklist.map(t=>t.id)).size===v.checklist.length,'Kontrollpunkterna behöver unika id:n.');const matches=st.companyEvents.filter(e=>e.id===v.id),old=matches[0];must(matches.length<=1,'Aktivitetskopplingen är inte entydig.');must(!v.id||old,'Aktiviteten finns inte.');protectCompanyActivityResponsibility(st,old,v,action.data);protectCompanyEventResponsibilities(st,old,v,action.data);v.id=old?.id||uid();if(old)Object.assign(old,v);else st.companyEvents.push(v);validateCompanyActivityResponsibilityReferences(st);
 }
 return st;
}
