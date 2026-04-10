const { getHubSpotClient } = require('../lib/hubspotClient');
const { mapToHubSpotProperties } = require('./mapProperties');

const BATCH_SIZE = 100;

/**
 * Upsert an array of BotBonnie users into HubSpot contacts.
 * - Users with email: upsert by email (patches existing contacts, adds LINE user ID)
 * - Users without email: upsert by botbonnie_line_user_id
 */
async function upsertContacts(users) {
  if (!users || users.length === 0) return;

  const client = getHubSpotClient();

  const withEmail = users.filter(u => u.userId && u.email);
  const withoutEmail = users.filter(u => u.userId && !u.email);
  const dropped = users.filter(u => !u.userId);
  if (dropped.length > 0) {
    console.warn(`[upsertContacts] Skipping ${dropped.length} users with no userId`);
  }

  await batchUpsert(client, withEmail, 'email');
  await batchUpsert(client, withoutEmail, 'botbonnie_line_user_id');
}

async function batchUpsert(client, users, idProperty) {
  if (users.length === 0) return;

  const chunks = chunkArray(users, BATCH_SIZE);

  for (const chunk of chunks) {
    const inputs = chunk.map(user => ({
      idProperty,
      id: idProperty === 'email' ? user.email : user.userId,
      properties: mapToHubSpotProperties(user)
    }));

    try {
      await client.crm.contacts.batchApi.upsert({ inputs });
    } catch (err) {
      console.error(`[upsertContacts] Batch upsert error (idProperty=${idProperty}):`, err.message);
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
