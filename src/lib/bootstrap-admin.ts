/**
 * First owner admin account, created automatically the first time
 * /tspm-admin is opened - so the panel can be reached without anyone
 * running SQL by hand.
 *
 * Only the password HASH lives here (Better Auth's own format: scrypt
 * N=16384 r=16 p=1, 64-byte key, "hexSalt:hexKey" - see
 * @better-auth/utils/password). The plain password was handed to the owner
 * once, outside the repo. A strong random password + scrypt means the hash
 * is not usable even if this file is read.
 *
 * INSERT OR IGNORE on fixed ids: runs once, and never overwrites anything -
 * a password changed later under /admin/account stays changed, and if
 * this email already belongs to another account nothing is created.
 * Remove this file (and its call in tspm-admin.astro) once the team has
 * real staff accounts.
 */
export const BOOTSTRAP_ADMIN_EMAIL = 'admin@tristatepropertymanagementllc.com';
const ID = 'admin-tristate-owner';
const CRED_ID = 'cred-admin-tristate-owner';
const HASH = 'c46f5131a004b19b0bfec2b00d36ba7c:24d504d286e13530eee7efa2e9abc97d0ff1109eae7028401c7ef59e9831b358181590eb9cc4b4d7dc543ee7c6e96ceac457e45421aa18ea44d74508fbda5ad1';

let done = false;

export async function ensureBootstrapAdmin(db: D1Database): Promise<void> {
  if (done) return;
  const now = Date.now();
  await db
    .prepare(
      `INSERT OR IGNORE INTO accounts (id, email, name, role, email_verified, created_at, updated_at)
       VALUES (?1, ?2, 'Tristate Admin', 'admin', 1, ?3, ?3)`
    )
    .bind(ID, BOOTSTRAP_ADMIN_EMAIL, now)
    .run();
  const acc = await db.prepare(`SELECT role FROM accounts WHERE id = ?1`).bind(ID).first<{ role: string }>();
  if (acc?.role === 'admin') {
    await db
      .prepare(
        `INSERT OR IGNORE INTO auth_credentials (id, account_id, provider_id, provider_account_id, password, created_at, updated_at)
         VALUES (?1, ?2, 'credential', ?2, ?3, ?4, ?4)`
      )
      .bind(CRED_ID, ID, HASH, now)
      .run();
  }
  done = true;
}
