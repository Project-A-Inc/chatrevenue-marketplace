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
