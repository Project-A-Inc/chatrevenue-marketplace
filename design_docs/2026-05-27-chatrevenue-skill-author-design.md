# chatrevenue-skill-author — design

**Status:** draft, pending review
**Date:** 2026-05-27
**Revised:** 2026-06-08 — worker support folded in (see §1.1 and ADR 0003 in `nextcrm-agents`)
**Revised:** 2026-06-08 — **Variant 1 hybrid handoff** (see §1.2); supersedes the auto-spawn mechanism in §5.2, §7.1 step 6–7, §7.4, and the env half of §8/§11
**Author flow:** brainstormed via Cowork (`superpowers:brainstorming`)
**Target plugin path:** `chatrevenue-marketplace/plugins/chatrevenue-skill-author/`
**Depends on:** `project-a-skills` (Level 2 repo-side artifacts; see §6) + the worker-cadence frontmatter contract (see §1.1)

---

## 1. Summary

`chatrevenue-skill-author` is a Cowork plugin that lets non-technical members of the ChatRevenue team (PM / sales / support) create, update, and remove ChatRevenue agent skills — **including workers** (skills that run on their own on a recurring cadence) — through a chat dialog, **without ever seeing git, branches, pull requests, or the Claude Code CLI**.

The plugin takes the user from an informal request ("I want the agent to handle returns questions", or "every morning, draft me the day's priorities") through a guided dialog to a published pull request in `Project-A-Inc/project-a-skills`. The user's last on-screen artifact is a clickable PR URL with an explanation of what to do next.

Git mechanics run through Claude Code on the user's native machine — **as of the 2026-06-08 Variant 1 revision (§1.2), via a paste-able handoff the user runs in their own Claude Code session**, not an auto-spawned subprocess (the original auto-spawn can't work on the Cowork-on-Windows sandbox). The plugin itself is pure markdown — no MCP server, no JavaScript bundle, no esbuild.

### 1.1 Workers are executable skills (added 2026-06-08)

This design originally covered plain skills only. The agent runtime has since settled the **Worker** model (`nextcrm-agents` ADR 0003, 2026-06-05): **a Worker is any skill with `executable: true`** — there is no separate "schedulable" concept. Cadence is two optional integer fields in minutes, not a cron expression:

```yaml
executable: true
interval_online_min: 30       # how often it runs while the user is active;  optional, agent default 30
interval_offline_min: 240     # how often it runs while the user is away;     optional, agent default 240
```

The legacy `schedule: "<cron>"` field is **retired** — the CLI accepts-and-warns on it during the migration window but never emits it. The authoritative frontmatter contract lives in `project-a-skills/docs/specs/2026-06-04-worker-cadence-frontmatter-design.md` (which mirrors `nextcrm-agents/design_docs/2026-06-04-presence-aware-worker-dispatch-design.md`).

Consequence for this plugin: the authoring dialog must be able to produce these fields (§7.1, §10), `draft.json` must carry them (§7.3), and the user-facing vocabulary must describe "runs on its own / how often" without ever saying `executable`, `cron`, `interval`, `enroll`, or `dispatcher` (§12). Enrolment itself (turning a worker on for a given user) is **out of scope** — it happens in the agent/UI, not here; this plugin only authors the skill definition that *makes* a worker possible. **Ordering:** the agent-side contract and the `project-a-skills` CLI mirror land first (both are in flight); this plugin's worker dialog ships against the merged contract.

### 1.2 Variant 1 — hybrid handoff (added 2026-06-08; supersedes the auto-spawn mechanism)

Smoke testing surfaced a platform reality the original design didn't account for: on **Cowork-on-Windows**, the plugin skill's only shell is the **Cowork Linux sandbox**, not native Windows. Everything the skill runs there — `gh`, `git`, and a spawned `claude --headless` — executes *in the sandbox*, which (a) has no `gh`/SSH keys, (b) sees the `project-a-skills` clone over a Windows mount whose **git writes are blocked** (#55206) and whose `git status` is **unreliable** (#42520), and (c) **cannot reach the native-Windows Claude Code** — a `claude --headless` launched from the sandbox would run in the sandbox, against the same broken git. So the original "the plugin spawns a headless Claude Code that does git/PR" mechanism (§5.2, §7.1 step 6–7, §7.4) **cannot work on this platform.**

**Decision (Variant 1):** the plugin does **not** spawn anything and does **not** run `gh`/`git` itself. It does what Cowork *can* do reliably — dialog, Layer-A validation, and writing the draft to the local stash (file writes to the mount work) — and then **hands the user a ready, paste-able prompt for their own native Claude Code**, which runs the existing `agent_helpers` chain (`preflight → new_branch → place_draft → open_pr`) on native Windows and ends with the PR URL.

What this changes vs. the original design:

- **No auto-spawn.** §7.1 step 6 "spawn `claude --headless`" and §7.4 are replaced by "write the stash + present the Claude Code handoff prompt." §5.2's rationale (spawn for git best-practices) still holds — git just runs in a **user-initiated** Claude Code session, not an auto-spawned one.
- **Cowork-side pre-flight shrinks.** The env/repo checks in §8 (`gh`/`git`/`uv`/push-permission/working-tree/`agent_guide_version`) cannot run meaningfully in the sandbox and **move entirely to `agent_helpers/preflight.py`**, which runs natively on the Claude Code side. The Cowork-side keeps only what it can know (the `repo_root` config; intent). The env-related escalation codes in §11 likewise belong to the Claude Code side.
- **Unchanged:** the `agent_helpers`, `AGENT_GUIDE.md`, the stash + `draft.json` schema, the worker dialog (§1.1), and the handoff-prompt *content* (it is now what the user pastes into Claude Code rather than a `--headless` body — nearly identical text).
- **Cost:** the "no-git, one-click" promise is partially relaxed — the author runs one Claude Code step at the end. This is the only path that works on Cowork-on-Windows today. The fuller fix (open the PR via the **GitHub API**, no local git/Claude Code at all — Variant 2) is the recommended v2 target and is UX-neutral to swap in later; it was deferred to unblock now.

This decision matches the repo-wide operating model already in use this session: **all git goes through native Claude Code; the Cowork sandbox never commits.**

## 2. Context

ChatRevenue ships LangGraph agents whose runtime capabilities are extended by **skills** — markdown files with YAML frontmatter, deployed via the `project-a-skills` repo through a git-based CI pipeline (see `project-a-skills/docs/DESIGN.md`).

Today, authoring those skills requires:

- Cowork or Claude Code as authoring IDE
- `cr-skills` Python CLI (installed via `uv tool install` + Azure Artifacts feed + PAT)
- A local clone of `project-a-skills`
- Knowledge of git, branches, PR review, CI mapping
- Awareness of `scope` (`global` vs `org`), `org_id` paths, frontmatter rules, validation constraints

That stack matches the platform team. It does **not** match PM / sales / support staff who have feature requests, write product copy, and understand the customer — but who do not run CLI tools or open pull requests by hand.

This plugin closes that gap by handling everything except the actual decision of what the skill should do.

## 3. Persona and scope

### 3.1 Target user (v1)

Internal non-technical ChatRevenue staff:

- Have GitHub access to `Project-A-Inc/project-a-skills` (write access exists or can be granted via org membership)
- Do **not** have `cr-skills` installed
- Do **not** routinely use git, `gh`, or any CLI
- Use Cowork (and possibly Claude Code) on macOS / Windows / Linux

### 3.2 Capabilities

The plugin supports:

- **Create** a new skill (`global` or `org`-scoped), plain or **worker** (`executable: true` + cadence)
- **Update** an existing skill (read current body, dialog-driven edit, ship as patch PR) — including turning a plain skill into a worker or changing its cadence
- **Remove** an existing skill (explicit confirmation, ship as removal PR)
- **Explore** existing skills (list, search, show content) — used standalone or as part of authoring

A **worker** is authored exactly like any other skill — same scopes, same files, same PR flow — with two extra outcomes in the dialog: it is marked to run on its own (`executable: true`) and the user optionally picks how often it runs while they are active vs away (the two interval fields; omitted → agent defaults). The plugin does **not** enrol the worker for any user or schedule it — enrolment is an agent/UI concern downstream of merge.

The plugin does **not**, in v1:

- Read deployed state from the LangGraph Agent Server `Store` (no `langgraph-sdk` dependency)
- Show archive history of skills (git log is the substitute when needed)
- Diff `prod` vs `staging` deployments (would need Store access)
- Merge PRs on the user's behalf (the user reviews and clicks Merge themselves)
- Auto-deploy without review (CI still runs after merge, as today)

### 3.3 Source of truth

The plugin reads and writes through the `project-a-skills` git repository only. The Store snapshot is a downstream artifact owned by CI; the plugin never talks to it directly. This is consistent with `project-a-skills/docs/DESIGN.md` §2.1 (git is the source of truth for Phase 3 skills).

## 4. High-level flow

The user-facing flow is one continuous conversation in Cowork. All technical work is hidden behind progress messages.

```
User: "I want the agent to handle returns questions for SaaS customers."

Plugin: [dialog — a few questions about behavior, trigger phrases, scope]

Plugin: "Checking everything is ready..."          ← pre-flight (hidden)

Plugin: "Getting the latest version of the
         skills project..."                        ← git fetch + pull (hidden)

Plugin: "Preparing a separate copy for your
         skill..."                                 ← branch + place + commit + push (hidden)

Plugin: "Sending it for review..."                 ← gh pr create (hidden)

Plugin: "Done. Your draft is here:
         https://github.com/Project-A-Inc/.../pull/123

         Open the link, take a look, and click the
         green 'Merge' button when you're ready.
         Once you do, the skill will appear in
         ChatRevenue within a couple of minutes."
```

Words the plugin **never** says to the user: branch, commit, push, pull request, PR, merge, rebase, squash, repository, Claude Code, MCP, subprocess, gh, git, stdout. See §12 for the full UX vocabulary.

## 5. Architecture

```
+------------------------------------------+         +-------------------------------------+
|  Cowork plugin (chatrevenue-skill-author) |  spawn  |  Claude Code (headless subprocess)  |
|  ----------------------------------------|  ---->  |  ---------------------------------  |
|  Single main skill, pure markdown.        |         |  Reads docs/AGENT_GUIDE.md.         |
|                                           |         |  Executes:                          |
|  - Dialog with user (default English)     |         |    uv run --frozen python           |
|  - Pre-flight checks via Bash             |         |    scripts/agent_helpers/*.py:      |
|  - Reads existing skills via gh + Read    |         |      preflight.py                   |
|  - LLM-side validation via references     |         |      new_branch.py                  |
|  - Writes draft to local stash            |         |      place_draft.py                 |
|  - Spawns Claude Code with handoff prompt |         |      open_pr.py                     |
|  - Parses PR URL from output              |  <----  |  Returns PR URL on last stdout line |
|  - Shows PR URL to user                   |   URL   |                                     |
+------------------------------------------+         +-------------------------------------+
```

### 5.1 Why no MCP server in v1

The original design included an MCP server (`chatrevenue-skill-store`) exposing tools for reading skills from the LangGraph Store via `langgraph-sdk` and validating drafts. Three pivots removed the need:

1. **Source of truth is the repo, not the Store.** Reading skills from the repo via `gh api repos/.../contents/...` or directly from a local clone covers every persona-relevant query.
2. **Git work is delegated to Claude Code, not to the plugin.** The Cowork-side never opens PRs itself.
3. **Validation has two layers** — LLM-side (Cowork dialog) for pre-filtering and `cr-skills` server-side (inside `place-draft.sh`) for the authoritative check. Neither layer needs MCP.

What remained for MCP — pre-flight bash, config IO, escalation text, spawning Claude Code — is all expressible directly through Cowork's built-in Bash / Read / Write tools and a SKILL.md body. MCP would be overhead.

This decision is reversible: when v2 introduces Store-side reads, search indexing, or shared session state across tool calls, an MCP server can be added without changing the user-facing dialog.

### 5.2 Why a headless Claude Code subprocess for git, not direct bash from Cowork

Considered alternative: have the Cowork plugin run `git`/`gh` directly through its own Bash tool. Rejected because:

- Claude Code already encodes git/PR best practices (atomic commits, conventional messages, conflict handling) at the agent level. We benefit from those without reimplementing.
- Repo-side `scripts/agent_helpers/*.py` (§6) are an even thinner contract; Claude Code becomes a script runner, not a git engineer.
- Keeps the Cowork-side skill body short — it does not need git playbooks. The git playbook lives in `docs/AGENT_GUIDE.md` inside `project-a-skills`.
- One process boundary between "user dialog" and "repo write" matches the security mental model: dialog talks to the user, subprocess talks to the repo.

### 5.3 Single skill, not two

The plugin ships exactly one skill (`chatrevenue-skill-author`). It triggers on create/update/remove/explore/search phrasings. Splitting into separate `author` and `explore` skills was considered and rejected to avoid wrong-skill triggers and to keep the trigger surface coherent. If post-launch usage data shows the read-only path deserves a separate skill, splitting is mechanical.

## 6. Repo-side artifacts (Level 2, in `project-a-skills`)

The plugin depends on the following artifacts being present in `Project-A-Inc/project-a-skills`. These are introduced by a separate engineering plan in that repo.

```
project-a-skills/
+-- docs/
|   `-- AGENT_GUIDE.md                    (new)
+-- scripts/
|   `-- agent_helpers/                    (new — plain script files, NOT a Python package)
|       +-- _common.py                    (shared utils; siblings import via sys.path manipulation)
|       +-- preflight.py
|       +-- new_branch.py
|       +-- place_draft.py
|       `-- open_pr.py
+-- .github/
|   `-- PULL_REQUEST_TEMPLATE.md          (new)
`-- CLAUDE.md                             (updated to reference AGENT_GUIDE)
```

`pyproject.toml` is **not touched**. `uv.lock` is **not touched**. Helpers live as plain Python files invoked directly:

```
uv run --frozen python scripts/agent_helpers/preflight.py --repo-root <abs>
```

Each helper begins with `sys.path.insert(0, str(Path(__file__).parent))` so it can `from _common import …` without being part of an installed package. The leading underscore on `_common.py` signals "private to this directory, not a public API".

Why scripts-as-files instead of a real Python package: `cr-skills-cli` is published to Azure Artifacts via `uv build`, and a package-mode wire (e.g., `[tool.hatch.build.targets.wheel] packages = ["src/cr_skills_cli", "scripts/agent_helpers"]`) would leak `agent_helpers` into the published wheel — they are repo-internal infrastructure, not a distributable. A `pythonpath = ["scripts"]` approach solves pytest but not `uv run --frozen python scripts/agent_helpers/<cmd>` from the repo root. Scripts-as-files sidesteps both — no `pyproject.toml` change, no `uv.lock` regeneration, no risk of breaking CI's `uv sync --frozen`, and the runtime invocation path is the same as the test invocation path (subprocess to a known file).

Why Python and not bash: the user-side prerequisite list already includes `uv` (for the authoritative `cr-skills validate` invocation). `uv run python <script>` reuses that same managed environment with no additional dependency on the user's machine. The alternative (bash) would require Git Bash on Windows for `sha1sum`, `mktemp`, shebang interpretation, and POSIX semantics — a real prerequisite gap for non-technical users.

### 6.1 `docs/AGENT_GUIDE.md`

YAML frontmatter:

```yaml
---
agent_guide_version: 1
---
```

Body contains:

- Path layout shortcuts (exactly where to place a draft for each scope, including the `skills/org/<org_id>/<name>/` layout)
- Branch naming patterns (see §9), including the org-scope case
- An **Automated PR template** (substitution-based; see §6.6) — distinct from `.github/PULL_REQUEST_TEMPLATE.md`, which serves manual PRs
- Hard "don'ts": no push to `main`, no force-push, no merge commits (squash only), no edits to `src/cr_skills_cli/validator.py` (rule changes flow from CRM A's `crma_skills.validator` first; this repo mirrors them — see `CLAUDE.md` hard rules)
- Escalation triggers (when to stop and report rather than try to recover)
- The exact invocation contract for `cr-skills validate` from inside `place_draft.py` (passes `--repo-root`, `--scope`, and `--org` to avoid the ambiguity surfaced by `_resolve_single_key`)
- Pointer to `CONTRIBUTING.md` for validation rules

Length budget: ~2 pages. Style: imperative, addressed to "you, the automation agent".

### 6.2 `scripts/agent_helpers/` (plain script files, not a package)

Each helper:

- Is a plain Python file invoked via `uv run --frozen python scripts/agent_helpers/<name>.py <args>` from the repo root
- Begins with a small `sys.path.insert(0, str(Path(__file__).parent))` so siblings can `from _common import …` without package install
- Uses `argparse` for named arguments — same argument names across helpers
- Emits **JSON on stdout** on success (single object); structured JSON on stderr on failure with at least `failure_code`, `detail`, and `step` keys
- Returns non-zero exit code on failure
- Is tested via `pytest` through `subprocess.run(["uv", "run", "--frozen", "python", str(HELPER_PATH), ...])` — no editable install hacks; the test path is the production path
- Honours `--dry-run` for tests that can't perform real GitHub mutations

#### `preflight`

```
Args:    --repo-root <path>  (required, no env-var dance)
         [--skip-tool-checks]   (test escape hatch — skips gh/uv/permission checks)
         [--skip-remote-checks] (test escape hatch — skips fetch/ancestor checks)
Checks:  gh installed; gh authenticated; gh has push to Project-A-Inc/project-a-skills;
         uv installed; `uv run --frozen cr-skills --version` works (this catches missing `uv sync`);
         <repo-root> is a git repo whose origin matches Project-A-Inc/project-a-skills;
         working tree clean; on a branch we can fast-forward from origin/main.
Stdout:  {"preflight_ok": true, "origin": "...", "head": "<sha>"}
Stderr (on failure):  {"failure_code": "PREREQ_*", "step": "...", "detail": "..."}
```

#### `new_branch`

```
Args:    --repo-root <path>
         --type {create|update|remove}
         --scope {global|org}
         --name <slug>
         [--org-id <slug>]     (required when --scope=org)
         [--dry-run]
Effects: git fetch + checkout main + pull --ff-only + checkout -b <auto-named-branch>.
         Branch naming explicitly covers the org case (see §9).
         If branch with the candidate name already exists on origin, appends `-2`, `-3`, …
Stdout:  {"branch": "<name>"}
```

#### `place_draft`

```
Args:    --repo-root <path>
         --type {create|update|remove}
         --scope {global|org}
         --name <slug>
         [--org-id <slug>]     (required when --scope=org)
         [--draft <path>]      (required for create/update)
         [--dry-run]
Effects: For create/update: copies SKILL.md and references/ from the draft folder into
         skills/<scope>/<...>/<name>/; strips draft.json from the placed target.
         For remove: removes the target folder via git rm -r.
         Runs `uv run cr-skills validate <name> --repo-root <repo-root> --scope <scope>
         [--org <org-id>]` as the authoritative validation step. Passing --repo-root
         and --scope/--org explicitly avoids the cr-skills ambiguity surfaced by
         `_resolve_single_key` when a name exists in multiple scopes.
         git add -A; git commit -m "<auto-message>".
Stdout:  {"commit": "<sha>", "validated": true}
```

#### `open_pr`

```
Args:    --repo-root <path>
         --type {create|update|remove}
         --scope {global|org}
         --name <slug>
         [--org-id <slug>]     (required when --scope=org)
         [--target-repo <slug>] (default: Project-A-Inc/project-a-skills;
                                 swap to a sandbox during testing — see §6.7)
         [--draft-pr]          (open a draft PR; useful for smoke tests so reviewers
                                 are not notified)
         [--dry-run]
Effects: git push -u origin <current-branch>;
         gh pr create with title from §9 and body from the Automated PR template in
         AGENT_GUIDE.md (§6.6) — NOT from .github/PULL_REQUEST_TEMPLATE.md.
Stdout:  {"pr_url": "<https-url>", "branch": "...", "draft": <bool>}
```

### 6.3 `.github/PULL_REQUEST_TEMPLATE.md`

This template serves **manual** PRs — humans opening a PR via the GitHub UI or `gh pr create` without `--body-file`. Sections: summary, kind of change (create / update / remove), affected skill(s), author note. No automation marker here — that lives in the Automated PR template (§6.6).

### 6.4 `CLAUDE.md` update

Add a section:

> If you are doing automated skill ship-flow on behalf of the `chatrevenue-skill-author` Cowork plugin, read `docs/AGENT_GUIDE.md` before touching anything, and use `scripts/agent_helpers/*.py` (invoked via `uv run --frozen python scripts/agent_helpers/<name>.py`) as the only path that mutates the repo.

This ensures Claude Code instances spawned by the plugin auto-load the right context.

### 6.5 Versioning

`agent_guide_version` is a single integer in `docs/AGENT_GUIDE.md` frontmatter, bumped only on **breaking changes** to the contract (renamed/removed helper, new required argument, changed exit-code semantics, changed prompt expectations). Additive edits — clarifications, new optional helpers, expanded prose — do not bump the integer.

The plugin reads the integer via `gh api` during pre-flight and refuses to proceed if it is higher than what the installed plugin understands. Failure → escalation with "the plugin needs to be updated".

### 6.6 Automated PR template (lives inside AGENT_GUIDE.md)

The automated PR body is **distinct** from `.github/PULL_REQUEST_TEMPLATE.md`. The two templates serve different audiences and live in different files, and we keep them apart on purpose:

- `.github/PULL_REQUEST_TEMPLATE.md` is for **humans** opening PRs manually. GitHub injects it automatically into the web UI.
- The Automated PR template lives **inside AGENT_GUIDE.md** as a fenced markdown block with explicit substitution markers: `{title}`, `{kind}`, `{skill_path}`, `{plugin_version}`, `{session_id}`. `open_pr.py` reads the block out of AGENT_GUIDE.md, performs substitution, and passes the result via `gh pr create --body-file`.

A typical body shape (verbatim contents finalised at implementation):

```markdown
## Summary

{title}

## Kind of change

- {kind}    (one of: Create new skill / Update existing skill / Remove existing skill)

## Affected skill(s)

{skill_path}

## Validation

- [x] `uv run cr-skills validate {name} --scope {scope} ...` passed via `place_draft.py`

---

> Authored via `chatrevenue-skill-author` Cowork plugin v{plugin_version},
> session `{session_id}`.
```

Why split: two files, two purposes, two release rhythms. Humans rarely change manual template; automation template evolves with helper changes. Single-source attempts (e.g., HTML comments in `PULL_REQUEST_TEMPLATE.md` that automation parses) introduce parse fragility and confuse human authors who see machine-only markers. Better: name them apart, document the split, move on.

### 6.7 Smoke-test PRs against a sandbox

The end-to-end smoke test of the helpers (§ Plan A Task 9) opens a real PR. Two options for what "real" means:

- **Sandbox fork** (`Project-A-Inc/project-a-skills-sandbox`) — separate repo with CI either disabled or duplicated; smoke tests target it via `--target-repo`. Pro: zero blast radius on production. Con: requires setting up and maintaining the sandbox.
- **Draft PR on production + immediate close** — open the PR with `--draft-pr`, capture the URL, then `gh pr close --delete-branch` right after. Drafts do not notify reviewers; the PR appears for ~5 seconds. Pro: no extra repo. Con: pollutes the production PR list mildly.

Default for v1: **draft-PR + immediate close** (no sandbox repo to set up). If pollution becomes annoying, switching to a sandbox is a one-line change (`--target-repo` value).

## 7. Cowork plugin layout

```
plugins/chatrevenue-skill-author/
+-- .claude-plugin/
|   `-- plugin.json
+-- skills/
|   `-- chatrevenue-skill-author/
|       +-- SKILL.md
|       `-- references/
|           +-- preflight-checklist.md
|           +-- validation-rules.md
|           +-- branch-naming.md
|           +-- escalation-template.md
|           +-- handoff-prompt.md
|           +-- handoff-manifest.md
|           `-- user-dialog-phrases.md
`-- README.md
```

`plugin.json`:

```json
{
  "name": "chatrevenue-skill-author",
  "description": "Helps non-technical ChatRevenue staff create, update, and remove ChatRevenue agent skills through a guided dialog.",
  "author": { "name": "ChatRevenue", "email": "..." },
  "version": "0.1.0"
}
```

### 7.1 SKILL.md body shape

Imperative orchestration, not framework-style description. Body sections (in order):

1. **Gather first, never narrate** — collect what the user wants in plain language before any technical step
2. **Pre-flight** — invoke the steps in `references/preflight-checklist.md`, abort on any failure with the escalation template
3. **Author body** — dialog: behavior, trigger phrases, scope, and **whether it runs on its own** (worker). If the user describes recurring/automatic behavior ("every morning", "keep an eye on", "remind me"), or answers yes when asked, set `executable: true` and ask, in plain language, how often it should run while they're active vs away — mapping the answers to `interval_online_min` / `interval_offline_min`. If the user has no preference, omit both fields (agent defaults apply). Never surface `executable`, `interval_*`, `cron`, or `enroll` as words.
4. **Validate locally** — run the checklist from `references/validation-rules.md` (includes the worker frontmatter rules in §10)
5. **Stash draft** — write SKILL.md, references/, draft.json into the user's local stash directory
6. **Spawn ship pipeline** — invoke `claude --headless` with the prompt from `references/handoff-prompt.md`
7. **Report outcome** — parse PR URL from stdout's last line, show to user with the closing message

Every step that can fail has a paired escalation pattern in §11 referenced via category code.

### 7.2 References

- `preflight-checklist.md` — the 8 steps in §8 expressed as bash commands the skill body can ask Bash to run
- `validation-rules.md` — `project-a-skills` v1 validation rules restated as a checklist for the LLM to walk through, **including the worker frontmatter rules** (§10): `executable` is a bool; `interval_online_min` / `interval_offline_min`, when present, are positive integers; no `schedule:` field is emitted
- `branch-naming.md` — exact patterns from §9. The skill does **not** invoke `git checkout -b` directly; it passes `--type`/`--scope`/`--name` to `new-branch.sh`, which forms the branch name. This file exists so the skill can describe to the user, in human terms, what's happening ("preparing a separate copy named ..."), without inventing names that would diverge from what the helper produces.
- `escalation-template.md` — the template from §11
- `handoff-prompt.md` — the prompt body for spawned Claude Code
- `handoff-manifest.md` — schema for `draft.json` (§7.3), including the worker fields (`executable`, `interval_online_min`, `interval_offline_min`)
- `user-dialog-phrases.md` — the UX vocabulary in §12, including the worker phrasings ("runs on its own", "how often while you're active / away") and the worker terms the plugin never says

### 7.3 Local draft stash

After dialog and validation, the skill writes:

```
~/.local/state/chatrevenue-skill-author/drafts/<ISO-timestamp>-<name>/
+-- SKILL.md
+-- references/
|   `-- *.md
`-- draft.json
```

(Windows: `%LOCALAPPDATA%\chatrevenue-skill-author\drafts\...`; macOS: `~/Library/Application Support/chatrevenue-skill-author/drafts/...`.)

`draft.json` schema (versioned):

```json
{
  "version": 2,
  "type": "create" | "update" | "remove",
  "scope": "global" | "org",
  "org_id": "chatrevenue" | null,
  "name": "skill-slug",
  "worker": {
    "executable": true,
    "interval_online_min": 30,
    "interval_offline_min": 240
  },
  "repo_root": "/Users/.../project-a-skills",
  "pr_title": "Add skill: skill-slug",
  "pr_body": "<markdown>",
  "source": {
    "plugin": "chatrevenue-skill-author",
    "version": "0.1.0",
    "session_id": "<opaque>"
  }
}
```

The `worker` object is **optional and additive** (schema bumped `1 → 2`; a manifest without it is a plain skill). When present, `executable` is always `true`; `interval_online_min` / `interval_offline_min` are each optional positive integers (omit a field to take the agent default). The placed `SKILL.md` carries exactly these fields in frontmatter and **never** a `schedule:`. A manifest with no `worker` key, or `worker` absent, produces a non-executable skill — the helpers must not inject `executable` on their own.

On successful PR, the draft folder is moved to `drafts/.archive/` (last 10 retained, rotated). On failure, it stays in place so the next session can resume.

### 7.4 Spawn invocation

```
claude --headless \
  --cwd "<repo_root>" \
  --prompt-file "<plugin-root>/skills/chatrevenue-skill-author/references/handoff-prompt.md" \
  --env DRAFT_MANIFEST="<draft-folder>/draft.json"
```

(Exact flag names verified at implementation time; the contract is: a non-interactive `claude` invocation, with a working directory pointing at the repo clone, a prompt file path, and a single env var pointing at the draft manifest.)

`handoff-prompt.md` instructs the spawned agent to: read the manifest, read `docs/AGENT_GUIDE.md` in the repo, run `uv run --frozen python scripts/agent_helpers/preflight ...` then `agent_helpers.new_branch` then `agent_helpers.place_draft` then `agent_helpers.open_pr` in order (each with `--repo-root`, `--type`, `--scope`, `--name`, and `--org-id` where required), and emit the PR URL as the last line of stdout in the form `pr_url=<https-url>`.

The Cowork-side reads only the last line of the subprocess stdout to extract the URL. Helpers' own JSON output goes to inner stdout and is captured by the spawned agent; only the final `pr_url=` summary line crosses back to Cowork.

## 8. Pre-flight checks

Eight checks, in order. Each is a single shell command. Failure handling routes to either a recovery walk-through (the skill takes the user through the fix) or an escalation (§11). Categories below match category codes in §11.

| # | Check | Tool | Failure handling |
|---|---|---|---|
| 1 | `claude --version` | bash | `PREREQ_CLAUDE_MISSING` — recovery: install Claude Code (per-OS instructions) |
| 2 | `gh --version` | bash | `PREREQ_GH_MISSING` — recovery: install gh (per-OS instructions) |
| 3 | `uv --version` | bash | `PREREQ_UV_MISSING` — recovery: install uv (per-OS instructions; needed by `place_draft.py` to run the repo-side validator via `uv run`) |
| 4 | `gh auth status` | bash | `PREREQ_GH_UNAUTH` — recovery: walk `gh auth login` |
| 5 | `gh api repos/Project-A-Inc/project-a-skills --jq .permissions.push` returns `true` | bash | `PREREQ_NO_REPO_ACCESS` — escalate |
| 6 | Repo path saved in config | Read | If absent, ask user; offer to `gh repo clone` to a chosen location |
| 7 | `git -C <repo> remote get-url origin` matches expected slug | bash | `PREREQ_REPO_NOT_FOUND` — re-ask |
| 8 | `git -C <repo> status --porcelain` is empty | bash | `WORK_TREE_DIRTY` — escalate (do not auto-stash) |
| 9 | `(cd <repo> && uv run --frozen cr-skills --version)` exit 0 | bash | `PREREQ_UV_SYNC_NEEDED` — recovery: walk user through `uv sync` in the repo root (catches missing venv after fresh clone or pyproject changes) |
| 10 | `gh api repos/Project-A-Inc/project-a-skills/contents/docs/AGENT_GUIDE.md`, parse frontmatter `agent_guide_version` ≤ supported version | bash | `AGENT_GUIDE_VERSION_MISMATCH` — escalate "update the plugin" |

Recovery walk-throughs are dialog-driven: the skill explains the next step, asks the user to do it (or to confirm), then re-runs the check. No silent self-healing.

## 9. Branch and PR naming

Branch names are generated by `new_branch.py` deterministically from the inputs the Cowork-side already has. The org case explicitly carries the `org_id`:

| Type | Scope | Branch pattern |
|---|---|---|
| Create new skill | global | `skills/global-<name>` (e.g., `skills/global-pptx`) |
| Create new skill | org    | `skills/org-<org_id>-<name>` (e.g., `skills/org-acme-co-pptx`) |
| Update existing | any | `fix/<name>-<yyyymmdd>-<6-char-hash>` |
| Remove existing | any | `remove/<name>` |

If a branch with the candidate name already exists (locally or on origin), the helper appends `-2`, `-3`, …

The org-create case mirrors the convention from `project-a-skills/CONTRIBUTING.md` (PR workflow → branch naming for `skills/org/<org_id>/<name>/` changes). Update/remove patterns intentionally omit the scope/org_id from the branch name — the affected folder is implicit from the change itself, and shorter branch names read better in PR lists.

PR title patterns:

| Type | PR title |
|---|---|
| Create | `Add skill: <name>` |
| Update | `Update skill: <name>` |
| Remove | `Remove skill: <name>` |

PR body is filled from the **Automated PR template inside AGENT_GUIDE.md** (§6.6), with substitutions from `draft.json`. The manual `.github/PULL_REQUEST_TEMPLATE.md` is *not* used for automated PRs.

## 10. Validation

Two layers.

**Layer A — Cowork-side (LLM, pre-filter).** The skill body walks the checklist in `references/validation-rules.md` against the in-progress draft and flags issues to the user in dialog form. Rules covered: `name` regex and length, `description` length 10–2000, kebab-case folder name matches frontmatter `name`, no scripts/assets, references only `.md`, no reserved tokens (`<available_skills>`, `<system>`, `</system>`), no shebang code blocks, body size ≤ 50 KB, each reference ≤ 100 KB, total ≤ 1 MB. Rules sourced from `project-a-skills/CONTRIBUTING.md` §"Validation rules (v1)".

**Worker frontmatter rules (added 2026-06-08), mirroring `project-a-skills/src/cr_skills_cli/fs.py`:**

- `executable`, when present, is a boolean. The cadence fields are only meaningful when `executable: true`; if the draft carries an interval without `executable: true`, flag it and ask the user (likely they meant it to run on its own).
- `interval_online_min` and `interval_offline_min`, when present, are **positive integers** (minutes). A non-int or ≤ 0 is the `INVALID_INTERVAL_TYPE` footgun the repo-side extractor rejects — catch it here first.
- The plugin **never emits `schedule:`**. The retired cron field is accept-and-warn server-side during migration, but an author flow should produce the modern fields only.
- Omitting both intervals is valid (agent defaults apply) — do not invent values to "fill in" frontmatter.

This layer is not authoritative. It is a UX filter to avoid wasting the user's time on obviously broken drafts.

**Layer B — server-side (authoritative).** `scripts/agent_helpers/place_draft.py` runs `uv run cr-skills validate <name> --repo-root <repo-root> --scope <scope> [--org <org-id>]` after copying files into the working tree. The explicit `--repo-root`/`--scope`/`--org` flags avoid two real footguns in the CLI: (a) `cr-skills`'s `_resolve_single_key` errors out with "exists in multiple scopes" when a name is duplicated across global and org; (b) without `--repo-root`, the CLI consults `SKILLS_REPO_ROOT` env / a stored config file and falls back to `ConfigError`. `cr-skills` is the same code the repo's CI runs, so passing here is the contract. Failure surfaces as `VALIDATION_REPO_SIDE_FAILED` and escalates.

Drift between Layer A and Layer B is expected over time. The contract is: Layer B is authoritative; Layer A is best-effort. Layer A's `references/validation-rules.md` carries the line **"if these rules diverge from what cr-skills enforces, cr-skills wins; please flag the drift"**.

## 11. Tech-problem escalation

When a check or step fails in a way the plugin cannot resolve, the skill stops and emits a structured escalation message. The user is told there is a technical problem, what category it is, and what to do (message the AI team). The message contains a pre-formatted block that the user can paste verbatim.

Default escalation template (English; switches language follow the rules in §12):

```
Technical issue

I can't continue due to a technical issue that I can't resolve myself:

What happened: <human-readable category>

What to do: message the AI team with this text — they have everything they need:

[ chatrevenue-skill-author / v<plugin-version>           ]
[ <ISO-8601 timestamp> / <category-code>                 ]
[                                                        ]
[ step:        <which step failed>                       ]
[ command:     <the last command attempted>              ]
[ exit_code:   <N>                                       ]
[ stderr:      <truncated to 2 KB>                       ]
[                                                        ]
[ context: {                                             ]
[   repo_root:      <path>,                              ]
[   skill_name:     <name>,                              ]
[   scope:          <global|org>,                        ]
[   org_id:         <id or null>,                        ]
[   os:             <darwin|win32|linux>,                ]
[   gh_version:     <output of gh --version>,            ]
[   claude_version: <output of claude --version>,        ]
[   agent_guide_version: <integer from repo>             ]
[ }                                                      ]

(Copied to clipboard)
```

The technical block inside the brackets stays in English regardless of dialog language, so the AI team always sees the same format.

Category codes:

| Code | Recoverable? |
|---|---|
| `PREREQ_CLAUDE_MISSING` | yes, install walk |
| `PREREQ_GH_MISSING` | yes, install walk |
| `PREREQ_UV_MISSING` | yes, install walk |
| `PREREQ_UV_SYNC_NEEDED` | yes, run `uv sync` in repo |
| `PREREQ_GH_UNAUTH` | yes, login walk |
| `PREREQ_NO_REPO_ACCESS` | escalate |
| `PREREQ_REPO_NOT_FOUND` | yes, re-ask |
| `WORK_TREE_DIRTY` | escalate (no auto-stash) |
| `BRANCH_NAME_TAKEN` | yes, auto-suffix |
| `CLAUDE_SPAWN_FAILED` | escalate |
| `VALIDATION_REPO_SIDE_FAILED` | escalate |
| `GH_PR_CREATE_FAILED` | escalate |
| `AGENT_GUIDE_VERSION_MISMATCH` | escalate |
| `UNKNOWN_EXCEPTION` | escalate |

`<contact-target>` (Slack channel / mailto / etc.) is a placeholder filled in during Phase 4. The design does not depend on the choice.

## 12. Language defaults

1. **Authored artifacts** (the SKILL.md and references/ the plugin produces for `project-a-skills`): English only, always. This is an inviolable invariant from `project-a-skills/CONTRIBUTING.md` "Language" section.
2. **Plugin's own internal artifacts** (this design doc, the plugin's SKILL.md and references/, the repo-side `AGENT_GUIDE.md`, the helper scripts, the PR template): English only.
3. **User-facing dialog**:
   - Default: English.
   - Detection: the user's first message in the session. If non-English, the dialog continues in that language.
   - Override: an explicit user instruction ("respond in Russian", "ответь по-русски").
   - Reset: a new chat session starts in English again.
4. **The escalation block** (the bracketed technical paste in §11) stays in English regardless of dialog language, so the AI team sees a uniform format.
5. **UX vocabulary** (terms the plugin never uses to the user, with replacements):

| Never use | Use instead (English) |
|---|---|
| branch | copy / a separate copy for your skill |
| commit | saving |
| push | sending |
| pull request / PR | draft for review / review link |
| merge | confirm / publish (the user clicks themselves) |
| rebase / squash / merge commit | not mentioned |
| repository / repo | the skills project |
| validate / validation | check / checking |
| working tree dirty | you have unsaved changes in the skills folder |
| Claude Code | not mentioned ("running the last steps") |
| MCP / tool / subprocess | not mentioned |
| stdout / stderr / exit code / gh / git | not mentioned |
| executable / worker | runs on its own / works in the background for you |
| enroll / dispatcher / schedule / cron | turning it on (done later, in ChatRevenue) — the plugin doesn't do this itself |
| interval_online_min / interval_offline_min | how often it runs while you're active / while you're away |
| presence / online-offline cadence | whether you're at your desk or away |

When dialog switches to another language, the plugin uses equivalent non-technical terms in that language.

**Worker dialog shape (non-technical).** When the user describes recurring behavior, the plugin confirms in plain terms — e.g. *"Should this run on its own in the background, or only when you ask for it?"* and, if on its own, *"How often should it run while you're at your desk? And while you're away?"* — accepting fuzzy answers ("a few times a day", "once an hour") and mapping them to minute values, or leaving them at the default when the user has no preference. It never asks for cron strings, intervals in minutes, or the word "worker".

## 13. State and cleanup

- **Config file:** `~/.local/state/chatrevenue-skill-author/config.json` (Linux/macOS XDG state), `%LOCALAPPDATA%\chatrevenue-skill-author\config.json` (Windows). Fields: `repo_root`, `agent_guide_version_seen`, `last_session_id`. Created on first successful pre-flight; updated on every run.
- **Drafts stash:** under the same state directory in `drafts/` (active) and `drafts/.archive/` (completed). Last 10 archived; older rotated out.
- **No global state mutation:** nothing in `/etc`, no daemons, no background watchers. The plugin is inert outside of a Cowork session.

## 14. Dependencies and versioning

External tools required on the user's machine:

| Tool | Min version | How the plugin verifies |
|---|---|---|
| Claude Code CLI | a version that supports headless / non-interactive invocation (verified at implementation; see §16) | `claude --version` exit 0 |
| GitHub CLI (`gh`) | 2.x | `gh --version` exit 0 |
| `uv` (Python package manager) | latest stable | `uv --version` exit 0 |
| git | 2.x (typically present alongside `gh`) | `git --version` exit 0 |
| OS | macOS / Windows / Linux | implicit |

Repo dependency:

| Artifact | Min version |
|---|---|
| `project-a-skills/docs/AGENT_GUIDE.md` | `agent_guide_version: 1` |
| `project-a-skills/scripts/agent-helpers/{preflight,new-branch,place-draft,open-pr}.sh` | matching guide v1 |

Plugin version: starts at `0.1.0`. Bumps on changes that affect handoff contract (`draft.json` schema, prompt shape, supported guide versions).

## 15. Non-goals (v1)

The following are explicitly **out of scope** for v1. If you think any of these belong in v1, push back during review rather than silently expanding.

- Reading from LangGraph Agent Server `Store` via `langgraph-sdk`
- Archive / version history view from the Store
- `prod` vs `staging` diff
- Auto-merge of the PR
- Authoring with eval (`run_loop.py`-style triggering accuracy benchmark) — Cowork already has `skill-creator`'s eval for this; we don't duplicate
- Bundled JS validator (B2 in design discussion)
- Multi-user collaborative authoring on the same draft
- Resume of a stashed draft across machines
- Org-admin self-service for external customers (different persona; out for v1)
- Custom MCP server (deferred to v2 if needed)
- **Enrolling / turning on a worker** for a user, or scheduling it — enrolment + the per-user dispatcher live in the agent/UI (`nextcrm-agents`), downstream of merge. This plugin only authors the skill definition that makes a worker possible.
- **Per-user cadence override** — cadence is author-owned (one value per worker); there is no per-user interval in the model, so nothing to author here.
- Emitting the legacy `schedule:` cron field — retired; the plugin produces interval fields only.

## 16. Open questions for implementation

These are left for the implementation phase (`superpowers:writing-plans`), not the design:

- Exact `claude --headless` flag names — verify against installed Claude Code version
- Exact text of the skill description (trigger phrases) — first cut, refine via Cowork eval
- Exact text of `references/preflight-checklist.md` bash snippets — straightforward but per-OS lines
- Default `<contact-target>` in the escalation template — fill in once Sasha decides the channel
- Whether to support `--repo-root` override flag for testing — likely yes, behind an env var
- Where to draw the line between "ask the user to fix it" and "escalate" for niche pre-flight failures
- Whether to surface a progress indicator beyond the per-stage status messages
- **Worker:** the exact fuzzy-phrase → minutes mapping ("a few times a day" → ?) and whether to confirm the resulting cadence back to the user in plain language before shipping. First cut in `references/user-dialog-phrases.md`; refine via Cowork eval.
- **Worker:** whether the *update* flow should detect that a skill is already executable and offer to change its cadence vs. only its body — and how to phrase "this already runs on its own" without the word worker.

## 17. References

- `project-a-skills/README.md`
- `project-a-skills/docs/DESIGN.md` — especially §2.1 (git as source of truth), §2.14 (authoring utilities live in this repo)
- `project-a-skills/CONTRIBUTING.md` — validation rules, frontmatter format, naming rules
- `project-a-skills/docs/AUTHORING.md` — current technical author flow this plugin abstracts
- `project-a-skills/CLAUDE.md` — repo hard rules (validator immutability, English-only, squash-merge)
- `chatrevenue-marketplace/plugins/chatrevenue/` — existing self-contained plugin pattern reference
- Brainstorming session — Cowork conversation, 2026-05-27
- **Worker model (added 2026-06-08):**
  - `nextcrm-agents/design_docs/architecture/decisions/0003-worker-is-any-executable-skill.md` — the "Worker = any executable skill" decision
  - `nextcrm-agents/design_docs/architecture/references/workers-and-dispatch.md` — dispatcher, presence-gated cadence, frontmatter contract
  - `nextcrm-agents/design_docs/2026-06-04-presence-aware-worker-dispatch-design.md` — authoritative runtime design
  - `project-a-skills/docs/specs/2026-06-04-worker-cadence-frontmatter-design.md` — the frontmatter + CLI extraction contract this plugin mirrors
