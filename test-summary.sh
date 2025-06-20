#!/bin/bash

echo "Running Test Suite Summary..."
echo "==============================="

# Count test files
TOTAL_TEST_FILES=$(find src/__tests__ -name "*.test.ts" -o -name "*.spec.ts" | wc -l)
echo "Total test files: $TOTAL_TEST_FILES"

# Run tests and capture output
npm run test -- --run --reporter=json > test-results.json 2>&1 || true

# Extract summary from test output
if [ -f test-results.json ]; then
    echo "Test results generated"
else
    echo "Running basic test count..."
    
    # Count tests in each category
    echo ""
    echo "Test Categories:"
    echo "- Unit Tests: $(find src/__tests__/lib -name "*.test.ts" | wc -l) files"
    echo "- Integration Tests: $(find src/__tests__/integration -name "*.test.ts" | wc -l) files"
    echo "- E2E Tests: $(find src/__tests__/e2e -name "*.spec.ts" | wc -l) files"
    echo "- Performance Tests: $(find src/__tests__/performance -name "*.test.ts" | wc -l) files"
    echo "- Component Tests: $(find src/__tests__/components -name "*.test.tsx" | wc -l) files"
    
    # List all test files
    echo ""
    echo "Test Files Created:"
    find src/__tests__ -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" | sort
fi