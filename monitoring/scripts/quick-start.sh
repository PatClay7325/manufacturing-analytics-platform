#!/bin/bash
set -euo pipefail

# Manufacturing Analytics Platform - Monitoring Quick Start Script
# This script helps you quickly set up the monitoring stack

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Manufacturing Analytics Platform - Monitoring Quick Start${NC}"
echo "================================================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Check if .env exists
cd "$MONITORING_DIR"
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration:${NC}"
    echo "   - Update POSTGRES_* variables to match your database"
    echo "   - Set MANUFACTURING_PLATFORM_PASSWORD to a secure password"
    echo "   - Configure alert channels (Slack, Email, etc.)"
    echo ""
    read -p "Press Enter after updating .env file..." -r
fi

# Check port availability
echo ""
echo "🔍 Checking port availability..."
PORTS=(9090 3003 9093 3100 16686 9115 9187)
PORTS_AVAILABLE=true

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        PORTS_AVAILABLE=false
    fi
done

if [ "$PORTS_AVAILABLE" = false ]; then
    echo -e "${RED}Please free up the required ports or update docker-compose.yml${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required ports are available${NC}"

# Check if main application is running
echo ""
echo "🔍 Checking main application..."
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Main application is running${NC}"
else
    echo -e "${YELLOW}⚠️  Main application not detected at http://localhost:3000${NC}"
    echo "   Monitoring will still work but won't collect application metrics"
    echo "   Start your application with: npm run dev"
fi

# Start monitoring stack
echo ""
echo "🐳 Starting monitoring stack..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Quick health check
echo ""
echo "🏥 Running quick health check..."

check_service() {
    local service_name=$1
    local health_url=$2
    
    if curl -sf "$health_url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ $service_name is healthy${NC}"
        return 0
    else
        echo -e "  ${RED}✗ $service_name is not responding${NC}"
        return 1
    fi
}

SERVICES_HEALTHY=true
check_service "Prometheus" "http://localhost:9090/-/healthy" || SERVICES_HEALTHY=false
check_service "manufacturingPlatform" "http://localhost:3003/api/health" || SERVICES_HEALTHY=false
check_service "AlertManager" "http://localhost:9093/-/healthy" || SERVICES_HEALTHY=false
check_service "Loki" "http://localhost:3100/ready" || SERVICES_HEALTHY=false
check_service "Jaeger" "http://localhost:16686/" || SERVICES_HEALTHY=false

if [ "$SERVICES_HEALTHY" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some services are not healthy. Checking logs...${NC}"
    echo ""
    echo "Recent error logs:"
    docker-compose logs --tail=20 2>&1 | grep -i error || true
    echo ""
    echo "💡 Try these commands:"
    echo "   - View all logs: docker-compose logs"
    echo "   - Restart services: docker-compose restart"
    echo "   - Stop and start: docker-compose down && docker-compose up -d"
fi

# Run full validation
echo ""
echo "🔍 Running full validation..."
if [ -x "$SCRIPT_DIR/validate-monitoring.sh" ]; then
    "$SCRIPT_DIR/validate-monitoring.sh" || true
else
    chmod +x "$SCRIPT_DIR/validate-monitoring.sh"
    "$SCRIPT_DIR/validate-monitoring.sh" || true
fi

# Summary
echo ""
echo "================================================================"
echo -e "${BLUE}📊 Monitoring Stack Summary${NC}"
echo "================================================================"
echo ""
echo "🌐 Access your monitoring services:"
echo "  - Prometheus: http://localhost:9090"
echo "  - manufacturingPlatform: http://localhost:3003 (admin/\${MANUFACTURING_PLATFORM_PASSWORD})"
echo "  - AlertManager: http://localhost:9093"
echo "  - Jaeger: http://localhost:16686"
echo ""
echo "📈 Key manufacturingPlatform dashboards:"
echo "  - Manufacturing Overview: http://localhost:3003/d/manufacturing-overview"
echo ""
echo "🛠️ Useful commands:"
echo "  - View logs: docker-compose logs [service-name]"
echo "  - Test alerts: ./scripts/test-alerts.sh"
echo "  - Backup data: ./scripts/backup.sh"
echo "  - Stop stack: docker-compose down"
echo ""

if [ "$SERVICES_HEALTHY" = true ]; then
    echo -e "${GREEN}✅ Monitoring stack is ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Some issues detected. Please check the logs above.${NC}"
fi