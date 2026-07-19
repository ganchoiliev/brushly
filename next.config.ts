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
      /* Canonical-host note: www -> apex is enforced at the INFRA layer
         (Vercel domain config + DNS), never here. A code-level host
         redirect took the site down on 2026-07-19: apex lived at a
         Hostinger redirect pointing back to www, so code redirecting
         www -> apex created a loop. Keep host routing out of the app. */
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
