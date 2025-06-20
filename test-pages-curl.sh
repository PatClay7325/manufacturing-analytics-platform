#!/bin/bash

# Comprehensive Page Testing with Curl
# Tests all navigation pages and sub-pages

BASE_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Array of pages to test
declare -a PAGES=(
    "/:Home"
    "/dashboard:Dashboard"
    "/dashboards:Analytics"
    "/equipment:Equipment"
    "/alerts:Alerts"
    "/manufacturing-chat:Manufacturing Chat"
    "/documentation:Documentation"
    "/dashboard/import:Dashboard Import"
    "/dashboard/snapshot:Dashboard Snapshot"
    "/dashboards/browse:Dashboards Browse"
    "/dashboards/new:Dashboards New"
    "/dashboards/manufacturing:Dashboards Manufacturing"
    "/dashboards/oee:Dashboards OEE"
    "/dashboards/production:Dashboards Production"
    "/dashboards/quality:Dashboards Quality"
    "/dashboards/maintenance:Dashboards Maintenance"
    "/dashboards/unified:Dashboards Unified"
    "/dashboards/grafana:Dashboards Grafana"
    "/manufacturing-chat/optimized:Manufacturing Chat Optimized"
    "/documentation/api-reference:Documentation API Reference"
    "/Analytics-dashboard:Analytics Dashboard"
    "/profile:Profile"
    "/status:Status"
    "/support:Support"
    "/diagnostics:Diagnostics"
    "/explore:Explore"
)

echo -e "${BLUE}🚀 Starting comprehensive page testing...${NC}"
echo -e "${BLUE}Testing ${#PAGES[@]} pages against ${BASE_URL}${NC}"
echo ""

# Test server availability
echo -e "Testing server availability..."
if curl -s -f "${BASE_URL}/" > /dev/null; then
    echo -e "${GREEN}✅ Server is responding${NC}"
else
    echo -e "${RED}❌ Server is not responding. Make sure the development server is running on port 3000${NC}"
    exit 1
fi
echo ""

# Function to test a single page
test_page() {
    local path="$1"
    local name="$2"
    local url="${BASE_URL}${path}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -ne "[${TOTAL_TESTS}/${#PAGES[@]}] Testing ${name} (${path})... "
    
    # Make request and capture response
    local response=$(curl -s -w "%{http_code}:%{time_total}" -o /tmp/page_content.html "${url}")
    local http_code=$(echo $response | cut -d: -f1)
    local response_time=$(echo $response | cut -d: -f2 | cut -d. -f1)
    
    # Check if page loaded successfully
    if [[ $http_code -ge 200 && $http_code -lt 400 ]]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC} - ${http_code} (${response_time}s)"
        
        # Additional content checks
        local content=$(cat /tmp/page_content.html)
        local warnings=""
        
        # Check for title
        if ! echo "$content" | grep -q "<title>"; then
            warnings="${warnings}⚠️ No title found; "
        fi
        
        # Check for navigation
        if ! echo "$content" | grep -qi "nav"; then
            warnings="${warnings}⚠️ No navigation found; "
        fi
        
        # Check for errors in content
        if echo "$content" | grep -qi "error:"; then
            warnings="${warnings}⚠️ Error text detected; "
        fi
        
        # Check for empty/minimal content
        local content_length=$(echo "$content" | wc -c)
        if [[ $content_length -lt 1000 ]]; then
            warnings="${warnings}⚠️ Minimal content (${content_length} chars); "
        fi
        
        if [[ -n "$warnings" ]]; then
            echo -e "    ${YELLOW}${warnings}${NC}"
        fi
        
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC} - ${http_code} (${response_time}s)"
        
        # Try to get error details
        if [[ -f /tmp/page_content.html ]]; then
            local error_content=$(head -n 3 /tmp/page_content.html 2>/dev/null | grep -o "Error.*" | head -n 1)
            if [[ -n "$error_content" ]]; then
                echo -e "    Error: ${error_content}"
            fi
        fi
    fi
    
    # Clean up temp file
    rm -f /tmp/page_content.html
    
    # Brief pause between requests
    sleep 0.1
}

# Test all pages
for page_info in "${PAGES[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    test_page "$path" "$name"
done

# Calculate success rate
SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)

# Print summary
echo ""
echo "================================================================================"
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo "================================================================================"
echo -e "Total Pages Tested: ${TOTAL_TESTS}"
echo -e "${GREEN}✅ Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}❌ Failed: ${FAILED_TESTS}${NC}"
echo -e "${BLUE}📈 Success Rate: ${SUCCESS_RATE}%${NC}"

# Performance analysis
echo ""
echo -e "${BLUE}⚡ PERFORMANCE NOTES:${NC}"
echo "- Most pages should load in under 2 seconds"
echo "- Pages taking longer may have database/API issues"
echo "- Check for lazy loading and async content"

echo ""
echo "================================================================================"

# Exit with appropriate code
if [[ $FAILED_TESTS -gt 0 ]]; then
    echo -e "${RED}❌ Some tests failed. Check the details above.${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
fi