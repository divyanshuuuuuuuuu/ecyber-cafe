/**
 * eCyber Cafe local development server with Remove.bg API proxy.
 * Zero external dependencies. Uses Node.js built-in modules.
 *
 * Usage:
 *   node server.js [port]
 * Example:
 *   node server.js 8000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env file if present
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp'
};

const port = parseInt(process.argv[2] || process.env.PORT || '8000', 10);

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle Remove.bg API Route
  const cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/api/removebg' || cleanUrl === '/api/removebg/') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'REMOVE_BG_API_KEY environment variable is not configured on the server. Please add it to your .env file.'
      }));
      return;
    }

    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
      // Limit to 20MB
      if (rawBody.length > 20 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON request payload' }));
        return;
      }

      const { image_file_b64, size = 'auto' } = parsed || {};
      if (!image_file_b64) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing image_file_b64 parameter' }));
        return;
      }

      const postData = JSON.stringify({
        image_file_b64,
        size
      });

      const options = {
        hostname: 'api.remove.bg',
        port: 443,
        path: '/v1.0/removebg',
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        const chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'image/png',
            'Content-Length': buffer.length
          });
          res.end(buffer);
        });
      });

      proxyReq.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Proxy Error: ${err.message}` }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    });

    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);

  // Security check: ensure path is within directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log('==================================================');
  console.log(' eCyber Cafe Automation Suite is running (Node.js)!');
  console.log(` Local URL: http://localhost:${port}`);
  console.log(` Remove.bg API Key: ${process.env.REMOVE_BG_API_KEY ? 'Configured from environment' : 'Missing (check .env)'}`);
  console.log(' Press Ctrl+C to stop the server.');
  console.log('==================================================');
});
