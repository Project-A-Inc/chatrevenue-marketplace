// Build script for the chatrevenue-memory MCP proxy.
//
// Bundles src/index.ts plus all npm dependencies into a single
// dist/bundle.js committed to the repo. The plugin's .mcp.json points at
// dist/bundle.js via ${CLAUDE_PLUGIN_ROOT}, so end users only need Node 18+
// on PATH; no `npm install` runs on their machine.

import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  outfile: "dist/bundle.js",
  format: "esm",
  banner: {
    // Force ESM-aware Node and keep the file double-clickable on Unix.
    js: "#!/usr/bin/env node",
  },
  minify: false, // keep readable for end-user audit
  sourcemap: false,
  legalComments: "inline",
  logLevel: "info",
});
