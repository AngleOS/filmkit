# Themes

A theme is the brand as data. The kit reads only its custom properties and its `KB`, so no brand lives in kit code
(D-007). Each build copies the studio's theme into `kit/theme/`.

- **`theme.css`**: the grounds (`--ink`, `--accent-dark`, `--paper`), the accent (`--accent`), the text colours
  (`--foreground`, `--muted-foreground`, and their `.on-paper` values), the fonts (`--font-display`, `--font-ui`,
  `--font-mono`) and the title type (`--title-weight`, `--title-tracking`), with `@font-face` rules for `fonts/`.
  The `code` scene's syntax colours are `--code-keyword`, `--code-string`, `--code-title`, `--code-number` and
  `--code-attr`, each with its `.on-paper` value; without them, keywords take the accent and the rest the text colour.
  The product UI (`kit/film.css`'s `fk-` components, the `chat`, `composer`, `terminal` and `ui` scenes) works out
  its surfaces and borders from the ground and text colours, so a theme needs nothing more for it.
- **`brand.js`**: sets `window.KB`, which draws the motif and the logo into a scene's own `<svg>`:
  - `motif(svg)` draws the motif across the frame (`AL.W` × `AL.H`) and returns its strokes in named groups, such as
    `{ rows, cols }`. Every stroke has `pathLength="1"`: the kit draws each group in, 0.1 s after the last.
  - `lockup(svg)` draws the logo and returns `{ mark, para, tri, word, wipe }`. `mark` holds the mark's two pieces:
    `para` arrives from the bottom left and `tri` from the top right, meeting along a 45° edge. `word` is the
    wordmark, clipped by `wipe`, a `<rect>` whose width the kit opens from 0 to 60 viewBox units.
  - `lockupBox(w, cy)` is the lockup's box at width `w`, centred across the frame on `cy`:
    `{ w, h, left, top, markCx, shift }`. `markCx` is the mark's centre from the box's left edge, and `shift` is how
    far the mark steps left as the wordmark wipes in. Both are in pixels.

  Give gradients and clip paths ids with a counter: a film can mount a scene more than once, and a gradient inside a
  scene that the runtime hides paints nothing.
- **`logo/`**: the logo as SVG files.

The `motif`, `mark` and `endcard` scenes call `KB`, and a film loads it with `<script src="kit/theme/brand.js">`
after `kit/motion.js`. The `default` theme draws a corner grid and a placeholder logo, "Your brand", in its accent.
