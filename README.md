<p align="center"><img src="docs/assets/teaser.gif" alt="Angle Filmkit: the brand lines draw in, the ANGLE mark assembles, 'Your agent makes the film.' blurs in word by word, and the four frames (16:9, 1:1, 4:5, 9:16) land one after another. Made with the kit itself." width="100%"></p>

# Angle Filmkit

**Your AI agent makes the film.** Write a brief. The agent researches it, builds the film from filmkit's scenes,
checks every format, looks at its own frames and renders. You get **16:9, 1:1, 4:5 and 9:16** videos with sound made
from the motion and SRT/VTT captions.

> **Status: pre-alpha.** The kit behind it already made Angle's launch film, eight feature clips and three hook loops.
> Angle Filmkit turns it into a tool anyone with an agent can use. Follow the v0.1 epic in the issues.

Made by [Angle](https://github.com/AngleOS), the private AI that runs open models on GPUs that already exist. Out of
the box, films get Angle's look: a Night ground, a Pear accent, Geist and the brand lines. They carry your logo, and
you can retheme them completely.

## How it works
- **Films are HTML.** Scenes are HTML with GSAP timelines, rendered to video by
  [HyperFrames](https://github.com/heygen-com/hyperframes) (pinned, so a re-render is identical). Agents write code
  well, and you can diff and review a film like any code.
- **One master, four frames.** Each format is laid out for its own frame, never cropped. Every word stays clear of the
  feeds' buttons.
- **A kit with taste:**
  - title entrances and a logo reveal;
  - product UI scenes: chat, code, terminal;
  - infographic scenes: bars, counters, stats, grids, cards, timelines.
  
  Motion rules hold them together.
- **Sound from the picture.** Impacts, ticks and whooshes come from the motion, over a tonal pad, mastered to −19
  LUFS. There's no licensed music.
- **Every word has a source.** A claims ledger keeps the film honest. Lines that aren't true yet are flagged ⚑ and
  hold back posting.
- **Built for agents:**
  - an MCP server whose tools return the frames as images, so the model can see what it made;
  - a skill that teaches the whole brief → research → build → check → look → render workflow.

## Quick start (target for v0.1)
```sh
npx filmkit init my-studio && cd my-studio      # your brand in filmkit.json, a smoke film, the agent skill
npx filmkit new launch --template statement
npx filmkit check launch                         # every format; non-zero on failure
npx filmkit contact launch                       # contact sheets to review
npx filmkit render launch                        # renders/launch-{16x9,1x1,4x5,9x16}.mp4 + .srt/.vtt
```
With an agent:
```sh
claude mcp add filmkit -- npx filmkit mcp          # Claude Code; any MCP client works
```
Then ask it: *"Make a 40-second launch film for my product. Here's the brief…"*

Requirements: Node ≥ 20 and ffmpeg.

## Licence
The code is MIT. Third-party pieces keep their own licences (`THIRD_PARTY.md`). The Angle name and logo are trademarks
and aren't covered by the MIT licence (`TRADEMARKS.md`).
