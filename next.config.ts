import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.HOSTNAME === '0.0.0.0' ? 'standalone' : undefined,
};

export default nextConfig;
