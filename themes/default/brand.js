// The default theme's brand: a grid motif and a placeholder logo (logo/logo.svg) whose square mark is cut on its
// diagonal, so the two halves can meet. Colours are the theme's custom properties, so .on-paper restyles them. A
// theme's brand.js sets window.KB = { motif, lockup, lockupBox }; the kit's motif, mark and endcard scenes call those,
// so the kit itself carries no brand (D-007). Gradient and clip ids get a counter: a gradient in a scene the runtime
// hides paints nothing, so two mounts must never share one.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  let n = 0;
  const add = (parent, tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const fade = (defs, id, x1, y1, x2, y2) => {
    const g = add(defs, "linearGradient", { id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 });
    add(g, "stop", { offset: 0, style: "stop-color: var(--accent)" });
    add(g, "stop", { offset: 1, style: "stop-color: var(--accent); stop-opacity: 0" });
  };

  // Six rows from the right edge and six columns from the floor, crossing in the bottom-right corner and fading out
  // from the frame's edge, placed for this frame. The kit draws them in with strokeDashoffset 1 → 0.
  const motif = (svg) => {
    const { W, H, mode } = AL, k = ++n, s = mode === "L" ? 1 : 0.8, defs = add(svg, "defs", {});
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const line = (id, x1, y1, x2, y2) => add(svg, "line", { x1, y1, x2, y2, pathLength: 1, "stroke-width": Math.round(4 * s), style: `stroke: url(#${id})` });
    const rows = Array.from({ length: 6 }, (_, i) => line(`kb-gr-${k}`, W, H - (i + 1) * 72 * s, W * 0.6, H - (i + 1) * 72 * s));
    const cols = Array.from({ length: 6 }, (_, i) => line(`kb-gc-${k}`, W - (i + 1) * 96 * s, H, W - (i + 1) * 96 * s, H * 0.45));
    fade(defs, `kb-gr-${k}`, W, 0, W * 0.6, 0);
    fade(defs, `kb-gc-${k}`, 0, H, 0, H * 0.45);
    return { rows, cols };
  };

  // The lockup in an <svg> sized by lockupBox: the mark's two halves, and the wordmark behind a wipe (the kit opens
  // its width 0 → 60).
  const lockup = (svg) => {
    const k = ++n;
    svg.setAttribute("viewBox", "0 0 67 12");
    svg.setAttribute("overflow", "visible");
    const wipe = add(add(add(svg, "defs", {}), "clipPath", { id: `kb-wipe-${k}` }), "rect", { x: 15, y: -2, width: 0, height: 16 });
    const mark = add(svg, "g", { style: "fill: var(--accent)" });
    const para = add(mark, "path", { d: "M 0 0 L 12 12 L 0 12 Z" });
    const tri = add(mark, "path", { d: "M 0 0 L 12 0 L 12 12 Z" });
    const word = add(svg, "g", { "clip-path": `url(#kb-wipe-${k})` });
    add(word, "text", { x: 17, y: 9.55, style: "fill: var(--foreground); font: var(--title-weight) 10px var(--font-display); letter-spacing: var(--title-tracking)" })
      .textContent = "Your brand";
    return { mark, para, tri, word, wipe };
  };

  // The lockup's box at width w, centred on cy (viewBox 67 × 12), with where the mark's centre sits and how far the
  // mark steps left as the wordmark wipes in.
  const lockupBox = (w, cy) => {
    const R = Math.round, ppu = w / 67, h = R(12 * ppu);
    return { w, h, left: R((AL.W - w) / 2), top: R(cy - h / 2), markCx: R(6 * ppu), shift: R(27.5 * ppu) };
  };

  window.KB = { motif, lockup, lockupBox };
})();
