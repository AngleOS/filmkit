// Angle's brand lines: 45° lines rising from the bottom right and horizontal lines at the right edge, fading from
// their bright ends (the films' motif, themes/angle/brand.js). They draw in once on load; reduced motion shows them
// drawn.
export function BrandLines({ className }: { className?: string }) {
  const diag = [0, 1, 2, 3, 4];
  const horiz = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <svg
      className={className}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bl-d" gradientUnits="userSpaceOnUse" x1="0" y1="1080" x2="0" y2="200">
          <stop offset="0" stopColor="var(--color-pear)" />
          <stop offset="1" stopColor="var(--color-pear)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bl-h" gradientUnits="userSpaceOnUse" x1="1920" y1="0" x2="1152" y2="0">
          <stop offset="0" stopColor="var(--color-pear)" />
          <stop offset="1" stopColor="var(--color-pear)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {diag.map((i) => (
        <line
          key={`d${i}`}
          className="brand-line"
          style={{ animationDelay: `${0.15 + i * 0.05}s` }}
          pathLength={1}
          x1={979 + i * 100}
          y1={1100}
          x2={1879 + i * 100}
          y2={200}
          stroke="url(#bl-d)"
          strokeWidth={16}
        />
      ))}
      {horiz.map((i) => (
        <line
          key={`h${i}`}
          className="brand-line"
          style={{ animationDelay: `${0.25 + i * 0.035}s` }}
          pathLength={1}
          x1={1940}
          y1={550 + i * 70}
          x2={1152}
          y2={550 + i * 70}
          stroke="url(#bl-h)"
          strokeWidth={16}
        />
      ))}
    </svg>
  );
}
