# 0010 — Cowork delivers content + intent; the user's Claude Code owns git end-to-end (the plugin's git helpers are retired)

- **Status:** accepted — **supersedes [0007](0007-git-via-user-claude-code-handoff.md)**
  (which in turn refined [0001](0001-headless-claude-code-for-git.md)). The
  through-line from 0001 stands — *git never runs in the Cowork sandbox* — but the
  mechanism changes again: Code no longer runs the plugin's `agent_helpers` git
  chain; it owns branch/commit/PR natively.
- **Date:** 2026-06-23
- **Source:** field feedback from a `chatrevenue-skill-author` v0.1.0 (Variant 1)
  ship run, 2026-06-23 (the `WORK_TREE_DIRTY` halt described below).

## Context

ADR 0007 split the work as: Cowork authors the draft + a `draft.json`, then hands
the user a paste-able prompt; the user's **native Claude Code** runs the plugin's
four `agent_helpers` (`preflight → new_branch → place_draft → open_pr`) to open the
PR. The git *playbook* still lived in the plugin's helpers; Code merely executed
them.

In practice the team settled a cleaner division of responsibility:

- **Cowork authors content** — design specs (`docs/specs/`) and skill drafts
  (`SKILL.md` + `references/`). It never runs git.
- **Claude Code owns all git** — branch, commit, push, PR — **natively**, the way
  it already does for every other repo.

Under that division the plugin owning a git chain **duplicates a responsibility
that already belongs to Code**, and the duplication actively breaks the flow:

1. A ship run halted at `preflight.py` with
   `{"failure_code":"WORK_TREE_DIRTY","step":"status"}`.
2. The dirty tree was *expected*: in this flow Cowork authors a spec/draft into the
   repo and leaves it **uncommitted** (Cowork authors, Code commits). A dirty tree
   at ship time is normal, not an error.
3. `preflight`'s clean-tree gate fails on **any** dirty tree — including an
   untracked file unrelated to the skill — so the helper chain is structurally
   incompatible with "Cowork authors, Code commits."

Two secondary defects surfaced in the same run: the dirty-tree guard is too coarse
(it should not care about paths outside the skill target), and the handoff prompt
emitted Windows backslash paths that the shell stripped, forcing Code to rewrite
them as forward slashes.

## Decision

The plugin **stops driving git**. It delivers only **content + intent**; the
user's Claude Code performs version control its own way.

1. Cowork authors and stashes the draft and (optionally) places it into the repo
   working tree as plain files. It produces the **intent** — `type`, `scope`,
   `name`, `org_id`, and a suggested PR title/body — in `draft.json`.
2. The handoff prompt asks Code to: read the manifest, **place the draft** (the one
   pure-filesystem primitive, `place_draft.py` with no commit), run the
   authoritative `cr-skills validate`, then **branch / commit / push / open the PR
   natively** using its own git knowledge. No `preflight`, no `new_branch`, no
   `open_pr`.
3. The repo-side `agent_helpers` git chain is **retired**. On the skills-repo side
   `preflight.py`, `new_branch.py`, and `open_pr.py` are removed; the git/`gh`
   subprocess helpers in `_common.py` go with them; `place_draft.py` is kept as a
   **pure FS placement + validate** primitive (commit stripped). `AGENT_GUIDE.md`'s
   contract shrinks accordingly and its `agent_guide_version` bumps (breaking
   change). This is specified for Code in `project-a-skills/docs/specs/`.
4. The clean-working-tree gate is **removed** from the automated path. A dirty tree
   is a normal precondition of this flow; cleanliness, branching, and commit scope
   are Code's concern, decided natively.
5. Handoff paths are emitted **forward-slash and quoted**, so they survive the
   shell on Windows.

## Consequences

- **One owner for git.** The branch-naming / commit / PR playbook is no longer
  maintained in two places. Code, which already opens PRs for every repo, does it
  here too. The plugin's surface shrinks to authoring + a paste-able intent.
- **`place_draft.py` remains the useful primitive** — deterministic placement into
  `skills/<scope>/…/<name>/` plus the authoritative `cr-skills validate` gate —
  decoupled from git. Validation stays exactly where it was (ADR
  [0003](0003-two-layer-validation.md) two-layer model is unchanged).
- **No more `WORK_TREE_DIRTY` halt** in the normal flow, because the automated path
  no longer asserts a clean tree.
- **Plugin docs change with the contract:** `handoff-prompt.md` and SKILL.md Step 6
  drop the four-helper chain (Code branches/commits/PRs natively, paths
  forward-slash/quoted); `preflight-checklist.md`, `branch-naming.md`, and
  `escalation-template.md` are trimmed to reflect that environment/git is now wholly
  Code's domain. `agent_guide_version` gating still protects the one remaining
  helper contract.
- **Retired error categories:** `WORK_TREE_DIRTY`, `BRANCH_NAME_TAKEN`,
  `GH_PR_CREATE_FAILED`, the `PREREQ_*` env checks, and `BRANCH_BEHIND_MAIN` leave
  the plugin's escalation table — those failures (if any) now surface in Code's own
  output, not through the plugin. `VALIDATION_REPO_SIDE_FAILED` stays (it belongs to
  `place_draft`'s validate step).
- **Cost / trade-off:** the plugin no longer guarantees a uniform branch name or PR
  body shape — Code decides those. The suggested `pr_title`/`pr_body` in the
  manifest become advisory intent rather than a substituted template. The team
  accepted this in exchange for a single git owner and a flow that doesn't fight a
  dirty tree.
- **The handoff is always delivered in chat**, as a paste-able block the user
  copies into their Code session — never written as a file. A file would be a
  competing, stale-able artifact and a stray untracked file in the tree; the
  Cowork side hands over content + intent, it does not deposit deliverables for
  git. (The plugin already does this — `SKILL.md` Step 6 presents a paste-able
  block.) One block per repo, since Code sessions are repo-isolated.
- **Still reversible toward the v2 GitHub-API target noted in 0007** — opening the
  PR over HTTPS via a connector/App would remove even the Code step. That remains
  deferred; this ADR unblocks the current Cowork-authors / Code-commits flow now.
