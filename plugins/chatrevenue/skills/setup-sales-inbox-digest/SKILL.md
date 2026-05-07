---
name: setup-sales-inbox-digest
description: Sets up the ChatRevenue "Daily inbox digest" Cowork scheduled task. Use when the user asks to install, schedule, or set up the daily sales inbox digest, or types `/chatrevenue:setup-sales-inbox-digest`. Walks through Cowork connector requirements (Microsoft 365 mandatory, one CRM, optional notes/docs), confirms the run time + output folder with the user, and registers a Cowork-native scheduled task that scans the user's Outlook inbox each morning and produces a categorized digest with drafted replies for client/partner threads.
---

# Set up the Daily Inbox Digest scheduled task

You are helping the user install a **Cowork-native scheduled task** that runs a morning inbox-triage workflow on weekdays. The user's request to set this up came through one of:

- They typed `/chatrevenue:setup-sales-inbox-digest` directly.
- They asked something like "set up the daily inbox digest" or "schedule the morning inbox triage".
- The ChatRevenue Monitor desktop app opened a fresh Cowork chat with a setup prompt.

The actual setup playbook — connector prerequisites, prompt body, cron cadence, output-folder picker — lives in the companion file alongside this skill:

```
${CLAUDE_PLUGIN_ROOT}/skills/setup-sales-inbox-digest/SCHEDULE.md
```

## How to run this setup

1. **Read the companion `SCHEDULE.md`** — it's the canonical install guide. Walk the user through its steps verbatim; ask for placeholder values as you encounter them.
2. **Verify connectors** — Microsoft 365 is hard-required (the workflow can't read mail without it); the guide also lists one-of CRMs (HubSpot or Salesforce) and optional notes/docs connectors. The guide includes step-by-step "Add connector" instructions; surface them if anything's missing rather than failing silently.
3. **Confirm the schedule cadence + output folder** — defaults are 7:00 AM weekdays and a folder of the user's choosing for the daily digest markdown. The guide tells you when to flex on each.
4. **Create the Cowork scheduled task** using Cowork's native scheduler primitive. Substitute the placeholders the guide specifies (output folder path, manager email if applicable, etc.).
5. **Run-now once after creation** so connector permissions for Outlook + CRM + notes tools are pre-granted before the first scheduled run.
6. **Tell the user to confirm in the desktop app** if they came from a ChatRevenue Monitor "Set up →" deeplink.

## Idempotency

This skill is the only entry point for installing this scheduled task — re-run it to update to the latest version. When the user asks to update, run this skill again; it overwrites the task body with the freshly-fetched companion content.

## What to do if the user asks to remove the task

Tell them: "I don't have a tool to remove the scheduled task — Cowork doesn't expose deletion through this skill. Open Cowork's **Scheduled** list, find `sales-inbox-digest`, and click ⋯ → Delete. Then return to the ChatRevenue Monitor app and click **Confirm** so the desktop app's records reflect the removal."
