/**
 * The full service catalogue shown on /services/ (and summarised on every
 * service-area page).
 *
 * Ten categories, every service a client actually books with a property
 * maintenance company. Each service gets its own H3 on /services/ and a
 * one-line description written for that service, so the page answers the
 * exact phrase a person searches ("gutter cleaning", "lockbox installation",
 * "sprinkler winterization") instead of a generic paragraph.
 *
 * `detail` links a category to the long-form page that covers it in depth.
 * The older eight /services/<slug>/ pages keep their URLs (they are indexed)
 * and are mapped onto the closest category here.
 *
 * Location never changes the service list: one catalogue, every city.
 */

export type CatalogItem = { name: string; blurb: string; tag?: string };
export type CatalogCategory = {
  id: string;
  name: string;
  kicker: string;
  intro: string;
  image: string;
  detail?: { href: string; label: string };
  items: CatalogItem[];
};

export const SERVICE_CATALOG: CatalogCategory[] = [
  {
    id: 'exterior-maintenance',
    name: 'Exterior Maintenance',
    kicker: 'Lawn, roof, gutters and hardscape',
    intro: 'Everything outside the walls, from weekly lawn mowing to a roof replacement. The parts of a property the street, the tenant and the inspector see first.',
    image: '/images/services-landscaping-grounds-maintenance.webp',
    detail: { href: '/services/grounds/', label: 'Grounds and exterior in detail' },
    items: [
      { name: 'Lawn Mowing', blurb: 'Weekly or bi-weekly cuts at the right height for the season, clippings blown off walks and drives.', tag: 'Recurring' },
      { name: 'Grass Trimming and Edging', blurb: 'String trimming around fences, beds and posts, with crisp edges along curbs, walks and driveways.' },
      { name: 'Bush and Hedge Trimming', blurb: 'Shaping shrubs and hedges back off siding, windows and walkways, debris hauled away the same visit.' },
      { name: 'Tree Trimming and Removal', blurb: 'Dead limbs, branches over the roof and hazardous trees taken down safely, stumps ground on request.' },
      { name: 'Leaf Removal', blurb: 'Fall and spring leaf cleanups from lawns, beds and gutters so turf does not smother over winter.', tag: 'Seasonal' },
      { name: 'Weed Control', blurb: 'Pre-emergent and spot treatment for lawns, beds, cracks and gravel areas on a seasonal program.' },
      { name: 'Mulching', blurb: 'Fresh mulch spread at the right depth to hold moisture, block weeds and make beds look cared for.' },
      { name: 'Flower Bed Maintenance', blurb: 'Weeding, deadheading, edging and seasonal planting to keep beds tidy all season.' },
      { name: 'Sod Installation', blurb: 'Soil prep, grading and new sod laid for an instant lawn on bare, worn or newly graded ground.' },
      { name: 'Landscape Installation', blurb: 'New beds, shrubs, trees, stone borders and planting plans that suit the property and the climate.' },
      { name: 'Irrigation Repair', blurb: 'Broken heads, leaking valves, zone faults and controller problems found and fixed.' },
      { name: 'Sprinkler Winterization', blurb: 'Lines blown out with compressed air before the first freeze, then started up and checked in spring.', tag: 'Seasonal' },
      { name: 'Snow Removal', blurb: 'Plowing and shoveling for driveways, lots and walkways, triggered by snowfall depth you agree in advance.', tag: '24/7' },
      { name: 'Ice Management and Salting', blurb: 'Pre-treatment and salting of walks, steps and lots to cut slip-and-fall risk through the winter.', tag: '24/7' },
      { name: 'Gutter Cleaning', blurb: 'Gutters and downspouts cleared and flushed so water leaves the roof and away from the foundation.' },
      { name: 'Gutter Repair and Installation', blurb: 'Re-pitching, resealing seams, replacing damaged runs and installing new seamless gutters and guards.' },
      { name: 'Roof Inspection', blurb: 'A documented roof check with photos: shingles, flashing, vents and signs of leaks, before they reach the ceiling.' },
      { name: 'Roof Repair', blurb: 'Missing shingles, failed flashing, leaks around chimneys and vents repaired and sealed.' },
      { name: 'Roof Replacement', blurb: 'Full tear-off and new roof on homes and small commercial buildings, permit and cleanup included.' },
      { name: 'Siding Repair', blurb: 'Cracked, loose or storm-damaged vinyl, wood and fiber cement siding replaced and matched.' },
      { name: 'Fence Repair and Installation', blurb: 'Leaning posts, broken pickets and failed gates repaired, or new wood, vinyl and chain-link fence installed.' },
      { name: 'Deck Repair and Staining', blurb: 'Rotted boards, loose railings and failing stairs fixed, then cleaned and stained to protect the wood.' },
      { name: 'Porch Repair', blurb: 'Soft floors, failing steps, posts and railings on front and back porches repaired to code.' },
      { name: 'Driveway Repair', blurb: 'Potholes, cracks and sunken sections patched on asphalt and concrete drives.' },
      { name: 'Asphalt Sealcoating', blurb: 'Crack filling and sealcoat to protect asphalt drives and lots from water, salt and UV.' },
      { name: 'Concrete Repair', blurb: 'Cracked, spalled and settled concrete steps, pads and slabs repaired or replaced.' },
      { name: 'Sidewalk Repair', blurb: 'Trip hazards and heaved sidewalk panels ground, patched or replaced to clear code violations.' },
      { name: 'Pressure Washing', blurb: 'Siding, decks, driveways, walkways and patios cleaned of grime, mildew and algae.' },
      { name: 'Exterior Painting', blurb: 'Scraping, priming and painting siding, trim, doors and railings to stop weather getting in.' },
      { name: 'Exterior Window Cleaning', blurb: 'Outside glass, frames and screens cleaned on homes and low-rise buildings.' },
      { name: 'Garage Door Repair', blurb: 'Broken springs, off-track doors, failed openers and damaged panels repaired.' },
      { name: 'Mailbox Installation', blurb: 'Post and wall-mounted mailboxes installed or replaced to USPS height and setback rules.' },
      { name: 'Handrail Installation', blurb: 'Code-compliant handrails on exterior steps, porches and ramps, wood or metal.' },
      { name: 'Exterior Lighting Repair', blurb: 'Porch lights, floodlights, motion sensors and pathway lighting fixed for safety and security.' },
    ],
  },
  {
    id: 'interior-maintenance',
    name: 'Interior Maintenance',
    kicker: 'Handyman, walls, floors and doors',
    intro: 'The everyday repairs inside a home, rental or office. One technician who can patch the wall, rehang the door and fix the cabinet in a single visit.',
    image: '/images/home-handyman.webp',
    detail: { href: '/services/handyman/', label: 'Handyman and repairs in detail' },
    items: [
      { name: 'General Handyman Services', blurb: 'A punch list of small repairs handled in one visit instead of five separate trades.', tag: 'Most booked' },
      { name: 'Drywall Repair', blurb: 'Holes, cracks, water-damaged sections and nail pops patched, textured and ready for paint.' },
      { name: 'Interior Painting', blurb: 'Walls, ceilings, trim and doors painted with furniture protected and the room left clean.' },
      { name: 'Flooring Installation', blurb: 'Luxury vinyl plank, laminate, hardwood and tile installed over a properly prepared subfloor.' },
      { name: 'Tile Repair', blurb: 'Cracked or loose tiles replaced, grout renewed and showers and backsplashes resealed.' },
      { name: 'Carpet Cleaning', blurb: 'Hot water extraction and spot treatment for move-outs, high-traffic rooms and pet stains.' },
      { name: 'Door Repair and Installation', blurb: 'Sticking, sagging and damaged interior and entry doors repaired, rehung or replaced.' },
      { name: 'Window Repair', blurb: 'Broken glass, failed seals, stuck sashes, balances and locks repaired.' },
      { name: 'Cabinet Repair', blurb: 'Hinges, drawer slides, doors and damaged cabinet boxes repaired or adjusted.' },
      { name: 'Trim and Molding Installation', blurb: 'Baseboards, casing and crown molding installed, caulked and finished.' },
      { name: 'Ceiling Repair', blurb: 'Water stains, sagging drywall and cracked plaster ceilings repaired and refinished.' },
      { name: 'Appliance Installation', blurb: 'Dishwashers, ranges, washers, dryers and microwaves installed and connected.' },
      { name: 'Furniture Assembly', blurb: 'Desks, shelving, beds and office furniture assembled and anchored where needed.' },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    kicker: 'Leaks, drains, fixtures and water heaters',
    intro: 'From a dripping faucet to a burst pipe. Licensed plumbers for homes, rentals and commercial buildings, with emergency callout around the clock.',
    image: '/images/services-leak-detection-pipe-repair.webp',
    detail: { href: '/services/plumbing/', label: 'Plumbing in detail' },
    items: [
      { name: 'Faucet Replacement', blurb: 'Leaking or worn kitchen and bathroom faucets replaced, supply lines included.' },
      { name: 'Toilet Repair and Installation', blurb: 'Running, rocking and leaking toilets repaired, or new toilets set with a fresh wax seal.' },
      { name: 'Sink Installation', blurb: 'Kitchen, bathroom and utility sinks installed and connected to supply and drain.' },
      { name: 'Garbage Disposal Replacement', blurb: 'Jammed, leaking or dead disposals removed and replaced with the right size unit.' },
      { name: 'Water Heater Replacement', blurb: 'Tank and tankless water heaters replaced, with venting and code items brought up to date.' },
      { name: 'Pipe Repair', blurb: 'Leaking, corroded and frozen pipes repaired or replaced in copper, PEX and PVC.', tag: '24/7' },
      { name: 'Leak Detection', blurb: 'Hidden leaks behind walls, under slabs and in ceilings located before opening anything up.' },
      { name: 'Drain Cleaning', blurb: 'Slow and clogged sink, tub, floor and main drains cleared by snake or hydro jetting.' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    kicker: 'Fixtures, outlets, panels and safety',
    intro: 'Licensed electricians for the repairs and upgrades a property needs to stay safe and pass inspection.',
    image: '/images/services-outlet-switch-circuit-repair.webp',
    detail: { href: '/services/electrical/', label: 'Electrical in detail' },
    items: [
      { name: 'Light Fixture Replacement', blurb: 'Old, broken or inefficient fixtures swapped for new LED fixtures, indoors and out.' },
      { name: 'Ceiling Fan Installation', blurb: 'New fans installed on a fan-rated box, with wall control or remote.' },
      { name: 'Outlet and Switch Replacement', blurb: 'Dead, loose, scorched or outdated outlets and switches replaced.' },
      { name: 'GFCI Installation', blurb: 'GFCI protection added in kitchens, baths, garages and exteriors to meet code and pass inspection.' },
      { name: 'Breaker Replacement', blurb: 'Tripping, worn or failed breakers diagnosed and replaced in the panel.' },
      { name: 'Smoke Detector Installation', blurb: 'Smoke and carbon monoxide detectors installed and tested to state and local requirements.' },
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    kicker: 'Heating, cooling and air quality',
    intro: 'Seasonal maintenance that prevents the expensive failures, and fast repair when a system goes down in the worst week of the year.',
    image: '/images/home-hvac.webp',
    detail: { href: '/services/hvac/', label: 'HVAC in detail' },
    items: [
      { name: 'HVAC Filter Replacement', blurb: 'Filters changed on a schedule so systems run efficiently and air stays clean.', tag: 'Recurring' },
      { name: 'Furnace Maintenance', blurb: 'Pre-season furnace tune-up: burners, ignition, flue, safeties and a carbon monoxide check.' },
      { name: 'Air Conditioner Servicing', blurb: 'Coil cleaning, refrigerant checks, drain lines and electrical tested before summer.' },
      { name: 'Thermostat Installation', blurb: 'Programmable and smart thermostats installed and set up for occupied or vacant schedules.' },
      { name: 'Vent Cleaning', blurb: 'Supply and return vents, registers and dryer vents cleaned to improve airflow and cut fire risk.' },
    ],
  },
  {
    id: 'cleaning-services',
    name: 'Cleaning Services',
    kicker: 'Homes, offices and turnovers',
    intro: 'Scheduled and one-time cleaning for homes, rentals, offices and job sites, with a checklist signed off at the end of every visit.',
    image: '/images/services-office-commercial-cleaning.webp',
    detail: { href: '/services/cleaning/', label: 'Cleaning in detail' },
    items: [
      { name: 'Residential Cleaning', blurb: 'Recurring or one-time house cleaning: kitchens, bathrooms, floors and dusting throughout.' },
      { name: 'Commercial Cleaning', blurb: 'Offices, retail and common areas cleaned on a schedule built around your hours.', tag: 'Contract' },
      { name: 'Move-In/Move-Out Cleaning', blurb: 'Empty-unit cleaning inside cabinets, appliances and fixtures so the next tenant or buyer walks into a clean home.' },
      { name: 'Deep Cleaning', blurb: 'Top-to-bottom cleaning of baseboards, grout, appliances and every surface a regular clean skips.' },
      { name: 'Post-Construction Cleaning', blurb: 'Dust, debris, paint and adhesive removed after a renovation or build-out, ready for occupancy.' },
      { name: 'Window Cleaning', blurb: 'Interior and exterior glass, sills and tracks cleaned streak-free.' },
      { name: 'Pressure Washing', blurb: 'Entrances, dumpster pads, sidewalks and building fronts washed down.' },
      { name: 'Carpet Cleaning', blurb: 'Commercial and residential carpets extracted and spot-treated, scheduled after hours.' },
    ],
  },
  {
    id: 'property-preservation',
    name: 'Property Preservation (Vacant and REO)',
    kicker: 'Vacant, REO and foreclosure properties',
    intro: 'Securing, maintaining and documenting vacant and bank-owned properties to investor and servicer standards, with date-stamped photos on every order.',
    image: '/images/home-grounds.webp',
    detail: { href: '/property-preservation/', label: 'Property preservation in detail' },
    items: [
      { name: 'Lock Change', blurb: 'Locks re-keyed or replaced on entry doors so only the owner and approved parties have access.', tag: 'Most booked' },
      { name: 'Lockbox Installation', blurb: 'Combination and key lockboxes installed for agents, inspectors and vendors.' },
      { name: 'Initial Secure', blurb: 'First visit to a vacant property: locks changed, openings secured, condition photographed and reported.' },
      { name: 'Board-Up Services', blurb: 'Broken windows and doors boarded to secure the property against entry and weather.' },
      { name: 'Winterization', blurb: 'Water shut off, lines drained and blown out, fixtures treated with antifreeze and the property tagged.', tag: 'Seasonal' },
      { name: 'Dewinterization', blurb: 'Water restored, system pressure-tested and fixtures checked before showing, sale or move-in.' },
      { name: 'Trash-Out/Clean-Out', blurb: 'Everything left behind removed and hauled away, cubic yards recorded and photographed.' },
      { name: 'Debris Removal', blurb: 'Interior and exterior debris, yard waste and construction materials removed and disposed of.' },
      { name: 'Hazard Removal', blurb: 'Health and safety hazards cleared: broken glass, chemicals, exposed wiring and trip hazards.' },
      { name: 'Personal Property Removal', blurb: 'Personal belongings removed, inventoried or stored according to the servicer or estate instructions.' },
      { name: 'Maid Service', blurb: 'Sales-clean of a vacant home before listing: kitchen, baths, floors and windows.' },
      { name: 'Lawn Maintenance', blurb: 'Recurring cuts on vacant properties to keep them compliant with local ordinances.', tag: 'Recurring' },
      { name: 'Shrub Trimming', blurb: 'Overgrown shrubs cut back off the house, walkways and windows on vacant properties.' },
      { name: 'Pool Securing', blurb: 'Pools covered, fenced or drained and treated to remove safety and mosquito hazards.' },
      { name: 'Tarp Installation', blurb: 'Roof tarps installed over leaks or storm damage to stop water getting in until repair.' },
      { name: 'Roof Emergency Repair', blurb: 'Active roof leaks on vacant properties patched fast to protect the interior.' },
      { name: 'Mold Treatment', blurb: 'Surface mold cleaned and treated, the moisture source identified and documented.' },
      { name: 'Pest Control', blurb: 'Rodent, insect and wildlife problems treated and entry points sealed.' },
      { name: 'Utility Checks', blurb: 'Water, gas and electric status verified and reported on vacant properties.' },
      { name: 'Occupancy Verification', blurb: 'Drive-by and door-knock checks to confirm whether a property is occupied or vacant.' },
      { name: 'Property Inspections', blurb: 'Scheduled condition inspections with photo reports for owners, lenders and servicers.' },
      { name: 'Photo Documentation', blurb: 'Before, during and after photos, date-stamped and organised for every work order.' },
      { name: 'Bid/Estimate Submission', blurb: 'Itemised bids with photos and measurements for repairs outside the standard allowable.' },
      { name: 'Code Violation Correction', blurb: 'Municipal code violations corrected and documented so fines stop and the case closes.' },
    ],
  },
  {
    id: 'repairs-renovations',
    name: 'Repairs and Renovations',
    kicker: 'Remodels, rehabs and replacements',
    intro: 'Bigger projects for owners, investors and landlords: a kitchen remodel, a rental rehab or a new roof, run by one project lead from start to finish.',
    image: '/images/home-projects.webp',
    detail: { href: '/services/projects/', label: 'Restoration and projects in detail' },
    items: [
      { name: 'Kitchen Remodeling', blurb: 'Cabinets, countertops, backsplash, flooring and lighting, from a refresh to a full remodel.' },
      { name: 'Bathroom Remodeling', blurb: 'Tub-to-shower conversions, vanities, tile and fixtures upgraded in one coordinated project.' },
      { name: 'Basement Finishing', blurb: 'Framing, insulation, drywall, flooring and lighting to turn a basement into usable space.' },
      { name: 'Painting', blurb: 'Whole-home and whole-unit repaints, interior and exterior, for sale, lease or refresh.' },
      { name: 'Flooring Replacement', blurb: 'Worn carpet and damaged floors torn out and replaced with durable, rental-ready flooring.' },
      { name: 'Roofing', blurb: 'Roof replacement and major roof repair on homes and small commercial buildings.' },
      { name: 'Siding', blurb: 'New vinyl and fiber cement siding installed, or damaged sections replaced and matched.' },
      { name: 'Deck Construction', blurb: 'New decks built to code with footings, framing, railings and stairs.' },
      { name: 'Window Replacement', blurb: 'Energy-efficient replacement windows installed and sealed against drafts and water.' },
      { name: 'Door Replacement', blurb: 'Entry, patio, storm and interior doors replaced for security and efficiency.' },
    ],
  },
  {
    id: 'commercial-property-services',
    name: 'Commercial Property Services',
    kicker: 'Offices, retail and multi-tenant buildings',
    intro: 'Facility maintenance for commercial buildings and portfolios. One contract, one number and one invoice across every site.',
    image: '/images/home-offices.webp',
    detail: { href: '/services/commercial/', label: 'Commercial property services in detail' },
    items: [
      { name: 'Building Maintenance', blurb: 'Planned and reactive maintenance across every trade, tracked by work order and site.', tag: 'Contract' },
      { name: 'Parking Lot Maintenance', blurb: 'Sweeping, pothole repair, sealcoating, striping and lighting for commercial lots.' },
      { name: 'Graffiti Removal', blurb: 'Graffiti removed or painted out quickly from walls, doors and signage.' },
      { name: 'Common Area Cleaning', blurb: 'Lobbies, hallways, stairwells, elevators and restrooms cleaned on a set schedule.' },
      { name: 'Landscape Maintenance', blurb: 'Commercial grounds maintained season-round so the property makes a good first impression.' },
      { name: 'Building Inspections', blurb: 'Condition inspections of roofs, envelopes and systems with a prioritised repair list.' },
      { name: 'Emergency Repairs', blurb: 'A single number for after-hours failures across your whole portfolio.', tag: '24/7' },
    ],
  },
  {
    id: 'emergency-services',
    name: 'Emergency Services',
    kicker: 'Storm, flood and fire response',
    intro: 'When something has just gone wrong. Crews dispatched around the clock to make the property safe, stop the damage and document it for the insurer.',
    image: '/images/home-something-broken-right-now.webp',
    detail: { href: '/services/emergency/', label: 'Emergency services in detail' },
    items: [
      { name: 'Storm Damage Cleanup', blurb: 'Debris, downed limbs and damaged materials cleared after storms, with damage photographed for claims.', tag: '24/7' },
      { name: 'Flood Cleanup', blurb: 'Standing water removed, wet materials taken out and the space prepared for drying.', tag: '24/7' },
      { name: 'Water Extraction', blurb: 'Truck-mounted and portable extraction to pull water from carpet, pads and floors fast.', tag: '24/7' },
      { name: 'Fire Damage Cleanup', blurb: 'Debris removal, board-up and cleaning of soot-damaged areas after a fire.' },
      { name: 'Emergency Board-Up', blurb: 'Windows and doors boarded the same day after break-ins, accidents or storm damage.', tag: '24/7' },
      { name: 'Emergency Roof Tarping', blurb: 'Tarps secured over damaged roofs to stop water entering until permanent repair.', tag: '24/7' },
      { name: 'Fallen Tree Removal', blurb: 'Trees on roofs, cars, fences and driveways cut and removed safely.', tag: '24/7' },
    ],
  },
];

/** The 20 services property owners request most, in order. Linked to the catalogue. */
export const MOST_REQUESTED: { name: string; anchor: string }[] = [
  { name: 'Lawn care', anchor: 'exterior-maintenance' },
  { name: 'Lock changes', anchor: 'property-preservation' },
  { name: 'Trash-outs', anchor: 'property-preservation' },
  { name: 'Initial secure', anchor: 'property-preservation' },
  { name: 'Winterization', anchor: 'property-preservation' },
  { name: 'Gutter cleaning', anchor: 'exterior-maintenance' },
  { name: 'Roof repairs', anchor: 'exterior-maintenance' },
  { name: 'Pressure washing', anchor: 'exterior-maintenance' },
  { name: 'Handyman repairs', anchor: 'interior-maintenance' },
  { name: 'Drywall repair', anchor: 'interior-maintenance' },
  { name: 'Painting', anchor: 'repairs-renovations' },
  { name: 'Plumbing repairs', anchor: 'plumbing' },
  { name: 'Electrical repairs', anchor: 'electrical' },
  { name: 'Carpet cleaning', anchor: 'cleaning-services' },
  { name: 'Window cleaning', anchor: 'cleaning-services' },
  { name: 'Occupancy inspections', anchor: 'property-preservation' },
  { name: 'Bid/estimate requests', anchor: 'property-preservation' },
  { name: 'Fence repairs', anchor: 'exterior-maintenance' },
  { name: 'Deck repairs', anchor: 'exterior-maintenance' },
  { name: 'General property maintenance', anchor: 'commercial-property-services' },
];

/** Total distinct services (duplicates across categories counted once). */
export const SERVICE_COUNT: number = new Set(
  SERVICE_CATALOG.flatMap((c) => c.items.map((i) => i.name.toLowerCase()))
).size;

/** Category names for lead-form dropdowns. */
export const SERVICE_OPTIONS: string[] = SERVICE_CATALOG.map((c) => c.name);
