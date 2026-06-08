# Trace tool commands — read-only allowlist

The bundled tool is `langgraph-tool` (the vendored `langgraph_cli`), run via
`uv run` from `<repo_root>/tools/langgraph_cli/` so its `.env` loads. **Only the
commands below are allowed.** They all read; none mutate.

Always:
- `cd "<repo_root>/tools/langgraph_cli"` first (so `.env` is found).
- Write dumps into `<repo_root>/trace_dumps/` with `-o`.
- Prefer `--format json` for analysis (the file is then LangSmith `Run` JSON —
  see `dump-schema.md`); `table` is for a quick human glance only.

## Allowed

### Fetch all runs for a thread (the usual entry point)

```
uv run langgraph-tool trace get-by-thread <thread_id> --verbose -o <repo_root>/trace_dumps/<thread_id>.json
```

Add `--full` for the raw, complete run tree when you need every child run; add
`--limit <n>` to cap the number of traces.

### Fetch one trace by id

```
uv run langgraph-tool trace get <trace_id> --full -o <repo_root>/trace_dumps/<trace_id>.json
```

(`--full` fetches the full trace tree with all child runs; drop it for a lighter
top-level view.)

### List recent conversations (when the author has no id)

```
uv run langgraph-tool trace list --limit <n> [--project <project>] [-o <file>]
```

Summarize the list for the author, let them pick, then fetch by the chosen id.

### Thread history (optional; needs deployment access)

```
uv run langgraph-tool thread get-history <thread_id> -o <repo_root>/trace_dumps/<thread_id>-history.json
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
