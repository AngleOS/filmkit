---
type: brief
status: active
tags: [filmkit, brief, example-studio]
updated: 2026-11-12
issues: [AngleOS/filmkit#12]
---
# Brief: "Brief in, film out" (example studio, product demo)

**Audience:** the same as [[projects/filmkit/briefs/Films are code]]. This film shows the tool doing the work: it is
the demo a person forwards.

**Promise:** you give your agent a brief; it makes, checks and renders the film while you watch.

**Tone:** quiet and procedural. The UI does the talking, with real commands and real tool names. It uses the `angle`
theme and the product scenes (`terminal`, `chat`, `ui`, cursor).

**Length:** about 30 s in all four formats, with a 9:16 cut laid out for itself.

## Beats
| # | t (s) | Picture | On screen | Notes / source |
|---|---|---|---|---|
| 1 | 0–4 | `terminal`: `npx filmkit init my-studio` typed. Output lists `filmkit.json`, `films/smoke`, `CLAIMS.md`, the skill installed. | **Start a studio.** | Real `init` output once #8 lands. Until then, use the Design §1 file list. |
| 2 | 4–10 | `chat`: the user's message: "Make a 20-second launch film from films/launch/brief.md." The agent's reply streams as tool steps: `new_film launch --template statement`, `check_film launch` with a check mark for each of 16:9, 1:1, 4:5 and 9:16. | **Hand your agent *the brief.*** | MCP tool names (Design §4). |
| 3 | 10–17 | `ui`: a contact sheet appears in the chat, four rows of frames. The cursor points at one 9:16 frame. A step reads "fixed: source line under caption box". | **It checks *every frame.*** | `contact_sheet` (Design §4). |
| 4 | 17–24 | `render_film`. Four frames play the hero film side by side, and `launch.srt` and `launch.vtt` appear below. | **Every format. *Sound and captions.*** | Render outputs (Design §3). |
| 5 | 24–30 | `endcard`. | Claim: **Brief in. *Film out.*** · credit | |

UI labels and command output must match the real tool when the film is built. Rebuild them from the CLI's actual
output, and never invent flags.
