import { SITE, SERVICE_CATEGORIES } from '../data/site';

const ORG_ID = `${SITE.url}/#organization`;
const BIZ_ID = `${SITE.url}/#localbusiness`;

export function localBusiness() {
  return {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': BIZ_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    telephone: SITE.phoneE164,
    email: SITE.email,
    image: `${SITE.url}${SITE.defaultOgImage}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postal,
      addressCountry: SITE.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    areaServed: SITE.areaServed.map((n) => ({ '@type': 'City', name: n })),
    openingHoursSpecification: SITE.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days, opens: h.opens, closes: h.closes,
    })),
    ...(SITE.social.length ? { sameAs: SITE.social } : {}),
    // NOTE: no aggregateRating on purpose — self-serving review markup is discounted by Google.
  };
}

export function organisation() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}${SITE.defaultOgImage}`,
  };
}

export function website() {
  return { '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: SITE.url, name: SITE.name, publisher: { '@id': ORG_ID } };
}

export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name, item: `${SITE.url}${t.path}`,
    })),
  };
}

export function serviceList() {
  return SERVICE_CATEGORIES.map((c) => ({
    '@type': 'Service',
    '@id': `${SITE.url}/services/#${c.slug}`,
    name: c.name,
    serviceType: c.name,
    provider: { '@id': BIZ_ID },
    areaServed: SITE.areaServed.map((n) => ({ '@type': 'City', name: n })),
  }));
}

export function faqPage(qa: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: qa.map((x) => ({
      '@type': 'Question', name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  };
}

export function graph(nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
