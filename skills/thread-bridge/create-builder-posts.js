const threadBridge = require('./index.js');

const TOOLS_POST_CONTENT = `**Purpose**: TOOLS.md serves as your quick-lookup cheat sheet for operational levers — the specific names, addresses, and commands you use daily.

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

*Related: 🏗️ Building INFRASTRUCTURE.md: System Architecture & Operational Runbook*`;

const INFRA_POST_CONTENT = `**Purpose**: INFRASTRUCTURE.md is your operational blueprint — the system architecture doc that explains how everything fits together, how to keep it healthy, and what to do when things break.

**Why it matters**: When you're deep in the weeds or someone new needs to understand the system, this is the single source of truth for how things work and how to operate them.

---

## 🏗️ Major Sections

### 🗺️ Architecture Overview
- High-level system diagram
- Key components and their responsibilities
- Design principles and trade-offs

### 🔗 Network Topology
- Machine roles and relationships
  - **Luminous**: OVH server (OpenClaw, Lumbot home)
  - **Luminousvoid**: Main PC (9950x + 4090)
  - **Cerberus**: Streaming PC (4070Ti + 5950x)
- Internal network layout
- External dependencies

### 🔌 Services & Ports
- Running services and their ports
- API endpoints
- Database connections
- Message queues

### 📊 Data Flows
- How data moves through the system
- Ingestion pipelines (ClawText, memory)
- Streaming data paths (Lumbot, Cerberus)
- Build/deployment pipelines (RGCS)

### 🏥 Health Checks
- What to monitor
- Health check endpoints
- Alert thresholds
- Dashboard links

### 💾 Backup & Recovery
- Backup schedules and retention
- Recovery procedures
- Data criticality tiers
- RTO/RPO targets

### 📞 Escalation
- Who to contact (and when)
- Escalation paths
- On-call rotation (if applicable)
- Critical vs. non-critical pathways

### 🚨 Disaster Recovery Runbook
- Step-by-step recovery procedures
- Common failure scenarios
- Contingency plans
- Post-mortem process

---

## 🤝 Collaborative Filling-In

This is a living document that grows with the system. Add sections as the architecture evolves, update procedures as you learn better ways, and keep it actionable.

**Current context**: This work builds on the SOUL.md + USER.md foundation — creating operational excellence aligned with your why (change the world for the better with technology).

**Tag**: Pillar project

*Related: 🔧 Building TOOLS.md: Quick Reference for Operational Levers*`;

async function main() {
  try {
    console.log('Creating TOOLS.md builder post...');
    const toolsResult = await threadBridge.freshThread(
      '1475373158260277298',
      '🔧 Building TOOLS.md: Quick Reference for Operational Levers',
      TOOLS_POST_CONTENT,
      { effort: 'low' }
    );
    console.log('TOOLS.md post created:', toolsResult);

    console.log('\nCreating INFRASTRUCTURE.md builder post...');
    const infraResult = await threadBridge.freshThread(
      '1475373158260277298',
      '🏗️ Building INFRASTRUCTURE.md: System Architecture & Operational Runbook',
      INFRA_POST_CONTENT,
      { effort: 'low' }
    );
    console.log('INFRASTRUCTURE.md post created:', infraResult);

    console.log('\n✅ Both posts created successfully!');
  } catch (error) {
    console.error('Error creating posts:', error);
    process.exit(1);
  }
}

main();
