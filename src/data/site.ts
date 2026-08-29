export const SITE = {
  name: 'Tristate Property Management',
  legalName: 'Tristate Property Management LLC',
  url: 'https://tristatepropertymanagement.com',           // TODO: real production domain
  phone: '(904) 555-0142',                      // TODO: real number
  phoneE164: '+19045550142',
  get telHref() { return `tel:${this.phoneE164}`; },
  email: 'service@tristatepropertymanagement.com',         // TODO: real inbox
  get mailtoHref() { return `mailto:${this.email}`; },
  address: {
    street: '4131 Sunbeam Road',                // TODO: real address (or delete if service-area only)
    city: 'Jacksonville',
    region: 'FL',
    postal: '32257',
    country: 'US',
  },
  geo: { lat: 30.2033, lng: -81.6098 },         // TODO: verify
  license: 'FL CGC-0000000',                    // TODO: real licence number
  areaServed: [
    'Jacksonville','Orange Park','St. Augustine','Ponte Vedra',
    'Fernandina Beach','Jacksonville Beach','Neptune Beach','Atlantic Beach',
  ],
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
