const { getHubSpotClient } = require('../lib/hubspotClient');
const { mapToHubSpotProperties } = require('./mapProperties');

const BATCH_SIZE = 100; // HubSpot batch API limit

/**
 * Upsert an array of BotBonnie users into HubSpot contacts.
 * Uses botbonnie_line_user_id as the unique identifier (idProperty).
 */
async function upsertContacts(users) {
  if (!users || users.length === 0) return;

  const client = getHubSpotClient();
  const chunks = chunkArray(users, BATCH_SIZE);

  for (const chunk of chunks) {
    const inputs = chunk
      .filter(user => user.rawId) // skip users without a LINE User ID
      .map(user => ({
        idProperty: 'botbonnie_line_user_id',
        id: user.rawId,
        properties: mapToHubSpotProperties(user)
      }));

    if (inputs.length === 0) continue;

    try {
      await client.crm.contacts.batchApi.upsert({ inputs });
    } catch (err) {
      console.error('[upsertContacts] Batch upsert error:', err.message);
      // Log failed inputs for debugging
      if (err.body) console.error('[upsertContacts] Details:', JSON.stringify(err.body));
    }
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = { upsertContacts };
