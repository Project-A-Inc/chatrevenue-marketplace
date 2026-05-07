# chatrevenue-marketplace

Cowork-compatible plugin marketplace from ChatRevenue. Distributes the ChatRevenue skills bundle + an MCP-server connector that points Cowork at the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor)'s local HTTP server (`http://127.0.0.1:53517/mcp`).

> **Prerequisite:** the desktop app must be installed and running on the same machine for the memory + activity skills to work. The plugin is just the connector — it doesn't ship the MCP server itself. (`chatrevenue-icp-lead-gen` is the exception — it works without the app.)

## Add to Cowork

1. Open Cowork → Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   Project-A-Inc/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted (Cowork uses GitHub OAuth to fetch repos).
4. Find **chatrevenue** in the listing → **Install**.

## Repo layout

```
.
├── .claude-plugin/
│   └── marketplace.json              # marketplace manifest (Cowork reads this)
└── plugins/
    └── chatrevenue/
        ├── .claude-plugin/plugin.json
        ├── .mcp.json                  # auto-registers chatrevenue-memory MCP server
        ├── skills/
        │   ├── chatrevenue-memory/SKILL.md
        │   ├── chatrevenue-help-with-current-activity/SKILL.md
        │   └── chatrevenue-icp-lead-gen/SKILL.md
        └── README.md
```

## Plugins

| Plugin | What it does |
|---|---|
| `chatrevenue` | Three sales-rep skills: `chatrevenue-memory` (screen-memory queries), `chatrevenue-help-with-current-activity` (watcher-fired activity help), `chatrevenue-icp-lead-gen` (ICP lead-generation assistant — standalone). The first two need the [ChatRevenue Monitor desktop app](https://github.com/Project-A-Inc/project-a-monitor) running for the MCP server they call. |

## License

MIT.
