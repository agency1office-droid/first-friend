import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openapi.animal.go.kr" },
    ],
  },
};

export default nextConfig;
