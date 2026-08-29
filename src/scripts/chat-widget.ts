/**
 * Chat widget - real lead capture, not a canned-reply mock.
 *
 * Three questions (message → name → phone/email), then the transcript is
 * written to D1 through the same /api/leads endpoint the forms use, tagged
 * `source=chat-widget`.
 */

type Step = 'message' | 'name' | 'contact' | 'done';

interface Draft {
  step: Step;
  message: string;
  name: string;
  contact: string;
  sent: boolean;
}

function init(): void {
  const root = document.querySelector<HTMLElement>('.chat-widget[data-chat="tristate"]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  const panel = root.querySelector<HTMLElement>('.chat-panel');
  const launcher = root.querySelector<HTMLButtonElement>('.chat-launcher');
  const body = root.querySelector<HTMLElement>('.chat-body');
  const input = root.querySelector<HTMLInputElement>('.chat-input input');
  const send = root.querySelector<HTMLButtonElement>('.chat-send');
  const chips = root.querySelector<HTMLElement>('.chat-chips');
  if (!panel || !launcher || !body || !input || !send) return;

  const phone = root.dataset.phone ?? '';
  const draft: Draft = { step: 'message', message: '', name: '', contact: '', sent: false };
  let lastFocus: HTMLElement | null = null;

  function bubble(text: string, who: 'them' | 'me' = 'them'): HTMLElement {
    const el = document.createElement('div');
    el.className = `bubble ${who}`;
    el.textContent = text;
    body!.appendChild(el);
    body!.scrollTop = body!.scrollHeight;
    return el;
  }

  const ask = (text: string): void => {
    setTimeout(() => bubble(text), 350);
  };

  const token = (): string =>
    root!.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? '';

  async function submit(): Promise<void> {
    if (draft.sent) return;
    draft.sent = true;
    const pending = bubble('Sending…');
    const isEmail = draft.contact.includes('@');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          email: isEmail ? draft.contact : '',
          phone: isEmail ? '' : draft.contact,
          details: draft.message,
          source: 'chat-widget',
          service: 'Chat enquiry',
          'cf-turnstile-response': token(),
        }),
      });
      pending.remove();

      if (response.ok) {
        bubble(
          `Got it - that is with our dispatch desk now. Someone will come back to you, usually the same business day. If it cannot wait, call ${phone}.`
        );
        window.turnstile?.reset();
      } else {
        bubble(`Something went wrong sending that. Please call ${phone} - the line is answered 24/7.`);
        draft.sent = false;
      }
    } catch {
      pending.remove();
      bubble(`No connection. Please call ${phone} - answered 24/7.`);
      draft.sent = false;
    }
  }

  function handle(raw: string | undefined): void {
    const text = (raw ?? '').trim();
    if (!text) return;
    bubble(text, 'me');

    switch (draft.step) {
      case 'message':
        draft.message = text;
        draft.step = 'name';
        ask('Thanks. What is your name?');
        break;
      case 'name':
        draft.name = text;
        draft.step = 'contact';
        ask('And the best number or email to reach you on?');
        break;
      case 'contact': {
        const digits = text.replace(/\D/g, '').length;
        if (!text.includes('@') && digits < 7) {
          ask('That does not look like a phone number or an email - could you check it?');
          return;
        }
        draft.contact = text;
        draft.step = 'done';
        if (chips) chips.style.display = 'none';
        void submit();
        break;
      }
      default:
        draft.message += `\n${text}`;
        draft.sent = false;
        void submit();
    }
  }

  function open(): void {
    lastFocus = document.activeElement as HTMLElement | null;
    root!.classList.add('is-open');
    launcher!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    setTimeout(() => input!.focus(), 60);
  }

  function close(): void {
    root!.classList.remove('is-open');
    launcher!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
    lastFocus?.focus();
  }

  launcher.addEventListener('click', () => {
    root.classList.contains('is-open') ? close() : open();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-open')) close();
  });

  const submitInput = (): void => {
    handle(input.value);
    input.value = '';
  };

  send.addEventListener('click', submitInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitInput();
    }
  });
  chips?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (button) handle(button.dataset.msg);
  });
}

init();

export {};
