# Branch naming — plain-language wrapper only

> **ADR 0011.** The actual branch/commit/PR conventions are **contract** and live in
> the repo: `project-a-skills/docs/AGENT_GUIDE.md` → "Branch naming" / "Commit
> messages" / "PR titles". Claude Code applies them natively (ADR 0010). The plugin
> does not name branches and does not restate the patterns here — that's why this
> file is just the translation layer.

This file exists only so you can describe what's happening to a non-technical
user **without** the words "branch", "commit", "PR", "checkout", or "merge".

## What you say to the user

- create: "Preparing a separate copy for the new behavior…"
- update: "Preparing a separate copy with your edits…"
- remove: "Preparing the removal for review…"

(Use the corresponding phrases from `user-dialog-phrases.md` when the dialog is not
in English.)
