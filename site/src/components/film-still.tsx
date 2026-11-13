"use client";

import { useEffect, useRef } from "react";

// An example film's loop in its own aspect box. The poster is the first paint and the LCP; the MP4 loads only once
// the film scrolls into view (preload="none"), plays while it is on screen, and never plays for reduced motion.
export function FilmStill({
  poster,
  loop,
  label,
  ratio,
}: {
  poster: string;
  loop: string;
  label: string;
  ratio: string;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) el.play().catch(() => {});
      else el.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden rounded-[6px] bg-night-2" style={{ aspectRatio: ratio }}>
      <video
        ref={video}
        className="block h-full w-full object-cover"
        src={loop}
        poster={poster}
        aria-label={label}
        muted
        loop
        playsInline
        preload="none"
      />
    </div>
  );
}
