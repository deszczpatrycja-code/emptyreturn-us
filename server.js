const http = require('http');
const https = require('https');

const KEY = process.env.ANTHROPIC_KEY;
const MAERSK_KEY = process.env.MAERSK_KEY;
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);
console.log('Anthropic Key present:', !!KEY);
console.log('Maersk Key present:', !!MAERSK_KEY);

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

// Fetch Maersk locations - terminals and depots in US
async function fetchMaerskLocations(region) {
  if (!MAERSK_KEY) return null;
  try {
    // Map our regions to Maersk city search terms
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
      'Miami': 'Miami'
    };
    const city = cityMap[region] || region.split('/')[0].trim();

    // Get TERMINAL and DEPOT locations in the US
    // Search by city + country US + types we care about
    const results = [];

    // Fetch terminals
    const termUrl = `https://api.maersk.com/reference-data/locations?cityName=${encodeURIComponent(city)}|contains&countryCode=US&locationType=TERMINAL&limit=50`;
    console.log('Calling Maersk terminals:', termUrl);
    const termRes = await httpsGet(termUrl, {
      'Consumer-Key': MAERSK_KEY,
      'Accept': 'application/json'
    });
    console.log('Maersk terminals status:', termRes.status);
    if (termRes.status === 200) {
      try {
        const parsed = JSON.parse(termRes.body);
        if (parsed.locations) results.push(...parsed.locations);
        else if (Array.isArray(parsed)) results.push(...parsed);
      } catch(e) { console.log('Parse err terminals'); }
    } else {
      console.log('Maersk terminal response:', termRes.body.substring(0, 300));
    }

    // Fetch depots
    const depUrl = `https://api.maersk.com/reference-data/locations?cityName=${encodeURIComponent(city)}|contains&countryCode=US&locationType=DEPOT&limit=50`;
    console.log('Calling Maersk depots:', depUrl);
    const depRes = await httpsGet(depUrl, {
      'Consumer-Key': MAERSK_KEY,
      'Accept': 'application/json'
    });
    console.log('Maersk depots status:', depRes.status);
    if (depRes.status === 200) {
      try {
        const parsed = JSON.parse(depRes.body);
        if (parsed.locations) results.push(...parsed.locations);
        else if (Array.isArray(parsed)) results.push(...parsed);
      } catch(e) { console.log('Parse err depots'); }
    }

    return results.length > 0 ? results : null;
  } catch(e) {
    console.error('Maersk fetch error:', e.message);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET' && !req.url.startsWith('/maersk-locations')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', anthropic: !!KEY, maersk: !!MAERSK_KEY }));
    return;
  }

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Test endpoint
  if (req.url.startsWith('/maersk-locations')) {
    const u = new URL(req.url, 'http://x');
    const region = u.searchParams.get('region') || 'LA/Long Beach';
    const data = await fetchMaerskLocations(region);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ region, count: data ? data.length : 0, data: data || null }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const prompt = parsed.prompt || '';

      let enhancedPrompt = prompt;
      if ((prompt.includes('Maersk') || prompt.includes('Hamburg Sud')) && MAERSK_KEY) {
        const regionMatch = prompt.match(/Region:([^\n]+?)(?:\s+Container|\s+Booking|\s*$)/);
        if (regionMatch) {
          const region = regionMatch[1].trim();
          console.log('Searching Maersk for region:', region);
          const maerskData = await fetchMaerskLocations(region);
          if (maerskData && maerskData.length > 0) {
            const sample = JSON.stringify(maerskData.slice(0, 8)).substring(0, 4000);
            enhancedPrompt = `IMPORTANT: Use this REAL live Maersk location data as the primary source for terminal/depot locations. Build the response around these real locations: ${sample}\n\nUser query:\n${prompt}`;
            console.log('Enhanced prompt with', maerskData.length, 'real Maersk locations');
          }
        }
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
