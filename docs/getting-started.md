# Getting started with Angle Filmkit

Angle Filmkit needs Node ≥ 20.12 and ffmpeg. The installer adds both when they're missing, and HyperFrames' Chrome,
which checks and renders the films, comes down on first use. There are three ways in; each ends in the same place:
Filmkit registered with your agent tools, a studio for your brand and a first film.

> Filmkit isn't on npm yet, so run it as `npx -y github:AngleOS/filmkit …`, never an unscoped `npx filmkit`.

## 1. The one-line installer
```sh
curl -fsSL https://raw.githubusercontent.com/AngleOS/filmkit/master/install.sh | sh     # macOS, Linux
irm https://raw.githubusercontent.com/AngleOS/filmkit/master/install.ps1 | iex           # Windows
```
It checks Node and ffmpeg, installs what's missing with your system's package manager (asking first), then runs
`filmkit setup`. Flags after `sh -s --` go to setup, so
`curl -fsSL …/install.sh | sh -s -- --yes --name Acme --brand-url https://acme.com` asks nothing.

## 2. `npx … setup`
With Node already there:
```sh
npx -y github:AngleOS/filmkit setup
```
Setup walks through five steps, asking each choice its flag doesn't make:
1. **the requirements:** Node, ffmpeg and HyperFrames' Chrome, fetched once when it's missing;
2. **your agent tools:** it registers the MCP server and the skill in each one it finds;
3. **a studio:** a folder, `./<brand>-films` by default;
4. **your brand:** from your website (`--brand-url`), or a logo, an accent colour and a dark or light ground;
5. **a first film:** `films/hello` from the `statement` template, checked, with its 16:9 contact sheet opened in your
   browser.

Run it again and it keeps the studio and the film. `--yes` asks nothing, and `setup --remove` takes Filmkit out of
every agent tool, leaving the studio alone. In the studio, `npx -y github:AngleOS/filmkit tour` makes the first film
again one command at a time, explaining each. Every flag is in the [CLI reference](cli.md).

## 3. With your agent
Paste [the install prompt](install-with-your-agent.md) into Claude Code, Codex, Cursor or another coding agent, or
print it with `npx -y github:AngleOS/filmkit prompt`. The agent runs the installer, asks you only for your brand, sets
it up and finishes the first film with you.

## Your agent tools
`filmkit agents` (setup's second step) registers Filmkit in each tool, with a backup of every file it edits. Each
tool's page says what it changes, how to check it worked and how to remove it:
[Claude Code](agents/claude-code.md) · [Claude Desktop](agents/claude-desktop.md) · [Codex](agents/codex.md) ·
[Cursor](agents/cursor.md) · [VS Code](agents/vscode.md) · [GitHub Copilot](agents/copilot.md) ·
[Windsurf](agents/windsurf.md) · [Zed](agents/zed.md) · [Gemini CLI](agents/gemini.md) ·
[opencode](agents/opencode.md). [agents/](agents/README.md) covers all of them.

## A first film by hand
<!-- quickstart -->
```sh
npx -y github:AngleOS/filmkit init acme-films --name Acme        # a studio for your brand
cd acme-films
npx -y github:AngleOS/filmkit new launch --template statement   # or ask your agent: "Make a 30-second launch film for …"
npx -y github:AngleOS/filmkit check launch                       # every format; non-zero on failure
npx -y github:AngleOS/filmkit contact launch                     # contact sheets to review
npx -y github:AngleOS/filmkit render launch                      # renders/launch-{16x9,1x1,4x5,9x16}.mp4 + .srt/.vtt
```
- **`init`** makes the studio: `filmkit.json`, `brand/logo.svg` (put your own logo there), `CLAIMS.md`, `POSTING.md`,
  `AGENTS.md` and the filmkit skill. `filmkit brand` sets your colours, font and logo: see [themes](themes.md).
- **`new`** makes `films/launch/` from a template. Its `index.html` is the master: change the title's `text` in its
  `data-variable-values`, and its placeholder lines are in `CLAIMS.md` as ⚑ rows until you give them a source.
- **`check`** builds every format and runs HyperFrames' checks on it: overlaps, text cut off, the feeds' safe zones,
  contrast. Each finding names the format, the time and the element, with the command that shows the frame.
- **`contact`** writes a contact sheet per format into `build/launch/`. Look at them before you render.
- **`render`** checks again, then writes the four MP4s, with sound, and the captions into `renders/`.

`npx -y github:AngleOS/filmkit preview launch` opens the film in HyperFrames Studio, reloading as you save; `f` shows
the next format. The scenes you can build with are in the [scenes reference](scenes.md).

## A first film with your agent
In your studio, ask your agent for the film: "Make a 30-second launch film for Acme's new app. Here's the brief: …".
The filmkit skill in the studio's `.claude/skills/` takes it from brief to render: it researches the claims, builds the
film from the kit's scenes, checks every format, looks at the contact sheets itself and fixes what it sees, then
renders. With the MCP server registered, its tools return the frames as images, so the agent sees what it made: see
[MCP](mcp.md).

## Next
- [The studio](studio.md): what's in it, `filmkit.json`, a film's folder, claims and posting.
- [The CLI](cli.md): every command, its flags, its `--json` output and exit codes.
- [Themes](themes.md): `default`, `paper`, your own brand, and `angle`, for Angle's films only.
- [Scenes](scenes.md): every scene and its variables.
- [Sound](sound.md): the sound built from a film's motion.
- [MCP](mcp.md): the tools an agent uses.
- [Troubleshooting](troubleshooting.md): setup problems, what `check` finds, and the gotchas of writing a scene.
