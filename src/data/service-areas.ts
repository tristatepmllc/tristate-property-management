/**
 * Service areas: /service-areas/ -> /service-areas/<state>/ -> /service-areas/<state>/<city>/
 *
 * One page per city, all offering the same service catalogue (services are
 * never split by location). What makes each city page its own page rather
 * than a template with the name swapped:
 *   - `note`: one or two sentences about the housing stock or local
 *     conditions in that city, written for that city only
 *   - `county`, and nearby towns from the same `region`
 *   - the state block: climate, the seasonal work that matters there, and
 *     state-specific FAQ answers
 *
 * Built in batches (Google treats hundreds of near-identical city pages as
 * doorway pages). Add a city only with a real `note`.
 *
 * `pp` links a city to its older, deeper property-preservation page.
 */

export type AreaCity = {
  name: string;
  county: string;
  region: string;
  note: string;
  pp?: string;
};

export type AreaState = {
  slug: string;
  name: string;
  abbr: string;
  intro: string;
  climate: string;
  seasonal: { title: string; body: string }[];
  /** State-specific answer used in every city FAQ for that state. */
  vacantFaq: string;
  cities: AreaCity[];
};

export const citySlug = (name: string): string =>
  name.toLowerCase().replace(/['.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const FREEZE_SEASONAL = (state: string) => [
  { title: 'Winterization before the first freeze', body: `${state} winters freeze pipes in any vacant or under-heated property. Lines drained and blown out, fixtures treated and the property tagged before the cold arrives.` },
  { title: 'Snow removal and ice management', body: 'Driveways, walks and lots plowed and salted on a trigger you agree in advance, so the property stays safe and compliant with local shoveling rules.' },
  { title: 'Spring dewinterization and cleanup', body: 'Water back on and pressure-tested, gutters cleared of winter debris, lawns and beds brought back for the growing season.' },
];

export const AREA_STATES: AreaState[] = [
  {
    slug: 'connecticut', name: 'Connecticut', abbr: 'CT',
    intro: 'Property maintenance, repairs and property preservation across Connecticut, from Hartford County to the Fairfield County shoreline.',
    climate: 'Connecticut properties deal with four real seasons: nor\'easters and heavy snow in winter, freeze-thaw cycles that crack concrete and heave walkways, humid summers and coastal storms along Long Island Sound. Much of the housing stock is older colonial, Cape and multifamily construction with aging plumbing and roofs.',
    seasonal: FREEZE_SEASONAL('Connecticut'),
    vacantFaq: 'Connecticut winters are cold enough to freeze and burst pipes in an unheated house within days, so winterization is usually the first priority after securing the property. Many Connecticut towns also expect vacant properties to be kept mowed, clear of debris and secured, and a property that looks abandoned attracts blight complaints.',
    cities: [
      { name: 'Hartford', county: 'Hartford County', region: 'hartford', pp: '/hartford-property-preservation/', note: 'Hartford has a large stock of two- and three-family homes, many over a century old, so plumbing, porches and roofs are a constant maintenance item for owners and landlords.' },
      { name: 'West Hartford', county: 'Hartford County', region: 'hartford', note: 'West Hartford\'s colonials and Tudors on mature, tree-lined lots mean leaf removal, gutter cleaning and tree trimming top the list every fall.' },
      { name: 'New Britain', county: 'Hartford County', region: 'hartford', note: 'New Britain\'s older multifamily housing near downtown keeps landlords busy with rental turnovers, interior painting and plumbing repairs between tenants.' },
      { name: 'Bristol', county: 'Hartford County', region: 'hartford', note: 'Bristol mixes older mill-era homes with postwar neighborhoods, so we see everything from cast iron drain repairs to deck and fence replacement.' },
      { name: 'Enfield', county: 'Hartford County', region: 'hartford', note: 'On the Massachusetts line, Enfield gets the same heavy winters as the Springfield area, which makes snow removal and winterization essential for vacant homes.' },
      { name: 'New Haven', county: 'New Haven County', region: 'new-haven', pp: '/new-haven-property-preservation/', note: 'New Haven\'s dense neighborhoods of older multifamily rentals turn over often, which keeps move-out cleaning, drywall repair and painting in steady demand.' },
      { name: 'Waterbury', county: 'New Haven County', region: 'new-haven', note: 'Waterbury\'s hillside neighborhoods and older triple-deckers make roof repair, gutter work and icy-walkway management priorities for owners.' },
      { name: 'Meriden', county: 'New Haven County', region: 'new-haven', note: 'Meriden sits between Hartford and New Haven, and its mix of older homes and small commercial buildings calls for both handyman work and building maintenance.' },
      { name: 'Bridgeport', county: 'Fairfield County', region: 'fairfield', pp: '/bridgeport-property-preservation/', note: 'Bridgeport is Connecticut\'s largest city, with a large inventory of older two- and three-family homes and a steady flow of bank-owned and vacant properties needing preservation work.' },
      { name: 'Stamford', county: 'Fairfield County', region: 'fairfield', note: 'Stamford combines office towers and commercial buildings with coastal neighborhoods, so commercial property services and storm preparation both matter here.' },
      { name: 'Norwalk', county: 'Fairfield County', region: 'fairfield', note: 'Norwalk\'s shoreline neighborhoods face coastal storms and flooding, which makes emergency tarping, water extraction and pressure washing regular requests.' },
      { name: 'Danbury', county: 'Fairfield County', region: 'fairfield', note: 'Danbury\'s colder inland winters and lakeside properties mean sprinkler winterization, snow removal and seasonal property checks.' },
    ],
  },
  {
    slug: 'massachusetts', name: 'Massachusetts', abbr: 'MA',
    intro: 'Property maintenance, repairs and property preservation across Massachusetts, from Greater Boston to the Pioneer Valley.',
    climate: 'Massachusetts winters bring heavy snow, ice dams and frozen pipes, and coastal areas see nor\'easters and storm surge. Triple-deckers, older colonials and mill-era buildings make up much of the housing stock, which keeps roofs, porches, plumbing and lead-safe painting on every owner\'s list.',
    seasonal: FREEZE_SEASONAL('Massachusetts'),
    vacantFaq: 'In Massachusetts the main risks for a vacant property are frozen pipes, ice dams and snow on walkways, so winterization and snow removal come first. Many Massachusetts cities also enforce rules on vacant and foreclosed properties, so keeping the property secured, maintained and documented helps avoid fines.',
    cities: [
      { name: 'Boston', county: 'Suffolk County', region: 'boston', pp: '/boston-property-preservation/', note: 'Boston\'s brick rowhouses, triple-deckers and condo buildings mean tight access, older plumbing and a lot of roof, masonry and porch work.' },
      { name: 'Cambridge', county: 'Middlesex County', region: 'boston', note: 'Cambridge has a high share of rental units and older wood-frame houses, so rental turnovers, painting and fire-safety items like smoke detectors come up constantly.' },
      { name: 'Quincy', county: 'Norfolk County', region: 'boston', note: 'Quincy\'s coastal neighborhoods take the brunt of nor\'easters, making storm cleanup, roof tarping and siding repair common requests.' },
      { name: 'Lynn', county: 'Essex County', region: 'boston', note: 'Lynn\'s older multifamily homes near the coast need regular exterior upkeep: siding, porches, gutters and pressure washing.' },
      { name: 'Brockton', county: 'Plymouth County', region: 'south-shore', note: 'Brockton has many older single- and multifamily homes, and a steady number of vacant and bank-owned properties needing secures, cleanouts and lawn maintenance.' },
      { name: 'Lowell', county: 'Middlesex County', region: 'merrimack', note: 'Lowell\'s former mill buildings and dense older housing call for both commercial building maintenance and residential handyman work.' },
      { name: 'Worcester', county: 'Worcester County', region: 'central', pp: '/worcester-property-preservation/', note: 'Worcester\'s triple-deckers on steep hills mean porch repairs, icy-walkway management and roof work are part of every owner\'s year.' },
      { name: 'New Bedford', county: 'Bristol County', region: 'south-coast', note: 'New Bedford\'s waterfront and older multifamily housing face salt air and coastal storms, which wear on siding, windows and roofs.' },
      { name: 'Fall River', county: 'Bristol County', region: 'south-coast', note: 'Fall River\'s triple-deckers and former mill buildings need ongoing exterior maintenance, plumbing updates and winter preparation.' },
      { name: 'Springfield', county: 'Hampden County', region: 'pioneer-valley', pp: '/springfield-property-preservation/', note: 'Springfield and the surrounding Pioneer Valley are a core area for our crews. Older homes in neighborhoods like Forest Park and the Six Corners area keep our crews busy with junk removal, lawn care, roofing and winterization.' },
      { name: 'Chicopee', county: 'Hampden County', region: 'pioneer-valley', note: 'Chicopee\'s postwar single-family neighborhoods need regular lawn care, gutter cleaning and the occasional full cleanout when a home changes hands.' },
      { name: 'Holyoke', county: 'Hampden County', region: 'pioneer-valley', note: 'Holyoke\'s brick tenement buildings and canal-district mills call for exterior repairs, plumbing work and commercial building maintenance.' },
      { name: 'West Springfield', county: 'Hampden County', region: 'pioneer-valley', note: 'West Springfield sits along the Connecticut River, so basement water, sump issues and spring cleanup are common alongside routine yard care.' },
      { name: 'Westfield', county: 'Hampden County', region: 'pioneer-valley', note: 'Westfield\'s larger lots mean more mowing, trimming, leaf removal and snow plowing than the denser cities nearby.' },
      { name: 'Agawam', county: 'Hampden County', region: 'pioneer-valley', note: 'Agawam\'s suburban homes keep us busy with lawn care, fence and deck repair, and junk removal for estate and move-out cleanouts.' },
    ],
  },
  {
    slug: 'rhode-island', name: 'Rhode Island', abbr: 'RI',
    intro: 'Property maintenance, repairs and property preservation across Rhode Island, from Providence to Newport.',
    climate: 'Rhode Island\'s coastline brings nor\'easters, hurricanes and salt air, while inland areas get the cold winters and freeze-thaw damage of the rest of New England. Older multifamily homes are common in Providence County, and coastal properties need extra attention to roofs, siding and flood risk.',
    seasonal: FREEZE_SEASONAL('Rhode Island'),
    vacantFaq: 'For a vacant Rhode Island property, winterization and securing come first, followed by regular lawn care and exterior checks. Coastal properties should also be checked after every major storm for roof, window and flood damage.',
    cities: [
      { name: 'Providence', county: 'Providence County', region: 'providence', pp: '/providence-property-preservation/', note: 'Providence has one of the oldest housing stocks in the country, with many triple-deckers and Victorian homes that need careful roof, porch and plumbing work.' },
      { name: 'Cranston', county: 'Providence County', region: 'providence', note: 'Cranston\'s mix of older city neighborhoods and suburban homes means everything from rental turnovers to lawn and landscape maintenance.' },
      { name: 'Pawtucket', county: 'Providence County', region: 'providence', note: 'Pawtucket\'s former mill buildings and dense multifamily housing keep commercial maintenance and residential repairs in steady demand.' },
      { name: 'East Providence', county: 'Providence County', region: 'providence', note: 'East Providence sits on the bay, so storm cleanup, gutter work and exterior maintenance are regular requests from owners.' },
      { name: 'North Providence', county: 'Providence County', region: 'providence', note: 'North Providence\'s compact residential streets mean regular handyman, painting and seasonal yard work for owners and landlords.' },
      { name: 'Woonsocket', county: 'Providence County', region: 'blackstone', note: 'Woonsocket\'s older triple-deckers and mill-era buildings along the Blackstone River need ongoing exterior and plumbing maintenance.' },
      { name: 'Cumberland', county: 'Providence County', region: 'blackstone', note: 'Cumberland\'s larger suburban lots make lawn mowing, tree trimming and snow removal the core seasonal services.' },
      { name: 'Warwick', county: 'Kent County', region: 'kent', pp: '/warwick-property-preservation/', note: 'Warwick has miles of shoreline along Narragansett Bay, so flood cleanup, storm preparation and roof inspections matter here.' },
      { name: 'Coventry', county: 'Kent County', region: 'kent', note: 'Coventry\'s rural and suburban properties need more grounds work, from mowing and brush clearing to fallen tree removal after storms.' },
      { name: 'Newport', county: 'Newport County', region: 'newport', note: 'Newport\'s historic homes and seasonal rentals need careful exterior painting, roof work and pre-season and post-season property checks.' },
    ],
  },
  {
    slug: 'florida', name: 'Florida', abbr: 'FL',
    intro: 'Property maintenance, repairs and property preservation across Florida, from Jacksonville and the Panhandle to Tampa Bay, Orlando and South Florida.',
    climate: 'Florida properties face hurricanes and tropical storms from June through November, intense sun, heavy afternoon rain and year-round humidity that feeds mold and mildew. Lawns grow almost all year, pools need securing on vacant homes, and roofs take a beating from wind and UV.',
    seasonal: [
      { title: 'Hurricane season preparation', body: 'Roof inspections, gutter cleaning, tree trimming and securing loose items before storm season, then tarping and board-up the moment a storm passes.' },
      { title: 'Year-round lawn and pool care', body: 'Florida grass grows most of the year. Vacant homes need regular cuts to avoid code violations, and pools need to be secured and treated to stop safety and mosquito problems.' },
      { title: 'Humidity and mold control', body: 'Closed-up homes in Florida heat develop mold fast. AC servicing, filter changes and moisture checks keep a vacant property from deteriorating.' },
    ],
    vacantFaq: 'In Florida the bigger risks for a vacant home are storm damage, mold from heat and humidity, overgrown lawns and unsecured pools rather than frozen pipes. Many Florida counties and cities expect vacant properties to be kept maintained and secured, so regular lawn cuts, pool securing and inspections help avoid code violations.',
    cities: [
      { name: 'Jacksonville', county: 'Duval County', region: 'northeast', pp: '/jacksonville-property-preservation/', note: 'Jacksonville covers a huge area, from older riverfront neighborhoods to newer subdivisions, so we see every kind of property and every kind of job.' },
      { name: 'Tallahassee', county: 'Leon County', region: 'panhandle', note: 'Tallahassee\'s large student rental market means frequent move-out cleaning, painting and repairs between leases, plus heavy tree cover to manage.' },
      { name: 'Pensacola', county: 'Escambia County', region: 'panhandle', note: 'Pensacola sits on the Gulf Coast in the Panhandle, where hurricane preparation, roof tarping and storm cleanup are part of owning property.' },
      { name: 'Gainesville', county: 'Alachua County', region: 'north-central', note: 'Gainesville\'s student rentals turn over every summer, which makes move-in/move-out cleaning, carpet cleaning and quick repairs the busiest work.' },
      { name: 'Ocala', county: 'Marion County', region: 'north-central', note: 'Ocala\'s larger lots and rural properties need more mowing, brush clearing and fence repair than the coastal cities.' },
      { name: 'Orlando', county: 'Orange County', region: 'central', pp: '/orlando-property-preservation/', note: 'Orlando has a large number of investor-owned and short-term rental homes, so turnovers, pool securing and lawn care are constant.' },
      { name: 'Kissimmee', county: 'Osceola County', region: 'central', note: 'Kissimmee\'s vacation rental homes need fast cleaning, maintenance and inspections between guests and owner visits.' },
      { name: 'Lakeland', county: 'Polk County', region: 'central', note: 'Lakeland sits between Tampa and Orlando, with many single-family rentals that need regular lawn care, AC servicing and turnover repairs.' },
      { name: 'Tampa', county: 'Hillsborough County', region: 'tampa-bay', pp: '/tampa-property-preservation/', note: 'Tampa\'s mix of older bungalows and newer builds faces hurricane risk and heavy summer rain, so roofs, gutters and drainage matter here.' },
      { name: 'St. Petersburg', county: 'Pinellas County', region: 'tampa-bay', note: 'St. Petersburg is surrounded by water on three sides, which makes flood cleanup, water extraction and storm preparation important services.' },
      { name: 'Clearwater', county: 'Pinellas County', region: 'tampa-bay', note: 'Clearwater\'s coastal homes and condos deal with salt air, sun and storms that wear down paint, siding and roofs.' },
      { name: 'Cape Coral', county: 'Lee County', region: 'southwest', note: 'Cape Coral\'s canal-front homes and seawalls need storm preparation, pool securing and post-storm cleanup.' },
      { name: 'Fort Myers', county: 'Lee County', region: 'southwest', note: 'Fort Myers sees strong Gulf storms, so roof tarping, debris removal and board-up are services owners plan for every season.' },
      { name: 'Palm Bay', county: 'Brevard County', region: 'space-coast', note: 'Palm Bay\'s large residential grid has many single-family rentals and vacant lots that need regular lawn care and code compliance.' },
      { name: 'Port St. Lucie', county: 'St. Lucie County', region: 'treasure-coast', note: 'Port St. Lucie\'s fast-growing neighborhoods have many investor-owned homes that need turnovers, lawn care and storm checks.' },
      { name: 'West Palm Beach', county: 'Palm Beach County', region: 'south', note: 'West Palm Beach combines condos, older homes and commercial buildings, so both commercial property services and residential repairs are in demand.' },
      { name: 'Fort Lauderdale', county: 'Broward County', region: 'south', note: 'Fort Lauderdale\'s canals and waterfront homes face flooding and hurricanes, making water extraction and emergency tarping common.' },
      { name: 'Miami', county: 'Miami-Dade County', region: 'south', note: 'Miami\'s dense condo buildings, older homes and commercial properties need everything from common area cleaning to hurricane board-up.' },
    ],
  },
  {
    slug: 'illinois', name: 'Illinois', abbr: 'IL',
    intro: 'Property maintenance, repairs and property preservation across Illinois, from Chicago and the suburbs to Rockford, Peoria and Springfield.',
    climate: 'Illinois winters are long and cold, with lake-effect snow near Chicago, frozen pipes and ice that damages roofs and gutters. Summers bring severe thunderstorms and the occasional tornado. Chicago\'s bungalows, two-flats and greystones make up a large share of the older housing stock.',
    seasonal: FREEZE_SEASONAL('Illinois'),
    vacantFaq: 'Illinois winters freeze and burst pipes in unheated homes quickly, so winterization is critical for any vacant property. The City of Chicago and many suburbs have vacant building rules that expect the property to be registered, secured and maintained, so regular inspections, lawn care and documented securing help owners stay compliant.',
    cities: [
      { name: 'Chicago', county: 'Cook County', region: 'chicago', note: 'Chicago\'s bungalows, two-flats and greystones mean older plumbing, flat and pitched roofs, and a constant need for winterization on vacant buildings.' },
      { name: 'Evanston', county: 'Cook County', region: 'chicago', note: 'Evanston\'s older homes and apartment buildings near the lake need roof and gutter repairs and careful snow management.' },
      { name: 'Cicero', county: 'Cook County', region: 'west-suburbs', note: 'Cicero\'s dense brick bungalows and two-flats need ongoing plumbing, electrical and exterior upkeep from owners and landlords.' },
      { name: 'Oak Park', county: 'Cook County', region: 'west-suburbs', note: 'Oak Park\'s historic homes need careful exterior painting, roof work and repairs that respect the original detail.' },
      { name: 'Oak Lawn', county: 'Cook County', region: 'southwest-suburbs', note: 'Oak Lawn\'s postwar brick homes keep us busy with basement water issues, gutter work, lawn care and snow removal.' },
      { name: 'Orland Park', county: 'Cook County', region: 'southwest-suburbs', note: 'Orland Park\'s suburban homes and retail centers need both residential maintenance and commercial parking lot and building services.' },
      { name: 'Tinley Park', county: 'Cook and Will Counties', region: 'southwest-suburbs', note: 'Tinley Park\'s family neighborhoods need regular lawn care, fence and deck repair, and winter snow removal.' },
      { name: 'Schaumburg', county: 'Cook County', region: 'northwest-suburbs', note: 'Schaumburg is a major office and retail hub, so commercial property services, parking lot maintenance and common area cleaning are in steady demand.' },
      { name: 'Naperville', county: 'DuPage and Will Counties', region: 'west-suburbs', note: 'Naperville\'s larger suburban homes need landscape maintenance, irrigation repair and sprinkler winterization every fall.' },
      { name: 'Aurora', county: 'Kane County', region: 'fox-valley', note: 'Aurora spans four counties, with older homes near the Fox River and newer subdivisions further out, so we handle everything from plumbing repairs to sod installation.' },
      { name: 'Elgin', county: 'Kane County', region: 'fox-valley', note: 'Elgin\'s historic districts along the Fox River and newer developments need a mix of careful repairs and routine grounds care.' },
      { name: 'Joliet', county: 'Will County', region: 'southwest-suburbs', note: 'Joliet has a large number of older homes and investor-owned rentals, so turnovers, preservation work and winterization come up often.' },
      { name: 'Waukegan', county: 'Lake County', region: 'north-shore', note: 'Waukegan sits on Lake Michigan, and lake-effect weather makes snow removal, ice management and roof inspections important.' },
      { name: 'Rockford', county: 'Winnebago County', region: 'northern', note: 'Rockford has a large stock of older homes and a steady flow of vacant and bank-owned properties needing secures, cleanouts and winterization.' },
      { name: 'Peoria', county: 'Peoria County', region: 'central', note: 'Peoria\'s older river-bluff neighborhoods need roof, gutter and drainage work, along with regular preservation of vacant homes.' },
      { name: 'Springfield', county: 'Sangamon County', region: 'central', note: 'Illinois\'s capital has many older homes and state-related commercial buildings, so we cover both residential repairs and building maintenance.' },
      { name: 'Champaign', county: 'Champaign County', region: 'central', note: 'Champaign\'s large student rental market means August turnovers: cleaning, painting, carpet cleaning and repairs on a tight schedule.' },
    ],
  },
  {
    slug: 'missouri', name: 'Missouri', abbr: 'MO',
    intro: 'Property maintenance, repairs and property preservation across Missouri, from St. Louis and Kansas City to Springfield and Columbia.',
    climate: 'Missouri sits in the middle of the country\'s storm track, with tornadoes and severe thunderstorms in spring, hot humid summers and cold winters with ice storms and freeze-thaw damage. St. Louis has a large stock of older brick homes, while Kansas City and Springfield have more postwar and newer housing.',
    seasonal: [
      { title: 'Spring storm season', body: 'Hail, high winds and tornadoes damage roofs, siding and trees. Roof inspections, emergency tarping and fallen tree removal keep damage from spreading.' },
      { title: 'Summer heat and humidity', body: 'AC servicing, filter changes and regular lawn care through long, hot Missouri summers.' },
      { title: 'Winter ice and freeze', body: 'Ice storms and hard freezes burst pipes in vacant homes. Winterization, snow removal and salting before the cold sets in.' },
    ],
    vacantFaq: 'In Missouri the biggest risks for a vacant property are spring storm damage, summer overgrowth and winter freezes, so a year-round plan of inspections, lawn care and winterization works best. St. Louis and Kansas City both enforce property maintenance codes, so a vacant home that is kept secured and maintained avoids most problems.',
    cities: [
      { name: 'St. Louis', county: 'Independent city', region: 'st-louis', note: 'St. Louis is known for its older brick homes and two-family flats, which need roof work, porch repairs and careful plumbing updates.' },
      { name: 'Florissant', county: 'St. Louis County', region: 'st-louis', note: 'Florissant\'s postwar ranch homes need regular gutter cleaning, lawn care and rental turnover work.' },
      { name: 'Chesterfield', county: 'St. Louis County', region: 'st-louis', note: 'Chesterfield\'s larger homes and commercial centers call for landscape maintenance, irrigation repair and commercial property services.' },
      { name: 'St. Charles', county: 'St. Charles County', region: 'st-charles', note: 'St. Charles sits on the Missouri River, so flood cleanup, basement water and storm damage are part of the local picture.' },
      { name: "O'Fallon", county: 'St. Charles County', region: 'st-charles', note: "O'Fallon's newer subdivisions need sod installation, fence and deck work and regular lawn care." },
      { name: 'Kansas City', county: 'Jackson County', region: 'kansas-city', note: 'Kansas City spans several counties, with older bungalows near the urban core and newer suburbs further out, so the work ranges from plumbing repairs to full rehabs.' },
      { name: 'Independence', county: 'Jackson County', region: 'kansas-city', note: 'Independence has many older single-family homes and rentals that need turnovers, exterior repairs and winter preparation.' },
      { name: "Lee's Summit", county: 'Jackson County', region: 'kansas-city', note: "Lee's Summit's suburban homes need lawn care, sprinkler winterization and storm damage repairs after spring hail." },
      { name: 'St. Joseph', county: 'Buchanan County', region: 'northwest', note: 'St. Joseph has a large stock of historic homes that need careful exterior painting, roof and porch repairs.' },
      { name: 'Columbia', county: 'Boone County', region: 'central', note: 'Columbia\'s large student rental market means busy summer turnovers: cleaning, painting and quick repairs between leases.' },
      { name: 'Springfield', county: 'Greene County', region: 'southwest', note: 'Springfield, Missouri is the hub of the Ozarks, with many rental homes that need maintenance, lawn care and storm repairs.' },
      { name: 'Joplin', county: 'Jasper County', region: 'southwest', note: 'Joplin sits in a tornado-prone corner of the state, so roof inspections, emergency tarping and storm cleanup are important services.' },
    ],
  },
  {
    slug: 'arkansas', name: 'Arkansas', abbr: 'AR',
    intro: 'Property maintenance, repairs and property preservation across Arkansas, from Little Rock to Northwest Arkansas and Fort Smith.',
    climate: 'Arkansas properties face severe spring storms, hail and tornadoes, long humid summers and occasional ice storms in winter. Heavy tree cover means fallen limbs and gutter clogs, and humidity makes mold and pest control a regular concern in closed-up homes.',
    seasonal: [
      { title: 'Storm and tornado season', body: 'Roof inspections, tree trimming away from the house, and fast tarping and debris removal after spring storms.' },
      { title: 'Long growing season', body: 'Lawns and brush grow fast from spring to fall. Regular mowing, trimming and weed control keep vacant properties compliant.' },
      { title: 'Winter ice storms', body: 'Arkansas winters are short but ice storms can bring down trees and burst pipes. Winterization for vacant homes and quick fallen tree removal.' },
    ],
    vacantFaq: 'For a vacant Arkansas property, the main risks are storm damage, overgrown lawns, pests and humidity, plus the occasional hard freeze. Regular inspections, lawn care and pest control, with winterization before winter, keep the property in good shape.',
    cities: [
      { name: 'Little Rock', county: 'Pulaski County', region: 'central', note: 'Little Rock\'s older neighborhoods have mature trees and older homes, so tree trimming, gutter cleaning and roof repairs are regular jobs.' },
      { name: 'North Little Rock', county: 'Pulaski County', region: 'central', note: 'North Little Rock sits across the Arkansas River from Little Rock, with many rental homes that need turnovers, repairs and lawn care.' },
      { name: 'Conway', county: 'Faulkner County', region: 'central', note: 'Conway\'s student rentals and growing neighborhoods need move-out cleaning, painting and regular grounds care.' },
      { name: 'Hot Springs', county: 'Garland County', region: 'central', note: 'Hot Springs has many lake homes and seasonal properties that need regular checks, lawn care and storm cleanup.' },
      { name: 'Pine Bluff', county: 'Jefferson County', region: 'southeast', note: 'Pine Bluff has a significant number of vacant and older homes that need securing, cleanouts and preservation work.' },
      { name: 'Fayetteville', county: 'Washington County', region: 'northwest', note: 'Fayetteville\'s hilly terrain and university rental market mean drainage work and busy summer turnovers.' },
      { name: 'Springdale', county: 'Washington County', region: 'northwest', note: 'Springdale\'s fast-growing neighborhoods need sod installation, fence work and regular lawn care.' },
      { name: 'Rogers', county: 'Benton County', region: 'northwest', note: 'Rogers has a growing mix of homes and commercial buildings, so both residential maintenance and commercial property services are in demand.' },
      { name: 'Bentonville', county: 'Benton County', region: 'northwest', note: 'Bentonville\'s rapid growth has brought many new homes and offices that need landscape maintenance, cleaning and building upkeep.' },
      { name: 'Fort Smith', county: 'Sebastian County', region: 'river-valley', note: 'Fort Smith on the Oklahoma line sees strong spring storms, so roof inspections, tarping and fallen tree removal matter here.' },
      { name: 'Jonesboro', county: 'Craighead County', region: 'northeast', note: 'Jonesboro\'s student and family rentals need regular turnovers, lawn care and seasonal maintenance.' },
    ],
  },
];

export type CityPage = AreaCity & { slug: string; path: string; state: AreaState; nearby: { name: string; path: string }[] };

export const cityPath = (s: AreaState, c: AreaCity) => `/service-areas/${s.slug}/${citySlug(c.name)}/`;

/** Every city page, with nearby towns resolved (same region first, then same state). */
export const ALL_CITY_PAGES: CityPage[] = AREA_STATES.flatMap((s) =>
  s.cities.map((c) => {
    const same = s.cities.filter((o) => o !== c && o.region === c.region);
    const rest = s.cities.filter((o) => o !== c && o.region !== c.region);
    const nearby = [...same, ...rest].slice(0, 6).map((o) => ({ name: o.name, path: cityPath(s, o) }));
    return { ...c, slug: citySlug(c.name), path: cityPath(s, c), state: s, nearby };
  })
);

export const CITY_COUNT = ALL_CITY_PAGES.length;
