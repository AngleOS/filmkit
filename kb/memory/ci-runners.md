---
name: ci-runners
description: Where filmkit's CI jobs can run and why — Chrome for Testing is x64-only on Linux, npm provenance needs a GitHub-hosted runner
metadata:
  type: project
---

filmkit's `ci.yml` runs on the AngleOS self-hosted runners (`[self-hosted, ci, Linux]`), but two jobs can't take any
of them:

- **`films` needs `X64`.** HyperFrames renders with Chrome for Testing, which it downloads, and Chrome for Testing has
  no Linux ARM64 build: the Mac's Docker pool (ARM64) can't run `filmkit check` or `render`.
- **`release.yml` runs on `ubuntu-latest`.** npm accepts `npm publish --provenance` (and trusted publishing) only from
  a cloud-hosted runner; self-hosted runners aren't supported (docs.npmjs.com, 2026-11). The Expert chose this over
  publishing without provenance (D-20261112-13-delegated); it's the only GitHub-hosted job.

**Why:** both look like they could move to the self-hosted pool and silently can't.
**How to apply:** keep the `X64` label on any job that runs HyperFrames; leave the release job GitHub-hosted until npm
supports self-hosted provenance.
