# chatrevenue

ChatRevenue skills bundle for sales reps. Installs three skills + connects to the local ChatRevenue Monitor MCP server, all in one Cowork plugin.

> **Prerequisite:** [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) v1.x or later, **running on the same machine**. The plugin connects to the app's local HTTP MCP server at `http://127.0.0.1:53517/mcp`. If the app isn't running, the memory + activity skills can't reach their tools and will report errors. (`chatrevenue-icp-lead-gen` works without the app — it doesn't call the MCP server.)

## What you get

| Skill | What it does | Standalone? |
|---|---|---|
| `chatrevenue-memory` | Reads your local screen-memory store (last few weeks of screenshot-derived markdown memories). Answers "what was I doing", "prep me for X", "find when I mentioned Y", end-of-day summaries. | **No** — needs the ChatRevenue Monitor desktop app running so the MCP server is reachable on `127.0.0.1:53517`. |
| `chatrevenue-help-with-current-activity` | Watcher-fired incident handoff. The Monitor app's daemon detects "helpable" foreground activities (writing email, reviewing PRs, …) and fires a Windows toast that opens Cowork at `/chatrevenue-help-with-current-activity <incident-id>`. This skill resolves the incident, reads the live screen, and produces 2–3 specific next-action suggestions. | **No** — needs the desktop app for both the MCP server (incident lookup) and the watcher (toast firing). |
| `chatrevenue-icp-lead-gen` | Sales research partner. Day-1 conversational onboarding (interview the rep, build an ICP profile, save a leads tracker), daily/ad-hoc lead discovery, handoff briefs, tracker status sync. | **Yes** — uses Cowork's built-in web search + standard Cowork connectors (Outlook for the paired daily-run schedule, optional CRM). No dependency on the desktop app. |

## How the MCP connection works

This plugin ships a static `.mcp.json` pointing Cowork at `http://127.0.0.1:53517/mcp`:

```json
{
  "mcpServers": {
    "chatrevenue-memory": {
      "type": "http",
      "url": "http://127.0.0.1:53517/mcp"
    }
  }
}
```

The MCP server itself is hosted by the **ChatRevenue Monitor desktop app's supervisor** (not by Cowork) — the desktop app starts a Python HTTP server bound to `127.0.0.1:53517` at boot, alongside its other supervised children (`pensieve-serve`, `pensieve-watch`, watcher, etc.). The plugin is the connector; the desktop app provides the runtime. Cowork doesn't spawn or restart the server — that's the desktop app's job (Settings → Cowork → MCP card has Restart + View logs buttons).

**Loopback only.** The server binds to `127.0.0.1` exclusively — invisible to your LAN, no auth tokens required. Same-user processes can connect locally; that's by design (PortSwigger's Burp Suite MCP plugin uses the same shape).

**Platform note.** The desktop app is **Windows-only**. The `chatrevenue-icp-lead-gen` skill works cross-platform because it doesn't depend on the MCP server.

## Install

1. In Cowork: Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted.
4. Find **chatrevenue** in the marketplace listing → **Install**.
5. Restart Cowork so the new skills + MCP plugin load.

If the desktop app isn't running yet, install it from [Project-A-Inc/project-a-monitor](https://github.com/Project-A-Inc/project-a-monitor) — the wizard's step 3 walks you through this same plugin install, and step 4 onwards starts the supervised pipeline (which includes the MCP server).

## Source

Part of the [chatrevenue-marketplace](https://github.com/Project-A-Inc/chatrevenue-marketplace).

The skill files are mirrored from the desktop app's `desktop/resources/skills/` directory — kept in sync manually at release time. If you want the latest version, install from this marketplace and re-sync periodically (Cowork → Customize → Personal plugins → marketplace → ⋯ → Sync).
