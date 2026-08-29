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
    // A PostalAddress is only emitted when there is a real, visitable address.
    // A half-filled one is worse than none: Google cross-checks it against the
    // Google Business Profile and discounts markup that disagrees.
    ...(SITE.address.street && SITE.address.city
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: SITE.address.street,
            addressLocality: SITE.address.city,
            addressRegion: SITE.address.region,
            postalCode: SITE.address.postal,
            addressCountry: SITE.address.country,
          },
        }
      : {}),
    ...(SITE.geo
      ? { geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng } }
      : {}),
    areaServed: SITE.areaServed.length
      ? SITE.areaServed.map((n) => ({ '@type': 'City', name: n }))
      : [{ '@type': 'AdministrativeArea', name: 'Connecticut' }],
    openingHoursSpecification: SITE.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days, opens: h.opens, closes: h.closes,
    })),
    ...(SITE.social.length ? { sameAs: SITE.social } : {}),
    // NOTE: no aggregateRating on purpose - self-serving review markup is discounted by Google.
  };
}

export function organisation() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon-512.png`,
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
    areaServed: SITE.areaServed.length
      ? SITE.areaServed.map((n) => ({ '@type': 'City', name: n }))
      : [{ '@type': 'AdministrativeArea', name: 'Connecticut' }],
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

export function blogPosting(post: {
  title: string; description: string; slug: string;
  publishedAt: Date; updatedAt?: Date; author: string; cover: string;
}) {
  return {
    '@type': 'BlogPosting',
    '@id': `${SITE.url}/blog/${post.slug}/#article`,
    headline: post.title,
    description: post.description,
    url: `${SITE.url}/blog/${post.slug}/`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE.url}/blog/${post.slug}/` },
    image: `${SITE.url}${post.cover}`,
    datePublished: post.publishedAt.toISOString(),
    dateModified: (post.updatedAt ?? post.publishedAt).toISOString(),
    author: { '@type': 'Organization', name: post.author, url: SITE.url },
    publisher: { '@id': `${SITE.url}/#organization` },
  };
}

export function blogIndex(posts: { title: string; slug: string }[]) {
  return {
    '@type': 'Blog',
    '@id': `${SITE.url}/blog/#blog`,
    name: `${SITE.name} - Insights`,
    url: `${SITE.url}/blog/`,
    publisher: { '@id': `${SITE.url}/#organization` },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE.url}/blog/${p.slug}/`,
    })),
  };
}
