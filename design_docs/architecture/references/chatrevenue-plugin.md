# chatrevenue plugin

## Responsibility

The sales-rep skills bundle distributed by this marketplace: screen-memory
queries, watcher-fired activity help, ICP lead generation, and setup skills that
register Cowork-native scheduled tasks and artifacts. It owns the skill content
and the plugin wiring (`plugin.json`, `.mcp.json`). It does **not** own the
memory store, the watcher, or the MCP server — those live in the ChatRevenue
Monitor desktop app and are reached through the [memory proxy](memory-proxy.md).

## Structure

```
plugins/chatrevenue/
  .claude-plugin/plugin.json   manifest (name, description, author)
  .mcp.json                    registers the chatrevenue-memory MCP server (→ proxy)
  proxy/                       stdio↔HTTP bridge (see memory-proxy.md); dist/bundle.js committed
  skills/
    chatrevenue-memory/                     invocation
    chatrevenue-help-with-current-activity/ invocation (toast-fired)
    chatrevenue-icp-lead-gen/               invocation (standalone)
    setup-icp-lead-gen-daily/   {SKILL.md, SCHEDULE.md}
    setup-sales-inbox-digest/   {SKILL.md, SCHEDULE.md}
    setup-calendar-analysis/    {SKILL.md, ARTIFACT.md, template.html}
  README.md
```

## Contracts

**Two skill kinds.**

- **Invocation skills** run on user/agent trigger. `chatrevenue-memory` answers
  context questions from the local screen-memory store;
  `chatrevenue-help-with-current-activity` is invoked as
  `/chatrevenue-help-with-current-activity <incident-id>` from a Windows toast the
  Monitor watcher fires, resolves the incident over MCP, reads the live screen,
  and returns 2–3 next-action suggestions; `chatrevenue-icp-lead-gen` is a sales
  research partner (Day-1 onboarding → ICP/Sales profile → leads tracker, plus
  daily discovery, handoff briefs, status sync).
- **Setup skills** register Cowork-native automation and carry their playbook +
  content as companion files: `setup-icp-lead-gen-daily` and
  `setup-sales-inbox-digest` register **scheduled tasks** (their `SCHEDULE.md`
  is the cadence/registration playbook); `setup-calendar-analysis` creates an
  **artifact** (its `ARTIFACT.md` + `template.html` are the dashboard, with three
  placeholders — user email, company domain, Outlook MCP tool name — resolved at
  setup). Re-running a `setup-*` skill refreshes the task/artifact to the latest
  version; there are no separate update/uninstall skills.

**MCP surface.** `.mcp.json` registers one server, `chatrevenue-memory`, whose
`command` is `node ${CLAUDE_PLUGIN_ROOT}/proxy/dist/bundle.js` with
`MCP_URL=http://127.0.0.1:53517/mcp`. The memory/activity skills call its tools.

## Lifecycle / flow

Install (Cowork → marketplace → pick `chatrevenue` → install → restart) loads the
skills and starts the proxy-backed MCP server. A memory/activity skill call goes
plugin → proxy → desktop app's MCP server → back. A setup skill, run once,
registers a Cowork scheduled task or artifact that then runs on its own cadence.

## Constraints & decisions

- **Dependency tiers.** `chatrevenue-memory` and
  `chatrevenue-help-with-current-activity` need the desktop app running (it owns
  the MCP server + watcher) and Node 18+ on PATH. `chatrevenue-icp-lead-gen` and
  all three setup skills are **standalone** (Cowork built-ins + connectors only).
- **Graceful degradation.** If the desktop app isn't running when a memory tool
  is called, the proxy returns a friendly install message rather than crashing,
  and auto-recovers when the app starts — no Cowork restart needed.
- **Skill content is English** (`chatrevenue-icp-lead-gen` states it explicitly);
  runtime output may match the user's locale.
- Proxy build/commit convention: see [memory-proxy.md](memory-proxy.md).
