# Quick Reference - New Project Structure

## 🚀 Common Tasks After Reorganization

### Running Tests (Windows)
```cmd
cd scripts\windows
RUN-UI-TESTS-WINDOWS.cmd
```

### Running Tests (Linux/Mac)
```bash
cd scripts/linux
./run-tests.sh
```

### Finding Documentation
- **Setup Guide**: `docs/guides/README-ENVIRONMENT-SETUP.md`
- **Testing Guide**: `docs/testing/README-TESTING.md`
- **CI/CD Guide**: `docs/deployment/CICD-GUIDE.md`
- **Architecture**: `docs/architecture/`

### Key Directories

| What You're Looking For | Where It Is Now |
|------------------------|-----------------|
| Windows .cmd scripts | `scripts/windows/` |
| Shell scripts | `scripts/linux/` |
| Test documentation | `docs/testing/` |
| Deployment docs | `docs/deployment/` |
| Test configs | `tests/config/` |
| Docker compose variants | `docker/compose/` |
| Ollama config | `deployment/ollama/` |
| Prisma backups | `prisma/backups/` |

### Running Specific Scripts

#### Windows Test Scripts
- `scripts/windows/RUN-UI-TESTS-WINDOWS.cmd` - Run all UI tests
- `scripts/windows/FIND-BROKEN-BUTTONS-WINDOWS.cmd` - Find broken buttons
- `scripts/windows/TEST-SPECIFIC-PAGE-WINDOWS.cmd` - Test specific pages

#### Development Scripts
- `scripts/development/start-claude.sh` - Start Claude AI
- `scripts/development/start-claude-code.sh` - Start Claude Code

### What Was Cleaned Up
- ✅ 136 .cmd files moved from root to `scripts/windows/`
- ✅ 23 documentation files organized into `docs/`
- ✅ Temporary files removed (dev.log, nul)
- ✅ Backup directories removed
- ✅ Test outputs added to .gitignore

### Project Structure
See `PROJECT-STRUCTURE.md` for complete directory layout.

## 📁 New Structure Benefits
1. **Cleaner root directory** - Only essential config files
2. **Better organization** - Related files grouped together
3. **Easier navigation** - Clear directory purposes
4. **Industry standard** - Follows best practices
5. **Improved maintainability** - Easier to find what you need