import {AccessError, type Member} from '@/lib/crm-auth';
import {database} from '@/lib/crm-db';
import {
  createPrivateDraftCopy,
  PRIVATE_DRAFT_COPY_MAX_FILE_BYTES,
  PRIVATE_DRAFT_COPY_MAX_RECORDS,
  PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES,
  PrivateDraftCopyError,
  type PrivateDraftCopyRecord,
  type PrivateDraftCopySpace,
} from '@/lib/private-draft-copy';

const headers = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'};
const reply = (error: string, status: number) => Response.json({error}, {status, headers});
const fail = (error: unknown) => error instanceof AccessError
  ? reply(error.message, error.status)
  : error instanceof PrivateDraftCopyError && error.reason === 'too-large'
    ? reply(error.message, 413)
    : reply('Din privata utkastkopia kunde inte skapas. Ingen ofullständig kopia lämnas ut.', 503);

async function currentExportMember(initial: Member) {
  // Recheck the original membership without bootstrapping or rebinding an account.
  const current = await database().prepare('SELECT * FROM crm_members WHERE id=?').bind(initial.id).first<Member>();
  if (current?.active !== 1 || current.id !== initial.id || current.user_id !== initial.user_id || current.email !== initial.email || current.role !== initial.role || current.owner !== initial.owner || !['admin', 'seller'].includes(current.role)) {
    throw new AccessError('Behörigheten till dina privata utkast har ändrats. Läs in sidan och försök igen.');
  }
}

async function initialExportMember(req: Request): Promise<Member> {
  const userId = req.headers.get('oai-authenticated-user-id');
  const email = req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (!userId || !email) throw new AccessError('Logga in för att öppna CRM-arbetsytan.', 401);
  // Unlike member(), this download must never bootstrap or bind an account.
  const current = await database().prepare('SELECT * FROM crm_members WHERE email=?').bind(email).first<Member>();
  if (current?.active !== 1 || current.user_id !== userId) throw new AccessError('Öppna CRM med ditt eget konto och kontrollera att du har en aktiv CRM-roll.');
  if (!['admin', 'seller'].includes(current.role)) throw new AccessError('Privata utkast används av säljteamet.');
  return current;
}

type SnapshotRow = {
  record_count: number; source_bytes: number; invalid_count: number; present: number;
  id: string | null; kind: string | null; context: string | null; revision: number | null;
  requestId: string | null; title: string | null; dataRaw: string | null; archived: number | null; updatedAt: string | null;
};
const recordFields = ['id', 'kind', 'context', 'revision', 'requestId', 'title', 'dataRaw', 'archived', 'updatedAt'] as const;
const stringFields = ['id', 'kind', 'context', 'requestId', 'title', 'dataRaw', 'updatedAt'] as const;
// One SQL read snapshots every owned row, including archives. D1 limits a single
// string/cell to 2 MB, so do not aggregate raw drafts into a large JSON value.
// Six UTF-8 bytes per source byte safely bounds JSON string escaping. 256 bytes
// per record covers JSON keys, punctuation, booleans and a safe-integer revision.
// This deliberately conservative 8 MB guard can reject a smaller exact file.
// The guarded join yields no private rows when over budget. Never use LIMIT.
const snapshotSQL = `WITH own AS MATERIALIZED (
  SELECT id,kind,context,revision,request_id,title,data,archived,updated_at
  FROM crm_drafts WHERE space=? AND user_id=?
), budget AS (
  SELECT COUNT(*) AS record_count,
    COALESCE(SUM(6*(length(CAST(id AS BLOB))+length(CAST(kind AS BLOB))+length(CAST(context AS BLOB))+
      length(CAST(request_id AS BLOB))+length(CAST(title AS BLOB))+length(CAST(data AS BLOB))+
      length(CAST(updated_at AS BLOB)))+256),0)+2+CASE WHEN COUNT(*)>0 THEN COUNT(*)-1 ELSE 0 END AS source_bytes,
    COALESCE(SUM(CASE WHEN typeof(id)='text' AND length(CAST(id AS BLOB))>0
      AND typeof(kind)='text' AND typeof(context)='text'
      AND typeof(revision)='integer' AND revision BETWEEN 0 AND 9007199254740991
      AND typeof(request_id)='text' AND typeof(title)='text' AND typeof(data)='text'
      AND typeof(archived)='integer' AND archived IN (0,1) AND typeof(updated_at)='text'
      THEN 0 ELSE 1 END),0) AS invalid_count FROM own
)
SELECT budget.record_count,budget.source_bytes,budget.invalid_count,
  CASE WHEN own.id IS NULL THEN 0 ELSE 1 END AS present,
  own.id,own.kind,own.context,own.revision,own.request_id AS requestId,
  own.title,own.data AS dataRaw,own.archived,own.updated_at AS updatedAt
FROM budget LEFT JOIN own ON budget.record_count<=? AND budget.source_bytes<=? AND budget.invalid_count=0
ORDER BY own.updated_at DESC,own.id ASC`;

function readSnapshot(rows: SnapshotRow[]): PrivateDraftCopyRecord[] {
  const value = rows[0];
  if (!value || !Number.isSafeInteger(value.record_count) || value.record_count < 0 || !Number.isSafeInteger(value.source_bytes) || value.source_bytes < 2 || !Number.isSafeInteger(value.invalid_count) || value.invalid_count < 0 || value.invalid_count > value.record_count) throw Error('Invalid snapshot budget.');
  if (rows.some(row => row.record_count !== value.record_count || row.source_bytes !== value.source_bytes || row.invalid_count !== value.invalid_count)) throw Error('Inconsistent snapshot budget.');
  if (value.record_count > PRIVATE_DRAFT_COPY_MAX_RECORDS || value.source_bytes > PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES) throw new PrivateDraftCopyError('Kopian är för stor. Ingen ofullständig kopia skapas.', 'too-large');
  if (value.invalid_count !== 0) throw Error('Invalid snapshot metadata.');
  if (value.record_count === 0) {
    if (rows.length !== 1 || value.present !== 0 || value.source_bytes !== 2 || recordFields.some(key => !Object.hasOwn(value, key) || value[key] !== null)) throw Error('Invalid empty snapshot.');
    return [];
  }
  if (rows.length !== value.record_count || rows.some(row => row.present !== 1 || (row.archived !== 0 && row.archived !== 1) || recordFields.some(key => !Object.hasOwn(row, key)) || stringFields.some(key => typeof row[key] !== 'string'))) throw Error('Incomplete snapshot.');
  const encoder = new TextEncoder();
  const expectedBound = rows.reduce((total, row) => total + 256 + 6 * stringFields.reduce((sum, key) => sum + encoder.encode(row[key]!).byteLength, 0), 2 + rows.length - 1);
  if (value.source_bytes !== expectedBound) throw Error('Invalid snapshot byte budget.');
  const records = rows.map(row => ({
    id: row.id, kind: row.kind, context: row.context, revision: row.revision,
    requestId: row.requestId, title: row.title, dataRaw: row.dataRaw,
    archived: row.archived === 1, updatedAt: row.updatedAt,
  })) as PrivateDraftCopyRecord[];
  if (encoder.encode(JSON.stringify(records)).byteLength > value.source_bytes) throw Error('Invalid snapshot byte budget.');
  // The shared creator checks exact keys, types, duplicate IDs and exact bytes.
  return records;
}

export async function GET(req: Request) {
  let initial: Member | undefined;
  try {
    initial = await initialExportMember(req);
    const value = new URL(req.url).searchParams.get('space');
    if (value !== 'demo' && value !== 'live') throw new AccessError('Välj en giltig CRM-arbetsyta.', 400);
    const space: PrivateDraftCopySpace = value;
    await currentExportMember(initial);
    const snapshot = await database().prepare(snapshotSQL).bind(space, initial.user_id!, PRIVATE_DRAFT_COPY_MAX_RECORDS, PRIVATE_DRAFT_COPY_MAX_SOURCE_BYTES).all<SnapshotRow>();
    await currentExportMember(initial);
    if (!snapshot.success || !Array.isArray(snapshot.results)) throw Error('Incomplete snapshot query.');
    const copy = await createPrivateDraftCopy({ownerUserId: initial.user_id!, space, records: readSnapshot(snapshot.results)});
    const body = JSON.stringify(copy);
    if (new TextEncoder().encode(body).byteLength > PRIVATE_DRAFT_COPY_MAX_FILE_BYTES) throw new PrivateDraftCopyError('Kopian är för stor. Ingen ofullständig kopia skapas.', 'too-large');
    await currentExportMember(initial);
    return new Response(body, {headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="magnussons-privata-utkast-' + space + '.json"',
    }});
  } catch (error) {
    // A revoked actor receives no records, even when another error was detected.
    if (initial) try { await currentExportMember(initial); } catch (access) { return fail(access); }
    return fail(error);
  }
}
