# Session: 2026-03-07 06:57:17 UTC

- **Session Key**: agent:channel-mini:discord:channel:1479522683883356170
- **Session ID**: 3dc67ce1-c6ba-4327-9a95-b40b33104e50
- **Source**: discord

## Conversation Summary

assistant: ## RGCS Smoothing Development — v1.2.324 Fresh Thread

**Status:** Active Development — Input Page Master Toggle Sync Issue
**Model:** gpt-5-mini (fast iterations)
**Last Updated:** 2026-03-03 03:59 UTC

---

### What is RGCS?
Room-scale Gravity Compensation System — VR controller smoothing to eliminate high-frequency jitter via low-pass filtering + OneEuro algorithm.

**Devices:**
- Device 0 = HMD
- Device 5 = Left Controller
- Device 6 = Right Controller

---

### Current Issue: Master Toggle Not Syncing
**Problem:** Input smoothing page has a master enable/disable button intended to toggle all 3 devices at once. When clicked, the button state changes but the individual device toggles below don't reflect the new state.

**Evidence from v1.2.316 logs:**
- All 3 devices disable/enable simultaneously (coordinated call)
- Multiple cycles during single session
- Asymmetry: HMD stays disabled, controllers re-enable
- Root: `setCalibrationActive(FALSE)` correlates with disable events

**v1.2.324 improvement:** Added call-site logging to `applySettings()` so we can see exactly which code path is calling the disable.

---

### Diagnostic Logs Location
Run these steps to get fresh logs:

1. Launch RGCS with smoothing enabled
2. Hit the **Diag Max** preset
3. Try to hold the laser still / reproduce shakiness
4. Close out, grab logs from:
   - **Primary:** `%LOCALAPPDATA%\RGCS\driver.log`
   - **Secondary:** `%LOCALAPPDATA%\openvr\vrserver.txt`

---

### Architecture Notes
- **Master control:** Single toggle should batch-update all devices atomically
- **Expected flow:** Button click → send batch request with all device IDs → backend updates all → UI reflects new state for each device
- **Current state:** Button updates but individual items stay out of sync (likely missing batch logic or state propagation)

---

### Known Working
- ✅ Smoothing applies correctly when enabled
- ✅ OneEuro params update per device
- ✅ Effective config traces show device state + strength
- ✅ Rest/Meditate mechanics working (20s minimum)

### Need to Fix
- ❌ Master toggle batch sync logic
- ❌ Individual item state propagation from master control
- ❌ Input page code review (location TBD)

---

### Next Immediate Steps
1. **Code review:** Find input smoothing page component (React? Form? Path?)
2. **Implement:** Batch update handler on master toggle
3. **Test:** Verify state syncs to all 3 devices after button click
4. **Log analysis:** Check v1.2.324 driver.log for applySettings() call-site annotations

**Question:** Where is the input smoothing page code located? (repo path / component file)
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709098474995773",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:15 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

i tested 1.2.398 and i have the following feedback

the recommended values of 25 HMD produce some pretty severe smoothing that is choppy on the HMD, still in the method that is like playing a video game at low framerate

the smoothing effect is extremely strong all the way down to 1%, and this strange low-framerate-like-stutter persists throughout. its almost like we are holding back the framerate of the headset, or tying the motion speed ot it
assistant: Got it. Let’s break this feedback down and inspect likely causes and solutions:

---

### Feedback Highlights:
1. **HMD smoothing at 25% (recommended):**
   - Severe smoothing effect makes it feel choppy.
   - Described as a "low framerate" experience.
   
2. **Similar stutter persists at all levels, even at 1% smoothing.**
   - Feels like the framerate is being limited or tied to headset motion speed.

---

### Likely Root Causes:
**1. Overly aggressive smoothing settings:**
   - A *low-pass filter cutoff* set too low could cause delayed response times, making fast movements appear choppy.
   - The higher the smoothing (lower the cutoff frequency), the more gradual the adaptation, leading to the "low-framerate" perception.

**2. Update Rate Mismatch:**
   - If the smoothing algorithm or driver's effective cutoff frequency ends up **modulating at a lower update rate**, it could pulse inconsistently, creating the perception of stutter.
   - This could happen if `deltaTime` (input smoothing refresh interval) is miscalculated or drifted from real headset polling frequency.

**3. Cutoff-Frequency Clamp Mapping:**
   - The HMD slider's 25% may map to a value still too low compared to what’s adequate for smooth HMD motion.
   - Possibly, calibration figures prioritized eliminating fine jitter but now ignore responsivity.

**4. Uniform Smoothing Across All Motion Ranges:**
   - If the filter applies the same smoothing across all motion intensities (low-speed pans vs. rapid head turns), the lower-speed movement frames might become disproportionately delayed, creating the "low-framerate" visual disconnect.
   - This could affect the One Euro config (e.g., too-high Beta causing unnecessary "memory" in motion smoothing).

---

### Investigation Checklist:
1. **Driver Log Analysis:**
   - What does the OneEuro log report for `effectiveMinCutoff` and `effectiveBeta` at these levels?
   - Look for mismatches between:
     - Expected vs. effective values.
     - Real update intervals and reported `deltaTime`.

2. **Config Mapping Check:**
   - How is 25% mapped to filter parameters (`minCutoff`, smoothing)?
   - Test alternate mappings to ensure responsivity at practical user-friendly levels.

3. **Update Frequency Validation:**
   - Verify whether `deltaTime` matches real-world update rates.
   - Is the driver operating with stutter-inducing sampling mismatches?

4. **Speed-Range Responsivity:**
   - Does the smoothing pipeline appropriately adapt when transitioning between slow pans and fast movement?

---

### Recommendations for Fix:
**1. Focus on HMD Responsiveness:**
   - Soften the cutoff mapping for the HMD at lower values for 15-25%. This allows quicker adaptation to movement while still filtering jitter.
   - Temporary Test: Set `minCutoff` at **50 Hz** for HMD at these slider positions.

**2. Dynamically Adjust Smoothing Based on Movement Magnitude:**
   - Tune `Beta` for the HMD to scale smoother acceleration differently for rapid vs. slow head movement. This better maintains framerate-fluidity:
     - **Beta** Example: 3.0 → 1.5 (fast) / .6.
     - Add tighter transition ranges for rapid motion bursts.

**3. Test Alternate OneEuro Defaults:**
   - Adjust HMD smoothing defaults:
     - `kHmdMinCutoff: 25Hz → 35Hz`.
     - `kHmdBeta: 1.5 (static) → 3.5`.
     - Ensure adjustments still allow realistic smoothing feel and jitter suppression.

**4. Correlate Driver Update Source:**
   - Use test-pattern video to validate visual disconnection between driver timing mismatches.

---

### Next Steps:
- Apply new parameter mappings for a dev build: **v1.2.404**
  - HMD (cutoff <50Hz threshold) experimental testing.
- Logs: Share logs focused around beta / cutoff response-debugging below tuned key entries threshold. 

Let’s iterate until we nail that "natural movement feel"! Feedback loop welcome on dev. 🚀
user: [media attached: 3 files]
[media attached 1/3: /home/lumadmin/.openclaw/media/inbound/91c29a43-893b-4af8-929b-00286c5a80bc.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/91c29a43-893b-4af8-929b-00286c5a80bc.txt]
[media attached 2/3: /home/lumadmin/.openclaw/media/inbound/072ab550-1595-438d-a6cc-8d1bd7b099ca.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/072ab550-1595-438d-a6cc-8d1bd7b099ca.txt]
[media attached 3/3: /home/lumadmin/.openclaw/media/inbound/b39387c2-92c8-4deb-ab4b-025ac8cdcbc1.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/b39387c2-92c8-4deb-ab4b-025ac8cdcbc1.txt]
To send an image back, prefer the message tool (media/path/filePath). If you must inline, use MEDIA:https://example.com/image.jpg (spaces ok, quote if needed) or a safe relative path like MEDIA:./image.jpg. Avoid absolute paths (MEDIA:/...) and ~ paths — they are blocked for security. Keep caption in the text body.
[Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709190225137774",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:16 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

[Discord Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170 +10s Sat 2026-03-07 05:16 UTC] ragesaq: here are the logs

<file name="91c29a43-893b-4af8-929b-00286c5a80bc.txt" mime="text/plain">
2026-03-06 21:32:37.902 [INFO] OVR Input Emulator Plus starting...
2026-03-06 21:32:37.902 [INFO] Version: v1.2.398
2026-03-06 21:32:37.902 [INFO] Log directory: C:\Users\saq\AppData\Local\RGCS\logs
2026-03-06 21:32:37.956 [INFO] [GameStateStore] Initialized — state management active
2026-03-06 21:32:40.137 [Info] [SMOOTHING] Migrated legacy smoothing params in profile 'Global' to canonical tuning
2026-03-06 21:32:40.140 [INFO] [GameProfileController] initStage1
2026-03-06 21:32:42.811 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:42.811 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:42.812 [INFO] [GameProfileController] startGameDetection() called — delegated to GameDetector/StateStore architecture
2026-03-06 21:32:42.825 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:42.872 [INFO] Attempting to load dashboard thumbnail icon: C:/Program Files/RGCS/res/thumbicon.png
2026-03-06 21:32:42.891 [INFO] Dashboard thumbnail icon loaded successfully
2026-03-06 21:32:43.649 [SETUP] Connecting render control signals...
2026-03-06 21:32:43.649 [SETUP] Render control signals connected, initial render scheduled
2026-03-06 21:32:43.662 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:43.663 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:44.685 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:44.710 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:44.921 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.218 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.219 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.219 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.236 [INFO] [SMOOTHING] Connected to lean driver via RGCSClient
2026-03-06 21:32:45.236 [Info] [SMOOTHING] Resolver: falling back to Global (baseline)
2026-03-06 21:32:45.241 [INFO] [GameProfileController] initStage2 (state-store architecture)
2026-03-06 21:32:45.243 [INFO] [GameProfileController] ProfileManager initialized at: C:/Users/saq/AppData/Local/RGCS
2026-03-06 21:32:45.249 [INFO] [GameProfileController] Loaded game 'contractors_showdown': abbreviation='EZ', displayName='Contractors Showdown: Exfil Zone'
2026-03-06 21:32:45.250 [INFO] [GameProfileController] State store wired — listening for activeGameChanged, equippedWeaponChanged, gameRunningChanged
2026-03-06 21:32:45.250 [INFO] Initial device enumeration (initStage2) completed — GameStateStore wired
2026-03-06 21:32:45.250 [INFO] Initializing game detection system...
2026-03-06 21:32:45.251 [INFO] GameDatabase initialized successfully
2026-03-06 21:32:45.251 [INFO] Found 1 enabled game(s) to register for detection
2026-03-06 21:32:45.252 [INFO] GameDetector: Loaded config for contractors_showdown, log path: C:/Program Files/RGCS/%STEAMAPPS%/common/Contractors Showdown/Contractors_Showdown/ExfilZone/ExfilZone.log
2026-03-06 21:32:45.252 [INFO] GameDetector: Registered game: contractors_showdown | Executable: Contractors_Showdown.exe | Steam ID: 2719160 | Log path: C:/Program Files/RGCS/%STEAMAPPS%/common/Contractors Showdown/Contractors_Showdown/ExfilZone/ExfilZone.log
2026-03-06 21:32:45.252 [INFO] Registered Contractors: Showdown (App ID: 2719160) for detection
2026-03-06 21:32:45.252 [DEBUG] GameDetector::startDetection() called
2026-03-06 21:32:45.252 [INFO] GameDetector: Starting detection with 1 games registered
2026-03-06 21:32:45.252 [INFO] → Registered: contractors_showdown | Executable: Contractors_Showdown.exe | Steam ID: 2719160
2026-03-06 21:32:45.252 [INFO] GameDetector: Found 1 Steam installations
2026-03-06 21:32:45.253 [DEBUG] GameDetector: Performing initial detection check
2026-03-06 21:32:45.253 [DEBUG] [GameDetector] performDetection() called at 21:32:45.253
2026-03-06 21:32:45.290 [INFO] GameDetector: Detection timer started (ID: 352321541), polling every 1000ms
2026-03-06 21:32:45.290 [INFO] Controller roles defined - enabling full startup detection sequence
2026-03-06 21:32:45.332 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.376 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.376 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.588 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:45.722 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.003 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.067 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.121 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.312 [DEBUG] [GameDetector] Timer poll #1
2026-03-06 21:32:46.312 [DEBUG] [GameDetector] performDetection() called at 21:32:46.312
2026-03-06 21:32:46.417 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.527 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.719 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.756 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:46.968 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.114 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.304 [DEBUG] [GameDetector] performDetection() called at 21:32:47.304
2026-03-06 21:32:47.350 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.495 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.516 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.714 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.789 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:47.790 [INFO] Secondary device refresh completed
2026-03-06 21:32:47.916 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.152 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.273 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.304 [DEBUG] [GameDetector] performDetection() called at 21:32:48.304
2026-03-06 21:32:48.382 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.522 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.714 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:48.913 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.024 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.162 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.319 [DEBUG] [GameDetector] performDetection() called at 21:32:49.319
2026-03-06 21:32:49.363 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.514 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.714 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.752 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.791 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:49.791 [INFO] Controllers with defined roles not detected - triggering auto-refresh
2026-03-06 21:32:49.791 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:49.792 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:49.792 [INFO] Starting continuous controller detection retry (2s interval, 5min timeout)
2026-03-06 21:32:49.919 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:50.114 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:50.317 [DEBUG] [GameDetector] performDetection() called at 21:32:50.317
2026-03-06 21:32:50.357 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:50.498 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:50.517 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:50.715 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:51.262 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:51.315 [DEBUG] [GameDetector] performDetection() called at 21:32:51.315
2026-03-06 21:32:51.789 [INFO] Controller detection retry 1/150: Roles defined, scanning for controllers...
2026-03-06 21:32:51.789 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:51.790 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:52.340 [DEBUG] [GameDetector] performDetection() called at 21:32:52.340
2026-03-06 21:32:53.332 [DEBUG] [GameDetector] performDetection() called at 21:32:53.332
2026-03-06 21:32:53.785 [INFO] Controller detection retry 2/150: Roles defined, scanning for controllers...
2026-03-06 21:32:53.785 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:53.785 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:54.333 [DEBUG] [GameDetector] performDetection() called at 21:32:54.333
2026-03-06 21:32:55.331 [DEBUG] [GameDetector] performDetection() called at 21:32:55.331
2026-03-06 21:32:55.787 [INFO] Controller detection retry 3/150: Roles defined, scanning for controllers...
2026-03-06 21:32:55.787 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:55.789 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:56.334 [DEBUG] [GameDetector] Timer poll #11
2026-03-06 21:32:56.334 [DEBUG] [GameDetector] performDetection() called at 21:32:56.334
2026-03-06 21:32:57.330 [DEBUG] [GameDetector] performDetection() called at 21:32:57.330
2026-03-06 21:32:57.784 [INFO] Controller detection retry 4/150: Roles defined, scanning for controllers...
2026-03-06 21:32:57.784 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:57.784 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:32:58.332 [DEBUG] [GameDetector] performDetection() called at 21:32:58.332
2026-03-06 21:32:59.331 [DEBUG] [GameDetector] performDetection() called at 21:32:59.331
2026-03-06 21:32:59.785 [INFO] Controller detection retry 5/150: Roles defined, scanning for controllers...
2026-03-06 21:32:59.785 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:32:59.785 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:00.338 [DEBUG] [GameDetector] performDetection() called at 21:33:00.338
2026-03-06 21:33:01.385 [DEBUG] [GameDetector] performDetection() called at 21:33:01.385
2026-03-06 21:33:01.808 [INFO] Controller detection retry 6/150: Roles defined, scanning for controllers...
2026-03-06 21:33:01.808 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:01.808 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:02.348 [DEBUG] [GameDetector] performDetection() called at 21:33:02.348
2026-03-06 21:33:03.347 [DEBUG] [GameDetector] performDetection() called at 21:33:03.347
2026-03-06 21:33:03.800 [INFO] Controller detection retry 7/150: Roles defined, scanning for controllers...
2026-03-06 21:33:03.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:03.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:04.351 [DEBUG] [GameDetector] performDetection() called at 21:33:04.351
2026-03-06 21:33:05.349 [DEBUG] [GameDetector] performDetection() called at 21:33:05.349
2026-03-06 21:33:05.800 [INFO] Controller detection retry 8/150: Roles defined, scanning for controllers...
2026-03-06 21:33:05.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:05.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:06.364 [DEBUG] [GameDetector] Timer poll #21
2026-03-06 21:33:06.365 [DEBUG] [GameDetector] performDetection() called at 21:33:06.365
2026-03-06 21:33:07.362 [DEBUG] [GameDetector] performDetection() called at 21:33:07.362
2026-03-06 21:33:07.799 [INFO] Controller detection retry 9/150: Roles defined, scanning for controllers...
2026-03-06 21:33:07.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:07.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:08.370 [DEBUG] [GameDetector] performDetection() called at 21:33:08.370
2026-03-06 21:33:09.369 [DEBUG] [GameDetector] performDetection() called at 21:33:09.369
2026-03-06 21:33:09.799 [INFO] Controller detection retry 10/150: Roles defined, scanning for controllers...
2026-03-06 21:33:09.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:09.799 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:10.370 [DEBUG] [GameDetector] performDetection() called at 21:33:10.369
2026-03-06 21:33:11.366 [DEBUG] [GameDetector] performDetection() called at 21:33:11.366
2026-03-06 21:33:11.802 [INFO] Controller detection retry 11/150: Roles defined, scanning for controllers...
2026-03-06 21:33:11.802 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:11.803 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:12.372 [DEBUG] [GameDetector] performDetection() called at 21:33:12.372
2026-03-06 21:33:13.368 [DEBUG] [GameDetector] performDetection() called at 21:33:13.368
2026-03-06 21:33:13.800 [INFO] Controller detection retry 12/150: Roles defined, scanning for controllers...
2026-03-06 21:33:13.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:13.801 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:14.366 [DEBUG] [GameDetector] performDetection() called at 21:33:14.366
2026-03-06 21:33:15.361 [DEBUG] [GameDetector] performDetection() called at 21:33:15.361
2026-03-06 21:33:15.801 [INFO] Controller detection retry 13/150: Roles defined, scanning for controllers...
2026-03-06 21:33:15.801 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:15.801 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:16.362 [DEBUG] [GameDetector] Timer poll #31
2026-03-06 21:33:16.362 [DEBUG] [GameDetector] performDetection() called at 21:33:16.362
2026-03-06 21:33:17.367 [DEBUG] [GameDetector] performDetection() called at 21:33:17.367
2026-03-06 21:33:17.799 [INFO] Controller detection retry 14/150: Roles defined, scanning for controllers...
2026-03-06 21:33:17.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:17.799 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:18.373 [DEBUG] [GameDetector] performDetection() called at 21:33:18.373
2026-03-06 21:33:19.365 [DEBUG] [GameDetector] performDetection() called at 21:33:19.365
2026-03-06 21:33:19.801 [INFO] Controller detection retry 15/150: Roles defined, scanning for controllers...
2026-03-06 21:33:19.801 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:19.802 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:20.365 [DEBUG] [GameDetector] performDetection() called at 21:33:20.365
2026-03-06 21:33:21.362 [DEBUG] [GameDetector] performDetection() called at 21:33:21.362
2026-03-06 21:33:21.802 [INFO] Controller detection retry 16/150: Roles defined, scanning for controllers...
2026-03-06 21:33:21.802 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:21.802 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:22.362 [DEBUG] [GameDetector] performDetection() called at 21:33:22.362
2026-03-06 21:33:23.364 [DEBUG] [GameDetector] performDetection() called at 21:33:23.364
2026-03-06 21:33:23.799 [INFO] Controller detection retry 17/150: Roles defined, scanning for controllers...
2026-03-06 21:33:23.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:23.799 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:24.365 [DEBUG] [GameDetector] performDetection() called at 21:33:24.365
2026-03-06 21:33:25.363 [DEBUG] [GameDetector] performDetection() called at 21:33:25.363
2026-03-06 21:33:25.801 [INFO] Controller detection retry 18/150: Roles defined, scanning for controllers...
2026-03-06 21:33:25.801 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:25.802 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:26.362 [DEBUG] [GameDetector] Timer poll #41
2026-03-06 21:33:26.362 [DEBUG] [GameDetector] performDetection() called at 21:33:26.362
2026-03-06 21:33:27.363 [DEBUG] [GameDetector] performDetection() called at 21:33:27.363
2026-03-06 21:33:27.799 [INFO] Controller detection retry 19/150: Roles defined, scanning for controllers...
2026-03-06 21:33:27.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:27.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:28.363 [DEBUG] [GameDetector] performDetection() called at 21:33:28.362
2026-03-06 21:33:29.369 [DEBUG] [GameDetector] performDetection() called at 21:33:29.369
2026-03-06 21:33:29.800 [INFO] Controller detection retry 20/150: Roles defined, scanning for controllers...
2026-03-06 21:33:29.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:29.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:30.361 [DEBUG] [GameDetector] performDetection() called at 21:33:30.361
2026-03-06 21:33:31.361 [DEBUG] [GameDetector] performDetection() called at 21:33:31.361
2026-03-06 21:33:31.800 [INFO] Controller detection retry 21/150: Roles defined, scanning for controllers...
2026-03-06 21:33:31.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:31.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:32.371 [DEBUG] [GameDetector] performDetection() called at 21:33:32.371
2026-03-06 21:33:33.361 [DEBUG] [GameDetector] performDetection() called at 21:33:33.361
2026-03-06 21:33:33.800 [INFO] Controller detection retry 22/150: Roles defined, scanning for controllers...
2026-03-06 21:33:33.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:33.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:34.363 [DEBUG] [GameDetector] performDetection() called at 21:33:34.363
2026-03-06 21:33:35.364 [DEBUG] [GameDetector] performDetection() called at 21:33:35.364
2026-03-06 21:33:35.800 [INFO] Controller detection retry 23/150: Roles defined, scanning for controllers...
2026-03-06 21:33:35.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:35.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:36.363 [DEBUG] [GameDetector] Timer poll #51
2026-03-06 21:33:36.363 [DEBUG] [GameDetector] performDetection() called at 21:33:36.363
2026-03-06 21:33:37.366 [DEBUG] [GameDetector] performDetection() called at 21:33:37.366
2026-03-06 21:33:37.799 [INFO] Controller detection retry 24/150: Roles defined, scanning for controllers...
2026-03-06 21:33:37.799 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:37.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:38.369 [DEBUG] [GameDetector] performDetection() called at 21:33:38.369
2026-03-06 21:33:39.368 [DEBUG] [GameDetector] performDetection() called at 21:33:39.368
2026-03-06 21:33:39.801 [INFO] Controller detection retry 25/150: Roles defined, scanning for controllers...
2026-03-06 21:33:39.801 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:39.801 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:40.366 [DEBUG] [GameDetector] performDetection() called at 21:33:40.366
2026-03-06 21:33:41.363 [DEBUG] [GameDetector] performDetection() called at 21:33:41.363
2026-03-06 21:33:41.800 [INFO] Controller detection retry 26/150: Roles defined, scanning for controllers...
2026-03-06 21:33:41.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:41.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:42.363 [DEBUG] [GameDetector] performDetection() called at 21:33:42.363
2026-03-06 21:33:43.363 [DEBUG] [GameDetector] performDetection() called at 21:33:43.363
2026-03-06 21:33:43.800 [INFO] Controller detection retry 27/150: Roles defined, scanning for controllers...
2026-03-06 21:33:43.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:43.800 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:44.364 [DEBUG] [GameDetector] performDetection() called at 21:33:44.364
2026-03-06 21:33:45.369 [DEBUG] [GameDetector] performDetection() called at 21:33:45.369
2026-03-06 21:33:45.800 [INFO] Controller detection retry 28/150: Roles defined, scanning for controllers...
2026-03-06 21:33:45.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:45.801 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:46.371 [DEBUG] [GameDetector] Timer poll #61
2026-03-06 21:33:46.371 [DEBUG] [GameDetector] performDetection() called at 21:33:46.371
2026-03-06 21:33:47.366 [DEBUG] [GameDetector] performDetection() called at 21:33:47.366
2026-03-06 21:33:47.800 [INFO] Controller detection retry 29/150: Roles defined, scanning for controllers...
2026-03-06 21:33:47.800 [DEBUG] Device scan: 1 HMD, 0 controllers [], 0 trackers
2026-03-06 21:33:47.801 [DEBUG] Role check: Missing controllers - Need Left=YES (have=no), Need Right=YES (have=no), detected=[]
2026-03-06 21:33:48.369 [DEBUG] [GameDetector] performDetection() called at 21:33:48.369
2026-03-06 21:33:49.365 [DEBUG] [GameDetector] performDetection() called at 21:33:49.365
2026-03-06 21:33:49.800 [INFO] Controller detection retry 30/150: Roles defined, scanning for controllers...
2026-03-06 21:33:49.800 [DEBUG] Device scan: 1 HMD, 2 controllers [LHR-909A5819, LHR-F1763D17], 0 trackers
2026-03-06 21:33:49.801 [DEBUG] Role check: All required roles satisfied - Left=YES Right=YES, detected=[LHR-909A5819, LHR-F1763D17]
2026-03-06 21:33:49.802 [INFO] SUCCESS: Controllers detected after 30 retries (60 seconds)
2026-03-06 21:33:50.361 [DEBUG] [GameDetector] performDetection() called at 21:33:50.361
2026-03-06 21:33:51.365 [DEBUG] [GameDetector] performDetection() called at 21:33:51.365
2026-03-06 21:33:52.365 [DEBUG] [GameDetector] performDetection() called at 21:33:52.365
2026-03-06 21:33:53.368 [DEBUG] [GameDetector] performDetection() called at 21:33:53.368
2026-03-06 21:33:54.362 [DEBUG] [GameDetector] performDetection() called at 21:33:54.362
2026-03-06 21:33:55.365 [DEBUG] [GameDetector] performDetection() called at 21:33:55.365
2026-03-06 21:33:56.130 [INFO] Dashboard deactivated (system button) seq=0
2026-03-06 21:33:56.134 [INFO] Dashboard deactivated - controllers notified
2026-03-06 21:33:56.364 [DEBUG] [GameDetector] Timer poll #71
2026-03-06 21:33:56.364 [DEBUG] [GameDetector] performDetection() called at 21:33:56.364
2026-03-06 21:33:56.429 [INFO] Dashboard activated (system button) seq=1
2026-03-06 21:33:56.631 [DEBUG] Device scan: 1 HMD, 2 controllers [LHR-909A5819, LHR-F1763D17], 0 trackers
2026-03-06 21:33:56.631 [INFO] Device refresh after dashboard activation
2026-03-06 21:33:57.363 [DEBUG] [GameDetector] performDetection() called at 21:33:57.363
2026-03-06 21:33:58.364 [DEBUG] [GameDetector] performDetection() called at 21:33:58.364
2026-03-06 21:33:59.361 [DEBUG] [GameDetector] performDetection() called at 21:33:59.361
2026-03-06 21:34:00.250 [DEBUG] [EVENTS] MouseButtonDown at (336,416) button=Left timestamp=1044
2026-03-06 21:34:00.250 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:00.363 [DEBUG] [GameDetector] performDetection() called at 21:34:00.363
2026-03-06 21:34:00.399 [DEBUG] [EVENTS] MouseButtonUp at (347,407) button=Left timestamp=1051
2026-03-06 21:34:00.400 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:01.209 [DEBUG] [EVENTS] MouseButtonDown at (121,281) button=Left timestamp=1106
2026-03-06 21:34:01.210 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:01.350 [DEBUG] [EVENTS] MouseButtonUp at (125,282) button=Left timestamp=1111
2026-03-06 21:34:01.350 [Info] [SMOOTHING] Smoothing ENABLED by user
2026-03-06 21:34:01.354 [INFO] [SMOOTHING][CORRELATE] step=ENABLE_COMPARE mode=Manual tokenMs=1772858041354 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:01.354 [Info] [SMOOTHING] Applying smoothing state change to all devices...
2026-03-06 21:34:01.354 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='setSmoothingEnabled' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:01.354 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:01.360 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:01.360 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:01.361 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:01.361 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:01.369 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:01.369 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:01.369 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:01.369 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:01.369 [DEBUG] [GameDetector] performDetection() called at 21:34:01.369
2026-03-06 21:34:02.361 [DEBUG] [GameDetector] performDetection() called at 21:34:02.361
2026-03-06 21:34:03.049 [DEBUG] [EVENTS] MouseButtonDown at (223,495) button=Left timestamp=1207
2026-03-06 21:34:03.049 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.150 [DEBUG] [EVENTS] MouseButtonUp at (224,490) button=Left timestamp=1213
2026-03-06 21:34:03.151 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.005 -> 0.0048 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.155 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.161 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:03.161 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:03.190 [DEBUG] [EVENTS] MouseButtonDown at (225,486) button=Left timestamp=1217
2026-03-06 21:34:03.190 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.309 [DEBUG] [EVENTS] MouseButtonUp at (225,485) button=Left timestamp=1220
2026-03-06 21:34:03.309 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0048 -> 0.0046 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.314 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.320 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:03.320 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:03.364 [DEBUG] [GameDetector] performDetection() called at 21:34:03.364
2026-03-06 21:34:03.398 [DEBUG] [EVENTS] MouseButtonDown at (225,485) button=Left timestamp=1221
2026-03-06 21:34:03.399 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.490 [DEBUG] [EVENTS] MouseButtonUp at (219,496) button=Left timestamp=1228
2026-03-06 21:34:03.491 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0046 -> 0.0044 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.494 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.500 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.004
2026-03-06 21:34:03.500 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:03.569 [DEBUG] [EVENTS] MouseButtonDown at (218,502) button=Left timestamp=1234
2026-03-06 21:34:03.570 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.650 [DEBUG] [EVENTS] MouseButtonUp at (219,510) button=Left timestamp=1241
2026-03-06 21:34:03.651 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0044 -> 0.0042 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.654 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.661 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.004
2026-03-06 21:34:03.661 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:03.730 [DEBUG] [EVENTS] MouseButtonDown at (221,510) button=Left timestamp=1244
2026-03-06 21:34:03.730 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.810 [DEBUG] [EVENTS] MouseButtonUp at (221,510) button=Left timestamp=1245
2026-03-06 21:34:03.810 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0042 -> 0.004 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.814 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.816 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.004
2026-03-06 21:34:03.816 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:03.889 [DEBUG] [EVENTS] MouseButtonDown at (221,508) button=Left timestamp=1248
2026-03-06 21:34:03.890 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:03.970 [DEBUG] [EVENTS] MouseButtonUp at (220,506) button=Left timestamp=1252
2026-03-06 21:34:03.970 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.004 -> 0.0038 deviceIds=0(OpenVR) 
2026-03-06 21:34:03.974 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:03.980 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.004
2026-03-06 21:34:03.980 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.069 [DEBUG] [EVENTS] MouseButtonDown at (220,503) button=Left timestamp=1256
2026-03-06 21:34:04.070 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:04.149 [DEBUG] [EVENTS] MouseButtonUp at (219,502) button=Left timestamp=1259
2026-03-06 21:34:04.150 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0038 -> 0.0036 deviceIds=0(OpenVR) 
2026-03-06 21:34:04.154 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:04.158 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.004
2026-03-06 21:34:04.158 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.230 [DEBUG] [EVENTS] MouseButtonDown at (219,501) button=Left timestamp=1261
2026-03-06 21:34:04.230 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:04.329 [DEBUG] [EVENTS] MouseButtonUp at (215,505) button=Left timestamp=1266
2026-03-06 21:34:04.329 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0036 -> 0.0034 deviceIds=0(OpenVR) 
2026-03-06 21:34:04.334 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:04.341 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.003
2026-03-06 21:34:04.341 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.361 [DEBUG] [GameDetector] performDetection() called at 21:34:04.361
2026-03-06 21:34:04.409 [DEBUG] [EVENTS] MouseButtonDown at (215,506) button=Left timestamp=1268
2026-03-06 21:34:04.410 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:04.489 [DEBUG] [EVENTS] MouseButtonUp at (215,506) button=Left timestamp=1269
2026-03-06 21:34:04.490 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0034 -> 0.0032 deviceIds=0(OpenVR) 
2026-03-06 21:34:04.494 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:04.496 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.003
2026-03-06 21:34:04.496 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.570 [DEBUG] [EVENTS] MouseButtonDown at (216,504) button=Left timestamp=1272
2026-03-06 21:34:04.570 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:04.690 [DEBUG] [EVENTS] MouseButtonUp at (216,504) button=Left timestamp=1273
2026-03-06 21:34:04.691 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0032 -> 0.003 deviceIds=0(OpenVR) 
2026-03-06 21:34:04.695 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:04.697 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.003
2026-03-06 21:34:04.697 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.769 [DEBUG] [EVENTS] MouseButtonDown at (219,501) button=Left timestamp=1279
2026-03-06 21:34:04.769 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:04.851 [DEBUG] [EVENTS] MouseButtonUp at (216,482) button=Left timestamp=1285
2026-03-06 21:34:04.852 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:04.949 [DEBUG] [EVENTS] MouseButtonDown at (213,465) button=Left timestamp=1291
2026-03-06 21:34:04.949 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.029 [DEBUG] [EVENTS] MouseButtonUp at (214,472) button=Left timestamp=1297
2026-03-06 21:34:05.029 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:05.130 [DEBUG] [EVENTS] MouseButtonDown at (215,478) button=Left timestamp=1305
2026-03-06 21:34:05.130 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.229 [DEBUG] [EVENTS] MouseButtonUp at (217,491) button=Left timestamp=1313
2026-03-06 21:34:05.230 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:05.329 [DEBUG] [EVENTS] MouseButtonDown at (220,496) button=Left timestamp=1321
2026-03-06 21:34:05.329 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.361 [DEBUG] [GameDetector] performDetection() called at 21:34:05.361
2026-03-06 21:34:05.410 [DEBUG] [EVENTS] MouseButtonUp at (223,503) button=Left timestamp=1329
2026-03-06 21:34:05.410 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.003 -> 0.0028 deviceIds=0(OpenVR) 
2026-03-06 21:34:05.413 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:05.418 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.003
2026-03-06 21:34:05.418 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:05.510 [DEBUG] [EVENTS] MouseButtonDown at (225,506) button=Left timestamp=1335
2026-03-06 21:34:05.510 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.590 [DEBUG] [EVENTS] MouseButtonUp at (226,510) button=Left timestamp=1340
2026-03-06 21:34:05.590 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0028 -> 0.0026 deviceIds=0(OpenVR) 
2026-03-06 21:34:05.594 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:05.598 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.003
2026-03-06 21:34:05.598 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:05.669 [DEBUG] [EVENTS] MouseButtonDown at (227,510) button=Left timestamp=1342
2026-03-06 21:34:05.669 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.749 [DEBUG] [EVENTS] MouseButtonUp at (228,510) button=Left timestamp=1344
2026-03-06 21:34:05.750 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0026 -> 0.0024 deviceIds=0(OpenVR) 
2026-03-06 21:34:05.754 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:05.756 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.002
2026-03-06 21:34:05.756 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:05.829 [DEBUG] [EVENTS] MouseButtonDown at (228,508) button=Left timestamp=1347
2026-03-06 21:34:05.830 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:05.950 [DEBUG] [EVENTS] MouseButtonUp at (229,507) button=Left timestamp=1350
2026-03-06 21:34:05.950 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0024 -> 0.0022 deviceIds=0(OpenVR) 
2026-03-06 21:34:05.954 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:05.958 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.002
2026-03-06 21:34:05.958 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.030 [DEBUG] [EVENTS] MouseButtonDown at (228,508) button=Left timestamp=1353
2026-03-06 21:34:06.030 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:06.129 [DEBUG] [EVENTS] MouseButtonUp at (227,510) button=Left timestamp=1357
2026-03-06 21:34:06.129 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0022 -> 0.002 deviceIds=0(OpenVR) 
2026-03-06 21:34:06.134 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:06.138 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.002
2026-03-06 21:34:06.138 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.230 [DEBUG] [EVENTS] MouseButtonDown at (227,510) button=Left timestamp=1358
2026-03-06 21:34:06.230 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:06.310 [DEBUG] [EVENTS] MouseButtonUp at (227,511) button=Left timestamp=1360
2026-03-06 21:34:06.311 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.002 -> 0.0018 deviceIds=0(OpenVR) 
2026-03-06 21:34:06.315 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:06.318 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.002
2026-03-06 21:34:06.318 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.364 [DEBUG] [GameDetector] Timer poll #81
2026-03-06 21:34:06.365 [DEBUG] [GameDetector] performDetection() called at 21:34:06.365
2026-03-06 21:34:06.400 [DEBUG] [EVENTS] MouseButtonDown at (227,508) button=Left timestamp=1364
2026-03-06 21:34:06.400 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:06.490 [DEBUG] [EVENTS] MouseButtonUp at (227,507) button=Left timestamp=1366
2026-03-06 21:34:06.490 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0018 -> 0.0016 deviceIds=0(OpenVR) 
2026-03-06 21:34:06.494 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:06.499 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.002
2026-03-06 21:34:06.499 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.571 [DEBUG] [EVENTS] MouseButtonDown at (226,506) button=Left timestamp=1369
2026-03-06 21:34:06.572 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:06.670 [DEBUG] [EVENTS] MouseButtonUp at (224,506) button=Left timestamp=1372
2026-03-06 21:34:06.670 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0016 -> 0.0014 deviceIds=0(OpenVR) 
2026-03-06 21:34:06.675 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:06.681 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.001
2026-03-06 21:34:06.681 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.769 [DEBUG] [EVENTS] MouseButtonDown at (223,506) button=Left timestamp=1374
2026-03-06 21:34:06.770 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:06.849 [DEBUG] [EVENTS] MouseButtonUp at (223,506) button=Left timestamp=1375
2026-03-06 21:34:06.849 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0014 -> 0.0012 deviceIds=0(OpenVR) 
2026-03-06 21:34:06.854 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:06.861 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.001
2026-03-06 21:34:06.861 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:06.949 [DEBUG] [EVENTS] MouseButtonDown at (223,505) button=Left timestamp=1379
2026-03-06 21:34:06.949 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:07.050 [DEBUG] [EVENTS] MouseButtonUp at (223,504) button=Left timestamp=1381
2026-03-06 21:34:07.050 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0012 -> 0.001 deviceIds=0(OpenVR) 
2026-03-06 21:34:07.054 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:07.058 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.001
2026-03-06 21:34:07.058 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:07.130 [DEBUG] [EVENTS] MouseButtonDown at (224,503) button=Left timestamp=1384
2026-03-06 21:34:07.130 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:07.229 [DEBUG] [EVENTS] MouseButtonUp at (225,503) button=Left timestamp=1386
2026-03-06 21:34:07.230 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.001 -> 0.0008 deviceIds=0(OpenVR) 
2026-03-06 21:34:07.234 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:07.237 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.001
2026-03-06 21:34:07.237 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:07.310 [DEBUG] [EVENTS] MouseButtonDown at (227,503) button=Left timestamp=1389
2026-03-06 21:34:07.310 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:07.365 [DEBUG] [GameDetector] performDetection() called at 21:34:07.364
2026-03-06 21:34:07.410 [DEBUG] [EVENTS] MouseButtonUp at (229,503) button=Left timestamp=1392
2026-03-06 21:34:07.411 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0008 -> 0.0006 deviceIds=0(OpenVR) 
2026-03-06 21:34:07.415 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:07.421 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.001
2026-03-06 21:34:07.421 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:07.489 [DEBUG] [EVENTS] MouseButtonDown at (230,503) button=Left timestamp=1394
2026-03-06 21:34:07.490 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:07.571 [DEBUG] [EVENTS] MouseButtonUp at (231,502) button=Left timestamp=1397
2026-03-06 21:34:07.571 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0006 -> 0.0004 deviceIds=0(OpenVR) 
2026-03-06 21:34:07.575 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:07.577 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.000
2026-03-06 21:34:07.577 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:08.030 [DEBUG] [EVENTS] MouseButtonDown at (234,503) button=Left timestamp=1406
2026-03-06 21:34:08.030 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:08.130 [DEBUG] [EVENTS] MouseButtonUp at (232,508) button=Left timestamp=1413
2026-03-06 21:34:08.132 [Info] [SMOOTHING] >>> SET_DEVICE_TYPE_STRENGTH: HMD 0.0004 -> 0.0002 deviceIds=0(OpenVR) 
2026-03-06 21:34:08.135 [Info] [SMOOTHING] Applying to OpenVR devices...
2026-03-06 21:34:08.137 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.000
2026-03-06 21:34:08.137 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:08.362 [DEBUG] [GameDetector] performDetection() called at 21:34:08.362
2026-03-06 21:34:09.362 [DEBUG] [GameDetector] performDetection() called at 21:34:09.362
2026-03-06 21:34:10.366 [DEBUG] [GameDetector] performDetection() called at 21:34:10.366
2026-03-06 21:34:11.369 [DEBUG] [GameDetector] performDetection() called at 21:34:11.369
2026-03-06 21:34:12.369 [DEBUG] [GameDetector] performDetection() called at 21:34:12.369
2026-03-06 21:34:12.809 [DEBUG] [EVENTS] MouseButtonDown at (1157,652) button=Left timestamp=1535
2026-03-06 21:34:12.809 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:12.970 [DEBUG] [EVENTS] MouseButtonUp at (1158,658) button=Left timestamp=1544
2026-03-06 21:34:12.970 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:13.361 [DEBUG] [GameDetector] performDetection() called at 21:34:13.361
2026-03-06 21:34:14.363 [DEBUG] [GameDetector] performDetection() called at 21:34:14.363
2026-03-06 21:34:14.869 [DEBUG] [EVENTS] MouseButtonDown at (577,698) button=Left timestamp=1643
2026-03-06 21:34:14.870 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:15.030 [DEBUG] [EVENTS] MouseButtonUp at (580,697) button=Left timestamp=1648
2026-03-06 21:34:15.042 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Recommended tokenMs=1772858055042 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:15.042 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyRecommendedSmoothing' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:15.042 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:15.044 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:15.044 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:15.049 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:15.049 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:15.054 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:15.054 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:15.054 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:15.054 [Info] [SMOOTHING] applyRecommendedSmoothing: ctrl_str=0.0816 (50% of 0.1632) hmd_str=0.005 (25% of 0.02) ctrl_base=5Hz ctrl_beta=5.0 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:15.054 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:15.362 [DEBUG] [GameDetector] performDetection() called at 21:34:15.362
2026-03-06 21:34:16.363 [DEBUG] [GameDetector] Timer poll #91
2026-03-06 21:34:16.363 [DEBUG] [GameDetector] performDetection() called at 21:34:16.363
2026-03-06 21:34:16.490 [DEBUG] [EVENTS] MouseButtonDown at (756,734) button=Left timestamp=1698
2026-03-06 21:34:16.490 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:16.590 [DEBUG] [EVENTS] MouseButtonUp at (753,734) button=Left timestamp=1702
2026-03-06 21:34:16.604 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Strong tokenMs=1772858056604 enabled=true hmdStr=0.0100 ctrlStr=0.1000 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=3.500 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:16.604 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyHighSmoothing' enabled=true hmdStr=0.0100 ctrlStr=0.1000 minCutoff=5.000 beta=3.500 dCutoff=1.500
2026-03-06 21:34:16.604 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:16.611 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.010
2026-03-06 21:34:16.611 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.1, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:16.615 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:16.615 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.1, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:16.621 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:16.621 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:16.621 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:16.621 [Info] [SMOOTHING] applyHighSmoothing: ctrl_str=0.10 (63% of 0.16) hmd_str=0.010 (50% of 0.02) ctrl_base=5Hz ctrl_beta=3.5 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:16.621 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:17.361 [DEBUG] [GameDetector] performDetection() called at 21:34:17.361
2026-03-06 21:34:17.490 [DEBUG] [EVENTS] MouseButtonDown at (610,718) button=Left timestamp=1761
2026-03-06 21:34:17.490 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:17.611 [DEBUG] [EVENTS] MouseButtonUp at (607,717) button=Left timestamp=1766
2026-03-06 21:34:17.626 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Recommended tokenMs=1772858057626 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:17.626 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyRecommendedSmoothing' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:17.626 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:17.633 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:17.633 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:17.637 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:17.637 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:17.643 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:17.643 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:17.643 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:17.643 [Info] [SMOOTHING] applyRecommendedSmoothing: ctrl_str=0.0816 (50% of 0.1632) hmd_str=0.005 (25% of 0.02) ctrl_base=5Hz ctrl_beta=5.0 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:17.644 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:18.370 [DEBUG] [GameDetector] performDetection() called at 21:34:18.370
2026-03-06 21:34:18.870 [DEBUG] [EVENTS] MouseButtonDown at (751,726) button=Left timestamp=1829
2026-03-06 21:34:18.871 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:19.029 [DEBUG] [EVENTS] MouseButtonUp at (773,719) button=Left timestamp=1839
2026-03-06 21:34:19.029 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:19.365 [DEBUG] [GameDetector] performDetection() called at 21:34:19.365
2026-03-06 21:34:19.730 [DEBUG] [EVENTS] MouseButtonDown at (744,721) button=Left timestamp=1867
2026-03-06 21:34:19.730 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:19.869 [DEBUG] [EVENTS] MouseButtonUp at (749,720) button=Left timestamp=1873
2026-03-06 21:34:19.877 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Strong tokenMs=1772858059877 enabled=true hmdStr=0.0100 ctrlStr=0.1000 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=3.500 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:19.877 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyHighSmoothing' enabled=true hmdStr=0.0100 ctrlStr=0.1000 minCutoff=5.000 beta=3.500 dCutoff=1.500
2026-03-06 21:34:19.877 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:19.879 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.010
2026-03-06 21:34:19.879 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.1, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:19.886 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:19.886 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.1, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:19.891 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:19.891 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:19.891 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:19.891 [Info] [SMOOTHING] applyHighSmoothing: ctrl_str=0.10 (63% of 0.16) hmd_str=0.010 (50% of 0.02) ctrl_base=5Hz ctrl_beta=3.5 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:19.891 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:20.366 [DEBUG] [GameDetector] performDetection() called at 21:34:20.366
2026-03-06 21:34:21.371 [DEBUG] [GameDetector] performDetection() called at 21:34:21.371
2026-03-06 21:34:21.651 [DEBUG] [EVENTS] MouseButtonDown at (642,715) button=Left timestamp=1960
2026-03-06 21:34:21.652 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:21.749 [DEBUG] [EVENTS] MouseButtonUp at (640,713) button=Left timestamp=1964
2026-03-06 21:34:21.757 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Recommended tokenMs=1772858061757 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:21.757 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyRecommendedSmoothing' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:21.757 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:21.759 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:21.759 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:21.761 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:21.761 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:21.766 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:21.766 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:21.766 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:21.766 [Info] [SMOOTHING] applyRecommendedSmoothing: ctrl_str=0.0816 (50% of 0.1632) hmd_str=0.005 (25% of 0.02) ctrl_base=5Hz ctrl_beta=5.0 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:21.766 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:22.370 [DEBUG] [GameDetector] performDetection() called at 21:34:22.370
2026-03-06 21:34:23.289 [DEBUG] [EVENTS] MouseButtonDown at (388,736) button=Left timestamp=2017
2026-03-06 21:34:23.290 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:23.370 [DEBUG] [GameDetector] performDetection() called at 21:34:23.370
2026-03-06 21:34:23.430 [DEBUG] [EVENTS] MouseButtonUp at (389,737) button=Left timestamp=2020
2026-03-06 21:34:23.434 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:24.370 [DEBUG] [GameDetector] performDetection() called at 21:34:24.370
2026-03-06 21:34:24.651 [DEBUG] [EVENTS] MouseButtonDown at (552,729) button=Left timestamp=2066
2026-03-06 21:34:24.651 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:24.810 [DEBUG] [EVENTS] MouseButtonUp at (547,730) button=Left timestamp=2072
2026-03-06 21:34:24.818 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Recommended tokenMs=1772858064818 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:24.818 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyRecommendedSmoothing' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:24.818 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:24.821 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:24.821 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:24.823 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:24.823 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:24.827 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:24.827 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:24.827 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:24.827 [Info] [SMOOTHING] applyRecommendedSmoothing: ctrl_str=0.0816 (50% of 0.1632) hmd_str=0.005 (25% of 0.02) ctrl_base=5Hz ctrl_beta=5.0 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:24.827 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:25.366 [DEBUG] [GameDetector] performDetection() called at 21:34:25.366
2026-03-06 21:34:25.470 [DEBUG] [EVENTS] MouseButtonDown at (393,738) button=Left timestamp=2115
2026-03-06 21:34:25.470 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:25.549 [DEBUG] [EVENTS] MouseButtonUp at (385,743) button=Left timestamp=2122
2026-03-06 21:34:25.550 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:25.890 [DEBUG] [EVENTS] MouseButtonDown at (393,728) button=Left timestamp=2134
2026-03-06 21:34:25.890 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:26.010 [DEBUG] [EVENTS] MouseButtonUp at (394,720) button=Left timestamp=2142
2026-03-06 21:34:26.017 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:26.370 [DEBUG] [GameDetector] Timer poll #101
2026-03-06 21:34:26.370 [DEBUG] [GameDetector] performDetection() called at 21:34:26.370
2026-03-06 21:34:27.362 [DEBUG] [GameDetector] performDetection() called at 21:34:27.362
2026-03-06 21:34:28.366 [DEBUG] [GameDetector] performDetection() called at 21:34:28.366
2026-03-06 21:34:29.370 [DEBUG] [GameDetector] performDetection() called at 21:34:29.370
2026-03-06 21:34:29.570 [DEBUG] [EVENTS] MouseButtonDown at (604,717) button=Left timestamp=2272
2026-03-06 21:34:29.571 [DEBUG] [EVENTS] MouseButtonPress accepted=true isAccepted=false
2026-03-06 21:34:29.690 [DEBUG] [EVENTS] MouseButtonUp at (594,716) button=Left timestamp=2282
2026-03-06 21:34:29.700 [INFO] [SMOOTHING][CORRELATE] step=MODE_APPLY mode=Recommended tokenMs=1772858069700 enabled=true hmdStr=0.0050 ctrlStr=0.0816 hmdBase=150.000 hmdBeta=2.500 ctrlBase=5.000 ctrlBeta=5.000 hmdRotRatio=0.700 ctrlRotRatio=0.300
2026-03-06 21:34:29.700 [INFO] [SMOOTHING] [SMOOTHING_APPLY] caller='applyRecommendedSmoothing' enabled=true hmdStr=0.0050 ctrlStr=0.0816 minCutoff=5.000 beta=5.000 dCutoff=1.500
2026-03-06 21:34:29.700 [Info] [SMOOTHING] Applying smoothing configuration to all tracked devices...
2026-03-06 21:34:29.702 [INFO] [SMOOTHING] HMD smoothing applied for device 0: enabled=true strength=0.005
2026-03-06 21:34:29.702 [INFO] [SMOOTHING] >>> Applying to device 5 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:29.705 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 5
2026-03-06 21:34:29.705 [INFO] [SMOOTHING] >>> Applying to device 6 (Controller): enabled=TRUE, strength=0.0816, filterType=0 (Adaptive One Euro)
2026-03-06 21:34:29.710 [INFO] [SMOOTHING] ✓ SUCCESS - Config written to shared memory for device 6
2026-03-06 21:34:29.710 [Info] [SMOOTHING] Configuration applied to 3 active devices
2026-03-06 21:34:29.710 [Info] [SMOOTHING] Applied smoothing to all tracked devices
2026-03-06 21:34:29.710 [Info] [SMOOTHING] applyRecommendedSmoothing: ctrl_str=0.0816 (50% of 0.1632) hmd_str=0.005 (25% of 0.02) ctrl_base=5Hz ctrl_beta=5.0 hmd_base=80Hz hmd_beta=2.5 dCutoff=1.5 hmdRot=0.70 ctrlRot=0.30 [persisted-to-Global]
2026-03-06 21:34:29.710 [DEBUG] [EVENTS] MouseButtonRelease accepted=true isAccepted=true
2026-03-06 21:34:30.365 [DEBUG] [GameDetector] performDetection() called at 21:34:30.365
2026-03-06 21:34:31.370 [DEBUG] [GameDetector] performDetection() called at 21:34:31.370
2026-03-06 21:34:32.363 [DEBUG] [GameDetector] performDetection() called at 21:34:32.363
2026-03-06 21:34:33.362 [DEBUG] [GameDetector] performDetection() called at 21:34:33.362
2026-03-06 21:34:34.362 [DEBUG] [GameDetector] performDetection() called at 21:34:34.362
2026-03-06 21:34:35.363 [DEBUG] [GameDetector] performDetection() called at 21:34:35.363
2026-03-06 21:34:35.610 [INFO] Dashboard deactivated (system button) seq=2
2026-03-06 21:34:35.615 [INFO] Dashboard deactivated - controllers notified
2026-03-06 21:34:36.367 [DEBUG] [GameDetector] Timer poll #111
2026-03-06 21:34:36.367 [DEBUG] [GameDetector] performDetection() called at 21:34:36.367
2026-03-06 21:34:37.363 [DEBUG] [GameDetector] performDetection() called at 21:34:37.363
2026-03-06 21:34:38.363 [DEBUG] [GameDetector] performDetection() called at 21:34:38.363
2026-03-06 21:34:39.364 [DEBUG] [GameDetector] performDetection() called at 21:34:39.364
2026-03-06 21:34:40.362 [DEBUG] [GameDetector] performDetection() called at 21:34:40.362
2026-03-06 21:34:41.362 [DEBUG] [GameDetector] performDetection() called at 21:34:41.362
2026-03-06 21:34:42.362 [DEBUG] [GameDetector] performDetection() called at 21:34:42.362
2026-03-06 21:34:43.363 [DEBUG] [GameDetector] performDetection() called at 21:34:43.363
2026-03-06 21:34:44.361 [DEBUG] [GameDetector] performDetection() called at 21:34:44.361
2026-03-06 21:34:45.365 [DEBUG] [GameDetector] performDetection() called at 21:34:45.365
2026-03-06 21:34:46.362 [DEBUG] [GameDetector] Timer poll #121
2026-03-06 21:34:46.362 [DEBUG] [GameDetector] performDetection() called at 21:34:46.362
2026-03-06 21:34:47.361 [DEBUG] [GameDetector] performDetection() called at 21:34:47.361
2026-03-06 21:34:48.361 [DEBUG] [GameDetector] performDetection() called at 21:34:48.361
2026-03-06 21:34:49.363 [DEBUG] [GameDetector] performDetection() called at 21:34:49.363
2026-03-06 21:34:50.363 [DEBUG] [GameDetector] performDetection() called at 21:34:50.363
</file>

<file name="072ab550-1595-438d-a6cc-8d1bd7b099ca.txt" mime="text/plain">
[2026-03-06 21:32:31.023] [INFO] ========================================
[2026-03-06 21:32:31.023] [INFO] RGCS Lean Driver Initializing
[2026-03-06 21:32:31.023] [INFO] Version: 1.2.398
[2026-03-06 21:32:31.023] [INFO] Session start: 2026-03-06 21:32:31.023
[2026-03-06 21:32:31.023] [INFO] ========================================
[2026-03-06 21:32:31.023] [INFO] Hook manager initialized
[2026-03-06 21:32:31.102] [INFO] IVRDriverContext hooks installed - GetGenericInterface intercepted
[2026-03-06 21:32:31.259] [INFO] IVRServerDriverHost hooks installed
[2026-03-06 21:32:31.259] [INFO] IPC server started (named pipe)
[2026-03-06 21:32:31.259] [INFO] Shared memory IPC started
[2026-03-06 21:32:31.260] [INFO] Loading profile: 'Default'
[2026-03-06 21:32:31.260] [INFO] Loading profile 'Default' from: C:\Users\saq\AppData\Local\RGCS\gunstock-profiles.ini
[2026-03-06 21:32:31.260] [INFO] Profile metadata: schemaVersion=1 fileVersion=1
[2026-03-06 21:32:31.260] [INFO] Controller role assigned: LHR-0311FA4A = LEFT
[2026-03-06 21:32:31.260] [INFO] Controller role assigned: LHR-909A5819 = RIGHT
[2026-03-06 21:32:31.260] [INFO] Controller role assigned: LHR-9A0540FA = RIGHT
[2026-03-06 21:32:31.260] [INFO] Controller role assigned: LHR-F1763D17 = LEFT
[2026-03-06 21:32:31.260] [INFO] 1.2.398: Invalidated input hook device maps for controller hot-swap support
[2026-03-06 21:32:31.260] [INFO] RGCS Lean Driver initialized successfully
[2026-03-06 21:32:31.812] [INFO] Device added: LHR-534E3445 (class 1)
[2026-03-06 21:32:31.825] [INFO] Device registered: serial='LHR-534E3445', openvrId=0, class=1
[2026-03-06 21:32:31.825] [INFO] Updated device ID from pending 0 to OpenVR 0 for serial LHR-534E3445
[2026-03-06 21:32:31.825] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:33.675] [INFO] Device added: LHB-83972FDE (class 4)
[2026-03-06 21:32:33.676] [INFO] Device registered: serial='LHB-83972FDE', openvrId=1, class=4
[2026-03-06 21:32:33.676] [INFO] Updated device ID from pending 1 to OpenVR 1 for serial LHB-83972FDE
[2026-03-06 21:32:33.676] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:34.993] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:36.111] [INFO] Device added: LHB-779F80E0 (class 4)
[2026-03-06 21:32:36.112] [INFO] Device registered: serial='LHB-779F80E0', openvrId=2, class=4
[2026-03-06 21:32:36.112] [INFO] Updated device ID from pending 2 to OpenVR 2 for serial LHB-779F80E0
[2026-03-06 21:32:36.112] [INFO] [EffectiveConfig] device=2 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:36.524] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:36.751] [INFO] Device added: LHB-615A4212 (class 4)
[2026-03-06 21:32:36.751] [INFO] Device registered: serial='LHB-615A4212', openvrId=3, class=4
[2026-03-06 21:32:36.751] [INFO] Updated device ID from pending 3 to OpenVR 3 for serial LHB-615A4212
[2026-03-06 21:32:36.751] [INFO] [EffectiveConfig] device=3 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:37.525] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:37.560] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:37.561] [INFO] [EffectiveConfig] device=2 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:38.526] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:38.699] [INFO] [EffectiveConfig] device=3 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:38.699] [INFO] [EffectiveConfig] device=2 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:38.699] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:39.527] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:40.244] [INFO] [EffectiveConfig] device=3 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:40.351] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:40.361] [INFO] [EffectiveConfig] device=2 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:40.527] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:41.364] [INFO] [EffectiveConfig] device=3 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:41.528] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:41.770] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:42.528] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:43.528] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:44.530] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:45.031] [INFO] Pose Update Rate [DeviceID 0]: Avg=757.5 Hz (1320 us), Min=0 us, Max=1851066 us, Count=10000
[2026-03-06 21:32:45.530] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:46.532] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:47.115] [INFO] Device added: LHB-44C9D16C (class 4)
[2026-03-06 21:32:47.122] [INFO] Device registered: serial='LHB-44C9D16C', openvrId=4, class=4
[2026-03-06 21:32:47.122] [INFO] Updated device ID from pending 4 to OpenVR 4 for serial LHB-44C9D16C
[2026-03-06 21:32:47.122] [INFO] [EffectiveConfig] device=4 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:47.533] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:48.534] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:49.535] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:50.537] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:51.538] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:52.539] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:53.335] [INFO] Pose Update Rate [DeviceID 0]: Avg=1204.9 Hz (830 us), Min=1 us, Max=4490 us, Count=20000
[2026-03-06 21:32:53.541] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:54.542] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:55.542] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:56.543] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:57.544] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:58.545] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:32:59.546] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:00.547] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:01.547] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:01.665] [INFO] Pose Update Rate [DeviceID 0]: Avg=1201.1 Hz (833 us), Min=1 us, Max=4925 us, Count=30000
[2026-03-06 21:33:02.549] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:03.549] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:04.553] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:05.366] [INFO] [EffectiveConfig] device=4 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:05.553] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:06.554] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:07.555] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:08.557] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:09.557] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:09.947] [INFO] Pose Update Rate [DeviceID 0]: Avg=1208.1 Hz (828 us), Min=1 us, Max=4128 us, Count=40000
[2026-03-06 21:33:10.558] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:11.558] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:12.559] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:13.560] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:14.562] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:15.563] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:16.564] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:17.566] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:18.286] [INFO] Pose Update Rate [DeviceID 0]: Avg=1199.8 Hz (833 us), Min=1 us, Max=4715 us, Count=50000
[2026-03-06 21:33:18.566] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:19.567] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:20.567] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:21.568] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:22.569] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:23.569] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:24.571] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:25.571] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:26.573] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:26.623] [INFO] Pose Update Rate [DeviceID 0]: Avg=1200.1 Hz (833 us), Min=1 us, Max=4148 us, Count=60000
[2026-03-06 21:33:27.573] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:28.573] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:29.574] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:30.575] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:31.575] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:32.578] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:33.578] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:34.578] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:34.967] [INFO] Pose Update Rate [DeviceID 0]: Avg=1199.2 Hz (834 us), Min=1 us, Max=4158 us, Count=70000
[2026-03-06 21:33:35.578] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:36.578] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:37.579] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:38.579] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:39.580] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:40.580] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:41.583] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:42.115] [INFO] [EffectiveConfig] device=4 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:42.115] [INFO] [EffectiveConfig] device=3 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:42.115] [INFO] [EffectiveConfig] device=2 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:42.115] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:42.584] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:43.297] [INFO] Pose Update Rate [DeviceID 0]: Avg=1201.1 Hz (833 us), Min=1 us, Max=4534 us, Count=80000
[2026-03-06 21:33:43.585] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:44.585] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:45.585] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:46.586] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:47.586] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:48.587] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:48.908] [INFO] Device added: LHR-909A5819 (class 2)
[2026-03-06 21:33:49.099] [INFO] Registered JOYSTICK component: /input/trackpad/x handle=21474836491 deviceId=4 axis=X
[2026-03-06 21:33:49.100] [INFO] Registered JOYSTICK component: /input/trackpad/y handle=21474836492 deviceId=4 axis=Y
[2026-03-06 21:33:49.101] [INFO] Registered JOYSTICK component: /input/trackpad/force handle=21474836500 deviceId=4 axis=X
[2026-03-06 21:33:49.101] [INFO] Registered JOYSTICK component: /input/thumbstick/x handle=21474836503 deviceId=4 axis=X
[2026-03-06 21:33:49.102] [INFO] Registered JOYSTICK component: /input/thumbstick/y handle=21474836504 deviceId=4 axis=Y
[2026-03-06 21:33:49.107] [INFO] Device registered: serial='LHR-909A5819', openvrId=5, class=2
[2026-03-06 21:33:49.107] [INFO] Set device hand for LHR-909A5819 to Right
[2026-03-06 21:33:49.107] [INFO] Updated device ID from pending 5 to OpenVR 5 for serial LHR-909A5819
[2026-03-06 21:33:49.107] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:49.492] [INFO] Device added: LHR-F1763D17 (class 2)
[2026-03-06 21:33:49.505] [INFO] Registered JOYSTICK component: /input/trackpad/x handle=25769803787 deviceId=5 axis=X
[2026-03-06 21:33:49.505] [INFO] Registered JOYSTICK component: /input/trackpad/y handle=25769803788 deviceId=5 axis=Y
[2026-03-06 21:33:49.507] [INFO] Registered JOYSTICK component: /input/trackpad/force handle=25769803796 deviceId=5 axis=X
[2026-03-06 21:33:49.507] [INFO] Registered JOYSTICK component: /input/thumbstick/x handle=25769803799 deviceId=5 axis=X
[2026-03-06 21:33:49.508] [INFO] Registered JOYSTICK component: /input/thumbstick/y handle=25769803800 deviceId=5 axis=Y
[2026-03-06 21:33:49.510] [INFO] Device registered: serial='LHR-F1763D17', openvrId=6, class=2
[2026-03-06 21:33:49.510] [INFO] Set device hand for LHR-F1763D17 to Left
[2026-03-06 21:33:49.510] [INFO] Updated device ID from pending 6 to OpenVR 6 for serial LHR-F1763D17
[2026-03-06 21:33:49.510] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:49.587] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:50.589] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:50.965] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:51.155] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:51.589] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:51.695] [INFO] Pose Update Rate [DeviceID 0]: Avg=1191.3 Hz (839 us), Min=0 us, Max=8260 us, Count=90000
[2026-03-06 21:33:51.967] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:52.159] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:52.590] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:52.968] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:53.162] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:53.591] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:53.971] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:54.166] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:54.592] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:54.975] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:55.167] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:55.593] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:55.978] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:56.134] [INFO] setCalibrationActive called: FALSE
[2026-03-06 21:33:56.167] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:56.595] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:56.980] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:57.170] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:57.205] [INFO] Pose Update Rate [DeviceID 0]: Avg=1815.6 Hz (551 us), Min=0 us, Max=4194 us, Count=100000
[2026-03-06 21:33:57.596] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:57.980] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:58.171] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:58.596] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:58.988] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:59.172] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:59.597] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:33:59.989] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:00.174] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:00.599] [INFO] [EffectiveConfig] device=0 class=HMD enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:00.989] [INFO] [EffectiveConfig] device=5 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:01.178] [INFO] [EffectiveConfig] device=6 class=Controller enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:01.360] [INFO] >>> SMOOTHING STATE CHANGED for device 0: ENABLED shmStrength=0.250000 shmMinCutoff=150.000000 shmBeta=2.500000
[2026-03-06 21:34:01.360] [INFO] >>> Smoothing strength changed: 0.000000 -> 0.250000
[2026-03-06 21:34:01.360] [INFO] >>> OneEuro params changed for device 0 minCutoff=150.000000 beta=2.500000 dCutoff=1.500000
[2026-03-06 21:34:01.360] [INFO] >>> RotCutoffRatio changed for device 0 ratio=0.700000
[2026-03-06 21:34:01.360] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=1 strengthChanged=1 paramsChanged=1 rotChanged=1 filterChanged=0 strength=0.2500 baseCutoff=150.0000 effCutoff=44.4142 rotRatio=0.7000 effRotCutoff=31.0900 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:01.360] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.360] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.361] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.363] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.364] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.364] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.364] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.365] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.365] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.367] [INFO] >>> APPLYING SMOOTHING to pose (strength=0.250000)
[2026-03-06 21:34:01.368] [INFO] >>> SMOOTHING STATE CHANGED for device 5: ENABLED shmStrength=0.510000 shmMinCutoff=5.000000 shmBeta=5.000000
[2026-03-06 21:34:01.368] [INFO] >>> Smoothing strength changed: 0.000000 -> 0.510000
[2026-03-06 21:34:01.368] [INFO] >>> OneEuro params changed for device 5 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:01.368] [INFO] >>> RotCutoffRatio changed for device 5 ratio=0.300000
[2026-03-06 21:34:01.368] [INFO] [SmoothingCorrelation] device=5 enabled=true stateChanged=1 strengthChanged=1 paramsChanged=1 rotChanged=1 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:01.371] [INFO] >>> SMOOTHING STATE CHANGED for device 6: ENABLED shmStrength=0.510000 shmMinCutoff=5.000000 shmBeta=5.000000
[2026-03-06 21:34:01.371] [INFO] >>> Smoothing strength changed: 0.000000 -> 0.510000
[2026-03-06 21:34:01.371] [INFO] >>> OneEuro params changed for device 6 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:01.371] [INFO] >>> RotCutoffRatio changed for device 6 ratio=0.300000
[2026-03-06 21:34:01.371] [INFO] [SmoothingCorrelation] device=6 enabled=true stateChanged=1 strengthChanged=1 paramsChanged=1 rotChanged=1 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:01.598] [INFO] [EffectiveConfig] device=1 class=Other enabled=false strength=0.0000 baseMinCutoff=5.0000 effMinCutoff=5.0000 beta=1.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:01.600] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:01.990] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:02.178] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:02.210] [INFO] Pose Update Rate [DeviceID 6]: Avg=2000.1 Hz (500 us), Min=0 us, Max=4532 us, Count=110000
[2026-03-06 21:34:02.353] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0854522 rotDeltaDeg=0.0645158
[2026-03-06 21:34:02.601] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:02.990] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:03.160] [INFO] >>> Smoothing strength changed: 0.250000 -> 0.240000
[2026-03-06 21:34:03.160] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2400 baseCutoff=150.0000 effCutoff=45.5045 rotRatio=0.7000 effRotCutoff=31.8531 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.183] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:03.319] [INFO] >>> Smoothing strength changed: 0.240000 -> 0.230000
[2026-03-06 21:34:03.319] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2300 baseCutoff=150.0000 effCutoff=46.6194 rotRatio=0.7000 effRotCutoff=32.6336 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.357] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.371609 rotDeltaDeg=0.28051
[2026-03-06 21:34:03.501] [INFO] >>> Smoothing strength changed: 0.230000 -> 0.220000
[2026-03-06 21:34:03.501] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2200 baseCutoff=150.0000 effCutoff=47.7592 rotRatio=0.7000 effRotCutoff=33.4314 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.601] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2200 baseMinCutoff=150.0000 effMinCutoff=54.4617 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:03.662] [INFO] >>> Smoothing strength changed: 0.220000 -> 0.210000
[2026-03-06 21:34:03.662] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2100 baseCutoff=150.0000 effCutoff=48.9241 rotRatio=0.7000 effRotCutoff=34.2469 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.816] [INFO] >>> Smoothing strength changed: 0.210000 -> 0.200000
[2026-03-06 21:34:03.816] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2000 baseCutoff=150.0000 effCutoff=50.1143 rotRatio=0.7000 effRotCutoff=35.0800 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.978] [INFO] >>> Smoothing strength changed: 0.200000 -> 0.190000
[2026-03-06 21:34:03.978] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1900 baseCutoff=150.0000 effCutoff=51.3302 rotRatio=0.7000 effRotCutoff=35.9311 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:03.993] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:04.157] [INFO] >>> Smoothing strength changed: 0.190000 -> 0.180000
[2026-03-06 21:34:04.157] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1800 baseCutoff=150.0000 effCutoff=52.5718 rotRatio=0.7000 effRotCutoff=36.8002 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:04.183] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:04.340] [INFO] >>> Smoothing strength changed: 0.180000 -> 0.170000
[2026-03-06 21:34:04.340] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1700 baseCutoff=150.0000 effCutoff=53.8394 rotRatio=0.7000 effRotCutoff=37.6876 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:04.364] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.207961 rotDeltaDeg=0.58701
[2026-03-06 21:34:04.496] [INFO] >>> Smoothing strength changed: 0.170000 -> 0.160000
[2026-03-06 21:34:04.496] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1600 baseCutoff=150.0000 effCutoff=55.1332 rotRatio=0.7000 effRotCutoff=38.5933 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:04.602] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.1600 baseMinCutoff=150.0000 effMinCutoff=71.7945 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:04.698] [INFO] >>> Smoothing strength changed: 0.160000 -> 0.150000
[2026-03-06 21:34:04.698] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1500 baseCutoff=150.0000 effCutoff=56.4535 rotRatio=0.7000 effRotCutoff=39.5175 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:04.996] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:05.184] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:05.362] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.0711748 rotDeltaDeg=0.0177112
[2026-03-06 21:34:05.417] [INFO] >>> Smoothing strength changed: 0.150000 -> 0.140000
[2026-03-06 21:34:05.417] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1400 baseCutoff=150.0000 effCutoff=57.8005 rotRatio=0.7000 effRotCutoff=40.4603 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:05.596] [INFO] >>> Smoothing strength changed: 0.140000 -> 0.130000
[2026-03-06 21:34:05.597] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1300 baseCutoff=150.0000 effCutoff=59.1743 rotRatio=0.7000 effRotCutoff=41.4220 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:05.603] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.1300 baseMinCutoff=150.0000 effMinCutoff=82.4311 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:05.757] [INFO] >>> Smoothing strength changed: 0.130000 -> 0.120000
[2026-03-06 21:34:05.757] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1200 baseCutoff=150.0000 effCutoff=60.5753 rotRatio=0.7000 effRotCutoff=42.4027 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:05.959] [INFO] >>> Smoothing strength changed: 0.120000 -> 0.110000
[2026-03-06 21:34:05.959] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1100 baseCutoff=150.0000 effCutoff=62.0036 rotRatio=0.7000 effRotCutoff=43.4025 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:05.996] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:06.138] [INFO] >>> Smoothing strength changed: 0.110000 -> 0.100000
[2026-03-06 21:34:06.138] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.1000 baseCutoff=150.0000 effCutoff=63.4594 rotRatio=0.7000 effRotCutoff=44.4216 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:06.185] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:06.318] [INFO] >>> Smoothing strength changed: 0.100000 -> 0.090000
[2026-03-06 21:34:06.318] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0900 baseCutoff=150.0000 effCutoff=64.9430 rotRatio=0.7000 effRotCutoff=45.4601 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:06.367] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.09 posDeltaMm=0.00513019 rotDeltaDeg=0.00167688
[2026-03-06 21:34:06.501] [INFO] >>> Smoothing strength changed: 0.090000 -> 0.080000
[2026-03-06 21:34:06.501] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0800 baseCutoff=150.0000 effCutoff=66.4546 rotRatio=0.7000 effRotCutoff=46.5182 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:06.603] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0800 baseMinCutoff=150.0000 effMinCutoff=103.7746 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:06.681] [INFO] >>> Smoothing strength changed: 0.080000 -> 0.070000
[2026-03-06 21:34:06.681] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0700 baseCutoff=150.0000 effCutoff=67.9944 rotRatio=0.7000 effRotCutoff=47.5961 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:06.860] [INFO] >>> Smoothing strength changed: 0.070000 -> 0.060000
[2026-03-06 21:34:06.860] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0600 baseCutoff=150.0000 effCutoff=69.5626 rotRatio=0.7000 effRotCutoff=48.6938 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:06.998] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:07.058] [INFO] >>> Smoothing strength changed: 0.060000 -> 0.050000
[2026-03-06 21:34:07.058] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0500 baseCutoff=150.0000 effCutoff=71.1593 rotRatio=0.7000 effRotCutoff=49.8115 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:07.188] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:07.223] [INFO] Pose Update Rate [DeviceID 0]: Avg=1996.5 Hz (501 us), Min=0 us, Max=3992 us, Count=120000
[2026-03-06 21:34:07.236] [INFO] >>> Smoothing strength changed: 0.050000 -> 0.040000
[2026-03-06 21:34:07.236] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0400 baseCutoff=150.0000 effCutoff=72.7850 rotRatio=0.7000 effRotCutoff=50.9495 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:07.374] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.04 posDeltaMm=0.0146428 rotDeltaDeg=0.00150668
[2026-03-06 21:34:07.420] [INFO] >>> Smoothing strength changed: 0.040000 -> 0.030000
[2026-03-06 21:34:07.420] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0300 baseCutoff=150.0000 effCutoff=74.4396 rotRatio=0.7000 effRotCutoff=52.1077 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:07.577] [INFO] >>> Smoothing strength changed: 0.030000 -> 0.020000
[2026-03-06 21:34:07.577] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0200 baseCutoff=150.0000 effCutoff=76.1235 rotRatio=0.7000 effRotCutoff=53.2865 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:07.605] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0200 baseMinCutoff=150.0000 effMinCutoff=136.8016 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:08.002] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:08.137] [INFO] >>> Smoothing strength changed: 0.020000 -> 0.010000
[2026-03-06 21:34:08.137] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.0100 baseCutoff=150.0000 effCutoff=77.8369 rotRatio=0.7000 effRotCutoff=54.4859 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:08.192] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:08.387] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.584972 rotDeltaDeg=0.291767
[2026-03-06 21:34:08.606] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:09.005] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:09.192] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:09.411] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.01 posDeltaMm=0.529582 rotDeltaDeg=0.264477
[2026-03-06 21:34:09.607] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:10.008] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:10.192] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:10.436] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.269404 rotDeltaDeg=0.0228
[2026-03-06 21:34:10.607] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:11.009] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:11.193] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:11.433] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.01 posDeltaMm=0.0617721 rotDeltaDeg=0.0047709
[2026-03-06 21:34:11.608] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:12.010] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:12.194] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:12.296] [INFO] Pose Update Rate [DeviceID 5]: Avg=1972.8 Hz (507 us), Min=0 us, Max=4162 us, Count=130000
[2026-03-06 21:34:12.446] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.577837 rotDeltaDeg=0.00558572
[2026-03-06 21:34:12.608] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:13.013] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:13.196] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:13.468] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.01 posDeltaMm=0.0934137 rotDeltaDeg=0.0582664
[2026-03-06 21:34:13.610] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:14.016] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:14.200] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:14.481] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.01 posDeltaMm=0.0602742 rotDeltaDeg=0.0324008
[2026-03-06 21:34:14.610] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.0100 baseMinCutoff=150.0000 effMinCutoff=143.2489 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:15.016] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:15.046] [INFO] >>> Smoothing strength changed: 0.010000 -> 0.250000
[2026-03-06 21:34:15.046] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2500 baseCutoff=150.0000 effCutoff=44.4142 rotRatio=0.7000 effRotCutoff=31.0900 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:15.200] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:15.490] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.577169 rotDeltaDeg=0.150382
[2026-03-06 21:34:15.610] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:16.016] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:16.201] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:16.490] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0190927 rotDeltaDeg=0.00430513
[2026-03-06 21:34:16.610] [INFO] >>> Smoothing strength changed: 0.250000 -> 0.500000
[2026-03-06 21:34:16.610] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.5000 baseCutoff=150.0000 effCutoff=24.4900 rotRatio=0.7000 effRotCutoff=17.1430 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:16.611] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.5000 baseMinCutoff=150.0000 effMinCutoff=15.0000 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:16.614] [INFO] >>> Smoothing strength changed: 0.510000 -> 0.625000
[2026-03-06 21:34:16.614] [INFO] >>> OneEuro params changed for device 5 minCutoff=5.000000 beta=3.500000 dCutoff=1.500000
[2026-03-06 21:34:16.614] [INFO] [SmoothingCorrelation] device=5 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.6250 baseCutoff=5.0000 effCutoff=0.2812 rotRatio=0.3000 effRotCutoff=0.0844 beta=3.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:16.623] [INFO] >>> Smoothing strength changed: 0.510000 -> 0.625000
[2026-03-06 21:34:16.623] [INFO] >>> OneEuro params changed for device 6 minCutoff=5.000000 beta=3.500000 dCutoff=1.500000
[2026-03-06 21:34:16.623] [INFO] [SmoothingCorrelation] device=6 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.6250 baseCutoff=5.0000 effCutoff=0.2812 rotRatio=0.3000 effRotCutoff=0.0844 beta=3.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:17.020] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:17.202] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:17.345] [INFO] Pose Update Rate [DeviceID 5]: Avg=1982.6 Hz (504 us), Min=0 us, Max=4041 us, Count=140000
[2026-03-06 21:34:17.500] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.5 posDeltaMm=0.0176312 rotDeltaDeg=0.00513219
[2026-03-06 21:34:17.613] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.5000 baseMinCutoff=150.0000 effMinCutoff=15.0000 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:17.632] [INFO] >>> Smoothing strength changed: 0.500000 -> 0.250000
[2026-03-06 21:34:17.632] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2500 baseCutoff=150.0000 effCutoff=44.4142 rotRatio=0.7000 effRotCutoff=31.0900 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:17.636] [INFO] >>> Smoothing strength changed: 0.625000 -> 0.510000
[2026-03-06 21:34:17.636] [INFO] >>> OneEuro params changed for device 5 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:17.636] [INFO] [SmoothingCorrelation] device=5 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:17.645] [INFO] >>> Smoothing strength changed: 0.625000 -> 0.510000
[2026-03-06 21:34:17.645] [INFO] >>> OneEuro params changed for device 6 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:17.645] [INFO] [SmoothingCorrelation] device=6 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:18.021] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:18.202] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:18.499] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0110795 rotDeltaDeg=0.00238854
[2026-03-06 21:34:18.614] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:19.025] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:19.203] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:19.500] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.1118 rotDeltaDeg=0.0641468
[2026-03-06 21:34:19.615] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:19.879] [INFO] >>> Smoothing strength changed: 0.250000 -> 0.500000
[2026-03-06 21:34:19.879] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.5000 baseCutoff=150.0000 effCutoff=24.4900 rotRatio=0.7000 effRotCutoff=17.1430 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:19.885] [INFO] >>> Smoothing strength changed: 0.510000 -> 0.625000
[2026-03-06 21:34:19.885] [INFO] >>> OneEuro params changed for device 5 minCutoff=5.000000 beta=3.500000 dCutoff=1.500000
[2026-03-06 21:34:19.885] [INFO] [SmoothingCorrelation] device=5 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.6250 baseCutoff=5.0000 effCutoff=0.2812 rotRatio=0.3000 effRotCutoff=0.0844 beta=3.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:19.891] [INFO] >>> Smoothing strength changed: 0.510000 -> 0.625000
[2026-03-06 21:34:19.891] [INFO] >>> OneEuro params changed for device 6 minCutoff=5.000000 beta=3.500000 dCutoff=1.500000
[2026-03-06 21:34:19.891] [INFO] [SmoothingCorrelation] device=6 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.6250 baseCutoff=5.0000 effCutoff=0.2812 rotRatio=0.3000 effRotCutoff=0.0844 beta=3.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:20.027] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:20.203] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:20.484] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.625 posDeltaMm=0.965934 rotDeltaDeg=0.450554
[2026-03-06 21:34:20.616] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.5000 baseMinCutoff=150.0000 effMinCutoff=15.0000 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:21.030] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:21.203] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.6250 baseMinCutoff=5.0000 effMinCutoff=0.2812 beta=3.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:21.491] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.625 posDeltaMm=0.530641 rotDeltaDeg=0.144026
[2026-03-06 21:34:21.616] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.5000 baseMinCutoff=150.0000 effMinCutoff=15.0000 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:21.759] [INFO] >>> Smoothing strength changed: 0.500000 -> 0.250000
[2026-03-06 21:34:21.759] [INFO] [SmoothingCorrelation] device=0 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=0 rotChanged=0 filterChanged=0 strength=0.2500 baseCutoff=150.0000 effCutoff=44.4142 rotRatio=0.7000 effRotCutoff=31.0900 beta=2.5000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:21.762] [INFO] >>> Smoothing strength changed: 0.625000 -> 0.510000
[2026-03-06 21:34:21.762] [INFO] >>> OneEuro params changed for device 5 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:21.762] [INFO] [SmoothingCorrelation] device=5 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:21.766] [INFO] >>> Smoothing strength changed: 0.625000 -> 0.510000
[2026-03-06 21:34:21.766] [INFO] >>> OneEuro params changed for device 6 minCutoff=5.000000 beta=5.000000 dCutoff=1.500000
[2026-03-06 21:34:21.766] [INFO] [SmoothingCorrelation] device=6 enabled=true stateChanged=0 strengthChanged=1 paramsChanged=1 rotChanged=0 filterChanged=0 strength=0.5100 baseCutoff=5.0000 effCutoff=0.4775 rotRatio=0.3000 effRotCutoff=0.1432 beta=5.0000 dCutoff=1.5000 diagExtreme=false
[2026-03-06 21:34:22.032] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:22.206] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:22.361] [INFO] Pose Update Rate [DeviceID 5]: Avg=1995.1 Hz (501 us), Min=0 us, Max=4051 us, Count=150000
[2026-03-06 21:34:22.513] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.522251 rotDeltaDeg=0.10174
[2026-03-06 21:34:22.618] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:23.036] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:23.209] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:23.520] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.132104 rotDeltaDeg=0.00770596
[2026-03-06 21:34:23.619] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:24.037] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:24.212] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:24.530] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.565331 rotDeltaDeg=0.0189748
[2026-03-06 21:34:24.620] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:25.041] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:25.213] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:25.541] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0246541 rotDeltaDeg=0.00617325
[2026-03-06 21:34:25.622] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:26.043] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:26.215] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:26.556] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0168107 rotDeltaDeg=0.00229225
[2026-03-06 21:34:26.623] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:27.048] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:27.218] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:27.414] [INFO] Pose Update Rate [DeviceID 6]: Avg=1980.4 Hz (505 us), Min=0 us, Max=3987 us, Count=160000
[2026-03-06 21:34:27.568] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.261602 rotDeltaDeg=0.0218591
[2026-03-06 21:34:27.623] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:28.051] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:28.219] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:28.564] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=0.384168 rotDeltaDeg=0.0860987
[2026-03-06 21:34:28.623] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:29.057] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:29.220] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:29.573] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=1.28235 rotDeltaDeg=0.377121
[2026-03-06 21:34:29.625] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:30.058] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:30.220] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:30.596] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.504529 rotDeltaDeg=0.316684
[2026-03-06 21:34:30.625] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:31.061] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:31.221] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:31.611] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=1.73988 rotDeltaDeg=0.984276
[2026-03-06 21:34:31.626] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:32.067] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:32.223] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:32.492] [INFO] Pose Update Rate [DeviceID 0]: Avg=1970.3 Hz (508 us), Min=0 us, Max=4285 us, Count=170000
[2026-03-06 21:34:32.627] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:32.643] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.336203 rotDeltaDeg=0.0059928
[2026-03-06 21:34:33.071] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:33.227] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:33.628] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:33.655] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=1.43802 rotDeltaDeg=0.66254
[2026-03-06 21:34:34.073] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:34.231] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:34.629] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:34.667] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.499346 rotDeltaDeg=0.23908
[2026-03-06 21:34:35.077] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:35.231] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:35.614] [INFO] setCalibrationActive called: FALSE
[2026-03-06 21:34:35.629] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:35.689] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=3.0906 rotDeltaDeg=0.886417
[2026-03-06 21:34:36.082] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:36.233] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:36.630] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:36.716] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.290912 rotDeltaDeg=0.0839381
[2026-03-06 21:34:37.083] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:37.238] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:37.571] [INFO] Pose Update Rate [DeviceID 0]: Avg=1970.6 Hz (507 us), Min=0 us, Max=4184 us, Count=180000
[2026-03-06 21:34:37.632] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:37.722] [INFO] >>> SMOOTHING OUTPUT DELTA device=5 strength=0.51 posDeltaMm=3.18702 rotDeltaDeg=1.0383
[2026-03-06 21:34:38.086] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:38.243] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:38.633] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:38.776] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.881012 rotDeltaDeg=0.0126612
[2026-03-06 21:34:39.087] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:39.246] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:39.634] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:39.813] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=2.564 rotDeltaDeg=0.791752
[2026-03-06 21:34:40.087] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:40.249] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:40.635] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:40.854] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=2.02715 rotDeltaDeg=0.559753
[2026-03-06 21:34:41.091] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:41.252] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:41.636] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:41.853] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.121552 rotDeltaDeg=0.00555075
[2026-03-06 21:34:42.091] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:42.253] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:42.637] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:42.688] [INFO] Pose Update Rate [DeviceID 0]: Avg=1956.1 Hz (511 us), Min=0 us, Max=3603 us, Count=190000
[2026-03-06 21:34:42.836] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.00556704 rotDeltaDeg=0.000422438
[2026-03-06 21:34:43.093] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:43.257] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:43.637] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:43.831] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.00280556 rotDeltaDeg=0.000632164
[2026-03-06 21:34:44.101] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:44.258] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:44.637] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:44.806] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0366126 rotDeltaDeg=0.0021602
[2026-03-06 21:34:45.102] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:45.259] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:45.639] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:45.804] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.125101 rotDeltaDeg=0.0727306
[2026-03-06 21:34:46.104] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:46.261] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:46.639] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:46.828] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.333402 rotDeltaDeg=0.211398
[2026-03-06 21:34:47.105] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:47.268] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:47.640] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:47.716] [INFO] Pose Update Rate [DeviceID 6]: Avg=1989.9 Hz (503 us), Min=0 us, Max=3917 us, Count=200000
[2026-03-06 21:34:47.873] [INFO] >>> SMOOTHING OUTPUT DELTA device=6 strength=0.51 posDeltaMm=0.147481 rotDeltaDeg=0.00860182
[2026-03-06 21:34:48.105] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:48.268] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:48.640] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:48.844] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.00454311 rotDeltaDeg=0.00111917
[2026-03-06 21:34:49.108] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:49.273] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:49.641] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:49.818] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.0683203 rotDeltaDeg=0.00186236
[2026-03-06 21:34:50.108] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:50.278] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:50.642] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:50.792] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.060769 rotDeltaDeg=0.00312932
[2026-03-06 21:34:51.108] [INFO] [EffectiveConfig] device=5 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:51.577] [INFO] [EffectiveConfig] device=6 class=Controller enabled=true strength=0.5100 baseMinCutoff=5.0000 effMinCutoff=0.4775 beta=5.0000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:51.642] [INFO] [EffectiveConfig] device=0 class=HMD enabled=true strength=0.2500 baseMinCutoff=150.0000 effMinCutoff=47.4342 beta=2.5000 dCutoff=1.5000 diagExtreme=false hasShmConfig=true
[2026-03-06 21:34:52.096] [INFO] >>> SMOOTHING OUTPUT DELTA device=0 strength=0.25 posDeltaMm=0.00490861 rotDeltaDeg=0.000642222
[2026-03-06 21:34:52.429] [INFO] === CLEANUP START ===
[2026-03-06 21:34:52.429] [INFO] CLEANUP: m_shuttingDown flag set
[2026-03-06 21:34:52.429] [INFO] CLEANUP: Removing hooks...
[2026-03-06 21:34:52.835] [INFO] CLEANUP: Hooks removed OK
[2026-03-06 21:34:52.845] [INFO] CLEANUP: Post-hook delay complete
[2026-03-06 21:34:52.845] [INFO] CLEANUP: Stopping shared memory IPC...
[2026-03-06 21:34:52.845] [INFO] CLEANUP: Shared memory IPC stopped OK
[2026-03-06 21:34:52.845] [INFO] CLEANUP: Stopping named pipe IPC server...
[2026-03-06 21:34:54.847] [INFO] CLEANUP: Named pipe IPC server stopped OK
[2026-03-06 21:34:54.847] [INFO] CLEANUP: Clearing device tracking...
[2026-03-06 21:34:54.847] [INFO] CLEANUP: Device tracking cleared OK
[2026-03-06 21:34:54.847] [INFO] === CLEANUP COMPLETE ===
.562921 avgPosDeltaMm=0.240542 maxPosDeltaMm=2.650638 avgRotDeltaDeg=0.121212 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:37.763] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=43000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=2770.410469 rawMaxFrameMm=0.562921 avgPosDeltaMm=0.241096 maxPosDeltaMm=2.650638 avgRotDeltaDeg=0.121116 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:38.203] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=43500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=2800.219664 rawMaxFrameMm=0.562921 avgPosDeltaMm=0.240724 maxPosDeltaMm=2.650638 avgRotDeltaDeg=0.120684 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:38.317] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=12000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=741.063931 rawMaxFrameMm=1.757079 avgPosDeltaMm=0.403575 maxPosDeltaMm=1.829983 avgRotDeltaDeg=0.013785 maxRotDeltaDeg=0.044018 estVel=0.110693
[2026-03-06 21:34:38.317] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=17500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2499.887436 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.614348 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.456296 maxRotDeltaDeg=5.528665 estVel=1.455715
[2026-03-06 21:34:38.652] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=44000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=2810.511852 rawMaxFrameMm=0.562921 avgPosDeltaMm=0.238676 maxPosDeltaMm=2.650638 avgRotDeltaDeg=0.119468 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:39.104] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=44500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=2835.238224 rawMaxFrameMm=0.562921 avgPosDeltaMm=0.237731 maxPosDeltaMm=2.650638 avgRotDeltaDeg=0.119152 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:39.385] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=18000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2541.436045 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.596114 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.450326 maxRotDeltaDeg=5.528665 estVel=0.289361
[2026-03-06 21:34:39.540] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=45000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=3030.160612 rawMaxFrameMm=0.646196 avgPosDeltaMm=0.251621 maxPosDeltaMm=2.664971 avgRotDeltaDeg=0.124402 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:39.882] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=12500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=775.059086 rawMaxFrameMm=1.757079 avgPosDeltaMm=0.404068 maxPosDeltaMm=1.829983 avgRotDeltaDeg=0.013821 maxRotDeltaDeg=0.044018 estVel=0.090498
[2026-03-06 21:34:39.970] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=45500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=3353.697676 rawMaxFrameMm=1.156826 avgPosDeltaMm=0.275353 maxPosDeltaMm=5.174459 avgRotDeltaDeg=0.129309 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:40.417] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=46000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=3840.849568 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.310052 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.132696 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:40.469] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=18500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2555.044797 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.565974 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.439048 maxRotDeltaDeg=5.528665 estVel=0.215343
[2026-03-06 21:34:40.842] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=46500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4105.391949 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.328575 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.134599 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:41.240] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=13000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=797.842450 rawMaxFrameMm=1.757079 avgPosDeltaMm=0.400580 maxPosDeltaMm=1.829983 avgRotDeltaDeg=0.014196 maxRotDeltaDeg=0.048039 estVel=0.051746
[2026-03-06 21:34:41.269] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=47000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4225.358353 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.333968 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.136989 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:41.681] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=47500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4247.904308 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.331895 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.138635 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:41.744] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=19000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2570.211529 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.534853 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.428254 maxRotDeltaDeg=5.528665 estVel=0.121648
[2026-03-06 21:34:42.098] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=48000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4259.837476 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.329188 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.138310 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:42.461] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=13500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=811.005325 rawMaxFrameMm=1.757079 avgPosDeltaMm=0.391280 maxPosDeltaMm=1.829983 avgRotDeltaDeg=0.013988 maxRotDeltaDeg=0.048039 estVel=0.022959
[2026-03-06 21:34:42.496] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=48500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4264.470584 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.326083 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.136930 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:42.917] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=49000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4267.948144 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.322962 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.135552 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:42.933] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=19500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2583.666509 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.503062 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.417845 maxRotDeltaDeg=5.528665 estVel=0.084060
[2026-03-06 21:34:43.327] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=49500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4271.825509 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.319901 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.134198 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:43.732] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=50000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4275.420061 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.316883 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.132873 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:43.941] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=14000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=829.191931 rawMaxFrameMm=1.757079 avgPosDeltaMm=0.392126 maxPosDeltaMm=1.829983 avgRotDeltaDeg=0.013985 maxRotDeltaDeg=0.048039 estVel=0.315679
[2026-03-06 21:34:44.013] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=20000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2593.406160 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.471822 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.408329 maxRotDeltaDeg=5.528665 estVel=0.117325
[2026-03-06 21:34:44.133] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=50500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4278.537476 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.313911 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.131571 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:44.530] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=51000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4281.992186 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.311015 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.130294 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:44.944] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=51500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4285.975183 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.308209 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.129042 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:45.059] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=20500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2603.043613 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.440882 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.398762 maxRotDeltaDeg=5.528665 estVel=0.078082
[2026-03-06 21:34:45.356] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=52000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4288.918861 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.305399 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.127816 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:45.436] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=14500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=869.073472 rawMaxFrameMm=1.969055 avgPosDeltaMm=0.408174 maxPosDeltaMm=2.227463 avgRotDeltaDeg=0.014403 maxRotDeltaDeg=0.063794 estVel=0.145072
[2026-03-06 21:34:45.775] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=52500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4299.222213 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.303150 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.127011 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:46.144] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=21000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2612.256516 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.410047 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.389688 maxRotDeltaDeg=5.528665 estVel=0.048705
[2026-03-06 21:34:46.211] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=53000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4348.108642 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.303681 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.127427 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:46.634] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=53500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4398.845661 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.304182 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.127853 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:46.950] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=15000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=897.097908 rawMaxFrameMm=2.867869 avgPosDeltaMm=0.410194 maxPosDeltaMm=3.014238 avgRotDeltaDeg=0.014469 maxRotDeltaDeg=0.063794 estVel=0.077631
[2026-03-06 21:34:47.069] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=54000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4467.917881 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.306480 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.129248 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:47.234] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=21500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2621.059311 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.380843 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.380931 maxRotDeltaDeg=5.528665 estVel=0.063141
[2026-03-06 21:34:47.504] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=54500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4490.229294 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.305160 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.128767 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:47.930] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=55000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4493.791658 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.302570 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.127702 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:48.331] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=55500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4496.510268 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.299987 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.126572 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:48.343] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=22000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2629.845949 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.352100 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.372703 maxRotDeltaDeg=5.528665 estVel=0.038873
[2026-03-06 21:34:48.484] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=15500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=923.575061 rawMaxFrameMm=2.867869 avgPosDeltaMm=0.407536 maxPosDeltaMm=3.014238 avgRotDeltaDeg=0.014312 maxRotDeltaDeg=0.063794 estVel=0.091315
[2026-03-06 21:34:48.734] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=56000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4499.845472 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.297464 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.125453 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:49.142] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=56500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4503.285676 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.295010 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.124355 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:49.367] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=22500 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2639.323425 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.324174 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.364744 maxRotDeltaDeg=5.528665 estVel=0.030612
[2026-03-06 21:34:49.548] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=57000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4506.040514 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.292571 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.123275 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:49.944] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=57500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4508.957569 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.290178 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.122213 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:49.958] [INFO] SmoothingTelemetry deviceId=6 class=2 diagExtreme=0 samples=16000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=951.117582 rawMaxFrameMm=2.867869 avgPosDeltaMm=0.408721 maxPosDeltaMm=3.014238 avgRotDeltaDeg=0.014599 maxRotDeltaDeg=0.063794 estVel=0.035921
[2026-03-06 21:34:50.350] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=58000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4512.049900 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.287824 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.121169 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:50.394] [INFO] SmoothingTelemetry deviceId=5 class=2 diagExtreme=0 samples=23000 strength=0.51 effCutoffPos=0.477496 effCutoffRot=0.143249 alphaPos_stationary=0.002991 beta=5.000000 rawTravelMm=2648.307739 rawMaxFrameMm=67.781801 avgPosDeltaMm=1.297094 maxPosDeltaMm=66.440671 avgRotDeltaDeg=0.357188 maxRotDeltaDeg=5.528665 estVel=0.012213
[2026-03-06 21:34:50.758] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=58500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4514.833824 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.285490 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.120141 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:51.160] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=59000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4517.891119 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.283210 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.119134 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:51.560] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=59500 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4521.237730 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.280988 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.118142 maxRotDeltaDeg=1.448929 estVel=0.000000
[2026-03-06 21:34:51.959] [INFO] SmoothingTelemetry deviceId=0 class=1 diagExtreme=0 samples=60000 strength=0.25 effCutoffPos=44.4142 effCutoffRot=31.09 alphaPos_stationary=0.218178 beta=2.500000 rawTravelMm=4523.964291 rawMaxFrameMm=2.992876 avgPosDeltaMm=0.278771 maxPosDeltaMm=7.005365 avgRotDeltaDeg=0.117166 maxRotDeltaDeg=1.448929 estVel=0.000000
</file>

<file name="b39387c2-92c8-4deb-ab4b-025ac8cdcbc1.txt" mime="text/plain">
[2026-03-06 21:32:37.321] [MAIN] entry point, argc=1
[2026-03-06 21:32:37.322] [MAIN] version=v1.2.398
[MAIN] Starting argument parsing loop
[MAIN] Exited argument parsing loop, about to enter try block
[STARTUP] main() try block entered, desktopMode=0
[STARTUP] About to create QApplication
[STARTUP] QApplication created
[STARTUP] App directory: C:/Program Files/RGCS
[STARTUP] About to set organization name
[STARTUP] Set organization name (empty to avoid double nesting)
[STARTUP] Set application name
[STARTUP] Setting application display name
[STARTUP] Installing Qt message handler
[STARTUP] Qt message handler installed
[STARTUP] About to set application version
[STARTUP] Application version set
[STARTUP] Setting up Qt file logging
[STARTUP] AppLogger initialized to: C:\Users\saq\AppData\Local\RGCS\logs
[STARTUP] Moving to core init
[STARTUP] Creating QSettings...
[STARTUP] QSettings path: C:/Users/saq/AppData/Local/RGCS/RGCS.ini
[STARTUP] QSettings created
[STARTUP] QML engine created with import paths
[STARTUP] About to create OverlayController...
[STARTUP] ENTERED try block for Init
[SHUTDOWN] Normal application shutdown - letting SteamVR clean up OpenVR
</file>
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709326754189404",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:16 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709326754189404",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:16 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709326754189404",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:16 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709326754189404",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:16 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709484485185538",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:17 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709484485185538",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:17 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709484485185538",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:17 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479709484485185538",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 05:17 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

please review the past 20 posts from you and the past several commits to identify the diagnostic trail and the direction we have been going to idetnify a solution
user: [Thread starter - for context]
Continued from Part 3. Starting fresh here for v1.2.388+ work.

Conversation info (untrusted metadata):
```json
{
  "message_id": "1479731055857504467",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RGCS Smoothing Development Part 4 - 1.2.388+ discussion channel id:1479522683883356170",
  "sender": "ragesaq",
  "timestamp": "Sat 2026-03-07 06:42 UTC",
  "group_subject": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_channel": "#rgcs-smoothing-development-part-4-1-2-388-discussion",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #rgcs-projects › RGCS Smoothing Development Part 4 - 1.2.388+ discussion",
  "topic_id": "1479522683883356170",
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

i think we were hitting context limits, can you read the last 10 messages in this channel?
