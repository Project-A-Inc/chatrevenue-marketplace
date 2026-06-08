# Escalation template

When a check or step fails in a way the plugin cannot resolve, stop and
emit the message below to the user. The technical block stays in
English regardless of dialog language, so the AI team always sees the
same format.

> **Variant 1 (2026-06-08).** The environment/git categories below
> (`PREREQ_*`, `WORK_TREE_DIRTY`, `GH_PR_CREATE_FAILED`, `VALIDATION_REPO_SIDE_FAILED`,
> `AGENT_GUIDE_VERSION_MISMATCH`) now surface on the user's **Claude Code** side
> (its `preflight.py`/helpers), not in Cowork — the user pastes the failure back
> and you relay it with this template. Cowork-side, the only failures you raise
> yourself are local ones (e.g. can't write the draft stash). `CLAUDE_SPAWN_FAILED`
> is retired (nothing is spawned).

## Default English template

Use the text below verbatim. Substitute the placeholders.

```
Technical issue

I can't continue due to a technical issue that I can't resolve myself:

What happened: <HUMAN_CATEGORY>

What to do: message the AI team with this text — they have everything
they need:

╭─────────────────────────────────────────────────────╮
│ chatrevenue-skill-author / v<PLUGIN_VERSION>        │
│ <ISO_8601_TIMESTAMP> / <CATEGORY_CODE>              │
│                                                     │
│ step:        <STEP_NAME>                            │
│ command:     <LAST_COMMAND>                         │
│ exit_code:   <EXIT_CODE>                            │
│ stderr (truncated 2KB):                             │
│ <RAW_STDERR>                                        │
│                                                     │
│ context: {                                          │
│   repo_root:           <PATH>,                      │
│   skill_name:          <NAME>,                      │
│   scope:               <global|org>,                │
│   org_id:              <ID_OR_NULL>,                │
│   os:                  <darwin|win32|linux>,        │
│   gh_version:          <GH_VERSION>,                │
│   claude_version:      <CLAUDE_VERSION>,            │
│   agent_guide_version: <INTEGER>                    │
│ }                                                   │
╰─────────────────────────────────────────────────────╯

(Copied to clipboard)
```

After emitting this message:
1. Attempt to copy the block to the system clipboard via:
   - macOS: `pbcopy`
   - Linux: `xclip -selection clipboard` (graceful skip if not installed)
   - Windows: `clip.exe`
   If clipboard is unavailable, drop the "(Copied to clipboard)" line.
2. Do not loop back to the dialog. The session ends here.

## Category codes and human text

| Code | `HUMAN_CATEGORY` value |
|---|---|
| `PREREQ_NO_REPO_ACCESS` | "You don't have access to the skills project on GitHub" |
| `WORK_TREE_DIRTY` | "There are unsaved changes in your skills project folder" |
| `BRANCH_BEHIND_MAIN` | "Your local copy of the skills project is out of sync" |
| `CLAUDE_SPAWN_FAILED` | "Couldn't complete the last step automatically" |
| `VALIDATION_REPO_SIDE_FAILED` | "The skill didn't pass the final check" |
| `GH_PR_CREATE_FAILED` | "Couldn't open the review link" |
| `AGENT_GUIDE_VERSION_MISMATCH` | "The plugin needs to be updated" |
| `UNKNOWN_EXCEPTION` | "Something unexpected happened" |

## Language-switched variants

If dialog language is not English, translate ONLY the user-facing lines
("Technical issue", "I can't continue…", "What happened:", "What to
do:", "(Copied to clipboard)", and `HUMAN_CATEGORY`). The bracketed
technical block stays English verbatim.

Example, Russian:

```
Техническая проблема

Я не могу продолжить из-за технической проблемы, которую сам решить
не могу:

Что случилось: <переведённая HUMAN_CATEGORY>

Что делать: напиши АИ команде с этим текстом — у них есть всё, что
нужно:

[the same English bracketed block as above]

(Скопировано в буфер обмена)
```

## Recoverable categories (do NOT use this template)

The following categories are recoverable in pre-flight (see
`preflight-checklist.md`). Walk the user through a fix; do not
escalate:

- `PREREQ_CLAUDE_MISSING`
- `PREREQ_GH_MISSING`
- `PREREQ_UV_MISSING`
- `PREREQ_UV_SYNC_NEEDED` (one-command fix: `uv sync` in the repo)
- `PREREQ_GH_UNAUTH`
- `PREREQ_REPO_NOT_FOUND`
- `BRANCH_NAME_TAKEN` (helper auto-suffixes; never reaches user)
