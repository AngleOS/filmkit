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
at the seam. See [Origins](../../../../kb/Origins.md) for the `fromTo` trap.

## Owner correction (2026-11-13): what the build changed
The brief is as the owner wrote it (`kb/briefs/Hook - the four frames.md`, 2026-11-12). The build changed these, for
the reasons given:
- **One accent word per title**, as the kit lights one: "Brief in. Film *out.*"
- **The four frames "line up" in the two rows they split into** (16:9 and 1:1 over 4:5 and 9:16). In one row across
  the 9:16 frame, the titles inside them would fall under 28 px.
- **Pear is the theme's accent.** A frame fills with it, and its title turns to the ground's ink so it still reads.
- **The lockup is the theme's ANGLE lockup with FILMKIT set beside it**, as on the README hero.
- **The seam:** the poster holds for 0.6 s before the split, and the folded-back frame holds from 7.3 s to the end.
- **Captions** are sidecar files for the three lines, written at render. The film has no `sound.json`, so it stays
  silent.
