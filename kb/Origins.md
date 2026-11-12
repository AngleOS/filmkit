---
type: reference
status: active
tags: [filmkit, history, lessons]
updated: 2026-11-12
---
# Origins: how the Angle films were made

filmkit is the kit and the workflow behind Angle's beta films:
- a launch film, a sting and a poster;
- feature clips f1–f8;
- three 9:16 hook loops.

They were made by AI agents between 2026-10-22 and 2026-11-12, in `AngleOS/angle-ai` `marketing/video/`. This page
keeps what worked and what bit us, so filmkit builds it in.

## The loop that worked
1. **The orchestrator writes a brief** (`brief-<film>.md`). It covers:
   - audience;
   - promise;
   - tone;
   - *what this audience trusts* and *what makes them roll their eyes*;
   - length and formats;
   - a **beats table**: `# | t (s) | picture | on screen (big type) | notes/source`;
   - sources, and a do-not-use list.
2. **A research agent runs first when the film argues something.** Examples: f7, for AI's critics, and f8, for
   security researchers. Each claim gets a status tag:
   - **[M]** measured;
   - **[P]** projected;
   - **[E]** estimate;
   - **[C]** contested;
   - **[U]** unverified;
   - **[D]** derived.

   It returns a "numbers to keep off screen" list: misquoted stats that would sink the film with this audience. It
   also says what the audience finds credible and what makes them roll their eyes.
3. **A build agent builds the film:**
   - it reads the kit README, the agent rules and two existing films;
   - it mounts kit scenes and writes custom compositions for the infographic beats;
   - it runs `check` in all four formats;
   - it **looks at snapshot contact sheets** and fixes overlaps (9:16 and 1:1 broke most often: source lines against
     captions, legends against ledgers);
   - it renders, writes CLAIMS.md and POSTING.md, and opens a PR.

   The strongest model was used here: the quality of the infographics depended on it.
4. **Owner corrections land mid-build** as a dated "Owner correction" section appended to the brief. It overrides the
   beats above it, and the agent is messaged to re-read it. Example: "we're not against data centers; data centers on
   the protocol are great".
5. **Renders go to a release, not to git.** They were posted to the owner's DM, 9:16 first and then 16:9.

## Rules that earned their place
- **Every word on screen has a source** (CLAIMS.md). Lines that aren't true *yet* are flagged ⚑. A ⚑ holds back public
  posting, not making the film. Example: a film made "for when we're fully up and running".
- **One overclaim discredits every true number.** State an honest limit out loud. f7 ends "Still uses electricity.
  Not a new power plant."
- **No logos or names of other companies in the picture.** Sources can name them in small source lines. The UI of
  "other apps" is a generic grey UI.
- **Rebuild the UI, never record the screen.** Product UI is rebuilt from the app's tokens at about 1.7×, with labels
  taken from the app's code.
- **Each format is laid out for its own frame, never cropped.** Text is never under 28 px; statements in 9:16 are
  110–140 px.
- **Captions ship as SRT/VTT, never burned in.** The owner found burned captions distracting: they repeated the big
  type. The film must read muted from its own type.
- **Sound from the motion, no licensed music.** −19 LUFS. A hit lands on the frame the pieces meet: it may be late,
  never early.

## Gotchas
- **HyperFrames won't read a scene through a symlink that leaves the project**, so the kit is copied into each build
  directory.
- **HyperFrames 0.8.186 drops a scene's declared variable defaults when a film mounts it twice.** The workaround is
  `AL.vars()`.
- **Inside a scene, `document` and `gsap` are scoped to its mount**, so pass the kit helpers elements, never selectors.
- **The layout audit reads `data-layout-allow-occlusion` on the covered label**, not on what covers it.
- **A bare text node next to a scaled element drew in the wrong order.** Keep every label in its own `<span>`.
- **Agent harnesses set `FORCE_COLOR`.** `node -p` then wraps numbers in ANSI codes, which broke ffmpeg's volume
  filter. Use `node -e` with `process.stdout.write`.
- **A `fromTo` late in a timeline renders its from-state at frame 0.** In a loop that blanks the poster, so the
  returning state goes on its own layer.
- **Pin the renderer.** The pin is what makes a re-render identical. Move it only for a fix that matters.

## Related
- [[projects/filmkit/Design]] · [[projects/filmkit/02 - Decisions]]
