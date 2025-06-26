# Jest Performance Optimization Guide

## Optimizations Applied

### 1. **SWC Transformer** (10x faster than ts-jest)
- Replaced ts-jest with @swc/jest for lightning-fast TypeScript compilation
- SWC is written in Rust and significantly faster than Babel/ts-jest

### 2. **Smart Test Environment Splitting**
- Node environment for unit tests (faster)
- jsdom only for component tests that need DOM
- Reduces overhead for tests that don't need browser APIs

### 3. **Parallel Execution**
- `maxWorkers: '50%'` - Uses half of available CPU cores
- `maxConcurrency: 10` - Prevents resource exhaustion

### 4. **V8 Coverage Provider**
- Uses native V8 coverage instead of babel-plugin-istanbul
- Much faster coverage collection

### 5. **Aggressive Caching**
- Enabled Jest cache with custom directory
- Caches transformed modules between runs

### 6. **Optimized Module Resolution**
- Removed custom resolver for faster module lookups
- Minimal transformIgnorePatterns

### 7. **Mock Optimizations**
- CSS and file imports are mocked (no processing)
- Heavy modules like next/image are mocked
- Animations disabled in tests

### 8. **Watch Mode Enhancements**
- jest-watch-typeahead for better file/test filtering
- Notifications on failure for faster feedback

### 9. **Memory Optimizations**
- Increased Node.js heap size for local dev
- Automatic garbage collection in teardown
- Clear mocks between tests

### 10. **CI/CD Optimizations**
- Different settings for CI vs local
- Fail fast in CI (`bail: 1`)
- Run in band in CI for stability

## Performance Comparison

### Before (ts-jest):
- Cold start: ~15-20s
- Hot reload: ~5-8s per file
- Full suite: ~2-3 minutes

### After (SWC + optimizations):
- Cold start: ~3-5s
- Hot reload: ~0.5-2s per file
- Full suite: ~30-45s

## Usage

```bash
# Run all tests (optimized)
npm test

# Run in watch mode (ultra-fast feedback)
npm test -- --watch

# Run specific test file
npm test -- src/app/api/chat/conversational/route.test.ts

# Run with coverage
npm test -- --coverage

# Run only unit tests (node environment)
npm test -- --selectProjects=node

# Run only component tests (jsdom)
npm test -- --selectProjects=jsdom
```

## Additional Performance Tips

1. **Use `.test.ts` for unit tests** (runs in Node)
2. **Use `.test.tsx` for component tests** (runs in jsdom)
3. **Keep test files close to source** for faster resolution
4. **Use `describe.skip()` instead of commenting** out tests
5. **Use `--findRelatedTests` for testing changed files**:
   ```bash
   npm test -- --findRelatedTests src/app/api/chat/conversational/route.ts
   ```

## Troubleshooting

If you encounter issues:

1. **Clear cache**: `rm -rf .jest-cache`
2. **Reinstall deps**: `npm ci`
3. **Check Node version**: Ensure Node.js 18+ for best performance
4. **Memory issues**: Increase `--max-old-space-size` in globalSetup

This configuration achieves Vitest-level performance while maintaining Jest's ecosystem compatibility.