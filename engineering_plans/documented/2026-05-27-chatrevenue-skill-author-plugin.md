# chatrevenue-skill-author Cowork plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Cowork plugin `chatrevenue-skill-author` that walks non-technical ChatRevenue staff (PM/sales/support) through creating, updating, or removing skills for the ChatRevenue agent, hiding every technical detail and delegating git work to a headless Claude Code subprocess.

**Architecture:** Pure markdown plugin — no MCP server, no JavaScript bundle, no build step. One main skill `chatrevenue-skill-author` with an orchestration `SKILL.md` body and seven reference files. Configuration and draft stash live in the user's state directory (`~/.local/state/chatrevenue-skill-author/`). All git mutations happen via `scripts/agent-helpers/*.sh` invoked through a spawned `claude --headless` subprocess. Default communication language is English; the plugin switches if the user's first message is non-English.

**Tech Stack:** Markdown, YAML frontmatter, JSON.

**Depends on:** Plan `2026-05-27-project-a-skills-agent-guide.md` shipped to `project-a-skills` (at minimum: `docs/AGENT_GUIDE.md` v1 and the four `scripts/agent_helpers/*.py` Python modules must exist on the branch the plugin operates against). The plugin's pre-flight check `agent_guide_version: 1` enforces this.

**Worker support (added 2026-06-08):** This plan now authors workers (executable skills) per design §1.1 + `nextcrm-agents` ADR 0003 — see worker-aware edits in Tasks 3, 5, 9, 10. The server-side validation step (`cr-skills validate`, run inside `place_draft.py`) only accepts the `interval_online_min`/`interval_offline_min` frontmatter once `project-a-skills/docs/specs/2026-06-04-worker-cadence-frontmatter-design.md` (the `fs.py` extractor mirror) is merged. **Ordering:** that spec + the agent-side contract must land before the plugin's worker drafts validate end-to-end. The plugin's plain (non-worker) flow has no such dependency and can ship first.

**Where this plan executes:** Open Claude Code with cwd = your local clone of `chatrevenue-marketplace`. This plan file lives in the same repo.

---

## File Structure

**New files in `chatrevenue-marketplace/plugins/chatrevenue-skill-author/`:**

- `.claude-plugin/plugin.json` — plugin manifest
- `skills/chatrevenue-skill-author/SKILL.md` — main orchestration skill
- `skills/chatrevenue-skill-author/references/preflight-checklist.md` — bash steps for the Cowork-side pre-flight
- `skills/chatrevenue-skill-author/references/validation-rules.md` — v1 rules as an LLM checklist
- `skills/chatrevenue-skill-author/references/branch-naming.md` — human-facing description of what happens behind the scenes
- `skills/chatrevenue-skill-author/references/escalation-template.md` — verbatim template for tech-problem handoff
- `skills/chatrevenue-skill-author/references/handoff-prompt.md` — prompt passed to the headless Claude Code subprocess
- `skills/chatrevenue-skill-author/references/handoff-manifest.md` — JSON Schema for `draft.json`
- `skills/chatrevenue-skill-author/references/user-dialog-phrases.md` — UX vocabulary (never/instead table, language switching)
- `README.md` — short plugin overview

**Modified files in `chatrevenue-marketplace/`:**

- `.claude-plugin/marketplace.json` — append the new plugin entry to `plugins[]`

---

## Task 1: Register plugin in marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1.1: Read the current file**

Run: `cat .claude-plugin/marketplace.json`
Expected: existing JSON with one plugin (`chatrevenue`) in `plugins[]`.

- [ ] **Step 1.2: Add the new plugin entry**

Append a new object to the `plugins` array. The full file after the edit:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "chatrevenue-marketplace",
  "description": "Sample Cowork-compatible plugin marketplace from ChatRevenue, used to learn the marketplace mechanics.",
  "owner": {
    "name": "ChatRevenue",
    "email": "oleksandr.ieremchuk@chatrevenue.ai"
  },
  "plugins": [
    {
      "name": "chatrevenue",
      "description": "ChatRevenue skills bundle for sales reps: memory queries, watcher-fired activity help, ICP lead-generation assistant.",
      "author": { "name": "ChatRevenue" },
      "category": "productivity",
      "source": "./plugins/chatrevenue",
      "homepage": "https://github.com/Project-A-Inc/chatrevenue-marketplace"
    },
    {
      "name": "chatrevenue-skill-author",
      "description": "Guided skill authoring for non-technical ChatRevenue staff: dialog-driven create/update/remove of ChatRevenue agent skills, with all git and review machinery hidden.",
      "author": { "name": "ChatRevenue" },
      "category": "productivity",
      "source": "./plugins/chatrevenue-skill-author",
      "homepage": "https://github.com/Project-A-Inc/chatrevenue-marketplace"
    }
  ]
}
```

- [ ] **Step 1.3: Verify JSON parses**

Run: `python -c "import json; json.load(open('.claude-plugin/marketplace.json'))"`
Expected: no output (exit 0).

- [ ] **Step 1.4: Commit**

Commit message: `chore(marketplace): register chatrevenue-skill-author plugin`
Files to add: `.claude-plugin/marketplace.json`

---

## Task 2: Plugin manifest

**Files:**
- Create: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json`

- [ ] **Step 2.1: Write the manifest**

Create the file with this content:

```json
{
  "name": "chatrevenue-skill-author",
  "version": "0.1.0",
  "description": "Walks non-technical ChatRevenue staff through creating, updating, or removing skills for the ChatRevenue agent. Hides git, branches, and PR machinery; delegates them to a headless Claude Code subprocess.",
  "author": {
    "name": "ChatRevenue",
    "email": "oleksandr.ieremchuk@chatrevenue.ai"
  },
  "homepage": "https://github.com/Project-A-Inc/chatrevenue-marketplace",
  "keywords": ["chatrevenue", "skill-authoring", "agent"]
}
```

- [ ] **Step 2.2: Verify JSON parses**

Run: `python -c "import json; print(json.load(open('plugins/chatrevenue-skill-author/.claude-plugin/plugin.json'))['name'])"`
Expected: `chatrevenue-skill-author`

- [ ] **Step 2.3: Commit**

Commit message: `feat(plugin): add chatrevenue-skill-author plugin.json`
Files to add: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json`

---

## Task 3: Main skill body (SKILL.md)

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`

- [ ] **Step 3.1: Write the file**

Create the file with this exact content:

```markdown
---
name: chatrevenue-skill-author
description: >
  Use this skill when the user wants to teach the ChatRevenue agent a new
  behavior, modify how it currently handles something, remove an obsolete
  behavior, set up something the agent does on its own on a recurring
  basis (a worker), or browse what skills already exist. Trigger on
  phrases like "create a skill", "teach the agent", "the agent should
  handle", "make the agent do X", "update skill", "change skill", "remove
  skill", "delete skill", "what skills do we have", "show me existing
  skills", as well as recurring/automatic phrasings like "every morning",
  "run automatically", "keep an eye on", "remind me", "on a schedule",
  "in the background", and semantically equivalent phrasings in the
  user's language. The skill hides all technical mechanics — git,
  branches, pull requests, Claude Code subprocess — and walks the user
  through a plain-language dialog that ends with a review link. Authored
  skill content is English only; user dialog language follows the user.
---

# ChatRevenue Skill Author

You are guiding a non-technical ChatRevenue staff member (PM, sales,
support) through creating, updating, or removing a skill for the
ChatRevenue agent. The user does not know git, branches, or pull
requests. Hide all technical details. Use the vocabulary in
`references/user-dialog-phrases.md` — never the forbidden terms.

## Default language

Default to English. If the user's first message in this session is in
another language, continue the dialog in that language. The user can
override with "respond in <language>". The next chat session resets to
English.

**Authored skill content (the SKILL.md and references/*.md you produce
for the ChatRevenue agent) is ALWAYS English, regardless of dialog
language.** This is an invariant from `project-a-skills/CONTRIBUTING.md`.

## Workflow

Walk the steps below in order. Do NOT dump the workflow to the user.
Proceed conversationally, one step at a time.

### Step 1 — Pre-flight

Before any conversation about the skill itself, verify the user's
machine is ready. Run the checks from `references/preflight-checklist.md`
in order. On any failure, hand the user the message from
`references/escalation-template.md` filled in with the appropriate
category code and details, then stop.

Tell the user once at the start: "Checking everything is ready..."
Do not list what passed.

If a check is recoverable (`PREREQ_CLAUDE_MISSING`,
`PREREQ_GH_MISSING`, `PREREQ_UV_MISSING`, `PREREQ_GH_UNAUTH`,
`PREREQ_REPO_NOT_FOUND`), walk the user through the fix in plain
language, then re-run the check. Do not silently self-heal — explain
what you're doing and confirm before each install/login step.

### Step 2 — Understand intent

Ask the user, in plain language, what they want to do:
- A new behavior for the agent?
- Change how it currently handles something?
- Stop it from doing something it currently does?
- Just see what exists?

If they only want to browse, jump to the **Explore-only flow** below
and stop after listing.

Listen for **recurring / automatic** intent ("every morning", "keep an
eye on", "remind me", "on a schedule", "in the background"). If you hear
it, this skill should run on its own — a worker — and you handle the
worker branch in Step 3. Do not say the word "worker"; treat it as a
property of the behavior the user described.

### Step 3 — Collect the skill

For create/update flows, gather:

- A one-sentence behavior description in the user's language
- 2-3 example phrases the user might say in the future to trigger this
  behavior (these become trigger phrases in the description field)
- Whether this is for the whole company (global) or for one specific
  organization (org, with an org slug — default `chatrevenue` if the
  user can't name one)
- A short name for the skill (you propose 2-3 options in kebab-case
  matching `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`, user picks or
  overrides)

Also determine whether the skill **runs on its own** (a worker):

- Decide from intent first (Step 2 cues). If unclear, ask once in plain
  language: "Should this run on its own in the background, or only when
  you ask for it?"
- If it runs on its own, set `executable: true` in the draft frontmatter,
  and ask how often: "How often should it run while you're at your desk?
  And while you're away?" Accept fuzzy answers ("a few times a day",
  "once an hour") and map them to whole minutes →
  `interval_online_min` / `interval_offline_min`. If the user has no
  preference, **omit both fields** (the agent applies its defaults) — do
  not invent values.
- Never emit a `schedule:` field. Never surface the words worker,
  executable, cron, interval, or enroll to the user.
- The plugin only authors the definition that *makes* a worker possible.
  Turning it on for a user happens later in ChatRevenue, not here — if
  the user asks "will it start running now?", tell them it starts after
  they publish it and turn it on in ChatRevenue.

Translate the answers into a draft SKILL.md. The body is imperative
instructions for the ChatRevenue agent; the description is 10-2000
characters and includes the example trigger phrases verbatim.
**Authored content is always English** — translate the user's input.

For update flows, first list candidates (see Explore-only flow), let
the user pick, then read the current SKILL.md from the repo and ask
"What would you like to change?" Show a diff back in plain language
before continuing. If the existing skill is already a worker
(`executable: true`), offer to change how often it runs as well as its
behavior — phrased as "this already runs on its own; want to change how
often, or just what it does?"

For remove flows, list candidates, get an explicit confirmation
("This will remove the behavior after review. Sure?"), then proceed
with `type: remove` and skip the draft body collection.

### Step 4 — Validate the draft locally

Walk the checklist in `references/validation-rules.md` against the
draft. Flag any issues in plain language and loop back to step 3.
This is a UX pre-filter; the authoritative check happens in step 6
on the repo side.

### Step 5 — Stash the draft

Write the draft to the user's state directory:

- Linux/macOS: `~/.local/state/chatrevenue-skill-author/drafts/<ISO-timestamp>-<name>/`
- Windows: `%LOCALAPPDATA%\chatrevenue-skill-author\drafts\<ISO-timestamp>-<name>\`

Files in the stash:
- `SKILL.md` (for create/update)
- `references/*.md` (if the skill has references)
- `draft.json` per the schema in `references/handoff-manifest.md`

For `type: remove`, only `draft.json` is needed.

### Step 6 — Ship via headless Claude Code

Read the repo path from the config file (`<state-dir>/config.json`).
If absent, ask the user where their local clone of project-a-skills
lives; offer `gh repo clone Project-A-Inc/project-a-skills <path>` if
they don't have one. Save the path to config.

Spawn the subprocess with the prompt from
`references/handoff-prompt.md`:

```bash
claude --headless \
  --cwd "<repo_root>" \
  --prompt-file "${CLAUDE_PLUGIN_ROOT}/skills/chatrevenue-skill-author/references/handoff-prompt.md" \
  --env DRAFT_MANIFEST="<stash-folder>/draft.json"
```

(Exact `claude` flag names are verified at first invocation; the
contract is "non-interactive, with cwd, prompt-file, and one env var".)

Tell the user only: "Sending it for review..."

Wait for the subprocess to exit. Parse the last line of stdout. It
should be `pr_url=<https-url>`. If it is:

1. Move the stash folder from `drafts/` to `drafts/.archive/`,
   rotating to keep last 10
2. Present the URL to the user with the language from
   `references/user-dialog-phrases.md`

If it isn't, or if the subprocess exited non-zero, escalate with
`CLAUDE_SPAWN_FAILED` and the captured stderr.

### Step 7 — Hand off to the user

Show the PR URL and explain in plain language:

> Done. Your draft is here: <url>
>
> Open the link, take a look, and click the green "Merge" button when
> you're ready. Once you do, the skill will appear in ChatRevenue
> within a couple of minutes.

If language is not English, use the corresponding phrases from
`references/user-dialog-phrases.md`.

## Explore-only flow

When the user only wants to browse:

1. Skip pre-flight (no mutation will happen)
2. Read the contents of the relevant `skills/` subtree via
   `gh api repos/Project-A-Inc/project-a-skills/contents/skills/<scope>/`
   (use the user's `gh auth` — no extra config)
3. For each entry, fetch the SKILL.md and read its `description`
4. Summarize back to the user in plain language: name, what it does,
   one example trigger phrase
5. Do not stash, do not spawn

## Hard rules

- Never use any term from the "Never use" column in
  `references/user-dialog-phrases.md` when talking to the user.
- Never invent a skill name. Either the user picks one, or you propose
  2-3 options matching `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`.
- Never bypass the helpers in step 6. The Claude Code subprocess does
  git; you never invoke `git` or `gh push` directly.
- Authored skill content (SKILL.md + references/) is English only.
- On any unexpected error during steps 1-6, fill in
  `references/escalation-template.md` with the right category code
  and stop. Do not retry beyond the recoverable categories listed in
  step 1.

## References

- `references/preflight-checklist.md` — pre-flight bash steps + failure handling
- `references/validation-rules.md` — v1 rules as a Cowork-side checklist
- `references/branch-naming.md` — what the user sees during step 6, in plain language
- `references/escalation-template.md` — the verbatim tech-problem template
- `references/handoff-prompt.md` — the prompt passed to spawned Claude Code
- `references/handoff-manifest.md` — JSON Schema for `draft.json`
- `references/user-dialog-phrases.md` — UX vocabulary
```

- [ ] **Step 3.2: Verify YAML frontmatter parses**

Run: `python -c "import yaml,re; t=open('plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md').read(); fm=re.match(r'---\n(.*?)\n---', t, re.S).group(1); d=yaml.safe_load(fm); print(d['name']); assert 10 <= len(d['description']) <= 2000, len(d['description'])"`
Expected: prints `chatrevenue-skill-author`, no assertion failure.

- [ ] **Step 3.3: Commit**

Commit message: `feat(plugin): add chatrevenue-skill-author SKILL.md orchestration body`
Files to add: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`

---

## Task 4: references/preflight-checklist.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/preflight-checklist.md`

- [ ] **Step 4.1: Write the file**

```markdown
# Pre-flight checklist

Run these checks in order via the Bash tool before any conversation about
the user's skill. Stop on the first failure. Use `escalation-template.md`
for any non-recoverable failure.

Each check below is a single shell command followed by what to do on
failure. Run them silently — do not narrate each pass to the user. Say
"Checking everything is ready..." once at the start; on success, move
to step 2 of the workflow.

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
```

- [ ] **Step 4.2: Verify file exists**

Run: `test -f plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/preflight-checklist.md && echo ok`
Expected: `ok`

- [ ] **Step 4.3: Commit**

Commit message: `feat(plugin): add preflight-checklist reference`
Files to add: this file.

---

## Task 5: references/validation-rules.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md`

- [ ] **Step 5.1: Write the file**

```markdown
# Validation rules — Cowork-side LLM checklist

These rules mirror `project-a-skills/CONTRIBUTING.md` "Validation rules
(v1)". This file is the **Cowork-side pre-filter** to catch obvious
problems early. The **authoritative** check still runs server-side via
`uv run cr-skills validate <name> --repo-root <path> --scope <s> [--org <id>]`
inside `scripts/agent_helpers/place_draft.py`. If these rules diverge from
what `cr-skills` enforces, `cr-skills` wins; please flag the drift in a PR
to `project-a-skills`.

Walk the draft against every rule below. Surface failures in plain
language and loop back to the dialog. Do not proceed to stashing if any
check fails.

## Structural rules

- [ ] `SKILL.md` is at the root of the skill folder (no nesting)
- [ ] No `scripts/` or `assets/` directories — these are v2-only and
      rejected by the validator
- [ ] Every file under `references/` ends in `.md`

## Name and folder

- [ ] Folder name matches the frontmatter `name`
- [ ] `name` matches the regex `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`
      — kebab-case, lowercase, 1-64 chars, no leading/trailing dash
- [ ] If scope is `org`, the chosen `<org_id>` matches the same regex

## Description

- [ ] `description` is 10-2000 characters
- [ ] `description` includes at least one trigger phrase the user gave
      (verbatim or semantically equivalent)
- [ ] `description` reads imperatively ("Use this skill when …" beats
      "Handles X") — agent under-triggers passive descriptions

## Size limits

- [ ] SKILL.md body (everything after the closing `---`) ≤ 50 KB
- [ ] Each `references/*.md` ≤ 100 KB
- [ ] Total skill size (SKILL.md + all references) ≤ 1 MB

## Content safety

- [ ] No fenced code blocks with a shebang on the first line
      (e.g., ```` ```bash\n#!/bin/bash ````)
- [ ] No fenced code blocks labelled `bash`, `sh`, `python`, `js`, or
      `javascript` that include an `execute:` or similar
      execution-hinting marker
- [ ] Body and references do NOT contain the reserved tokens
      `<available_skills>`, `<system>`, `</system>`

## Worker frontmatter

Only relevant when the skill runs on its own. Mirrors the contract in
`project-a-skills/docs/specs/2026-06-04-worker-cadence-frontmatter-design.md`
and the extractor in `project-a-skills/src/cr_skills_cli/fs.py`.

- [ ] `executable`, when present, is a boolean
- [ ] `interval_online_min` and `interval_offline_min`, when present, are
      **positive integers** (minutes). A non-int or value ≤ 0 is the
      `INVALID_INTERVAL_TYPE` failure the repo-side extractor rejects —
      catch it here first.
- [ ] Cadence fields only appear together with `executable: true`. If a
      draft has an interval without `executable: true`, flag it — the
      user probably meant it to run on its own.
- [ ] No `schedule:` field. The legacy cron field is retired (accept-and-
      warn server-side during migration); an author flow emits the
      interval fields only.
- [ ] Omitting both intervals is valid — the agent applies its defaults.
      Do not require the user to set them.

## Language

- [ ] Frontmatter `name` is ASCII
- [ ] `description` is in English
- [ ] SKILL.md body is in English
- [ ] Every `references/*.md` is in English

This rule is non-negotiable: regardless of dialog language, authored
skill content is English only. If the user gave a description in
another language, translate it before writing.

## Naming intent

- [ ] Name captures the skill's **function**, not its current
      implementation — `<audience>-voice`, not `<audience>-haiku`
- [ ] If a skill with the same name already exists in the same scope,
      ask the user "Update <name> instead of creating a new one?"

## On failure

Tell the user in plain language what's off (e.g., "The name has an
underscore — let's use a dash instead"). Suggest a fix or two. Loop
back to the appropriate dialog step. Do not list rule codes to the user.
```

- [ ] **Step 5.2: Verify file exists**

Run: `test -f plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md && echo ok`
Expected: `ok`

- [ ] **Step 5.3: Commit**

Commit message: `feat(plugin): add validation-rules reference`
Files to add: this file.

---

## Task 6: references/branch-naming.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/branch-naming.md`

- [ ] **Step 6.1: Write the file**

```markdown
# Branch naming — for your awareness, never spoken aloud

You do NOT name branches. `scripts/agent_helpers/new_branch.py` in
project-a-skills owns naming. This file exists only so you can describe
to the user, in plain language, what's happening — without using the
word "branch".

## What the helper produces

| Type | Branch pattern (helper output) |
|---|---|
| create | `skills/<scope>-<name>` (e.g., `skills/global-pptx`) |
| update | `fix/<name>-YYYYMMDD-<6-char-hash>` |
| remove | `remove/<name>` |

If the name is taken on the remote, the helper appends `-2`, `-3`, etc.
You don't decide this — the helper does, and reports the final name in
its `branch=` output.

## What you say to the user

- create: "Preparing a separate copy for the new behavior..."
- update: "Preparing a separate copy with your edits..."
- remove: "Preparing the removal for review..."

Never: "creating a branch", "checking out", "git checkout", "feature
branch". The user does not learn that branches exist.
```

- [ ] **Step 6.2: Commit**

Commit message: `feat(plugin): add branch-naming reference`
Files to add: this file.

---

## Task 7: references/escalation-template.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/escalation-template.md`

- [ ] **Step 7.1: Write the file**

```markdown
# Escalation template

When a check or step fails in a way the plugin cannot resolve, stop and
emit the message below to the user. The technical block stays in
English regardless of dialog language, so the AI team always sees the
same format.

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
```

- [ ] **Step 7.2: Commit**

Commit message: `feat(plugin): add escalation-template reference`
Files to add: this file.

---

## Task 8: references/handoff-prompt.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-prompt.md`

- [ ] **Step 8.1: Write the file**

```markdown
# Handoff prompt — passed to spawned Claude Code

This file is passed verbatim as the prompt body to a `claude --headless`
subprocess. The spawned agent reads `docs/AGENT_GUIDE.md` from the
working directory, then executes the four `agent_helpers` Python script
files via `uv run --frozen python scripts/agent_helpers/<name>.py` in
order.

The Cowork-side skill sets the environment variable `DRAFT_MANIFEST` to
the path of a `draft.json` file in the user's local stash, and the
`--cwd` to the user's local project-a-skills clone.

---

You are an automated agent shipping a skill draft on behalf of the
chatrevenue-skill-author Cowork plugin. The user produced the draft;
your only job is to ship it.

Steps, in order. Do not skip or reorder.

1. Read `$DRAFT_MANIFEST`. It is a JSON file containing:
   - `type` — "create", "update", or "remove"
   - `scope` — "global" or "org"
   - `org_id` — string (only when scope=org) or null
   - `name` — kebab-case slug for the skill
   - `repo_root` — absolute path; equals your --cwd; verify they match
   - `pr_title`, `pr_body` — pre-formatted PR metadata
   - `source.version` — `plugin_version` for the open_pr invocation
   - `source.session_id` — `session_id` for the open_pr invocation
   - other fields you may ignore

2. Read `docs/AGENT_GUIDE.md` in the current working directory. Honour
   it. In particular: only mutate the repo through
   `scripts/agent_helpers/*.py` (invoked via `uv run --frozen python scripts/agent_helpers/<name>.py`);
   never invoke `git` or `gh` directly.

3. Run `uv run --frozen python scripts/agent_helpers/preflight.py --repo-root <repo_root>`.
   Each helper emits JSON on stdout on success and a JSON failure block
   on stderr on failure. If exit code != 0, emit the full stderr block
   verbatim and exit with the same code. Do not attempt recovery.

4. Run `uv run --frozen python scripts/agent_helpers/new_branch.py --repo-root <repo_root>`
   with the manifest's `--type`, `--scope`, `--name`, and `--org-id`
   (when scope=org). Capture stdout. Parse the JSON; remember `branch`.

5. For type ∈ {create, update}: run
   `uv run --frozen python scripts/agent_helpers/place_draft.py --repo-root <repo_root>`
   with `--type`, `--scope`, `--name`, `--org-id` (when applicable),
   and `--draft` set to the directory containing `$DRAFT_MANIFEST`. The
   helper strips `draft.json` from the placed target; do not pre-copy
   or modify the user's stash folder.

   For type = remove: run `place_draft.py` with `--type remove`,
   `--scope`, `--name`, `--org-id` (when applicable). No `--draft`.

6. Run `uv run --frozen python scripts/agent_helpers/open_pr.py --repo-root <repo_root>`
   with the same `--type`, `--scope`, `--name`, `--org-id` (when
   applicable), plus `--plugin-version <source.version>` and
   `--session-id <source.session_id>` from the manifest. Capture
   stdout. Parse the JSON; remember `pr_url`.

7. Emit ONLY ONE LINE to stdout as the final line:

   ```
   pr_url=<the-url-you-parsed>
   ```

   Any other output you have should go to stderr.

Do not narrate. Do not summarise. Do not ask questions. If a helper
exits non-zero, emit its stderr block and exit with the same code.
```

- [ ] **Step 8.2: Commit**

Commit message: `feat(plugin): add handoff-prompt reference for claude --headless`
Files to add: this file.

---

## Task 9: references/handoff-manifest.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-manifest.md`

- [ ] **Step 9.1: Write the file**

```markdown
# Handoff manifest — draft.json schema

Every draft folder contains a `draft.json` sidecar that the Cowork-side
skill writes after dialog and validation. The spawned Claude Code
subprocess reads it as the source of truth for what to ship.

## Schema (v2)

```json
{
  "version": 2,
  "type": "create",
  "scope": "global",
  "org_id": null,
  "name": "kebab-case-slug",
  "worker": {
    "executable": true,
    "interval_online_min": 30,
    "interval_offline_min": 240
  },
  "repo_root": "/absolute/path/to/project-a-skills",
  "pr_title": "Add skill: kebab-case-slug",
  "pr_body": "<markdown summary for the PR body>",
  "source": {
    "plugin": "chatrevenue-skill-author",
    "version": "0.1.0",
    "session_id": "<opaque session id>"
  }
}
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `version` | integer | 2 for this plugin v0.1.x (was 1 before worker support; readers must accept both) |
| `type` | string | "create", "update", or "remove" |
| `scope` | string | "global" or "org" |
| `org_id` | string \| null | Required when `scope` = "org"; null otherwise |
| `name` | string | Skill slug; matches `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$` |
| `worker` | object \| absent | **Optional.** Present only when the skill runs on its own. Absent ⇒ a plain (non-executable) skill. |
| `worker.executable` | boolean | Always `true` when `worker` is present |
| `worker.interval_online_min` | integer \| absent | Optional positive int (minutes); omit ⇒ agent default |
| `worker.interval_offline_min` | integer \| absent | Optional positive int (minutes); omit ⇒ agent default |
| `repo_root` | string | Absolute path to the user's local clone |
| `pr_title` | string | Pre-formatted PR title |
| `pr_body` | string | Pre-formatted PR body (markdown) |
| `source.plugin` | string | Always "chatrevenue-skill-author" |
| `source.version` | string | Semver string, matches `plugin.json` `version` |
| `source.session_id` | string | Opaque ID for tracing; ULID or UUID |

The `worker` object is additive: a manifest without it is a plain skill.
When present, the placed `SKILL.md` carries exactly these frontmatter
fields (`executable: true` + any intervals) and **never** a `schedule:`.
The helpers must not inject `executable` on their own — absence means
non-executable.

## Validation

Before writing `draft.json`:
- Confirm `repo_root` is an absolute path and exists
- Confirm `name` matches the regex
- Confirm `scope` and `org_id` invariant (org_id required iff scope=org)
- Confirm `pr_title` and `pr_body` are non-empty for create/update;
  may be auto-generated for remove
- If `worker` is present: `executable` is `true`, and each interval (if
  present) is a positive integer

## What lives in the draft folder

```
<stash-dir>/drafts/<timestamp>-<name>/
├── SKILL.md           ← present for create/update; absent for remove
├── references/        ← optional, only for create/update
│   └── *.md
└── draft.json         ← always present
```
```

- [ ] **Step 9.2: Commit**

Commit message: `feat(plugin): add handoff-manifest reference`
Files to add: this file.

---

## Task 10: references/user-dialog-phrases.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/user-dialog-phrases.md`

- [ ] **Step 10.1: Write the file**

```markdown
# User dialog vocabulary

Use this table to find the right plain-language phrase for any
technical concept that might leak. The "Never use" column is
non-negotiable: those terms must not appear in user-facing messages
in any language.

## English (default)

| Never use | Use instead |
|---|---|
| branch | a separate copy / a separate copy for your skill |
| commit | saving |
| push | sending |
| pull request / PR | draft for review / review link |
| merge | confirm / publish (the user clicks themselves) |
| rebase / squash / merge commit | (not mentioned at all) |
| repository / repo | the skills project |
| validate / validation | check / checking |
| working tree dirty | you have unsaved changes in the skills folder |
| Claude Code | (not mentioned; "running the last steps") |
| MCP / tool / subprocess | (not mentioned) |
| stdout / stderr / exit code | (not mentioned) |
| gh / git / CLI | (not mentioned) |
| OAuth / token / API key | sign-in / access |
| worker / executable | runs on its own / works in the background for you |
| enroll / dispatcher / schedule / cron | turning it on (happens later in ChatRevenue) |
| interval_online_min / interval_offline_min | how often it runs while you're active / while you're away |
| presence / online-offline cadence | whether you're at your desk or away |

## Russian (when dialog language is Russian)

| Никогда | Использовать |
|---|---|
| branch / ветка | отдельная копия / отдельная копия для твоего скилла |
| commit / коммит | сохраняю |
| push / пуш | отправляю |
| pull request / PR | черновик на ревью / ссылка для ревью |
| merge / мерж | подтвердить / залить (юзер сам нажимает) |
| repository / репозиторий | проект со скиллами / папка со скиллами |
| validate / валидация | проверяю / проверка |
| Claude Code / Клод Код | (не упоминается; «выполняю последние шаги») |
| gh / git / CLI | (не упоминается) |
| worker / executable / воркер | работает само / работает для тебя в фоне |
| enroll / dispatcher / schedule / cron / расписание | включение (произойдёт позже в ChatRevenue) |
| interval_online_min / interval_offline_min | как часто запускается, когда ты за столом / когда отошёл |

When the dialog language is neither English nor Russian, translate the
English plain-language phrases into the user's language, keeping the
"never" terms out.

## Worker dialog phrases

Use these when the skill runs on its own. Never say worker / executable /
interval / cron / enroll.

### English

- "Should this run on its own in the background, or only when you ask for it?"
- "How often should it run while you're at your desk? And while you're away?"
- "It'll start running once you publish it and turn it on in ChatRevenue."
- (update) "This already runs on its own — want to change how often, or just what it does?"

### Russian

- «Это должно работать само в фоне или только когда ты попросишь?»
- «Как часто это запускать, когда ты за столом? А когда отошёл?»
- «Оно начнёт работать, когда ты опубликуешь скилл и включишь его в ChatRevenue.»
- (обновление) «Это уже работает само — поменять, как часто, или только то, что оно делает?»

## Language switching

- Default: English.
- Detect: first user message in the session. If non-English, continue
  in that language.
- Override: explicit instruction like "respond in Russian" / "ответь
  по-русски".
- Reset: a new chat session starts in English again.

## Closing message templates

### English (create or update)

> Done. Your draft is here:
> <PR_URL>
>
> Open the link, take a look, and click the green "Merge" button when
> you're ready. Once you do, the skill will appear in ChatRevenue
> within a couple of minutes.

### English (remove)

> Done. The removal request is here:
> <PR_URL>
>
> Open the link to confirm what's being removed, then click the green
> "Merge" button. Once you do, the agent will lose this behavior
> within a couple of minutes.

### Russian (create or update)

> Готово. Твой черновик здесь:
> <PR_URL>
>
> Открой ссылку, посмотри, и нажми зелёную кнопку "Merge" когда будешь
> готов. После этого скилл появится в ChatRevenue в течение пары минут.

### Russian (remove)

> Готово. Запрос на удаление здесь:
> <PR_URL>
>
> Открой ссылку, проверь что именно удаляется, и нажми зелёную кнопку
> "Merge". После этого агент перестанет это делать в течение пары
> минут.
```

- [ ] **Step 10.2: Commit**

Commit message: `feat(plugin): add user-dialog-phrases reference (English + Russian)`
Files to add: this file.

---

## Task 11: README.md

**Files:**
- Create: `plugins/chatrevenue-skill-author/README.md`

- [ ] **Step 11.1: Write the file**

```markdown
# chatrevenue-skill-author

Cowork plugin that walks non-technical ChatRevenue staff (PM, sales,
support) through creating, updating, or removing skills for the
ChatRevenue agent. All git, branch, and PR machinery is hidden — the
user has a plain-language conversation and ends with a clickable review
link.

## Prerequisites

The plugin walks the user through any missing prerequisite on first
run. For reference, the full list:

1. **Node.js 18+** on PATH (Cowork plugin runtime; usually already
   present alongside the existing `chatrevenue` plugin)
2. **Claude Code CLI** — used as a headless git/PR runner under the
   hood (https://claude.com/code)
3. **GitHub CLI (`gh`)** — install per OS; the plugin guides through
   `gh auth login`
4. **uv** (Python package manager) — used by the repo's
   `cr-skills validate` invocation
5. **A local clone of Project-A-Inc/project-a-skills** — the plugin
   asks where it lives and offers to clone if missing
6. **GitHub push permission** to `Project-A-Inc/project-a-skills`

`project-a-skills` must also have `docs/AGENT_GUIDE.md` v1 and
`scripts/agent_helpers/*.py` (shipped by a separate engineering plan).

## What the user sees

```
User: "I want the agent to handle returns questions."

Plugin: [a few questions about behavior and trigger phrases]

Plugin: "Checking everything is ready..."
Plugin: "Getting the latest version of the skills project..."
Plugin: "Preparing a separate copy for your skill..."
Plugin: "Sending it for review..."

Plugin: "Done. Your draft is here: https://github.com/.../pull/123
         Open the link, take a look, and click the green 'Merge'
         button when you're ready."
```

No "branch", "commit", "PR", "merge", "Claude Code", "MCP" ever
appears in user-facing messages.

## Install

1. In Cowork: Customize → **+** Personal plugins → **Create plugin** →
   **Add marketplace**
2. Paste: `Project-A-Inc/chatrevenue-marketplace`
3. Sign in to GitHub when prompted.
4. Find **chatrevenue-skill-author** in the listing → **Install**.
5. Restart Cowork so the new skill loads.
6. Open a new Cowork chat, ask: "create a skill for ChatRevenue."

## Design

See `chatrevenue-marketplace/design_docs/2026-05-27-chatrevenue-skill-author-design.md`.
```

- [ ] **Step 11.2: Commit**

Commit message: `docs(plugin): add chatrevenue-skill-author README`
Files to add: this file.

---

## Task 12: Plugin structure validation

**Files:** none new — automated check.

- [ ] **Step 12.1: Validate plugin.json and SKILL.md frontmatter**

Run this Python smoke check:

```bash
python <<'PY'
import json
import re
import sys
from pathlib import Path

import yaml

root = Path("plugins/chatrevenue-skill-author")
plugin_json = json.loads((root / ".claude-plugin/plugin.json").read_text())
assert plugin_json["name"] == "chatrevenue-skill-author", plugin_json
assert re.match(r"^\d+\.\d+\.\d+$", plugin_json["version"]), plugin_json["version"]

skill_md = (root / "skills/chatrevenue-skill-author/SKILL.md").read_text()
m = re.match(r"---\n(.*?)\n---", skill_md, re.S)
assert m, "no frontmatter"
fm = yaml.safe_load(m.group(1))
assert fm["name"] == "chatrevenue-skill-author", fm
assert 10 <= len(fm["description"]) <= 2000, len(fm["description"])

refs_dir = root / "skills/chatrevenue-skill-author/references"
expected = {
    "preflight-checklist.md",
    "validation-rules.md",
    "branch-naming.md",
    "escalation-template.md",
    "handoff-prompt.md",
    "handoff-manifest.md",
    "user-dialog-phrases.md",
}
actual = {p.name for p in refs_dir.iterdir() if p.suffix == ".md"}
missing = expected - actual
extra = actual - expected
assert not missing, f"missing references: {missing}"
assert not extra, f"unexpected references: {extra}"

print("plugin structure ok")
PY
```

Expected: prints `plugin structure ok` and exits 0.

- [ ] **Step 12.2: Validate marketplace.json includes the new plugin**

```bash
python -c "
import json
m = json.load(open('.claude-plugin/marketplace.json'))
names = [p['name'] for p in m['plugins']]
assert 'chatrevenue-skill-author' in names, names
print('marketplace entry ok')
"
```

Expected: `marketplace entry ok`.

- [ ] **Step 12.3: Commit if any test-driven fixes**

If steps 12.1 or 12.2 surfaced anything, fix inline and commit with
`fix(plugin): address structure validation findings`. If they passed,
no commit.

---

## Task 13: Manual smoke test in Cowork

**Files:** none — procedural verification.

**Pre-requisite:** Plan A (`project-a-skills agent-guide v1`) is
merged to `main` in `project-a-skills`.

- [ ] **Step 13.1: Build a local install**

In a Cowork session (or via Cowork's plugin install UI):

1. Open Customize → Plugins
2. Add marketplace from the local branch:
   `path:/Users/<you>/projects/chatrevenue-marketplace` (or equivalent
   path on your machine)
3. Install `chatrevenue-skill-author`
4. Restart Cowork

- [ ] **Step 13.2: Trigger the skill**

Open a new Cowork chat. Say:

```
I want the ChatRevenue agent to greet users in a more casual tone.
Create a skill for that.
```

Expected: the plugin triggers, asks clarifying questions, walks
pre-flight (probably silent if everything is set up), validates, and
spawns the headless Claude Code subprocess.

- [ ] **Step 13.3: Verify the dialog stays plain-language**

Throughout the conversation, confirm that NONE of these words appear
in the plugin's messages: `branch`, `commit`, `push`, `PR`,
`pull request`, `merge` (except as a clickable verb in the closing
message), `git`, `gh`, `Claude Code`, `MCP`, `repository`.

- [ ] **Step 13.4: Verify the PR**

Open the printed URL. Confirm:
- Title is `Add skill: <chosen-name>`
- Body contains the auto-template
- Files placed correctly under `skills/global/<name>/SKILL.md`
- CI ran and passed

- [ ] **Step 13.5: Close the smoke-test PR without merging**

Comment "Smoke test only, closing without merge", click "Close pull
request", delete the remote branch.

- [ ] **Step 13.6: Test the update flow**

Use an existing skill in the repo (e.g., the fixture
`test-helper-sample` if it exists, or pick any small one). Say:
"Update <skill-name>, change the trigger phrases to include 'X'."

Verify a new PR opens with title `Update skill: <name>`. Close it.

- [ ] **Step 13.7: Test the remove flow**

Say: "Remove <skill-name>." Confirm the explicit prompt, then verify a
PR opens with title `Remove skill: <name>`. Close it.

- [ ] **Step 13.8: Test escalation**

Force a fail: rename `docs/AGENT_GUIDE.md` to `docs/AGENT_GUIDE_v2.md`
locally (don't commit), then trigger the plugin. Pre-flight check 10
should fail with `AGENT_GUIDE_VERSION_MISMATCH`. The user-facing
message should match `references/escalation-template.md` exactly, with
the bracketed technical block.

Restore the file after testing.

---

## Task 14: Open the implementation PR

- [ ] **Step 14.1: Verify everything**

Re-run the structure validation script from Task 12. Re-run any
optional manual checks.

- [ ] **Step 14.2: Open the PR**

Title: `feat(plugin): add chatrevenue-skill-author for non-technical
skill authoring`
Body:
- Summary of what the plugin does
- Link to design doc:
  `design_docs/2026-05-27-chatrevenue-skill-author-design.md`
- Link to this plan
- Note that smoke-test artifacts (Tasks 13.5, 13.6, 13.7) are closed,
  not merged
- Note the dependency: Plan A must be merged in `project-a-skills` for
  the plugin to function end-to-end

- [ ] **Step 14.3: After merge, move this plan file**

Move
`chatrevenue-marketplace/engineering_plans/drafts/2026-05-27-chatrevenue-skill-author-plugin.md`
→
`chatrevenue-marketplace/engineering_plans/done/2026-05-27-chatrevenue-skill-author-plugin.md`.

---

## Coverage check

Spec → tasks:

| Design § | Implemented by |
|---|---|
| §3 persona / capabilities | encoded in SKILL.md trigger phrases and workflow (Task 3) |
| §4 high-level user-facing flow | SKILL.md workflow + user-dialog-phrases (Tasks 3, 10) |
| §5.1 no-MCP rationale | absence of `.mcp.json` and bundle dir |
| §5.2 Claude Code subprocess | Task 8 handoff-prompt |
| §5.3 single skill | only one skill folder under `skills/` |
| §7.1 SKILL.md shape (gather → preflight → validate → stash → spawn → report) | Task 3 |
| §7.2 references list | Tasks 4-10 |
| §7.3 draft stash | covered in SKILL.md Step 5 + handoff-manifest (Tasks 3, 9) |
| §7.4 spawn invocation | Task 3 (Step 6) + Task 8 |
| §8 pre-flight checks | Task 4 |
| §9 branch/PR naming | Task 6 (UX-facing) + Plan A Task 7 `new_branch.py` (mechanical, org-aware) |
| §10 validation Layer A | Task 5 |
| §10 validation Layer B | Plan A Task 8 `place_draft.py` (passes `--repo-root`/`--scope`/`--org` to `cr-skills validate`) |
| §11 escalation pattern | Task 7 |
| §12 language defaults | covered in SKILL.md + user-dialog-phrases (Tasks 3, 10) |
| §13 state / cleanup | covered in SKILL.md Step 5 + Step 6 archive (Task 3) |
| §14 dependencies | README + preflight checks (Tasks 4, 11) |

Smoke test against design §15 (non-goals): confirm the plugin does NOT
read from LangGraph Store, does NOT auto-merge, does NOT eval. Tasks
13.x verify this by exclusion.
