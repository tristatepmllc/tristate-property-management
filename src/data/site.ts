export const SITE = {
  name: 'Tristate Property Management',
  legalName: 'Tristate Property Management LLC',
  // Live host today. The custom domain (tristatepropertymanagement.com) currently
  // returns 503, and og:image / og:url / canonical all resolve against this value -
  // pointing them at a dead host is why WhatsApp and Facebook showed no preview.
  // Switch back the moment the custom domain is attached in Cloudflare Pages.
  url: 'https://tristate-property-management.pages.dev',
  phone: '(708) 905-4471',
  phoneE164: '+17089054471',
  get telHref() { return `tel:${this.phoneE164}`; },
  email: 'service@tristatepropertymanagement.com',         // TODO: real inbox
  get mailtoHref() { return `mailto:${this.email}`; },
  // Service-area business: we travel to the client, there is no walk-in office.
  // Leave `street`/`city`/`postal` empty and Schema.org PostalAddress + geo are
  // omitted entirely rather than published half-filled - Google cross-checks this
  // against the Google Business Profile and discounts markup that conflicts.
  // Fill them in ONLY if there is a real address customers can visit.
  address: {
    street: '',                                 // TODO: street, if there is a visitable office
    city: '',                                   // TODO: town - required for GBP and local ranking
    region: 'CT',
    postal: '',                                 // TODO
    country: 'US',
  },
  geo: null as { lat: number; lng: number } | null,   // TODO: set once the town is known
  license: '',                                  // TODO: CT licence number (currently hidden when empty)
  // TODO: replace with the actual Connecticut towns served.
  areaServed: [] as string[],
  hours: [
    { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '07:00', closes: '18:00' },
  ],
  social: [] as string[],                       // TODO: GBP / Facebook / LinkedIn URLs
  // Contact channels surfaced in the Contact mega-menu. Same convention as
  // areaServed and TESTIMONIALS: empty means the entry is not rendered at all,
  // rather than rendered pointing at an address nobody reads.
  press: '',                                    // TODO: real press inbox, or leave empty
  newsletter: false,                            // TODO: true once a list and a signup endpoint exist
  // 1200x630 branded share card. Blog posts override this with their cover.
  defaultOgImage: '/images/og-tristate.jpg',
  defaultOgAlt:
    'Tristate Property Management LLC - property management made easy. Property protection, tenant management, maintenance and repairs, maximise your ROI.',
} as const;

/**
 * Primary nav. Five items, not seven.
 *
 * Register and Vendors used to sit here; they are now the first two entries of
 * the "Get started" menu, which is where a visitor looks for them and which is
 * how the reference site (lessen.com) splits the same two audiences. Keeping
 * them in both places would duplicate the link and, more concretely, the header
 * row is capped at ~1172px of content - two nav items plus a Login control plus
 * a Get started button do not fit alongside seven.
 *
 * `menu: 'contact'` marks the item that opens the mega-panel instead of
 * navigating. Everything inside that panel still links to /contact/.
 */
export const NAV = [
  { href: '/services/',     label: 'Services' },
  { href: '/industries/',   label: 'Industries' },
  { href: '/why-tristate/', label: 'Why Tristate' },
  { href: '/blog/',         label: 'Blog' },
  { href: '/contact/',      label: 'Contact', menu: 'contact' },
] as const;

/** Routes that live under a menu rather than in NAV, so /sitemap/ and the
 *  `active` highlight can still resolve them to their parent control. */
export const GET_STARTED = [
  {
    href: '/client-registration/',
    label: 'Become a client',
    note: 'Put a property on file and open an ongoing account.',
  },
  {
    href: '/vendor-network/',
    label: 'Become a vendor',
    note: 'Licensed trades applying to take our work orders.',
  },
  {
    href: '/contact/',
    label: 'Request a quote',
    note: 'One job, one building, one price.',
  },
] as const;

/**
 * Login targets. The portal is not built yet - every entry points at /portal/,
 * a single honest holding page, rather than at a route that 404s or a form that
 * cannot authenticate anyone. Split these into real destinations in the same
 * commit that ships auth, not before.
 */
export const LOGIN = [
  { href: '/portal/', label: 'Client login',  note: 'Invoices, work orders and property history.' },
  { href: '/portal/', label: 'Vendor login',  note: 'Assigned jobs, photos and payment status.' },
] as const;

export const SERVICE_CATEGORIES = [
  { slug: 'cleaning',   name: 'Janitorial & Cleaning' },
  { slug: 'plumbing',   name: 'Plumbing & Drains' },
  { slug: 'electrical', name: 'Electrical & Lighting' },
  { slug: 'hvac',       name: 'HVAC & Refrigeration' },
  { slug: 'handyman',   name: 'Handyman & Repairs' },
  { slug: 'painting',   name: 'Painting & Finishes' },
  { slug: 'grounds',    name: 'Grounds & Exterior' },
  { slug: 'projects',   name: 'Restoration & Build-Out' },
] as const;
