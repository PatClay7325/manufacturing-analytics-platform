# Scripts Directory

This directory contains all automation scripts for the Manufacturing Analytics Platform.

## Directory Structure

### `/windows/`
Windows batch files (.cmd) for Windows-specific operations:
- Test runners
- Environment setup
- Database management
- Development tools

### `/linux/`
Shell scripts (.sh) for Linux/Unix environments:
- Test execution scripts
- Build automation
- Deployment scripts

### `/development/`
Development-specific scripts:
- Claude AI integration scripts
- Local development helpers
- Debug tools

### `/testing/`
Test automation scripts:
- E2E test runners
- Unit test utilities
- Test data generation

## Usage

### Windows
```cmd
cd scripts\windows
RUN-UI-TESTS-WINDOWS.cmd
```

### Linux/Mac
```bash
cd scripts/linux
./run-tests.sh
```

## Contributing

When adding new scripts:
1. Place them in the appropriate subdirectory
2. Add clear documentation in the script
3. Update this README with the new script's purpose
4. Ensure scripts are executable (for shell scripts)