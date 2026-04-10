const { runSync } = require('../sync-service/src/sync/pollBotBonnie');

const handler = async (req, res) => {
  // Vercel Cron Jobs send Authorization: Bearer $CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    await runSync();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[sync] Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = handler;
