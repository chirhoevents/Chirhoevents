/** @type {import('next').NextConfig} */
const nextConfig = {
  // Treat @react-pdf/renderer and all its sub-packages as external so Next.js
  // does NOT bundle them into webpack chunks. Without this, each PDF route gets
  // its own copy of the react-pdf reconciler which causes React error #31
  // ("Objects are not valid as React child") because elements created by one
  // reconciler instance are not recognised by another.
  serverExternalPackages: [
    'pdfkit',
    '@react-pdf/renderer',
    '@react-pdf/reconciler',
    '@react-pdf/fns',
    '@react-pdf/font',
    '@react-pdf/image',
    '@react-pdf/layout',
    '@react-pdf/pdfkit',
    '@react-pdf/png-js',
    '@react-pdf/primitives',
    '@react-pdf/render',
    '@react-pdf/stylesheet',
    '@react-pdf/textkit',
    '@react-pdf/types',
    'yoga-layout',
    'fontkit',
  ],
  images: {
    domains: ['r2.chirhoevents.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
