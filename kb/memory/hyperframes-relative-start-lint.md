---
name: hyperframes-relative-start-lint
description: HyperFrames 0.8.186 lint warns subcomposition_blanks_before_host on every host when id-relative data-starts chain
metadata:
  type: project
---

In HyperFrames 0.8.186, chained id-relative starts (`data-start="b"` where `b` itself has `data-start="a"`) make
`check` warn `subcomposition_blanks_before_host` on every host of the same scene file, numeric starts included, though
the film plays right. A single relative start lints clean, and so do numeric starts (checked 2026-11-12 on the smoke
film).

**Why:** the warnings bury real ones in `check` output, and agents chase them.
**How to apply:** write numeric `data-start` in examples, templates and the smoke film; treat this warning as noise
when the starts chain, until the pin moves.
