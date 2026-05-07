---
name: icp-lead-gen-daily
display: Daily ICP lead generation
description: Finds 3 new ICP-fit leads every weekday morning, dedupes against your existing tracker + CRM (if connected), appends to the tracker, sends a brief summary.
---

# Daily ICP lead generation — Setup Guide

A fresh batch of 3 named, ICP-fit prospects appended to your leads tracker every weekday morning, with dedupe against the rows you already have plus any CRM you've connected. Runs autonomously — you'll see a notification with a one-paragraph summary and a link to the tracker the next time you open Cowork.

This guide walks you through setting up the scheduled task. Should take ~5 minutes if you've already done the Day-1 setup with the **ICP Lead Generation Assistant** skill (the paired skill `chatrevenue-icp-lead-gen`); ~30 minutes if you're starting from zero.

---

## Prerequisites

**Required:** the **ICP Lead Generation Assistant** skill must already have been used to complete Day-1 setup. Specifically, the following must exist in the rep's chosen storage location:

- `<Company>_ICP_Sales_Profile.md` — the living ICP & Sales Profile.
- `<Company>_ICP_Leads_Tracker.xlsx` (or a Google Sheet of the same name, if the rep picked Google Drive) — the leads tracker.
- A metadata block at the top of the profile recording the storage destination, the profile's path, the tracker's path, and the tracker format (xlsx vs Google Sheet).

**If the prerequisites are missing**, stop the install and tell the rep:

> "Before I can schedule the daily run, you need to do the Day-1 setup with the ICP Lead Generation Assistant skill. In a fresh Cowork chat, ask `/icp-lead-gen` (or just say *"help me find ICP-fit leads for my company"*). The skill walks you through building an ICP profile and creating a leads tracker — that takes about 20 minutes. Once it's done, come back here and re-run the install."

Do NOT create the scheduled task without these files in place — the daily run would fail every morning trying to read a non-existent profile.

**Connectors:**

- **Web search** — Cowork's built-in web search. No connector to install.
- **CRM** (optional but recommended) — HubSpot, Salesforce, or whichever CRM the rep uses. If connected, the daily run dedupes against it; if not, the run still works.
- **LinkedIn** — there's no native LinkedIn connector. If the rep shared a LinkedIn URL during Day-1 setup, the skill captured that as a research-input signal; the schedule passes it through.

---

## Step 1 — Locate the profile + tracker

Find the profile file the skill created. It lives at the path the rep picked during Day-1 setup. Most common locations:

- **Local working folder** — typically `C:\Users\<user>\Documents\` or a subfolder the rep specified.
- **OneDrive** — `C:\Users\<user>\OneDrive\` or a subfolder.
- **Google Drive** — search Drive by name; or if the rep mounted Drive locally, follow the local path.

Read `<Company>_ICP_Sales_Profile.md`. The metadata block at the top should look like:

```yaml
# (metadata block written by the chatrevenue-icp-lead-gen skill)
storage_destination: OneDrive
profile_path: C:\Users\<user>\OneDrive\ChatRevenue\Acme_ICP_Sales_Profile.md
tracker_path: C:\Users\<user>\OneDrive\ChatRevenue\Acme_ICP_Leads_Tracker.xlsx
tracker_format: xlsx
company_name: Acme Inc.
```

(Field names vary slightly depending on how the skill recorded them. Read for the rep's company name, the profile path, the tracker path, and the tracker format.)

If the metadata block is absent or malformed, ask the rep directly:

> "I found the profile but it doesn't have a metadata block I can read. Can you tell me: what's your company's name, the full path to the leads tracker, and is the tracker an Excel file or a Google Sheet?"

---

## Step 2 — Confirm the schedule with the rep

Default cadence is **weekdays at 7:00 AM in the rep's local timezone**. Confirm with the rep before creating the task:

> "I'll schedule the daily run for **7:00 AM on weekdays** in your local timezone (Mon–Fri). You'll get a notification when 3 fresh leads land in the tracker — nothing for you to do until you're ready to action them. Want a different time or frequency? Some reps prefer end-of-day so leads are ready first thing tomorrow; others want it 7-day."

Adjust based on the answer:

- **Time** — translate to the rep's IANA timezone (e.g., `Europe/Kyiv`, `America/Los_Angeles`).
- **Days** — default Mon–Fri. If the rep wants 7-day, expand to all days.
- **Skip weekends** is the default. Don't ask "what about weekends" — just default to Mon–Fri unless the rep raises it.

---

## Step 3 — Create the Cowork scheduled task

Use Cowork's native scheduled-task primitive. Ask the user something like:

> "Creating the schedule now: daily at 7:00 AM Mon–Fri, runs the ICP lead-gen routine. OK to proceed?"

On confirmation, create the scheduled task with the following spec.

**Schedule cron** (default — adjust per Step 2):

| Setting | Value |
|---|---|
| Frequency | Weekdays (Mon–Fri) |
| Time | 7:00 AM in `<rep's local timezone>` |
| Cron | `0 7 * * 1-5` (in `<rep's local timezone>`) |

**Task body** — paste this verbatim, with placeholders filled from the metadata block in Step 1:

```
Run the daily ICP lead generation routine for <COMPANY_NAME>:

1. Read the latest ICP & Sales Profile from <PROFILE_FILE_PATH>.
2. Read the existing leads from <TRACKER_FILE_PATH> — note all names and institutions to avoid duplicates.
3. If a CRM is connected, query it for existing contacts/leads and add them to the dedupe list.
4. Search the open web (and LinkedIn signals if connected) for 3 NEW prospects matching the ICP, each scored ≥4.
5. For each lead, populate ALL tracker columns: Date Added, Lead #, Full Name, Title, Institution, Country, Department, Persona Type, Discipline Fit, Institution Size, Email (if publicly available), LinkedIn URL, Source URL, ICP Score, Why Strong Fit, Trigger Signal, Suggested Outreach Angle, Status (= "New"), Next Action.
6. Append the 3 leads to the tracker (<TRACKER_FORMAT>: <xlsx → use the xlsx skill | google_sheet → use the matching Drive/Sheets tools>). Append-only — do NOT modify or delete any existing rows.
7. Notify the user in chat:
   - One-paragraph summary listing the 3 names with title + institution + ICP score
   - Highlight the strongest of the three with a recommended first action
   - Link to the updated tracker
   - If fewer than 3 strong-fit leads were available, report honestly (e.g., "Only 2 strong fits today — saving slot for tomorrow rather than padding")
8. Do NOT send any outreach. Do NOT contact any lead in any way. Append-only.
```

Replace each `<...>` placeholder with the actual value. The `<TRACKER_FORMAT>` line should pick the right tool path based on the metadata block's `tracker_format` field — keep the alternative branch out of the final task body so the run is unambiguous.

---

## Step 4 — Run it once manually (Run now)

After the scheduled task is created, click **Run now** on it from Cowork's Scheduled sidebar.

Why: the first run prompts for tool approvals (web search, CRM connector if connected, file-system / Drive access for the tracker). Clicking Run now while the rep is at the keyboard pre-grants those approvals so future automatic 7 AM runs don't pause waiting for clicks while the rep is asleep.

Verify:

- 3 new rows appear at the bottom of the tracker.
- The chat shows a one-paragraph summary with names + ICP scores + a recommended first action.
- No outreach was sent. No existing rows were modified.

If anything fails on the first run, surface the error to the rep clearly so they can fix it (e.g., CRM auth expired, tracker file moved, web search rate limited).

---

## Step 5 — Confirm the schedule is active

Tell the rep:

> "Schedule is active. Next automatic run: **<next scheduled fire datetime>**. You can pause, edit, or delete it any time from Cowork's Scheduled sidebar. To trigger an ad-hoc run between scheduled fires, just ask me: *'find 3 leads now'*."

Then return the rep to the ChatRevenue Monitor app to click **Confirm** on the pending banner — that records the install in the app's shadow state so drift detection works on future updates.

---

## Pause / resume / edit

The rep controls the schedule via Cowork's Scheduled sidebar:

- **Pause** — stops the schedule firing. Existing tracker is untouched.
- **Resume** — picks up at the next regular fire time.
- **Edit time / cron** — the rep can shift the fire window in Cowork directly.
- **Delete** — removes the schedule entirely. Tracker file is unaffected; the rep can re-install later from Settings → Cowork → Schedules.

Ad-hoc runs (the rep asking *"find 3 leads now"* in any chat with the ICP Lead Generation Assistant skill loaded) share the same dedupe logic against the tracker + CRM, so an ad-hoc run between scheduled fires won't produce duplicates.

---

## Known limitations

| Limitation | Why | Workaround |
|---|---|---|
| Schedule can't run if Cowork isn't running at the cron moment | Cowork's scheduled tasks require the desktop app to be open | The task fires the next time Cowork starts, with a one-paragraph notification |
| No automatic outreach | By design — the assistant is a research partner, not an automation tool | The rep sends every message themselves from the tracker |
| LinkedIn scraping not allowed | Anti-pattern + ToS | The schedule uses LinkedIn URLs as research-input only, never automation |

---

## Troubleshooting

**Schedule didn't run.** Cowork wasn't running at 7 AM. Open Cowork — the run will fire shortly after.

**Run produced 0 leads.** Check:
- Web search connector / built-in is healthy (ask Cowork: *"can you search the web for 'site:example.com'?"*).
- Tracker isn't full of every prospect in the rep's market — Step 2 of the daily routine reads dedupe rows from the tracker; if every plausible lead is already there, the routine has nothing left to add.
- The ICP profile isn't too narrow (e.g., a vertical with ~20 named accounts globally where the rep has already worked them all).

**Run produced duplicates of existing tracker rows.** Either Step 2 of the daily routine couldn't read the tracker (path moved, file locked) or Step 3's CRM query failed silently. Check the run log in Cowork's Scheduled history.

**Run produced rows but they're missing columns.** The xlsx skill or Google Sheets tool wrote a partial row. Re-run the schedule manually (Run now) and watch which columns come up empty — usually it's `Email` or `Trigger Signal` (both can legitimately be blank); if it's `Full Name` or `Source URL`, the routine has a real bug — ask the rep to file an issue.

**Schedule fires but the rep wants different timing.** Edit the schedule directly in Cowork's Scheduled sidebar (no need to re-install). Or uninstall + re-install from the ChatRevenue Monitor app — the install playbook will ask the new timing.

---

## Questions

If something doesn't work, tell the rep to ask Cowork directly: *"My daily ICP lead-gen task isn't working — help me debug."* The skill (`chatrevenue-icp-lead-gen`) knows the runtime shape and can walk them through diagnosis.
