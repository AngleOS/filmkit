import type { NextConfig } from "next";

// A static export for GitHub Pages, served at the root of filmkit.anglehq.net (D-009). SITE_BASE_PATH stays available
// for a build served under a path (e.g. angleos.github.io/filmkit), but the deployed site needs none.
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
