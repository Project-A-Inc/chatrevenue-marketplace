# chatrevenue

ChatRevenue skills bundle for sales reps. Installs the `chatrevenue-memory` MCP server (via a bundled stdio↔HTTP proxy), three invocation skills (memory queries, watcher-fired activity help, ICP lead-gen Day-1 onboarding), and three setup skills that register Cowork-native scheduled tasks + artifacts in the user's workspace.

> **Prerequisites**
> 1. **Node.js 18+** on the user's PATH (Cowork plugins use system Node, not Cowork's bundled Electron runtime). Install from [nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS.LTS` / `brew install node`. **Required** — without it Cowork can't spawn the plugin's proxy.
> 2. [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) running on the same machine. Memories live in the desktop app's local store; the plugin's proxy forwards tool calls to its supervised MCP server on `127.0.0.1:53517`. **Soft requirement** — if the app isn't running when you call a memory tool, the proxy returns a friendly install-instructions message instead of crashing, and auto-recovers as soon as you start the app (no Cowork restart needed).
>
> (`chatrevenue-icp-lead-gen` is the exception — it works without the desktop app and without Node.)

## What you get

### Invocation skills

| Skill | What it does | Standalone? |
|---|---|---|
| `chatrevenue-memory` | Reads your local screen-memory store (last few weeks of screenshot-derived markdown memories). Answers "what was I doing", "prep me for X", "find when I mentioned Y", end-of-day summaries. | **No** — needs the desktop app running (it owns the MCP server). |
| `chatrevenue-help-with-current-activity` | Watcher-fired incident handoff. The Monitor app's daemon detects "helpable" foreground activities (writing email, reviewing PRs, …) and fires a system toast that opens Cowork at `/chatrevenue-help-with-current-activity <incident-id>`. This skill resolves the incident, reads the live screen, and produces 2–3 specific next-action suggestions. | **No** — needs the desktop app for both the MCP server and the watcher. |
| `chatrevenue-icp-lead-gen` | Sales research partner. Day-1 conversational onboarding (interview the rep, build an ICP profile, save a leads tracker), daily/ad-hoc lead discovery, handoff briefs, tracker status sync. | **Yes** — uses Cowork's built-in web search + standard Cowork connectors only. No dependency on the desktop app or Node. |

### Setup skills

These skills register Cowork-native scheduled tasks + artifacts in the user's workspace. Each one bundles its install playbook and content as plugin-side companion files; re-running the skill refreshes the user's task/artifact to the latest version. There are no separate `update-*` / `uninstall-*` skills — re-run `setup-*` to update; remove manually in Cowork's Scheduled list / artifact UI.

| Skill | What it does | Standalone? |
|---|---|---|
| `setup-icp-lead-gen-daily` | Registers a Cowork scheduled task that finds 3 fresh ICP-fit leads every weekday morning and appends them to the user's tracker. Requires the `chatrevenue-icp-lead-gen` Day-1 setup to have completed first (so the profile + tracker exist). | **Yes** |
| `setup-sales-inbox-digest` | Registers a Cowork scheduled task that scans Outlook each morning, categorizes mail, drafts replies for client/partner threads, and writes a markdown digest. Requires Microsoft 365 + one CRM connector. | **Yes** |
| `setup-calendar-analysis` | Creates a Cowork-native artifact — interactive HTML dashboard that reads Outlook calendar via MCP, classifies meetings, and benchmarks against published SaaS Sales IC data. Requires the user's Outlook calendar-search MCP tool. | **Yes** |

## How the MCP connection works

This plugin's `.mcp.json` runs a tiny **bundled JS proxy** that bridges Cowork's stdio transport to the desktop app's HTTP MCP server:

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

`${CLAUDE_PLUGIN_ROOT}` resolves at runtime to wherever Cowork installed the plugin. The proxy itself is `proxy/dist/bundle.js` — a single esbuild output (~620 KB) committed to the repo with all npm dependencies inlined; no `npm install` runs on the user's machine.

The proxy connects to the **streamable-http MCP server** that the ChatRevenue Monitor desktop app supervises on `127.0.0.1:53517` and forwards every JSON-RPC frame through unchanged. All path logic — memories root, notifier state, bundled skills/schedules/artifacts dirs — stays inside the desktop app; the plugin is **stateless** and only knows the loopback URL.

**Why a proxy and not a direct HTTP connector?** Cowork's "Add custom connector" UI rejects `http://localhost` URLs (it enforces `https://`). stdio is the only wired path that lets a plugin talk to a local HTTP server. The proxy is the canonical workaround — same pattern as [filestack-claude-plugin](https://github.com/filestack/filestack-claude-plugin/blob/master/.mcp.json) and [claude-code-confluent-plugin](https://github.com/confluentinc/claude-code-confluent-plugin/blob/main/.mcp.json) (bundle the MCP-side glue with esbuild, commit `dist/`, run via `node ${CLAUDE_PLUGIN_ROOT}/.../bundle.js`).

**Cross-platform.** Bundled JS works identically on Windows, macOS, and Linux. The desktop app currently ships Windows-only (Tauri NSIS), but this plugin will not require any change when macOS support lands — the proxy already targets `127.0.0.1:53517` regardless of OS.

## Install

1. In Cowork: Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted.
4. Find **chatrevenue** in the marketplace listing → **Install**.
5. Restart Cowork so the new skills + MCP plugin load.
6. Verify: open a new Cowork chat, ask "what was I doing today" — the `chatrevenue-memory` tools should be invoked. If you get "Failed to connect to upstream MCP" in the proxy logs, make sure the desktop app is running.

If the desktop app isn't installed yet, install it from [Project-A-Inc/project-a-monitor](https://github.com/Project-A-Inc/project-a-monitor) **before** invoking memory tools — the proxy returns connect-refused if `127.0.0.1:53517` is not listening.

## Source

Part of the [chatrevenue-marketplace](https://github.com/Project-A-Inc/chatrevenue-marketplace). The proxy source is in `proxy/src/index.ts`; rebuild with `cd proxy && npm install && npm run build` after every edit and commit `dist/bundle.js`.

Skills + their setup playbooks live in this repo as the source of truth. The desktop app no longer ships its own copy of skills / schedules / artifacts — pre-Option-C versions distributed those via three MCP plan-tools (`chatrevenue_install_cowork_package_plan` etc); those tools were dropped in favour of the `setup-*` skills here.
