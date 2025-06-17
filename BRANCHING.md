# Branch Naming Convention

This repository follows a standardized branching strategy:

## Branch Types

- `main`: The production branch containing the stable version of the code.
- `develop`: Integration branch for features that are completed but not yet released to production.

## Feature Development

- `feature/[feature-name]`: For developing new features
  - Example: `feature/equipment-monitoring`
  - Example: `feature/alert-notifications`

## Bug Fixes

- `bugfix/[bug-description]`: For fixing bugs in the develop branch
  - Example: `bugfix/equipment-status-display`
  - Example: `bugfix/dashboard-data-refresh`

## Production Fixes

- `hotfix/[fix-description]`: For critical production fixes that need to be applied to the main branch
  - Example: `hotfix/authentication-issue`
  - Example: `hotfix/critical-data-display`

## Workflow

1. All feature development should branch from `develop` and merge back to `develop`
2. Bugfixes should branch from `develop` and merge back to `develop`
3. Hotfixes should branch from `main` and merge to both `main` and `develop`
4. When ready for release, `develop` is merged into `main`

This branching strategy follows industry standard practices for maintaining a stable production environment while supporting continuous development.