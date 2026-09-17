/**
 * Property Preservation - the homeowner-facing vertical, sitting alongside
 * the commercial `SERVICE_CATEGORIES` catalogue rather than inside it.
 *
 * Audience is different (a homeowner, an estate executor, an agent or
 * investor holding a vacant property - not a facility manager), so this is
 * kept as its own small data file rather than forcing it into
 * `SERVICE_CATEGORIES` / the `services` content collection, which is typed
 * and schema-wired around commercial "buildings" and "industries" language
 * that does not fit a vacant single-family house.
 *
 * `PP_SERVICES` powers the grid on /property-preservation/ and the service
 * dropdown on every property-preservation lead form (state pages included).
 * `PP_STATES` powers the four state landing pages - added 2026-09 per
 * client direction to lead homeowner marketing with CT / MA / FL / RI while
 * IL / AR stay in `SITE.areaServed` as the secondary commercial pair.
 */

export type PPService = {
  slug: string;
  name: string;
  blurb: string;
};

export const PP_SERVICES: PPService[] = [
  { slug: 'vacant-property-maintenance', name: 'Vacant Property Maintenance',
    blurb: 'Regular checks and upkeep on a property nobody is living in right now, so small problems get caught before they become expensive ones.' },
  { slug: 'foreclosure-cleanup', name: 'Foreclosure Cleanup',
    blurb: 'Clearing and cleaning a property after foreclosure so it is safe, presentable and ready to list or re-occupy.' },
  { slug: 'estate-inherited-property-cleanup', name: 'Estate / Inherited Property Cleanup',
    blurb: 'Clearing a property you have inherited or are settling on behalf of an estate, handled carefully and on your timeline.' },
  { slug: 'property-cleanout', name: 'Property Cleanout',
    blurb: 'Full interior cleanout - furniture, belongings, accumulated debris - leaving the property empty and broom-clean.' },
  { slug: 'debris-removal', name: 'Debris Removal',
    blurb: 'Hauling away yard waste, construction debris, or anything else left on the property, inside or out.' },
  { slug: 'lawn-maintenance', name: 'Lawn Maintenance',
    blurb: 'Mowing, trimming and general yard upkeep so a vacant property does not stand out on the street as unattended.' },
  { slug: 'winterization', name: 'Winterization',
    blurb: 'Shutting down water systems and protecting a vacant property against freeze damage over the cold months.' },
  { slug: 'board-up-securing', name: 'Board-up & Securing',
    blurb: 'Boarding windows and doors and otherwise securing a vacant property against entry, weather and vandalism.' },
  { slug: 'lock-change', name: 'Lock Change',
    blurb: 'Re-keying or replacing locks so you know exactly who can get into the property.' },
  { slug: 'minor-repairs', name: 'Minor Repairs',
    blurb: 'Small fixes - a leak, a broken step, a damaged door - handled before they turn into a bigger repair or a failed inspection.' },
  { slug: 'property-inspection', name: 'Property Inspection',
    blurb: 'A scheduled walk-through with photos and a written report, so you know the condition of a property you cannot check on yourself.' },
  { slug: 'rental-turnover', name: 'Rental Turnover',
    blurb: 'Cleaning and repairs between tenants so the unit is ready to re-list with as little vacancy time as possible.' },
];

export type PPCity = {
  slug: string;
  city: string;
  stateSlug: string;
  state: string;
  abbr: string;
  path: string;
};

/**
 * First flagship city per primary state - matches the one city each state
 * in `SITE.areaServed` carries so far (added 2026-09). More metros can be
 * added to both places together as they are confirmed; a city page should
 * not exist for a town `SITE.areaServed` does not also list, and vice versa,
 * or the coverage grid and the page set drift apart.
 */
export const PP_CITIES: PPCity[] = [
  { slug: 'hartford', city: 'Hartford', stateSlug: 'connecticut', state: 'Connecticut', abbr: 'CT',
    path: '/hartford-property-preservation/' },
  { slug: 'boston', city: 'Boston', stateSlug: 'massachusetts', state: 'Massachusetts', abbr: 'MA',
    path: '/boston-property-preservation/' },
  { slug: 'jacksonville', city: 'Jacksonville', stateSlug: 'florida', state: 'Florida', abbr: 'FL',
    path: '/jacksonville-property-preservation/' },
  { slug: 'providence', city: 'Providence', stateSlug: 'rhode-island', state: 'Rhode Island', abbr: 'RI',
    path: '/providence-property-preservation/' },
];

export type PPState = {
  slug: string;
  state: string;
  abbr: string;
  path: string;
  blurb: string;
};

/**
 * The four primary homeowner-marketing states. Order matches the priority
 * given: Connecticut, Massachusetts, Florida, Rhode Island.
 */
export const PP_STATES: PPState[] = [
  { slug: 'connecticut', state: 'Connecticut', abbr: 'CT', path: '/connecticut-property-preservation/',
    blurb: 'Vacant property maintenance, cleanouts and winterization across Connecticut - built for owners who are not local to the property.' },
  { slug: 'massachusetts', state: 'Massachusetts', abbr: 'MA', path: '/massachusetts-property-preservation/',
    blurb: 'Property preservation for vacant, inherited and foreclosed properties across Massachusetts.' },
  { slug: 'florida', state: 'Florida', abbr: 'FL', path: '/florida-property-preservation/',
    blurb: 'Property preservation across Florida, including seasonal and out-of-state owner properties left unoccupied part of the year.' },
  { slug: 'rhode-island', state: 'Rhode Island', abbr: 'RI', path: '/rhode-island-property-preservation/',
    blurb: 'Vacant property maintenance, cleanouts and preservation services across Rhode Island.' },
];
