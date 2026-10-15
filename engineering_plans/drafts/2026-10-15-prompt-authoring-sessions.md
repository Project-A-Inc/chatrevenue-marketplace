# Prompt authoring sessions — entry skill: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a routing-only skill `chatrevenue-prompt-author` to the `chatrevenue-skill-author` plugin that finds the user's connected prompts project and hands the session over to the authoring process that project describes, and ship it as plugin version 0.5.0.

**Architecture:** Pure-markdown content change (marketplace ADR 0002: no MCP server, no build, no code tests). The new skill holds **only** the four routing steps of spec §3 — no dialog vocabulary, rules, API shapes, HandOff template, references directory or restated contract (spec M2). Everything a prompt-authoring session must know lives in the prompts project (`project-a-kl-config`) behind one stable entry point: `CLAUDE.md` at its root, heading `## Prompt authoring sessions` (spec §4 Consumes, E1). This repo never reads or copies that project's content; the skill reads it at run time from the user's connected folder.

**Tech Stack:** Cowork plugin marketplace (markdown `SKILL.md` + `plugin.json` / `marketplace.json` manifests), git, GitHub (`Project-A-Inc/chatrevenue-marketplace`). Verification uses Git Bash `grep` and `python -c "import json"` (Python 3.11 is on PATH) plus a manual Cowork check.

**Spec:** `design_docs/prompt-authoring-sessions-design.md` (v1.0.0, sha256 LF `f406db2c83ea4146885bb14c808ba048be24614fe63effeaacbff65ff0ab756e`).
**Feature slug:** `prompt-authoring-sessions`
**Branch:** `prompt-authoring-sessions` — one branch, one PR for spec + plan + implementation. The PR stays open (not merged) after the plan commit; merge only after the deploy gate and Sasha's explicit "yes".

## Global Constraints

- New skill name: `chatrevenue-prompt-author`, in plugin `chatrevenue-skill-author` (spec M1).
- Skill path: `plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md` — no `references/` directory, no restated contract (spec §3 Contents rule).
- Skill body holds only the four steps of spec §3 (+ the one hide-the-plumbing line §3 calls for). It contains no API route, placeholder name, branch or PR convention (spec AC1).
- Locating the clone (spec M3): the connected folder whose root has `CLAUDE.md` with the heading `## Prompt authoring sessions`. Several candidates or none → ask the author **once**, in plain words, to connect or pick their prompts project folder. No stored path.
- The skill relies only on the file `CLAUDE.md` and that exact heading text (spec §4 E1). The file the route names is followed, not restated.
- `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` → version `0.5.0`; description adds "and Knowledge Lake summary prompts" (spec §3).
- `.claude-plugin/marketplace.json` → the `chatrevenue-skill-author` description adds the prompt authoring (spec §3).
- `plugins/chatrevenue-skill-author/README.md` → new section *Prompt authoring* with: prerequisite (local clone of the prompts project, connected to the Cowork project), what the author sees, and "the process itself is described in the prompts project" (spec §3).
- Out of scope: any change to `chatrevenue-skill-author` or `chatrevenue-analyze-chat` skills; moving the skill author to the routing model; architecture docs (phase 6).
- Never read, copy or link into another repository from this repo's files (the README names the prompts project, it does not link into it).
- Commits: explicit `git add <paths>` only. Never stage `engineering_plans/drafts/HANDOFF-to-claude-code.md`.

## Review Focus

1. **Wrong folder with a `CLAUDE.md`** (e.g. the author connected `project-a-skills`, whose `CLAUDE.md` has no `## Prompt authoring sessions` heading) → that folder is not a candidate; the skill must not follow its `CLAUDE.md`. Pinned by Task 1 step text ("whose root has … with the heading") and AC3 manual scenario B' in Task 4.
2. **Heading present, routed file missing** (route names a file that does not exist in the clone) → plain-words "this folder is not the prompts project", stop; no guessing at another file. Pinned by step 4 of the skill and Task 4 manual scenario C.
3. **Several connected folders qualify** (e.g. two clones of the prompts project) → ask once which one; do not pick silently. Pinned by step 1 wording and Task 4 manual scenario D.
4. **Trigger collision with `chatrevenue-skill-author`** ("change how the agent summarizes deals" could read as an agent-skill change) → the description names the Knowledge Lake and summary prompts explicitly and says agent skills belong to `chatrevenue-skill-author`. Pinned by the description in Task 1 and Task 4 manual scenario E.
5. **Plumbing leakage** when a precondition fails (file names, headings, paths in the reply) → the author hears only "connect / pick your prompts project folder" or "this folder isn't the prompts project". Pinned by the plain-language line in the skill and checked in every Task 4 manual scenario.

---

## File structure

| Path | Change | Responsibility |
|---|---|---|
| `plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md` | Create | Routing-only entry skill (trigger + four steps) |
| `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` | Modify | Version 0.5.0, description |
| `.claude-plugin/marketplace.json` | Modify | `chatrevenue-skill-author` listing description |
| `plugins/chatrevenue-skill-author/README.md` | Modify | New *Prompt authoring* section before `## Install` |
| `design_docs/prompt-authoring-sessions-design.md` | Add (committed in phase 0b) | Spec, unchanged |
| `engineering_plans/drafts/2026-10-15-prompt-authoring-sessions.md` | Add (phase 0b) | This plan |

No other file changes. In particular the two existing `SKILL.md` files and their `references/` stay untouched.

---

### Task 0: Branch, spec and plan commit (done in phase 0b)

Recorded for completeness; the phase-0b executor performs it.

- [x] **Step 1:** `git switch -c prompt-authoring-sessions` from up-to-date `main`.
- [x] **Step 2:** `git add design_docs/prompt-authoring-sessions-design.md engineering_plans/drafts/2026-10-15-prompt-authoring-sessions.md` and commit `docs(prompt-authoring-sessions): spec v1.0.0 + implementation plan`.
- [x] **Step 3:** Push and open a PR (stays open; not merged for the plan alone).

Phase 2 starts with `git mv engineering_plans/drafts/2026-10-15-prompt-authoring-sessions.md engineering_plans/ongoing/` and its own commit `plan(prompt-authoring-sessions): drafts → ongoing`, on the same branch.

---

### Task 1: The routing skill

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md`

**Interfaces:**
- Consumes: spec §4 E1 — `CLAUDE.md` at the prompts project root, heading `## Prompt authoring sessions`, which names the authoring reference file.
- Produces: skill `chatrevenue-prompt-author` (front matter `name` + `description`); Task 3 README and Task 2 manifests refer to it by that name.

- [ ] **Step 1: Write the failing check** — save as a scratch script (not committed), e.g. `$SCRATCH/check-skill.sh`:

```bash
#!/usr/bin/env bash
# AC1 static check for the prompt-author skill. Exit 0 = pass.
set -u
F=plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md
D=$(dirname "$F")
fail=0
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
head -1 "$F" | grep -qx -- '---' || { echo "FAIL: no front matter"; fail=1; }
grep -qx 'name: chatrevenue-prompt-author' "$F" || { echo "FAIL: name"; fail=1; }
for p in 'change how deals are summarized' 'the summary of this company is' 'show me the prompt for contacts' 'try a new prompt' 'publish my prompt change' 'summary prompts' 'Knowledge Lake'; do
  tr '\n' ' ' < "$F" | tr -s ' ' | tr A-Z a-z | grep -qF "$(echo "$p" | tr A-Z a-z)" || { echo "FAIL: description lacks '$p'"; fail=1; }
done
grep -qF '## Prompt authoring sessions' "$F" || { echo "FAIL: heading not named"; fail=1; }
# Body = everything after the closing front-matter fence.
BODY=$(awk 'n>=2{print} /^---$/{n++}' "$F")
echo "$BODY" | grep -qE '^1\. ' && echo "$BODY" | grep -qE '^4\. ' || { echo "FAIL: four steps"; fail=1; }
echo "$BODY" | grep -qE '^5\. ' && { echo "FAIL: more than four steps"; fail=1; }
echo "$BODY" | grep -niE '/api|https?://|\{[a-z_]+\}|<[a-z_]+>|\bbranch|pull request|\bPRs?\b|HandOff|merge' && { echo "FAIL: forbidden content (API route/placeholder/branch/PR)"; fail=1; }
[ -z "$(ls -A "$D" | grep -v '^SKILL.md$')" ] || { echo "FAIL: extra files beside SKILL.md (no references dir)"; fail=1; }
[ $fail -eq 0 ] && echo "PASS: AC1"
exit $fail
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bash "$SCRATCH/check-skill.sh"`
Expected: `FAIL: …/SKILL.md missing`, exit 1.

- [ ] **Step 3: Create the skill** with exactly this content:

```markdown
---
name: chatrevenue-prompt-author
description: >
  Use this skill when the user wants to change, review, or try how the
  Knowledge Lake summarizes entities or relationships. Trigger on phrases
  like "change how deals are summarized", "the summary of this company is
  too long", "show me the prompt for contacts", "try a new prompt",
  "publish my prompt change", "summary prompts", and semantically
  equivalent phrasings in the user's language. Not for ChatRevenue agent
  skills — those belong to chatrevenue-skill-author. This skill only
  routes: it finds the user's prompts project folder and follows the
  authoring process that project describes.
---

# ChatRevenue — Prompt Author

1. **Find the prompts project.** Look at the folders connected to this
   session. The prompts project is the one whose root has a `CLAUDE.md`
   with the heading `## Prompt authoring sessions`. If exactly one folder
   matches, use it. If several match or none does, ask the author once,
   in plain words, to connect or pick their prompts project folder.
2. **Read the route.** Read that folder's `CLAUDE.md`, then the file its
   `## Prompt authoring sessions` section names.
3. **Follow that file.** From here on, follow that file. It overrides
   anything this skill or this plugin's other references say about
   prompts.
4. **If the route or the file is missing,** tell the author in plain
   words that this folder is not the prompts project, and stop.

Hide the plumbing, as in this plugin's other skills: talk to the author in
plain language, with no file names, headings, paths or error details.
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `bash "$SCRATCH/check-skill.sh"`
Expected: `PASS: AC1`, exit 0. If the forbidden-content grep fires on a legitimate word, reword the skill — do not weaken the check.

- [ ] **Step 5: Commit**

```bash
git add plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md
git commit -m "feat(prompt-author): routing-only entry skill for prompt authoring sessions"
```

---

### Task 2: Manifests — version 0.5.0 and descriptions

**Files:**
- Modify: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` (lines 3–4)
- Modify: `.claude-plugin/marketplace.json` (the `chatrevenue-skill-author` entry's `description`)

**Interfaces:**
- Consumes: skill name from Task 1 (not written into manifests; Cowork discovers skills by folder).
- Produces: plugin version `0.5.0` (Task 3 README and the PR title use it).

- [ ] **Step 1: Write the failing check** — `$SCRATCH/check-manifests.sh`:

```bash
#!/usr/bin/env bash
set -u
python -c "
import json,sys
p=json.load(open('plugins/chatrevenue-skill-author/.claude-plugin/plugin.json',encoding='utf-8'))
m=json.load(open('.claude-plugin/marketplace.json',encoding='utf-8'))
e=[x for x in m['plugins'] if x['name']=='chatrevenue-skill-author'][0]
ok=True
if p['version']!='0.5.0': print('FAIL: version',p['version']); ok=False
if 'and Knowledge Lake summary prompts' not in p['description']: print('FAIL: plugin.json description'); ok=False
if 'prompt authoring' not in e['description'].lower(): print('FAIL: marketplace description'); ok=False
print('PASS: AC2 manifests' if ok else ''); sys.exit(0 if ok else 1)
"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bash "$SCRATCH/check-manifests.sh"`
Expected: `FAIL: version 0.4.0` (and the two description failures), exit 1.

- [ ] **Step 3: Edit `plugin.json`** — set:

```json
  "version": "0.5.0",
  "description": "Walks non-technical ChatRevenue staff through creating, updating, or removing skills for the ChatRevenue agent, and Knowledge Lake summary prompts. Hides git, branches, and PR machinery; delegates them to a headless Claude Code subprocess.",
```

Leave `name`, `author`, `homepage`, `keywords` unchanged.

- [ ] **Step 4: Edit `marketplace.json`** — the `chatrevenue-skill-author` entry's description becomes:

```json
      "description": "Guided skill authoring for non-technical ChatRevenue staff: dialog-driven create/update/remove of ChatRevenue agent skills, with all git and review machinery hidden. Also guided prompt authoring for Knowledge Lake summary prompts, routed to the prompts project's own process.",
```

The `chatrevenue` entry and the top-level fields stay unchanged.

- [ ] **Step 5: Run the check to verify it passes**

Run: `bash "$SCRATCH/check-manifests.sh"`
Expected: `PASS: AC2 manifests`, exit 0 (also proves both files are valid JSON).

- [ ] **Step 6: Commit**

```bash
git add plugins/chatrevenue-skill-author/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(skill-author): v0.5.0 — manifests mention Knowledge Lake prompt authoring"
```

---

### Task 3: README — *Prompt authoring* section

**Files:**
- Modify: `plugins/chatrevenue-skill-author/README.md` — insert a new `## Prompt authoring` section immediately before `## Install`.

**Interfaces:**
- Consumes: skill name `chatrevenue-prompt-author` (Task 1), version 0.5.0 (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing check** — `$SCRATCH/check-readme.sh`:

```bash
#!/usr/bin/env bash
set -u
R=plugins/chatrevenue-skill-author/README.md
S=$(awk '/^## Prompt authoring$/{f=1;print;next} /^## /{f=0} f' "$R")
fail=0
[ -n "$S" ] || { echo "FAIL: no '## Prompt authoring' section"; exit 1; }
for p in 'local clone of the prompts project' 'connected to the Cowork project' 'What the author sees' 'the process itself is described in the prompts project'; do
  echo "$S" | tr '\n' ' ' | tr -s ' ' | tr A-Z a-z | grep -qF "$(echo "$p" | tr A-Z a-z)" || { echo "FAIL: section lacks '$p'"; fail=1; }
done
echo "$S" | grep -nE 'https?://|\]\(\.\./' && { echo "FAIL: link into another repository"; fail=1; }
awk '/^## /{print}' "$R" | grep -n 'Prompt authoring\|Install' | head -2
[ $fail -eq 0 ] && echo "PASS: AC2 README"
exit $fail
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bash "$SCRATCH/check-readme.sh"`
Expected: `FAIL: no '## Prompt authoring' section`, exit 1.

- [ ] **Step 3: Insert the section** before `## Install`:

````markdown
## Prompt authoring

Since 0.5.0 the plugin also helps change the **Knowledge Lake summary
prompts** — how the Knowledge Lake summarizes deals, companies, contacts and
their relationships. The `chatrevenue-prompt-author` skill handles it.

**Prerequisite:** a local clone of the prompts project, connected to the
Cowork project (Cowork: add the folder to the project). The skill finds it
by itself; if no connected folder is the prompts project, or several are,
it asks once to connect or pick it.

**What the author sees:**

```
User: "Change how deals are summarized for chatrevenue-business."

Plugin: [finds the prompts project, then walks the author through
         looking at the current prompt, trying a change, and publishing it]
```

The process itself is described in the prompts project, not in this
plugin — when that process or its tooling changes, this plugin does not.
````

- [ ] **Step 4: Run the check to verify it passes**

Run: `bash "$SCRATCH/check-readme.sh"`
Expected: `PASS: AC2 README`, exit 0; the heading listing shows `## Prompt authoring` before `## Install`.

- [ ] **Step 5: Commit**

```bash
git add plugins/chatrevenue-skill-author/README.md
git commit -m "docs(skill-author): README section on prompt authoring"
```

---

### Task 4: Verification against AC1–AC3

**Files:** none changed (verification only).

- [ ] **Step 1: Static checks (AC1, AC2)**

Run: `bash "$SCRATCH/check-skill.sh" && bash "$SCRATCH/check-manifests.sh" && bash "$SCRATCH/check-readme.sh"`
Expected: `PASS: AC1`, `PASS: AC2 manifests`, `PASS: AC2 README`.

- [ ] **Step 2: Scope check** — only the four planned files changed since the plan commit:

Run: `git diff --name-only main...HEAD`
Expected exactly: the spec, the plan (under `ongoing/`), `SKILL.md`, `plugin.json`, `marketplace.json`, `README.md`. No change under `skills/chatrevenue-skill-author/` or `skills/chatrevenue-analyze-chat/`.

- [ ] **Step 3: Manual Cowork check (AC3)** — needs Sasha in Cowork with the plugin installed from this branch (or after merge at the deploy gate). Record each result in the Report:

| # | Setup | Say | Expected |
|---|---|---|---|
| A | prompts project (`project-a-kl-config` clone) connected | "change how deals are summarized for chatrevenue-business" | `chatrevenue-prompt-author` triggers; it reads `CLAUDE.md`, then the authoring reference the route names, and continues per that reference |
| B | no prompts project connected | same | asks once, in plain words, to connect or pick the prompts project folder; does nothing else |
| B' | only `project-a-skills` connected (has `CLAUDE.md`, no heading) | same | same as B — not treated as the prompts project |
| C | a folder with the heading but the routed file removed (scratch copy) | same | says in plain words this folder is not the prompts project; stops |
| D | two prompts-project clones connected | same | asks once which to use |
| E | prompts project connected | "teach the agent to handle returns questions" | `chatrevenue-skill-author` triggers, not the prompt author |

In every row: no file names, headings, paths or error text in the replies (Review Focus 5). A and B are the spec's AC3; B'–E are Review Focus checks — a failure there is reported as a deviation, not silently fixed by widening the skill.

- [ ] **Step 4: No commit** — verification only.

---

### Task 5: PR and stage moves (phases 2 → 4)

- [ ] **Step 1:** Push the branch; update the PR description with the AC1–AC3 evidence. The PR stays open.
- [ ] **Step 2 (phase 4, after deploy approval):** merge only on Sasha's explicit "yes" (deploy = merge to `main`; Cowork installs from the marketplace's default branch). Then run Task 4 Step 3 rows A and B against the installed 0.5.0 if not already done, `git mv engineering_plans/ongoing/2026-10-15-prompt-authoring-sessions.md engineering_plans/done/` and commit `plan(prompt-authoring-sessions): ongoing → done`.

---

## Self-review

**Spec coverage.**
- §2 M1 (skill in this plugin) → Task 1 path. M2 (routing only, no vocabulary/rules/API/HandOff) → Task 1 content + forbidden-content check. M3 (locate by `CLAUDE.md` + heading, ask once) → Task 1 step 1; Task 4 rows B, B', D.
- §3 SKILL.md description, four steps, hide-the-plumbing, contents rule → Task 1. plugin.json → Task 2 Step 3. marketplace.json → Task 2 Step 4. README → Task 3. Out of scope → Global Constraints + Task 4 Step 2.
- §4 Provides (skill, missing project → plain-words request) → Task 1 + Task 4 B. Consumes E1 (only `CLAUDE.md` + heading) → Task 1 steps 1–2, row C.
- §5 AC1 → Task 1 check; AC2 → Task 2/3 checks; AC3 → Task 4 Step 3 rows A, B.

**Placeholders.** None: every created or edited text is given verbatim; checks are runnable scripts. `$SCRATCH` is the executor's scratch directory (scripts are not committed).

**Consistency.** Skill name `chatrevenue-prompt-author`, heading `## Prompt authoring sessions`, version `0.5.0`, branch and plan filename `prompt-authoring-sessions` are identical across tasks.

**Notes for the gate.**
- The skill body has one line beyond the four numbered steps — the hide-the-plumbing sentence spec §3 asks for. The AC1 check counts numbered steps, not lines.
- The description adds one sentence disambiguating from `chatrevenue-skill-author` (Review Focus 4). It sits in the front matter, not the body, and restates no contract.
