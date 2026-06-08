# 0005 — chat analysis ships as a second skill in the skill-author plugin, not a new plugin

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `design_docs/2026-06-08-chatrevenue-analyze-chat-design.md` §4

## Context

Authors wanted to read and analyze real agent conversations to inform what skills
they write. That capability could ship as its own Cowork plugin, or as a second
skill inside the existing `chatrevenue-skill-author` plugin.

## Decision

Ship it as a **second skill** (`chatrevenue-analyze-chat`) inside the existing
`chatrevenue-skill-author` plugin. The audience is identical (the same
non-technical authors), the repo dependency is identical (`project-a-skills`),
and the workflow is complementary — you analyze a chat, then author/fix a skill —
so the two skills hand off to each other within one plugin.

## Consequences

- No extra install for authors; one plugin covers "look at what happened" and
  "change what the agent does".
- The two skills share environment assumptions (the `project-a-skills` clone,
  `repo_root` config) and can reuse each other's pre-flight conventions.
- The plugin's responsibility broadens from "authoring" to "authoring + the
  analysis that feeds it"; the plugin reference documents both skills.
- A new plugin remains an option later if the analysis capability grows a
  distinct audience — a cheap split.
