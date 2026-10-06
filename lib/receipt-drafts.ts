import {z} from 'zod';
import {RuleError} from './crm-errors';
import {recordBasis} from './record-conflicts';

// Incomplete dates and text belong in the private draft. The receipt action
// validates business dates and evidence only when its owner submits to CRM.
export const ReceiptDraftValuesSchema=z.object({
 mode:z.enum(['confirm','issue']),deliveredDate:z.string().max(100),
 receivedBy:z.string().max(4000),note:z.string().max(4000),
 message:z.string().max(4000),nextCheck:z.string().max(100)
}).strict();
export const ReceiptDraftEnvelopeSchema=z.object({
 values:ReceiptDraftValuesSchema,expectedContext:z.string().min(1).max(3000000),
 customerName:z.string().max(200).optional(),orderTitle:z.string().max(200).optional()
}).strict();
export type ReceiptDraftValues=z.infer<typeof ReceiptDraftValuesSchema>;
export type ReceiptDraftEnvelope=z.infer<typeof ReceiptDraftEnvelopeSchema>;

export function validateReceiptDraftConsumption(type:string,data:unknown,stored:unknown){
 const envelope=ReceiptDraftEnvelopeSchema.parse(stored),payload=z.record(z.unknown()).parse(data),v=envelope.values;
 if(type!==(v.mode==='confirm'?'receipt_confirm':'receipt_issue'))throw new RuleError('Leveransbeskedet ska använda samma val som ditt sparade privata utkast.');
 if(payload.expectedContext!==envelope.expectedContext)throw new RuleError('Granska aktuellt leveransunderlag och spara den valda versionen i ditt privata utkast först.');
 const keys=v.mode==='confirm'?['deliveredDate','receivedBy','note'] as const:['message','nextCheck'] as const;
 const saved=Object.fromEntries(keys.map(key=>[key,v[key]])),submitted=Object.fromEntries(keys.map(key=>[key,payload[key]]));
 if(recordBasis(saved)!==recordBasis(submitted))throw new RuleError('Spara dina ändringar i det privata utkastet först. CRM kan bara använda samma leveransbesked som den sparade utkastversionen.');
}
