/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // Previene Clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // Previene MIME-Sniffing
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  compiler: {
    // Conserva error/warn en producción: si no, los fallos (p. ej. del bot) no salen en los logs de Vercel.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
