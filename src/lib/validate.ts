export type LeadInput = {
  name: string; email: string; phone: string;
  company?: string; address?: string; service?: string;
  urgency?: string; building?: string; message?: string;
  source?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Minimal dependency-free validation. Swap for zod if the shape grows. */
export function validateLead(raw: Record<string, unknown>): { ok: true; value: LeadInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const str = (k: string, max = 2000) => {
    const v = raw[k];
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  };

  const name = str('name', 120);
  const email = str('email', 200).toLowerCase();
  const phone = str('phone', 40);

  const emailOk = EMAIL.test(email);
  const phoneOk = phone.replace(/\D/g, '').length >= 7;

  if (name.length < 2) errors.push('name');
  if (email && !emailOk) errors.push('email');
  if (phone && !phoneOk) errors.push('phone');
  // One usable way to reply is enough. The page forms still mark all three
  // required in HTML; the chat widget only asks for one, and a lead we can
  // actually call is worth more than a lead we rejected for tidiness.
  if (!emailOk && !phoneOk) errors.push('contact');

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name, email, phone,
      company: str('company', 160) || undefined,
      address: str('address', 240) || undefined,
      service: str('service', 80) || undefined,
      urgency: str('urgency', 40) || undefined,
      building: str('building', 80) || undefined,
      message: str('details', 4000) || str('message', 4000) || undefined,
      source: str('source', 80) || undefined,
      utm_source: str('utm_source', 120) || undefined,
      utm_medium: str('utm_medium', 120) || undefined,
      utm_campaign: str('utm_campaign', 120) || undefined,
    },
  };
}
