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
appears in user-facing messages. The same applies to worker skills
(ones that run on their own): the user is asked whether it should "run
on its own" and "how often", never about `executable`, intervals, or
cron.

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
