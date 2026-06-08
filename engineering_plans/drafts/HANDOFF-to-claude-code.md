# Handoff brief — chatrevenue-skill-author

> **For Claude Code (executor):** This brief points you at the work. Read the design doc and the plan file for the repo you're working in. Execute via `superpowers:executing-plans` (or `superpowers:subagent-driven-development`). Do NOT re-derive the design from this brief — it is a pointer, not the spec.

## What we built (planning artifacts)

Three files, all in `chatrevenue-marketplace`:

| File | Purpose |
|---|---|
| `design_docs/2026-05-27-chatrevenue-skill-author-design.md` | The "why" and the contract. Read first. |
| `engineering_plans/drafts/2026-05-27-project-a-skills-agent-guide.md` | **Plan A** — work in `project-a-skills` repo. |
| `engineering_plans/drafts/2026-05-27-chatrevenue-skill-author-plugin.md` | **Plan B** — work in `chatrevenue-marketplace` repo (this repo). |

## What the feature does

`chatrevenue-skill-author` is a Cowork plugin that lets non-technical ChatRevenue staff (PM, sales, support) create / update / remove skills for the ChatRevenue agent through a chat dialog. The plugin hides every technical detail — git, branches, pull requests, Claude Code subprocess. The user ends a session with a clickable PR URL and an instruction to click "Merge" when ready.

Under the hood:

```
Cowork plugin (dialog + draft + validate)
    │  spawn `claude --headless` with handoff prompt
    ▼
Claude Code (headless subprocess)
    │  Reads docs/AGENT_GUIDE.md in project-a-skills.
    │  Runs scripts/agent_helpers/*.py (preflight → new_branch → place_draft → open_pr)
    ▼
Pull request in Project-A-Inc/project-a-skills (draft or normal)
```

## Execution order

**Plan A first**, then Plan B. Plan B's pre-flight check 10 verifies that Plan A is merged (`agent_guide_version: 1` exists on `origin/main`); without it, Plan B can't function end-to-end.

### Plan A — `project-a-skills` repo

1. Open Claude Code with cwd = `C:\oieremchuk\projects\project-a-skills`.
2. In a fresh chat: invoke `superpowers:executing-plans` (or `subagent-driven-development` for higher isolation) on the plan file:
   - `C:\oieremchuk\projects\chatrevenue-marketplace\engineering_plans\drafts\2026-05-27-project-a-skills-agent-guide.md`
3. Plan has 13 tasks. Smoke test (Task 12) runs against the real `Project-A-Inc/project-a-skills` via a draft PR + immediate close; CI runs on the smoke PR (draft only suppresses notifications, not CI).
4. After merge, move the plan file from `engineering_plans/drafts/` → `engineering_plans/done/` in this repo.

### Plan B — `chatrevenue-marketplace` repo

1. After Plan A is merged.
2. Open Claude Code with cwd = `C:\oieremchuk\projects\chatrevenue-marketplace`.
3. Invoke `superpowers:executing-plans` on:
   - `engineering_plans/drafts/2026-05-27-chatrevenue-skill-author-plugin.md`
4. Plan has 14 tasks. Manual smoke test (Task 13) installs the plugin into Cowork locally and exercises create / update / remove / escalation flows in a real Cowork chat.
5. After merge, move the plan file from `drafts/` → `done/`.

## Key constraints, do not violate

- **No `pyproject.toml` changes** in `project-a-skills`. No new runtime deps. No `uv.lock` regen.
- **No editing `src/cr_skills_cli/validator.py`** — CLAUDE.md hard rule. Rule changes flow from CRM A's `crma_skills.validator` first.
- **Authored skill content is English only** (SKILL.md + references/). This is an invariant from `project-a-skills/CONTRIBUTING.md`. User-facing dialog may use whatever language the user uses; produced artifacts are always English.
- **Helpers are plain script files, NOT a Python package.** No `__init__.py`. They live as `scripts/agent_helpers/*.py` and import siblings via `sys.path.insert(0, str(Path(__file__).parent))`. Invocation: `uv run --frozen python scripts/agent_helpers/<name>.py`.
- **`cr-skills validate` is always called with `--repo-root <abs>` and `--scope <s>` (plus `--org <id>` for org scope)**. Without these flags the CLI errors on multi-scope name collisions.
- **All `uv run` calls use `--frozen`** to match CI behaviour.
- **Squash-merge only**, no merge commits, no force-push.
- **User-facing dialog never uses these terms:** branch, commit, push, pull request, PR, merge (except as a verb the user clicks), rebase, squash, repository, git, gh, Claude Code, MCP, subprocess, stdout. See `references/user-dialog-phrases.md` in Plan B Task 10 for the full table and Russian variants.

## Watch for these pitfalls

- **Plan A Task 12 (smoke test) must use `--from-current-head`** on `new_branch.py`. Without it, `git checkout main` strips the unmerged helpers from the working tree and the chain breaks.
- **Plan B Task 13.8 escalation test** changes `agent_guide_version` to force `AGENT_GUIDE_VERSION_MISMATCH`. Restore the original frontmatter after testing.
- **Plan B Task 1** appends a NEW plugin entry to `.claude-plugin/marketplace.json` — leave the existing `chatrevenue` plugin entry intact.
- **The Automated PR template lives inside `AGENT_GUIDE.md` as a fenced ````markdown ... ```` block**, NOT in `.github/PULL_REQUEST_TEMPLATE.md`. The latter is for humans opening PRs manually. Two files, two purposes, never use one for the other.
- **`{contact-target>` is a placeholder** in `references/escalation-template.md` — Sasha will fill it in with the Slack channel / mailto when he decides. Don't invent one.

## Self-check before opening either PR

Before opening the implementation PR in either repo, confirm:

- All tests pass: `uv run --frozen pytest -q` (Plan A) / structure validation script (Plan B)
- ruff is clean: `uv run --frozen ruff check src/ tests/ scripts/` (Plan A only; Plan B is pure markdown)
- `uv sync --frozen` passes (no lock drift)
- For Plan A: smoke-test PR (Task 12) is closed and the smoke branch is deleted from origin
- For Plan B: smoke-test PRs from create/update/remove flows (Task 13) are all closed

## Where the rounds of review live

If you want to see why the plan looks the way it does — there were two rounds of review from Sasha that shaped the current design. They're not in a separate doc; they're embedded in the Coverage tables at the bottom of each plan file ("Sasha review responses round 1 + round 2"). Each item there maps to a specific task that addresses it.

## After both PRs are merged

The plugin is installable from `Project-A-Inc/chatrevenue-marketplace` and the helpers exist on `Project-A-Inc/project-a-skills` main. First real user test: open a fresh Cowork chat, install both plugins (the existing `chatrevenue` and the new `chatrevenue-skill-author`), ask "create a skill that helps the agent handle X" — verify the full flow ends with a real PR you can review and (if you like) merge.

If something goes wrong end-to-end and the helpers' tests passed:
- Look at the Cowork-side first (Plan B): the `SKILL.md` orchestration body decides when to escalate vs recover.
- Look at the spawned Claude Code stdout/stderr second (Plan A): the helpers' JSON failure blocks tell you which step failed and why.

Good luck.
