import { env } from 'cloudflare:workers';
export const database = () => { if (!env.DB) throw Error('Databasen är inte tillgänglig.'); return env.DB; };
export const bucket = () => { const value = (env as unknown as { BUCKET?: R2Bucket }).BUCKET; if (!value) throw Error('Fillagringen är inte tillgänglig.'); return value; };
export const runtimeSetting=(key:string)=>(env as unknown as Record<string,unknown>)[key];
