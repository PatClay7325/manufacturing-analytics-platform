# Branch Protection Configuration

## Branch Protection Rules

Set up the following branch protection rules in GitHub:

### 1. Main Branch Protection

Create a ruleset for the `main` branch:
- Target pattern: `main`
- Rules:
  - ✅ Restrict updates (only users with bypass permission can update)
  - ✅ Restrict deletions (prevent branch deletion)
  - ✅ Require linear history
  - ✅ Require signed commits
  - ✅ Require a pull request before merging
  - ✅ Require status checks to pass
    - Include build and test checks
  - ✅ Block force pushes

### 2. Develop Branch Protection

Create a ruleset for the `develop` branch:
- Target pattern: `develop`
- Rules:
  - ✅ Restrict deletions (prevent branch deletion)
  - ✅ Require a pull request before merging
  - ✅ Require status checks to pass
    - Include build and test checks
  - ✅ Block force pushes

### 3. Feature/Bugfix/Hotfix Prefix Protection

Create a ruleset for branch prefixes:
- Target pattern: `feature/*`, `bugfix/*`, `hotfix/*`
- Rules:
  - ✅ Require status checks to pass
    - Include basic linting and build checks

## Implementation Steps

1. Go to GitHub repository settings
2. Navigate to "Code and automation" > "Branches"
3. Click "Add branch protection rule"
4. Add the rules above one by one
5. Save each rule after configuration

Note: Full branch protection requires GitHub Team or higher. For private repositories on free plans, consider:
- Using a CODEOWNERS file to enforce reviews
- Setting up CI workflows that enforce checks before merging
- Establishing team agreements for branch management

## Recommended CI/CD Integration

Ensure your CI/CD pipeline enforces:
- Tests pass on all branches
- Code quality checks on all branches
- Security scans on pull requests to protected branches
- Deployment verification for merges to main

This configuration balances protection with development flexibility while enforcing quality standards.