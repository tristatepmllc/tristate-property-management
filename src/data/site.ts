export const SITE = {
  name: 'Tristate Property Management',
  legalName: 'Tristate Property Management LLC',
  url: 'https://tristatepropertymanagement.com',           // TODO: real production domain
  phone: '(708) 905-4471',
  phoneE164: '+17089054471',
  get telHref() { return `tel:${this.phoneE164}`; },
  email: 'service@tristatepropertymanagement.com',         // TODO: real inbox
  get mailtoHref() { return `mailto:${this.email}`; },
  // Service-area business: we travel to the client, there is no walk-in office.
  // Leave `street`/`city`/`postal` empty and Schema.org PostalAddress + geo are
  // omitted entirely rather than published half-filled — Google cross-checks this
  // against the Google Business Profile and discounts markup that conflicts.
  // Fill them in ONLY if there is a real address customers can visit.
  address: {
    street: '',                                 // TODO: street, if there is a visitable office
    city: '',                                   // TODO: town — required for GBP and local ranking
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
  defaultOgImage: '/images/home-crew-carrying-ladders-on-a-commercial-job-si.webp',
} as const;

export const NAV = [
  { href: '/',             label: 'Home' },
  { href: '/services/',    label: 'Services' },
  { href: '/industries/',  label: 'Industries' },
  { href: '/why-tristate/', label: 'Why Tristate' },
  { href: '/blog/',        label: 'Blog' },
  { href: '/contact/',     label: 'Contact' },
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
