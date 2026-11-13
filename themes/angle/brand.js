// Angle's theme brand: the lines motif and the ANGLE lockup, drawn into a scene's own <svg> so no scene repeats their
// paths. The mark is split into its two pieces so they can meet. Paths are from angle-logo-on-night.svg (AngleOS/angle-ai
// apps/web/public/brand). Gradient and clip ids get a counter: a gradient in a scene the runtime hides paints nothing,
// so two mounts must never share one. A theme's brand.js adds { motif, lockup, lockupBox } to window.KB; the kit's
// motif, mark and endcard scenes call those, so the kit itself carries no brand (D-003, D-007). Colours come from
// theme.css's --brand-mark, --brand-word and --brand-line, so they follow the ground (.on-paper) instead of being drawn
// in Pear and white on every one.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  // layout.js may load after this file, so AL is read when a scene draws.
  /** @returns {{ W: number, H: number, mode: string }} */
  const al = () => /** @type {any} */ (window).AL;
  let n = 0;
  /** @param {Element} parent @param {string} tag @param {Record<string, string | number>} attrs @returns {any} */
  const add = (parent, tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    parent.appendChild(e);
    return e;
  };
  /** @param {Element} defs @param {string} id @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 */
  const fade = (defs, id, x1, y1, x2, y2) => {
    const g = add(defs, "linearGradient", { id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 });
    add(g, "stop", { offset: 0, style: "stop-color: var(--brand-line)" });
    add(g, "stop", { offset: 1, style: "stop-color: var(--brand-line); stop-opacity: 0" });
  };

  // Five 45° lines rising from the bottom and eight horizontal lines at the right edge, each fading out from its
  // bright end (guide pp. 1, 20–22), placed for this frame: smaller strokes and spacing off 16:9. Draw them in with
  // strokeDashoffset 1 → 0.
  /** @param {SVGSVGElement} svg @param {SVGLineElement[]} diag @param {SVGLineElement[]} horiz */
  const placeLines = (svg, diag, horiz) => {
    const { W, H, mode } = al(), s = mode === "L" ? 1 : 0.8, R = Math.round;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    diag.forEach((l, i) => {
      const x1 = W * 0.51 + i * 100 * s;
      l.setAttribute("x1", String(x1)); l.setAttribute("y1", String(H + 20)); l.setAttribute("x2", String(x1 + 900 * s)); l.setAttribute("y2", String(H + 20 - 900 * s));
      l.setAttribute("stroke-width", String(R(16 * s)));
    });
    const top = H - horiz.length * 70 * s;
    horiz.forEach((l, i) => {
      const y = top + i * 70 * s + 30 * s;
      l.setAttribute("x1", String(W + 20)); l.setAttribute("y1", String(y)); l.setAttribute("x2", String(W * 0.6)); l.setAttribute("y2", String(y));
      l.setAttribute("stroke-width", String(R(16 * s)));
    });
    return { gdY1: H, gdY2: H - 880 * s, ghX1: W, ghX2: W * 0.6 };
  };

  /** @param {SVGSVGElement} svg @returns {{ diag: SVGLineElement[], horiz: SVGLineElement[] }} */
  const lines = (svg) => {
    const k = ++n, defs = add(svg, "defs", {});
    const diag = Array.from({ length: 5 }, () => add(svg, "line", { stroke: `url(#kb-gd-${k})`, pathLength: 1 }));
    const horiz = Array.from({ length: 8 }, () => add(svg, "line", { stroke: `url(#kb-gh-${k})`, pathLength: 1 }));
    const g = placeLines(svg, diag, horiz);
    fade(defs, `kb-gd-${k}`, 0, g.gdY1, 0, g.gdY2);
    fade(defs, `kb-gh-${k}`, g.ghX1, 0, g.ghX2, 0);
    return { diag, horiz };
  };

  // The lockup in an <svg> sized by KB.lockupBox: the mark's parallelogram and triangle, and the wordmark behind a wipe
  // (animate wipe's width 0 → 60).
  /** @param {SVGSVGElement} svg */
  const lockup = (svg) => {
    const k = ++n;
    svg.setAttribute("viewBox", "33.1758 48.3203 93.6484 11.3633");
    svg.setAttribute("overflow", "visible");
    const clip = add(add(svg, "defs", {}), "clipPath", { id: `kb-wipe-${k}` });
    const wipe = add(clip, "rect", { x: 68, y: 47, width: 0, height: 14 });
    const mark = add(svg, "g", {});
    const para = add(mark, "path", { style: "fill: var(--brand-mark)", d: "M 43.703125 49.117188 L 33.175781 59.648438 C 35.648438 59.65625 38.121094 59.667969 40.597656 59.679688 C 41.320312 59.683594 42.019531 59.398438 42.53125 58.882812 C 46.050781 55.363281 49.574219 51.839844 53.09375 48.320312 L 45.628906 48.320312 C 44.90625 48.320312 44.214844 48.605469 43.703125 49.117188 Z" });
    const tri = add(mark, "path", { style: "fill: var(--brand-mark)", d: "M 64.476562 59.648438 L 54.164062 59.648438 C 53.605469 59.648438 53.152344 59.191406 53.152344 58.628906 L 53.152344 48.320312 Z" });
    const word = add(svg, "g", { style: "fill: var(--brand-word)", "clip-path": `url(#kb-wipe-${k})` });
    for (const d of [
      "M 74.773438 53.476562 L 73.070312 56.398438 L 76.46875 56.398438 Z M 73.847656 52.128906 L 75.703125 52.128906 L 80.167969 59.679688 L 78.257812 59.679688 L 77.125 57.761719 L 72.414062 57.761719 L 71.277344 59.679688 L 69.378906 59.679688 Z",
      "M 82.621094 52.128906 L 84.539062 52.128906 L 90.503906 57.964844 L 90.503906 52.128906 L 91.992188 52.128906 L 91.992188 59.679688 L 90.171875 59.679688 L 84.117188 53.746094 L 84.117188 59.679688 L 82.621094 59.679688 Z",
      "M 104.054688 59.679688 L 96.75 59.679688 C 95.457031 59.679688 94.734375 58.945312 94.734375 57.652344 L 94.734375 54.101562 C 94.734375 52.839844 95.433594 52.128906 96.695312 52.128906 L 104.054688 52.128906 L 104.054688 53.648438 L 97.160156 53.648438 C 96.546875 53.648438 96.234375 53.875 96.234375 54.492188 L 96.234375 57.328125 C 96.234375 57.941406 96.511719 58.167969 97.085938 58.167969 L 102.554688 58.167969 L 102.554688 56.703125 L 99.535156 56.703125 L 99.535156 55.191406 L 104.054688 55.191406 Z",
      "M 108.28125 58.160156 L 115.832031 58.160156 L 115.832031 59.679688 L 106.792969 59.679688 L 106.792969 52.128906 L 108.28125 52.128906 Z",
      "M 119.621094 58.160156 L 126.824219 58.160156 L 126.824219 59.679688 L 118.121094 59.679688 L 118.121094 52.128906 L 126.824219 52.128906 L 126.824219 53.648438 L 119.621094 53.648438 L 119.621094 55.140625 L 126.535156 55.140625 L 126.535156 56.660156 L 119.621094 56.660156 Z",
    ]) add(word, "path", { d });
    return { mark, para, tri, word, wipe };
  };

  // The lockup's box at width w, centred on cy (viewBox 93.6484 × 11.3633), with where the mark's centre sits and how
  // far the mark steps left as the wordmark wipes in.
  /** @param {number} w @param {number} cy */
  const lockupBox = (w, cy) => {
    const R = Math.round, ppu = w / 93.6484, h = R(11.3633 * ppu);
    return { w, h, left: R((al().W - w) / 2), top: R(cy - h / 2), markCx: R(15.65 * ppu), shift: R(31.17 * ppu) };
  };

  const w = /** @type {any} */ (window);
  w.KB = { ...w.KB, motif: lines, lines, lockup, lockupBox };
})();
