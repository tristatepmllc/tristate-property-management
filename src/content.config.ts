import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
      title: z.string().max(60),          // ~580px, the desktop SERP cut-off
      description: z.string().min(70).max(160),  // ~920px, the desktop snippet cut-off
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('Tristate Property Management'),
      category: z.string(),
      // path under /public/images, e.g. "/images/home-hvac.webp"
      cover: z.string(),
      coverAlt: z.string(),
      draft: z.boolean().default(false),
      // FAQ pairs become an FAQPage JSON-LD block on the post. Question-answer
      // pairs mapped to schema are the single highest-impact structure for
      // getting quoted by ChatGPT, Perplexity and AI Overviews.
      faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    }),
});

/**
 * Service detail pages.
 *
 * A collection rather than a data file because each page has to carry real
 * prose. The eight category blocks on /services/ are a catalogue - what we do.
 * These pages answer what a buyer actually asks before signing: how the work is
 * scoped, what drives the price, what is NOT included, and what goes wrong.
 * If a page here only restates its catalogue block it is duplicate content and
 * should not ship.
 *
 * `excludes` is required on purpose. Every competitor lists what is included;
 * almost none say where the scope stops, and that is the question a facility
 * manager is really asking. Making the field mandatory means a page cannot be
 * filled in without answering it.
 */
const services = defineCollection({
  loader: glob({ base: './src/content/services', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(39).max(60),
    description: z.string().min(70).max(160),
    /** Must match a slug in SERVICE_CATEGORIES - the route and schema rely on it. */
    category: z.enum([
      'cleaning', 'plumbing', 'electrical', 'hvac',
      'handyman', 'painting', 'grounds', 'projects',
    ]),
    h1: z.string(),
    /** One-line label above the H1. */
    kicker: z.string(),
    /** Lead paragraph. Shown under the H1 and reused as the card blurb. */
    summary: z.string(),
    cover: z.string(),
    coverAlt: z.string(),
    /** How the job is scoped and what moves the price. No figures unless real. */
    included: z.array(z.string()).min(3),
    excludes: z.array(z.string()).min(2),
    /** Building types this work most often runs in. */
    buildings: z.array(z.string()).min(3),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
    order: z.number(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Industry detail pages.
 *
 * Same reasoning as `services`, and the same failure to avoid. The eight cards
 * on /industries/ say what we do in each building type. These pages have to say
 * something the card cannot: what actually breaks in that building, what the
 * compliance regime is, and when work can physically happen. A page that only
 * expands its card into paragraphs is duplicate content.
 *
 * `constraints` is required and is the field that makes these pages different
 * from each other. Every building type has hours you cannot work, a rule you
 * cannot break, and a failure that costs more there than anywhere else - a
 * clinic and a warehouse do not share one of them. Making it mandatory stops
 * the page collapsing into generic facility-maintenance copy.
 *
 * `services` links each building back to the trades that run in it, which is
 * where the internal linking between the two collections comes from.
 */
const industries = defineCollection({
  loader: glob({ base: './src/content/industries', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(39).max(60),
    description: z.string().min(70).max(160),
    /** Stable slug for the route. */
    sector: z.enum([
      'offices', 'retail', 'restaurants', 'medical',
      'warehouse', 'schools', 'multifamily', 'dealerships',
    ]),
    /** Matches the card tag on /industries/ so the two pages agree. */
    tag: z.string(),
    name: z.string(),
    h1: z.string(),
    summary: z.string(),
    cover: z.string(),
    coverAlt: z.string(),
    /** What goes wrong in this building type specifically. */
    breaks: z.array(z.string()).min(3),
    /** Hours, rules and risks unique to it. The anti-generic field. */
    constraints: z.array(z.string()).min(2),
    /** SERVICE_CATEGORIES slugs that run most often here. */
    services: z.array(z.enum([
      'cleaning', 'plumbing', 'electrical', 'hvac',
      'handyman', 'painting', 'grounds', 'projects',
    ])).min(3),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
    order: z.number(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, services, industries };
