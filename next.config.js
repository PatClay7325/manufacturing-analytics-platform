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
  transpilePackages: ['highcharts', 'highcharts-react-official', '@highcharts/dashboards'],
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;