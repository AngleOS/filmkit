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

## Related
- [[projects/filmkit/00 - Home]] · [[projects/filmkit/Design]] · [[projects/filmkit/Origins]]
