# Brief: "Brief in, film out" (example studio, product demo)

**Audience:** the same as [Films are code](../films-are-code/brief.md). This film shows the tool doing the work: it is
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

## Owner correction (2026-11-13): what the build changed
The brief is as the owner wrote it (`kb/briefs/Brief in, film out.md`, 2026-11-12). The build changed these, for the
reasons given:
- **The command is `npx -y filmkit init my-studio`**, as the README runs it. The output is `init`'s own first two
  lines; its `Next:` line is left out to keep the beat short.
- **Beat 1 runs 8.3 s**, so `init`'s long `wrote …` line is on screen long enough to read (check's `line_unread`).
- **"Hand your agent the *brief.*" is its own 2 s beat.** The chat scene fills the frame from the top, so there is no
  room for a title over it.
- **The contact sheet is a row of frames per format** in a `ui` window titled `contact_sheet · launch`: the agent
  rings a 9:16 frame, the cursor opens it, and the source line moves out of the caption block. The ring is in the
  accent, because the theme has no error colour.
- **The render beat plays the hero film's line**, "Your agent makes the *film.*", in four frames, and shows the
  files `render_film` writes: `launch-<format>.mp4`, `launch.srt` and `launch.vtt`.
- **One accent word per title**, as the kit lights one: "Brief in. Film *out.*"
- **The status is "Pre-alpha · MIT"**, as in Films are code, and the URL is filmkit.anglehq.net (D-009).
- **It runs 35.5 s**, not 30: the longer first beat and the title beat.
