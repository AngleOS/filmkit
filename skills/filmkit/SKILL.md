---
name: filmkit
description: Make a short brand or product film with filmkit, from a brief to 16:9, 1:1, 4:5 and 9:16 renders with sound and SRT/VTT captions. Use when asked to make, change, review or post a launch film, feature clip, explainer, infographic film or 9:16 hook loop in a filmkit studio (a repo with filmkit.json).
---

# filmkit: make a film

A film is an HTML page of kit scenes and GSAP compositions that filmkit renders through HyperFrames. One master
becomes four formats, each laid out for its own frame. You write the brief, check the claims, build, check, look at
your own frames, render and write the posting copy. Work through the steps in order. Each one has a reference with the
detail; read it when you reach that step.

## The workflow
1. **Brief.** Write `films/<film>/brief.md` from [the brief template](references/brief.md): audience, promise,
   tone, what they trust and what makes them roll their eyes, formats and a beats table. When the owner hasn't given
   you one, draft it and ask them to confirm the promise and the beats before you build.
2. **Research**, when the film argues something or shows numbers. Run [a research pass](references/research.md) first:
   tag every number, prefer the other side's own admissions, and make a keep-off-screen list. A product demo that
   only shows the product's own UI can skip this step.
3. **Claims.** Put every word that will be on screen in `CLAIMS.md` with its source ([claims](references/claims.md)).
   A line that isn't true yet gets ⚑. You can still make the film; it doesn't get posted.
4. **Build.** Start from a template (`npx filmkit new <film> --template <t>`) or an existing film. Mount kit scenes
   (`npx filmkit scenes` lists them and their variables). Write the film's own compositions only for what the kit
   lacks. Follow [look and motion](references/look-and-motion.md) for every frame.
5. **Check, then look.** `npx filmkit check <film>` must pass in every format. Then look at the frames:
   `npx filmkit contact <film>` and `npx filmkit snapshot <film> <format> --at …`. Fix what you see and check again.
   [Review](references/review.md) lists what to hunt for and when the film is done.
6. **Render and post.** `npx filmkit render <film>` writes the videos and the `.srt`/`.vtt` to `renders/`. Write the
   copy for each platform in `POSTING.md` ([posting](references/posting.md)). Never commit a render.

## Rules that hold every time
- **Every word on screen has a source in `CLAIMS.md`.** Product and capability lines are the product's own claims,
  word for word. Never show a feature the product doesn't have.
- **One overclaim discredits every true number.** When a film argues or compares, say the honest limit out loud on
  screen. In a feature clip, show only what the product does today, at its real limits.
- **No other company's logo, name or UI in the picture.** A competitor's UI is a generic grey UI. Sources may name
  companies in a small source line.
- **Rebuild product UI from its tokens and its code's labels.** Never record the screen, and never invent UI.
- **Every format is laid out for its own frame,** never cropped. Text is never under 28 px. Statements in 9:16 are
  110–140 px. Words stay inside `AL.safe`.
- **Captions ship as `.srt`/`.vtt`, never burned in** (unless the owner asks for `burn`). The film must read muted
  from its own type.
- **Sound comes from the motion.** Don't add licensed music.
- **Owner corrections override the brief.** Append them to the brief as a dated section, then re-read the whole
  brief before you change the film.
- **Edit `films/`, never `build/`.** filmkit rebuilds `build/` on every run.
- **A film is done** when `check` passes in all its formats, you've looked at contact sheets of each, the render is
  right, and `CLAIMS.md` and `POSTING.md` cover it. Say where the renders are; don't commit them.

## Before you write a scene
Run `npx filmkit skills` and read the HyperFrames skill it installs (`.claude/skills/hyperframes/SKILL.md`). It
matches the pinned renderer. Inside a scene, `document` and `gsap` are scoped to the mount, so pass the kit helpers
elements, never selector strings. Read variables with `AL.vars()`. Keep each label in its own `<span>`.

## With the MCP server
When `filmkit mcp` is connected, use its tools rather than the shell: `new_film`, `check_film`, `snapshot_film` and
`contact_sheet` (both return images, so you can look), `render_film`, `read_claims` and `add_claim`. The `make_film`
prompt runs this same workflow.

## Background
[research/](references/research/MOC-launch-video.md) holds measured notes on launch films: registers, beat timing,
type, UI demos, motion, cuts, formats, sound and review (MIT, see [NOTICE](references/research/NOTICE.md)). Read
[the map](references/research/MOC-launch-video.md) when you plan a film's register and beats. The notes are
upstream's, unchanged: their `[[wikilinks]]` and repo paths point at notes that aren't shipped here, and where a note
disagrees with this skill (it burns captions into feed cuts), follow this skill.
