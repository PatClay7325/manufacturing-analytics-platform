# CI/CD Guide for Manufacturing Analytics Platform

This guide explains the Continuous Integration (CI) and Continuous Deployment (CD) setup for this project using GitHub Actions.

## What is CI/CD?

**Continuous Integration (CI)** is the practice of automatically integrating code changes into a shared repository, where automated builds and tests verify the changes.

**Continuous Deployment (CD)** automatically deploys all code changes to a testing or production environment after the CI stage.

## Our CI/CD Workflow

We have set up two GitHub Actions workflows:

1. **CI Workflow** - Runs on every push and pull request:
   - Linting and type checking
   - Unit tests
   - Building the application
   - End-to-end (E2E) tests

2. **CD Workflow** - Runs when code is pushed to specific branches:
   - Deploys to staging from the `develop-Integration-branch`
   - Deploys to production from the `main-Production-ready-code` branch

## How to Use These Workflows

### For Developers

1. Create a new branch following the naming convention:
   - `feature/feature-name` for new features
   - `bugfix/bug-description` for bug fixes
   - `hotfix/fix-description` for critical fixes

2. Make your changes and push to the branch. This will trigger the CI workflow.

3. Create a pull request (PR) to the `develop-Integration-branch`.

4. The CI workflow will run, checking your code for issues. Fix any failures that occur.

5. Once approved and merged, the CD workflow will automatically deploy to staging.

6. After testing in staging, create a PR from `develop-Integration-branch` to `main-Production-ready-code`.

7. When merged, the CD workflow will deploy to production.

### For Reviewers

1. Check the CI workflow results before reviewing a PR.

2. Only approve if all CI checks pass and the code meets quality standards.

3. For PRs to `main-Production-ready-code`, verify the changes were tested in staging.

## Understanding the CI Workflow

The CI workflow consists of four jobs:

1. **Lint and Type Check**:
   - Runs ESLint to catch code style issues
   - Runs TypeScript compiler to catch type errors

2. **Unit Tests**:
   - Runs Vitest to execute unit tests
   - Generates and uploads test coverage reports

3. **Build**:
   - Generates the Prisma client
   - Builds the Next.js application
   - Uploads build artifacts

4. **E2E Tests**:
   - Runs Playwright tests to verify the application works end-to-end
   - Uploads Playwright reports

## Understanding the CD Workflow

The CD workflow has two jobs:

1. **Deploy to Staging**:
   - Triggered when code is merged to `develop-Integration-branch`
   - Builds the application
   - Deploys to the staging environment

2. **Deploy to Production**:
   - Triggered when code is merged to `main-Production-ready-code`
   - Builds the application
   - Deploys to the production environment

## Customizing Deployment

The CD workflow contains placeholder deployment steps. You'll need to update these with your actual deployment method:

1. Edit `.github/workflows/cd.yml`
2. Replace the `Deploy to staging` and `Deploy to production` steps with your deployment commands
3. Add any necessary secrets in GitHub repository settings

Common deployment options:
- Vercel
- Netlify
- AWS Amplify
- Custom server deployment

## Setting Up Secrets

For deployments and other sensitive operations, you'll need to set up secrets in GitHub:

1. Go to your GitHub repository
2. Click on Settings
3. Click on Secrets and variables > Actions
4. Click on New repository secret
5. Add any secrets needed for deployment (e.g., `VERCEL_TOKEN`)

## Monitoring Workflow Runs

To see your workflow runs:

1. Go to your GitHub repository
2. Click on the Actions tab
3. Select a workflow to see its runs
4. Click on a specific run to see details and logs

## Troubleshooting

If a workflow fails:

1. Click on the failed workflow run in the Actions tab
2. Expand the job that failed
3. Look for red X marks to find the specific step that failed
4. Read the error logs to understand the issue
5. Fix the issue in your code and push again

## Next Steps

1. **Set up deployment**: Update the CD workflow with your actual deployment method
2. **Configure branch protection**: Require CI checks to pass before merging
3. **Add code coverage thresholds**: Enforce minimum test coverage
4. **Set up status badges**: Add workflow status badges to your README