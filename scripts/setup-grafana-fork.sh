#!/bin/bash
# Setup script for Manufacturing Analytics (Grafana Fork)

set -e

echo "Setting up Manufacturing Analytics fork..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}Error: This script must be run from the manufacturing-analytics-platform directory${NC}"
    exit 1
fi

# Step 1: Clone Grafana if not already cloned
echo -e "${YELLOW}Step 1: Checking Grafana fork...${NC}"
if [ ! -d "../manufacturing-analytics" ]; then
    echo "Cloning Grafana repository..."
    cd ..
    git clone https://github.com/grafana/grafana.git manufacturing-analytics
    cd manufacturing-analytics
    
    # Remove git history for clean start
    rm -rf .git
    git init
    git add .
    git commit -m "Initial fork of Grafana v10.2.0 for Manufacturing Analytics Platform"
    
    cd ../manufacturing-analytics-platform
    echo -e "${GREEN}✓ Grafana cloned successfully${NC}"
else
    echo -e "${GREEN}✓ Manufacturing Analytics directory already exists${NC}"
fi

# Step 2: Create directory structure
echo -e "${YELLOW}Step 2: Creating directory structure...${NC}"
mkdir -p ../manufacturing-analytics/branding/img
mkdir -p ../manufacturing-analytics/pkg/services/manufacturing
mkdir -p ../manufacturing-analytics/public/app/features/manufacturing
mkdir -p ../manufacturing-analytics/public/app/plugins/panel/manufacturing-oee
mkdir -p ../manufacturing-analytics/conf/provisioning/auth
mkdir -p dashboards/manufacturing
mkdir -p nginx/ssl
mkdir -p sql
mkdir -p prometheus

echo -e "${GREEN}✓ Directory structure created${NC}"

# Step 3: Copy branding assets
echo -e "${YELLOW}Step 3: Setting up branding assets...${NC}"
if [ -f "public/img/logo.svg" ]; then
    cp public/img/logo.svg ../manufacturing-analytics/branding/img/manufacturing-logo.svg
    cp public/img/logo.svg ../manufacturing-analytics/branding/img/manufacturing-icon.svg
fi

# Create placeholder branding if not exists
if [ ! -f "../manufacturing-analytics/branding/img/manufacturing-logo.svg" ]; then
    cat > ../manufacturing-analytics/branding/img/manufacturing-logo.svg << 'EOF'
<svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="50" fill="#1a73e8"/>
  <text x="100" y="30" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">
    Manufacturing Analytics
  </text>
</svg>
EOF
fi

echo -e "${GREEN}✓ Branding assets prepared${NC}"

# Step 4: Create environment files
echo -e "${YELLOW}Step 4: Creating environment configuration...${NC}"

# Create .env file if not exists
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# OAuth Configuration
OAUTH_CLIENT_SECRET=your-secret-here-change-in-production
GRAFANA_ADMIN_PASSWORD=admin

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/manufacturing
REDIS_URL=redis://localhost:6379

# Analytics Configuration
ANALYTICS_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here-change-in-production

# Grafana Configuration
GF_SECURITY_ADMIN_PASSWORD=admin
GF_DATABASE_TYPE=postgres
GF_DATABASE_HOST=postgres:5432
GF_DATABASE_NAME=manufacturing_analytics
GF_DATABASE_USER=postgres
GF_DATABASE_PASSWORD=password
EOF
    echo -e "${GREEN}✓ Created .env file (please update with your values)${NC}"
else
    echo -e "${YELLOW}! .env file already exists, skipping${NC}"
fi

# Step 5: Create SQL initialization script
echo -e "${YELLOW}Step 5: Creating database initialization...${NC}"
cat > sql/init-multi-db.sh << 'EOF'
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- Create manufacturing database
    CREATE DATABASE manufacturing;
    GRANT ALL PRIVILEGES ON DATABASE manufacturing TO $POSTGRES_USER;
    
    -- Create manufacturing_analytics database for Grafana
    CREATE DATABASE manufacturing_analytics;
    GRANT ALL PRIVILEGES ON DATABASE manufacturing_analytics TO $POSTGRES_USER;
    
    -- Connect to manufacturing database and enable TimescaleDB
    \c manufacturing
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    
    -- Create base tables
    CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        machine_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        line_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS production_data (
        time TIMESTAMPTZ NOT NULL,
        machine_id VARCHAR(50) NOT NULL,
        production_rate DOUBLE PRECISION,
        quality_score DOUBLE PRECISION,
        availability DOUBLE PRECISION,
        performance DOUBLE PRECISION,
        oee_score DOUBLE PRECISION,
        good_count INTEGER,
        reject_count INTEGER
    );
    
    -- Convert to hypertable
    SELECT create_hypertable('production_data', 'time', if_not_exists => TRUE);
    
    -- Create indexes
    CREATE INDEX idx_production_machine_time ON production_data (machine_id, time DESC);
EOSQL

echo "Database initialization complete"
EOF

chmod +x sql/init-multi-db.sh
echo -e "${GREEN}✓ Database initialization script created${NC}"

# Step 6: Create Prometheus configuration
echo -e "${YELLOW}Step 6: Creating Prometheus configuration...${NC}"
cat > prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Manufacturing App metrics
  - job_name: 'manufacturing-app'
    static_configs:
      - targets: ['manufacturing-app:3000']
    metrics_path: '/api/metrics'

  # Manufacturing Analytics (Grafana) metrics
  - job_name: 'manufacturing-analytics'
    static_configs:
      - targets: ['manufacturing-analytics:3000']
    metrics_path: '/metrics'

  # Node exporter for system metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # PostgreSQL exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
EOF

echo -e "${GREEN}✓ Prometheus configuration created${NC}"

# Step 7: Create sample manufacturing dashboard
echo -e "${YELLOW}Step 7: Creating sample dashboard...${NC}"
cat > dashboards/manufacturing/production-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "uid": "manufacturing-production",
    "title": "Manufacturing Production Overview",
    "tags": ["manufacturing", "production", "oee"],
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "10s",
    "panels": [
      {
        "datasource": {
          "type": "postgres",
          "uid": "manufacturing-ts"
        },
        "fieldConfig": {
          "defaults": {
            "custom": {
              "lineWidth": 2,
              "fillOpacity": 10
            },
            "unit": "percent"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        },
        "id": 1,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom"
          },
          "tooltip": {
            "mode": "multi"
          }
        },
        "targets": [
          {
            "datasource": {
              "type": "postgres",
              "uid": "manufacturing-ts"
            },
            "format": "time_series",
            "rawSql": "SELECT \n  time,\n  AVG(oee_score) * 100 as \"OEE %\"\nFROM production_data\nWHERE \n  $__timeFilter(time)\n  AND machine_id IN ($machine_id)\nGROUP BY time\nORDER BY time",
            "refId": "A"
          }
        ],
        "title": "OEE Trend",
        "type": "timeseries"
      }
    ]
  }
}
EOF

echo -e "${GREEN}✓ Sample dashboard created${NC}"

# Step 8: Create build helper script
echo -e "${YELLOW}Step 8: Creating build helper script...${NC}"
cat > scripts/build-manufacturing-analytics.sh << 'EOF'
#!/bin/bash
# Build helper for Manufacturing Analytics

set -e

echo "Building Manufacturing Analytics..."

# Change to Grafana fork directory
cd ../manufacturing-analytics

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    yarn install --frozen-lockfile
fi

# Build
echo "Building application..."
make build

echo "Build complete!"
EOF

chmod +x scripts/build-manufacturing-analytics.sh
echo -e "${GREEN}✓ Build helper script created${NC}"

# Step 9: Final instructions
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Manufacturing Analytics Fork Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update the .env file with your configuration"
echo "2. Copy the implementation files from GRAFANA_FORK_IMPLEMENTATION.md to ../manufacturing-analytics/"
echo "3. Run: docker-compose build"
echo "4. Run: docker-compose up -d"
echo -e "\n${YELLOW}Key files to implement:${NC}"
echo "   - ../manufacturing-analytics/pkg/setting/setting_manufacturing.go"
echo "   - ../manufacturing-analytics/public/app/core/components/Branding/ManufacturingBranding.tsx"
echo "   - ../manufacturing-analytics/pkg/services/manufacturing/oauth_provider.go"
echo "   - nginx/nginx.conf"
echo "   - src/app/api/auth/oauth/[...params]/route.ts"

echo -e "\n${GREEN}Access URLs after deployment:${NC}"
echo "   - Manufacturing App: http://localhost:3000"
echo "   - Manufacturing Analytics: http://localhost:3001"
echo "   - Unified Access (via nginx): http://localhost"