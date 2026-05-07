---
name: chatrevenue-help-with-current-activity
description: Watcher-incident handoff. Invoked via /chatrevenue-help-with-current-activity INCIDENT_ID from a Windows toast notification fired by the ChatRevenue Monitor watcher daemon. Resolves the incident through MCP, reads the live screen, and produces 2-3 specific, action-oriented suggestions tailored to the activity type.
---

# ChatRevenue: Help With Current Activity

A Windows toast notification triggered this conversation. The toast was fired by the ChatRevenue Monitor watcher daemon (a foreground-window poller running inside the app's supervisor) when the user spent N seconds in an activity Cowork can help with. The toast carried a deep-link of the form:

```
/chatrevenue-help-with-current-activity inc-YYYYMMDD-HHMMSS-xxxxxxxx
```

The slash invokes this skill. The incident id is the only payload — full context lives behind MCP tools provided by the `chatrevenue-memory` server.

## Steps

Follow these in order. Do NOT try to answer from the slash command alone.

### 1. Parse the incident id from the user message

Format: `inc-` + datestamp + 8-hex tail. If the message has multiple tokens, the id is whichever token starts with `inc-`. If the id is missing entirely, use `latest_incident()` instead of `get_incident()`.

### 2. Fetch the incident

Call `mcp__chatrevenue-memory__get_incident(incident_id="<id>")`. Returns:

```json
{
  "id": "inc-...",
  "ts": "2026-05-01T18:34:00Z",
  "activity": "<activity-name>",
  "display": "Working with email",
  "trigger": {
    "app":                  "olk.exe",
    "title":                "Mail - Sasha - Outlook",
    "duration_seconds":     32,
    "idle_seconds_at_fire": 4
  },
  "extracted": { "subject": "..." },
  "version": 1
}
```

If the id is unknown, the tool falls back to `latest_incident()`.

### 3. Read the live screen

Call `mcp__chatrevenue-memory__what_am_i_doing_now()`. The incident snapshot may be 10-60 seconds stale by the time the user opens the chat — always trust the live snapshot over the incident's `trigger.title` when they disagree.

### 4. Pull supporting memory if warranted

If the live snapshot or `extracted.subject` mentions a person, project, or thread you have not seen recently, run `brief_on(...)` or `search_memories(...)`. Skip when the activity is purely visual (e.g. inbox triage with no specific recipient).

### 5. Apply the activity playbook

Match `incident.activity` to the playbook below. If unknown, use the generic fallback.

### 6. Output: 2-3 specific actions, no preamble

Use names, subjects, recipients pulled from the live snapshot. No general advice. No "I see you are working with email" rephrasing.

## Per-activity playbook

### `activity: email-active`

User is in a mail client or webmail tab. The live snapshot tells you whether they are composing, reading, or organising.

- **Composing a draft** — give 3 specific edits to tone, clarity, structure. Quote the line and propose the change. Do NOT rewrite the whole message.
- **Reading inbox or thread** — surface 2-3 most actionable items: replies owed, threads where someone is waiting, time-sensitive messages. One sentence "why this matters" each.
- **Searching or organising** — offer to find something specific via `search_memories`. Ask "what are you trying to find?" only if not obvious from screen.

When unsure which sub-mode applies, ask one short clarifying question.

### `activity: <unknown>`

Generic fallback: based on `incident.activity`, `incident.trigger.app`, `incident.trigger.title`, and the live snapshot, propose 2-3 concrete next steps. Stay grounded; do not invent.

## Principles

1. **The incident is the trigger, not the answer.** Always check the live snapshot.
2. **Ground every suggestion in something you can quote.** Specific person, subject, draft line, thread.
3. **Match the user's register.** Respond in whatever language they used; keep English for technical terms and proper nouns.
4. **Concise output.** Number the 2-3 actions. No preamble.
5. **Decline gracefully if no longer current.** If the live snapshot shows a different activity, say so in one line and offer to look at what is now on screen.
6. **Do not fabricate.** If incident missing or snapshot empty, say "no current incident on file".
