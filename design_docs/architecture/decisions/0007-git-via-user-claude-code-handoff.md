# 0007 — Git/PR runs via a user-initiated Claude Code handoff, not an auto-spawned subprocess

- **Status:** accepted — refines [0001](0001-headless-claude-code-for-git.md) (the
  "Claude Code does git, not the plugin's own bash" principle stands; the
  *auto-spawn* mechanism in 0001 is superseded by this)
- **Date:** 2026-06-08
- **Source:** `design_docs/2026-05-27-chatrevenue-skill-author-design.md` §1.2; surfaced during analyze-chat/author smoke testing.

## Context

ADR 0001 had the Cowork plugin **spawn** `claude --headless` to run the git/PR
helpers. Smoke testing on **Cowork-on-Windows** showed this can't work: the
plugin skill's only shell is the **Cowork Linux sandbox**, not the user's native
machine. In that sandbox —

- `gh` and SSH keys are absent; the `project-a-skills` remote is SSH;
- the clone is reached over a **Windows mount whose git writes are blocked**
  (#55206) and whose `git status` is **unreliable** (#42520);
- a `claude --headless` launched there runs **in the sandbox**, against the same
  broken git — it cannot reach or become the user's native Claude Code.

So the plugin cannot open a PR by spawning anything from Cowork.

## Decision

The plugin **authors** the work and **hands it off**, but never runs git or spawns
a subprocess itself:

1. Cowork does what it reliably can — dialog, Layer-A validation, and writing the
   draft + `draft.json` to the local stash (file writes to the mount work).
2. It then presents the user a **paste-able prompt** (filled-in `handoff-prompt.md`)
   to run **in the user's own native Claude Code**, with the working directory set
   to their `project-a-skills` clone.
3. That Claude Code runs the existing `agent_helpers`
   (`preflight → new_branch → place_draft → open_pr`) and produces the PR URL,
   which the user pastes back into the chat.

The environment checks (`gh`/`git`/`uv`/push/clean-tree/`agent_guide_version`)
move entirely to `preflight.py` on the Claude Code side; the Cowork-side pre-flight
shrinks to settling `repo_root`.

## Consequences

- **General pattern (applies to any future Cowork plugin):** on Cowork-on-Windows,
  the sandbox cannot do git on the mount or invoke native host tools, so anything
  needing git/native VC must split — **Cowork authors files + hands a paste-able
  prompt; the user's native Claude Code performs version control.** (Generalises
  the repo-wide rule that all git goes through native Claude Code.)
- Works today with no platform change. Cost: the "no-git, one-click" promise for
  non-technical authors is relaxed by one manual Claude Code step.
- `CLAUDE_SPAWN_FAILED` is retired; env/git failures now surface Claude-Code-side.
- **Reversible / v2 target:** opening the PR via the **GitHub API** (a connector/App
  or token over HTTPS) would remove local git and the Claude Code step entirely and
  is UX-neutral to swap in — deferred to unblock now (the "Variant 2" in §1.2).
