@echo off
echo === Setting Up Environment Following Industry SOP ===
echo.

echo [1/5] Creating Base .env Template...
(
echo # Base configuration - Shared across all environments
echo # DO NOT store secrets here - use .env.local for secrets
echo.
echo # Database Configuration
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo.
echo # Application Configuration  
echo NODE_ENV=development
echo PORT=3000
echo.
echo # Public API URLs
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXT_PUBLIC_WS_URL=ws://localhost:3000
) > .env

echo.
echo [2/5] Creating .env.local for Secrets...
(
echo # Local environment overrides and secrets
echo # This file is git-ignored and should contain sensitive data
echo.
echo # Database Credentials (local development)
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/manufacturing"
echo.
echo # Authentication Secrets
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=development-secret-change-in-production
echo.
echo # External Service Configuration
echo OLLAMA_API_URL=http://localhost:11434
) > .env.local

echo.
echo [3/5] Creating .env.test for Testing...
(
echo # Test environment configuration
echo NODE_ENV=test
echo.
echo # Test Database (separate from development)
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_test"
echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/manufacturing_test"
echo.
echo # Test API Configuration
echo NEXT_PUBLIC_API_URL=http://localhost:3000/api
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=test-secret
) > .env.test

echo.
echo [4/5] Creating .env.example for Documentation...
(
echo # Example environment configuration
echo # Copy this file to .env.local and update with your values
echo.
echo # Database Configuration
echo DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
echo DIRECT_URL="postgresql://username:password@localhost:5432/dbname"
echo.
echo # Authentication
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=your-secret-key-here
echo.
echo # External Services
echo OLLAMA_API_URL=http://localhost:11434
echo.
echo # Feature Flags
echo NEXT_PUBLIC_USE_CUSTOM_METRICS=false
echo NEXT_PUBLIC_USE_HIGHCHARTS=true
) > .env.example

echo.
echo [5/5] Updating .gitignore to follow best practices...
echo # Environment files >> .gitignore
echo .env.local >> .gitignore
echo .env.*.local >> .gitignore

echo.
echo === Environment Setup Complete ===
echo.
echo Structure created following industry SOP:
echo - .env           : Base configuration (committed to git)
echo - .env.local     : Local overrides and secrets (git-ignored)  
echo - .env.test      : Test environment config
echo - .env.example   : Documentation template
echo.
echo Next steps:
echo 1. Run: setup-database-sop.cmd
echo 2. Run: npm run test:e2e
echo.
pause