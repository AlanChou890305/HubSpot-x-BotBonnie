/**
 * One-time setup script: create BotBonnie property group and all custom contact properties in HubSpot.
 * Run once per environment:
 *   node scripts/createProperties.js
 */
require('dotenv').config();
const { Client } = require('@hubspot/api-client');

const client = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });

const GROUP_NAME = 'botbonnie';
const GROUP_LABEL = 'BotBonnie';

const PROPERTIES = [
  {
    name: 'botbonnie_line_user_id',
    label: 'BotBonnie: LINE User ID',
    type: 'string',
    fieldType: 'text',
    hasUniqueValue: true, // Required for batch upsert by idProperty
    description: 'LINE User ID from BotBonnie (rawId). Used as the unique sync key.'
  },
  {
    name: 'botbonnie_display_name',
    label: 'BotBonnie: Display Name',
    type: 'string',
    fieldType: 'text',
    description: 'LINE display name from BotBonnie'
  },
  {
    name: 'botbonnie_profile_pic',
    label: 'BotBonnie: Profile Picture URL',
    type: 'string',
    fieldType: 'text',
    description: 'LINE profile picture URL'
  },
  {
    name: 'botbonnie_created_at',
    label: 'BotBonnie: Created At',
    type: 'string',
    fieldType: 'text',
    description: 'Timestamp when contact was created in BotBonnie'
  },
  {
    name: 'botbonnie_status_message',
    label: 'BotBonnie: Status Message',
    type: 'string',
    fieldType: 'text',
    description: 'LINE profile status message'
  },
  {
    name: 'botbonnie_gender',
    label: 'BotBonnie: Gender',
    type: 'string',
    fieldType: 'text',
    description: 'Gender from BotBonnie contact demographics'
  },
  {
    name: 'botbonnie_location',
    label: 'BotBonnie: Location',
    type: 'string',
    fieldType: 'text',
    description: 'Location from BotBonnie contact demographics'
  },
  {
    name: 'botbonnie_birthday',
    label: 'BotBonnie: Birthday',
    type: 'string',
    fieldType: 'text',
    description: 'Birthday from BotBonnie contact demographics (YYYY-MM-DD)'
  },
  {
    name: 'botbonnie_tags',
    label: 'BotBonnie: Tags',
    type: 'string',
    fieldType: 'text',
    description: 'All BotBonnie tags applied to this contact (comma-separated)'
  }
];

async function run() {
  // 1. Create property group
  console.log(`Creating property group "${GROUP_NAME}"...`);
  try {
    await client.crm.properties.groupsApi.create('contacts', {
      name: GROUP_NAME,
      label: GROUP_LABEL
    });
    console.log(`  Group "${GROUP_NAME}" created.`);
  } catch (err) {
    if (err.code === 409 || err.message?.includes('already exists')) {
      console.log(`  Group "${GROUP_NAME}" already exists, skipping.`);
    } else {
      console.error(`  Failed to create group:`, err.message);
    }
  }

  // 2. Create each property
  for (const prop of PROPERTIES) {
    console.log(`Creating property "${prop.name}"...`);
    try {
      await client.crm.properties.coreApi.create('contacts', {
        name: prop.name,
        label: prop.label,
        type: prop.type,
        fieldType: prop.fieldType,
        groupName: GROUP_NAME,
        hasUniqueValue: prop.hasUniqueValue || false,
        description: prop.description || ''
      });
      console.log(`  "${prop.name}" created.`);
    } catch (err) {
      if (err.code === 409 || err.message?.includes('already exists')) {
        console.log(`  "${prop.name}" already exists, skipping.`);
      } else {
        console.error(`  Failed to create "${prop.name}":`, err.message);
      }
    }
  }

  console.log('\nDone! All BotBonnie properties are ready in HubSpot.');
  console.log('Note: For dynamic parameter properties (botbonnie_param_*), create them manually in HubSpot');
  console.log('      matching the parameter keys you use in BotBonnie.');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
