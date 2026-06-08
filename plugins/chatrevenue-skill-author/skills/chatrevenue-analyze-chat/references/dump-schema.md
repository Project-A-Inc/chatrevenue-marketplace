# Dump schema — LangSmith `Run` JSON

A `--format json` dump is one or more LangSmith **`Run`** objects (a tree of
runs for the conversation). Use this shape to navigate the dump when answering
the author. (Authoritative source: LangSmith's `Run` schema; this is the
working subset.)

## Run object — key fields

- **Identity / tree:** `id`, `name`, `parent_run_id`, `child_run_ids`,
  `child_runs` (nested runs — the actual call tree).
- **Type:** `run_type` — one of `chain`, `llm`, `tool`, `retriever`,
  `embedding`, `prompt`, `parser`. For agent analysis the load-bearing ones are
  `llm` (a model turn) and `tool` (a tool/skill call).
- **Payload:** `inputs`, `outputs` — the actual data in/out of each run.
- **Status:** `status` (`success` / `error`), `error` (message when failed).
- **Timing:** `start_time`, `end_time`.
- **Metadata:** `extra` — holds `invocation_params`, `metadata`, runtime info
  (e.g. the tools bound to an `llm` run, the model, temperature).
- **Tags:** `tags`.

## How to read it for agent behavior

- **What the agent did, in order:** walk `child_runs` depth-first by
  `start_time`. `llm` runs are the model's turns; `tool` runs are the calls it
  made between turns.
- **Which tools/skills were available to a turn:** look at the `llm` run's
  `extra.invocation_params` (the bound tool schemas). A skill that should have
  been offered but isn't here didn't resolve into scope.
- **Which tools/skills actually fired:** the `tool` runs — `name` is the tool,
  `inputs` the arguments, `outputs` the result. Skill tools (load/run a skill)
  show up here.
- **Where it went wrong:** find runs with `status == "error"` (read `error`),
  or an `llm`/`tool` `outputs` that's clearly off. The `parent_run_id` chain
  tells you the context it failed in.
- **What the model "saw":** an `llm` run's `inputs` contains the messages /
  system prompt for that turn — useful for "did the skill's body/description
  actually reach the model".

## Note

`--full` produces the raw `model_dump` of every run (most complete, largest);
without it you get a lighter top-level view. Use `--full` when you need to
inspect exact `inputs`/`outputs` or the full tool list of a turn.
