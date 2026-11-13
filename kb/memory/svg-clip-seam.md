---
name: svg-clip-seam
description: Chrome antialiases an SVG clip-path per shape, so a logo cut in two with clip-path shows its lower shapes as a hairline along the cut; mask the halves and overlap them instead
metadata:
  type: project
---

Cutting a logo into two halves that meet (the `default` theme's lockup, 2026-11-12): with `clip-path` on each half's
`<g>`, Chrome (HyperFrames' headless shell) clips every shape on its own with antialiasing, so where a dark shape lies
over an orange one, the orange shows as a thin line along the cut. Two clipped halves that meet exactly also leave a
faint seam between them.

**Why:** a clip is applied per painted shape; a mask is applied to the group once it's composited.

**How to apply:** cut with `<mask maskUnits="userSpaceOnUse">` and a white polygon, and let one half reach a quarter
unit over the cut so its antialiased edge lies on the other half's solid fill. Zoom a snapshot to check: render an
`<img>` of the PNG with `image-rendering: pixelated` in the headless shell (`--screenshot`) when there's no image tool.
