/**
 * Submits every `form[data-lead-form]` on the page to /api/leads.
 *
 * Bundled and type-checked (it used to be an `is:inline` script, which Astro
 * ships untouched and never checks). Turnstile itself still loads inline from
 * challenges.cloudflare.com - that is a remote script, not ours.
 */

type LeadResponse = { ok?: boolean; id?: string; status?: string; error?: string };

declare global {
  interface Window {
    turnstile?: { reset: (widget?: string | HTMLElement) => void };
  }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

function attachUtm(form: HTMLFormElement, params: URLSearchParams): void {
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
}

function payloadFrom(form: HTMLFormElement): Record<string, string> {
  const payload: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value !== 'string') return;
    // Checkbox groups share a name. Overwriting kept only the last one ticked,
    // which silently lost most of a vendor's trades.
    payload[key] = payload[key] ? `${payload[key]}, ${value}` : value;
  });
  return payload;
}

function init(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-lead-form]');
  if (!forms.length) return;

  const params = new URLSearchParams(location.search);

  forms.forEach((form) => {
    attachUtm(form, params);

    const status = form.querySelector<HTMLElement>('.form-status');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const inPopup = Boolean(form.closest('[data-quote-popup]'));
    // Read from the markup rather than hardcoding /api/leads, so the vendor
    // form can reuse this whole path (UTM, honeypot, Turnstile, status line)
    // while posting to its own endpoint. getAttribute, not `.action`, which
    // the DOM resolves to an absolute URL.
    const endpoint = form.getAttribute('action') || '/api/leads';
    const successCopy = form.dataset.success;

    const say = (text: string): void => {
      if (!status) return;
      status.hidden = false;
      status.textContent = text;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const label = button?.textContent ?? 'Send request';
      if (button) {
        button.disabled = true;
        button.textContent = 'Sending…';
      }
      say('Sending your request…');

      try {
        // JSON, not FormData: Astro's CSRF check rejects cross-site form-encoded
        // POSTs, which would 403 the future mobile app on this same endpoint.
        // If Turnstile never loaded there is simply no token - the server
        // quarantines that lead as needs_review rather than losing it.
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payloadFrom(form)),
        });
        const data = (await response.json()) as LeadResponse;

        if (response.ok) {
          form.reset();
          say(
            successCopy ??
              (inPopup
                ? 'Booked - we will call to arrange a time, usually the same business day.'
                : 'Thanks - your request is in. We reply to every one, usually the same business day.')
          );
          window.turnstile?.reset();
          form.dispatchEvent(new CustomEvent('lead:sent', { bubbles: true }));
          if (!inPopup) history.replaceState(null, '', `${location.pathname}?sent=1`);
        } else {
          say(
            data.error === 'challenge_failed'
              ? 'The spam check did not pass. Please reload the page and try again.'
              : 'Something went wrong. Please call us instead - we answer 24/7.'
          );
        }
      } catch {
        say('Network problem. Please call us instead - we answer 24/7.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = label;
        }
      }
    });
  });
}

init();

export {};
