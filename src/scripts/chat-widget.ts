/**
 * Website live chat (visitor side) - two-way with the admin inbox.
 *
 * 1. The very first message (or photo / voice note) opens the conversation
 *    straight away, so it shows up in the admin inbox instantly. Name and
 *    phone/email are then asked inside the live chat (the answers go to the
 *    team as normal messages and are saved via /api/chat/details).
 * 2. POST /api/chat/start opens the conversation and returns {id, token};
 *    both are kept in localStorage so the chat survives page changes and
 *    return visits on this browser.
 * 3. Live: messages go to /api/chat/send; new replies come from
 *    /api/chat/poll - every 3s while the window is open, every 20s while it
 *    is closed (to light the unread badge), paused when the tab is hidden.
 *
 * Everything the server returns is rendered with textContent, never HTML.
 */

import { shrinkImage, VoiceRecorder, canRecord, fmtDuration } from './chat-media';

type Msg = {
  id: string; sender: 'visitor' | 'agent' | 'system'; author_name: string | null; body: string; created_at: number;
  kind?: 'text' | 'image' | 'audio'; media_type?: string | null; duration_ms?: number | null;
};
type Ask = 'name' | 'contact' | null;
type Stored = { id: string; token: string; ask?: Ask };

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
  const input = root.querySelector<HTMLInputElement>('.chat-input input[type="text"]');
  const send = root.querySelector<HTMLButtonElement>('.chat-send');
  const chips = root.querySelector<HTMLElement>('.chat-chips');
  const badge = root.querySelector<HTMLElement>('.chat-badge');
  const status = root.querySelector<HTMLElement>('.chat-head .status');
  if (!panel || !launcher || !body || !input || !send) return;

  const phone = root.dataset.phone ?? '';
  let conv: Stored | null = load();
  let starting: Promise<boolean> | null = null;
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
      if (m.kind === 'image' || m.kind === 'audio') mediaBubble(m);
      else if (m.sender === 'visitor') bubble(m.body, 'me');
      else if (m.sender === 'agent') bubble(m.body, 'them', `${m.author_name || 'Tristate'} · Tristate`);
      else bubble(m.body, 'sys');
    }
  }

  // ------------------------------------------------------------ media
  /** Put a photo or a voice player into a bubble from a URL. */
  function fillMedia(el: HTMLElement, kind: 'image' | 'audio', url: string, durationMs?: number | null): void {
    el.querySelector('.bubble-media')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'bubble-media';
    if (kind === 'image') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Photo';
      img.className = 'chat-img';
      img.addEventListener('load', () => (body!.scrollTop = body!.scrollHeight));
      a.appendChild(img);
      wrap.appendChild(a);
    } else {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = url;
      audio.className = 'chat-audio';
      wrap.appendChild(audio);
      if (durationMs) {
        const d = document.createElement('small');
        d.className = 'chat-audio-len';
        d.textContent = fmtDuration(durationMs);
        wrap.appendChild(d);
      }
    }
    el.appendChild(wrap);
    body!.scrollTop = body!.scrollHeight;
  }

  function mediaShell(who: 'me' | 'them', label: string, author?: string | null): HTMLElement {
    const el = bubble(label, who, author);
    el.classList.add('bubble--media');
    return el;
  }

  function mediaBubble(m: Msg): void {
    const who = m.sender === 'visitor' ? 'me' : 'them';
    const author = m.sender === 'agent' ? `${m.author_name || 'Tristate'} · Tristate` : null;
    const kind = m.kind === 'image' ? 'image' : 'audio';
    const el = mediaShell(who, kind === 'image' ? 'Loading photo...' : 'Loading voice message...', author);
    if (!conv) return;
    fetch('/api/chat/media', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: conv.id, token: conv.token, msgId: m.id }),
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        el.querySelector('span')?.remove();
        fillMedia(el, kind, URL.createObjectURL(blob), m.duration_ms);
      })
      .catch(() => {
        const t = el.querySelector('span');
        if (t) t.textContent = kind === 'image' ? 'Photo could not load.' : 'Voice message could not load.';
      });
  }

  async function upload(file: File, kind: 'image' | 'audio', durationMs?: number): Promise<void> {
    if (!conv && !(await ensureStarted('', true))) return;
    if (!conv) return;
    const el = mediaShell('me', kind === 'image' ? 'Sending photo...' : 'Sending voice message...');
    el.classList.add('is-sending');
    fillMedia(el, kind, URL.createObjectURL(file), durationMs);
    const fd = new FormData();
    fd.append('id', conv.id);
    fd.append('token', conv.token);
    fd.append('file', file);
    if (durationMs) fd.append('duration', String(Math.round(durationMs)));
    try {
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as { message?: Msg; fields?: string[]; error?: string };
      el.classList.remove('is-sending');
      el.querySelector(':scope > span')?.remove();
      if (res.ok && data.message) {
        seen.add(data.message.id);
        lastAt = Math.max(lastAt, data.message.created_at);
        return;
      }
      el.classList.add('is-failed');
      bubble(data.fields?.[0] || (data.error === 'rate_limited' ? 'Slow down a little - try again in a moment.' : 'Not sent. Please try again.'), 'sys');
    } catch {
      el.classList.remove('is-sending');
      el.classList.add('is-failed');
      bubble('Not sent - check your connection.', 'sys');
    }
  }

  const fileInput = root.querySelector<HTMLInputElement>('[data-chat-file]');
  root.querySelector('[data-chat-attach]')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      bubble('Only photos can be attached.', 'sys');
      return;
    }
    void upload(await shrinkImage(f), 'image');
  });

  const recBar = root.querySelector<HTMLElement>('[data-chat-rec]');
  const recTime = root.querySelector<HTMLElement>('[data-chat-rec-time]');
  const micBtn = root.querySelector<HTMLButtonElement>('[data-chat-mic]');
  const recorder = new VoiceRecorder();
  let recTick: number | undefined;
  if (micBtn && !canRecord()) micBtn.hidden = true;

  function recUi(on: boolean): void {
    if (recBar) recBar.hidden = !on;
    root!.classList.toggle('is-recording', on);
    window.clearInterval(recTick);
    if (on) recTick = window.setInterval(() => { if (recTime) recTime.textContent = fmtDuration(recorder.elapsed()); }, 250);
    if (recTime) recTime.textContent = '0:00';
  }
  async function finishRecording(): Promise<void> {
    try {
      const { file, durationMs } = await recorder.stop();
      recUi(false);
      if (durationMs < 700) {
        bubble('That was too short - tap the mic and speak, then press Send.', 'sys');
        return;
      }
      void upload(file, 'audio', durationMs);
    } catch {
      recUi(false);
    }
  }
  recorder.onLimit = () => void finishRecording();
  micBtn?.addEventListener('click', async () => {
    try {
      await recorder.start();
      recUi(true);
    } catch {
      bubble('Microphone access was blocked. Allow it in your browser settings to send a voice message.', 'sys');
    }
  });
  root.querySelector('[data-chat-rec-cancel]')?.addEventListener('click', () => {
    recorder.cancel();
    recUi(false);
  });
  root.querySelector('[data-chat-rec-send]')?.addEventListener('click', () => void finishRecording());

  function setBadge(n: number): void {
    if (!badge) return;
    badge.hidden = n <= 0 || isOpen();
    badge.textContent = n > 9 ? '9+' : String(n);
  }

  function goLive(): void {
    root!.classList.add('is-live');
    if (chips) chips.style.display = 'none';
    if (status) status.textContent = 'Live chat - we usually reply within minutes';
    input!.placeholder = 'Type a message...';
  }

  function reset(): void {
    root!.classList.remove('is-live');
    save(null);
    conv = null;
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

  const ASK_TEXT: Record<'name' | 'contact', string> = {
    name: "While you wait - what's your name?",
    contact: 'And the best phone number or email, in case you leave before we answer?',
  };
  function setAsk(next: Ask): void {
    if (!conv) return;
    conv.ask = next;
    save(conv);
    if (next) ask(ASK_TEXT[next]);
  }

  /** Open the conversation (once). Resolves true when live. */
  function ensureStarted(message: string, media = false): Promise<boolean> {
    if (conv) return Promise.resolve(true);
    if (!starting) starting = start(message, media).finally(() => (starting = null));
    return starting;
  }

  async function start(message: string, media: boolean): Promise<boolean> {
    if (chips) chips.style.display = 'none';
    const turnstile = root!.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? '';
    try {
      const r = await post<{ id?: string; token?: string; messages?: Msg[]; needs?: { name: boolean; contact: boolean }; error?: string }>('/api/chat/start', {
        message, media, page: location.pathname, 'cf-turnstile-response': turnstile,
      });
      if (r.ok && r.data.id && r.data.token) {
        conv = { id: r.data.id, token: r.data.token, ask: null };
        save(conv);
        goLive();
        // the first message is already on screen
        const first = (r.data.messages ?? []).find((m) => m.sender === 'visitor');
        if (first) seen.add(first.id);
        render(r.data.messages ?? []);
        schedule();
        const needs = r.data.needs ?? { name: false, contact: false };
        setAsk(needs.name ? 'name' : needs.contact ? 'contact' : null);
        return true;
      }
      bubble(
        r.data.error === 'rate_limited'
          ? `We've had a lot of chats from this connection. Please call ${phone} and we'll help straight away.`
          : `Sorry, the chat couldn't connect. Please call ${phone} - answered 24/7.`,
        'sys'
      );
    } catch {
      bubble(`No connection. Please call ${phone}.`, 'sys');
    }
    if (chips) chips.style.display = '';
    return false;
  }

  /** The visitor's reply to "what's your name?" / "phone or email?". */
  function captureDetails(text: string): void {
    if (!conv?.ask) return;
    const which = conv.ask;
    if (which === 'name') {
      if (text.length < 2 || text.length > 60) return;
      void post('/api/chat/details', { id: conv.id, token: conv.token, name: text });
      setAsk('contact');
      return;
    }
    const digits = text.replace(/\D/g, '').length;
    if (!text.includes('@') && digits < 7) return; // not a contact - keep waiting quietly
    void post('/api/chat/details', { id: conv.id, token: conv.token, contact: text });
    setAsk(null);
    ask("Thanks - got it. We'll reply right here.");
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
    if (conv) {
      void sendLive(text);
      captureDetails(text);
      return;
    }
    if (starting) return; // first message still connecting
    const el = bubble(text, 'me');
    el.classList.add('is-sending');
    void ensureStarted(text).then((ok) => {
      el.classList.remove('is-sending');
      if (!ok) el.classList.add('is-failed');
    });
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
