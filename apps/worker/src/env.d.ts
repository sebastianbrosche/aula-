interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  KV: KVNamespace;
  DEMO_LOGIN?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}
