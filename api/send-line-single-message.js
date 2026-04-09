const axios = require('axios');
const { Client } = require('@hubspot/api-client');
const { verifyAndParse } = require('./_verify');

const BOTBONNIE_BASE_URL = 'https://api.botbonnie.com/v2';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await verifyAndParse(req, res);
  if (!body) return; // verifyAndParse already wrote the error response

  if (!body.inputFields) {
    return res.status(400).json({ error: 'Missing required body fields' });
  }

  const { object, inputFields } = body;
  const { lineUserId, messageType, messageText, imageUrl } = inputFields;

  let message;
  if (messageType === 'text') {
    message = { type: 'text', text: messageText };
  } else if (messageType === 'image') {
    message = { type: 'image', imageUrl };
  } else {
    message = { type: messageType, text: messageText };
  }

  try {
    await axios.post(
      `${BOTBONNIE_BASE_URL}/message/push`,
      {
        pageId: process.env.BOTBONNIE_PAGE_ID,
        platform: 1,
        userId: lineUserId,
        message
      },
      { headers: { Authorization: `Bearer ${process.env.BOTBONNIE_API_TOKEN}` } }
    );
  } catch (err) {
    console.error('[sendLineSingleMessage] BotBonnie error:', err.response?.data || err.message);
  }

  try {
    const hsClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
    await hsClient.events.send.basicApi.sendEvent({
      eventName: process.env.HS_CUSTOM_EVENT_NAME,
      objectId: String(object.objectId),
      properties: {
        line_user_id: lineUserId,
        message_type: messageType,
        message_text: messageText || ''
      },
      occurredAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[sendLineSingleMessage] HubSpot event error:', err.message);
  }

  return res.status(200).json({ outputFields: {} });
};

handler.config = { api: { bodyParser: false } };
module.exports = handler;
