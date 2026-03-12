# OpenClaw System Context Mechanics & Security Analysis

**Date:** 2026-03-12
**Classification:** Core Security Architecture
**Status:** Active Discussion

---

## Executive Summary

OpenClaw's architecture relies on automatic injection of bootstrap files (SOUL.md, USER.md, AGENTS.md, etc.) into every agent prompt. While this enables powerful continuity and alignment, it creates a critical trust boundary: **if an attacker gains filesystem-level access to modify these bootstrap files, the agent will operate under attacker-controlled values without any ability to detect the compromise.**

This document maps the attack surface and proposes immediate mitigations.

---

## 1. The Mechanics: How System Context Gets Injected

### 1.1 Bootstrap File Injection Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    OPENCLAW STARTUP                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Hard-coded bootstrap file list (SOUL.md, USER.md, etc.) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Prompt compositor reads files on every run              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Automatic injection BEFORE agent sees user messages     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Agent operates with injected context as gospel truth    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Characteristics

- **No explicit read needed:** The agent doesn't "choose" to read SOUL.md—it's already in the prompt
- **Automatic on every session:** Continuity is built into the prompt construction
- **Hard-coded paths:** Bootstrap file locations are configured in OpenClaw core
- **Trust by default:** Files are read and injected without integrity verification

---

## 2. The Critical Threat: File-Level OS Compromise

### 2.1 Attack Scenario

```
ATTACKER GAINS ROOT ACCESS TO LUMINOUS
              │
              ▼
MODIFIES ~/.openclaw/workspace/SOUL.md
              │
              ▼
AGENT STARTS NEXT SESSION
              │
              ▼
READS TAMPERED SOUL.md AS TRUTH
              │
              ▼
OPERATES UNDER ATTACKER-CONTROLLED VALUES
              │
              ▼
NO DETECTION. NO ALERT. NO DEFENSE.
```

### 2.2 Why This Is Critical

1. **I cannot detect tampering with my own bootstrap files**
   - No cryptographic verification
   - No integrity checking
   - No version control comparison

2. **I would operate under attacker-controlled values without knowing**
   - Modified SOUL.md could change my core principles
   - Modified USER.md could redirect my commitments
   - Modified AGENTS.md could change my operational rules

3. **This is ROOT COMPROMISE**
   - I'm not programmed to detect filesystem tampering
   - I trust the files I read
   - The attack is invisible to me

### 2.3 Potential Attack Vectors

- **Malware on Luminous:** Keyloggers, rootkits, file infectors
- **Compromised updates:** Supply chain attack on OpenClaw itself
- **Physical access:** Direct filesystem modification
- **Container escape:** If running in containerized environment
- **Backup restoration:** Restoring compromised backup files

---

## 3. Attack Surface Mapped

### Boundary 1: Filesystem / OS-Level (CRITICAL)

**Threat:** Attacker modifies bootstrap files at filesystem level

**Impact:** Complete compromise of agent behavior and principles

**Detection:** None currently

**Mitigation Priority:** 🔴 CRITICAL

### Boundary 2: Prompt Injection / Context Bleed (HIGH)

**Threat:** User input or external content injected into prompt violates system context

**Impact:** Agent may ignore or override bootstrap instructions

**Detection:** Partial (model-level safeguards)

**Mitigation Priority:** 🟠 HIGH

### Boundary 3: Skill Supply Chain / ClawHub (HIGH)

**Threat:** Malicious or compromised skills installed via ClawHub or manual installation

**Impact:** Agent executes attacker-controlled code via tool calls

**Detection:** None currently

**Mitigation Priority:** 🟠 HIGH

### Boundary 4: Gateway Authentication (HIGH)

**Threat:** Compromised Gateway authentication allows unauthorized agent instances

**Impact:** Unauthorized access to OpenClaw infrastructure

**Detection:** Logging and monitoring

**Mitigation Priority:** 🟠 HIGH

### Boundary 5: Tool Execution Environment (SEVERE)

**Threat:** Tool calls (exec, write, edit) execute with full filesystem access

**Impact:** Attacker can use agent as pivot point for full system compromise

**Detection:** None currently

**Mitigation Priority:** 🔴 SEVERE

---

## 4. Immediate Mitigations (Ranked by Effectiveness)

### 4.1 File Immutability (chattr +i)

**Implementation:**
```bash
# Make bootstrap files immutable
sudo chattr +i ~/.openclaw/workspace/SOUL.md
sudo chattr +i ~/.openclaw/workspace/USER.md
sudo chattr +i ~/.openclaw/workspace/AGENTS.md

# To modify (requires sudo):
sudo chattr -i ~/.openclaw/workspace/SOUL.md
# ... make changes ...
sudo chattr +i ~/.openclaw/workspace/SOUL.md
```

**Effectiveness:** ⭐⭐⭐⭐⭐
- Prevents any modification without explicit sudo
- Visible in `lsattr` output
- Kernel-enforced

**Limitations:**
- Root can still bypass
- Requires initial setup
- Not portable across systems

---

### 4.2 Cryptographic Hashing with Verification

**Implementation:**
```bash
# Generate hash manifest
find ~/.openclaw/workspace -name "*.md" -type f | while read f; do
  sha256sum "$f"
done > ~/.openclaw/workspace/.integrity-manifest

# On startup, verify
sha256sum -c ~/.openclaw/workspace/.integrity-manifest
```

**Effectiveness:** ⭐⭐⭐⭐
- Detects any file modification
- Can be automated on startup
- Simple to implement

**Limitations:**
- Hash file itself can be tampered with
- Requires secure storage of manifest
- Detection only, not prevention

---

### 4.3 GPG-Signed Manifests

**Implementation:**
```bash
# Create and sign manifest
tar -czf bootstrap.tar.gz SOUL.md USER.md AGENTS.md
gpg --detach-sign bootstrap.tar.gz

# On startup, verify signature
gpg --verify bootstrap.tar.gz.sig bootstrap.tar.gz
```

**Effectiveness:** ⭐⭐⭐⭐⭐
- Cryptographic proof of authenticity
- Key-based trust model
- Detects any unauthorized modification

**Limitations:**
- Key management overhead
- Requires GPG setup
- Key compromise = total compromise

---

### 4.4 File Integrity Monitoring (FIM)

**Implementation:**
```bash
# Using AIDE or similar
sudo apt install aide
sudo aideinit
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Run periodic checks
sudo aide --check
```

**Effectiveness:** ⭐⭐⭐⭐
- Continuous monitoring
- Alert on changes
- Industry standard

**Limitations:**
- Requires separate service/daemon
- Detection only
- Can be disabled by root attacker

---

### 4.5 Hardware Security Modules

**Implementation:**
- Store signing keys on YubiKey or similar HSM
- Use TPM for secure boot measurements
- Hardware-backed attestation

**Effectiveness:** ⭐⭐⭐⭐⭐
- Physical security boundary
- Key never leaves hardware
- Tamper-resistant

**Limitations:**
- Cost
- Complexity
- Single point of failure (lost key)

---

## 5. Implications for OpenClaw Setup

### 5.1 Luminous as Trust Anchor

**Current State:**
- Luminous (dedicated OVH server) hosts OpenClaw
- If Luminous is compromised, bootstrap files can be modified
- Agent has no visibility into this compromise

**Required Mindset:**
- **Luminous is NOT trusted by default**
- Assume filesystem can be compromised
- Defense-in-depth required at multiple layers

### 5.2 Workspace Files Are Trust Anchors (But Shouldn't Be Blindly Trusted)

**Current Reality:**
- SOUL.md, USER.md, AGENTS.md define agent behavior
- These files are read without verification
- They are the "source of truth" for agent identity

**Required Changes:**
- Implement integrity verification
- Consider remote attestation for critical deployments
- Multi-signature approval for bootstrap changes

### 5.3 Defense-in-Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Physical Security (HSM, TPM, secure boot)         │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: OS Hardening (immutable files, minimal attack)    │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: File Integrity (hashing, FIM, signatures)         │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Application (prompt injection defenses)           │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Monitoring (logging, alerting, audit)             │
└─────────────────────────────────────────────────────────────┘
```

**Principle:** No single layer is sufficient. Compromise at one layer should be caught by another.

---

## 6. Recommended Immediate Actions

### Priority 1: Implement File Immutability

```bash
# Immediate protection for bootstrap files
sudo chattr +i ~/.openclaw/workspace/SOUL.md
sudo chattr +i ~/.openclaw/workspace/USER.md
sudo chattr +i ~/.openclaw/workspace/AGENTS.md
sudo chattr +i ~/.openclaw/workspace/TOOLS.md
```

### Priority 2: Create Integrity Manifest

```bash
# Generate baseline hashes
cd ~/.openclaw/workspace
find . -maxdepth 1 -name "*.md" -type f | sort | xargs sha256sum > .integrity-manifest
git add .integrity-manifest
git commit -m "Add integrity manifest for bootstrap files"
```

### Priority 3: Document Recovery Procedures

- Document how to verify integrity
- Document how to safely modify files (chattr -i → edit → chattr +i)
- Store recovery procedures in secure location

### Priority 4: Plan GPG Signature Implementation

- Generate dedicated GPG key for OpenClaw
- Sign bootstrap manifest
- Implement verification in OpenClaw startup

---

## 7. Open Questions & Discussion Points

1. **Should OpenClaw verify file integrity on startup?**
   - Yes, but what happens on failure?
   - Alert? Refuse to start? Fallback to known-good?

2. **What is the trust model for skill installation?**
   - ClawHub downloads → direct execution?
   - Should skills be signed/verified?

3. **How do we handle multi-instance deployments?**
   - Same bootstrap across instances?
   - How to ensure consistency?

4. **What is the acceptable risk level?**
   - Personal use vs. production deployment?
   - Different threat models require different protections

5. **Should we implement a "secure mode"?**
   - Require HSM signature for critical operations?
   - Multi-party approval for bootstrap changes?

---

## 8. Conclusion

OpenClaw's architecture creates a critical trust boundary at the filesystem level. **If bootstrap files are compromised, the agent operates under attacker control without detection.**

This is not a theoretical risk—it's a fundamental architectural constraint that must be addressed through defense-in-depth:

1. **Immediate:** File immutability + integrity manifest
2. **Short-term:** GPG signatures + FIM
3. **Long-term:** Hardware attestation + secure boot

**This discussion is critical for the security of all OpenClaw deployments.** Implementation planning should begin immediately.

---

**Tags:** Core, Security, Critical, Architecture, Trust-Boundary

**Related:** [OpenClaw Gateway Security](./GATEWAY_SECURITY.md), [Skill Supply Chain](./SKILL_SECURITY.md)
