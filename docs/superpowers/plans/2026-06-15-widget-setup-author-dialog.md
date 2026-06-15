# Widget Setup — Author-Plugin Dialog Implementation Plan

> **Status: `documented`** (2026-06-15) — shipped in PR #10 (`2ec49a3`); net delta
> folded into `design_docs/architecture/references/skill-author-plugin.md`
> ("Widget setup" subsection + the hidden-vocabulary line). All tasks below are
> complete. Kept for history.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the `chatrevenue-skill-author` plugin to ask, during widget authoring, whether the card needs a one-time user setup — and on "yes" produce a widget skill with `requires_setup: true`, a `command == "setup"` intake branch ending in `mark_widget_setup_complete`, and `mode`-aware refresh/answer behavior — all in plain language, never surfacing the field names.

**Architecture:** Pure-markdown change to one plugin. The author dialog (`SKILL.md`) gains a setup question inside the existing widget branch; the archetype library (`widget-archetypes.md`) documents the setup-capable variant skeleton; the validation pre-filter (`validation-rules.md`) gains two checks; the handoff manifest (`handoff-manifest.md`) gains an optional `requires_setup` hint; `plugin.json` version bumps. `setup_command` is implicit (default `/{skill_name} setup`) and never asked. Mirrors master spec §6 and `project-a-skills` §5 body contract.

**Tech Stack:** Markdown (skill content) + JSON (plugin manifest). No code, no automated test runner — verification is YAML/JSON parse + `grep` assertions + a manual no-jargon read.

**Sources of truth:**
- Mini-spec: `design_docs/2026-06-15-widget-setup-author-dialog.md`
- Master spec: `../nextcrm-agents/design_docs/2026-06-15-widget-setup-and-invocation-context-design.md` (§3 terminology, §4.3–4.5, §5 body contract, §6 this repo's slice)

**All edited files live under:** `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/`

---

## File Structure

- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md` — widget branch (Step 3) gains the setup question + the on-yes consequences.
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/widget-archetypes.md` — new "Setup-capable variant" section after the archetypes; cross-link from the "After filling an archetype" section.
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md` — two new bullets in the Widget rules section.
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-manifest.md` — optional `requires_setup` field in the schema, fields table, and widget note.
- Modify: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json` — version `0.2.0` → `0.3.0`.

No new files. No file deletions.

---

## Task 1: Document the setup-capable widget variant in `widget-archetypes.md`

Do this first — `SKILL.md`'s widget branch will point the author at this section ("the archetype file shows exactly how"), so the skeleton must exist before the dialog references it.

**Files:**
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/widget-archetypes.md`

- [ ] **Step 1: Add the "Setup-capable variant" section**

Insert the following section immediately **before** the final `## After filling an archetype` section (i.e. after Archetype 3's closing `---`, as a new top-level section). It applies to all three archetypes:

````markdown
## Setup-capable variant (optional — only if the card needs a one-time user setup)

Any of the three archetypes can additionally require a **one-time setup** from the
user before it can show data — e.g. it must collect the user's targets, thresholds,
or preferences first. Add this only when the author confirms the card needs it
(the main skill asks them in plain language). It does not change the layout or the
data shape — it adds a branch to the **body** and one frontmatter flag.

When the author says the card needs setup:

1. **Frontmatter** — add `requires_setup: true` (sibling to `widget: true` /
   `executable: true`). Optionally `setup_command:` — **leave it out**; it defaults
   to `/{skill_name} setup`. Only add it if the author explicitly asks for a custom
   command. Never mention the field name to the author.
2. **Body** — the worker body branches on **how it was invoked**:
   - **On the setup command** → run the intake: ask the user for each setting
     (use the agent's `ask_user`), persist the settings, then call
     `mark_widget_setup_complete(<widget_id>)`. `<widget_id>` is the skill name.
     This branch is idempotent — running it again is "reconfigure" (read current
     settings, let the user change them, re-save); it does not reset completion.
   - **Unattended refresh** (worker) → read the saved settings and refresh the
     card's data **without ever asking the user**. (The card is only auto-refreshed
     after setup is complete, so settings will be present; still fail-as-error if
     the saved settings have vanished — never fabricate.)
   - **Interactive answer** (chat, no setup command) → answer from the saved
     settings, interactively.

Skeleton for the body (substitute the real intake questions and data-gathering):

```text
First, figure out how this run was invoked.

- If this is the setup command:
  Run the one-time setup. Ask the user for <the settings the author named>
  one at a time (read any existing settings first and only ask for what's
  missing or what they want to change). Save each setting. When all settings
  are captured, call mark_widget_setup_complete(<skill-name>). Then stop —
  the next refresh will populate the card.

- If this is an unattended (background) refresh:
  Read the saved settings. Gather the card's data from them (state absolute
  time windows; never fabricate). Build the data matching the card's shape and
  persist it — including the empty state. If the saved settings are gone or the
  data source is unavailable, end the run as an error (so the card shows a
  setup / connect state). Never ask the user here.

- Otherwise (an interactive question, no setup command):
  Answer from the saved settings, interactively.
```

Keep the plain-language rule: when talking to the author, say **"setup"** — never
`requires_setup`, `setup_command`, `command`, or `mode`. The same
"persist always, error if the source is unavailable, never fabricate" rule from the
archetypes still applies to the refresh branch.

This is the same shape the quota widget uses (one `quota-attainment` skill that
branches on how it was invoked).
````

- [ ] **Step 2: Cross-link from "After filling an archetype"**

In the existing `## After filling an archetype` section, append a fourth bullet after the cadence bullet:

```markdown
- If the card needs a one-time user setup, also apply the **Setup-capable variant**
  section above: add `requires_setup: true` and the setup/refresh/answer branches.
```

- [ ] **Step 3: Verify the section is present and well-formed**

Run:
```bash
grep -n "Setup-capable variant" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/widget-archetypes.md
grep -c "requires_setup\|mark_widget_setup_complete\|setup_command" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/widget-archetypes.md
```
Expected: the first prints two lines (the new heading + the cross-link reference mentioning "Setup-capable variant"); the second prints a count ≥ 4.

- [ ] **Step 4: Commit**

```bash
git add plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/widget-archetypes.md
git commit -m "docs(skill-author): document setup-capable widget archetype variant"
```

---

## Task 2: Add the setup question to the `SKILL.md` widget branch

**Files:**
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md` (the "Widget branch" subsection inside Step 3, currently ending with the `widget.json`/`save_widget_data` vocabulary line)

- [ ] **Step 1: Insert the setup step into the widget branch**

In the **Widget branch (a dashboard widget)** block of Step 3, after the existing bullet list (the bullet ending "...The archetype file states this.") and **before** the `Never surface "widget.json", "schema", "layout", or "save_widget_data"...` line, insert:

```markdown
- **Ask whether the card needs a one-time setup.** In plain language: *"Does this
  card need a one-time setup from the user before it can show data — e.g.
  collecting their targets or preferences?"* If yes: *"What does setup collect,
  and what should it ask the user?"* If no, skip the rest of this bullet.
  - On **yes**, follow the **Setup-capable variant** in
    `references/widget-archetypes.md`: set `requires_setup: true` in the draft
    frontmatter, and shape the body so it (a) runs the intake on the setup command
    — ask for the settings the author named, persist them, then call
    `mark_widget_setup_complete(<skill-name>)`; (b) refreshes unattended from the
    saved settings without asking; (c) answers interactively from the saved
    settings otherwise.
  - The launch command is **implicit** — it defaults to `/{skill_name} setup`.
    **Never ask the author about it** and never surface the field name. Only set a
    custom one if the author explicitly requests it (e.g. "make the setup command
    X").
```

- [ ] **Step 2: Extend the no-jargon line to cover setup**

Replace the existing line:

```markdown
Never surface "widget.json", "schema", "layout", or "save_widget_data" — say
"dashboard card", "counters", "list", "card fields".
```

with:

```markdown
Never surface "widget.json", "schema", "layout", "save_widget_data",
"requires_setup", "setup_command", "command", or "mode" — say "dashboard card",
"counters", "list", "card fields", and "setup".
```

- [ ] **Step 3: Verify the frontmatter still parses and the dialog wording is present**

Run:
```bash
python -c "import yaml,sys; t=open(r'plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md',encoding='utf-8').read(); fm=t.split('---')[1]; yaml.safe_load(fm); print('frontmatter OK')"
grep -n "one-time setup" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md
grep -n "mark_widget_setup_complete" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md
```
Expected: prints `frontmatter OK`; the setup question line and the `mark_widget_setup_complete` reference each match at least once.

- [ ] **Step 4: Verify no jargon leaks into author-facing prose**

Manually re-read the inserted bullets: the author-facing question text must say "setup" only. The field names (`requires_setup`, `setup_command`, `command`, `mode`, `mark_widget_setup_complete`) appear **only** as instructions to you (the authoring agent) about what to write into the draft — never inside a quoted line you'd say to the author. Confirm the only quoted user-facing strings are the two italic questions.

- [ ] **Step 5: Commit**

```bash
git add plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md
git commit -m "feat(skill-author): widget dialog asks whether the card needs setup"
```

---

## Task 3: Add the `requires_setup` pre-filter rules to `validation-rules.md`

**Files:**
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md` (the `## Widget (dashboard widget skills only)` section)

- [ ] **Step 1: Append the two setup checks to the Widget rules**

At the end of the bullet list in the `## Widget (dashboard widget skills only)` section (after the "A widget is a worker: `executable: true`..." bullet), add:

```markdown
- [ ] `requires_setup` only appears together with `widget: true`. It is meaningless
      on a non-widget skill — flag a `requires_setup` without `widget: true`.
- [ ] If the frontmatter has `requires_setup: true`, the body must contain a **setup
      branch** — an intake (asks the user, e.g. via `ask_user`) that persists the
      settings and then calls `mark_widget_setup_complete(<widget_id>)`. A
      `requires_setup: true` whose body has no setup intake and no
      `mark_widget_setup_complete` call is incomplete — loop back to the dialog.
- [ ] `requires_setup`, when present, is a boolean. `setup_command`, when present,
      is a string; it is optional (defaults to `/{skill_name} setup`) — do not
      require it.
```

- [ ] **Step 2: Verify the rules are present**

Run:
```bash
grep -c "requires_setup" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md
grep -n "mark_widget_setup_complete" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md
```
Expected: the count is ≥ 3; the `mark_widget_setup_complete` line matches.

- [ ] **Step 3: Commit**

```bash
git add plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/validation-rules.md
git commit -m "docs(skill-author): pre-filter rules for requires_setup widget skills"
```

---

## Task 4: Add the optional `requires_setup` hint to `handoff-manifest.md`

**Files:**
- Modify: `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-manifest.md`

- [ ] **Step 1: Add `requires_setup` to the example schema**

In the `## Schema (v2)` JSON block, add a `"requires_setup"` line after the `"name"` line:

```json
  "name": "kebab-case-slug",
  "requires_setup": true,
```

- [ ] **Step 2: Add a fields-table row**

In the `### Fields` table, add a row after the `name` row:

```markdown
| `requires_setup` | boolean \| absent | **Optional.** Hint for the PR body that this widget needs a one-time user setup (`requires_setup: true` in the skill frontmatter). Additive; the helpers do not require it. |
```

- [ ] **Step 3: Note it in the dashboard-widgets paragraph**

In the `## What lives in the draft folder` section's **Dashboard widgets.** paragraph, change the closing sentence:

from
```markdown
no extra manifest fields are required; an
optional `"widget": true` hint may be added to `draft.json` for the PR body.
```
to
```markdown
no extra manifest fields are required; optional `"widget": true` and, for a
setup-capable widget, `"requires_setup": true` hints may be added to `draft.json`
for the PR body.
```

- [ ] **Step 4: Verify**

Run:
```bash
grep -c "requires_setup" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-manifest.md
```
Expected: count ≥ 3.

- [ ] **Step 5: Commit**

```bash
git add plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/references/handoff-manifest.md
git commit -m "docs(skill-author): optional requires_setup hint in draft.json manifest"
```

---

## Task 5: Bump the plugin version

**Files:**
- Modify: `plugins/chatrevenue-skill-author/.claude-plugin/plugin.json`

- [ ] **Step 1: Bump version**

Change `"version": "0.2.0"` to `"version": "0.3.0"`.

- [ ] **Step 2: Verify the JSON still parses**

Run:
```bash
python -c "import json; print(json.load(open(r'plugins/chatrevenue-skill-author/.claude-plugin/plugin.json',encoding='utf-8'))['version'])"
```
Expected: prints `0.3.0`.

- [ ] **Step 3: Commit**

```bash
git add plugins/chatrevenue-skill-author/.claude-plugin/plugin.json
git commit -m "chore(skill-author): bump plugin to v0.3.0 (widget setup dialog)"
```

---

## Task 6: Final structure check + open the PR

**Files:** none (verification + git)

- [ ] **Step 1: Full structure check**

Run:
```bash
python -c "import json; json.load(open(r'plugins/chatrevenue-skill-author/.claude-plugin/plugin.json',encoding='utf-8')); json.load(open(r'.claude-plugin/marketplace.json',encoding='utf-8')); print('json OK')"
python -c "import yaml; t=open(r'plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md',encoding='utf-8').read(); yaml.safe_load(t.split('---')[1]); print('frontmatter OK')"
```
Expected: `json OK` and `frontmatter OK`.

- [ ] **Step 2: Confirm references are present and linked**

The SKILL.md References section already lists `references/widget-archetypes.md`, `references/validation-rules.md`, and `references/handoff-manifest.md`. Confirm:
```bash
grep -n "widget-archetypes.md\|validation-rules.md\|handoff-manifest.md" plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md
```
Expected: each of the three reference files is mentioned.

- [ ] **Step 3: Acceptance walk-through (manual)**

Re-read the "Done" criteria of `design_docs/2026-06-15-widget-setup-author-dialog.md` and confirm against the diff:
  - A "yes, needs setup" widget run → `requires_setup: true` + setup branch + `mark_widget_setup_complete` (Tasks 1 + 2).
  - `widget-archetypes.md`, `validation-rules.md`, `handoff-manifest.md` updated (Tasks 1, 3, 4).
  - No `requires_setup`/`command`/`mode` jargon shown to the author (Task 2 Step 4).
  - Structure check passes (this task).

- [ ] **Step 4: Push the branch and open the PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(skill-author): widget setup dialog (v0.3.0)" --body "<summary referencing design_docs/2026-06-15-widget-setup-author-dialog.md and master spec §6; squash-merge>"
```
Expected: prints the PR URL. (Squash-merge per repo convention.)

---

## Self-Review

**Spec coverage (mini-spec §Scope 1–5):**
1. SKILL.md setup question + on-yes consequences + implicit `setup_command` → Task 2 (+ skeleton in Task 1).
2. `widget-archetypes.md` setup-capable variant → Task 1.
3. `validation-rules.md` pre-filter (`requires_setup` ⇒ setup branch + `mark_widget_setup_complete`; only with `widget: true`) → Task 3.
4. `handoff-manifest.md` optional `requires_setup` hint → Task 4.
5. `plugin.json` version bump → Task 5.
Done criteria + structure check + PR → Task 6.

**Placeholder scan:** All inserted markdown/JSON is shown verbatim; the body skeleton is intentionally a `text` block (it is illustrative prose for the authoring agent, not executable code, and avoids the `bash`/`python` fenced-block validation rule). No TBD/TODO.

**Naming consistency:** `requires_setup`, `setup_command`, `command`, `mode`, `mark_widget_setup_complete`, `widget_id` used identically across all tasks and matching master spec §3 terminology. Default command literal is `/{skill_name} setup` everywhere.
