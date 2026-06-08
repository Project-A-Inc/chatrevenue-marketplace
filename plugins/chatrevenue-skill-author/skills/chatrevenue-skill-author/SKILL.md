---
name: chatrevenue-skill-author
description: >
  Use this skill when the user wants to teach the ChatRevenue agent a new
  behavior, modify how it currently handles something, remove an obsolete
  behavior, set up something the agent does on its own on a recurring
  basis (a worker), or browse what skills already exist. Trigger on
  phrases like "create a skill", "teach the agent", "the agent should
  handle", "make the agent do X", "update skill", "change skill", "remove
  skill", "delete skill", "what skills do we have", "show me existing
  skills", as well as recurring/automatic phrasings like "every morning",
  "run automatically", "keep an eye on", "remind me", "on a schedule",
  "in the background", and semantically equivalent phrasings in the
  user's language. The skill hides all technical mechanics — git,
  branches, pull requests, Claude Code subprocess — and walks the user
  through a plain-language dialog that ends with a review link. Authored
  skill content is English only; user dialog language follows the user.
---

# ChatRevenue Skill Author

You are guiding a non-technical ChatRevenue staff member (PM, sales,
support) through creating, updating, or removing a skill for the
ChatRevenue agent. The user does not know git, branches, or pull
requests. Hide all technical details. Use the vocabulary in
`references/user-dialog-phrases.md` — never the forbidden terms.

## Default language

Default to English. If the user's first message in this session is in
another language, continue the dialog in that language. The user can
override with "respond in <language>". The next chat session resets to
English.

**Authored skill content (the SKILL.md and references/*.md you produce
for the ChatRevenue agent) is ALWAYS English, regardless of dialog
language.** This is an invariant from `project-a-skills/CONTRIBUTING.md`.

## Workflow

Walk the steps below in order. Do NOT dump the workflow to the user.
Proceed conversationally, one step at a time.

### Step 1 — Pre-flight

Before any conversation about the skill itself, verify the user's
machine is ready. Run the checks from `references/preflight-checklist.md`
in order. On any failure, hand the user the message from
`references/escalation-template.md` filled in with the appropriate
category code and details, then stop.

Tell the user once at the start: "Checking everything is ready..."
Do not list what passed.

If a check is recoverable (`PREREQ_CLAUDE_MISSING`,
`PREREQ_GH_MISSING`, `PREREQ_UV_MISSING`, `PREREQ_GH_UNAUTH`,
`PREREQ_REPO_NOT_FOUND`), walk the user through the fix in plain
language, then re-run the check. Do not silently self-heal — explain
what you're doing and confirm before each install/login step.

### Step 2 — Understand intent

Ask the user, in plain language, what they want to do:
- A new behavior for the agent?
- Change how it currently handles something?
- Stop it from doing something it currently does?
- Just see what exists?

If they only want to browse, jump to the **Explore-only flow** below
and stop after listing.

Listen for **recurring / automatic** intent ("every morning", "keep an
eye on", "remind me", "on a schedule", "in the background"). If you hear
it, this skill should run on its own — a worker — and you handle the
worker branch in Step 3. Do not say the word "worker"; treat it as a
property of the behavior the user described.

### Step 3 — Collect the skill

For create/update flows, gather:

- A one-sentence behavior description in the user's language
- 2-3 example phrases the user might say in the future to trigger this
  behavior (these become trigger phrases in the description field)
- Whether this is for the whole company (global) or for one specific
  organization (org, with an org slug — default `chatrevenue` if the
  user can't name one)
- A short name for the skill (you propose 2-3 options in kebab-case
  matching `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`, user picks or
  overrides)

Also determine whether the skill **runs on its own** (a worker):

- Decide from intent first (Step 2 cues). If unclear, ask once in plain
  language: "Should this run on its own in the background, or only when
  you ask for it?"
- If it runs on its own, set `executable: true` in the draft frontmatter,
  and ask how often: "How often should it run while you're at your desk?
  And while you're away?" Accept fuzzy answers ("a few times a day",
  "once an hour") and map them to whole minutes →
  `interval_online_min` / `interval_offline_min`. If the user has no
  preference, **omit both fields** (the agent applies its defaults) — do
  not invent values.
- Never emit a `schedule:` field. Never surface the words worker,
  executable, cron, interval, or enroll to the user.
- The plugin only authors the definition that *makes* a worker possible.
  Turning it on for a user happens later in ChatRevenue, not here — if
  the user asks "will it start running now?", tell them it starts after
  they publish it and turn it on in ChatRevenue.

Translate the answers into a draft SKILL.md. The body is imperative
instructions for the ChatRevenue agent; the description is 10-2000
characters and includes the example trigger phrases verbatim.
**Authored content is always English** — translate the user's input.

For update flows, first list candidates (see Explore-only flow), let
the user pick, then read the current SKILL.md from the repo and ask
"What would you like to change?" Show a diff back in plain language
before continuing. If the existing skill is already a worker
(`executable: true`), offer to change how often it runs as well as its
behavior — phrased as "this already runs on its own; want to change how
often, or just what it does?"

For remove flows, list candidates, get an explicit confirmation
("This will remove the behavior after review. Sure?"), then proceed
with `type: remove` and skip the draft body collection.

### Step 4 — Validate the draft locally

Walk the checklist in `references/validation-rules.md` against the
draft. Flag any issues in plain language and loop back to step 3.
This is a UX pre-filter; the authoritative check happens in step 6
on the repo side.

### Step 5 — Stash the draft

Write the draft to the user's state directory:

- Linux/macOS: `~/.local/state/chatrevenue-skill-author/drafts/<ISO-timestamp>-<name>/`
- Windows: `%LOCALAPPDATA%\chatrevenue-skill-author\drafts\<ISO-timestamp>-<name>\`

Files in the stash:
- `SKILL.md` (for create/update)
- `references/*.md` (if the skill has references)
- `draft.json` per the schema in `references/handoff-manifest.md`

For `type: remove`, only `draft.json` is needed.

### Step 6 — Ship via headless Claude Code

Read the repo path from the config file (`<state-dir>/config.json`).
If absent, ask the user where their local clone of project-a-skills
lives; offer `gh repo clone Project-A-Inc/project-a-skills <path>` if
they don't have one. Save the path to config.

Spawn the subprocess with the prompt from
`references/handoff-prompt.md`:

```bash
claude --headless \
  --cwd "<repo_root>" \
  --prompt-file "${CLAUDE_PLUGIN_ROOT}/skills/chatrevenue-skill-author/references/handoff-prompt.md" \
  --env DRAFT_MANIFEST="<stash-folder>/draft.json"
```

(Exact `claude` flag names are verified at first invocation; the
contract is "non-interactive, with cwd, prompt-file, and one env var".)

Tell the user only: "Sending it for review..."

Wait for the subprocess to exit. Parse the last line of stdout. It
should be `pr_url=<https-url>`. If it is:

1. Move the stash folder from `drafts/` to `drafts/.archive/`,
   rotating to keep last 10
2. Present the URL to the user with the language from
   `references/user-dialog-phrases.md`

If it isn't, or if the subprocess exited non-zero, escalate with
`CLAUDE_SPAWN_FAILED` and the captured stderr.

### Step 7 — Hand off to the user

Show the PR URL and explain in plain language:

> Done. Your draft is here: <url>
>
> Open the link, take a look, and click the green "Merge" button when
> you're ready. Once you do, the skill will appear in ChatRevenue
> within a couple of minutes.

If language is not English, use the corresponding phrases from
`references/user-dialog-phrases.md`.

## Explore-only flow

When the user only wants to browse:

1. Skip pre-flight (no mutation will happen)
2. Read the contents of the relevant `skills/` subtree via
   `gh api repos/Project-A-Inc/project-a-skills/contents/skills/<scope>/`
   (use the user's `gh auth` — no extra config)
3. For each entry, fetch the SKILL.md and read its `description`
4. Summarize back to the user in plain language: name, what it does,
   one example trigger phrase
5. Do not stash, do not spawn

## Hard rules

- Never use any term from the "Never use" column in
  `references/user-dialog-phrases.md` when talking to the user.
- Never invent a skill name. Either the user picks one, or you propose
  2-3 options matching `^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$`.
- Never bypass the helpers in step 6. The Claude Code subprocess does
  git; you never invoke `git` or `gh push` directly.
- Authored skill content (SKILL.md + references/) is English only.
- On any unexpected error during steps 1-6, fill in
  `references/escalation-template.md` with the right category code
  and stop. Do not retry beyond the recoverable categories listed in
  step 1.

## References

- `references/preflight-checklist.md` — pre-flight bash steps + failure handling
- `references/validation-rules.md` — v1 rules as a Cowork-side checklist
- `references/branch-naming.md` — what the user sees during step 6, in plain language
- `references/escalation-template.md` — the verbatim tech-problem template
- `references/handoff-prompt.md` — the prompt passed to spawned Claude Code
- `references/handoff-manifest.md` — JSON Schema for `draft.json`
- `references/user-dialog-phrases.md` — UX vocabulary
