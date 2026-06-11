# Skill-author: authoring Widgets — Design

> Version 0.1 · Documented · Owner: Sasha · 2026-06-11
> Accepted & folded into `architecture/` on 2026-06-11 ([ADR 0008](architecture/decisions/0008-archetype-driven-widget-authoring.md)). Shipped as plugin content in PR #9 — content-only, no paired engineering plan, so nothing advances through `engineering_plans/`.
> Repo: `chatrevenue-marketplace` (the `chatrevenue-skill-author` plugin). Touches `project-a-skills` only at the doc/contract level (no code).
> Related (in `nextcrm-agents`): the widget feature — store-defined widgets + DSL (ADRs 0010/0011), the published layout DSL `…/schemas/widget-layout.v1.json`, the reference widget `inbox-attention`.

## Context

The `chatrevenue-skill-author` plugin walks a non-technical author through a
plain-language dialog to create/update/remove a ChatRevenue agent skill, hiding all
git/PR machinery: it builds a draft `SKILL.md` (+ `references/*.md`), stashes a
`draft.json`, and hands the user a prompt their Claude Code runs (`agent_helpers`:
`place_draft` → `cr-skills validate` → PR). It already handles **workers**
(`executable` + cadence) — but has **no widget concept**.

Meanwhile a **widget is a store-defined skill**: an `executable` skill
(`widget: true`) carrying `references/widget.json = { id, schema, layout }`, where
`layout` is the published, FE-owned DSL. The plumbing to *ship* one already exists:
`place_draft` copytrees any reference (incl. `widget.json`) and `cr-skills validate`
already validates the layout against the vendored published v1. The gap is purely
**authoring**: the plugin can't yet produce a widget.

## Goal

Extend the plugin so an author can create a **dashboard widget** through the same
dialog: pick an archetype, name a few fields, and get a `SKILL.md` (`widget: true`,
an imperative gather body ending in `save_widget_data`) + a `references/widget.json`
(auto-generated `schema` + filled `layout`), shipped via the existing
handoff/validate/PR flow.

## Non-goals

- **Free-form layout generation.** Layout comes from a small archetype library
  (valid-by-construction), not arbitrary LLM-built DSL.
- **Live preview / rendering in chat.** The plugin describes the result in plain
  language; the actual render is the FE's job.
- **Pagination / "show more" / list filters**, a **table** archetype, **per-user
  cadence**, **auto-enabling** auto-refresh, and the **FE renderer** — all out of scope.
- **project-a-skills code changes** — `place_draft` + the validator already support
  `widget.json` (P2); only docs/contract notes change.
- **Widget state layouts** (not-initialized / loading / error / empty). These are
  **generic FE renderer** states in v1 (driven by the umbrella `envelope`/`is_running`/
  `last_run_status`), with an optional per-widget override reserved for later (FE/DSL
  concern — see the P3 spec). Archetypes author only the **data** layout
  (compact/expanded); they do not author state layouts. The one related obligation
  here is the body's source-unavailable→error convention (Body generation, above).

## Decisions

- **D1 — Archetype-driven (3 archetypes).** Counters+list, Single KPI, Ranked cards.
  The author picks one; the plugin fills it. Predictable, and the layout is **valid
  by construction** (the skeleton encodes valid DSL; the plugin sets the same field
  names in both `schema` and `layout`, so binding can't drift).
- **D2 — A widget is a worker + a `widget.json`.** Reuse the existing worker dialog
  + the `draft.json` `worker` block (`executable` + intervals); additionally set
  `widget: true` in `SKILL.md` and add `references/widget.json`.
- **D3 — Schema auto-generated from the named fields.** The author names fields in
  plain language; the plugin infers types (count→integer≥0, time→string+date-time,
  amount→number, a fixed set→enum) and writes both the JSON Schema
  (`additionalProperties:false`) and the archetype's bindings.
- **D4 — List handling.** Archetype-fixed `maxItems` (20), newest-first by default
  (or by rank for Ranked cards); counters reflect the **full total**, the list is the
  truncated view; the list lives in `expanded` only. No pagination in v1.
- **D5 — Body.** An imperative gather body in the `inbox-attention` mould
  (gather-first, never fabricate, read-only, explicit absolute windows, empty-state)
  that ends with `save_widget_data(widget_id=<name>, payload=<matches schema>)`.
- **D6 — Validation.** Valid-by-construction; the authoritative gate is the existing
  `cr-skills validate` in `place_draft` (validates layout vs published v1 + binding
  coverage). The plugin's Step-4 UX checklist gains a widget bullet. No Cowork-side
  schema fetch.
- **D7 — Jargon stays hidden.** Archetypes are described in plain language; the
  author never sees "DSL", "schema", "save_widget_data", "layout".

## The archetype library

Lives in a new plugin reference `references/widget-archetypes.md`. Each archetype =
a layout skeleton (compact + expanded) with `{{field}}` slots + the schema fields it
needs + the plain-language prompts to fill them. All within the v1 vocabulary
(`stat/text/badge/list/row/group/link`).

1. **Counters + list** — *"a few counters that open into a list"* (the
   `inbox-attention` shape).
   - schema: `{ <counter_1>:int≥0, …(1–3), items: array(maxItems 20) of { <fields…>, url? } }`
   - compact: `row` of `stat`s (one per counter, bound to the count fields).
   - expanded: `list for items` → `row` of the named item fields (`text`, optional
     `badge`, optional `link`), `empty` text.
   - prompts: counter label(s); item fields (e.g. title/subtitle/time); link? sort.

2. **Single KPI** — *"one big number with context"*.
   - schema: `{ value:int|number, …optional context fields }`
   - compact: one `stat` (value + label) + optional `text` sub-line.
   - expanded: optional short `list` or `text` detail.
   - prompts: what the number is + its label + optional context line.

3. **Ranked cards** — *"a ranked list of cards"* (the WMN/signals shape).
   - schema: `{ total:int≥0, items: array(maxItems 20) of { title, subtitle?, body?, tag?(enum), url? } }`
   - compact: `stat` (total) + short summary `text`.
   - expanded: `list for items` → `row` direction:vertical [ `badge`(tag),
     strong `text`(title), muted `text`(subtitle), `text`(body), `link` ].
   - prompts: card fields (title/subtitle/body), optional tag values, link? sort.

## The authoring dialog (additions to SKILL.md)

- **Detect widget intent** in Step 2/3 — cues: "dashboard", "widget", "card",
  "counter", "tile/panel", "show me X on my dashboard", or semantic equivalents in
  the user's language. A widget is a worker **with a dashboard surface**.
- When it's a widget, after the normal worker collection (it's `executable`; ask
  cadence as today, omit → defaults), run three plain-language sub-steps:
  1. **Pick an archetype** — present the three by description ("a few counters that
     open into a list" / "one big number" / "a ranked list of cards"); the author picks.
  2. **Name the fields** the archetype needs (counter labels; item/card fields;
     link?; sort newest-vs-importance) in plain language.
  3. The plugin **fills the skeleton** → writes `references/widget.json`
     (`id`=skill name, auto `schema`, filled `layout`) and sets `widget: true` in the
     draft `SKILL.md`, whose body is the generated gather body (D5).
- **Describe the result back** in plain language ("a card with two counters
  'Internal' and 'External' that opens into a list of emails — newest first").
- Keep the "Never use" vocabulary rules: say "dashboard card / counter / list", never
  "widget.json / schema / layout / save_widget_data".

## Contract & repo touches

- **`references/handoff-manifest.md`** (plugin): update the draft-folder reference
  rule from `*.md` only to **`*.md` + `widget.json`**; note that a widget skill is a
  normal `create` with `widget: true` in `SKILL.md` + a `references/widget.json`,
  reusing the existing `worker` block. Optional `widget: true` hint in `draft.json`
  for the PR body.
- **`references/validation-rules.md`** (plugin): add a widget bullet (if `widget:
  true`, a `references/widget.json` must be present; the repo's `cr-skills validate`
  is the authoritative layout/binding check).
- **New `references/widget-archetypes.md`** (plugin): the three skeletons + field
  prompts above.
- **`SKILL.md`** (plugin): Step 2/3 widget branch + Step 5 stash note (include
  `widget.json`).
- **`plugin.json`**: bump `0.1.0 → 0.2.0`.
- **`project-a-skills`: no code change.** `place_draft` already copytrees
  `widget.json`; `cr-skills validate` already validates it. (Confirm with a test;
  update `AGENT_GUIDE`/contract note if it mentions `.md`-only references.)

## Body generation (template)

The generated `SKILL.md` body follows the `inbox-attention` discipline:
resolve identity/context → gather the described data via the agent's tools
(absolute windows, never fabricate) → build a payload matching the generated
`schema` → `save_widget_data(widget_id=<name>, payload)` (always call, incl. the
empty-state) → short chat reply. Read-only; never fabricate.

**Source-unavailable convention (for the FE error state):** if the data source is
not available/connected, the run must **surface as an error** (so the run-state
records `last_run_status="error"` + a reason like "source not connected"), not a
silent success-with-no-envelope — otherwise the FE can't tell it from "not generated
yet". The generated body states this plainly and signals the failure; it does not
write a fabricated snapshot. (Same convention applies to the existing
`inbox-attention`.)

## Validation

- **Valid-by-construction:** the archetype skeleton is valid DSL and the plugin sets
  identical field names in `schema` and `layout`, so meta-schema + binding-coverage
  pass without a Cowork-side check.
- **Authoritative gate:** `cr-skills validate` in `place_draft` (repo side) validates
  the `widget.json` layout against the vendored published v1 + binding coverage — the
  same gate every committed widget passes. A broken hand-edit is caught there.

## Testing

- **Dialog/eval:** a widget-intent prompt routes to the widget branch, presents the
  three archetypes, collects fields, and stashes a draft whose `widget.json` +
  `SKILL.md` (`widget: true`) are well-formed.
- **Worked example:** reproduce `inbox-attention` (Counters+list) end-to-end through
  the dialog and assert the generated `widget.json` passes `cr-skills validate` and
  binding coverage; the body calls `save_widget_data`.
- **Per-archetype:** each archetype's filled skeleton validates against the published
  v1 meta-schema; field-name → schema/layout binding stays consistent.
- **Regression:** non-widget skill/worker authoring is unchanged; `place_draft`
  places a `widget.json` reference and `cr-skills validate` passes (project-a-skills).

## Cross-repo & lifecycle

Two repos, mostly one. **`chatrevenue-marketplace`** (the plugin): the dialog,
archetypes, contract docs, version bump — the bulk. **`project-a-skills`**:
doc/contract note only (code already supports it). Spec here in
`chatrevenue-marketplace/design_docs/`; implementation plan(s) per the repo's
`engineering_plans/` lifecycle (Claude Code writes + executes; git is theirs).

## Open questions / future

- A **table** archetype (list-of-rows), **pagination / "show more"**, **list
  filters** — deferred.
- **Live preview** of the card in the dialog (today: plain-language description).
- **Free-form layout** beyond archetypes — only if archetypes prove too limiting.
- Keeping the archetypes **pinned to the DSL version** (re-sync if the published
  grammar bumps to v2).
