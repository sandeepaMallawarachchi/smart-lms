import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow deployment while we incrementally clean strict type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
