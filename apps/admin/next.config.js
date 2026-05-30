/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Enable for production VPS deployment
  transpilePackages: ['@kutty-story/shared', '@kutty-story/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
    ],
  },
};

module.exports = nextConfig;
