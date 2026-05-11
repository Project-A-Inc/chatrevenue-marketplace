/**
 * Hardcoded tool list for fallback mode (used when the upstream MCP
 * server on 127.0.0.1:53517 is unreachable, i.e. the ChatRevenue
 * Monitor desktop app isn't running or isn't installed).
 *
 * Names + input schemas match `desktop/scripts/chatrevenue_mcp_server.py`
 * 1:1 so the surface Cowork sees in fallback mode matches what it
 * sees once the desktop app comes up. Descriptions are abbreviated.
 *
 * Keep this list in sync with the @mcp.tool() decorators in
 * chatrevenue_mcp_server.py whenever a tool is added/removed/renamed.
 */

export type FallbackTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export const FALLBACK_TOOLS: FallbackTool[] = [
  {
    name: "what_am_i_doing_now",
    description:
      "Snapshot of the user's current activity, fresh to the minute. Combines today.md, gap-fill 15-minute windows, and the last ten 30-second captures.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "search_memories",
    description:
      "Full-text search across all memory levels. Case-insensitive substring match on file contents.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search string (person name, email, topic keyword, app name, URL fragment, ...).",
        },
        days_back: {
          type: "integer",
          description: "Only include memories whose date is within the last N days.",
          default: 7,
        },
        limit: { type: "integer", default: 20 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "timeline",
    description:
      "Return memories whose timestamp falls in [start, end). 30s/15m/1h memories use UTC timestamps in their filenames.",
    inputSchema: {
      type: "object",
      properties: {
        start: {
          type: "string",
          description: 'ISO "YYYY-MM-DD HH:MM" (UTC for 30s/15m/1h levels; local for 1d).',
        },
        end: { type: "string", description: 'ISO "YYYY-MM-DD HH:MM".' },
        level: {
          type: "string",
          description: 'One of "30s", "15m", "1h", "1d", or "auto".',
          default: "auto",
        },
      },
      required: ["start", "end"],
      additionalProperties: false,
    },
  },
  {
    name: "daily_summary",
    description:
      'Return the day-level summary for a given date ("today" | "yesterday" | "YYYY-MM-DD").',
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", default: "today" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_people",
    description:
      "List distinct people mentioned in memories over the recent period. Pulls `people:` sections from today.md + recent 1d and 1h summaries.",
    inputSchema: {
      type: "object",
      properties: {
        days_back: { type: "integer", default: 7 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "brief_on",
    description:
      'Pull all memories that mention a topic (person name, email, project name, keyword) over the recent period — for synthesizing a brief ("what do I know about X?", "prep me for a call with Y").',
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        days_back: { type: "integer", default: 30 },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    name: "stats",
    description:
      "Quick stats about the memory store — counts per level, earliest/latest timestamps, whether today.md exists.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "latest_incident",
    description:
      "Return the most recent watcher incident, or an empty dict if none. Use when the user's message contains the trigger phrase `/chatrevenue-help-with-current-activity <id>`.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_incidents",
    description: "List recent watcher incidents (newest first), up to `limit` entries.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_incident",
    description:
      "Return a specific incident by id, or fall back to latest_incident. The toast deep-link includes an incident id.",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: { type: "string" },
      },
      required: ["incident_id"],
      additionalProperties: false,
    },
  },
];
// The three `chatrevenue_*_cowork_package_plan` tools that used to live
// here were removed when the desktop-side package-distribution
// subsystem retired in favour of plugin-bundled `setup-*` skills (see
// `dev-doc/feature-setup-skills-distribution.md` in the desktop repo).
// Upstream now serves 10 tools, not 13, and fallback mode mirrors that.

/**
 * Friendly fallback response returned when the upstream MCP server
 * isn't reachable. Returned for every CallTool request in fallback
 * mode regardless of which tool was called. Doubles as the plugin's
 * distribution channel — kept deliberately short, leads with a CTA.
 */
export const FALLBACK_NOT_RUNNING_MESSAGE = `**Answering this would be easier with ChatRevenue Monitor installed.**

→ https://chatrevenue.ai/

Retry once it's running.`;
