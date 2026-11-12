---
type: design
status: active
tags: [filmkit, design]
updated: 2026-11-12
issues: []
---
# filmkit design

filmkit lets AI agents make short brand and product films. A film is an HTML page: kit scenes and the film's own
GSAP compositions, rendered to video by [HyperFrames](https://github.com/heygen-com/hyperframes). The agent writes a
brief, researches the claims, builds the film from the kit, checks it in every format, looks at the frames, and
renders. One master becomes **16:9, 1:1, 4:5 and 9:16**, each laid out for its own frame. Sound is generated from the
motion, and captions ship as SRT/VTT files.

It was extracted from the kit that made Angle's beta films (`AngleOS/angle-ai`, `marketing/video`, Nov 2026). See
[[projects/filmkit/Origins]] for what that work taught us. The decisions are in [[projects/filmkit/02 - Decisions]].

## Who it's for
- **Someone with an agent**, such as Claude Code, Codex or Cursor, who wants a launch film, a feature clip, an
  explainer with live infographics, or a 9:16 hook. They shouldn't need a motion designer or a video editor.
- **The agent itself.** Every surface is built so an agent can drive it: a CLI with plain exit codes, an MCP server,
  and a skill that teaches the workflow.

## The pieces

### 1. A studio: the user's own repo, made by `filmkit init`
```
filmkit.json        brand (theme), default formats, render settings, where renders go
brand/              logo SVGs, fonts (OFL or the user's licensed files), colours → the theme
films/<name>/       index.html (the master), compositions/ (the film's own scenes), sound.json, brief.md
CLAIMS.md           every word on screen, with its source (and ⚑ rows that hold back public posting)
POSTING.md          where each render goes, with copy per platform
renders/            git-ignored: <film>-<format>.mp4, <film>.srt / .vtt, stills
build/              git-ignored: the assembled formats (never edited by hand)
```
The tool is a dependency (`npx filmkit …`). The studio holds only content, so updating filmkit never touches the
user's films.

### 2. The kit, shipped inside the package and copied into every build
- **layout.js (`AL`)**: one master and four frames:
  - L = 16:9, S = 1:1 and 4:5, V = 9:16;
  - safe boxes per frame (clear of the feeds' buttons), the caption box, a content column and a stage;
  - `pick({L,S,V})` for per-frame values;
  - `vars()` for scene variables. It merges the declared defaults back in, working around a HyperFrames quirk.
- **motion.js (`KM`)**:
  - title entrances: blur, rise, ink, none;
  - typing at 15 chars/s and streaming at about 160 chars/s;
  - a cursor and its press;
  - the motif and the logo reveal.

  All arrivals use expo.out over 0.5–0.7 s.
- **theme**: the brand as data, from `filmkit.json`:
  - grounds: named fills such as `ink`, `paper`, `accent-dark`;
  - one accent colour: one word per title, the motif, the primary button;
  - text colours, display, UI and mono fonts, title tracking;
  - logo SVGs: mark and wordmark;
  - a motif: lines, grid, dots or none.

  It compiles to CSS custom properties and a `KB` helper that draws the motif and the logo lockup.
- **Scenes**, each driven by declared variables and documented from its own declaration:
  - **titles and brand:** `title`, `motif`, `mark` (logo reveal), `endcard`, `lower-third`;
  - **product:** `chat`, `code`, `terminal`, `composer`, `ui` (a generic app frame for rebuilt product UI);
  - **infographics:** `bars` (proportional, rolling values, a cap or reference line), `counter`, `stat` (before and
    after, with the delta), `grid` (n of m lit, with a bracket), `cards` (flip-in cards with source lines),
    `timeline` (ticks on a ruler), `mesh` (nodes connecting, with a pulse), `meter`;
  - **captions:** `captions`. It draws nothing; it is the source of the SRT/VTT, and `burn` puts them in the picture.
- **sound**:
  - cues from the picture (impact, tick, whoosh, type…) resolved against scene starts;
  - a tonal chord pad;
  - a foley stem from the vendored sound-sheet renderer (MIT);
  - mixed and mastered to −19 LUFS and −1 dBTP with ffmpeg.

  There is no licensed music.
- **seam**: the loop gate for hooks. It fails when the last frame doesn't flow into frame 0.
- **captions**: the captions scene's lines become `<film>.srt` and `.vtt`.

### 3. The CLI (`filmkit`, Node ≥ 20 and ffmpeg)
| Command | What it does |
|---|---|
| `init [dir]` | a studio with the default theme, a smoke film and the agent skill installed |
| `new <film> [--template t]` | a film from a template: `statement`, `explainer`, `product-demo`, `hook-loop`, `poster` |
| `check <film> [formats…]` | theme valid, scenes valid, sound built, `hyperframes check` per format, and the seam gate for loops; non-zero exit on failure |
| `snapshot <film> [format] --at t,t,…` | PNG frames, so agents can look |
| `contact <film> [--every 2s]` | one contact sheet per format, the quickest full review |
| `preview <film> [format]` | HyperFrames Studio |
| `render <film> [formats…]` | `renders/<film>-<format>.mp4` at delivery quality, plus `.srt` and `.vtt` |
| `stills <film> <t>` | a poster PNG per format and a 1280×720 thumbnail |
| `scenes [name]` | the scene catalogue, with variables, generated from the scenes themselves |
| `doctor` | node, ffmpeg, Chrome for HyperFrames, and the HyperFrames pin |
| `skills` | installs the filmkit skill and the pinned HyperFrames skills into `.claude/skills` (and `AGENTS.md` pointers) |
| `mcp` | the MCP server over stdio |

Every command prints what it wrote, and `--json` prints it machine-readably.

### 4. The MCP server (`filmkit mcp`)
**Tools:**
- `list_films` and `list_scenes`: the catalogue with variables;
- `new_film`, `check_film` and `snapshot_film`, which returns **images**, so a model can look at its own frames;
- `contact_sheet`, `render_film`, `captions`, `stills`;
- `read_claims` and `add_claim`.

**Resources:** the guide (look and motion rules), the brief template, the claims format and the review checklist.

**Prompt:** `make_film`, the whole workflow.

It works in Claude Code (`claude mcp add filmkit -- npx filmkit mcp`), Codex, Cursor, and any other MCP client.

### 5. The skill (`skills/filmkit/SKILL.md`, plus references)
This is the workflow that made the Angle films, written for any agent:
1. **Brief:**
   - audience;
   - the promise;
   - the tone;
   - what the audience trusts and what makes them roll their eyes;
   - a beats table with time, picture, on-screen line and source.
2. **Research:** every number is tagged measured, projected, estimate, contested or unverified, and there is a list
   of claims to keep off screen.
3. **Claims:** every on-screen word goes in CLAIMS.md with its source. Lines that aren't true yet get ⚑ and hold
   back public posting.
4. **Build** from kit scenes, then the film's own compositions for what the kit lacks, following the look and motion
   rules.
5. **Check** in every format, then **look**: contact sheets and snapshots at each beat. Fix overlaps, especially in
   9:16.
6. **Render**, attach the captions, and write the posting copy per platform.

### 6. Templates and examples
- **Templates:** `new --template` copies a starting film with placeholder copy and beats.
- **Examples** (`examples/`): a complete studio with two films made for a fictional brand. One is an argument film
  built on infographics, the other a product demo. CI renders them, and they double as the visual regression set.

## What stays in Angle
Angle's theme (Night and Pear, the brand lines, the ANGLE lockup), its rebuilt app UI (`picker`, the Angle
composer), its films, and their claims stay in `angle-ai/marketing/video`. That folder later becomes a filmkit studio
with an Angle theme (filmkit epic, last step).

## Roadmap
- **v0.1:** the CLI, the kit core and the default theme; sound; seam; captions; studio init; the MCP server; the
  skill; one example studio; CI.
- **v0.2:** the infographic scene set complete; `contact`; templates; docs site; npm release.
- **Later:** a data-binding helper (CSV or JSON into `bars`/`counter`); voice-over (a TTS track timed to beats);
  more themes; a gallery of community templates.

## Related
- [[projects/filmkit/00 - Home]] · [[projects/filmkit/02 - Decisions]] · [[projects/filmkit/Origins]]
- Source kit: `AngleOS/angle-ai` `marketing/video/` (README, AGENTS.md, kit/, films/f7-already-built, f8-in-scope)
