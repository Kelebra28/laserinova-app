import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // Previene Clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // Previene MIME-Sniffing
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/(.*)', // Aplica a todas las rutas
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
