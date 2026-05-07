# chatrevenue-memory MCP proxy

Thin stdio↔streamable-http proxy that bridges Cowork's plugin transport to the ChatRevenue Monitor desktop app's supervised MCP server on `127.0.0.1:53517`.

## Why a proxy

- Cowork's "Add custom connector" UI rejects plain `http://localhost` URLs (it enforces `https://`). stdio is the only wired path for plugins that talk to a local HTTP server.
- The desktop app already runs the MCP server under its supervisor with the correct env (memory store, notifier state, bundled skills, schedules, artifacts dirs). Spawning a fresh subprocess per Cowork chat would duplicate work and force the plugin to know the desktop app's install paths.
- The proxy is **stateless** — it carries no user paths, no API keys, no config beyond a single loopback URL.

## How it's wired

The plugin's `.mcp.json` invokes this script via Node:

```json
{
  "mcpServers": {
    "chatrevenue-memory": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/proxy/dist/bundle.js"],
      "env": { "MCP_URL": "http://127.0.0.1:53517/mcp" }
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` resolves at runtime to wherever Cowork stored the plugin. `MCP_URL` is overridable for testing.

## Build

```bash
cd plugins/chatrevenue/proxy
npm install
npm run build
```

`dist/bundle.js` is **committed to the repo** (Filestack/Confluent pattern — see [filestack-claude-plugin](https://github.com/filestack/filestack-claude-plugin/blob/master/.mcp.json)). Re-run `npm run build` after every change to `src/` and commit the regenerated bundle.

`dist/` is *not* in `.gitignore`. `node_modules/` is.

## Prerequisites

- **Node.js 18+ on the user's PATH.** Cowork plugins use system Node, not Cowork's bundled Electron runtime — that's reserved for `.mcpb` Desktop Extensions. Without Node, Cowork can't spawn the proxy at all and the `chatrevenue-memory` tools won't appear in chat.
- ChatRevenue Monitor desktop app installed and running. The supervised HTTP MCP server starts as part of the app's normal boot sequence. **Optional at proxy startup, required at tool-call time** — see fallback below.

If `node` isn't on PATH, install Node LTS from [nodejs.org](https://nodejs.org/) or via `winget install OpenJS.NodeJS.LTS` (Windows) / `brew install node` (macOS).

## Fallback mode (desktop app not running)

If the desktop app isn't installed or isn't running when Cowork spawns the proxy, the proxy does **not** crash — Cowork still sees a healthy `chatrevenue-memory` server with the full hardcoded tool list (`fallback-tools.ts`, names + schemas matching the real upstream 1:1). Every `tools/call` returns a friendly error explaining what's missing and how to install / start the desktop app:

- "If you haven't installed the app yet, download from https://github.com/Project-A-Inc/project-a-monitor/releases/latest"
- "If installed, start it from the Start menu — runs in the system tray"
- "No Cowork restart needed; this proxy auto-recovers"

On every request the proxy retries the upstream connection. As soon as the desktop app comes up, the next tool call hits live tools without any user intervention.

This means the plugin is safe to install as a soft dependency: a sales rep can add the plugin to Cowork before installing the desktop app, get clear instructions in chat, install the app, and continue without restarting Cowork.

## Cross-platform

Bundled JS works identically on Windows, macOS, and Linux. No per-platform builds, no code-signing. The plugin's `.mcp.json` references `${CLAUDE_PLUGIN_ROOT}/proxy/dist/bundle.js` regardless of OS.
