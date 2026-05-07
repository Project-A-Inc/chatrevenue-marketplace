---
name: setup-icp-lead-gen-daily
description: Sets up the ChatRevenue "Daily ICP lead generation" Cowork scheduled task. Use when the user asks to install, schedule, or set up daily ICP lead generation, or types `/chatrevenue:setup-icp-lead-gen-daily`. Walks through prerequisites (the `chatrevenue-icp-lead-gen` Day-1 setup must already be complete), confirms the schedule cadence with the user, and registers a Cowork-native scheduled task that finds 3 fresh ICP-fit leads every weekday and appends them to the user's tracker.
---

# Set up the Daily ICP lead-gen scheduled task

You are helping the user install a **Cowork-native scheduled task** that runs the daily ICP lead-generation workflow autonomously every morning. The user's request to set this up came through one of:

- They typed `/chatrevenue:setup-icp-lead-gen-daily` directly.
- They asked something like "schedule daily ICP lead generation" or "set up the daily lead-gen run".
- The ChatRevenue Monitor desktop app opened a fresh Cowork chat with a setup prompt.

The actual setup playbook — prerequisites, prompt body, cron cadence — lives in the companion file alongside this skill:

```
${CLAUDE_PLUGIN_ROOT}/skills/setup-icp-lead-gen-daily/SCHEDULE.md
```

## How to run this setup

1. **Read the companion `SCHEDULE.md`** — it's the canonical install guide. Don't paraphrase it; the user gets a better experience if you walk them through its steps verbatim, asking for placeholder values as you go.
2. **Verify prerequisites** — the guide opens with a hard prerequisite (the `chatrevenue-icp-lead-gen` Day-1 setup must already have produced an ICP profile + leads tracker on the user's machine). If the prereq fails, surface the exact wording from the guide and stop. Don't try to half-install.
3. **Confirm the schedule cadence** with the user before creating the task — the default is weekdays at 7:00 AM in the user's timezone, but the guide tells you when to flex.
4. **Create the Cowork scheduled task** using Cowork's native scheduler primitive. The companion file specifies the exact prompt body + cron expression to register; substitute placeholders the guide tells you to substitute (rep's company name, profile path, tracker path, tracker format).
5. **Run-now once after creation** so connector permissions are pre-granted — the guide explains why.
6. **Tell the user to confirm in the desktop app** if they came from a ChatRevenue Monitor "Set up →" deeplink, so the desktop's shadow state can record the install.

## Idempotency

This skill is the only entry point for installing this scheduled task — re-run it to update the task to the latest version (the previous separate `update-*` and `uninstall-*` plan-tools were dropped in favour of "re-run setup-X to refresh; remove manually in Cowork's Scheduled list"). When the user asks to update, run this skill again; it overwrites the task body with the freshly-fetched companion content.

## What to do if the user asks to remove the task

Tell them: "I don't have a tool to remove the scheduled task — Cowork doesn't expose deletion through this skill. Open Cowork's **Scheduled** list, find `icp-lead-gen-daily`, and click ⋯ → Delete. Then return to the ChatRevenue Monitor app and click **Confirm** so the desktop app's records reflect the removal."
