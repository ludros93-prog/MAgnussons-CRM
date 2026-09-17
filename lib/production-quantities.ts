import type {z} from 'zod';
import type {ProductionSchema} from './operations';
import {recordBasis} from './record-conflicts';
export type Production=z.infer<typeof ProductionSchema>;
export type MovementKind='received'|'printed'|'dispatched'|'scrap_unprinted'|'scrap_printed';
export const quantity=(n:number)=>Math.round(n*1e6)/1e6;
// Empty/duplicate IDs in old order snapshots get deterministic local row identities.
export function normalizeProduction(p:Production):Production {
  const used=new Set<string>();
  p.lines=p.lines.map((l,i)=>{let id=l.id;if(!id||used.has(id)){id='legacy-row-'+(i+1);while(used.has(id)||p.lines.some(other=>other.id===id))id+='-';}used.add(id);return {...l,id};});
  return p;
}
export function productionProgress(p:Production){
  return p.lines.map(line=>{
    const sum=(kind:MovementKind)=>quantity(p.movements.filter(m=>m.kind===kind).reduce((total,m)=>total+m.entries.filter(e=>e.lineId===line.id).reduce((v,e)=>v+e.quantity,0),0));
    const legacy=p.quantityMode==='legacy';
    const received=legacy?(p.goodsReceived||['printed','dispatched'].includes(p.status)?line.quantity:0):sum('received');
    const printed=legacy?(['printed','dispatched'].includes(p.status)?line.quantity:0):sum('printed');
    const dispatched=legacy?(p.status==='dispatched'?line.quantity:0):sum('dispatched');
    const scrapUnprinted=sum('scrap_unprinted'),scrapPrinted=sum('scrap_printed');
    const reduction=quantity(p.quantityAdjustments.reduce((n,a)=>n+a.entries.filter(e=>e.lineId===line.id).reduce((v,e)=>v+e.quantity,0),0));
    const target=quantity(line.quantity-reduction),usableReceived=quantity(received-scrapUnprinted-scrapPrinted),usablePrinted=quantity(printed-scrapPrinted);
    return {line,ordered:line.quantity,target,reduction,received,printed,dispatched,scrapUnprinted,scrapPrinted,usableReceived,usablePrinted,toReceive:quantity(target-usableReceived),toPrint:quantity(received-scrapUnprinted-printed),toDispatch:quantity(usablePrinted-dispatched),remaining:quantity(target-dispatched)};
  });
}
export function productionBasis(p:Production){return recordBasis([p.workId,p.submittedAt,p.status,p.goodsReceived,p.quantityMode,p.lines.map(l=>[l.id,l.quantity]),p.movements.map(m=>m.id),p.quantityAdjustments.map(a=>a.id),p.issue,p.deliveryAddress]);}
export function hasPhysicalWork(p:Production){return p.movements.length>0||!!(p.goodsReceived||p.goodsReceivedAt||p.printedAt||p.dispatchedAt)||productionProgress(p).some(r=>r.received>0||r.printed>0||r.dispatched>0);}
export function materializeLegacy(p:Production){
  if(p.quantityMode!=='legacy')return;
  const progress=productionProgress(p);
  for(const kind of ['received','printed','dispatched'] as const){
    const entries=progress.filter(row=>row[kind]>0).map(row=>({lineId:row.line.id,quantity:row[kind]}));
    if(entries.length)p.movements.push({id:'legacy-'+kind,kind,entries,at:(kind==='received'?p.goodsReceivedAt:kind==='printed'?p.printedAt:p.dispatchedAt)||p.submittedAt||'Tidigare registrering',by:(kind==='received'?p.goodsReceivedBy:kind==='printed'?p.printedBy:p.dispatchedBy)||'Tidigare registrering',legacy:true,reason:'',tracking:kind==='dispatched'?p.tracking:'',recipient:'',address:kind==='dispatched'?p.deliveryAddress:null});
  }
  p.quantityMode='lines';
}

export function assignmentBasis(p:Production){return recordBasis([p.workId,p.submittedAt,p.status,p.assigneeId,p.assignmentRevision]);}
