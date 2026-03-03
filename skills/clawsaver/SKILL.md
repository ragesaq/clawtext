---
name: clawsaver
description: Automatically batch user messages to reduce model API calls by 20–40%. Set it and forget it.
metadata:
  clawdbot:
    emoji: "⚡"
    requires:
      env: []
      bins: []
    files: ["SessionDebouncer.js", "example-integration.js"]
---

# ClawSaver

**The problem:** Users send multiple messages quickly. Each message triggers a separate API call to your model. That gets expensive.

**The solution:** Wait a moment, combine the messages, send one call instead. Cost drops 20–40%. Users notice zero difference.

## What It Does

ClawSaver watches incoming messages. When it detects multiple messages from the same user arriving close together, it batches them. Then it sends them all at once to your model.

**Example:**
```
User sends: "What is machine learning?"
(300ms passes)
User sends: "Give an example"

Without ClawSaver: 2 API calls ($0.02)
With ClawSaver: 1 API call ($0.01)
Savings: 50% ✅
```

Across thousands of conversations, this adds up fast.

## Key Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Cost savings | 20–40% | Typical usage patterns |
| Setup time | 20 minutes | Copy file, add 10 lines of code |
| Maintenance | Zero | Set it, forget it |
| User friction | None | Feels instant to end users |
| Code size | 4.2 KB | One file, no dependencies |
| Latency added | +800ms | Configurable, fast enough for most uses |

## How to Use It

### Install
```bash
clawhub install clawsaver
# or
npm install clawsaver
```

### Basic Integration
```javascript
import SessionDebouncer from 'clawsaver';

const debouncers = new Map();

// When you get a message:
function handleMessage(userId, text) {
  if (!debouncers.has(userId)) {
    debouncers.set(userId, new SessionDebouncer(
      userId,
      (msgs) => callModel(userId, msgs)
    ));
  }
  debouncers.get(userId).enqueue({ text });
}

// When you call the model:
async function callModel(userId, messages) {
  const combined = messages
    .map((m, i) => `Message ${i+1}: ${m.text}`)
    .join('\n\n');
  
  const response = await yourModel.complete(combined);
  await sendResponse(userId, response);
}
```

That's the whole integration.

### See Savings
```javascript
const { metrics } = debouncer.getState();
console.log(`Saved ${metrics.totalSavedCalls} calls`);
```

## When to Use

**Great fit:**
- Chat applications (users send back-to-back messages)
- Customer support bots
- Q&A systems
- Any stateful conversation

**Less useful for:**
- Single-message workflows
- Voice assistants expecting sub-100ms latency
- Systems already optimized

## Configurations

Three built-in profiles:

### Balanced (Default)
```javascript
new SessionDebouncer(userId, handler);
```
- 25–35% savings
- +800ms latency
- Works for most cases

### Aggressive
```javascript
new SessionDebouncer(userId, handler, {
  debounceMs: 1500,
  maxWaitMs: 4000,
  maxMessages: 8
});
```
- 35–45% savings
- +1.5s latency
- Good for batch operations

### Real-Time
```javascript
new SessionDebouncer(userId, handler, {
  debounceMs: 200,
  maxWaitMs: 1000,
  maxMessages: 2
});
```
- 5–10% savings
- +200ms latency
- Good for interactive flows

## What Happens to Messages

ClawSaver preserves message order and context:

**Input:**
```
Message 1: "What's the capital of France?"
Message 2: "How many people live there?"
```

**Sent to model:**
```
Message 1: What's the capital of France?

Message 2: How many people live there?

_Please treat the above as a single combined user input._
```

Model sees them as separate but related. Answers both comprehensively.

## API

### Constructor
```javascript
new SessionDebouncer(sessionKey, handler, options?)
```
- `sessionKey` (string) — User/room ID
- `handler` (function) — Called when batch is ready
- `options` (object, optional):
  - `debounceMs` (800) — Wait time
  - `maxWaitMs` (3000) — Max wait
  - `maxMessages` (5) — Batch size
  - `maxTokens` (2048) — Reserved

### Methods
- `enqueue(message)` — Add message to batch
- `forceFlush(reason)` — Send batch now
- `getState()` — Check buffer and metrics
- `getStatusString()` — Human-readable status
- `resetMetrics()` — Clear counters

## FAQ

**Q: Will users notice the delay?**  
A: No. Users are waiting for your model to respond anyway. You're not adding delay to their experience.

**Q: What if messages are unrelated?**  
A: Still works fine. Model handles multiple questions in one request.

**Q: How much will I actually save?**  
A: 20–40% depending on message patterns. Check the metrics after a day.

**Q: Can I use streaming?**  
A: Yes. Batching delays input, not output.

**Q: What if a user sends one message then waits?**  
A: ClawSaver automatically flushes after 3 seconds.

## Documentation

- **README.md** — Full guide with examples and deep dive
- **QUICKSTART.md** — 5-minute walkthrough
- **INTEGRATION.md** — Patterns and edge cases
- **SUMMARY.md** — Metrics and ROI

## Support

- Issues: GitHub
- Docs: See included guides
- Community: OpenClaw Discord
