/**
 * Wires every [data-job-assign-form] on /admin/ (one per job row) to
 * PATCH /api/admin/jobs/[id]. Reloads on success rather than patching the
 * row in place - same reasoning as scripts/job-detail.ts: the page is SSR
 * and already renders every state correctly, a reload is simpler than a
 * second copy of that rendering logic in JS for a page whose admin isn't
 * clicking Assign often enough for a reload to be a real cost.
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
  const forms = document.querySelectorAll<HTMLFormElement>('[data-job-assign-form]');
  if (forms.length === 0) return;

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const jobId = form.dataset.jobId;
      if (!jobId) return;
      const vendorId = (form.querySelector('select[name="vendorId"]') as HTMLSelectElement | null)?.value || null;

      say(form, 'Saving…');
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ vendorId: vendorId || null }),
        });
        if (res.ok) {
          location.reload();
          return;
        }
        let message = 'Could not save. Please try again.';
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
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
