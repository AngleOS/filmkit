# The filmkit CLI

`filmkit` works on the studio: the nearest directory with a `filmkit.json`, walking up from the current directory, or
the one `--studio <dir>` names.

```
filmkit.json        { "name": "Acme", "formats": ["16x9", "9x16", "1x1", "4x5"], "theme": "default", "renders": "renders" }
brand/              the logo (logo.svg, the mark the default themes reveal) and the brand's own files
films/<name>/       brief.md, index.html (the master), compositions/ (the film's own scenes), sound.json, assets
CLAIMS.md           every word on screen, with its source; a ⚑ row holds back posting
POSTING.md          where each render goes, with its copy per platform
AGENTS.md           points an agent at the filmkit skill, in .claude/skills/filmkit/, and the HyperFrames skill beside it
.claude/skills/     the filmkit skill; `filmkit skills` adds the pinned HyperFrames' own skills, git-ignored
build/              git-ignored: build/<film>/<format>/, rebuilt when its inputs change, and build/<film>/preview/; never edit it
renders/            git-ignored: <film>-<format>.mp4, <film>.srt and .vtt, <film>-<format>.png stills
```

`filmkit.json` is checked against `schema/filmkit.schema.json` whenever a command opens the studio: `name`, the
default `formats`, the `theme` (a built-in name, a theme folder, or single values over one: see
[themes](themes.md)) and `renders`, the folder renders go to (`renders` by default). A key it doesn't know, or a value
it can't use, is a usage error (exit 2) that says what the value should be.

| Command | What it does |
|---|---|
| `init [dir] [--name brand]` | a studio in `dir` (the current directory by default) for `brand` (the folder's name by default): `filmkit.json`, `brand/logo.svg`, `films/smoke` (every kit scene, to check the theme), `CLAIMS.md`, `POSTING.md`, `AGENTS.md`, the filmkit skill in `.claude/skills/filmkit/` and a `.gitignore` for `build/` and `renders/`. Files already there are kept, never overwritten |
| `new <film> [--template t]` | `films/<film>/` from a template, `statement` when none is named (the templates are in `kb/Templates.md`), with the brand's name filled in, and the template's placeholder lines appended to `CLAIMS.md` as ⚑ rows. Every template passes `check` as generated |
| `check <film> [formats…] [--force]` | warns when the theme's text is under WCAG AA on one of its grounds, builds the film's sound, then assembles each format and runs `hyperframes check` on it, and a loop's seam gate, listing each format's errors and warnings as it finishes; skips a format unchanged since it passed |
| `snapshot <film> [format] [--at t,t,…] [--frames n]` | PNG frames and a contact sheet of one format, in `build/<film>/snaps-<format>/` |
| `contact <film> [formats…] [--every 2s \| --at t,t,…]` | a contact sheet per format, `build/<film>/contact-<format>.png`: frames tiled within 2048 px, each labelled with its format and time; with no times, each scene 0.7 s after it starts (at most 48 frames) |
| `preview <film> [format] [--no-open]` | HyperFrames Studio on the film, live: it reloads on save, and `f` shows the next format |
| `render <film> [formats…] [--force]` | `check`, then `renders/<film>-<format>.mp4` at delivery quality, plus the captions; keeps an MP4 that's still current |
| `captions <film>` | only the captions: `renders/<film>.srt` and `.vtt` |
| `stills <film> <t> [formats…]` | `check`, then a poster per format at `t` seconds, `renders/<film>-<format>.png`, and a 1280 × 720 `renders/<film>-thumbnail.png` from 16x9 |
| `scenes [name]` | the kit's scenes, each with the first line of what it does; with a name, all of it and its variables: type, default, label and an enum's options. Read from the scenes themselves: each one's comment and `data-composition-variables` |
| `skills` | the filmkit skill and the skills the pinned HyperFrames ships (`hyperframes`, `hyperframes-cli`, `media-use`) into `.claude/skills/`, each replacing its older copy; the studio's other skills are left alone. The HyperFrames ones are git-ignored, since `skills` makes them again from the pin, and an `AGENTS.md` without a pointer to them gets one. Run it again after upgrading filmkit |
| `doctor` | Node ≥ 20, ffmpeg, the pinned HyperFrames and its Chrome, each with a hint when it's missing |
| `agents [tools…] [--remove] [--dry-run] [--mcp-command cmd]` | registers Filmkit's MCP server and skill in each agent tool it finds (Claude Code, Codex, Cursor, VS Code, …), with a backup of every file it edits: see [agents/](agents/README.md) |
| `explain [code]` | why an error or check rule exists and how to fix it; with no code, every one of Filmkit's own. A HyperFrames rule is explained from the pinned HyperFrames' skill references |

**Formats.** 16x9 (1920 × 1080), 9x16 (1080 × 1920), 1x1 (1080 × 1080) and 4x5 (1080 × 1350). With none named, a
command works on the film's own (its root's `data-formats`, such as a vertical hook's `"9x16"`), else the studio's.
`snapshot` and `preview` take the first. `contact` needs ffmpeg on the PATH.

**Assembly.** Each format is a HyperFrames project in `build/<film>/<format>/`: the film, a copy of the kit
(`kit/layout.js`, `kit/motion.js`, `kit/chart.js`, `kit/icons.js`, `kit/film.css`, `kit/scenes/`), GSAP as `kit/vendor/gsap.min.js` and the theme as
`kit/theme/`, with the root composition's `data-width` and `data-height` set for the format. A film's head loads
`kit/vendor/gsap.min.js`, `kit/theme/theme.css` and `kit/film.css`, and its body ends with `kit/layout.js`,
`kit/motion.js`, `kit/chart.js` (for the infographic scenes), `kit/icons.js` (for `cards` and the icons in `grid` and `mesh`) and `kit/theme/brand.js`: see
`examples/studio/films/infographics`.

**Preview.** `preview` assembles `build/<film>/preview/` once and starts HyperFrames Studio on it, opening the browser
when it runs in a terminal (`--open` or `--no-open` to choose). It then watches `films/<film>/`, the kit and the theme
and copies each saved file into the build, where Studio sees it and reloads, within about 2 s of the save. It prints
`Showing 9x16 · press f for the next format · q to quit`: `f` resizes the master for the film's next format in the
same tab, and `q` (or Ctrl+C) stops Studio. Keys are read from stdin, so an agent can pipe them in. With `--json` it
prints `{ film, format, ok, dir, url }` when it stops, `format` being the last one shown.

**Speed.** `check` runs the formats in parallel: one per two cores and per 4 GB of memory, so two on an 8 GB laptop. It
builds the sound first, then hashes each format's inputs (the film's files, its built sound, the kit, GSAP, the theme,
the HyperFrames pin and filmkit's version) and skips a format whose hash matches its last pass, in
`build/<film>/<format>/.filmkit-hash`, printing `16x9 unchanged ✓` with the warnings (and a loop's seam) it passed with. A failed format is always checked again. `render` keeps an MP4
made from the same hash (`build/<film>/render-<format>.json`), so an interrupted render redoes only what's missing or
stale. Renders run one at a time, as each already uses every core. `--force` redoes everything.

**Progress.** In a terminal, `check`, `render` and `stills` keep one line per running format on stderr, redrawn every
second: its step, its frames, the time so far and, once the frame rate settles, the time left, such as
`9x16  capturing  ▓▓▓░░░░░  frame 612/1440  0:52  1:10 left`. Results print above those lines as each format
finishes. Anywhere else (a pipe, CI, an agent's shell) each step prints one line as it starts: `16x9 checking`,
`16x9 measuring the seam`, `16x9 rendering`, `16x9 capturing 1440 frames`. HyperFrames' own render
output is held back; when a render fails, its last lines print under `16x9 ✗ render failed`.

**Loops.** A film whose root has `data-loop="true"` is a hook loop: it plays again from frame 0 as soon as it ends, so
its last frame has to flow into its first. `check` runs the seam gate on it in each format. It snapshots the first 9 and
the last 9 frames (30 fps) as PNGs into `build/<film>/seam-<format>/`, decodes them with ffmpeg at 480 px on the long
side, and measures each step as the mean absolute RGB change between neighbours. The format fails when the step from
the last frame back to frame 0 is over max(0.4, 1.5 × the median step at the ends): `seam` in the result gives the
`step`, the `median` and the `limit`. A film that moves across its seam passes when it keeps its speed; one that holds
still passes when nothing changes. The rules for making one are in
`skills/filmkit/references/look-and-motion.md` § Hook loops, and `examples/studio/films/loop` is one.

**Sound.** A film with a `sound.json` gets `build/<film>/sound.m4a`, built by `check` (so `render` and `stills` too) and
`preview`, mastered to −19 LUFS under −1 dBTP and mounted in every format. `check` prints its loudness and fails when it
can't be built. How to write `sound.json`: [sound.md](sound.md).

**Captions.** The `captions` scene is the film's caption track: one host spanning the film, with `lines` as
`start-end text`, one per line, in seconds of the scene. `render` and `captions` write them, moved to the film's time,
as `renders/<film>.srt` and `.vtt`: one pair serves every format, to upload as closed captions. A film with no captions
scene gets no files. With `burn` the scene also draws them into the picture, in `AL.captions`.

**Output.** Every command prints what it wrote. With `--json` it prints one JSON object on stdout, in the shapes in
`kb/Interfaces.md` (`init` as `{ ok, studio, name, files, kept }`; `new` as `{ ok, film, template, files }`; `check`'s
`sound` is `null` for a silent film; `captions` and `stills` as the MCP tools of the same name; `doctor` as
`{ ok, checks: [{ name, ok, detail, code?, hint? }] }`), with absolute paths; progress and HyperFrames' own output go to
stderr. Global options (`--json`, `--studio`) may come before or after the command. Nothing prompts.
`--help` and `doctor` open with the Angle banner, `╱◣ ANGLE FILMKIT` in Pear, but only in a colour terminal: never with
`--json`, on a pipe (even with `FORCE_COLOR` set, as agent harnesses do), or when `NO_COLOR` or `FORCE_COLOR=0` is set.

**Exit codes.** `0` ok, `1` the film failed a check, `2` a usage error (no studio, an unknown film, format or option),
`3` a missing requirement (`doctor` says which), `4` a render, snapshot, contact sheet or still failed. A failure prints
`{"ok": false, "error": …, "code": …, "fix": …}` under `--json` when there's no result to give.

**Errors.** Every error names the thing, says what's wrong and ends with the fix, as a command where there is one:
`No film called "launch" in this studio. Films: hello, smoke. Make it with: filmkit new launch`. They come from one
catalogue, `src/errors.js`, each with a code; `filmkit explain <code>` says why it exists and how to fix it.

**Check findings** point at the frame: the format, the time, the element by its text, what it collides with, and the
snapshot that shows it:
`✗ content_overlap: 9x16 at 12.4 s: "Films are code" (#t) overlaps "Four frames" (#s). See it with: filmkit snapshot launch 9x16 --at 12.4`.
The rules a film often breaks (overlap, overflow, occlusion, contrast, the type floor, unread lines, dead stretches, an
empty first frame, no sound, the seam) are in the catalogue. Any other HyperFrames rule keeps HyperFrames' message and
fix hint, at the film's own file and line. `filmkit explain` answers for those from the pinned HyperFrames' skill
references once npx has fetched it, or else says which kind of check it is.

**The theme's contrast** is checked once per film, before the formats: on each of the theme's grounds, its text and
muted text against WCAG AA's 4.5:1 and its accent against 3:1 (the accent word is display type), with the colours that
ground gets (on `paper`, `text.onPaper`, `text.mutedOnPaper` and `accentOn.paper`). It warns, and gives a colour that
passes:
`⚠ theme_contrast: The theme's accent #e3ef26 on the paper ground (#ffffff) is 1.26:1, under WCAG AA's 3:1 for display type. Set accentOn.paper in filmkit.json's "theme" to a colour that passes, such as: #949b19`.
The rendered frames' contrast (`contrast_aa_failure`) fails the check: that's the text really on screen, at its size.

HyperFrames runs through `npx` at one pinned version (`src/hyperframes.js`), with telemetry off and
`HYPERFRAMES_SKIP_SKILLS` set.
