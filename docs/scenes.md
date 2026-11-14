# Scenes

<!-- Generated from kit/scenes/ by `npm run docs`: edit the scenes, not this page. -->

The kit's scenes, each read from its own comment and `data-composition-variables`, as `filmkit scenes <name>` prints
them. A film mounts a scene with `data-composition-src` and sets its variables with `data-variable-values`; a
variable it leaves out keeps its default:

```html
<div id="compare" data-composition-id="compare" data-composition-src="kit/scenes/bars.html" data-start="2.8"
  data-duration="4.4" data-track-index="1" data-track-kind="graphics"
  data-variable-values='{"data":"2024: 2\n2025: 3\n2026: 5","highlight":"2026"}'></div>
```

[`bars`](#bars) · [`captions`](#captions) · [`cards`](#cards) · [`chat`](#chat) · [`code`](#code) · [`composer`](#composer) · [`counter`](#counter) · [`endcard`](#endcard) · [`grid`](#grid) · [`lower-third`](#lower-third) · [`mark`](#mark) · [`mesh`](#mesh) · [`meter`](#meter) · [`motif`](#motif) · [`stat`](#stat) · [`terminal`](#terminal) · [`timeline`](#timeline) · [`title`](#title) · [`ui`](#ui)

## bars
A bar chart drawn to scale: vertical bars over their labels, or horizontal bars under theirs. Each value rolls up as its bar grows; one bar can take the accent, and a dashed reference line (a cap, a target, last year) is drawn first, so the bars rise to meet it. Sits in AL.chart, under a title placed at the top.

- `data` (string): Bars, one "label: value" a line

  Default:
  ```
  2022: 1200
  2023: 1900
  2024: 2600
  2025: 3700
  ```

- `direction` (enum, default `"vertical"`): Direction
  - one of `vertical` (Vertical bars over their labels), `horizontal` (Horizontal bars under their labels)
- `highlight` (string, default `""`): The bar in the accent (its label; empty for none)
- `prefix` (string, default `""`): Before each value, such as $
- `suffix` (string, default `""`): After each value, such as % or /mo
- `decimals` (number, default `0`): Decimal places
- `format` (enum, default `"grouped"`): Number format
  - one of `grouped` (Grouped: 12,345), `plain` (Plain: 2026), `compact` (Compact: 12.3K, 4.5M)
- `axis` (string, default `""`): What the values measure, over the chart
- `ref` (number, default `0`): Reference line at (0 = none)
- `refLabel` (string, default `""`): Reference line label, such as price cap
- `max` (number, default `0`): Top of the scale (0 = the largest value)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## captions
The film's caption track: one host spanning the film, on the captions track, one caption per line of `lines` as "start-end text" in seconds of this scene. It draws nothing: `filmkit render` (and `filmkit captions`) writes the lines to renders/&lt;film>.srt and .vtt, uploaded as closed captions where they're posted. With `burn` it burns them into the picture instead, in AL.captions, clear of each frame's feed overlays.

- `lines` (string, default `""`): Captions (start-end text, one per line)
- `burn` (boolean, default `false`): Burn the captions into the picture

## cards
Up to three cards flipping in, each an icon, a line and a small source line: a row in 16:9, a stack in the narrow frames (icon beside the words). One card can take the accent. Sits in AL.chart, under a title placed at the top.

- `cards` (string): Up to 3 cards, one "icon | line | source" a line; kit/icons.js lists the icons

  Default:
  ```
  users | Organizations only. | Not for individuals
  lock | Data retention is required. | So misuse can be found
  file-text | And the logs are kept. | Up to three years
  ```

- `highlight` (number, default `0`): The card in the accent (1 to 3; 0 for none)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## chat
A chat turn: the person's message lands in its bubble on the right, then the reply streams in under it at a model's speed (~160 chars/s, no caret), as a chat app shows it.

- `prompt` (string, default `"Plan three days in Lisbon on a budget"`): Message
- `reply` (string, default `"Here is a plan that keeps each day walkable and under €60."`): Reply
- `cps` (number, default `160`): Reply speed (chars/s)
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))

## code
A code block in the theme's syntax colours (--code-*): its lines reveal top to bottom, then `mark` (a piece of one line, such as a base URL or a model id) lights up in the accent. The highlighter knows Python, TypeScript and shell well enough for a film; run every snippet you show before you post it.

- `title` (string, default `"client.py"`): File name
- `lang` (enum, default `"python"`): Language
  - one of `python` (Python), `ts` (TypeScript), `shell` (Shell)
- `code` (string): Code

  Default:
  ```
  import os
  
  from example import Client
  
  client = Client(
      base_url="https://api.example.com/v1",
      api_key=os.environ["EXAMPLE_API_KEY"],
  )
  ```

- `mark` (string, default `"base_url"`): Light up (a piece of one line; empty for none)
- `markAt` (number, default `1.6`): Lights up at (s)
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))

## composer
A chat composer: a prompt typed at reading speed (15 chars/s), then the cursor comes in and presses Send and the box clears. Its box is AL.composer, so a film's own composition (a menu, a reply) can line up with it.

- `prompt` (string, default `"Plan three days in Lisbon on a budget"`): Prompt
- `placeholder` (string, default `"Ask anything"`): Placeholder
- `cursor` (boolean, default `true`): Cursor presses Send
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))

## counter
One big number rolling to its value, in the accent: a line that says what it counts over it, a unit beside it ("billion", "homes") and a line under it. Sits in AL.chart, under a title placed at the top, or alone.

- `value` (number, default `1280`): The number it rolls to
- `from` (number, default `0`): The number it starts from
- `prefix` (string, default `""`): Before the number, such as $
- `suffix` (string, default `""`): After the number, such as % or +
- `decimals` (number, default `0`): Decimal places
- `format` (enum, default `"grouped"`): Number format
  - one of `grouped` (Grouped: 12,345), `plain` (Plain: 2026), `compact` (Compact: 12.3K, 4.5M)
- `unit` (string, default `""`): A word beside the number, such as billion
- `lead` (string, default `"Films made this month"`): What it counts, over the number
- `sub` (string, default `""`): A line under the number
- `duration` (number, default `1.5`): Roll time (s)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## endcard
The end card: an optional claim, then the motif and the mark (contact at 2.7 s after a claim, 1.0 s without: the sting), the wordmark, and the status line with the URL slot, then a still hold. The theme's credit ("Made with Angle Filmkit" unless its "credit" is false) sits small on the safe box's floor.

- `claim` (string, default `""`): Claim before the logo (empty for the sting)
- `line` (string, default `"Now in beta"`): Status
- `cta` (string, default `""`): URL

## grid
n of m lit: a grid of square cells (plain, or each an icon) arrives, then the first n light in the accent, a column at a time, and a bracket under their columns carries the label. Sits in AL.chart, under a title placed at the top.

- `total` (number, default `10`): Cells in all
- `lit` (number, default `7`): Cells lit, in the accent
- `rows` (number, default `0`): Rows (0 = the largest cells that fit)
- `icon` (string, default `""`): An icon in each cell, such as cpu or user (empty for plain squares); kit/icons.js lists them
- `label` (string, default `"7 of 10"`): The label under a bracket below the lit cells (empty for no bracket)
- `sub` (string, default `""`): A line under the label
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## lower-third
A lower third over another scene: an accent bar grows, a name and a role rise beside it, and it clears at `out`.

- `name` (string, default `"A name"`): Name
- `role` (string, default `"What they do, in a few words"`): Role
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## mark
The logo reveal: the theme's motif draws in, the mark's two pieces meet at `contact` (put the sound's hit there), the wordmark wipes in, then a short line under it.

- `line` (string, default `"Made for *you.*"`): Line under the logo (empty for none)
- `contact` (number, default `1`): The pieces meet at (s)
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## mesh
Nodes lighting and connecting: a field of nodes (plain, or each an icon) arrives and lights in a wave from one corner, each link drawing as its ends light; then a pulse in the accent runs the shortest way along the links from the bottom-left node to the top-right one, which lights in the accent. Give it 4.5 s at least: the wave takes 1.6 s, the pulse up to 1.6 s more, and the end node's label lands by 4.4 s. Sits in AL.chart, under a title placed at the top.

- `nodes` (number, default `18`): Nodes (2 to 60)
- `icon` (string, default `""`): An icon in each node, such as cpu or server (empty for plain nodes); kit/icons.js lists them
- `from` (string, default `"You"`): The label of the node the pulse leaves, bottom left
- `to` (string, default `"A free node"`): The label of the node it reaches, top right, in the accent
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## meter
One value on its scale: a gauge (a half circle filling in the accent, its number in the bowl) or a horizontal level (a track filling in the accent, its number over the end). The fill runs from `from`, so a level can rise or fall, and the number rolls with it. What it measures and the scale's ends are labelled. Sits in AL.chart, under a title placed at the top.

- `value` (number, default `72`): The value it fills to
- `from` (number, default `0`): The value it fills from, on the scale (above the value, it falls)
- `min` (number, default `0`): The scale’s low end
- `max` (number, default `100`): The scale’s high end
- `style` (enum, default `"gauge"`): Style
  - one of `gauge` (Gauge: a half circle), `level` (Level: a horizontal track)
- `label` (string, default `"GPU in use"`): What it measures
- `prefix` (string, default `""`): Before the number, such as $
- `suffix` (string, default `"%"`): After the number, such as %
- `decimals` (number, default `0`): Decimal places
- `format` (enum, default `"grouped"`): Number format
  - one of `grouped` (Grouped: 12,345), `plain` (Plain: 2026), `compact` (Compact: 12.3K, 4.5M)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## motif
The theme's motif draws in on a ground, then settles back so type can sit over it (a title with ground "none").

- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper)
- `dim` (number, default `1`): Settles back at (s, 0 = stays bright)

## stat
Before → after: two bars on one scale, each number rolling up as its bar grows, the after bar in the accent, then the delta lands under them. Sits in AL.chart, under a title placed at the top.

- `before` (number, default `28.7`): Before
- `after` (number, default `50`): After
- `beforeLabel` (string, default `"Before"`): What before is
- `afterLabel` (string, default `"After"`): What after is
- `prefix` (string, default `""`): Before each number, such as $
- `suffix` (string, default `"%"`): After each number, such as %
- `decimals` (number, default `1`): Decimal places
- `format` (enum, default `"grouped"`): Number format
  - one of `grouped` (Grouped: 12,345), `plain` (Plain: 2026), `compact` (Compact: 12.3K, 4.5M)
- `delta` (enum, default `"difference"`): The delta
  - one of `difference` (Difference, in the numbers own units (percentages in points)), `percent` (Relative change, in percent), `times` (Times as much), `none` (None)
- `max` (number, default `0`): Top of the scale (0 = the larger number)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## terminal
A terminal: the command is typed at reading speed after the prompt, then its output prints line by line and a fresh prompt waits. With `answer`, the last line is a question the command asks instead, and the answer is typed after it.

- `command` (string, default `"npx filmkit check launch"`): Command
- `output` (string): Output (one line each)

  Default:
  ```
  ── launch 16x9
  ── launch 9x16
  ── launch 1x1
  ── launch 4x5
  ✓ launch: 16x9, 9x16, 1x1, 4x5
  ```

- `answer` (string, default `""`): Typed after the last line (empty: a fresh prompt)
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `none` (None (overlay))

## timeline
Ticks on a ruler: the ruler draws, then each tick lands in order with when it was and what happened. Across the frame in 16:9, down it in the narrow frames. Ticks sit evenly, or to scale by the number in each when (a year) as far as their labels allow. One tick can take the accent. Sits in AL.chart, under a title placed at the top.

- `ticks` (string): Ticks in order, one "when | what" a line

  Default:
  ```
  2019 | The first film
  2022 | A hundred films
  2024 | Four formats
  2026 | The kit
  ```

- `spacing` (enum, default `"even"`): Spacing
  - one of `even` (Even), `scale` (To scale, by the number in each when (a year))
- `highlight` (string, default `""`): The tick in the accent (its when; empty for none)
- `source` (string, default `""`): Source line
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## title
A title card, or a title over another scene (ground "none", place "top" or "head"). *One* word in the accent; \n breaks a line. Entrances: blur for statements, rise for section titles, ink (grey to full) for a promise, none for a line already on screen at frame 0 (a loop's poster).

- `text` (string, default `"A title, with *one* word in the accent."`): Title
- `sub` (string, default `""`): Second line
- `entrance` (enum, default `"blur"`): Entrance
  - one of `blur` (Blur in, word by word), `rise` (Rise out of a mask), `ink` (Grey to full, word by word), `none` (None: on from the first frame)
- `place` (enum, default `"center"`): Place
  - one of `center` (Centre of the frame), `top` (Top, over a product shot), `head` (Top, at statement size (a vertical hook))
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay)), `over-paper` (None, over a paper scene)
- `out` (number, default `0`): Clears at (s, 0 = holds to the cut)

## ui
An app window to rebuild a product's UI in: a title bar (with an address when `url` is set) over an empty body, dark or light from the theme. The body is AL.app(place).body: mount the film's own composition on a later track with the same box, and give it class "on-paper" when the window is light, so the fk- components match.

- `title` (string, default `"Your app"`): Window title (shown when there is no URL)
- `url` (string, default `""`): Address in the title bar (empty: the title)
- `variant` (enum, default `"dark"`): Window
  - one of `dark` (Dark), `light` (Light)
- `place` (enum, default `"stage"`): Place
  - one of `stage` (Under a title at the top), `center` (Filling the safe box)
- `ground` (enum, default `"ink"`): Ground
  - one of `ink` (Ink), `accent-dark` (Accent, dark), `paper` (Paper), `none` (None (overlay))
