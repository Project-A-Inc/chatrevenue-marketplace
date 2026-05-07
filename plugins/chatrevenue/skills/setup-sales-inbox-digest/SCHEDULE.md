---
name: sales-inbox-digest
display: Daily Inbox Digest
description: Morning ritual for sales ICs — categorizes inbox across all Outlook folders, surfaces unresponded items, drafts replies for clients/partners with CRM and notes context.
---

# Daily Inbox Digest — Setup Guide

A morning ritual for sales individual contributors. Each day at your chosen hour, Claude scans your Outlook inbox across all folders, categorizes mail by your priority hierarchy, surfaces unresponded items, and drafts replies for clients and partners — using context from your CRM and notes tools.

This guide walks you through setting it up from scratch in Cowork. Should take ~15 minutes.

---

## What you'll get

- One Markdown digest file per day in a folder of your choosing
- Zero or more draft reply files per day (clients/partners only)
- Aging tags on items that have been waiting more than 2 days
- Cross-reference against your Sent Items so already-replied threads aren't flagged again

---

## Prerequisites

**Required connectors in Cowork:**

- **Microsoft 365** (Outlook + Teams) — for reading mail, calendar, and chat

**Pick one CRM:**

- **HubSpot**, or
- **Salesforce**

**Optional notes/docs (any combination):**

- Notion
- Confluence (Atlassian Rovo)
- Google Docs / Drive
- OneNote
- SharePoint / OneDrive (already covered if you have M365 connected)

If you don't have a CRM connected, the workflow still runs — drafts will just have less context.

---

## Step 1 — Install the Microsoft 365 connector

This is the most important connector — without it, the digest can't read your inbox or calendar. Most of you won't have it installed yet, so here's the exact path:

1. In Cowork, open the **Connectors** panel on the right side of the window. (If you don't see it, click the connectors / plug icon in the right sidebar.)
2. Click **Add connector** (or **Browse connectors**).
3. Find **Microsoft 365** in the list. The full name is "Microsoft 365 — Access your company's SharePoint, OneDrive, Outlook, and Teams directly in Claude."
4. Click **Connect**.
5. A browser window opens for Microsoft sign-in. Sign in with your work Microsoft account (the same one you use for Outlook).
6. Approve the permission scopes Microsoft asks for. The connector needs read access to mail, calendar, files, and chats.
7. After approval, you'll be redirected back to Cowork. The connector card now shows a green "Connected" status.

**Verify it works.** Ask Cowork: **"What's the next meeting on my calendar?"** If it returns a real meeting, you're set.

If you don't see Microsoft 365 in the connectors list, ask your IT admin — some organizations restrict which Cowork connectors employees can install.

---

## Step 2 — Connect your CRM and notes tools

Now connect the rest of your stack the same way:

- Open the Connectors panel → Add connector → find each tool below → click Connect → sign in.

**Pick one CRM:**

- **HubSpot** — full name "HubSpot — Chat with your CRM data to get personalized insights"
- **Salesforce** — search for "Salesforce" in the connectors list

**Optional notes/docs (any combination):**

- **Notion** — full name "Notion — Connect your Notion workspace to search, update, and power workflows across tools"
- **Atlassian Rovo** (for Confluence) — full name "Atlassian Rovo — Access Jira & Confluence from Claude"
- **Google Drive / Docs** — search for "Google"
- **OneNote** — typically already covered by Microsoft 365 above

When you're done, ask Cowork: **"What connectors do I have?"** to verify everything you need is there.

---

## Step 3 — Pick a workspace folder

Choose where digests and draft files will be saved. Recommendations:

- A subfolder of OneDrive so it syncs across devices
- A new folder named something like `Inbox Digest` or `Morning Briefing`

Tell Cowork the folder path. Example: `C:\Users\<you>\OneDrive\Inbox Digest`

The structure inside will look like:

```
Inbox Digest/
  2026-04-29/
    digest.md
    2026-04-29_09-15_acme-corp_pricing-question.md
    2026-04-29_11-30_john-smith_demo-followup.md
  2026-04-30/
    digest.md
    ...
```

---

## Step 4 — Gather your personal config values

Before scheduling, collect the following. You'll paste them into the prompt in the next step.

| Field | What to put |
|---|---|
| Your email | Your work email |
| Your timezone | e.g., `Europe/Kyiv` |
| Your CRM | `HubSpot` or `Salesforce` |
| Your CRM owner ID | HubSpot: ask Cowork "What's my HubSpot owner ID?" — Salesforce: your User ID, found in your Salesforce profile URL |
| Your notes tools | Comma-separated list, e.g., `Notion, Confluence` |
| Your manager emails | Comma-separated, e.g., `boss@company.com, ceo@company.com` |
| Default draft language | `Match the original email` (recommended) or `Always English` or another language |
| Warm-tone contacts | Comma-separated emails or domains where drafts should be warmer/more personal. Optional. |
| Delivery time | When you want digests, e.g., `09:00 Europe/Kyiv` |
| Aging threshold | How many days before flagging unresponded items as 🟡 Waiting. Default `2` |

---

## Step 5 — Create the scheduled task

In Cowork, ask: **"Create a scheduled task to run my daily inbox digest at 9 AM every weekday"** (adjust time/days to taste).

When Cowork asks for the task prompt, paste the template below. Replace every `<...>` placeholder with your config values from Step 4.

### Prompt template

```
Daily task: build an inbox digest for <YOUR_NAME> (<YOUR_EMAIL>). Scope: ALL FOLDERS (Inbox + custom + Archive), last 24 hours of received mail + any unresponded human emails from the last 7 days.

OUTPUT LANGUAGE: English (instructions, summaries, metadata). Drafts themselves follow language rules in step 6.

# Procedure

## 1. Pull emails — ALL FOLDERS
CRITICAL: I file emails into custom folders. Do NOT restrict to Inbox.
- Last 24h: outlook_email_search with recipient="<YOUR_EMAIL>", afterDateTime=yesterday 09:00 <YOUR_TZ>. OMIT folderName parameter — that triggers the global all-folders search path.
- Last 7d (separate pass): same global query, broader date range, for unresponded-detection.

## 2. Categorize per my hierarchy
1. Clients/Partners — external domains (not my company).
2. Managers — <MANAGER_EMAILS> and any other obvious C-level / line manager.
3. Action Required — explicit asks, approvals, clarifications addressed to me.
4. Internal — same-company colleagues. ONLY surface those with a question, request, or @mention for me. Skip pure FYI.

Separate Automated (noreply) section — only show ones requiring real action; bury rest as "noise count".

## 3. CRITICAL: "Already replied" check
Before flagging any human-sent email as unresponded or generating a draft:
a) Read incoming email's conversationId.
b) Run outlook_email_search with sender="<YOUR_EMAIL>", recipient=that contact, afterDateTime=date of incoming. Omit folderName.
c) If any reply found in same conversation → mark "✅ You replied [date]" with link, DO NOT generate draft.
d) Only if nothing found → proceed as unresponded.

## 4. Aging flag
For any human-sent email older than <AGING_THRESHOLD> calendar days AND unresponded, add tag: 🟡 Waiting N days. Show even for FYI/no-ask items.

## 5. Pull context (only for unresponded clients/partners)
- CRM: <YOUR_CRM> — search contacts/companies/deals; pull stage, history, recent activities.
- Notes: <YOUR_NOTES_TOOLS> — query meeting notes for that contact.
- Outlook: read full thread, summarize history briefly.
- Calendar: any meetings with this contact, recency.
- SharePoint/OneDrive: internal docs if asked about product/pricing.
- Attachments: read for clients/partners; mention for others; flag legal/contracts separately.

## 6. Generate the digest as .md
Path: <WORKSPACE_FOLDER>/YYYY-MM-DD/digest.md (date in <YOUR_TZ>).

STYLE: tight, less busy, semantic emojis only (✅ replied, 🆕 new, 🟡 waiting, ⭐ priority, 📅 calendar). One line per email + ↳ short summary. No big stats tables.

Layout:
# 📬 Inbox Digest — Day, MMM DD, YYYY · HH:MM <TZ>
**Window:** last 24h + 7d unresponded sweep
**Volume:** N items · X partners · Y managers · Z internal-action · W noise

## 🟥 Clients & Partners
**Name** — Company · Date HH:MM · ✅ replied / 🟡 Waiting N days / 🆕 needs reply
↳ One-line summary. [Open](outlook-link)

## 🟧 Managers
(same format)

## 🟨 Action Required
(or "None.")

## 🟩 Internal (only items with action for me)
(or "None this week.")

## 🤖 Automated
"Filtered out as noise: <counts>"

## 📅 Today's Calendar
HH:MM–HH:MM Title · Location · Key attendees

## ✅ Today's Action List
1. ⭐ Top priority items
2. ...
📎 Outlook drafts & email-self-send not yet available — copy from files manually.

## 7. Drafts — clients/partners only, only when unresponded
File: <WORKSPACE_FOLDER>/YYYY-MM-DD/YYYY-MM-DD_HH-MM_company-or-name_subject-slug.md

Language:
- Default: <DEFAULT_LANGUAGE>.
- Override: for warm-tone contacts <WARM_CONTACTS> or contacts with non-Latin script names, use the language they communicate in (even if they wrote in English this time).

Tone: short, direct, friendly. For warm contacts: warmer, with 🙂. Mirror my style learned from my last 30 sent emails.

If context insufficient → DO NOT draft. Mark "⚠️ Needs my attention — insufficient context" with what's missing.

Red lines: no pricing/discounts, no legal/commercial commitments without explicit go-ahead.

Draft file structure: context block, original email link, the draft, tone notes.

## 8. Calendar invites — just mention in digest, no analysis or drafts.

## 9. Environment limits (mention briefly at end of digest)
- Cannot create Outlook drafts (read-only MS365 connector).
- Cannot self-send digest as email.
- Footer: "📎 Outlook drafts & email-self-send not yet available — copy from files manually."

## 10. Wrap-up
Confirm files written. Reply with brief summary: # processed (across all folders), # already-replied, # waiting >threshold, # drafts generated, top item needing attention.

# Profile / IDs
- My email: <YOUR_EMAIL>
- My CRM: <YOUR_CRM> (owner ID: <YOUR_CRM_OWNER_ID>)
- My notes tools: <YOUR_NOTES_TOOLS>
- Timezone: <YOUR_TZ>
- Aging threshold: <AGING_THRESHOLD> days
- Empty period? Write a one-line digest: "✨ Clean inbox today — nothing new in the period."
- Don't use TodoList in scheduled runs.
```

---

## Step 6 — Run it once manually

After you've created the scheduled task, click **Run now** in the Scheduled sidebar.

Why: the first run prompts for tool approvals (HubSpot/Salesforce, Outlook, etc.) on a fresh session. Clicking Run now pre-grants those approvals so future automatic runs at 9 AM don't pause waiting for clicks while you're sleeping.

Verify the digest file appears in your workspace folder.

---

## Step 7 — Daily routine

Each morning at your scheduled time:

1. Cowork runs the task in the background. You get a notification when done.
2. Open `digest.md` in your workspace folder.
3. Skim the digest top-to-bottom. Categories are color-coded with emojis.
4. For client/partner items that have draft files, click into them, edit if needed, copy the body into a new Outlook reply.
5. Mark items handled however you normally do (delete, file to a folder, mark read, etc.).

---

## Step 8 — Schedule a monthly review (optional but recommended)

After about 30 days of using the digest, you'll want to tune the prompt based on what actually works for you. Create a second scheduled task that runs once on the 30th day after setup:

Ask Cowork: **"Create a one-time task for May 29 at 10 AM to review my daily inbox digest workflow."** Use this prompt:

```
Monthly review of my daily inbox digest. Goal: assess what's working, what's not, propose adjustments.

1. List all date folders under <WORKSPACE_FOLDER>/ from the last 30 days. Confirm digest.md exists in each. Count drafts. Flag missing days.
2. Read 5-7 digest files spread across the month + 3-5 draft files.
3. For each draft: search my Sent Items for my actual reply (sender=<YOUR_EMAIL>, recipient=<contact>, after=<draft date>). Compare draft vs. real reply for tone, language, content match.
4. Detect patterns: drafts that diverged from real replies, false positives (drafts when I'd already replied), false negatives (items I had to handle that weren't in the digest), aging-tag accuracy, categorization drift, signal-to-noise.
5. Pull my last ~30 sent emails (excluding meeting invites/noreply). Identify new tone patterns, new regular contacts, language preferences per contact.
6. Save a review report to <WORKSPACE_FOLDER>/reviews/<YYYY-MM-DD>_monthly-review.md with: TL;DR, run inventory, pattern findings, voice calibration delta, proposed prompt edits (concrete diff-style), questions for me.
7. Surface TL;DR + 2-3 questions in chat. DO NOT auto-modify the daily prompt — wait for my sign-off.
```

When it runs, you'll get a notification, review the report, answer the questions, and Claude updates the daily prompt accordingly.

---

## Customization notes

The scheduled task prompt is just a Markdown text block. You can edit it any time:

- Change emojis or layout in section 6
- Add new categories to your hierarchy in section 2
- Add company-specific exceptions ("treat domain X as partner")
- Add per-contact rules for tone or language
- Adjust the aging threshold

To edit, find the task in the **Scheduled** section of the Cowork sidebar, open it, and update the prompt.

---

## Known limitations (current version)

| Limitation | Why | Workaround |
|---|---|---|
| Cannot create Outlook drafts automatically | M365 connector is read-only | Copy draft text from .md files manually into Outlook reply |
| Cannot send the digest to your email | Same | Read it from the file; or set up a Power Automate flow that watches the folder and emails new digests to you |
| Calendar invites only mentioned, not auto-accepted/declined | By design — you should decide each invite | Handle in Outlook as usual |

When the M365 connector gains write capability (or when you set up a Power Automate flow), the first two close automatically.

---

## Troubleshooting

**Task runs but the digest is empty.** Check that you removed `folderName: "Inbox"` from the email-search calls in your prompt — that restricts to Inbox only. The prompt template above has this fixed.

**Task drafts replies for emails I already responded to.** The cross-reference check in step 3 isn't being followed. Re-paste the prompt from this guide.

**Task says "no context" for every client.** Your CRM connector might not be connected, or the contact isn't in your CRM. Add the contact in your CRM, or connect the CRM if you haven't.

**Task didn't run at the scheduled time.** Cowork must be running at the cron moment. If your laptop was closed, the task fires the next time you open Cowork. To run on closed days, you'd need a server-side scheduler (out of scope for v1).

**Task pauses asking for permissions every morning.** Click **Run now** once after creating it — that pre-grants all connector approvals so future runs proceed without interruption.

---

## Questions

If something doesn't work, ping the colleague who shared this with you. Or ask Cowork directly: **"My daily digest task isn't working — help me debug."**
