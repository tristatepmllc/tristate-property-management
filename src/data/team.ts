/**
 * The leadership team.
 *
 * Single source for `/team/`, the Person schema in `lib/schema.ts` and the blog
 * author box. Same convention as `areaServed` and `TESTIMONIALS`: an empty
 * array renders nothing rather than rendering a placeholder.
 *
 * Two shape decisions worth keeping:
 *
 * 1. `bio` is third person, `quote` is first person. The source copy mixed the
 *    two - one third-person profile beside two first-person statements - which
 *    reads as three pages stapled together, and a quoted paragraph cannot go in
 *    a schema `description` field without the quotation marks travelling with
 *    it. So the substance sits in `bio` (prose, schema-safe) and the voice sits
 *    in `quote` (the line worth hearing in their own words). No content was
 *    dropped in the split.
 *
 * 2. `avatar` is optional. When it is absent the card falls back to initials,
 *    the same way `Testimonials.astro` already does. That matters here: if a
 *    photograph turns out to be stock or generated rather than the person
 *    named, delete the one line and the page is honest again with no other
 *    edit. A face nobody can verify sitting under a real name is the same
 *    failure the fabricated testimonials were.
 *
 * NOTE ON THE SOURCE COPY: the founder's supplied bio described experience
 * "across Massachusetts, Connecticut and Rhode Island". Rhode Island is not in
 * `SITE.areaServed`, and Arkansas, Florida and Illinois are. It is written here
 * as his own career history, which is what it is, rather than as a claim about
 * where the company works - those are different sentences and only one of them
 * has to match the coverage grid.
 */
export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  /**
   * The abbreviation, when the title has one people actually use. Rendered in
   * brackets after the full title and emitted alongside it in `jobTitle`,
   * because a person is searched for as "Antonio Spicer CEO", not as "Antonio
   * Spicer Chief Executive Officer". Leave unset when there is no real
   * abbreviation - inventing one for a title nobody shortens is noise.
   */
  roleShort?: string;
  /** Third person, 2-4 sentences. Feeds the card and the schema description. */
  bio: string;
  /** First person, one paragraph. Optional. */
  quote?: string;
  /** Path under /images/team/ without an extension. Omit for an initials card. */
  avatar?: string;
  initials: string;
  /** Only set once a public profile exists and has been checked. Feeds sameAs. */
  sameAs?: string[];
};

export const TEAM: TeamMember[] = [
  {
    slug: 'antonio-spicer',
    name: 'Antonio Spicer',
    role: 'Chief Executive Officer',
    roleShort: 'CEO',
    bio:
      'Antonio leads Tristate Property Management, bringing more than a decade of experience in property maintenance, preservation and field services built across Massachusetts, Connecticut and Rhode Island. He has spent that career building and running professional field teams, and his approach pairs hands-on trade knowledge with a focus on accountability, efficiency and quality control. Under his leadership the company works to earn long-term partnerships through dependable service, transparent communication and professional execution.',
    quote:
      'I want Tristate known for operational excellence and integrity - a company that holds the highest standard of service while it keeps growing its capability and its reach.',
    avatar: 'antonio-spicer',
    initials: 'AS',
  },
  {
    slug: 'erica-spicer',
    name: 'Erica Spicer',
    role: 'Client and Field Operations',
    bio:
      'Erica runs the link between clients and the crews on site. She makes sure every assignment is clearly communicated, properly coordinated and followed through from start to finish, and she works directly with the field teams so expectations are understood before anyone arrives. Her focus is on responsiveness and accountability, so clients can count on the company at the point where it matters most.',
    quote:
      'Great property management starts with great communication. My job is to make sure our clients feel supported, and that every detail is handled professionally from the first call to the closed work order.',
    avatar: 'erica-spicer',
    initials: 'ES',
  },
  {
    slug: 'shahan-shah',
    name: 'Md. Shahan Shah',
    role: 'Director of Operations',
    bio:
      'Shahan builds the operational foundation the company grows on, drawing on eight years inside national field-service environments where success depends on keeping people, processes and expectations aligned. He develops the contractor network, coordinates complex work orders and improves the internal systems that carry them, and he treats his role as the bridge between the client who expects a result and the field team delivering it.',
    quote:
      'Strong operations are what turn good service into a good client experience. I want Tristate known not simply for completing work, but for how professionally and consistently we deliver it.',
    avatar: 'shahan-shah',
    initials: 'MS',
  },
];

/** The person blog posts are attributed to. Null while nobody is nominated. */
export const EDITORIAL_LEAD = TEAM.find((m) => m.slug === 'antonio-spicer') ?? null;
