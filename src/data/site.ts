/** One state in the service footprint, with the towns inside it we actually cover. */
export type AreaServed = {
  state: string;
  abbr: string;
  cities: string[];
};

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
    // The HQ state, NOT the service footprint - that is `areaServed`, and it is
    // five states wide. Nothing may read this field to describe coverage.
    region: 'CT',                               // TODO: confirm which state the base is in
    postal: '',                                 // TODO
    country: 'US',
  },
  geo: null as { lat: number; lng: number } | null,   // TODO: set once the town is known
  license: '',                                  // TODO: licence number(s) - hidden while empty. See note on areaServed.
  /**
   * Where the vans actually go.
   *
   * Shaped as state -> cities rather than a flat list of towns, because the
   * footprint crosses five states and Schema.org needs the two levels to mean
   * different things: a state is an `AdministrativeArea`, a town is a `City`.
   * The previous flat `string[]` was mapped to `City` unconditionally, so
   * putting "Florida" in it would have published a City named Florida.
   *
   * `cities` is the half that earns rankings. Nobody searches "Arkansas
   * property management"; they search "Little Rock property management". Until
   * a state has cities, it contributes a state-level schema entry and a single
   * chip in the coverage grid, and no local-intent query.
   *
   * NOTE ON LICENSING: managing rentals for an owner for compensation is
   * regulated real estate activity in CT, FL, IL and AR (MA is the exception).
   * `services` records what is actually sold in each state so the site never
   * implies licensed brokerage where only facility work is performed. Leave it
   * empty until confirmed - nothing reads it yet, so nothing is claimed.
   */
  areaServed: [
    { state: 'Connecticut',   abbr: 'CT', cities: [] as string[] },   // TODO: 3-8 metros
    { state: 'Massachusetts', abbr: 'MA', cities: [] as string[] },   // TODO
    { state: 'Illinois',      abbr: 'IL', cities: [] as string[] },   // TODO
    { state: 'Florida',       abbr: 'FL', cities: [] as string[] },   // TODO
    { state: 'Arkansas',      abbr: 'AR', cities: [] as string[] },   // TODO
  ] as AreaServed[],
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
 * Coverage helpers.
 *
 * One place builds the prose sentence, so the homepage, /contact/ and the
 * Contact mega-panel cannot drift apart when a state is added or dropped -
 * which is exactly how "We cover Connecticut" survived on the homepage after
 * the footprint had already grown past it.
 */
export const SERVED_STATES: readonly string[] = SITE.areaServed.map((a) => a.state);

/** "Connecticut, Massachusetts, Illinois, Florida and Arkansas" */
export const SERVED_SENTENCE: string =
  SERVED_STATES.length <= 1
    ? SERVED_STATES[0] ?? ''
    : `${SERVED_STATES.slice(0, -1).join(', ')} and ${SERVED_STATES[SERVED_STATES.length - 1]}`;

/**
 * "CT, MA, IL, FL and AR" - for the narrow key/value rows in the footer, the
 * Contact panel and the homepage quick-facts list. The full sentence is 58
 * characters and wraps to three lines in a 302px column, which is why those
 * spots previously carried a hardcoded "Connecticut, USA" instead of reading
 * the data. Prose keeps `SERVED_SENTENCE`; tight columns use this.
 */
export const SERVED_ABBR: string = (() => {
  const a = SITE.areaServed.map((s) => s.abbr);
  return a.length <= 1 ? a[0] ?? '' : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
})();

/** True once at least one state has towns listed - gates the town-level grid. */
export const HAS_CITIES: boolean = SITE.areaServed.some((a) => a.cities.length > 0);

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
  { href: '/why-tristate/', label: 'About',   menu: 'about' },
  { href: '/blog/',         label: 'Blog' },
  { href: '/contact/',      label: 'Contact', menu: 'contact' },
] as const;

/**
 * The About menu.
 *
 * "Why Tristate" became "About" rather than gaining a sixth sibling. The header
 * row is capped at roughly 1172px of content (`.wrap` is 1220px with a 24px
 * gutter), and seven items already overran it once - silently, by wrapping the
 * phone number and squeezing `.header-cta` from 290px to 234px at 1440. A sixth
 * item would have pushed the burger breakpoint above 1180px and handed the menu
 * button to more laptops. "About" is also two characters shorter than "Why
 * Tristate", so the row gained width instead of losing it.
 *
 * `/careers/` gains a home here. It was previously reachable only from the
 * footer and /sitemap/, which is a poor place for a page meant to attract
 * applicants.
 */
export const ABOUT = [
  {
    href: '/why-tristate/',
    label: 'Why Tristate',
    note: 'How we work, what we commit to, and what happens after your call.',
  },
  {
    href: '/team/',
    label: 'Our team',
    note: 'The people running operations, client service and the field crews.',
  },
  {
    href: '/careers/',
    label: 'Careers',
    note: 'Licensed trades and maintenance roles across our service area.',
  },
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
