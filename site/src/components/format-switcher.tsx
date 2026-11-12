"use client";

import { useState } from "react";
import { BrandLines } from "./brand-lines";

// The hero's live demo of Filmkit's core idea: one master, four frames, each laid out for its own shape and never
// cropped. The film is a sample customer's (Lumen, the same fictional brand as the product-promo example) in the
// default theme: Angle's look with the customer's own wordmark (D-007). Switching formats resizes the frame and re-lays its title, lockup and lines, as the kit's layout.js does
// for a film (L = 16:9, S = 1:1 and 4:5, V = 9:16). The controls sit above the frame, so on a phone, where the frame's
// height follows its shape, they never move under the thumb that tapped them.
const FORMATS = [
  { id: "16x9", label: "16:9", ratio: 16 / 9, mode: "L", use: "YouTube, LinkedIn and X" },
  { id: "1x1", label: "1:1", ratio: 1, mode: "S", use: "feeds and LinkedIn" },
  { id: "4x5", label: "4:5", ratio: 4 / 5, mode: "S", use: "the Instagram feed" },
  { id: "9x16", label: "9:16", ratio: 9 / 16, mode: "V", use: "Reels, Shorts and TikTok" },
] as const;

export function FormatSwitcher() {
  const [current, setCurrent] = useState<(typeof FORMATS)[number]>(FORMATS[0]);
  const [guides, setGuides] = useState(false);
  return (
    <div className="switcher">
      <div className="switcher-controls">
        <fieldset className="segmented">
          <legend className="sr-only">Format</legend>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={current.id === f.id}
              onClick={() => setCurrent(f)}
              className="segment"
            >
              <span className="fmt-icon" style={{ aspectRatio: f.ratio }} aria-hidden="true" />
              {f.label}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="frame-stage" style={{ ["--ratio" as string]: current.ratio }}>
        <div
          className="master-frame"
          data-mode={current.mode}
          data-guides={guides || undefined}
          role="img"
          aria-label={`A sample film's title frame laid out for ${current.label}: the Lumen wordmark and "Notes that file themselves.", re-laid for the shape, not cropped.`}
        >
          <BrandLines className="mf-lines" />
          <div className="mf-safe" aria-hidden="true" />
          <span className="mf-lockup mf-brand">
            <span className="mf-brand-dot" aria-hidden="true" />
            lumen
          </span>
          <p className="mf-title display">
            Notes that file <span className="text-pear">themselves.</span>
          </p>
          <span className="mf-tc font-mono" aria-hidden="true">
            {current.label} · 00:00:04:12
          </span>
        </div>
      </div>
      <div className="switcher-foot">
        <p className="switcher-caption" aria-live="polite">
          <span className="text-ink">{current.label}</span> for {current.use}. Same film, laid out
          again.
        </p>
        <button
          type="button"
          aria-pressed={guides}
          onClick={() => setGuides((g) => !g)}
          className="guides-toggle"
        >
          <span className="guides-dot" aria-hidden="true" />
          Safe zone
        </button>
      </div>
    </div>
  );
}
