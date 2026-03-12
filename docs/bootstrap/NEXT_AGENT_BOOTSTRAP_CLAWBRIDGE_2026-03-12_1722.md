# Next-Agent Bootstrap — ClawBridge Extract

## Read these first
1. docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_1722.md
2. docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_1722.md

## Current objective
Bridge the recent findings about Microsoft’s OpenClaw security guidance into a work-oriented thread focused on whether and how OpenClaw could be used safely in a workplace environment.

## Already decided
- Microsoft Security published a blog post arguing that OpenClaw should be treated as credentialed, persistent, tool-using code execution and evaluated only in isolated environments with dedicated credentials and a rebuild plan.
- A separate Microsoft Azure community post provides a practical VM deployment recipe for OpenClaw on an isolated Windows 11 Azure VM, but it is more of a setup guide than a complete hardening guide.
- The useful core security model is: isolate the runtime, scope credentials tightly, assume malicious content will eventually be ingested, monitor state and memory for persistence, and treat rebuild as a normal control.
- The current personal setup already matches some of that advice well: loopback bind, token auth, and a dedicated assistant environment. But it still intentionally runs with high trust and broad tool power, including exec and file mutation, so it should not be mistaken for a low-risk hardened enterprise deployment.
- The biggest practical gap for work use is not whether OpenClaw can run, but how to constrain credentials, tool permissions, skill installation, egress, and blast radius enough for workplace expectations.

## Still open
- What a minimum acceptable work-safe deployment would look like: dedicated VM or host, dedicated identities, narrower tool policy, explicit install/approval controls, and documented rebuild/rotation procedures.
- Whether a work deployment should be single-user and isolated per operator, versus any shared multi-user gateway model, which would be much riskier.
- Which use cases are acceptable early pilots at work: low-sensitivity automation and internal tooling support versus anything with sensitive data or broad third-party access.

## First action
Use this thread to define a practical work-evaluation posture instead of debating generic AI risk in the abstract.

## Avoid re-deriving
- Core platform pillar split and role boundaries.
- ClawBridge role as continuity + transfer layer.