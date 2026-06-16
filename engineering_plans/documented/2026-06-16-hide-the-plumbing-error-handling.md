# Hide the plumbing — non-technical error handling: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the already-drafted "hide the plumbing" error-handling guidance in the `chatrevenue-skill-author` plugin — commit it, bump the plugin version, and publish it so the running plugin carries it.

**Architecture:** This is a **content/finalize-and-publish** plan, not a code-build plan. The guidance is already written and uncommitted in the working tree (3 files). The work is: verify the drafted content is complete and internally consistent, commit it, bump the plugin `version`, push to `main` (which **is** the published marketplace — Cowork installs/updates from the GitHub repo), and verify by scenario walk-through that the shipped guidance produces a plain-language blocker (or silent workaround) rather than a technical autopsy. The `chatrevenue-skill-author` plugin is **pure markdown** — there is no build, bundle, or compile step.

**Tech Stack:** Cowork plugin marketplace (markdown skills + `plugin.json` manifest), git, GitHub (`Project-A-Inc/chatrevenue-marketplace`). No runtime, no tests-as-code.

**Spec:** `design_docs/2026-06-16-hide-the-plumbing-error-handling.md`
**Feature slug:** `hide-the-plumbing-error-handling`

---

## Context the executor must know

**The content is already present in the working tree, uncommitted.** Do **not** re-author it. `git status` shows these as modified (verified at plan-writing time):

| File | What it carries | Status |
|---|---|---|
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md` | New section **"Talking to the author — hide the plumbing"** — the two rules + a ❌/✅ example pair (the exact Python/proxy/PEM antipattern from the report) + "Silent ≠ pretending it worked". Plus reworded Step 2 ("surface only real blockers, in plain language") and Step 3 (use whatever env file is actually there). | drafted, uncommitted |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md` | New section **"Hide the plumbing (plugin-wide principle)"** — the two rules + "Silent ≠ pretending it worked"; routes env/git blocks through `references/escalation-template.md`. | drafted, uncommitted |
| `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md` | Reworded header + checks 4 & 5 to recover recoverable issues silently (env file under another name; first-run sync retry) and never print the technical reason. | drafted, uncommitted |

The committed (deployed) tree still has the **old** wording (analyze-chat said only "surface only blockers"; the author skill had no hide-the-plumbing section), which is why the running agent produced the technical dump. **The fix is to ship what is drafted, not to rewrite it.**

**Plan-writing-time check already performed (re-confirm in Task 1):**
- All three diffs are present and the content matches the spec's two rules + "silent ≠ pretending it worked".
- Both SKILL.md files contain the principle. The author skill calls it "plugin-wide".
- No other file in the plugin references the old "surface only blockers" phrasing that would now be inconsistent (grep returned only the two new section headers).
- The author skill references `references/escalation-template.md` (already exists in the repo) — confirm it is consistent, not re-author it.
- Plugin version lives **only** in `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` (`"version": "0.3.1"`). There is no CHANGELOG and no other file embeds the version.

**Deploy / publish meaning for this repo:** This marketplace is consumed by Cowork directly from the GitHub repo `Project-A-Inc/chatrevenue-marketplace`. "Redeploy / republish" = **merge the change to `main` on GitHub**. There is no separate deploy target or build artifact for this plugin. The `version` bump is the signal Cowork uses to offer the update. Picking the new content up in a *running* Cowork session is a user-side plugin update/restart (note it in the Report; it is not a git/code step the executor performs).

**Branch:** The repo is currently on `main`. Per repo convention (recent changes landed via PRs — `#9`, `#10`), create a feature branch and open a PR; do not commit directly to `main`.

---

## File Structure

No files are created or restructured. Files touched by this plan:

- **Modify (already drafted — finalize/commit as-is):**
  - `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md`
  - `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`
  - `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md`
- **Modify (this plan's only new edit):**
  - `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` — version `0.3.1` → `0.3.2`
- **Move at the end (plan-stage bookkeeping, per delivery process):**
  - this plan file: `engineering_plans/drafts/` → `engineering_plans/ongoing/` → `engineering_plans/done/`

**Version choice:** `0.3.1` → `0.3.2` (patch). This is a guidance/content correction with no behavioral interface change, matching how the prior docs-only change shipped as `v0.3.1`.

---

### Task 1: Verify the drafted content is complete and consistent

**Files:**
- Read: all three drafted files (above)
- Read: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/escalation-template.md`

- [ ] **Step 1: Confirm the three files are the only skill changes and inspect the full diff**

Run:
```bash
git status --short
git --no-pager diff -- plugins/chatrevenue-skill-author/skills
```
Expected: exactly these three modified, nothing else under `skills/`:
- `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md`
- `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md`
- `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`

(The untracked `design_docs/2026-06-16-*.md` files and unrelated `chatrevenue-analyze-chat` SKILL edits from the prior commit are out of scope — do not touch them. If `git status` shows the analyze-chat `SKILL.md` / `preflight-checklist.md` already partly committed, reconcile against the spec before proceeding.)

- [ ] **Step 2: Confirm both SKILL.md files carry the three required elements**

Run:
```bash
git --no-pager grep -n "Try safe workarounds silently first" -- plugins/chatrevenue-skill-author/skills
git --no-pager grep -n "Surface only real blockers" -- plugins/chatrevenue-skill-author/skills
git --no-pager grep -n "Silent ≠ pretending it worked" -- plugins/chatrevenue-skill-author/skills
```
Expected: each of the first two phrases appears in **both** SKILL.md files; "Silent ≠ pretending it worked" appears in **both** SKILL.md files. (These three are the acceptance-criteria elements: the two rules + the "silent ≠ pretending it worked" caveat.)

- [ ] **Step 3: Confirm no stale "surface only blockers" wording remains**

Run:
```bash
git --no-pager grep -n "surface only blockers" -- plugins/chatrevenue-skill-author
```
Expected: **no matches**. (The old analyze-chat Step 2 phrase was reworded to "surface only real blockers, in plain language". A match here means a stale, now-inconsistent line was missed.)

- [ ] **Step 4: Confirm the ❌/✅ example pair and the escalation-template reference are present and consistent**

Read `chatrevenue-analyze-chat/SKILL.md` and confirm the ❌ example names the Python/proxy/PEM antipattern from the spec and the ✅ example is a plain-language next step with no tool names.
Read `chatrevenue-skill-author/SKILL.md` and confirm it routes environment/git blocks through `references/escalation-template.md`.
Read `chatrevenue-skill-author/references/escalation-template.md` and confirm it is plain-language (no raw error text) and consistent with the new principle — **do not re-author it**; only note an inconsistency if one exists.

Expected: all consistent. If any element is missing or contradictory, fix it inline in the drafted file to match the spec (`design_docs/2026-06-16-hide-the-plumbing-error-handling.md`) before continuing. This is the one place the plan permits editing the drafted prose — only to close a gap against the spec, never to rewrite working content.

- [ ] **Step 5: No commit yet** — content verification only; the commit happens in Task 3 together with the version bump.

---

### Task 2: Bump the plugin version

**Files:**
- Modify: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json:3`

- [ ] **Step 1: Confirm the current version**

Run:
```bash
git --no-pager grep -n '"version"' -- plugins/chatrevenue-skill-author/.claude-plugin/plugin.json
```
Expected: `"version": "0.3.1",`

- [ ] **Step 2: Edit the version to `0.3.2`**

Change line 3 of `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` from:
```json
  "version": "0.3.1",
```
to:
```json
  "version": "0.3.2",
```
Leave every other field untouched.

- [ ] **Step 3: Verify the manifest is still valid JSON and shows the new version**

Run:
```bash
node -e "console.log(require('./plugins/chatrevenue-skill-author/.claude-plugin/plugin.json').version)"
```
Expected: prints `0.3.2`. (Node is a documented prerequisite for this repo. If unavailable, use `python -c "import json;print(json.load(open('plugins/chatrevenue-skill-author/.claude-plugin/plugin.json'))['version'])"`.)

- [ ] **Step 4: No commit yet** — committed together with the content in Task 3.

---

### Task 3: Commit on a feature branch

**Files:**
- All four modified files from Tasks 1–2.

- [ ] **Step 1: Create a feature branch off `main`**

Run:
```bash
git switch -c hide-the-plumbing-error-handling
```
Expected: `Switched to a new branch 'hide-the-plumbing-error-handling'`

- [ ] **Step 2: Stage exactly the four in-scope files**

Run:
```bash
git add \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md \
  plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/references/preflight-checklist.md \
  plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md \
  plugins/chatrevenue-skill-author/.claude-plugin/plugin.json
```

- [ ] **Step 3: Confirm only those four files are staged**

Run:
```bash
git --no-pager diff --cached --name-only
```
Expected: exactly the four paths above — nothing from `design_docs/` and nothing else. (The untracked design docs stay unstaged; they are out of this plan's scope.)

- [ ] **Step 4: Commit**

Run:
```bash
git commit -m "docs(skill-author): hide-the-plumbing error handling (v0.3.2)

Ship the plugin-wide hide-the-plumbing principle in both skills:
try safe workarounds silently, surface only real blockers in plain
language, and never pretend a failure worked. Reword analyze-chat
pre-flight to recover recoverable env issues silently. Bump plugin
to 0.3.2.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: one commit recording 4 files changed.

---

### Task 4: Publish (open PR and merge to `main`)

**Files:** none (git/GitHub only).

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin hide-the-plumbing-error-handling
```
Expected: branch pushed; PR-create hint printed.

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --base main --head hide-the-plumbing-error-handling \
  --title "docs(skill-author): hide-the-plumbing error handling (v0.3.2)" \
  --body "$(cat <<'EOF'
Ships the already-drafted hide-the-plumbing error-handling guidance in the
chatrevenue-skill-author plugin (both SKILL.md files + analyze-chat pre-flight
checklist) and bumps the plugin version 0.3.1 → 0.3.2.

Spec: design_docs/2026-06-16-hide-the-plumbing-error-handling.md

- Two rules: try safe workarounds silently first; surface only real blockers in
  plain language (no tool names, versions, status/exit codes, stack traces,
  file-format details).
- "Silent ≠ pretending it worked" caveat in both skills.
- analyze-chat pre-flight recovers recoverable env issues silently.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: prints the PR URL. Capture it for the Report.

- [ ] **Step 3: Merge to `main` (this is the "deploy/publish" for this marketplace)**

Per the delivery process, deploy is Code's job and happens at this gate. Merge once any required checks/approvals pass:
```bash
gh pr merge --squash --delete-branch
```
Expected: PR merged into `main`; `main` now carries v0.3.2 and the new content — the published marketplace reflects the change.

> If the orchestrator's process requires an explicit **deploy-approved** gate before merge (phase 3 of the delivery design), STOP after Step 2, report the PR URL, and merge only after approval. Confirm with the HandOff which applies. Default: do not merge until the deploy gate is approved.

- [ ] **Step 4: Confirm `main` carries the change**

Run:
```bash
git fetch origin main
git --no-pager show origin/main:plugins/chatrevenue-skill-author/.claude-plugin/plugin.json | grep version
git --no-pager grep -n "Silent ≠ pretending it worked" $(git rev-parse origin/main) -- plugins/chatrevenue-skill-author/skills || git --no-pager show origin/main:plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md | grep -n "Silent"
```
Expected: version `0.3.2` on `origin/main`; the principle text present on `origin/main` in both skills.

---

### Task 5: Functional verification (scenario walk-through)

**Why a walk-through, not a code test:** the deliverable is agent guidance (markdown), so "functional verification" means confirming the *shipped* guidance drives the desired behavior — a plain-language blocker or a silent safe workaround — instead of a technical autopsy. This follows the `writing-skills` scenario-walk-through discipline. The acceptance criterion is behavioral: a re-run of the chat-analysis flow against an unreachable environment yields a short plain-language blocker (or a silent workaround), not a technical dump.

- [ ] **Step 1: Read the shipped analyze-chat guidance as the agent would**

Read (from `origin/main`) `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md` "Talking to the author — hide the plumbing" and `references/preflight-checklist.md` checks 4–5.

- [ ] **Step 2: Walk the reported failure scenario against the guidance**

Take the exact failure from the spec: `langgraph-tool` needs Python ≥3.13 vs sandbox 3.10; `uv` proxy 403; env file named `env.txt` with a multiline PEM key.
Confirm, point by point, that the shipped text directs the agent to:
- env file named `env.txt` → **silently** point `--env-file` at the file that's there (pre-flight check 4) — recoverable, not surfaced.
- first-run dependency sync → **retry once silently** (pre-flight check 5).
- genuinely unreachable runtime with no workaround → surface a **plain-language** blocker matching the ✅ example ("I can't pull up that conversation from here… open it in your skills project"), with **no** tool names, version numbers, proxy/HTTP codes, exit codes, stack traces, or file-format details (the ❌ example is explicitly forbidden).

Expected: every branch resolves to either a silent safe workaround or a plain-language blocker. Record this mapping in the Report as the verification evidence.

- [ ] **Step 3 (optional, if a live Cowork instance is available): real re-run**

In a Cowork session with the updated plugin installed (v0.3.2), trigger the chat-analysis flow against an unreachable environment and confirm the actual reply is a short plain-language blocker or a silent workaround — not a technical autopsy. If a live instance is not available to the executor, the Step 2 walk-through is the verification of record; note the live re-run as a user-side check (it requires the user to update the plugin in Cowork and restart).

- [ ] **Step 4: No commit** — verification only.

---

### Task 6: Advance the plan stage

**Files:**
- Move: `engineering_plans/drafts/2026-06-16-hide-the-plumbing-error-handling.md` → `engineering_plans/done/` (via `ongoing/` if your process tracks execution-in-progress).

Per the delivery design, plan-stage moves are git operations owned by Code.

- [ ] **Step 1: When execution starts, move drafts → ongoing**

Run:
```bash
git mv engineering_plans/drafts/2026-06-16-hide-the-plumbing-error-handling.md engineering_plans/ongoing/
git commit -m "chore(plan): hide-the-plumbing drafts→ongoing"
```

- [ ] **Step 2: After deploy + functional verification pass, move ongoing → done**

Run:
```bash
git mv engineering_plans/ongoing/2026-06-16-hide-the-plumbing-error-handling.md engineering_plans/done/
git commit -m "chore(plan): hide-the-plumbing ongoing→done"
```
(The final `done→documented` move is phase 8, after the documentation gate — out of this plan's scope.)

---

## Self-Review

**1. Spec coverage:**
- "Finalize and commit the already-drafted edits in both SKILL.md files (+ consistent reference wording)" → Tasks 1, 3 (preflight-checklist.md included).
- "Bump the plugin version (currently 0.3.1)" → Task 2 (→ 0.3.2).
- "Redeploy / republish so the running version carries the change" → Task 4 (merge to `main` = publish; user-side Cowork update noted).
- Acceptance: both SKILL.md contain the two rules + "silent ≠ pretending it worked" → verified in Task 1 Step 2; on `main` in Task 4 Step 4.
- Acceptance: deployed/published plugin reflects the new content → Task 4 (merge + verify `origin/main`).
- Acceptance: version bumped from 0.3.1 → Task 2.
- Acceptance: re-run against unreachable env yields a plain-language blocker / silent workaround → Task 5.
- Out of scope (honored): no change to the `chatrevenue` agent plugin, the trace tool, or the sandbox runtime — this plan touches only the `chatrevenue-skill-author` plugin.

**2. Placeholder scan:** No TBD/TODO/"add error handling"/"similar to Task N" placeholders. Every step has an exact command and expected output. The only prose edit permitted (Task 1 Step 4) is scoped to closing a spec gap, not open-ended authoring.

**3. Type/name consistency:** File paths are identical across tasks. Version string `0.3.2` is consistent across Tasks 2, 3, and 4. Branch name `hide-the-plumbing-error-handling` is consistent across Tasks 3–4. The three required phrases checked in Task 1 ("Try safe workarounds silently first", "Surface only real blockers", "Silent ≠ pretending it worked") match the spec verbatim.

---

## Execution notes for the orchestrator

- This is mostly **finalize / verify / commit / version-bump / publish** — the content already exists and was confirmed complete and consistent at plan-writing time.
- The only original edit this plan introduces is the one-line version bump (Task 2). Everything else is verification, git, and a scenario walk-through.
- The merge in Task 4 Step 3 is the deploy. If the process enforces a **deploy-approved** gate before merge, hold at the PR and merge on approval.
