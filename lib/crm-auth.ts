import type {Role} from './operations';
import { database,runtimeSetting } from './crm-db';
import {z} from 'zod';
export class AccessError extends Error { constructor(message: string, public status = 403) { super(message); } }
export type Member = { id: string; email: string; name: string; role:Role; owner: string; active: number; user_id: string|null };
function initial(){const raw=runtimeSetting('CRM_BOOTSTRAP_ADMINS');const rows=z.array(z.object({email:z.string().email(),name:z.string().min(1).max(150),owner:z.string().max(150).default('')})).max(10).parse(raw?JSON.parse(String(raw)):[]);return new Map(rows.map(v=>[v.email.toLowerCase(),v]));}
export async function member(req: Request, write = false, admin = false): Promise<Member> {
  const userId = req.headers.get('oai-authenticated-user-id'), email = req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (!userId || !email) throw new AccessError('Logga in för att öppna CRM-arbetsytan.',401);
  const db = database();
  let row = await db.prepare('SELECT * FROM crm_members WHERE email=?').bind(email).first<Member>();
  if(!row){const bootstrap=initial().get(email);if(bootstrap){await db.prepare('INSERT OR IGNORE INTO crm_members(id,email,name,role,owner,active) VALUES(?,?,?,?,?,1)').bind(crypto.randomUUID(),email,bootstrap.name,'admin',bootstrap.owner).run();row=await db.prepare('SELECT * FROM crm_members WHERE email=?').bind(email).first<Member>();}}
  if (!row || !row.active || (row.user_id && row.user_id !== userId)) throw new AccessError('Ditt konto har inte tilldelats en CRM-roll. Be Sebastian lägga till dig i teamet.');
  if (!row.user_id) { await db.prepare('UPDATE crm_members SET user_id=? WHERE id=? AND user_id IS NULL').bind(userId,row.id).run(); row = await db.prepare('SELECT * FROM crm_members WHERE id=?').bind(row.id).first<Member>(); }
  if (!row || row.user_id !== userId || !row.active) throw new AccessError('Kontot kunde inte kopplas. Kontakta ansvarig.');
  if ((write && row.role === 'reader') || (admin && row.role !== 'admin')) throw new AccessError(admin ? 'Endast administratörer får ändra detta.' : 'Ditt konto har läsbehörighet.');
  return row;
}
export const viewer = (m: Member) => ({id:m.user_id!, email:m.email,name:m.name,role:m.role,owner:m.owner});
export const sameOrigin = (req: Request) => { const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin) throw new AccessError('Ogiltigt ursprung.'); };
