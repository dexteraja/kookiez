/** @type {import('next').NextConfig} */
const nextConfig = {};
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' }, // Mencegah Clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // Mencegah MIME sniffing
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
