# The filmkit CLI

`filmkit` works on the studio: the nearest directory with a `filmkit.json`, walking up from the current directory, or
the one `--studio <dir>` names.

```
filmkit.json        { "formats": ["16x9", "9x16", "1x1", "4x5"], "theme": "default" }
films/<name>/       index.html (the master), compositions/ (the film's own scenes), assets
build/              git-ignored: build/<film>/<format>/, rebuilt on every run; never edit it
renders/            git-ignored: <film>-<format>.mp4, <film>.srt and .vtt, <film>-<format>.png stills
```

| Command | What it does |
|---|---|
| `check <film> [formats…]` | assembles each format and runs `hyperframes check` on it, listing each format's errors and warnings |
| `snapshot <film> [format] [--at t,t,…] [--frames n]` | PNG frames and a contact sheet of one format, in `build/<film>/snaps-<format>/` |
| `contact <film> [formats…] [--every 2s \| --at t,t,…]` | a contact sheet per format, `build/<film>/contact-<format>.png`: frames tiled within 2048 px, each labelled with its format and time; with no times, each scene 0.7 s after it starts (at most 48 frames) |
| `preview <film> [format]` | HyperFrames Studio on one format |
| `render <film> [formats…]` | `check`, then `renders/<film>-<format>.mp4` at delivery quality, plus the captions |
| `captions <film>` | only the captions: `renders/<film>.srt` and `.vtt` |
| `stills <film> <t> [formats…]` | `check`, then a poster per format at `t` seconds, `renders/<film>-<format>.png`, and a 1280 × 720 `renders/<film>-thumbnail.png` from 16x9 |
| `doctor` | Node ≥ 20, ffmpeg, the pinned HyperFrames and its Chrome, each with a hint when it's missing |

**Formats.** 16x9 (1920 × 1080), 9x16 (1080 × 1920), 1x1 (1080 × 1080) and 4x5 (1080 × 1350). With none named, a
command works on the film's own (its root's `data-formats`, such as a vertical hook's `"9x16"`), else the studio's.
`snapshot` and `preview` take the first. `contact` needs ffmpeg on the PATH.

**Assembly.** Each format is a HyperFrames project in `build/<film>/<format>/`: the film, a copy of the kit
(`kit/layout.js`, `kit/motion.js`, `kit/film.css`, `kit/scenes/`), GSAP as `kit/vendor/gsap.min.js` and the theme as
`kit/theme/`, with the root composition's `data-width` and `data-height` set for the format. A film's head loads
`kit/vendor/gsap.min.js`, `kit/theme/theme.css` and `kit/film.css`, and its body ends with `kit/layout.js`,
`kit/motion.js` and `kit/theme/brand.js`: see `examples/studio/films/smoke`.

**Captions.** The `captions` scene is the film's caption track: one host spanning the film, with `lines` as
`start-end text`, one per line, in seconds of the scene. `render` and `captions` write them, moved to the film's time,
as `renders/<film>.srt` and `.vtt`: one pair serves every format, to upload as closed captions. A film with no captions
scene gets no files. With `burn` the scene also draws them into the picture, in `AL.captions`.

**Output.** Every command prints what it wrote. With `--json` it prints one JSON object on stdout, in the shapes in
`kb/Interfaces.md` (`captions` and `stills` as the MCP tools of the same name, `doctor` as
`{ ok, checks: [{ name, ok, detail, hint? }] }`), with absolute paths; progress and HyperFrames' own output go to
stderr. Global options (`--json`, `--studio`) may come before or after the command. Nothing prompts.

**Exit codes.** `0` ok, `1` the film failed a check, `2` a usage error (no studio, an unknown film, format or option),
`3` a missing requirement (`doctor` says which), `4` a render, snapshot, contact sheet or still failed. A failure prints
`{"ok": false, "error": …}` under `--json` when there's no result to give.

HyperFrames runs through `npx` at one pinned version (`src/hyperframes.js`), with telemetry off and
`HYPERFRAMES_SKIP_SKILLS` set.
