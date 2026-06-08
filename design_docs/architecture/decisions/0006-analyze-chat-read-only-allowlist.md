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

The skill is constrained to a **read-only allowlist**: `trace get`,
`trace get-by-thread`, `trace list`, and optionally `thread get-history`. All
mutating and assistant-management commands are explicitly **forbidden** and
enumerated as such in `references/trace-tool-commands.md`. If a request seems to
need a mutating command, the skill declines and says it's out of scope rather
than running it.

## Consequences

- Analysis cannot change agent state — the blast radius of the bundled credential
  is bounded to reads, which matches the skill's purpose (diagnose, then hand off
  to `chatrevenue-skill-author` to make changes through the reviewed PR flow).
- The allowlist is documented in one place; adding a command is a deliberate edit,
  not an accident.
- Cost: genuinely useful read-only additions (e.g. a future trace-diff command)
  must be added to the allowlist explicitly before the skill may use them.
