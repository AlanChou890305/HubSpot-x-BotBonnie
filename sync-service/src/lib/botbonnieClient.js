const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.botbonnie.com/v2',
  headers: {
    Authorization: `Bearer ${process.env.BOTBONNIE_API_TOKEN}`
  }
});

/**
 * Paginate through BotBonnie contacts
 * @param {string|null} next - Pagination cursor
 * @returns {{ users: Array, next: string|null }}
 */
async function listContacts({ next = null } = {}) {
  const body = {
    pageId: process.env.BOTBONNIE_PAGE_ID,
    platform: 1 // 1 = LINE
  };
  if (next) body.next = next;

  const { data } = await client.post('/customer/list', body);
  return {
    users: data.users || [],
    next: data.next || null
  };
}

module.exports = { listContacts };
