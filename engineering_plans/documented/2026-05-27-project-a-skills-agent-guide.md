# project-a-skills agent-guide v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Level 2 repo-side artifacts in `project-a-skills` that the `chatrevenue-skill-author` Cowork plugin depends on: a versioned `AGENT_GUIDE.md`, four Python helper scripts under `scripts/agent_helpers/` as the agent-facing mutation API, a manual-PR template, and a `CLAUDE.md` cross-link.

**Architecture:** All automation conventions live in `docs/AGENT_GUIDE.md`, gated by `agent_guide_version: 1`. The four helpers under `scripts/agent_helpers/` are plain script files (NOT a Python package) — invoked via `uv run --frozen python scripts/agent_helpers/<name>.py …`. Each script handles its own siblings via `sys.path.insert(0, str(Path(__file__).parent))`. This keeps `pyproject.toml` and `uv.lock` untouched, so `cr-skills-cli` wheel stays clean and CI's `uv sync --frozen` continues to pass. Authoritative validation is delegated to `cr-skills validate` (invoked from `place_draft.py` with explicit `--repo-root`/`--scope`/`--org` flags to avoid the multi-scope ambiguity in `_resolve_single_key`). The Automated PR body template lives inside `AGENT_GUIDE.md` (separate from `.github/PULL_REQUEST_TEMPLATE.md`, which serves manual PRs).

**Tech Stack:** Python 3.11+ (via `uv run --frozen`, reuses the existing repo venv used by `cr_skills_cli`), `gh` CLI 2.x, `git` 2.x, `uv` (existing in repo), Python pytest (existing test infrastructure). No bash, no shell-specific tools — cross-platform without Git Bash. **No new runtime dependencies.**

**Where this plan executes:** Open Claude Code with cwd = your local clone of `project-a-skills`. This plan file lives in the `chatrevenue-marketplace` repo; read it by absolute path when executing.

---

## File Structure

**New files in `project-a-skills`:**
- `docs/AGENT_GUIDE.md` — agent contract document, versioned via YAML frontmatter, includes the Automated PR body template
- `scripts/agent_helpers/_common.py` — shared utilities (JSON emit, helpers for git/gh subprocess, path helpers). Underscore prefix marks "private to this directory; not a public API".
- `scripts/agent_helpers/preflight.py` — environment + repo-state checks
- `scripts/agent_helpers/new_branch.py` — branch creation
- `scripts/agent_helpers/place_draft.py` — copy draft, validate via `cr-skills`, commit
- `scripts/agent_helpers/open_pr.py` — push + create PR (substitutes the Automated PR template from AGENT_GUIDE)
- `.github/PULL_REQUEST_TEMPLATE.md` — template for manual PRs (separate from automated)
- `tests/test_agent_helpers.py` — pytest integration tests; all helpers exercised via `subprocess.run`

**Modified files:**
- `CLAUDE.md` — add a section pointing automated agents at `docs/AGENT_GUIDE.md`
- `CONTRIBUTING.md` — update the "PR workflow" branch-naming convention to reflect both the manual `fix/<name>` and the automation-suffixed `fix/<name>-YYYYMMDD-<hash>`; add the `skills/org-<org_id>-<name>` org-create case
- `tests/conftest.py` — add fixtures for ephemeral git repos and sample drafts
- `.github/workflows/validate-pr.yml` — extend `paths:` filter to include `scripts/**` and `docs/**`; extend `ruff check` to cover `scripts/`

**NOT modified:**
- `pyproject.toml` (no new dependencies, no package-mode wiring)
- `uv.lock` (no dependency changes)
- `src/cr_skills_cli/validator.py` (hard rule from CLAUDE.md: rule changes flow from CRM A's `crma_skills.validator` first)

---

## Task 1: Create the agent guide

**Files:**
- Create: `docs/AGENT_GUIDE.md`

- [ ] **Step 1.1: Write the file**

```markdown
---
agent_guide_version: 1
---

# Agent guide — project-a-skills

You are an AI agent (e.g., Claude Code spawned by the
`chatrevenue-skill-author` Cowork plugin) about to mutate this
repository on a user's behalf. Read this guide fully before touching
anything.

## The contract

You may only mutate the repo through `scripts/agent_helpers/`. Invoke
them via `uv run --frozen python scripts/agent_helpers/<name>.py` from
the repo root. Do not invoke `git` or `gh` directly. The helpers
encode the agreed conventions and emit JSON you can rely on.

Helper order, always:

1. `scripts/agent_helpers/preflight.py` — verifies environment + repo state.
2. `scripts/agent_helpers/new_branch.py` — creates the working branch from
   a freshly fetched `origin/main` (or from the current HEAD if invoked
   with `--from-current-head`; used only for pre-merge smoke testing).
3. `scripts/agent_helpers/place_draft.py` — copies the draft into the right
   `skills/<scope>/<...>/<name>/` location, runs `cr-skills validate`
   with `--repo-root`/`--scope`/`--org`, and commits.
4. `scripts/agent_helpers/open_pr.py` — pushes the branch and opens the PR.

Every helper takes `--repo-root <abs-path>` (no env-var dance). If any
helper exits non-zero, **stop immediately** and propagate the JSON
error block on stderr verbatim to the caller. Do not retry, do not
reach past the helpers.

## Path layout

| Scope | Folder for SKILL.md |
|---|---|
| global | `skills/global/<name>/SKILL.md` |
| org | `skills/org/<org_id>/<name>/SKILL.md` |

References (optional, only `.md` files) live in `references/`
alongside `SKILL.md`.

## Branch naming

`new_branch.py` produces:

| Type | Scope | Branch pattern |
|---|---|---|
| create | global | `skills/global-<name>` |
| create | org    | `skills/org-<org_id>-<name>` |
| update | any    | `fix/<name>-YYYYMMDD-<6-char-hash>` |
| remove | any    | `remove/<name>` |

If a branch with the candidate name exists locally or on origin, the
helper appends `-2`, `-3`, …

## PR titles

| Type | PR title |
|---|---|
| create | `Add skill: <name>` |
| update | `Update skill: <name>` |
| remove | `Remove skill: <name>` |

## Automated PR body template

`open_pr.py` reads the fenced block below, substitutes the
placeholders, and passes the result as `--body-file` to
`gh pr create`. **This block is the source of truth for automated PR
bodies.** Do not use `.github/PULL_REQUEST_TEMPLATE.md` for automated
PRs — that file serves humans opening PRs through the web UI.

Substitution markers: `{title}`, `{kind}`, `{skill_path}`, `{name}`,
`{org_segment}` (renders `--scope org --org <id>` or `--scope global`),
`{plugin_version}`, `{session_id}`.

````markdown
## Summary

{title}

## Kind of change

- {kind}

## Affected skill(s)

`{skill_path}`

## Validation

- [x] `uv run cr-skills validate {name} --repo-root . {org_segment}` passed via `place_draft.py`

---

> Authored via `chatrevenue-skill-author` Cowork plugin v{plugin_version},
> session `{session_id}`.
````

## Validation invocation

`place_draft.py` calls `cr-skills` with all disambiguating flags so the
call is unambiguous regardless of multi-scope name collisions:

```
uv run --frozen cr-skills validate <name> \
  --repo-root <abs-path> \
  --scope <global|org> \
  [--org <org_id>]
```

`cr-skills`'s `_resolve_single_key` raises "exists in multiple scopes"
when `--scope`/`--org` is omitted and the name is duplicated. Passing
both flags removes that footgun. `--repo-root` removes another footgun:
without it, `cr-skills` consults `SKILLS_REPO_ROOT` env or a stored
config file, neither of which the helpers set up.

## Hard "don'ts"

- Do not push to `main` or `staging` directly.
- Do not run `git push --force`.
- Do not create merge commits. Squash-merge only (enforced at repo
  level).
- Do not modify `src/cr_skills_cli/validator.py`. Rule changes come
  from CRM A's `crma_skills.validator` first; this repo mirrors them.
  See `CLAUDE.md` hard rules.
- Do not change validation rules in any way. If validation fails,
  surface the error; do not work around it.
- Do not invent a draft. The user produced one through the
  `chatrevenue-skill-author` Cowork plugin; you only ship it.

## Escalation

Stop and propagate the helper's JSON error block when:

- `git status --porcelain` is not empty before you start
- A merge or rebase is needed
- `cr-skills validate` fails (the draft is broken — report, don't fix)
- `gh pr create` fails for any reason
- Any uncaught non-zero exit from any helper

The caller (the Cowork plugin) shows the user a human message and
routes them to the AI team with the structured payload.

## Versioning

This document has `agent_guide_version: 1`. The plugin checks this
integer during pre-flight and refuses to proceed if it is higher than
what the installed plugin understands. The integer bumps only on
breaking changes to the contract above — renamed/removed helpers, new
required arguments, changed exit-code semantics. Additive edits do not
bump.

## See also

- `CONTRIBUTING.md` — validation rules and skill format
- `docs/AUTHORING.md` — the manual authoring path this automation parallels
- `docs/DESIGN.md` — why the repo looks the way it does
- `chatrevenue-marketplace/design_docs/2026-05-27-chatrevenue-skill-author-design.md` — design context for this guide
```

- [ ] **Step 1.2: Verify the frontmatter parses**

Run: `uv run --frozen python -c "import yaml; t=open('docs/AGENT_GUIDE.md').read(); print(yaml.safe_load(t.split('---')[1]))"`
Expected: `{'agent_guide_version': 1}`

- [ ] **Step 1.3: Verify the Automated PR template block parses cleanly**

Run:

```bash
uv run --frozen python <<'PY'
import re
from pathlib import Path
content = Path("docs/AGENT_GUIDE.md").read_text()
m = re.search(r"^````markdown\n(.*?)\n````$", content, re.M | re.S)
assert m, "Automated PR body fenced block not found"
body = m.group(1)
for marker in ("{title}", "{kind}", "{skill_path}", "{name}",
               "{org_segment}", "{plugin_version}", "{session_id}"):
    assert marker in body, f"missing substitution marker: {marker}"
print("PR template block ok")
PY
```

Expected: `PR template block ok`

- [ ] **Step 1.4: Commit**

Commit message: `docs: add AGENT_GUIDE.md v1 for chatrevenue-skill-author plugin`
Files to add: `docs/AGENT_GUIDE.md`

---

## Task 2: Create the manual PR template

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 2.1: Write the template**

```markdown
## Summary

<!-- One sentence: what does this PR do? -->

## Kind of change

<!-- Pick one. -->

- [ ] Create new skill
- [ ] Update existing skill
- [ ] Remove existing skill
- [ ] Other

## Affected skill(s)

<!-- Folder path under skills/, e.g. skills/global/pptx/ -->

## Validation

- [ ] `uv run cr-skills validate <name> --repo-root . --scope <global|org> [--org <id>]` passes locally

## Author note

<!-- Optional: any context for reviewers. -->
```

(No "Authored via plugin" marker. The automated PR template inside `AGENT_GUIDE.md` carries that marker for automation-originated PRs.)

- [ ] **Step 2.2: Confirm file path**

Run: `test -f .github/PULL_REQUEST_TEMPLATE.md && echo ok`
Expected: `ok`

- [ ] **Step 2.3: Commit**

Commit message: `chore: add PR template for manual skill PRs`
Files to add: `.github/PULL_REQUEST_TEMPLATE.md`

---

## Task 3: Update CLAUDE.md to reference the guide

**Files:**
- Modify: `CLAUDE.md` (append a section after the existing "Hard rules" section)

- [ ] **Step 3.1: Locate the insertion point**

Run: `grep -n "^## " CLAUDE.md`
Expected: section headings; locate the line after "Hard rules — do not violate without explicit user approval".

- [ ] **Step 3.2: Insert the new section**

Insert this block immediately after the "Hard rules" section:

```markdown
## Automated agents (chatrevenue-skill-author plugin)

If you have been spawned by the `chatrevenue-skill-author` Cowork plugin to
ship a skill draft into this repo, read `docs/AGENT_GUIDE.md` first and use
only `scripts/agent_helpers/*.py` (via `uv run --frozen python scripts/agent_helpers/<name>.py`)
to mutate the repo. Do not invoke `git` or `gh` directly in that context.
```

- [ ] **Step 3.3: Verify formatting**

Run: `grep -A 5 "Automated agents" CLAUDE.md`
Expected: the inserted block prints back intact.

- [ ] **Step 3.4: Commit**

Commit message: `docs(claude-md): point automated agents at docs/AGENT_GUIDE.md`
Files to add: `CLAUDE.md`

---

## Task 4: Test fixtures and lock verification

**Files:**
- Modify: `tests/conftest.py`
- Create: `tests/fixtures/sample_draft/SKILL.md`
- Create: `tests/fixtures/sample_draft/draft.json`

(Note: no `pyproject.toml` change, no `uv.lock` regeneration — see Architecture section.)

- [ ] **Step 4.1: Verify the baseline still passes**

Before any test code is added, confirm the current repo is healthy:

Run: `uv sync --frozen && uv run --frozen pytest -q`
Expected: all existing tests pass (sanity baseline).

- [ ] **Step 4.2: Create fixture files**

Create `tests/fixtures/sample_draft/SKILL.md`:

```markdown
---
name: test-helper-sample
description: >
  Sample skill used only by the agent_helpers integration tests. Trigger
  on test-only phrases like "run the helper integration test" and similar
  fixture-driven invocations. Never deployed.
scope: global
version: 0.1.0
---

# Test helper sample

Body content for fixture purposes.
```

Create `tests/fixtures/sample_draft/draft.json`:

```json
{
  "version": 1,
  "type": "create",
  "scope": "global",
  "org_id": null,
  "name": "test-helper-sample",
  "repo_root": "REPLACED_BY_TEST",
  "pr_title": "Add skill: test-helper-sample",
  "pr_body": "Automated test fixture.",
  "source": {
    "plugin": "chatrevenue-skill-author",
    "version": "0.0.0-test",
    "session_id": "fixture"
  }
}
```

- [ ] **Step 4.3: Add fixtures to conftest.py**

Append to `tests/conftest.py`:

```python
import shutil
import subprocess
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
REPO_ROOT = Path(__file__).parent.parent
HELPERS_DIR = REPO_ROOT / "scripts" / "agent_helpers"


@pytest.fixture
def helpers_dir() -> Path:
    return HELPERS_DIR


@pytest.fixture
def tmp_skills_repo(tmp_path: Path) -> Path:
    """A fresh local clone-like git repo that smells like project-a-skills."""
    repo = tmp_path / "skills-repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main"], cwd=repo, check=True)
    subprocess.run(
        ["git", "remote", "add", "origin",
         "https://github.com/Project-A-Inc/project-a-skills.git"],
        cwd=repo, check=True,
    )
    (repo / "skills" / "global").mkdir(parents=True)
    (repo / "skills" / "org").mkdir(parents=True)
    (repo / "README.md").write_text("test\n")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True)
    subprocess.run(
        ["git", "-c", "user.email=t@t", "-c", "user.name=t",
         "commit", "-q", "-m", "init"],
        cwd=repo, check=True,
    )
    return repo


@pytest.fixture
def sample_draft(tmp_path: Path) -> Path:
    """Copy of the sample draft fixture into a tmp location."""
    dest = tmp_path / "draft"
    shutil.copytree(FIXTURES / "sample_draft", dest)
    return dest


def run_helper(name: str, args: list[str]) -> subprocess.CompletedProcess:
    """Run a helper via `uv run --frozen python scripts/agent_helpers/<name>.py`."""
    return subprocess.run(
        ["uv", "run", "--frozen", "python",
         str(HELPERS_DIR / name), *args],
        capture_output=True, text=True,
        cwd=REPO_ROOT,
    )
```

- [ ] **Step 4.4: Verify conftest loads**

Run: `uv run --frozen pytest tests/conftest.py --collect-only -q`
Expected: no errors.

- [ ] **Step 4.5: Commit**

Commit message: `test: add fixtures for agent_helpers integration tests`
Files to add: `tests/conftest.py`, `tests/fixtures/sample_draft/SKILL.md`, `tests/fixtures/sample_draft/draft.json`

---

## Task 5: agent_helpers/_common.py

**Files:**
- Create: `scripts/agent_helpers/_common.py`
- Create: `tests/test_agent_helpers.py` (start the test file)

- [ ] **Step 5.1: Write failing test for emit_success behaviour**

Create `tests/test_agent_helpers.py`:

```python
"""Integration tests for agent_helpers scripts.

Each helper is exercised via subprocess (the same way production calls it).
No direct imports — helpers are plain scripts, not a package.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from tests.conftest import run_helper, HELPERS_DIR, REPO_ROOT


class TestCommonShape:
    """Smoke-test _common.py indirectly via a one-shot script invocation."""

    def test_emit_success_is_a_single_json_line(self, tmp_path):
        # Drop a tiny script next to _common.py that exercises emit_success.
        probe = HELPERS_DIR / "_probe_emit_success.py"
        probe.write_text(
            "import sys, pathlib\n"
            "sys.path.insert(0, str(pathlib.Path(__file__).parent))\n"
            "from _common import emit_success\n"
            "emit_success({'hello': 'world', 'n': 3})\n"
        )
        try:
            result = subprocess.run(
                ["uv", "run", "--frozen", "python", str(probe)],
                capture_output=True, text=True, cwd=REPO_ROOT,
            )
            assert result.returncode == 0, result.stderr
            assert result.stderr == ""
            assert json.loads(result.stdout) == {"hello": "world", "n": 3}
        finally:
            probe.unlink(missing_ok=True)

    def test_emit_failure_writes_to_stderr_exits_nonzero(self, tmp_path):
        probe = HELPERS_DIR / "_probe_emit_failure.py"
        probe.write_text(
            "import sys, pathlib\n"
            "sys.path.insert(0, str(pathlib.Path(__file__).parent))\n"
            "from _common import emit_failure\n"
            "emit_failure('TEST_CODE', step='probe', detail='boom')\n"
        )
        try:
            result = subprocess.run(
                ["uv", "run", "--frozen", "python", str(probe)],
                capture_output=True, text=True, cwd=REPO_ROOT,
            )
            assert result.returncode != 0
            err = json.loads(result.stderr)
            assert err == {"failure_code": "TEST_CODE",
                           "step": "probe",
                           "detail": "boom"}
            assert result.stdout == ""
        finally:
            probe.unlink(missing_ok=True)
```

Run: `uv run --frozen pytest tests/test_agent_helpers.py -v`
Expected: failure — `_common.py` doesn't exist yet (`ModuleNotFoundError`).

- [ ] **Step 5.2: Write `_common.py`**

Create `scripts/agent_helpers/_common.py`:

```python
"""Shared utilities for agent_helpers scripts.

These scripts are NOT a Python package. They are plain script files.
Each helper begins with a sys.path insert so it can `from _common import ...`
without an editable install or pyproject changes.

Output convention:
  - Success: a single JSON object on stdout, exit code 0
  - Failure: a single JSON object on stderr with at least
             {failure_code, step, detail}; exit code non-zero
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, NoReturn


def emit_success(payload: dict[str, Any]) -> None:
    """Emit a JSON success payload to stdout. Caller exits 0."""
    sys.stdout.write(json.dumps(payload, sort_keys=True) + "\n")
    sys.stdout.flush()


def emit_failure(code: str, *, step: str, detail: str) -> NoReturn:
    """Emit a JSON failure block to stderr and exit non-zero."""
    payload = {"failure_code": code, "step": step, "detail": detail}
    sys.stderr.write(json.dumps(payload, sort_keys=True) + "\n")
    sys.stderr.flush()
    raise SystemExit(1)


def skill_target_path(scope: str, name: str, org_id: str | None) -> Path:
    """Return the relative path under skills/ for the given scope/name."""
    if scope == "global":
        return Path("skills") / "global" / name
    if scope == "org":
        if not org_id:
            raise ValueError("org_id required when scope=org")
        return Path("skills") / "org" / org_id / name
    raise ValueError(f"unknown scope: {scope}")


def run_git(args: list[str], *, repo: Path) -> str:
    """Run a git command in the given repo, return stdout stripped."""
    result = subprocess.run(
        ["git", *args], cwd=repo, check=True,
        capture_output=True, text=True,
    )
    return result.stdout.strip()


def run_gh(args: list[str], *, repo: Path | None = None) -> subprocess.CompletedProcess:
    """Run gh; caller inspects returncode/stdout/stderr."""
    return subprocess.run(
        ["gh", *args], cwd=repo,
        capture_output=True, text=True,
    )
```

- [ ] **Step 5.3: Run tests**

Run: `uv run --frozen pytest tests/test_agent_helpers.py::TestCommonShape -v`
Expected: both tests pass.

- [ ] **Step 5.4: Commit**

Commit message: `feat(agent_helpers): add _common.py with emit/git/gh utilities + tests`
Files to add: `scripts/agent_helpers/_common.py`, `tests/test_agent_helpers.py`

---

## Task 6: agent_helpers/preflight.py

**Files:**
- Create: `scripts/agent_helpers/preflight.py`
- Modify: `tests/test_agent_helpers.py` (append TestPreflight)

- [ ] **Step 6.1: Append failing tests**

Append to `tests/test_agent_helpers.py`:

```python
class TestPreflight:
    def test_wrong_origin(self, tmp_path):
        repo = tmp_path / "wrong-origin"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", "-b", "main"], cwd=repo, check=True)
        subprocess.run(["git", "remote", "add", "origin",
                        "https://github.com/other/repo.git"],
                       cwd=repo, check=True)
        result = run_helper("preflight.py",
                            ["--repo-root", str(repo),
                             "--skip-tool-checks",
                             "--skip-remote-checks"])
        assert result.returncode != 0
        err = json.loads(result.stderr)
        assert err["failure_code"] == "PREREQ_REPO_NOT_FOUND"

    def test_dirty_tree(self, tmp_skills_repo):
        (tmp_skills_repo / "dirt").write_text("untracked\n")
        result = run_helper("preflight.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--skip-tool-checks",
                             "--skip-remote-checks"])
        assert result.returncode != 0
        err = json.loads(result.stderr)
        assert err["failure_code"] == "WORK_TREE_DIRTY"

    def test_clean_skipping_all(self, tmp_skills_repo):
        result = run_helper("preflight.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--skip-tool-checks",
                             "--skip-remote-checks"])
        assert result.returncode == 0, result.stderr
        data = json.loads(result.stdout)
        assert data["preflight_ok"] is True
```

- [ ] **Step 6.2: Write `preflight.py`**

Create `scripts/agent_helpers/preflight.py`:

```python
"""Pre-flight check: verify environment + repo state before any mutation."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import (  # noqa: E402
    emit_failure, emit_success, run_git, run_gh,
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--skip-tool-checks", action="store_true",
                        help="Skip gh/uv/permission checks (test escape hatch)")
    parser.add_argument("--skip-remote-checks", action="store_true",
                        help="Skip fetch/ancestor checks (test escape hatch)")
    args = parser.parse_args(argv)

    repo = args.repo_root.resolve()

    if not (repo / ".git").is_dir():
        emit_failure("PREREQ_REPO_NOT_FOUND",
                     step="repo_exists",
                     detail=f"{repo} is not a git repo")

    try:
        origin = run_git(["remote", "get-url", "origin"], repo=repo)
    except subprocess.CalledProcessError as e:
        emit_failure("PREREQ_REPO_NOT_FOUND",
                     step="get_origin",
                     detail=str(e))
    if "Project-A-Inc/project-a-skills" not in origin:
        emit_failure("PREREQ_REPO_NOT_FOUND",
                     step="origin_match",
                     detail=f"origin is '{origin}'")

    porcelain = run_git(["status", "--porcelain"], repo=repo)
    if porcelain:
        emit_failure("WORK_TREE_DIRTY",
                     step="status",
                     detail="uncommitted changes")

    if not args.skip_tool_checks:
        if subprocess.run(["gh", "--version"], capture_output=True).returncode != 0:
            emit_failure("PREREQ_GH_MISSING", step="gh_version",
                         detail="gh CLI not on PATH")
        if subprocess.run(["gh", "auth", "status"], capture_output=True).returncode != 0:
            emit_failure("PREREQ_GH_UNAUTH", step="gh_auth",
                         detail="gh auth login required")

        push_check = run_gh(
            ["api", "repos/Project-A-Inc/project-a-skills",
             "--jq", ".permissions.push"])
        if push_check.returncode != 0 or push_check.stdout.strip() != "true":
            emit_failure("PREREQ_NO_REPO_ACCESS",
                         step="gh_permission",
                         detail=f"push: {push_check.stdout.strip()!r}")

        if subprocess.run(["uv", "--version"], capture_output=True).returncode != 0:
            emit_failure("PREREQ_UV_MISSING", step="uv_version",
                         detail="uv not on PATH")

        cr_check = subprocess.run(
            ["uv", "run", "--frozen", "cr-skills", "--version"],
            cwd=repo, capture_output=True,
        )
        if cr_check.returncode != 0:
            emit_failure("PREREQ_UV_SYNC_NEEDED",
                         step="cr_skills_invoke",
                         detail=f"run 'uv sync' in {repo}")

    if not args.skip_remote_checks:
        try:
            subprocess.run(["git", "fetch", "--quiet", "origin", "main"],
                           cwd=repo, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            emit_failure("PREREQ_REPO_NOT_FOUND",
                         step="git_fetch",
                         detail=e.stderr.decode() if e.stderr else "fetch failed")
        head = run_git(["rev-parse", "HEAD"], repo=repo)
        upstream = run_git(["rev-parse", "origin/main"], repo=repo)
        if head != upstream:
            anc = subprocess.run(
                ["git", "merge-base", "--is-ancestor", upstream, head],
                cwd=repo, capture_output=True,
            )
            if anc.returncode != 0:
                emit_failure("BRANCH_BEHIND_MAIN",
                             step="ancestor_check",
                             detail="HEAD is not based on origin/main")

    emit_success({
        "preflight_ok": True,
        "origin": origin,
        "head": run_git(["rev-parse", "HEAD"], repo=repo),
    })


if __name__ == "__main__":
    main()
```

- [ ] **Step 6.3: Run tests**

Run: `uv run --frozen pytest tests/test_agent_helpers.py::TestPreflight -v`
Expected: all tests pass.

- [ ] **Step 6.4: Commit**

Commit message: `feat(agent_helpers): add preflight.py + tests`
Files to add: `scripts/agent_helpers/preflight.py`, `tests/test_agent_helpers.py`

---

## Task 7: agent_helpers/new_branch.py

**Files:**
- Create: `scripts/agent_helpers/new_branch.py`
- Modify: `tests/test_agent_helpers.py` (append TestNewBranch)

- [ ] **Step 7.1: Append failing tests**

```python
import re


class TestNewBranch:
    def test_create_global(self, tmp_skills_repo):
        result = run_helper("new_branch.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "global",
                             "--name", "pptx",
                             "--from-current-head"])
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["branch"] == "skills/global-pptx"

    def test_create_org_includes_org_id(self, tmp_skills_repo):
        result = run_helper("new_branch.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "org",
                             "--name", "weekly-report",
                             "--org-id", "acme-co",
                             "--from-current-head"])
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["branch"] == \
            "skills/org-acme-co-weekly-report"

    def test_update_has_date_and_hash(self, tmp_skills_repo):
        result = run_helper("new_branch.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "update",
                             "--scope", "global",
                             "--name", "pptx",
                             "--from-current-head"])
        assert result.returncode == 0, result.stderr
        branch = json.loads(result.stdout)["branch"]
        assert re.fullmatch(r"fix/pptx-\d{8}-[0-9a-f]{6}", branch)

    def test_remove(self, tmp_skills_repo):
        result = run_helper("new_branch.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "remove",
                             "--scope", "global",
                             "--name", "pptx",
                             "--from-current-head"])
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)["branch"] == "remove/pptx"

    def test_org_create_without_org_id_fails(self, tmp_skills_repo):
        result = run_helper("new_branch.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "org",
                             "--name", "x",
                             "--from-current-head"])
        assert result.returncode != 0
```

- [ ] **Step 7.2: Write `new_branch.py`**

Create `scripts/agent_helpers/new_branch.py`:

```python
"""Create the working branch.

Default: fetch + checkout main + pull --ff-only + checkout -b.
With --from-current-head: just `git checkout -b` from wherever HEAD is.
The --from-current-head mode is for pre-merge smoke testing — the
production agent-spawn path uses the default (fresh from origin/main).
"""
from __future__ import annotations

import argparse
import hashlib
import secrets
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import emit_failure, emit_success  # noqa: E402


def _make_branch(type_: str, scope: str, name: str,
                 org_id: str | None) -> str:
    if type_ == "create":
        if scope == "global":
            return f"skills/global-{name}"
        if scope == "org":
            if not org_id:
                raise ValueError("org_id required for org create")
            return f"skills/org-{org_id}-{name}"
        raise ValueError(f"unknown scope: {scope}")
    if type_ == "update":
        date = datetime.now(UTC).strftime("%Y%m%d")
        seed = f"{name}-{secrets.token_hex(4)}".encode()
        digest = hashlib.sha1(seed).hexdigest()[:6]
        return f"fix/{name}-{date}-{digest}"
    if type_ == "remove":
        return f"remove/{name}"
    raise ValueError(f"unknown type: {type_}")


def _branch_exists(repo: Path, candidate: str) -> bool:
    if subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet",
         f"refs/heads/{candidate}"],
        cwd=repo, capture_output=True,
    ).returncode == 0:
        return True
    return subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet",
         f"refs/remotes/origin/{candidate}"],
        cwd=repo, capture_output=True,
    ).returncode == 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--type", required=True,
                        choices=["create", "update", "remove"])
    parser.add_argument("--scope", required=True, choices=["global", "org"])
    parser.add_argument("--name", required=True)
    parser.add_argument("--org-id")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--from-current-head", action="store_true",
                        help=("branch from current HEAD instead of from "
                              "freshly fetched origin/main; used for "
                              "pre-merge smoke testing"))
    args = parser.parse_args(argv)

    if args.scope == "org" and not args.org_id:
        emit_failure("BAD_ARG", step="parse",
                     detail="--org-id required when --scope=org")

    repo = args.repo_root.resolve()

    try:
        base = _make_branch(args.type, args.scope, args.name, args.org_id)
    except ValueError as e:
        emit_failure("BAD_ARG", step="branch_name", detail=str(e))

    if not args.from_current_head:
        subprocess.run(["git", "fetch", "--quiet", "origin"],
                       cwd=repo, check=True)

    candidate = base
    suffix = 2
    while _branch_exists(repo, candidate):
        candidate = f"{base}-{suffix}"
        suffix += 1

    if args.dry_run:
        emit_success({"branch": candidate, "dry_run": True})
        return

    if not args.from_current_head:
        subprocess.run(["git", "checkout", "-q", "main"], cwd=repo, check=True)
        subprocess.run(["git", "pull", "--ff-only", "--quiet",
                        "origin", "main"], cwd=repo, check=True)
    subprocess.run(["git", "checkout", "-q", "-b", candidate],
                   cwd=repo, check=True)

    emit_success({"branch": candidate})


if __name__ == "__main__":
    main()
```

- [ ] **Step 7.3: Run tests**

Run: `uv run --frozen pytest tests/test_agent_helpers.py::TestNewBranch -v`
Expected: all tests pass.

- [ ] **Step 7.4: Commit**

Commit message: `feat(agent_helpers): add new_branch.py with org-aware naming + --from-current-head + tests`
Files to add: `scripts/agent_helpers/new_branch.py`, `tests/test_agent_helpers.py`

---

## Task 8: agent_helpers/place_draft.py

**Files:**
- Create: `scripts/agent_helpers/place_draft.py`
- Modify: `tests/test_agent_helpers.py` (append TestPlaceDraft)

- [ ] **Step 8.1: Append failing tests**

```python
class TestPlaceDraft:
    def test_create_global_places_and_commits(self, tmp_skills_repo, sample_draft):
        subprocess.run(["git", "checkout", "-q", "-b",
                        "skills/global-test-helper-sample"],
                       cwd=tmp_skills_repo, check=True)
        result = run_helper("place_draft.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "global",
                             "--name", "test-helper-sample",
                             "--draft", str(sample_draft),
                             "--skip-validate"])
        assert result.returncode == 0, result.stderr
        placed = tmp_skills_repo / "skills/global/test-helper-sample/SKILL.md"
        assert placed.exists()
        assert not (tmp_skills_repo / "skills/global/test-helper-sample/draft.json").exists()
        out = json.loads(result.stdout)
        assert "commit" in out

    def test_create_org_places_to_org_subdir(self, tmp_skills_repo, sample_draft):
        subprocess.run(["git", "checkout", "-q", "-b",
                        "skills/org-acme-co-test-helper-sample"],
                       cwd=tmp_skills_repo, check=True)
        result = run_helper("place_draft.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "org",
                             "--org-id", "acme-co",
                             "--name", "test-helper-sample",
                             "--draft", str(sample_draft),
                             "--skip-validate"])
        assert result.returncode == 0, result.stderr
        placed = tmp_skills_repo / "skills/org/acme-co/test-helper-sample/SKILL.md"
        assert placed.exists()

    def test_remove_deletes_folder(self, tmp_skills_repo):
        target = tmp_skills_repo / "skills" / "global" / "doomed"
        target.mkdir(parents=True)
        (target / "SKILL.md").write_text("placeholder\n")
        subprocess.run(["git", "add", "-A"], cwd=tmp_skills_repo, check=True)
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t",
                        "commit", "-q", "-m", "add doomed"],
                       cwd=tmp_skills_repo, check=True)
        subprocess.run(["git", "checkout", "-q", "-b", "remove/doomed"],
                       cwd=tmp_skills_repo, check=True)
        result = run_helper("place_draft.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "remove",
                             "--scope", "global",
                             "--name", "doomed",
                             "--skip-validate"])
        assert result.returncode == 0, result.stderr
        assert not target.exists()
```

- [ ] **Step 8.2: Write `place_draft.py`**

Create `scripts/agent_helpers/place_draft.py`:

```python
"""Copy draft into skills/<scope>/<...>/<name>/, validate, commit."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import (  # noqa: E402
    emit_failure, emit_success, run_git, skill_target_path,
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--type", required=True,
                        choices=["create", "update", "remove"])
    parser.add_argument("--scope", required=True, choices=["global", "org"])
    parser.add_argument("--name", required=True)
    parser.add_argument("--org-id")
    parser.add_argument("--draft", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-validate", action="store_true",
                        help="test escape hatch — skip cr-skills validate")
    args = parser.parse_args(argv)

    if args.scope == "org" and not args.org_id:
        emit_failure("BAD_ARG", step="parse",
                     detail="--org-id required when --scope=org")
    if args.type in {"create", "update"} and not args.draft:
        emit_failure("BAD_ARG", step="parse",
                     detail=f"--draft required for type={args.type}")

    repo = args.repo_root.resolve()
    target = repo / skill_target_path(args.scope, args.name, args.org_id)

    if args.dry_run:
        emit_success({"target": str(target), "dry_run": True})
        return

    if args.type in {"create", "update"}:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(args.draft, target)
        sidecar = target / "draft.json"
        if sidecar.exists():
            sidecar.unlink()
    else:  # remove
        if not target.exists():
            emit_failure("SKILL_NOT_FOUND", step="locate",
                         detail=f"{target} does not exist")
        subprocess.run(["git", "rm", "-rq",
                        str(target.relative_to(repo))],
                       cwd=repo, check=True)

    if args.type != "remove" and not args.skip_validate:
        cmd = ["uv", "run", "--frozen", "cr-skills", "validate", args.name,
               "--repo-root", str(repo),
               "--scope", args.scope]
        if args.org_id:
            cmd += ["--org", args.org_id]
        result = subprocess.run(cmd, cwd=repo, capture_output=True, text=True)
        if result.returncode != 0:
            emit_failure(
                "VALIDATION_REPO_SIDE_FAILED",
                step="cr_skills_validate",
                detail=(result.stderr.strip() or result.stdout.strip()
                        or "cr-skills validate failed"),
            )

    subprocess.run(["git", "add", "-A"], cwd=repo, check=True)
    msg_by_type = {
        "create": f"feat(skills): add {args.name}",
        "update": f"fix(skills): update {args.name}",
        "remove": f"chore(skills): remove {args.name}",
    }
    subprocess.run(
        ["git",
         "-c", f"user.email={os.environ.get('GIT_AUTHOR_EMAIL', 'bot@chatrevenue.ai')}",
         "-c", f"user.name={os.environ.get('GIT_AUTHOR_NAME', 'chatrevenue-skill-author')}",
         "commit", "-q", "-m", msg_by_type[args.type]],
        cwd=repo, check=True,
    )
    emit_success({
        "commit": run_git(["rev-parse", "HEAD"], repo=repo),
        "validated": "skipped" if args.skip_validate or args.type == "remove" else True,
    })


if __name__ == "__main__":
    main()
```

- [ ] **Step 8.3: Run tests**

Run: `uv run --frozen pytest tests/test_agent_helpers.py::TestPlaceDraft -v`
Expected: all tests pass.

- [ ] **Step 8.4: Commit**

Commit message: `feat(agent_helpers): add place_draft.py + tests (cr-skills with --repo-root/--scope/--org)`
Files to add: `scripts/agent_helpers/place_draft.py`, `tests/test_agent_helpers.py`

---

## Task 9: agent_helpers/open_pr.py

**Files:**
- Create: `scripts/agent_helpers/open_pr.py`
- Modify: `tests/test_agent_helpers.py` (append TestOpenPr)

- [ ] **Step 9.1: Append failing tests (dry-run only)**

```python
class TestOpenPr:
    def test_dry_run_substitutes_template(self, tmp_skills_repo):
        # Provide a minimal AGENT_GUIDE.md the helper can read.
        guide = tmp_skills_repo / "docs"
        guide.mkdir(exist_ok=True)
        (guide / "AGENT_GUIDE.md").write_text(
            "---\nagent_guide_version: 1\n---\n\n# G\n\n"
            "````markdown\n"
            "title={title} kind={kind} path={skill_path} "
            "name={name} orgs={org_segment} "
            "ver={plugin_version} sess={session_id}\n"
            "````\n"
        )
        subprocess.run(["git", "add", "-A"], cwd=tmp_skills_repo, check=True)
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t",
                        "commit", "-q", "-m", "guide"],
                       cwd=tmp_skills_repo, check=True)
        subprocess.run(["git", "checkout", "-q", "-b", "skills/global-foo"],
                       cwd=tmp_skills_repo, check=True)

        result = run_helper("open_pr.py",
                            ["--repo-root", str(tmp_skills_repo),
                             "--type", "create",
                             "--scope", "global",
                             "--name", "foo",
                             "--plugin-version", "0.1.0",
                             "--session-id", "test-session",
                             "--dry-run"])
        assert result.returncode == 0, result.stderr
        out = json.loads(result.stdout)
        assert out["dry_run"] is True
        assert out["title"] == "Add skill: foo"
        body = Path(out["body_file"]).read_text()
        assert "{title}" not in body and "{name}" not in body
        assert "Add skill: foo" in body
        assert "orgs=--scope global" in body
```

- [ ] **Step 9.2: Write `open_pr.py`**

Create `scripts/agent_helpers/open_pr.py`:

```python
"""Push the current branch and open a PR via gh."""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import (  # noqa: E402
    emit_failure, emit_success, run_git, skill_target_path,
)

TITLE_BY_TYPE = {
    "create": "Add skill: {name}",
    "update": "Update skill: {name}",
    "remove": "Remove skill: {name}",
}

KIND_BY_TYPE = {
    "create": "Create new skill",
    "update": "Update existing skill",
    "remove": "Remove existing skill",
}


def _read_template_from_guide(guide_path: Path) -> str:
    text = guide_path.read_text(encoding="utf-8")
    m = re.search(r"^````markdown\n(.*?)\n````$", text, re.M | re.S)
    if not m:
        raise ValueError(
            f"no ````markdown ... ```` automated PR body block in {guide_path}")
    return m.group(1)


def _substitute(template: str, *, title: str, kind: str,
                skill_path: str, name: str, scope: str,
                org_id: str | None, plugin_version: str,
                session_id: str) -> str:
    org_segment = f"--scope {scope}"
    if org_id:
        org_segment += f" --org {org_id}"
    subs = {
        "{title}": title,
        "{kind}": kind,
        "{skill_path}": skill_path,
        "{name}": name,
        "{org_segment}": org_segment,
        "{plugin_version}": plugin_version,
        "{session_id}": session_id,
    }
    body = template
    for marker, value in subs.items():
        body = body.replace(marker, value)
    return body


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--type", required=True,
                        choices=["create", "update", "remove"])
    parser.add_argument("--scope", required=True, choices=["global", "org"])
    parser.add_argument("--name", required=True)
    parser.add_argument("--org-id")
    parser.add_argument("--plugin-version", default="0.0.0")
    parser.add_argument("--session-id", default="unknown")
    parser.add_argument("--target-repo",
                        default="Project-A-Inc/project-a-skills",
                        help="override for sandbox testing")
    parser.add_argument("--draft-pr", action="store_true",
                        help="open as draft (no reviewer notifications)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.scope == "org" and not args.org_id:
        emit_failure("BAD_ARG", step="parse",
                     detail="--org-id required when --scope=org")

    repo = args.repo_root.resolve()
    branch = run_git(["symbolic-ref", "--short", "HEAD"], repo=repo)
    title = TITLE_BY_TYPE[args.type].format(name=args.name)
    kind = KIND_BY_TYPE[args.type]
    skill_path = str(
        skill_target_path(args.scope, args.name, args.org_id))

    try:
        template = _read_template_from_guide(repo / "docs" / "AGENT_GUIDE.md")
    except (FileNotFoundError, ValueError) as e:
        emit_failure("AGENT_GUIDE_VERSION_MISMATCH",
                     step="read_guide_template",
                     detail=str(e))

    body = _substitute(
        template, title=title, kind=kind, skill_path=skill_path,
        name=args.name, scope=args.scope, org_id=args.org_id,
        plugin_version=args.plugin_version, session_id=args.session_id,
    )

    body_fh = tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8")
    body_fh.write(body)
    body_fh.close()

    if args.dry_run:
        emit_success({
            "dry_run": True,
            "branch": branch,
            "title": title,
            "body_file": body_fh.name,
            "target_repo": args.target_repo,
            "draft": args.draft_pr,
        })
        return

    push = subprocess.run(
        ["git", "push", "-u", "origin", branch],
        cwd=repo, capture_output=True, text=True,
    )
    if push.returncode != 0:
        emit_failure("GH_PR_CREATE_FAILED", step="git_push",
                     detail=push.stderr.strip())

    gh_args = ["gh", "pr", "create",
               "--repo", args.target_repo,
               "--title", title,
               "--body-file", body_fh.name,
               "--base", "main",
               "--head", branch]
    if args.draft_pr:
        gh_args.append("--draft")
    pr_result = subprocess.run(gh_args, cwd=repo,
                               capture_output=True, text=True)
    if pr_result.returncode != 0:
        emit_failure("GH_PR_CREATE_FAILED", step="gh_pr_create",
                     detail=pr_result.stderr.strip())

    url = pr_result.stdout.strip().splitlines()[-1]
    emit_success({
        "pr_url": url,
        "branch": branch,
        "draft": args.draft_pr,
    })


if __name__ == "__main__":
    main()
```

- [ ] **Step 9.3: Run tests**

Run: `uv run --frozen pytest tests/test_agent_helpers.py::TestOpenPr -v`
Expected: dry-run test passes.

- [ ] **Step 9.4: Commit**

Commit message: `feat(agent_helpers): add open_pr.py + dry-run tests (template from AGENT_GUIDE)`
Files to add: `scripts/agent_helpers/open_pr.py`, `tests/test_agent_helpers.py`

---

## Task 10: CI workflow update

**Files:**
- Modify: `.github/workflows/validate-pr.yml`

- [ ] **Step 10.1: Extend the `paths:` filter**

Open `.github/workflows/validate-pr.yml`. In the trigger filter (probably under `on.pull_request.paths` or similar), ensure these globs are present:

```yaml
paths:
  - skills/**
  - src/**
  - tests/**
  - scripts/**     # NEW — helper changes must run lint/tests
  - docs/**        # NEW — AGENT_GUIDE changes affect contract
  - pyproject.toml
  - uv.lock
```

- [ ] **Step 10.2: Extend ruff coverage**

Find the `ruff check` step. Update its args to include `scripts/`:

```yaml
- run: uv run --frozen ruff check src/ tests/ scripts/
```

- [ ] **Step 10.3: Verify ruff clean locally**

Run: `uv run --frozen ruff check src/ tests/ scripts/`
Expected: no warnings. If anything trips, fix inline (most likely E402 from the `sys.path` insert before `from _common import …` — already mitigated with `# noqa: E402` in each helper).

- [ ] **Step 10.4: Commit**

Commit message: `ci: include scripts/ and docs/ in validate-pr triggers; lint scripts/ too`
Files to add: `.github/workflows/validate-pr.yml`

---

## Task 11: CONTRIBUTING.md update — branch-naming convention

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 11.1: Locate the PR-workflow branch-naming section**

Run: `grep -n "Branch naming" CONTRIBUTING.md`

- [ ] **Step 11.2: Update the convention block**

Replace the existing branch-naming line with this expanded form:

```markdown
- **Branch naming:**
  - New skill, global: `skills/global-<name>` (e.g. `skills/global-pptx`)
  - New skill, org:    `skills/org-<org_id>-<name>` (e.g. `skills/org-acme-co-pptx`)
  - Update (manual):   `fix/<name>`
  - Update (automated, via `chatrevenue-skill-author` plugin): `fix/<name>-YYYYMMDD-<6-char-hash>` — the suffix avoids collision when multiple updates are queued on the same day
  - Deletion: `remove/<name>`
```

- [ ] **Step 11.3: Commit**

Commit message: `docs(contributing): document org-create and automation-suffixed branch naming`
Files to add: `CONTRIBUTING.md`

---

## Task 12: End-to-end smoke test on the current feature branch

**Goal:** Exercise the full helper chain pre-merge, while `scripts/agent_helpers/` and `docs/AGENT_GUIDE.md` still exist on the working branch.

**Files:** none new — uses `--from-current-head` to avoid `git checkout main` (which would wipe the helpers since they aren't merged yet).

- [ ] **Step 12.1: Build a throwaway draft locally**

```bash
mkdir -p /tmp/draft-smoke
cat > /tmp/draft-smoke/SKILL.md <<'EOF'
---
name: smoke-test-temporary
description: >
  Temporary smoke-test skill for chatrevenue-skill-author agent_helpers
  end-to-end verification. Trigger on smoke-test-only phrases. This skill
  will be removed before merge.
scope: global
version: 0.0.1
---

# Smoke test temporary

This skill exists only to verify the agent_helpers chain. It will be removed
in the same review cycle.
EOF
```

- [ ] **Step 12.2: Run the chain with --from-current-head**

```bash
uv run --frozen python scripts/agent_helpers/preflight.py --repo-root "$(pwd)"

uv run --frozen python scripts/agent_helpers/new_branch.py \
  --repo-root "$(pwd)" \
  --type create --scope global --name smoke-test-temporary \
  --from-current-head

uv run --frozen python scripts/agent_helpers/place_draft.py \
  --repo-root "$(pwd)" \
  --type create --scope global --name smoke-test-temporary \
  --draft /tmp/draft-smoke

uv run --frozen python scripts/agent_helpers/open_pr.py \
  --repo-root "$(pwd)" \
  --type create --scope global --name smoke-test-temporary \
  --plugin-version 0.0.0-smoke --session-id smoke \
  --draft-pr
```

Expected: each step emits JSON on stdout, exits 0. Final step prints `{"pr_url": "https://...", ...}`. Capture the URL.

- [ ] **Step 12.3: Verify the PR appears (and wait for CI)**

Open the URL. Confirm:
- It is marked **Draft** (no reviewer notifications)
- Title is `Add skill: smoke-test-temporary`
- Body has all substitutions applied (no `{...}` markers left)
- Files added match what was placed

Note: `--draft` only suppresses *notifications*; CI still runs on push. Wait for `validate-pr` to finish on the smoke PR to confirm it passes validator end-to-end (this is the actual production-side verification we want).

- [ ] **Step 12.4: Close + delete the smoke-test PR**

```bash
PR_URL="<url-from-step-12.2>"
PR_NUM=$(basename "$PR_URL")
gh pr close --repo Project-A-Inc/project-a-skills "$PR_NUM" --delete-branch
```

- [ ] **Step 12.5: Local cleanup**

```bash
git checkout <your-feature-branch>   # return from the smoke branch
git branch -D skills/global-smoke-test-temporary 2>/dev/null || true
rm -rf /tmp/draft-smoke
```

---

## Task 13: Open the implementation PR

- [ ] **Step 13.1: Verify everything**

```bash
uv sync --frozen
uv run --frozen pytest -q
uv run --frozen ruff check src/ tests/ scripts/
```

Expected: all green.

- [ ] **Step 13.2: Open the PR**

Title: `feat(agent-helpers): add Level 2 contract for chatrevenue-skill-author plugin`

Body should summarise:
- The new `AGENT_GUIDE.md` v1
- Four Python helper scripts (preflight, new_branch, place_draft, open_pr)
- The manual PR template
- The `CLAUDE.md` cross-link
- The `CONTRIBUTING.md` branch-naming update
- CI extension (`scripts/**`, `docs/**`, ruff over `scripts/`)
- Link to the design doc at `chatrevenue-marketplace/design_docs/2026-05-27-chatrevenue-skill-author-design.md`
- Link to this plan file
- Note: smoke-test PR (from Task 12) was a draft and is closed.

- [ ] **Step 13.3: After merge, move this plan file**

In the `chatrevenue-marketplace` repo (separate from this one), move
`engineering_plans/drafts/2026-05-27-project-a-skills-agent-guide.md` →
`engineering_plans/done/2026-05-27-project-a-skills-agent-guide.md`.

---

## Coverage check

Spec → tasks:

| Design § | Implemented by |
|---|---|
| §6.1 AGENT_GUIDE.md (incl. Automated PR template) | Task 1 |
| §6.2 helpers as plain scripts | Tasks 5–9 |
| §6.3 manual PR template | Task 2 |
| §6.4 CLAUDE.md update | Task 3 |
| §6.5 agent_guide_version | Task 1 (set to 1) |
| §6.6 Automated PR template, single source of truth | Task 1 + Task 9 |
| §6.7 smoke test against draft-PR + immediate close | Task 12 (uses `--from-current-head` to keep helpers on disk pre-merge) |
| §8 pre-flight check 9 (`uv sync` done) | Task 6 |
| §9 branch naming (incl. org case) | Task 7 |
| §10 validation Layer B (with `--repo-root --scope --org`) | Task 8 |
| §11 escalation codes (JSON failure_code on stderr) | Tasks 6–9 |

Sasha review responses (round 1 + round 2):

| Round/# | Item | Addressed in |
|---|---|---|
| 1/1 | bash on Windows | All helpers are Python scripts, no shell-specific tools |
| 1/2 | repo-root not passed to cr-skills | Task 8 |
| 1/3 | cr-skills validate scope ambiguity | Task 8 |
| 1/4 | test escape hatches | Task 6 (`--skip-tool-checks`, `--skip-remote-checks`) |
| 1/5 | org branch naming | Task 7 |
| 1/6 | PR template split | Task 1 (Automated) vs Task 2 (manual) |
| 1/7 | validator wording | Task 1 |
| 1/8 | smoke test on production | Task 12 (`--draft-pr`, immediate close, CI runs on draft) |
| 2/A | pyproject leak / wheel pollution | scripts-as-files, no `pyproject.toml` change, no `uv.lock` regen |
| 2/B | smoke test ordering | Task 7 adds `--from-current-head`; Task 12 uses it |
| 2/C | `{scope}` marker check | Removed from Task 1 Step 1.3 verification |
| 2/D | `NoReturn` import | Task 5 (`_common.py` imports `Any, NoReturn`) |
| 2/minor — CI paths | Task 10 |
| 2/minor — ruff scripts/ | Task 10 |
| 2/minor — `__main__.py` | Removed from File Structure |
| 2/minor — `--frozen` consistency | All `uv run` calls use `--frozen` |
| 2/minor — CONTRIBUTING.md drift | Task 11 |
