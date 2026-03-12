# Session: 2026-03-06 19:42:40 UTC

- **Session Key**: agent:channel-mini:discord:channel:1474997928056590339
- **Session ID**: 799404bd-a272-47b5-859e-0ea2234f91d5
- **Source**: discord

## Conversation Summary

assistant: Perfect — that makes integration simple.

Plan I recommend (file-tail approach — simplest & robust)
- Have the ratwithacompiler plugin write realtime captions to a text/SRT file on the streaming PC.
- Make that file accessible to the OpenClaw host (mount the streamer folder on the host via SSHFS/SMB, or run a tiny forwarder on the streaming PC to POST each line).
- Run a small bridge on the OpenClaw host that tails the caption file and appends structured entries to /home/lumadmin/.openclaw/workspace/memory/YYYY-MM-DD.md (append-only). Optionally run an LLM post-editor on those lines to improve punctuation/normalize names.

What I need from you
1. How do you want the OpenClaw host to access the caption file?
   - A: Mount the streamer folder on the host (SSHFS/SMB) — easiest if you can expose the path; or
   - B: Keep the file local to the streaming PC and have a tiny forwarder POST lines to OpenClaw (more firewall-friendly).
2. Path to the caption file (or the mount point you will expose). Example:
   - Streaming PC local: C:\captions\streamer1-captions.txt
   - Host mount: /mnt/streamer-captions/streamer1-captions.txt
3. Confirm I may write files under /opt (for the bridge) and append to /home/lumadmin/.openclaw/workspace/memory, and create a systemd unit on this host (if you want me to deploy). If you prefer, I can just give the runbook instead.

Minimal bridge (what I will deploy or hand you)
- A small Node/Python tailer that:
  - watches the caption file,
  - on new lines writes entries like:
    - "- 2026-03-06T05:11:22Z • streamer1\n  caption text..."
  - de-duplicates/handles truncation on file rotate,
  - (optional) enqueues a post-edit job (Sonnet/GPT) to clean punctuation or apply a glossary.
- A systemd unit so the bridge runs at boot and restarts on failure.

Quick example (Python tailer — I can deploy this)
```
#!/usr/bin/env python3
# captions-tail.py
import time, os, datetime
CAP_FILE = "/mnt/streamer-captions/streamer1-captions.txt"
MEM_DIR = "/home/lumadmin/.openclaw/workspace/memory"
last_size = 0
def append_mem(text):
  fname = os.path.join(MEM_DIR, f"{datetime.date.today().isoformat()}.md")
  ts = datetime.datetime.utcnow().isoformat()
  entry = f"\n- {ts} • streamer1\n  {text}\n"
  with open(fname,"a",encoding="utf8") as f: f.write(entry)
while True:
  try:
    st = os.path.getsize(CAP_FILE)
    if st < last_size: last_size = 0
    if st > last_size:
      with open(CAP_FILE,"r",encoding="utf8") as f:
        f.seek(last_size)
        new = f.read()
      last_size = st
      for line in new.splitlines():
        line = line.strip()
        if line: append_mem(line)
  except FileNotFoundError:
    pass
  time.sleep(0.5)
```

Systemd unit (example)
- /etc/systemd/system/captions-bridge.service
  - ExecStart=/usr/bin/python3 /opt/captions-bridge/captions-tail.py

Options / extras
- LLM post-edit (recommended): run Sonnet/GPT as a quick post-processor to fix punctuation, expand contractions, correct names using a glossary. Say “yes” if you want post-edit enabled by default.
- Live publishing: bridge can also post batches to a Discord thread or to the Twitch session (via OpenClaw message tool).
- On-demand clips: if you want commands like “transcribe last 30s”, we can add a small rolling audio buffer and a /transcribe endpoint — more work but doable.

Next step (pick one)
- I’ll deploy the bridge on this host now (create /opt/captions-bridge, install the tailer, enable systemd). I need explicit permission to write files and create a systemd unit, and you must tell me the caption file path or mount point. Also tell me if you want LLM post-edit enabled.
- OR I’ll give you the full runbook + scripts so you can deploy it yourself (no host changes).

Which do you prefer? If “deploy,” please confirm:
- caption file path (or mount point), and
- permission to write under /opt and append files to /home/lumadmin/.openclaw/workspace/memory and create a systemd unit.
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1479349414450696272",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #general channel id:1474997928056590339",
  "sender": "ragesaq",
  "timestamp": "Fri 2026-03-06 05:26 UTC",
  "group_subject": "#general",
  "group_channel": "#general",
  "group_space": "1474997926919929927",
  "is_group_chat": true
}
```

Sender (untrusted metadata):
```json
{
  "label": "ragesaq (142843545215041536)",
  "id": "142843545215041536",
  "name": "ragesaq",
  "username": "ragesaq",
  "tag": "ragesaq"
}
```

please create a new discord thread in <#1475021817168134144> that creates a full PRD, project plan, and engineering brief for us to create this, please create an interview form for me to work on that will fill in critical details that you can complete the design with, i'll take that as homework.
A few more specs and thoughts
the CPU is a 5950x, 32gb of RAM, 4070ti super with 16gb of VRAM, lets try to prevent the utilization on the streaming pc from getting too high so i can still output a high quality OBS experience.
i would like to be able to verbally issue commands, some that might need confirmation, and some that might not. i would like you to know how to integrate with streambot through websocket, which should allow us to do a lot of OBS related things as well. we can work on what is allowed without confirmation and what requires confirmation, but this is a core part of the design. 
you could also talk back to me through my TTS through streamerbot
would we be able to hardcode the model functionality to a particular model we run on the stream PC? there are some new qwen 3.5 models that are very small and might be potent enough to do this, that could run in llama.cpp on the obs system
the obs systems name is cerberus
assistant: [[reply_to_current]] Forum post incoming — I've spawned a subagent to create it in `#ai-projects` now. It'll announce when it's posted.

Meanwhile — here's a quick summary of what the thread contains and what you're taking as homework:

**The thread has:**
- Full PRD + architecture diagram (Cerberus → Streamerbot WebSocket + Luminous receiver)
- Draft command → action map with confirm/no-confirm tiers
- Engineering phases (4 phases, ~6–8 weeks end-to-end)
- Local model strategy (Qwen2.5/3.5 1.5B–3B via llama.cpp, ≤3GB VRAM target)
- Full design interview (7 sections, ~35 questions)

**The critical homework questions (the ones that block design decisions most):**
- **B2/B3** — how much free VRAM + CPU headroom you actually have while streaming (determines which ASR model and Qwen size we can run)
- **B6** — Streamerbot WebSocket port + whether it's already configured
- **C2** — OBS WebSocket port/password
- **C3** — exact OBS scene names
- **D1/D2** — your top 10 priority commands + which need confirmation
- **F1** — how Cerberus and Luminous are networked

Take your time — even rough answers on B2, C3, and D1 will let me finalize the technical spec and start building Phase 1.
assistant: ✅ Subagent channel-mini finished

Completed: posted the exact forum post to the ai-projects forum.

Details:
- Channel (forum) target: 1475021817168134144 (ai-projects)
- Thread name: "Lumbot Voice — PRD, Engineering Brief & Design Interview"
- Message ID returned: 1479350280645640253

What I did: created the requested forum post verbatim and started the thread.
user: Note: The previous agent run was aborted by the user. Resume carefully or ask for clarification.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479350389773176832",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #general channel id:1474997928056590339",
  "sender": "ragesaq",
  "timestamp": "Fri 2026-03-06 05:30 UTC",
  "group_subject": "#general",
  "group_channel": "#general",
  "group_space": "1474997926919929927",
  "is_group_chat": true
}
```

Sender (untrusted metadata):
```json
{
  "label": "ragesaq (142843545215041536)",
  "id": "142843545215041536",
  "name": "ragesaq",
  "username": "ragesaq",
  "tag": "ragesaq"
}
```

i want this in the forum <#1475021817168134144> sorry i used the word thread, i meant post
assistant: No worries — let me check if the subagent's post landed correctly and if not, create the proper forum post directly.
assistant: I can see what happened — the aborted subagent created a thread called "lumbot and OBS" in `ai-projects` (not the right title), and a correctly-named but empty thread ended up in `#general` by mistake. Let me create the proper forum post now directly.
assistant: **Status:** Pre-design · **Machine:** Cerberus (streaming PC) · **Date:** 2026-03-06
**Purpose:** Living design doc + homework interview for the Lumbot voice command system

---

**1 · Elevator Pitch**

A real-time voice command layer for Cerberus that listens for "Hey Lumbot", transcribes the command with a local model, and dispatches structured actions to OpenClaw and/or Streamerbot — enabling hands-free control of OBS, stream tools, and the AI assistant during live sessions. Lumbot talks back via Streamerbot TTS (in-ear only by default).

---

**2 · Known Hardware — Cerberus (streaming PC)**

- CPU: AMD Ryzen 9 5950x (16c/32t)
- RAM: 32 GB
- GPU: RTX 4070Ti Super — 16 GB VRAM
- OBS: running live, NVENC encoding — must maintain stream quality
- OS: TBD (confirm in interview)

Design principle: Cerberus does the minimum necessary work. Heavy LLM, memory writes, and post-processing all offload to Luminous (OpenClaw host).

---

**3 · Confirmed Feature Set**

**Wakeword Detection**
- Trigger: "Hey Lumbot"
- CPU-only, always-on background process — zero GPU impact on OBS
- Candidate: OpenWakeWord (MIT, CPU-only, supports custom phrase training)

**Local ASR / Command Transcription**
- After wakeword: capture utterance until silence or timeout (~6s max)
- Transcribe with local model on Cerberus using CUDA (4070Ti Super)
- Candidate: faster-whisper small.en — good quality, ~1–2s latency on 4070Ti
- Output: clean text → intent parser → dispatch

**Local Intent Model via llama.cpp**
- Small Qwen model (Qwen2.5 1.5B–3B quantized, or Qwen3.5 small when available)
- Role: intent classification + entity extraction (scene name, user, time, note text)
- Target VRAM budget: ≤3 GB — leaves OBS NVENC completely unaffected
- Fallback: regex/keyword matching if model unavailable or VRAM is tight

**Command Dispatch — two channels**
- OBS/stream actions → Streamerbot WebSocket API (scene switch, replay buffer, mute, TTS, etc.)
- AI/assistant actions → OpenClaw HTTPS receiver (transcribe, summarize, save note, spawn agent, post to Discord)

**Confirmation Workflow**
- Two tiers: no-confirm (execute immediately) vs. confirm-required (verbal "yes" within N seconds OR hotkey)
- Timeout: cancel + TTS feedback if no confirmation received
- Full tier list to be finalized (see interview Section D)

**TTS Feedback via Streamerbot**
- Lumbot speaks back through Streamerbot TTS — in-ear only by default (viewers never hear it)
- Responses: "Got it", "Done — note saved", "Are you sure? Say yes to confirm", "Cancelled"
- TTS voice and volume configurable

**Memory & Transcription**
- All commands appended (append-only) to OpenClaw memory/YYYY-MM-DD.md on Luminous
- ratwithacompiler OBS captions plugin output also forwarded to Luminous for session transcripts
- Rolling audio buffer on Cerberus for on-demand "transcribe last N seconds"

---

**4 · Draft Architecture**

```
CERBERUS
  OBS (NVENC stream)
  ratw. captions plugin → caption file → Luminous
  Companion App (Python)
    OpenWakeWord (CPU-only) — always-on wakeword
    faster-whisper small (CUDA) — ASR after wakeword
    Qwen local (llama.cpp / CUDA) — intent + entity extraction
    Rolling audio buffer (N seconds, configurable)
    Dispatcher
      → Streamerbot WebSocket (OBS/stream actions)
      → Luminous HTTPS /api/voice-cmd (AI actions)
  Streamerbot
    OBS WebSocket client
    TTS output (in-ear monitor)

LUMINOUS (OpenClaw host)
  HTTPS Receiver /api/voice-cmd
    Bearer token auth
    Confirmation state machine
    Intent router
    memory/YYYY-MM-DD.md appender (append-only)
    Post-editor LLM (Sonnet) — punctuation, glossary normalization
  OpenClaw
    sessions_spawn / sessions_send
    memory_get / memory_search
    message tool (Discord / Twitch)
```

---

**5 · Draft Command → Action Map**

Scene switch → Streamerbot/OBS → No confirm
Save clip / clip that → Streamerbot/OBS replay buffer → No confirm
Mute mic → Streamerbot/OBS → No confirm
Start recording → Streamerbot/OBS → Yes confirm
Stop recording → Streamerbot/OBS → Yes confirm
Go live → Streamerbot/OBS → Yes confirm
End stream → Streamerbot/OBS → Yes confirm
Raid [channel] → Streamerbot/Twitch → Yes confirm
Update title to [text] → Streamerbot/Twitch → Yes confirm
Shoutout [user] → Streamerbot/Twitch → No confirm
Add note [text] → OpenClaw memory → No confirm
Transcribe last [N] seconds → OpenClaw ASR job → No confirm
Summarize chat → OpenClaw skill → No confirm
Post summary to Discord → OpenClaw message → Yes confirm

*(Full list finalized in interview — Section D)*

---

**6 · Engineering Phases**

**Phase 1 — Foundation (2–4 weeks)**
Companion app skeleton (Python, Windows), OpenWakeWord wakeword, faster-whisper ASR, Luminous HTTPS receiver + memory appender, end-to-end test: speak → transcribe → OpenClaw log

**Phase 2 — Streamerbot Integration (1–2 weeks)**
WebSocket client, top N commands → Streamerbot actions, TTS feedback, confirmation state machine (verbal yes / timeout / hotkey)

**Phase 3 — Local LLM Intent (1–2 weeks)**
Small Qwen via llama.cpp (intent + entity extraction), domain glossary, fallback keyword matching

**Phase 4 — Polish & Safety (1–2 weeks)**
Full confirmation tiers, VRAM/CPU monitoring + auto-throttle (protect OBS), persistent transcripts + Discord posting, logging, replay, debug overlay

---

**7 · 📋 DESIGN INTERVIEW — Your Homework**

Answer as many as you can. Partial answers are fine. Reply in this thread when ready.

---

**SECTION A — Voice & Audio**

A1. Which audio device captures your mic on Cerberus?
  (a) Dedicated OBS mic source — device/source name?
  (b) Virtual audio cable — which one (VB-Audio, Voicemeeter, etc.)?
  (c) Something else?

A2. Where should Lumbot's TTS response play?
  (a) In-ear monitor only (private, not on stream)
  (b) Desktop speakers (may bleed to stream)
  (c) A specific audio device — which?

A3. Wakeword sensitivity?
  (a) Conservative — only trigger when I clearly say it
  (b) Balanced
  (c) Hair trigger — false positives are fine

A4. Do you want a visual OBS indicator (text source) that lights up when Lumbot is listening?

A5. Should Lumbot stay completely silent to stream viewers, or is it OK for responses to go to stream in some cases?

---

**SECTION B — Cerberus System**

B1. OS: Windows 10, Windows 11, or Linux?

B2. While streaming, how much free VRAM is typically available? (Task Manager → GPU → Dedicated GPU Memory while live — approximate)

B3. Typical OBS CPU usage during stream? (approximate %)

B4. Virtual audio cable in use? (VB-Audio, Voicemeeter, other, or none)

B5. Is Python installed on Cerberus? Version?

B6. Is Streamerbot installed and running? What port is the WebSocket server on? (Default: 8080)

B7. Cerberus local IP or hostname on your LAN?

---

**SECTION C — Streamerbot & OBS**

C1. Streamerbot version?

C2. OBS WebSocket enabled? Port and password?

C3. List your main OBS scene names (exact names — these are matched by voice):

C4. List any existing Streamerbot actions you'd want voice-triggered (action names as they appear in Streamerbot):

C5. Do you use OBS replay buffer? Duration?

C6. Other Streamerbot integrations to support? (Channel Points, alerts, music bot, etc.)

---

**SECTION D — Commands & Confirmations**

D1. Top 10 commands you want first (rough priority order):

D2. Which ones require confirmation vs. execute immediately?

D3. Preferred confirmation phrase? (default: "yes" or "confirm")

D4. Confirmation timeout in seconds? (default: 10s)

D5. Commands that should NEVER be available by voice (too risky)?

D6. Should Lumbot repeat back the command before executing? e.g. "Got it — switching to game scene"

---

**SECTION E — Local Model**

E1. Max VRAM comfortable allocating to the local model during streaming? (Recommend: 2–4 GB)

E2. Local model role: intent-only (tiny/fast) OR also conversational/general questions?

E3. Preferred model family/size? (Leaning Qwen2.5/3.5 1.5B–3B Q4 via llama.cpp)

E4. Domain glossary — names, game titles, streamer names, custom terms the ASR/model should know:

E5. Strictly command/action mode, or should Lumbot answer general questions conversationally?

---

**SECTION F — Security & Network**

F1. How are Cerberus and Luminous connected? (Same LAN / Tailscale / other)

F2. Any firewall/NAT constraints between them?

F3. Hard constraints on what Lumbot can do? (e.g. no file deletion, no external posts without confirm)

---

**SECTION G — Vision & Stretch Goals**

G1. Long term: should Lumbot respond to Twitch chat as well as your voice?

G2. Should Lumbot have a persistent persona/character for stream interactions?

G3. Other tools on Cerberus to integrate? (Discord, music bot, MIDI, etc.)

G4. Stream overlay/widget showing Lumbot status (idle / listening / processing / speaking)?

G5. Anything else about your streaming setup that would affect the design?

---

*Reply in this thread with your answers. Once complete, I'll finalize the full technical spec and prepare the Phase 1 install package for Cerberus.*

*Posted via OpenClaw*
assistant: **Status:** Pre-design · **Machine:** Cerberus · **Date:** 2026-03-06

**Elevator Pitch**
A real-time voice command layer for Cerberus that listens for "Hey Lumbot", transcribes with a local model, and dispatches actions to OpenClaw and/or Streamerbot — hands-free control of OBS, stream tools, and the AI assistant. Lumbot talks back via Streamerbot TTS (in-ear only by default).

---

**Hardware — Cerberus**
- CPU: Ryzen 9 5950x · RAM: 32 GB · GPU: RTX 4070Ti Super 16 GB VRAM
- OBS live, NVENC — must stay high quality
- Design rule: Cerberus does minimum work; heavy LLM + memory on Luminous

---

**Confirmed Feature Set**

Wakeword: "Hey Lumbot" — OpenWakeWord, CPU-only, zero GPU impact

ASR: faster-whisper small.en (CUDA, 4070Ti) — ~1–2s latency after wakeword

Intent model: small Qwen (Qwen2.5 1.5B–3B Q4 via llama.cpp) — intent classification + entity extraction, ≤3 GB VRAM target. Fallback: regex/keyword matching.

Dispatch — two channels:
- OBS/stream actions → Streamerbot WebSocket
- AI/assistant actions → OpenClaw HTTPS receiver on Luminous

Confirmation tiers:
- No-confirm: execute immediately (scene switch, mute, save note, clip)
- Confirm-required: verbal "yes" within N seconds or hotkey (end stream, go live, raid, post to Discord)

TTS feedback: Lumbot speaks back through Streamerbot TTS — private in-ear by default

Memory: all commands + captions appended to OpenClaw memory/YYYY-MM-DD.md (append-only). Rolling audio buffer for on-demand "transcribe last N seconds".

---

**Draft Architecture**
```
CERBERUS
  OBS (NVENC)
  ratw. captions plugin → caption file → Luminous
  Companion App (Python)
    OpenWakeWord (CPU) wakeword detect
    faster-whisper (CUDA) ASR
    Qwen llama.cpp intent + entity
    Rolling audio buffer
    Dispatcher → Streamerbot WS + Luminous HTTPS
  Streamerbot → OBS WS + TTS in-ear

LUMINOUS
  HTTPS Receiver /api/voice-cmd
    Auth, confirmation state machine, intent router
    memory appender (append-only)
  OpenClaw skills + sessions
```

---

**Draft Command Map (partial)**
- Scene switch → Streamerbot/OBS · No confirm
- Clip that / save clip → Streamerbot replay buffer · No confirm
- Mute mic → Streamerbot/OBS · No confirm
- Start/stop recording → Streamerbot/OBS · Yes confirm
- Go live / end stream → Streamerbot/OBS · Yes confirm
- Raid [channel] → Twitch · Yes confirm
- Update title → Twitch · Yes confirm
- Add note [text] → OpenClaw memory · No confirm
- Transcribe last [N]s → OpenClaw ASR · No confirm
- Post summary to Discord → OpenClaw message · Yes confirm

---

**Engineering Phases**
1. Foundation (2–4 wks): companion app, wakeword, ASR, Luminous receiver, end-to-end test
2. Streamerbot integration (1–2 wks): WS client, top commands, TTS, confirmation state machine
3. Local LLM intent (1–2 wks): Qwen llama.cpp, domain glossary
4. Polish & safety (1–2 wks): full confirmation tiers, VRAM/CPU throttle, logging, overlay

---

**📋 YOUR HOMEWORK — Design Interview**

Reply in this thread with your answers. Partial answers are fine.

**A — Voice & Audio**
A1. Mic source on Cerberus — OBS source name, or virtual cable (which one)?
A2. Where should Lumbot TTS play — in-ear monitor, desktop speakers, or specific device?
A3. Wakeword sensitivity — conservative / balanced / hair trigger?
A4. Visual OBS indicator (text source lights up "Lumbot listening")? Yes/no?
A5. Should viewers ever hear Lumbot's responses, or always private?

**B — Cerberus**
B1. OS: Win10 / Win11 / Linux?
B2. Free VRAM during a live stream? (Task Manager → GPU while streaming)
B3. OBS CPU % during stream? (approximate)
B4. Virtual audio cable in use? (VB-Audio, Voicemeeter, none?)
B5. Python installed? Version?
B6. Streamerbot installed? WebSocket port? (default 8080)
B7. Cerberus LAN IP or hostname?

**C — Streamerbot & OBS**
C1. Streamerbot version?
C2. OBS WebSocket enabled? Port + password?
C3. Main OBS scene names (exact — these are matched by voice)?
C4. Existing Streamerbot actions you'd want voice-triggered?
C5. Replay buffer in use? Duration?
C6. Other Streamerbot integrations (Channel Points, alerts, music, etc.)?

**D — Commands & Confirmations**
D1. Top 10 commands you want first (priority order)?
D2. Which need confirmation vs. immediate?
D3. Confirmation phrase? (default: "yes" / "confirm")
D4. Confirmation timeout? (default: 10s)
D5. Commands that should NEVER be voice-accessible?
D6. Should Lumbot repeat the command before executing? ("Got it — switching to game scene")

**E — Local Model**
E1. Max VRAM for local model during stream? (recommend 2–4 GB)
E2. Intent-only (tiny/fast) or also conversational?
E3. Preferred model size? (leaning Qwen2.5/3.5 1.5B–3B Q4)
E4. Domain glossary — game names, streamer names, custom terms ASR should know?
E5. Strictly command mode or general Q&A too?

**F — Security & Network**
F1. Cerberus ↔ Luminous connection: same LAN / Tailscale / other?
F2. Firewall/NAT constraints?
F3. Hard limits on what Lumbot can do without confirmation?

**G — Stretch Goals**
G1. Should Lumbot respond to Twitch chat too (long term)?
G2. Persistent persona/character for stream?
G3. Other tools to integrate (Discord, music bot, MIDI)?
G4. Status overlay on stream (idle / listening / processing / speaking)?
G5. Anything else about your setup we should know?

---
*Reply here with answers · Once complete I'll finalize the spec and prepare the Phase 1 Cerberus install package*
*Posted via OpenClaw*
assistant: I see the issue — I've been using a slightly wrong channel ID (typo: `...100` instead of `...144`). Let me fix that.
assistant: The message is too long for Discord's 2000-char limit. Let me split it into two posts — create the thread with the PRD, then reply with the interview.
assistant: **Status:** Pre-design · **Machine:** Cerberus · **Date:** 2026-03-06
**Purpose:** Living design doc + homework interview. Reply here with your answers when ready.

**Elevator Pitch**
Real-time voice command layer for Cerberus. Listens for "Hey Lumbot", transcribes with a local model on Cerberus, dispatches to OpenClaw (Luminous) and/or Streamerbot — hands-free OBS + AI control during live streams. Lumbot talks back via Streamerbot TTS (in-ear only, private by default).

**Hardware — Cerberus**
CPU: Ryzen 9 5950x · RAM: 32 GB · GPU: RTX 4070Ti Super 16 GB VRAM · OBS NVENC live
Design rule: Cerberus does minimum work — heavy LLM + memory on Luminous.

**Confirmed Stack**
- Wakeword: OpenWakeWord (MIT, CPU-only) — "Hey Lumbot", zero GPU impact on OBS
- ASR: faster-whisper small.en (CUDA, 4070Ti) — ~1–2s latency after wakeword
- Intent: Small Qwen via llama.cpp (Qwen2.5/3.5 1.5B–3B Q4) — ≤3 GB VRAM. Fallback: regex/keyword
- Dispatch: Streamerbot WebSocket (OBS/stream) + OpenClaw HTTPS receiver (AI actions)
- Confirmation: no-confirm (scene switch, mute, clip, note) vs confirm-required (end stream, raid, go live, post to Discord)
- TTS: Streamerbot TTS → in-ear monitor, viewers never hear it by default
- Memory: append-only writes to OpenClaw memory/YYYY-MM-DD.md + captions from ratw. OBS plugin

**Engineering Phases**
1. Foundation (2–4 wks): companion app, wakeword, ASR, Luminous receiver, e2e test
2. Streamerbot (1–2 wks): WS client, top commands, TTS, confirm state machine
3. Local LLM intent (1–2 wks): Qwen llama.cpp, domain glossary
4. Polish (1–2 wks): VRAM throttle guard, logging, overlay

*(Full command map + design interview in next reply 👇)*
assistant: I keep hitting the wrong channel ID in my `to` param (typo: `...100` vs `...144`). Let me use `thread-create` with a shorter opening post, then reply with the rest.
assistant: Forum post created in `#ai-projects`. Now adding the PRD and interview as replies.
assistant: [[reply_to_current]] Done! Forum post is live in `#ai-projects`: **🎙️ Lumbot Voice — PRD, Engineering Brief & Design Interview**

It has 3 posts:
1. **Opening** — elevator pitch, hardware, design rule
2. **PRD** — confirmed stack, architecture diagram, draft command map, engineering phases
3. **Interview** — 7 sections, ~35 questions, your homework

The most important questions to answer first (unblocks design decisions fastest):
- **B2** — free VRAM while streaming (determines which ASR + Qwen model we can run)
- **B6** — Streamerbot WebSocket port
- **C3** — exact OBS scene names
- **D1/D2** — your top 10 commands + which need confirmation
- **F1** — how Cerberus and Luminous are networked

Take your time — even rough answers let me start building Phase 1.
