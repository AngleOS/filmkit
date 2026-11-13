# Claims

Every word Angle Filmkit's films show, with the source a reviewer checks it against: one section per film. A ⚑ row
says what it waits on and holds back posting the film. The format and the rules are in
`skills/filmkit/references/claims.md`.

## films-are-code

The argument film. Capability lines are the README's, word for word or cut to their point; numbers are derived on
screen from them. No time-saved percentages, no "X% of marketers", no competitor names or logos.

| On screen | Kind | Source |
|---|---|---|
| Every change, another round. | claim | illustrative: the export rounds of an edited video |
| v3.mp4 · Monday · v4_final.mp4 · Wednesday · v7_final_FINAL.mp4 · Friday, 11:48 pm · Illustration · made-up file names | example | illustrative; the source line says so |
| One edit. Four exports. | claim | [D] one change × the four formats README.md renders ("16:9, 1:1, 4:5 and 9:16") |
| Exports for one change, by format · 16:9 · 1:1 · 4:5 · 9:16 · 1 · The four formats Filmkit renders (README) | chart | README.md, "You get **16:9, 1:1, 4:5 and 9:16** videos" |
| Exports for one change · 4 · 1 change × 4 formats · Derived: 1 change × 4 formats | number | [D] 1 change × 4 formats |
| A film that’s code changes like code. | claim | README.md, "you can diff and review a film like any code" |
| films/launch/index.html · $ git diff · @@ -14 +14 @@ · -"text":"Launch day is *Monday.*" · +"text":"Launch day is *Tuesday.*" | example | illustrative: a title scene's `text` variable, as films set it (`data-variable-values`, kb/Design.md §2) |
| One master. Four frames. | claim | README.md, "One master, four frames." |
| Launch day is Tuesday. · 16:9 · 1:1 · 4:5 · 9:16 | example | illustrative title; each frame re-laid, not cropped (README.md, "laid out for its own frame, never cropped") |
| It looks at its own frames. | claim | README.md, "looks at its own frames" |
| build/launch/contact-9x16.png · 9x16 0.7s · 9x16 5.2s · 9x16 8.4s · 9x16 11.2s | UI | `filmkit contact` writes `build/<film>/contact-<format>.png` (src/cli/commands/contact.js) and labels each frame `<format> <t>s` (src/build/contact.js) |
| source line under caption box · fixed: source line under caption box | example | illustrative review note; the check behind it is the chart box stopping above the captions (kit/layout.js `chart`) |
| Every word has a source. | claim | README.md, "Every word has a source." |
| One master, four frames. · README.md · Sound from the picture. · README.md · On npm as filmkit. · ⚑ not live yet · Three rows of the studio’s CLAIMS.md | example | illustrative ledger rows; the first two are README.md word for word, and the third is shown as flagged because it isn't true yet (README.md, "Filmkit isn't on npm yet") |
| Sound from the motion. No stock music. | claim | README.md, "Sound from the picture. Impacts, ticks and whooshes come from the motion … There's no licensed music." |
| Loudness, the whole film · −19 LUFS · −40 LUFS · 0 LUFS · Mastered to −19 LUFS (docs/sound.md) | number | docs/sound.md, "a gain to −19 LUFS"; `filmkit check films-are-code` measures −19 LUFS |
| Your agent makes the film. | claim | README.md, "Your AI agent makes the film." |
| Pre-alpha · MIT · filmkit.anglehq.net | cta | README.md "Status: pre-alpha"; LICENSE (MIT); D-009, "The site lives at filmkit.anglehq.net" (site/public/CNAME) |
| ANGLE · Made with Angle Filmkit | brand | the `angle` theme's lockup and credit (themes/angle/theme.json) |

## brief-in-film-out

The product demo. Commands, tool names, arguments and file names are the real ones, rebuilt from the CLI and the MCP
server; nothing on screen is a flag or a tool that doesn't exist.

| On screen | Kind | Source |
|---|---|---|
| Start a studio. | claim | `filmkit init` "make a studio" (`filmkit --help`) |
| $ npx -y github:AngleOS/filmkit init my-studio | UI | README.md, "run it as `npx -y github:AngleOS/filmkit …`" |
| ✓ a studio for my-studio in /Users/you/my-studio · wrote filmkit.json, brand/logo.svg, films/smoke, AGENTS.md, CLAIMS.md, POSTING.md, .claude/skills/filmkit, .gitignore | UI | `init`'s output, run 2026-11-13 (the path is illustrative) |
| Hand your agent the brief. | claim | README.md, "Write a brief." |
| Make a 20-second launch film from films/launch/brief.md. · I’ll start it from the statement template, then check every format. | example | illustrative chat turn |
| new_film · name: launch, template: statement · check_film · film: launch · 16x9 · 9x16 · 1x1 · 4x5 | UI | the MCP tools and their inputs (src/mcp/server.js); the formats in `check`'s order |
| It checks every frame. | claim | README.md, "checks every format, looks at its own frames" |
| contact_sheet · launch · 16x9 · 9x16 · 1x1 · 4x5 | UI | MCP `contact_sheet`, "One labelled sheet per format" (src/mcp/server.js) |
| source line under caption box · fixed: source line under caption box | example | illustrative review note; the check behind it is the chart box stopping above the captions (kit/layout.js `chart`) |
| Every format. Sound and captions. | claim | README.md, "You get **16:9, 1:1, 4:5 and 9:16** videos with sound made from the motion and SRT/VTT captions." |
| Your agent makes the film. · 16:9 · 9:16 · 1:1 · 4:5 | example | the hero film's line, README.md, "Your AI agent makes the film." |
| launch-16x9.mp4 · launch-9x16.mp4 · launch-1x1.mp4 · launch-4x5.mp4 · launch.srt · launch.vtt | UI | `render` writes `renders/<film>-<format>.mp4` (src/cli/commands/render.js) and `<film>.srt` and `.vtt` (src/build/captions.js) |
| Brief in. Film out. | claim | README.md, "Write a brief. The agent … renders." |
| Pre-alpha · MIT · filmkit.anglehq.net | cta | README.md "Status: pre-alpha"; LICENSE (MIT); D-009, "The site lives at filmkit.anglehq.net" (site/public/CNAME) |
| ANGLE · Made with Angle Filmkit | brand | the `angle` theme's lockup and credit (themes/angle/theme.json) |
