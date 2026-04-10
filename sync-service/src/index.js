require('dotenv').config();
const cron = require('node-cron');
const { runSync } = require('./sync/pollBotBonnie');

const SYNC_CRON = process.env.SYNC_CRON || '*/15 * * * *';

let isRunning = false;

cron.schedule(SYNC_CRON, async () => {
  if (isRunning) {
    console.warn(`[${new Date().toISOString()}] Sync already in progress — skipping tick`);
    return;
  }
  isRunning = true;
  console.log(`[${new Date().toISOString()}] Starting BotBonnie → HubSpot sync`);
  try {
    await runSync();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, err.message);
  } finally {
    isRunning = false;
  }
});

console.log(`[sync-service] Started. Cron: "${SYNC_CRON}"`);
