# chatrevenue-skill-author plugin

## Responsibility

Let non-technical ChatRevenue staff (PM, sales, support) create, update, remove,
or browse ChatRevenue agent skills — including **workers** (skills that run on
their own) — through a plain-language Cowork dialog that ends with a clickable
review link, **without ever seeing git, branches, pull requests, or the Claude
Code CLI**. It owns the user-facing dialog, the local draft, the Cowork-side
pre-validation, and the handoff that spawns a headless Claude Code subprocess. It
does **not** own the git/PR mechanics (delegated to `project-a-skills`'
`scripts/agent_helpers/` via the headless subprocess — see
`project-a-skills/docs/architecture/references/agent-automation.md`), the
authoritative validation rules (owned by the agent — see
`nextcrm-agents` ADR 0009), or worker **enrolment** (the agent/UI, downstream of
merge).

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
      handoff-manifest.md          draft.json schema (v2, with the worker object)
      user-dialog-phrases.md       UX vocabulary (never/instead, EN + RU) + worker phrases
```

Pure markdown — no MCP server, no JS bundle, no build step
([decisions/0002](../decisions/0002-pure-markdown-no-mcp-server.md)).

## Contracts

**The 7-step workflow (SKILL.md).** Gather intent → pre-flight → collect the
skill (including whether it *runs on its own*) → Cowork-side validate → stash the
draft → spawn the headless ship pipeline → hand the user the review link.

**`draft.json` (v2)** — the sidecar the Cowork side writes and the headless
subprocess reads as the source of truth. Carries `type`/`scope`/`org_id`/`name`,
`repo_root`, `pr_title`/`pr_body`, `source.{plugin,version,session_id}`, and an
**optional `worker` object** (`executable: true` + optional positive-int
`interval_online_min`/`interval_offline_min`). Absent `worker` ⇒ a plain skill.

**Headless handoff.** The plugin spawns `claude --headless --cwd <repo_root>
--prompt-file handoff-prompt.md --env DRAFT_MANIFEST=<draft.json>`. The spawned
agent reads `project-a-skills/docs/AGENT_GUIDE.md` (it requires
`agent_guide_version: 1`) and runs the four helpers
`preflight → new_branch → place_draft → open_pr`, returning `pr_url=<url>` on its
last stdout line — which the plugin shows to the user.

**Cross-repo dependency.** The plugin is the authoring half of a two-repo feature:
it depends on `project-a-skills` shipping `docs/AGENT_GUIDE.md` v1 + the four
`scripts/agent_helpers/*.py` (the repo-side half, documented in that repo's
`architecture/references/agent-automation.md`). Pre-flight check 10 enforces the
guide version; a higher version escalates "the plugin needs to be updated".

## Lifecycle / flow

```
user (Cowork chat)
  │  plain-language dialog; worker intent detected or asked ("runs on its own?")
  ▼
SKILL.md  ── pre-flight ──▶ collect ──▶ Cowork-side validate ──▶ stash draft.json
                                                                      │ spawn
                                                                      ▼
                                              claude --headless (cwd = project-a-skills clone)
                                                  preflight → new_branch → place_draft → open_pr
                                                                      │  pr_url=<url>
                                                                      ▼
                                              user clicks "Merge" → CI deploys to the Store
```

Validation is **two-layer**: a Cowork-side LLM pre-filter for fast feedback, and
the authoritative `cr-skills validate` run inside `place_draft.py`
([decisions/0003](../decisions/0003-two-layer-validation.md)).

## Constraints & decisions

- **Hidden vocabulary.** The plugin never says branch / commit / push / PR /
  merge / git / gh / Claude Code / MCP to the user — nor, for workers,
  worker / executable / cron / interval / enroll. It speaks of "a separate copy",
  "sending for review", "runs on its own", "how often while you're at your desk /
  away". Table in `user-dialog-phrases.md` (EN + RU).
- **Authored skill content is English-only**, regardless of dialog language — an
  invariant inherited from `project-a-skills/CONTRIBUTING.md`.
- **Worker scope boundary.** The plugin only authors the *definition* that makes a
  worker possible (`executable: true` + cadence frontmatter, never `schedule:`).
  Turning a worker on for a user (enrolment, the dispatcher) is the agent's job,
  downstream of merge — see `nextcrm-agents` ADR 0003 (worker = executable skill)
  and ADR 0009 (agent owns the contracts).
- Decisions:
  [0001](../decisions/0001-headless-claude-code-for-git.md) (headless subprocess
  owns git), [0002](../decisions/0002-pure-markdown-no-mcp-server.md) (no MCP in
  v1), [0003](../decisions/0003-two-layer-validation.md) (two-layer validation),
  [0004](../decisions/0004-single-skill-not-split.md) (one skill, not split).
- Design spec: `design_docs/2026-05-27-chatrevenue-skill-author-design.md`
  (worker support in §1.1).
