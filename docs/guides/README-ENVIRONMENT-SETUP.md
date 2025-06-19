# Environment Setup - Standard Operating Procedures

## Overview
This document outlines the industry-standard approach for environment configuration in a Next.js/Prisma application.

## Environment File Hierarchy

Following Next.js conventions, environment files are loaded in this order (highest to lowest priority):

1. `.env.$(NODE_ENV).local` (e.g., `.env.production.local`)
2. `.env.local` (not loaded when NODE_ENV=test)
3. `.env.$(NODE_ENV)` (e.g., `.env.production`)
4. `.env`

## File Purposes

### `.env`
- **Purpose**: Default/shared configuration
- **Git**: ✅ Committed
- **Contents**: Non-sensitive defaults, shared settings

### `.env.local`
- **Purpose**: Local overrides and secrets
- **Git**: ❌ Ignored
- **Contents**: Passwords, API keys, local settings

### `.env.development` / `.env.production` / `.env.test`
- **Purpose**: Environment-specific settings
- **Git**: ✅ Committed (without secrets)
- **Contents**: Environment-specific URLs, feature flags

### `.env.example`
- **Purpose**: Documentation template
- **Git**: ✅ Committed
- **Contents**: Example structure with placeholder values

## Setup Instructions

### 1. Clean Environment Setup
```bash
cleanup-env-setup.cmd
setup-env-sop.cmd
```

### 2. Database Setup
```bash
setup-database-sop.cmd
```

### 3. Run Application
```bash
# Development
npm run dev

# Testing
npm run test:e2e

# Production
npm run build && npm start
```

## Best Practices

1. **Never commit secrets** - Use `.env.local` for sensitive data
2. **Use descriptive variable names** - Prefix with service name (e.g., `POSTGRES_`, `NEXTAUTH_`)
3. **Document all variables** - Keep `.env.example` updated
4. **Separate test database** - Use `manufacturing_test` for testing
5. **Version control** - Commit non-sensitive env files for team consistency

## Troubleshooting

### Database Connection Issues
1. Check Docker is running: `docker ps`
2. Verify credentials match in all env files
3. Ensure no port conflicts: `netstat -an | findstr :5432`

### Environment Variable Not Loading
1. Check file precedence (see hierarchy above)
2. Restart development server after changes
3. Use `npx dotenv-cli` for debugging

## Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] No passwords in committed files
- [ ] Production secrets use secure vault
- [ ] Database uses strong passwords
- [ ] API keys are environment-specific