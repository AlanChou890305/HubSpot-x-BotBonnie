require('dotenv').config();
const cron = require('node-cron');
const { runSync } = require('./sync/pollBotBonnie');

const SYNC_CRON = process.env.SYNC_CRON || '*/15 * * * *';

cron.schedule(SYNC_CRON, async () => {
  console.log(`[${new Date().toISOString()}] Starting BotBonnie → HubSpot sync`);
  try {
    await runSync();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, err.message);
  }
});

console.log(`[sync-service] Started. Cron: "${SYNC_CRON}"`);
