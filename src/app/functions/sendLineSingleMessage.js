const axios = require('axios');
const { Client } = require('@hubspot/api-client');

const BOTBONNIE_BASE_URL = 'https://api.botbonnie.com/v2';

exports.main = async (context) => {
  const { object, inputFields } = context.body;
  const { lineUserId, messageType, messageText, imageUrl } = inputFields;

  const BOTBONNIE_API_TOKEN = process.env.BOTBONNIE_API_TOKEN;
  const BOTBONNIE_PAGE_ID = process.env.BOTBONNIE_PAGE_ID;
  const HS_CUSTOM_EVENT_NAME = process.env.HS_CUSTOM_EVENT_NAME;

  // Build BotBonnie message payload
  let message;
  if (messageType === 'text') {
    message = { type: 'text', text: messageText };
  } else if (messageType === 'image') {
    message = { type: 'image', imageUrl };
  } else {
    message = { type: messageType, text: messageText };
  }

  // 1. Send message via BotBonnie
  try {
    await axios.post(
      `${BOTBONNIE_BASE_URL}/message/push`,
      {
        pageId: BOTBONNIE_PAGE_ID,
        platform: 1, // 1 = LINE
        userId: lineUserId,
        message
      },
      {
        headers: { Authorization: `Bearer ${BOTBONNIE_API_TOKEN}` }
      }
    );
  } catch (err) {
    // Log error but return 200 to avoid HubSpot workflow retry causing duplicate sends
    console.error('[sendLineSingleMessage] BotBonnie error:', err.response?.data || err.message);
  }

  // 2. Fire HubSpot Custom Event on contact timeline
  try {
    const hsClient = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
    await hsClient.events.send.basicApi.sendEvent({
      eventName: HS_CUSTOM_EVENT_NAME,
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

  return {
    statusCode: 200,
    body: JSON.stringify({ outputFields: {} })
  };
};
