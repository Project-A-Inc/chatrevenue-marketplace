# 0004 — One skill triggers create/update/remove/explore, not split into separate skills

- **Status:** accepted
- **Date:** 2026-06-08
- **Source:** `engineering_plans/documented/2026-05-27-chatrevenue-skill-author-plugin.md` + `design_docs/2026-05-27-chatrevenue-skill-author-design.md` §5.3

## Context

The plugin covers four user intents — create, update, remove, and explore
(browse existing skills). A natural alternative is to split the read-only
explore path into its own skill (`…-author` + `…-explore`), each with a tighter
trigger surface.

## Decision

Ship **exactly one skill** (`chatrevenue-skill-author`) whose description triggers
on all of create / update / remove / explore phrasings (plus the worker /
recurring-intent phrasings). The explore path is an internal branch of the same
SKILL.md, not a separate skill.

## Consequences

- A single, coherent trigger surface — avoids wrong-skill triggers between two
  near-synonymous authoring skills and keeps the description in one place.
- The read-only explore branch is mechanical to split out later if post-launch
  usage data shows it deserves its own skill — this decision is cheap to reverse.
- Cost: one larger SKILL.md body carrying all four flows, rather than two smaller
  focused ones.
