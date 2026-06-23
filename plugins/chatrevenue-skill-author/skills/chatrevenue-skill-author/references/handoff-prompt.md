# Handoff prompt — the user pastes this into their own Claude Code

> **Pointer, not contract (ADR 0011).** The ship contract lives in
> `project-a-skills/docs/AGENT_GUIDE.md` and `docs/architecture/`, versioned by
> `agent_guide_version`. This prompt carries only **intent + a pointer** — it does
> not restate the steps, the manifest schema, or the branch/PR conventions. Claude
> Code reads the authoritative contract from the repo it is operating in. (ADR 0010
> is where that contract currently says "Code owns git; the only helper is
> `place_draft.py`".)
>
> The Cowork side fills the two placeholders below — `{DRAFT_MANIFEST}` (path to the
> stash `draft.json`) and `{REPO_ROOT}` — as **forward-slash, quoted** absolute
> paths, then presents the block to the user, who runs it **in their own Claude
> Code with the working directory set to their local `project-a-skills` clone**.

---

You are shipping a skill draft produced by the chatrevenue-skill-author Cowork
plugin. The user produced the draft; your job is to place it and open a PR, owning
git natively.

- **Intent:** the draft manifest is at `{DRAFT_MANIFEST}`; the repo is `{REPO_ROOT}`
  (verify it equals your working directory). The manifest carries `type`, `scope`,
  `name`, `org_id`, and a suggested `pr_title`/`pr_body` (advisory).
- **Contract:** read `docs/AGENT_GUIDE.md` in the working directory and follow it
  exactly — it is the source of truth for the flow, the `place_draft.py` invocation,
  branch/commit/PR conventions, and the hard "don'ts". Do what it says; do not rely
  on any steps memorised elsewhere.

A dirty working tree is expected (Cowork authored content and left it uncommitted);
`AGENT_GUIDE.md` covers that. When done, report the PR URL back to the user.
