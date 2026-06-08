# chatrevenue-analyze-chat — design

**Status:** draft, pending review
**Date:** 2026-06-08
**Author flow:** brainstormed via Cowork (`superpowers:brainstorming`)
**Target:** a new skill inside the existing `chatrevenue-skill-author` Cowork plugin
**Depends on:** `project-a-skills` (a vendored copy of the `langgraph_cli` trace tool + a provided `.env`)

---

## 1. Summary

`chatrevenue-analyze-chat` is a second skill in the `chatrevenue-skill-author`
Cowork plugin. It lets a ChatRevenue skill author point at a real agent
conversation (a LangSmith trace / LangGraph thread), have Cowork **fetch the dump**
using a vendored copy of the agent team's `langgraph_cli` tool, and then **answer
the author's questions by analyzing that dump** in chat — "did the `pptx` skill
trigger here?", "where did the agent go wrong?", "what tool calls happened?".

It closes the authoring loop: an author looks at how the agent actually behaved on
a real chat, then uses the sibling `chatrevenue-skill-author` skill to create or
fix a skill in response. The author never installs the agent repo, never learns
LangSmith, and never runs the CLI by hand — the skill drives it.

## 2. Context

The agent team already has a CLI for this — `langgraph_cli` (entry point
`langgraph-tool`), living in the `project-a-common` submodule of `nextcrm-agents`
at `tools/langgraph_cli/`. Its working commands pull traces from **LangSmith** by
API key (`trace get`, `trace get-by-thread`, `trace list`) and thread history from
the LangGraph deployment (`thread get-history`). The agent's
`copilot-instructions.md` documents the workflow: dump a trace to a file with
`-o`, then analyze the LangSmith `Run`-shaped JSON.

Authors, however, have only the `project-a-skills` repo + the `chatrevenue-skill-author`
plugin. They do not have `nextcrm-agents` or the `project-a-common` submodule, so
the tool and its credentials are out of reach. This design brings the capability
into the authors' environment.

## 3. Persona and scope

Same persona as `chatrevenue-skill-author`: internal ChatRevenue staff
(PM / sales / support) who author agent skills. They are non-technical, use Cowork,
and now also want to inspect real agent conversations to inform what they author.

In scope (v1):
- Fetch a trace/thread dump by id, or browse recent traces and pick one.
- Analyze the dump conversationally — triggering, tool calls, failure points,
  suggestions for skill changes.
- Hand findings to `chatrevenue-skill-author` to act on.

Out of scope (v1): see §9.

## 4. Decision — vendored tool, second skill (recorded here, chosen in brainstorming)

Two settled choices drive the rest of the design:

- **The skill lives in the existing `chatrevenue-skill-author` plugin**, as a
  second skill, not a new plugin. The authors already have that plugin; the
  audience and the `project-a-skills` dependency are identical; no extra install.
- **The `langgraph_cli` tool is vendored into `project-a-skills`** (a copy under
  `tools/langgraph_cli/`), not pulled via the common submodule and not published
  to a feed. The tool is small and changes rarely; the author environment already
  centralizes on `project-a-skills` (the provided `.env` goes there too). The copy
  is a **mirror** of the canonical `project-a-common` source — same "mirror, never
  fork" posture as the validator (`nextcrm-agents` ADR 0009) — governed by an
  explicit sync rule (§8).

The publish-to-Azure-feed alternative (matching `cr-skills-cli`) is the clean
long-term path and can replace vendoring later without changing the skill's UX;
it was deferred to avoid standing up a new publish pipeline now.

## 5. Architecture

```
author (Cowork chat)
  │  "analyze thread <id>" / "show me recent chats where X failed"
  ▼
chatrevenue-analyze-chat (Cowork skill, pure markdown)
  │  light pre-flight (uv, vendored tool, .env, repo_root)
  │  uv run langgraph-tool trace get-by-thread <id> -o trace_dumps/<id>.txt
  ▼
project-a-skills/tools/langgraph_cli/   (vendored mirror; reads .env there)
  │  → LangSmith API (LANGSMITH_API_KEY)
  ▼
project-a-skills/trace_dumps/<id>.txt   (LangSmith Run JSON; gitignored)
  │  Cowork reads + reasons over the dump
  ▼
answers to the author's questions  ──▶ (optional) chatrevenue-skill-author to fix a skill
```

Pure markdown skill — no MCP server, no bundle (consistent with the rest of the
plugin). The only executable is the vendored Python CLI, run via `uv`.

### 5.1 Layout

```
# in chatrevenue-marketplace (the plugin)
plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/
  SKILL.md
  references/
    preflight-checklist.md      uv / vendored-tool / .env / repo_root checks
    trace-tool-commands.md       the read-only command allowlist + invocation forms
    dump-schema.md               LangSmith Run JSON shape, for analysis
    analysis-playbook.md         common author questions → how to answer from a dump

# in project-a-skills (vendored tool + creds + output)
tools/langgraph_cli/             mirror of project-a-common/tools/langgraph_cli
  langgraph_cli/, pyproject.toml, uv.lock, README.md, .env.example
  .env                           provided by the team; gitignored
trace_dumps/                     dump output; gitignored
```

## 6. Credentials

The team hands authors a ready `.env` file; the author drops it at
`project-a-skills/tools/langgraph_cli/.env` (the location the tool already loads
via `python-dotenv`, matching its `.env.example`). It carries `LANGSMITH_API_KEY`
(and the other LangSmith keys the tool reads). The file is gitignored; the skill
never prints the key into chat. Thread-level commands additionally need deployment
access (`LANGGRAPH_API_URL` / bearer) — only required if `thread get-history` is
used; trace commands work with the LangSmith key alone.

## 7. The skill workflow

1. **Understand the request** — which conversation, and what the author wants to
   learn. Accept a thread id, a trace id, or "I don't have an id".
2. **Pre-flight (light)** — verify `uv` is installed; the vendored tool exists at
   `<repo_root>/tools/langgraph_cli/`; `.env` is present there (if not, ask the
   author to drop the provided env file in — recoverable, do not escalate);
   `repo_root` is known (reuse the `chatrevenue-skill-author` config; do not
   re-ask). Run silently; surface only blockers.
3. **Locate the chat** —
   - thread id → `uv run langgraph-tool trace get-by-thread <id> --verbose -o trace_dumps/<id>.txt`
   - trace id → `uv run langgraph-tool trace get <id> -o trace_dumps/<id>.txt`
   - no id → `uv run langgraph-tool trace list --limit <n> [--project <p>]`, show
     the author a short list, let them pick, then fetch.
   All runs happen with cwd = `<repo_root>/tools/langgraph_cli/` so the `.env`
   loads.
4. **Analyze** — read the dumped LangSmith `Run` JSON (`run_type` ∈
   tool/chain/llm, `inputs`/`outputs`, `child_runs`, `error`, `extra`) and answer
   the author's questions: did a given skill load/trigger, what tools were called
   and with what args, where the run errored, what in a skill's
   description/body would change the outcome.
5. **Bridge to authoring** — when the analysis implies a skill change, hand off to
   the sibling `chatrevenue-skill-author` skill (create/update/remove), closing
   the loop.

## 8. Sync rule (vendored mirror)

The vendored `tools/langgraph_cli/` is a mirror of `project-a-common`'s tool, not
an independent fork. When the canonical tool changes, the copy is re-synced; the
mirror is never edited locally to add behavior. This is recorded in
`project-a-skills/CLAUDE.md` (a short "vendored mirror — sync from
project-a-common, do not edit locally" note) and as an ADR in
`project-a-skills/docs/architecture/decisions/`. Drift is a sync task, mirroring
the validator posture (`nextcrm-agents` ADR 0009).

## 9. Non-goals (v1)

- **Mutating commands.** The skill uses a **read-only allowlist** — `trace get`,
  `trace get-by-thread`, `trace list`, optionally `thread get-history`. No
  `assistant update`, no `thread update-state`, and none of the WIP / auth-flaky
  assistant-management commands.
- **A new analysis engine or MCP server.** Reuse the vendored CLI + Cowork's own
  reasoning over the dump.
- **Automatic mirror sync.** Sync is manual, per §8.
- **Publishing the tool to the Azure feed.** Deferred (see §4); a later, UX-neutral
  swap.
- **Storing/committing dumps.** Dumps stay in gitignored `trace_dumps/`.

## 10. Constraints

- **Secrets:** `.env` gitignored; the LangSmith key is never echoed to chat.
- **Privacy:** trace dumps may contain customer data — kept in gitignored
  `trace_dumps/`, never committed, and not pasted into chat beyond what answering
  the author's question requires.
- **Language:** the analysis dialog follows the author's language (like
  `chatrevenue-skill-author`); any skill artifact that results is authored
  English-only through the author skill.
- **Python:** the tool needs Python 3.13; `uv run` provisions it. `project-a-skills`
  itself stays 3.11+ — the tool runs in its own `uv` environment, not the repo's.
- **Pure markdown skill:** no MCP, no JS bundle; the only executable is the
  vendored CLI.

## 11. Open questions for implementation

- Exact skill `name`/description trigger phrasing (first cut; refine via eval).
- Whether `thread get-history` (needs deployment bearer) is included in v1 or
  trace-only is enough for authors.
- Default `trace list --limit` and whether a `--project` default is baked in.
- Whether pre-flight reuses `chatrevenue-skill-author`'s `config.json` verbatim or
  keeps its own `repo_root` key in the same file.
- `.gitignore` edits in `project-a-skills` for `tools/langgraph_cli/.env` and
  `trace_dumps/` (confirm not already covered).

## 12. References

- `nextcrm-agents/.github/copilot-instructions.md` — the LangGraph CLI tool +
  trace-dump workflow + LangSmith `Run` schema pointer.
- `nextcrm-agents/nextcrm_assistant/_common/tools/langgraph_cli/` — the canonical
  tool (README, `.env.example`, `cli.py`).
- `chatrevenue-marketplace/design_docs/2026-05-27-chatrevenue-skill-author-design.md`
  — the sibling skill this one extends and hands off to.
- `nextcrm-agents/design_docs/architecture/decisions/0009-skill-contracts-owned-by-agent.md`
  — the "mirror, never fork" posture this vendoring follows.
