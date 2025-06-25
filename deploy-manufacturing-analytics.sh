#!/bin/bash
# Deploy Manufacturing Analytics Platform with Grafana Fork

set -e

echo "Deploying Manufacturing Analytics Platform..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local file not found. Creating one...${NC}"
    cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/manufacturing"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NODE_ENV="development"
EOF
fi

# Stop any existing containers
echo -e "${BLUE}Stopping existing containers...${NC}"
docker-compose -f docker-compose.db.yml down 2>/dev/null || true

# Start database services
echo -e "${BLUE}Starting database services...${NC}"
docker-compose -f docker-compose.db.yml up -d

# Wait for database to be ready
echo -e "${BLUE}Waiting for database to be ready...${NC}"
sleep 10

# Check if PostgreSQL is ready
echo -e "${BLUE}Checking database connection...${NC}"
if docker exec manufacturing-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
else
    echo -e "${RED}✗ PostgreSQL not ready${NC}"
    exit 1
fi

# Install dependencies and setup database
echo -e "${BLUE}Installing dependencies and setting up database...${NC}"
npm install

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
npx prisma db push

# Seed the database
echo -e "${BLUE}Seeding database with manufacturing data...${NC}"
npm run prisma:seed

# Start the Next.js application
echo -e "${BLUE}Starting Next.js application...${NC}"
npm run dev &
APP_PID=$!

# Wait for app to be ready
echo -e "${BLUE}Waiting for application to be ready...${NC}"
sleep 15

# Check if app is running
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Manufacturing App is healthy${NC}"
else
    echo -e "${RED}✗ Manufacturing App health check failed${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Access URLs:${NC}"
echo "• Manufacturing App: http://localhost:3000"
echo "• Database: localhost:5432"
echo "• Redis: localhost:6379"

echo -e "\n${YELLOW}Default Credentials:${NC}"
echo "• Database: postgres / password"
echo "• Database Name: manufacturing"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo "• View database logs: docker-compose -f docker-compose.db.yml logs -f"
echo "• Stop database: docker-compose -f docker-compose.db.yml down"
echo "• Restart database: docker-compose -f docker-compose.db.yml restart"
echo "• Stop application: kill $APP_PID"

echo -e "\n${YELLOW}Available Pages:${NC}"
echo "• Home: http://localhost:3000"
echo "• Production Dashboard: http://localhost:3000/dashboards/production"
echo "• Equipment Page: http://localhost:3000/equipment"
echo "• AI Chat: http://localhost:3000/ai-chat"

echo -e "\n${GREEN}System is ready to use!${NC}"