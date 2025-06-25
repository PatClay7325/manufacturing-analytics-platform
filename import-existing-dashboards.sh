#!/bin/bash
# Import existing dashboard JSON files into Grafana

set -e

GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"

echo "Importing existing dashboards into Grafana..."
echo "=========================================="

# Function to import a dashboard
import_dashboard() {
    local file=$1
    local folder_id=${2:-0}
    local filename=$(basename "$file")
    
    echo "Importing: $filename"
    
    # Read the dashboard JSON and wrap it in the import format
    dashboard_json=$(cat "$file")
    
    # Create the import payload
    import_payload=$(cat <<EOF
{
  "dashboard": $dashboard_json,
  "overwrite": true,
  "folderId": $folder_id,
  "inputs": [
    {
      "name": "DS_PROMETHEUS",
      "type": "datasource",
      "pluginId": "prometheus",
      "value": "Prometheus"
    },
    {
      "name": "DS_POSTGRESQL",
      "type": "datasource",
      "pluginId": "postgres",
      "value": "PostgreSQL"
    }
  ]
}
EOF
)
    
    # Import the dashboard
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)" \
        -d "$import_payload" \
        "${GRAFANA_URL}/api/dashboards/import")
    
    if echo "$response" | grep -q "imported successfully\|\"imported\":true\|\"uid\":"; then
        echo "✓ Successfully imported: $filename"
    else
        echo "✗ Failed to import: $filename"
        echo "Response: $response"
    fi
    echo ""
}

# Create folders first
echo "Creating folders..."

# Create Manufacturing folder
manufacturing_folder=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)" \
    -d '{"title":"Manufacturing Dashboards"}' \
    "${GRAFANA_URL}/api/folders" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' || echo "0")

# Create System folder
system_folder=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)" \
    -d '{"title":"System Monitoring"}' \
    "${GRAFANA_URL}/api/folders" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo ""
echo "Importing dashboards from src/templates/dashboards..."
echo "---------------------------------------------------"

# Import dashboards from src/templates
for dashboard in /mnt/d/Source/manufacturing-analytics-platform/src/templates/dashboards/*.json; do
    if [ -f "$dashboard" ]; then
        import_dashboard "$dashboard" "$manufacturing_folder"
    fi
done

echo "Importing dashboards from monitoring/manufacturingplatform..."
echo "-----------------------------------------------------------"

# Import manufacturing overview
if [ -f "/mnt/d/Source/manufacturing-analytics-platform/monitoring/manufacturingplatform/dashboards/manufacturing-overview.json" ]; then
    import_dashboard "/mnt/d/Source/manufacturing-analytics-platform/monitoring/manufacturingplatform/dashboards/manufacturing-overview.json" "$manufacturing_folder"
fi

# Import manufacturing dashboards
for dashboard in /mnt/d/Source/manufacturing-analytics-platform/monitoring/manufacturingplatform/dashboards/manufacturing/*.json; do
    if [ -f "$dashboard" ]; then
        import_dashboard "$dashboard" "$manufacturing_folder"
    fi
done

# Import system dashboards
for dashboard in /mnt/d/Source/manufacturing-analytics-platform/monitoring/manufacturingplatform/dashboards/infrastructure/*.json; do
    if [ -f "$dashboard" ]; then
        import_dashboard "$dashboard" "$system_folder"
    fi
done

echo "Import complete!"
echo ""
echo "Imported dashboards should now be available at:"
echo "  ${GRAFANA_URL}/dashboards"
echo ""
echo "Note: Some dashboards may need datasource configuration adjustments."