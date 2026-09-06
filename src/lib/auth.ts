import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { sendEmail, escapeHtml } from './email';
import { SITE } from '../data/site';

/**
 * Better Auth, backed by the same D1 database as everything else.
 *
 * `accounts` doubles as Better Auth's `user` table (see `user.modelName`
 * below) instead of a parallel `users` table - `accounts` was an unused
 * placeholder before this shipped, so there was nothing to migrate around.
 * Better Auth's own `account` model (password hashes, future OAuth tokens) is
 * named `auth_credentials` here, not `account`/`accounts`, because this
 * codebase already has a business-meaning `accounts` table and a second one
 * spelled almost the same is exactly the kind of thing nobody notices until
 * the wrong join runs. See db/schema.sql for the column-level mapping.
 *
 * Constructed lazily inside `getAuth()`, not at module scope. `env.DB` is a
 * live binding backed by AsyncLocalStorage in the `cloudflare:workers`
 * runtime - reading it only resolves correctly once a request is in flight,
 * which is why every other file in this codebase that touches `env` does so
 * inside a request handler (see src/pages/api/leads.ts). A module-level
 * `betterAuth({...})` call would try to read `env.DB` at cold-start, before
 * any request context exists. The instance is cached on first call and reused
 * for the life of the isolate - constructing it is not free, and D1 bindings
 * do not change between requests.
 */
let _auth: unknown;

/**
 * Kept as its own function (rather than inlined in `getAuth`) purely so
 * `ReturnType<typeof buildAuth>` names one exact, concrete instantiation of
 * Better Auth's generic `Auth<T>` type. Annotating the cache variable itself
 * as `ReturnType<typeof betterAuth>` - the same call, "typed" instead of
 * "run" - resolves to `Auth<BetterAuthOptions>`, the widest possible instance,
 * and assigning this config's narrower instance into it fails structurally
 * (TS reported it as `secret: string` vs `string | undefined`, which is not
 * the real bug - `BETTER_AUTH_SECRET` is a required Worker secret, always a
 * string at runtime - it is generic variance noise from comparing two
 * different instantiations of the same generic type).
 */
function buildAuth() {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    // SITE.url, not a second env var - it is already the one place the live
    // host is recorded (see astro.config.mjs and src/data/site.ts), and it
    // already gets flipped in one commit once the custom domain is attached.
    // A separate PUBLIC_SITE_URL here would be a second place that same edit
    // has to remember to touch.
    baseURL: SITE.url,
    basePath: '/api/auth',
    // Local wrangler dev ports are listed alongside SITE.url so `npm run
    // preview` can exercise sign-up/sign-in/sign-out end to end without a
    // deploy. This is a small, understood trade-off, not a security hole:
    // Better Auth's session cookies are scoped to the domain that actually
    // set them (production cookies never touch localhost, and a local
    // session cookie is useless against the live site), so trusting these
    // origins here does not let anyone act against the real deployment -
    // it only lets a local dev server talk to itself.
    trustedOrigins: [SITE.url, 'http://localhost:4321', 'http://localhost:8787', 'http://localhost:8788'],

    database: {
      db: new Kysely({ dialect: new D1Dialect({ database: env.DB }) }),
      type: 'sqlite',
    },

    user: {
      modelName: 'accounts',
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        // Never trust this from the client past sign-up. `input: true` lets
        // the sign-up form say "client" or "vendor"; the hook below is what
        // actually stops someone POSTing role: "admin" at /api/auth/sign-up.
        role: { type: 'string', required: false, defaultValue: 'client', input: true },
        company: { type: 'string', required: false, input: true },
        phone: { type: 'string', required: false, input: true },
      },
    },

    account: {
      modelName: 'auth_credentials',
      fields: {
        userId: 'account_id',
        providerId: 'provider_id',
        accountId: 'provider_account_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },

    session: {
      modelName: 'session',
      fields: {
        userId: 'account_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },

    verification: {
      modelName: 'verification',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },

    databaseHooks: {
      user: {
        create: {
          // Defence in depth on top of `input: true` above: even a hand-built
          // request to /api/auth/sign-up/email cannot mint an admin account.
          // Admin is granted with a direct UPDATE once there is a staff UI to
          // do it from - see the note on `role` in db/schema.sql.
          before: async (user) => {
            const role = (user as { role?: unknown }).role;
            const safe = role === 'vendor' ? 'vendor' : 'client';
            return { data: { ...user, role: safe } };
          },
        },
      },
    },

    emailAndPassword: {
      enabled: true,
      // Off for now: the sending domain behind LEAD_NOTIFY_FROM has not been
      // confirmed live (see the NAP/email TODO in src/data/site.ts), and a
      // portal that requires a verification email nobody can receive is worse
      // than one that does not ask for it yet. Turn on once that inbox is
      // real - see "Blockers before going live" in README.
      requireEmailVerification: false,
      minPasswordLength: 10,
      sendResetPassword: async ({ user, url }) => {
        if (!env.RESEND_API_KEY) {
          // No key configured locally - surface the link instead of losing it
          // silently, same posture as the lead-notify skip in api/leads.ts.
          console.warn('reset_email_skipped', { email: user.email, url });
          return;
        }
        const sent = await sendEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.LEAD_NOTIFY_FROM,
          to: user.email,
          subject: 'Reset your Tristate Property Management password',
          html: `<p style="font-family:Arial">Reset your password by opening this link. It expires in one hour and works once.</p>
                 <p style="font-family:Arial"><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
                 <p style="font-family:Arial;color:#8798AC;font-size:12px">Did not request this? Ignore this email - your password has not changed.</p>`,
        });
        if (!sent.ok) console.error('reset_email_failed', { email: user.email, error: sent.error });
      },
    },

    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
        // Kysely's generic SqliteIntrospector - used by kysely-d1, which has
        // no D1-specific one - queries sqlite_master directly to confirm
        // every table exists before the first request. D1 answers that
        // query with "not authorized: SQLITE_AUTH": its sandboxed SQLite
        // blocks that class of introspection query outright, startup schema
        // validation or not. GET /api/health already does the real version
        // of this check (see src/pages/api/health.ts) with a query D1 does
        // allow, so nothing is actually going unverified by turning this off.
        validateSchema: false,
      },
    },

    plugins: [bearer()],
  });
}

export function getAuth(): ReturnType<typeof buildAuth> {
  _auth ??= buildAuth();
  return _auth as ReturnType<typeof buildAuth>;
}
