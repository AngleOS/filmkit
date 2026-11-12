---
type: project
status: active
tags: [filmkit]
updated: 2026-11-12
---
# Decisions

## D-001 · 2026-11-12 · filmkit: agents make brand films in HTML, from one master into four formats
**Decision.** filmkit is an open-source kit plus tooling: a studio layout, a CLI, an MCP server and an agent skill.
With it, an AI agent turns a brief into a finished short film: 16:9, 1:1, 4:5 and 9:16, with generated sound and
sidecar captions. It is extracted from the kit that made Angle's beta films ([[projects/filmkit/Origins]]). The owner
asked for it on 2026-11-12, "so my friend can make the same videos with ai agents".

**Why:**
- The Angle films showed that agents can make good films when three things hold:
  - the film is code;
  - the kit fixes the look and motion;
  - there is a hard "done" check: it passes in every format, and the agent has looked at its frames.
- None of that is specific to Angle except the brand.

**Alternatives:**
- Keep it inside angle-ai: nobody else can use it.
- Wrap a hosted video API: the cost, the lock-in, and agents can't diff or review a film.

## D-002 · 2026-11-12 · HyperFrames renders, pinned; Node ≥ 20 and ffmpeg are the only requirements
**Decision.** Films render through HyperFrames (HeyGen, Apache-2.0), pinned to one version by the CLI (0.8.186 at
extraction) and run through `npx`. GSAP comes from npm (`gsap`), not a vendored copy. The kit's Python helpers (sound
cue resolution, the loop seam gate, subtitles) are ported to Node, so installing filmkit means Node and ffmpeg.

**Why.**
- The pin is what makes a re-render identical.
- Fewer runtimes means fewer ways for a friend's machine to fail.

**Alternatives:**
- Remotion: React-first, with a licence that charges companies.
- A custom Puppeteer renderer: we'd own frame timing and audio muxing.

## D-003 · 2026-11-12 · The brand is a theme; the studio holds content; the tool is a dependency
**Decision.** Everything brand-specific is a **theme** declared in `filmkit.json`: grounds, accent, text colours,
fonts, logo SVGs, motif. A user's films live in their own **studio** repo (`filmkit init`). filmkit ships the kit and
copies it into each build.

**Why:**
- Angle's kit hard-coded Night and Pear, the brand lines and the ANGLE lockup.
- A friend needs their own brand in minutes, without forking the tool.
- Updates never touch their films.

## D-004 · 2026-11-12 · Agents are first-class users: an MCP server and a skill, and frames they can see
**Decision.** Everything the CLI does is also an MCP tool. `snapshot_film` and `contact_sheet` return images, so the
model reviews its own frames. A skill (`skills/filmkit/`) teaches the workflow: brief, research, claims, build, check,
look, render. The CLI's `--json` output and exit codes are stable.

**Why.** Looking at the frames is what caught the 9:16 overlaps in every Angle film. An agent that can't see its
output ships broken layouts.

## D-005 · 2026-11-12 · MIT licence; third-party code keeps its own
**Decision.** filmkit is MIT. The rest keep their own licences, listed in `THIRD_PARTY.md`:
- the vendored `sound-sheet.mjs` and the launch-video research notes (MIT, AgentsORG/design-engineering);
- the default theme's Geist fonts (OFL);
- lucide icons (ISC);
- GSAP (its standard no-charge licence, through npm);
- HyperFrames (Apache-2.0, through npx).

**Why.** It's the most permissive choice that stays compatible with everything we bundle.

## D-006 · 2026-11-12 · Built by the agent fleet, issue by issue
**Decision.** filmkit is built like every AngleOS project:
- the epic and its issues are on the Angle board;
- agents work them (`agent:mac` for anything that renders, because the MacBook has the proven toolchain);
- agentd reviews and lands the PRs.

The foundation (kb, AGENTS.md, README, LICENSE) was written by the orchestrating session.

## D-007 · 2026-11-12 · Angle Filmkit: an Angle-branded product, with Angle's look as the default
**Decision (owner, 2026-11-12):** "make this an angle branded product though. use our logo branding etc wherever
appropriate and cool." The repo stays private for now; the owner adds collaborators.

- **Name.** The product is **Angle Filmkit**. The package and CLI stay `filmkit`, and the MCP server is
  `filmkit` ("Angle Filmkit").
- **The tool's own surfaces carry the full Angle brand:** the README hero (`docs/assets/hero.png`, rendered with the
  kit), the docs, the CLI's banner and `doctor`, the MCP server's name and description, and the example studio.
- **Built-in themes:**
  - **`angle`**: the complete brand (Night, Castleton, Jet and Paper grounds; the Pear accent; Geist; the brand lines;
    the ANGLE lockup). It's used for Angle's and Filmkit's own films and the example studio.
  - **`default`**: Angle's *look* (the same palette, type and lines motif) with the **studio's own logo**, so
    everything made with Filmkit looks like Angle until someone rethemes it.
  - **`paper`**: the light variant.
- **The theme contract.** A theme is a folder:
  - `theme.json`: grounds, `ground`, accent, `accentOn`, text, fonts and faces, tokens, logo files, motif, credit;
  - `tokens.css`: CSS custom properties;
  - `fonts/`;
  - `logo/`;
  - optionally `brand.js`, which sets `window.KB = { motif(svg), lockup(svg), lockupBox(w, cy) }`.

  The kit's `motif`, `mark` and `endcard` scenes call `KB`, and a theme with no `brand.js` gets the kit's generic
  logo reveal. `themes/angle/` is the reference implementation.
- **The credit.** End cards show a small "Made with Angle Filmkit" line by default (`theme.credit`). A studio turns it
  off with `"credit": false`.
- **The example studio is Angle's own:** films that introduce Angle Filmkit, in the `angle` theme. Filmkit makes its
  own launch film, and that is the visual regression set.
- **Brand assets aren't MIT.** The Angle name, logo, mark, wordmark and lines are trademarks (`TRADEMARKS.md`). The
  code stays MIT.

This revises D-003 and the "No Angle content" constraint. Angle's *product* films, their claims and the rebuilt Angle
app UI (`picker`, the Angle composer) still stay in `angle-ai`.

## Related
- [[projects/filmkit/00 - Home]] · [[projects/filmkit/Design]] · [[projects/filmkit/Origins]]
