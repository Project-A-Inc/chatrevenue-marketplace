# Pre-flight checklist — analyze-chat

Run these via Bash before fetching a conversation. Stop on the first hard
failure. Run silently; surface only what blocks progress, and only in plain
language — never the technical reason (see "Talking to the author — hide the
plumbing" in SKILL.md). Most failures here are **recoverable** (fix them
yourself silently where safe; otherwise walk the author through it and re-run) —
there is no mutation, so nothing to escalate hard.

## 1. uv installed

```
uv --version
```

Failure → ask the author to install `uv`:
- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

Then re-run. (`uv` provisions the tool's Python 3.13 automatically — the author
does not install Python themselves.)

## 2. repo_root known

Reuse the `chatrevenue-skill-author` config at `<state-dir>/config.json`
(`repo_root`). If present, use it. If absent, ask the author where their local
copy of the ChatRevenue skills project is. Do not re-ask if it is already set.

## 3. Bundled trace tool present

```
test -d "<repo_root>/tools/langgraph_cli" && test -f "<repo_root>/tools/langgraph_cli/pyproject.toml"
```

Failure → the trace tool hasn't been added to the skills project yet. Tell the
author this needs the AI team to add it (it ships separately) and stop. Do not
try to fetch or build it yourself.

## 4. Credentials present

```
test -f "<repo_root>/.env"
```

The team-provided `.env` lives at the **repo root** (it is loaded into the tool's
environment via `uv run --env-file "<repo_root>/.env"` — the tool's own dotenv
loader only checks `tools/langgraph_cli/`, not the root; see
`trace-tool-commands.md`).

Failure → first look for the same file under a different name in the repo root
(e.g. `env.txt`, `.env.txt`, `env`) — authors often save it that way. If one is
there, point the tool at it directly with `--env-file "<that-file>"` and carry on
silently; do not ask the author to rename anything. Only if **no** env file
exists at all, ask the author — in plain language — to drop the file the team
gave them at `<repo_root>/.env`, then re-run. Do not create or guess the file.
Never print its contents.

## 5. Tool runs

```
cd "<repo_root>/tools/langgraph_cli" && uv run --env-file "<repo_root>/.env" langgraph-tool --help
```

Expected: exit 0, prints help. Failure → this is usually a first-run dependency
sync that `uv` handles itself, so **retry once silently** before saying
anything. If it still fails, tell the author plainly that the lookup tool isn't
working from here and the AI team needs to take a look — without the error text,
exit code, or version details.

## After checks pass

Proceed to fetch (Step 3 of the workflow). Do not list passed checks to the
author.
