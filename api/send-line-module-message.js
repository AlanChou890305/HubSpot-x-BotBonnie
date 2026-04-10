const axios = require('axios');
const { verifyAndParse } = require('./_verify');

const BOTBONNIE_BASE_URL = 'https://api.botbonnie.com/v2';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await verifyAndParse(req, res);
  if (!body) return; // verifyAndParse already wrote the error response

  if (!body.object || !body.inputFields) {
    return res.status(400).json({ error: 'Missing required body fields' });
  }

  const { object, inputFields } = body;
  const { lineUserId, moduleId } = inputFields;

  if (!lineUserId || !moduleId) {
    return res.status(400).json({ error: 'Missing required fields: lineUserId, moduleId' });
  }

  try {
    await axios.post(
      `${BOTBONNIE_BASE_URL}/message/push`,
      {
        pageId: process.env.BOTBONNIE_PAGE_ID,
        platform: 1, // 1 = LINE (BotBonnie platform constant)
        userId: lineUserId,
        moduleId
      },
      {
        headers: { Authorization: `Bearer ${process.env.BOTBONNIE_API_TOKEN}` },
        timeout: 10000
      }
    );
  } catch (err) {
    console.error('[sendLineModuleMessage] BotBonnie error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send LINE message' });
  }

  try {
    await axios.post(
      'https://api.hubapi.com/events/v3/send',
      {
        eventName: process.env.HS_CUSTOM_EVENT_NAME,
        objectId: String(object.objectId ?? ''),
        properties: {
          line_user_id: lineUserId,
          message_type: 'module',
          message_text: moduleId
        },
        occurredAt: new Date().toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PRIVATE_APP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
  } catch (err) {
    console.error('[sendLineModuleMessage] HubSpot event error:', err.response?.data || err.message);
  }

  return res.status(200).json({ outputFields: {} });
};

handler.config = { api: { bodyParser: false } };
module.exports = handler;
