# Vendor the `langgraph_cli` trace tool into `project-a-skills` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor a faithful, do-not-edit-locally mirror of the agent team's `langgraph_cli` trace tool into `project-a-skills/tools/langgraph_cli/`, gitignore its secrets/output, and record the vendored-mirror decision in `CLAUDE.md` and a new ADR.

**Architecture:** This is the `project-a-skills` half of the `chatrevenue-analyze-chat` feature (design doc `chatrevenue-marketplace/design_docs/2026-06-08-chatrevenue-analyze-chat-design.md`, §4, §5.1, §8). The tool is **copied** from the canonical `project-a-common` source — never forked, never edited locally — matching the "mirror, never fork" posture of the validator (`nextcrm-agents` ADR 0009). The tool itself needs **zero code changes**; the work is copy + gitignore + two docs (CLAUDE.md note, ADR). The skill that drives this tool lives in the *other* repo (`chatrevenue-marketplace`) and is out of scope here.

**Tech Stack:** Python 3.13 tool (runs in its own `uv` env, isolated from this repo's 3.11+ env), `langsmith` / `langgraph-sdk` / `typer` / `rich` / `python-dotenv`. Git (Windows; PowerShell shell with Bash available).

---

## Canonical source (the mirror origin)

- **Source path (read-only — do NOT edit):** `C:\oieremchuk\projects\nextcrm-agents\nextcrm_assistant\_common\tools\langgraph_cli\` — the `project-a-common` submodule mount inside `nextcrm-agents`. The same tree is also at `C:\oieremchuk\projects\project-a-common\tools\langgraph_cli\`.
- **Canonical repo:** `project-a-common`, HEAD `cd72725` at sync time; the tool's last-touched commit is `8bf1fad` ("langgraph_cli: prefer LANGSMITH_API_KEY over bearer token for LangGraph auth (#24)").
- **Git-tracked files to mirror (exactly these 7 — confirmed via `git ls-files`):**
  - `.env.example`
  - `.gitignore`
  - `README.md`
  - `langgraph_cli/__init__.py`
  - `langgraph_cli/cli.py`
  - `pyproject.toml`
  - `uv.lock`
- **Explicitly NOT copied:** `.env` (real creds — provided separately by the team, gitignored), `.venv/`, `__pycache__/`. These are untracked local artifacts, not part of the mirror.

## File structure (what this plan creates / modifies in `project-a-skills`)

- **Create** `tools/langgraph_cli/` — the vendored mirror (7 files above). One responsibility: a self-contained copy of the canonical trace tool that runs under its own `uv` env.
- **Modify** `.gitignore` — add `tools/langgraph_cli/.env` and `trace_dumps/` so creds and dumps are never committed.
- **Modify** `CLAUDE.md` — add a short "vendored mirror — sync from project-a-common, don't edit locally" note.
- **Create** `docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md` — the ADR.
- **Modify** `docs/architecture/decisions/README.md` — append row 0006 to the ADR index table.

All paths below are relative to the repo root `C:\oieremchuk\projects\project-a-skills` unless absolute.

---

### Task 1: Vendor the tool (faithful mirror copy)

**Files:**
- Create: `tools/langgraph_cli/.env.example`
- Create: `tools/langgraph_cli/.gitignore`
- Create: `tools/langgraph_cli/README.md`
- Create: `tools/langgraph_cli/langgraph_cli/__init__.py`
- Create: `tools/langgraph_cli/langgraph_cli/cli.py`
- Create: `tools/langgraph_cli/pyproject.toml`
- Create: `tools/langgraph_cli/uv.lock`

- [ ] **Step 1: Copy only the git-tracked files from the canonical source**

Run (Bash tool — uses `git archive` so untracked `.env`/`.venv`/`__pycache__` are structurally excluded, guaranteeing a clean mirror):

```bash
SRC="C:/oieremchuk/projects/nextcrm-agents/nextcrm_assistant/_common"
DEST="C:/oieremchuk/projects/project-a-skills/tools/langgraph_cli"
mkdir -p "$DEST"
git -C "$SRC" archive HEAD tools/langgraph_cli \
  | tar -x -C "$DEST" --strip-components=2
```

`--strip-components=2` drops the leading `tools/langgraph_cli/` so files land directly under `$DEST`.

PowerShell alternative (if Bash/tar unavailable):
```powershell
$src = "C:\oieremchuk\projects\nextcrm-agents\nextcrm_assistant\_common\tools\langgraph_cli"
$dest = "C:\oieremchuk\projects\project-a-skills\tools\langgraph_cli"
New-Item -ItemType Directory -Force "$dest\langgraph_cli" | Out-Null
foreach ($f in '.env.example','.gitignore','README.md','pyproject.toml','uv.lock') {
  Copy-Item "$src\$f" "$dest\$f" -Force
}
foreach ($f in '__init__.py','cli.py') {
  Copy-Item "$src\langgraph_cli\$f" "$dest\langgraph_cli\$f" -Force
}
```

- [ ] **Step 2: Verify the vendored tree is byte-for-byte identical to the source and contains no creds**

Run:
```bash
SRC="C:/oieremchuk/projects/nextcrm-agents/nextcrm_assistant/_common/tools/langgraph_cli"
DEST="C:/oieremchuk/projects/project-a-skills/tools/langgraph_cli"
# 1. Every tracked file matches the source exactly (excludes .venv/__pycache__/.env):
for f in .env.example .gitignore README.md pyproject.toml uv.lock langgraph_cli/__init__.py langgraph_cli/cli.py; do
  diff "$SRC/$f" "$DEST/$f" && echo "OK $f" || echo "MISMATCH $f"
done
# 2. No real .env, no venv, no pycache leaked in:
ls -la "$DEST"; ls -la "$DEST/langgraph_cli"
```
Expected: seven `OK <file>` lines, zero `MISMATCH`. The `ls` shows exactly the 7 mirrored files (plus the `langgraph_cli/` dir) — **no `.env`, no `.venv`, no `__pycache__`**.

- [ ] **Step 3: Confirm git would stage only the intended files (and never `.env`)**

Run:
```bash
git -C "C:/oieremchuk/projects/project-a-skills" status --porcelain tools/
```
Expected: untracked entries for the 7 vendored files only. If any `.env` or `__pycache__` appears, stop — Task 2's gitignore must land before committing (it covers `.env`; `__pycache__` is already covered by the repo's root `.gitignore`).

- [ ] **Step 4: Commit the vendored mirror**

```bash
cd "C:/oieremchuk/projects/project-a-skills"
git add tools/langgraph_cli
git commit -m "feat(tools): vendor langgraph_cli trace tool (mirror of project-a-common)"
```

---

### Task 2: Gitignore secrets and dump output

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append vendored-tool ignores to the repo `.gitignore`**

The repo root `.gitignore` already ignores `.env` (bare) and `__pycache__/`, but add the **explicit, path-scoped** entries the design (§9 "Storing/committing dumps", §11) calls out so intent is unambiguous and `trace_dumps/` is covered. Add this block to the end of `.gitignore`:

```gitignore

# Vendored langgraph_cli tool — creds + trace dump output (chatrevenue-analyze-chat)
tools/langgraph_cli/.env
trace_dumps/
```

- [ ] **Step 2: Verify a planted `.env` and `trace_dumps/` are ignored**

Run:
```bash
cd "C:/oieremchuk/projects/project-a-skills"
git check-ignore -v tools/langgraph_cli/.env trace_dumps/whatever.txt
```
Expected: two lines, each naming `.gitignore` and the matching pattern (i.e. both paths ARE ignored). If `git check-ignore` prints nothing for a path, that path is NOT ignored — fix the pattern.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(gitignore): ignore vendored langgraph_cli .env and trace_dumps/"
```

---

### Task 3: CLAUDE.md vendored-mirror note

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Insert a "Vendored tools" section after the "Automated agents" section**

Find this anchor in `CLAUDE.md`:

```markdown
## Automated agents (chatrevenue-skill-author plugin)

If you have been spawned by the `chatrevenue-skill-author` Cowork plugin to
ship a skill draft into this repo, read `docs/AGENT_GUIDE.md` first and use
only `scripts/agent_helpers/*.py` (via `uv run --frozen python scripts/agent_helpers/<name>.py`)
to mutate the repo. Do not invoke `git` or `gh` directly in that context.

## Soft rules — prefer this unless user asks otherwise
```

Insert the new section between the "Automated agents" block and "## Soft rules", so the result reads:

```markdown
## Automated agents (chatrevenue-skill-author plugin)

If you have been spawned by the `chatrevenue-skill-author` Cowork plugin to
ship a skill draft into this repo, read `docs/AGENT_GUIDE.md` first and use
only `scripts/agent_helpers/*.py` (via `uv run --frozen python scripts/agent_helpers/<name>.py`)
to mutate the repo. Do not invoke `git` or `gh` directly in that context.

## Vendored tools

`tools/langgraph_cli/` is a **vendored mirror** of the agent team's trace tool,
canonical source `project-a-common/tools/langgraph_cli/` (used by the
`chatrevenue-analyze-chat` skill to fetch LangSmith trace dumps). It is a
**mirror, never a fork** — same posture as the validator (`nextcrm-agents` ADR
0009): do **not** edit it locally to add or change behavior. When the canonical
tool changes, re-sync the copy; drift is a sync task, not a local edit. The tool
runs in its own `uv` env (Python 3.13) — it does not affect this repo's 3.11+
env. Its `.env` (real LangSmith creds, provided separately by the team) and the
`trace_dumps/` output are gitignored and never committed. See ADR
[`0006-vendored-langgraph-cli-mirror`](docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md).

## Soft rules — prefer this unless user asks otherwise
```

- [ ] **Step 2: Verify the note is present and the heading order is intact**

Run:
```bash
cd "C:/oieremchuk/projects/project-a-skills"
grep -n "## Vendored tools" CLAUDE.md
grep -n "mirror, never a fork" CLAUDE.md
```
Expected: both grep lines match (non-empty output).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): note langgraph_cli is a vendored mirror, do not edit locally"
```

---

### Task 4: ADR — vendored-mirror decision

**Files:**
- Create: `docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md`
- Modify: `docs/architecture/decisions/README.md`

- [ ] **Step 1: Write the ADR**

Create `docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md` with exactly this content (format matches existing ADRs 0001–0005: H1 `NNNN — title`, then Status/Date/Source bullets, then Context / Decision / Consequences):

```markdown
# 0006 — The `langgraph_cli` trace tool is a vendored mirror, not a fork

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `chatrevenue-marketplace/design_docs/2026-06-08-chatrevenue-analyze-chat-design.md` §4, §5.1, §8; mirrors `nextcrm-agents` ADR 0009 ("mirror, never fork").

## Context

The `chatrevenue-analyze-chat` skill (shipping in the `chatrevenue-skill-author`
Cowork plugin, in `chatrevenue-marketplace`) lets a skill author fetch and
analyze a real agent conversation. Fetching the dump needs the agent team's
`langgraph_cli` tool (entry point `langgraph-tool`), whose canonical home is
`project-a-common/tools/langgraph_cli/` (mounted in `nextcrm-agents` as the
`_common` submodule).

Authors have only `project-a-skills` + the plugin — not `nextcrm-agents`, not the
`project-a-common` submodule. So the tool and its credentials are out of reach.
The capability has to live where the authors already are. Three ways to get it
there: pull it via a submodule, publish it to the Azure feed (as `cr-skills-cli`
is), or vendor a copy into this repo.

## Decision

**Vendor the tool as a copy under `tools/langgraph_cli/`, treated as a mirror of
the canonical `project-a-common` source — never a fork.**

- The copy is the git-tracked file set of the canonical tool (`langgraph_cli/`,
  `pyproject.toml`, `uv.lock`, `README.md`, `.env.example`, `.gitignore`). The
  real `.env` (LangSmith creds) is provided separately by the team and is
  gitignored; trace dumps land in a gitignored `trace_dumps/`.
- The mirror is **not edited locally** to add or change behavior — same posture
  as this repo's validator vs. `crma_skills.validator` (`nextcrm-agents` ADR
  0009). When the canonical tool changes, the copy is **re-synced**; drift is a
  manual sync task, recorded in `CLAUDE.md`'s "Vendored tools" note.
- The tool runs in its **own `uv` env (Python 3.13)**, isolated from this repo's
  3.11+ environment — vendoring it does not change this repo's runtime deps or
  CI env.

Submodule was rejected: it would expose the whole `project-a-common` tree and its
auth to the author environment, the opposite of the isolation goal. Publishing to
the Azure feed is the clean long-term path and can replace vendoring later
**without changing the skill's UX** — it was deferred to avoid standing up a new
publish pipeline now (design §4).

## Consequences

- Authors get the trace capability with no extra repo, no submodule, no feed —
  just `project-a-skills` + a provided `.env`.
- The copy can drift from canonical. Mitigated, not eliminated: the "mirror,
  never fork" rule in `CLAUDE.md` makes re-sync (not local patching) the only
  sanctioned way to change it; sync is manual (design §9 non-goal: no automatic
  mirror sync).
- This repo stays 3.11+; the 3.13 tool is sandboxed in its own `uv` env, so its
  heavier deps (`langsmith`, `langgraph-sdk`) never enter this repo's CI env.
- Reversible by design: swapping vendoring for the Azure feed later is a
  UX-neutral change and would be its own superseding ADR.
```

- [ ] **Step 2: Append the 0006 row to the ADR index table**

In `docs/architecture/decisions/README.md`, find the table ending:

```markdown
| 0005 | The agent contract is gated by an integer `agent_guide_version` | accepted |
```

Add one row immediately below it:

```markdown
| 0006 | The `langgraph_cli` trace tool is a vendored mirror, not a fork | accepted |
```

- [ ] **Step 3: Verify ADR file and index row exist**

Run:
```bash
cd "C:/oieremchuk/projects/project-a-skills"
ls docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md
grep -n "| 0006 |" docs/architecture/decisions/README.md
```
Expected: the `ls` prints the path (file exists); the `grep` prints the new table row.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/decisions/0006-vendored-langgraph-cli-mirror.md docs/architecture/decisions/README.md
git commit -m "docs(adr): 0006 vendored langgraph_cli mirror decision"
```

---

### Task 5: Whole-repo verification (no regressions, no leaked secrets)

**Files:** none (verification only)

- [ ] **Step 1: The tool is smoke-runnable under its own `uv` env**

This is optional and network-free (`--help` makes no API call). Skip if `uv` cannot provision Python 3.13 offline; it is not a gate on the vendoring.

Run (Bash):
```bash
cd "C:/oieremchuk/projects/project-a-skills/tools/langgraph_cli"
uv run langgraph-tool --help
```
Expected: the Typer help text listing `trace` (and `assistant`) commands. Confirms the mirror is internally consistent (entry point resolves, imports load).

- [ ] **Step 2: This repo's own checks are unaffected**

The vendored tool lives outside `src/` and `tests/`, so it must not change this repo's lint/test/validate results. Run from repo root:

```bash
cd "C:/oieremchuk/projects/project-a-skills"
uv run --active ruff check src/ tests/
uv run --active pytest -q
uv run --active cr-skills validate create-chatrevenue-skill
```
Expected: ruff clean; pytest passes (coverage thresholds intact); validate prints `OK: validated 1 skill(s)`. None of these should reference `tools/langgraph_cli`.

- [ ] **Step 3: Final secret-leak gate — nothing sensitive is staged or committed**

Run:
```bash
cd "C:/oieremchuk/projects/project-a-skills"
git ls-files tools/langgraph_cli
git ls-files | grep -E "(\.env$|trace_dumps/)" && echo "LEAK — investigate" || echo "clean: no .env / trace_dumps tracked"
```
Expected: `git ls-files tools/langgraph_cli` lists exactly the 7 mirrored files (NOT `.env`); the second command prints `clean: no .env / trace_dumps tracked`.

- [ ] **Step 4: Push the branch and open a PR**

```bash
cd "C:/oieremchuk/projects/project-a-skills"
git push -u origin HEAD
gh pr create --fill
```
PR description must include: summary, list of changes (vendored 7-file mirror, gitignore, CLAUDE.md note, ADR 0006), the canonical sync point (`project-a-common` `cd72725`, tool commit `8bf1fad`), assumptions, test plan (Task 5 results), and the non-goals deferred (the skill itself + Azure-feed publish live elsewhere / are deferred). Squash-merge into the target branch.

---

## Assumptions

- `# ASSUMPTION:` The mirror set is the **git-tracked** files of the canonical tool (7 files), not the local working tree (which also has untracked `.env`, `.venv/`, `__pycache__/`). Verified via `git ls-files tools/langgraph_cli/` against both `project-a-common` and the `_common` submodule mount — identical.
- `# ASSUMPTION:` The tool needs **no code changes** to run in `project-a-skills` (per the task brief and design §5: pure copy, runs via `uv` in its own env). Task 5 Step 1 smoke-tests this without hitting the network.
- `# ASSUMPTION:` The tool's own `.gitignore` is part of the faithful mirror and is copied. The repo-root `.gitignore` additions (Task 2) are what actually protect `tools/langgraph_cli/.env` and `trace_dumps/` at the repo level; the nested one is mirrored for fidelity but not relied upon.

## Non-goals (this plan)

- The `chatrevenue-analyze-chat` **skill** itself (SKILL.md + references) — lives in `chatrevenue-marketplace`, a separate plan.
- Publishing the tool to the **Azure feed** — deferred (design §4), a future UX-neutral swap that would be its own superseding ADR.
- **Automatic** mirror sync — sync is manual (design §9).
- Any edit to the tool's code, or to this repo's validator rules / CI structure (CLAUDE.md hard rules).
- Folding a `tools/` reference into `docs/architecture/architecture.md` references — the design scopes documentation of this decision to `CLAUDE.md` + the ADR; an architecture-reference doc can follow in a later accept-and-document pass if desired, and is not part of this task.
