# 0006 — analyze-chat uses a read-only trace-tool command allowlist

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `design_docs/2026-06-08-chatrevenue-analyze-chat-design.md` §7, §9

## Context

`chatrevenue-analyze-chat` drives the vendored `langgraph_cli` tool. That tool
can do more than read: it also has `assistant update*`, `assistant create/clone`,
and `thread update-state` commands (some WIP / auth-flaky). The skill runs on a
non-technical author's machine with a real LangSmith/deployment credential in
scope. Letting the skill reach any tool command risks an author (or a
misinterpreted request) mutating a live assistant or thread.

## Decision

The skill is constrained to a **read-only allowlist**, enumerated in
`references/trace-tool-commands.md`. If a request seems to need a mutating
command, the skill declines and says it's out of scope rather than running it.

> **Update (2026-06-16, `analyze-chat-self-contained`):** the skill now drives the
> stdlib `trace_tools` (`trace_fetch.py` + `trace_digest.py`) from `<repo_root>`
> instead of the vendored `langgraph_cli`. The allowlist is the new read-only
> invocations: `trace_fetch.py get-by-thread|get|list` (fetch) and
> `trace_digest.py` (local JSON→Markdown digest). The optional `thread
> get-history` entry is dropped. The new tool has **no** mutating or
> assistant-management commands at all, so the read-only guarantee is now true by
> construction as well as by allowlist. The detailed source of truth is
> `project-a-skills/tools/trace_tools/README.md`.

## Consequences

- Analysis cannot change agent state — the blast radius of the bundled credential
  is bounded to reads, which matches the skill's purpose (diagnose, then hand off
  to `chatrevenue-skill-author` to make changes through the reviewed PR flow).
- The allowlist is documented in one place; adding a command is a deliberate edit,
  not an accident.
- Cost: genuinely useful read-only additions (e.g. a future trace-diff command)
  must be added to the allowlist explicitly before the skill may use them.
