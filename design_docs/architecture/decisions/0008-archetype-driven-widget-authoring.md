# 0008 — Authors create dashboard widgets from a fixed archetype library, not free-form layout

- **Status:** accepted
- **Date:** 2026-06-11
- **Source:** `design_docs/2026-06-11-skill-author-widget-creation-design.md`; builds on the widget feature in `nextcrm-agents` (store-defined widgets + the FE-published layout DSL, ADRs 0010/0011 there).

## Context

A **widget** is a store-defined skill: an `executable` skill carrying
`widget: true` and a `references/widget.json = { id, schema, layout }`, where
`layout` is the frontend-published DSL (`stat/text/badge/list/row/group/link`).
The repo-side plumbing to *ship* one already existed before this work —
`place_draft` copytrees any reference including `widget.json`, and
`cr-skills validate` validates the layout against the vendored published v1
grammar plus binding coverage. The gap was purely **authoring**: the
`chatrevenue-skill-author` plugin could author skills and workers but had no
widget concept, and the audience is non-technical staff who cannot hand-write a
DSL layout or a JSON Schema.

Letting the dialog free-build a layout would mean an LLM emitting arbitrary DSL —
easy to get subtly wrong (an unbound `{{field}}`, a node type outside the
grammar), and only caught late at the repo-side validate. It also conflicts with
the plugin's invariant of never exposing "DSL", "schema", "layout" to the author.

## Decision

Authors create a widget by **picking one of three fixed archetypes** and naming a
few fields in plain language; the plugin fills the archetype skeleton. The
archetypes (in `references/widget-archetypes.md`) are **Counters + list**,
**Single KPI**, and **Ranked cards**.

The approach is **valid by construction**:

1. Each archetype skeleton is hand-authored valid DSL within the published v1
   vocabulary — the author never builds layout from scratch.
2. The plugin writes the **same field names** into both the generated JSON Schema
   and the layout bindings, so binding coverage cannot drift.
3. Types are inferred from the field's plain-language role (count → integer ≥ 0,
   time → `string`/`date-time`, amount → number, a fixed set → enum, else string),
   and the schema is `additionalProperties: false`.

A widget **is a worker** — it reuses the existing worker dialog and the
`draft.json` `worker` block (`executable` + optional cadence); authoring a widget
additionally sets `widget: true` in `SKILL.md` and adds `references/widget.json`.
The body is an imperative gather body in the `inbox-attention` mould that ends by
persisting the payload; **if the data source is unavailable it must surface as an
error**, not finish quietly, so the dashboard can show an error state.

The authoritative validation gate is unchanged — `cr-skills validate` inside
`place_draft` on the Claude Code side. The plugin's Step-4 UX checklist gains a
widget bullet; there is **no Cowork-side schema fetch**.

## Consequences

- Predictable, safe widget authoring for non-technical staff with no new engine
  and no jargon leak — archetypes are described as "a few counters that open into
  a list", "one big number", "a ranked list of cards".
- **No `project-a-skills` code change** — the repo side already accepted `.json`
  references and validated layouts (P2). Only doc/contract notes changed there.
- The archetype library is **pinned to the DSL v1 grammar**; a future published v2
  is a re-sync task on `references/widget-archetypes.md`, mirroring the
  mirror-never-fork posture of the DSL itself.
- **Deferred:** a table archetype, pagination / "show more", list filters,
  live in-dialog preview, and free-form layout beyond archetypes — added only if
  the three archetypes prove too limiting.
- Per-widget state layouts (not-initialized / loading / error / empty) are **not**
  authored here; they are generic FE renderer states in v1, driven by the umbrella
  run-state. Archetypes author only the compact/expanded data layout.
