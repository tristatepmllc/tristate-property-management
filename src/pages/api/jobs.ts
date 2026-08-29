import type { APIRoute } from 'astro';
import { json } from '../../lib/http';

export const prerender = false;

/**
 * GET /api/jobs - service history for the signed-in account
 * PHASE 4 STUB - wire up once Better Auth is added.
 * Auth strategy: httpOnly session cookie on web, Bearer access token on mobile.
 */
export const GET: APIRoute = async () => json({ error: 'not_implemented' }, 501);
