/** @type {import('next').NextConfig} */

// Allow generated/uploaded images served by the API (local storage driver
// serves them at `${API_HOST}/files/...`). Derived from NEXT_PUBLIC_API_URL so
// it works in dev and on the VPS without further config.
const remotePatterns = [
  { protocol: 'https', hostname: '*.r2.dev', pathname: '/**' },
  { protocol: 'https', hostname: 'cdn.kuttystory.com', pathname: '/**' },
  { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
];

try {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const u = new URL(apiUrl);
  remotePatterns.push({
    protocol: u.protocol.replace(':', ''),
    hostname: u.hostname,
    port: u.port || '',
    pathname: '/files/**',
  });
} catch {
  // ignore malformed API URL
}

const nextConfig = {
  // output: 'standalone', // Enable for production VPS deployment
  transpilePackages: ['@kutty-story/ui', '@kutty-story/shared'],
  images: { remotePatterns },
};

module.exports = nextConfig;
