# The studio

A studio is your own repo of films: the brand, the films' HTML, their briefs and sound, and the claims and posting copy
that go with them. `filmkit init` makes one. Filmkit itself stays a tool you run with `npx`, so updating it never
touches your films.

```
filmkit.json        the brand's name, its theme, the default formats, where renders go
brand/              logo.svg (the mark the default themes reveal), and the theme `filmkit brand` writes
films/<film>/       brief.md, index.html (the master), compositions/, sound.json, the film's own images
CLAIMS.md           every word on screen, with its source; a ⚑ row holds back posting
POSTING.md          where each render goes, with its copy per platform
AGENTS.md           points your agent at the filmkit skill
.claude/skills/     the filmkit skill; `filmkit skills` adds the pinned HyperFrames' skills
build/              git-ignored: the assembled formats, rebuilt on every run
renders/            git-ignored: the MP4s, captions and stills
```

## Making one
```sh
npx -y github:AngleOS/filmkit init acme-films --name Acme
```
`init` writes the files above into `acme-films/` (the current directory when none is named), with `Acme` as the
brand's name (the folder's name when none is given). It keeps any file that's already there, so it's safe to run in
a repo you have, as long as it isn't a studio already. It also writes `films/smoke`, a film that mounts every kit
scene: `check smoke` shows how your theme looks across all of them. It isn't for posting.

Every command works on the nearest directory with a `filmkit.json`, walking up from where you are, so you can run
them from anywhere inside the studio. `--studio <dir>` names another one.

Commit the studio to git. `.gitignore` already keeps `build/` and `renders/` out: renders go to a release, a drive or
the feeds, never into the repo.

## `filmkit.json`
```json
{
  "name": "Acme",
  "formats": ["16x9", "9x16", "1x1", "4x5"],
  "theme": "default",
  "renders": "renders"
}
```
- **`name`:** the brand or product the films are for. Templates fill it in, and the `default` theme sets it beside
  your logo.
- **`formats`:** the formats a film is made in when it names none of its own: `16x9` (1920 × 1080), `9x16`
  (1080 × 1920), `1x1` (1080 × 1080) and `4x5` (1080 × 1350).
- **`theme`:** a built-in theme, your own theme folder, or single values over either: see [themes](themes.md).
  `filmkit brand` sets it for you.
- **`renders`:** the folder renders go to, from the studio (`renders` by default).

Every command checks `filmkit.json` against `schema/filmkit.schema.json` when it opens the studio. A key it doesn't
know, or a value it can't use, stops it with a message that names the key and what it should be.

## A film
`npx -y github:AngleOS/filmkit new launch --template statement` makes `films/launch/` from a template (`statement`,
`explainer`, `product-demo`, `hook-loop` or `poster`):

- **`index.html`** is the master. It's one HyperFrames composition that mounts kit scenes (`kit/scenes/title.html`,
  `kit/scenes/endcard.html`…) and sets each one's variables in `data-variable-values`. Every format is laid out from
  it, each for its own frame, so you write the film once. The root's `data-formats` (such as `"9x16"` for a vertical
  hook) overrides `filmkit.json`'s `formats` for this film, and `data-loop="true"` makes it a loop that `check` holds
  to its seam.
- **`compositions/`** holds the film's own scenes, for what the kit's scenes don't do: a chart of your own, your
  product's UI rebuilt from its tokens.
- **`brief.md`** is what the film is for: the audience, the promise, the tone and a beats table. Your agent writes it
  first and builds from it.
- **`sound.json`** is the sound, cued on the scenes: see [sound](sound.md). A film without one is silent, as a hook
  loop is meant to be.
- **Images and other files** the film shows go in its own folder too. The build copies everything in `films/<film>/`
  into each format, but nothing else from the studio.

The kit's paths (`kit/…`) don't exist in `films/`: each build copies the kit and your theme in beside the film. The
scenes and their variables are in the [scenes reference](scenes.md).

## `CLAIMS.md` and `POSTING.md`
`CLAIMS.md` lists every word a film shows, with the source a reviewer can check it against, one section per film:

```md
## launch

| On screen | Kind | Source |
|---|---|---|
| Acme, in one line. | claim | ⚑ placeholder: the promise from brief.md, word for word from the product's claims |
```

A line that isn't true yet, or still waits on its source, is a ⚑ row. A ⚑ holds back posting the film, not making it.
`new` adds the template's placeholder lines as ⚑ rows, so a film can't go out with them. `POSTING.md` says where each
render goes, with its copy for each platform. How to write both is in the skill's references, in
`.claude/skills/filmkit/references/`.

## `build/` and `renders/`
- **`build/<film>/<format>/`** is a HyperFrames project for each format: the film, a copy of the kit, your theme
  compiled to `kit/theme/`, the sound and the format's canvas size. Commands rebuild it whenever its inputs change, so
  never edit it: change `films/` and run the command again. `contact` and `snapshot` write their PNGs here too.
- **`renders/`** gets `<film>-<format>.mp4` from `render`, `<film>.srt` and `<film>.vtt` (the captions, never burned
  in), and `<film>-<format>.png` and `<film>-thumbnail.png` from `stills`.

## Updating filmkit
The kit, the scenes and the built-in themes live in the package, not the studio, so a new version reaches every film on
its next build. After updating, run `npx -y github:AngleOS/filmkit skills` to bring the skills in `.claude/skills/` up
to date, and `check` your films before you render them again.
