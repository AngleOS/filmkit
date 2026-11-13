# Review: check, then look

`check` proves the film builds and nothing breaks the rules a machine can test. It can't see that a source line sits
on a caption or that a 9:16 stack runs into the feed's buttons. Looking at your own frames is what caught those in
every film so far. Do both, every time.

## The loop
1. **Check.** `npx filmkit check <film>` builds every format and runs the theme, scene, sound and HyperFrames checks
   (and the seam gate for a loop). Fix every error. Read every warning and fix it or say why it stands.
2. **Contact sheets.** `npx filmkit contact <film>` writes one sheet per format, a frame every 2 s. Open all four and
   look at every tile. 9:16 and 1:1 break most often; start there.
3. **Snapshots at each beat.** `npx filmkit snapshot <film> <format> --at t,t,…` with a time just after each beat
   lands and one just before each cut. Look at them at full size.
4. **Fix, then go back to 1.** A fix in one format can break another.

## What to hunt for
- **Overlaps:**
  - source lines against captions or the end card;
  - a chart's legend against its labels or a ledger;
  - the title stack against the product shot in 9:16;
  - the cursor covering the label it presses.
- **Outside the safe box:** any word or key action outside `AL.safe`, especially under the 9:16 buttons on the right
  and the caption block at the bottom. `check` warns of text under the box (`safe_zone`); the top and sides are yours
  to see.
- **Too small:** any text under 28 px; a 9:16 statement under 110 px.
- **Clipped or wrapped badly:** a line broken by the wrap instead of a written `\n`, an orphan word, text cut by its
  box.
- **Empty frames:** a dead cut (a settled frame then a scene that waits), a blank frame 0, an empty bottom 40 % in
  9:16.
- **Words versus claims:** every word you can see is a row in `CLAIMS.md`, spelled the same way.
- **Read it muted.** Play the contact sheet in order: does the film make its point with no sound and no captions?
- **Sound:** the hit lands on the frame the pieces meet, never before.

## When a film is done
- `check` passes in every format the film has (a hook loop's is 9:16 with its seam gate).
- You've looked at the contact sheets of every format and snapshots of every beat, and fixed what you saw.
- `render` has written every format plus `.srt` and `.vtt`, and you've watched at least the 9:16 and 16:9 renders.
- Every word on screen is in `CLAIMS.md`; any ⚑ row is listed as what holds back posting.
- `POSTING.md` has the film's copy ([posting](posting.md)).

Report where the renders are, which ⚑ rows remain, and the frames you fixed. For measured taste checks against the
film's register, see [the review notes](research/launch-video-review.md).
