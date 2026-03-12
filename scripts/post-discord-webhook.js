#!/usr/bin/env node

/**
 * Post a message to Discord via Webhook
 * Usage: node post-discord-webhook.js <webhook_url> <message>
 */

const fetch = require('node-fetch');

async function postToWebhook(webhookUrl, content) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  
  if (response.ok) {
    console.log('✅ Message posted!');
  } else {
    const error = await response.text();
    console.error('❌ Failed:', response.status, error);
  }
}

// If run directly
if (require.main === module) {
  const webhookUrl = process.argv[2];
  const message = process.argv.slice(3).join(' ');
  
  if (!webhookUrl || !message) {
    console.error('Usage: node post-discord-webhook.js <webhook_url> <message>');
    process.exit(1);
  }
  
  postToWebhook(webhookUrl, message);
}

module.exports = { postToWebhook };
