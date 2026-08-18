import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.IS_DOCKER === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
