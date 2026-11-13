# The MCP server

`filmkit mcp` runs Angle Filmkit's MCP server over stdio, so any agent that speaks MCP can make, check and look at
films. Its tools run the same code as the CLI commands, on the studio the server starts in (the nearest directory
with a `filmkit.json`, walking up), or the one `--studio <dir>` names. They never prompt, and stdout carries only the
protocol: what a command would print goes to stderr, which the client keeps in its log.

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
| `list_scenes` | `{ name? }` | `filmkit scenes --json`: each scene, what it does and its variables |
| `new_film` | `{ name, template? }` | `filmkit new --json`: the film, its template and the files it wrote |
| `check_film` | `{ film, formats? }` | `filmkit check --json`: per format, its errors and warnings, and the sound. A failed check is a result, not a tool error |
| `snapshot_film` | `{ film, format?, at }` | a text item with `filmkit snapshot --json`'s times and paths, then a PNG image per time (`at`: 1 to 12 times in seconds), scaled to at most 1568 px on the long side |

A usage error (no studio, an unknown film or format) is a tool error whose text is the CLI's message, fix included.
The shapes are a stable contract: [kb/Interfaces.md](../kb/Interfaces.md).
