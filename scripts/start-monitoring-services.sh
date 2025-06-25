#!/bin/bash

echo "🚀 Starting monitoring services (Loki & Jaeger)..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Start only Loki and Jaeger services
echo -e "${YELLOW}Starting Loki and Jaeger containers...${NC}"
docker-compose up -d loki jaeger

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"

# Check Loki
echo -n "Checking Loki..."
for i in {1..30}; do
    if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
        echo -e " ${GREEN}✓ Ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗ Failed to start${NC}"
    else
        echo -n "."
        sleep 2
    fi
done

# Check Jaeger
echo -n "Checking Jaeger..."
for i in {1..30}; do
    if curl -s http://localhost:16686/ > /dev/null 2>&1; then
        echo -e " ${GREEN}✓ Ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗ Failed to start${NC}"
    else
        echo -n "."
        sleep 2
    fi
done

echo -e "\n${GREEN}Monitoring services status:${NC}"
docker-compose ps loki jaeger

echo -e "\n${GREEN}Service URLs:${NC}"
echo "  Loki:   http://localhost:3100"
echo "  Jaeger: http://localhost:16686"

echo -e "\n${GREEN}Done! Monitoring services are ready.${NC}"