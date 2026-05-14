// Force redeploy v3
const http = require('http');
const https = require('https');

const KEY = process.env.ANTHROPIC_KEY;
const MAERSK_KEY = process.env.MAERSK_KEY;
const TERMINAL49_KEY = process.env.TERMINAL49_KEY;
const DCLI_KEY = process.env.DCLI_KEY;
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);
console.log('Anthropic Key present:', !!KEY);
console.log('Maersk Key present:', !!MAERSK_KEY);
console.log('Terminal49 Key present:', !!TERMINAL49_KEY);
console.log('DCLI Key present:', !!DCLI_KEY, '(deploy v2)');
// =====================================================
// RAIL RAMPS DATABASE
// =====================================================
const RAIL_RAMPS = {
  'Chicago, IL (BNSF/UP)': [
    { name: 'BNSF Logistics Park Chicago (LPC)', operator: 'BNSF Railway', type: 'rail', address: '26664 S Baseline Rd, Elwood, IL 60421', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-18:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'Largest inland port in North America. Use BNSF Ramp View for gate status.' },
    { name: 'UP Global IV Intermodal', operator: 'Union Pacific', type: 'rail', address: '4400 E 130th St, Chicago, IL 60633', phone: '+1-888-877-7267', hours: 'Mon-Fri 05:00-23:00\nSat 06:00-18:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP Global IV - one of UP\'s busiest Chicago terminals.' },
    { name: 'BNSF Cicero Intermodal', operator: 'BNSF Railway', type: 'rail', address: '5000 W 26th St, Cicero, IL 60804', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'BNSF Chicago metro area facility.' },
    { name: 'UP Global I Yard', operator: 'Union Pacific', type: 'rail', address: '900 W 47th St, Chicago, IL 60609', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-16:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'Domestic and international intermodal terminal.' },
  ],
  'Memphis, TN (BNSF/UP)': [
    { name: 'BNSF Memphis Intermodal Facility', operator: 'BNSF Railway', type: 'rail', address: '3505 Jenell Rd, Memphis, TN 38109', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-14:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'Major BNSF Memphis hub serving the Mid-South.' },
    { name: 'UP Memphis Intermodal Terminal', operator: 'Union Pacific', type: 'rail', address: '2200 Frank Pidgeon Pkwy, Memphis, TN 38109', phone: '+1-888-877-7267', hours: 'Mon-Fri 05:30-22:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP\'s main Memphis intermodal facility.' },
  ],
  'Kansas City, MO (BNSF/UP)': [
    { name: 'BNSF Kansas City Intermodal', operator: 'BNSF Railway', type: 'rail', address: '5505 Inland Dr, Edgerton, KS 66021', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-16:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'BNSF Logistics Park Kansas City (LPKC).' },
    { name: 'UP Kansas City Intermodal', operator: 'Union Pacific', type: 'rail', address: '2401 Adams Ave, Kansas City, KS 66106', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP\'s Armourdale Yard intermodal operations.' },
  ],
  'Dallas/Fort Worth, TX (BNSF/UP)': [
    { name: 'BNSF Alliance Intermodal Facility', operator: 'BNSF Railway', type: 'rail', address: '3300 Intermodal Pkwy, Haslet, TX 76052', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-18:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'BNSF Alliance - one of largest intermodal facilities in TX.' },
    { name: 'UP Dallas Intermodal Terminal (DIT)', operator: 'Union Pacific', type: 'rail', address: '2500 Singleton Blvd, Dallas, TX 75212', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-16:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP\'s Mesquite intermodal facility.' },
  ],
  'St. Louis, MO (UP)': [
    { name: 'UP Dupo Intermodal Yard', operator: 'Union Pacific', type: 'rail', address: '101 Dupo Rd, Dupo, IL 62239', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP St. Louis area facility just across the river in IL.' },
  ],
  'Cincinnati, OH (CSX/NS)': [
    { name: 'CSX Queensgate Yard', operator: 'CSX Transportation', type: 'rail', address: '2000 Gest St, Cincinnati, OH 45204', phone: '+1-877-279-3878', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.shipcsx.com', notes: 'CSX Cincinnati intermodal terminal.' },
    { name: 'NS Sharonville Intermodal', operator: 'Norfolk Southern', type: 'rail', address: '11700 Reading Rd, Cincinnati, OH 45241', phone: '+1-800-635-5768', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.nscorp.com', notes: 'Norfolk Southern Cincinnati area intermodal terminal.' },
  ],
  'Columbus, OH (CSX/NS)': [
    { name: 'NS Rickenbacker Intermodal Terminal', operator: 'Norfolk Southern', type: 'rail', address: '2640 Rohr Rd, Lockbourne, OH 43137', phone: '+1-800-635-5768', hours: 'Mon-Fri 06:00-22:00\nSat 06:00-16:00', appointmentUrl: 'https://www.nscorp.com', notes: 'Major NS intermodal facility in Columbus area.' },
  ],
  'Detroit, MI (CSX/NS)': [
    { name: 'CSX Livernois Intermodal', operator: 'CSX Transportation', type: 'rail', address: '5301 W Jefferson Ave, Detroit, MI 48209', phone: '+1-877-279-3878', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.shipcsx.com', notes: 'CSX Detroit area intermodal terminal.' },
    { name: 'NS Detroit Intermodal Terminal', operator: 'Norfolk Southern', type: 'rail', address: '8401 Vernor Hwy, Detroit, MI 48209', phone: '+1-800-635-5768', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.nscorp.com', notes: 'Norfolk Southern Detroit intermodal.' },
  ],
  'Minneapolis, MN (BNSF/UP)': [
    { name: 'BNSF Minneapolis Intermodal Facility', operator: 'BNSF Railway', type: 'rail', address: '15600 Galaxie Ave W, Rosemount, MN 55068', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'BNSF Twin Cities intermodal.' },
  ],
  'Denver, CO (BNSF/UP)': [
    { name: 'BNSF Denver Intermodal', operator: 'BNSF Railway', type: 'rail', address: '5151 Pena Blvd, Denver, CO 80239', phone: '+1-800-795-2673', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.bnsf.com/ship-with-bnsf/intermodal/index.html', notes: 'BNSF Denver Front Range intermodal.' },
    { name: 'UP Denver Intermodal Terminal', operator: 'Union Pacific', type: 'rail', address: '5500 Holly St, Commerce City, CO 80022', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.up.com/customers/intermodal/index.htm', notes: 'UP Denver intermodal facility.' },
  ],
  'Indianapolis, IN (CSX/NS)': [
    { name: 'CSX Indianapolis Intermodal', operator: 'CSX Transportation', type: 'rail', address: '2425 Hovey St, Indianapolis, IN 46202', phone: '+1-877-279-3878', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.shipcsx.com', notes: 'CSX Indianapolis intermodal terminal.' },
  ],
  'Louisville, KY (CSX/NS)': [
    { name: 'CSX Louisville Intermodal', operator: 'CSX Transportation', type: 'rail', address: '3501 Algonquin Pkwy, Louisville, KY 40211', phone: '+1-877-279-3878', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.shipcsx.com', notes: 'CSX Louisville Osborn Yard intermodal.' },
  ],
};

// =====================================================
// CHASSIS POOLS DATABASE
// =====================================================
const CHASSIS_POOLS = {
  'LA/Long Beach': [
    { name: 'DCLI Wilmington Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\', Tri-Axle', address: '1521 Pier A Way, Wilmington, CA 90744', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00\nSat 06:00-12:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'Major DCLI Pool 3 location at LA/LB. Largest chassis pool in the region.' },
    { name: 'TRAC Intermodal LA/LB Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '750 Pier A Plaza, Long Beach, CA 90802', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$20-25', notes: 'TRAC Pool 3 location. Empty return accepted.' },
    { name: 'Flexi-Van Compton Depot', operator: 'Flexi-Van', type: 'depot', poolType: 'private', returnAny: false, chassisTypes: '20\', 40\', 45\'', address: '2150 E Sepulveda Blvd, Long Beach, CA 90810', phone: '+1-732-577-7115', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.flexi-van.com', dailyRate: '$22-28', notes: 'Flexi-Van LA/LB chassis location.' },
    { name: 'POOL3 LA/Long Beach', operator: 'Pool 3 LLC', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: 'Multiple LA/LB terminals', phone: '+1-855-435-3254', hours: 'Varies by terminal', appointmentUrl: 'https://www.pool3llc.com', dailyRate: '$18-25', notes: 'Pool 3 is the gray pool for LA/LB - shared chassis accepted at any participating terminal.' },
  ],
  'New York/New Jersey': [
    { name: 'DCLI Elizabeth Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\', Tri-Axle', address: '1100 McLester St, Elizabeth, NJ 07201', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-19:00\nSat 06:00-14:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$24-30', notes: 'DCLI NY/NJ main depot. Serving APM, Maher, GCT, PNCT.' },
    { name: 'TRAC NY/NJ Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1210 Corbin St, Elizabeth, NJ 07201', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$24-30', notes: 'TRAC NY/NJ Port Newark area. North Jersey chassis pool.' },
    { name: 'Flexi-Van Newark Depot', operator: 'Flexi-Van', type: 'depot', poolType: 'private', returnAny: false, chassisTypes: '20\', 40\', 45\'', address: '1101 Doremus Ave, Newark, NJ 07105', phone: '+1-732-577-7115', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.flexi-van.com', dailyRate: '$24-30', notes: 'Flexi-Van Newark location for carrier-specific chassis.' },
  ],
  'Savannah': [
    { name: 'DCLI Savannah Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1 Container Way, Garden City, GA 31408', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-19:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$20-26', notes: 'DCLI Savannah serving GCT/Garden City terminals.' },
    { name: 'TRAC Savannah Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2 GA-21, Garden City, GA 31408', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$20-26', notes: 'TRAC Savannah port area chassis pool.' },
  ],
  'Seattle/Tacoma': [
    { name: 'DCLI Seattle Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '4737 East Marginal Way S, Seattle, WA 98134', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Pacific Northwest hub.' },
    { name: 'DCLI Tacoma Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1801 Lincoln Ave, Tacoma, WA 98421', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Tacoma serving NWSA terminals.' },
    { name: 'TRAC Seattle Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '5400 W Marginal Way SW, Seattle, WA 98106', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$22-28', notes: 'TRAC Seattle chassis pool.' },
  ],
  'Houston': [
    { name: 'DCLI Houston Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '13000 Highway 225, La Porte, TX 77571', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$20-26', notes: 'DCLI Houston serving Barbours Cut and Bayport terminals.' },
    { name: 'TRAC Houston Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1201 Strang Rd, La Porte, TX 77571', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$20-26', notes: 'TRAC Houston Port chassis depot.' },
    { name: 'Flexi-Van Houston', operator: 'Flexi-Van', type: 'depot', poolType: 'private', returnAny: false, chassisTypes: '20\', 40\', 45\'', address: '1500 Old Hwy 90, Houston, TX 77506', phone: '+1-732-577-7115', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.flexi-van.com', dailyRate: '$20-26', notes: 'Flexi-Van Houston chassis location.' },
  ],
  'Charleston': [
    { name: 'DCLI Charleston Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1948 Macalloy Rd, North Charleston, SC 29405', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Charleston serving Wando and North Charleston terminals.' },
    { name: 'TRAC Charleston', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '5300 Carner Ave, North Charleston, SC 29406', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$22-28', notes: 'TRAC Charleston Port chassis pool.' },
  ],
  'Norfolk': [
    { name: 'DCLI Norfolk Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '7150 Hampton Blvd, Norfolk, VA 23505', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Norfolk serving NIT and VIG terminals.' },
    { name: 'TRAC Norfolk Depot', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2700 International Pkwy, Virginia Beach, VA 23452', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$22-28', notes: 'TRAC Hampton Roads chassis pool.' },
  ],
  'Baltimore': [
    { name: 'DCLI Baltimore Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2700 Broening Hwy, Baltimore, MD 21222', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Baltimore Seagirt Marine Terminal chassis.' },
    { name: 'TRAC Baltimore', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2200 Broening Hwy, Baltimore, MD 21224', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$22-28', notes: 'TRAC Baltimore chassis pool.' },
  ],
  'Oakland': [
    { name: 'DCLI Oakland Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1717 Middle Harbor Rd, Oakland, CA 94607', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$24-30', notes: 'DCLI Oakland Port chassis depot.' },
    { name: 'TRAC Oakland', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1530 Maritime St, Oakland, CA 94607', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$24-30', notes: 'TRAC Oakland chassis pool.' },
  ],
  'Miami': [
    { name: 'DCLI Miami Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2151 NW 25th St, Miami, FL 33142', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$22-28', notes: 'DCLI Miami / PortMiami chassis depot.' },
    { name: 'TRAC Miami', operator: 'TRAC Intermodal', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '1283 NW North River Dr, Miami, FL 33125', phone: '+1-866-822-2557', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.tracintermodal.com', dailyRate: '$22-28', notes: 'TRAC Miami Port chassis pool.' },
  ],
  'Chicago, IL (BNSF/UP)': [
    { name: 'UMAX Chicago - UP Global IV', operator: 'UMAX (Union Pacific)', type: 'rail', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '4400 E 130th St, Chicago, IL 60633', phone: '+1-888-877-7267', hours: 'Mon-Fri 05:00-23:00', appointmentUrl: 'https://www.umax.com', dailyRate: '$18-22', notes: 'UMAX rail-tied chassis pool at UP Chicago.' },
    { name: 'DCLI Chicago Rail Depot', operator: 'DCLI', type: 'depot', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '5600 W 73rd St, Bedford Park, IL 60638', phone: '+1-855-435-3254', hours: 'Mon-Fri 06:00-18:00', appointmentUrl: 'https://www.dcli.com', dailyRate: '$18-22', notes: 'DCLI Chicago rail intermodal area.' },
  ],
  'Memphis, TN (BNSF/UP)': [
    { name: 'UMAX Memphis - UP Yard', operator: 'UMAX (Union Pacific)', type: 'rail', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '2200 Frank Pidgeon Pkwy, Memphis, TN 38109', phone: '+1-888-877-7267', hours: 'Mon-Fri 05:30-22:00', appointmentUrl: 'https://www.umax.com', dailyRate: '$18-22', notes: 'UMAX chassis at UP Memphis intermodal.' },
  ],
  'Dallas/Fort Worth, TX (BNSF/UP)': [
    { name: 'UMAX Dallas - BNSF Alliance', operator: 'UMAX (Union Pacific)', type: 'rail', poolType: 'gray', returnAny: true, chassisTypes: '20\', 40\', 45\'', address: '3300 Intermodal Pkwy, Haslet, TX 76052', phone: '+1-888-877-7267', hours: 'Mon-Fri 06:00-22:00', appointmentUrl: 'https://www.umax.com', dailyRate: '$18-22', notes: 'UMAX rail chassis at BNSF Alliance.' },
  ],
};

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function fetchMaerskLocations(region) {
  if (!MAERSK_KEY) return null;
  try {
    const cityMap = {
      'LA/Long Beach': 'Los Angeles', 'New York/New Jersey': 'New York',
      'Savannah': 'Savannah', 'Seattle/Tacoma': 'Seattle', 'Houston': 'Houston',
      'Charleston': 'Charleston', 'Norfolk': 'Norfolk', 'Baltimore': 'Baltimore',
      'Oakland': 'Oakland', 'Miami': 'Miami',
    };
    const city = cityMap[region] || region.split('/')[0].trim();
    const results = [];

    for (const locType of ['TERMINAL', 'DEPOT']) {
      const url = `https://api.maersk.com/reference-data/locations?cityName=${encodeURIComponent(city)}&countryCode=US&locationType=${locType}&limit=50`;
      const r = await httpsGet(url, { 'Consumer-Key': MAERSK_KEY, 'Accept': 'application/json' });
      if (r.status === 200) {
        try {
          const parsed = JSON.parse(r.body);
          if (parsed.locations) results.push(...parsed.locations);
          else if (Array.isArray(parsed)) results.push(...parsed);
        } catch(e) {}
      }
    }
    return results.length > 0 ? results : null;
  } catch(e) {
    console.error('Maersk error:', e.message);
    return null;
  }
}

async function fetchTerminal49Ports(region) {
  if (!TERMINAL49_KEY) return null;
  try {
    const url = `https://api.terminal49.com/v2/terminals?filter[country_code]=US`;
    const r = await httpsGet(url, {
      'Authorization': `Token ${TERMINAL49_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    });
    if (r.status === 200) {
      try {
        const parsed = JSON.parse(r.body);
        return parsed.data || [];
      } catch(e) { return null; }
    }
    return null;
  } catch(e) { return null; }
}

async function fetchDCLIChassis(region) {
  if (!DCLI_KEY) return null;
  try {
    // Placeholder for when DCLI API access is approved
    // Typical DCLI API would be something like:
    // const url = `https://api.dcli.com/v1/chassis/availability?location=${encodeURIComponent(region)}`;
    // const r = await httpsGet(url, { 'X-API-Key': DCLI_KEY, 'Accept': 'application/json' });
    // Will return real availability counts when activated
    return null;
  } catch(e) { return null; }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      anthropic: !!KEY,
      maersk: !!MAERSK_KEY,
      terminal49: !!TERMINAL49_KEY,
      dcli: !!DCLI_KEY,
      rail_regions: Object.keys(RAIL_RAMPS).length,
      chassis_regions: Object.keys(CHASSIS_POOLS).length
    }));
    return;
  }

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url.startsWith('/maersk-locations')) {
    const u = new URL(req.url, 'http://x');
    const region = u.searchParams.get('region') || 'LA/Long Beach';
    const data = await fetchMaerskLocations(region);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ region, count: data ? data.length : 0, data: data || null }));
    return;
  }

  if (req.url.startsWith('/chassis-pools')) {
    const u = new URL(req.url, 'http://x');
    const region = u.searchParams.get('region') || '';
    const pools = CHASSIS_POOLS[region] || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ region, count: pools.length, pools }));
    return;
  }

  if (req.url.startsWith('/rail-ramps')) {
    const u = new URL(req.url, 'http://x');
    const region = u.searchParams.get('region') || '';
    const ramps = RAIL_RAMPS[region] || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ region, count: ramps.length, ramps }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const prompt = parsed.prompt || '';

      let enhancedPrompt = prompt;
      const realDataParts = [];
      const isChassisMode = prompt.includes('"mode":"chassis"') || prompt.includes('Pool:') || prompt.includes('chassis');

      // Maersk
      if ((prompt.includes('Maersk') || prompt.includes('Hamburg Sud')) && MAERSK_KEY) {
        const regionMatch = prompt.match(/Region:([^\n]+?)(?:\s+Container|\s+Booking|\s*$)/);
        if (regionMatch) {
          const region = regionMatch[1].trim();
          const data = await fetchMaerskLocations(region);
          if (data && data.length > 0) {
            realDataParts.push(`MAERSK REAL LIVE DATA (${data.length} locations): ${JSON.stringify(data.slice(0, 8)).substring(0, 3000)}`);
          }
        }
      }

      // Terminal49
      const t49Carriers = ['MSC', 'CMA CGM', 'COSCO', 'Evergreen', 'ONE', 'Hapag-Lloyd', 'ZIM', 'Yang Ming', 'HMM'];
      if (TERMINAL49_KEY && t49Carriers.some(c => prompt.includes(c))) {
        const regionMatch = prompt.match(/Region:([^\n]+?)(?:\s+Container|\s+Booking|\s*$)/);
        if (regionMatch) {
          const region = regionMatch[1].trim();
          const data = await fetchTerminal49Ports(region);
          if (data && data.length > 0) {
            realDataParts.push(`TERMINAL49 REAL TERMINAL DATA (${data.length} terminals): ${JSON.stringify(data.slice(0, 8)).substring(0, 2500)}`);
          }
        }
      }

      // Chassis pools (static + DCLI when active)
      if (isChassisMode) {
        const regionMatch = prompt.match(/Region:([^\n]+?)(?:\s+Container|\s+Booking|\s*$)/);
        if (regionMatch) {
          const region = regionMatch[1].trim();
          if (CHASSIS_POOLS[region]) {
            realDataParts.push(`REAL CHASSIS POOL DATABASE for ${region}: ${JSON.stringify(CHASSIS_POOLS[region])}`);
          }
          // Try DCLI live data if available
          const dcliData = await fetchDCLIChassis(region);
          if (dcliData) {
            realDataParts.push(`DCLI LIVE CHASSIS AVAILABILITY: ${JSON.stringify(dcliData).substring(0, 1500)}`);
          }
        }
      }

      // Rail ramps for midwest
      const railRegionMatch = prompt.match(/Region:(Chicago|Memphis|Kansas City|Dallas\/Fort Worth|St\. Louis|Cincinnati|Columbus|Detroit|Minneapolis|Denver|Indianapolis|Louisville)[^\n]*?(?:\s+Container|\s+Booking|\s*$)/);
      if (railRegionMatch) {
        const matchedKey = Object.keys(RAIL_RAMPS).find(k => k.toLowerCase().startsWith(railRegionMatch[1].toLowerCase()));
        if (matchedKey && RAIL_RAMPS[matchedKey]) {
          realDataParts.push(`REAL RAIL RAMP DATABASE for ${matchedKey}: ${JSON.stringify(RAIL_RAMPS[matchedKey])}`);
        }
      }

      if (realDataParts.length > 0) {
        enhancedPrompt = `IMPORTANT: Use this REAL verified data as the primary source. Build the response around these real locations with their exact names, addresses, phone numbers, and hours:\n\n${realDataParts.join('\n\n')}\n\nUser query:\n${prompt}`;
        console.log('Enhanced prompt with', realDataParts.length, 'real data sources');
      }

      const payload = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: enhancedPrompt }]
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      apiReq.on('error', (e) => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
      apiReq.write(payload);
      apiReq.end();
    } catch(e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('Server running on 0.0.0.0:' + PORT));
server.on('error', (e) => console.error('Server error:', e));
