import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep generated metadata in the initial head for crawlers and audit tools.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
