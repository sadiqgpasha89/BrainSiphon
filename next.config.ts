import type { NextConfig } from 'next';

const isStatic = process.env.BS_STATIC === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: isStatic ? 'export' : 'standalone',
  ...(isStatic ? { trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  outputFileTracingIncludes: { '/**': ['./content/generated/**'] },
  serverExternalPackages: ['pino', 'pg', 'ioredis'],
  experimental: { optimizePackageImports: ['lucide-react'] },
  ...(isStatic
    ? {}
    : {
        async headers() {
          return [
            { source: '/:path*', headers: securityHeaders },
            {
              source: '/:domain/:slug.md',
              headers: [
                { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
                },
              ],
            },
          ];
        },
      }),
};

export default config;
