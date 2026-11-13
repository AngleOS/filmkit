---
type: design
status: active
tags: [filmkit, cli, mcp, contract]
updated: 2026-11-12
issues: [AngleOS/filmkit#3, AngleOS/filmkit#10]
---
# Interfaces: the CLI's JSON and the MCP tools

Agents depend on these shapes, so they're stable: a change is a decision (D-###) and a minor-version bump. The CLI and
the MCP server share one implementation: MCP tools call the same functions the CLI commands do.

## CLI conventions
- **The studio:** the nearest directory with `filmkit.json`, walking up from the current directory. `--studio <dir>`
  overrides it.
- **`--json`:** one JSON object on stdout, nothing else. Progress goes to stderr. Without `--json`, output is short and
  human-readable, with the Angle banner only on `--help` and `doctor` in a colour terminal (D-007).
- **Exit codes:**
  - `0` ok;
  - `1` the film failed a check;
  - `2` usage error;
  - `3` missing requirement (Node, ffmpeg, Chrome);
  - `4` render failed.
- **Never prompts.** Paths in output are absolute.

## Shapes
```jsonc
// check  (`filmkit check <film> [formats…] --json`)
{ "film": "launch", "ok": false,
  "formats": [
    { "format": "16x9", "ok": true,  "errors": [], "warnings": [{ "code": "line_unread", "message": "…", "selector": "#t-sub" }] },
    { "format": "9x16", "ok": false, "errors": [{ "code": "text_box_overflow", "message": "…", "selector": "#src" }], "warnings": [],
      "seam": { "ok": true, "step": 0.21, "median": 0.12, "limit": 0.4 } }      // loops only; { ok: false, error } when its frames didn't render
  ],
  "sound": { "built": true, "path": "/abs/build/launch/sound.m4a", "lufs": -19.0, "truePeak": -1.2 } }
  // sound: null for a film without sound.json; { "built": false, "error": "…" } fails the check

// snapshot / contact
{ "film": "launch", "format": "9x16", "frames": [{ "t": 4.5, "path": "/abs/build/launch/snaps-9x16/frame-00-4.500.png" }] }
{ "film": "launch", "sheets": [{ "format": "9x16", "path": "/abs/build/launch/contact-9x16.png", "times": [0, 2, 4] }] }

// render
{ "film": "launch", "renders": [{ "format": "16x9", "path": "/abs/renders/launch-16x9.mp4", "seconds": 45.2, "bytes": 6405542 }],
  "captions": { "srt": "/abs/renders/launch.srt", "vtt": "/abs/renders/launch.vtt" } }

// init  (`filmkit init [dir] --json`): what it wrote, and what was already there and kept
{ "ok": true, "studio": "/abs/acme-films", "name": "Acme", "files": ["/abs/acme-films/filmkit.json", "…"], "kept": [] }

// new  (`filmkit new <film> [--template t] --json`)
{ "ok": true, "film": "launch", "template": "statement", "files": ["/abs/films/launch/brief.md", "/abs/films/launch/index.html", "/abs/CLAIMS.md"] }

// scenes  (`filmkit scenes [name] --json`): every kit scene, or the one named
{ "ok": true, "scenes": [{ "name": "bars", "description": "…",
  "variables": [{ "id": "direction", "type": "enum", "label": "Direction", "default": "vertical", "options": [{ "value": "vertical", "label": "…" }] }] }] }

// skills  (`filmkit skills --json`): what it installed, and the files it added lines to (.gitignore, AGENTS.md)
{ "ok": true, "skills": [{ "name": "filmkit", "from": "filmkit", "path": "/abs/.claude/skills/filmkit" },
  { "name": "hyperframes", "from": "hyperframes@0.8.186", "path": "/abs/.claude/skills/hyperframes" }], "files": ["/abs/.gitignore"] }

// agents  (`filmkit agents [tools…] [--remove] [--dry-run] --json`); exits 1 when a tool failed
{ "ok": true, "dryRun": false, "command": { "command": "npx", "args": ["-y", "filmkit", "mcp"] },
  "tools": [
    { "id": "cursor", "name": "Cursor", "status": "configured",            // configured | removed | skipped | failed
      "changes": ["/abs/.cursor/mcp.json mcpServers.filmkit"],          // empty: already set up
      "backups": ["/abs/.cursor/mcp.json.filmkit-backup-20261112-153600"] },
    { "id": "zed", "name": "Zed", "status": "skipped", "changes": [], "backups": [], "detail": "not installed" }
  ] }
```

## MCP tools (`filmkit mcp`, server name `filmkit`, title "Angle Filmkit")
| Tool | Input | Returns |
|---|---|---|
| `list_films` | none | `{ films: [{ name, formats, loop, duration }] }` |
| `list_scenes` | `{ name? }` | the `scenes` shape |
| `new_film` | `{ name, template?: "statement" \| "explainer" \| "product-demo" \| "hook-loop" \| "poster" }` | `{ film, files: [paths] }` |
| `check_film` | `{ film, formats?: [..] }` | the `check` shape; `isError` stays false for a failed check (the failure is data) |
| `snapshot_film` | `{ film, format?, at: number[] (≤ 12) }` | **image content** (PNG) per frame, plus a text item with times and paths |
| `contact_sheet` | `{ film, formats?, every?: number }` | **image content** per format, plus a text item |
| `render_film` | `{ film, formats? }` | the `render` shape; progress notifications while it renders |
| `captions` | `{ film }` | `{ srt, vtt, lines: [{ start, end, text }] }` |
| `stills` | `{ film, at: number }` | `{ stills: [{ format, path }], thumbnail? }` |
| `read_claims` | `{ film? }` | `{ rows: [{ film, line, source, flag }] }` from CLAIMS.md |
| `add_claim` | `{ film, line, source, flag?: boolean }` | `{ ok: true }` (appends a row) |

**Resources** (`filmkit://guide/<name>`): `look-and-motion`, `brief-template`, `claims-format`, `review-checklist`,
`themes`, read from `skills/filmkit/references/` and `kb/`. **Prompt:** `make_film { brief }`, the workflow from the
skill, in steps that name these tools.

Images are scaled to at most 1568 px on the long side before they're returned, so a model can read them without the
client resizing. Each tool call writes only inside the studio.

## Related
- [[projects/filmkit/Design]] · [[projects/filmkit/02 - Decisions]]
