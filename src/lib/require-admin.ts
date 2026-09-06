import { getAuth } from './auth';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin';
};

/**
 * Resolves the current session and returns its user only if role === 'admin'.
 * Returns null for: no session, session with role client/vendor, or a
 * session whose role changed since the cookie was issued - role is read
 * fresh from D1 on every call (see src/pages/api/me.ts for the same
 * pattern), never cached in the session token, so revoking admin access
 * takes effect on the very next request, no sign-out required.
 *
 * Callers decide what "not admin" means for them: pages redirect to
 * /portal/, API routes return 403. Kept separate from getAuth() itself so
 * that distinction stays at the call site instead of being baked in here.
 */
export async function requireAdmin(headers: Headers): Promise<AdminUser | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== 'admin') return null;

  return { id: user.id, email: user.email, name: user.name, role: 'admin' };
}
