# Brief: "Setup" (example studio, the README's install GIF)

**Audience:** someone on the README deciding whether to install Filmkit.

**Promise:** one command takes you from nothing to a first film, and it asks before it does anything.

**Format:** 16:9 only, about 37 s, silent: it's read as a GIF on GitHub (`docs/assets/setup.gif`).

## Beats
| # | t (s) | Picture | On screen |
|---|---|---|---|
| 0 | 0–2.4 | A terminal; the command types. | `$ npx -y filmkit setup` |
| 1 | 2.4–6 | The ANGLE FILMKIT banner, the requirements ticked, and the agent tools it found, all selected. | Requirements · Agent tools |
| 2 | 6–10 | Each tool registered; the brand's name typed and the studio's folder taken as offered. | Studio |
| 3 | 10–24 | The brand by its questions: no website, the logo kept, an accent typed, a dark ground; the brand's still, and yes. | Brand |
| 4 | 24–36.6 | Yes to a first film; it's checked in each format, and setup says what to ask the agent next. | First film |

The rows are `filmkit setup`'s own, captured in a 100-column terminal on 2026-11-13 with three agent tools
installed. The paths are a made-up user's, and the check's few minutes are cut to two seconds.

## The GIF
Render the film from a copy of the studio, then:
`ffmpeg -i renders/setup-16x9.mp4 -vf "fps=12,mpdecimate=hi=512:lo=256:frac=0.5,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -fps_mode vfr -final_delay 400 -loop 0 setup.gif`.
`mpdecimate` drops the frames that only differ by the MP4's noise, which would otherwise make every frame new; the
final delay gives back the last frame's hold, which it drops too.
