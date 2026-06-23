# Pre-flight — pointer (not the plugin's job)

> **ADR 0010 + 0011.** Environment/repo checks are **Claude Code's domain**, and
> their authoritative description lives in the repo:
> `project-a-skills/docs/AGENT_GUIDE.md` (the flow + hard "don'ts") and
> `docs/architecture/`. The plugin does **not** run any of them and does not restate
> them here. The old clean-working-tree gate is gone — a dirty tree is normal when
> Cowork authors and Code commits.

Cowork-side, the only thing to settle before the dialog is the **repo location**:
read `repo_root` from `<state-dir>/config.json`; if missing, ask the user where
their local copy of the ChatRevenue skills project is and save it. Do not run
`gh`/`git`/`uv` checks from Cowork — they aren't meaningful in the sandbox, and the
contract for what Code verifies lives in the repo doc above.
