---
type: brief
status: active
tags: [filmkit, brief, example-studio]
updated: 2026-11-12
issues: [AngleOS/filmkit#12]
---
# Brief: "Films are code" (example studio, argument film)

**Audience:** founders, developer-relations people and marketers who already use coding agents (Claude Code, Codex,
Cursor) but think a launch film still needs a motion designer and a video editor. They're technical, short on time
and allergic to hype.

**Promise:** your agent can make an on-brand film you review like code: one master, every format, every word
sourced.

**Tone:** dry, confident, a little wry about the "v7_final_FINAL" life. The look is the `angle` theme: Night ground,
Pear on one word per title, Geist, the brand lines. The infographic scenes carry the argument.

**What this audience trusts:**
- mechanisms they can verify (a diff, a check that passes, a file on disk);
- the tool showing its own limits;
- numbers derived in front of them.

**What makes them roll their eyes:**
- "revolutionize your workflow";
- "AI-powered creativity";
- fake dashboards;
- invented productivity stats.

**Length:** about 45 s in 16:9, 1:1 and 4:5, with the same edit re-laid for 9:16. Captions go in the captions scene,
shipped as SRT/VTT.

## Beats
| # | t (s) | Picture | On screen (big type) | Notes / source |
|---|---|---|---|---|
| 1 | 0–5 | `cards`: file names stack up and get worse: `launch_v3.mp4`, `launch_v4_final.mp4`, `launch_v7_final_FINAL.mp4`. Each lands with a tick. | **Every change, *another round.*** | Illustration. No claim. |
| 2 | 5–11 | `bars` for the four formats a launch needs (16:9, 1:1, 4:5, 9:16), then a `counter` rolling 1 change × 4 formats = **4 exports**. | **One edit. *Four exports.*** | Derived: 4 formats per change (Filmkit renders 16:9, 1:1, 4:5, 9:16; README). |
| 3 | 11–17 | `code`: a diff of a film's `index.html`. One title line changes; the changed piece lights up in Pear. | **A film that's code *changes like code.*** | Filmkit films are HTML (kb/Design.md). |
| 4 | 17–24 | `grid` or the film's own composition: one master frame splits into four frames, each re-laid (not cropped), with the title moving into place in each. | **One master. *Four frames.*** | "Each format is laid out for its own frame, never cropped" (Design §2, layout.js). |
| 5 | 24–31 | A contact sheet (`ui` frame) of a 9:16 cut. A red box flags a source line colliding with a caption. Next frame: fixed. | **It looks at *its own frames.*** | `snapshot` and `contact` return images; MCP `snapshot_film` (Design §4). |
| 6 | 31–37 | `cards`: three CLAIMS.md rows, each with a source; the third carries a ⚑ "not live yet". | **Every word *has a source.*** | CLAIMS.md and ⚑ rows (Design §1, skill claims.md). |
| 7 | 37–42 | `meter`: a loudness meter settling at −19 LUFS, with a waveform built from the cue hits. | **Sound from the motion. *No stock music.*** | Mastered to −19 LUFS (Design §2, sound). |
| 8 | 42–47 | `endcard` in the `angle` theme. Claim line, then the mark. | Endcard claim: **Your agent makes the *film.*** | |

**Do not use:** time-saved percentages, "X% of marketers…" stats, or competitor names and logos.

**Captions** carry every on-screen line. The film must read muted from its own type.
