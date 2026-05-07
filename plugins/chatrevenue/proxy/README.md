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

- **Node.js 18+ on the user's PATH.** Cowork plugins use system Node, not Cowork's bundled Electron runtime — that's reserved for `.mcpb` Desktop Extensions.
- ChatRevenue Monitor desktop app installed and running. The supervised HTTP MCP server starts as part of the app's normal boot sequence.

If `node` isn't on PATH, install Node LTS from [nodejs.org](https://nodejs.org/) or via `winget install OpenJS.NodeJS.LTS` (Windows) / `brew install node` (macOS).

## Cross-platform

Bundled JS works identically on Windows, macOS, and Linux. No per-platform builds, no code-signing. The plugin's `.mcp.json` references `${CLAUDE_PLUGIN_ROOT}/proxy/dist/bundle.js` regardless of OS.
