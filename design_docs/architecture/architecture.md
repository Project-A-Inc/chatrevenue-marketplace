# chatrevenue-marketplace — Architecture

> Living architecture. Updated as a development stage via the
> **accept-and-document** pass (see [`../README.md`](../README.md)). Reflects the
> system as built **today**, in present tense — not a changelog. Detail lives in
> [`references/`](references/); the *why* behind non-obvious choices lives in the
> append-only [`decisions/`](decisions/) log.

## Overview

`chatrevenue-marketplace` is a **Cowork-compatible plugin marketplace** that
distributes ChatRevenue's Cowork plugins, and the repo where those plugins and
their planning artifacts are authored. Cowork reads the marketplace manifest,
lists the plugins, and installs the one the user picks; from then on the plugin's
skills and MCP connectors run inside the user's Cowork sessions.

Today it ships one plugin, **`chatrevenue`** — a skills bundle for sales reps
(screen-memory queries, watcher-fired activity help, ICP lead generation, plus
setup skills that register Cowork-native scheduled tasks and artifacts) — wired
to the **ChatRevenue Monitor desktop app** through a small committed
stdio↔HTTP **proxy**. A second plugin, **`chatrevenue-skill-author`**, lets
non-technical staff author ChatRevenue agent skills (including workers and
archetype-driven dashboard widgets) through a
guided dialog that ends in a pull request, and (via a second skill,
`chatrevenue-analyze-chat`) lets them read and analyze real agent conversations
to inform that authoring — its repo-side half shipped to `project-a-skills`
(Plan A; plus a vendored trace tool) and its plugin half is the markdown bundle
in this repo (Plan B). See [references/skill-author-plugin.md](references/skill-author-plugin.md).

Two ideas carry the design. First, **a plugin is pure content plus a manifest**:
skills are markdown (`SKILL.md` + companion files), and the only executable piece
is the proxy, whose build output (`dist/bundle.js`) is **committed** so installs
need no build step. Second, **the desktop app owns the runtime state**
(memory store, watcher, schedules); the plugin is a thin client that talks to the
app's supervised MCP server over loopback, so most skills degrade gracefully when
the app isn't running and one skill (`chatrevenue-icp-lead-gen`) works with no
local dependency at all.

## Core building blocks

**Marketplace manifest.** `.claude-plugin/marketplace.json` is what Cowork reads:
owner, and a `plugins[]` array pointing at each plugin's source folder under
`plugins/`. Adding a plugin = appending an entry here (leaving existing entries
intact). Install is via GitHub OAuth against `Project-A-Inc/chatrevenue-marketplace`.

**Plugin: `chatrevenue`.** A plugin folder is `.claude-plugin/plugin.json`
(manifest) + `.mcp.json` (registers MCP servers) + `skills/` + optional bundled
code. This plugin registers the `chatrevenue-memory` MCP server (via the proxy)
and ships six skills split into two kinds: **invocation** skills the user (or a
toast) triggers (`chatrevenue-memory`, `chatrevenue-help-with-current-activity`,
`chatrevenue-icp-lead-gen`) and **setup** skills that register Cowork-native
scheduled tasks / artifacts (`setup-icp-lead-gen-daily`, `setup-sales-inbox-digest`,
`setup-calendar-analysis`). See [references/chatrevenue-plugin.md](references/chatrevenue-plugin.md).

**Memory proxy.** A small stdio↔streamable-HTTP bridge (~360 LoC across
`index.ts` + a static `fallback-tools.ts`) that lets a Cowork
plugin reach the desktop app's loopback MCP server (Cowork's connector UI rejects
plain `http://localhost`, so stdio is the only wired path). Stateless; its
`dist/bundle.js` is committed. See [references/memory-proxy.md](references/memory-proxy.md).

**Dependency model.** The memory/watcher skills need the
[ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor)
running (it owns the MCP server + watcher) and Node 18+ on PATH (Cowork plugins
use system Node). `chatrevenue-icp-lead-gen` and all three setup skills are
standalone — Cowork built-ins + connectors only.

**Planning & docs home.** `design_docs/` (specs + this architecture set) and
`engineering_plans/{drafts,ongoing,done,documented}` track the work. This repo is
the planning hub for the `chatrevenue-skill-author` feature even though half its
code lives in `project-a-skills`.

## Reference manifest

| Subsystem | Reference | What it covers |
|---|---|---|
| chatrevenue plugin | [references/chatrevenue-plugin.md](references/chatrevenue-plugin.md) | The plugin layout, the six skills (invocation vs setup), the desktop-app dependency model, and how setup skills register scheduled tasks/artifacts. |
| Memory proxy | [references/memory-proxy.md](references/memory-proxy.md) | The stdio↔HTTP bridge to the desktop app's MCP server: why it exists, how it's wired via `.mcp.json`, the committed-bundle convention, graceful degradation. |
| skill-author plugin | [references/skill-author-plugin.md](references/skill-author-plugin.md) | The `chatrevenue-skill-author` plugin and both its skills: the 7-step authoring workflow (`draft.json` v2 with workers, archetype-driven dashboard widgets, headless Claude Code handoff, two-layer validation) and the read-only `chatrevenue-analyze-chat` skill (drives the vendored trace tool to fetch + analyze real agent conversations). |

> Cross-repo note: `chatrevenue-skill-author` is a two-repo feature. Its plugin
> half is documented above; its repo-side half (`AGENT_GUIDE.md` + the
> `agent_helpers`) is documented in
> `project-a-skills/docs/architecture/references/agent-automation.md`.

## Decisions

Why the non-obvious, **implemented** choices were made lives in the append-only
ADR log at [decisions/](decisions/). The log is going-forward from this
bootstrap and now carries the `chatrevenue-skill-author` decisions (0001–0008,
spanning the authoring flow, the analyze-chat skill, and archetype-driven widget
authoring); decisions already shipped in the `chatrevenue` plugin are documented
in the plugin/proxy READMEs and are not backfilled as ADRs.
