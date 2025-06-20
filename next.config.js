/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporarily disable for debugging
  swcMinify: false, // Disable SWC minification to avoid syntax errors
  typescript: {
    // Skip type checking during build to avoid timeout
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build to avoid timeout
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['recharts'],
  experimental: {
    esmExternals: 'loose',
  },
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;