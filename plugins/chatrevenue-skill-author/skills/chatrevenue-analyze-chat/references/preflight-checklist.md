# Pre-flight checklist — analyze-chat

Run these via Bash before fetching a conversation. Stop on the first hard
failure. Run silently; surface only what blocks progress. Most failures here
are **recoverable** (walk the author through a fix and re-run) — there is no
mutation, so nothing to escalate hard.

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

Failure → ask the author to drop the env file the team gave them at
`<repo_root>/.env`, then re-run. Do not create or guess the file. Never print its
contents.

## 5. Tool runs

```
cd "<repo_root>/tools/langgraph_cli" && uv run --env-file "<repo_root>/.env" langgraph-tool --help
```

Expected: exit 0, prints help. Failure → report the error to the author in
plain language (likely a first-run dependency sync; `uv` handles it, so a retry
often clears it). If it persists, this needs the AI team.

## After checks pass

Proceed to fetch (Step 3 of the workflow). Do not list passed checks to the
author.
