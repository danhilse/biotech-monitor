/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.polygon.io',
        port: '',
        pathname: '/v1/reference/company-branding/**',
      },
    ],
  },
  // Enable if you need to enforce stricter checks
  reactStrictMode: true,
};

module.exports = nextConfig;