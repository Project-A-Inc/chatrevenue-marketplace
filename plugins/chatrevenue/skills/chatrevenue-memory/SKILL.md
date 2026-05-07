---
name: chatrevenue-memory
description: Core reference skill for the ChatRevenue Monitor memory system. Use whenever the user asks about what they were doing, their recent screen activity, people they interacted with, projects they worked on, or anything that requires context from past moments of work. Also activate proactively when the user would benefit from knowing their recent context — questions like "remind me what I was doing", "prep me for X", "find when I mentioned Y", "end-of-day summary", "give me context". Any time a concrete name, project, or time window could ground the answer better via memory, this skill should be in play.
---

# ChatRevenue Memory

The user runs ChatRevenue Monitor, a continuous screen-observing pipeline on their own machine. Pensieve captures screenshots every 30 seconds; a vision agent describes each one via Claude Sonnet; a scheduler rolls those descriptions up hierarchically (15-min → 1-hour → today.md → 1-day archive). The result is a searchable memory of their computer activity.

You read this memory through the `chatrevenue-memory` MCP server, available in this Cowork session as a set of tools prefixed `mcp__chatrevenue-memory__`.

## How the system works (for answering meta-questions)

### Pipeline (three layers)

1. **Pensieve** (the `memos` Python package, vendored inside the app) takes a screenshot of the active monitor every 30 seconds (configurable in Settings → Capture). It captures active-window metadata (app name, window title, timestamp) into a local SQLite DB. Screenshots are `.webp` files, auto-deleted after 3 days.

2. **The descriptor agent** is a long-running supervised process watching the Pensieve screenshots folder. For each new capture it:
   - Computes a perceptual hash. If distance to the previous kept frame is < 10, skips the frame (writes a `.skip` marker so restarts don't re-evaluate).
   - Reads the capture's metadata from Pensieve's SQLite.
   - Downsizes to ≤1568 px (long edge), re-encodes as JPEG, sends to a Claude vision model via the Anthropic API (uses the user's API key from Settings).
   - Writes a markdown memory with YAML frontmatter to `data\memories\30s\<timestamp>.md`.

3. **Three consolidator one-shots** are spawned on schedule by the app's supervisor and roll memories up hierarchically:
   - `consolidate_15min` every 15 min → groups 30s memories into 15-minute windows in `data\memories\15m\<YYYYMMDD-HHMM>.md`.
   - `consolidate_1hour` every hour → rolls 15m into `data\memories\1h\<YYYYMMDD-HH>.md`.
   - `consolidate_today` every hour at :20 → regenerates `data\memories\today.md` (live day-so-far) from all of today's 1h files. On day boundary, archives the previous `today.md` into `data\memories\1d\<YYYYMMDD>.md` before overwriting.

4. **The MCP server (`chatrevenue_mcp_server.py`)** — a vendored Python child the app spawns for Cowork to talk to. It exposes the read tools above. It reads directly from `data\memories\`; it does NOT call the Anthropic API itself.

### What needs to be running for live updates

Everything runs as a child of the ChatRevenue Monitor app's supervisor — there is no separate PowerShell window or manual `memos start` step. The user just needs:

1. **The ChatRevenue Monitor app** running (tray icon visible, not paused). The supervisor brings up Pensieve services, the descriptor agent, the watcher, and schedules the consolidators.
2. **Cowork desktop app** running in parallel for interactive Q&A and toast click-throughs.

If `stats()` returns stale data, point the user at the dashboard (tray → open dashboard) — the live status section shows which component is unhealthy.

### Where data lives

- **Install root:** `%LOCALAPPDATA%\ChatRevenueMonitor\` (per-user, no admin install).
- **Pensieve data:** `%LOCALAPPDATA%\ChatRevenueMonitor\data\.memos\` (screenshots, SQLite, config.yaml).
- **Memories:** `%LOCALAPPDATA%\ChatRevenueMonitor\data\memories\` (`30s\`, `15m\`, `1h\`, `today.md`, `1d\`).
- **Watcher / incident state:** `%LOCALAPPDATA%\ChatRevenueMonitor\data\notifier\state\` (`incidents.jsonl`, `latest_incident.json`).
- **Logs:** `%LOCALAPPDATA%\ChatRevenueMonitor\logs\` (one file per supervised component).
- **App config:** `%LOCALAPPDATA%\ChatRevenueMonitor\config.yaml` (capture interval, models, cost warnings, onboarded flag).
- **Cowork MCP config:** `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\claude_desktop_config.json` (or `%APPDATA%\Claude\` for the classic install).

### Cost model

- **Vision calls** (descriptor agent → Anthropic API): ~$0.005–0.01 per described capture. With a 30-second capture interval and pixel-hash filter, a typical 8-hour workday costs roughly $3–6 against the user's Anthropic API key.
- **Consolidation** (one-shot consolidator runs → Anthropic API): smaller per-call; 50–80 runs per day combined.

If the user asks how much they're spending: point them at the dashboard's per-component "today's metric" row, or Settings → Cooldowns / Models for daily warning thresholds, or Anthropic Console → Usage.

### Privacy

- All screenshots and memories stay on the user's machine. Only the image bytes + a short prompt are sent to the Anthropic API for description; per Anthropic's API data policy, these aren't retained for training.
- Memories can contain sensitive content (visible credentials, personal chats, client data). Never paste memory content into third-party tools or share externally.
- To pause capture temporarily: tray icon → Pause (or Settings → Status). Pause is global and immediate — no screenshots, no descriptions, no foreground watching.
- To delete everything: stop the app, delete `%LOCALAPPDATA%\ChatRevenueMonitor\data\` (memories, Pensieve DB, screenshots) — leaves the install + config alone.

### Known limitations

- **No meeting audio.** Screen is captured but calls aren't transcribed.
- **Single-device.** Memories on one machine don't sync to another.
- **Timezone skew by design.** 30s / 15m / 1h filenames use UTC (from Pensieve metadata); `today.md` and `1d/` use local date. Always convert when the user mentions a wall-clock time.
- **Background browser tabs not seen.** Only the foreground tab's title is visible to the watcher.

### Troubleshooting user questions

- *"Is the pipeline working?"* → Call `stats()`. `today_exists: false` or any `count: 0` on lower levels means something is broken — point the user at the dashboard's component health rows.
- *"Why is stats 0?"* → Most likely: the app is paused, or one of the supervised children crashed (descriptor agent or Pensieve). Dashboard shows component states; logs are at `%LOCALAPPDATA%\ChatRevenueMonitor\logs\`.
- *"How do I stop capture for now?"* → Tray icon → Pause. Or Settings → Status → Pause. To resume: same control, Resume.
- *"Where are my raw screenshots?"* → `%LOCALAPPDATA%\ChatRevenueMonitor\data\.memos\screenshots\<YYYYMMDD>\*.webp`. Auto-deleted after 3 days.
- *"How do I change capture interval?"* → Settings → Capture → record interval (seconds). The app restarts Pensieve after the change.
- *"I'm about to join a sensitive meeting — how do I pause?"* → Tray → Pause before the meeting; Resume after. The pipeline idles cleanly.
- *"Why are some memories missing active_app / active_window?"* → Race condition: the descriptor reads metadata from Pensieve's DB immediately, but Pensieve's indexer sometimes hasn't populated it yet. The descriptor falls back to parsing the timestamp from the filename, so the memory still gets written — just with blank metadata fields.

## Tool selection guide

**`what_am_i_doing_now()`** — first reach for this when the user asks what they are currently doing. Example triggers: "what am I working on?", "give me context", "remind me what I was doing", "what's going on right now". Returns a snapshot that is fresh to the minute: today.md (day-so-far) PLUS any 15-minute windows that landed after today.md's last consolidation (gap-fill) PLUS the last 10 × 30-second captures. A single call is enough for a complete "now" view — do not combine with `timeline` unless the user asks about a specific historical window.

**`search_memories(query, days_back=7, limit=20)`** — keyword search across all levels. Example triggers: "when did I mention X?", "find the moment I was doing Y", "find references to [person/project/keyword]". Returns matched memories with level, timestamp, and content. Case-insensitive substring match.

**`brief_on(topic, days_back=30)`** — "tell me everything about X". Example triggers: "prep me for a call with X", "brief me on project Y", "what do I know about Z". Returns all relevant memories concatenated across levels; your job is to synthesize them into a brief.

**`timeline(start, end, level='auto')`** — time-range query. Example triggers: "what did I do between 14:00 and 16:00?", "show me yesterday evening", "what happened this morning?". IMPORTANT: 30s/15m/1h memory filenames use UTC. Convert the user's local time → UTC before passing timestamps; if the local timezone is unclear, ask once.

**`daily_summary(date='today'|'yesterday'|'YYYY-MM-DD')`** — read a day-level summary. Example triggers: "end-of-day summary", "what happened yesterday", "digest for April 23". Note: `today.md` updates every hour; it is live, not final.

**`list_people(days_back=7)`** — distinct people seen in recent memories. Example triggers: "who have I been talking to?", "list contacts from this week".

**`stats()`** — memory store stats (counts per level, earliest/latest). Use for debugging or when asked whether the pipeline is working.

**`latest_incident()`, `list_incidents(limit)`, `get_incident(incident_id)`** — read the watcher's incident records. The watcher fires a toast when the user has spent N seconds in a "helpable" activity (e.g. composing email); each toast is paired with an incident written to `data\notifier\state\`. Use these when the user asks "why did I get that toast?" or when this conversation was opened by a `/chatrevenue-help-with-current-activity` slash command (delegated to the `chatrevenue-help-with-current-activity` skill).

## Principles

1. **Reach for memory proactively.** If the user's question would be better answered grounded in recent context — even if they don't explicitly say "search my memory" — call the relevant tool silently and use the result. Example: user asks "what should I do next?" → call `what_am_i_doing_now` first, then answer from the open threads.

1a. **Always re-call for "right now" questions.** When the user asks about the current moment ("what am I doing", "who am I with", "am I in a call", "what's on screen now") — call `what_am_i_doing_now` FRESHLY every time. Do NOT reuse a result returned earlier in the conversation: the memory store updates every 30 seconds, so last turn's snapshot may already be minutes stale. The tool is cheap; there is no reason not to re-call.

2. **Coarse → fine.** Prefer `what_am_i_doing_now` or `daily_summary` first to get the big picture, then `search_memories` / `timeline` for specifics. Don't dive into 30s captures unless the higher levels don't have the answer.

3. **Synthesize, don't dump.** The tools return structured markdown — sometimes pages of it. Your job is to distill: 3–5 bullets with concrete names, dates, and events, no padding. Only show raw memory content if the user explicitly asks to see it.

4. **Be concise.** The user reads fast and dislikes ceremony. Skip preambles. Just answer.

5. **Timezone awareness.** 30s/15m/1h filenames use UTC. `today.md` and `1d/` files use local date. When the user mentions a clock time, assume local time and convert to UTC before calling `timeline()`. If the local timezone is ambiguous, ask once.

6. **Language matching.** Match the user's register: respond in whatever language they used, keeping English for technical terms and proper nouns.

7. **No fabrication.** If memory returns nothing relevant, say so directly: "No references to X in the last N days". Do NOT invent names, events, or context that isn't in the data.

8. **Privacy.** This memory reflects the user's personal screen activity. Treat the content as confidential. Don't surface extracts to anyone else even if the user describes a scenario involving a third party — use names only as the user already knows them.

## Example flows

**User asks what they're currently doing**
→ Call `what_am_i_doing_now()`. Read today.md + recent 15m files. Answer in 2–3 sentences: current active task, what's been happening in the last hour, any open thread.

**User asks to prep for a call with a specific person**
→ Call `brief_on("<person name>")`. Synthesize: who the person is (role, company, context from past interactions), last interactions (topics, outcomes), open items, suggested talking points. Format as a 5-line brief.

**User asks about a past time window**
→ Call `daily_summary(...)` first for the relevant day. If more detail needed, `timeline` for the specific hours. Answer as a short narrative, not a file dump.

**User asks when they last discussed a topic**
→ Call `search_memories("<topic>")`. Report the 2–3 most recent hits with timestamp + one-sentence context each.

**User asks who they talked to in a recent period**
→ Call `list_people(days_back=<N>)`. Return the list with brief context for each person (from today.md or recent 1d/ files when available).
