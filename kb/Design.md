---
type: design
status: active
tags: [filmkit, design]
updated: 2026-11-12
issues: [AngleOS/filmkit#2]
---
# Angle Filmkit design

**Angle Filmkit** (package and CLI `filmkit`, D-007) lets AI agents make short brand and product films. A film is an HTML page: kit scenes and the film's own
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
  - safe boxes per frame (clear of the feeds' buttons), the caption box, a content column, a stage, the composer's
    box and the app window's (`app(place)`, whose body a film's own composition fills);
  - `pick({L,S,V})` for per-frame values;
  - the chart box: the stage stopped above two caption lines (three in 9:16), with the source line on its floor;
  - `vars()` for scene variables. It merges the declared defaults back in, working around a HyperFrames quirk.
- **motion.js (`KM`)**:
  - title entrances: blur, rise, ink, none;
  - typing at 15 chars/s and streaming at about 160 chars/s;
  - a cursor and its press;
  - the motif and the logo reveal.

  All arrivals use expo.out over 0.5–0.7 s.
- **chart.js (`KC`)**: the infographics' maths, tested in Node: values to lengths and bands, label sizes and
  placement, number formats (grouped, plain, compact), the delta, and a value rolling a frame at a time; a grid's
  cells (the largest square that fits, filled a column at a time so a bracket spans the lit columns), ticks evenly or
  to scale, labels spread clear of each other, and a line's wrap.
- **icons.js (`KI`)**: a small lucide set (ISC) for `cards` and `grid`, stroked in the text colour.
- **theme**: the brand as data, from `filmkit.json`:
  - grounds: named fills such as `ink`, `paper`, `accent-dark`;
  - one accent colour: one word per title, the motif, the primary button;
  - text colours, display, UI and mono fonts, title tracking;
  - logo SVGs: mark and wordmark;
  - a motif: lines, grid, dots or none;
  - optionally, syntax colours for code (`--code-*`).

  It compiles to CSS custom properties and a `KB` helper that draws the motif and the logo lockup.
- **film.css**: the shared look, and shadcn-style `fk-` pieces (button, input, badge, card, dialog, tabs, the cursor
  and a caret) whose surfaces are worked out from the theme, so a film's own compositions can rebuild a product's UI.
- **Scenes**, each driven by declared variables and documented from its own declaration:
  - **titles and brand:** `title`, `motif`, `mark` (logo reveal), `endcard`, `lower-third`;
  - **product:** `chat`, `code`, `terminal`, `composer`, `ui` (a generic app frame for rebuilt product UI);
  - **infographics:** `bars` (proportional, rolling values, a cap or reference line), `counter`, `stat` (before and
    after, with the delta), `grid` (n of m lit, with a bracket), `cards` (flip-in cards with source lines),
    `timeline` (ticks on a ruler), `mesh` (nodes connecting, with a pulse), `meter`;
  - **captions:** `captions`. It draws nothing; it is the source of the SRT/VTT, and `burn` puts them in the picture.
- **sound**, from the film's `sound.json` (how to write it: `docs/sound.md`):
  - cues from the picture (impact, tick, whoosh, type…), each placed by a scene's `id` and seconds into it, resolved
    against the master's scene starts, so a retimed scene keeps its sound;
  - a tonal chord pad (`kit/sound/pad.js`) on the chords, blooms and pockets;
  - a foley stem from the vendored sound-sheet renderer (MIT);
  - mixed with the pad `bed` dB under the foley and mastered with ffmpeg to −19 LUFS, its hits limited to −3 dBTP so the
    rendered AAC stays under −1, as `build/<film>/sound.m4a`, which every format mounts as an `<audio>`.

  Both renderers are deterministic, so the sound is rebuilt only when its score changes. There is no licensed music.
- **seam**: the loop gate for hooks. It fails when the last frame doesn't flow into frame 0.
- **captions**: the captions scene's lines become `<film>.srt` and `.vtt`.

### 3. The CLI (`filmkit`, Node ≥ 20 and ffmpeg)
| Command | What it does |
|---|---|
| `init [dir]` | a studio with the default theme, a smoke film and the agent skill installed |
| `new <film> [--template t]` | a film from a template: `statement`, `explainer`, `product-demo`, `hook-loop`, `poster` |
| `check <film> [formats…]` | theme valid, scenes valid, sound built, `hyperframes check` per format in parallel, and the seam gate for loops; skips formats unchanged since they passed (`--force` checks all); non-zero exit on failure |
| `snapshot <film> [format] --at t,t,…` | PNG frames, so agents can look |
| `contact <film> [formats…] [--every 2s \| --at t,t,…]` | one labelled contact sheet per format (each scene just after it starts, by default), the quickest full review |
| `preview <film> [format]` | HyperFrames Studio, live: reloads on save of the film, kit or theme; `f` switches format |
| `render <film> [formats…]` | `renders/<film>-<format>.mp4` at delivery quality, plus `.srt` and `.vtt`; keeps MP4s still current (`--force` redoes all) |
| `stills <film> <t>` | a poster PNG per format and a 1280×720 thumbnail |
| `scenes [name]` | the scene catalogue, with variables, generated from the scenes themselves |
| `doctor` | node, ffmpeg, Chrome for HyperFrames, and the HyperFrames pin |
| `agents [tools…]` | registers the MCP server and the skill in each agent tool it finds; `--remove`, `--dry-run`, `--mcp-command` (§8) |
| `explain [code]` | why an error or check rule exists and how to fix it, from the error catalogue (`src/errors.js`) |
| `skills` | installs the filmkit skill and the pinned HyperFrames skills into `.claude/skills` (and `AGENTS.md` pointers) |
| `mcp` | the MCP server over stdio |

Every command prints what it wrote, and `--json` prints it machine-readably. How it feels to use (copy, errors,
progress, speed) is set by [[projects/filmkit/Experience]].

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
- **Examples** (`examples/`): Angle Filmkit's own studio, in the `angle` theme (D-007). It has films that introduce
  Filmkit:
  - an argument film built on the infographic scenes;
  - a product demo of Filmkit itself: a brief going in, an agent at work, four formats out;
  - a 9:16 hook.

  CI renders them, and they double as the visual regression set.

### 7. Themes (D-007)
A theme is a folder: `theme.json` (grounds, accent, text, fonts, logo, motif, credit), `tokens.css`, `fonts/`, `logo/`
and an optional `brand.js` that sets `window.KB = { motif(svg), lockup(svg), lockupBox(w, cy) }`. The built-ins are
`angle` (the full brand; the reference implementation is `themes/angle/`), `default` (Angle's look with the studio's
logo) and `paper`. A studio's `filmkit.json` names a built-in theme, or points to its own folder, and can override
single values (`{ "extends": "angle", "accent": "#ff5a1f" }`); a `theme.json` can extend another theme the same way.
`filmkit.json` and `theme.json` are validated against `schema/filmkit.schema.json`. `theme.json`'s `grounds` use the
names scenes take (`ink`, `accent-dark`, `paper`, and any others), and the build compiles the merged values to
`kit/theme/theme.css` (`docs/themes.md`). Each folder's `brand.js` adds to `window.KB`, base first, after the studio's
name, its logo's mark and the credit, which the build compiles in; `default` keeps `angle`'s lines and reveals the
studio's `brand/logo.svg` beside its name. End cards carry "Made with Angle Filmkit" unless `"credit": false`.

### 8. Install, setup and onboarding (D-008)
The goal is that someone with an agent goes from nothing to a first film in their brand **in one command, or one
prompt to their agent**.

- **One line:**
  - macOS and Linux: `curl -fsSL https://raw.githubusercontent.com/AngleOS/filmkit/master/install.sh | sh`;
  - Windows: `irm …/install.ps1 | iex`;
  - with Node: `npx -y filmkit setup`. While the repo is private, collaborators use `npx -y github:AngleOS/filmkit setup`
    with their git credentials.

  The script:
  1. checks Node ≥ 20 and installs it if it's missing (brew, apt, dnf or winget; it asks first, or not with `--yes`);
  2. checks ffmpeg the same way;
  3. runs `filmkit setup`.
- **`filmkit setup`:** a guided walkthrough in a terminal; with `--yes` and flags (`--agents`, `--studio`, `--brand-url`,
  `--name`), it runs unattended for agents. Its steps:
  1. **Requirements:** Node, ffmpeg, and Chrome for HyperFrames (fetched once).
  2. **Agents:** it detects the agent tools installed on the machine and offers to register the `filmkit` MCP server in
     each, idempotently, keeping a backup of every config it edits. `filmkit setup --remove` undoes it.
     - **Claude Code:** `claude mcp add -s user filmkit -- npx -y filmkit mcp`, plus the skill in `~/.claude/skills/filmkit`.
     - **Claude Desktop:** `claude_desktop_config.json` `mcpServers`.
     - **Codex:** `~/.codex/config.toml` `[mcp_servers.filmkit]`, plus the skill.
     - **Cursor:** `~/.cursor/mcp.json`.
     - **VS Code:** the profile's `mcp.json` (`servers`).
     - **GitHub Copilot** (CLI and VS Code's Copilot agent): `~/.copilot/mcp-config.json`.
     - **Windsurf:** `~/.codeium/windsurf/mcp_config.json`, which Devin Desktop, its successor, imports.
     - **Zed:** `context_servers`.
     - **Gemini CLI:** `~/.gemini/settings.json`.
     - **opencode:** its `mcp` config.

     Tools that load Agent Skills get the skill in `~/.agents/skills/filmkit`. The step is `filmkit agents`, which
     also runs on its own. Each tool's config location is verified against its current docs, and the list lives in
     one table (`src/agents/tools.js`), so adding a tool is one row. `docs/agents/` has a page per tool.
  3. **Studio:** where it goes (`./<name>-films` by default), then `filmkit init`.
  4. **Brand:** `filmkit brand`. Give it a website URL and it pulls the brand from the site:
     - the logo (SVG first, from the site's icons, `og:image` and header);
     - `theme-color`, CSS custom properties and the dominant colours;
     - the web fonts (only open-licence fonts are copied; others become a suggested open match).

     Or answer a few questions (name, logo file, accent, light or dark). It writes `brand/` and `filmkit.json`'s theme,
     then shows a still in the new theme for a yes or no.
  5. **First film:** `filmkit new hello --template statement` with the brand name, `check`, and a contact sheet opened
     in the browser. It prints how to talk to the agent next, for example *"Make a 30-second launch film for …"*.
- **`filmkit prompt`** prints the agent setup prompt (`docs/install-with-your-agent.md`), so a person can paste it into
  any agent. That agent runs setup with `--yes`, asks the person only for their brand details, and finishes with a
  first film.
- **Walkthroughs:**
  - `docs/getting-started.md`: one page per path (one line, `npx`, with your agent);
  - `docs/agents/<tool>.md`: per tool, what setup wrote and how to do it by hand;
  - `filmkit tour`: an in-terminal tour that builds the first film step by step, explaining each command.

## What stays in Angle
Angle's *product* films, their claims, and the rebuilt Angle app UI (`picker`, the Angle composer) stay in
`angle-ai/marketing/video`. That folder later becomes a Filmkit studio using the `angle` theme (angle-ai#3867).
Angle's brand itself ships here as the `angle` theme (D-007).

## Roadmap
- **v0.1:** the CLI, the kit core and the default theme; sound; seam; captions; studio init; the MCP server; the
  skill; one example studio; CI.
- **v0.2:** the infographic scene set complete; `contact`; templates; docs site; npm release.
- **Later:** a data-binding helper (CSV or JSON into `bars`/`counter`); voice-over (a TTS track timed to beats);
  more themes; a gallery of community templates.

## Issues
- Epic: [filmkit v0.1](https://github.com/AngleOS/filmkit/issues/2): seed #3, sound #4, seam #5, product scenes #6, infographics #7, studio and themes #8, contact sheets #9, MCP #10, skill #11, examples #12, CI #13, docs #14, owner publish #15.

## Related
- [[projects/filmkit/00 - Home]] · [[projects/filmkit/02 - Decisions]] · [[projects/filmkit/Origins]]
- Source kit: `AngleOS/angle-ai` `marketing/video/` (README, AGENTS.md, kit/, films/f7-already-built, f8-in-scope)
