/**
 * Wires every [data-change-password-form] on the page (there's at most one
 * per DashboardLayout render, but this doesn't assume that) to Better
 * Auth's real POST /api/auth/change-password. Same posture as
 * scripts/job-detail.ts: fetch + inline status text, no framework.
 */
function statusEl(form: HTMLFormElement): HTMLElement | null {
  return form.querySelector('.form-status');
}
function say(form: HTMLFormElement, text: string): void {
  const el = statusEl(form);
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
}

function init(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('[data-change-password-form]');
  if (forms.length === 0) return;

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = (form.querySelector('#cp-current') as HTMLInputElement | null)?.value || '';
      const newPassword = (form.querySelector('#cp-new') as HTMLInputElement | null)?.value || '';
      const confirm = (form.querySelector('#cp-confirm') as HTMLInputElement | null)?.value || '';

      if (newPassword.length < 10) {
        say(form, 'New password needs to be at least 10 characters.');
        return;
      }
      if (newPassword !== confirm) {
        say(form, 'New password and confirmation do not match.');
        return;
      }

      say(form, 'Changing password…');
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
        });
        if (res.ok) {
          say(form, 'Password changed.');
          form.reset();
          return;
        }
        let message = 'Could not change your password. Check your current password and try again.';
        try {
          const data = (await res.json()) as { message?: string; code?: string };
          if (data.message) message = data.message;
        } catch {
          /* keep generic message */
        }
        say(form, message);
      } catch {
        say(form, 'Network problem. Please try again.');
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
