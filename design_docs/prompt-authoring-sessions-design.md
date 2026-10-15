# Prompt authoring sessions — entry skill — v1.0.0

- **Slug:** `prompt-authoring-sessions`
- **Status:** spec v1.0.0 2026-10-15
- **Author:** Cowork, with Sasha
- **Release:** `chatrevenue-skill-author` 0.5.0

## 1. Problem

The skill author helps non-technical staff change ChatRevenue agent skills. Nothing helps them change the Knowledge Lake summary prompts, which live in a different project. The prompts project owns everything a session must know: dialog, steps, the API calls for trying a prompt, and shipping. That knowledge changes with the technology, and the plugin must not have to change with it.

## 2. Decisions

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| M1 | New skill `chatrevenue-prompt-author` in the `chatrevenue-skill-author` plugin. | A separate plugin | Same audience, same Cowork project, one install. |
| M2 | The skill only routes. It finds the prompts project's local clone, reads its `CLAUDE.md` and follows the `## Prompt authoring sessions` route. It holds no dialog vocabulary, rules, API shapes or HandOff template. | Carry a translation layer, as `chatrevenue-skill-author` does | A process or API change touches only the prompts project. |
| M3 | Locating the clone: the connected folder whose root has `CLAUDE.md` with the heading `## Prompt authoring sessions`. If there are several candidates or none, ask the author once, in plain words, to connect or pick their prompts project folder. | A stored path in the plugin's state | Cowork works with connected folders. A stored path goes stale. |

## 3. Changes in this repo

- **`plugins/chatrevenue-skill-author/skills/chatrevenue-prompt-author/SKILL.md`.** New, short.
  - **Description (trigger):** the author wants to change, review or try how the Knowledge Lake summarizes entities or relationships. Examples: "change how deals are summarized", "the summary of this company is too long", "show me the prompt for contacts", "try a new prompt", "publish my prompt change", "summary prompts", and equivalents in the user's language.
  - **Body:**
    1. Find the prompts project per M3.
    2. Read its `CLAUDE.md` and then the file its `## Prompt authoring sessions` route names.
    3. From here on, follow that file. It overrides anything this skill or the plugin's other references say about prompts.
    4. If the route or the file is missing, tell the author in plain words that this folder is not the prompts project, and stop.

    Hide-the-plumbing applies to the author dialog, as in the plugin's other skills.
  - **Contents rule:** no references directory, no restated contract.
- **`plugins/chatrevenue-skill-author/.claude-plugin/plugin.json`.** Version `0.5.0`. The description adds "and Knowledge Lake summary prompts".
- **`.claude-plugin/marketplace.json`.** The plugin description adds the prompt authoring.
- **`plugins/chatrevenue-skill-author/README.md`.** A section *Prompt authoring*:
  - prerequisite: a local clone of the prompts project, connected to the Cowork project;
  - what the author sees;
  - "the process itself is described in the prompts project".
- **Out of scope.**
  - Any change to `chatrevenue-skill-author` or `chatrevenue-analyze-chat`.
  - Moving the skill author to the same routing model (separate follow-up).
  - Architecture docs (phase 6).

## 4. Contracts

### Provides

| Counterparty | Kind / protocol | Shape | Auth | Errors | Versioning |
|---|---|---|---|---|---|
| Prompt authors (Cowork users) | Cowork skill | `chatrevenue-prompt-author`, triggered by the description in §3 | Cowork plugin install | missing project → a plain-words request to connect it | plugin semver |

### Consumes

| Counterparty | Kind / protocol | Shape | Auth | Errors | Versioning |
|---|---|---|---|---|---|
| project-a-kl-config (prompts project, local clone) | file in the repository | **E1** — `CLAUDE.md` at the repository root. Under the heading `## Prompt authoring sessions`, it routes a session that helps someone write, try or publish prompts to `docs/architecture/references/prompt-authoring.md`. That reference is the whole authoring contract: dialog, steps, API calls, credentials, shipping. The skill relies only on the file `CLAUDE.md` and that heading. | read access to a local clone | missing file or heading → the skill tells the author the folder is not the prompts project | the heading text and the file name are stable; the content behind them changes freely |

## 5. Acceptance criteria

1. `SKILL.md` exists with valid front matter (`name`, `description` with the trigger examples). Its body holds only the four steps of §3 and contains no API route, placeholder name, branch or PR convention.
2. `plugin.json` is at 0.5.0. `marketplace.json` and the README mention prompt authoring.
3. Manual check in Cowork:
   - with the prompts project connected and the plugin installed, "change how deals are summarized for chatrevenue-business" triggers the skill, which reads `CLAUDE.md` and then the authoring reference;
   - with no prompts project connected, the skill asks the author to connect it and does nothing else.
