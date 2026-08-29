type SendArgs = { apiKey: string; from: string; to: string | string[]; subject: string; html: string; replyTo?: string };

/** Fire a transactional email through Resend. Never throws — the lead is already saved. */
export async function sendEmail(a: SendArgs): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: a.from,
        to: Array.isArray(a.to) ? a.to : [a.to],
        subject: a.subject,
        html: a.html,
        ...(a.replyTo ? { reply_to: a.replyTo } : {}),
      }),
    });
    if (!res.ok) return { ok: false, error: `resend ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
