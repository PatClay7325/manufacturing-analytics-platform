# Developer Setup Guide

Welcome to the Manufacturing Analytics Platform! This guide will help you set up your development environment quickly and securely.

## 🚀 Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone <repository-url>
cd manufacturing-analytics-platform

# 2. Run automated setup
npm run dev:setup

# 3. Start development
npm run dev
```

Visit http://localhost:3000 - You're ready to code! 🎉

## 📋 Prerequisites

### Required Software
- **Node.js** 18+ and npm 8+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) ([Download](https://code.visualstudio.com/))

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+

## 🔧 Manual Setup

If the automated setup fails or you prefer manual setup:

### 1. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local

# Generate secure secrets (Unix/macOS/Linux)
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local

# For Windows, use PowerShell:
# Add-Content .env.local "NEXTAUTH_SECRET=$([Convert]::ToBase64String((1..32 | ForEach {Get-Random -Maximum 256})))"
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers (for E2E testing)
npx playwright install
```

### 3. Database Setup

```bash
# Start TimescaleDB container
docker-compose up -d timescaledb

# Wait for database to be ready (usually 10-20 seconds)
docker exec manufacturing-timescaledb pg_isready

# Run database migrations
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Ollama AI Service

```bash
# Start Ollama container
docker-compose up -d ollama

# Download the AI model (one-time, ~1.4GB)
docker exec manufacturing-ollama ollama pull gemma:2b
```

## 🏗️ Project Structure

```
manufacturing-analytics-platform/
├── src/
│   ├── app/              # Next.js 13+ app directory
│   ├── components/       # React components
│   ├── lib/             # Utilities and libraries
│   ├── services/        # Business logic
│   └── hooks/           # Custom React hooks
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts         # Seed data script
├── public/             # Static assets
├── tests/              # Test files
├── docs/               # Documentation
└── scripts/            # Build and utility scripts
```

## 💻 Development Workflow

### Available Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Apply schema changes
npm run db:migrate      # Run migrations
npm run db:seed         # Seed sample data
npm run db:studio       # Open Prisma Studio GUI

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript checker
npm run format          # Format code with Prettier
```

### Git Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create PR:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Test additions or fixes
- `chore:` Build process or auxiliary tool changes

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use a different port
PORT=3001 npm run dev
```

#### Docker Issues
```bash
# Reset Docker containers
docker-compose down -v
docker-compose up -d

# Check container logs
docker logs manufacturing-timescaledb
docker logs manufacturing-ollama
```

#### Database Connection Failed
```bash
# Verify database is running
docker ps

# Test connection
docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c "SELECT 1"

# Check your DATABASE_URL in .env.local
```

#### Ollama Not Responding
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
docker restart manufacturing-ollama

# Re-download model if needed
docker exec manufacturing-ollama ollama pull gemma:2b
```

## 🔒 Security Notes

1. **Never commit `.env.local`** or any file with secrets
2. **Regenerate all secrets** before deploying to production
3. **Use different databases** for development and production
4. **Keep dependencies updated** with `npm audit fix`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Docker Documentation](https://docs.docker.com/)

## 🤝 Getting Help

- Check existing issues on GitHub
- Ask in the team Slack channel
- Review the [API Documentation](./API_REFERENCE.md)
- Contact the tech lead for architecture questions

## 📦 VS Code Extensions

After opening the project in VS Code, you'll be prompted to install recommended extensions. These include:

- ESLint - Code linting
- Prettier - Code formatting
- Prisma - Database tooling
- Tailwind CSS IntelliSense
- GitLens - Git supercharged
- Error Lens - Inline error display
- Docker - Container management

## 🚢 Next Steps

1. Explore the codebase structure
2. Review existing components in `src/components`
3. Check out the API routes in `src/app/api`
4. Run the test suite to ensure everything works
5. Pick up a "good first issue" from GitHub

Happy coding! 🎉