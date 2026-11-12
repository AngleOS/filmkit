# The filmkit CLI

`filmkit` works on the studio: the nearest directory with a `filmkit.json`, walking up from the current directory, or
the one `--studio <dir>` names.

```
filmkit.json        { "name": "Acme", "formats": ["16x9", "9x16", "1x1", "4x5"], "theme": "default" }
brand/              the logo and the brand's own files
films/<name>/       brief.md, index.html (the master), compositions/ (the film's own scenes), assets
CLAIMS.md           every word on screen, with its source; a ⚑ row holds back posting
POSTING.md          where each render goes, with its copy per platform
AGENTS.md           points an agent at the filmkit skill, in .claude/skills/filmkit/
build/              git-ignored: build/<film>/<format>/, rebuilt on every run; never edit it
renders/            git-ignored: <film>-<format>.mp4, <film>.srt and .vtt, <film>-<format>.png stills
```

| Command | What it does |
|---|---|
| `init [dir] [--name brand]` | a studio in `dir` (the current directory by default) for `brand` (the folder's name by default): `filmkit.json`, `brand/logo.svg`, `films/smoke` (every kit scene, to check the theme), `CLAIMS.md`, `POSTING.md`, `AGENTS.md`, the filmkit skill in `.claude/skills/filmkit/` and a `.gitignore` for `build/` and `renders/`. Files already there are kept, never overwritten |
| `new <film> [--template t]` | `films/<film>/` from a template, `statement` when none is named (the templates are in `kb/Templates.md`), with the brand's name filled in, and the template's placeholder lines appended to `CLAIMS.md` as ⚑ rows. Every template passes `check` as generated |
| `check <film> [formats…]` | assembles each format and runs `hyperframes check` on it, listing each format's errors and warnings, and a loop's seam gate |
| `snapshot <film> [format] [--at t,t,…] [--frames n]` | PNG frames and a contact sheet of one format, in `build/<film>/snaps-<format>/` |
| `preview <film> [format]` | HyperFrames Studio on one format |
| `render <film> [formats…]` | `check`, then `renders/<film>-<format>.mp4` at delivery quality, plus the captions |
| `captions <film>` | only the captions: `renders/<film>.srt` and `.vtt` |
| `stills <film> <t> [formats…]` | `check`, then a poster per format at `t` seconds, `renders/<film>-<format>.png`, and a 1280 × 720 `renders/<film>-thumbnail.png` from 16x9 |
| `doctor` | Node ≥ 20, ffmpeg, the pinned HyperFrames and its Chrome, each with a hint when it's missing |

**Formats.** 16x9 (1920 × 1080), 9x16 (1080 × 1920), 1x1 (1080 × 1080) and 4x5 (1080 × 1350). With none named, a
command works on the film's own (its root's `data-formats`, such as a vertical hook's `"9x16"`), else the studio's.
`snapshot` and `preview` take the first.

**Assembly.** Each format is a HyperFrames project in `build/<film>/<format>/`: the film, a copy of the kit
(`kit/layout.js`, `kit/motion.js`, `kit/chart.js`, `kit/film.css`, `kit/scenes/`), GSAP as `kit/vendor/gsap.min.js` and the theme as
`kit/theme/`, with the root composition's `data-width` and `data-height` set for the format. A film's head loads
`kit/vendor/gsap.min.js`, `kit/theme/theme.css` and `kit/film.css`, and its body ends with `kit/layout.js`,
`kit/motion.js`, `kit/chart.js` (for the infographic scenes) and `kit/theme/brand.js`: see
`examples/studio/films/infographics`.

**Loops.** A film whose root has `data-loop="true"` is a hook loop: it plays again from frame 0 as soon as it ends, so
its last frame has to flow into its first. `check` runs the seam gate on it in each format. It snapshots the first 9 and
the last 9 frames (30 fps) as PNGs into `build/<film>/seam-<format>/`, decodes them with ffmpeg at 480 px on the long
side, and measures each step as the mean absolute RGB change between neighbours. The format fails when the step from
the last frame back to frame 0 is over max(0.4, 1.5 × the median step at the ends): `seam` in the result gives the
`step`, the `median` and the `limit`. A film that moves across its seam passes when it keeps its speed; one that holds
still passes when nothing changes. The rules for making one are in
`skills/filmkit/references/look-and-motion.md` § Hook loops, and `examples/studio/films/loop` is one.

**Captions.** The `captions` scene is the film's caption track: one host spanning the film, with `lines` as
`start-end text`, one per line, in seconds of the scene. `render` and `captions` write them, moved to the film's time,
as `renders/<film>.srt` and `.vtt`: one pair serves every format, to upload as closed captions. A film with no captions
scene gets no files. With `burn` the scene also draws them into the picture, in `AL.captions`.

**Output.** Every command prints what it wrote. With `--json` it prints one JSON object on stdout, in the shapes in
`kb/Interfaces.md` (`init` as `{ ok, studio, name, files, kept }`, `new` as `{ ok, film, template, files }`, `captions` and `stills` as the MCP tools of the same name, `doctor` as
`{ ok, checks: [{ name, ok, detail, hint? }] }`), with absolute paths; progress and HyperFrames' own output go to
stderr. Global options (`--json`, `--studio`) may come before or after the command. Nothing prompts.

**Exit codes.** `0` ok, `1` the film failed a check, `2` a usage error (no studio, an unknown film, format or option),
`3` a missing requirement (`doctor` says which), `4` a render, snapshot or still failed. A failure prints
`{"ok": false, "error": …}` under `--json` when there's no result to give.

HyperFrames runs through `npx` at one pinned version (`src/hyperframes.js`), with telemetry off and
`HYPERFRAMES_SKIP_SKILLS` set.
