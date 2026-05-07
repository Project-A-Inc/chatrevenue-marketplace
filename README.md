# chatrevenue-marketplace

Sample Cowork-compatible plugin marketplace from ChatRevenue.

This repo is a learning artefact — it lets us understand how Claude Cowork actually fetches and installs marketplaces by hand-rolling the canonical Git-based format that Cowork expects.

## Add to Cowork

1. Open Cowork → Customize → **+** Personal plugins → **Create plugin** → **Add marketplace**
2. Paste:
   ```
   oleksandr-ieremchuk/chatrevenue-marketplace
   ```
3. Sign in to GitHub when prompted (Cowork uses GitHub OAuth to fetch repos).

After it loads, install **chatrevenue-hello** and run `/hello` in any session.

## Repo layout

```
.
├── .claude-plugin/
│   └── marketplace.json          # marketplace manifest (Cowork reads this)
└── plugins/
    └── chatrevenue-hello/
        ├── .claude-plugin/
        │   └── plugin.json        # plugin manifest
        ├── commands/
        │   └── hello.md           # the /hello slash command
        └── README.md
```

## Plugins

| Plugin | What it does |
|---|---|
| `chatrevenue-hello` | Minimal hello-world; adds the `/hello` slash command. |

## License

MIT.
