# Themes

A theme is the brand as data. The kit reads only its custom properties and its `KB`, so no brand lives in kit code
(D-007).

## Choosing one
`filmkit.json`'s `theme` is one of:

- **a built-in theme:** `"angle"` (Angle's own brand) or `"default"`;
- **a theme folder in the studio:** `"brand/theme"`, a folder with a `theme.json` (a name with a slash or a dot is a
  folder, from the studio);
- **single values over either:** `{ "extends": "angle", "accent": "#ff5a1f" }`. Without `extends`, the values go over
  `default`.

```json
{ "name": "Acme", "theme": { "extends": "angle", "accent": "#ff5a1f", "text": { "muted": "#9aa59f" } } }
```

`filmkit.json` and every `theme.json` are checked against `schema/filmkit.schema.json` (its `$defs/theme`) whenever a
command opens the studio. A mistake is a usage error (exit 2) that names the key and what it should be:
`filmkit.json: theme.accent: "pear" should be a hex colour such as "#e3ef26"`.

## A theme folder
- **`theme.json`**, the values the kit reads:
  - `extends`: the theme this one is based on, a built-in name or a folder (from this one). Its values are the base,
    this file's go over them key by key, and its files are copied first, so a folder holds only what differs;
  - `grounds`: the fills a scene stands on. `ink` (the dark ground), `accent-dark` and `paper` are the ones the kit's
    scenes offer; a theme can name more, such as `jet`. Each becomes a custom property, `--ink`, `--jet`…;
  - `accent`: one word per title, the motif, the mark. `accentOn.paper` is the accent on paper, when the accent doesn't
    read on it;
  - `text`: `ink` and `muted` on the dark grounds, `onPaper` and `mutedOnPaper` on paper, and `wordmark`, the
    wordmark's colour on the dark grounds (`ink` when not given);
  - `fonts`: `display` (`family`, `weight`, `tracking`, `leading`: the title type), `ui` and `mono` (`family`), and
    `faces`, the font files in `fonts.dir` (`fonts` by default). Each folder's faces add to its base's, so a brand
    folder can bring its display face and keep the base's UI and mono;
  - `logo`, `brand`, `tokens`, `motif` (`lines`, `grid`, `dots` or `none`), `credit`: the theme's other files and
    settings, for its `brand.js`.
- **`brand.js`**: sets `window.KB`, which draws the motif and the logo into a scene's own `<svg>`:
  - `motif(svg)` draws the motif across the frame (`AL.W` × `AL.H`) and returns its strokes in named groups, such as
    `{ rows, cols }`. Every stroke has `pathLength="1"`: the kit draws each group in, 0.1 s after the last.
  - `lockup(svg)` draws the logo and returns `{ mark, para, tri, word, wipe }`. `mark` holds the mark's two pieces:
    `para` arrives from the bottom left and `tri` from the top right, meeting along a 45° edge. `word` is the
    wordmark, clipped by `wipe`, a `<rect>` whose width the kit opens from 0 to 60 viewBox units.
  - `lockupBox(w, cy)` is the lockup's box at width `w`, centred across the frame on `cy`:
    `{ w, h, left, top, markCx, shift }`. `markCx` is the mark's centre from the box's left edge, and `shift` is how
    far the mark steps left as the wordmark wipes in. Both are in pixels.

  Colour it with the custom properties (`--brand-mark`, `--brand-word`, `--brand-line`, `--accent`), never literals,
  so `.on-paper` restyles it. Give gradients and clip paths ids with a counter: a film can mount a scene more than
  once, and a gradient inside a scene that the runtime hides paints nothing.
- **`fonts/`** and **`logo/`**: the files `theme.json` names.

## What the build does
Each build copies the theme's folders into `kit/theme/`, base first, and writes `kit/theme/theme.css`, compiled from
the merged `theme.json`: an `@font-face` per face, then

| Custom property | From |
|---|---|
| `--ink`, `--accent-dark`, `--paper`, … | `grounds` |
| `--accent` | `accent`; on paper, `accentOn.paper` |
| `--foreground`, `--muted-foreground` | `text.ink`, `text.muted`; on paper, `text.onPaper`, `text.mutedOnPaper` |
| `--font-display`, `--font-ui`, `--font-mono` | `fonts.display.family`, `fonts.ui.family`, `fonts.mono.family` |
| `--title-weight`, `--title-tracking`, `--title-leading` | `fonts.display` (600, -0.035em and 1.02 when not given) |
| `--brand-mark`, `--brand-line` | the accent, on paper too |
| `--brand-word` | `text.wordmark`; on paper, `text.onPaper` |

The values on paper are under `.on-paper`, the class a scene's paper ground sets. Never write a `theme.css` by hand:
the build replaces it.

The `motif`, `mark` and `endcard` scenes call `KB`, and a film loads it with `<script src="kit/theme/brand.js">`
after `kit/motion.js`. The `default` theme draws a corner grid and a placeholder logo, "Your brand", in its accent.
