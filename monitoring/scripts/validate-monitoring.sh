#!/bin/bash
set -euo pipefail

# Manufacturing Analytics Platform - Monitoring Validation Script
# This script validates that all monitoring components are working correctly

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL="http://localhost:9090"
MANUFACTURING_PLATFORM_URL="http://localhost:3003"
ALERTMANAGER_URL="http://localhost:9093"
LOKI_URL="http://localhost:3100"
JAEGER_URL="http://localhost:16686"
API_URL="http://localhost:3000"

# Results tracking
TOTAL_TESTS=0
PASSED_TESTS=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

echo "🔍 Manufacturing Analytics Platform - Monitoring Stack Validation"
echo "================================================================"
echo ""

# Check if docker-compose is running
echo "📦 Checking Docker services..."
if ! docker-compose ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not running. Please run: docker-compose up -d${NC}"
    exit 1
fi

# Test 1: Prometheus health
run_test "Prometheus health" "curl -sf $PROMETHEUS_URL/-/healthy"

# Test 2: Prometheus targets
run_test "Prometheus has targets" "curl -sf $PROMETHEUS_URL/api/v1/targets | jq -e '.data.activeTargets | length > 0'"

# Test 3: manufacturingPlatform health
run_test "manufacturingPlatform health" "curl -sf $MANUFACTURING_PLATFORM_URL/api/health"

# Test 4: manufacturingPlatform datasources
run_test "manufacturingPlatform datasources configured" "curl -sf -u admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin} $MANUFACTURING_PLATFORM_URL/api/datasources | jq -e 'length > 0'"

# Test 5: AlertManager health
run_test "AlertManager health" "curl -sf $ALERTMANAGER_URL/-/healthy"

# Test 6: Loki health
run_test "Loki health" "curl -sf $LOKI_URL/ready"

# Test 7: Jaeger health
run_test "Jaeger health" "curl -sf $JAEGER_URL/"

# Test 8: Manufacturing API health
run_test "Manufacturing API health" "curl -sf $API_URL/api/health"

# Test 9: Metrics endpoint
run_test "Manufacturing metrics endpoint" "curl -sf $API_URL/api/metrics | grep -q manufacturing_oee_score"

# Test 10: Check for manufacturing metrics in Prometheus
run_test "Manufacturing metrics in Prometheus" "curl -sf $PROMETHEUS_URL/api/v1/query?query=manufacturing_oee_score | jq -e '.data.result | length > 0'"

# Test 11: Check manufacturingPlatform dashboards
run_test "manufacturingPlatform dashboards loaded" "curl -sf -u admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin} $MANUFACTURING_PLATFORM_URL/api/search?type=dash-db | jq -e 'length > 0'"

# Test 12: Check specific dashboard
run_test "Manufacturing dashboard exists" "curl -sf -u admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin} $MANUFACTURING_PLATFORM_URL/api/dashboards/uid/manufacturing-overview | jq -e '.dashboard != null'"

# Test 13: PostgreSQL exporter metrics
run_test "PostgreSQL metrics available" "curl -sf $PROMETHEUS_URL/api/v1/query?query=pg_up | jq -e '.data.result | length > 0'"

# Test 14: Node exporter metrics
run_test "Node exporter metrics available" "curl -sf $PROMETHEUS_URL/api/v1/query?query=node_cpu_seconds_total | jq -e '.data.result | length > 0'"

# Test 15: Check alert rules loaded
run_test "Alert rules loaded in Prometheus" "curl -sf $PROMETHEUS_URL/api/v1/rules | jq -e '.data.groups | length > 0'"

# Test 16: Check Loki is receiving logs
run_test "Loki receiving logs" "curl -sf '$LOKI_URL/loki/api/v1/query?query={job=\"containerlogs\"}' | jq -e '.data.result | length >= 0'"

# Test 17: Check blackbox exporter
run_test "Blackbox exporter probe" "curl -sf 'http://localhost:9115/probe?target=http://prometheus:9090&module=http_2xx' | grep -q 'probe_success 1'"

# Test 18: Check recording rules
run_test "Recording rules working" "curl -sf $PROMETHEUS_URL/api/v1/query?query=instance:manufacturing_oee_average:rate5m | jq -e '.status == \"success\"'"

# Summary
echo ""
echo "================================================================"
echo -e "Test Results: ${GREEN}$PASSED_TESTS${NC}/${TOTAL_TESTS} passed"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed! Your monitoring stack is fully operational.${NC}"
    echo ""
    echo "📊 Access your monitoring stack:"
    echo "  - Prometheus: $PROMETHEUS_URL"
    echo "  - manufacturingPlatform: $MANUFACTURING_PLATFORM_URL (admin/${MANUFACTURING_PLATFORM_PASSWORD:-admin})"
    echo "  - AlertManager: $ALERTMANAGER_URL"
    echo "  - Jaeger: $JAEGER_URL"
    echo "  - Loki: via manufacturingPlatform Explore"
    echo ""
    echo "📈 Key dashboards:"
    echo "  - Manufacturing Overview: $MANUFACTURING_PLATFORM_URL/d/manufacturing-overview"
    echo ""
    echo "🔔 Test alerts with: ./scripts/test-alerts.sh"
else
    echo -e "${RED}❌ Some tests failed. Please check the failed components.${NC}"
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "  1. Check Docker logs: docker-compose logs [service-name]"
    echo "  2. Ensure all services are running: docker-compose ps"
    echo "  3. Verify environment variables in .env file"
    echo "  4. Check network connectivity between containers"
    exit 1
fi