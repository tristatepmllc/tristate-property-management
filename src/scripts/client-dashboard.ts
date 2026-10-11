/**
 * Client dashboard behaviour:
 *  - My jobs tab filter (All / Active / Awaiting / Completed / Cancelled),
 *    driven by data-job-stage on each card. Stat cards on the overview can
 *    open the Jobs panel on a given tab (cdash:jobs-tab event from
 *    vendor-dashboard.ts).
 *  - Job detail rating form ([data-review-form]) -> POST
 *    /api/portal/jobs/[id]/review, then reloads so the saved rating shows.
 */
function initTabs(): void {
  const wrap = document.querySelector<HTMLElement>('[data-jobs-tabs]');
  if (!wrap) return;
  const tabs = wrap.querySelectorAll<HTMLButtonElement>('[data-jobs-filter]');
  const cards = document.querySelectorAll<HTMLElement>('[data-job-stage]');
  const empty = document.querySelector<HTMLElement>('[data-jobs-empty]');

  const apply = (filter: string) => {
    let visible = 0;
    cards.forEach((c) => {
      const show = filter === 'all' || c.dataset.jobStage === filter;
      c.hidden = !show;
      if (show) visible++;
    });
    tabs.forEach((t) => {
      const on = t.dataset.jobsFilter === filter;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (empty) empty.hidden = visible > 0 || cards.length === 0;
  };

  tabs.forEach((t) => t.addEventListener('click', () => apply(t.dataset.jobsFilter || 'all')));
  document.addEventListener('cdash:jobs-tab', (e) => {
    const detail = (e as CustomEvent<string>).detail;
    if (detail) apply(detail);
  });
}

function initReview(): void {
  const form = document.querySelector<HTMLFormElement>('[data-review-form]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('.form-status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const say = (msg: string, isError = false) => {
    if (!status) return;
    status.hidden = false;
    status.textContent = msg;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const rating = Number(data.get('rating'));
    if (!rating) {
      say('Pick a star rating first.', true);
      return;
    }
    if (button) button.disabled = true;
    say('Saving...');
    try {
      const res = await fetch(`/api/portal/jobs/${form.dataset.jobId}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating, comment: String(data.get('comment') || '') }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const msg =
          body.error === 'not_completed' ? 'You can rate once the job is marked completed.'
          : body.error === 'no_vendor' ? 'This job has no vendor to rate.'
          : 'Could not save your rating. Please try again.';
        say(msg, true);
        if (button) button.disabled = false;
        return;
      }
      say('Thanks - your rating is saved.');
      setTimeout(() => location.reload(), 700);
    } catch {
      say('Network problem. Please try again.', true);
      if (button) button.disabled = false;
    }
  });
}

function init(): void {
  initTabs();
  initReview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
