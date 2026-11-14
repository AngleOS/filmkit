---
name: gif-from-render
description: A GIF made from a filmkit MP4 renders every frame anew (the MP4's noise), so a mostly still film comes out megabytes; mpdecimate first, and -final_delay to keep the last hold
metadata:
  type: project
---

ffmpeg's GIF encoder only saves bytes on pixels that didn't change, and an H.264 render's noise changes them all, so a
36 s terminal film made a 3 MB GIF. Put `mpdecimate=hi=512:lo=256:frac=0.5` after `fps=` with `-fps_mode vfr`: it
fell to 0.7 MB. mpdecimate also drops the last frame's hold, so add `-final_delay <centiseconds>` (the recipe is in
`examples/studio/films/setup/brief.md`). Rows printing one at a time scroll the whole window each time: print a
screen at once, as the CLI does.
