# Decisions (ADR log)

Append-only record of material, **implemented** architecture decisions — the
"why" behind non-obvious choices. Present-tense "how it works" lives in
[../architecture.md](../architecture.md) and the references; this is history.

One file per decision: `NNNN-<slug>.md` (zero-padded, monotonic). Reversing a
decision = a new ADR + flipping the old one's status to `superseded by NNNN`,
never editing the old one away.

> The log is **going-forward** from the architecture bootstrap. Decisions already
> shipped in the `chatrevenue` plugin (the committed-bundle convention, the
> stdio-proxy-not-direct-HTTP choice, the standalone-vs-desktop-dependent skill
> tiers) are documented as rationale in the plugin/proxy READMEs and in the
> reference docs, and are not backfilled here. The first ADRs below were recorded
> when `chatrevenue-skill-author` (Plan B) was accepted.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-headless-claude-code-for-git.md) | Git work runs in a headless Claude Code subprocess, not the plugin's own bash | accepted |
| [0002](0002-pure-markdown-no-mcp-server.md) | The skill-author plugin is pure markdown; no MCP server in v1 | accepted |
| [0003](0003-two-layer-validation.md) | Two-layer validation: Cowork-side LLM pre-filter + authoritative `cr-skills` | accepted |
| [0004](0004-single-skill-not-split.md) | One skill triggers create/update/remove/explore, not split | accepted |
| [0005](0005-analyze-chat-second-skill-same-plugin.md) | Chat analysis ships as a second skill in the skill-author plugin, not a new plugin | accepted |
| [0006](0006-analyze-chat-read-only-allowlist.md) | analyze-chat uses a read-only trace-tool command allowlist | accepted |
