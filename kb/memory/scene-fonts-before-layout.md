---
name: scene-fonts-before-layout
description: A HyperFrames scene's script runs before the theme's web fonts load, so text measured there (canvas measureText) gets the fallback face's width
metadata:
  type: project
---

A kit scene's `<script>` runs as HyperFrames mounts it, before the theme's `@font-face` files have loaded:
`document.fonts.check(font)` is false there, and a canvas `measureText` gives the fallback face's width. Default's
lockup measured the studio's name that way, and a long name ("basecamp") was cut at the lockup's edge. HyperFrames
waits for `document.fonts.ready` before it captures, and its runtimes reference allows building the timeline inside an
async callback as long as `window.__timelines[id]` is registered at the end of it.

**Why:** found making `filmkit brand`'s still (2026-11-13, #22 slice 4); chart.js already guessed an upper bound for
the same reason.

**How to apply:** measure text only after `document.fonts.load(face, text)` resolves; the mark and endcard scenes build
inside `KB.ready()`, which a theme's brand.js may define. Related: [[gsap-shorthand-px]].
