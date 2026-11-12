---
type: design
status: active
tags: [filmkit, templates]
updated: 2026-11-12
issues: [AngleOS/filmkit#8]
---
# Templates: the films `filmkit new --template` starts from

A template is a complete film that passes `check` in its formats as generated. It contains:
- `brief.md`: the brief template with the beats already filled in for this kind of film;
- `index.html`: kit scenes, with placeholder copy written as real sentences, never "Lorem ipsum";
- `sound.json` (once sound lands, #4);
- a captions scene, except in `poster`, a still.

`{{name}}` (the brand or product name, from `filmkit.json`) and `{{film}}` are filled in when it's created; the
promise is "{{name}}, in one *line.*" until the brief replaces it. Each template's copy shows the kind of line it
wants. The template's `claims.md` is appended to the studio's CLAIMS.md as the film's section, every placeholder row
⚑, so a film can't be posted with it. A template is a folder of `templates/` with an `index.html`; `templates/studio/`
holds the files `filmkit init` writes.

| Template | Length · formats | For | Beats (kit scenes) |
|---|---|---|---|
| `statement` | 12 s · all four | A single promise: a teaser, a sting, a first film | `motif` draws → `title` (blur): "{{name}}, in one *line.*" → `endcard` with `mark` |
| `explainer` | 40 s · all four | An argument carried by numbers | `title` (rise) "The problem, in one line." → `bars` (a comparison, sourced) → `counter` (the number that matters) → `cards` (three reasons) → `title` (ink) "What {{name}} does about it." → `endcard` |
| `product-demo` | 30 s · all four | Showing the product doing its job | `title` (head) over `ui` → `composer` or `terminal` typing the user's action → `chat` or `code` showing the result → `lower-third` naming the feature → `endcard` |
| `hook-loop` | 8 s · 9:16 · loop | A silent vertical hook that plays forever | frame 0 is the poster: `title` with `entrance: none` → one action (a `grid` filling, a `stat` ticking) → back to the poster state on its own layer (see the loop rules in [[projects/filmkit/Origins]]) |
| `poster` | 2 s still · all four | A thumbnail and per-format posters (`filmkit stills <film> 1.8`) | the `mark` lockup assembling over its motif, which settles back; one line at the head, at statement size (`title`, place `head`, entrance `none`) |

## Placeholder copy (written to be replaced, and to teach)
- **statement:** "{{name}}, in one *line.*", held over the motif (`data-hold`: the stillness is the point), then the
  end card's sting with "Now available · example.com". The brief explains that a statement is one idea and one
  accent word.
- **explainer:**
  - "Most teams ship X a week." with a bars example: 3 bars, labelled "Example data", and a source line reading
    "Replace with your source".
  - counter: "4×" with "what changes when …".
  - cards: "Faster", "Cheaper", "Yours", each with a one-line reason.
- **product-demo:** composer prompt "Make a launch film from brief.md", a chat reply streaming a three-step answer, and
  a lower third "{{name}} · Feature name".
- **hook-loop:** "{{name}}, in one *line.*", with a 6-of-10 `grid` lighting one by one.

## Each template's brief.md
It's the brief template from the skill (`skills/filmkit/references/brief.md`) with:
- this template's beats table filled in, with times;
- three example "on screen" lines;
- one line saying what to change first. For `explainer` that's "Replace the example data with your real numbers and
  their sources before anything else."

## Related
- [[projects/filmkit/Design]] · [[projects/filmkit/Experience]] · [[projects/filmkit/briefs/Films are code]]
