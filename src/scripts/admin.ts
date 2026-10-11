/**
 * Admin panel behaviour, driven entirely by data attributes so pages stay
 * markup-only:
 *
 *   <form data-admin-form data-endpoint="/api/admin/..." data-method="PATCH"
 *         data-confirm="Sure?" data-redirect="/admin/x/">
 *     Fields are sent as JSON strings; the API parses/validates them.
 *     On success: follow `redirect` from the JSON reply, else data-redirect,
 *     else reload. Errors show in the form's .form-status.
 *
 *   <button data-admin-quick data-endpoint=".." data-method="PATCH"
 *           data-body='{"status":"contacted"}' data-confirm="..">
 *     One-click actions (status buttons). Same success handling.
 *
 *   <tr data-href="/admin/leads/123">   whole row clickable (not its links).
 *   <input data-table-filter="#table-id"> instant client-side row filter.
 *   <select data-autosubmit>             submits its GET filter form on change.
 */

type Reply = { ok?: boolean; error?: string; redirect?: string; fields?: string[] };

const ERRORS: Record<string, string> = {
  forbidden: 'You are signed out or not an admin. Reload and sign in again.',
  not_found: 'That record no longer exists.',
  validation_failed: 'Please check the highlighted fields.',
  email_required: 'An email address is needed to create the client account.',
  invalid_status: 'That status is not allowed here.',
  not_a_vendor: 'Pick a vendor account.',
  storage_failed: 'Could not save. Please try again.',
};

async function send(endpoint: string, method: string, body: unknown): Promise<{ ok: boolean; data: Reply }> {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as Reply;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'network' } };
  }
}

function after(data: Reply, fallbackRedirect?: string): void {
  const to = data.redirect || fallbackRedirect;
  if (to) location.href = to;
  else location.reload();
}

function errorText(data: Reply): string {
  if (data.error === 'network') return 'Network problem. Check your connection and try again.';
  const base = (data.error && ERRORS[data.error]) || 'Something went wrong. Please try again.';
  return data.fields?.length ? `${base} (${data.fields.join(', ')})` : base;
}

function initForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-admin-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (form.dataset.confirm && !confirm(form.dataset.confirm)) return;

      const status = form.querySelector<HTMLElement>('.form-status');
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const label = button?.textContent ?? '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Saving...';
      }

      const body: Record<string, string> = {};
      new FormData(form).forEach((v, k) => {
        if (typeof v === 'string') body[k] = v;
      });
      // Unchecked checkboxes are absent from FormData; send them as "0".
      form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]').forEach((cb) => {
        body[cb.name] = cb.checked ? '1' : '0';
      });

      const { ok, data } = await send(form.dataset.endpoint || '', form.dataset.method || 'POST', body);
      if (ok) {
        if (status) {
          status.hidden = false;
          status.classList.remove('is-error');
          status.textContent = 'Saved.';
        }
        after(data, form.dataset.redirect);
        return;
      }
      if (status) {
        status.hidden = false;
        status.classList.add('is-error');
        status.textContent = errorText(data);
      }
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });
}

function initQuick(): void {
  document.querySelectorAll<HTMLButtonElement>('button[data-admin-quick]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.dataset.confirm && !confirm(btn.dataset.confirm)) return;
      let body: unknown = {};
      try {
        body = JSON.parse(btn.dataset.body || '{}');
      } catch {
        body = {};
      }
      btn.disabled = true;
      const { ok, data } = await send(btn.dataset.endpoint || '', btn.dataset.method || 'PATCH', body);
      if (ok) {
        after(data, btn.dataset.redirect);
        return;
      }
      btn.disabled = false;
      alert(errorText(data));
    });
  });
}

function initRows(): void {
  document.querySelectorAll<HTMLElement>('[data-href]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, button, input, select, textarea, form, label')) return;
      const href = row.dataset.href;
      if (!href) return;
      if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
      else location.href = href;
    });
  });
}

function initFilters(): void {
  document.querySelectorAll<HTMLInputElement>('input[data-table-filter]').forEach((input) => {
    const table = document.querySelector<HTMLElement>(input.dataset.tableFilter || '');
    if (!table) return;
    const rows = table.querySelectorAll<HTMLElement>('tbody tr, [data-filter-row]');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      rows.forEach((r) => {
        r.hidden = q !== '' && !(r.textContent || '').toLowerCase().includes(q);
      });
    });
  });
  document.querySelectorAll<HTMLSelectElement>('select[data-autosubmit]').forEach((sel) => {
    sel.addEventListener('change', () => sel.form?.submit());
  });
}

function init(): void {
  initForms();
  initQuick();
  initRows();
  initFilters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
