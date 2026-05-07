# chatrevenue

ChatRevenue skills bundle for sales reps. Installs three skills into Cowork via the marketplace mechanism — alternative to the per-skill install flow inside the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) (Settings → Cowork → Skills).

## What you get

| Skill | What it does | Standalone? |
|---|---|---|
| `chatrevenue-memory` | Reads your local screen-memory store (last few weeks of screenshot-derived markdown memories), answers "what was I doing", "prep me for X", "find when I mentioned Y", end-of-day summaries. | **No** — needs the ChatRevenue Monitor app running so the `chatrevenue-memory` MCP server is registered in Cowork. |
| `chatrevenue-help-with-current-activity` | Watcher-fired incident handoff. The Monitor app's daemon detects "helpable" foreground activities (writing email, reviewing PRs, …) and fires a Windows toast that opens Cowork at `/chatrevenue-help-with-current-activity <incident-id>`. This skill resolves the incident, reads the live screen, and produces 2–3 specific next-action suggestions. | **No** — needs the Monitor app running for both the MCP server (incident lookup) and the watcher (toast firing). |
| `chatrevenue-icp-lead-gen` | Sales research partner. Day-1 conversational onboarding (interview the rep, build an ICP profile, save a leads tracker), daily/ad-hoc lead discovery, handoff briefs, tracker status sync. | **Yes** — uses Cowork's built-in web search + standard Cowork connectors (Outlook for the paired daily-run schedule, optional CRM). No dependency on the Monitor app or its MCP server. |

## Install

1. In Cowork: Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted (Cowork uses GitHub OAuth to fetch repos).
4. Find **chatrevenue** in the marketplace listing → **Install**.
5. Restart Cowork so the new skills load.

## Pairing with the desktop app

If you want `chatrevenue-memory` and `chatrevenue-help-with-current-activity` to actually do anything, install the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) (Windows). It runs the local screen-capture pipeline + the `chatrevenue-memory` MCP server that Cowork talks to.

The app and this marketplace plugin are **two ways to install the same skill files** — the app's per-skill install flow does it via Cowork's `skill-creator` deep-link handoff; the marketplace does it via Cowork's plugin fetcher. Either path works; pick whichever fits your workflow. If you use both, you may end up with duplicate skills in Cowork — uninstall one path before adopting the other.

`chatrevenue-icp-lead-gen` does NOT need the desktop app. It pairs with a separate Cowork scheduled task (`icp-lead-gen-daily`) that the desktop app installs from Settings → Cowork → Schedules; the schedule is independent of this plugin and not distributable through marketplaces.

## Source

Part of the [chatrevenue-marketplace](https://github.com/Project-A-Inc/chatrevenue-marketplace).

The skill files are mirrored from the desktop app's `desktop/resources/skills/` directory — kept in sync manually at release time. If you want the latest version, install from this marketplace and re-pull periodically (Cowork → Customize → marketplace → refresh).
