# Session: 2026-03-09 09:44:52 UTC

- **Session Key**: agent:channel-mini:discord:channel:1479768177062842388
- **Session ID**: 7ed230e6-f167-45b3-b723-1fd8fac23f17
- **Source**: discord

## Conversation Summary

assistant: I found the architectural fault line: the profile system is still living on the same persistence path as the driver-facing runtime config, so the overlay can overwrite the driver’s effective settings with schema-v2/default-off state. I’m separating those now.
assistant: I’m making two concrete changes now:
1. `ProfileManager` moves to `profiles.json`
2. RageFX stops auto-applying empty/default profile state over the flat runtime config on startup

Then I’m adding logging around effective-config saves/applies so the next button test is obvious in the logs.
assistant: I caught one stale line in `ProfileManager.cpp`: the path change didn’t fully land, so I’m correcting the actual `config.json` reference to `profiles.json` now.
assistant: I’m making the runtime config save immediately on UI changes with a debounced save path. That way, if the UI is actually changing properties, we’ll see it hit `config.json` right away and the driver will reload.
assistant: I’ve separated profile persistence from the driver-facing runtime config and wired the UI to save `config.json` directly again. I’m adding that to `TO_VSCODE.md` so the next build review understands the new boundary.
assistant: This patch is coherent: flat runtime config is authoritative again, profiles moved aside, and UI changes now save immediately with logs. I’m committing and pushing it for your next VSCode build.
assistant: [[reply_to_current]] Done.

### Pushed
- commit: `5b240dd`
- message: `fix: separate runtime config from profiles and restore UI-driven config saves`

## What I changed

### 1. `config.json` is authoritative again for the driver
The driver-facing runtime config is back to being the flat effective settings file.

### 2. Profiles moved to `profiles.json`
`ProfileManager` no longer persists into `config.json`. It now uses:
- `%LOCALAPPDATA%\RageFX\profiles.json`

That stops the schema-v2 profile data from clobbering the driver’s runtime config.

### 3. No startup overwrite when no profiles exist
If there are no stored profiles:
- RageFX leaves `config.json` alone on startup
- manual/user settings stay authoritative

### 4. UI changes now save runtime config directly
I added a debounced save path so that when the QML UI changes `ConfigBridge` values, RageFX saves `config.json` automatically.

That means the next test should produce logs like:
- `Runtime config saved from UI debounce: ...`

and the driver should reload from that immediately.

### 5. Added better logging
You’ll now get clearer logs for:
- whether stored profiles existed
- when a profile gets applied into runtime config
- when UI changes trigger a runtime config save

---

## What I want you to look for in the next test
In `overlay.log`, after clicking/toggling controls, I want to see:

- `Runtime config saved from UI debounce: ...`

And in the driver log, shortly after:
- config reload with the new values

If we get those, then we’ve fixed the “buttons do nothing” architecture problem.
user: [Thread starter - for context]
not all games support reshade, is there a way we could integrate this into the compositor somehow?

Conversation info (untrusted metadata):
```json
{
  "message_id": "1480476466792628305",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RageFX Project channel id:1479768177062842388",
  "sender": "ragesaq",
  "timestamp": "Mon 2026-03-09 08:04 UTC",
  "group_subject": "#ragefx-project",
  "group_channel": "#ragefx-project",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #vr-projects › RageFX Project",
  "topic_id": "1479768177062842388",
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

Warnings (non-blocking):

Qt AutoMoc (no Q_OBJECT macro)
Missing VCINSTALLDIR
Missing dxcompiler.dll/dxil.dll

any concerns here?
assistant: [[reply_to_current]] Mostly no, but one is worth paying attention to.

## My read

### 1. Qt AutoMoc: “no Q_OBJECT macro”
Usually **not a real problem** by itself.

It normally means:
- a header got scanned by Qt’s automoc
- but that class doesn’t actually declare `Q_OBJECT`
- so moc generation is skipped

That’s harmless **unless** we expected that class to use:
- signals / slots
- Q_PROPERTY
- Q_ENUM
- QObject metaobject features

So:
- if the class is just a plain C++ helper, ignore it
- if it’s one of our QObject-derived classes that should expose signals/properties, then that’s a bug

### 2. Missing `VCINSTALLDIR`
This is the one I’d treat as **potentially concerning**.

It means the environment may not be fully inside the expected Visual Studio developer toolchain context.

Possible outcomes:
- build still works fine because CMake/VSCode found the compiler another way
- or some downstream build/package steps may behave inconsistently

If the build is succeeding cleanly, it’s not an emergency.
But long term I’d prefer the VSCode build environment to be properly initialized so:
- MSVC
- Windows SDK
- resource compiler
- linker
all come from the expected setup

### 3. Missing `dxcompiler.dll` / `dxil.dll`
Probably **not the current blocker**.

This only really matters if we’re doing DXC-based shader compilation at runtime/build time and actually relying on those DLLs.

Given RageFX is currently:
- injecting
- loading config
- creating overlays
- rendering QML
the current dashboard/UI issue is almost certainly **not caused by missing DXC DLLs**.

Still, for robustness, if the project or MCP build expects modern HLSL compilation through DXC, those DLLs should eventually be staged correctly.

---

## Bottom line

### Not worried:
- **Qt AutoMoc warning** — probably harmless
- **missing dxcompiler/dxil** — probably not today’s problem

### Mildly concerned:
- **missing VCINSTALLDIR** — not necessarily breaking, but not ideal build hygiene

## Recommendation
If VSCode is getting successful builds and the binaries run, I would **not** chase these first.

Priority should stay on:
1. UI controls actually writing config
2. driver reload reflecting those changes
3. finishing EXE / ARP icon fixes

If you want, I can also give you a quick “which of these warnings to ignore vs fix later” note for `TO_VSCODE.md`.
user: [Thread starter - for context]
not all games support reshade, is there a way we could integrate this into the compositor somehow?

Conversation info (untrusted metadata):
```json
{
  "message_id": "1480476810369044633",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RageFX Project channel id:1479768177062842388",
  "sender": "ragesaq",
  "timestamp": "Mon 2026-03-09 08:06 UTC",
  "group_subject": "#ragefx-project",
  "group_channel": "#ragefx-project",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #vr-projects › RageFX Project",
  "topic_id": "1479768177062842388",
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

i still dont have hte icon, which one gets embedded in the EXE and ARP
assistant: [[reply_to_current]] The **`.ico`** file should be the one embedded for both of those.

## Specifically

### EXE icon
Should use:
- `overlay/assets/ragefx.ico`

via:
- `overlay/ragefx.rc`

That `.ico` gets compiled into:
- `ragefx_overlay.exe`

### Add/Remove Programs icon
Should also use:
- `overlay/assets/ragefx.ico`

via WiX in:
- `installer/ragefx.wxs`

with something like:
- `<Icon Id="AppIcon" SourceFile="...ragefx.ico" />`
- `<Property Id="ARPPRODUCTICON" Value="AppIcon" />`

## Different icon for SteamVR dashboard
That one is **not** the `.ico`.

SteamVR dashboard thumbnail uses:
- `overlay/assets/ragefx_icon.png`

which gets staged/installed as:
- `C:\Program Files\RageFX\res\dashboardicon.png`

and referenced by:
- `overlay/manifest.vrmanifest`

## So the split is

- **EXE icon:** `overlay/assets/ragefx.ico`
- **ARP icon:** `overlay/assets/ragefx.ico`
- **SteamVR dashboard icon:** `overlay/assets/ragefx_icon.png` → `res/dashboardicon.png`

If you still don’t have the EXE / ARP icon, that means the `.ico` pipeline is still the one not wired correctly.
user: [media attached: 3 files]
[media attached 1/3: /home/lumadmin/.openclaw/media/inbound/0e83b9d0-d201-4269-91b6-e0eb45329c15.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/0e83b9d0-d201-4269-91b6-e0eb45329c15.txt]
[media attached 2/3: /home/lumadmin/.openclaw/media/inbound/3c4c4aa1-30f4-44d7-b6c9-297a07f1d6c6.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/3c4c4aa1-30f4-44d7-b6c9-297a07f1d6c6.txt]
[media attached 3/3: /home/lumadmin/.openclaw/media/inbound/6b18df9a-e6c5-4cf9-8ec5-3245a91b27d8.txt (text/plain) | /home/lumadmin/.openclaw/media/inbound/6b18df9a-e6c5-4cf9-8ec5-3245a91b27d8.txt]
To send an image back, prefer the message tool (media/path/filePath). If you must inline, use MEDIA:https://example.com/image.jpg (spaces ok, quote if needed) or a safe relative path like MEDIA:./image.jpg. Avoid absolute paths (MEDIA:/...) and ~ paths — they are blocked for security. Keep caption in the text body.
[Thread starter - for context]
not all games support reshade, is there a way we could integrate this into the compositor somehow?

Conversation info (untrusted metadata):
```json
{
  "message_id": "1480491996782268530",
  "sender_id": "142843545215041536",
  "conversation_label": "Guild #RageFX Project channel id:1479768177062842388",
  "sender": "ragesaq",
  "timestamp": "Mon 2026-03-09 09:06 UTC",
  "group_subject": "#ragefx-project",
  "group_channel": "#ragefx-project",
  "group_space": "1474997926919929927",
  "thread_label": "Discord thread #vr-projects › RageFX Project",
  "topic_id": "1479768177062842388",
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

[Discord Guild #RageFX Project channel id:1479768177062842388 +1h Mon 2026-03-09 09:06 UTC] ragesaq: do a pull and look for the latest changes from vscode. we've got the icons now. i can launch the overlay however clicking on anything is completely nonfunctional, its like the UI is frozen. here are the logs

<file name="0e83b9d0-d201-4269-91b6-e0eb45329c15.txt" mime="text/plain">
[22:41:40] ragefx: [RageFX Driver] Cleanup
[22:59:16] ragefx: [RageFX Driver] v1.0.0.9 loaded (build 9)
[22:59:16] ragefx: [RageFX Driver] Init — injecting into vrcompositor...
[22:59:18] ragefx: Injection: succeeded (pid=78504)
[23:00:22] ragefx: [RageFX Driver] Cleanup
[23:24:18] ragefx: [RageFX Driver] v1.0.0.10 loaded (build 10)
[23:24:18] ragefx: [RageFX Driver] Init — injecting into vrcompositor...
[23:24:20] ragefx: Injection: succeeded (pid=84116)
[23:36:36] ragefx: [RageFX Driver] Cleanup
[23:38:09] ragefx: [RageFX Driver] v1.0.0.11 loaded (build 11)
[23:38:09] ragefx: [RageFX Driver] Init — injecting into vrcompositor...
[23:38:11] ragefx: Injection: succeeded (pid=64788)
[01:03:42] ragefx: [RageFX Driver] Cleanup
[01:27:48] ragefx: [RageFX Driver] v1.0.0.15 loaded (build 15)
[01:27:48] ragefx: [RageFX Driver] Init — injecting into vrcompositor...
[01:27:50] ragefx: Injection: succeeded (pid=115756)
[01:28:47] ragefx: [RageFX Driver] Cleanup
[02:00:31] ragefx: [RageFX Driver] v1.0.0.17 loaded (build 17)
[02:00:31] ragefx: [RageFX Driver] Init — injecting into vrcompositor...
[02:00:33] ragefx: Injection: succeeded (pid=87672)
[02:05:44] ragefx: [RageFX Driver] Cleanup
</file>

<file name="3c4c4aa1-30f4-44d7-b6c9-297a07f1d6c6.txt" mime="text/plain">
[02:00:36.130] overlay: ========================================
[02:00:36.131] overlay: ragefx_overlay starting
[02:00:36.131] overlay: ========================================
[02:00:36.131] overlay: [RageFX Overlay] v1.0.0.17 starting (build 17)
[02:00:36.131] overlay: PID=42220
[02:00:36.131] overlay: argc=1
[02:00:36.131] overlay: argv[0] = C:\Program Files\RageFX\ragefx_overlay.exe
[02:00:36.132] overlay: QQuickStyle: Basic
[02:00:36.132] overlay: QSurfaceFormat: OpenGL Core 4.1
[02:00:36.294] overlay: QGuiApplication created
[02:00:36.294] overlay: Working directory: C:\Program Files\RageFX
[02:00:36.294] overlay: Executable path: C:\Program Files\RageFX\ragefx_overlay.exe
[02:00:36.294] overlay: Application dir: C:/Program Files/RageFX
[02:00:36.294] overlay: Manifest exists: yes path=C:/Program Files/RageFX/manifest.vrmanifest
[02:00:36.294] overlay: Dashboard icon exists: yes path=C:/Program Files/RageFX/res/dashboardicon.png
[02:00:36.320] overlay: Parent process: v (PID 82940)
[02:00:36.320] overlay: initialising SteamVR...
[02:00:36.412] overlay: VR_Init OK system=00007FFFC2EEC148
[02:00:36.412] overlay: IVROverlay=00007FFFC2EEFC80
[02:00:36.412] overlay: installer-managed registration expected (driver + manifest)
[02:00:36.412] overlay: Log rotation complete (pre-init rotation path)
[02:00:36.412] overlay: ConfigBridge loaded — rcasEnable=false rcasSharpness=0.500 lutEnable=false lutBlend=1.000 fovCrop=1.000
[02:00:36.412] overlay: ProfileManager: no profiles.json found, leaving runtime config authoritative
[02:00:36.412] overlay: ProfileManager loaded — systemEnabled=true mode=0 profiles=0 stored=false
[02:00:36.412] overlay: GameDetector: starting, log path: C:/Program Files (x86)/Steam/logs/vrserver.txt
[02:00:36.428] overlay: GameDetector started
[02:00:36.428] overlay: No stored profiles present; keeping flat runtime config.json authoritative on startup
[02:00:36.430] overlay: QQmlEngine created
[02:00:36.430] overlay: creating dashboard overlay...
[02:00:36.430] overlay: dashboard overlay created handle=146028888088 thumb=150323855385
[02:00:36.430] overlay: dashboard visible immediately after create: no
[02:00:36.430] overlay: dashboard properties configured (width/input/scroll/mouse scale)
[02:00:36.430] overlay: dashboard overlay created successfully; visibility is SteamVR-dashboard managed (no ShowOverlay call)
[02:00:37.082] overlay: thumbnail icon set: C:\Program Files\RageFX\res\dashboardicon.png
[02:00:37.082] overlay: QSG_RENDER_LOOP=basic forced
[02:00:37.082] overlay: creating OpenGL context for dashboard...
[02:00:38.020] overlay: GL context create=OK valid=yes version=4.1
[02:00:38.126] overlay: dashboard offscreen surface valid=yes
[02:00:38.134] overlay: dashboard FBO valid=yes tex=1 size=800x620
[02:00:38.134] overlay: dashboard render target set tex=1 800x620
[02:00:38.134] overlay: loading qrc:/qml/main.qml...
[02:00:38.996] overlay: dashboard QML loaded OK
[02:00:38.996] overlay: initialising AdjustOverlay...
[02:00:38.996] overlay: AdjustOverlay: CreateOverlay OK handle=188978561058
[02:00:39.348] overlay: AdjustOverlay: GL context valid=yes version=4.1
[02:00:39.377] overlay: AdjustOverlay: offscreen surface valid=yes
[02:00:39.383] overlay: AdjustOverlay: loading qrc:/qml/adjust.qml...
[02:00:39.719] overlay: AdjustOverlay: GL texture id=1 size=480x320
[02:00:39.719] overlay: AdjustOverlay: init complete
[02:00:39.719] overlay: AdjustOverlay init: OK
[02:00:39.719] overlay: adjustToggleRequested signal connected
[02:00:39.720] overlay: RGCS-style dashboard loop started (renderTimer=singleShot 5ms, pumpTimer=20ms)
[02:00:39.835] overlay: pump heartbeat frame=0 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1703 (unhandled)
[02:00:39.835] overlay: VREvent type=539 (unhandled)
[02:00:39.835] overlay: VREvent type=539 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1703 (unhandled)
[02:00:39.835] overlay: VREvent type=1701 (unhandled)
[02:00:39.835] overlay: VREvent type=539 (unhandled)
[02:00:39.835] overlay: VREvent type=539 (unhandled)
[02:00:39.835] overlay: VREvent type=535 (unhandled)
[02:00:39.835] overlay: VREvent type=1702 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1703 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1702 (unhandled)
[02:00:39.835] overlay: VREvent type=409 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=535 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1703 (unhandled)
[02:00:39.835] overlay: VREvent type=1701 (unhandled)
[02:00:39.835] overlay: VREvent type=412 (unhandled)
[02:00:39.835] overlay: VREvent type=1306 (unhandled)
[02:00:39.835] overlay: VREvent type=1703 (unhandled)
[02:00:39.836] overlay: VREvent type=1702 (unhandled)
[02:00:39.836] overlay: VREvent type=1702 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=409 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=103 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=805 (unhandled)
[02:00:39.836] overlay: VREvent type=801 (unhandled)
[02:00:39.836] overlay: VREvent type=1410 (unhandled)
[02:00:39.836] overlay: VREvent type=307 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=115 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=100 (unhandled)
[02:00:39.836] overlay: VREvent type=1701 (unhandled)
[02:00:39.836] overlay: VREvent type=900 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=115 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=111 (unhandled)
[02:00:39.836] overlay: VREvent type=100 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=412 (unhandled)
[02:00:39.836] overlay: VREvent type=1306 (unhandled)
[02:00:39.836] overlay: VREvent type=1703 (unhandled)
[02:00:39.836] overlay: VREvent type=1702 (unhandled)
[02:00:39.836] overlay: VREvent type=412 (unhandled)
[02:00:39.836] overlay: VREvent type=1701 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=1303 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=539 (unhandled)
[02:00:39.836] overlay: VREvent type=535 (unhandled)
[02:00:39.836] overlay: VREvent type=409 (unhandled)
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1703
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=539
[02:00:39.838] overlay: dash overlay event frame=0 type=539
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1703
[02:00:39.838] overlay: dash overlay event frame=0 type=1701
[02:00:39.838] overlay: dash overlay event frame=0 type=539
[02:00:39.838] overlay: dash overlay event frame=0 type=539
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=1702
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1703
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1702
[02:00:39.838] overlay: dash overlay event frame=0 type=409
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1703
[02:00:39.838] overlay: dash overlay event frame=0 type=1701
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=412
[02:00:39.838] overlay: dash overlay event frame=0 type=1306
[02:00:39.838] overlay: dash overlay event frame=0 type=1703
[02:00:39.838] overlay: dash overlay event frame=0 type=1702
[02:00:39.838] overlay: dash overlay event frame=0 type=1702
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=535
[02:00:39.838] overlay: dash overlay event frame=0 type=409
[02:00:39.838] overlay: dash overlay event frame=0 type=539
[02:00:39.838] overlay: dash overlay event frame=0 type=103
[02:00:39.838] overlay: dash overlay event frame=0 type=111
[02:00:39.838] overlay: dash overlay event frame=0 type=111
[02:00:39.838] overlay: dash overlay event frame=0 type=111
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.838] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=805
[02:00:39.839] overlay: dash overlay event frame=0 type=801
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=1410
[02:00:39.839] overlay: dash overlay event frame=0 type=307
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=115
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=100
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=1701
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=900
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=115
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=111
[02:00:39.839] overlay: dash overlay event frame=0 type=100
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=412
[02:00:39.839] overlay: dash overlay event frame=0 type=1306
[02:00:39.839] overlay: dash overlay event frame=0 type=1703
[02:00:39.839] overlay: dash overlay event frame=0 type=1702
[02:00:39.839] overlay: dash overlay event frame=0 type=412
[02:00:39.839] overlay: dash overlay event frame=0 type=1701
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=535
[02:00:39.839] overlay: dash overlay event frame=0 type=1303
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=539
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=114
[02:00:39.839] overlay: dash overlay event frame=0 type=535
[02:00:39.839] overlay: dash overlay event frame=0 type=409
[02:00:39.839] overlay: dash overlay event frame=0 type=409
[02:00:39.839] overlay: dash overlay event frame=0 type=1707
[02:00:39.839] overlay: thumb overlay event frame=0 type=114
[02:00:39.839] overlay: thumb overlay event frame=0 type=114
[02:00:39.839] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1703
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=539
[02:00:39.840] overlay: thumb overlay event frame=0 type=539
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1703
[02:00:39.840] overlay: thumb overlay event frame=0 type=1701
[02:00:39.840] overlay: thumb overlay event frame=0 type=539
[02:00:39.840] overlay: thumb overlay event frame=0 type=539
[02:00:39.840] overlay: thumb overlay event frame=0 type=508
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=1702
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1703
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1702
[02:00:39.840] overlay: thumb overlay event frame=0 type=409
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1703
[02:00:39.840] overlay: thumb overlay event frame=0 type=1701
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=412
[02:00:39.840] overlay: thumb overlay event frame=0 type=1306
[02:00:39.840] overlay: thumb overlay event frame=0 type=1703
[02:00:39.840] overlay: thumb overlay event frame=0 type=1702
[02:00:39.840] overlay: thumb overlay event frame=0 type=1702
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=535
[02:00:39.840] overlay: thumb overlay event frame=0 type=409
[02:00:39.840] overlay: thumb overlay event frame=0 type=539
[02:00:39.840] overlay: thumb overlay event frame=0 type=103
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=805
[02:00:39.840] overlay: thumb overlay event frame=0 type=801
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=1410
[02:00:39.840] overlay: thumb overlay event frame=0 type=307
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=115
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=111
[02:00:39.840] overlay: thumb overlay event frame=0 type=100
[02:00:39.840] overlay: thumb overlay event frame=0 type=114
[02:00:39.840] overlay: thumb overlay event frame=0 type=1701
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=900
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=115
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=111
[02:00:39.841] overlay: thumb overlay event frame=0 type=100
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=412
[02:00:39.841] overlay: thumb overlay event frame=0 type=1306
[02:00:39.841] overlay: thumb overlay event frame=0 type=1703
[02:00:39.841] overlay: thumb overlay event frame=0 type=1702
[02:00:39.841] overlay: thumb overlay event frame=0 type=412
[02:00:39.841] overlay: thumb overlay event frame=0 type=1701
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=535
[02:00:39.841] overlay: thumb overlay event frame=0 type=1303
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=539
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=114
[02:00:39.841] overlay: thumb overlay event frame=0 type=535
[02:00:39.841] overlay: thumb overlay event frame=0 type=409
[02:00:39.841] overlay: thumb overlay event frame=0 type=409
[02:00:39.841] overlay: pump heartbeat frame=0 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=true
[02:00:39.842] overlay: VREvent type=409 (unhandled)
[02:00:39.846] overlay: renderTimer enter frame=1 active=false
[02:00:39.985] overlay: SetOverlayTexture(dash) OK frame=1 visible=no tex=1
[02:00:39.985] overlay: renderTimer exit frame=1 active=false dashVisible=no
[02:00:39.986] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:39.986] overlay: dash overlay event frame=1 type=539
[02:00:39.986] overlay: dash overlay event frame=1 type=539
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=539
[02:00:39.986] overlay: dash overlay event frame=1 type=535
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=805
[02:00:39.986] overlay: dash overlay event frame=1 type=807
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=805
[02:00:39.986] overlay: dash overlay event frame=1 type=539
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=114
[02:00:39.986] overlay: dash overlay event frame=1 type=805
[02:00:39.986] overlay: dash overlay event frame=1 type=807
[02:00:39.986] overlay: dash overlay event frame=1 type=513
[02:00:39.986] overlay: thumb overlay event frame=1 type=539
[02:00:39.986] overlay: thumb overlay event frame=1 type=539
[02:00:39.986] overlay: thumb overlay event frame=1 type=114
[02:00:39.986] overlay: thumb overlay event frame=1 type=539
[02:00:39.986] overlay: thumb overlay event frame=1 type=535
[02:00:39.986] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=805
[02:00:39.987] overlay: thumb overlay event frame=1 type=807
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=805
[02:00:39.987] overlay: thumb overlay event frame=1 type=539
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=114
[02:00:39.987] overlay: thumb overlay event frame=1 type=805
[02:00:39.987] overlay: thumb overlay event frame=1 type=807
[02:00:39.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.121] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.149] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.163] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.190] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.201] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.222] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.252] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.263] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.284] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.303] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.326] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: dash overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.326] overlay: thumb overlay event frame=1 type=111
[02:00:40.344] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.375] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: dash overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.375] overlay: thumb overlay event frame=1 type=111
[02:00:40.383] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.405] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.405] overlay: dash overlay event frame=1 type=111
[02:00:40.405] overlay: dash overlay event frame=1 type=111
[02:00:40.405] overlay: dash overlay event frame=1 type=111
[02:00:40.406] overlay: dash overlay event frame=1 type=111
[02:00:40.406] overlay: dash overlay event frame=1 type=111
[02:00:40.406] overlay: dash overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.406] overlay: thumb overlay event frame=1 type=111
[02:00:40.422] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.462] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.484] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.502] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.541] overlay: dash overlay event frame=1 type=114
[02:00:40.541] overlay: thumb overlay event frame=1 type=114
[02:00:40.561] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.601] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.621] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.703] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.725] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.741] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.762] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.781] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.802] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.821] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.841] overlay: dash overlay event frame=1 type=114
[02:00:40.841] overlay: thumb overlay event frame=1 type=114
[02:00:40.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.881] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.939] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:40.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.060] overlay: dash overlay event frame=1 type=114
[02:00:41.060] overlay: thumb overlay event frame=1 type=114
[02:00:41.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.099] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.259] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.454] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.521] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:41.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.103] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.251] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.261] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.288] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.307] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.332] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.366] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.383] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.402] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.421] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.443] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.461] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.484] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.504] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.524] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.543] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.565] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.603] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.622] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.641] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.664] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.664] overlay: dash overlay event frame=1 type=114
[02:00:42.664] overlay: thumb overlay event frame=1 type=114
[02:00:42.681] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.702] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.722] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.741] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.761] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.860] overlay: dash overlay event frame=1 type=114
[02:00:42.860] overlay: thumb overlay event frame=1 type=114
[02:00:42.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:42.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.482] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.501] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.522] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.543] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.561] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.593] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.602] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.621] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.841] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:43.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.479] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: dash overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.540] overlay: thumb overlay event frame=1 type=111
[02:00:44.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.639] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.730] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.801] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:44.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.056] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.065] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.083] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: dash overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.084] overlay: thumb overlay event frame=1 type=114
[02:00:45.111] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.122] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.122] overlay: dash overlay event frame=1 type=412
[02:00:45.122] overlay: dash overlay event frame=1 type=1306
[02:00:45.122] overlay: dash overlay event frame=1 type=1703
[02:00:45.122] overlay: dash overlay event frame=1 type=1701
[02:00:45.122] overlay: thumb overlay event frame=1 type=412
[02:00:45.122] overlay: thumb overlay event frame=1 type=1306
[02:00:45.122] overlay: thumb overlay event frame=1 type=1703
[02:00:45.122] overlay: thumb overlay event frame=1 type=1701
[02:00:45.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.140] overlay: dash overlay event frame=1 type=1701
[02:00:45.140] overlay: thumb overlay event frame=1 type=1701
[02:00:45.161] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.247] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.473] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.481] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.601] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.639] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.722] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.939] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:45.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.040] overlay: dash overlay event frame=1 type=539
[02:00:46.040] overlay: dash overlay event frame=1 type=539
[02:00:46.040] overlay: thumb overlay event frame=1 type=539
[02:00:46.040] overlay: thumb overlay event frame=1 type=539
[02:00:46.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.102] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.126] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.461] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.581] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.641] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.941] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:46.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.221] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.582] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.840] overlay: dash overlay event frame=1 type=104
[02:00:47.840] overlay: thumb overlay event frame=1 type=104
[02:00:47.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:47.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.639] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.961] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:48.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.161] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:49.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.041] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.443] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.601] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.639] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.901] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:50.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.182] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.203] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.222] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.243] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.266] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.284] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.302] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.342] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.380] overlay: dash overlay event frame=1 type=114
[02:00:51.380] overlay: thumb overlay event frame=1 type=114
[02:00:51.405] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.423] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.454] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.461] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.507] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.527] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.541] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.569] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.569] overlay: dash overlay event frame=1 type=539
[02:00:51.569] overlay: thumb overlay event frame=1 type=539
[02:00:51.581] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.609] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.623] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.651] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.665] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.682] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.728] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.741] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.901] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.941] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:51.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.021] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.101] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.222] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.299] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.361] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.407] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.422] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.451] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.464] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.482] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.502] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.522] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.599] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.721] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:52.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.081] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.103] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.259] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.281] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.421] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.481] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.499] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.621] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.641] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.881] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:53.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.001] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.121] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.159] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.361] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.721] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:54.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.241] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.301] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.479] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.781] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.939] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:55.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.099] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.221] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.259] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.299] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.381] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.479] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.499] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.879] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:56.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.161] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.299] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.321] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.362] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.661] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.721] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.781] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:57.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.259] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.361] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.421] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.499] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.541] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.981] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:58.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.221] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.461] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.481] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.659] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.760] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:00:59.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.019] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.101] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.219] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.240] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.279] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.319] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.359] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.379] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.421] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.441] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.459] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.661] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.679] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.881] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:00.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.039] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.099] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.119] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.199] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.259] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.299] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.339] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.399] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.419] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.461] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.499] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.580] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.740] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.799] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.840] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.881] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:01.999] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.059] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.080] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.140] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.179] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.340] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.360] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.480] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.500] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.520] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.540] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.560] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.620] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.640] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.699] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.719] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.779] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.820] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.860] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.899] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.920] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.959] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:02.980] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.000] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.020] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.040] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.060] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.079] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.100] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.120] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.139] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.160] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.180] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.200] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.220] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.239] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.260] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.280] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.300] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.320] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.341] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.361] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.380] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.400] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.420] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.440] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.460] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.482] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.499] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.519] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.539] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.559] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.579] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.600] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.619] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.639] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.660] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.680] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.700] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.720] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.739] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.759] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.780] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.800] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.819] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.839] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.859] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.880] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.900] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.919] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.940] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.960] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErrors=0 renderTimerActive=false
[02:01:03.979] overlay: pump heartbeat frame=1 dashVisible=false adjustVisible=false renderErro
</file>

<file name="6b18df9a-e6c5-4cf9-8ec5-3245a91b27d8.txt" mime="text/plain">
[22:22:53] ragefx: ragefx loaded into vrcompositor.exe
[22:22:53] ragefx: Config: wrote default config (schema v1)
[22:22:53] ragefx: Config: schema version 1
[22:22:53] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:22:53] ragefx: ShaderHook: init tick=1579030265, heuristic window=8000ms, min size=20000 bytes
[22:22:53] ragefx: ShaderHook: hooks installed
[22:22:56] ragefx: Config: schema version 1
[22:22:56] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:22:56] ragefx: ShaderHookReload: lut=off cas=off
[22:22:57] ragefx: Config: schema version 1
[22:22:57] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:22:57] ragefx: ShaderHookReload: lut=off cas=off
[22:22:57] ragefx: Config: schema version 1
[22:22:57] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:22:57] ragefx: ShaderHookReload: lut=off cas=off
[22:23:40] ragefx: Config: schema version 1
[22:23:40] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:23:40] ragefx: ShaderHookReload: lut=off cas=off
[22:23:40] ragefx: Config: schema version 1
[22:23:40] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:23:40] ragefx: ShaderHookReload: lut=off cas=off
[22:23:41] ragefx: Config: schema version 1
[22:23:41] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:23:41] ragefx: ShaderHookReload: lut=off cas=off
[22:41:05] ragefx: ragefx loaded into vrcompositor.exe
[22:41:05] ragefx: Config: schema version 1
[22:41:05] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:05] ragefx: ShaderHook: init tick=1580122156, heuristic window=8000ms, min size=20000 bytes
[22:41:05] ragefx: ShaderHook: hooks installed
[22:41:08] ragefx: Config: schema version 1
[22:41:08] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:08] ragefx: ShaderHookReload: lut=off cas=off
[22:41:08] ragefx: Config: schema version 1
[22:41:08] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:08] ragefx: ShaderHookReload: lut=off cas=off
[22:41:08] ragefx: Config: schema version 1
[22:41:08] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:08] ragefx: ShaderHookReload: lut=off cas=off
[22:41:33] ragefx: Config: schema version 1
[22:41:33] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:33] ragefx: ShaderHookReload: lut=off cas=off
[22:41:33] ragefx: Config: schema version 1
[22:41:33] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:33] ragefx: ShaderHookReload: lut=off cas=off
[22:41:34] ragefx: Config: schema version 1
[22:41:34] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:41:34] ragefx: ShaderHookReload: lut=off cas=off
[22:59:18] ragefx: ragefx loaded into vrcompositor.exe
[22:59:18] ragefx: Config: schema version 1
[22:59:18] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:59:18] ragefx: ShaderHook: init tick=1581215562, heuristic window=8000ms, min size=20000 bytes
[22:59:19] ragefx: ShaderHook: hooks installed
[22:59:22] ragefx: Config: schema version 1
[22:59:22] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:59:22] ragefx: ShaderHookReload: lut=off cas=off
[22:59:22] ragefx: Config: schema version 1
[22:59:22] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:59:22] ragefx: ShaderHookReload: lut=off cas=off
[22:59:23] ragefx: Config: schema version 1
[22:59:23] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[22:59:23] ragefx: ShaderHookReload: lut=off cas=off
[23:00:09] ragefx: Config: schema version 1
[23:00:09] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[23:00:09] ragefx: ShaderHookReload: lut=off cas=off
[23:00:10] ragefx: Config: schema version 1
[23:00:10] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[23:00:10] ragefx: ShaderHookReload: lut=off cas=off
[23:00:11] ragefx: Config: schema version 1
[23:00:11] ragefx: Config loaded (schema v1): lut=off fsr=off fovCrop=1.00
[23:00:11] ragefx: ShaderHookReload: lut=off cas=off
[23:24:20] ragefx: ragefx loaded into vrcompositor.exe
[23:24:20] ragefx: Config: schema version 1
[23:24:20] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:24:20] ragefx: ShaderHook: init tick=1582717156, heuristic window=8000ms, min size=20000 bytes
[23:24:20] ragefx: ShaderHook: hooks installed
[23:24:24] ragefx: Config: schema version 1
[23:24:24] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:24:24] ragefx: ShaderHookReload: lut=on cas=off
[23:26:56] ragefx: Config: schema version 1
[23:26:56] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:26:56] ragefx: ShaderHookReload: lut=on cas=off
[23:38:11] ragefx: ragefx loaded into vrcompositor.exe
[23:38:11] ragefx: Config: schema version 1
[23:38:11] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:38:11] ragefx: ShaderHook: init tick=1583548312, heuristic window=8000ms, min size=20000 bytes
[23:38:12] ragefx: ShaderHook: hooks installed
[23:38:14] ragefx: Config: schema version 1
[23:38:14] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:38:14] ragefx: ShaderHookReload: lut=on cas=off
[23:38:14] ragefx: Config: schema version 1
[23:38:14] ragefx: Config loaded (schema v1): lut=on fsr=on fovCrop=1.00
[23:38:14] ragefx: ShaderHookReload: lut=on cas=off
[23:38:42] ragefx: Config: schema version 2
[23:38:42] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[23:38:42] ragefx: ShaderHookReload: lut=off cas=off
[23:38:42] ragefx: Config: schema version 2
[23:38:42] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[23:38:42] ragefx: ShaderHookReload: lut=off cas=off
[23:46:57] ragefx: Config: schema version 2
[23:46:57] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[23:46:57] ragefx: ShaderHookReload: lut=off cas=off
[00:22:08] ragefx: Config: schema version 2
[00:22:08] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[00:22:08] ragefx: ShaderHookReload: lut=off cas=off
[01:27:50] ragefx: ragefx loaded into vrcompositor.exe
[01:27:50] ragefx: Config: schema version 2
[01:27:50] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[01:27:50] ragefx: ShaderHook: init tick=1590127453, heuristic window=8000ms, min size=20000 bytes
[01:27:51] ragefx: ShaderHook: hooks installed
[01:27:54] ragefx: Config: schema version 2
[01:27:54] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[01:27:54] ragefx: ShaderHookReload: lut=off cas=off
[02:00:33] ragefx: ragefx loaded into vrcompositor.exe
[02:00:33] ragefx: Config: schema version 2
[02:00:33] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[02:00:33] ragefx: ShaderHook: init tick=1592089734, heuristic window=8000ms, min size=20000 bytes
[02:00:33] ragefx: ShaderHook: hooks installed
[02:00:36] ragefx: Config: schema version 2
[02:00:36] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[02:00:36] ragefx: ShaderHookReload: lut=off cas=off
[02:00:36] ragefx: Config: schema version 2
[02:00:36] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[02:00:36] ragefx: ShaderHookReload: lut=off cas=off
[02:00:37] ragefx: Config: schema version 2
[02:00:37] ragefx: Config loaded (schema v2): lut=off fsr=off fovCrop=1.00
[02:00:37] ragefx: ShaderHookReload: lut=off cas=off
</file>
assistant: I pulled and checked the latest handoff. The new logs are enough to narrow this down a lot more. I’m decoding the specific OpenVR event IDs now so we can tell whether SteamVR is actually sending click/input events or just focus/overlay housekeeping.
assistant: The key clue in the new logs is this: the overlay is alive, but I don’t see any of our translated `dashboard mouse down` / runtime-config-save logs. That means the UI isn’t “frozen” in a rendering sense — it’s missing the usable input path. I’m checking whether SteamVR dashboard overlays emit a slightly different event/input pattern than what we currently translate.
assistant: [[reply_to_current]] I pulled and reviewed the latest changes + these `1.0.0.17` logs.

## Short version
This is no longer a startup problem.

It’s now an **input-routing problem**.

The UI is rendering and the app is alive, but the controls are not receiving usable click/input events.

---

## What the logs prove

### Good news
The overlay is now **staying up**.

We have:
- startup completes
- dashboard QML loads
- adjust overlay initializes
- event loop continues
- repeated `pump heartbeat` logs keep coming

So the earlier “dies after startup” problem is basically gone.

### Also good
The dashboard render path is working:
- `SetOverlayTexture(dash) OK frame=1 visible=no tex=1`

So the dashboard texture submission is alive.

### The real issue
I do **not** see any of the logs I would expect if the controls were actually being activated:

- no `dashboard mouse down x=...`
- no `Runtime config saved from UI debounce: ...`

That means:
- the UI is visible
- but our translation layer is not converting SteamVR interaction into the kind of Qt mouse events the controls need

---

## Why I think the UI feels “frozen”

Right now RageFX is receiving **tons** of OpenVR overlay events, but we only treat a tiny subset as interactive input:

- `VREvent_MouseMove`
- `VREvent_MouseButtonDown`
- `VREvent_MouseButtonUp`

Everything else is ignored.

From the log, we’re getting a flood of:
- `111`
- `114`
- `539`
- `535`
- `805`
- `807`
- `103`
- `104`
- `900`
- `1701/1702/1703`
- etc.

That tells me:
- SteamVR is definitely talking to the overlay
- but our event decoder / input bridge is too primitive

So the problem is not “buttons don’t exist.”
It’s:

> the overlay is not yet translating SteamVR dashboard interaction into the Qt/QML interaction model properly.

---

## Most likely design gap

### RageFX currently has:
- render path working
- overlay lifecycle working
- event pump working

### But it likely lacks one or more of:
1. proper hover/focus handling
2. wheel/scroll event handling
3. correct button press/release routing
4. correct event target routing for Qt Quick Controls
5. proper event decoding for dashboard overlay input semantics
6. possibly one missing overlay-interactivity flag

---

## The strongest evidence
If the controls were actually being clicked:
- `ConfigBridge` property changes would happen
- the debounce save would fire
- the driver would reload

But none of that appears in the logs.

So this is **upstream of config saving**.

---

## My recommendation as engineer

### Next fix should focus on input translation, not rendering
I would make the next pass do these things:

#### 1. Add a readable event-name decoder
Instead of raw type numbers, log:
- `MouseMove`
- `MouseButtonDown`
- `MouseButtonUp`
- `ScrollDiscrete`
- `ScrollSmooth`
- `OverlayFocusChanged`
- `KeyboardDone`
- etc

Right now the logs are too noisy to reason about quickly.

#### 2. Handle more input events
Add explicit handling for:
- mouse wheel / scroll
- hover/focus changes
- maybe touch/drag related events if SteamVR uses them for dashboard interaction

#### 3. Log actual event translation
For each handled event, log:
- source overlay handle
- event type
- translated Qt event type
- x/y coordinates
- target object/window

#### 4. Verify Qt Quick Controls interaction assumptions
Qt Quick Controls Basic often needs more than just a bare press/release:
- hover state
- mouse move updates
- focus updates
- wheel events for sliders/combo boxes
- sometimes correct local coordinate delivery matters a lot

#### 5. Compare RGCS input path specifically
Not just its render loop anymore — now the most useful comparison is:
- how RGCS translates overlay input into Qt events
- whether it does anything special for:
  - focus
  - wheel
  - event delivery target
  - dashboard activation state

---

## My architectural read now

We’ve moved from:
- startup failure
to:
- rendering alive but input bridge incomplete

That is progress.

## Priority
The next engineering pass should be:

1. decode event IDs into named OpenVR events
2. improve input bridging into Qt/QML
3. add logging around actual translated mouse/scroll/focus events
4. compare RGCS input handling path directly

If you want, I’ll take that as the next implementation pass and patch the input system rather than just describing it.
