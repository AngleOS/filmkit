# Claims

Every word Angle Filmkit's films show, with the source a reviewer checks it against: one section per film. A ⚑ row
says what it waits on and holds back posting the film. The format and the rules are in
`skills/filmkit/references/claims.md`.

## films-are-code

The argument film. Capability lines are the README's, word for word or cut to their point; numbers are derived on
screen from them. No time-saved percentages, no "X% of marketers", no competitor names or logos.

| On screen | Kind | Source |
|---|---|---|
| Every change, another round. | claim | illustrative: the export rounds of an edited video |
| v3.mp4 · Monday · v4_final.mp4 · Wednesday · v7_final_FINAL.mp4 · Friday, 11:48 pm · Illustration · made-up file names | example | illustrative; the source line says so |
| One edit. Four exports. | claim | [D] one change × the four formats README.md renders ("16:9, 1:1, 4:5 and 9:16") |
| Exports for one change, by format · 16:9 · 1:1 · 4:5 · 9:16 · 1 · The four formats Filmkit renders (README) | chart | README.md, "You get 16:9, 1:1, 4:5 and 9:16 videos" |
| Exports for one change · 4 · 1 change × 4 formats · Derived: 1 change × 4 formats | number | [D] 1 change × 4 formats |
| A film that’s code changes like code. | claim | README.md, "you can diff and review a film like any code" |
| films/launch/index.html · $ git diff · @@ -14 +14 @@ · -"text":"Launch day is *Monday.*" · +"text":"Launch day is *Tuesday.*" | example | illustrative: a title scene's `text` variable, as films set it (`data-variable-values`, kb/Design.md §2) |
| One master. Four frames. | claim | README.md, "One master, four frames." |
| Launch day is Tuesday. · 16:9 · 1:1 · 4:5 · 9:16 | example | illustrative title; each frame re-laid, not cropped (README.md, "laid out for its own frame, never cropped") |
| It looks at its own frames. | claim | README.md, "looks at its own frames" |
| build/launch/contact-9x16.png · 9x16 0.7s · 9x16 5.2s · 9x16 8.4s · 9x16 11.2s | UI | `filmkit contact` writes `build/<film>/contact-<format>.png` (src/cli/commands/contact.js) and labels each frame `<format> <t>s` (src/build/contact.js) |
| source line under caption box · fixed: source line under caption box | example | illustrative review note; the check behind it is the chart box stopping above the captions (kit/layout.js `chart`) |
| Every word has a source. | claim | README.md, "Every word has a source." |
| One master, four frames. · README.md · Sound from the picture. · README.md · On npm as filmkit. · ⚑ not live yet · Three rows of the studio’s CLAIMS.md | example | illustrative ledger rows; the first two are README.md word for word, and the third is shown as flagged because it isn't true yet (README.md, "Filmkit isn't on npm yet") |
| Sound from the motion. No stock music. | claim | README.md, "Sound from the picture. Impacts, ticks and whooshes come from the motion … There's no licensed music." |
| Loudness, the whole film · −19 LUFS · −40 LUFS · 0 LUFS · Mastered to −19 LUFS (docs/sound.md) | number | docs/sound.md, "a gain to −19 LUFS"; `filmkit check films-are-code` measures −19 LUFS |
| Your agent makes the film. | claim | README.md, "Your AI agent makes the film." |
| Pre-alpha · MIT · angleos.github.io/filmkit | cta | README.md "Status: pre-alpha"; LICENSE (MIT); the site is live (D-009), read 2026-11-13 |
| ANGLE · Made with Angle Filmkit | brand | the `angle` theme's lockup and credit (themes/angle/theme.json) |
