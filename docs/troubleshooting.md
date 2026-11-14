# Troubleshooting

Two commands answer most questions:

```sh
npx -y github:AngleOS/filmkit doctor                  # what's installed, and what to run for what isn't
npx -y github:AngleOS/filmkit explain text_occluded   # why a rule exists and how to fix it
```
Every error and every `check` finding has a code. `explain <code>` says why it exists and how to fix it, and
`explain` with no code lists every one of Filmkit's own. A finding also prints the command that shows its frame,
such as `filmkit snapshot launch 9x16 --at 4.2`.

## Setting up
- **"HyperFrames has no Chrome to render with."** HyperFrames plays each film in its own headless Chrome, fetched once.
  `doctor` gives the command that fetches it (`npx hyperframes@<pin> browser ensure`, about 2 minutes).
- **"npx couldn't fetch hyperframes."** The first run downloads the pinned HyperFrames, so it needs the network. After
  that it runs from npx's cache.
- **"ffmpeg isn't on the PATH"** or **"ffprobe isn't on the PATH".** Install ffmpeg's full package: `brew install
  ffmpeg`, `winget install --id Gyan.FFmpeg -e` or `sudo apt install ffmpeg`. A film checks without ffprobe but
  doesn't render.
- **Chrome won't start on Linux.** A server or container can lack the libraries Chrome needs, and HyperFrames' own
  doctor offers only a root `apt install`. Without root, `apt-get download` the packages it names, unpack each with
  `dpkg-deb -x <deb> /tmp/chrome-libs`, and run filmkit with
  `LD_LIBRARY_PATH=/tmp/chrome-libs/usr/lib/x86_64-linux-gnu`. Chrome for Testing has no Linux ARM64 build, so
  check and render on x64.
- **A render stops before it starts on a full disk.** HyperFrames won't render with less than about 1 GB free.

## The studio
- **"No filmkit.json in … or above, so there's no studio here."** Commands look for the nearest `filmkit.json` from the
  current directory up. `cd` into your studio, pass `--studio <dir>`, or make one with `init`.
- **"filmkit.json: theme.accent: "pear" should be a hex colour such as "#e3ef26"."** `filmkit.json` and every
  `theme.json` are checked against the schema whenever a command opens the studio. The message names the key and
  what it takes: see [themes](themes.md) and [the studio](studio.md#filmkitjson).
- **The theme's text is under WCAG AA on a ground.** `check` warns with the key to change and a colour that passes.
  `filmkit brand` makes palettes that pass as written.

## What `check` finds
Each format is laid out for its own frame, so a film that's clean in 16:9 can break in 9:16 or 1:1. Those two broke
most often in the films Filmkit came from: source lines against captions, legends against what's under them. Look at
the contact sheets of every format (`contact <film>`), not only the one you wrote it in.

- **Text overlaps, runs out of its box or out of the frame** (`content_overlap`, `text_box_overflow`,
  `canvas_overflow`). Give each block its own zone per frame with `AL.pick({ L, S, V })`, write the line breaks into
  the copy, or shorten the line.
- **Text is under the safe box** (`safe_zone`). Feeds lay their caption, buttons and progress bar over a film's foot.
  Keep words inside `AL.safe`; a lower third meant for the foot takes `data-layout-allow-caption-zone`.
- **Text is covered** (`text_occluded`). When the covering is meant, put `data-layout-allow-occlusion` on the
  **covered text**, not on what covers it: that's the element the pinned HyperFrames reads it on.
- **Text is too small** (`text_below_floor`). Nothing a viewer reads is under 28 px at 1080. Texture that isn't read
  takes `data-layout-ignore`.
- **A line isn't on long enough** (`line_unread`), or **nothing moves for 3 s** (`dead_stretch`). Hold a line about
  0.5 s plus 0.3 s a word; put `data-hold` on a scene that holds still on purpose.
- **Frame 0 shows only the ground** (`first_frame_empty`). Feeds show frame 0 as the poster: start with the hook line
  on screen (`"entrance": "none"`).
- **A loop's seam jumps** (`seam`). The last frame has to flow into frame 0: return to the start state through an
  action and hold still across the seam, or keep moving at one speed. A `fromTo` late in a timeline renders its
  from-state at frame 0, which blanks the poster, so put the returning state on its own layer.

## Writing a scene or composition
These don't error, or error far from their cause. A contact sheet shows most of them.

- **`check` says `invalid_composition_variables_declaration: … Unterminated string`.** `data-composition-variables`
  and `data-variable-values` are JSON inside a single-quoted attribute, so an apostrophe ("the film's length") ends
  the attribute. Leave it out or write `&#39;`.
- **A helper finds nothing.** Inside a scene, `document` and `gsap` are scoped to its mount. Pass the kit helpers
  elements, never selector strings.
- **A variable is undefined when a film mounts a scene twice.** HyperFrames 0.8.186 drops a scene's declared defaults
  then. Read variables with `AL.vars()`, which merges them back in.
- **A label draws behind its neighbour.** A bare text node next to a scaled element can paint in the wrong order. Keep
  every label in its own `<span>`.
- **Padding or a gap does nothing.** `gsap.set(el, { padding: 34 })` sets nothing, nor does a bare number on `gap`,
  `margin`, `inset` or a `max-`/`min-` size. Pass px strings: `padding: "34px"`.
- **Text measured in a scene is the wrong width.** A scene's script runs before the theme's fonts load, so
  `measureText` gets the fallback face. Measure after `document.fonts.load(face, text)` resolves.
- **A colour is missing.** A composition sees only the custom properties `theme.css` compiles (`--ink`, `--paper`,
  `--accent`, `--foreground`, `--muted-foreground`, the fonts, `--code-*`) and `film.css`'s `--fk-*`. There's no error
  colour: a flag takes the accent.
- **The accent lights nothing.** `*accent*` marks one word: `*another round.*` lights neither.
- **Your own script feeds a number to ffmpeg.** Agent harnesses set `FORCE_COLOR`, so `node -p` wraps numbers in
  colour codes. Use `node -e` with `process.stdout.write`.

## Renders
- **A render is identical every time.** Filmkit pins HyperFrames, and the sound's renderers are deterministic, so the
  same film renders the same MP4. `render` keeps an MP4 that's still current; `--force` redoes it.
- **No sound.** A film gets sound only from its `sound.json` ([sound](sound.md)); `check` warns about a film over
  15 s without one.
- **No captions in the picture.** That's meant: captions ship as `.srt` and `.vtt` beside the MP4, and the film reads
  muted from its own type.
