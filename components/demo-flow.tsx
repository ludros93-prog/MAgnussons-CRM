'use client';
import {useState} from 'react';
import {toast} from 'sonner';
import {PackagePlus,RefreshCw,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {State} from '@/lib/crm';
import {demoFlowExamples,demoFlowPending,demoFlowStarted,runDemoFlow,type DemoFlowApi,type DemoFlowExample} from '@/lib/demo-flow';

const HIDE_KEY='magnussons-demo-exempel-dolt';
const hiddenBefore=()=>{try{return window.localStorage.getItem(HIDE_KEY)==='1'}catch{return false}};

// En enkel exempelskiss: plagg, tryckyta och placering. Ritas i webbläsaren.
async function sketch(example:DemoFlowExample):Promise<Blob>{
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=620;
 const g=canvas.getContext('2d');if(!g)throw Error('Exempelskissen kunde inte ritas i den här webbläsaren.');
 g.fillStyle='#ffffff';g.fillRect(0,0,900,620);
 g.strokeStyle='#202934';g.lineWidth=4;g.lineJoin='round';g.fillStyle='#eef1f5';
 g.beginPath();g.moveTo(330,110);g.lineTo(250,140);g.lineTo(170,250);g.lineTo(235,295);g.lineTo(270,250);g.lineTo(270,520);g.lineTo(630,520);g.lineTo(630,250);g.lineTo(665,295);g.lineTo(730,250);g.lineTo(650,140);g.lineTo(570,110);g.quadraticCurveTo(450,170,330,110);g.closePath();g.fill();g.stroke();
 g.setLineDash([10,8]);g.strokeStyle='#d72e43';g.lineWidth=3;g.strokeRect(500,210,90,60);g.setLineDash([]);
 g.fillStyle='#d72e43';g.font='bold 18px Arial, sans-serif';g.textAlign='center';g.fillText('LOGO',545,247);
 g.fillStyle='#202934';g.textAlign='left';g.font='bold 26px Arial, sans-serif';g.fillText('Exempelskiss',40,52);
 g.font='18px Arial, sans-serif';g.fillStyle='#4b5766';g.fillText(example.description+' · '+example.color+' · '+example.quantity+' st',40,82);
 g.font='16px Arial, sans-serif';g.fillText(example.instructions.slice(0,96),40,575);
 g.fillStyle='#8a94a3';g.fillText('Fiktivt underlag för demoytan',40,600);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Exempelskissen kunde inte sparas som bild.')),'image/png'));
}

const read=async(response:Response)=>{
 const value:any=await response.json().catch(()=>null);
 if(!response.ok)throw Error(value?.error||'Demoytan kunde inte uppdateras. Försök igen.');
 return value;
};
const api:DemoFlowApi={
 post:async(st,type,data,expectedRecord)=>read(await fetch('/api/crm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({space:'demo',version:st.version,requestId:crypto.randomUUID(),expectedRecord,type,data})})),
 upload:async(customerId,example)=>{
  const form=new FormData();
  form.set('space','demo');form.set('customerId',customerId);form.set('version','Exempel 1');form.set('kind','proof');
  form.set('file',new File([await sketch(example)],'exempelskiss-'+example.key+'.png',{type:'image/png'}));
  const file=await read(await fetch('/api/crm/files',{method:'POST',body:form}));
  return {file,state:await read(await fetch('/api/crm?space=demo',{cache:'no-store'}))};
 }
};

// Visas bara i demoytan. Administratören kan lägga in exempelorder som visar
// hela flödet, så att säljare, tryck och lager har något att öva på.
export function DemoFlow({st,space,onDone}:{st:State;space:string;onDone:()=>void}){
 const [running,setRunning]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[hidden,setHidden]=useState(hiddenBefore);
 if(space!=='demo'||!st.viewer)return null;
 const pending=demoFlowPending(st),started=demoFlowStarted(st);
 if(!running&&!pending.length)return null;
 if(st.viewer.role!=='admin'){
  if(started||st.viewer.role==='reader')return null;
  return <p className="demo-flow demo-flow-hint" role="note"><PackagePlus size={17} aria-hidden="true"/><span>Demoytan har inga exempelorder ännu. Be en administratör lägga in dem här i demoytan, så får du order och jobb att öva på.</span></p>;
 }
 if(hidden&&!running&&!error)return null;
 async function run(){
  if(running)return;
  setRunning(true);setError('');setProgress('Förbereder exempel…');
  try{
   const current=await read(await fetch('/api/crm?space=demo',{cache:'no-store'}));
   await runDemoFlow(api,current,(done,total,example)=>setProgress('Lägger in exempel '+(done+1)+' av '+total+': '+example.status.toLowerCase()+'…'));
   toast.success('Exempelorder inlagda. Öppna Offerter och välj Order & leverans för att följa dem.');
  }catch(e){
   setError(e instanceof Error&&e.message?e.message:'Exemplen kunde inte läggas in. Försök igen.');
  }finally{
   setRunning(false);setProgress('');onDone();
  }
 }
 const dismiss=()=>{setHidden(true);try{window.localStorage.setItem(HIDE_KEY,'1')}catch{/* Valet gäller då bara tills sidan laddas om. */}};
 return <section className="demo-flow" aria-label="Exempelorder i demoytan" aria-busy={running} data-demo-flow={running?'running':error?'error':'ready'}>
  <span className="demo-flow-icon" aria-hidden="true"><PackagePlus size={22}/></span>
  <div className="demo-flow-text">
   <h2>{started?'Gör klart exempelordern':'Visa hela flödet i demoytan'}</h2>
   <p>{demoFlowExamples.length} fiktiva order läggs in, från väntar på tryck till levererad och redo att fakturera. Säljare, tryck och lager får något att öva på. Inget sparas utanför demoytan.</p>
   {running&&<p className="demo-flow-status" role="status">{progress}</p>}
   {error&&<p className="demo-flow-error" role="alert">{error} Det som hann läggas in finns kvar.</p>}
  </div>
  <div className="demo-flow-actions">
   <Button type="button" onClick={run} disabled={running}>{running?<RefreshCw size={17} className="demo-flow-spin" aria-hidden="true"/>:<PackagePlus size={17} aria-hidden="true"/>}{running?'Lägger in…':error?'Försök igen':'Lägg in exempelorder'}</Button>
   {!running&&<Button type="button" variant="ghost" onClick={dismiss}><X size={16} aria-hidden="true"/>Inte nu</Button>}
  </div>
 </section>;
}
