'use client';

import {Button} from '@/components/ui/button';

type Check = {step:number;label:string;ok:boolean};

export function OrderPreparationNextStep({checks,changed,amendment,conflict,disabled,onGo}:{
 checks:Check[];changed:boolean;amendment:boolean;conflict:boolean;disabled:boolean;onGo:(step:number)=>void;
}){
 const missing=checks.filter(check=>!check.ok);
 const blocker=changed?'Läs in aktuella orderuppgifter ovan innan du fortsätter.':
  amendment?'Hantera orderns ändringsförslag ovan innan den lämnas till tryck.':
  conflict?'Lös utkastkonflikten ovan innan ordern lämnas till tryck.':'';
 return <section className="biz-callout min-w-0 [overflow-wrap:anywhere]" aria-label="Nästa steg i orderförberedelsen">
  <p><b>{blocker?'Ordern behöver granskas':missing.length?'Nästa att komplettera':'Underlaget är ifyllt – granska före inlämning'}</b></p>
  {blocker?<p>{blocker}</p>:<>
   <p>{missing.length?`${missing.length} av ${checks.length} kontroller behöver kompletteras. Börja med ${missing[0].label.toLocaleLowerCase('sv-SE')}.`:'Öppna sammanställningen och kontrollera adress, antal, godkännande och datum.'}</p>
   <Button type="button" className="h-auto min-h-11! max-w-full whitespace-normal text-left" disabled={disabled} onClick={()=>onGo(missing[0]?.step??4)}>
    {missing.length?'Komplettera: '+missing[0].label:'Granska ordern'}
   </Button>
  </>}
  <p className="biz-hint">Detta är ditt arbetsunderlag. Tryck och lager får ordern först när du väljer ”Lämna till tryck och lager” och får sparbesked.</p>
 </section>;
}
