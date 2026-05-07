---
name: setup-calendar-analysis
description: Sets up the ChatRevenue "Calendar analysis vs SaaS benchmark" Cowork artifact — an interactive HTML dashboard that reads the user's Outlook calendar, classifies meetings, and benchmarks the breakdown against published SaaS Sales IC data. Use when the user asks to install, set up, or open the calendar analysis dashboard, or types `/chatrevenue:setup-calendar-analysis`. Walks through resolving three placeholders (user email, company domain, Outlook MCP tool name), substituting them into the bundled `template.html`, and creating a Cowork-native artifact with the right `mcp_tools` permissions.
---

# Set up the Calendar Analysis Cowork artifact

You are helping the user install a **Cowork-native artifact** — an interactive HTML dashboard hosted in Cowork's artifact viewport. The user's request came through one of:

- They typed `/chatrevenue:setup-calendar-analysis` directly.
- They asked something like "set up the calendar analysis dashboard" or "show me my meeting breakdown vs SaaS benchmark".
- The ChatRevenue Monitor desktop app opened a fresh Cowork chat with a setup prompt.

Two companion files alongside this skill carry the playbook + the dashboard code:

```
${CLAUDE_PLUGIN_ROOT}/skills/setup-calendar-analysis/ARTIFACT.md     # install playbook
${CLAUDE_PLUGIN_ROOT}/skills/setup-calendar-analysis/template.html   # the dashboard, with placeholders
```

## How to run this setup

1. **Read the companion `ARTIFACT.md`** — it's the canonical install guide. It explains the three placeholders (`{{USER_EMAIL}}`, `{{USER_DOMAIN}}`, `{{OUTLOOK_TOOL_NAME}}`), where to find their real values, and how to ask the user when defaults don't apply.
2. **Resolve all three placeholders in the order ARTIFACT.md specifies.** Don't substitute `{{USER_EMAIL}}` blindly — confirm with the user before locking it in. `{{USER_DOMAIN}}` defaults to the part after `@` but the guide tells you when to ask. `{{OUTLOOK_TOOL_NAME}}` requires inspecting available MCP tools.
3. **Substitute placeholders into `template.html`.** The literals are inside single quotes near the top of the inline `<script>` block; replace them in-place — don't add or remove quotes.
4. **Create the Cowork artifact** with the substituted HTML body. The guide specifies the artifact `id` and `mcp_tools` allowlist that must accompany it. Both are required; without `mcp_tools` the artifact can't call the Outlook calendar-search tool at runtime.
5. **Tell the user to confirm in the desktop app** if they came from a ChatRevenue Monitor "Set up →" deeplink.

## Idempotency

This skill is the only entry point for installing this artifact — re-run it to update to the latest version. The previous separate `update-*` plan-tool was dropped; instead, re-run setup-calendar-analysis. The artifact will be re-created with the latest dashboard code (preserve previously-entered placeholder values when possible by reading the existing artifact body before overwriting).

## What to do if the user asks to remove the artifact

Tell them: "Open the artifact in Cowork, click ⋯ → Delete. Then return to the ChatRevenue Monitor app and click **Confirm** so the desktop app's records reflect the removal."
