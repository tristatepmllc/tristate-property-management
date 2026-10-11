/**
 * Website live chat (visitor side) - two-way with the admin inbox.
 *
 * 1. Pre-chat: three quick questions in the chat itself (message -> name ->
 *    phone or email), so the team can follow up even if the visitor leaves.
 * 2. POST /api/chat/start opens the conversation and returns {id, token};
 *    both are kept in localStorage so the chat survives page changes and
 *    return visits on this browser.
 * 3. Live: messages go to /api/chat/send; new replies come from
 *    /api/chat/poll - every 3s while the window is open, every 20s while it
 *    is closed (to light the unread badge), paused when the tab is hidden.
 *
 * Everything the server returns is rendered with textContent, never HTML.
 */

type Msg = { id: string; sender: 'visitor' | 'agent' | 'system'; author_name: string | null; body: string; created_at: number };
type Stored = { id: string; token: string };

const STORE = 'tpm_chat_v2';
const FAST_MS = 3000;
const SLOW_MS = 20000;

function load(): Stored | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || 'null') as Stored | null;
    return v && typeof v.id === 'string' && typeof v.token === 'string' ? v : null;
  } catch {
    return null;
  }
}
function save(v: Stored | null): void {
  try {
    if (v) localStorage.setItem(STORE, JSON.stringify(v));
    else localStorage.removeItem(STORE);
  } catch {
    /* private mode: chat still works for this page view */
  }
}

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
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
  const badge = root.querySelector<HTMLElement>('.chat-badge');
  const status = root.querySelector<HTMLElement>('.chat-head .status');
  if (!panel || !launcher || !body || !input || !send) return;

  const phone = root.dataset.phone ?? '';
  let conv: Stored | null = load();
  let step: 'message' | 'name' | 'contact' | 'live' = conv ? 'live' : 'message';
  const draft = { message: '', name: '', contact: '' };
  const seen = new Set<string>();
  let lastAt = 0;
  let timer: number | undefined;
  let polling = false;
  let lastFocus: HTMLElement | null = null;

  const isOpen = () => root.classList.contains('is-open');

  function bubble(text: string, who: 'them' | 'me' | 'sys', author?: string | null): HTMLElement {
    const el = document.createElement('div');
    el.className = `bubble ${who === 'sys' ? 'them sys' : who}`;
    if (author && who === 'them') {
      const a = document.createElement('small');
      a.className = 'bubble-author';
      a.textContent = author;
      el.appendChild(a);
    }
    const t = document.createElement('span');
    t.textContent = text;
    el.appendChild(t);
    body!.appendChild(el);
    body!.scrollTop = body!.scrollHeight;
    return el;
  }
  const ask = (text: string) => {
    setTimeout(() => bubble(text, 'them'), 300);
  };

  function render(msgs: Msg[]): void {
    for (const m of msgs) {
      lastAt = Math.max(lastAt, m.created_at);
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.sender === 'visitor') bubble(m.body, 'me');
      else if (m.sender === 'agent') bubble(m.body, 'them', `${m.author_name || 'Tristate'} · Tristate`);
      else bubble(m.body, 'sys');
    }
  }

  function setBadge(n: number): void {
    if (!badge) return;
    badge.hidden = n <= 0 || isOpen();
    badge.textContent = n > 9 ? '9+' : String(n);
  }

  function goLive(): void {
    step = 'live';
    if (chips) chips.style.display = 'none';
    if (status) status.textContent = 'Live chat - we usually reply within minutes';
    input!.placeholder = 'Type a message...';
  }

  function reset(): void {
    save(null);
    conv = null;
    step = 'message';
    if (chips) chips.style.display = '';
    if (status) status.textContent = 'Usually replies within minutes';
  }

  async function poll(): Promise<void> {
    if (!conv || polling) return;
    polling = true;
    try {
      const r = await post<{ messages?: Msg[]; unread?: number }>('/api/chat/poll', {
        id: conv.id, token: conv.token, after: lastAt, seen: isOpen(),
      });
      if (r.status === 404) {
        reset();
        return;
      }
      if (r.ok) {
        render(r.data.messages ?? []);
        setBadge(isOpen() ? 0 : r.data.unread ?? 0);
      }
    } catch {
      /* offline - try again next tick */
    } finally {
      polling = false;
    }
  }

  function schedule(): void {
    window.clearTimeout(timer);
    if (!conv || document.hidden) return;
    timer = window.setTimeout(async () => {
      await poll();
      schedule();
    }, isOpen() ? FAST_MS : SLOW_MS);
  }

  async function start(): Promise<void> {
    const pending = bubble('Connecting you to the team...', 'sys');
    const turnstile = root!.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? '';
    try {
      const r = await post<{ id?: string; token?: string; messages?: Msg[]; error?: string }>('/api/chat/start', {
        name: draft.name, contact: draft.contact, message: draft.message,
        page: location.pathname, 'cf-turnstile-response': turnstile,
      });
      pending.remove();
      if (r.ok && r.data.id && r.data.token) {
        conv = { id: r.data.id, token: r.data.token };
        save(conv);
        goLive();
        // the first message is already on screen from the pre-chat step
        const first = (r.data.messages ?? []).find((m) => m.sender === 'visitor');
        if (first) seen.add(first.id);
        render(r.data.messages ?? []);
        schedule();
        return;
      }
      bubble(
        r.data.error === 'rate_limited'
          ? `We've had a lot of chats from this connection. Please call ${phone} and we'll help straight away.`
          : `Sorry, the chat couldn't connect. Please call ${phone} - answered 24/7.`,
        'sys'
      );
      step = 'contact';
    } catch {
      pending.remove();
      bubble(`No connection. Please call ${phone}.`, 'sys');
      step = 'contact';
    }
  }

  async function sendLive(text: string): Promise<void> {
    if (!conv) return;
    const el = bubble(text, 'me');
    el.classList.add('is-sending');
    try {
      const r = await post<{ message?: Msg; error?: string }>('/api/chat/send', { id: conv.id, token: conv.token, body: text });
      el.classList.remove('is-sending');
      if (r.ok && r.data.message) {
        seen.add(r.data.message.id);
        lastAt = Math.max(lastAt, r.data.message.created_at);
        return;
      }
      if (r.status === 404) {
        reset();
        bubble('That chat has ended. Send your message again to start a new one.', 'sys');
        return;
      }
      el.classList.add('is-failed');
      bubble(r.data.error === 'rate_limited' ? 'Slow down a little - try again in a moment.' : 'Not sent. Please try again.', 'sys');
    } catch {
      el.classList.remove('is-sending');
      el.classList.add('is-failed');
      bubble('Not sent - check your connection.', 'sys');
    }
  }

  function handle(raw: string | undefined): void {
    const text = (raw ?? '').trim();
    if (!text) return;

    if (step === 'live') {
      void sendLive(text);
      return;
    }
    bubble(text, 'me');
    if (step === 'message') {
      draft.message = text;
      step = 'name';
      ask("Thanks! So we can reply, what's your name?");
    } else if (step === 'name') {
      if (text.length < 2) {
        ask('Could you type your full name?');
        return;
      }
      draft.name = text;
      step = 'contact';
      ask('And the best phone number or email? (In case you leave before we answer.)');
    } else if (step === 'contact') {
      const digits = text.replace(/\D/g, '').length;
      if (!text.includes('@') && digits < 7) {
        ask("That doesn't look like a phone number or email - could you check it?");
        return;
      }
      draft.contact = text;
      if (chips) chips.style.display = 'none';
      void start();
    }
  }

  function open(): void {
    lastFocus = document.activeElement as HTMLElement | null;
    root!.classList.add('is-open');
    launcher!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    setBadge(0);
    setTimeout(() => input!.focus(), 60);
    if (conv) void poll().then(schedule);
  }

  function close(): void {
    root!.classList.remove('is-open');
    launcher!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
    lastFocus?.focus();
    schedule();
  }

  launcher.addEventListener('click', () => (isOpen() ? close() : open()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });
  const submitInput = () => {
    handle(input.value);
    input.value = '';
  };
  send.addEventListener('click', submitInput);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitInput();
    }
  });
  chips?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (b) handle(b.dataset.msg);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && conv) void poll().then(schedule);
    else window.clearTimeout(timer);
  });

  // Returning visitor with an open chat: restore history, then keep polling.
  if (conv) {
    goLive();
    void poll().then(schedule);
  }
  setBadge(0);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

export {};
