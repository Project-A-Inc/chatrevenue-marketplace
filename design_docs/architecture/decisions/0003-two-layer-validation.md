# 0003 — Two-layer validation: Cowork-side LLM pre-filter + authoritative `cr-skills`

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `engineering_plans/documented/2026-05-27-chatrevenue-skill-author-plugin.md` + `design_docs/2026-05-27-chatrevenue-skill-author-design.md` §10

## Context

A draft skill must satisfy the agent-owned validation rules before it can deploy.
The plugin could either (a) trust the authoritative validator only (runs late,
inside the repo-side `place_draft.py`) and let the user discover problems after
the whole ship pipeline, or (b) re-implement the rules Cowork-side and risk
drifting from the real validator.

## Decision

Run **both layers, with a clear authority order**:

- **Layer A — Cowork-side LLM pre-filter** (`references/validation-rules.md`): a
  checklist the SKILL.md walks against the in-progress draft to catch obvious
  problems early, in dialog, before stashing — name regex, description length,
  size limits, content safety, worker frontmatter (positive-int intervals, no
  `schedule:`), English-only.
- **Layer B — authoritative** (`cr-skills validate`, run inside
  `project-a-skills`' `place_draft.py`): the same code CI runs.

**Layer B wins.** `validation-rules.md` states explicitly: if the layers diverge,
`cr-skills` is authoritative and the drift should be flagged to `project-a-skills`.

## Consequences

- The user gets fast, in-dialog feedback without waiting for the ship pipeline,
  while correctness is still guaranteed by the real validator.
- Expected, accepted drift between layers over time; Layer A is best-effort UX,
  not a second source of truth. Ties into `nextcrm-agents` ADR 0009 (the agent
  owns the rules; everything downstream mirrors).
- Cost: two places describe rules; the divergence note keeps it honest.
