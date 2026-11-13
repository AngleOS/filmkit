---
name: hyperframes-render-progress
description: HyperFrames 0.8.186 render prints @hf-progress JSON lines on a non-TTY stdout (compile, capture, encode, assemble), which filmkit's progress line reads; check and snapshot print none
metadata:
  type: reference
---

When its stdout isn't a terminal (and `HYPERFRAMES_STDOUT_IS_TTY` isn't set), `hyperframes render` writes one line
per progress tick: `@hf-progress {"code":"capture","done":195,"total":240,"pct":70}`. The codes are `compile`,
`capture` and `encode` (frames) and `assemble` (seconds of film), interleaved with its text bar. `check` and
`snapshot` print no progress at all, so filmkit can only name their step and count the time.

**Why:** filmkit's live line (`src/progress.js`, `renderStage`) parses these; a HyperFrames bump can rename them.

**How to apply:** after moving the HyperFrames pin, run a real `render` piped (`| cat`) and check the steps still
print.
