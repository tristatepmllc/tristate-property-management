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
  { slug: 'painting', name: 'Painting',
    blurb: 'Interior and exterior painting to refresh a property for sale, a new tenant or simply to stop weather damage getting in.' },
  { slug: 'pressure-washing', name: 'Pressure Washing',
    blurb: 'Siding, driveways, decks and walkways washed down so the property looks cared for from the street.' },
  { slug: 'exterior-maintenance', name: 'Exterior Maintenance',
    blurb: 'Gutters, siding, steps, fencing and other outside upkeep that keeps a property sound and stops small issues spreading.' },
];

export type PPCity = {
  slug: string;
  city: string;
  stateSlug: string;
  state: string;
  abbr: string;
  path: string;
  /** Page-hero background; reuses the existing service photo library. */
  heroImage: string;
  /** City-specific opening paragraph - what owning an empty property here is actually like. */
  intro: string;
  /** Local conditions that change the work. Each one should be true of this city, not every city. */
  local: { title: string; body: string }[];
  /** Neighbouring towns covered from the same crew. */
  nearby: string[];
  /** Rendered on the page and emitted as FAQPage JSON-LD. */
  faq: { q: string; a: string }[];
};

/**
 * City pages. Each one carries its own intro, local conditions, nearby towns
 * and FAQ so no two pages are the same template with the name swapped (thin
 * content that Google discounts). Keep `SITE.areaServed[].cities` in step:
 * a city page should not exist for a town the coverage grid does not list,
 * and vice versa.
 *
 * Content rule: describe the property conditions of the place, never claim
 * jobs, counts or response times here that have not been confirmed.
 */
export const PP_CITIES: PPCity[] = [
  // ---------------- Connecticut ----------------
  { slug: 'hartford', city: 'Hartford', stateSlug: 'connecticut', state: 'Connecticut', abbr: 'CT',
    path: '/hartford-property-preservation/', heroImage: '/images/home-grounds.webp',
    intro: 'A lot of the Hartford housing stock is older multi-family - two- and three-family houses with shared heating, long plumbing runs and porches that need watching. When one of these sits empty, a single frozen pipe or a missed snowfall can turn into a much bigger bill. We look after vacant, inherited and between-tenant properties across the city for owners who cannot get there themselves.',
    local: [
      { title: 'Winter is the real risk', body: 'Connecticut winters freeze an unheated house fast. We winterize properly - water off, lines drained, fixtures protected - or keep the heat on and check it, depending on what you need.' },
      { title: 'Multi-family turnover', body: 'Two- and three-family houses mean more units to clean, repair and re-key between tenants. We handle each unit to the same written scope so you can re-list without a site visit.' },
      { title: 'Snow and sidewalks', body: 'An empty property with an uncleared walk tells the street nobody is home. We can add snow clearing to a vacant-property plan so the house keeps looking occupied.' },
    ],
    nearby: ['West Hartford', 'East Hartford', 'Wethersfield', 'Newington', 'Bloomfield'],
    faq: [
      { q: 'Can you look after a Hartford property if I live out of state?', a: 'Yes. Most of our property preservation clients are not local. You get photos and a written report after every visit, and we call you before any work beyond the agreed scope.' },
      { q: 'Should I winterize a vacant house in Hartford or keep the heat on?', a: 'It depends how long it will sit and whether anyone is checking it. A fully winterized house is safest for a long vacancy; heat on with regular checks suits a short one or a property you are showing. We will walk you through both.' },
      { q: 'Do you handle multi-family properties?', a: 'Yes. Two- and three-family houses are common in Hartford, and we can clean, repair and re-key each unit separately or all at once.' },
    ] },
  { slug: 'new-haven', city: 'New Haven', stateSlug: 'connecticut', state: 'Connecticut', abbr: 'CT',
    path: '/new-haven-property-preservation/', heroImage: '/images/home-painting.webp',
    intro: 'New Haven has a large rental market built around the academic year, plenty of older wood-frame houses, and a shoreline that takes the weather off Long Island Sound. That combination means quick turnovers in summer, exterior upkeep that cannot wait, and storm prep for anything near the water. We cover vacant, rental and inherited properties across the city.',
    local: [
      { title: 'Academic-calendar turnover', body: 'Many leases end at the same time each summer. We clean, repair and paint units on a tight window so they are ready for the next tenant without you being there.' },
      { title: 'Older wood-frame houses', body: 'Siding, trim and porches on older houses need regular paint and repair. Leaving them is how small rot becomes a structural job.' },
      { title: 'Shoreline weather', body: 'Properties near the Sound see wind and storm damage. We can board up, secure and check a vacant house before and after a storm.' },
    ],
    nearby: ['West Haven', 'Hamden', 'East Haven', 'North Haven', 'Branford'],
    faq: [
      { q: 'Can you turn over a New Haven rental unit between leases?', a: 'Yes. We clean, patch, paint and handle minor repairs to a written scope, with photos when it is done, so you can re-list without visiting.' },
      { q: 'Do you check properties after a storm?', a: 'Yes. For vacant properties near the shore we can do a post-storm check with photos and secure anything that has been damaged.' },
      { q: 'What happens if you find something bigger than the job?', a: 'We stop, photograph it and call you with a written price before doing anything outside the agreed scope.' },
    ] },
  { slug: 'bridgeport', city: 'Bridgeport', stateSlug: 'connecticut', state: 'Connecticut', abbr: 'CT',
    path: '/bridgeport-property-preservation/', heroImage: '/images/home-projects.webp',
    intro: 'Bridgeport is the largest city in Connecticut, with dense multi-family neighbourhoods and a long shoreline on Long Island Sound. Vacant and foreclosed properties here need securing and regular attention, and anything near the water needs a storm plan. We handle cleanouts, board-ups, repairs and ongoing checks for owners, investors and estates.',
    local: [
      { title: 'Securing vacant properties', body: 'An empty house that looks empty attracts trouble. We change locks, board openings where needed and keep the outside tidy so the property does not stand out.' },
      { title: 'Foreclosure and estate cleanouts', body: 'We clear everything left behind, haul it away and leave the property broom-clean and ready for repairs, listing or sale.' },
      { title: 'Coastal storm exposure', body: 'For properties near the Sound we can secure before a storm and check afterwards, with photos either way.' },
    ],
    nearby: ['Stratford', 'Fairfield', 'Trumbull', 'Milford', 'Shelton'],
    faq: [
      { q: 'Do you do full cleanouts in Bridgeport?', a: 'Yes. Furniture, belongings and debris are removed and hauled away, and the property is left broom-clean. You get photos before and after.' },
      { q: 'Can you board up a vacant property?', a: 'Yes. We board and secure broken or vulnerable openings and change locks so you know who has access.' },
      { q: 'How do I get a price?', a: 'Send the address and what you need through the form on this page, or call. A written price comes back, usually the same working day.' },
    ] },
  // ---------------- Massachusetts ----------------
  { slug: 'boston', city: 'Boston', stateSlug: 'massachusetts', state: 'Massachusetts', abbr: 'MA',
    path: '/boston-property-preservation/', heroImage: '/images/home-handyman.webp',
    intro: 'Boston property ranges from triple-deckers and row houses to condos, and most of it is old. Nor\'easters, heavy snow and ice dams are part of every winter, and the city expects sidewalks cleared after a storm whether anyone lives there or not. We look after vacant, inherited and between-tenant properties for owners who cannot be there.',
    local: [
      { title: 'Snow, ice and ice dams', body: 'Heavy snow on an older roof, with no heat inside, is how ice dams and interior leaks start. We clear snow, check for ice build-up and report anything that needs a roofer.' },
      { title: 'Triple-deckers and older systems', body: 'Older multi-family buildings have plumbing and heating that need watching when units are empty. We check, winterize where needed and report every visit.' },
      { title: 'Keeping it looking occupied', body: 'Cleared walks, tidy entrances and regular visits keep a vacant property from standing out on a busy street.' },
    ],
    nearby: ['Cambridge', 'Somerville', 'Quincy', 'Brookline', 'Newton'],
    faq: [
      { q: 'Can you clear snow at a vacant Boston property?', a: 'Yes. We can add snow and ice clearing to a vacant-property plan so walks stay clear and the property keeps looking occupied.' },
      { q: 'Do you work on triple-deckers?', a: 'Yes. We can turn over, clean, repair and winterize each unit separately or the whole building.' },
      { q: 'Will I get proof the work was done?', a: 'Every visit ends with photos and a short written report, so you can see the property without being there.' },
    ] },
  { slug: 'springfield', city: 'Springfield', stateSlug: 'massachusetts', state: 'Massachusetts', abbr: 'MA',
    path: '/springfield-property-preservation/', heroImage: '/images/home-grounds.webp',
    intro: 'Springfield has a lot of older single-family houses and multi-family homes, many of them rentals or properties passed down in families. Western Massachusetts winters are hard on an empty house, and an overgrown yard in summer marks a property as vacant. We handle cleanouts, lawn care, winterization and repairs across Springfield and the surrounding towns.',
    local: [
      { title: 'Inherited and estate properties', body: 'Clearing a family home is hard to do from a distance. We clear it carefully, set aside anything you ask us to keep and leave the house ready to sell or rent.' },
      { title: 'Lawn and yard upkeep', body: 'Regular mowing and yard clean-up keep a vacant house from looking abandoned and help avoid complaints from neighbours or the city.' },
      { title: 'Freeze protection', body: 'Winterizing an empty house before the first hard freeze is far cheaper than repairing burst pipes after it.' },
    ],
    nearby: ['Chicopee', 'West Springfield', 'Holyoke', 'Agawam', 'Ludlow', 'Longmeadow'],
    faq: [
      { q: 'Do you do junk removal and cleanouts in Springfield?', a: 'Yes. Whole-house cleanouts, single rooms, garages and yard debris - removed, hauled away and the property left broom-clean.' },
      { q: 'Can you mow and maintain the lawn at a vacant property?', a: 'Yes. We can set up regular mowing and yard upkeep through the season so the property stays tidy.' },
      { q: 'Do you cover towns outside Springfield?', a: 'Yes, including Chicopee, West Springfield, Holyoke, Agawam, Ludlow and Longmeadow. If your town is not listed, ask.' },
    ] },
  { slug: 'worcester', city: 'Worcester', stateSlug: 'massachusetts', state: 'Massachusetts', abbr: 'MA',
    path: '/worcester-property-preservation/', heroImage: '/images/home-painting.webp',
    intro: 'Worcester is known for its triple-deckers, and a big share of the city\'s housing is older multi-family rental property. Hills, heavy snow and long winters make an empty building a risk if nobody is checking it. We turn over units, winterize, clean out and repair for landlords, investors and estates.',
    local: [
      { title: 'Triple-decker turnovers', body: 'Three units means three sets of cleaning, repairs and keys. We work to one written scope per unit and send photos when each is ready.' },
      { title: 'Winter checks', body: 'An unheated triple-decker can freeze floor by floor. We winterize or run regular heat-on checks, whichever fits how long it will sit.' },
      { title: 'Exterior upkeep', body: 'Porches, stairs, siding and gutters on older buildings need attention before they become a safety issue or a code complaint.' },
    ],
    nearby: ['Shrewsbury', 'Auburn', 'Leicester', 'Holden', 'Millbury'],
    faq: [
      { q: 'Can you turn over a Worcester triple-decker?', a: 'Yes. We can do one unit or all three - cleaning, minor repairs, painting and re-keying - with photos when each is done.' },
      { q: 'Do you repair porches and exterior stairs?', a: 'Minor repairs, yes. If we find something that needs a licensed specialist or a permit, we tell you and price it before going ahead.' },
      { q: 'How often should a vacant property be checked in winter?', a: 'It depends on whether it is winterized and how long it will sit. We will recommend a schedule when we see the property.' },
    ] },
  // ---------------- Florida ----------------
  { slug: 'jacksonville', city: 'Jacksonville', stateSlug: 'florida', state: 'Florida', abbr: 'FL',
    path: '/jacksonville-property-preservation/', heroImage: '/images/home-cleaning.webp',
    intro: 'Jacksonville covers a huge area, from the beaches to the west side, and a lot of property here belongs to owners who live somewhere else. Heat and humidity work on a closed-up house quickly, lawns grow fast, and hurricane season runs every year from June through November. We keep vacant and seasonal properties secure, tidy and checked.',
    local: [
      { title: 'Hurricane season', body: 'We can secure a vacant property before a storm and check it afterwards, with photos either way, so you know where things stand without travelling.' },
      { title: 'Humidity and mould', body: 'A closed-up house in Florida can grow mould fast. Regular checks catch leaks, damp and AC problems before they spread.' },
      { title: 'Fast-growing lawns', body: 'An overgrown yard is the quickest sign a house is empty and can bring code or HOA complaints. Regular mowing keeps it under control.' },
    ],
    nearby: ['Orange Park', 'Jacksonville Beach', 'Atlantic Beach', 'Neptune Beach', 'Fleming Island'],
    faq: [
      { q: 'Can you check my Jacksonville property after a hurricane?', a: 'Yes. We can do a post-storm check with photos, secure anything damaged and tell you what repairs are needed.' },
      { q: 'Do you look for mould and leaks on visits?', a: 'Yes. Each check looks for damp, leaks, AC problems and signs of mould, and anything we find is in the written report.' },
      { q: 'Can you keep the lawn up to HOA standards?', a: 'Yes. Tell us the HOA rules and we will set up mowing and yard upkeep to match.' },
    ] },
  { slug: 'orlando', city: 'Orlando', stateSlug: 'florida', state: 'Florida', abbr: 'FL',
    path: '/orlando-property-preservation/', heroImage: '/images/home-cleaning.webp',
    intro: 'The Orlando area has a large share of second homes, investor rentals and properties owned from out of state. Many sit empty for weeks or months at a time, often inside HOAs with strict rules on lawns and exteriors. Summer storms and hurricane season add to the list. We keep these properties checked, tidy and ready for the next guest, tenant or buyer.',
    local: [
      { title: 'Second homes and investor rentals', body: 'Between stays or tenants we clean, fix small issues and send photos so the property is ready without you flying in.' },
      { title: 'HOA standards', body: 'Lawns, exteriors and bins all get noticed by an HOA. We keep the property in line with the rules you give us.' },
      { title: 'Storms and AC', body: 'Afternoon storms, hurricane season and a failed AC in an empty house can all cause damage. Regular checks catch problems early.' },
    ],
    nearby: ['Kissimmee', 'Winter Park', 'Apopka', 'Sanford', 'Clermont'],
    faq: [
      { q: 'Can you prepare a vacation rental between guests?', a: 'Yes. We can clean, restock basics you supply, check for damage and send photos when it is ready.' },
      { q: 'Do you work inside HOA communities?', a: 'Yes. Send us the HOA rules and we keep lawn, exterior and bins in line with them.' },
      { q: 'What does a property check include?', a: 'Inside and out: doors and windows, leaks, AC and humidity, pests, lawn and any storm damage, with photos and a written report.' },
    ] },
  { slug: 'tampa', city: 'Tampa', stateSlug: 'florida', state: 'Florida', abbr: 'FL',
    path: '/tampa-property-preservation/', heroImage: '/images/home-projects.webp',
    intro: 'Tampa sits on the bay, and storm surge and heavy rain are real risks for low-lying property. Add Florida humidity and a big rental and investor market, and an empty house here needs regular attention. We handle securing, storm checks, cleanouts, lawn care and turnovers across Tampa and the surrounding area.',
    local: [
      { title: 'Storm surge and flooding', body: 'For property in low-lying areas we can secure ahead of a storm and check for water damage afterwards, with photos either way.' },
      { title: 'Rental and investor turnover', body: 'We clean, repair and prep units between tenants so they can be re-listed quickly.' },
      { title: 'Damp and pests', body: 'Closed-up houses in the heat attract damp and pests. Regular checks catch both before they become a repair bill.' },
    ],
    nearby: ['Brandon', 'Riverview', 'Temple Terrace', 'Lutz', 'Town \'n\' Country'],
    faq: [
      { q: 'Do you secure properties before a hurricane in Tampa?', a: 'Yes. We can board up, bring in or tie down loose items and check the property again once it is safe.' },
      { q: 'Can you do a cleanout after a tenant leaves?', a: 'Yes. We remove what is left, clean the unit and send photos so you can decide on any repairs.' },
      { q: 'How do I get started?', a: 'Use the form on this page or call. Give us the address and what you need, and a written price comes back, usually the same working day.' },
    ] },
  // ---------------- Rhode Island ----------------
  { slug: 'providence', city: 'Providence', stateSlug: 'rhode-island', state: 'Rhode Island', abbr: 'RI',
    path: '/providence-property-preservation/', heroImage: '/images/home-projects.webp',
    intro: 'Providence is full of older multi-family houses and has a large student rental market. New England winters, older heating and plumbing, and summer lease turnovers all put pressure on owners who are not nearby. We handle cleanouts, turnovers, winterization and repairs across the city.',
    local: [
      { title: 'Student rental turnover', body: 'Leases often end at the same time each year. We clean, repair and paint units on a tight window so they are ready for the next tenant.' },
      { title: 'Older multi-family buildings', body: 'Older systems and wood exteriors need regular checks when units sit empty, especially through winter.' },
      { title: 'Winterization', body: 'An unheated house can freeze quickly. We winterize properly or run heat-on checks, depending on how long it will sit.' },
    ],
    nearby: ['Cranston', 'Pawtucket', 'East Providence', 'North Providence', 'Johnston'],
    faq: [
      { q: 'Can you turn over student rentals in Providence?', a: 'Yes. Cleaning, minor repairs, painting and re-keying to a written scope, with photos when each unit is ready.' },
      { q: 'Do you winterize vacant houses?', a: 'Yes. We shut off and drain the water system and protect fixtures, or set up heat-on checks if you prefer.' },
      { q: 'Can you cover properties outside Providence?', a: 'Yes, including Cranston, Pawtucket, East Providence and North Providence. Ask about anywhere else in Rhode Island.' },
    ] },
  { slug: 'warwick', city: 'Warwick', stateSlug: 'rhode-island', state: 'Rhode Island', abbr: 'RI',
    path: '/warwick-property-preservation/', heroImage: '/images/home-painting.webp',
    intro: 'Warwick has miles of shoreline on Narragansett Bay and a lot of single-family houses, some of them seasonal or owned by families who have moved away. Coastal storms, salt air and winter freezes all take a toll on a house nobody is living in. We keep vacant and inherited properties secure, maintained and checked.',
    local: [
      { title: 'Coastal storms', body: 'Properties near the bay take wind and water. We can secure before a storm and check afterwards, with photos either way.' },
      { title: 'Exterior wear', body: 'Salt air and weather are hard on paint, siding and trim. Regular upkeep stops small damage becoming a bigger repair.' },
      { title: 'Seasonal and inherited homes', body: 'For a house used part of the year or waiting to be sold, we can set up regular checks, lawn care and winterization.' },
    ],
    nearby: ['Cranston', 'West Warwick', 'East Greenwich', 'Coventry'],
    faq: [
      { q: 'Can you check a seasonal home in Warwick while I am away?', a: 'Yes. We can visit on a regular schedule and after storms, with photos and a written report each time.' },
      { q: 'Do you do exterior painting?', a: 'Yes. Exterior painting and minor siding and trim repairs are part of our property preservation services.' },
      { q: 'Do you handle inherited properties?', a: 'Yes. We can clear the house, set aside anything you want kept, and leave it ready to sell or rent.' },
    ] },
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
