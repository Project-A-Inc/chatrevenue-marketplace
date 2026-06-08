# Handoff prompt — the user pastes this into their own Claude Code

> **Variant 1 (2026-06-08).** This is no longer auto-spawned. The Cowork skill
> fills in the two placeholders below and presents the block to the user; the user
> runs it **in their own Claude Code, with the working directory set to their local
> `project-a-skills` clone** (that's where git + the helpers can actually run — the
> Cowork sandbox can't). The body is otherwise unchanged. The Cowork side
> substitutes `DRAFT_MANIFEST` (path to the stash `draft.json`) and confirms the
> working directory is the repo root.

---

You are shipping a skill draft produced by the chatrevenue-skill-author Cowork
plugin. The user produced the draft;
your only job is to ship it.

Steps, in order. Do not skip or reorder.

1. Read the draft manifest at `{DRAFT_MANIFEST}` (the Cowork side fills in this
   absolute path before giving you this prompt). It is a JSON file containing:
   - `type` — "create", "update", or "remove"
   - `scope` — "global" or "org"
   - `org_id` — string (only when scope=org) or null
   - `name` — kebab-case slug for the skill
   - `repo_root` — absolute path; equals your --cwd; verify they match
   - `pr_title`, `pr_body` — pre-formatted PR metadata
   - `source.version` — `plugin_version` for the open_pr invocation
   - `source.session_id` — `session_id` for the open_pr invocation
   - other fields you may ignore

   (The draft folder's `SKILL.md` already carries any worker frontmatter —
   `executable: true` and the interval fields. You ship it as-is; do not
   add, remove, or interpret those fields. The `worker` object in the
   manifest is informational only.)

2. Read `docs/AGENT_GUIDE.md` in the current working directory. Honour
   it. In particular: only mutate the repo through
   `scripts/agent_helpers/*.py` (invoked via `uv run --frozen python scripts/agent_helpers/<name>.py`);
   never invoke `git` or `gh` directly.

3. Run `uv run --frozen python scripts/agent_helpers/preflight.py --repo-root <repo_root>`.
   Each helper emits JSON on stdout on success and a JSON failure block
   on stderr on failure. If exit code != 0, emit the full stderr block
   verbatim and exit with the same code. Do not attempt recovery.

4. Run `uv run --frozen python scripts/agent_helpers/new_branch.py --repo-root <repo_root>`
   with the manifest's `--type`, `--scope`, `--name`, and `--org-id`
   (when scope=org). Capture stdout. Parse the JSON; remember `branch`.

5. For type ∈ {create, update}: run
   `uv run --frozen python scripts/agent_helpers/place_draft.py --repo-root <repo_root>`
   with `--type`, `--scope`, `--name`, `--org-id` (when applicable),
   and `--draft` set to the directory containing `$DRAFT_MANIFEST`. The
   helper strips `draft.json` from the placed target; do not pre-copy
   or modify the user's stash folder.

   For type = remove: run `place_draft.py` with `--type remove`,
   `--scope`, `--name`, `--org-id` (when applicable). No `--draft`.

6. Run `uv run --frozen python scripts/agent_helpers/open_pr.py --repo-root <repo_root>`
   with the same `--type`, `--scope`, `--name`, `--org-id` (when
   applicable), plus `--plugin-version <source.version>` and
   `--session-id <source.session_id>` from the manifest. Capture
   stdout. Parse the JSON; remember `pr_url`.

7. Emit ONLY ONE LINE to stdout as the final line:

   ```
   pr_url=<the-url-you-parsed>
   ```

   Any other output you have should go to stderr.

Do not narrate. Do not summarise. Do not ask questions. If a helper
exits non-zero, emit its stderr block and exit with the same code.
