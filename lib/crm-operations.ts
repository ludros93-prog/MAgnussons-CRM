import {applyOrderRevision} from './order-revisions';
import {normalizeProduction,productionProgress,productionBasis,assignmentBasis,hasPhysicalWork,materializeLegacy,quantity,type MovementKind} from './production-quantities';
import {z} from 'zod';
import {type State,type Action,type Actor,RuleError,CustomerSchema,DealSchema,TaskSchema,applyAction,day,plusDays} from './crm';
import {receivesNotice,ArticleSchema,ProductionSchema,MovementEntrySchema,LeadSchema,CompanyEventSchema} from './operations';
import {orderBasis,ensureReceiptTasks,awaitingReceipt} from './order-work';
import {AddressSchema,validDate,LineSchema,calculateQuote} from './business';
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
  const allReceived=rows.length>0&&rows.every(r=>r.toReceive===0),allPrinted=rows.length>0&&rows.every(r=>r.usablePrinted===r.target),allDispatched=rows.length>0&&rows.every(r=>r.remaining===0)&&rows.some(r=>r.dispatched>0);
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
 if(['production_claim','production_release'].includes(action.type)){
  const p=z.object({orderId:id,expectedAssignment:z.string().max(100000)}).parse(action.data),o=order(p.orderId),v=o.production;
  must(['admin','production','print','warehouse'].includes(actor.role),'Arbetsansvar hanteras av produktionen eller administratör.');
  must(['submitted','printed'].includes(v.status),'Arbetsordern är inte aktiv.');must(p.expectedAssignment===assignmentBasis(v),'Arbetsansvaret har ändrats. Läs in aktuellt jobb.');
  if(action.type==='production_claim'){must(!v.assigneeId,'Jobbet har redan en ansvarig.');v.assigneeId=actor.id;v.assigneeName=actor.name;v.assignedAt=now;event(o.customerId,o.dealId,actor.name+' tog ansvar för arbetsordern.');}
  else {must(v.assigneeId,'Jobbet saknar ansvarig.');must(v.assigneeId===actor.id||actor.role==='admin','Bara den ansvariga eller administratören kan lämna tillbaka jobbet.');event(o.customerId,o.dealId,'Arbetsordern lämnades tillbaka till gemensam kö. Tidigare ansvarig: '+v.assigneeName);v.assigneeId='';v.assigneeName='';v.assignedAt='';}
  v.assignmentRevision++;
 }else if(action.type==='order_shortfall'){
  must(['admin','seller'].includes(actor.role),'Kundens ändrade beställning registreras av säljare eller administratör.');
  const p=z.object({orderId:id,expectedProduction:z.string().min(1),entries:z.array(MovementEntrySchema).min(1).max(100),reason:id,customerApprovedBy:id,customerApprovedOn:validDate.refine(Boolean),agreedValue:z.number().finite().min(0).max(1e9)}).parse(action.data),o=order(p.orderId),v=o.production;
  must(['submitted','printed'].includes(v.status)&&o.invoiceValue===null,'Avvikelsen ska registreras på en aktiv, ännu inte fakturerad order.');
  must(p.expectedProduction===productionBasis(v),'Antalen har ändrats. Läs in aktuellt underlag.');
  must(p.customerApprovedOn<=today&&p.customerApprovedOn>=v.submittedAt.slice(0,10),'Ange kundens godkännandedatum för denna order.');
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
  const p=z.object({orderId:id,deliveredDate:validDate.refine(Boolean),receivedBy:id,note:text.default('')}).parse(action.data),o=order(p.orderId);must(awaitingReceipt(o),'Ordern väntar inte på mottagningsbekräftelse.');must(p.deliveredDate<=today,'Leveransdatum får inte ligga i framtiden.');must(!o.production.dispatchedAt||p.deliveredDate>=o.production.dispatchedAt.slice(0,10),'Mottagandet kan inte ligga före utleveransen.');
  const next=applyAction(st,{type:'order',data:{...o,stage:'delivered',deliveredDate:p.deliveredDate,receivedBy:p.receivedBy,receiptNote:p.note}},actor);next.events.unshift({id:uid(),customerId:o.customerId,dealId:o.dealId,at:now,kind:'delivery_receipt',text:'Kundmottagande bekräftat: '+p.receivedBy+' · '+p.deliveredDate+(p.note?' · '+p.note:'')});return next;
 }else if(action.type==='receipt_issue'){
  const p=z.object({orderId:id,message:id,nextCheck:validDate.refine(Boolean)}).parse(action.data),o=order(p.orderId);must(awaitingReceipt(o),'Ordern väntar inte på mottagningsbekräftelse.');must(p.nextCheck>=today,'Nästa kontroll behöver vara idag eller senare.');o.deliveryIssue=p.message;o.deliveryNextCheck=p.nextCheck;ensureReceiptTasks(st);const task=st.tasks.find(t=>t.dealId===o.dealId&&t.kind==='receipt')!;task.done=false;task.doneAt='';task.due=p.nextCheck;task.owner=o.owner;event(o.customerId,o.dealId,'Leverans behöver följas upp: '+p.message);notify('seller','Leverans behöver åtgärd',p.message+' · nästa kontroll '+p.nextCheck,o.customerId,o.id,o.owner);
 }else if(action.type==='production_submit'){
  const p=z.object({orderId:id,production:ProductionSchema}).parse(action.data),o=order(p.orderId),d=st.deals.find(d=>d.id===o.dealId)!;
  must(!o.pendingAmendment,'Kunden behöver godkänna orderändringen innan underlaget lämnas till tryck.');must(['draft','cancelled'].includes(o.production.status),'Tryckordern är redan inlämnad.');must(!o.production.quantityAdjustments.length,'En kundgodkänd antaländring får inte ersättas av en ny arbetsversion.');must(!hasPhysicalWork(o.production),'Den tidigare arbetsordern har registrerade varor eller produktion. Stäm av hanterade antal innan ett nytt underlag lämnas in.');must(!['delivered','followed','shipping'].includes(o.stage)&&o.invoiceValue===null,'En skickad eller fakturerad order kan inte skickas till tryck igen.');
  const v=p.production;must(v.lines.every(l=>l.quantity===quantity(l.quantity)),'Artikelantal får ha högst sex decimaler.');must(v.lines.length&&v.lines.every(l=>l.article&&l.quantity>0),'Ange artikelnummer, variant och antal på orderraderna.');must(v.instructions,'Beskriv tryckets placering och utförande.');must(v.sketchFileId&&v.sketchVersion,'Välj en uppladdad skiss och version.');must(v.printDeadline&&v.dispatchDeadline&&o.deliveryDate,'Ange tryckdeadline, utleveransdag och kundens leveransdag.');must(v.printDeadline<=v.dispatchDeadline&&v.dispatchDeadline<=o.deliveryDate,'Datumen ska följa tryck → utleverans → leverans.');must(o.supplierConfirmed,'Bekräfta leverantörens order och leveransdag först.');must(!o.proofRequired||(o.proofApproved&&o.proofFileId===v.sketchFileId&&o.proofVersion===v.sketchVersion&&o.approvedBy&&o.approvedDate),'Skissen behöver vara samma version som kundens registrerade korrekturgodkännande.');
  if(o.production.status==='cancelled'){must(o.productionHistory.length<100,'Högst 100 tidigare arbetsversioner per order.');o.productionHistory.push(structuredClone(o.production));}
  const products=d.lines.filter(l=>l.kind==='product');if(products.length){const key=(l:z.infer<typeof LineSchema>)=>JSON.stringify([l.sourceId,l.article,l.variant,l.variantId,l.color,l.size,l.unit,l.quantity]);must(JSON.stringify(products.map(key).sort())===JSON.stringify(v.lines.map(key).sort()),'Tryckorderns artiklar, varianter och antal måste motsvara den accepterade ordern.');}
  o.production=normalizeProduction(ProductionSchema.parse({workId:uid(),quantityMode:'lines',lines:v.lines,instructions:v.instructions,sketchFileId:v.sketchFileId,sketchVersion:v.sketchVersion,printDeadline:v.printDeadline,dispatchDeadline:v.dispatchDeadline,deliveryDate:o.deliveryDate,deliveryAddress:o.shippingAddress||customer(o.customerId).deliveryAddress,status:'submitted',submittedAt:now,submittedBy:actor.name}));o.stage='production';for(const t of st.tasks)if(t.dealId===o.dealId&&t.kind==='handover'&&!t.done){t.done=true;t.doneAt=now;}
  event(o.customerId,o.dealId,'Tryckorder inlämnad: '+d.title+' · tryck klart '+v.printDeadline+' · skickas '+v.dispatchDeadline);notify('print','Ny tryckorder',d.title+' · klart '+v.printDeadline,o.customerId,o.id);notify('warehouse','Ny order att planera',d.title+' · skickas '+v.dispatchDeadline,o.customerId,o.id);
 }else if(action.type.startsWith('production_')){
  const p=z.object({orderId:id,message:text.default(''),tracking:text.max(500).default(''),recipient:text.max(200).default(''),address:AddressSchema.optional(),expectedProduction:z.string().max(100000).optional(),entries:z.array(MovementEntrySchema).min(1).max(100).optional()}).parse(action.data),o=order(p.orderId),v=o.production,d=st.deals.find(d=>d.id===o.dealId)!;
  if(action.type==='production_cancel'){
   must(['submitted','printed'].includes(v.status),'Endast en oskickad tryckorder kan avbrytas.');
   must(!v.quantityAdjustments.length,'En kundgodkänd antaländring måste behållas. Rapportera ett hinder om arbetsordern behöver ändras.');
   must(!hasPhysicalWork(v),'Varor har redan registrerats. Rapportera ett hinder så att ändringen kan hanteras utan att mottagna, tryckta eller skickade antal försvinner.');
   must(p.message,'Ange varför tryckordern avbryts.');v.status='cancelled';v.cancellationReason=p.message;o.stage='handover';notify('print','Tryckorder avbruten',d.title+': '+p.message,o.customerId,o.id);notify('warehouse','Tryckorder avbruten',d.title+': '+p.message,o.customerId,o.id);event(o.customerId,o.dealId,'Tryckorder avbruten: '+p.message);
  }else{
   must(['submitted','printed'].includes(v.status),'Ordern finns inte längre i den aktiva produktionskön.');
   if(action.type==='production_accept'){must(!v.acceptedAt,'Tryckordern är redan mottagen.');v.acceptedAt=now;v.acceptedBy=actor.name;event(o.customerId,o.dealId,'Tryck har tagit emot arbetsordern');}
   if(action.type==='production_issue'){must(!v.issue||v.issueOwnerId===actor.id||actor.role==='admin','Hindret ägs av '+(v.issueOwnerName||'en annan medarbetare')+'. Ägaren eller en administratör behöver ändra det.');v.issue=p.message;v.issueAt=now;v.issueOwnerId=p.message?actor.id:'';v.issueOwnerName=p.message?actor.name:'';event(o.customerId,o.dealId,p.message?'Produktionshinder: '+p.message:'Produktionshindret är löst');notify('seller',p.message?'Åtgärd behövs i order':'Orderhindret är löst',d.title+(p.message?': '+p.message:''),o.customerId,o.id,o.owner);}
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
 }else if(action.type==='lead_import'){
  const p=z.object({leads:z.array(LeadSchema).min(1).max(500)}).parse(action.data);for(const l of p.leads){const key=l.organizationNumber.replace(/\D/g,'');const old=st.leads.find(x=>key?x.organizationNumber.replace(/\D/g,'')===key:x.name.toLowerCase()===l.name.toLowerCase()&&x.city.toLowerCase()===l.city.toLowerCase());if(old){const contacts=[...old.contacts];for(const contact of l.contacts)if(!contacts.some(c=>c.name.toLowerCase()===contact.name.toLowerCase()&&c.email.toLowerCase()===contact.email.toLowerCase()))contacts.push(contact);must(contacts.length<=30,'Högst 30 kontaktpersoner per företag.');Object.assign(old,l,{id:old.id,customerId:old.customerId,contacts});}else st.leads.push({...l,id:uid(),customerId:''});}
 }else if(action.type==='lead_convert'){
  const p=z.object({id,owner:id,contactIndex:z.number().int().min(0).default(0),nextDate:id,nextAction:id}).parse(action.data),l=st.leads.find(l=>l.id===p.id);must(l,'Företaget finns inte.');must(!l!.customerId,'Företaget har redan lagts in i CRM.');owner(p.owner);const org=l!.organizationNumber.replace(/\D/g,'');const match=st.customers.find(c=>org?c.organizationNumber.replace(/\D/g,'')===org:!c.organizationNumber&&c.name.toLowerCase()===l!.name.toLowerCase());if(match){l!.customerId=match.id;return st;}const person=l!.contacts[p.contactIndex];const c=CustomerSchema.parse({id:uid(),name:l!.name,owner:p.owner,organizationNumber:l!.organizationNumber,segment:l!.industry,website:l!.website,deliveryAddress:{street:l!.address,city:l!.city},contact:person?.name||'',email:person?.email||'',phone:person?.phone||'',source:l!.source,createdAt:now,prospecting:{reason:'Utvalt från företagsökningen: '+l!.source,nextAction:p.nextAction,nextDate:p.nextDate},plan:{contacts:l!.contacts.map(p=>({...p,role:p.role||'Kontakt'}))}});st.customers.push(c);l!.customerId=c.id;st.tasks.push(TaskSchema.parse({id:uid(),customerId:c.id,owner:c.owner,title:p.nextAction,due:p.nextDate,kind:'prospecting'}));st.events.unshift({id:uid(),customerId:c.id,dealId:'',text:'Prospekt skapat från '+l!.source,at:now,kind:'change'});
 }else if(action.type==='company_event'){
  const v=CompanyEventSchema.parse(action.data);owner(v.owner);v.checklist.forEach(t=>owner(t.owner));must(!v.endDate||v.endDate>=v.date,'Slutdatum får inte ligga före startdatum.');must(new Set(v.checklist.map(t=>t.id)).size===v.checklist.length,'Kontrollpunkterna behöver unika id:n.');const old=st.companyEvents.find(e=>e.id===v.id);must(!v.id||old,'Aktiviteten finns inte.');v.id=old?.id||uid();if(old)Object.assign(old,v);else st.companyEvents.push(v);
 }
 return st;
}
