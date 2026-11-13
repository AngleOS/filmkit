# The MCP server

`filmkit mcp` runs Angle Filmkit's MCP server over stdio, so any agent that speaks MCP can make, check, look at and
render films. Its tools run the same code as the CLI commands, on the studio the server starts in (the nearest
directory with a `filmkit.json`, walking up), or the one `--studio <dir>` names. They never prompt, and stdout
carries only the protocol: what a command would print goes to stderr, which the client keeps in its log.

## Setup
`filmkit agents` registers it in every agent tool it finds ([agents/](agents/README.md)). By hand:

- **Claude Code:** `claude mcp add filmkit -- npx -y filmkit mcp` (add `-s user` for every project).
- **Codex:** `codex mcp add filmkit -- npx -y filmkit mcp`, or in `~/.codex/config.toml`:
  ```toml
  [mcp_servers.filmkit]
  command = "npx"
  args = ["-y", "filmkit", "mcp"]
  startup_timeout_sec = 60
  ```
- **Cursor:** `~/.cursor/mcp.json`, or `.cursor/mcp.json` in the studio:
  ```json
  { "mcpServers": { "filmkit": { "type": "stdio", "command": "npx", "args": ["-y", "filmkit", "mcp"] } } }
  ```
- **Any other client:** a stdio server with the command `npx` and the arguments `-y filmkit mcp`. Start it in the
  studio, or add `--studio /path/to/studio` to the arguments.

While Filmkit isn't on npm, use `github:AngleOS/filmkit` in place of `filmkit`.

## Tools
| Tool | Input | Returns |
|---|---|---|
| `list_films` | none | `{ films: [{ name, formats, loop, duration }] }`; a film that doesn't open has `error` instead |
| `list_scenes` | `{ name? }` | `filmkit scenes --json`: each scene, what it does and its variables ([scenes](scenes.md)) |
| `new_film` | `{ name, template? }` | `filmkit new --json`: the film, its template and the files it wrote |
| `check_film` | `{ film, formats? }` | `filmkit check --json`: per format, its errors and warnings, and the sound. A failed check is a result, not a tool error |
| `snapshot_film` | `{ film, format?, at }` | a text item with `filmkit snapshot --json`'s times and paths, then a PNG image per time (`at`: 1 to 12 times in seconds), scaled to at most 1568 px on the long side |
| `contact_sheet` | `{ film, formats?, every? }` | a text item with `filmkit contact --json`, then each format's contact sheet as an image: each scene just after it starts, or a frame every `every` seconds |
| `render_film` | `{ film, formats? }` | `filmkit render --json`: the MP4s, their lengths and sizes, and the captions. It checks first; a failed check is a result, a failed render a tool error |
| `captions` | `{ film }` | `filmkit captions --json`: the `.srt` and `.vtt` it wrote, and the lines |
| `stills` | `{ film, at }` | `filmkit stills --json`: a poster PNG per format at `at` seconds, and the 16x9 thumbnail |
| `read_claims` | `{ film? }` | `{ rows: [{ film, line, kind, source, flag }] }`: the rows of `CLAIMS.md`, or one film's. `flag` is a ⚑ row, its `source` without the ⚑ |
| `add_claim` | `{ film, line, source, kind?, flag? }` | `{ ok: true }`: a row after the film's last one in `CLAIMS.md` (a new section when the film has none). `kind` is `claim` when not given; `flag: true` writes the ⚑ |

`check_film`, `render_film` and `stills` report each step (`16x9 checking`, `16x9 capturing frame 612/1440`) as
progress notifications when the client sends a `progressToken`, at most one a second while a step goes on. The
`progress` value counts the notifications, so it only rises; the step is in `message`. A render takes a while, so
give the client a long tool timeout, reset by progress where it can.

## Resources and the prompt
The guides are resources, `filmkit://guide/<name>`, in Markdown:

| Resource | What it is |
|---|---|
| `look-and-motion` | the look and motion rules every frame follows (`skills/filmkit/references/look-and-motion.md`) |
| `brief-template` | the brief every film starts from (`references/brief.md`) |
| `claims-format` | `CLAIMS.md`'s rows and the rules for what a film may say (`references/claims.md`) |
| `review-checklist` | what to look for after `check_film` passes, and when a film is done (`references/review.md`) |
| `themes` | the studio's theme: the built-in `angle`, `default` and `paper`, a theme of its own, and the end card's credit (`docs/themes.md`) |

The `make_film { brief }` prompt is the skill's workflow in five steps that name these tools and guides: brief,
claims, build, check then look, render.

A usage error (no studio, an unknown film or format) is a tool error whose text is the CLI's message, fix included.
The shapes are a stable contract: [kb/Interfaces.md](../kb/Interfaces.md).
