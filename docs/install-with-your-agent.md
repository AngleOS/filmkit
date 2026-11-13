# Install Angle Filmkit with your agent

Paste the prompt below into your coding agent: Claude Code, Codex, Cursor, VS Code with Copilot, Windsurf, Gemini
CLI or opencode. It installs Filmkit, connects it to your agent tools, sets up your brand and makes a first film. It
only asks you for your brand.

`npx -y filmkit prompt` prints the same prompt.

---

````text
Install Angle Filmkit for me and set it up with my brand. Filmkit lets you (my agent) make short brand films in HTML
and render them in 16:9, 1:1, 4:5 and 9:16, with sound and captions. Docs: https://github.com/AngleOS/filmkit

Do this, step by step, and tell me what you did at each step:

1. Install. Run the installer with --yes so it doesn't stop to ask:
   - macOS/Linux:  curl -fsSL https://raw.githubusercontent.com/AngleOS/filmkit/master/install.sh | sh -s -- --yes --agents auto --no-brand --no-first-film
   - Windows:      & ([scriptblock]::Create((irm https://raw.githubusercontent.com/AngleOS/filmkit/master/install.ps1))) --yes --agents auto --no-brand --no-first-film
   It installs Node 20.12+ and ffmpeg if they're missing, and registers the `filmkit` MCP server and skill in every agent
   tool it finds. Show me the list of tools it configured.

2. Ask me, in one message:
   - my brand or product name;
   - my website (optional, to pull the logo, colours and fonts from);
   - a logo file (SVG best; optional if the website has one);
   - whether my films should be dark or light;
   - where to keep the studio (default: ./<name>-films).

3. Set up the brand. Run, with my answers:
     npx -y filmkit setup --yes --studio <dir> --name "<name>" [--brand-url <url>] [--logo <file>] [--ground dark|light]
   This also makes a first film, films/hello, from the statement template. Run
   `npx -y filmkit stills hello 1` in the studio and show me the 16:9 still. Ask whether the colours and logo
   look right; change them with `npx -y filmkit brand --accent '<hex>'` (or `--ground`, `--logo`,
   `--font <Google Fonts family>`) in the studio until I say yes.

4. Finish the first film, the `hello` film setup made (don't make a new one). Use the filmkit MCP tools if they're
   loaded in this session; otherwise use the CLI.
   - change its title to a one-line promise for my brand;
   - check it in every format;
   - look at the contact sheet yourself, fix anything that overlaps or is cut off, then show it to me;
   - render it, and tell me where the four MP4s and the .srt/.vtt captions are.

5. Finish by telling me:
   - how to ask you for the next film ("Make a 30-second launch film for …");
   - that the filmkit skill (skills/filmkit/SKILL.md) is the workflow you'll follow;
   - how to remove Filmkit from my agent tools (`npx -y filmkit setup --remove`).

Rules:
- Never put my logo or brand in a public place.
- Never upload renders anywhere.
- Ask before installing anything other than Node, ffmpeg and Filmkit.
````

---

## What the prompt does
| Step | Command | Changes on your machine |
|---|---|---|
| 1 | `install.sh` / `install.ps1` then `filmkit setup --agents auto` | Node and ffmpeg if missing; the `filmkit` MCP server in each detected agent tool's config (backups kept); the Filmkit skill in tools that load skills |
| 3 | `filmkit setup --studio … --name …` | a studio folder with `filmkit.json`, `brand/` and `films/hello` |
| 4 | the MCP tools or the CLI | `build/` and `renders/` inside the studio |

To undo it: `npx -y filmkit setup --remove` takes Filmkit out of every agent tool's config. The studio is just a folder.
