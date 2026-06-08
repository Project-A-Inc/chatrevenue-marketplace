# 0002 — The skill-author plugin is pure markdown; no MCP server in v1

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `engineering_plans/documented/2026-05-27-chatrevenue-skill-author-plugin.md` + `design_docs/2026-05-27-chatrevenue-skill-author-design.md` §5.1

## Context

An early design for `chatrevenue-skill-author` included an MCP server exposing
tools to read skills from the LangGraph Store and validate drafts (mirroring how
the existing `chatrevenue` plugin ships a bundled proxy + MCP server). That is
real build + maintenance surface (a JS bundle, esbuild, a committed `dist/`).

## Decision

Ship the plugin as **pure markdown** — one `SKILL.md` + seven `references/*.md` +
`plugin.json`. No MCP server, no JS bundle, no build step. Everything the plugin
needs is expressible through Cowork's built-in Bash/Read/Write tools and the
headless-subprocess handoff ([0001](0001-headless-claude-code-for-git.md)).

Three pivots removed the need for MCP: the **source of truth is the repo**, not
the Store (reads go through `gh api` / the local clone); **git is delegated** to
the headless subprocess; and **validation is two-layer**
([0003](0003-two-layer-validation.md)), neither layer needing MCP.

## Consequences

- No build/maintenance surface; the plugin is reviewable as plain text and
  installs with nothing to compile.
- Reversible: when v2 needs Store-side reads, search indexing, or shared
  cross-call state, an MCP server can be added without changing the user dialog.
- Contrast with the sibling `chatrevenue` plugin, which *does* ship an MCP proxy
  because it bridges to the desktop app — a genuinely different need.
