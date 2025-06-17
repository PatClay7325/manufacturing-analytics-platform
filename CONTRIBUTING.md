# Contributing Guidelines

## Branch Management

### Branch Naming Convention

We follow a standardized branching strategy:

- `main`: The production branch containing the stable version of the code.
- `develop`: Integration branch for features that are completed but not yet released to production.
- Feature branches: `feature/[feature-name]` - For developing new features
- Bug fix branches: `bugfix/[bug-description]` - For fixing bugs in the develop branch
- Hotfix branches: `hotfix/[fix-description]` - For critical production fixes

### Branch Protection Rules

While GitHub branch protection requires a paid plan for private repositories, we enforce these rules through team agreements:

#### Main Branch (`main`)
- **Never** push directly to the main branch
- All changes must come through pull requests
- Pull requests require at least one review approval
- Linear history is required (no merge commits)
- No force pushes or branch deletion

#### Develop Branch (`develop`)
- No direct pushes except by administrators for special cases
- Changes require pull requests with at least one review
- No branch deletion

#### Feature/Bugfix/Hotfix Branches
- Follow the naming convention strictly
- Clean up (delete) branches after they are merged

## Pull Request Process

1. Create a branch with the appropriate prefix
2. Make your changes in small, focused commits
3. Write meaningful commit messages
4. Update documentation as needed
5. Run tests locally before submitting
6. Create a pull request with a clear description
7. Respond to code review feedback
8. After approval, the PR can be merged

## Code Reviews

The CODEOWNERS file specifies who needs to review changes in different parts of the codebase.

## Commit Messages

Follow these guidelines for commit messages:
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line

## Development Workflow

1. Create an issue for the task or feature
2. Create a branch from `develop` (or `main` for hotfixes)
3. Implement changes
4. Submit pull request to the appropriate target branch
5. Address review comments
6. Merge when approved

Thank you for contributing to our project!