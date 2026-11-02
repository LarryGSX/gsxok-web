import type { NextConfig } from 'next'
import { localStaging } from './staging/config'
import path from 'node:path'

const staging = localStaging()

const nextConfig: NextConfig = {
  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    ...(staging
      ? {
          dangerouslyAllowLocalIP: true,
        }
      : {}),
    remotePatterns: [
      ...(staging
        ? [
            {
              protocol: 'http' as const,
              hostname: '127.0.0.1',
              port: '4317',
              pathname: '/image.png',
            },
          ]
        : []),
      {
        // Sanity CDN
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
  webpack(config) {
    if (staging) config.resolve.alias['next/image$'] = path.resolve('staging/next-image.tsx')
    return config
  },

  // ── Legacy URL redirects ───────────────────────────────────────────────────
  // Maps every .html route from the old PHP site to the new clean URL.
  // Source is matched case-insensitively by Next.js.
  async redirects() {
    return [
      // Marketing pages
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/products.html', destination: '/products', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
      { source: '/where-to-buy.html', destination: '/find-gsx', permanent: true },

      // Legacy portal paths → new portal equivalents
      { source: '/login.php', destination: '/login', permanent: true },
      { source: '/register.php', destination: '/register', permanent: true },
      { source: '/dashboard.php', destination: '/portal', permanent: true },
      { source: '/order.php', destination: '/portal/order', permanent: true },
      { source: '/order-history.php', destination: '/portal/orders', permanent: true },
      { source: '/profile.php', destination: '/portal/account', permanent: true },
      { source: '/forgot-password.php', destination: '/forgot-password', permanent: true },

      // Catch-all: any other .html file → homepage
      // NOTE: Keep this last so specific rules above take precedence.
      { source: '/:path*.html', destination: '/', permanent: true },
    ]
  },

  // ── Rewrites ──────────────────────────────────────────────────────────────
  // Mount Sanity Studio at /studio. The studio itself lives in the
  // sanity/ directory at the project root and is loaded as a Next.js route
  // under app/(studio)/studio/page.tsx.
  // No rewrite needed — the App Router handles this via route groups.
}

export default nextConfig
