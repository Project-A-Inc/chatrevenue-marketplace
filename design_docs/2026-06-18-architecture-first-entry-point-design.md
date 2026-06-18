# Architecture-first entry point (chatrevenue-skill-author plugin) — design

> Status: `draft` · Owner: Sasha · Created: 2026-06-18
> Feature slug: `architecture-first-entry-point` · This repo's slice.
> Part of a two-repo feature (same slug). The sibling slice lives in
> `project-a-skills` (its `CLAUDE.md`) and has its own self-contained spec there.
> This spec is self-contained for THIS repo — a Code session here needs nothing
> from the other repo.
> Driven through ChatRevenue delivery (Cowork orchestrates; Claude Code commits).

## Problem

The `chatrevenue-skill-author` and `chatrevenue-analyze-chat` skills reason about
the behavior and contracts of the system whose skills live in `project-a-skills`,
but they carry no instruction to consult that system's architecture
documentation. So when these skills (or the Cowork user driving them) need to
know how something works — dispatch, invocation context, widgets/surfaces, setup
— they tend to infer it from skill bodies rather than the authoritative
architecture docs.

This caused a concrete failure (issue #63): a `command == "detail"` invocation
was inferred from skill bodies when the actual contract (declarative
`compact`/`expanded` widget surfaces, and an invocation context of only
`setup` / `worker` / `chat`) was documented in `project-a-skills`.

## Goal

Make these plugin skills treat the `project-a-skills` architecture docs as the
source of truth for system behavior and contracts — while degrading gracefully,
because the plugin often runs in Cowork **without** `project-a-skills` mounted.

## Non-goals

- No changes to `project-a-skills` (that is the sibling slice, separate spec).
- No new reference files, tooling, or validation rules.
- No change to what the skills actually do — only an added sourcing rule.

## Scope — edit two SKILL.md files (inline)

Add a short **"architecture is the source of truth"** paragraph **inline** to
both skills:

- `plugins/chatrevenue-skill-author/skills/chatrevenue-skill-author/SKILL.md`
- `plugins/chatrevenue-skill-author/skills/chatrevenue-analyze-chat/SKILL.md`

Inline (not a shared reference file) because the two skills live in separate
folders and cannot cleanly share one reference.

The rule is **conditional**, because the plugin may run without `project-a-skills`
mounted:

- Treat `project-a-skills/docs/architecture` as **authoritative** for system
  behavior and contracts.
- If the repo is available, consult it **before** reasoning from skill bodies.
- If it is not available, **flag that the conclusion needs architecture
  confirmation** rather than asserting it from a skill body alone.

## Acceptance criteria

- Both named SKILL.md files carry the conditional "architecture is the source of
  truth" paragraph.
- The paragraph explicitly handles the repo-not-mounted case (flag, don't
  assert).
- English-only authored content (per the skill-authoring rule).
- Any plugin validation this repo runs stays green.

## Cross-repo consistency note (for the orchestrator, not this Code session)

The sibling slice in `project-a-skills` states the same rule unconditionally in
`CLAUDE.md`. Cowork verifies at the integration gate that both surfaces point at
the same architecture docs and state the same rule. No action needed from this
repo's Code session beyond the scope above.
