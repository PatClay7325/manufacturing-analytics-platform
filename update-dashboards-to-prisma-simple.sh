#!/bin/bash
# Update dashboards to use Prisma API - Simple version

set -e

GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"
AUTH="Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)"

echo "Simple Dashboard Update Script"
echo "=============================="
echo ""
echo "Since we can't programmatically update all dashboards without jq,"
echo "here are the manual steps to update your dashboards:"
echo ""
echo "1. Open Grafana at http://localhost:3001"
echo "2. Login with admin/admin"
echo "3. For each dashboard:"
echo "   a. Click on the dashboard"
echo "   b. Click the settings icon (gear) in the top right"
echo "   c. Go to the 'Variables' or 'Settings' section"
echo "   d. Change the datasource from 'PostgreSQL' to 'Prisma API'"
echo "   e. Save the dashboard"
echo ""
echo "Available Prisma API queries:"
echo "- performance_metrics"
echo "- oee_by_equipment"
echo "- production_summary"
echo "- downtime_analysis"
echo "- quality_metrics"
echo "- equipment_list"
echo "- shift_performance"
echo ""

# At least test the connection
echo "Testing Prisma API connection..."
TEST_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d '{"targets":[{"target":"equipment_list","type":"table"}],"range":{"from":"now-1h","to":"now"}}' \
    "http://localhost:3000/api/grafana/query")

if echo "$TEST_RESPONSE" | grep -q "Machine"; then
    echo "✓ Prisma API is working correctly"
    echo ""
    echo "Sample data received:"
    echo "$TEST_RESPONSE" | head -100
else
    echo "✗ Prisma API test failed"
fi