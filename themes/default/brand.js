// The default theme's lockup, over angle's brand.js, whose lines motif it keeps: the studio's own logo (KB.mark, from
// brand/logo.svg) as the mark, cut on its diagonal so its two halves can meet, and the studio's name (KB.name) beside
// it in the display face. A logo drawn in currentColor takes the ground's --brand-mark. The ids inside the logo get a
// counter, like the lockup's own: a film mounts it more than once, and a gradient inside a scene the runtime hides
// paints nothing.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const w = /** @type {any} */ (window);
  // The mark fills a 12-unit square, and the name starts at GAP in the display face at 10 units.
  const GAP = 17;
  let n = 0;
  /** @param {Element} parent @param {string} tag @param {Record<string, string | number>} attrs @returns {any} */
  const add = (parent, tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    parent.appendChild(e);
    return e;
  };

  /** The display face at 10 px, as a canvas or document.fonts names it. */
  const face = () => {
    const css = getComputedStyle(document.documentElement);
    return `${css.getPropertyValue("--title-weight")} 10px ${css.getPropertyValue("--font-display")}`;
  };

  // The lockup's width in viewBox units: the mark, the gap and the name as the display face sets it.
  const units = () => {
    const ctx = /** @type {any} */ (document.createElement("canvas").getContext("2d"));
    ctx.font = face();
    ctx.letterSpacing = getComputedStyle(document.documentElement).getPropertyValue("--title-tracking").trim() || "0px";
    return GAP + ctx.measureText(w.KB.name).width;
  };

  // A scene lays out before the theme's fonts load, and measured in the fallback face a long name is cut at the
  // lockup's edge: the lockup's scenes build once the display face has loaded.
  const ready = () => document.fonts.load(face(), w.KB.name);

  /** A copy of the studio's logo in the 12-unit square. @param {Element} parent @param {string} id */
  const logo = (parent, id) => {
    const src = new DOMParser().parseFromString(w.KB.mark, "image/svg+xml").documentElement;
    if (src.nodeName !== "svg") return;
    const box = src.getAttribute("viewBox") ?? `0 0 ${parseFloat(src.getAttribute("width") ?? "") || 12} ${parseFloat(src.getAttribute("height") ?? "") || 12}`;
    add(parent, "svg", { width: 12, height: 12, viewBox: box }).innerHTML = src.innerHTML.replace(/(\bid="|url\(#|href="#)/g, `$1${id}-`);
  };

  /** @param {SVGSVGElement} svg */
  const lockup = (svg) => {
    const k = ++n, u = units();
    svg.setAttribute("viewBox", `0 0 ${u} 12`);
    svg.setAttribute("overflow", "visible");
    const defs = add(svg, "defs", {});
    // Each half is masked, not clipped: a clip cuts every shape of the logo on its own, and a shape under another then
    // shows along the cut. The top half reaches a quarter unit over the cut, so the halves leave no hairline between them.
    const half = (/** @type {string} */ id, /** @type {string} */ points) =>
      add(add(defs, "mask", { id, maskUnits: "userSpaceOnUse", x: -1, y: -1, width: 14, height: 14 }), "polygon", { points, style: "fill: white" });
    half(`kb-para-${k}`, "0,0 12,12 0,12");
    half(`kb-tri-${k}`, "-0.25,0 12,0 12,12.25");
    // The kit opens the wipe's width 0 → 60: scaled so that 60 uncovers the whole name.
    const wipe = add(add(defs, "clipPath", { id: `kb-wipe-${k}` }), "rect", { x: 0, y: -2, width: 0, height: 16, transform: `translate(15 0) scale(${(u - 15) / 60} 1)` });
    const mark = add(svg, "g", { style: "color: var(--brand-mark); fill: var(--brand-mark)" });
    const para = add(mark, "g", { mask: `url(#kb-para-${k})` });
    const tri = add(mark, "g", { mask: `url(#kb-tri-${k})` });
    logo(para, `kb-logo-${k}-p`);
    logo(tri, `kb-logo-${k}-t`);
    const word = add(svg, "g", { "clip-path": `url(#kb-wipe-${k})` });
    add(word, "text", { x: GAP, y: 9.55, style: "fill: var(--brand-word); font: var(--title-weight) 10px var(--font-display); letter-spacing: var(--title-tracking)" })
      .textContent = w.KB.name;
    return { mark, para, tri, word, wipe };
  };

  // The lockup's box, centred on cy, at the scale where `w` would fit a short name (67 units), and narrower than `w`
  // for a long one; with where the mark's centre sits and how far the mark steps left as the name wipes in.
  /** @param {number} width @param {number} cy */
  const lockupBox = (width, cy) => {
    const R = Math.round, u = units(), ppu = width / Math.max(67, u), bw = R(u * ppu), h = R(12 * ppu);
    return { w: bw, h, left: R((w.AL.W - bw) / 2), top: R(cy - h / 2), markCx: R(6 * ppu), shift: R((u / 2 - 6) * ppu) };
  };

  w.KB = { ...w.KB, lockup, lockupBox, ready };
})();
