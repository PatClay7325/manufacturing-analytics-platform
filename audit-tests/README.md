# Manufacturing Analytics Platform Audit System

This directory contains comprehensive audit tests for the Manufacturing Analytics Platform.

## Quick Start

```bash
# Run simple health check audit (no browser dependencies)
npm run audit

# Run full audit including Playwright tests (requires browser setup)
npm run audit:full
```

## Audit Types

### 1. Simple Health Check (`npm run audit`)
A lightweight Node.js-based audit that checks:
- Page load status and response times
- API endpoint availability
- Static resource availability
- Basic content validation
- Performance metrics

**Advantages:**
- No browser dependencies required
- Works in all environments (including WSL)
- Fast execution
- Provides immediate feedback

### 2. Full Playwright Audit (`npm run audit:full`)
Comprehensive browser-based testing that includes:
- Accessibility compliance (WCAG)
- Mobile responsiveness
- Cross-browser compatibility
- JavaScript error detection
- Network performance analysis

**Note:** Requires Playwright browsers to be installed. May not work in all WSL environments without proper setup.

## Interpreting Results

### Simple Audit Output
- **✅ Green checkmarks**: Tests passed
- **⚠️ Yellow warnings**: Non-critical issues (e.g., slow load times)
- **❌ Red crosses**: Critical failures requiring attention

### Issue Severity Levels
- **Critical**: Application breaking issues (HTTP errors, missing pages)
- **Warning**: Performance or quality issues that should be addressed
- **Info**: Suggestions for improvement

## Common Issues and Solutions

### 1. API Endpoints Returning 404
**Issue**: `/api/*` endpoints not found
**Solution**: Ensure API server is running or mock API is configured

### 2. Slow Page Load Times
**Issue**: Pages taking >3 seconds to load
**Solution**: 
- Check for large bundle sizes
- Optimize images and assets
- Review data fetching strategies

### 3. Missing Static Resources
**Issue**: favicon.ico, robots.txt not found
**Solution**: Add these files to the public directory

## Customizing Audits

### Adding New Pages to Audit
Edit the `pages` array in `simple-audit.js`:
```javascript
const pages = [
  { name: 'New Page', path: '/new-page' },
  // ... existing pages
];
```

### Adjusting Performance Thresholds
Modify the thresholds in `simple-audit.js`:
```javascript
// Current threshold: 3000ms
if (result.loadTime > 3000) {
  // Mark as slow
}
```

## CI/CD Integration

To run audits in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Start server
  run: npm run dev &
  
- name: Wait for server
  run: sleep 10
  
- name: Run audit
  run: npm run audit
```

## Troubleshooting

### "Cannot connect to http://localhost:3000"
Ensure the development server is running:
```bash
npm run dev
```

### Playwright Browser Issues
If Playwright tests fail in WSL:
1. Use the simple audit instead: `npm run audit`
2. Or install required dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libnspr4 libnss3 libasound2
   ```

## Future Enhancements

- [ ] Performance budgets
- [ ] Lighthouse integration
- [ ] Custom business logic validation
- [ ] Historical trend tracking
- [ ] Automated fix suggestions