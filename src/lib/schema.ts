import { SITE, SERVICE_CATEGORIES } from '../data/site';
import { TEAM } from '../data/team';

const ORG_ID = `${SITE.url}/#organization`;
const BIZ_ID = `${SITE.url}/#localbusiness`;

/**
 * areaServed, at both levels.
 *
 * A state is an `AdministrativeArea` and a town is a `City`; the previous
 * version mapped a flat string list to `City` unconditionally, which would have
 * published a City named "Florida" the moment the footprint stopped being one
 * state. Each state also carries `containedInPlace` on its towns, so the two
 * levels read as a hierarchy rather than a bag of unrelated place names.
 *
 * There is no Connecticut fallback any more. It was there when the site served
 * one state, and it silently contradicted the other four the moment they were
 * added - a fallback that lies is worse than an empty field.
 */
function areaServed() {
  return SITE.areaServed.flatMap((a) => {
    const state = { '@type': 'State', name: a.state };
    return [
      state,
      ...a.cities.map((c) => ({
        '@type': 'City',
        name: c,
        containedInPlace: state,
      })),
    ];
  });
}

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
    areaServed: areaServed(),
    openingHoursSpecification: SITE.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days, opens: h.opens, closes: h.closes,
    })),
    ...(SITE.social.length ? { sameAs: SITE.social } : {}),
    // NOTE: no aggregateRating on purpose - self-serving review markup is discounted by Google.
  };
}

/**
 * One named person. `@id` is the anchor they render at on /team/, so the blog
 * author box and the Organization node can both point at the same entity
 * instead of describing them twice.
 */
export function person(m: (typeof TEAM)[number]) {
  return {
    '@type': 'Person',
    '@id': `${SITE.url}/team/#${m.slug}`,
    name: m.name,
    jobTitle: m.role,
    description: m.bio,
    worksFor: { '@id': ORG_ID },
    url: `${SITE.url}/team/#${m.slug}`,
    ...(m.avatar ? { image: `${SITE.url}/images/team/${m.avatar}.jpg` } : {}),
    ...(m.sameAs?.length ? { sameAs: m.sameAs } : {}),
  };
}

export function teamPeople() {
  return TEAM.map(person);
}

export function organisation() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon-512.png`,
    // Named people are the strongest trust signal this site can emit, and the
    // only one Google does not discount for being self-hosted the way it
    // discounts self-serving review markup. Referenced by @id so the full
    // Person nodes live once, on /team/, rather than being inlined on every page.
    ...(TEAM.length
      ? { employee: TEAM.map((m) => ({ '@id': `${SITE.url}/team/#${m.slug}` })) }
      : {}),
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
    areaServed: areaServed(),
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
