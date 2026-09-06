import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/auth';

export const prerender = false;

/**
 * Every Better Auth endpoint - /api/auth/sign-up/email, /sign-in/email,
 * /sign-out, /request-password-reset, /reset-password, /session, and so on -
 * lands here. Better Auth's handler dispatches on the request itself, so one
 * catch-all route covers all of them; there is nothing route-specific to add.
 */
export const ALL: APIRoute = ({ request }) => getAuth().handler(request);
