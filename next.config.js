/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // SWC minification is enabled by default in Next.js 13+
  
  
  // Standalone output for Docker deployment
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    // We've fixed syntax errors, so enable strict checking
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Enable ESLint during builds for code quality
    ignoreDuringBuilds: false,
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
  },
  
  // Transpile packages for compatibility
  transpilePackages: [
    'recharts',
    '@heroicons/react',
    'lucide-react'
  ],
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  
  // Experimental features for enterprise capabilities
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? { 
      exclude: ['error', 'warn'] 
    } : false,
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Image optimization settings
  images: {
    domains: ['localhost', 'cdn.adaptivefactory.ai'],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === 'development',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Webpack customizations following Next.js best practices
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Redirect AWS SDK imports to our stub implementation
    const awsSdkModules = [
      'client-cloudwatch',
      'client-dynamodb',
      'client-s3',
      'client-ses',
      'client-sns',
      'client-rds',
      'client-ec2',
      'client-elastic-load-balancing-v2',
      'client-auto-scaling',
      'client-kms',
      'client-sfn',
      'util-dynamodb',
      'node-http-handler'
    ];
    
    awsSdkModules.forEach(module => {
      config.resolve.alias[`@aws-sdk/${module}`] = require.resolve('./src/lib/aws-sdk-stub.ts');
    });
    
    // Handle node polyfills properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    // Add bundle analysis only if analyzer is installed
    if (process.env.ANALYZE === 'true') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: isServer ? '../server-analyze.html' : '../client-analyze.html',
            openAnalyzer: false,
          })
        );
      } catch (error) {
        console.warn('webpack-bundle-analyzer not installed. Skipping bundle analysis.');
      }
    }
    
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;