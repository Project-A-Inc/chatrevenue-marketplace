# chatrevenue-marketplace

Cowork-compatible plugin marketplace from ChatRevenue. Distributes the ChatRevenue skills bundle + a tiny stdio↔HTTP proxy that bridges Cowork to the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor)'s supervised MCP server on `127.0.0.1:53517`.

> **Prerequisites**
> 1. **Node.js 18+** on the user's PATH (Cowork plugins use system Node, not Cowork's bundled runtime — that is reserved for `.mcpb` Desktop Extensions).
> 2. ChatRevenue Monitor desktop app running on the same machine — its supervised MCP server is what the plugin's proxy talks to.
>
> (`chatrevenue-icp-lead-gen` is the exception — it works without either.)

## Add to Cowork

1. Open Cowork → Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted (Cowork uses GitHub OAuth to fetch repos).
4. Find **chatrevenue** in the listing → **Install**.
5. Restart Cowork so the plugin loads its `.mcp.json`.

## Repo layout

```
.
├── .claude-plugin/
│   └── marketplace.json              # marketplace manifest (Cowork reads this)
└── plugins/
    └── chatrevenue/
        ├── .claude-plugin/plugin.json
        ├── .mcp.json                 # registers the chatrevenue-memory proxy
        ├── proxy/                    # stdio<->HTTP bridge (committed bundle)
        │   ├── src/index.ts          # ~100 LoC TypeScript
        │   ├── dist/bundle.js        # esbuild output, committed
        │   ├── build.mjs             # esbuild config
        │   ├── package.json
        │   ├── tsconfig.json
        │   └── README.md
        ├── skills/
        │   ├── chatrevenue-memory/SKILL.md
        │   ├── chatrevenue-help-with-current-activity/SKILL.md
        │   └── chatrevenue-icp-lead-gen/SKILL.md
        └── README.md
```

## Plugins

| Plugin | What it does |
|---|---|
| `chatrevenue` | Three sales-rep skills: `chatrevenue-memory` (screen-memory queries), `chatrevenue-help-with-current-activity` (watcher-fired activity help), `chatrevenue-icp-lead-gen` (ICP lead-generation assistant — standalone). The first two need the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) running for the MCP server the proxy talks to. |

## License

MIT.
