---
name: gsap-shorthand-px
description: gsap.set leaves a bare number on padding, gap and max-width unset; pass px strings
metadata:
  type: project
---

`gsap.set(el, { padding: 34, gap: 24 })` (GSAP 3.14.2) applied neither: the cards scene's first contact sheets
showed cards with no padding and no gap between them (2026-11-12), while `width`, `top` and `fontSize` as numbers
worked. `padding: "34px"`, `gap: "24px"` work. `maxWidth: 776` was dropped the same way (the chat scene's bubble
ran out of the safe box in 9:16, 2026-11-13): GSAP takes a number's unit from the computed value, and where that's a
keyword (`none`, `normal`, an empty shorthand) there is none to take.

**Why:** nothing errors; the layout is just wrong, and only a contact sheet shows it.
**How to apply:** pass shorthand CSS properties (`padding`, `margin`, `gap`, `inset`) and `max-`/`min-` sizes to gsap
as px strings; test/scenes.test.js checks kit scenes and the example films' compositions.
