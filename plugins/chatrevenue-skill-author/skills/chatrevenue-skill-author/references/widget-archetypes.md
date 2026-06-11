# Widget archetypes

A **widget** is a worker (it runs on its own and gathers data) that also has a
**dashboard surface**. You author it as a normal skill plus a
`references/widget.json` and `widget: true` in the frontmatter. You do **not**
hand-write a layout from scratch — pick one of the archetypes below, fill its
named fields, and the skeleton becomes a valid `widget.json`. The repo's
`cr-skills validate` is the authoritative check.

Keep the dialog in plain language. Never say "DSL", "schema", "layout", "JSON",
"save_widget_data" to the author. Say "dashboard card", "counter", "list",
"card fields".

## How to use this file

1. Detect widget intent (Step 2/3 of the main skill): "dashboard", "widget",
   "card", "counter", "tile", "show me X on my dashboard", or equivalents.
2. Collect the worker side as usual (it runs on its own; ask cadence, omit ⇒
   defaults).
3. Offer the three archetypes **by description** and let the author pick one.
4. Ask only that archetype's field prompts.
5. Fill the skeleton: substitute the named fields into both the data shape and
   the layout (use the **same** field names in both — that keeps them in sync).
   Infer types: a count ⇒ integer ≥ 0; a time ⇒ string `date-time`; an amount ⇒
   number; a small fixed set the author lists ⇒ enum; everything else ⇒ string.
6. Write `references/widget.json` = `{ "id": <skill-name>, "schema": …,
   "layout": … }` and set `widget: true` in the draft `SKILL.md`.
7. Describe the result back in plain language ("a card with two counters that
   opens into a list").

## Shared rules — the list

For archetypes with a list (1 and 3):

- The list is **capped at 20 items**, **newest first** by default (a time field),
  or **by importance** for ranked cards — ask the author once: "newest first, or
  most important first?".
- **Counters reflect the full total**, not the list length (so "47 unread" can
  sit above a 20-item list).
- The list lives in the **expanded** view only; the **compact** view shows the
  counters/metric. Clicking the card opens expanded.
- Always include an `empty` message for the list ("Nothing right now" — let the
  author phrase it).

## Vocabulary the skeletons use

Allowed node types (the published v1 grammar): `stat`, `text`, `badge`, `list`,
`row`, `group`, `link`. Binding: `{ "bind": "field" }` for a whole value,
`"{{field}}"` inside a string. `format` (e.g. `relative-time`, `date`, `currency`)
applies only to a single bound value.

---

## Archetype 1 — Counters + list

**Describe it as:** "a few counters that open into a list" (e.g. unread emails:
two counters that expand into the list of emails).

**Field prompts:**
- 1–3 counter labels (e.g. "Internal", "External").
- The fields each list item should show (e.g. subject, sender, time) + an
  optional "Open" link.
- Newest-first or most-important-first?

**Data shape** (substitute `count_a…`, item `field_x…`):

```json
{
  "type": "object", "additionalProperties": false,
  "required": ["count_a", "items"],
  "properties": {
    "count_a": { "type": "integer", "minimum": 0 },
    "count_b": { "type": "integer", "minimum": 0 },
    "items": {
      "type": "array", "maxItems": 20,
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["title"],
        "properties": {
          "title":    { "type": "string" },
          "subtitle": { "type": "string" },
          "at":       { "type": "string", "format": "date-time" },
          "url":      { "type": "string" }
        }
      }
    }
  }
}
```

**Layout skeleton:**

```json
{
  "compact": { "type": "row", "children": [
    { "type": "stat", "value": { "bind": "count_a" }, "label": "<label A>" },
    { "type": "stat", "value": { "bind": "count_b" }, "label": "<label B>" }
  ]},
  "expanded": { "type": "list", "for": "items", "empty": "<empty message>",
    "item": { "type": "row", "direction": "vertical", "children": [
      { "type": "text", "value": "{{title}}", "style": "strong" },
      { "type": "text", "value": "{{subtitle}}", "style": "muted" },
      { "type": "text", "value": { "bind": "at" }, "format": "relative-time", "style": "muted" },
      { "type": "link", "label": "Open", "href": "{{url}}" }
    ]}
  }
}
```

Drop the counters/fields the author didn't ask for; keep the ones named in both
the data shape and the layout.

---

## Archetype 2 — Single KPI

**Describe it as:** "one big number with a short line of context" (e.g. pipeline
total, quota %).

**Field prompts:**
- What the number is + its label (e.g. "Open pipeline").
- An optional one-line context (e.g. "21 active deals · 4 closing this week").
- Is it a plain count, an amount (money), or a percentage? (⇒ type/format).

**Data shape:**

```json
{
  "type": "object", "additionalProperties": false,
  "required": ["value"],
  "properties": {
    "value":   { "type": "number" },
    "context": { "type": "string" }
  }
}
```

**Layout skeleton:**

```json
{
  "compact": { "type": "group", "direction": "vertical", "children": [
    { "type": "stat", "value": { "bind": "value" }, "label": "<label>" },
    { "type": "text", "value": "{{context}}", "style": "muted" }
  ]},
  "expanded": { "type": "group", "direction": "vertical", "children": [
    { "type": "stat", "value": { "bind": "value" }, "label": "<label>" },
    { "type": "text", "value": "{{context}}", "style": "muted" }
  ]}
}
```

For money use a `currency` format and an integer/number `value`; for a percentage
keep it a number and phrase the label "… %". If there's no expanded detail, the
expanded view may repeat the compact group.

---

## Archetype 3 — Ranked cards

**Describe it as:** "a ranked list of cards" (e.g. What-Matters-Now signals,
deals needing attention).

**Field prompts:**
- A count/summary for the compact view ("5 signals").
- The card fields: a title, an optional subtitle, an optional body line, an
  optional tag (and its possible values, e.g. overdue / today / upcoming), an
  optional "Open" link.
- Most-important-first (rank) or newest-first?

**Data shape:**

```json
{
  "type": "object", "additionalProperties": false,
  "required": ["total", "items"],
  "properties": {
    "total": { "type": "integer", "minimum": 0 },
    "summary": { "type": "string" },
    "items": {
      "type": "array", "maxItems": 20,
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["title"],
        "properties": {
          "tag":      { "type": "string", "enum": ["<value1>", "<value2>"] },
          "title":    { "type": "string" },
          "subtitle": { "type": "string" },
          "body":     { "type": "string" },
          "url":      { "type": "string" }
        }
      }
    }
  }
}
```

**Layout skeleton:**

```json
{
  "compact": { "type": "group", "direction": "vertical", "children": [
    { "type": "stat", "value": { "bind": "total" }, "label": "<label>" },
    { "type": "text", "value": "{{summary}}", "style": "muted" }
  ]},
  "expanded": { "type": "list", "for": "items", "empty": "<empty message>",
    "item": { "type": "row", "direction": "vertical", "children": [
      { "type": "badge", "label": "{{tag}}", "tone": "neutral" },
      { "type": "text", "value": "{{title}}", "style": "strong" },
      { "type": "text", "value": "{{subtitle}}", "style": "muted" },
      { "type": "text", "value": "{{body}}" },
      { "type": "link", "label": "Open", "href": "{{url}}" }
    ]}
  }
}
```

Drop the optional card fields the author didn't ask for (remove them from BOTH
the data shape and the layout so binding stays consistent). `badge.tone` is a
fixed value, not data-driven — leave it `neutral` in v1.

---

## After filling an archetype

- The body of the `SKILL.md` is a normal worker body: gather the described data
  via the agent's tools (state absolute time windows, never fabricate), build the
  data matching the shape above, and persist it. **Always** persist, including the
  empty state (counts 0, `items: []`).
- **If the data source is unavailable / not connected, the run must end as an
  error** (so the dashboard can show an error / "connect your source" state) — do
  not finish quietly with no data, and never fabricate.
- Cadence is the worker's; enabling auto-refresh happens later in ChatRevenue.
