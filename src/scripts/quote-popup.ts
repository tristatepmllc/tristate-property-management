/**
 * Quote popup.
 *
 * Desktop: centre modal after a delay, with exit-intent as a second chance.
 * Mobile:  a slim bottom bar appears instead; tapping it opens the same modal,
 *          which makes the mobile modal click-triggered and therefore outside
 *          Google's intrusive-interstitial guideline.
 *
 * Frequency: once per session, 30 days after a dismissal, never after a convert.
 */

const DELAY_MS = 15_000; // inside the 6–15s band where timed popups peak
const DISMISS_DAYS = 30;
const KEY_DISMISS = 'tpm_qp_dismissed_until';
const KEY_CONVERTED = 'tpm_qp_converted';
const SESSION_SHOWN = 'tpm_qp_shown';

/** Storage throws in some privacy modes; never let that break the page. */
function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-quote-popup]');
  if (!root) return;

  // The contact page is already one big lead form.
  if (location.pathname.startsWith('/contact')) return;

  if (safeGet(localStorage, KEY_CONVERTED)) return;
  const until = Number.parseInt(safeGet(localStorage, KEY_DISMISS) ?? '0', 10);
  if (until && Date.now() < until) return;
  if (safeGet(sessionStorage, SESSION_SHOWN)) return;

  const backdrop = root.querySelector<HTMLElement>('[data-qp-backdrop]');
  const modal = root.querySelector<HTMLElement>('.qp-modal');
  const form = root.querySelector<HTMLFormElement>('form');
  const openBtn = root.querySelector<HTMLButtonElement>('.qp-bar-open');
  if (!backdrop || !modal) return;

  const isMobile = window.matchMedia('(max-width: 720px)');
  let lastFocus: HTMLElement | null = null;
  let armed = true;

  function openModal(): void {
    lastFocus = document.activeElement as HTMLElement | null;
    root!.hidden = false;
    root!.classList.remove('is-bar');
    backdrop!.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      root!.classList.add('is-open');
      modal!.querySelector<HTMLInputElement>('input:not([type=hidden]):not([tabindex="-1"])')
        ?.focus({ preventScroll: true });
    });
  }

  function closeAll(persist: boolean): void {
    root!.classList.remove('is-open', 'is-bar');
    document.body.style.overflow = '';
    if (persist) safeSet(localStorage, KEY_DISMISS, String(Date.now() + DISMISS_DAYS * 864e5));
    setTimeout(() => {
      backdrop!.hidden = true;
      root!.hidden = true;
    }, 200);
    lastFocus?.focus({ preventScroll: true });
  }

  function showEntry(): void {
    if (!armed) return;
    armed = false;
    safeSet(sessionStorage, SESSION_SHOWN, '1');
    root!.hidden = false;
    if (isMobile.matches) root!.classList.add('is-bar');
    else openModal();
    window.dispatchEvent(new CustomEvent('popup:shown'));
  }

  const timer = window.setTimeout(showEntry, DELAY_MS);

  // Desktop second chance: the cursor leaves toward the browser chrome.
  document.addEventListener('mouseout', (event) => {
    if (isMobile.matches || !armed) return;
    if (event.relatedTarget || event.clientY > 24) return;
    clearTimeout(timer);
    showEntry();
  });

  openBtn?.addEventListener('click', openModal);
  root.querySelector('.qp-bar-close')?.addEventListener('click', () => closeAll(true));
  root.querySelector('.qp-close')?.addEventListener('click', () => closeAll(true));
  root.querySelector('.qp-decline')?.addEventListener('click', () => closeAll(true));

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeAll(true);
  });

  document.addEventListener('keydown', (event) => {
    if (backdrop.hidden) return;
    if (event.key === 'Escape') {
      closeAll(true);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([type=hidden]), textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // lead-form.ts owns submission; we only react to its success event.
  form?.addEventListener('lead:sent', () => {
    safeSet(localStorage, KEY_CONVERTED, '1');
    setTimeout(() => closeAll(false), 2600);
  });
}

init();

export {};
