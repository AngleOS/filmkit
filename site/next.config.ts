import type { NextConfig } from "next";

// A static export for GitHub Pages. The site lives under /filmkit on angleos.github.io, so the build takes the base
// path from SITE_BASE_PATH (the Pages workflow sets it; local dev and Lighthouse run at /).
const basePath = process.env.SITE_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  basePath,
  images: { unoptimized: true },
  env: { SITE_BASE_PATH: basePath },
};

export default nextConfig;
