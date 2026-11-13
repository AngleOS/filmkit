---
name: hyperframes-preview-watch
description: How HyperFrames 0.8.186 Studio reloads on file changes, and why filmkit preview copies single files and kills a process group
metadata:
  type: reference
---

HyperFrames 0.8.186 `preview` watches its project directory itself (`studioServer` `createProjectWatcher`): a
recursive `fs.watch` on macOS and Windows, per-directory watches on Linux, debounced 30–300 ms, then an SSE
`file-change` to Studio, which reloads the preview iframe (it also re-reads the root's `data-width`/`data-height`). It
ignores any path segment named `build`, `renders`, `node_modules`, `.git` and the like, *relative to the project*, so
a project under `build/` is still watched.

- Removing and recreating the project directory ends the watch on macOS: change files in place.
- Killing `npx` leaves the `hyperframes` node process running; `filmkit preview` starts it in its own process group
  and kills the group.
- In a non-TTY shell, `hyperframes preview` backgrounds itself unless given `--foreground`.
- Save → visible in Studio measured 0.8–1.8 s on an M1 Max in full Chromium; the headless shell is slower (2–4 s).
