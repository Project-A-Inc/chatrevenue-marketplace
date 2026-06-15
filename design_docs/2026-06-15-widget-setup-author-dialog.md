# Widget setup — author-plugin dialog (chatrevenue-marketplace) — Claude Code brief

> Status: `draft` · Owner: Sasha · Created: 2026-06-15 · Single-repo (this repo only).
> **Master spec (read first, source of truth):**
> `nextcrm-agents/design_docs/2026-06-15-widget-setup-and-invocation-context-design.md` (§3 terminology, §6 this repo's slice).
> Mini-spec / per-repo handoff derived from it.

> **For Claude Code:** expand into a plan and execute, this repo only. Pure markdown
> (the `chatrevenue-skill-author` plugin). Git is yours; squash-merge only.

## Precondition (cross-repo — not your work)

The agent owns the `requires_setup` frontmatter flag, the invocation context
`{mode, command}`, `mark_widget_setup_complete`, and the setup endpoint (master §4);
`project-a-skills` mirrors the metadata + the skill-body branching (its mini-spec,
`docs/specs/2026-06-15-widget-setup-skill-contract.md`). This plugin teaches the
**author** to produce such a widget skill. Land after the agent contract exists.

## Scope (this repo — the `chatrevenue-skill-author` plugin)

Add a **setup step** to the widget-authoring dialog so authors can declare and
shape a widget's setup. All changes are in
`plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/`.

1. **`SKILL.md` — widget dialog gains a setup question.** When the skill being
   authored is a dashboard widget, ask in plain language: *"Does this card need a
   one-time setup from the user before it can show data — e.g. collecting their
   targets or preferences?"* If yes: *"What does setup collect, and what should it
   ask the user?"* Never surface the words `requires_setup` / `command` / `mode` to
   the author — say "setup".
   - On **yes** → the authored widget skill gets `requires_setup: true` in
     frontmatter and a **setup branch** in its body: on `command == "setup"` run the
     intake (`ask_user`), persist settings, then call
     `mark_widget_setup_complete(<widget_id>)`; plus `mode`-aware behavior
     (`worker` = unattended refresh, `chat` = interactive answer). This is the
     same shape as the quota consumer (master §5).
   - **`setup_command` is assigned implicitly — never ask the author about it.**
     It is auto-defaulted to `/{skill_name} setup` (the agent also defaults it when
     absent). The plugin does **not** add a dialog step for it and does not surface
     the field name. Only set/override it in frontmatter if the author *explicitly*
     requests a custom command (e.g. "make the setup command X").

2. **`references/widget-archetypes.md`** — document the optional setup-capable
   widget variant: `requires_setup: true` (+ optional `setup_command`, default
   `/{skill_name} setup`) + the body's `command`/`mode` branches + the
   `mark_widget_setup_complete` call. Keep archetypes the source of the skeleton.

3. **`references/validation-rules.md`** — Cowork-side pre-filter: if frontmatter has
   `requires_setup: true`, the body must contain a `setup` branch (intake) and call
   `mark_widget_setup_complete`; and `requires_setup` only makes sense with
   `widget: true`. (Authoritative validation stays server-side via `cr-skills`.)

4. **`references/handoff-manifest.md`** — optional `"requires_setup": true` hint in
   `draft.json` for the PR body (additive; not required by the helpers).

5. **`plugin.json`** — bump version.

## Done

- A widget-authoring run where the author says "yes, it needs setup" produces a
  draft with `requires_setup: true` + the setup branch + `mark_widget_setup_complete`.
- `widget-archetypes.md`, `validation-rules.md`, `handoff-manifest.md` updated;
  plain-language vocabulary (no `requires_setup`/`command`/`mode` shown to the user).
- Structure check passes (frontmatter parses, references present/linked).

## Non-goals

- Agent runtime + endpoint (master §4); skill content / quota re-merge
  (project-a-skills mini-spec); frontend (master §7).
- Changing the existing non-widget authoring flow or the analyze-chat skill.
