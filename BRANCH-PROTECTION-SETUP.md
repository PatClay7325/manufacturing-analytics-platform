# Branch Protection Setup Guide

Since your repository is private, branch protection rules require a GitHub Team or higher plan. Here's how to manually set up the recommended branch protection rules through the GitHub web interface:

## Setting Up Branch Protection Rules

### 1. Access Branch Protection Settings

1. Go to your GitHub repository: https://github.com/PatClay7325/manufacturing-Analytics-platform
2. Click on "Settings" (tab with the gear icon)
3. In the left sidebar, click on "Branches"
4. Under "Branch protection rules", click "Add rule"

### 2. Configure Branch Protection for main-Production-ready-code

1. **Branch name pattern**: Enter `main-Production-ready-code`
2. Check the following options:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (set to at least 1)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require linear history
   - ✅ Restrict deletions
   - ✅ Block force pushes
   - ✅ Require status checks to pass (when you set up CI)
3. Click "Create" to save this rule

### 3. Configure Branch Protection for develop-Integration-branch

1. Return to Branch protection rules and click "Add rule"
2. **Branch name pattern**: Enter `develop-Integration-branch`
3. Check the following options:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (set to at least 1)
   - ✅ Restrict deletions
   - ✅ Block force pushes
4. Click "Create" to save this rule

### 4. Configure Pattern Protection for Feature, Bugfix, and Hotfix Branches

1. Return to Branch protection rules and click "Add rule"
2. **Branch name pattern**: Enter `feature/*`
3. Check the following options:
   - ✅ Require status checks to pass (if you have CI set up)
4. Click "Create" to save this rule

5. Repeat the above steps for:
   - Branch pattern: `bugfix/*`
   - Branch pattern: `hotfix/*`

## Upgrade Options

To fully implement all branch protection features, consider:

1. **Upgrade to GitHub Team**: This allows full branch protection on private repositories
2. **Make repository public**: Public repositories have access to all branch protection features

## Workarounds for Free Plan

Until you can upgrade, you've already implemented these workarounds:

1. **CODEOWNERS file**: Enforces code review requirements
2. **CONTRIBUTING.md**: Documents branch protection expectations
3. **Pull Request template**: Guides contributors through the PR process

## Next Steps

After setting up branch protection rules:

1. Ensure all team members understand the branch workflow
2. Set up CI/CD to run tests on all branches
3. Consider implementing pre-commit hooks for local validation

Remember that branch protection rules are only as effective as your team's commitment to following them. Regular reviews of process adherence are recommended.