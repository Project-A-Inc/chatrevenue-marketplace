# Handoff manifest — draft.json schema

Every draft folder contains a `draft.json` sidecar that the Cowork-side
skill writes after dialog and validation. The spawned Claude Code
subprocess reads it as the source of truth for what to ship.

## Schema (v2)

```json
{
  "version": 2,
  "type": "create",
  "scope": "global",
  "org_id": null,
  "name": "kebab-case-slug",
  "worker": {
    "executable": true,
    "interval_online_min": 30,
    "interval_offline_min": 240
  },
  "repo_root": "/absolute/path/to/project-a-skills",
  "pr_title": "Add skill: kebab-case-slug",
  "pr_body": "<markdown summary for the PR body>",
  "source": {
    "plugin": "chatrevenue-skill-author",
    "version": "0.1.0",
    "session_id": "<opaque session id>"
  }
}
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `version` | integer | 2 for this plugin v0.1.x (was 1 before worker support; readers must accept both) |
| `type` | string | "create", "update", or "remove" |
| `scope` | string | "global" or "org" |
| `org_id` | string \| null | Required when `scope` = "org"; null otherwise |
| `name` | string | Skill slug; matches `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$` |
| `worker` | object \| absent | **Optional.** Present only when the skill runs on its own. Absent ⇒ a plain (non-executable) skill. |
| `worker.executable` | boolean | Always `true` when `worker` is present |
| `worker.interval_online_min` | integer \| absent | Optional positive int (minutes); omit ⇒ agent default |
| `worker.interval_offline_min` | integer \| absent | Optional positive int (minutes); omit ⇒ agent default |
| `repo_root` | string | Absolute path to the user's local clone |
| `pr_title` | string | Pre-formatted PR title |
| `pr_body` | string | Pre-formatted PR body (markdown) |
| `source.plugin` | string | Always "chatrevenue-skill-author" |
| `source.version` | string | Semver string, matches `plugin.json` `version` |
| `source.session_id` | string | Opaque ID for tracing; ULID or UUID |

The `worker` object is additive: a manifest without it is a plain skill.
When present, the placed `SKILL.md` carries exactly these frontmatter
fields (`executable: true` + any intervals) and **never** a `schedule:`.
The helpers must not inject `executable` on their own — absence means
non-executable.

## Validation

Before writing `draft.json`:
- Confirm `repo_root` is an absolute path and exists
- Confirm `name` matches the regex
- Confirm `scope` and `org_id` invariant (org_id required iff scope=org)
- Confirm `pr_title` and `pr_body` are non-empty for create/update;
  may be auto-generated for remove
- If `worker` is present: `executable` is `true`, and each interval (if
  present) is a positive integer

## What lives in the draft folder

```
<stash-dir>/drafts/<timestamp>-<name>/
├── SKILL.md           ← present for create/update; absent for remove
├── references/        ← optional, only for create/update
│   ├── *.md
│   └── widget.json    ← present only for a dashboard widget (skill has `widget: true`)
└── draft.json         ← always present
```

**Dashboard widgets.** A widget skill is a normal `create` with `widget: true`
in the `SKILL.md` frontmatter and a `references/widget.json` file (the
`{ id, schema, layout }` produced from a widget archetype — see
`references/widget-archetypes.md`). It reuses the existing `worker` block (a
widget is a worker). The repo side already accepts `.json` references
(`place_draft` copies them; `cr-skills validate` validates the layout against the
published widget-layout schema) — no extra manifest fields are required; an
optional `"widget": true` hint may be added to `draft.json` for the PR body.
