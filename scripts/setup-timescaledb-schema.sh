#!/bin/bash

# TimescaleDB Schema Setup Script
# Applies ISO 22400-compliant manufacturing analytics schema

set -e

echo "🏭 Setting up ISO 22400-Compliant TimescaleDB Schema"
echo "=================================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-manufacturing}
DB_USER=${DB_USER:-analytics}
DB_PASSWORD=${DB_PASSWORD:-development_password}

# Check if database is accessible
check_database() {
    log_info "Checking database connectivity..."
    
    if docker exec manufacturing-postgres pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_error "Cannot connect to database. Is the container running?"
        log_info "Start with: docker-compose -f setup/ollama-docker-setup.yml up -d postgres"
        exit 1
    fi
}

# Apply TimescaleDB schema
apply_schema() {
    log_info "Applying ISO 22400-compliant schema..."
    
    # Apply the schema
    if docker exec -i manufacturing-postgres psql -U $DB_USER -d $DB_NAME < schema/iso-22400-timescaledb.sql; then
        log_success "Schema applied successfully"
    else
        log_error "Failed to apply schema"
        exit 1
    fi
}

# Generate and apply Prisma schema
setup_prisma() {
    log_info "Setting up Prisma ORM..."
    
    # Copy the Prisma schema
    if [ -f "prisma/schema-iso-22400.prisma" ]; then
        cp prisma/schema-iso-22400.prisma prisma/schema.prisma
        log_success "Prisma schema updated"
    else
        log_warning "Prisma schema file not found, using existing schema"
    fi
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    if npm run prisma:generate; then
        log_success "Prisma client generated"
    else
        log_warning "Prisma client generation failed - continuing anyway"
    fi
    
    # Push schema to database (this will sync any differences)
    log_info "Synchronizing Prisma schema with database..."
    if npm run prisma:push; then
        log_success "Prisma schema synchronized"
    else
        log_warning "Prisma schema sync failed - manual verification may be needed"
    fi
}

# Verify schema installation
verify_schema() {
    log_info "Verifying schema installation..."
    
    # Check for key tables
    local tables=(
        "manufacturing_sites"
        "equipment" 
        "fact_oee_metrics"
        "fact_production_quantities"
        "fact_equipment_states"
        "fact_quality_metrics"
    )
    
    local verified=0
    for table in "${tables[@]}"; do
        if docker exec manufacturing-postgres psql -U $DB_USER -d $DB_NAME -c "\\d $table" > /dev/null 2>&1; then
            log_success "Table '$table' exists"
            ((verified++))
        else
            log_error "Table '$table' missing"
        fi
    done
    
    # Check TimescaleDB hypertables
    log_info "Checking TimescaleDB hypertables..."
    local hypertables=$(docker exec manufacturing-postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM timescaledb_information.hypertables;")
    
    if [ "$hypertables" -gt 0 ]; then
        log_success "Found $hypertables hypertables configured"
    else
        log_warning "No hypertables found - may affect performance"
    fi
    
    # Check continuous aggregates
    log_info "Checking continuous aggregates..."
    local caggs=$(docker exec manufacturing-postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM timescaledb_information.continuous_aggregates;")
    
    if [ "$caggs" -gt 0 ]; then
        log_success "Found $caggs continuous aggregates configured"
    else
        log_warning "No continuous aggregates found"
    fi
    
    echo
    echo "Schema Verification Summary:"
    echo "- Core tables: $verified/${#tables[@]}"
    echo "- Hypertables: $hypertables"
    echo "- Continuous aggregates: $caggs"
    
    if [ "$verified" -eq "${#tables[@]}" ]; then
        log_success "Schema verification completed successfully"
        return 0
    else
        log_error "Schema verification failed"
        return 1
    fi
}

# Seed with sample data
seed_sample_data() {
    log_info "Seeding with sample manufacturing data..."
    
    cat > /tmp/sample_data.sql << 'EOF'
-- Insert sample site and hierarchy
INSERT INTO manufacturing_areas (site_id, area_code, area_name, description)
SELECT ms.id, 'PROD_LINE_1', 'Production Line 1', 'Main assembly line'
FROM manufacturing_sites ms WHERE ms.site_code = 'MAIN'
ON CONFLICT (site_id, area_code) DO NOTHING;

INSERT INTO work_centers (area_id, work_center_code, work_center_name, theoretical_capacity)
SELECT ma.id, 'WC_001', 'Assembly Station 1', 100.00
FROM manufacturing_areas ma 
JOIN manufacturing_sites ms ON ma.site_id = ms.id
WHERE ms.site_code = 'MAIN' AND ma.area_code = 'PROD_LINE_1'
ON CONFLICT (area_id, work_center_code) DO NOTHING;

-- Insert sample equipment
INSERT INTO equipment (work_center_id, equipment_code, equipment_name, equipment_type, theoretical_cycle_time, ideal_run_rate, criticality_level)
SELECT wc.id, 'EQ_001', 'CNC Machine #1', 'CNC_MILL', 45.0, 80.0, 'Critical'
FROM work_centers wc 
JOIN manufacturing_areas ma ON wc.area_id = ma.id
JOIN manufacturing_sites ms ON ma.site_id = ms.id
WHERE ms.site_code = 'MAIN' AND ma.area_code = 'PROD_LINE_1' AND wc.work_center_code = 'WC_001'
ON CONFLICT (equipment_code) DO NOTHING;

INSERT INTO equipment (work_center_id, equipment_code, equipment_name, equipment_type, theoretical_cycle_time, ideal_run_rate, criticality_level)
SELECT wc.id, 'EQ_002', 'Robotic Welder #1', 'ROBOT_WELDER', 30.0, 120.0, 'Important'
FROM work_centers wc 
JOIN manufacturing_areas ma ON wc.area_id = ma.id
JOIN manufacturing_sites ms ON ma.site_id = ms.id
WHERE ms.site_code = 'MAIN' AND ma.area_code = 'PROD_LINE_1' AND wc.work_center_code = 'WC_001'
ON CONFLICT (equipment_code) DO NOTHING;

-- Insert sample products
INSERT INTO products (product_code, product_name, product_family, target_cycle_time)
VALUES 
    ('PROD_001', 'Widget Type A', 'Widgets', 40.0),
    ('PROD_002', 'Widget Type B', 'Widgets', 35.0)
ON CONFLICT (product_code) DO NOTHING;

-- Insert sample production orders
INSERT INTO production_orders (order_number, product_id, equipment_id, planned_quantity, planned_start_time, planned_end_time, order_status)
SELECT 
    'PO_001_' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p.id,
    e.id,
    1000.0,
    DATE_TRUNC('hour', NOW()) - INTERVAL '2 hours',
    DATE_TRUNC('hour', NOW()) + INTERVAL '6 hours',
    'In_Progress'
FROM products p, equipment e
WHERE p.product_code = 'PROD_001' AND e.equipment_code = 'EQ_001'
ON CONFLICT (order_number) DO NOTHING;

-- Insert sample OEE metrics for the last 24 hours
INSERT INTO fact_oee_metrics (
    timestamp, equipment_id, planned_production_time, actual_production_time, 
    downtime_minutes, planned_quantity, produced_quantity, good_quantity,
    availability, performance, quality, oee
)
SELECT 
    generate_series(NOW() - INTERVAL '24 hours', NOW(), INTERVAL '1 hour') as ts,
    e.id,
    60.0, -- 60 minutes planned per hour
    GREATEST(0, 60.0 - (random() * 15)), -- Random downtime 0-15 minutes
    (random() * 15), -- Random downtime
    80.0, -- Planned 80 units per hour
    GREATEST(0, 80.0 - (random() * 20)), -- Random production variation
    GREATEST(0, 80.0 - (random() * 25)), -- Random quality issues
    GREATEST(0.5, LEAST(1.0, (60.0 - (random() * 15)) / 60.0)), -- Availability 0.75-1.0
    GREATEST(0.7, LEAST(1.0, (80.0 - (random() * 20)) / 80.0)), -- Performance 0.75-1.0  
    GREATEST(0.8, LEAST(1.0, (80.0 - (random() * 10)) / 80.0)), -- Quality 0.875-1.0
    0.0 -- Will be calculated
FROM equipment e
WHERE e.equipment_code IN ('EQ_001', 'EQ_002');

-- Update OEE calculation
UPDATE fact_oee_metrics 
SET oee = availability * performance * quality
WHERE oee = 0.0;
EOF

    if docker exec -i manufacturing-postgres psql -U $DB_USER -d $DB_NAME < /tmp/sample_data.sql; then
        log_success "Sample data seeded successfully"
        rm /tmp/sample_data.sql
    else
        log_warning "Sample data seeding failed"
        rm -f /tmp/sample_data.sql
    fi
}

# Test queries
test_queries() {
    log_info "Testing key queries..."
    
    echo "Current Equipment Status:"
    docker exec manufacturing-postgres psql -U $DB_USER -d $DB_NAME -c "
        SELECT equipment_code, equipment_name, is_active 
        FROM equipment 
        ORDER BY equipment_code;"
    
    echo
    echo "OEE Summary (Last 24 Hours):"
    docker exec manufacturing-postgres psql -U $DB_USER -d $DB_NAME -c "
        SELECT 
            e.equipment_code,
            ROUND(AVG(oee.availability)::numeric, 3) as avg_availability,
            ROUND(AVG(oee.performance)::numeric, 3) as avg_performance,  
            ROUND(AVG(oee.quality)::numeric, 3) as avg_quality,
            ROUND(AVG(oee.oee)::numeric, 3) as avg_oee,
            COUNT(*) as data_points
        FROM equipment e
        JOIN fact_oee_metrics oee ON e.id = oee.equipment_id
        WHERE oee.timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY e.id, e.equipment_code
        ORDER BY avg_oee DESC;"
        
    log_success "Query tests completed"
}

# Create backup and recovery info
create_backup_info() {
    log_info "Creating backup and recovery information..."
    
    cat > schema-backup-info.md << 'EOF'
# Schema Backup and Recovery

## Database Backup
```bash
# Create full backup
docker exec manufacturing-postgres pg_dump -U analytics -d manufacturing --clean --if-exists > manufacturing_backup.sql

# Create schema-only backup  
docker exec manufacturing-postgres pg_dump -U analytics -d manufacturing --schema-only > manufacturing_schema.sql
```

## Recovery
```bash
# Restore full backup
docker exec -i manufacturing-postgres psql -U analytics -d manufacturing < manufacturing_backup.sql

# Restore schema only
docker exec -i manufacturing-postgres psql -U analytics -d manufacturing < manufacturing_schema.sql
```

## Key Schema Features
- ✅ ISO 22400-compliant OEE calculations
- ✅ TimescaleDB hypertables for time-series optimization  
- ✅ Continuous aggregates for fast reporting
- ✅ Row-level security for multi-tenant access
- ✅ Automated data retention policies
- ✅ Manufacturing hierarchy (Site → Area → Work Center → Equipment)
- ✅ Complete audit trail with timestamps
EOF

    log_success "Backup information created in schema-backup-info.md"
}

# Main execution
main() {
    echo
    check_database
    echo
    apply_schema
    echo
    setup_prisma
    echo
    verify_schema
    echo
    
    read -p "Do you want to seed with sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        seed_sample_data
        echo
        test_queries
    fi
    
    echo
    create_backup_info
    
    echo
    log_success "TimescaleDB schema setup completed!"
    echo
    echo "Next steps:"
    echo "1. Verify Prisma client is working: npm run prisma:studio"
    echo "2. Run data pipeline tests: npm run test:integration"
    echo "3. Start the application: npm run dev"
    echo "4. Monitor hypertable performance: \\d+ fact_oee_metrics"
    echo
    echo "Database connection:"
    echo "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo
}

main "$@"