# Project Structure

This document outlines the organized structure of the Manufacturing Analytics Platform project following industry best practices and Next.js conventions.

## Root Directory Structure

```
manufacturing-Analytics-platform/
├── .github/                    # GitHub specific files
│   └── workflows/             # CI/CD workflows
├── deployment/                # Deployment configurations
│   ├── ollama/               # Ollama AI configuration
│   ├── providers/            # Cloud provider scripts
│   ├── scripts/              # Deployment scripts
│   └── templates/            # Deployment templates
├── docker/                    # Docker configurations
│   └── compose/              # Docker compose variants
├── docs/                      # Project documentation
│   ├── architecture/         # System design docs
│   ├── deployment/           # Deployment guides
│   ├── development/          # Development docs
│   ├── guides/               # User guides
│   └── testing/              # Testing documentation
├── logos/                     # Brand assets
├── monitoring/                # Monitoring configurations
├── prisma/                    # Database ORM
│   ├── backups/              # Schema backups
│   └── migrations/           # Database migrations
├── public/                    # Static assets
├── scripts/                   # Automation scripts
│   ├── development/          # Dev scripts
│   ├── linux/                # Linux/Unix scripts
│   ├── testing/              # Test scripts
│   └── windows/              # Windows batch files
├── src/                       # Source code
│   ├── __tests__/            # Test files
│   ├── app/                  # Next.js app directory
│   ├── components/           # React components
│   ├── config/               # App configuration
│   ├── core/                 # Core business logic
│   ├── lib/                  # Shared libraries
│   ├── mocks/                # Mock data/services
│   ├── models/               # Data models
│   ├── services/             # Service layer
│   ├── test-utils/           # Test utilities
│   ├── types/                # TypeScript types
│   └── utils/                # Utility functions
├── tests/                     # E2E and integration tests
│   ├── config/               # Test configurations
│   ├── e2e/                  # End-to-end tests
│   ├── integration/          # Integration tests
│   └── unit/                 # Unit tests
└── testing/                   # Additional test resources
```

## Key Files in Root

### Configuration Files (Correct in Root)
- `.gitignore` - Git ignore patterns
- `CODEOWNERS` - GitHub code owners
- `CONTRIBUTING.md` - Contribution guidelines
- `README.md` - Project overview
- `package.json` - Node.js dependencies
- `package-lock.json` - Locked dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS config
- `postcss.config.js` - PostCSS configuration
- `docker-compose.yml` - Main Docker compose
- `playwright.config.ts` - E2E test configuration
- `vitest.config.ts` - Unit test configuration

### Environment Files
- `.env.example` - Example environment variables
- `.env.test` - Test environment
- `.env.production` - Production environment

## Directory Purposes

### `/src/` - Application Source Code
All application code following Next.js App Router structure:
- `/app/` - Pages and API routes
- `/components/` - Reusable React components
- `/core/` - Business logic and core services
- `/services/` - External service integrations

### `/scripts/` - Automation Scripts
Organized by platform and purpose:
- `/windows/` - Windows batch files (.cmd)
- `/linux/` - Shell scripts (.sh)
- `/development/` - Development tools
- `/testing/` - Test automation

### `/docs/` - Documentation
Comprehensive project documentation:
- `/architecture/` - System design and decisions
- `/deployment/` - Deployment and DevOps
- `/development/` - Development processes
- `/testing/` - Testing strategies

### `/tests/` - Test Suites
All test files organized by type:
- `/e2e/` - Playwright end-to-end tests
- `/integration/` - Integration tests
- `/unit/` - Unit tests
- `/config/` - Test configurations

### `/deployment/` - Deployment Resources
Everything needed for deployment:
- `/templates/` - K8s, Terraform templates
- `/scripts/` - Deployment automation
- `/providers/` - Cloud-specific scripts

## Best Practices

1. **Keep the root clean** - Only essential config files
2. **Group by feature** - Related files stay together
3. **Clear naming** - Self-documenting file names
4. **Consistent structure** - Same patterns throughout
5. **Documentation** - README in each major directory

## Migration Notes

All files have been reorganized from the root directory:
- 136 Windows batch files → `/scripts/windows/`
- 23 documentation files → `/docs/` subdirectories
- Test configs → `/tests/config/`
- Docker variants → `/docker/compose/`
- Temporary files removed and added to `.gitignore`

This structure follows Next.js conventions and industry best practices for maintainable, scalable applications.