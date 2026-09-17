declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

declare namespace Cloudflare {
 interface Env {
  MS_TENANT_ID?:string;
  MS_CLIENT_ID?:string;
  MS_CLIENT_SECRET?:string;
  OUTLOOK_TOKEN_KEY?:string;
 }
}
