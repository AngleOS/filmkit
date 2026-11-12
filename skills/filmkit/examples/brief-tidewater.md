<!-- A sample brief, written by a fresh agent given only this skill, its brief template and a fact sheet for a
fictional product, Tidewater. Kept as written, as a worked example of the template. -->
# Brief: tidewater-runbooks

> Draft by the agent. Owner to confirm the promise and the beats before the build.

**Audience:** on-call SREs at 20–200 person startups, scrolling a feed (X, LinkedIn, Bluesky) or landing on
tidewater.example. They live in a terminal, already keep runbooks somewhere (a wiki, a repo of markdown) and have
followed a stale one at 3 a.m.
**Promise:** Your runbooks, one keystroke from your terminal.
**Tone:** calm, exact, dry. It should feel like a well-kept terminal session: Linear's changelog clips, not an
incident-drama trailer.
**This audience trusts:** real terminal output, the app's real labels, a stated limit (free up to 5), plain verbs,
an audit trail.
**This audience rolls its eyes at:** "AI-powered", "never get paged again", MTTR or uptime numbers with no source,
red-alert sirens and flashing dashboards, stock photos of people at screens, integrations shown before they ship.
**Length and formats:** 30 s; 16:9, 1:1, 4:5, 9:16, each laid out for its own frame. In 9:16 the UI pane sits above
the line, the statements are 110–140 px, and the captions ship as `.srt`/`.vtt`.
**Register:** product UI (a feature clip), product-first, name early.
**Ends on:** Free for teams up to 5. Get it at tidewater.example

## Beats
| # | t (s) | picture | on screen | notes/source |
|---|---|---|---|---|
| 1 | 0.0–1.8 | `title`: the Tidewater wordmark on ink, settles by 0.2 s | Tidewater | brand; the name at 0.2 s (early mode, under 11 % = 3.3 s). First seam at 1.8 s |
| 2 | 1.8–5.0 | `title`, blur entrance | Ops runbooks\nthat *run*. | homepage H1, tidewater.example |
| 3 | 5.0–10.0 | `ui`: a terminal, rebuilt from tokens; a keystroke opens the Tidewater pane beside it, the "Runbooks" list showing. The line sits under the picture | Your runbooks, one keystroke\nfrom your *terminal*. · Runbooks | claims.json `runbooks`, word for word; "Runbooks" from `src/ui/labels.ts`. The low end lands on the pane opening (the reveal). Which key opens the pane isn't in the sheet: show no key name. Runbook titles in the list (e.g. "Rotate TLS certificate", "Fail over primary DB") are illustrative |
| 4 | 10.0–16.0 | `ui`: one runbook open; the cursor clicks "Run step", the output streams into the pane, the cursor clicks "Done", the step ticks; "Skip" is visible on the next step | Run a step, see its output,\ntick it *off*. · Run step · Done · Skip | claims.json `run`, word for word (9 words, one over the ~8 guide; split as shown). Labels from `src/ui/labels.ts`. The step's command and output are illustrative. Sound: a tick on "Done" |
| 5 | 16.0–20.0 | `title` on ink; the pane from beat 4 dims behind it | Works *offline*;\nsyncs when you're back. | claims.json `offline`, word for word. Statement only: the label file has no offline indicator, so the UI shows no offline state |
| 6 | 20.0–24.5 | `ui`: the runbook's header with "Last run by", a name and a time | Every run is *logged*. · Last run by · Sam · 02:14 | claims.json `audit`, cut to its point; the full sentence ("Every run is logged with who ran what, and when.") goes in the post copy. "Last run by" from `src/ui/labels.ts`. "Sam" and "02:14" are illustrative. This is the payoff, cut 0.5 s before the end card |
| 7 | 24.5–30.0 | `endcard`: the wordmark, the line, the URL; final frame holds 28.0–30.0 | Tidewater · Free for teams up to *5*. · Get it at tidewater.example | pricing page, tidewater.example (record the date it was read in `CLAIMS.md`). "Get it at" is the CTA verb, no product claim. 5.5 s end card, about 2 s hold |

## Sources
- `claims.json` (product repo): keys `runbooks`, `run`, `offline`, `audit`. Read word for word.
- `src/ui/labels.ts` (product repo): "Runbooks", "Run step", "Done", "Skip", "Ask a teammate", "Last run by".
- tidewater.example homepage, H1 "Ops runbooks that run." Date read: to be recorded.
- tidewater.example pricing page: free for teams up to 5. Date read: to be recorded.
- Illustrative, no product claim: runbook titles, step commands and their output, the name "Sam", the time "02:14",
  the terminal's contents.

## Do not use
- Slack notifications, the Slack name or logo, or any notification at all: not shipped (coming in 2.0).
- "Ask a teammate" as an action: the label exists, but no claim says what it does. It may sit unclicked in the pane.
- A named keyboard shortcut for opening the pane: not in the sheet.
- An offline badge, sync spinner or any UI state not in `src/ui/labels.ts`.
- Any MTTR, incident or time-saved number; no research pass backs one.
- Pricing beyond "free for teams up to 5" (paid tiers, per-seat prices).
- Other companies' terminals, logos or UI (iTerm, PagerDuty, Confluence, Notion): the terminal is generic.
- Fake incident drama: red alerts, sirens, a pager going off.
