# 0011 — The skill-author plugin targets `project-a-skills` architecture docs as the single source of truth; the plugin is a plain-language translation layer

- **Status:** accepted — generalises [0010](0010-cowork-delivers-content-code-owns-git.md)
  into a standing principle. Extends the existing "Architecture is the source of
  truth" rule in `SKILL.md` (previously scoped to *system behaviour*) to also cover
  the *authoring/ship contract*.
- **Date:** 2026-06-23
- **Source:** retrospective on the ADR 0010 change — a single contract change
  (retiring the git helpers) forced edits in ~6 plugin reference files *and* the
  skills repo, because the plugin had **duplicated** the technical contract.

## Context

The `chatrevenue-skill-author` plugin had grown its own copy of the technical
contract: the ship flow, the `draft.json` schema, branch/PR naming, the helper
surface, and the environment checks all lived as prose inside
`skills/chatrevenue-skill-author/references/*.md`. The same facts also live —
authoritatively — in `project-a-skills` (`docs/AGENT_GUIDE.md` +
`docs/architecture/`).

Two copies of one contract means every contract change is a two-repo edit that can
silently drift. ADR 0010 made this concrete: retiring the git helpers required
rewriting `handoff-prompt.md`, `preflight-checklist.md`, `branch-naming.md`,
`handoff-manifest.md`, and `escalation-template.md` in the plugin in lock-step with
the repo. That is exactly the coupling we want to remove.

The repo is already the right home for the contract: it is versioned
(`agent_guide_version`), it is what Claude Code reads at ship time, and approaches
should be improvable by editing the repo alone.

## Decision

**The technical contract lives only in `project-a-skills`.** The plugin **targets**
those docs rather than restating them. The plugin's job is **translation**: turn
the technical architecture into plain language for a non-technical author, and
collect a valid draft + intent.

Split of responsibility:

- **Source of truth (skills repo):** the ship flow, `draft.json` schema, branch/PR
  conventions, the `place_draft.py` surface, environment/git expectations, and
  authoritative validation rules — `docs/AGENT_GUIDE.md`, `docs/architecture/`,
  `CONTRIBUTING.md`.
- **Translation layer (plugin):** the user-facing dialog and vocabulary
  (`user-dialog-phrases.md`), the plain-language "what to say instead of git
  terms", the widget archetype field prompts, the Layer-A validation UX
  pre-filter, and the plain-language escalation wrapper. No technical contract.

Concretely, the plugin's `references/*.md` that previously embedded contract become
**pointers**: they name the authoritative file in `project-a-skills` and carry only
the thin plain-language wrapper Cowork needs for the dialog. The handoff prompt
shrinks to **intent + a pointer**: it gives Claude Code the manifest path and
`repo_root` and tells it to read and follow `docs/AGENT_GUIDE.md` — it does not
re-encode the steps.

### The availability nuance

The plugin sometimes runs in Cowork **without `project-a-skills` mounted**. This is
why the contract is *targeted*, not *inlined*, and why the boundary matters:

- **At ship time** the repo is always present (Claude Code operates inside the
  clone), so the handoff prompt safely defers to `AGENT_GUIDE.md` — the contract is
  read from the repo, never carried in the prompt.
- **During Cowork-side dialog** the repo may be absent. The plugin therefore keeps
  only the *translation* knowledge it needs to talk to the user (vocabulary,
  archetype prompts, Layer-A checks). It does **not** assert system behaviour or
  contract details from memory; if it needs an authoritative fact and the repo
  isn't mounted, it flags that the conclusion needs confirmation against the docs
  (the existing "Architecture is the source of truth" rule, now extended to the
  ship contract).

## Consequences

- **Contract changes are one-repo edits.** Improving the approach (a new ship step,
  a manifest field, a renamed convention) is done by editing `project-a-skills`
  alone. The plugin keeps working because it points at whatever the repo currently
  says — no lock-step plugin release.
- **The plugin gets smaller and stays in its lane** — dialog + translation +
  draft/intent. Easier to reason about, harder to drift.
- **`agent_guide_version` gating still applies:** if a breaking contract change
  lands, the plugin's version check catches it; additive changes flow through with
  no plugin edit.
- **One-time refactor cost:** the plugin reference files that duplicated contract
  (`handoff-prompt.md`, `handoff-manifest.md`, `preflight-checklist.md`,
  `branch-naming.md`) are reduced to pointers + plain-language wrapper. Done as part
  of accepting this ADR.
- **Trade-off:** when the repo isn't mounted, Cowork-side dialog has less local
  detail to lean on. Accepted deliberately — the plugin should translate, not
  duplicate, and the ship-time path (where the contract actually executes) always
  has the repo.
- **Relationship to 0010:** 0010 decided *who owns git*; 0011 decides *where the
  contract lives and what the plugin is for*. 0010 is an instance of 0011.
