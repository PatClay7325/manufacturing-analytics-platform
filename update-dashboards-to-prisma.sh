#!/bin/bash
# Update all dashboards to use Prisma API instead of PostgreSQL

set -e

GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"
AUTH="Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)"

echo "Updating dashboards to use Prisma API datasource..."
echo "=============================================="

# Get the Prisma API datasource UID
PRISMA_DS_UID=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/datasources/name/Prisma%20API" | grep -o '"uid":"[^"]*"' | cut -d'"' -f4)
echo "Prisma API datasource UID: $PRISMA_DS_UID"

# Get all dashboards
echo ""
echo "Fetching all dashboards..."
DASHBOARDS=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/search?type=dash-db" | jq -r '.[] | .uid')

# Update each dashboard
for DASHBOARD_UID in $DASHBOARDS; do
    echo ""
    echo "Processing dashboard: $DASHBOARD_UID"
    
    # Get dashboard JSON
    DASHBOARD_JSON=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/dashboards/uid/${DASHBOARD_UID}")
    
    # Extract dashboard object
    DASHBOARD=$(echo "$DASHBOARD_JSON" | jq '.dashboard')
    
    # Get dashboard title
    TITLE=$(echo "$DASHBOARD" | jq -r '.title')
    echo "  Title: $TITLE"
    
    # Update datasource references
    UPDATED_DASHBOARD=$(echo "$DASHBOARD" | \
        jq --arg uid "$PRISMA_DS_UID" \
        'walk(if type == "object" and has("datasource") then 
            if (.datasource | type) == "string" then 
                .datasource = $uid 
            elif (.datasource | type) == "object" then 
                .datasource.uid = $uid 
            else . end
        else . end)')
    
    # Save updated dashboard
    SAVE_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "$AUTH" \
        -d "{
            \"dashboard\": $UPDATED_DASHBOARD,
            \"overwrite\": true,
            \"message\": \"Updated datasource to Prisma API\"
        }" \
        "${GRAFANA_URL}/api/dashboards/db")
    
    if echo "$SAVE_RESPONSE" | grep -q "success"; then
        echo "  ✓ Successfully updated"
    else
        echo "  ✗ Failed to update: $SAVE_RESPONSE"
    fi
done

echo ""
echo "Dashboard update complete!"
echo "========================="
echo ""
echo "All dashboards have been updated to use the Prisma API datasource."
echo "You may need to adjust some queries if they were using PostgreSQL-specific syntax."
echo ""
echo "Visit your dashboards at http://localhost:3001"