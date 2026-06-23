# Handoff manifest — `draft.json` (pointer)

> **Authoritative schema lives in the repo (ADR 0011):**
> `project-a-skills/docs/AGENT_GUIDE.md` → "Draft manifest (`draft.json`)". When the
> repo is mounted, read it there. This file is only the plain-language reminder of
> what Cowork writes after dialog + Layer-A validation, so authoring works even when
> the repo isn't mounted. If the two ever disagree, the repo wins.

You (Cowork) write one `draft.json` into the stash folder. Minimal shape for
offline authoring:

- `version` — `2`
- `type` — `create` | `update` | `remove`
- `scope` — `global` | `org`; `org_id` — string iff `scope=org`, else `null`
- `name` — kebab-case slug, `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`
- `worker` (optional, only if the skill runs on its own) — `{ executable: true,
  interval_online_min?, interval_offline_min? }`; omit entirely for a plain skill;
  never emit `schedule:`
- `requires_setup` (optional widget hint)
- `repo_root` — absolute path to the user's clone
- `pr_title` / `pr_body` — suggested PR intent (Code may refine — ADR 0010)
- `source` — `{ plugin, version, session_id }`

## What lives in the draft folder

```
<stash-dir>/drafts/<timestamp>-<name>/
├── SKILL.md           ← create/update only (absent for remove)
├── references/        ← optional (create/update)
│   ├── *.md
│   └── widget.json    ← only for a dashboard widget (SKILL.md has `widget: true`)
└── draft.json         ← always present
```

Before writing `draft.json`: confirm `repo_root` is an absolute path, `name`
matches the regex, the `scope`/`org_id` invariant holds, `pr_title`/`pr_body` are
non-empty for create/update, and (if `worker` present) `executable` is `true` with
positive-int intervals. The authoritative field semantics and the worker/widget
rules are in the repo doc above.
