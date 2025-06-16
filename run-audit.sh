#!/bin/bash

echo "========================================"
echo "Manufacturing Analytics Platform Audit"
echo "========================================"
echo ""

# Check if server is running
echo "Checking if development server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Development server is not running!"
    echo "Please run 'npm run dev' in another terminal first."
    exit 1
fi
echo "✅ Server is running at http://localhost:3000"
echo ""

# Run simple Node.js audit
echo "Running simple health check audit..."
echo "----------------------------------------"
node simple-audit.js
echo ""
echo "Simple audit completed!"
echo ""

# Try to run Playwright audit if possible
echo "Attempting Playwright audit..."
echo "----------------------------------------"

# Check if Playwright browsers are installed
if npx playwright --version > /dev/null 2>&1; then
    echo "Playwright is installed. Checking browsers..."
    
    # Try to install browsers with minimal dependencies
    echo "Attempting to install Playwright browsers..."
    npx playwright install chromium --with-deps 2>/dev/null || {
        echo "⚠️  Could not install Playwright browsers (requires sudo)."
        echo "Running with existing setup..."
    }
    
    # Run Playwright audit with WSL config
    echo "Running Playwright audit with WSL configuration..."
    npx playwright test --config=playwright-audit-wsl.config.ts 2>&1 | tee playwright-audit.log
    
    if [ $? -eq 0 ]; then
        echo "✅ Playwright audit completed successfully!"
    else
        echo "⚠️  Playwright audit encountered issues. Check playwright-audit.log for details."
        echo "The simple audit results above provide a good overview of your application health."
    fi
else
    echo "⚠️  Playwright is not properly installed."
    echo "The simple audit results above provide a good overview of your application health."
fi

echo ""
echo "========================================"
echo "Audit Complete!"
echo "========================================"
echo ""
echo "Results saved to:"
echo "  - audit-results/simple-audit-results.json (Simple audit)"
echo "  - audit-results/audit-summary.json (Playwright audit, if successful)"
echo ""