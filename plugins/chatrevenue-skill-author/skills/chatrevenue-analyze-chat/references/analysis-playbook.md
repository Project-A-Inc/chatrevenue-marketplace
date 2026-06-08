# Analysis playbook — author questions → how to answer from a dump

Map the author's plain-language question to what to look for in the LangSmith
`Run` dump (see `dump-schema.md`). Answer in plain language, quoting only the
minimal snippet needed. Where useful, end with a concrete authoring suggestion
the author can take to `chatrevenue-skill-author`.

## "Did the `<name>` skill trigger here?"

1. Find the `llm` runs and read `extra.invocation_params` — was the skill's tool
   even offered to the model (did it resolve into scope)?
2. Look for a `tool` run that loads/runs the skill (`name` matching the skill /
   the skill-loading tool, `inputs` naming it).
3. Conclude: not in scope (resolution/scoping issue) vs in scope but not chosen
   (a description/triggering issue) vs triggered (then analyze what it did).
   → Suggestion: if in-scope-but-not-chosen, the skill's **description** likely
   under-triggers — propose sharper trigger phrasing.

## "Why did the agent do X / go wrong?"

1. Walk `child_runs` by `start_time` to reconstruct the turn-by-turn path.
2. Find the decision point — the `llm` run whose `outputs` chose the wrong tool
   or wrong answer; read its `inputs` (what the model saw).
3. Check for `status == "error"` runs and their `error`.
   → Suggestion: if the model saw the right skill but misused it, the skill
   **body** (instructions) is the lever; if it never saw it, scope/description.

## "What tools did the agent call?"

List the `tool` runs in order: `name`, key `inputs`, and whether `outputs`
succeeded. Flag repeated/failed calls.

## "What did the model actually see for this turn?"

Open the relevant `llm` run's `inputs` (messages + system prompt). Confirm
whether a given skill's body/description text is present — answers "did the
skill content reach the model".

## "Which run failed and why?"

Filter runs by `status == "error"`; report each failing run's `name`,
`run_type`, and `error`, plus the parent context (`parent_run_id`).

## Turning findings into a skill change

When the analysis points to an action, summarize for `chatrevenue-skill-author`
in plain terms — e.g. "create a skill that handles returns questions; the agent
had no skill in scope for this and answered generically", or "the `pptx` skill
triggered but produced X; its body should instruct Y". Let that skill own the
create/update/remove; this skill only diagnoses.
