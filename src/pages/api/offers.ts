import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../lib/http';

export const prerender = false;

/** GET /api/offers — public promos. Consumed by the website and the future mobile app. */
export const GET: APIRoute = async () => {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, code, starts_at, ends_at
       FROM offers
      WHERE active = 1 AND is_public = 1
        AND (starts_at IS NULL OR starts_at <= ?1)
        AND (ends_at   IS NULL OR ends_at   >= ?1)
      ORDER BY created_at DESC LIMIT 20`
  ).bind(now).all();

  return json({ offers: results }, 200, { 'cache-control': 'public, max-age=300' });
};

export const ALL: APIRoute = () => methodNotAllowed('GET');
