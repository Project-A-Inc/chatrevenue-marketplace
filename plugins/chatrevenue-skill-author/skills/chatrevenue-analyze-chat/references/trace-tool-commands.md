# Trace tool commands — read-only allowlist

The trace tool lives in the ChatRevenue skills project at
`<repo_root>/tools/trace_tools/` (two plain-Python scripts: `trace_fetch.py` and
`trace_digest.py`). It runs with stock `python3` — no extra packages and no
working-directory requirement. The **detailed source of truth** for invocation,
flags, and the dump/digest formats is that tool's own README:
`<repo_root>/tools/trace_tools/README.md`.

**Only the commands below are allowed.** They all read; none mutate. (The tool
has no assistant/thread mutation commands at all, so it is read-only by
construction — this allowlist names the boundary explicitly per ADR 0006.)

Always:
- Invoke the script by absolute path with stock `python3`.
- Pass `--env-file "<repo_root>/.env"` to **every** fetch. The `.env` (the
  team-provided LangSmith creds) lives at the **repo root**. Never pass the key on
  the command line; only via `--env-file`.
- Write dumps and digests into `<repo_root>/trace_dumps/` with `-o`.

## Allowed — fetch (read-only)

### Fetch all runs for a thread (the usual entry point)

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get-by-thread <thread_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<thread_id>.json"
```

Add `--limit <n>` to cap the number of traces; `--start-time <ISO>` to widen or
move the default bounded time window; `--project <name>` to override the default
project.

### Fetch one trace by id

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" get <trace_id> --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/<trace_id>.json"
```

### List recent conversations (when the author has no id)

```
python3 "<repo_root>/tools/trace_tools/trace_fetch.py" list --limit <n> [--project <project>] --env-file "<repo_root>/.env" -o "<repo_root>/trace_dumps/recent.json"
```

Summarize the list for the author, let them pick, then fetch by the chosen id.

## Allowed — digest (local, read-only)

```
python3 "<repo_root>/tools/trace_tools/trace_digest.py" "<repo_root>/trace_dumps/<id>.json" -o "<repo_root>/trace_dumps/<id>.digest.md"
```

Pure local JSON→Markdown — no network, no LLM. See `digest-format.md` for the
sections and the `#N`/`id` reference convention. The digest is the **primary**
analysis artifact; open the raw dump only to drill into a specific run by
reference.

## Forbidden (never run)

- Anything that writes or changes state. The tool ships only the read commands
  above; it has no assistant-management or thread-mutation commands. If a question
  seems to need a mutating action, it is out of scope for this skill — say so;
  don't attempt it.
- Do not invent flags. Only the flags documented in
  `<repo_root>/tools/trace_tools/README.md` are valid — don't carry over flags
  from other tools.
