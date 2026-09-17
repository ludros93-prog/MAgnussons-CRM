import type {State} from './crm';
export function collectFileReferences(st:Pick<State,'orders'|'deals'>){
 const refs:{id:string;customerId:string;version:string;kind:'proof'|'sketch'}[]=[];
 for(const o of st.orders){
  if(o.proofFileId)refs.push({id:o.proofFileId,customerId:o.customerId,version:o.proofVersion,kind:'proof'});
  for(const p of [o.production,...o.productionHistory])if(p.sketchFileId)refs.push({id:p.sketchFileId,customerId:o.customerId,version:p.sketchVersion,kind:'sketch'});
 }
 for(const d of st.deals)if(d.repeatRecipe?.sketchFileId)refs.push({id:d.repeatRecipe.sketchFileId,customerId:d.customerId,version:d.repeatRecipe.sketchVersion,kind:'sketch'});
 return refs;
}
