export type Testimonial = {
  /** The words the person actually said or wrote. Quote verbatim; do not tidy. */
  quote: string;
  name: string;
  /** Their job title. Optional - omit it rather than invent one. Every entry
   *  below arrived without a title, and "Owner" guessed seven times would be
   *  seven fabrications sitting next to seven real quotes. */
  role?: string;
  /** Their company. Rendered as the accent line under the name. Optional,
   *  because one entry arrived as a business name with no individual. */
  company?: string;
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
/* ═══════════════════════════════════════════════════════════════════════
   DEMO CONTENT - REMOVE BEFORE THE SITE IS INDEXED
   ───────────────────────────────────────────────────────────────────────
   Added so the layout could be shown to the owner. These are NOT quotes
   anybody gave. Every name is literally "Sample", the companies are
   invented, and the section renders a visible line above the cards saying
   so, because a comment in a source file does not reach the visitor
   reading the card.

   To clear it: set DEMO_REVIEWS to false. That is the whole revert - the
   section stops rendering and the page rhythm goes back on its own.

   Replace with real client quotes, with permission. Publishing a
   testimonial nobody gave is a deceptive practice under 16 CFR Part 255,
   and unlabelled demo copy that nobody remembers to delete is how a site
   ends up doing that by accident rather than on purpose.
   ═══════════════════════════════════════════════════════════════════════ */
const DEMO: Testimonial[] = [
  {
    quote:
      'They took over four buildings for us in the same month and we have not had to chase a single work order since. One number, one invoice, and the same two technicians every time so nobody has to be shown the boiler room twice.',
    name: 'Sample Name One',
    role: 'Facilities Director',
    company: 'Sample Property Group',
    initials: 'S1',
  },
  {
    quote:
      'The written quote matched the final invoice to the dollar. After the last contractor that is the part I care about most.',
    name: 'Sample Name Two',
    role: 'Owner',
    company: 'Sample Retail Holdings',
    initials: 'S2',
  },
  {
    quote:
      'A pipe went in the ceiling at half past ten at night. Someone answered, someone was on site, and the tenants opened on time the next morning. That is the entire reason we moved everything across to them.',
    name: 'Sample Name Three',
    role: 'Regional Manager',
    company: 'Sample Management Co',
    initials: 'S3',
  },
  {
    quote:
      'We used to hold five separate vendor contracts for one building. Now there is one, and my month end takes an afternoon instead of a week.',
    name: 'Sample Name Four',
    role: 'Operations Lead',
    company: 'Sample Industrial Partners',
    initials: 'S4',
  },
  {
    quote:
      'They walked the property before quoting and found two things we had not asked about. Both would have cost us far more in six months.',
    name: 'Sample Name Five',
    role: 'Property Manager',
    company: 'Sample Multifamily LLC',
    initials: 'S5',
  },
];

/** The single switch. Set to false and the homepage reviews section is gone. */
export const DEMO_REVIEWS = true;

export const TESTIMONIALS: Testimonial[] = DEMO_REVIEWS ? DEMO : [];

/**
 * Passed to the section as its `note`, so the label is on the page rather than
 * only in this file. Becomes undefined the moment DEMO_REVIEWS is false, which
 * means there is no stale disclaimer left behind once real quotes go in.
 */
export const REVIEWS_NOTE: string | undefined = DEMO_REVIEWS
  ? 'Sample entries, shown so the layout can be reviewed. These are not real client quotes and will be replaced before this page goes live.'
  : undefined;

/**
 * Contractor quotes for /vendor-network/. Kept separate from TESTIMONIALS
 * because a vendor is a supplier, not a customer, and mixing the two would put
 * a contractor's quote on a page selling to building owners.
 *
 * READ THIS BEFORE ADDING OR MOVING ANY OF THESE.
 *
 * These quotes were given about Divisions and DMG, not about Tristate. Common
 * ownership is why they can appear here at all; it does not make them quotes
 * about Tristate. Two of them name the platform inside the quote itself - "the
 * DMG app", "working for Divisions" - and one names Fred Smith, who is a
 * Divisions contact. That is exactly why the section carries a `note` saying
 * where they come from: with the note they are accurate, and without it they
 * are misattributed. Do not remove the note, do not edit the brand names out of
 * the quotes, and do not move these to the homepage - a facility manager buying
 * janitorial work has no use for a contractor praising a job-dispatch app.
 *
 * Job titles are omitted throughout because none were supplied.
 */
export const PARTNER_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'We have worked with a lot of national companies over the last twenty five years. You guys are probably the best. My contact Fred Smith is a great person. He answers the phone and handles any problems we may have.',
    name: 'Joseph Collins',
    company: 'Busy Beaver Tree Care LLC',
    initials: 'JC',
  },
  {
    quote:
      "There's nothing better than having the DMG app to make money with. Managing jobs through a third party company like DMG holds both the customer and myself accountable and efficient.",
    name: 'Dale Joseph Nielsen',
    company: 'Grass and Lawn Ninjas',
    initials: 'DN',
  },
  {
    quote:
      'When we first started working for Divisions, we had 5 crews. Now we have over 20 crews working for us. I wish I could have more jobs from Divisions. I’d like to grow my company more.',
    name: 'Juan Ramirez',
    company: 'Blade Runners',
    initials: 'JR',
  },
  {
    quote:
      'When you work hard and you’re loyal, your opportunities are going to be there, and doors will be open. If you guys go south, I’ll go south. If you go to the moon, I’ll find a way and meet you there.',
    name: 'Alex Acosta',
    company: 'Art Landscaping',
    initials: 'AA',
  },
  {
    quote:
      'It’s great working with DMG. They help look out for contractors and help facilitate great relationships.',
    name: 'Christian Heilmeier',
    company: 'Hired Gunz Services LLC',
    initials: 'CH',
  },
  {
    quote:
      'I like the ability to work in different states to meet customer needs all across America.',
    name: 'Tim Baker',
    company: 'MAIN220',
    initials: 'TB',
  },
  {
    // Supplied as "CK Mobile / Welding" with no individual named, so it is
    // published as the business rather than guessing at a person.
    quote:
      'The most valuable assets are the 24/7 support, ease of on-site increases and job-site knowledge.',
    name: 'CK Mobile Welding',
    initials: 'CK',
  },
];
