# Pre-flight checklist

> **Variant 1 (2026-06-08): these run on the Claude Code side, NOT in Cowork.**
> On Cowork-on-Windows the skill's shell is a Linux sandbox with no `gh`, no SSH
> keys, blocked git on the Windows mount, and an unreliable `git status` — so none
> of the checks below are meaningful from Cowork. They are exactly the checks
> `scripts/agent_helpers/preflight.py` performs on the user's **native Claude Code**
> when it runs the ship handoff (SKILL.md Step 6). This file is kept as the
> human-readable spec of *what* gets verified and *which* category each failure
> maps to (used by `escalation-template.md`) — the Cowork-side skill itself only
> settles `repo_root` (SKILL.md Step 1) and does not execute these.

Each check below is a single shell command followed by what to do on
failure (as run by `preflight.py` on the Claude Code side).

## 1. Claude Code CLI installed

```
claude --version
```

Failure → `PREREQ_CLAUDE_MISSING`. Recovery:
- macOS: ask user to run `brew install --cask claude-code` (or the
  installer link on https://claude.com/code).
- Windows: link to the installer at https://claude.com/code.
- Linux: link to the install docs.

After install, ask the user to confirm, then re-run.

## 2. GitHub CLI installed

```
gh --version
```

Failure → `PREREQ_GH_MISSING`. Recovery:
- macOS: `brew install gh`
- Windows: `winget install GitHub.cli`
- Linux: `sudo apt-get install gh` (or distro equivalent)

## 3. uv installed

```
uv --version
```

Failure → `PREREQ_UV_MISSING`. Recovery:
- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

After install, ask the user to restart their terminal-equivalent or
confirm `uv` is now on PATH, then re-run.

## 4. GitHub auth passed

```
gh auth status
```

Failure → `PREREQ_GH_UNAUTH`. Recovery: walk the user through
`gh auth login`. Open the URL it prints for them.

## 5. Repo push permission

```
gh api repos/Project-A-Inc/project-a-skills --jq .permissions.push
```

Expected output: `true`.
Failure (false, or 404) → `PREREQ_NO_REPO_ACCESS`. **Escalate** — this
needs the AI team to grant org access.

## 6. Local repo path known

Read `<state-dir>/config.json`. If `repo_root` exists, use it. If not,
or the path is invalid (see check 7), ask the user:
"Where is your local copy of the ChatRevenue skills project?" Then
either accept their path or offer to clone:
"Want me to download it to <suggested-path>?" — on yes, run
`gh repo clone Project-A-Inc/project-a-skills <path>`.

Save the chosen path to `<state-dir>/config.json` as `repo_root`.

## 7. Repo path is valid

```
git -C "<repo_root>" remote get-url origin
```

Expected output contains `Project-A-Inc/project-a-skills`.
Failure → `PREREQ_REPO_NOT_FOUND`. Recovery: re-ask the user (back to
check 6).

## 8. Working tree clean

```
git -C "<repo_root>" status --porcelain
```

Expected output: empty.
Failure → `WORK_TREE_DIRTY`. **Escalate** — do not auto-stash.

## 9. cr-skills invokable in the repo (uv sync done)

```
cd "<repo_root>" && uv run --frozen cr-skills --version
```

Expected: exit 0, prints a version string.
Failure → `PREREQ_UV_SYNC_NEEDED`. Recovery: walk the user through
`cd <repo_root> && uv sync` (one command). Confirm before running on
their behalf. Re-run after.

## 10. Agent guide version compatible

```
gh api repos/Project-A-Inc/project-a-skills/contents/docs/AGENT_GUIDE.md \
  --jq .content | base64 -d | head -5
```

Parse YAML frontmatter for `agent_guide_version`. Plugin v0.1.x
supports `agent_guide_version: 1`.
Failure (version > 1) → `AGENT_GUIDE_VERSION_MISMATCH`. **Escalate** —
"the plugin needs to be updated".

## After all checks pass

Save `agent_guide_version_seen=<integer>` to config and proceed to
step 2 of the workflow. Do not list passed checks to the user.
