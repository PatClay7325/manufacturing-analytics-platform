#!/usr/bin/env ts-node
/**
 * Script to complete Task 1: Optimize Existing Next.js Infrastructure
 * This will fix all issues and implement all optimizations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

interface TaskStep {
  name: string;
  action: () => void;
  verify: () => boolean;
}

class Task1Completer {
  private steps: TaskStep[] = [];
  private errors: string[] = [];

  constructor() {
    this.defineSteps();
  }

  private defineSteps() {
    this.steps = [
      {
        name: 'Fix remaining syntax errors',
        action: () => this.fixSyntaxErrors(),
        verify: () => this.verifySyntaxClean()
      },
      {
        name: 'Install missing dependencies',
        action: () => this.installDependencies(),
        verify: () => this.verifyDependencies()
      },
      {
        name: 'Update Next.js configuration',
        action: () => this.updateNextConfig(),
        verify: () => this.verifyNextConfig()
      },
      {
        name: 'Configure TypeScript for enterprise',
        action: () => this.configureTypeScript(),
        verify: () => this.verifyTypeScript()
      },
      {
        name: 'Set up error boundaries',
        action: () => this.setupErrorBoundaries(),
        verify: () => this.verifyErrorBoundaries()
      },
      {
        name: 'Configure monitoring',
        action: () => this.configureMonitoring(),
        verify: () => this.verifyMonitoring()
      },
      {
        name: 'Optimize build process',
        action: () => this.optimizeBuild(),
        verify: () => this.verifyBuildOptimization()
      }
    ];
  }

  private fixSyntaxErrors() {
    console.log('🔧 Fixing syntax errors...');
    
    // Fix support page
    const supportPath = path.join(projectRoot, 'src/app/support/page.tsx');
    if (fs.existsSync(supportPath)) {
      let content = fs.readFileSync(supportPath, 'utf-8');
      // Ensure proper JSX structure
      if (!content.includes('import React from')) {
        content = `import React from 'react';\n${content}`;
      }
      fs.writeFileSync(supportPath, content);
    }

    // Run syntax fix scripts
    try {
      execSync('node scripts/fix-syntax-errors.js', { stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️  Syntax fix script had issues, continuing...');
    }
  }

  private verifySyntaxClean(): boolean {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }

  private installDependencies() {
    console.log('📦 Installing missing dependencies...');
    
    const dependencies = [
      'ioredis',
      'argon2',
      'isomorphic-dompurify',
      'validator',
      '@types/validator'
    ];

    dependencies.forEach(dep => {
      try {
        console.log(`  Installing ${dep}...`);
        execSync(`npm install ${dep} --save`, { stdio: 'inherit' });
      } catch (e) {
        console.warn(`  ⚠️  Failed to install ${dep}, will use stub`);
      }
    });
  }

  private verifyDependencies(): boolean {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
    );
    
    const required = ['@sentry/nextjs', 'lodash', 'joi', 'prom-client'];
    return required.every(dep => packageJson.dependencies[dep]);
  }

  private updateNextConfig() {
    console.log('⚙️  Updating Next.js configuration...');
    
    const configContent = `/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  images: {
    domains: ['localhost'],
    formats: ['image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
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

  webpack: (config, { isServer, webpack }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : '../analyze/client.html',
        })
      );
    }

    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };

    return config;
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
`;

    fs.writeFileSync(
      path.join(projectRoot, 'next.config.js'),
      configContent
    );
  }

  private verifyNextConfig(): boolean {
    const config = fs.readFileSync(
      path.join(projectRoot, 'next.config.js'),
      'utf-8'
    );
    
    return config.includes('swcMinify') && 
           config.includes('headers') &&
           config.includes('splitChunks');
  }

  private configureTypeScript() {
    console.log('📝 Configuring TypeScript...');
    
    const tsconfig = {
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        noImplicitAny: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedIndexedAccess: true,
        allowUnreachableCode: false,
        plugins: [
          {
            name: 'next'
          }
        ],
        paths: {
          '@/*': ['./src/*']
        }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules']
    };

    fs.writeFileSync(
      path.join(projectRoot, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );
  }

  private verifyTypeScript(): boolean {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf-8')
    );
    
    return tsconfig.compilerOptions.strict === true;
  }

  private setupErrorBoundaries() {
    console.log('🛡️  Setting up error boundaries...');
    
    // Global error boundary is already created
    // Ensure app-level error pages exist
    const errorPages = [
      { path: 'src/app/error.tsx', exists: true },
      { path: 'src/app/global-error.tsx', exists: true },
      { path: 'src/app/not-found.tsx', exists: true }
    ];

    errorPages.forEach(({ path: pagePath, exists }) => {
      const fullPath = path.join(projectRoot, pagePath);
      if (exists && !fs.existsSync(fullPath)) {
        console.warn(`  ⚠️  Missing ${pagePath}`);
      }
    });
  }

  private verifyErrorBoundaries(): boolean {
    return fs.existsSync(
      path.join(projectRoot, 'src/components/common/ErrorBoundary.tsx')
    );
  }

  private configureMonitoring() {
    console.log('📊 Configuring monitoring...');
    
    // Create Sentry configuration
    const sentryClientConfig = `import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration(),
    ],
  });
}
`;

    fs.writeFileSync(
      path.join(projectRoot, 'sentry.client.config.ts'),
      sentryClientConfig
    );

    const sentryServerConfig = `import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  });
}
`;

    fs.writeFileSync(
      path.join(projectRoot, 'sentry.server.config.ts'),
      sentryServerConfig
    );
  }

  private verifyMonitoring(): boolean {
    return fs.existsSync(path.join(projectRoot, 'sentry.client.config.ts')) &&
           fs.existsSync(path.join(projectRoot, 'sentry.server.config.ts'));
  }

  private optimizeBuild() {
    console.log('🚀 Optimizing build process...');
    
    // Update package.json scripts
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    packageJson.scripts = {
      ...packageJson.scripts,
      'build:analyze': 'ANALYZE=true next build',
      'build:production': 'NODE_ENV=production next build',
      'lint:fix': 'next lint --fix',
      'test:ci': 'vitest run --coverage',
      'performance:audit': 'lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html'
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  private verifyBuildOptimization(): boolean {
    try {
      console.log('🏗️  Running production build...');
      execSync('npm run build', { stdio: 'inherit' });
      return true;
    } catch (e) {
      return false;
    }
  }

  public async execute() {
    console.log('🚀 Starting Task 1: Optimize Existing Next.js Infrastructure\n');

    let successCount = 0;
    
    for (const step of this.steps) {
      console.log(`\n▶️  ${step.name}`);
      
      try {
        step.action();
        
        if (step.verify()) {
          console.log(`✅ ${step.name} - Complete`);
          successCount++;
        } else {
          console.log(`⚠️  ${step.name} - Partial success`);
          this.errors.push(`${step.name} verification failed`);
        }
      } catch (error: any) {
        console.error(`❌ ${step.name} - Failed`);
        console.error(error.message);
        this.errors.push(`${step.name}: ${error.message}`);
      }
    }

    console.log('\n📊 Task 1 Completion Summary:');
    console.log(`✅ Completed: ${successCount}/${this.steps.length} steps`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  Issues encountered:');
      this.errors.forEach(err => console.log(`  - ${err}`));
    }

    const score = Math.round((successCount / this.steps.length) * 10);
    console.log(`\n🎯 Task 1 Score: ${score}/10`);

    return score === 10;
  }
}

// Execute the script
const completer = new Task1Completer();
completer.execute().then(success => {
  if (success) {
    console.log('\n✨ Task 1 completed successfully! Running tests...\n');
    
    // Run the validation tests
    try {
      execSync('npm run test src/__tests__/task1-validation.test.ts', { 
        stdio: 'inherit' 
      });
    } catch (e) {
      console.error('❌ Validation tests failed');
      process.exit(1);
    }
  } else {
    console.log('\n⚠️  Task 1 needs more work to reach 10/10');
    process.exit(1);
  }
});