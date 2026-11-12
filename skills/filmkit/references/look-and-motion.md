# Look and motion

The kit's scenes already follow these rules. Your own compositions must follow them too, so a film looks like one
piece. The brand comes from the studio's theme (`filmkit.json`); never hard-code a colour or a font in a film.

## Colour
- **One ground per beat**, from the theme's grounds (`ink`, `paper`, `accent-dark`, …). The main ground carries most
  of the film; the others are for a beat each.
- **The accent is scarce:** one word per title (`*word*` in a title's text), the motif, the logo and the primary
  button. Nothing else.
- **Light product shots** sit on `paper`.
- **Other apps** (a problem beat) use the grey UI: no brand, no accent, no real product's look.

## Type
- **Display font, semibold, tight tracking** for titles; the UI font for UI; mono for code. All three come from the
  theme.
- **Never under 28 px** at 1080 width, the smallest a phone can read.
- **Statements:** 110–140 px in 9:16; at least 80 px in 4:5 and 72 px in 1:1. Secondary lines at least 60, 48 and
  44 px.
- **Short cards.** About 8 words at most. Write the line breaks into the copy (`\n`); don't leave them to the wrap.
- **Build type per word,** about 0.07 s apart, and hold a card 1.15–1.5 s after its last word lands
  ([type](research/launch-video-type.md)).

## Product UI
- **Rebuild it,** never record the screen. Use the product's tokens at about 1.7× and the labels in its code.
- **Show only what exists.** No invented buttons, no live prices, speeds or start times unless they were read on the
  day of the cut.
- **Crop tight** to the part that matters, and put it in `AL.stage` under a title placed at the top.
- **The cursor** is big enough to see, aims at the end of a control so it doesn't cover the label, and presses
  visibly.
- **Nothing decorative moves on UI.** No floating, no wobble.

## Motion
- **Arrivals:** `expo.out` over 0.5–0.7 s. Exits mirror them, faster.
- **Words blur in** from 6 px to 0, 0.07 s apart.
- **Typing:** prompts at 15 chars/s, so they can be read. Replies stream at about 160 chars/s.
- **A press:** scale to 0.84 over 0.1 s, back over 0.22 s.
- **A reveal's pieces meet with no bounce.** The hit sound lands on the frame they meet: up to one frame late, never
  early.
- **No dead cuts.** On a cut, the outgoing scene is still moving, or the new one acts within 0.3–0.4 s
  ([cuts](research/launch-video-cuts.md)).
- Use the kit's helpers (`KM`): title entrances (blur, rise, ink, none), typing, streaming, the cursor, the motif and
  the logo reveal. Don't hand-roll what they already do.

## Formats and safe zones
One master; each format is laid out for its own frame with `AL.pick({L, S, V})`. Never crop.

| Format | Size | Mode | Keep words and the key action inside (`AL.safe`) |
|---|---|---|---|
| 16:9 | 1920 × 1080 | L | 5 % on every side |
| 1:1 | 1080 × 1080 | S | 64 px on every side |
| 4:5 | 1080 × 1350 | S | 64 px at the sides, 96 px top and bottom |
| 9:16 | 1080 × 1920 | V | top 270, right 120, bottom 420, left 64 px: clear of the feeds' header, buttons and caption block |

- **9:16 is not 16:9 rotated.** Stack the statement above the product; put the content's weight around y ≈ 885, not
  the frame's centre; don't leave the bottom 40 % empty. Type and UI run 1.3–1.5× their 16:9 size.
- **1:1 and 4:5 are tight.** Shorter lines, fewer columns. A chart's legend goes under it, not beside it.

## Captions
- **Sidecar files by default.** The `captions` scene draws nothing; `render` writes its lines to `<film>.srt` and
  `.vtt`, uploaded as closed captions. Burned-in captions repeat the big type and distract.
- **The film reads muted from its own type.** Every point is on screen as a title, not only in the captions.
- **`burn`** puts the captions in the picture, inside `AL.captions`, only when the owner asks for it.

## Hook loops
- **9:16 only, silent, 6–12 s.** The root has `data-formats="9x16"` and `data-loop="true"`, and `check` runs the seam
  gate.
- **Frame 0 is the poster:** the hook line is already on screen (`"entrance": "none"`) and names the product.
- **Return to frame 0 through an action** (a cut back to the start state, an undo), then hold still across the seam.
  Text is fully on or fully off there.
- **The returning state is its own layer.** A `fromTo` late in a timeline renders its from-state at frame 0 and blanks
  the poster.
- **Or keep moving at one speed:** a cycle whose frame at the end would be frame 0 (a dot once round a ring) carries
  on across the seam. The gate passes a seam step up to 1.5 × the median step at the ends.
- **`check`'s `line_unread` on a loop's first and last lines counts one side of the seam only,** though the line is on
  screen on both. Give the returning line 2 s anyway, and the warning stays quiet.

See [formats](research/launch-video-formats.md) for the measured rules behind loops and vertical cuts.

## Sound
Sound is made from the motion in `sound.json`: cues on what moves (impact, tick, whoosh, type), over a tonal pad,
mastered to −19 LUFS and −1 dBTP. No licensed music. Take something away just before the big reveal. See
[sound from motion](research/sound-from-motion.md) and [sync](research/sound-motion-sync.md).
