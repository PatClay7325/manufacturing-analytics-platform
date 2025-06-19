#!/bin/bash

echo "🧪 Comprehensive Test Status Check"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Summary counters
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run a test suite
run_test_suite() {
    local name=$1
    local command=$2
    
    echo "📋 Running $name..."
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    if eval "$command" > /tmp/test-output.log 2>&1; then
        echo -e "   ${GREEN}✅ PASSED${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        
        # Extract test counts if available
        if grep -q "passed" /tmp/test-output.log; then
            STATS=$(grep -E "([0-9]+ passed|[0-9]+ failed|[0-9]+ skipped)" /tmp/test-output.log | tail -1)
            if [ ! -z "$STATS" ]; then
                echo "      $STATS"
            fi
        fi
    else
        echo -e "   ${RED}❌ FAILED${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        
        # Show error summary
        echo "      Error details:"
        grep -E "(Error:|FAIL|failed)" /tmp/test-output.log | head -5 | sed 's/^/      /'
        
        # Count failed tests if possible
        FAILED_COUNT=$(grep -c "FAIL" /tmp/test-output.log 2>/dev/null || echo "0")
        if [ "$FAILED_COUNT" -gt 0 ]; then
            echo "      Failed tests: $FAILED_COUNT"
        fi
    fi
    echo ""
}

# 1. Unit Tests
echo "1️⃣ UNIT TESTS (Vitest)"
echo "-------------------"
run_test_suite "Component Tests" "npm run test:unit -- --run --reporter=verbose src/__tests__/components/ 2>/dev/null"
run_test_suite "Hook Tests" "npm run test:unit -- --run --reporter=verbose src/__tests__/hooks/ 2>/dev/null"
run_test_suite "Utils Tests" "npm run test:unit -- --run --reporter=verbose src/__tests__/utils/ 2>/dev/null"

# 2. Integration Tests
echo "2️⃣ INTEGRATION TESTS (Vitest)"
echo "--------------------------"
run_test_suite "Database Integration" "npm run test:integration -- --run database.integration 2>/dev/null"
run_test_suite "API Integration" "npm run test:integration -- --run api.integration 2>/dev/null"
run_test_suite "Services Integration" "npm run test:integration -- --run services.integration 2>/dev/null"
run_test_suite "Chat Integration" "npm run test:integration -- --run chat.integration 2>/dev/null"

# 3. E2E Tests
echo "3️⃣ E2E TESTS (Playwright)"
echo "----------------------"

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "   ${YELLOW}⚠️  Dev server not running. Some E2E tests may fail.${NC}"
    echo "   Run 'npm run dev' in another terminal"
    echo ""
fi

run_test_suite "Navigation Tests" "npx playwright test tests/e2e/navigation.spec.ts --reporter=list 2>/dev/null"
run_test_suite "Equipment Tests" "npx playwright test tests/e2e/equipment.spec.ts --reporter=list 2>/dev/null"
run_test_suite "Manufacturing Chat Tests" "npx playwright test tests/e2e/manufacturing-chat.spec.ts --reporter=list 2>/dev/null"

# 4. Additional test directories
if [ -d "testing/e2e" ]; then
    echo "4️⃣ ADDITIONAL E2E TESTS"
    echo "--------------------"
    run_test_suite "AI Chat Tests" "npx playwright test testing/e2e/ai-chat.spec.ts --reporter=list 2>/dev/null"
    run_test_suite "Alerts Tests" "npx playwright test testing/e2e/alerts.spec.ts --reporter=list 2>/dev/null"
    run_test_suite "Dashboard Tests" "npx playwright test testing/e2e/dashboard.spec.ts --reporter=list 2>/dev/null"
fi

# Summary
echo "📊 TEST SUMMARY"
echo "=============="
echo "Total Test Suites: $TOTAL_SUITES"
echo -e "Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "Failed: ${RED}$FAILED_SUITES${NC}"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}🎉 All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_SUITES test suite(s) failed${NC}"
    echo ""
    echo "To debug failing tests:"
    echo "  - Run individual test suites with --reporter=verbose"
    echo "  - Check test output in /tmp/test-output.log"
    echo "  - For E2E tests, ensure 'npm run dev' is running"
    echo "  - For integration tests, ensure database is running"
    exit 1
fi