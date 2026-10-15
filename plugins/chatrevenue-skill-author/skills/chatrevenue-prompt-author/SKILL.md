---
name: chatrevenue-prompt-author
description: >
  Use this skill when the user wants to change, review, or try how the
  Knowledge Lake summarizes entities or relationships. Trigger on phrases
  like "change how deals are summarized", "the summary of this company is
  too long", "show me the prompt for contacts", "try a new prompt",
  "publish my prompt change", "summary prompts", and semantically
  equivalent phrasings in the user's language. Not for ChatRevenue agent
  skills — those belong to chatrevenue-skill-author. This skill only
  routes: it finds the user's prompts project folder and follows the
  authoring process that project describes.
---

# ChatRevenue — Prompt Author

1. **Find the prompts project.** Look at the folders connected to this
   session. The prompts project is the one whose root has a `CLAUDE.md`
   with the heading `## Prompt authoring sessions`. If exactly one folder
   matches, use it. If several match or none does, ask the author once,
   in plain words, to connect or pick their prompts project folder, and do
   nothing else until they answer; then start again from step 1.
2. **Read the route.** Read that folder's `CLAUDE.md`, then the file its
   `## Prompt authoring sessions` section names.
3. **Follow that file.** From here on, follow that file. It overrides
   anything this skill or this plugin's other references say about
   prompts.
4. **If that section names no file, or the file it names is missing,**
   tell the author in plain words that this folder is not the prompts
   project, and stop.

Hide the plumbing, as in this plugin's other skills: talk to the author in
plain language, with no file names, headings, paths or error details.
