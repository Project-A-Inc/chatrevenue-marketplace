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
- [ ] Every file under `references/` ends in `.md`, **except** a dashboard
      widget's `references/widget.json` (see Widget rules below)

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

## Widget (dashboard widget skills only)

Relevant only when the skill is a dashboard widget. See
`references/widget-archetypes.md`. The **authoritative** layout/binding check is
`cr-skills validate` server-side (it validates `widget.json` against the
published widget-layout schema + binding coverage); this is the early pre-filter.

- [ ] If the frontmatter has `widget: true`, a `references/widget.json` is present
      (and vice-versa — don't ship one without the other).
- [ ] `widget.json` has `id` (= the skill `name`), a `schema` object, and a
      `layout` object with `compact` and `expanded`.
- [ ] The layout came from an archetype skeleton (not hand-built), and every
      field referenced in the layout (`{{field}}` / `{ "bind": … }`) exists in
      the `schema` — the archetype keeps these in sync by construction.
- [ ] A widget is a worker: `executable: true` is set (it runs on its own to
      refresh). Cadence intervals are optional as usual.

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
