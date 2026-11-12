# filmkit

**Your AI agent makes the film.** Write a brief. The agent researches it, builds the film from filmkit's scenes,
checks every format, looks at its own frames and renders. You get **16:9, 1:1, 4:5 and 9:16** videos with sound made
from the motion and SRT/VTT captions.

> **Status: pre-alpha, being built in the open.** The kit behind it already made a launch film, eight feature clips and
> three hook loops for [Angle](https://github.com/AngleOS). This repo turns it into a tool anyone can use. Follow the
> v0.1 epic in the issues.

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

## Install (one line)
```sh
curl -fsSL https://raw.githubusercontent.com/AngleOS/filmkit/master/install.sh | sh     # macOS, Linux
irm https://raw.githubusercontent.com/AngleOS/filmkit/master/install.ps1 | iex           # Windows
npx -y filmkit setup                                                                     # anywhere with Node 20+
```
It installs Node and ffmpeg if they're missing. Then `filmkit setup` walks you through:
- **connecting Filmkit to your agent tools:** it detects Claude Code, Claude Desktop, Codex, Cursor, VS Code (Copilot),
  Windsurf, Zed, Gemini CLI and opencode, and registers the MCP server and skill in each;
- **making a studio;**
- **setting up your brand:** from your website, or by answering a few questions;
- **making a first film.**

`--yes` runs it unattended, and `filmkit setup --remove` undoes it.

> While the repo is private, collaborators run `npx -y github:AngleOS/filmkit setup`, or `install.sh` from a clone.
> The curl URLs work once it's public.

### Or let your agent do it
Paste [this prompt](docs/install-with-your-agent.md) into your agent (or run `npx filmkit prompt`). It installs and
configures Filmkit, asks you only for your brand, and finishes with a first film.

## Use it
```sh
npx filmkit new launch --template statement     # or ask your agent: "Make a 30-second launch film for …"
npx filmkit check launch                         # every format; non-zero on failure
npx filmkit contact launch                       # contact sheets to review
npx filmkit render launch                        # renders/launch-{16x9,1x1,4x5,9x16}.mp4 + .srt/.vtt
```
Requirements: Node ≥ 20 and ffmpeg. The installer handles both.

## Licence
MIT. Third-party pieces keep their own licences: see `THIRD_PARTY.md`.
