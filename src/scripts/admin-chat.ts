/**
 * Admin live chat inbox - drives /admin/messages/.
 *
 * - Conversation list from GET /api/admin/chat?status=..., refreshed every 4s.
 * - Open thread from GET /api/admin/chat/[id]?after=ms, refreshed every 3s
 *   (opening a thread marks it read).
 * - Reply: POST /api/admin/chat/[id] { body }. Enter sends, Shift+Enter = newline.
 * - Close / reopen: PATCH { status }.
 * - New visitor message anywhere: short beep (after the first user click,
 *   browsers block audio before that) and "(n) Live chat" in the tab title.
 * - Polling pauses while the tab is hidden and catches up on return.
 * All server text is rendered with textContent.
 */
type Conv = {
  id: string; name: string | null; contact: string | null; page: string | null; status: string;
  unread_admin: number; last_message_at: number; last_preview: string | null; lead_id: string | null;
  visitor_seen_at: number | null;
};
type Msg = { id: string; sender: 'visitor' | 'agent' | 'system'; author_name: string | null; body: string; created_at: number };

const TZ = 'America/New_York';
const timeFmt = (ms: number) => {
  const d = new Date(ms);
  const sameDay = new Date().toLocaleDateString('en-US', { timeZone: TZ }) === d.toLocaleDateString('en-US', { timeZone: TZ });
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
};

function init(): void {
  const app = document.querySelector<HTMLElement>('[data-chat-app]');
  if (!app) return;
  const items = app.querySelector<HTMLElement>('[data-chat-items]')!;
  const thread = app.querySelector<HTMLElement>('[data-chat-thread]')!;
  const placeholder = app.querySelector<HTMLElement>('[data-chat-placeholder]')!;
  const msgsEl = app.querySelector<HTMLElement>('[data-chat-msgs]')!;
  const compose = app.querySelector<HTMLFormElement>('[data-chat-compose]')!;
  const textarea = compose.querySelector<HTMLTextAreaElement>('textarea')!;
  const nameEl = app.querySelector<HTMLElement>('[data-chat-name]')!;
  const metaEl = app.querySelector<HTMLElement>('[data-chat-meta]')!;
  const initialEl = app.querySelector<HTMLElement>('[data-chat-initial]')!;
  const callEl = app.querySelector<HTMLAnchorElement>('[data-chat-call]')!;
  const leadEl = app.querySelector<HTMLAnchorElement>('[data-chat-lead]')!;
  const toggleEl = app.querySelector<HTMLButtonElement>('[data-chat-toggle]')!;
  const baseTitle = document.title;

  let filter = 'open';
  let convs: Conv[] = [];
  let activeId: string | null = new URLSearchParams(location.hash.slice(1)).get('c');
  let lastAt = 0;
  const seen = new Set<string>();
  let lastUnreadTotal = -1;
  let listTimer: number | undefined;
  let threadTimer: number | undefined;
  let audio: AudioContext | null = null;

  document.addEventListener('click', () => {
    if (!audio) {
      try {
        audio = new AudioContext();
      } catch {
        audio = null;
      }
    }
  }, { once: true });

  function beep(): void {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.25);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.26);
  }

  async function getJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
    const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }

  // ------------------------------------------------------------ list
  function renderList(): void {
    items.textContent = '';
    if (convs.length === 0) {
      const p = document.createElement('p');
      p.className = 'adm-muted achat-empty';
      p.textContent = filter === 'open' ? 'No open chats right now.' : 'No chats here.';
      items.appendChild(p);
      return;
    }
    for (const c of convs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `achat-item${c.id === activeId ? ' is-active' : ''}${c.unread_admin > 0 ? ' is-unread' : ''}`;
      const av = document.createElement('span');
      av.className = 'adm-person-photo';
      av.textContent = (c.name || '?').charAt(0).toUpperCase();
      const mid = document.createElement('span');
      mid.className = 'achat-item-mid';
      const n = document.createElement('b');
      n.textContent = c.name || 'Visitor';
      const pv = document.createElement('span');
      pv.textContent = c.last_preview || '';
      mid.append(n, pv);
      const right = document.createElement('span');
      right.className = 'achat-item-right';
      const t = document.createElement('small');
      t.textContent = timeFmt(c.last_message_at);
      right.appendChild(t);
      if (c.unread_admin > 0) {
        const u = document.createElement('span');
        u.className = 'adm-badge adm-badge--red';
        u.textContent = String(c.unread_admin);
        right.appendChild(u);
      }
      b.append(av, mid, right);
      b.addEventListener('click', () => select(c.id));
      items.appendChild(b);
    }
  }

  async function loadList(): Promise<void> {
    try {
      const r = await getJson<{ conversations?: Conv[]; totals?: { open: number; closed: number; unread: number } }>(
        `/api/admin/chat?status=${filter}`
      );
      if (!r.ok) return;
      convs = r.data.conversations ?? [];
      const totals = r.data.totals ?? { open: 0, closed: 0, unread: 0 };
      app!.querySelector('[data-count-open]')!.textContent = String(totals.open);
      app!.querySelector('[data-count-closed]')!.textContent = String(totals.closed);
      if (lastUnreadTotal >= 0 && totals.unread > lastUnreadTotal) beep();
      lastUnreadTotal = totals.unread;
      document.title = totals.unread > 0 ? `(${totals.unread}) ${baseTitle}` : baseTitle;
      renderList();
      if (activeId) fillHead();
      else if (convs[0] && window.matchMedia('(min-width: 901px)').matches) void select(convs[0].id);
    } catch {
      /* network blip - next tick */
    }
  }

  // ------------------------------------------------------------ thread
  function fillHead(): void {
    const c = convs.find((x) => x.id === activeId);
    if (!c) return;
    nameEl.textContent = c.name || 'Visitor';
    initialEl.textContent = (c.name || '?').charAt(0).toUpperCase();
    const bits = [c.contact, c.page ? `on ${c.page}` : '', c.visitor_seen_at ? `seen ${timeFmt(c.visitor_seen_at)}` : ''].filter(Boolean);
    metaEl.textContent = bits.join(' · ');
    const contact = c.contact || '';
    if (contact.includes('@')) {
      callEl.href = `mailto:${contact}`;
      callEl.textContent = 'Email';
      callEl.hidden = false;
    } else if (contact.replace(/\D/g, '').length >= 7) {
      callEl.href = `tel:${contact.replace(/[^\d+]/g, '')}`;
      callEl.textContent = 'Call';
      callEl.hidden = false;
    } else callEl.hidden = true;
    leadEl.hidden = !c.lead_id;
    if (c.lead_id) leadEl.href = `/admin/leads/${c.lead_id}`;
    toggleEl.textContent = c.status === 'closed' ? 'Reopen chat' : 'Close chat';
    toggleEl.dataset.next = c.status === 'closed' ? 'open' : 'closed';
  }

  function addMsg(m: Msg): void {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    lastAt = Math.max(lastAt, m.created_at);
    const row = document.createElement('div');
    row.className = `achat-msg achat-msg--${m.sender}`;
    const bub = document.createElement('div');
    bub.className = 'achat-bubble';
    bub.textContent = m.body;
    const meta = document.createElement('small');
    meta.textContent = `${m.sender === 'agent' ? (m.author_name || 'Staff') + ' · ' : ''}${timeFmt(m.created_at)}`;
    row.append(bub, meta);
    const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 120;
    msgsEl.appendChild(row);
    if (nearBottom || m.sender === 'agent') msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  async function loadThread(): Promise<void> {
    if (!activeId) return;
    const id = activeId;
    try {
      const r = await getJson<{ messages?: Msg[] }>(`/api/admin/chat/${id}?after=${lastAt}`);
      if (id !== activeId) return;
      if (r.status === 404) {
        activeId = null;
        showThread(false);
        return;
      }
      (r.data.messages ?? []).forEach(addMsg);
    } catch {
      /* next tick */
    }
  }

  function showThread(on: boolean): void {
    thread.hidden = !on;
    placeholder.hidden = on;
    app!.classList.toggle('is-thread', on);
  }

  async function select(id: string): Promise<void> {
    activeId = id;
    history.replaceState(null, '', `#c=${id}`);
    lastAt = 0;
    seen.clear();
    msgsEl.textContent = '';
    showThread(true);
    fillHead();
    renderList();
    await loadThread();
    msgsEl.scrollTop = msgsEl.scrollHeight;
    textarea.focus();
  }

  compose.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text || !activeId) return;
    textarea.value = '';
    textarea.style.height = '';
    const r = await getJson<{ message?: Msg; error?: string }>(`/api/admin/chat/${activeId}`, {
      method: 'POST', body: JSON.stringify({ body: text }),
    });
    if (r.ok && r.data.message) {
      addMsg(r.data.message);
      void loadList();
    } else {
      textarea.value = text;
      alert(r.status === 403 ? 'Your role cannot reply to chats.' : 'Message not sent. Please try again.');
    }
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      compose.requestSubmit();
    }
  });
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  });

  toggleEl.addEventListener('click', async () => {
    if (!activeId) return;
    await getJson(`/api/admin/chat/${activeId}`, { method: 'PATCH', body: JSON.stringify({ status: toggleEl.dataset.next || 'closed' }) });
    await loadList();
  });

  app.querySelector('[data-chat-back]')?.addEventListener('click', () => {
    activeId = null;
    history.replaceState(null, '', location.pathname);
    showThread(false);
    renderList();
  });

  app.querySelectorAll<HTMLButtonElement>('[data-chat-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      filter = b.dataset.chatFilter || 'open';
      app!.querySelectorAll('[data-chat-filter]').forEach((x) => x.classList.toggle('is-active', x === b));
      void loadList();
    });
  });

  // ------------------------------------------------------------ polling
  function tick(): void {
    window.clearTimeout(listTimer);
    window.clearTimeout(threadTimer);
    if (document.hidden) return;
    listTimer = window.setTimeout(async () => {
      await loadList();
      tick();
    }, 4000);
    threadTimer = window.setTimeout(() => void loadThread(), 3000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void Promise.all([loadList(), loadThread()]).then(tick);
  });

  void loadList().then(async () => {
    if (activeId) await select(activeId);
    tick();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

export {};
