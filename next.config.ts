import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      /* Canonical-host enforcement: GSC showed https://www.brushly.uk/
         serving full duplicate content ("Duplicate without user-selected
         canonical", crawled 2026-07-05). One host, one site. */
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.brushly.uk' }],
        destination: 'https://brushly.uk/:path*',
        permanent: true,
      },
      /* Legacy URL from the pre-launch site still 404ing in GSC. */
      {
        source: '/quote',
        destination: '/contact',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
