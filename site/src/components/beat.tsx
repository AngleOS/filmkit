import type { ReactNode } from "react";

// A section as a beat of a brief: its number, its timecode on the page's reel, a slate kicker, the title and the
// content. Padding steps up with the screen: 64 px on a phone, 96 on a tablet, 128 on a desktop.
export function Beat({
  id,
  n,
  tc,
  kicker,
  title,
  children,
  className,
}: {
  id: string;
  n: string;
  tc: string;
  kicker: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-14 py-16 sm:scroll-mt-16 sm:py-24 lg:py-32 ${className ?? ""}`}
    >
      <div className="shell">
        <p className="kicker mb-4 sm:mb-5">
          <span className="text-pear">{n}</span>
          <span aria-hidden="true" className="h-px w-8 bg-line" />
          <span>{kicker}</span>
          <span aria-hidden="true" className="ml-auto hidden tabular-nums sm:inline">
            {tc}
          </span>
        </p>
        <h2
          id={`${id}-title`}
          className="display mb-10 max-w-[18ch] text-[clamp(2.1rem,8.6vw,4.25rem)] sm:mb-12"
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
