---
name: hyperframes-without-root
description: Running HyperFrames check/snapshot on a Linux agent host without root — Chrome's missing libs via apt-get download, and its disk guard
metadata:
  type: project
---

On ca-server-2 (2026-11-12), HyperFrames' Chrome lacked system libraries and agents can't use root. `apt-get download`
needs no root: fetch `libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3
libxrandr2 libgbm1 libasound2t64 libwayland-server0 libxrender1 libxi6`, `dpkg-deb -x` each into a /tmp dir, and run
filmkit with `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`. `check`, `snapshot` and `stills` then work.

**Why:** `npx hyperframes doctor` names the missing libs but only offers a root apt install.

**How to apply:** check `filmkit doctor` first. `render` also needs ffmpeg on the PATH, and HyperFrames refuses to
render with under about 1 GB free, so a full disk blocks renders even when everything else works.
