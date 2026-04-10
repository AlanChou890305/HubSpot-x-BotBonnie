const crypto = require('crypto');

async function getRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (maxBytes && totalSize > maxBytes) {
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Reads raw body, verifies HubSpot v3 signature, and returns the parsed JSON body.
 * Returns null and writes error response on failure.
 * HUBSPOT_CLIENT_SECRET must be set — requests are rejected if it is missing.
 */
async function verifyAndParse(req, res) {
  const secret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!secret) {
    console.error('[webhook] HUBSPOT_CLIENT_SECRET is not set — rejecting request');
    res.status(500).json({ error: 'Webhook not configured' });
    return null;
  }

  const rawBody = await getRawBody(req, MAX_BODY_BYTES);
  if (rawBody === null) {
    res.status(413).json({ error: 'Request body too large' });
    return null;
  }

  const signature = req.headers['x-hubspot-signature-v3'];
  const timestamp = req.headers['x-hubspot-request-timestamp'];

  if (!signature || !timestamp) {
    res.status(400).json({ error: 'Missing HubSpot signature headers' });
    return null;
  }

  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 300000) {
    res.status(400).json({ error: 'Request timestamp expired' });
    return null;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const fullUrl = `${proto}://${host}${req.url}`;
  const sourceString = `POST${fullUrl}${rawBody.toString('utf8')}${timestamp}`;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(sourceString, 'utf8')
    .digest('base64');

  try {
    const sigBuf = Buffer.from(signature, 'base64');
    const expBuf = Buffer.from(expectedSig, 'base64');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ error: 'Invalid signature' });
      return null;
    }
  } catch {
    res.status(401).json({ error: 'Invalid signature' });
    return null;
  }

  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return null;
  }
}

module.exports = { verifyAndParse };
