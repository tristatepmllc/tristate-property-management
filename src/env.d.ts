/// <reference types="astro/client" />

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  LEAD_NOTIFY_TO: string;
  LEAD_NOTIFY_FROM: string;
};

declare namespace App {
  interface Locals extends Runtime {}
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;
