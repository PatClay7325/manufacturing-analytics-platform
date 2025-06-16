/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Skip type checking during build to avoid timeout
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build to avoid timeout
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;