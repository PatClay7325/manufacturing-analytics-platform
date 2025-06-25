#!/bin/bash
set -euo pipefail

# Manufacturing Analytics Platform - Alert Testing Script
# This script tests various alert scenarios to ensure alerting is working correctly

PROMETHEUS_URL="http://localhost:9090"
ALERTMANAGER_URL="http://localhost:9093"

echo "🧪 Testing Manufacturing Alerts..."

# Function to trigger a test alert
trigger_alert() {
    local alert_name=$1
    local labels=$2
    local value=$3
    local annotations=$4
    
    echo "  - Triggering alert: $alert_name"
    
    curl -s -XPOST "$ALERTMANAGER_URL/api/v1/alerts" \
        -H "Content-Type: application/json" \
        -d "[{
            \"labels\": $labels,
            \"annotations\": $annotations,
            \"startsAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"generatorURL\": \"$PROMETHEUS_URL/test\"
        }]"
}

# Test 1: OEE Critical Alert
echo "📊 Test 1: OEE Critical Alert"
trigger_alert \
    "ManufacturingOEECriticalLow" \
    '{"alertname":"ManufacturingOEECriticalLow","severity":"critical","category":"manufacturing","equipment_id":"test-equipment-01","equipment_name":"Test Equipment 01"}' \
    "45" \
    '{"summary":"Critical: OEE below 50% on Test Equipment 01","description":"Equipment Test Equipment 01 (ID: test-equipment-01) has OEE of 45% which is critically low."}'

sleep 2

# Test 2: Equipment Temperature High
echo "🌡️ Test 2: Equipment Temperature Alert"
trigger_alert \
    "EquipmentTemperatureHigh" \
    '{"alertname":"EquipmentTemperatureHigh","severity":"warning","category":"manufacturing","equipment_id":"test-equipment-02","sensor_location":"motor"}' \
    "85" \
    '{"summary":"High temperature on test-equipment-02","description":"Temperature reading of 85°C exceeds safe operating threshold of 80°C at motor."}'

sleep 2

# Test 3: Production Stopped
echo "🛑 Test 3: Production Stopped Alert"
trigger_alert \
    "ProductionStopped" \
    '{"alertname":"ProductionStopped","severity":"critical","category":"manufacturing","equipment_id":"test-line-01"}' \
    "0" \
    '{"summary":"Production stopped on test-line-01","description":"No production detected for the last 5 minutes on equipment test-line-01."}'

sleep 2

# Test 4: High API Error Rate
echo "⚠️ Test 4: API Error Rate Alert"
trigger_alert \
    "APIHighErrorRate" \
    '{"alertname":"APIHighErrorRate","severity":"critical","category":"infrastructure","route":"/api/equipment"}' \
    "0.15" \
    '{"summary":"High error rate on /api/equipment","description":"Error rate is 15% for route /api/equipment."}'

# Check AlertManager status
echo ""
echo "📋 Checking AlertManager status..."
echo "Active alerts:"
curl -s "$ALERTMANAGER_URL/api/v1/alerts" | jq '.[] | {labels: .labels, annotations: .annotations, startsAt: .startsAt}' | head -20

# Check Prometheus alerts
echo ""
echo "📊 Checking Prometheus alert rules..."
curl -s "$PROMETHEUS_URL/api/v1/rules" | jq '.data.groups[].rules[] | select(.state=="firing") | {name: .name, state: .state, labels: .labels}'

echo ""
echo "✅ Alert testing completed!"
echo ""
echo "🔍 You should see:"
echo "  1. Alerts in AlertManager UI: $ALERTMANAGER_URL"
echo "  2. Alert notifications in configured channels (Slack, Email, etc.)"
echo "  3. Alert annotations in manufacturingPlatform dashboards"