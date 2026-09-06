import type { APIRoute } from 'astro';
import { getAuth } from '../../lib/auth';
import { json } from '../../lib/http';

export const prerender = false;

/**
 * GET /api/me - current account profile.
 * httpOnly session cookie on web; the future mobile app sends
 * `Authorization: Bearer <token>` instead - both are read by
 * `auth.api.getSession`, via the `bearer()` plugin in src/lib/auth.ts.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const { id, email, name, role, company, phone, createdAt } = session.user as typeof session.user & {
    role: string;
    company: string | null;
    phone: string | null;
  };

  return json({ id, email, name, role, company, phone, createdAt });
};
