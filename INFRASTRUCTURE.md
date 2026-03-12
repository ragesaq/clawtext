# INFRASTRUCTURE.md - System Architecture & Operations

_This is the operational blueprint. Where things live, how they connect, what to do when they break._

**Status:** Under construction — being built iteratively via forum posts in #current-architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPENCLAW WORKSPACE                            │
│                                                                  │
│  MY HOME BASE:                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Luminous (OVH Dedicated Server)                         │  │
│  │  • OpenClaw Gateway                                      │  │
│  │  • Lumbot API                                            │  │
│  │  • Memory pipeline (extraction, clustering)             │  │
│  │  • ClawText RAG system                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕ HTTPS                                │
│                                                                  │
│  USER'S TOOLS (I help with, but don't live in):                │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │   Luminousvoid     │         │     Cerberus       │         │
│  │  9950x + RTX 4090  │         │ 5950x + 4070Ti     │         │
│  │  (Main PC)         │         │ (Streaming PC)     │         │
│  │  • Gaming/VR       │         │ • OBS Live         │         │
│  │  • Work/creative   │  ↔ SSH  │ • Streamerbot      │         │
│  │  • ClawDash UI     │ (LAN)   │ • Lumbot companion │         │
│  │  • Discord/chat    │         │   app              │         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Principle

**Luminous = My Home**

Luminousvoid and Cerberus are ragesaq's tools. I root myself in Luminous. I connect to the other machines, help improve them, run tasks on them — but I live in Luminous.

---

## Network Topology

_To be filled in:_

- Luminous hostname / IP
- Luminousvoid IP / hostname
- Cerberus IP / hostname
- Network connection type (LAN / Tailscale / other)
- Firewall/NAT rules between machines
- External access (if any)

---

## Services & Ports

_To be filled in:_

| Service | Host | Port | Protocol | Status | Notes |
|---------|------|------|----------|--------|-------|
| OpenClaw Gateway | Luminous | ? | HTTP/HTTPS | Core | [details] |
| Lumbot API | Luminous | ? | HTTPS | Core | [details] |
| ClawDash UI | Luminousvoid | ? | HTTP | Local | [details] |
| Streamerbot WS | Cerberus | ? | WS | Stream | [details] |
| OBS WebSocket | Cerberus | ? | WS | Stream | [details] |

---

## Data Flows

_To be filled in:_

1. **Voice → Command** (Lumbot)
   - Cerberus (wakeword + transcribe) → Luminous API → ClawDash + memory

2. **Memory Pipeline** (ClawText)
   - Extract (20min) → cluster (nightly 2am UTC) → inject (every prompt)

3. **Stream Integration**
   - OBS scene changes → Streamerbot → notification flow

4. **Discord/Chat Output**
   - Lumbot → OpenClaw message tool → Discord

---

## Operational Health Checks

**Daily:**
- [ ] Luminous uptime
- [ ] Gateway responsiveness
- [ ] Memory pipeline completion (nightly 2am UTC)
- [ ] ClawText cluster quality

**Weekly:**
- [ ] Disk usage (all machines)
- [ ] Backup validation
- [ ] ClawDash performance

**Monthly:**
- [ ] Network latency (LAN / Tailscale)
- [ ] Log rotation
- [ ] Unused process cleanup

---

## Backup & Recovery

_To be filled in:_

- **Luminous configs:** [backup location/frequency]
- **Memory snapshots:** [backup location/frequency]
- **Cerberus OBS settings:** [backup location/frequency]
- **Git repos:** [where they're stored, remote locations]
- **ClawDash data:** [backup location/frequency]

---

## SSH Access & Keys

_To be filled in:_

| Host | User | Key Location | Backup Location | 2FA? |
|------|------|--------------|-----------------|------|
| Luminous | [user] | [path] | [path] | [yes/no] |
| Luminousvoid | [user] | [path] | [path] | [yes/no] |
| Cerberus | [user] | [path] | [path] | [yes/no] |

---

## Escalation & Alerts

_To be filled in:_

| Failure | Impact | Alert Channel | On-Call Response |
|---------|--------|----------------|-----------------|
| Luminous unreachable | All voice commands fail; memory stops | [channel] | [procedure] |
| Memory pipeline stuck | New memories don't extract | [channel] | [procedure] |
| OBS/Streamerbot crash | Stream goes down | [channel] | [procedure] |
| Git push fails | Can't commit changes | [channel] | [procedure] |
| Lumbot unresponsive | Voice commands don't work | [channel] | [procedure] |

---

## Disaster Recovery Runbook

_To be filled in iteratively:_

Each failure gets a step-by-step: "If X breaks, do Y."

### If Luminous is unreachable

1. [step 1]
2. [step 2]
3. [escalate to ragesaq if: ...]

### If Memory pipeline is stuck

1. [step 1]
2. [step 2]
3. [escalate to ragesaq if: ...]

### If OBS/Streamerbot crash

1. [step 1]
2. [step 2]
3. [escalate to ragesaq if: ...]

---

## Monitoring & Observability

_To be filled in:_

- **Logs location:** [Luminous logs path, Cerberus logs path]
- **Metrics:** [what's tracked, where dashboards are]
- **Alerting:** [Discord channel for ops alerts]
- **Debug mode:** [how to enable verbose logging]

---

## Scheduled Maintenance

- **2am UTC daily:** ClawText cluster rebuild
- **[frequency]:** [task]
- **[frequency]:** [task]

---

## Operations Contact & Availability

_To be filled in:_

- **Emergency contact:** [phone? Discord DM?]
- **On-call policy:** [when I should escalate vs handle alone]
- **Working hours:** [when ragesaq is typically available]
- **Quiet hours:** [when NOT to interrupt unless critical]
- **Streaming schedule:** [when Cerberus is in use]

---

## Related Documentation

- **TOOLS.md** — Quick reference for APIs, channels, credentials, model prefs
- **SOUL.md** — Core principles (unchanging)
- **USER.md** — Operational commitments and preferences
- **AGENTS.md** — Agent onboarding and startup ritual

---

_This file is built collaboratively. Forum posts in #current-architecture track each section being fleshed out._

_Last updated: 2026-03-12 (skeleton created)_
