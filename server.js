const http = require('http');
const https = require('https');

const KEY = process.env.ANTHROPIC_KEY;
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    console.log('Received body:', body.substring(0, 200));
    try {
      const parsed = JSON.parse(body);
      const messages = parsed.messages || [{ role: 'user', content: parsed.prompt || '' }];
      const payload = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages
      });
      console.log('Sending to Anthropic:', payload.substring(0, 200));
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
          console.log('Anthropic response status:', apiRes.statusCode);
          console.log('Anthropic response:', data.substring(0, 200));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      apiReq.on('error', (e) => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
      apiReq.write(payload);
      apiReq.end();
    } catch(e) {
      console.log('Parse error:', e.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});
