# E2E Testing Guide with Real Data

## Prerequisites

You need TWO terminal windows open:

### Terminal 1 - Start the Application
```bash
# 1. Set environment variables
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing
set DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

# 2. Start the development server
npm run dev
```

Wait until you see:
```
✓ Ready in XXXms
```

### Terminal 2 - Run the Tests
Once the server is running in Terminal 1:

```bash
# Run all tests (headless)
run-e2e-tests-real-data.cmd

# OR run tests with visible browsers
run-e2e-tests-headed-real-data.cmd

# OR run specific test
run-specific-test-real-data.cmd

# OR debug tests
debug-e2e-tests.cmd
```

## Quick Start Commands

### Option 1: Two Separate Windows (Recommended)

**Window 1:**
```cmd
start-dev-server.cmd
```

**Window 2:**
```cmd
run-e2e-tests-headed-real-data.cmd
```

### Option 2: All-in-One (Experimental)
```cmd
run-e2e-tests-with-server.cmd
```

## Common Issues

### Tests fail with "net::ERR_CONNECTION_REFUSED"
- **Cause**: Development server is not running
- **Solution**: Start `npm run dev` in a separate terminal first

### Tests fail with "No alerts found"
- **Cause**: Database not seeded
- **Solution**: Run `setup-real-data.cmd` first

### Port 3000 already in use
- **Cause**: Another process using the port
- **Solution**: Kill the process or use a different port

## Test Data IDs

The database contains real data with these IDs:

**Alerts:**
- `cmc21y5in0042dcetrvwp9hmo` - Quality alert (medium severity)
- `cmc21y5iq0044dceti951efed` - Maintenance alert (low severity)
- `cmc21y5ir0046dcet4z77yth8` - Performance alert (critical severity)

**Equipment:**
- 7 Work Units with various statuses
- Located across 2 sites (North America, Asia Pacific)

## Viewing Test Results

After tests complete:
```cmd
npx playwright show-report
```

This opens an interactive HTML report showing:
- Pass/fail status for each test
- Screenshots of failures
- Test execution timeline
- Error details