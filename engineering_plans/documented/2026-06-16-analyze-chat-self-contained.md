# Analyze-chat self-contained — repoint the skill at the stdlib trace tool: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repoint the `chatrevenue-analyze-chat` skill from the vendored `langgraph_cli` (driven by `uv` on Python 3.13) to the new stdlib `trace_tools` (`trace_fetch.py` + `trace_digest.py`) that already lives on `project-a-skills` `main`, add a deterministic-digest step, and ship it as a plugin version bump — without copying any tool code into this repo.

**Architecture:** This is a **content / consumer-edit** plan, not a code-build plan. The plugin is **pure markdown** (no MCP server, no build, no tests-as-code — marketplace ADR 0002). The tool itself (`trace_fetch.py`, `trace_digest.py`, its README) is the **producer** repo's responsibility and is already merged on `project-a-skills` `main`; this repo only **calls** it from the user's `project-a-skills` clone (`<repo_root>`) via stock `python3`. The work is: rewrite the skill's pre-flight, fetch, and analysis steps to invoke the new tool; replace the command allowlist with a thin read-only list that names the tool README as the source of truth; add a digest-format reference; reconcile the architecture reference and ADR 0006 wording; bump the plugin version; verify by parity walk-through against the tool README; commit, PR, and (at the deploy gate) merge.

**Tech Stack:** Cowork plugin marketplace (markdown skills + `plugin.json` manifest), git, GitHub (`Project-A-Inc/chatrevenue-marketplace`). The invoked tool is stdlib-only Python 3.8+ (`urllib`/`json`/`argparse`), but **no tool code is added or run in this repo** — it is invoked from `<repo_root>` (the user's `project-a-skills` clone).

**Spec:** `project-a-skills/docs/specs/2026-06-16-analyze-chat-self-contained-design.md` (read the **"chatrevenue-marketplace (secondary — thin skill edit)"** scope, lines 198–215).
**Tool source of truth:** `project-a-skills/tools/trace_tools/README.md` (merged on `project-a-skills` `main`).
**Feature slug:** `analyze-chat-self-contained`

---

## Context the executor must know

**This repo is the *consumer*. No tool code lives or runs here.** The skill shells out to the tool inside the user's `project-a-skills` clone at `<repo_root>/tools/trace_tools/`. `<repo_root>` is the same value the `chatrevenue-skill-author` skill already resolves (reuse it; do not re-ask).

**The producer half is already done.** `project-a-skills` `main` carries `tools/trace_tools/trace_fetch.py`, `trace_digest.py`, and `README.md`. This plan must match that README's invocations exactly. The authoritative command forms (from the README) are:

| Action | Command (run with stock `python3`, from any cwd, absolute paths) |
|---|---|
| All runs on a thread (default) | `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get-by-thread <thread_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<thread_id>.json"` |
| One run by id | `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get <run_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<run_id>.json"` |
| Recent runs (no id) | `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" list --limit <n> [--project <project>] --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/recent.json"` |
| Digest a dump | `python3 "<repo_root>/tools/trace_tools/trace_digest.py" "<repo_root>/trace_dumps/<id>.json" -o "<repo_root>/trace_dumps/<id>.digest.md"` |

Fetch flags (README): `--env-file`, `--project` (defaults to `LANGCHAIN_PROJECT`), `-o/--output`, `--limit`, `--start-time` (ISO; default a bounded 14-day window). **There is no `--full`, `--verbose`, or `--format` flag** in the new tool — the old `langgraph_cli` flags do not carry over.

**What changes vs. the old path:**
- No `uv`. No pinned Python 3.13. No third-party stack. Stock `python3` (≥3.8) only.
- **No `cwd` requirement.** The old skill had to run with `cwd = <repo_root>/tools/langgraph_cli/` so `uv` resolved the tool's own env. The stdlib tool has no env to resolve — invoke it with absolute paths from any directory.
- Credentials still come from `<repo_root>/.env` via `--env-file` on **every** call (creds never on the command line — preserves the ADR 0006 / privacy posture).
- The dump JSON **shape is unchanged** (README "Dump shape" matches today's `dump-schema.md`), so `references/dump-schema.md` stays valid and is **not edited** (see Task 5).
- New: a **digest** step. `trace_digest.py` turns the dump into a compact Markdown digest; the LLM reads the digest first and drills into the raw dump by `#N`/`id` reference.
- The optional `thread get-history` command is **dropped** (spec non-goal — the new tool has no such command).

**Read-only guarantee (ADR 0006) is preserved and *strengthened*.** The new tool's fetcher issues only `GET` requests and `POST /api/v1/runs/query` reads; the digest is pure local JSON→Markdown (no network). The new tool has **no** assistant/thread mutation commands at all, so the blast radius is read-only by construction. The allowlist still names the boundary explicitly.

**Hide-the-plumbing (ADR 0009) must be preserved.** The "Talking to the author — hide the plumbing" section and the silent-recovery posture stay. Only the *specific* technical details change (the ❌ antipattern example mentions `langgraph-tool`/Python 3.13/`uv` — that text is updated to the new reality, but the principle and structure are untouched).

**Files in scope (this repo only):**

| File | Action |
|---|---|
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md` | Rewrite (drop `uv`/tool-build/tool-runs checks; keep `python3` + `repo_root` + creds) |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md` | Edit Step 2, Step 3, new Step 3.5, Step 4, Hard rules, the ❌ example, References list |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/trace-tool-commands.md` | Rewrite to a thin read-only allowlist of the new invocations |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/digest-format.md` | **Create** |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/dump-schema.md` | **Unchanged** (verify only; see Task 5 + deviation note) |
| `design_docs/architecture/references/skill-author-plugin.md` | Edit the analyze-chat section (drop `langgraph_cli`/`uv`, repoint to new tool, add digest) |
| `design_docs/architecture/decisions/0006-analyze-chat-read-only-allowlist.md` | Reconcile wording to the new commands |
| `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` | Version `0.3.2` → `0.4.0` |

**Out of scope (do NOT touch):**
- Any `project-a-skills` file — the tool, its README, its `langgraph_cli` retirement (that retirement is a separate, deferred step in the producer repo, sequenced after the producer's gate 5).
- `design_docs/architecture/decisions/0009-hide-the-plumbing-error-handling.md` — its `langgraph-tool`/Python 3.13 mention is the **historical motivating example** of why hide-the-plumbing exists; rewriting it would falsify the record. The task lists only `skill-author-plugin.md` + ADR 0006 for langgraph removal. Leave 0009 as-is (the *principle* is preserved by the SKILL.md edits).
- `design_docs/2026-06-08-chatrevenue-analyze-chat-design.md` — the historical design doc. The new `trace-tool-commands.md` stops pointing at its "§6" and points at the tool README instead; the old design doc itself is left as a historical record.
- `.claude-plugin/marketplace.json` — it does **not** embed the plugin version (version lives only in `plugin.json`).

**Version choice:** `0.3.2` → `0.4.0` (minor). This is a **behavioral** change to how the skill works (new tool, new invocation surface, new digest step), not a docs-only correction — so it earns a minor bump rather than another patch. (`0.3.1`/`0.3.2` were docs/guidance patches.)

**Branch / publish meaning:** Per repo convention (recent changes landed via PRs — `#9`, `#10`, `#11`), create a feature branch and open a PR; do not commit to `main` directly. This marketplace is consumed by Cowork directly from GitHub — "publish" = merge to `main`; the `version` bump is the signal Cowork uses to offer the update. Picking up the change in a *running* Cowork session is a user-side plugin update/restart (note in the Report; not a git step).

---

## File Structure

No files are restructured. One file is created (`references/digest-format.md`); the rest are edited in place. Each reference file keeps one clear responsibility:

- `preflight-checklist.md` — environment checks before fetching (now `python3` + `repo_root` + creds only).
- `trace-tool-commands.md` — the thin read-only allowlist + the pointer to the tool README as source of truth.
- `digest-format.md` — the digest sections + the `#N`/`id` reference convention (new).
- `dump-schema.md` — the dump JSON shape (unchanged; still valid because the dump shape is preserved).
- `analysis-playbook.md` — author-question → how-to-answer (unchanged; the field-level guidance still applies to the same dump shape).

---

### Task 1: Rewrite the pre-flight checklist for the stdlib tool

**Files:**
- Modify (full rewrite): `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```markdown
# Pre-flight checklist — analyze-chat

Run these via Bash before fetching a conversation. Stop on the first hard
failure. Run silently; surface only what blocks progress, and only in plain
language — never the technical reason (see "Talking to the author — hide the
plumbing" in SKILL.md). Most failures here are **recoverable** (fix them
yourself silently where safe; otherwise walk the author through it and re-run) —
there is no mutation, so nothing to escalate hard.

## 1. repo_root known

Reuse the `chatrevenue-skill-author` config at `<state-dir>/config.json`
(`repo_root`). If present, use it. If absent, ask the author where their local
copy of the ChatRevenue skills project is. Do not re-ask if it is already set.

## 2. python3 available

```
python3 --version
```

The trace tool is plain Python with no extra packages, so any stock `python3`
(version 3.8 or newer) works — there is nothing for the author to install or
build. Failure → on the rare machine without `python3`, tell the author plainly
that this lookup needs to run where Python is available (normally their own
machine) and stop. Do not try to install Python yourself.

## 3. Credentials present

```
test -f "<repo_root>/.env"
```

The team-provided `.env` lives at the **repo root** and is passed to the tool on
every call with `--env-file "<repo_root>/.env"` (see `trace-tool-commands.md`).

Failure → first look for the same file under a different name in the repo root
(e.g. `env.txt`, `.env.txt`, `env`) — authors often save it that way. If one is
there, point the tool at it directly with `--env-file "<that-file>"` and carry on
silently; do not ask the author to rename anything. Only if **no** env file
exists at all, ask the author — in plain language — to drop the file the team
gave them at `<repo_root>/.env`, then re-run. Do not create or guess the file.
Never print its contents.

## After checks pass

Proceed to fetch (Step 3 of the workflow). Do not list passed checks to the
author.
```

- [ ] **Step 2: Confirm the old checks are gone**

Run:
```bash
git --no-pager grep -nE "uv|langgraph_cli|Python 3\.13|pyproject" -- plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md
```
Expected: **no matches**. (The `uv --version`, vendored-tool-present, and tool-runs checks are removed; only `repo_root` + `python3` + creds remain.)

- [ ] **Step 3: No commit yet** — committed together in Task 9.

---

### Task 2: Update SKILL.md — pre-flight prose, fetch, digest, analysis, hard rules

**Files:**
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md`

- [ ] **Step 1: Update the ❌ antipattern example (hide-the-plumbing section, ~line 52)**

The bullet currently reads:
```markdown
   - ❌ "`langgraph-tool` needs Python ≥3.13 but the sandbox has 3.10; `uv` can't
     fetch the runtime (proxy 403); the env file is `env.txt` and its multiline
     PEM key breaks `--env-file` parsing."
```
Replace it with (keeps the section's structure and the ✅ example below it; only the technical noise is refreshed to the new reality — still an explicit "never say this" example):
```markdown
   - ❌ "the trace lookup can't reach LangSmith (HTTP 403 via the proxy); the env
     file is `env.txt` and its multiline PEM key breaks `--env-file` parsing; the
     digest step found no recognizable runs in the dump JSON."
```

- [ ] **Step 2: Rewrite Step 2 (Pre-flight) prose (~lines 83–94)**

Replace the Step 2 body (everything between the `### Step 2 — Pre-flight (light)` heading and the `### Step 3` heading) with:
```markdown
### Step 2 — Pre-flight (light)

Run the checks in `references/preflight-checklist.md`. Briefly: `repo_root` is
known (reuse the `chatrevenue-skill-author` config — do not re-ask); stock
`python3` is available (the trace tool is plain Python with no extra packages —
nothing to install or build); and the team-provided `.env` is present at the
**repo root** `<repo_root>/.env` (if not, ask the author to drop the env file the
team gave them there — this is recoverable, walk them through it, don't treat it
as a hard failure).

Run silently; surface only real blockers, in plain language (see "Talking to
the author"). Recover the recoverable ones yourself without narrating them.
```

- [ ] **Step 3: Rewrite Step 3 (Fetch) (~lines 96–112)**

Replace the Step 3 body (between `### Step 3 — Fetch the conversation` and `### Step 4 — Analyze`) with:
```markdown
### Step 3 — Fetch the conversation

Use only the read-only commands in `references/trace-tool-commands.md`. Run them
with stock `python3`, passing `--env-file` pointed at the env file pre-flight
located (normally `<repo_root>/.env`, but use whatever file is actually there —
see pre-flight) on every call (so the creds reach the tool), and write the dump
into `<repo_root>/trace_dumps/`. There is no working-directory requirement and no
`uv` — invoke the script by its absolute path:

- thread id → `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get-by-thread <id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<id>.json"`
- trace id → `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get <id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<id>.json"`
- neither → `python3 "<repo_root>/tools/trace_tools/trace_fetch.py" list --limit <n> [--project <p>] --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/recent.json"`, show
  the author a short summary of recent conversations, let them pick, then fetch
  by the chosen id.

Tell the author only something like "Pulling up that conversation…".
```

- [ ] **Step 4: Insert a new Step 3.5 (Digest) before Step 4**

Immediately after the Step 3 block and before `### Step 4 — Analyze`, insert:
```markdown
### Step 3.5 — Build the digest

Turn the raw dump into a compact Markdown digest — this is the **primary** thing
you read in Step 4:

```
python3 "<repo_root>/tools/trace_tools/trace_digest.py" "<repo_root>/trace_dumps/<id>.json" -o "<repo_root>/trace_dumps/<id>.digest.md"
```

This is a local, read-only transform — no network, no LLM. The digest summarizes
the conversation into labeled sections, and every line carries a reference back to
the run it came from (`#N` `<run-id>`) so you can drill into the raw dump for the
exact details (see `references/digest-format.md`). Don't narrate this step to the
author.
```

- [ ] **Step 5: Rewrite Step 4 (Analyze) (~lines 114–123)**

Replace the Step 4 body (between `### Step 4 — Analyze` and `### Step 5 — Bridge to authoring`) with:
```markdown
### Step 4 — Analyze

Read the **digest** first (`<repo_root>/trace_dumps/<id>.digest.md`) — it is the
primary artifact and gives you the timeline, the skills in scope, the tools that
fired, the errors, what the model saw, and token/cost totals (see
`references/digest-format.md`). When you need the exact `inputs`/`outputs` of a
specific run, open that run in the raw dump by its `#N`/`id` reference (the dump
is LangSmith `Run` JSON — see `references/dump-schema.md`). Use
`references/analysis-playbook.md` for the common author questions and how to
answer each: whether a given skill loaded/triggered, what tools were called and
with what arguments, where the run errored, and what in a skill's description or
body would change the outcome.

Quote only what's needed to answer — do not paste the whole digest or dump or
unnecessary customer data into chat (see Privacy below).
```

- [ ] **Step 6: Rewrite the Hard rules bullet about cwd/env (~lines 145–147)**

The second Hard-rules bullet currently reads:
```markdown
- Always invoke the trace tool with cwd `<repo_root>/tools/langgraph_cli/` (so
  `uv` resolves the tool's env) and `--env-file "<repo_root>/.env"` (so the root
  creds load). Never pass credentials on the command line.
```
Replace it with:
```markdown
- Always invoke the trace tool as `python3 "<repo_root>/tools/trace_tools/<script>.py"`
  with `--env-file "<repo_root>/.env"` on every fetch (so the root creds load).
  Never pass credentials on the command line. There is no `uv` and no
  working-directory requirement.
```

- [ ] **Step 7: Add the digest-format reference to the References list (~lines 153–156)**

After the `references/dump-schema.md` line in the `## References` section, add:
```markdown
- `references/digest-format.md` — the digest's sections + the `#N`/`id` reference convention
```

- [ ] **Step 8: Update the description frontmatter mention of "bundled trace tool"**

The frontmatter `description` (line ~11) says "fetches the conversation's trace dump with the bundled trace tool". "bundled" implied a copy inside the plugin; the tool now lives in `<repo_root>`. Change "with the bundled trace tool" to "with a read-only trace tool" (keep the rest of the description identical). Also in the body intro (~line 24) change "using a bundled tool" to "using a read-only tool".

- [ ] **Step 9: Confirm no `langgraph_cli`/`uv`/`langgraph-tool` mentions remain in SKILL.md**

Run:
```bash
git --no-pager grep -nE "langgraph_cli|langgraph-tool|\buv\b|Python 3\.13" -- plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md
```
Expected: **no matches**.

- [ ] **Step 10: No commit yet** — committed in Task 9.

---

### Task 3: Rewrite the trace-tool command allowlist (thin, README is source of truth)

**Files:**
- Modify (full rewrite): `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/trace-tool-commands.md`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```markdown
# Trace tool commands — read-only allowlist

The trace tool lives in the ChatRevenue skills project at
`<repo_root>/tools/trace_tools/` (two plain-Python scripts: `trace_fetch.py` and
`trace_digest.py`). It runs with stock `python3` — no `uv`, no extra packages, no
working-directory requirement. The **detailed source of truth** for invocation,
flags, and the dump/digest formats is that tool's own README:
`<repo_root>/tools/trace_tools/README.md`.

**Only the commands below are allowed.** They all read; none mutate. (The tool
has no assistant/thread mutation commands at all, so it is read-only by
construction — this allowlist names the boundary explicitly per ADR 0006.)

Always:
- Invoke the script by absolute path with stock `python3`.
- Pass `--env-file "<repo_root>/.env"` to **every** fetch. The `.env` (the
  team-provided LangSmith creds) lives at the **repo root**. Never pass the key on
  the command line; only via `--env-file`.
- Write dumps and digests into `<repo_root>/trace_dumps/` with `-o`.

## Allowed — fetch (read-only)

### Fetch all runs for a thread (the usual entry point)

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get-by-thread <thread_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<thread_id>.json"
```

Add `--limit <n>` to cap the number of traces; `--start-time <ISO>` to widen or
move the default bounded time window; `--project <name>` to override the default
project.

### Fetch one trace by id

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get <trace_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<trace_id>.json"
```

### List recent conversations (when the author has no id)

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" list --limit <n> [--project <project>] --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/recent.json"
```

Summarize the list for the author, let them pick, then fetch by the chosen id.

## Allowed — digest (local, read-only)

```
python3 "<repo_root>/tools/trace_tools/trace_digest.py" "<repo_root>/trace_dumps/<id>.json" -o "<repo_root>/trace_dumps/<id>.digest.md"
```

Pure local JSON→Markdown — no network, no LLM. See `digest-format.md` for the
sections and the `#N`/`id` reference convention. The digest is the **primary**
analysis artifact; open the raw dump only to drill into a specific run by
reference.

## Forbidden (never run)

- Anything that writes or changes state. The tool ships only the read commands
  above; it has no assistant-management or thread-mutation commands. If a question
  seems to need a mutating action, it is out of scope for this skill — say so;
  don't attempt it.
- Do not invent flags. Only the flags documented in
  `<repo_root>/tools/trace_tools/README.md` are valid (there is no `--full`,
  `--verbose`, or `--format`).
```

- [ ] **Step 2: Confirm the rewrite is clean**

Run:
```bash
git --no-pager grep -nE "langgraph_cli|langgraph-tool|\buv\b|--full|--verbose|--format json|thread get-history" -- plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/trace-tool-commands.md
```
Expected: **no matches**. (The dropped `thread get-history` entry and all `uv`/`langgraph` forms are gone; no stale flags.)

- [ ] **Step 3: No commit yet** — committed in Task 9.

---

### Task 4: Create the digest-format reference

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/digest-format.md`

- [ ] **Step 1: Write the new file**

Create the file with:

```markdown
# Digest format — analyze-chat

`trace_digest.py` turns a raw dump (LangSmith `Run` JSON — see `dump-schema.md`)
into a compact Markdown digest. The digest is the **primary** analysis artifact:
read it first, and open the raw dump only to inspect a specific run's exact
`inputs`/`outputs`. The transform is local and read-only — no network, no LLM.
(Authoritative detail: the tool README, `<repo_root>/tools/trace_tools/README.md`.)

## Reference convention — `#N` `<run-id>`

Every line in the digest carries a reference back to the run it came from:

- `#N` — the run's **ordinal in the timeline**, ordered by `dotted_order` (or by
  `start_time` when `dotted_order` is absent). `#1` is the first run, `#2` the
  next, and so on.
- `<run-id>` — the run's `id` (the value you search for in the raw dump to open
  that exact run).

So a digest line tagged `#7 `a1b2c3…`` points at the seventh run in the timeline,
whose `id` is `a1b2c3…`. To drill in, find that `id` in the dump JSON.

## Sections

The digest has up to six sections; each is populated from the dump and tolerant of
missing or renamed fields (an unrecognized run still appears by its `id`, and an
unreadable file yields a plain message, not a stack trace):

1. **Timeline** — every run in `dotted_order`/`start_time` order: name, run type,
   status.
2. **Skills in scope** — from the `skill_resolver` run's
   `outputs.available_skills[]`: each skill's name, scope, version, description
   (what was offered to the model).
3. **Tools / skills fired** — the `tool` runs: name, a truncated argument summary,
   and success/error.
4. **Errors** — runs with `status == "error"`: name, run type, the error message,
   and parent context.
5. **What the model saw** — per `llm` run: the tools bound to that turn (from
   `extra.invocation_params.tools`) plus a pointer to that run's `inputs` (the
   messages/system prompt are **not** inlined — open the run by reference to read
   them).
6. **Tokens / cost** — per `llm` run and the totals.

## How to use it with the playbook

`analysis-playbook.md` maps author questions to dump fields. With the digest you
usually answer straight from a section (e.g. "did the `<name>` skill trigger?" →
**Skills in scope** for whether it was offered, **Tools / skills fired** for
whether it ran), and only open the raw dump by `#N`/`id` when you need the exact
`inputs`/`outputs` of a run.
```

- [ ] **Step 2: Confirm the file exists and lists all six sections**

Run:
```bash
test -f plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/digest-format.md && grep -cE "^[0-9]\. \*\*" plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/digest-format.md
```
Expected: file exists; count is `6` (the six numbered sections).

- [ ] **Step 3: No commit yet** — committed in Task 9.

---

### Task 5: Confirm dump-schema.md is unchanged (and record the flag-residue deviation)

**Files:**
- Verify only (no edit): `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/dump-schema.md`

The spec and the handoff both say `references/dump-schema.md` is **unchanged** — the dump JSON shape is preserved, so the field-level navigation guidance stays valid.

- [ ] **Step 1: Confirm the file is untouched by this branch**

Run:
```bash
git --no-pager diff --name-only -- plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/dump-schema.md
```
Expected: **no output** (the file is not modified by this plan).

- [ ] **Step 2: Record the known residue for the gate-1 reviewer**

`dump-schema.md` still mentions the old `langgraph_cli` flags `--format json` (line 3) and `--full` (lines 42–44), which do not exist in the new tool. Per the explicit "unchanged" instruction this plan **does not** edit them. **Deviation flagged for review:** if the gate-1 reviewer prefers the skill to carry zero stale flag references, a minimal follow-up edit can neutralize those two mentions (the field descriptions themselves remain valid). Do not make that edit without reviewer sign-off — it is outside the spec's stated "unchanged" scope. (See Self-Review and the Report.)

- [ ] **Step 3: No commit** — verification only.

---

### Task 6: Reconcile the architecture reference (skill-author-plugin.md)

**Files:**
- Modify: `design_docs/architecture/references/skill-author-plugin.md`

- [ ] **Step 1: Update the analyze-chat structure block (~lines 137–145)**

The block currently reads:
```markdown
plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/
  SKILL.md
  references/
    preflight-checklist.md   uv / vendored-tool / .env / repo_root checks
    trace-tool-commands.md   read-only command allowlist + invocation forms
    dump-schema.md           LangSmith Run JSON shape, for analysis
    analysis-playbook.md     common author questions → how to answer from a dump
```
Replace it with:
```markdown
plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/
  SKILL.md
  references/
    preflight-checklist.md   python3 / .env / repo_root checks
    trace-tool-commands.md   read-only command allowlist + invocation forms
    digest-format.md         digest sections + the #N/id reference convention
    dump-schema.md           LangSmith Run JSON shape, for analysis
    analysis-playbook.md     common author questions → how to answer from a dump
```

- [ ] **Step 2: Rewrite the "Fetch" bullet (~lines 147–152)**

The bullet currently reads:
```markdown
- **Fetch.** It drives the **vendored `langgraph_cli` trace tool** in
  `project-a-skills` (`uv run --env-file <repo_root>/.env langgraph-tool trace
  get-by-thread|get|list …`, cwd = `<repo_root>/tools/langgraph_cli/` so `uv`
  resolves the tool's env), dumping to a gitignored `trace_dumps/`. The tool is
  documented as a vendored mirror in `project-a-skills/docs/architecture/`
  (ADR 0006).
```
Replace it with:
```markdown
- **Fetch + digest.** It drives the **stdlib `trace_tools`** in `project-a-skills`
  (`python3 <repo_root>/tools/trace_tools/trace_fetch.py get-by-thread|get|list …
  --env-file <repo_root>/.env`), run with stock `python3` — no `uv`, no pinned
  Python, no working-directory requirement — dumping to a gitignored
  `trace_dumps/`. A second script, `trace_digest.py`, turns the dump into a compact
  Markdown digest (the primary analysis artifact; the LLM drills into the raw dump
  by `#N`/`id` reference). The tool and its dump/digest formats are documented in
  `project-a-skills/tools/trace_tools/README.md` (the source of truth) and that
  repo's ADR 0008.
```

- [ ] **Step 3: Rewrite the "Credentials/privacy" bullet (~lines 160–163)**

The bullet currently reads:
```markdown
- **Credentials/privacy.** The team-provided `.env` (LangSmith key) lives at the
  `project-a-skills` **repo root** and is injected via `uv run --env-file` (the
  tool's own dotenv only reads `tools/langgraph_cli/`, not the root); the root
  `.env` is gitignored, the key is never echoed, and dumps (possible customer
  data) stay in gitignored `trace_dumps/`.
```
Replace it with:
```markdown
- **Credentials/privacy.** The team-provided `.env` (LangSmith key) lives at the
  `project-a-skills` **repo root** and is passed to the stdlib tool on every fetch
  via `--env-file "<repo_root>/.env"`; the root `.env` is gitignored, the key is
  never echoed, and dumps and digests (possible customer data) stay in gitignored
  `trace_dumps/`.
```

- [ ] **Step 4: Confirm no `langgraph_cli`/`uv` mentions remain in the analyze-chat section**

Run:
```bash
git --no-pager grep -nE "langgraph_cli|langgraph-tool|\buv\b|vendored" -- design_docs/architecture/references/skill-author-plugin.md
```
Expected: **no matches** (the analyze-chat section no longer references the vendored tool or `uv`). If a match appears outside the analyze-chat section, confirm it is unrelated before deciding — this plan only repoints the analyze-chat description.

- [ ] **Step 5: No commit yet** — committed in Task 9.

---

### Task 7: Reconcile ADR 0006 wording to the new commands

**Files:**
- Modify: `design_docs/architecture/decisions/0006-analyze-chat-read-only-allowlist.md`

The **decision** (a read-only allowlist) stands unchanged; only the tool/command wording is reconciled, and a dated update note records the move to the self-contained tool. ADRs are append-only in spirit — keep the original Context/Decision/Consequences and add the note rather than deleting history.

- [ ] **Step 1: Update the Context paragraph (~lines 8–15)**

The Context currently opens:
```markdown
`chatrevenue-analyze-chat` drives the vendored `langgraph_cli` tool. That tool
can do more than read: it also has `assistant update*`, `assistant create/clone`,
and `thread update-state` commands (some WIP / auth-flaky). The skill runs on a
non-technical author's machine with a real LangSmith/deployment credential in
scope. Letting the skill reach any tool command risks an author (or a
misinterpreted request) mutating a live assistant or thread.
```
Leave this Context paragraph as the original historical record (it describes the situation at the time of the decision). Do **not** edit it.

- [ ] **Step 2: Update the Decision paragraph (~lines 17–24)**

The Decision currently reads:
```markdown
The skill is constrained to a **read-only allowlist**: `trace get`,
`trace get-by-thread`, `trace list`, and optionally `thread get-history`. All
mutating and assistant-management commands are explicitly **forbidden** and
enumerated as such in `references/trace-tool-commands.md`. If a request seems to
need a mutating command, the skill declines and says it's out of scope rather
than running it.
```
Replace it with:
```markdown
The skill is constrained to a **read-only allowlist**, enumerated in
`references/trace-tool-commands.md`. If a request seems to need a mutating
command, the skill declines and says it's out of scope rather than running it.

> **Update (2026-06-16, `analyze-chat-self-contained`):** the skill now drives the
> stdlib `trace_tools` (`trace_fetch.py` + `trace_digest.py`) from `<repo_root>`
> instead of the vendored `langgraph_cli`. The allowlist is the new read-only
> invocations: `trace_fetch.py get-by-thread|get|list` (fetch) and
> `trace_digest.py` (local JSON→Markdown digest). The optional `thread
> get-history` entry is dropped. The new tool has **no** mutating or
> assistant-management commands at all, so the read-only guarantee is now true by
> construction as well as by allowlist. The detailed source of truth is
> `project-a-skills/tools/trace_tools/README.md`.
```

- [ ] **Step 3: Confirm the ADR still parses as the read-only decision and names the new tool**

Run:
```bash
git --no-pager grep -nE "read-only allowlist|trace_tools|trace_fetch\.py|trace_digest\.py" -- design_docs/architecture/decisions/0006-analyze-chat-read-only-allowlist.md
```
Expected: matches for "read-only allowlist" and the three `trace_tools`/`trace_fetch.py`/`trace_digest.py` mentions. (The decision is intact and reconciled to the new commands.)

- [ ] **Step 4: No commit yet** — committed in Task 9.

---

### Task 8: Bump the plugin version

**Files:**
- Modify: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json:3`

- [ ] **Step 1: Confirm the current version**

Run:
```bash
git --no-pager grep -n '"version"' -- plugins/chatrevenue-skill-author/.claude-plugin/plugin.json
```
Expected: `"version": "0.3.2",`

- [ ] **Step 2: Edit the version to `0.4.0`**

Change line 3 of `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` from:
```json
  "version": "0.3.2",
```
to:
```json
  "version": "0.4.0",
```
Leave every other field untouched.

- [ ] **Step 3: Verify the manifest is still valid JSON and shows the new version**

Run:
```bash
python3 -c "import json;print(json.load(open('plugins/chatrevenue-skill-author/.claude-plugin/plugin.json'))['version'])"
```
Expected: prints `0.4.0`. (If `node` is preferred and available: `node -e "console.log(require('./plugins/chatrevenue-skill-author/.claude-plugin/plugin.json').version)"`.)

- [ ] **Step 4: No commit yet** — committed in Task 9.

---

### Task 9: Commit on a feature branch

**Files:**
- All files modified/created in Tasks 1–4, 6–8 (dump-schema.md from Task 5 is intentionally unchanged and must NOT appear in the diff).

- [ ] **Step 1: Create a feature branch off `main`**

Run:
```bash
git switch -c analyze-chat-self-contained
```
Expected: `Switched to a new branch 'analyze-chat-self-contained'`

- [ ] **Step 2: Stage exactly the in-scope files**

Run:
```bash
git add \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/trace-tool-commands.md \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/digest-format.md \
  design_docs/architecture/references/skill-author-plugin.md \
  design_docs/architecture/decisions/0006-analyze-chat-read-only-allowlist.md \
  plugins/chatrevenue-skill-author/.claude-plugin/plugin.json
```

- [ ] **Step 3: Confirm exactly those seven files are staged and dump-schema.md is not**

Run:
```bash
git --no-pager diff --cached --name-only
```
Expected: exactly the seven paths above. `dump-schema.md`, `analysis-playbook.md`, any `project-a-skills` path, ADR 0009, and the 2026-06-08 design doc must **not** appear.

- [ ] **Step 4: Commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
feat(analyze-chat): self-contained stdlib trace fetch + digest (v0.4.0)

Repoint chatrevenue-analyze-chat from the vendored langgraph_cli (uv +
Python 3.13) to the stdlib trace_tools in project-a-skills, invoked from
repo_root with stock python3. Drop the uv/Python-3.13/tool-build pre-flight
checks (python3 + repo_root + creds only); fetch via trace_fetch.py; add a
digest step (trace_digest.py) read as the primary artifact, drilling into the
dump by #N/id reference. Rewrite the read-only allowlist to the new
invocations (README is source of truth), add references/digest-format.md,
reconcile the architecture reference and ADR 0006 wording, and bump the
plugin to 0.4.0. dump-schema.md unchanged; hide-the-plumbing (ADR 0009)
preserved. No tool code added here.

Spec: project-a-skills/docs/specs/2026-06-16-analyze-chat-self-contained-design.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```
Expected: one commit recording 7 files changed (1 new: `digest-format.md`).

---

### Task 10: Open the PR (hold at the deploy gate)

**Files:** none (git/GitHub only).

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin analyze-chat-self-contained
```
Expected: branch pushed; PR-create hint printed.

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --base main --head analyze-chat-self-contained \
  --title "feat(analyze-chat): self-contained stdlib trace fetch + digest (v0.4.0)" \
  --body "$(cat <<'EOF'
Repoints the `chatrevenue-analyze-chat` skill from the vendored `langgraph_cli`
(driven by `uv` on Python 3.13) to the stdlib `trace_tools` (`trace_fetch.py` +
`trace_digest.py`) already merged on `project-a-skills` `main`, invoked from the
user's clone (`<repo_root>`) with stock `python3`. No tool code is copied here.

Spec: project-a-skills/docs/specs/2026-06-16-analyze-chat-self-contained-design.md
(secondary "chatrevenue-marketplace (thin skill edit)" scope).

Changes (consumer-side, pure markdown):
- Pre-flight drops the `uv` / Python-3.13 / vendored-tool-build / tool-runs checks;
  keeps `python3` + `repo_root` + creds only.
- Step 3 fetches via `python3 <repo_root>/tools/trace_tools/trace_fetch.py …`
  (no `uv`, no cwd requirement); new Step 3.5 runs `trace_digest.py`; Step 4 reads
  the digest first and drills into the dump by `#N`/`id` reference.
- `references/trace-tool-commands.md` rewritten to a thin read-only allowlist of the
  new invocations, naming the tool README as the source of truth (ADR 0006 read-only
  guarantee preserved — and now true by construction; `thread get-history` dropped).
- Adds `references/digest-format.md` (sections + `#N`/`id` convention).
  `references/dump-schema.md` unchanged.
- Repoints the architecture reference (`skill-author-plugin.md`) and reconciles
  ADR 0006 wording to the new commands.
- Bumps `chatrevenue-skill-author` 0.3.2 → 0.4.0. Hide-the-plumbing (ADR 0009)
  preserved.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: prints the PR URL. Capture it for the Report.

- [ ] **Step 3: STOP — hold for the deploy gate**

Per the delivery process, **deploy (merge to `main`) is a gated step**. Do **not** merge here. Report the PR URL and wait for the deploy-approved gate. When approved:
```bash
gh pr merge --squash --delete-branch
```
Expected (only after approval): PR merged into `main`; `main` carries v0.4.0 and the new content — the published marketplace reflects the change.

- [ ] **Step 4: After merge, confirm `main` carries the change**

Run:
```bash
git fetch origin main
git --no-pager show origin/main:plugins/chatrevenue-skill-author/.claude-plugin/plugin.json | grep version
git --no-pager show origin/main:plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/trace-tool-commands.md | grep -c "trace_fetch.py"
```
Expected: version `0.4.0` on `origin/main`; `trace_fetch.py` present in the allowlist on `main`.

---

### Task 11: Functional verification — skill ↔ tool parity walk-through

**Why a walk-through, not a code test:** the deliverable is agent guidance (markdown), and the integration assertion the spec calls for ("the skill's allowlist commands match the tool's actual CLI and the README", spec "Join (delivery phase 5)" + "Skill ↔ tool parity") is a documentation-parity check. This follows the `writing-skills` scenario-walk-through discipline.

- [ ] **Step 1: Allowlist ↔ README parity**

Open `references/trace-tool-commands.md` and `project-a-skills/tools/trace_tools/README.md` side by side. Confirm, command by command, that each allowlisted invocation matches a README command (subcommand name, the `--env-file`/`-o` form, and the flag set — `--limit`, `--project`, `--start-time`; **no** `--full`/`--verbose`/`--format`). Confirm the digest command matches the README's `trace_digest.py … -o …` form.

Expected: every allowlisted command corresponds to a README command; no allowlisted flag is absent from the README; the dropped `thread get-history` appears nowhere.

- [ ] **Step 2: Read-only guarantee intact (ADR 0006)**

Confirm the allowlist contains only fetch (`get-by-thread`/`get`/`list`) and digest commands, that the "Forbidden" section forbids any state-changing action, and that ADR 0006's reconciled Decision still reads as a read-only allowlist. Cross-check the README's "Read-only" note (fetcher does only `GET` + `POST /runs/query`; digest is local).

Expected: no mutating command anywhere in the allowlist; ADR 0006 still asserts read-only.

- [ ] **Step 3: Digest reference convention documented and used**

Confirm `references/digest-format.md` defines the `#N` `<run-id>` convention and the six sections, and that SKILL.md Step 4 instructs reading the digest first and drilling into the dump by `#N`/`id`.

Expected: convention defined in one place; SKILL.md Step 4 references it.

- [ ] **Step 4: Hide-the-plumbing preserved (ADR 0009)**

Confirm SKILL.md still has the "Talking to the author — hide the plumbing" section with the two rules and "Silent ≠ pretending it worked", and that the refreshed ❌ example still names *forbidden* technical noise (now the proxy/HTTP/PEM/digest-parsing variant) rather than narrating it as acceptable. Confirm the pre-flight still recovers a misnamed env file silently.

Expected: the principle, structure, and silent-recovery posture are unchanged; only the example's specifics moved off `uv`/Python 3.13.

- [ ] **Step 5 (optional, if a live `project-a-skills` clone + team creds are available): real end-to-end**

In a clone with `tools/trace_tools/` and a valid `.env`, run a real `trace_fetch.py get-by-thread <id>` then `trace_digest.py` over the dump, and confirm the digest's `#N`/`id` references resolve to real run `id`s in the dump. If no live clone/creds are available to the executor, Steps 1–4 are the verification of record (the producer repo owns the live golden-comparison + digest-against-real-dumps tests); note the live run as a join-phase check.

- [ ] **Step 6: No commit** — verification only. Record the parity mapping in the Report as evidence.

---

### Task 12: Advance the plan stage

**Files:**
- Move: `engineering_plans/drafts/2026-06-16-analyze-chat-self-contained.md` → `engineering_plans/ongoing/` → `engineering_plans/done/`.

Per the delivery design, plan-stage moves are git operations owned by Code.

- [ ] **Step 1: When execution starts, move drafts → ongoing**

Run:
```bash
git mv engineering_plans/drafts/2026-06-16-analyze-chat-self-contained.md engineering_plans/ongoing/
git commit -m "chore(plan): analyze-chat-self-contained drafts->ongoing"
```

- [ ] **Step 2: After deploy + functional verification pass, move ongoing → done**

Run:
```bash
git mv engineering_plans/ongoing/2026-06-16-analyze-chat-self-contained.md engineering_plans/done/
git commit -m "chore(plan): analyze-chat-self-contained ongoing->done"
```
(The final `done→documented` move is the documentation gate — out of this plan's scope.)

---

## Self-Review

**1. Spec coverage (secondary scope, spec lines 198–215):**
- "Step 2 pre-flight drops `uv`/Python-3.13/tool-build checks; needs only stock `python3` + `repo_root` + creds" → **Task 1** (preflight-checklist.md) + **Task 2 Step 2** (SKILL.md Step 2 prose).
- "Step 3 calls `trace_fetch.py` from `repo_root`" → **Task 2 Step 3**.
- "new Step 3.5 runs `trace_digest.py`" → **Task 2 Step 4**.
- "Step 4 reads the digest first, drills into the dump by reference" → **Task 2 Step 5**.
- "`references/trace-tool-commands.md`: thin read-only allowlist of the new invocations, pointing at the repo tool README as source of truth" → **Task 3**.
- "`references/dump-schema.md` unchanged" → **Task 5** (verified untouched; residue flagged).
- "add `references/digest-format.md` (digest sections + `#N`/`id` convention)" → **Task 4**.
- "Remove remaining `langgraph_cli`/`uv` mentions in the analyze-chat skill and in the architecture reference (`skill-author-plugin.md`), repointing at the new tool" → **Task 2** (SKILL.md), **Task 1/3** (references), **Task 6** (architecture ref). Greps in Tasks 1/2/3/6 assert zero residue.
- "reconcile marketplace ADR 0006 (read-only allowlist) wording to the new commands" → **Task 7**.
- "Bump the `chatrevenue-skill-author` plugin version" → **Task 8** (0.3.2 → 0.4.0).
- "Preserve hide-the-plumbing (marketplace ADR 0009)" → **Task 2 Step 1** (refresh ❌ example only), **Task 11 Step 4** (verify preserved); ADR 0009 itself left unedited (deliberate, documented in Context).
- Out of scope (honored): no `project-a-skills` edits; `langgraph_cli` retirement deferred to the producer repo; ADR 0009, the 2026-06-08 design doc, and `marketplace.json` untouched.
- Acceptance: read-only allowlist stays intact → Tasks 3, 7, 11 Steps 1–2. Version bump included → Task 8.

**2. Placeholder scan:** No TBD/TODO/"add error handling"/"similar to Task N". Every content step provides the full replacement text; every command step has an exact command and expected output. Angle-bracket tokens (`<repo_root>`, `<thread_id>`, `<id>`, `<n>`) are the skill's own runtime placeholders (the values the skill fills at use time), not plan gaps — they are reproduced verbatim from the tool README.

**3. Name/path consistency:** Tool paths are identical across tasks (`<repo_root>/tools/trace_tools/trace_fetch.py`, `…/trace_digest.py`). Script names, subcommands (`get-by-thread`/`get`/`list`), and flags (`--env-file`/`-o`/`--limit`/`--project`/`--start-time`) match the README in every task and in the verification. The new file name `references/digest-format.md` is consistent across Tasks 2 (References list + Step 4), 4 (create), 6 (architecture block), and 11. Version string `0.4.0` is consistent across Tasks 8, 9, 10. Branch name `analyze-chat-self-contained` is consistent across Tasks 9–10 and the plan filename.

**Deviation / assumption notes (also in the Report):**
- **`dump-schema.md` flag residue:** left unchanged per the explicit "unchanged" instruction, but it still mentions `--format json`/`--full` (old `langgraph_cli` flags). Flagged in Task 5 Step 2 for the gate-1 reviewer to optionally neutralize.
- **Version bump = minor (0.4.0):** assumption — this is a behavioral change, not a docs patch, so it earns a minor bump (prior `0.3.x` were patches). Reviewer may prefer `0.3.3`.
- **Absolute paths over README's repo-root-relative form:** the allowlist uses `python3 "<repo_root>/tools/trace_tools/…"` (absolute) rather than the README's repo-root-relative `python3 tools/trace_tools/…`, because the skill no longer pins a cwd. Functionally equivalent; matches the spec's data-flow section (lines 151–155).
- **ADR 0006 edited in place (with a dated update note):** the handoff explicitly sanctions reconciling ADR 0006 wording; the plan keeps the original Context as history and appends a dated update rather than rewriting the record.

---

## Execution notes for the orchestrator

- Pure-markdown consumer edit: no build, no code tests. "Functional verification" is the skill ↔ tool parity walk-through against the producer README (Task 11).
- The producer tool is already on `project-a-skills` `main`; this plan does not depend on any further producer change to *write*, only on that README staying the source of truth at execution time.
- Task 10 Step 3 holds at the deploy gate — merge only on approval.
- Expected next gate after this plan: **gate 1 — plan review**.
