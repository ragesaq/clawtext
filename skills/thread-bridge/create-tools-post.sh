#!/bin/bash
cd /home/lumadmin/.openclaw/workspace/skills/thread-bridge

# Create TOOLS.md builder post
node index.js freshThread 1475373158260277298 "🔧 Building TOOLS.md: Quick Reference for Operational Levers" '
**Purpose**: TOOLS.md serves as your quick-lookup cheat sheet for operational levers — the specific names, addresses, and commands you use daily.

**Why it matters**: While skills define *how* tools work, TOOLS.md holds *your* specifics — the stuff unique to your setup that shouldn't be baked into shared skills.

---

## 📋 Sections to Populate

### 🖥️ Machines
- **Luminous**: Dedicated OVH server (home base for OpenClaw, Lumbot)
- **Luminousvoid**: Main PC (AMD 9950x + RTX 4090) — primary interface for gaming, VR, work
- **Cerberus**: Streaming PC (RTX 4070Ti, Ryzen 5950x, OBS live)

*Add SSH hosts, IP addresses, aliases as needed*

### 🔌 APIs & Endpoints
- RGCS Build HTTP API: http://100.99.169.120:8765
- Model providers (tier-1 focus: Claude, GPT-5)
- Any other service endpoints

### ⚡ Commands & Snippets
- Common curl snippets for APIs
- Build/deploy commands
- One-liners you use repeatedly

### 💬 Discord Channels
- Forum channel IDs (ai-projects, vr-projects, current-architecture, etc.)
- Guild ID: 1474997926919929927
- Quick reference for where things happen

### 🎮 Streaming Setup
- OBS configurations
- Stream keys (secure reference)
- Hotkey mappings
- Lumbot voice command integration points

### 🥽 VR Setup
- Big Screen Beyond 2 config
- VR workspace layouts
- Hardware connections

### 🤖 Model Preferences
- Standardized providers (Claude Haiku/Sonnet/Opus, GPT-5.3-codex, GPT-5.4)
- Session routing rules
- Cost optimization strategies

### ⏰ Time Boundaries
- Sleep boundary: 2am Arizona time (MST, no DST)
- Heartbeat check schedules
- Cron job timings

---

## 🤝 Collaborative Filling-In

This is a living document. Add sections as you discover them, update names/addresses when things change, and keep it practical.

**Current context**: This work builds on the SOUL.md + USER.md foundation — aligning operational tools with your why (change the world for the better with technology).

**Tag**: Pillar project

*Related: 🏗️ Building INFRASTRUCTURE.md: System Architecture & Operational Runbook*
'
