"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// A silent example film that loops while it's on screen. It loads nothing until it's near the viewport, never
// autoplays for people who prefer reduced motion, and always has a pause button (WCAG 2.2.2).
export function LoopVideo({
  src,
  poster,
  label,
  ratio,
}: {
  src: string;
  poster: string;
  label: string;
  ratio: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && !userPaused)
          video.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
          );
        else {
          video.pause();
          setPlaying(false);
        }
      },
      { rootMargin: "200px 0px", threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [userPaused]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      setUserPaused(true);
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div
      className="group relative overflow-hidden rounded-[6px] bg-night-2"
      style={{ aspectRatio: ratio }}
    >
      <video
        ref={ref}
        className="block h-full w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full border border-line bg-night/80 text-ink backdrop-blur transition hover:border-pear hover:text-pear"
        aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
      >
        {playing ? (
          <Pause className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
