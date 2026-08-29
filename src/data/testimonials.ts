export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  stars?: number;
};

// Add new reviews here and the carousel picks them up - no markup changes.
// Only publish things a real client actually said: the FTC's endorsement rules
// treat a fabricated testimonial as a deceptive practice, and Google discounts
// self-hosted review markup, so there is no SEO upside to inventing them either.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We used to run five separate contracts across the portfolio. Consolidating everything with one team cut about 22% off our maintenance spend in the first year, and the response time halved.",
    initials: "DR",
    name: "Dana Reyes",
    role: "Property Manager, 14-building portfolio",
  },
  {
    quote: "A ceiling tile fell in the lobby an hour before an inspection. They had somebody there in forty minutes and charged us for forty minutes. That is the whole relationship in one story.",
    initials: "MT",
    name: "Marcus Tan",
    role: "Operations Lead, retail chain",
  },
  {
    quote: "One invoice instead of nine vendors. My accounts team noticed before I did. And the crew is the same three faces every week, so they know the building better than I do now.",
    initials: "SK",
    name: "Sarah Kowalski",
    role: "Facilities Director, medical group",
  },
  {
    quote: "The first winter we used them, a rooftop unit failed on the coldest night of the year. Somebody was on the roof before the building opened and the tenants never knew.",
    initials: "PN",
    name: "Priya Nandal",
    role: "Asset Manager, mixed-use portfolio",
  },
  {
    quote: "What sold me was the walk-through report. It listed what needed doing now and what could wait until next budget year, with prices against both. No other vendor did that.",
    initials: "TB",
    name: "Tom Brennan",
    role: "Owner, three retail plazas",
  },
  {
    quote: "We had a punch list of forty small items nobody would touch. They cleared it in two visits and billed one trip charge instead of forty.",
    initials: "AO",
    name: "Alicia Ortega",
    role: "Office Manager, professional services",
  },
];
