# Memory proxy

## Responsibility

Bridge Cowork's plugin MCP transport (stdio) to the ChatRevenue Monitor desktop
app's supervised MCP server on `127.0.0.1:53517`. It owns only the transport
hop — it carries no user paths, no API keys, no config beyond a single loopback
URL. The memory store, notifier state, schedules, and the tools themselves live
in the desktop app.

## Structure

```
plugins/chatrevenue/proxy/
  src/index.ts           stdio↔streamable-HTTP bridge (~190 LoC TypeScript)
  src/fallback-tools.ts  static tool list served when the app is down (~170 LoC)
  dist/bundle.js         esbuild output — COMMITTED (not gitignored)
  build.mjs              esbuild config
  package.json, package-lock.json, tsconfig.json, README.md
```

`node_modules/` is gitignored; `dist/` is not.

## Contracts

Wired through the plugin's `.mcp.json`:

```json
{
  "mcpServers": {
    "chatrevenue-memory": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/proxy/dist/bundle.js"],
      "env": { "MCP_URL": "http://127.0.0.1:53517/mcp" }
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` resolves at runtime to wherever Cowork stored the plugin.
`MCP_URL` is overridable for testing.

## Lifecycle / flow

Cowork spawns the proxy via system Node when the plugin loads. Each MCP tool call
is forwarded stdio→HTTP to the desktop app's loopback server and the response
relayed back. If the app is down, the proxy returns a friendly install-instructions
message and recovers automatically once the app is up — no Cowork restart.

## Constraints & decisions

- **stdio bridge, not direct HTTP.** Cowork's "Add custom connector" UI rejects
  plain `http://localhost` (it enforces `https://`), so stdio is the only wired
  path to a local HTTP MCP server.
- **Bundle is committed.** `dist/bundle.js` is checked in (the
  filestack-style committed-bundle pattern) so installs need no `npm install` /
  build step. Re-run `npm run build` and commit the regenerated bundle after any
  `src/` change.
- **System Node, not Cowork's runtime.** Cowork plugins use the user's PATH Node
  (its bundled Electron runtime is reserved for `.mcpb` Desktop Extensions),
  hence the Node 18+ prerequisite.
- **Fallback tool list.** `src/fallback-tools.ts` hardcodes the desktop server's
  tool names + input schemas (kept in sync with `chatrevenue_mcp_server.py`) so
  Cowork sees the same MCP surface even when the app is down; calls then return
  the install-instructions message until the app comes up.
- **Stateless.** One loopback URL in; no secrets or install-path knowledge — the
  supervisor on the desktop side owns all runtime env.
