import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../lib/http';

export const prerender = false;

/** Tables the site cannot function without. */
const REQUIRED = ['leads', 'vendors', 'offers', 'accounts', 'jobs', 'cashback_ledger'] as const;

/**
 * GET /api/health - deploy smoke test.
 *
 * This used to be `SELECT 1` and nothing else. `SELECT 1` succeeds against an
 * EMPTY database, so production reported `{"ok":true,"db":"ok"}` for weeks while
 * db/schema.sql had never been applied to the remote D1 and every real query -
 * every form POST, every /api/offers read - returned 500. A smoke test that
 * cannot fail is not a smoke test.
 *
 * It now checks connectivity AND schema, and returns 503 when either is wrong,
 * so an uptime monitor pointed here actually catches it.
 */
export const GET: APIRoute = async () => {
  let connection = 'ok';
  let missing: string[] = [];

  try {
    // One query, not one per table: sqlite_master is the schema catalogue.
    const rows = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table'`
    ).all<{ name: string }>();
    const present = new Set((rows.results ?? []).map((r) => r.name));
    missing = REQUIRED.filter((t) => !present.has(t));
  } catch (e) {
    connection = `error: ${String(e).slice(0, 160)}`;
  }

  const ok = connection === 'ok' && missing.length === 0;
  const db = connection !== 'ok' ? 'unreachable' : missing.length ? 'schema_incomplete' : 'ok';

  return json(
    {
      ok,
      db,
      connection,
      ...(missing.length ? { missing, fix: 'npm run db:remote' } : {}),
      ts: Date.now(),
    },
    ok ? 200 : 503
  );
};
