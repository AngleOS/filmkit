# Sound

A film's sound is made from its picture, with no licensed music. It is dry foley on what moves, over a tonal chord
pad, mastered to −19 LUFS integrated, under −1 dBTP true peak. You write `films/<film>/sound.json`, which places every
sound in its scenes' own time:

```json
{ "key": 73.42, "bed": -12,
  "cues":    [{ "id": "hit", "kind": "impact", "scene": "endcard", "at": 2.7, "x": 960, "y": 520, "w": 380, "h": 90 }],
  "chords":  [{ "scene": "endcard", "at": 2.7, "until": 6, "notes": [62, 66, 69, 74, 76, 81], "sub": 50, "level": -5 }],
  "blooms":  [{ "scene": "endcard", "at": 2.7, "db": 9 }],
  "pockets": [{ "scene": "endcard", "at": 1.9, "until": 2.7 }] }
```

`examples/studio/films/smoke/sound.json` scores every kit scene.

## Where a sound goes
- `scene` is a host's `id` in `index.html`, and `at` is seconds into that scene. Chords and pockets end at `until`,
  also in the scene's time. The scene's start is read from the master, including relative starts such as
  `"chat + 0.5"`, so moving or retiming a scene moves its sound with it.
- A row without `scene` keeps an absolute `t` (and `end`), in seconds of the film.
- Put a reveal's hit on the frame its pieces meet: the `mark` scene's `contact`, or 2.7 s into an `endcard` with a
  claim (1.0 without one). Sound may land up to one frame late, never early. `npx hyperframes@0.8.186 audio` in
  `build/<film>/<format>/` lists where the hits landed.

## The rows
- **`cues`**: the foley, one gesture each. The renderer is the vendored `kit/sound/vendor/sound-sheet.mjs`, and its
  header documents every field. A cue's kind is one of `click`, `thud`, `type`, `flicker`, `land`, `tick`, `whoosh`,
  `air`, `success`, `error`, `riser`, `impact`, `sting`, `ding`, `pop` or `zip`. Its geometry, in the master's
  1920 × 1080 pixels, sets the sound:
  - size (`w` × `h`) sets the pitch and decay: big things land low and long, small things tick high and short;
  - `x` sets the stereo pan;
  - `y` sets the brightness;
  - `dir` sets a whoosh's contour.

  Optional fields: `gain` (dB), `pitch` (Hz), `dur` and `apex` (where a move is fastest, 0–1), and a run of `n` hits
  `every` seconds apart, with `jitter` for typing and `step` (semitones) for dings and pops. A `riser` and a `zip`
  *end* on `at + dur`; every other kind puts its attack on `at`. Type faster than about 10 keys a second with one
  typing bed rather than a click per key.
- **`chords`**: the pad, which steps on the picture's act changes. `notes` are MIDI note numbers, and `sub` is an
  optional MIDI root for a sine sub. `level` is in dB (default −8), `cutoff` in Hz (3000) and `attack` in seconds
  (0.6). Each chord releases over 0.9 s into the next, and soft glass plucks play its upper tones.
- **`blooms`**: the sub swells by `db` at a moment, a reveal, and fades over about a second.
- **`pockets`**: spans where the glass plucks rest while the picture holds still, before a reveal.
- **`key`**: the tonic in Hz, which tunes the tonal cues (`ding`, `sting`, the `impact`'s sub) to the pad.
- **`bed`**: the pad's level under the foley, in dB (default −12). Set it by ear: typing clicks should peak about
  4 dB over the pad while a prompt types.

## How it's built
`check`, `render` and `preview` resolve `sound.json` against the master into `build/<film>/sound/score.json`. Then
they render the foley and the pad as WAVs, mix the pad `bed` dB under the foley (the foley itself stays dry: `bed`
never reaches sound-sheet, which would read it as a drone of its own), and master the mix with ffmpeg: a gain
to −19 LUFS, and a limiter that holds the hits to −3 dBTP. AAC overshoots a sharp hit by over a dB, and HyperFrames
turns the whole track down when its own AAC lands above −1 dBTP; the limiter leaves the rest of the mix as it is. The
result is `build/<film>/sound.m4a` (AAC, 48 kHz). Every format mounts it as
`<audio id="sound" src="sound.m4a">` spanning the film, unless the master already has an element with that `src`.

Both renderers are deterministic: the same score gives byte-identical WAVs. The sound is kept until the score changes,
because the pad takes about as long as the film to render. `check` prints the measured loudness and true peak, and
fails when the sound can't be built. A `sound.json` with no cues and no chords fails too, since there is nothing to
hear. A film without `sound.json` is silent.
