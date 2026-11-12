// The infographic scenes' maths: values to lengths, bands and labels, numbers to strings, and a value rolling to its
// target. Pure functions of their inputs (roll only adds to a timeline), so every frame is a function of time and the
// geometry is tested in Node.
// KC is a top-level `var` and a window property, like layout.js's AL.
var KC = (function () {
  /** @typedef {{ prefix?: string, suffix?: string, decimals?: number, format?: string }} NumberFormat */
  const R = Math.round;

  // A number as the films print it. format: "grouped" (12,345.6), "plain" (2026: years and codes) or "compact"
  // (12.3K, 4.5M, 1.2B, keeping `decimals` after the point).
  // A compact number takes its unit after rounding, so 999,950 reads 1.0M, not 1,000.0K.
  /** @type {[number, string][]} */
  const COMPACT = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"], [1, ""]];
  /** @param {number} x @param {NumberFormat} [options] */
  const format = (x, { prefix = "", suffix = "", decimals = 0, format: style = "grouped" } = {}) => {
    let i = style === "compact" ? COMPACT.findIndex(([m]) => Math.abs(x) >= m) : COMPACT.length - 1;
    if (i < 0) i = COMPACT.length - 1;
    if (i > 0 && style === "compact" && +Math.abs(x / COMPACT[i][0]).toFixed(decimals) >= 1000) i--;
    const [scale, unit] = COMPACT[i];
    const fixed = Math.abs(x / scale).toFixed(decimals);
    const [int, frac] = fixed.split(".");
    const body = style === "plain" ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (x < 0 && +fixed ? "−" : "") + prefix + body + (frac ? "." + frac : "") + unit + suffix;
  };

  // A chart's rows: one "label: value" a line; the label is everything before the last colon, and the value may carry
  // separators and a currency sign ("$1,200"). A line with no colon is no row.
  /** @param {string} text */
  const rows = (text) =>
    text.split("\n").filter((line) => line.includes(":")).map((line) => {
      const at = line.lastIndexOf(":");
      return { label: line.slice(0, at).trim(), value: +line.slice(at + 1).replace(/−/g, "-").replace(/[^\d.-]/g, "") };
    });

  // Values drawn to scale along `length` px: the top of the scale is `max`, else the largest value or reference line.
  // A value above zero stays at least `min` px, so a small one still shows.
  /** @param {number[]} values @param {{ max?: number, ref?: number }} [scale] */
  const top = (values, { max = 0, ref = 0 } = {}) => max || Math.max(ref, ...values);
  /** @param {number[]} values @param {number} length @param {{ min?: number, max?: number, ref?: number }} [scale] */
  const lengths = (values, length, { min = 4, ...scale } = {}) => {
    const most = top(values, scale);
    return values.map((v) => (v > 0 ? Math.max(min, R((v / most) * length)) : 0));
  };

  // n bands across `length` px: each `fill` of its slot, at most `most` px thick, centred in the slot.
  /** @param {number} n @param {number} length @param {{ fill?: number, most?: number }} [options] */
  const bands = (n, length, { fill = 0.62, most = Infinity } = {}) => {
    const slot = length / n, size = R(Math.min(most, slot * fill));
    return Array.from({ length: n }, (_, i) => ({ start: R(slot * i + (slot - size) / 2), size, centre: R(slot * i + slot / 2) }));
  };

  // A scene's items, one a line, their fields split at "|": cards ("icon | line | source"), ticks ("when | what").
  /** @param {string} text */
  const fields = (text) =>
    text.split("\n").filter((line) => line.trim()).map((line) => line.split("|").map((f) => f.trim()));

  // m square cells in `width` × `height`: the largest that fits (at most `most` px, `gap` of a cell apart), fewer rows
  // on a tie, or in `rows` rows when set. Filled a column at a time, so the first n cells are the left columns and a
  // bracket under them spans just those.
  /** @param {number} m @param {number} width @param {number} height @param {{ most?: number, gap?: number, rows?: number }} [options] */
  const grid = (m, width, height, { most = Infinity, gap = 0.25, rows: asked = 0 } = {}) => {
    let best = { size: -1, rows: 1 };
    for (let rows = asked || 1; rows <= (asked || m); rows++) {
      const cols = Math.ceil(m / rows);
      const size = Math.floor(Math.min(most, width / (cols + gap * (cols - 1)), height / (rows + gap * (rows - 1))));
      if (size > best.size) best = { size, rows };
    }
    const { size, rows } = best, cols = Math.ceil(m / rows), g = R(size * gap), step = size + g;
    const cells = Array.from({ length: m }, (_, i) => ({ x: Math.floor(i / rows) * step, y: (i % rows) * step }));
    return { cols, rows, size, gap: g, width: cols * step - g, height: rows * step - g, cells };
  };
  // How wide the columns holding a grid's first n cells are.
  /** @param {{ rows: number, size: number, gap: number }} g @param {number} n */
  const span = (g, n) => Math.ceil(n / g.rows) * (g.size + g.gap) - g.gap;

  // Where n ticks sit along `length` px: evenly, or to scale between the first and last value, half a slot in from
  // each end so the end labels fit.
  /** @param {number[]} values @param {number} length @param {string} spacing "scale", else even */
  const ticks = (values, length, spacing) => {
    const lo = Math.min(...values), hi = Math.max(...values), slot = length / values.length;
    if (spacing !== "scale" || hi === lo) return bands(values.length, length).map((b) => b.centre);
    return values.map((v) => R(slot / 2 + ((v - lo) / (hi - lo)) * (length - slot)));
  };
  // Label centres at `xs`, pushed at least `least` apart and kept within lo..hi: a label stays as near its tick as
  // its neighbours allow.
  /** @param {number[]} xs @param {number} least @param {number} lo @param {number} hi */
  const spread = (xs, least, lo, hi) => {
    /** @type {number[]} */
    const out = [];
    xs.forEach((x, i) => out.push(Math.max(x, i ? out[i - 1] + least : lo)));
    for (let i = out.length - 1; i >= 0; i--) out[i] = Math.min(out[i], i < out.length - 1 ? out[i + 1] - least : hi);
    return out;
  };

  // How wide a line sets at `size` px: an upper bound for the theme's fonts, since a scene lays out before they load.
  /** @param {string} text @param {number} size */
  const textWidth = (text, size) => Math.ceil(text.length * size * 0.62);
  // The type size, at most `size`, that sets the longest of `texts` within `width`; never under 28 px, the smallest a
  // phone can read (check then flags what still overflows).
  /** @param {string[]} texts @param {number} width @param {number} size */
  const fit = (texts, width, size, least = 28) => {
    const longest = Math.max(1, ...texts.map((t) => t.length));
    return Math.max(least, Math.min(size, Math.floor(width / (longest * 0.62))));
  };

  // How many lines `text` wraps to in `width` at `size` px, a word at a time.
  /** @param {string} text @param {number} width @param {number} size */
  const lines = (text, width, size) => {
    const most = Math.max(1, Math.floor(width / (size * 0.62)));
    let count = 0, line = -1;
    for (const word of text.split(/\s+/).filter(Boolean)) {
      if (line < 0 || line + 1 + word.length > most) [count, line] = [count + 1, word.length];
      else line += 1 + word.length;
    }
    return count;
  };

  // A label `h` tall at `top` that a line at `y` would strike through moves to sit on the line instead.
  /** @param {number} top @param {number} h @param {number} y */
  const clear = (top, h, y) => (y > top && y < top + h ? y - h : top);

  // How `after` differs from `before`: "difference" in the values' own units (percentages differ in points), "percent"
  // (relative change) or "times". From zero, a ratio means nothing, so it falls back to the difference.
  /** @param {number} before @param {number} after @param {string} kind @param {NumberFormat} [fmt] */
  const delta = (before, after, kind, fmt = {}) => {
    const d = after - before, sign = d > 0 ? "+" : d < 0 ? "−" : "";
    if (kind === "percent" && before) return sign + format(Math.abs((d / before) * 100)) + "%";
    if (kind === "times" && before) return format(after / before, { decimals: 1 }) + "×";
    if (fmt.suffix === "%") return sign + format(Math.abs(d), { ...fmt, suffix: "" }) + " points";
    return sign + format(Math.abs(d), fmt);
  };

  // A value's frames as it rolls from `from` to `to` over `dur` s on `ease` (t in 0..1 → 0..1): one a frame at 30 fps.
  /** @param {number} from @param {number} to @param {number} dur @param {(t: number) => number} ease */
  const steps = (from, to, dur, ease) => {
    const n = Math.max(2, R(dur * 30));
    return Array.from({ length: n + 1 }, (_, i) => ({ t: (dur * i) / n, value: from + (to - from) * ease(i / n) }));
  };
  // The text of `el` rolls from `from` to `to`, starting at `t`; fmt makes each frame's string. Steps are timeline
  // sets, not an onUpdate, so a seek lands on the same text as playing through.
  /**
   * @param {gsap.core.Timeline} tl @param {gsap.TweenTarget} el @param {number} from @param {number} to @param {number} t
   * @param {number} dur @param {(value: number) => string} fmt
   */
  const roll = (tl, el, from, to, t, dur, fmt, ease = "power3.out") => {
    for (const s of steps(from, to, dur, gsap.parseEase(ease))) tl.set(el, { textContent: fmt(s.value) }, t + s.t);
    return t + dur;
  };

  return { format, rows, fields, top, lengths, bands, grid, span, ticks, spread, textWidth, fit, lines, clear, delta, steps, roll };
})();
window.KC = KC;
