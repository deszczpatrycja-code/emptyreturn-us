const http = require('http');
const https = require('https');

const KEY = process.env.ANTHROPIC_KEY;
const MAERSK_KEY = process.env.MAERSK_KEY;
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);
console.log('Anthropic Key present:', !!KEY);
console.log('Maersk Key present:', !!MAERSK_KEY);

// Helper: make HTTPS GET request
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

// Fetch Maersk locations for a US region
async function fetchMaerskLocations(region) {
  if (!MAERSK_KEY) return null;
  try {
    // Maersk Locations API - search for terminals/depots in the region
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
    const city = cityMap[region] || region;
    const url = `https://api.maersk.com/locations?cityName=${encodeURIComponent(city)}&countryCode=US`;
    const result = await httpsGet(url, {
      'Consumer-Key': MAERSK_KEY,
      'Accept': 'application/json'
    });
    console.log('Maersk API status:', result.status);
    if (result.status === 200) {
      return JSON.parse(result.body);
    }
    console.log('Maersk response:', result.body.substring(0, 200));
    return null;
  } catch(e) {
    console.error('Maersk fetch error:', e.message);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', anthropic: !!KEY, maersk: !!MAERSK_KEY }));
    return;
  }

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Maersk-specific endpoint for testing
  if (req.url.startsWith('/maersk-locations')) {
    const region = new URL(req.url, 'http://x').searchParams.get('region') || 'LA/Long Beach';
    const data = await fetchMaerskLocations(region);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data || { error: 'No data' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      const prompt = parsed.prompt || '';

      // Check if this is a Maersk search and try to inject real data
      let enhancedPrompt = prompt;
      if (prompt.includes('Maersk') || prompt.includes('Hamburg Sud')) {
        // Extract region from prompt
        const regionMatch = prompt.match(/Region:([^\s]+(?:\s+[^\s]+)?)/);
        if (regionMatch && MAERSK_KEY) {
          const region = regionMatch[1].trim();
          const maerskData = await fetchMaerskLocations(region);
          if (maerskData) {
            enhancedPrompt = `IMPORTANT: Use this REAL live Maersk location data as the primary source: ${JSON.stringify(maerskData).substring(0, 3000)}\n\n${prompt}`;
            console.log('Enhanced prompt with real Maersk data');
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
