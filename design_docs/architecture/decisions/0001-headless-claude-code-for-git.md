# 0001 — Git work runs in a headless Claude Code subprocess, not the plugin's own bash

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `engineering_plans/documented/2026-05-27-chatrevenue-skill-author-plugin.md` + `design_docs/2026-05-27-chatrevenue-skill-author-design.md` §5.2

## Context

The `chatrevenue-skill-author` plugin must end with a pull request in
`project-a-skills`. Someone has to run `git` and `gh`. The obvious option is for
the Cowork plugin to shell out to `git`/`gh` directly through its own Bash tool.

## Decision

The plugin does **not** run git itself. It writes a local draft + a `draft.json`
manifest, then spawns a **headless Claude Code subprocess** (`claude --headless
--cwd <repo> --prompt-file handoff-prompt.md --env DRAFT_MANIFEST=…`). That
subprocess reads `project-a-skills/docs/AGENT_GUIDE.md` and runs the four
`scripts/agent_helpers/*.py` (`preflight → new_branch → place_draft → open_pr`),
returning the PR URL on its last stdout line.

## Consequences

- The git/PR playbook (atomic commits, branch naming, conflict handling) lives
  once, in `project-a-skills`' helpers + AGENT_GUIDE — the plugin doesn't
  reimplement it, and the Cowork-side SKILL.md stays short.
- One clean process boundary: dialog talks to the user; the subprocess talks to
  the repo. Matches the security mental model.
- Cost: a Claude Code CLI prerequisite on the user's machine (pre-flight check 1)
  and a cross-process contract (`draft.json` + the `pr_url=` return line) to keep
  stable.
