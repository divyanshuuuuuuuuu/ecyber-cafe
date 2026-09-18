/**
 * Serverless API route for Remove.bg background removal.
 * Compatible with Vercel, Netlify, and standard Node.js serverless functions.
 * Keeps the REMOVE_BG_API_KEY secure on the server side.
 */

async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'REMOVE_BG_API_KEY environment variable is not configured on the server. Please set it in your environment or .env file.'
    });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        res.status(400).json({ error: 'Invalid JSON request body.' });
        return;
      }
    }

    const { image_file_b64, size = 'auto' } = body || {};

    if (!image_file_b64) {
      res.status(400).json({ error: 'Missing image_file_b64 in request body.' });
      return;
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_file_b64,
        size
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = `Remove.bg API responded with status ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.errors && parsed.errors.length > 0) {
          errMessage = parsed.errors[0].title || errMessage;
        }
      } catch (e) {
        if (errText) errMessage = errText;
      }
      res.status(response.status).json({ error: errMessage });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Remove.bg API Handler Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while processing Remove.bg request.' });
  }
}

module.exports = handler;
module.exports.default = handler;
