# Digest format — analyze-chat

`trace_digest.py` turns a raw dump (LangSmith `Run` JSON — see `dump-schema.md`)
into a compact Markdown digest. The digest is the **primary** analysis artifact:
read it first, and open the raw dump only to inspect a specific run's exact
`inputs`/`outputs`. The transform is local and read-only — no network, no LLM.
(Authoritative detail: the tool README, `<repo_root>/tools/trace_tools/README.md`.)

## Reference convention — `#N` `<run-id>`

Every line in the digest carries a reference back to the run it came from:

- `#N` — the run's **ordinal in the timeline**, ordered by `dotted_order` (or by
  `start_time` when `dotted_order` is absent). `#1` is the first run, `#2` the
  next, and so on.
- `<run-id>` — the run's `id` (the value you search for in the raw dump to open
  that exact run).

So a digest line tagged `#7 `a1b2c3…`` points at the seventh run in the timeline,
whose `id` is `a1b2c3…`. To drill in, find that `id` in the dump JSON.

## Sections

The digest has up to six sections; each is populated from the dump and tolerant of
missing or renamed fields (an unrecognized run still appears by its `id`, and an
unreadable file yields a plain message, not a stack trace):

1. **Timeline** — every run in `dotted_order`/`start_time` order: name, run type,
   status.
2. **Skills in scope** — from the `skill_resolver` run's
   `outputs.available_skills[]`: each skill's name, scope, version, description
   (what was offered to the model).
3. **Tools / skills fired** — the `tool` runs: name, a truncated argument summary,
   and success/error.
4. **Errors** — runs with `status == "error"`: name, run type, the error message,
   and parent context.
5. **What the model saw** — per `llm` run: the tools bound to that turn (from
   `extra.invocation_params.tools`) plus a pointer to that run's `inputs` (the
   messages/system prompt are **not** inlined — open the run by reference to read
   them).
6. **Tokens / cost** — per `llm` run and the totals.

## How to use it with the playbook

`analysis-playbook.md` maps author questions to dump fields. With the digest you
usually answer straight from a section (e.g. "did the `<name>` skill trigger?" →
**Skills in scope** for whether it was offered, **Tools / skills fired** for
whether it ran), and only open the raw dump by `#N`/`id` when you need the exact
`inputs`/`outputs` of a run.
