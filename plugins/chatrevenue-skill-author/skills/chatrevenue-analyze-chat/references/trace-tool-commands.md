# Trace tool commands — read-only allowlist

The bundled tool is `langgraph-tool` (the vendored `langgraph_cli`), run via
`uv run` from `<repo_root>/tools/langgraph_cli/`. **Only the commands below are
allowed.** They all read; none mutate.

Always:
- `cd "<repo_root>/tools/langgraph_cli"` first — so `uv run` resolves the tool's
  own environment (Python 3.13 + deps), not the repo's.
- Pass `--env-file "<repo_root>/.env"` to **every** invocation. The `.env` (the
  team-provided LangSmith creds) lives at the **repo root**, and the tool's own
  dotenv loader only looks in `tools/langgraph_cli/`, not the root — so `uv` must
  inject the root `.env` into the environment. Never pass the key on the command
  line; only via `--env-file`. See the skill's design doc §6.
- Write dumps into `<repo_root>/trace_dumps/` with `-o`.
- Prefer `--format json` for analysis (the file is then LangSmith `Run` JSON —
  see `dump-schema.md`); `table` is for a quick human glance only.

## Allowed

### Fetch all runs for a thread (the usual entry point)

```
uv run --env-file "<repo_root>/.env" langgraph-tool trace get-by-thread <thread_id> --verbose -o <repo_root>/trace_dumps/<thread_id>.json
```

Add `--full` for the raw, complete run tree when you need every child run; add
`--limit <n>` to cap the number of traces.

### Fetch one trace by id

```
uv run --env-file "<repo_root>/.env" langgraph-tool trace get <trace_id> --full -o <repo_root>/trace_dumps/<trace_id>.json
```

(`--full` fetches the full trace tree with all child runs; drop it for a lighter
top-level view.)

### List recent conversations (when the author has no id)

```
uv run --env-file "<repo_root>/.env" langgraph-tool trace list --limit <n> [--project <project>] [-o <file>]
```

Summarize the list for the author, let them pick, then fetch by the chosen id.

### Thread history (optional; needs deployment access)

```
uv run --env-file "<repo_root>/.env" langgraph-tool thread get-history <thread_id> -o <repo_root>/trace_dumps/<thread_id>-history.json
```

Only if trace commands aren't enough. This one needs deployment creds
(`LANGGRAPH_API_URL` / bearer) in the `.env`; if they're absent it will fail —
fall back to the trace commands above.

## Forbidden (never run)

- `assistant update`, `assistant update-config`, `assistant create`,
  `assistant clone` — mutating / management.
- `thread update-state` — mutating.
- Anything not in the Allowed list. If a question seems to need a mutating
  command, it's out of scope for this skill — say so; don't run it.
