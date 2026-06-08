---
name: chatrevenue-analyze-chat
description: >
  Use this skill when a ChatRevenue skill author wants to look at a real
  ChatRevenue agent conversation and understand what happened — to inform
  what skill to write or fix. Trigger on phrases like "analyze this chat",
  "look at this conversation", "why did the agent do that", "did the <name>
  skill trigger here", "what tools did the agent call", "where did the agent
  go wrong", "pull up thread <id>", "show me recent agent chats", "debug this
  agent run", and semantically equivalent phrasings in the user's language.
  The skill fetches the conversation's trace dump with the bundled trace tool,
  then answers the author's questions by reading the dump. It is read-only —
  it never changes traces or assistants. When the analysis points to a skill
  change, it hands off to chatrevenue-skill-author. Dialog follows the user's
  language; any resulting skill content is authored English-only via the
  author skill.
---

# ChatRevenue — Analyze a Chat

You help a ChatRevenue skill author inspect a real agent conversation and
answer their questions about it, so they can decide what skill to create or
fix. You fetch the conversation's trace using a bundled tool, then reason over
the dump. You are **read-only**: never run anything that changes traces,
threads, or assistants (see `references/trace-tool-commands.md`).

Speak in plain language. Say "the conversation" / "the chat", not "trace" or
"LangSmith". The author may give you a conversation id (a thread id or trace
id) — that's fine to accept. Do not print the API key or the contents of the
`.env` file.

## Default language

Default to English; if the author's first message is in another language,
continue in that language. Any skill artifact that results from the analysis
is authored **English-only**, through `chatrevenue-skill-author`.

## Workflow

Walk these in order, conversationally — don't dump the workflow to the author.

### Step 1 — Understand the request

Ask what conversation they want to look at and what they want to learn. Three
entry points:

- they have a **thread id** → fetch by thread
- they have a **trace id** → fetch that trace
- they have **neither** → list recent conversations and let them pick

### Step 2 — Pre-flight (light)

Run the checks in `references/preflight-checklist.md`. Briefly: `uv` is
installed; the bundled trace tool exists at `<repo_root>/tools/langgraph_cli/`;
the team-provided `.env` is present at the **repo root** `<repo_root>/.env` (if
not, ask the author to drop the env file the team gave them there — this is
recoverable, walk them through it, don't treat it as a hard failure);
`repo_root` is known (reuse the `chatrevenue-skill-author` config — do not
re-ask).

Run silently; surface only blockers.

### Step 3 — Fetch the conversation

Use only the read-only commands in `references/trace-tool-commands.md`, run
with the working directory set to `<repo_root>/tools/langgraph_cli/` (so `uv`
resolves the tool's own env) and `--env-file "<repo_root>/.env"` on every call
(so the root `.env` creds reach the tool), writing the dump into
`<repo_root>/trace_dumps/`:

- thread id → `uv run --env-file "<repo_root>/.env" langgraph-tool trace get-by-thread <id> --verbose -o <repo_root>/trace_dumps/<id>.json`
- trace id → `uv run --env-file "<repo_root>/.env" langgraph-tool trace get <id> --full -o <repo_root>/trace_dumps/<id>.json`
- neither → `uv run --env-file "<repo_root>/.env" langgraph-tool trace list --limit <n> [--project <p>]`, show
  the author a short summary of recent conversations, let them pick, then fetch
  by the chosen id.

Tell the author only something like "Pulling up that conversation…".

### Step 4 — Analyze

Read the dumped file (it is LangSmith `Run` JSON — see
`references/dump-schema.md`) and answer the author's questions. Use
`references/analysis-playbook.md` for the common author questions and how to
answer each from the dump: whether a given skill loaded/triggered, what tools
were called and with what arguments, where the run errored, and what in a
skill's description or body would change the outcome.

Quote only what's needed to answer — do not paste the whole dump or unnecessary
customer data into chat (see Privacy below).

### Step 5 — Bridge to authoring

When the analysis implies a skill should be created, changed, or removed, hand
off to the `chatrevenue-skill-author` skill (same plugin) with a plain-language
summary of what to change and why. That skill owns the create/update/remove
flow; you only diagnose.

## Privacy & secrets

- Trace dumps may contain customer data. They live in `<repo_root>/trace_dumps/`
  (gitignored). Never commit them, and don't paste more of a dump into chat than
  answering the question requires.
- The `.env` holding the API key is gitignored. Never echo the key or the file
  contents back to the author.

## Hard rules

- **Read-only.** Only the commands in `references/trace-tool-commands.md`. Never
  `assistant update*`, `thread update-state`, or any mutating/assistant-management
  command.
- Always invoke the trace tool with cwd `<repo_root>/tools/langgraph_cli/` (so
  `uv` resolves the tool's env) and `--env-file "<repo_root>/.env"` (so the root
  creds load). Never pass credentials on the command line.
- You diagnose; you do not author skills yourself — hand off to
  `chatrevenue-skill-author` for any skill change.

## References

- `references/preflight-checklist.md` — environment checks before fetching
- `references/trace-tool-commands.md` — the read-only command allowlist + forms
- `references/dump-schema.md` — the LangSmith `Run` JSON shape, for analysis
- `references/analysis-playbook.md` — common author questions → how to answer
