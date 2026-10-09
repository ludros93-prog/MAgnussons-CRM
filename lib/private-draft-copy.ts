export const PRIVATE_DRAFT_COPY_FORMAT = 'magnussons-private-drafts-1' as const;
export const PRIVATE_DRAFT_COPY_MAX_RECORDS = 1000;
export const PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES = 8_000_000;
export const PRIVATE_DRAFT_COPY_MAX_FILE_BYTES = 32_000_000;

export type PrivateDraftCopySpace = 'demo' | 'live';
export type PrivateDraftCopyRecord = {
  id: string;
  kind: string;
  context: string;
  revision: number;
  requestId: string;
  title: string;
  dataRaw: string;
  archived: boolean;
  updatedAt: string;
};
export type PrivateDraftCopy = {
  format: typeof PRIVATE_DRAFT_COPY_FORMAT;
  exportedAt: string;
  ownerUserId: string;
  space: PrivateDraftCopySpace;
  records: PrivateDraftCopyRecord[];
  integrity: {recordCount: number; sha256: string};
};
export type PrivateDraftCopyScope = {ownerUserId: string; space: PrivateDraftCopySpace};
export class PrivateDraftCopyError extends Error {
  constructor(message: string, public reason: 'invalid' | 'too-large' | 'integrity' | 'scope' = 'invalid') {
    super(message);
  }
}

const encoder = new TextEncoder();
const invalid = () => new PrivateDraftCopyError('Filen är inte en giltig privat utkastkopia.');
const tooLarge = () => new PrivateDraftCopyError('Kopian är för stor. Ingen ofullständig kopia skapas.', 'too-large');
const object = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw invalid();
  return value as Record<string, unknown>;
};
const nonemptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const space = (value: unknown): value is PrivateDraftCopySpace => value === 'demo' || value === 'live';
const safeCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const canonicalDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};
const recordKeys = ['id', 'kind', 'context', 'revision', 'requestId', 'title', 'dataRaw', 'archived', 'updatedAt'] as const;

/** Raw draft envelopes remain strings: this format never invokes a draft parser. */
function validateRecords(value: unknown): PrivateDraftCopyRecord[] {
  if (!Array.isArray(value)) throw invalid();
  if (value.length > PRIVATE_DRAFT_COPY_MAX_RECORDS) throw tooLarge();
  const ids = new Set<string>();
  for (const item of value) {
    const record = object(item, recordKeys);
    if (!nonemptyString(record.id) || !safeCount(record.revision) || typeof record.archived !== 'boolean') throw invalid();
    for (const key of ['kind', 'context', 'requestId', 'title', 'dataRaw', 'updatedAt'] as const) {
      if (typeof record[key] !== 'string') throw invalid();
    }
    if (ids.has(record.id)) throw invalid();
    ids.add(record.id);
  }
  // Include all raw text, metadata, field names, JSON escaping and separators.
  if (encoder.encode(JSON.stringify(value)).byteLength > PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES) throw tooLarge();
  return value as PrivateDraftCopyRecord[];
}

/** Validate structure and budgets without changing raw values or property order. */
export function validatePrivateDraftCopy(value: unknown, expected?: PrivateDraftCopyScope): PrivateDraftCopy {
  const copy = object(value, ['format', 'exportedAt', 'ownerUserId', 'space', 'records', 'integrity']);
  if (copy.format !== PRIVATE_DRAFT_COPY_FORMAT || !canonicalDate(copy.exportedAt) || !nonemptyString(copy.ownerUserId) || !space(copy.space)) throw invalid();
  const records = validateRecords(copy.records);
  const integrity = object(copy.integrity, ['recordCount', 'sha256']);
  if (!safeCount(integrity.recordCount) || integrity.recordCount !== records.length || typeof integrity.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(integrity.sha256)) throw invalid();
  if (expected && (!nonemptyString(expected.ownerUserId) || !space(expected.space) || copy.ownerUserId !== expected.ownerUserId || copy.space !== expected.space)) {
    throw new PrivateDraftCopyError('Kopian tillhör en annan användare eller arbetsyta.', 'scope');
  }
  if (encoder.encode(JSON.stringify(value)).byteLength > PRIVATE_DRAFT_COPY_MAX_FILE_BYTES) throw tooLarge();
  return value as PrivateDraftCopy;
}

async function digest(records: PrivateDraftCopyRecord[]): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(records)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Integrity detects corruption, not authorship or permission to write to CRM. */
export async function verifyPrivateDraftCopy(value: unknown, expected?: PrivateDraftCopyScope): Promise<PrivateDraftCopy> {
  const checked = validatePrivateDraftCopy(value, expected);
  // Freeze the checked input across the asynchronous digest operation.
  const copy = JSON.parse(JSON.stringify(checked)) as PrivateDraftCopy;
  if (await digest(copy.records) !== copy.integrity.sha256) {
    throw new PrivateDraftCopyError('Kopians kontrollsumma stämmer inte. Välj en oförändrad kopia.', 'integrity');
  }
  return copy;
}

export async function parsePrivateDraftCopy(raw: string, expected?: PrivateDraftCopyScope): Promise<PrivateDraftCopy> {
  if (typeof raw !== 'string') throw invalid();
  if (raw.length > PRIVATE_DRAFT_COPY_MAX_FILE_BYTES || encoder.encode(raw).byteLength > PRIVATE_DRAFT_COPY_MAX_FILE_BYTES) throw tooLarge();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw invalid(); }
  return verifyPrivateDraftCopy(value, expected);
}

export async function createPrivateDraftCopy(input: PrivateDraftCopyScope & {records: readonly PrivateDraftCopyRecord[]; exportedAt?: string}): Promise<PrivateDraftCopy> {
  // Validate before copying so that missing or unexpected metadata fails closed.
  const records = validateRecords(input.records).map(record => ({...record}));
  const copy: PrivateDraftCopy = {
    format: PRIVATE_DRAFT_COPY_FORMAT,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    ownerUserId: input.ownerUserId,
    space: input.space,
    records,
    integrity: {recordCount: records.length, sha256: '0'.repeat(64)},
  };
  validatePrivateDraftCopy(copy);
  copy.integrity.sha256 = await digest(records);
  return copy;
}
