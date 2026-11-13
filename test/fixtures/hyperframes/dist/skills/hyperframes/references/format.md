# Format

| Code | Fix |
| `missing_data_no_timeline` | A root or host with no timeline: add `data-no-timeline`, or every render waits 45 s |

A film needs motion. If a 3s+ composition shows no visible change across every sample, `check` fails with `sweep_static`: the seek is not driving the page. Spread the reveal across the timeline.

- `data-layout-allow-caption-zone`: intentional caption-band copy. Silences only `caption_zone_collision`, not overflow.
