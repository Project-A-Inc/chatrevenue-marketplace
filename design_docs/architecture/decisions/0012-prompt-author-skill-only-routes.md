# 0012 — The prompt-author skill only routes to the prompts project; it carries no translation layer

- **Status:** accepted — narrows [0011](0011-plugin-targets-repo-docs-translation-layer.md)
  for Knowledge Lake summary prompts.
- **Date:** 2026-10-15
- **Source:** design_docs/prompt-authoring-sessions-design.md (M1–M3);
  engineering_plans/documented/2026-10-15-prompt-authoring-sessions.md

## Context
Authors also need to change the Knowledge Lake summary prompts, which live in a
different project (`project-a-kl-config`). That project owns the whole process:
the dialog, its stop points, the calls that try a prompt on an index, credentials
and shipping, and it changes them as the technology changes. The skill-author
skill carries a plain-language translation layer over its target repo's docs
(0011); doing the same here would mean a plugin release for every process or API
change in the prompts project. Two other options were rejected: a separate plugin
(same audience and Cowork project, one install is simpler) and a stored path to
the clone (Cowork works with connected folders; a stored path goes stale).

## Decision
A third skill in the `chatrevenue-skill-author` plugin, `chatrevenue-prompt-author`,
only routes: it finds the connected folder whose root `CLAUDE.md` has the heading
`## Prompt authoring sessions` (asking once when there are several or none), reads
the file that section names and follows it; that file overrides anything the
plugin says about prompts. The skill holds no vocabulary, rules, API shapes or
handoff template, and has no references directory.

## Consequences
The prompts project can change its process freely; the only stable contract is
the `CLAUDE.md` file name and that heading. Plain-language quality of the dialog
is the prompts project's responsibility, not the plugin's. Moving the skill-author
skill to the same routing model is a separate follow-up.
