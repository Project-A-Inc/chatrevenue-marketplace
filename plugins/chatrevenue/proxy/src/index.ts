/**
 * ChatRevenue Monitor MCP proxy.
 *
 * Cowork spawns this script via stdio when the chatrevenue plugin is enabled.
 * The script connects to the long-running streamable-http MCP server that the
 * ChatRevenue Monitor desktop app supervises on 127.0.0.1:53517 and forwards
 * every JSON-RPC frame through unchanged.
 *
 * Why a proxy instead of running the MCP server inline?
 *
 * - The desktop app already runs the MCP server under its supervisor with the
 *   correct env (memory store, notifier state, bundled skills, schedules,
 *   artifacts dirs). Spawning a fresh subprocess per Cowork chat would
 *   duplicate work and force every Cowork plugin to know the desktop app's
 *   install paths.
 * - Cowork's "Add custom connector" UI rejects plain http://localhost URLs.
 *   stdio bypasses that wall — Cowork happily spawns a stdio command from a
 *   plugin-bundled .mcp.json.
 * - The proxy carries no per-user paths. It only knows the loopback URL of
 *   the running supervisor. All path logic lives on the desktop side.
 *
 * Configure with `MCP_URL` env var (default http://127.0.0.1:53517/mcp).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const upstreamUrl = process.env.MCP_URL ?? "http://127.0.0.1:53517/mcp";

// stderr is the only safe channel — stdout is reserved for JSON-RPC frames.
function logErr(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error("[cr-mcp-proxy]", ...args);
}

async function main() {
  const upstream = new Client(
    { name: "cr-mcp-proxy", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await upstream.connect(
      new StreamableHTTPClientTransport(new URL(upstreamUrl)),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logErr(
      `Failed to connect to upstream MCP at ${upstreamUrl}: ${msg}.`,
      "Make sure the ChatRevenue Monitor desktop app is running.",
    );
    process.exit(1);
  }

  logErr(`Connected to upstream MCP at ${upstreamUrl}`);

  // Mirror upstream's advertised capabilities so Cowork sees the right surface.
  const caps = upstream.getServerCapabilities() ?? {};

  const local = new Server(
    { name: "chatrevenue-memory", version: "1.0.0" },
    {
      capabilities: {
        tools: caps.tools ? {} : undefined,
        resources: caps.resources ? {} : undefined,
        prompts: caps.prompts ? {} : undefined,
      },
    },
  );

  if (caps.tools) {
    local.setRequestHandler(ListToolsRequestSchema, async () =>
      upstream.listTools(),
    );
    local.setRequestHandler(CallToolRequestSchema, async (req) =>
      upstream.callTool(req.params),
    );
  }

  if (caps.resources) {
    local.setRequestHandler(ListResourcesRequestSchema, async () =>
      upstream.listResources(),
    );
    local.setRequestHandler(ListResourceTemplatesRequestSchema, async () =>
      upstream.listResourceTemplates(),
    );
    local.setRequestHandler(ReadResourceRequestSchema, async (req) =>
      upstream.readResource(req.params),
    );
  }

  if (caps.prompts) {
    local.setRequestHandler(ListPromptsRequestSchema, async () =>
      upstream.listPrompts(),
    );
    local.setRequestHandler(GetPromptRequestSchema, async (req) =>
      upstream.getPrompt(req.params),
    );
  }

  // If the upstream server goes away, exit so Cowork can respawn us.
  upstream.onclose = () => {
    logErr("Upstream connection closed; exiting.");
    process.exit(1);
  };

  await local.connect(new StdioServerTransport());

  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
}

main().catch((err) => {
  const detail =
    err instanceof Error ? (err.stack ?? err.message) : String(err);
  logErr("Fatal error:", detail);
  process.exit(1);
});
