#!/usr/bin/env node

/**
 * Environment Validation Script
 * Ensures all required environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Required environment variables by category
const requiredVars = {
  core: {
    NODE_ENV: {
      description: 'Node environment',
      validator: (val) => ['development', 'test', 'production'].includes(val),
      example: 'development'
    },
    NEXT_PUBLIC_APP_URL: {
      description: 'Application URL',
      validator: (val) => val.startsWith('http'),
      example: 'http://localhost:3000'
    }
  },
  database: {
    DATABASE_URL: {
      description: 'PostgreSQL connection string',
      validator: (val) => val.includes('postgresql://'),
      example: 'postgresql://user:pass@localhost:5432/dbname',
      sensitive: true
    }
  },
  authentication: {
    NEXTAUTH_SECRET: {
      description: 'NextAuth encryption secret',
      validator: (val) => val.length >= 32,
      example: 'Generate with: openssl rand -base64 32',
      sensitive: true
    },
    JWT_SECRET: {
      description: 'JWT signing secret',
      validator: (val) => val.length >= 32,
      example: 'Generate with: openssl rand -base64 32',
      sensitive: true
    }
  },
  ollama: {
    OLLAMA_API_URL: {
      description: 'Ollama API endpoint',
      validator: (val) => val.startsWith('http'),
      example: 'http://localhost:11434'
    },
    OLLAMA_MODEL: {
      description: 'Ollama model name',
      validator: (val) => val.length > 0,
      example: 'gemma:2b'
    }
  }
};

// Optional environment variables
const optionalVars = {
  redis: {
    REDIS_URL: {
      description: 'Redis connection URL',
      validator: (val) => val.includes('redis://'),
      example: 'redis://localhost:6379'
    }
  },
  monitoring: {
    SENTRY_DSN: {
      description: 'Sentry error tracking',
      validator: (val) => val.includes('sentry.io'),
      example: 'https://key@sentry.io/project'
    }
  }
};

// Load environment variables
function loadEnv() {
  // Load .env.local if it exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
  
  // Load .env if no .env.local
  const defaultEnvPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath) && fs.existsSync(defaultEnvPath)) {
    require('dotenv').config({ path: defaultEnvPath });
  }
}

// Validate a single variable
function validateVar(name, config, value) {
  if (!value) {
    return { valid: false, error: 'Missing' };
  }
  
  if (config.validator && !config.validator(value)) {
    return { valid: false, error: 'Invalid format' };
  }
  
  return { valid: true };
}

// Main validation function
function validateEnvironment() {
  loadEnv();
  
  console.log(`${colors.blue}🔍 Validating environment configuration...${colors.reset}\n`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required variables
  Object.entries(requiredVars).forEach(([category, vars]) => {
    console.log(`${colors.blue}${category.toUpperCase()}:${colors.reset}`);
    
    Object.entries(vars).forEach(([varName, config]) => {
      const value = process.env[varName];
      const result = validateVar(varName, config, value);
      
      if (!result.valid) {
        hasErrors = true;
        console.log(
          `  ${colors.red}✗${colors.reset} ${varName}: ${result.error}`
        );
        console.log(`    ${colors.yellow}${config.description}${colors.reset}`);
        if (!config.sensitive) {
          console.log(`    Example: ${config.example}`);
        }
      } else {
        const displayValue = config.sensitive 
          ? '***' + value.slice(-4) 
          : value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(
          `  ${colors.green}✓${colors.reset} ${varName}: ${displayValue}`
        );
      }
    });
    console.log();
  });
  
  // Check optional variables
  console.log(`${colors.blue}OPTIONAL:${colors.reset}`);
  Object.entries(optionalVars).forEach(([category, vars]) => {
    Object.entries(vars).forEach(([varName, config]) => {
      const value = process.env[varName];
      if (!value) {
        console.log(
          `  ${colors.yellow}⚠${colors.reset} ${varName}: Not configured (${config.description})`
        );
        hasWarnings = true;
      } else {
        const result = validateVar(varName, config, value);
        if (!result.valid) {
          console.log(
            `  ${colors.red}✗${colors.reset} ${varName}: ${result.error}`
          );
          hasErrors = true;
        } else {
          console.log(
            `  ${colors.green}✓${colors.reset} ${varName}: Configured`
          );
        }
      }
    });
  });
  
  console.log('\n' + '─'.repeat(60) + '\n');
  
  // Summary
  if (hasErrors) {
    console.log(`${colors.red}❌ Environment validation failed!${colors.reset}`);
    console.log('\nPlease fix the errors above and try again.');
    console.log('See .env.example for configuration template.');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${colors.green}✅ Environment valid with warnings${colors.reset}`);
    console.log('\nOptional features may not be available.');
  } else {
    console.log(`${colors.green}✅ Environment validation passed!${colors.reset}`);
  }
  
  // Additional checks
  console.log('\n' + `${colors.blue}Additional Checks:${colors.reset}`);
  
  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Using .env instead of .env.local (less secure)`);
  }
  
  // Check Node version
  const nodeVersion = process.version;
  const minVersion = 'v18.0.0';
  if (nodeVersion < minVersion) {
    console.log(`  ${colors.red}✗${colors.reset} Node.js ${nodeVersion} is below minimum ${minVersion}`);
  } else {
    console.log(`  ${colors.green}✓${colors.reset} Node.js ${nodeVersion}`);
  }
  
  // Production warnings
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n${colors.yellow}⚠ Production Mode Warnings:${colors.reset}`);
    
    if (process.env.DATABASE_URL?.includes('localhost')) {
      console.log('  - DATABASE_URL points to localhost');
    }
    
    if (process.env.NEXTAUTH_SECRET?.length < 32) {
      console.log('  - NEXTAUTH_SECRET appears weak');
    }
    
    if (!process.env.SENTRY_DSN) {
      console.log('  - Error tracking not configured');
    }
  }
}

// Export for use in other scripts
module.exports = { validateEnvironment, requiredVars };

// Run if called directly
if (require.main === module) {
  validateEnvironment();
}