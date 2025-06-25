#!/bin/bash

# Complete Superset Setup Script
# This script sets up a production-ready Superset instance with manufacturing dashboards

set -e

echo "🚀 Starting Complete Superset Setup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPERSET_CONTAINER="manufacturing-superset"
POSTGRES_CONTAINER="manufacturing-timescaledb"
SUPERSET_URL="http://localhost:8088"
MAX_RETRIES=30
RETRY_INTERVAL=10

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=$3
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval $check_command &>/dev/null; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep $RETRY_INTERVAL
        ((attempt++))
    done
    
    print_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Check if Docker is running
if ! docker info &>/dev/null; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start services
print_status "Starting Docker services..."
docker-compose -f docker-compose.superset.yml up -d

# Wait for PostgreSQL
wait_for_service "PostgreSQL" "docker exec $POSTGRES_CONTAINER pg_isready -U postgres -d manufacturing" $MAX_RETRIES

# Wait for Superset
wait_for_service "Superset" "curl -f $SUPERSET_URL/health" $MAX_RETRIES

# Create database views
print_status "Creating database views for dashboards..."
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d manufacturing << 'EOF'
-- Drop existing views if they exist
DROP VIEW IF EXISTS v_realtime_production CASCADE;
DROP VIEW IF EXISTS v_equipment_status CASCADE;
DROP VIEW IF EXISTS v_downtime_analysis CASCADE;
DROP VIEW IF EXISTS v_quality_metrics CASCADE;
DROP VIEW IF EXISTS v_scrap_analysis CASCADE;
DROP VIEW IF EXISTS v_oee_hourly_trend CASCADE;
DROP VIEW IF EXISTS v_shift_performance CASCADE;
DROP VIEW IF EXISTS v_kpi_summary CASCADE;

-- Real-time production view
CREATE VIEW v_realtime_production AS
SELECT 
    timestamp,
    equipment_id,
    SUM(total_parts_produced) as production_count,
    SUM(planned_production) as target_count,
    AVG(throughput_rate) as throughput_rate,
    COUNT(*) as data_points
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY timestamp, equipment_id
ORDER BY timestamp DESC;

-- Equipment status view
CREATE VIEW v_equipment_status AS
SELECT DISTINCT ON (pm.equipment_id)
    pm.equipment_id,
    COALESCE(pm.machine_name, 'Equipment ' || pm.equipment_id) as equipment_name,
    CASE 
        WHEN pm.downtime_minutes > 0 THEN 'Down'
        WHEN pm.oee_score < 50 THEN 'Warning'
        ELSE 'Running'
    END as status,
    ROUND(pm.availability::numeric, 2) as availability,
    pm.timestamp as last_update,
    CASE 
        WHEN pm.timestamp < NOW() - INTERVAL '1 hour' THEN 'Maintenance Required'
        ELSE 'Operational'
    END as last_maintenance
FROM performance_metrics pm
ORDER BY pm.equipment_id, pm.timestamp DESC;

-- Downtime analysis view
CREATE VIEW v_downtime_analysis AS
SELECT 
    downtime_reason,
    SUM(downtime_minutes) / 60.0 as total_downtime_hours,
    COUNT(*) as occurrence_count,
    AVG(downtime_minutes) as avg_downtime_minutes
FROM performance_metrics
WHERE downtime_minutes > 0
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY downtime_reason
ORDER BY total_downtime_hours DESC;

-- Quality metrics view
CREATE VIEW v_quality_metrics AS
SELECT 
    timestamp,
    AVG(first_pass_yield) as first_pass_yield,
    AVG(scrap_rate) as defect_rate,
    SUM(total_parts_produced) as total_produced,
    SUM(rejected_parts) as total_rejected
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY timestamp
ORDER BY timestamp;

-- Scrap analysis view
CREATE VIEW v_scrap_analysis AS
SELECT 
    COALESCE(downtime_reason, 'Unknown') as scrap_reason,
    SUM(rejected_parts * 10) as scrap_cost, -- $10 per rejected part
    SUM(rejected_parts) as scrap_quantity
FROM performance_metrics
WHERE rejected_parts > 0
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY downtime_reason
ORDER BY scrap_cost DESC;

-- OEE hourly trend view
CREATE VIEW v_oee_hourly_trend AS
SELECT 
    equipment_id,
    COALESCE(machine_name, 'Equipment ' || equipment_id) as equipment_name,
    EXTRACT(hour FROM timestamp) as hour_of_day,
    AVG(oee_score) as oee_score,
    COUNT(*) as measurements
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY equipment_id, machine_name, EXTRACT(hour FROM timestamp)
ORDER BY equipment_id, hour_of_day;

-- Shift performance view
CREATE VIEW v_shift_performance AS
SELECT 
    shift as shift_name,
    AVG(oee_score) as shift_oee,
    SUM(total_parts_produced) as total_production,
    AVG(availability) as avg_availability,
    SUM(downtime_minutes) / 60.0 as total_downtime_hours
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND shift IS NOT NULL
GROUP BY shift
ORDER BY shift_oee DESC;

-- KPI summary view
CREATE VIEW v_kpi_summary AS
SELECT 
    AVG(oee_score) as oee,
    AVG(availability) as availability,
    AVG(performance) as performance,
    AVG(quality) as quality,
    SUM(total_parts_produced) as total_production,
    AVG(scrap_rate) as scrap_rate,
    COUNT(DISTINCT equipment_id) as active_equipment
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours';

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO PUBLIC;
EOF

if [ $? -eq 0 ]; then
    print_success "Database views created successfully"
else
    print_error "Failed to create database views"
    exit 1
fi

# Copy dashboard creation script to container
print_status "Copying dashboard creation script..."
docker cp scripts/superset/automated-dashboard-creator.py $SUPERSET_CONTAINER:/tmp/

# Install required Python packages in container
print_status "Installing required packages in Superset container..."
docker exec $SUPERSET_CONTAINER pip install requests

# Run dashboard creation script
print_status "Creating manufacturing dashboards..."
docker exec $SUPERSET_CONTAINER python /tmp/automated-dashboard-creator.py

# Get dashboard IDs from container
if docker exec $SUPERSET_CONTAINER test -f /tmp/dashboard_ids.json; then
    print_status "Retrieving dashboard IDs..."
    docker cp $SUPERSET_CONTAINER:/tmp/dashboard_ids.json ./dashboard_ids.json
    
    if [ -f dashboard_ids.json ]; then
        print_success "Dashboard IDs retrieved successfully"
        echo ""
        echo "📋 Dashboard IDs:"
        cat dashboard_ids.json | jq -r 'to_entries[] | "  \(.key): \(.value // "Failed to create")"'
        
        # Update analytics page with correct dashboard IDs
        print_status "Updating analytics page with dashboard IDs..."
        
        # Extract dashboard IDs using jq
        OVERVIEW_ID=$(cat dashboard_ids.json | jq -r '.overview // "1"')
        PRODUCTION_ID=$(cat dashboard_ids.json | jq -r '.production // "2"')
        QUALITY_ID=$(cat dashboard_ids.json | jq -r '.quality // "3"')
        EQUIPMENT_ID=$(cat dashboard_ids.json | jq -r '.equipment // "4"')
        
        # Update the analytics page
        cat > src/app/analytics/page.tsx << EOF
'use client';

import React from 'react';
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  // Auto-generated dashboard IDs from Superset setup
  const dashboards = {
    overview: '$OVERVIEW_ID',
    production: '$PRODUCTION_ID', 
    quality: '$QUALITY_ID',
    equipment: '$EQUIPMENT_ID'
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manufacturing Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Real-time insights and KPIs from your manufacturing operations
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Overview</CardTitle>
                <CardDescription>
                  High-level metrics across all production lines
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.overview}
                  height={800}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Metrics</CardTitle>
                <CardDescription>
                  Real-time production volume, efficiency, and throughput
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.production}
                  height={800}
                  filters={{
                    time_range: 'Last 24 hours'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Analytics</CardTitle>
                <CardDescription>
                  Defect rates, quality trends, and inspection results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.quality}
                  height={800}
                  filters={{
                    time_range: 'Last 7 days'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Performance</CardTitle>
                <CardDescription>
                  OEE, availability, and maintenance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleSupersetDashboard
                  dashboardId={dashboards.equipment}
                  height={800}
                  filters={{
                    time_range: 'Last 24 hours'
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
EOF
        
        print_success "Analytics page updated with correct dashboard IDs"
        
        # Clean up
        rm -f dashboard_ids.json
    fi
fi

# Restart the application to pick up changes
print_status "Restarting manufacturing application..."
docker-compose restart manufacturing-app

# Final status check
print_status "Performing final health checks..."

# Check Superset
if curl -f $SUPERSET_URL/health &>/dev/null; then
    print_success "Superset is healthy"
else
    print_warning "Superset health check failed"
fi

# Check if dashboards are accessible
DASHBOARD_COUNT=$(curl -s "$SUPERSET_URL/api/v1/dashboard/" -H "Authorization: Bearer $(curl -s -X POST "$SUPERSET_URL/api/v1/security/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | jq -r '.access_token')" | jq '.count // 0' 2>/dev/null || echo "0")

if [ "$DASHBOARD_COUNT" -gt 0 ]; then
    print_success "Found $DASHBOARD_COUNT dashboards in Superset"
else
    print_warning "No dashboards found or API not accessible"
fi

echo ""
echo "🎉 Superset Setup Complete!"
echo ""
echo "📊 Access Points:"
echo "  • Superset UI:    $SUPERSET_URL (admin/admin)"
echo "  • Analytics Page: http://localhost:3000/analytics"
echo "  • API Health:     $SUPERSET_URL/health"
echo ""
echo "📁 Resources:"
echo "  • View created views: docker exec $POSTGRES_CONTAINER psql -U postgres -d manufacturing -c '\dv'"
echo "  • Check logs:        docker-compose -f docker-compose.superset.yml logs superset"
echo "  • Restart services:  docker-compose -f docker-compose.superset.yml restart"
echo ""

if [ "$DASHBOARD_COUNT" -gt 0 ]; then
    print_success "Setup completed successfully! 🚀"
    echo ""
    echo "Next steps:"
    echo "1. Visit http://localhost:3000/analytics to see your dashboards"
    echo "2. Customize charts and dashboards in Superset UI"
    echo "3. Add more data using: npm run prisma:seed"
else
    print_warning "Setup completed with warnings. Check logs if dashboards are not visible."
fi