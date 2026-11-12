---
name: ffmpeg-without-drawtext
description: Homebrew's ffmpeg 8 has no drawtext filter, so filmkit draws text into images itself (contact sheet labels)
metadata:
  type: project
---

Homebrew's ffmpeg 8.1 (ca-macbook-pro, 2026-11-12) is built without freetype, so it has no `drawtext` filter. Many
users' ffmpeg will be the same. `tile`, `xstack`, `overlay` and `scale` are there.

**Why:** a filter graph with `drawtext` fails outright on those machines.
**How to apply:** never put text into a picture with ffmpeg. Draw it in JS, as `src/build/contact.js` draws the contact
sheet labels (a 5×7 bitmap font onto a PGM canvas, with frames overlaid), or in a HyperFrames composition.
