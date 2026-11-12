// One film, four frames: L = 16:9, S = 1:1 and 4:5, V = 9:16. Scenes read the mode and canvas size from here so each
// format is laid out for its own frame, never cropped from the master. The size is the root composition's
// data-width / data-height, which filmkit sets per format. Scenes apply layout with gsap.set at build time: their
// CSS is scoped by the runtime, so mode-dependent rules live here.
// A top-level `var` gives `tsc --checkJs` AL's type; the window gets it too, explicitly, for a page or a test whose
// global isn't the window.
var AL = (function () {
  const root = /** @type {HTMLElement} */ (document.querySelector('[data-composition-id="main"]'));
  const W = Number(root.dataset.width), H = Number(root.dataset.height), r = W / H;
  const mode = r > 1.2 ? "L" : r > 0.7 ? "S" : "V";
  document.documentElement.dataset.mode = mode;
  /**
   * pick({L: a, S: b, V: c}) → the value for this frame; S falls back to V when absent
   * @template T @param {{ L: T, S?: T, V: T }} o @returns {T}
   */
  const pick = (o) => o[mode] ?? (mode === "S" ? o.V : o.L);
  const R = Math.round;

  // Where words and the key action stay. 9:16 keeps clear of the feeds' header, action rail and caption block; 4:5
  // and 1:1 keep 64 px sides; 16:9 is the 90% action-safe box. The feeds move these when they redesign, so check the
  // destination before a paid post.
  const safe = pick({
    L: { top: R(H * 0.05), right: R(W * 0.05), bottom: R(H * 0.05), left: R(W * 0.05) },
    S: r < 0.9 ? { top: 96, right: 64, bottom: 96, left: 64 } : { top: 64, right: 64, bottom: 64, left: 64 },
    V: { top: 270, right: 120, bottom: 420, left: 64 },
  });
  // Burned-in captions: centred in the 80% title-safe width on 16:9, on the safe box's floor elsewhere.
  // bottom is the distance from the frame's bottom edge to the caption's baseline box.
  const captions = pick({
    L: { left: R(W * 0.1), width: R(W * 0.8), bottom: R(H * 0.1), fontSize: 44 },
    S: { left: safe.left, width: W - safe.left - safe.right, bottom: safe.bottom + 24, fontSize: 44 },
    V: { left: safe.left, width: W - safe.left - safe.right, bottom: safe.bottom + 24, fontSize: 52 },
  });

  // The content column: where a product's messages, code and forms sit, clear of 9:16's action rail.
  const column = pick({
    L: { left: 310, width: 1300 },
    S: { left: safe.left, width: W - safe.left - safe.right },
    V: { left: safe.left, width: W - safe.left - safe.right },
  });

  // Where a product shot sits under a title placed at the top ("place": "top"): the rest of the safe box, below room
  // for a two-line title and its second line (three lines in 9:16).
  const stage = (() => {
    const top = pick({ L: 250, S: safe.top + 250, V: safe.top + 330 });
    return { left: safe.left, top, width: W - safe.left - safe.right, height: H - safe.bottom - top };
  })();

  // The composer, 180 px tall, low in the safe box, as in a chat, leaving room above for a title
  // and below for two lines of captions; `send` is the point the cursor aims for.
  const composer = (() => {
    const { left, width } = column, height = 180, top = H - safe.bottom - height - pick({ L: 140, S: 150, V: 200 });
    return { left, top, width, height, send: [left + width - 62, top + height - 56] };
  })();

  // The app window (the ui scene): on the stage under a top title, or filling the safe box. `body` is the part below
  // its title bar, where a film's own composition rebuilds the product's UI.
  /** @param {string} place "stage", else the safe box */
  const app = (place) => {
    const box = place === "stage" ? stage : { left: safe.left, top: safe.top, width: W - safe.left - safe.right, height: H - safe.top - safe.bottom };
    const bar = pick({ L: 64, S: 60, V: 60 });
    return { ...box, bar, body: { left: box.left, top: box.top + bar, width: box.width, height: box.height - bar } };
  };

  // Where a chart sits: the stage, stopped above the caption block (two lines in 16:9 and the square frames, three in
  // 9:16) so a number never lands under a caption, burned in or the feed's own. Its source line takes the floor. The
  // Angle films' 9:16 and 1:1 cuts broke here: source lines against captions.
  const chart = (() => {
    const floor = H - captions.bottom - R(captions.fontSize * 1.3 * pick({ L: 2, S: 2, V: 3 })) - 28;
    return { left: stage.left, top: stage.top, width: stage.width, height: floor - stage.top };
  })();
  // A chart's source line, on the chart box's floor: left-aligned in 16:9 (under a left-aligned title), centred
  // elsewhere. One line, so `check` flags one too long for the frame. Returns the room it takes, so the chart stops
  // above it.
  /** @param {HTMLElement} el @param {string} text */
  const source = (el, text) => {
    const size = pick({ L: 28, S: 28, V: 30 }), h = R(size * 1.3);
    el.textContent = text;
    gsap.set(el, { position: "absolute", left: chart.left, width: chart.width, top: chart.top + chart.height - h, fontSize: size, lineHeight: 1.3, color: "var(--muted-foreground)", textAlign: mode === "L" ? "left" : "center", whiteSpace: "nowrap" });
    return text ? h + 24 : 0;
  };

  // A scene's ground: one of the theme's fills (ink, accent-dark, paper), or none for an overlay (over-paper for one
  // over a paper scene). Paper is light, so the theme's .on-paper turns the text dark over it.
  /** @param {HTMLElement} el @param {string} name */
  const ground = (el, name) => {
    el.classList.toggle("on-paper", name === "paper" || name === "over-paper");
    el.style.background = name === "none" || name === "over-paper" ? "transparent" : `var(--${name})`;
  };

  // A scene's variables: its declared defaults under the host's values. HyperFrames 0.8.186 drops a scene file's
  // defaults when a film mounts it more than once, so read them from the scene root's own declaration.
  /** @param {Element} root @param {{ getVariables(): Record<string, unknown> }} hf @returns {Record<string, any>} */
  const vars = (root, hf) => {
    /** @type {{ id: string, default: unknown }[]} */
    const declared = JSON.parse(root.getAttribute("data-composition-variables") || "[]");
    return { ...Object.fromEntries(declared.map((d) => [d.id, d.default])), ...hf.getVariables() };
  };

  return { W, H, mode, pick, safe, captions, column, composer, stage, app, chart, source, ground, vars };
})();
window.AL = AL;
