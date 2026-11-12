---
name: composition-variables-quoting
description: an apostrophe in a data-composition-variables label ends the single-quoted attribute and breaks the scene's JSON
metadata:
  type: project
---

`data-composition-variables` and `data-variable-values` are JSON inside a single-quoted HTML attribute, so an
apostrophe in a label, description or value ("the film's length") ends the attribute early. HyperFrames 0.8.186 then
fails `check` with `invalid_composition_variables_declaration: … Unterminated string`, pointing at the JSON, not the
quote (found 2026-11-12 on the loop example's orbit composition).

**Why:** the error reads like a JSON typo, and agents hunt for a missing brace.
**How to apply:** write labels without apostrophes, or as `&#39;`; when that error appears, look for a `'` first.
