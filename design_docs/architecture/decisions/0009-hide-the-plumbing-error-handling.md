# 0009 — Hide the plumbing: silent safe workarounds, plain-language blockers only

- **Status:** accepted
- **Date:** 2026-06-16
- **Source:** `design_docs/2026-06-16-hide-the-plumbing-error-handling.md` (prompted by a user report against `chatrevenue-analyze-chat`).

## Context

Both skills in the `chatrevenue-skill-author` plugin serve **non-technical** staff
(PM, sales, support). The plugin already hid the *happy-path* plumbing (it never
says git / branch / PR / MCP — see [0001](0001-headless-claude-code-for-git.md),
the hidden-vocabulary constraint), but it had no equivalent rule for the
**error path**. When the `chatrevenue-analyze-chat` flow hit an environment
hiccup, the agent surfaced the full technical autopsy into the dialog — a reported
example named `langgraph-tool` needing Python ≥3.13 vs. the sandbox's 3.10, `uv`
failing to fetch the runtime (proxy 403), and a team env file saved as `env.txt`
whose multiline PEM key broke `--env-file` parsing. To the audience this is noise,
and it erodes trust.

Many of those conditions are in fact **recoverable without the author** (env file
saved under another name; a first-run dependency sync) and are **read-only** — no
mutation, nothing to lose by recovering silently. The old guidance said only
"surface only blockers", which neither encouraged the silent recovery nor
constrained *how* a real blocker was phrased.

## Decision

Adopt one **plugin-wide error-handling principle**, written into both skills'
`SKILL.md` and the `chatrevenue-analyze-chat` pre-flight checklist:

1. **Try safe workarounds silently first.** If the agent can recover a problem
   itself and the fix is read-only, reversible, touches nothing the user owns, and
   changes no data or state, it does so without narrating it. (env file named
   `env.txt` → point `--env-file` at the file that's actually there; first-run
   dependency sync → retry once silently.)
2. **Surface only real blockers, in plain language.** Raise a problem only when it
   genuinely stops the agent *and* no safe workaround exists — saying what it means
   for the user and the next step, never the technical autopsy (no tool names,
   version numbers, proxy/HTTP status codes, exit codes, stack traces, or
   file-format/parsing details). The reported Python/proxy/PEM string is codified
   as the explicit ❌ antipattern, paired with a ✅ plain-language reply.

**Silent ≠ pretending it worked.** The silent path never invents or guesses an
answer to mask a failure, and never covers anything that changes state or touches
the user's data — those stay off-limits (consistent with the analyze-chat
read-only allowlist, [0006](0006-analyze-chat-read-only-allowlist.md)). When the
agent truly cannot proceed, it says so plainly.

For the authoring skill, genuinely unresolvable environment/git blocks (which now
surface on the user's **Claude Code** side, not in Cowork — see
[0007](0007-git-via-user-claude-code-handoff.md)) are relayed through the existing
`references/escalation-template.md`: the user sees a plain "what happened / what to
do" message and a labelled block to forward to the AI team — the raw detail is
packaged for the team, never presented to the user as an explanation.

## Consequences

- A single error-path posture across the plugin, mirroring the happy-path
  hidden-vocabulary rule: the audience sees outcomes and next steps, not internals.
- Recoverable, read-only hiccups are absorbed silently, so the common cases that
  produced the report no longer reach the user at all.
- The boundary is explicit and safe: "work around silently" is scoped to local,
  read-only, non-mutating fixes; every state-changing action and every real
  failure stays visible. This keeps the principle from degrading into hiding
  failures.
- Shipped as a docs/guidance change with no interface change — plugin
  `0.3.1 → 0.3.2`. No `project-a-skills` change; the trace tool and sandbox runtime
  are untouched.
