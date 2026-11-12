// The infographic scenes' maths: values to lengths, bands and labels, numbers to strings, and a value rolling to its
// target. Pure functions of their inputs (roll only adds to a timeline), so every frame is a function of time and the
// geometry is tested in Node.
(function () {
  const R = Math.round;

  // A number as the films print it. format: "grouped" (12,345.6), "plain" (2026: years and codes) or "compact"
  // (12.3K, 4.5M, 1.2B, keeping `decimals` after the point).
  // A compact number takes its unit after rounding, so 999,950 reads 1.0M, not 1,000.0K.
  const COMPACT = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"], [1, ""]];
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
  const rows = (text) =>
    text.split("\n").filter((line) => line.includes(":")).map((line) => {
      const at = line.lastIndexOf(":");
      return { label: line.slice(0, at).trim(), value: +line.slice(at + 1).replace(/−/g, "-").replace(/[^\d.-]/g, "") };
    });

  // Values drawn to scale along `length` px: the top of the scale is `max`, else the largest value or reference line.
  // A value above zero stays at least `min` px, so a small one still shows.
  const top = (values, { max = 0, ref = 0 } = {}) => max || Math.max(ref, ...values);
  const lengths = (values, length, { min = 4, ...scale } = {}) => {
    const most = top(values, scale);
    return values.map((v) => (v > 0 ? Math.max(min, R((v / most) * length)) : 0));
  };

  // n bands across `length` px: each `fill` of its slot, at most `most` px thick, centred in the slot.
  const bands = (n, length, { fill = 0.62, most = Infinity } = {}) => {
    const slot = length / n, size = R(Math.min(most, slot * fill));
    return Array.from({ length: n }, (_, i) => ({ start: R(slot * i + (slot - size) / 2), size, centre: R(slot * i + slot / 2) }));
  };

  // How wide a line sets at `size` px: an upper bound for the theme's fonts, since a scene lays out before they load.
  const textWidth = (text, size) => Math.ceil(text.length * size * 0.62);
  // The type size, at most `size`, that sets the longest of `texts` within `width`; never under 28 px, the smallest a
  // phone can read (check then flags what still overflows).
  const fit = (texts, width, size, least = 28) => {
    const longest = Math.max(1, ...texts.map((t) => t.length));
    return Math.max(least, Math.min(size, Math.floor(width / (longest * 0.62))));
  };

  // A label `h` tall at `top` that a line at `y` would strike through moves to sit on the line instead.
  const clear = (top, h, y) => (y > top && y < top + h ? y - h : top);

  // How `after` differs from `before`: "difference" in the values' own units (percentages differ in points), "percent"
  // (relative change) or "times". From zero, a ratio means nothing, so it falls back to the difference.
  const delta = (before, after, kind, fmt = {}) => {
    const d = after - before, sign = d > 0 ? "+" : d < 0 ? "−" : "";
    if (kind === "percent" && before) return sign + format(Math.abs((d / before) * 100)) + "%";
    if (kind === "times" && before) return format(after / before, { decimals: 1 }) + "×";
    if (fmt.suffix === "%") return sign + format(Math.abs(d), { ...fmt, suffix: "" }) + " points";
    return sign + format(Math.abs(d), fmt);
  };

  // A value's frames as it rolls from `from` to `to` over `dur` s on `ease` (t in 0..1 → 0..1): one a frame at 30 fps.
  const steps = (from, to, dur, ease) => {
    const n = Math.max(2, R(dur * 30));
    return Array.from({ length: n + 1 }, (_, i) => ({ t: (dur * i) / n, value: from + (to - from) * ease(i / n) }));
  };
  // The text of `el` rolls from `from` to `to`, starting at `t`; fmt makes each frame's string. Steps are timeline
  // sets, not an onUpdate, so a seek lands on the same text as playing through.
  const roll = (tl, el, from, to, t, dur, fmt, ease = "power3.out") => {
    for (const s of steps(from, to, dur, gsap.parseEase(ease))) tl.set(el, { textContent: fmt(s.value) }, t + s.t);
    return t + dur;
  };

  window.KC = { format, rows, top, lengths, bands, textWidth, fit, clear, delta, steps, roll };
})();
