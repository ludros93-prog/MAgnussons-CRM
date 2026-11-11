import {day,plusDays,type State} from './crm';
import {editableRecord,recordBasis} from './record-conflicts';
import {productionBasis,productionProgress} from './production-quantities';
import {receiptBasis,awaitingReceipt} from './order-work';

// Exempelorder för demoytan.
// Varje exempel byggs med samma åtgärder som säljare, tryck och lager använder
// i vardagen: order, godkänt korrektur, tryckorder, mottagna varor, tryck,
// utleverans och kundens kvittens. Inget skrivs utanför de vanliga reglerna,
// och ett avbrutet försök fortsätter där det slutade nästa gång.
export const DEMO_FLOW_PREFIX='Exempel: ';

export type DemoFlowExample={
 key:string;title:string;status:string;
 article:string;description:string;color:string;size:string;quantity:number;unitPrice:number;unitCost:number;
 instructions:string;printDays:number;dispatchDays:number;deliveryDays:number;
 accept?:boolean;receive?:boolean;print?:number;dispatch?:number;confirm?:boolean;issue?:string;
};

export const demoFlowExamples:DemoFlowExample[]=[
 {key:'vantar-pa-tryck',title:'Arbetsjackor med ryggtryck',status:'Väntar på tryck',article:'JK-2200',description:'Arbetsjacka softshell',color:'Svart',size:'L',quantity:40,unitPrice:649,unitCost:389,instructions:'Ryggtryck 28 cm brett med vit logotyp. Brösttryck vänster 9 cm.',printDays:4,dispatchDays:6,deliveryDays:8},
 {key:'tryck-pagar',title:'T-shirts till sommarpersonalen',status:'Tryck pågår',article:'TS-1100',description:'T-shirt ekologisk bomull',color:'Marin',size:'M',quantity:120,unitPrice:129,unitCost:62,instructions:'Brösttryck vänster 9 cm med vit logotyp. Ingen ryggmärkning.',printDays:1,dispatchDays:3,deliveryDays:5,accept:true,receive:true,print:60},
 {key:'hinder',title:'Kepsar med brodyr',status:'Hinder i tryck',article:'KP-0450',description:'Keps sexpanel',color:'Svart',size:'One size',quantity:60,unitPrice:119,unitCost:54,instructions:'Brodyr fram, 6 cm bred. Trådfärg enligt logotypen.',printDays:2,dispatchDays:4,deliveryDays:6,accept:true,receive:true,issue:'Logotypen saknas i vektorformat. Vi behöver en EPS- eller AI-fil innan brodyren kan starta.'},
 {key:'vantar-pa-lager',title:'Profilvästar till mässan',status:'Färdigtryckt, väntar på lager',article:'VS-3300',description:'Väst softshell',color:'Grå',size:'L',quantity:30,unitPrice:499,unitCost:285,instructions:'Brösttryck vänster 9 cm och ryggtryck 25 cm.',printDays:0,dispatchDays:0,deliveryDays:2,accept:true,receive:true,print:30},
 {key:'delleverans',title:'Hoodies till klubbshopen',status:'Delvis skickad',article:'HD-5100',description:'Hoodie med dragkedja',color:'Röd',size:'L',quantity:80,unitPrice:389,unitCost:210,instructions:'Klubbmärke bröst vänster 8 cm. Sponsorlogotyp rygg 25 cm.',printDays:0,dispatchDays:1,deliveryDays:3,accept:true,receive:true,print:80,dispatch:50},
 {key:'skickad',title:'Muggar med logotyp',status:'Skickad, väntar på kundens kvittens',article:'MG-0300',description:'Mugg keramik 30 cl',color:'Vit',size:'30 cl',quantity:200,unitPrice:59,unitCost:24,instructions:'Enfärgstryck. Logotyp 7 cm bred, mitt emot örat.',printDays:0,dispatchDays:0,deliveryDays:1,accept:true,receive:true,print:200,dispatch:200},
 {key:'levererad',title:'Välkomstpaket till nyanställda',status:'Levererad, redo att fakturera',article:'VP-0025',description:'Välkomstpaket med ryggsäck, flaska och anteckningsbok',color:'Svart',size:'Paket',quantity:25,unitPrice:695,unitCost:410,instructions:'Logotyp på ryggsäckens framficka, 8 cm bred.',printDays:0,dispatchDays:0,deliveryDays:0,accept:true,receive:true,print:25,dispatch:25,confirm:true}
];

export type DemoFlowFile={id:string;version:string};
export type DemoFlowApi={
 // Skickar en vanlig CRM-åtgärd och returnerar arbetsytans nya läge.
 post:(st:State,type:string,data:Record<string,unknown>,expectedRecord?:string)=>Promise<State>;
 // Sparar en exempelskiss som korrekturfil på kunden och läser in arbetsytan igen.
 upload:(customerId:string,example:DemoFlowExample)=>Promise<{file:DemoFlowFile;state:State}>;
};

type Step='create'|'proof'|'submit'|'accept'|'receive'|'print'|'dispatch'|'issue'|'confirm';
const earlier=(a:string,b:string)=>a<b?a:b;
const records=(st:State,example:DemoFlowExample)=>{
 const deal=st.deals.find(d=>d.title===DEMO_FLOW_PREFIX+example.title),order=deal?st.orders.find(o=>o.dealId===deal.id):undefined;
 return {deal,order,customer:order?st.customers.find(c=>c.id===order.customerId):undefined};
};

// Nästa åtgärd som saknas för att exemplet ska nå sitt läge. null = klart.
export function demoFlowNextStep(st:State,example:DemoFlowExample):Step|null{
 const {deal,order}=records(st,example);
 if(!deal||!order)return 'create';
 const p=order.production;
 if(p.status==='draft'||p.status==='cancelled')return order.proofApproved&&order.proofFileId&&order.proofVersion&&order.supplierConfirmed?'submit':'proof';
 const row=productionProgress(p)[0];
 if(!row)return null;
 const active=p.status!=='dispatched';
 if(active&&example.accept&&!p.acceptedAt)return 'accept';
 if(active&&example.receive&&row.toReceive>0)return 'receive';
 if(active&&!p.issue&&row.printed<(example.print||0)&&row.toPrint>0)return 'print';
 if(active&&!p.issue&&row.dispatched<(example.dispatch||0)&&row.toDispatch>0)return 'dispatch';
 if(active&&example.issue&&!p.issue&&!p.issueResolutions.length)return 'issue';
 if(example.confirm&&awaitingReceipt(order))return 'confirm';
 return null;
}

export const demoFlowPending=(st:State)=>demoFlowExamples.filter(example=>demoFlowNextStep(st,example)!==null);
export const demoFlowStarted=(st:State)=>demoFlowExamples.some(example=>!!records(st,example).deal);

// Kunder som kan få en exempelorder: kontaktperson finns och ansvarig säljare
// finns kvar i teamet. Aktiva kunder går före prospekt, så att exemplen inte
// startar onboarding för demoytans prospekt i onödan.
function customerFor(st:State,index:number){
 const owners=new Set(st.settings.owners),usable=st.customers.filter(c=>c.contact&&owners.has(c.owner)&&c.status!=='closed');
 const established=usable.filter(c=>c.status!=='prospect'),pool=established.length?established:usable;
 if(!pool.length)throw Error('Demoytan saknar en kund med kontaktperson och ansvarig säljare. Lägg till en kund och försök igen.');
 return pool[index%pool.length];
}

async function perform(api:DemoFlowApi,st:State,example:DemoFlowExample,index:number,step:Step):Promise<State>{
 const today=day();
 if(step==='create'){
  const customer=customerFor(st,index);
  return api.post(st,'catalog_order',{customerId:customer.id,owner:customer.owner,title:DEMO_FLOW_PREFIX+example.title,lines:[{id:crypto.randomUUID(),kind:'product',article:example.article,description:example.description,color:example.color,size:example.size,quantity:example.quantity,unitPrice:example.unitPrice,unitCost:example.unitCost}],deliveryDate:plusDays(today,example.deliveryDays),accepted:true,notes:'',nextDate:today});
 }
 const {deal,order,customer}=records(st,example);
 if(!deal||!order)throw Error('Exempelordern hittades inte i demoytan.');
 const contact=customer?.contact||'Kundens kontaktperson',p=order.production,row=productionProgress(p)[0];
 if(step==='proof'){
  const {file,state}=await api.upload(order.customerId,example),current=state.orders.find(o=>o.id===order.id);
  if(!current)throw Error('Exempelordern hittades inte efter att skissen sparades.');
  return api.post(state,'order',{...current,proofRequired:true,proofApproved:true,proofFileId:file.id,proofVersion:file.version,approvedBy:contact,approvedDate:today,supplierConfirmed:true},recordBasis(editableRecord(state,'order',order.id)));
 }
 if(step==='submit'){
  const dispatchDeadline=earlier(plusDays(today,example.dispatchDays),order.deliveryDate),printDeadline=earlier(plusDays(today,example.printDays),dispatchDeadline);
  return api.post(st,'production_submit',{orderId:order.id,production:{lines:deal.lines.filter(line=>line.kind==='product'),sketchFileId:order.proofFileId,sketchVersion:order.proofVersion,instructions:example.instructions,printDeadline,dispatchDeadline}});
 }
 if(step==='accept')return api.post(st,'production_accept',{orderId:order.id});
 if(step==='confirm')return api.post(st,'receipt_confirm',{orderId:order.id,expectedContext:receiptBasis(st,order.id),deliveredDate:today,receivedBy:contact,note:'Exempel: kunden har bekräftat att allt kom fram.'});
 const expectedProduction=productionBasis(p);
 if(step==='issue')return api.post(st,'production_issue',{orderId:order.id,expectedProduction,message:example.issue});
 if(!row)throw Error('Exempelordern saknar artikelrad.');
 if(step==='receive')return api.post(st,'production_received',{orderId:order.id,expectedProduction,entries:[{lineId:row.line.id,quantity:row.toReceive}]});
 if(step==='print')return api.post(st,'production_printed',{orderId:order.id,expectedProduction,entries:[{lineId:row.line.id,quantity:Math.min((example.print||0)-row.printed,row.toPrint)}]});
 return api.post(st,'production_dispatched',{orderId:order.id,expectedProduction,entries:[{lineId:row.line.id,quantity:Math.min((example.dispatch||0)-row.dispatched,row.toDispatch)}],address:{street:'Exempelgatan 1',postalCode:'288 33',city:'Vinslöv',country:'Sverige',reference:''},recipient:contact,tracking:'EXEMPEL-'+example.key.toUpperCase()});
}

// Lägger in de exempel som saknas. Varje exempel tar högst tio åtgärder.
export async function runDemoFlow(api:DemoFlowApi,initial:State,onProgress?:(done:number,total:number,example:DemoFlowExample)=>void):Promise<State>{
 let st=initial;
 const pending=demoFlowPending(st);
 for(const [position,example] of pending.entries()){
  onProgress?.(position,pending.length,example);
  const index=demoFlowExamples.indexOf(example);
  for(let guard=0;guard<10;guard++){
   const step=demoFlowNextStep(st,example);
   if(!step)break;
   st=await perform(api,st,example,index,step);
  }
  if(demoFlowNextStep(st,example))throw Error('Exemplet "'+example.title+'" kunde inte göras klart. Försök igen.');
 }
 return st;
}
