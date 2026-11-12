# filmkit — rules for every contributor (human or agent)

filmkit lets AI agents make brand films in HTML: a brief in; 16:9, 1:1, 4:5 and 9:16 videos out, with generated sound
and sidecar captions. Start with `kb/00 - Home.md`, `kb/Design.md` (the spec) and `kb/Origins.md` (what the Angle films
taught us, and the gotchas).

## Layout
```
src/cli/       the `filmkit` CLI: init, new, check, snapshot, contact, preview, render, stills, scenes, doctor, skills, mcp
src/mcp/       the MCP server: the CLI's operations as tools, plus guide resources and the make_film prompt
src/build/     assembling a film into build/<film>/<format>/, sound, seam and captions
kit/           what each build copies in: layout.js (AL), motion.js (KM), theme → CSS and KB, scenes/, sound/
themes/        built-in themes (angle, the reference; default, paper); a studio's own theme is in its filmkit.json
brand/         Angle Filmkit's own films: the README hero, teaser and example GIFs (Angle trademarks, TRADEMARKS.md)
templates/     starting films for `filmkit new --template`
skills/filmkit SKILL.md and references: brief, research, claims, look and motion, review, posting
examples/      a complete studio with films for a fictional brand: docs, demo and visual regression set
docs/          user docs (getting started, studio, scenes, themes, CLI, MCP, the agent workflow)
kb/            design, decisions, constraints (part of the hub vault)
```
`kb/Design.md` is the spec. A change in behaviour changes it in the same PR.

## Test first
- Red, green, refactor. New behaviour comes with tests, and a bug fix starts with a test that reproduces it.
- Node's built-in test runner (`node --test`). Tests are offline and deterministic. Fixtures are small HTML films and
  JSON cue sheets.
- **A kit or scene change** is checked by `filmkit check` on the smoke film (it mounts every scene) and on
  `examples/` in all four formats. Look at contact sheets of each before calling it done. Renders go to a temp
  directory, never into git.

## Code that reads well
- Plain ESM JavaScript with JSDoc types, and `tsc --checkJs` in CI. No build step for the kit: it runs in the
  browser as written.
- Names carry the meaning. Comments explain *why* (a renderer quirk, a feed's safe zone), and never narrate.
- Small functions, early returns, no speculative generality, no dead code.
- The CLI never prompts: an agent can't answer. It has stable `--json` output and non-zero exits on failure.

## Films and scenes
- The look and motion rules live in `skills/filmkit/references/look-and-motion.md`. Scenes and templates follow them.
- Every scene declares its variables (`data-composition-variables`) with defaults and descriptions; `filmkit scenes`
  and the docs are generated from them. Read variables with `AL.vars()`.
- Inside a scene, pass the kit helpers elements, never selector strings: `document` and `gsap` are scoped to the
  mount.
- No brand is hard-coded in kit code: colours, fonts, logo and motif come from the theme.

## Work
- One issue becomes one complete PR against master, `Fixes #n`, with CI green. Record lasting choices as `D-###` in
  `kb/02 - Decisions.md`.
- Hub rules (commits, tasks, agents, Mattermost) are in `~/projects/AGENTS.md`. Never add AI co-author lines to
  commits.
