# chatrevenue

ChatRevenue skills bundle for sales reps. Installs three skills + the `chatrevenue-memory` MCP server, all in one Cowork plugin.

> **Prerequisite:** [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) v1.x or later, installed at the canonical NSIS path (`%LOCALAPPDATA%\Programs\ChatRevenue Monitor\`). Cowork spawns the bundled Python script as a stdio subprocess on demand and reads memories from `%LOCALAPPDATA%\ChatRevenueMonitor\data\`. (`chatrevenue-icp-lead-gen` is the exception — it works without the app.)

## What you get

| Skill | What it does | Standalone? |
|---|---|---|
| `chatrevenue-memory` | Reads your local screen-memory store (last few weeks of screenshot-derived markdown memories). Answers "what was I doing", "prep me for X", "find when I mentioned Y", end-of-day summaries. | **No** — needs the desktop app installed (the bundled Python + script the plugin spawns). |
| `chatrevenue-help-with-current-activity` | Watcher-fired incident handoff. The Monitor app's daemon detects "helpable" foreground activities (writing email, reviewing PRs, …) and fires a Windows toast that opens Cowork at `/chatrevenue-help-with-current-activity <incident-id>`. This skill resolves the incident, reads the live screen, and produces 2–3 specific next-action suggestions. | **No** — needs the desktop app for both the MCP server and the watcher. |
| `chatrevenue-icp-lead-gen` | Sales research partner. Day-1 conversational onboarding (interview the rep, build an ICP profile, save a leads tracker), daily/ad-hoc lead discovery, handoff briefs, tracker status sync. | **Yes** — uses Cowork's built-in web search + standard Cowork connectors only. No dependency on the desktop app. |

## How the MCP connection works

This plugin's `.mcp.json` declares a **stdio subprocess** that points at the desktop app's bundled Python + MCP script:

```json
{
  "mcpServers": {
    "chatrevenue-memory": {
      "command": "${env:LOCALAPPDATA}\\Programs\\ChatRevenue Monitor\\python\\python.exe",
      "args": [
        "${env:LOCALAPPDATA}\\Programs\\ChatRevenue Monitor\\scripts\\chatrevenue_mcp_server.py"
      ],
      "env": {
        "MEMORIES_ROOT": "${env:LOCALAPPDATA}\\ChatRevenueMonitor\\data\\memories",
        "NOTIFIER_STATE_DIR": "${env:LOCALAPPDATA}\\ChatRevenueMonitor\\data\\notifier\\state",
        "BUNDLED_SKILLS_DIR": "${env:LOCALAPPDATA}\\Programs\\ChatRevenue Monitor\\resources\\skills",
        "BUNDLED_SCHEDULES_DIR": "${env:LOCALAPPDATA}\\Programs\\ChatRevenue Monitor\\resources\\schedules",
        "BUNDLED_ARTIFACTS_DIR": "${env:LOCALAPPDATA}\\Programs\\ChatRevenue Monitor\\resources\\artifacts"
      }
    }
  }
}
```

`${env:LOCALAPPDATA}` resolves at runtime to the user's per-user AppData path; the desktop app's NSIS installer always writes to that canonical location, so when the plugin is activated Cowork can spawn the bundled Python directly without configuration.

**Why stdio and not HTTP?** Cowork's connector UI requires `https://` URLs and explicitly rejects `http://localhost` — even when the plugin's `.mcp.json` declares an HTTP transport, the activation dialog blocks Add when the URL doesn't start with `https://`. stdio bypasses that validation entirely and is the documented pattern for Cowork plugins that bundle a local subprocess.

The desktop app **also** runs the same Python script as a streamable-http server on `127.0.0.1:53517` under its own supervisor (Settings → Cowork → MCP card shows that server's status). That instance is currently unused by Cowork — it stays around as future-proofing for in-app tool calls and so the supervisor can verify the bundled Python install is healthy without spawning a separate child for the check.

**Platform note.** The desktop app is **Windows-only** (Tauri NSIS installer); the stdio command above hardcodes Windows paths under `%LOCALAPPDATA%`. The `chatrevenue-icp-lead-gen` skill works cross-platform because it doesn't depend on the desktop app.

## Install

1. In Cowork: Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted.
4. Find **chatrevenue** in the marketplace listing → **Install**.
5. In Customize → Personal plugins → chatrevenue → **Connectors**, click **Add to your team** on `chatrevenue-memory`. Cowork spawns the Python subprocess on first tool call.
6. Restart Cowork so the new skills + MCP plugin load.

If the desktop app isn't installed yet, install it from [Project-A-Inc/project-a-monitor](https://github.com/Project-A-Inc/project-a-monitor) **before** activating the connector — the stdio command in the plugin's `.mcp.json` references files inside the desktop app's install root.

## Source

Part of the [chatrevenue-marketplace](https://github.com/Project-A-Inc/chatrevenue-marketplace).

The skill files are mirrored from the desktop app's `desktop/resources/skills/` directory — kept in sync manually at release time. If you want the latest version, install from this marketplace and re-sync periodically (Cowork → Customize → Personal plugins → marketplace → ⋯ → Sync).
