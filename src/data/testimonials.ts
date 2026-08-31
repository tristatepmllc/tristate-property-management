export type Testimonial = {
  /** The words the person actually said or wrote. Quote verbatim; do not tidy. */
  quote: string;
  name: string;
  /** Their job title. Shown under the company line. */
  role: string;
  /** Their company. Rendered as the accent line under the name. */
  company: string;
  /** Optional link to that company. Omit rather than guess a URL. */
  companyUrl?: string;
  /** Optional square image - a headshot or the company logo - served from
   *  /public/images/. When absent the card falls back to `initials`. */
  avatar?: string;
  avatarAlt?: string;
  /** Fallback when there is no avatar. Two letters. */
  initials: string;
};

/**
 * Real client quotes only, with permission. Add an entry and the homepage
 * reviews section, the carousel, the arrows and the dots all come back on their
 * own - no markup changes. While this array is empty the whole section is not
 * rendered and the sections after it flip background so the page keeps
 * alternating white and off-white.
 *
 * This file previously held seven invented testimonials with invented names and
 * job titles. Publishing a testimonial nobody gave is a deceptive practice under
 * the FTC's endorsement rules (16 CFR Part 255), and there was no SEO upside to
 * offset the risk: Google discounts self-hosted review markup, which is why this
 * site emits no AggregateRating. They have been removed rather than left in
 * place with a note, because a note in a source file does not reach the visitor
 * reading the quote.
 *
 * Where real ones come from: ask the client by email, quote them verbatim, keep
 * the reply. Reviews on the Google Business Profile are worth more than anything
 * self-hosted here and should be the first priority.
 *
 * The shape, for when a real one arrives:
 *
 *   {
 *     quote: 'Exactly what they wrote, unedited.',
 *     name: 'Full Name',
 *     role: 'Facilities Director',
 *     company: 'Their Company LLC',
 *     companyUrl: 'https://example.com',   // omit if you do not have it
 *     avatar: '/images/review-example.webp', // square; omit to use initials
 *     avatarAlt: 'Their Company LLC logo',
 *     initials: 'FN',
 *   }
 */
export const TESTIMONIALS: Testimonial[] = [];

/**
 * Trade partners who take our work orders, for /vendor-network/. Same rules,
 * same empty-means-hidden behaviour. Kept separate from TESTIMONIALS because a
 * vendor is a supplier, not a customer, and mixing the two would put a
 * plumber's quote on a page selling to building owners.
 */
export const PARTNER_TESTIMONIALS: Testimonial[] = [];
