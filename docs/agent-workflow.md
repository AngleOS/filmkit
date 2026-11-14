# The agent workflow

Angle Filmkit is made for an agent to drive. `filmkit init` puts the filmkit skill in the studio's
`.claude/skills/filmkit/`, and `AGENTS.md` points every agent at it, so Claude Code, Codex, Cursor and the rest
follow the same six steps from a brief to the renders. This page is a tour of that skill, so you know what your agent
is doing and where it will stop and ask you.

## Asking for a film
In your studio, ask for it in a sentence or two, with whatever you know:

> Make a 30-second launch film for Acme's new app, for developers on X and LinkedIn. The promise: "Deploys in one
> command." Here's the README: …

With [the MCP server](mcp.md) registered, the `make_film` prompt does the same: it takes the brief as its one
argument and runs the steps below with the server's tools.

## 1. The brief
The agent writes `films/<film>/brief.md` from the skill's template: one audience, one promise, the tone, what the
audience trusts and what makes it roll its eyes, the length and formats, and a beats table. Each beat has its time,
its picture, its words exactly as they'll appear and their source. A feature clip runs 20–30 s, a hook loop 6–12 s and
a launch or argument film 45–60 s.

**It stops here and asks you** to confirm the promise and the beats when you haven't given them. Change them now:
it's cheaper than changing the film. [A sample brief](../skills/filmkit/examples/brief-tidewater.md), written by an
agent with only the skill and a fact sheet, shows what you'll get.

## 2. Research
When the film argues something or shows numbers, the agent researches first and writes `films/<film>/research.md`.
Every number gets a tag (measured, projected, estimate, contested, unverified or derived) and only some tags may go
on screen. It prefers primary sources and the other side's own admissions. It also writes a list of popular numbers
to keep off screen, and the product's honest limit, which the film says out loud. A demo that shows only the
product's own UI skips this step.

## 3. Claims
Every word that will be on screen goes into `CLAIMS.md`, at the studio's root, with its source: a line of the
product's code for a UI label, the product's own claims word for word for what it does, a dated URL for a number,
"illustrative" for a made-up example. A line that isn't true yet gets ⚑ and says what it waits on. The film can
still be made; it isn't posted until the ⚑ rows are gone. [The studio](studio.md#claimsmd-and-postingmd) has the format.

## 4. Build
The agent starts from a template or an existing film:
```sh
npx -y github:AngleOS/filmkit new launch --template statement
npx -y github:AngleOS/filmkit scenes
```
It mounts the kit's scenes ([the scenes reference](scenes.md)) and writes compositions of its own only for what the
kit lacks, following the skill's look and motion rules: one accent word per title, nothing under 28 px, each format
laid out for its own frame rather than cropped, product UI rebuilt from its code and never recorded. The colours,
fonts and logo come from your [theme](themes.md). Before it writes a scene of its own, it runs `filmkit skills` and
reads HyperFrames' own skill, which matches the pinned renderer.

## 5. Check, then look
`filmkit check` has to pass in every format: overlaps, text cut off, the feeds' safe zones, contrast and, for a
loop, the seam. Passing isn't the end. A machine can't see a source line sitting on a caption, so the agent looks
at its own frames: a contact sheet per format with `filmkit contact`, starting with 9:16 and 1:1, which break most
often, and `filmkit snapshot` just after each beat lands. It fixes what it sees and checks again, since a fix in one
format can break another. With the MCP server, `contact_sheet` and `snapshot_film` hand it the frames as images.

## 6. Render and post
`filmkit render` writes the four MP4s, with sound, and one `.srt` and `.vtt` for all of them into `renders/`. The
captions ship as files, never burned in, so the film has to read muted from its own type. The agent writes the post
copy for each platform into `POSTING.md`, with the cover frame (`filmkit stills` writes a poster per format and a
thumbnail). Renders never go into git.

## What it hands back
A film is done when `check` passes in every format, the agent has looked at contact sheets of each and fixed what it
saw, the renders are written, and `CLAIMS.md` and `POSTING.md` cover the film. It reports where the renders are,
which ⚑ rows still hold back posting, and the frames it fixed.

## Rules it keeps every time
- Every word on screen has a source in `CLAIMS.md`. It never shows a feature the product doesn't have.
- One overclaim discredits every true number, so a film that argues says its honest limit on screen.
- No other company's logo, name or UI in the picture. A competitor is a generic grey UI.
- Sound comes from the motion: no licensed music.
- Your corrections override the brief. It appends them to the brief as a dated section and re-reads the whole brief
  before changing the film.
- It edits `films/`, never `build/`, which filmkit rebuilds on every run.

The skill itself is [skills/filmkit/SKILL.md](../skills/filmkit/SKILL.md), with a reference for each step in
[references/](../skills/filmkit/references/). [Troubleshooting](troubleshooting.md) covers what goes wrong.
