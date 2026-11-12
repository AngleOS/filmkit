// An example film's poster frame in its own aspect box, until the films themselves ship as MP4s.
export function FilmStill({ src, label, ratio }: { src: string; label: string; ratio: string }) {
  return (
    <div className="overflow-hidden rounded-[6px] bg-night-2" style={{ aspectRatio: ratio }}>
      {/* biome-ignore lint/performance/noImgElement: a static export has no image optimiser; the posters are already small WebP */}
      <img
        className="block h-full w-full object-cover"
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
