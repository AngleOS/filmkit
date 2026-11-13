# Themes

A theme is the brand as data. The kit reads only its custom properties and its `KB`, so no brand lives in kit code
(D-007).

## Choosing one
`filmkit.json`'s `theme` is one of:

- **a built-in theme:**
  - `"default"`: Angle's look (the Night, Castleton and Paper grounds, the Pear accent, Geist and the lines motif) with
    the studio's own logo, `brand/logo.svg`, beside the studio's `name`;
  - `"paper"`: the same on a white ground, with Night type, a Pear second ground and a Castleton accent;
  - `"angle"`: Angle's own brand and lockup, for Angle's films;
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

## Your brand: `filmkit brand`
`filmkit brand` sets the studio's brand from its accent, its ground, its logo and its font, and changes only what
it's given:

```sh
npx filmkit brand --name Acme --logo ~/Downloads/acme.svg --accent '#ff5a1f'
npx filmkit brand --ground light   # the same accent, on white
npx filmkit brand --font 'IBM Plex Sans'
npx filmkit brand --from-url acme.com --ground light   # read from the website, the ground given
```

- `--from-url`: the brand's website, read for the logo, the accent, the ground and the font; a flag given beside it
  wins over what the site says. `brand` says what it found and what it didn't, so you can give the rest:
  - the logo: an SVG in the page's header (the one in a link home or named logo or brand), else the site's SVG icon
    (`<link rel=icon>`), else its Apple touch icon, else its `og:image` when that's a PNG;
  - the accent: a CSS custom property named for the brand, primary or accent colour, else the page's `theme-color`,
    else its pinned-tab colour, else the logo's commonest colour, passing over greys, near-black and near-white;
  - the ground: the page's background, from `--background` or `--bg` or the `body`'s, light or dark; a dark-scheme
    override doesn't count, as the site's own ground is the one people know;
  - the font: the first Google Fonts family the page or its CSS loads, else the `body`'s font, else its first
    `@font-face`, passing over code fonts. A family on Google Fonts is downloaded as `--font`'s is; one that isn't
    can't be copied, as its licence doesn't let it ship, so the theme keeps its type and `brand` names an open font
    like it to give as `--font`, where it knows one (Inter for Graphik or Helvetica, say).

  It reads the page, the stylesheets it links (up to 8, not Google's) and the logo, once each, and no other page.
  It asks `robots.txt` first and keeps to it, as `filmkit` or else as any agent, and sends one user agent,
  `filmkit (+https://github.com/AngleOS/filmkit)`, so a site can tell it apart.

- `--logo`: an SVG is copied as it is to `brand/logo.svg`, the mark the logo reveal and the end card draw (see
  [the studio's logo](#the-studios-logo)); a PNG is embedded in an SVG at its own size.
- `--accent` (a hex; quote it, since `#` starts a comment in a shell) and `--ground` (`dark` or `light`) make the
  palette. Without `--ground` it's the one the accent reads on best: dark for a bright accent, light for a deep one.
  Given one of the two, the other comes from the brand already written: its ground, and the brand's own accent, not
  one adjusted for text, so switching the ground back and forth never drifts the colour. On a first run, the accent is
  the studio's theme's, built-in, a folder or set in `filmkit.json`, else Pear.
- `--font`: a family from [Google Fonts](https://fonts.google.com), named as it spells it, for titles and text; code
  stays in Geist Mono. Google's fonts are all under open licences (OFL, Apache 2.0 or the Ubuntu Font Licence), so
  `brand` downloads the family's regular, medium, semibold and bold (those it has) into `brand/theme/fonts`, as
  `Inter-600.ttf` and so on, with its licence from [google/fonts](https://github.com/google/fonts) as `Inter-OFL.txt`,
  and writes them into the theme's `fonts`. Titles take the semibold, or the heaviest weight there is. The files are
  whole TrueType fonts, not subsets, so text in any script the family covers renders, and films never fetch a font
  while they render. The font stays when `brand` runs again without `--font`; another `--font` deletes the files the
  last one downloaded and replaces the theme's `fonts`. For a font that isn't on Google Fonts, put its files in
  `brand/theme/fonts` and name them in the theme's `fonts` yourself (see [a theme folder](#a-theme-folder)), keeping
  to fonts whose licence lets them ship: `--font` leaves those files alone, but a later `--font` rewrites `fonts`. (It
  knows its own files by the family the theme's `description` records, "--font last downloaded Inter from Google
  Fonts.", not by `fonts`, which may name a font added since.)
- `--name`: the studio's `name` in `filmkit.json`, set beside the mark, and the brand theme's label.

In a terminal, `filmkit brand` with none of these (the name aside) asks instead: the website first, then the logo, the
accent, light or dark and the font, each the site didn't give. For a site's font that Google Fonts doesn't have, the
font question starts from an open one like it. An empty answer keeps what the brand has. With the brand written, it
opens a still in it, the [poster](../templates/poster/index.html) template's mark and line in 16:9, at
`build/brand-still/still.png`, and asks whether it looks right; a no asks again, each question starting from the brand
the still showed. Given flags, it only shows the still and asks. `--yes`, `--json` or a pipe ask nothing, so an agent
runs it from flags alone; `setup` in a terminal asks the same questions as its brand step.

The palette is a theme folder, `brand/theme/theme.json`, over `default` on a dark ground or `paper` on a light one,
so the brand keeps Angle's motif, type and motion (D-007), and `filmkit.json`'s `theme` becomes `"brand/theme"`.
Single values `filmkit.json` set over its old theme, such as `"credit": false`, stay over the brand's, but its colours
give way to the brand's. The palette's colours are worked out from the accent:

| Ground | `ink` (main) | `accent-dark` (second) | `paper` | Text |
|---|---|---|---|---|
| dark | a near-black in the accent's hue | a deep shade of the accent | white | a near-white in the accent's hue |
| light | white | a pale tint of the accent | an off-white in the accent's hue | a near-black in the accent's hue |

Every colour is moved until it passes WCAG AA on each ground it's read on, so the theme passes `check`'s contrast
check as written. Text in the accent is held to 4.5:1, reading text's ratio, since the accent also colours captions
and buttons: where the brand's own colour falls short, the theme takes the nearest that passes, and `brand` says so
(`accentOn.paper is #cf4919: #ff5a1f is 3.11:1 on paper, under the 4.5:1 text needs`). Change any value afterwards in
`brand/theme/theme.json`, or run `brand` again.

## A theme folder
- **`theme.json`**, the values the kit reads:
  - `extends`: the theme this one is based on, a built-in name or a folder (from this one). Its values are the base,
    this file's go over them key by key, and its files are copied first, so a folder holds only what differs;
  - `grounds`: the fills a scene stands on. `ink` (the dark ground), `accent-dark` and `paper` are the ones the kit's
    scenes offer; a theme can name more, such as `jet`, but not a name the kit uses (`none`, `over-paper`, `accent`…). Each becomes a custom property, `--ink`, `--jet`…;
  - `accent`: one word per title, the motif, the mark. `accentOn.paper` is the accent on paper, when the accent doesn't
    read on it;
  - `text`: `ink` and `muted` on the dark grounds, `onPaper` and `mutedOnPaper` on paper, and `wordmark`, the
    wordmark's colour on the dark grounds (`ink` when not given). `filmkit check` warns when one of these is under
    WCAG AA on a ground it's read on (4.5:1 for `ink` and `muted`, 3:1 for the accent), and gives a colour that passes;
  - `code` and `codeOn.paper`: the `code` scene's syntax colours (`keyword`, `string`, `title`, `number`, `attr`).
    Without them, keywords take the accent and the rest the text colour. The product UI (`kit/film.css`'s `fk-`
    components, the `chat`, `composer`, `terminal` and `ui` scenes) works out its surfaces and borders from the ground
    and text colours, so a theme needs nothing more for it;
  - `fonts`: `display` (`family`, `weight`, `tracking`, `leading`: the title type), `ui` and `mono` (`family`), and
    `faces`, the font files in `fonts.dir` (`fonts` by default). Each folder's faces add to its base's, so a brand
    folder can bring its display face and keep the base's UI and mono;
  - `logo.mark`: the logo's mark, an SVG. The studio's own `brand/logo.svg` takes its place when there is one;
  - `credit`: the small line at the foot of every end card, "Made with Angle Filmkit" unless it's a line of the
    theme's own, or `false` for none. Turn it off in `filmkit.json`:
    `"theme": { "extends": "default", "credit": false }`;
  - `brand`, `tokens`, `motif` (`lines`, `grid`, `dots` or `none`), `logo`'s other files: the theme's other files and
    settings, for its `brand.js`.
- **`brand.js`**: adds to `window.KB` what draws the motif and the logo into a scene's own `<svg>`. Each folder's
  `brand.js` runs in turn, base first, so a folder can replace only the lockup and keep its base's motif, as `default`
  does over `angle`: `window.KB = { ...window.KB, lockup, lockupBox }`. The build starts `KB` with the studio's
  `name`, the `mark`'s SVG and the `credit`.
  - `motif(svg)` draws the motif across the frame (`AL.W` × `AL.H`) and returns its strokes in named groups, such as
    `{ rows, cols }`. Every stroke has `pathLength="1"`: the kit draws each group in, 0.1 s after the last.
  - `lockup(svg)` draws the logo and returns `{ mark, para, tri, word, wipe }`. `mark` holds the mark's two pieces:
    `para` arrives from the bottom left and `tri` from the top right, meeting along a 45° edge. `word` is the
    wordmark, clipped by `wipe`, a `<rect>` whose width the kit opens from 0 to 60 viewBox units.
  - `lockupBox(w, cy)` is the lockup's box at width `w`, centred across the frame on `cy`:
    `{ w, h, left, top, markCx, shift }`. `markCx` is the mark's centre from the box's left edge, and `shift` is how
    far the mark steps left as the wordmark wipes in. Both are in pixels.
  - `ready()`, optional, returns a promise the mark and endcard scenes wait for before they lay the lockup out. A
    lockup that measures its name in the display face, as `default`'s does, loads that face first: a scene lays out
    before the theme's fonts load.

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
| `--code-keyword`, `--code-string`, … | `code`; on paper, `codeOn.paper` (only the ones given) |

The values on paper are under `.on-paper`, the class a scene's paper ground sets. Never write a `theme.css` by hand:
the build replaces it.

It also writes `kit/theme/brand.js`: `window.KB` with the studio's name, the mark and the credit, then each folder's
`brand.js`, base first. The `motif`, `mark` and `endcard` scenes call `KB`, and a film loads it with
`<script src="kit/theme/brand.js">` after `kit/motion.js`.

## The studio's logo
In `default` and `paper`, the logo reveal is the studio's own: `brand/logo.svg` (which `filmkit init` writes as a
placeholder square) is the mark, and the studio's `name` from `filmkit.json` is set beside it in the display face. The
mark is cut on its diagonal and its two halves meet, as Angle's do. Draw the mark in `currentColor` to have it take the
accent (and the accent on paper), or in its own colours to keep them. Keep it square-ish: it fills a square the height
of the name.
