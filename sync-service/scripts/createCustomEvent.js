/**
 * One-time setup script: register the LINE Message Sent Custom Event schema in HubSpot.
 * Run once per environment:
 *   node scripts/createCustomEvent.js
 *
 * After running, copy the printed fullyQualifiedName and add it as a HubSpot secret:
 *   hs secret add HS_CUSTOM_EVENT_NAME --account=<your-account>
 */
require('dotenv').config();
const { Client } = require('@hubspot/api-client');

const client = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });

async function run() {
  console.log('Creating HubSpot Custom Event: LINE Message Sent...');

  const eventDef = await client.events.definitions.basicApi.create({
    label: 'LINE Message Sent',
    description: 'Fired when a LINE message is sent to a contact via a HubSpot Workflow action',
    primaryObject: 'CONTACT',
    propertyDefinitions: [
      {
        name: 'line_user_id',
        label: 'LINE User ID',
        type: 'string',
        description: 'BotBonnie rawId of the message recipient'
      },
      {
        name: 'message_type',
        label: 'Message Type',
        type: 'enumeration',
        description: 'Type of LINE message sent',
        options: [
          { label: 'Text', value: 'text', displayOrder: 0, hidden: false },
          { label: 'Image', value: 'image', displayOrder: 1, hidden: false },
          { label: 'Module', value: 'module', displayOrder: 2, hidden: false }
        ]
      },
      {
        name: 'message_text',
        label: 'Message Text / Module ID',
        type: 'string',
        description: 'Message content or BotBonnie module ID'
      }
    ]
  });

  console.log('\nCustom Event created successfully!');
  console.log('fullyQualifiedName:', eventDef.fullyQualifiedName);
  console.log('\nNext step — add this as a HubSpot secret:');
  console.log(`  hs secret add HS_CUSTOM_EVENT_NAME --account=<your-account>`);
  console.log(`  Value: ${eventDef.fullyQualifiedName}`);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  if (err.body) console.error('Details:', JSON.stringify(err.body, null, 2));
  process.exit(1);
});
