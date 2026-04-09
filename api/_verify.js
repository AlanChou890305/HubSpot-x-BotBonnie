const crypto = require('crypto');

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Reads raw body, verifies HubSpot v3 signature (if HUBSPOT_CLIENT_SECRET is set),
 * and returns the parsed JSON body. Returns null and writes error response on failure.
 */
async function verifyAndParse(req, res) {
  const rawBody = await getRawBody(req);

  const secret = process.env.HUBSPOT_CLIENT_SECRET;
  if (secret) {
    const signature = req.headers['x-hubspot-signature-v3'];
    const timestamp = req.headers['x-hubspot-request-timestamp'];

    if (!signature || !timestamp) {
      res.status(400).json({ error: 'Missing HubSpot signature headers' });
      return null;
    }

    if (Math.abs(Date.now() - Number(timestamp)) > 300000) {
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
  } else {
    console.warn('[webhook] HUBSPOT_CLIENT_SECRET not set — skipping signature verification');
  }

  return JSON.parse(rawBody.toString('utf8'));
}

module.exports = { verifyAndParse };
