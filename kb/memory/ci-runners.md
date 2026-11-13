---
name: ci-runners
description: Where filmkit's CI jobs can run and why — Chrome for Testing is x64-only on Linux, npm provenance needs a GitHub-hosted runner
metadata:
  type: project
---

filmkit's `ci.yml` runs on the AngleOS self-hosted runners, picking pools the way angle-ai's `ci.yml` does: the
`runners` job and `ci-ok` take `ci-light`. The heavy jobs ask for `ci-priority` on agentd's landing candidates
(`agentd/train/*`) and master pushes, so a landing doesn't queue behind PR CI, and for `ci` otherwise. They never ask
for both labels. (On 2026-11-12 a candidate's `ci-ok` sat queued for 3 hours on `ci` while the `ci-light` runners were
idle.) Two jobs can't take just any runner:

- **`films` needs `X64`.** HyperFrames renders with Chrome for Testing, which it downloads, and Chrome for Testing has
  no Linux ARM64 build: the Mac's Docker pool (ARM64) can't run `filmkit check` or `render`.
- **`release.yml` runs on `ubuntu-latest`.** npm accepts `npm publish --provenance` (and trusted publishing) only from
  a cloud-hosted runner; self-hosted runners aren't supported (docs.npmjs.com, 2026-11). The Expert chose this over
  publishing without provenance (D-20261112-13-delegated); it's the only GitHub-hosted job.

**Why:** both look like they could move to the self-hosted pool and silently can't; a gate on a full pool waits hours.
**How to apply:** a new job takes `needs.runners.outputs.pool` (seconds of work: `ci-light`); keep the `X64` label on any job that runs HyperFrames; leave the release job GitHub-hosted until npm
supports self-hosted provenance.
