const axios = require('axios');
const { Client } = require('@hubspot/api-client');
const { verifyAndParse } = require('./_verify');

const BOTBONNIE_BASE_URL = 'https://api.botbonnie.com/v2';

let _hsClient = null;
function getHsClient() {
  if (!_hsClient) _hsClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
  return _hsClient;
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await verifyAndParse(req, res);
  if (!body) return;

  if (!body.object || !body.inputFields) {
    return res.status(400).json({ error: 'Missing required body fields' });
  }

  const { object, inputFields } = body;
  const { lineUserId, messageText } = inputFields;

  if (!lineUserId) {
    return res.status(400).json({ error: 'Missing required field: lineUserId' });
  }

  try {
    await axios.post(
      `${BOTBONNIE_BASE_URL}/message/push`,
      {
        pageId: process.env.BOTBONNIE_PAGE_ID,
        platform: 1, // 1 = LINE (BotBonnie platform constant)
        userId: lineUserId,
        message: { type: 'text', text: messageText || '' }
      },
      {
        headers: { Authorization: `Bearer ${process.env.BOTBONNIE_API_TOKEN}` },
        timeout: 10000
      }
    );
  } catch (err) {
    console.error('[sendLineTextMessage] BotBonnie error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send LINE message' });
  }

  try {
    await getHsClient().events.send.basicApi.sendEvent({
      eventName: process.env.HS_CUSTOM_EVENT_NAME,
      objectId: String(object.objectId ?? ''),
      properties: {
        line_user_id: lineUserId,
        message_type: 'text',
        message_text: messageText
      },
      occurredAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[sendLineTextMessage] HubSpot event error:', err.message);
  }

  return res.status(200).json({ outputFields: {} });
};

handler.config = { api: { bodyParser: false } };
module.exports = handler;
