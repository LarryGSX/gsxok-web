import type { NextConfig } from 'next'

// HostGator static-export build. This file differs from the Vercel
// control branch's next.config.ts in exactly the ways a static export
// requires — nothing else:
//
//   - output: 'export' — produces plain HTML/CSS/JS in out/, no Node
//     server needed at runtime.
//   - images.unoptimized — required by output:'export' whenever next/image
//     is used (it is, in 9 components). This does not change which
//     <Image> components render or their width/height/sizing — it only
//     skips Next's own on-the-fly resize/reformat step. Every image src in
//     this project is already either a Sanity CDN URL (which does its own
//     resizing via query params, see lib/sanity/client.ts's urlFor()) or a
//     local /public asset, so visual sizing is unaffected.
//   - redirects() removed — Next.js does not support redirects() with
//     output:'export' (the build fails if it's present). The exact same
//     legacy .html/.php → clean-URL mappings are reimplemented in
//     .htaccess instead (see that file's comments for the one-to-one
//     mapping back to this list).
//
// Everything else (remotePatterns for the Sanity CDN) is unchanged from
// the control branch.
const nextConfig: NextConfig = {
  output: 'export',

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        // Sanity CDN
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
}

export default nextConfig
