// The kit's motion, so every film moves alike: arrivals expo.out ~0.6 s, words blur in 6 → 0 px 0.07 s apart, a
// press scales the cursor to 0.84, prompts type at 15 chars/s and replies stream at ~160, the motif draws in and the
// logo assembles.
// Each helper adds tweens to the scene's paused timeline `tl` at time `t` and returns the time it ends. Pass elements
// (the scene's own document.querySelectorAll), never selector strings: these helpers run outside the scene's scope,
// so a string would also match the same scene mounted elsewhere in the film.
// The window's KM, a top-level `var` like layout.js's AL.
var KM = (function () {
  /** @typedef {(tl: gsap.core.Timeline, els: gsap.TweenTarget, t: number) => number} Entrance */

  // Three title entrances, each with a role: blur for statements, rise for section titles, ink for a promise.
  /** @type {Entrance} */
  const words = (tl, els, t) => {
    const n = gsap.utils.toArray(els).length;
    tl.fromTo(els, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.13, stagger: 0.07, ease: "none" }, t);
    return t + 0.13 + 0.07 * (n - 1);
  };
  /** @type {Entrance} */
  const rise = (tl, els, t) => {
    tl.fromTo(els, { clipPath: "inset(0% 0% 100% 0%)", y: 28 }, { clipPath: "inset(0% 0% -25% 0%)", y: 0, duration: 0.6, ease: "expo.out" }, t);
    return t + 0.6;
  };
  /** @type {Entrance} */
  const ink = (tl, els, t) => {
    const n = gsap.utils.toArray(els).length;
    tl.fromTo(els, { opacity: 0.25 }, { opacity: 1, duration: 0.35, stagger: 0.12, ease: "power1.out" }, t);
    return t + 0.35 + 0.12 * (n - 1);
  };
  /** @type {Entrance} */
  const out = (tl, els, t) => {
    tl.to(els, { opacity: 0, filter: "blur(8px)", duration: 0.2, ease: "power2.in" }, t);
    return t + 0.2;
  };
  /** @type {Entrance} */
  const arrive = (tl, els, t) => {
    tl.fromTo(els, { opacity: 0, y: 40, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, t);
    return t + 0.55;
  };

  // Text that appears a character at a time: typed by a person (cps 15) or streamed by a model (cps ~160).
  /** @param {gsap.core.Timeline} tl @param {Element} el @param {string} text @param {number} t @param {number} cps */
  const type = (tl, el, text, t, cps) => {
    for (let i = 1; i <= text.length; i++) tl.set(el, { textContent: text.slice(0, i) }, t + i / cps);
    return t + text.length / cps;
  };

  // A button press: the target dips while the cursor (if any) squeezes; the consequence starts on t + 0.1.
  /** @param {gsap.core.Timeline} tl @param {gsap.TweenTarget} target @param {gsap.TweenTarget | null} cursor @param {number} t */
  const press = (tl, target, cursor, t) => {
    tl.to(target, { scale: 0.94, duration: 0.1, ease: "power2.in" }, t).to(target, { scale: 1, duration: 0.22, ease: "power2.out" }, t + 0.1);
    if (cursor) tl.to(cursor, { scale: 0.84, duration: 0.1, ease: "power2.in" }, t).to(cursor, { scale: 1, duration: 0.22, ease: "power2.out" }, t + 0.1);
    return t + 0.1;
  };
  // The cursor enters from below the frame onto (x, y), arriving at t; it leaves with cursorOut.
  /** @param {gsap.core.Timeline} tl @param {gsap.TweenTarget} cursor @param {number} x @param {number} y @param {number} t */
  const cursorIn = (tl, cursor, x, y, t) => {
    tl.fromTo(cursor, { x: x + 170, y: AL.H + 100 }, { x, y, duration: 0.6, ease: "power3.out" }, t - 0.6);
    return t;
  };
  /** @param {gsap.core.Timeline} tl @param {gsap.TweenTarget} cursor @param {number} x @param {number} y @param {number} t */
  const cursorTo = (tl, cursor, x, y, t, duration = 0.45) => {
    tl.to(cursor, { x, y, duration, ease: "power2.inOut" }, t - duration);
    return t;
  };
  /** @param {gsap.core.Timeline} tl @param {gsap.TweenTarget} cursor @param {number} t */
  const cursorOut = (tl, cursor, t) => {
    tl.to(cursor, { y: AL.H + 160, duration: 0.4, ease: "power2.in" }, t);
    return t + 0.4;
  };

  // The theme's motif (KB.motif) draws in: each group of strokes 0.1 s after the last, stroke by stroke.
  /** @param {gsap.core.Timeline} tl @param {Record<string, Element[]>} motif @param {number} t */
  const drawMotif = (tl, motif, t) => {
    const groups = Object.values(motif);
    groups.forEach((strokes, i) =>
      tl.fromTo(strokes, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, stagger: 0.04, ease: "expo.out" }, t + 0.1 * i));
    return t + 0.1 * (groups.length - 1) + 0.5;
  };
  // The logo's mark (KB.lockup) arrives as two pieces that accelerate into contact along a 45° edge at `contact`, with
  // no bounce: the sound's hit lands there. Then the mark steps left as the wordmark wipes in. L is KB.lockupBox's box.
  /**
   * @param {gsap.core.Timeline} tl @param {SVGSVGElement} svg
   * @param {{ mark: Element, para: Element, tri: Element, wipe: Element }} parts
   * @param {{ h: number, markCx: number, shift: number }} L @param {number} contact
   */
  const assemble = (tl, svg, parts, L, contact) => {
    tl.fromTo(svg, { x: L.shift, scale: 1.45, transformOrigin: `${L.markCx}px ${L.h / 2}px` }, { x: L.shift, scale: 1.45, duration: 0.01 }, 0);
    tl.fromTo(parts.mark, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, contact - 0.36);
    tl.fromTo(parts.para, { x: -26, y: 26 }, { x: 0, y: 0, duration: 0.36, ease: "power3.in" }, contact - 0.36);
    tl.fromTo(parts.tri, { x: 26, y: -26 }, { x: 0, y: 0, duration: 0.36, ease: "power3.in" }, contact - 0.36);
    tl.to(svg, { x: 0, scale: 1, duration: 0.55, ease: "expo.inOut" }, contact + 0.2);
    tl.fromTo(parts.wipe, { attr: { width: 0 } }, { attr: { width: 60 }, duration: 0.45, ease: "power2.out" }, contact + 0.4);
    return contact + 0.85;
  };

  // A copy line with *one* accent word and \n line breaks, as word spans for the entrances above.
  /** @param {string} text */
  const wordSpans = (text) =>
    text.split("\n").map((line) =>
      line.split(" ").filter(Boolean).map((w) => {
        const accent = /^\*.*\*[.,!?]?$/.test(w);
        return `<span class="word${accent ? " accent" : ""}">${w.replace(/\*/g, "")} </span>`;
      }).join(""),
    ).join("<br>");

  return { words, rise, ink, out, arrive, type, press, cursorIn, cursorTo, cursorOut, drawMotif, assemble, wordSpans };
})();
