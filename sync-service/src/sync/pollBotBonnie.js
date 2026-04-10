const { listContacts } = require('../lib/botbonnieClient');
const { upsertContacts } = require('./upsertContacts');

/**
 * Full sync: paginate through all BotBonnie LINE contacts and upsert to HubSpot.
 */
async function runSync() {
  let cursor = null;
  let totalProcessed = 0;
  let page = 0;

  do {
    page++;
    let result;
    try {
      result = await listContacts({ next: cursor });
    } catch (err) {
      console.error(`[pollBotBonnie] Failed to fetch page ${page}:`, err.message);
      break;
    }

    const { users, next } = result;
    if (!users || users.length === 0) break;

    await upsertContacts(users);
    totalProcessed += users.length;
    cursor = next;

    console.log(`[pollBotBonnie] Page ${page}: processed ${users.length} contacts (total: ${totalProcessed})`);
  } while (cursor);

  console.log(`[pollBotBonnie] Sync complete. Total contacts processed: ${totalProcessed}`);
}

module.exports = { runSync };
