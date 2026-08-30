export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  stars?: number;
};

/**
 * Real client quotes only, with permission. Add an entry and the homepage
 * reviews section, the carousel and its dots all come back on their own - no
 * markup changes. While this array is empty the whole section is not rendered
 * and the sections after it flip background so the page keeps alternating.
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
 */
export const TESTIMONIALS: Testimonial[] = [];
