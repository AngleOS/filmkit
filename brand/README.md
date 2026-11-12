# Angle Filmkit's own brand

The assets Angle Filmkit uses to present itself:
- `films/hero`: the hero still (`docs/assets/hero.png`, also the social preview image). It's a film like any other:
  the ANGLE lockup with FILMKIT, the promise, and the four frames one master becomes.
- `films/teaser`: the hero in motion, 7 s, 16:9 and silent. It becomes the README's GIF (`docs/assets/teaser.gif`):
  `ffmpeg -i renders/teaser-16x9.mp4 -vf "fps=24,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 teaser.gif`

These films use the `angle` theme (`themes/angle/`). Until Filmkit's own pipeline lands (#3), the hero was rendered
with the kit it came from (`AngleOS/angle-ai` `marketing/video`, `./video.sh stills filmkit-hero 0.5`). Afterwards,
render it with `filmkit stills hero 0.5`.

The Angle name and logo are trademarks: see `TRADEMARKS.md`.
