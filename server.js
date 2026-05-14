const http = require('http');
const https = require('https');

const KEY = process.env.ANTHROPIC_KEY;
const MAERSK_KEY = process.env.MAERSK_KEY;
const TERMINAL49_KEY = process.env.TERMINAL49_KEY;
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);
console.log('Anthropic Key present:', !!KEY);
console.log('Maersk Key present:', !!MAERSK_KEY);
console.log('Terminal49 Key present:', !!TERMINAL49_KEY);

// =====================================================
// BNSF / UP / CSX / NS RAIL RAMPS - Static curated database
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

// Fetch Terminal49 port/terminal data
async function fetchTerminal49Ports(region) {
  if (!TERMINAL49_KEY) return null;
  try {
    // Terminal49 has a /ports endpoint that lists supported ports
    // and a /terminals endpoint for terminal details
    const cityMap = {
      'LA/Long Beach': 'Los Angeles',
      'New York/New Jersey': 'New York',
      'Savannah': 'Savannah',
      'Seattle/Tacoma': 'Seattle',
      'Houston': 'Houston',
      'Charleston': 'Charleston',
      'Norfolk': 'Norfolk',
      'Baltimore': 'Baltimore',
      'Oakland': 'Oakland',
      'Miami': 'Miami',
    };
    const city = cityMap[region] || region.split('/')[0].trim();

    const url = `https://api.terminal49.com/v2/terminals?filter[country_code]=US`;
    const r = await httpsGet(url, {
      'Authorization': `Token ${TERMINAL49_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    });
    console.log('Terminal49 status:', r.status);
    if (r.status === 200) {
      try {
        const parsed = JSON.parse(r.body);
        const allTerminals = parsed.data || [];
        // Filter by city name match
        const filtered = allTerminals.filter(t => {
          const name = (t.attributes?.name || '').toLowerCase();
          const cityLower = city.toLowerCase();
          return name.includes(cityLower) || cityLower.split(' ').some(w => name.includes(w));
        });
        return filtered.length > 0 ? filtered : allTerminals.slice(0, 10);
      } catch(e) {
        console.log('T49 parse error:', e.message);
        return null;
      }
    }
    console.log('T49 response:', r.body.substring(0, 200));
    return null;
  } catch(e) {
    console.error('Terminal49 error:', e.message);
    return null;
  }
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
      rail_regions: Object.keys(RAIL_RAMPS).length
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

  if (req.url.startsWith('/terminal49-test')) {
    const u = new URL(req.url, 'http://x');
    const region = u.searchParams.get('region') || 'LA/Long Beach';
    const data = await fetchTerminal49Ports(region);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ region, count: data ? data.length : 0, data: data || null }));
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

      // Terminal49 (covers MSC, CMA CGM, COSCO, Evergreen, ONE, etc at major ports)
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

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on 0.0.0.0:' + PORT);
});

server.on('error', (e) => {
  console.error('Server error:', e);
});
