/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router (default in Next.js 13+)
  experimental: {
    // Enable server actions
    serverActions: true,
    // Enable PPR for better performance
    ppr: true,
    // Enable React Compiler
    reactCompiler: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Type checking happens in CI/CD, not during build
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Run ESLint during builds
    ignoreDuringBuilds: false,
  },
  
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Environment variables that should be available to the client
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Next.js Production',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for bolt.diy compatibility
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add support for importing from bolt.diy
    config.resolve.alias = {
      ...config.resolve.alias,
      '@bolt': process.env.BOLT_DIY_PATH || '/mnt/c/Users/pclay/bolt.diy/app',
    };
    
    // Handle .mjs files (common in AI libraries)
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    
    return config;
  },
  
  // Redirects for development
  async redirects() {
    return [];
  },
  
  // Rewrites for API compatibility
  async rewrites() {
    return [
      // Proxy to bolt.diy development server if needed
      ...(process.env.NODE_ENV === 'development' && process.env.BOLT_DEV_PROXY ? [
        {
          source: '/bolt-api/:path*',
          destination: 'http://localhost:5173/api/:path*',
        },
      ] : []),
    ];
  },
};

// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);