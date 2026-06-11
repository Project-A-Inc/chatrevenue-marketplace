# chatrevenue-skill-author plugin

## Responsibility

Let non-technical ChatRevenue staff (PM, sales, support) create, update, remove,
or browse ChatRevenue agent skills — including **workers** (skills that run on
their own) and **dashboard widgets** (a worker plus a dashboard surface) —
through a plain-language Cowork dialog that ends with a clickable review link,
**without ever seeing git, branches, pull requests, or the Claude Code CLI**. It owns the user-facing dialog, the local draft, the Cowork-side
pre-validation, and the handoff that spawns a headless Claude Code subprocess. It
does **not** own the git/PR mechanics (delegated to `project-a-skills`'
`scripts/agent_helpers/` via the headless subprocess — see
`project-a-skills/docs/architecture/references/agent-automation.md`), the
authoritative validation rules (owned by the agent — see
`nextcrm-agents` ADR 0009), or worker **enrolment** (the agent/UI, downstream of
merge).

The plugin ships **two skills**: `chatrevenue-skill-author` (the authoring flow,
documented in the bulk of this reference) and `chatrevenue-analyze-chat` (a
read-only skill for inspecting real agent conversations to decide what to author
— see [§ Analyze-chat skill](#analyze-chat-skill-second-skill)).

## Structure

```
plugins/chatrevenue-skill-author/
  .claude-plugin/plugin.json
  README.md
  skills/chatrevenue-skill-author/
    SKILL.md                       orchestration body (7-step workflow)
    references/
      preflight-checklist.md       10 ordered environment/repo checks
      validation-rules.md          Cowork-side LLM pre-filter (incl. worker frontmatter)
      branch-naming.md             what the helper produces; what to say instead
      escalation-template.md       verbatim tech-problem block + category codes
      handoff-prompt.md            the prompt body passed to `claude --headless`
      handoff-manifest.md          draft.json schema (v2; worker object + widget.json reference rule)
      widget-archetypes.md         the 3 dashboard-widget archetypes + field prompts (Step 3 widget branch)
      user-dialog-phrases.md       UX vocabulary (never/instead, EN + RU) + worker phrases
```

Pure markdown — no MCP server, no JS bundle, no build step
([decisions/0002](../decisions/0002-pure-markdown-no-mcp-server.md)).

## Contracts

**The workflow (SKILL.md).** Gather intent → light Cowork-side settle (`repo_root`
only) → collect the skill (including whether it *runs on its own*) → Cowork-side
validate → stash the draft → **hand the user a paste-able Claude Code prompt** →
present the review link the user brings back.

**`draft.json` (v2)** — the sidecar the Cowork side writes and the user's Claude
Code reads as the source of truth. Carries `type`/`scope`/`org_id`/`name`,
`repo_root`, `pr_title`/`pr_body`, `source.{plugin,version,session_id}`, and an
**optional `worker` object** (`executable: true` + optional positive-int
`interval_online_min`/`interval_offline_min`). Absent `worker` ⇒ a plain skill.

**Dashboard widgets.** A widget is a worker **with a dashboard surface**. The
author never hand-writes a layout: they pick one of three **archetypes** —
*Counters + list*, *Single KPI*, *Ranked cards* (`references/widget-archetypes.md`)
— and name a few fields in plain language; the plugin fills the chosen skeleton.
The result is a normal `create` draft that additionally sets `widget: true` in
`SKILL.md` and carries a `references/widget.json = { id, schema, layout }`, where
`layout` is the frontend-published DSL (`stat/text/badge/list/row/group/link`) and
`schema` is auto-generated from the named fields. It **reuses the worker block** (a
widget is a worker that refreshes itself). The approach is **valid by
construction**: the skeleton is valid DSL and the plugin writes the same field
names into both `schema` and `layout`, so binding can't drift; the authoritative
gate stays `cr-skills validate` (repo side, in `place_draft`). The repo side needs
no change — `place_draft` already copytrees `.json` references and the validator
already checks the layout (P2). The generated body gathers the data and persists
it, and **if the data source is unavailable it ends as an error** (never a silent
no-data success) so the dashboard can show an error state. See
[decisions/0008](../decisions/0008-archetype-driven-widget-authoring.md); the
widget feature itself (store-defined widgets + the published DSL) lives in
`nextcrm-agents` (ADRs 0010/0011 there).

**Hybrid handoff (Variant 1).** The plugin does **not** spawn anything and does
**not** run git/`gh` — on Cowork-on-Windows its shell is a Linux sandbox that
can't git the Windows mount or reach native Claude Code. Instead it fills the
`handoff-prompt.md` placeholders (the stash `draft.json` path + `repo_root`) and
hands the user a copy-paste block to run **in their own Claude Code**, which reads
`project-a-skills/docs/AGENT_GUIDE.md` (requires `agent_guide_version: 1`) and
runs the four helpers `preflight → new_branch → place_draft → open_pr`, producing
the `pr_url`. The user pastes the link back. See
[decisions/0007](../decisions/0007-git-via-user-claude-code-handoff.md).

**Cross-repo dependency.** The plugin is the authoring half of a two-repo feature:
it depends on `project-a-skills` shipping `docs/AGENT_GUIDE.md` v1 + the four
`scripts/agent_helpers/*.py` (the repo-side half, documented in that repo's
`architecture/references/agent-automation.md`). The real environment checks
(`gh`/`git`/`uv`/push/clean-tree/guide version) run in `preflight.py` on the
user's Claude Code side, not in Cowork.

## Lifecycle / flow

```
user (Cowork chat)                              user's native Claude Code
  │  dialog; worker intent detected/asked        (cwd = project-a-skills clone)
  ▼                                                       ▲  paste the handoff
SKILL.md ─ settle repo_root ─ collect ─ Cowork validate ─ stash draft.json
  │                                                       │
  └──────────────── hands a paste-able prompt ───────────┘
                                                          ▼
                              preflight → new_branch → place_draft → open_pr
                                                          │  pr_url
  user pastes link back ◀─────────────────────────────────┘
  │
  ▼  user clicks "Merge" → CI deploys to the Store
```

Validation is **two-layer**: a Cowork-side LLM pre-filter for fast feedback, and
the authoritative `cr-skills validate` run inside `place_draft.py` (on the Claude
Code side) ([decisions/0003](../decisions/0003-two-layer-validation.md)).

## Analyze-chat skill (second skill)

`chatrevenue-analyze-chat` lets an author point at a real ChatRevenue agent
conversation, have Cowork fetch its trace dump, and answer questions about it —
"did the `<name>` skill trigger?", "where did the agent go wrong?" — to inform
what skill to author. It closes the loop back to `chatrevenue-skill-author`.

```
plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/
  SKILL.md
  references/
    preflight-checklist.md   uv / vendored-tool / .env / repo_root checks
    trace-tool-commands.md   read-only command allowlist + invocation forms
    dump-schema.md           LangSmith Run JSON shape, for analysis
    analysis-playbook.md     common author questions → how to answer from a dump
```

- **Fetch.** It drives the **vendored `langgraph_cli` trace tool** in
  `project-a-skills` (`uv run --env-file <repo_root>/.env langgraph-tool trace
  get-by-thread|get|list …`, cwd = `<repo_root>/tools/langgraph_cli/` so `uv`
  resolves the tool's env), dumping to a gitignored `trace_dumps/`. The tool is
  documented as a vendored mirror in `project-a-skills/docs/architecture/`
  (ADR 0006).
- **Analyze.** Cowork reads the LangSmith `Run` JSON and reasons over it — no MCP,
  no new engine (follows [decisions/0002](../decisions/0002-pure-markdown-no-mcp-server.md)).
- **Read-only.** A strict command allowlist; never `assistant update*` /
  `thread update-state` ([decisions/0006](../decisions/0006-analyze-chat-read-only-allowlist.md)).
- **Same plugin, not a new one** — same audience and `project-a-skills`
  dependency ([decisions/0005](../decisions/0005-analyze-chat-second-skill-same-plugin.md)).
- **Credentials/privacy.** The team-provided `.env` (LangSmith key) lives at the
  `project-a-skills` **repo root** and is injected via `uv run --env-file` (the
  tool's own dotenv only reads `tools/langgraph_cli/`, not the root); the root
  `.env` is gitignored, the key is never echoed, and dumps (possible customer
  data) stay in gitignored `trace_dumps/`.
- Design spec: `design_docs/2026-06-08-chatrevenue-analyze-chat-design.md`.

## Constraints & decisions

- **Hidden vocabulary.** The plugin never says branch / commit / push / PR /
  merge / git / gh / Claude Code / MCP to the user — nor, for workers,
  worker / executable / cron / interval / enroll — nor, for widgets,
  widget.json / schema / layout / DSL / save_widget_data. It speaks of "a separate
  copy", "sending for review", "runs on its own", "how often while you're at your
  desk / away", and (for widgets) "a dashboard card", "counters", "a list", "card
  fields". Table in `user-dialog-phrases.md` (EN + RU).
- **Authored skill content is English-only**, regardless of dialog language — an
  invariant inherited from `project-a-skills/CONTRIBUTING.md`.
- **Worker scope boundary.** The plugin only authors the *definition* that makes a
  worker possible (`executable: true` + cadence frontmatter, never `schedule:`).
  Turning a worker on for a user (enrolment, the dispatcher) is the agent's job,
  downstream of merge — see `nextcrm-agents` ADR 0003 (worker = executable skill)
  and ADR 0009 (agent owns the contracts).
- **Widget authoring is archetype-driven**, not free-form: the author picks one of
  three fixed archetypes and the plugin fills a valid-by-construction skeleton — no
  LLM-built DSL ([0008](../decisions/0008-archetype-driven-widget-authoring.md)).
- Decisions:
  [0001](../decisions/0001-headless-claude-code-for-git.md) (headless subprocess
  owns git), [0002](../decisions/0002-pure-markdown-no-mcp-server.md) (no MCP in
  v1), [0003](../decisions/0003-two-layer-validation.md) (two-layer validation),
  [0004](../decisions/0004-single-skill-not-split.md) (one skill, not split),
  [0008](../decisions/0008-archetype-driven-widget-authoring.md) (archetype-driven
  widget authoring).
- Design specs: `design_docs/2026-05-27-chatrevenue-skill-author-design.md`
  (worker support in §1.1); `design_docs/2026-06-11-skill-author-widget-creation-design.md`
  (dashboard widget authoring).
