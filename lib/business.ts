import { z } from 'zod';

const text = z.string().trim().max(4000);
const required = text.min(1, 'Fyll i obligatoriska uppgifter.');
export const validDate = z.string().refine(v => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v), 'Välj ett giltigt datum.');
const amount = z.number().finite().min(0).max(1e9);
export const AddressSchema = z.object({ street: text.default(''), postalCode: text.default(''), city: text.default(''), country: text.default('Sverige'), reference: text.default('') });
export const SiteSchema = z.object({ id: text.default(''), name: required, address: AddressSchema.default({}), contact: text.default('') });
export const NeedSchema = z.object({ id: text.default(''), title: required.max(200), category: text.default(''), due: validDate.refine(Boolean, 'Ange när kunden behöver leveransen.'), leadDays: z.number().int().min(0).max(730).default(30), owner: required, intervalMonths: z.number().int().min(0).max(36).default(0), notes: text.default(''), status: z.enum(['planned','done','cancelled']).default('planned'), completedAt: text.default(''), dealId: text.default('') });
export const VariantFields = {variantId:text.max(200).default(''),color:text.max(200).default(''),size:text.max(100).default(''),unit:text.max(30).default('st')};
export const LineSchema = z.object({ id: text.default(''), sourceId:text.default(''),productUrl:z.string().max(2000).default(''),kind: z.enum(['product','marking','setup','freight','other']).default('product'), description: required.max(300), article: text.default(''), variant: text.default(''), ...VariantFields, quantity: z.number().finite().positive().max(1e6), unitPrice: amount, unitCost: amount.nullable().default(null) });
export const variantLabel=(line:{variant?:string;color?:string;size?:string})=>[line.color,line.size,line.variant].filter(Boolean).join(' · ');
export const ProductSchema = z.object({ ...VariantFields, id: text.default(''), description: required.max(300), article: text.default(''), variant: text.default(''), marking: text.default(''), notes: text.default('') });
export const QuoteSnapshotSchema = z.object({ version: z.number().int(), at: text, reference: text, lines: z.array(LineSchema), value: amount.nullable(), cost: amount.nullable(), deliveryDate: validDate, proofDeadline: validDate, orderDeadline: validDate });
export const GoalSchema = z.object({ revenue: amount.nullable().default(null), grossProfit: amount.nullable().default(null), qualified: z.number().int().min(0).max(10000).nullable().default(null) });
export type Need = z.infer<typeof NeedSchema>;
export type QuoteLine = z.infer<typeof LineSchema>;
export type Product = z.infer<typeof ProductSchema>;
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function calculateQuote(lines: QuoteLine[]) {
  return { value: roundMoney(lines.reduce((sum, l) => sum + roundMoney(l.quantity * l.unitPrice), 0)), cost: lines.some(l => l.unitCost === null) ? null : roundMoney(lines.reduce((sum, l) => sum + roundMoney(l.quantity * l.unitCost!), 0)) };
}
export function addMonths(date: string, months: number) {
  const d = new Date(date + 'T12:00:00Z'), original = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(original, last)); return d.toISOString().slice(0, 10);
}
export function parseCSV(raw: string): string[][] {
  const first = raw.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
  const separator = first.includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  const input = raw.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === separator && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw Error('CSV-filen har ett citattecken som inte avslutas.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export const OrderRevisionSchema=z.object({id:required,snapshot:QuoteSnapshotSchema,reason:required,customerApprovedBy:text,customerApprovedOn:validDate,recordedAt:required,recordedBy:text,historical:z.boolean().default(false)});
export const PendingAmendmentSchema=z.object({id:required,snapshot:QuoteSnapshotSchema,reason:required,createdAt:required,createdBy:required});
