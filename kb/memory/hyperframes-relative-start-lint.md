---
name: hyperframes-relative-start-lint
description: HyperFrames 0.8.186 lint misreads id-relative data-start ("intro") as 0 and warns subcomposition_blanks_before_host
metadata:
  type: project
---

In HyperFrames 0.8.186, a host whose `data-start` names another clip (`data-start="intro"`) is linted as if it started
at 0, so `check` warns `subcomposition_blanks_before_host` for every one of them, though the film plays right. Numeric
starts lint clean, so kit examples and templates use numbers.

**Why:** the warnings bury real ones in `check` output, and agents chase them.
**How to apply:** write numeric `data-start` in examples, templates and the smoke film; treat this warning on a
relative start as noise until the pin moves.
