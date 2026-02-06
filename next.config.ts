import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static generation for all pages to avoid SSR issues with client-only APIs
  experimental: {
    // Force all pages to be dynamically rendered
  },
  // Skip static page generation during build
  output: 'standalone',

  // Security Headers (CSP for Cloudflare Turnstile)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "frame-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com",
              "connect-src 'self' https: wss:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;