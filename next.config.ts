import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Zillow property photos
      { protocol: 'https', hostname: 'photos.zillowstatic.com' },
      { protocol: 'https', hostname: '*.zillowstatic.com' },
      // Zillow R2 (S8Pro CDN)
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Generic fallback for any https image
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
