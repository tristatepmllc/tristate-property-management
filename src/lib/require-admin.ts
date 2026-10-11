import { env } from 'cloudflare:workers';
import { getAuth } from './auth';
import { ensureAdminSchema, staffRoleOf, can, type StaffRole, type Perm } from './admin';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  staffRole: StaffRole;
  /** URL of the profile photo, or null. */
  avatar: string | null;
};

/**
 * Resolves the current session and returns its user only if role === 'admin'.
 * Returns null for: no session, session with role client/vendor, or a
 * session whose role changed since the cookie was issued - role is read
 * fresh from D1 on every call (see src/pages/api/me.ts for the same
 * pattern), never cached in the session token, so revoking admin access
 * takes effect on the very next request, no sign-out required.
 *
 * staffRole (super_admin/admin/editor) and the photo are read from D1 here too,
 * so a role change applies on the next request. Pass `perm` to also require
 * a permission (APIs do; pages check `can()` for what to show).
 *
 * Callers decide what "not admin" means for them: pages redirect,
 * API routes return 403.
 */
export async function requireAdmin(headers: Headers, perm?: Perm): Promise<AdminUser | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== 'admin') return null;

  let staffRole: StaffRole = 'admin';
  let avatar: string | null = null;
  try {
    await ensureAdminSchema(env.DB);
    const row = await env.DB.prepare(`SELECT role, staff_role, avatar_key, updated_at FROM accounts WHERE id = ?1`)
      .bind(user.id)
      .first<{ role: string; staff_role: string | null; avatar_key: string | null; updated_at: unknown }>();
    if (!row || row.role !== 'admin') return null;
    staffRole = staffRoleOf(row.staff_role);
    avatar = row.avatar_key ? `/api/avatar/${user.id}?v=${encodeURIComponent(row.avatar_key.split('/').pop() ?? '')}` : null;
  } catch (e) {
    console.error('require_admin_role_lookup_failed', String(e).slice(0, 200));
    staffRole = 'editor';
  }
  if (perm && !can(staffRole, perm)) return null;

  return { id: user.id, email: user.email, name: user.name, role: 'admin', staffRole, avatar };
}
