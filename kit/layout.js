// One film, four frames: L = 16:9, S = 1:1 and 4:5, V = 9:16. Scenes read the mode and canvas size from here so each
// format is laid out for its own frame, never cropped from the master. The size is the root composition's
// data-width / data-height, which filmkit sets per format. Scenes apply layout with gsap.set at build time: their
// CSS is scoped by the runtime, so mode-dependent rules live here.
(function () {
  const root = document.querySelector('[data-composition-id="main"]');
  const W = +root.dataset.width, H = +root.dataset.height, r = W / H;
  const mode = r > 1.2 ? "L" : r > 0.7 ? "S" : "V";
  document.documentElement.dataset.mode = mode;
  // pick({L: a, S: b, V: c}) → the value for this frame; S falls back to V when absent
  const pick = (o) => (mode in o ? o[mode] : mode === "S" ? o.V : o.L);
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
  const app = (place) => {
    const box = place === "stage" ? stage : { left: safe.left, top: safe.top, width: W - safe.left - safe.right, height: H - safe.top - safe.bottom };
    const bar = pick({ L: 64, S: 60, V: 60 });
    return { ...box, bar, body: { left: box.left, top: box.top + bar, width: box.width, height: box.height - bar } };
  };

  // A scene's ground: one of the theme's fills (ink, accent-dark, paper), or none for an overlay. Paper is light, so
  // the theme's .on-paper turns the text dark over it.
  const ground = (el, name) => {
    el.classList.toggle("on-paper", name === "paper");
    el.style.background = name === "none" ? "transparent" : `var(--${name})`;
  };

  // A scene's variables: its declared defaults under the host's values. HyperFrames 0.8.186 drops a scene file's
  // defaults when a film mounts it more than once, so read them from the scene root's own declaration.
  const vars = (root, hf) => {
    const declared = JSON.parse(root.getAttribute("data-composition-variables") || "[]");
    return { ...Object.fromEntries(declared.map((d) => [d.id, d.default])), ...hf.getVariables() };
  };

  window.AL = { W, H, mode, pick, safe, captions, column, composer, stage, app, ground, vars };
})();
