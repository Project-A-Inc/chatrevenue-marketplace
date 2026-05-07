---
name: calendar-analysis
display: "Calendar analysis vs SaaS benchmark"
description: >-
  Interactive HTML dashboard that pulls the user's last 4–12 weeks of Outlook
  calendar events plus a year of history, classifies each meeting (customer-
  facing / prospecting / internal / admin / training / focus / PTO),
  compares the breakdown against published SaaS Sales IC benchmarks
  (Salesforce State of Sales, HubSpot, Pavilion), and surfaces seasonality,
  YoY shifts, peak/lightest days, and concrete recommendations. Calls the
  user's Outlook calendar-search MCP tool at runtime.
attachments:
  - template.html
---

# Calendar analysis vs SaaS benchmark — install playbook

You are helping the user install a Cowork **native artifact** that turns
their Outlook calendar into an interactive dashboard. The artifact reads
calendar events through the user's already-installed Outlook MCP tool
and renders them as KPIs + charts + benchmark comparisons in the
artifact viewport.

The companion file `template.html` (above, served alongside this
ARTIFACT.md by the MCP plan tool) is the dashboard itself — 655 lines
of HTML + Chart.js. It contains three string placeholders that you must
substitute **before** creating the artifact, because the artifact runs
in a sandbox and cannot read environment / session state on its own.

## Step 1 — Identify the three placeholders

Open the attached `template.html` and locate these three literals near
the top of the inline `<script>` block:

```
const USER_EMAIL        = '{{USER_EMAIL}}';
const USER_DOMAIN       = '{{USER_DOMAIN}}';
const OUTLOOK_TOOL_NAME = '{{OUTLOOK_TOOL_NAME}}';
```

All three need real values before the artifact is created. They cannot
be edited later from inside the artifact UI — the user would have to
re-install. So get them right on first creation.

## Step 2 — Resolve `{{USER_EMAIL}}`

Use the email shown for the current Cowork session (the one Cowork
identifies the user by). If multiple emails appear in your context,
pick the primary one. **Format:** `firstname.lastname@company.com`
(or whatever the user's actual address is). Do not put it in quotes —
the placeholder is already inside single quotes in the template.

## Step 3 — Resolve `{{USER_DOMAIN}}`

This domain is used at runtime to detect external attendees on calendar
events (anyone whose email does NOT contain this domain is classified
as external, which feeds into the "customer-facing" categorisation
heuristic).

**Default:** the part of the user's email after `@` (e.g. `company.com`
from `jane.doe@company.com`).

**Ask the user to confirm or override** if any of these apply:

- The user's primary work email is on a personal domain (Gmail,
  Outlook.com, …) and their real company domain differs.
- The company uses multiple domains and the user wants a specific one
  for the "external attendee" check.

Phrase the question as: *"Detected your company domain as `<X>` from
your email. Confirm, or paste the domain you want me to use to
classify external attendees?"*

## Step 4 — Resolve `{{OUTLOOK_TOOL_NAME}}`

The artifact calls `window.cowork.callMcpTool(OUTLOOK_TOOL_NAME, ...)`
at runtime to fetch calendar events. The placeholder must be the
**fully-qualified MCP tool name** for the user's Outlook calendar
search, typically of the form
`mcp__<server-id>__outlook_calendar_search`.

To find it: list the MCP tools available in this Cowork session and
pick the one whose name contains `outlook_calendar_search` (or close —
some Outlook MCP servers use slight variations like
`outlook_email_search` for the email tool, which is the WRONG one;
make sure you pick the **calendar** search).

If the user has no Outlook MCP server installed, stop and tell them:
*"This artifact needs the Microsoft 365 / Outlook MCP connector
installed in Cowork before it can run. Install that first, then re-try
the install."* Don't create the artifact in that state — it would just
error out the first time the user opens it.

## Step 5 — Create the artifact

Create a Cowork **native artifact** with the following metadata:

- **id:** `calendar-analysis` (lowercase, kebab-case — used for
  drift detection on update)
- **mcp_tools:** declare the Outlook calendar search tool (the same
  fully-qualified name resolved in Step 4) so the artifact has
  permission to call it at runtime
- **body:** the HTML from `template.html`, with all three placeholders
  replaced verbatim (no quotes, no extra whitespace)

## Step 6 — Open + verify

After creating the artifact, open it in the user's Cowork workspace.
The dashboard should:

1. Show the user's email in the subtitle.
2. Display "Loading current period..." and start fetching events
   immediately.
3. After ~5–15 seconds (depending on calendar density) show the KPI
   row, benchmark bars, donut chart, day-of-week chart, heatmap, top
   meetings table, and insights list.

If you see "Loading..." stuck or an error like *"callMcpTool is not a
function"*, something went wrong with the artifact creation — most
likely the Outlook tool wasn't declared in `mcp_tools`. Re-create the
artifact with the correct tool name.

## After successful install

Tell the user: *"Calendar dashboard created. Return to the ChatRevenue
Monitor app and click Confirm."* The Confirm click is what graduates
this install into the app's shadow state so drift detection works on
the next update.
