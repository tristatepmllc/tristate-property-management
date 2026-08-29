/// <reference types="astro/client" />

declare global {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    TURNSTILE_SECRET_KEY: string;
    RESEND_API_KEY: string;
    LEAD_NOTIFY_TO: string;
    LEAD_NOTIFY_FROM: string;
  }
}

export {};
