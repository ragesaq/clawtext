const { execFile } = require('child_process');
const util = require('util');
const execFileP = util.promisify(execFile);

async function runOpenClaw(args, options = {}) {
  return execFileP('openclaw', args, {
    timeout: options.timeout ?? 15000,
    maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024,
  });
}

async function sendNote(targetChannelId, note) {
  try {
    await runOpenClaw([
      'message',
      'send',
      '--channel', 'discord',
      '--target', `channel:${targetChannelId}`,
      '-m', String(note || ''),
      '--json',
    ]);
    return true;
  } catch (err) {
    throw new Error(`Failed to send note: ${err.message}`);
  }
}

async function postHandoff(sourceThreadId, newThreadUrl, _newThreadId) {
  const note = `🔀 Continuing in ${newThreadUrl}`;
  return sendNote(sourceThreadId, note);
}

async function postSplitLink(sourceThreadId, newThreadUrl, _newThreadId, title) {
  const note = `🔀 A new thread was created: ${title} — ${newThreadUrl}`;
  return sendNote(sourceThreadId, note);
}

module.exports = { postHandoff, postSplitLink };
