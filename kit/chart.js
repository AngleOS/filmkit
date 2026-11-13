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

  // A scene's items, one a line, their fields split at "|": cards ("icon | line | source"), ticks ("when | what").
  const fields = (text) =>
    text.split("\n").filter((line) => line.trim()).map((line) => line.split("|").map((f) => f.trim()));

  // m square cells in `width` × `height`: the largest that fits (at most `most` px, `gap` of a cell apart), fewer rows
  // on a tie, or in `rows` rows when set. Filled a column at a time, so the first n cells are the left columns and a
  // bracket under them spans just those.
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
  const span = (g, n) => Math.ceil(n / g.rows) * (g.size + g.gap) - g.gap;

  // Where n ticks sit along `length` px: evenly, or to scale between the first and last value, half a slot in from
  // each end so the end labels fit.
  const ticks = (values, length, spacing) => {
    const lo = Math.min(...values), hi = Math.max(...values), slot = length / values.length;
    if (spacing !== "scale" || hi === lo) return bands(values.length, length).map((b) => b.centre);
    return values.map((v) => R(slot / 2 + ((v - lo) / (hi - lo)) * (length - slot)));
  };
  // Label centres at `xs`, pushed at least `least` apart and kept within lo..hi: a label stays as near its tick as
  // its neighbours allow.
  const spread = (xs, least, lo, hi) => {
    const out = [];
    xs.forEach((x, i) => out.push(Math.max(x, i ? out[i - 1] + least : lo)));
    for (let i = out.length - 1; i >= 0; i--) out[i] = Math.min(out[i], i < out.length - 1 ? out[i + 1] - least : hi);
    return out;
  };

  // How wide a line sets at `size` px: an upper bound for the theme's fonts, since a scene lays out before they load.
  const textWidth = (text, size) => Math.ceil(text.length * size * 0.62);
  // The type size, at most `size`, that sets the longest of `texts` within `width`; never under 28 px, the smallest a
  // phone can read (check then flags what still overflows).
  const fit = (texts, width, size, least = 28) => {
    const longest = Math.max(1, ...texts.map((t) => t.length));
    return Math.max(least, Math.min(size, Math.floor(width / (longest * 0.62))));
  };

  // How many lines `text` wraps to in `width` at `size` px, a word at a time.
  const lines = (text, width, size) => {
    const most = Math.max(1, Math.floor(width / (size * 0.62)));
    let count = 0, line = -1;
    for (const word of text.split(/\s+/).filter(Boolean)) {
      if (line < 0 || line + 1 + word.length > most) [count, line] = [count + 1, word.length];
      else line += 1 + word.length;
    }
    return count;
  };

  // Deterministic noise in 0..1 from an integer: no Math.random in a frame, so every render lays out alike.
  const noise = (i) => {
    let s = (i * 2654435761 + 1013904223) >>> 0;
    s ^= s >>> 15;
    s = Math.imul(s, 2246822519) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };

  // n mesh nodes over `width` × `height`: a staggered grid of about square cells, at most `most` px across and 1.8 of
  // a node apart, each node jittered in its cell but kept clear of its neighbours and a node's radius in from the
  // edges. The grid's spare cells are left out at random, so it reads as a network, not a lattice.
  const scatter = (n, width, height, { most = Infinity } = {}) => {
    const cols = Math.max(1, Math.min(n, R(Math.sqrt((n * width) / height)))), rows = Math.ceil(n / cols);
    const size = Math.floor(Math.min(most, width / cols / 1.8, height / rows / 1.8));
    const stepX = cols > 1 ? (width - size) / (cols - 0.5) : 0, stepY = rows > 1 ? (height - size) / (rows - 1) : 0;
    const jitter = Math.max(0, Math.min(stepX || Infinity, stepY || Infinity) - 1.6 * size) / 2;
    const spare = new Set(Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => noise(a + 500) - noise(b + 500)).slice(0, cols * rows - n));
    const nodes = [];
    for (let i = 0; i < cols * rows; i++) {
      if (spare.has(i)) continue;
      const r = Math.floor(i / cols), c = i % cols;
      const x = cols > 1 ? size / 2 + (c + 0.5 * (r % 2)) * stepX : width / 2;
      const y = rows > 1 ? size / 2 + r * stepY : height / 2;
      const keep = (z, len) => R(Math.max(size / 2, Math.min(len - size / 2, z)));
      nodes.push({ x: keep(x + (noise(i) - 0.5) * 2 * jitter, width), y: keep(y + (noise(i + 97) - 0.5) * 2 * jitter, height) });
    }
    return { size, nodes };
  };

  // How far p is from the segment a–b.
  const off = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  // A mesh's links, [i, j] with i < j, once each: a spanning tree, so a route joins any two nodes, and each node to
  // its `near` nearest, unless that link would pass within `clear` px of another node's centre (through its ring).
  const links = (nodes, near = 3, clear = 0) => {
    const dist = (i, j) => Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
    const seen = new Set(), out = [];
    const add = (i, j) => {
      const key = Math.min(i, j) + "-" + Math.max(i, j);
      if (seen.has(key)) return;
      seen.add(key);
      out.push([Math.min(i, j), Math.max(i, j)]);
    };
    const tree = new Set([0]);
    while (tree.size < nodes.length) {
      let best = [Infinity, 0, 0];
      for (const i of tree) nodes.forEach((_, j) => !tree.has(j) && dist(i, j) < best[0] && (best = [dist(i, j), i, j]));
      add(best[1], best[2]);
      tree.add(best[2]);
    }
    const through = (i, j) => nodes.some((p, k) => k !== i && k !== j && off(p, nodes[i], nodes[j]) < clear);
    nodes.forEach((_, i) => nodes.map((_, j) => j).filter((j) => j !== i).sort((a, b) => dist(i, a) - dist(i, b)).slice(0, near).forEach((j) => through(i, j) || add(i, j)));
    return out;
  };

  // The nodes on the shortest way from `from` to `to` along the links (Dijkstra), both ends included.
  const route = (nodes, edges, from, to) => {
    const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = new Set();
    dist[from] = 0;
    while (done.size < nodes.length) {
      let at = -1;
      dist.forEach((d, i) => !done.has(i) && (at < 0 || d < dist[at]) && (at = i));
      if (at === to || dist[at] === Infinity) break;
      done.add(at);
      for (const [i, j] of edges) {
        const next = i === at ? j : j === at ? i : -1;
        const d = next < 0 ? Infinity : dist[at] + Math.hypot(nodes[at].x - nodes[next].x, nodes[at].y - nodes[next].y);
        if (d < dist[next]) [dist[next], prev[next]] = [d, at];
      }
    }
    const path = [to];
    while (path[0] !== from && prev[path[0]] >= 0) path.unshift(prev[path[0]]);
    return path;
  };

  // A pulse along a route in `dur` s at an even speed: each stop's point and the time it gets there.
  const legs = (nodes, path, dur) => {
    const at = [0];
    for (let k = 1; k < path.length; k++) at.push(at[k - 1] + Math.hypot(nodes[path[k]].x - nodes[path[k - 1]].x, nodes[path[k]].y - nodes[path[k - 1]].y));
    return path.map((i, k) => ({ x: nodes[i].x, y: nodes[i].y, t: at.at(-1) ? (dur * at[k]) / at.at(-1) : 0 }));
  };

  // A link from a to b, stopping `by` px short of each, so it meets a node's ring rather than crossing it.
  const trim = (a, b, by) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, dx = ((b.x - a.x) / len) * by, dy = ((b.y - a.y) / len) * by;
    return { x1: R(a.x + dx), y1: R(a.y + dy), x2: R(b.x - dx), y2: R(b.y - dy) };
  };

  // Where a value sits on a meter's scale from lo to hi, as 0..1.
  const share = (value, lo, hi) => (hi === lo ? 0 : Math.min(1, Math.max(0, (value - lo) / (hi - lo))));
  // A gauge's arc: a half circle centred on cx, cy, from its left end over the top to its right.
  const arc = (cx, cy, r) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

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

  window.KC = { format, rows, fields, top, lengths, bands, grid, span, ticks, spread, textWidth, fit, lines, clear, delta, steps, roll, noise, scatter, links, route, legs, trim, share, arc };
})();
