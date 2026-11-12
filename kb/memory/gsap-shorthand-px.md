---
name: gsap-shorthand-px
description: gsap.set leaves a bare number on padding and gap unset; pass px strings
metadata:
  type: project
---

`gsap.set(el, { padding: 34, gap: 24 })` (GSAP 3.14.2) applied neither: the cards scene's first contact sheets
showed cards with no padding and no gap between them (2026-11-12), while `width`, `top` and `fontSize` as numbers
worked. `padding: "34px"`, `gap: "24px"` work.

**Why:** nothing errors; the layout is just wrong, and only a contact sheet shows it.
**How to apply:** pass shorthand CSS properties (`padding`, `margin`, `gap`, `inset`) to gsap as px strings.
