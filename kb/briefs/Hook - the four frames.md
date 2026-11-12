---
type: brief
status: active
tags: [filmkit, brief, example-studio, hook]
updated: 2026-11-12
issues: [AngleOS/filmkit#12]
---
# Brief: "The four frames" (example studio, 9:16 hook loop)

**Audience:** someone scrolling a vertical feed with the sound off.

**Promise:** one master becomes four frames, by itself.

**Format:** 9:16 only, about 8 s, a **seamless loop**, silent (hooks are), with `data-loop` and the seam gate passing.

## Beats
| # | t (s) | Picture | On screen |
|---|---|---|---|
| 0 | 0 | **Poster frame:** the title already on screen (`"entrance":"none"`), with the ANGLE FILMKIT lockup small at the top. | **Your agent makes the *film.*** |
| 1 | 0–3 | Below the title, a 16:9 frame outline splits into 1:1, 4:5 and 9:16. The title inside each mini-frame re-lays itself. | |
| 2 | 3–6 | The four frames line up and fill with Pear, one after another. | **Brief in. *Film out.*** (it replaces the title, then gives way to it) |
| 3 | 6–8 | The frames fold back into the single 16:9 outline, and the title returns to its frame-0 state, on its own layer. | |

Follow the loop rules: come back through an action, hold still across the seam, and keep text fully on or fully off
at the seam. See [[projects/filmkit/Origins]] for the `fromTo` trap.
