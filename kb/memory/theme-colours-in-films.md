---
name: theme-colours-in-films
description: A film sees only theme.css's custom properties (no --destructive or other shadcn tokens), and *accent* marks one word, not a phrase
metadata:
  type: project
---

A film's compositions see only the custom properties `kit/theme/theme.css` compiles: grounds (`--ink`, `--paper`,
`--accent-dark`…), `--accent`, `--foreground`, `--muted-foreground`, fonts and `--code-*`, plus film.css's `--fk-*`.
A theme's `tokens.css` (the angle theme's `--destructive`, `--caution`…) is copied into the build but no film links
it, so `var(--destructive)` is unset and a border in it vanishes. There is no error colour: a flag takes the accent.

`KM.wordSpans` accents single words: `*another round.*` lights nothing, since neither half is wrapped in asterisks
on its own. Mark one word.

**Why:** found building films-are-code (#12): its review flag was invisible, and a two-word accent from the brief lit
nothing.
**How to apply:** use only theme.css's properties in a composition, and check a flag or highlight on a contact sheet.
