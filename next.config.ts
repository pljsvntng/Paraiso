import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] },
  async headers() { return [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self'; frame-src https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
    ...(process.env.NODE_ENV === 'production' ? [{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}] : []),
  ] }]; },
};
export default config;
