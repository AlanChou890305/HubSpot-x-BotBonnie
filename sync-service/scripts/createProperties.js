/**
 * One-time setup script: create BotBonnie property group and all custom contact properties in HubSpot.
 * Run once per environment:
 *   node scripts/createProperties.js
 *
 * Uses HS_PERSONAL_ACCESS_KEY (from hubspot.config.yml) to exchange for an OAuth token,
 * then calls the v1 properties API which works without granular scope migration.
 */
require('dotenv').config();
const axios = require('axios');

const GROUP_NAME = 'botbonnie';
const GROUP_LABEL = 'BotBonnie';

const PROPERTIES = [
  {
    name: 'botbonnie_line_user_id',
    label: 'BotBonnie: LINE User ID',
    hasUniqueValue: true,
    description: 'LINE User ID from BotBonnie (rawId). Used as the unique sync key.'
  },
  { name: 'botbonnie_display_name', label: 'BotBonnie: Display Name', description: 'LINE display name from BotBonnie' },
  { name: 'botbonnie_profile_pic', label: 'BotBonnie: Profile Picture URL', description: 'LINE profile picture URL' },
  { name: 'botbonnie_created_at', label: 'BotBonnie: Created At', description: 'Timestamp when contact was created in BotBonnie' },
  { name: 'botbonnie_status_message', label: 'BotBonnie: Status Message', description: 'LINE profile status message' },
  { name: 'botbonnie_gender', label: 'BotBonnie: Gender', description: 'Gender from BotBonnie contact demographics' },
  { name: 'botbonnie_location', label: 'BotBonnie: Location', description: 'Location from BotBonnie contact demographics' },
  { name: 'botbonnie_birthday', label: 'BotBonnie: Birthday', description: 'Birthday from BotBonnie contact demographics (YYYY-MM-DD)' },
  { name: 'botbonnie_tags', label: 'BotBonnie: Tags', description: 'All BotBonnie tags applied to this contact (comma-separated)' }
];

async function getToken() {
  const pak = process.env.HS_PERSONAL_ACCESS_KEY;
  if (!pak) throw new Error('HS_PERSONAL_ACCESS_KEY is required in .env');
  const { data } = await axios.post('https://api.hubapi.com/localdevauth/v1/auth/refresh',
    { encodedOAuthRefreshToken: pak },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data.oauthAccessToken;
}

async function run() {
  const token = await getToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 1. Create property group
  console.log(`Creating property group "${GROUP_NAME}"...`);
  try {
    await axios.post('https://api.hubapi.com/properties/v1/contacts/groups', {
      name: GROUP_NAME, displayName: GROUP_LABEL
    }, { headers });
    console.log(`  Group "${GROUP_NAME}" created.`);
  } catch (err) {
    if (err.response?.status === 409 || err.response?.data?.message?.includes('already exists')) {
      console.log(`  Group "${GROUP_NAME}" already exists, skipping.`);
    } else {
      console.error(`  Failed to create group:`, err.response?.data?.message || err.message);
    }
  }

  // 2. Create each property
  for (const prop of PROPERTIES) {
    console.log(`Creating property "${prop.name}"...`);
    try {
      await axios.post('https://api.hubapi.com/properties/v1/contacts/properties', {
        name: prop.name, label: prop.label, description: prop.description || '',
        groupName: GROUP_NAME, type: 'string', fieldType: 'text',
        ...(prop.hasUniqueValue && { options: [] })
      }, { headers });
      console.log(`  "${prop.name}" created.`);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message?.includes('already exists')) {
        console.log(`  "${prop.name}" already exists, skipping.`);
      } else {
        console.error(`  Failed to create "${prop.name}":`, err.response?.data?.message || err.message);
      }
    }
  }

  console.log('\nDone! All BotBonnie properties are ready in HubSpot.');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
