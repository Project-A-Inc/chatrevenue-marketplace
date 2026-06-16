# Hide the plumbing — non-technical error handling (delivery spec)

- **Slug:** `hide-the-plumbing-error-handling`
- **Date:** 2026-06-16
- **Owner (spec):** Cowork
- **Target repos:** `chatrevenue-marketplace` (single repo — the Cowork plugin source)

## Problem

A user report came in against the `chatrevenue-skill-author` plugin (used by
non-technical ChatRevenue authors — PM, sales, support). When the chat-analysis
flow hit environment hiccups, the agent dumped the full technical autopsy into
the dialog instead of either working around the issue silently or stating a
plain-language blocker. Reported examples:

- A wall describing `langgraph-tool` needing Python ≥3.13 vs. sandbox 3.10, `uv`
  failing to fetch the runtime (proxy 403), and the team env file named `env.txt`
  with a multiline PEM key breaking `--env-file` parsing.
- Similar sandbox/Python/trace-tool diagnostics surfaced verbatim to the author.

These authors are non-technical; the plumbing is noise to them and erodes trust.

## Desired behavior

A single plugin-wide principle governs every problem the agent hits:

1. **Try safe workarounds silently first.** If the fix is read-only, reversible,
   touches nothing the author owns, and changes no data or state, just do it and
   move on — without narrating it. (e.g. env file named `env.txt` → point the
   tool at the file that's actually there; first-run dependency sync → run/retry.)
2. **Surface only real blockers, in plain language.** Raise a problem only when
   it genuinely stops the agent *and* no safe workaround exists. Say what it
   means for the author and the next step — never tool names, version numbers,
   proxy/HTTP status codes, exit codes, stack traces, or file-format details.

**Silent ≠ pretending it worked.** Never invent or guess an answer to hide a
failure, and never silently do anything that changes state or touches the
author's data.

## Current state (why the report happened)

The content above is **already drafted in the working tree but not committed and
not deployed**:

- `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md`
  has the section **"Talking to the author — hide the plumbing"** (the two rules
  + a ❌/✅ example pair, including the exact Python/proxy/PEM antipattern from the
  report).
- `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`
  has **"Hide the plumbing (plugin-wide principle)"** with the same two rules.

The installed/deployed plugin still carries the old versions (analyze-chat says
only "surface only blockers"; the author skill has no hide-the-plumbing section),
which is why the running agent produced the technical dump. The fix is to ship
what is already drafted, not to re-author it.

## Scope for `chatrevenue-marketplace`

- Finalize and commit the already-drafted hide-the-plumbing edits in both
  SKILL.md files (and any consistent reference-file wording that supports them).
- Bump the `chatrevenue-skill-author` plugin version (currently `0.3.1`) so the
  redeploy is picked up.
- Redeploy / republish the plugin so the running version carries the change.

Out of scope: any change to the `chatrevenue` agent plugin, and any change to
the trace tool itself or the sandbox runtime.

## Acceptance criteria

- Both SKILL.md files in the committed tree contain the hide-the-plumbing
  principle (the two rules + "silent ≠ pretending it worked").
- The deployed/installed plugin version reflects the new content (the
  hide-the-plumbing text is present in the published plugin, not just the repo).
- Plugin version bumped from `0.3.1`.
- A re-run of the chat-analysis flow against an unreachable environment yields a
  short plain-language blocker (or a silent safe workaround), not a technical
  autopsy.
