#!/usr/bin/env node

/**
 * Manufacturing Analytics Platform - Unified Development Environment Setup
 * 
 * This script sets up a complete development environment for all team members
 * Works on Windows, macOS, and Linux
 * 
 * Usage: npm run dev:setup
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// Check if command exists
function commandExists(cmd) {
  try {
    execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute command with error handling
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { stdio: 'inherit', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
  }
}

// Generate secure random string
function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

// Platform detection
const platform = {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux'
};

// Setup steps
const setupSteps = [
  {
    name: 'System Requirements',
    check: checkSystemRequirements,
    fix: null,
    required: true
  },
  {
    name: 'Environment Configuration',
    check: checkEnvironmentConfig,
    fix: setupEnvironmentConfig,
    required: true
  },
  {
    name: 'Node.js Dependencies',
    check: checkNodeDependencies,
    fix: installNodeDependencies,
    required: true
  },
  {
    name: 'Database Setup',
    check: checkDatabase,
    fix: setupDatabase,
    required: true
  },
  {
    name: 'Ollama AI Service',
    check: checkOllama,
    fix: setupOllama,
    required: true
  },
  {
    name: 'VS Code Configuration',
    check: checkVSCodeConfig,
    fix: setupVSCodeConfig,
    required: false
  },
  {
    name: 'Git Hooks',
    check: checkGitHooks,
    fix: setupGitHooks,
    required: false
  }
];

// Check system requirements
async function checkSystemRequirements() {
  log.info('Checking system requirements...');
  
  const requirements = [
    { cmd: 'node', minVersion: '18.0.0', current: process.version },
    { cmd: 'npm', minVersion: '8.0.0' },
    { cmd: 'git', minVersion: '2.0.0' },
    { cmd: 'docker', minVersion: '20.0.0' }
  ];
  
  const missing = [];
  
  for (const req of requirements) {
    if (!commandExists(req.cmd)) {
      missing.push(req.cmd);
    } else if (req.cmd === 'node' && req.current) {
      const current = req.current.replace('v', '');
      if (current < req.minVersion) {
        log.warning(`Node.js ${current} is below minimum version ${req.minVersion}`);
      }
    }
  }
  
  if (missing.length > 0) {
    log.error(`Missing required tools: ${missing.join(', ')}`);
    log.info('Please install:');
    if (missing.includes('node') || missing.includes('npm')) {
      log.info('  Node.js: https://nodejs.org/');
    }
    if (missing.includes('git')) {
      log.info('  Git: https://git-scm.com/');
    }
    if (missing.includes('docker')) {
      log.info('  Docker: https://www.docker.com/get-started');
    }
    return false;
  }
  
  log.success('All system requirements met');
  return true;
}

// Check environment configuration
async function checkEnvironmentConfig() {
  log.info('Checking environment configuration...');
  
  if (!fs.existsSync('.env.local')) {
    log.warning('No .env.local file found');
    return false;
  }
  
  // Check for required variables
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET'];
  const missing = required.filter(key => !envContent.includes(key));
  
  if (missing.length > 0) {
    log.warning(`Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  log.success('Environment configuration valid');
  return true;
}

// Setup environment configuration
async function setupEnvironmentConfig() {
  log.header('Setting up environment configuration');
  
  // Copy example file
  if (!fs.existsSync('.env.local')) {
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env.local');
      log.success('Created .env.local from .env.example');
    } else {
      log.error('No .env.example file found!');
      return false;
    }
  }
  
  // Read current config
  let envContent = fs.readFileSync('.env.local', 'utf8');
  
  // Generate secrets for placeholders
  const secrets = {
    '<CHANGE_ME_USE_OPENSSL>': generateSecret(),
    '<CHANGE_ME>': 'postgres' // Default for development
  };
  
  Object.entries(secrets).forEach(([placeholder, value]) => {
    envContent = envContent.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Set development database URL
  envContent = envContent.replace(
    'postgresql://<CHANGE_ME>:<CHANGE_ME>@localhost:5432/manufacturing',
    'postgresql://postgres:postgres@localhost:5432/manufacturing'
  );
  
  // Write updated config
  fs.writeFileSync('.env.local', envContent);
  log.success('Environment configuration created with secure defaults');
  
  log.warning('⚠️  For production, please regenerate all secrets!');
  return true;
}

// Check Node dependencies
async function checkNodeDependencies() {
  log.info('Checking Node.js dependencies...');
  
  if (!fs.existsSync('node_modules')) {
    log.warning('No node_modules directory found');
    return false;
  }
  
  // Check if package-lock is in sync
  try {
    exec('npm ls --depth=0', { stdio: 'ignore' });
    log.success('Node dependencies installed and in sync');
    return true;
  } catch {
    log.warning('Node dependencies out of sync');
    return false;
  }
}

// Install Node dependencies
async function installNodeDependencies() {
  log.header('Installing Node.js dependencies');
  
  log.info('Running npm install...');
  exec('npm ci || npm install');
  
  log.success('Node dependencies installed');
  return true;
}

// Check database
async function checkDatabase() {
  log.info('Checking database connection...');
  
  // Check if Docker is running
  try {
    exec('docker info', { stdio: 'ignore' });
  } catch {
    log.warning('Docker is not running');
    return false;
  }
  
  // Check if database container exists
  try {
    const containers = execSync('docker ps -a --format "{{.Names}}"', { encoding: 'utf8' });
    if (!containers.includes('manufacturing-timescaledb')) {
      log.warning('Database container not found');
      return false;
    }
    
    // Check if running
    const running = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
    if (!running.includes('manufacturing-timescaledb')) {
      log.warning('Database container not running');
      return false;
    }
    
    log.success('Database container running');
    return true;
  } catch {
    return false;
  }
}

// Setup database
async function setupDatabase() {
  log.header('Setting up database');
  
  // Start Docker if not running
  if (platform.isWindows) {
    log.info('Please ensure Docker Desktop is running');
  } else {
    try {
      exec('docker info', { stdio: 'ignore' });
    } catch {
      log.error('Docker is not running. Please start Docker and try again.');
      return false;
    }
  }
  
  // Use secure docker-compose
  const composeFile = fs.existsSync('docker-compose.secure.yml') 
    ? 'docker-compose.secure.yml' 
    : 'docker-compose.yml';
  
  log.info('Starting database container...');
  exec(`docker-compose -f ${composeFile} up -d timescaledb`);
  
  // Wait for database to be ready
  log.info('Waiting for database to be ready...');
  let retries = 30;
  while (retries > 0) {
    try {
      exec('docker exec manufacturing-timescaledb pg_isready -U postgres', { stdio: 'ignore' });
      break;
    } catch {
      retries--;
      if (retries === 0) {
        log.error('Database failed to start');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  log.success('Database started successfully');
  
  // Run migrations
  log.info('Running database migrations...');
  exec('npm run db:push');
  
  // Seed with sample data
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const seedDatabase = await new Promise(resolve => {
    rl.question('Would you like to seed the database with sample data? (y/N) ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
  
  if (seedDatabase) {
    log.info('Seeding database...');
    exec('npm run db:seed');
    log.success('Database seeded with sample data');
  }
  
  return true;
}

// Check Ollama
async function checkOllama() {
  log.info('Checking Ollama AI service...');
  
  try {
    const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
    if (!containers.includes('manufacturing-ollama')) {
      log.warning('Ollama container not running');
      return false;
    }
    
    // Check if model is downloaded
    const models = execSync('docker exec manufacturing-ollama ollama list', { encoding: 'utf8' });
    if (!models.includes('gemma:2b')) {
      log.warning('Gemma model not downloaded');
      return false;
    }
    
    log.success('Ollama service ready');
    return true;
  } catch {
    return false;
  }
}

// Setup Ollama
async function setupOllama() {
  log.header('Setting up Ollama AI service');
  
  const composeFile = fs.existsSync('docker-compose.secure.yml') 
    ? 'docker-compose.secure.yml' 
    : 'docker-compose.yml';
  
  log.info('Starting Ollama container...');
  exec(`docker-compose -f ${composeFile} up -d ollama`);
  
  // Wait for Ollama to start
  log.info('Waiting for Ollama to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Pull model
  log.info('Downloading Gemma 2B model (this may take a few minutes)...');
  exec('docker exec manufacturing-ollama ollama pull gemma:2b');
  
  log.success('Ollama service ready with Gemma model');
  return true;
}

// Check VS Code configuration
async function checkVSCodeConfig() {
  return fs.existsSync('.vscode/settings.json');
}

// Setup VS Code configuration
async function setupVSCodeConfig() {
  log.header('Setting up VS Code configuration');
  
  // Create .vscode directory
  if (!fs.existsSync('.vscode')) {
    fs.mkdirSync('.vscode');
  }
  
  // VS Code settings
  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true,
    "files.exclude": {
      "**/.git": true,
      "**/.next": true,
      "**/node_modules": true,
      "**/coverage": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/coverage": true,
      "**/dist": true
    }
  };
  
  fs.writeFileSync('.vscode/settings.json', JSON.stringify(settings, null, 2));
  log.success('Created VS Code settings');
  
  // Recommended extensions
  const extensions = {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "prisma.prisma",
      "bradlc.vscode-tailwindcss",
      "ms-vscode.vscode-typescript-next",
      "formulahendry.auto-rename-tag",
      "naumovs.color-highlight",
      "oderwat.indent-rainbow",
      "PKief.material-icon-theme",
      "eamodio.gitlens",
      "usernamehw.errorlens",
      "ms-azuretools.vscode-docker"
    ]
  };
  
  fs.writeFileSync('.vscode/extensions.json', JSON.stringify(extensions, null, 2));
  log.success('Created recommended extensions list');
  
  return true;
}

// Check Git hooks
async function checkGitHooks() {
  return fs.existsSync('.git/hooks/pre-commit');
}

// Setup Git hooks
async function setupGitHooks() {
  log.header('Setting up Git hooks');
  
  // Pre-commit hook
  const preCommitHook = `#!/bin/sh
# Manufacturing Analytics Platform - Pre-commit Hook

echo "Running pre-commit checks..."

# Run linting
npm run lint || {
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
}

# Run type checking
npm run typecheck || {
  echo "❌ Type checking failed. Please fix errors before committing."
  exit 1
}

# Check for console.log statements
if git diff --cached --name-only | xargs grep -l 'console\\.log' > /dev/null 2>&1; then
  echo "⚠️  Warning: console.log statements found in staged files"
fi

echo "✅ Pre-commit checks passed"
`;

  const hookPath = '.git/hooks/pre-commit';
  fs.writeFileSync(hookPath, preCommitHook);
  
  // Make executable on Unix
  if (!platform.isWindows) {
    fs.chmodSync(hookPath, '755');
  }
  
  log.success('Git hooks configured');
  return true;
}

// Main setup function
async function main() {
  console.clear();
  log.header('🏭 Manufacturing Analytics Platform - Development Setup');
  console.log('This script will set up your development environment\n');
  
  let failedSteps = [];
  
  for (const step of setupSteps) {
    log.header(`Step: ${step.name}`);
    
    try {
      const checkResult = await step.check();
      
      if (!checkResult && step.fix) {
        const fixResult = await step.fix();
        if (!fixResult && step.required) {
          failedSteps.push(step.name);
          log.error(`Failed to setup ${step.name}`);
          if (step.required) {
            break;
          }
        }
      } else if (!checkResult && step.required) {
        failedSteps.push(step.name);
        log.error(`${step.name} check failed and no fix available`);
        break;
      }
    } catch (error) {
      log.error(`Error during ${step.name}: ${error.message}`);
      if (step.required) {
        failedSteps.push(step.name);
        break;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60) + '\n');
  
  if (failedSteps.length === 0) {
    log.success('🎉 Development environment setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Start the development server: npm run dev');
    console.log('  2. Open http://localhost:3000');
    console.log('  3. Check out the documentation: docs/DEVELOPER_GUIDE.md');
  } else {
    log.error('Setup completed with errors:');
    failedSteps.forEach(step => log.error(`  - ${step}`));
    console.log('\nPlease fix these issues and run setup again.');
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  main().catch(error => {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { setupSteps, platform };