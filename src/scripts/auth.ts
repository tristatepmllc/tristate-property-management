/**
 * Wires the four /portal/ forms straight to Better Auth's REST endpoints with
 * plain `fetch`, no `better-auth/client` package. That client is built for
 * React/Vue/Svelte state binding; this is a handful of plain forms on one
 * page, and pulling in a reactive-store dependency for four POSTs would be
 * the same mistake `is:inline` scripts were - extra weight this template
 * does not use.
 *
 * Every call is same-origin JSON, so Better Auth's own origin check
 * (`trustedOrigins` in src/lib/auth.ts) and Astro's `security.checkOrigin`
 * (which only inspects form-encoded/multipart bodies) both pass without
 * special-casing anything - the same reasoning src/scripts/lead-form.ts
 * documents for why leads are posted as JSON.
 */

type AuthError = { error?: { message?: string } } | { message?: string };

function statusEl(form: HTMLFormElement): HTMLElement | null {
  return form.querySelector('.form-status');
}

function say(form: HTMLFormElement, text: string): void {
  const el = statusEl(form);
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
}

async function post(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    let message = 'Something went wrong. Please try again.';
    try {
      const data = (await res.json()) as AuthError;
      message = ('error' in data && data.error?.message) || ('message' in data && data.message) || message;
    } catch {
      /* non-JSON error body - keep the generic message */
    }
    return { ok: false, message };
  } catch {
    return { ok: false, message: 'Network problem. Please try again, or call us instead.' };
  }
}

/**
 * PATCH /api/me, not /api/auth/* - a different endpoint (src/pages/api/me.ts)
 * from everything else in this file, so it gets its own small helper rather
 * than being forced through `post()`'s Better-Auth-shaped error parsing.
 */
async function patchProfile(body: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    let message = 'Could not save your profile. Please try again.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error === 'no_fields') message = 'Nothing changed.';
    } catch {
      /* non-JSON error body - keep the generic message */
    }
    return { ok: false, message };
  } catch {
    return { ok: false, message: 'Network problem. Please try again, or call us instead.' };
  }
}

function withBusyButton(form: HTMLFormElement, run: () => Promise<void>): void {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const label = button?.textContent ?? '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Working\u2026';
    }
    try {
      await run();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });
}

function init(): void {
  const signIn = document.querySelector<HTMLFormElement>('[data-signin-form]');
  const signUp = document.querySelector<HTMLFormElement>('[data-signup-form]');
  const forgot = document.querySelector<HTMLFormElement>('[data-forgot-form]');
  const forgotToggle = document.querySelector<HTMLButtonElement>('[data-forgot-toggle]');
  const reset = document.querySelector<HTMLFormElement>('[data-reset-form]');
  const logout = document.querySelector<HTMLFormElement>('[data-logout-form]');
  const profile = document.querySelector<HTMLFormElement>('[data-profile-form]');

  forgotToggle?.addEventListener('click', () => {
    if (!signIn || !forgot) return;
    signIn.hidden = true;
    forgot.hidden = false;
  });

  if (signIn) {
    withBusyButton(signIn, async () => {
      const fd = new FormData(signIn);
      const result = await post('/sign-in/email', {
        email: String(fd.get('email') ?? ''),
        password: String(fd.get('password') ?? ''),
      });
      if (result.ok) {
        location.reload();
      } else {
        say(signIn, result.message ?? 'Could not sign in.');
      }
    });
  }

  if (signUp) {
    withBusyButton(signUp, async () => {
      const fd = new FormData(signUp);
      const result = await post('/sign-up/email', {
        name: String(fd.get('name') ?? ''),
        email: String(fd.get('email') ?? ''),
        password: String(fd.get('password') ?? ''),
        role: String(fd.get('role') ?? 'client'),
      });
      if (result.ok) {
        location.reload();
      } else {
        say(signUp, result.message ?? 'Could not create the account.');
      }
    });
  }

  if (forgot) {
    withBusyButton(forgot, async () => {
      const fd = new FormData(forgot);
      const result = await post('/request-password-reset', {
        email: String(fd.get('email') ?? ''),
        redirectTo: `${location.origin}/portal/`,
      });
      // Always the same message, success or failure: confirming which emails
      // exist in the system is an account-enumeration leak, and Better Auth's
      // own response does not distinguish either.
      say(forgot, result.ok || result.message === 'Something went wrong. Please try again.'
        ? 'If that email has an account, a reset link is on its way.'
        : (result.message ?? 'If that email has an account, a reset link is on its way.'));
    });
  }

  if (reset) {
    withBusyButton(reset, async () => {
      const fd = new FormData(reset);
      const result = await post('/reset-password', {
        token: String(fd.get('token') ?? ''),
        newPassword: String(fd.get('password') ?? ''),
      });
      if (result.ok) {
        say(reset, 'Password set. Redirecting to sign in\u2026');
        setTimeout(() => { location.href = '/portal/'; }, 1200);
      } else {
        say(reset, result.message ?? 'That reset link is invalid or has expired.');
      }
    });
  }

  logout?.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Better Auth requires `Content-Type: application/json` even on a POST
    // with no body - omitting it, as a bare `fetch(url, {method:'POST'})`
    // does, gets a 415 from Better Auth itself (confirmed with curl before
    // this shipped: a request with no Content-Type at all is rejected here,
    // distinct from Astro's own checkOrigin, which is what a *missing Origin
    // header* would trip - a real browser fetch always sends Origin, so only
    // this header was actually missing).
    // Better Auth requires `Content-Type: application/json` AND a parseable
    // JSON body even on an endpoint that takes no parameters - an empty body
    // with the header present still 400s with "Invalid JSON in request
    // body". `{}` satisfies the parser; confirmed with curl before this
    // shipped, same session as the Content-Type fix above.
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    location.href = '/portal/';
  });

  if (profile) {
    withBusyButton(profile, async () => {
      const fd = new FormData(profile);
      const body: Record<string, unknown> = {};
      for (const [key, value] of fd.entries()) {
        // Checkboxes handled explicitly below - FormData silently omits an
        // unchecked box's key entirely rather than sending false, which
        // would make "uncheck this" a no-op server-side (api/me.ts only
        // updates a field when its key is present in the request body).
        if (key === 'insuranceOnFile' || key === 'emergencyAvailable') continue;
        body[key] = value;
      }
      const insurance = profile.querySelector<HTMLInputElement>('[name="insuranceOnFile"]');
      if (insurance) body.insuranceOnFile = insurance.checked;
      const emergency = profile.querySelector<HTMLInputElement>('[name="emergencyAvailable"]');
      if (emergency) body.emergencyAvailable = emergency.checked;

      const result = await patchProfile(body);
      say(profile, result.ok ? 'Saved.' : (result.message ?? 'Could not save your profile.'));
    });
  }
}

init();

export {};
