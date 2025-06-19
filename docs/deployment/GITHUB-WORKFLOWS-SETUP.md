# Setting Up GitHub Workflows

I've created CI/CD workflows for the project, but they couldn't be pushed to GitHub automatically due to token permission limitations. Please follow these instructions to set them up manually:

## Setting Up CI Workflow

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Click on "New workflow"
4. Click on "set up a workflow yourself"
5. Name the file `ci.yml`
6. Copy and paste the following content:

```yaml
name: CI

on:
  push:
    branches: [ main-Production-ready-code, develop-Integration-branch, feature/*, bugfix/*, hotfix/* ]
  pull_request:
    branches: [ main-Production-ready-code, develop-Integration-branch ]

jobs:
  lint-typecheck:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload test coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npm run prisma:generate
      
      - name: Build project
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: .next/
          retention-days: 1

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

7. Click "Commit changes"

## Setting Up CD Workflow

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Click on "New workflow"
4. Click on "set up a workflow yourself"
5. Name the file `cd.yml`
6. Copy and paste the following content:

```yaml
name: CD

on:
  push:
    branches:
      - main-Production-ready-code  # Deploy to production
      - develop-Integration-branch  # Deploy to staging
  workflow_dispatch:  # Allow manual triggering

jobs:
  deploy-staging:
    name: Deploy to Staging
    if: github.ref == 'refs/heads/develop-Integration-branch'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.yourdomain.com  # Replace with your actual staging URL
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npm run prisma:generate
      
      - name: Build project
        run: npm run build
      
      # Add your deployment steps here
      # This is a placeholder - replace with your actual deployment method
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Example: Vercel deployment
          # npm install -g vercel
          # vercel --token ${{ secrets.VERCEL_TOKEN }} --prod

  deploy-production:
    name: Deploy to Production
    if: github.ref == 'refs/heads/main-Production-ready-code'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://production.yourdomain.com  # Replace with your actual production URL
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npm run prisma:generate
      
      - name: Build project
        run: npm run build
      
      # Add your production deployment steps here
      # This is a placeholder - replace with your actual deployment method
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Example: Vercel deployment
          # npm install -g vercel
          # vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
```

7. Click "Commit changes"

## Setting Up GitHub Environments

For the CD workflow to work properly, you need to set up environments:

1. Go to your GitHub repository
2. Click on "Settings"
3. In the left sidebar, click on "Environments"
4. Click on "New environment"
5. Create two environments:
   - `staging`
   - `production`
6. For each environment, you can set:
   - Environment protection rules
   - Deployment secrets
   - Required reviewers

## Customizing Deployment

The CD workflow contains placeholder deployment steps. You'll need to update these with your actual deployment method:

1. Edit the `cd.yml` file
2. Replace the `Deploy to staging` and `Deploy to production` steps with your deployment commands
3. Add any necessary secrets in GitHub repository settings

For more information, please refer to the CICD-GUIDE.md file in the repository.