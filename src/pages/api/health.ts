import type { APIRoute } from 'astro';
import { json } from '../../lib/http';

export const prerender = false;

/** GET /api/health — deploy smoke test: is the Worker up and is D1 bound? */
export const GET: APIRoute = async ({ locals }) => {
  let db = 'unbound';
  try {
    await locals.runtime.env.DB.prepare('SELECT 1').first();
    db = 'ok';
  } catch (e) {
    db = `error: ${String(e).slice(0, 120)}`;
  }
  return json({ ok: true, db, ts: Date.now() });
};
