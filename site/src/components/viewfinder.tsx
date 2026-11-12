import type { ReactNode } from "react";

// A frame with viewfinder corner marks and an optional slate label: how the page frames every piece of film.
export function Viewfinder({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`viewfinder relative ${className ?? ""}`}>
      <span aria-hidden="true" className="vf-corner vf-tl" />
      <span aria-hidden="true" className="vf-corner vf-tr" />
      <span aria-hidden="true" className="vf-corner vf-bl" />
      <span aria-hidden="true" className="vf-corner vf-br" />
      {label && (
        <span
          aria-hidden="true"
          className="absolute -top-6 left-0 font-mono text-[11px] tracking-[0.18em] text-muted uppercase"
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
