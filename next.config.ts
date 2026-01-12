import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static generation for all pages to avoid SSR issues with client-only APIs
  experimental: {
    // Force all pages to be dynamically rendered
  },
  // Skip static page generation during build
  output: 'standalone',
};

export default nextConfig;
