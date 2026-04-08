const { Client } = require('@hubspot/api-client');

let _client = null;

function getHubSpotClient() {
  if (!_client) {
    _client = new Client({ accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN });
  }
  return _client;
}

module.exports = { getHubSpotClient };
