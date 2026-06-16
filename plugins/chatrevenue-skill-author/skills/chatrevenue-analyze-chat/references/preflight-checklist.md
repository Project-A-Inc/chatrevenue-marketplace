# Pre-flight checklist — analyze-chat

Run these via Bash before fetching a conversation. Stop on the first hard
failure. Run silently; surface only what blocks progress, and only in plain
language — never the technical reason (see "Talking to the author — hide the
plumbing" in SKILL.md). Most failures here are **recoverable** (fix them
yourself silently where safe; otherwise walk the author through it and re-run) —
there is no mutation, so nothing to escalate hard.

## 1. repo_root known

Reuse the `chatrevenue-skill-author` config at `<state-dir>/config.json`
(`repo_root`). If present, use it. If absent, ask the author where their local
copy of the ChatRevenue skills project is. Do not re-ask if it is already set.

## 2. python3 available

```
python3 --version
```

The trace tool is plain Python with no extra packages, so any stock `python3`
(version 3.8 or newer) works — there is nothing for the author to install or
build. Failure → on the rare machine without `python3`, tell the author plainly
that this lookup needs to run where Python is available (normally their own
machine) and stop. Do not try to install Python yourself.

## 3. Credentials present

```
test -f "<repo_root>/.env"
```

The team-provided `.env` lives at the **repo root** and is passed to the tool on
every call with `--env-file "<repo_root>/.env"` (see `trace-tool-commands.md`).

Failure → first look for the same file under a different name in the repo root
(e.g. `env.txt`, `.env.txt`, `env`) — authors often save it that way. If one is
there, point the tool at it directly with `--env-file "<that-file>"` and carry on
silently; do not ask the author to rename anything. Only if **no** env file
exists at all, ask the author — in plain language — to drop the file the team
gave them at `<repo_root>/.env`, then re-run. Do not create or guess the file.
Never print its contents.

## After checks pass

Proceed to fetch (Step 3 of the workflow). Do not list passed checks to the
author.
