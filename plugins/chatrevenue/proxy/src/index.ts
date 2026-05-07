/**
 * ChatRevenue Monitor MCP proxy.
 *
 * Cowork spawns this script via stdio when the chatrevenue plugin is
 * enabled. The script connects to the long-running streamable-http MCP
 * server that the ChatRevenue Monitor desktop app supervises on
 * 127.0.0.1:53517 and forwards every JSON-RPC frame through unchanged.
 *
 * Why a proxy instead of running the MCP server inline?
 *
 * - The desktop app already runs the MCP server under its supervisor
 *   with the correct env (memory store, notifier state, bundled skills,
 *   schedules, artifacts dirs). Spawning a fresh subprocess per Cowork
 *   chat would duplicate work and force every Cowork plugin to know the
 *   desktop app's install paths.
 * - Cowork's "Add custom connector" UI rejects plain http://localhost
 *   URLs. stdio bypasses that wall — Cowork happily spawns a stdio
 *   command from a plugin-bundled .mcp.json.
 * - The proxy carries no per-user paths. It only knows the loopback URL
 *   of the running supervisor. All path logic lives on the desktop side.
 *
 * Fallback mode. If the upstream HTTP server is unreachable on startup
 * (desktop app not installed or not running), the proxy does NOT exit —
 * it advertises a hardcoded copy of the upstream tool list (see
 * `fallback-tools.ts`) and returns a friendly install-the-desktop-app
 * message for every tool call. Each request also re-attempts the
 * upstream connection, so as soon as the desktop app starts, calls
 * begin succeeding live without a Cowork restart.
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
} from "@modelcontextprotocol/sdk/types.js";
import {
  FALLBACK_TOOLS,
  FALLBACK_NOT_RUNNING_MESSAGE,
} from "./fallback-tools.js";

const upstreamUrl = process.env.MCP_URL ?? "http://127.0.0.1:53517/mcp";
const CONNECT_TIMEOUT_MS = 1500;

// stderr is the only safe channel — stdout is reserved for JSON-RPC frames.
function logErr(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error("[cr-mcp-proxy]", ...args);
}

/**
 * Lazy upstream connection. Held in module scope so we can null it
 * out when the connection drops and re-establish on the next request.
 */
let upstream: Client | null = null;
let connectInFlight: Promise<Client | null> | null = null;

async function tryConnectUpstream(): Promise<Client | null> {
  const c = new Client(
    { name: "cr-mcp-proxy", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(upstreamUrl));

  // SDK's Client.connect doesn't expose a timeout, so race it manually.
  // 1.5 s is plenty for loopback; anything longer means the server is
  // not actually listening.
  const timer = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), CONNECT_TIMEOUT_MS);
  });

  try {
    const ok = await Promise.race([
      c.connect(transport).then(() => "ok" as const),
      timer,
    ]);
    if (ok === null) {
      // Timed out. Best-effort cleanup so the half-open transport doesn't
      // leak; ignore any error from close itself.
      try {
        await c.close();
      } catch {
        /* ignore */
      }
      return null;
    }
  } catch {
    return null;
  }

  c.onclose = () => {
    if (upstream === c) {
      upstream = null;
    }
  };

  return c;
}

/**
 * Get a connected upstream client, opening one lazily if needed.
 * Returns null when the desktop app isn't reachable. Concurrent
 * callers share a single in-flight connect attempt to avoid
 * stampedes.
 */
async function ensureUpstream(): Promise<Client | null> {
  if (upstream) return upstream;
  if (connectInFlight) return connectInFlight;

  connectInFlight = (async () => {
    const c = await tryConnectUpstream();
    upstream = c;
    return c;
  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

async function main() {
  // Attempt an early connect so the first listTools/initialize doesn't
  // pay the connect cost. Failure here is fine — fallback mode kicks in.
  const initial = await ensureUpstream();
  if (initial) {
    logErr(`Connected to upstream MCP at ${upstreamUrl}`);
  } else {
    logErr(
      `Upstream MCP not reachable at ${upstreamUrl} on startup; entering fallback mode.`,
      "Tools will return install-the-desktop-app guidance until the upstream comes up.",
    );
  }

  const local = new Server(
    { name: "chatrevenue-memory", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  local.setRequestHandler(ListToolsRequestSchema, async () => {
    const client = await ensureUpstream();
    if (client) {
      try {
        return await client.listTools();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logErr(`upstream.listTools failed: ${msg}; serving fallback list.`);
        // Mark as disconnected so the next request retries.
        upstream = null;
      }
    }
    return { tools: FALLBACK_TOOLS };
  });

  local.setRequestHandler(CallToolRequestSchema, async (req) => {
    const client = await ensureUpstream();
    if (client) {
      try {
        return await client.callTool(req.params);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logErr(
          `upstream.callTool(${req.params.name}) failed: ${msg}; returning fallback message.`,
        );
        upstream = null;
      }
    }
    return {
      content: [
        {
          type: "text",
          text: FALLBACK_NOT_RUNNING_MESSAGE,
        },
      ],
      isError: true,
    };
  });

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
