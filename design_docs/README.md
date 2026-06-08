# design_docs — specs, architecture, and the documentation stage

This folder holds the design specs for work in this repo, the living architecture
description, and the decision log. It is the planning hub for ChatRevenue's Cowork
plugins — including features (like `chatrevenue-skill-author`) whose code partly
lives in other repos (`project-a-skills`).

## Layout

- `*-design.md` — design specs (the "why" for a piece of work, authored before
  implementation).
- `architecture/` — the living, skill-shaped description of how the system is
  built **today**: a concise [`architecture/architecture.md`](architecture/architecture.md)
  (overview + core building blocks + a manifest of references) plus per-subsystem
  docs under `architecture/references/`. Present state, not history.
- `architecture/decisions/` — the append-only ADR log: why the non-obvious,
  **implemented** choices were made. Reversing a choice adds a new ADR and marks
  the old one superseded; nothing is rewritten away.

## Documentation is a development stage

Work is finished when the architecture reflects it and the decisions behind it
are recorded — not when the code merges.

```
brainstorm
  -> design_docs/<topic>-design.md                       (spec)
  -> engineering_plans/drafts -> ongoing -> done         (implementation)
  -> (at work-acceptance) architecture/ + decisions/ updated + plan -> engineering_plans/documented/
```

- `engineering_plans/done/` — shipped.
- `engineering_plans/documented/` — shipped **and** folded into `architecture/` +
  `decisions/`.

### The acceptance pass

When completed work is handed back, run the documentation pass (the
**accept-and-document** skill): read each plan in `done/` not yet in
`documented/` (plus its paired spec), fold the net architectural delta into
`architecture.md` and/or the relevant `architecture/references/<subsystem>.md`,
record the decisions it implemented as ADRs under `architecture/decisions/`,
update the manifest, then advance the plan `done/ -> documented/`. The pass is
per-subsystem, idempotent, and safe to run in batches.

Prose is authored in Cowork; the git move and commit are done by whoever owns
version control (Claude Code). When a feature's code spans repos, document each
repo's half in that repo's `architecture/` and cross-link.
