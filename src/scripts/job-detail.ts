/**
 * Wires the three forms on /portal/jobs/[id] to their JSON APIs with plain
 * fetch - same posture as scripts/auth.ts: this is a handful of forms on
 * one page, not a reason to pull in a client-side framework. On success,
 * every handler reloads the page rather than patching the DOM in place -
 * the page is SSR and already knows how to render every state (pending vs
 * accepted vs declined, document list with/without rows); re-requesting it
 * is simpler and less error-prone than duplicating that rendering logic in
 * JS for a page that isn't clicked through often enough for a reload to
 * matter.
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

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    let message = 'Something went wrong. Please try again.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error.replace(/_/g, ' ');
    } catch {
      /* non-JSON error body - keep the generic message */
    }
    return { ok: false, message };
  } catch {
    return { ok: false, message: 'Network problem. Please try again.' };
  }
}

function initRespondForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-job-respond-form]');
  if (!form) return;
  const jobId = form.dataset.jobId;
  if (!jobId) return;

  let lastAction: 'accept' | 'decline' = 'accept';
  form.querySelectorAll<HTMLButtonElement>('[data-respond-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lastAction = btn.dataset.respondAction === 'decline' ? 'decline' : 'accept';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = ((form.querySelector('#jr-reason') as HTMLTextAreaElement | null)?.value || '').trim();
    if (lastAction === 'decline' && !reason) {
      say(form, 'Add a reason before declining.');
      return;
    }
    say(form, lastAction === 'accept' ? 'Accepting…' : 'Declining…');
    const result = await postJson(`/api/portal/jobs/${jobId}/respond`, {
      action: lastAction,
      reason: lastAction === 'decline' ? reason : undefined,
    });
    if (result.ok) {
      location.reload();
    } else {
      say(form, result.message || 'Could not submit your response.');
    }
  });
}

function initStatusForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-job-status-form]');
  if (!form) return;
  const jobId = form.dataset.jobId;
  if (!jobId) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = (form.querySelector('#js-status') as HTMLSelectElement | null)?.value;
    if (!status) return;
    say(form, 'Updating…');
    const result = await postJson(`/api/portal/jobs/${jobId}/status`, { status });
    if (result.ok) {
      location.reload();
    } else {
      say(form, result.message || 'Could not update status.');
    }
  });
}

function initDocumentForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-job-document-form]');
  if (!form) return;
  const jobId = form.dataset.jobId;
  if (!jobId) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = form.querySelector('#jd-file') as HTMLInputElement | null;
    if (!fileInput?.files?.length) {
      say(form, 'Choose a file first.');
      return;
    }
    say(form, 'Uploading…');
    try {
      const res = await fetch(`/api/portal/jobs/${jobId}/documents`, { method: 'POST', body: new FormData(form) });
      if (res.ok) {
        location.reload();
        return;
      }
      let message = 'Upload failed. Please try again.';
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) message = data.error.replace(/_/g, ' ');
      } catch {
        /* keep generic message */
      }
      say(form, message);
    } catch {
      say(form, 'Network problem. Please try again.');
    }
  });
}

function init(): void {
  initRespondForm();
  initStatusForm();
  initDocumentForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
