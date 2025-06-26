#!/bin/bash

# Setup monitoring for RunPod deployment

echo "📊 Setting up monitoring and health checks"
echo "========================================"

# Create monitoring directory
mkdir -p /workspace/monitoring

# Create health check script
cat > /workspace/monitoring/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for Manufacturing Analytics Platform

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🏥 Health Check Report"
echo "====================="
echo ""

# Function to check service
check_service() {
    local name=$1
    local check_cmd=$2
    
    if eval $check_cmd > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name: Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name: Unhealthy${NC}"
        return 1
    fi
}

# Check services
ERRORS=0

# PostgreSQL
check_service "PostgreSQL" "pg_isready -h localhost -p 5432" || ((ERRORS++))

# Next.js Application
check_service "Next.js App" "curl -f http://localhost:3000/api/health" || ((ERRORS++))

# Ollama (if enabled)
if [ "${ENABLE_AI_CHAT}" = "true" ]; then
    check_service "Ollama AI" "curl -f http://localhost:11434/api/tags" || ((ERRORS++))
fi

# Redis (if enabled)
if [ "${ENABLE_REDIS_CACHE}" = "true" ]; then
    check_service "Redis Cache" "redis-cli ping" || ((ERRORS++))
fi

# VS Code Server (if enabled)
if [ "${ENABLE_CODE_SERVER}" = "true" ]; then
    check_service "VS Code Server" "curl -f http://localhost:8080" || ((ERRORS++))
fi

# System resources
echo ""
echo "📊 System Resources:"
echo "==================="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "Memory: $(free -h | grep Mem | awk '{print $3 " / " $2}')"
echo "Disk: $(df -h /workspace | tail -1 | awk '{print $3 " / " $2 " (" $5 ")"}')"

# Overall status
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $ERRORS service(s) unhealthy${NC}"
    exit 1
fi
EOF

chmod +x /workspace/monitoring/health-check.sh

# Create monitoring dashboard script
cat > /workspace/monitoring/monitor.sh << 'EOF'
#!/bin/bash

# Real-time monitoring dashboard

while true; do
    clear
    echo "📊 Manufacturing Analytics Platform - Live Monitor"
    echo "================================================="
    echo "Time: $(date)"
    echo ""
    
    # Run health check
    /workspace/monitoring/health-check.sh
    
    echo ""
    echo "📈 Real-time Metrics:"
    echo "===================="
    
    # Application metrics
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        RESPONSE=$(curl -s http://localhost:3000/api/health)
        echo "App Status: $(echo $RESPONSE | jq -r .status)"
        echo "App Version: $(echo $RESPONSE | jq -r .version)"
    fi
    
    # Database connections
    CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='manufacturing';")
    echo "DB Connections: $CONNECTIONS"
    
    # Process monitoring
    echo ""
    echo "🔧 Top Processes:"
    echo "================"
    ps aux --sort=-%cpu | head -6
    
    echo ""
    echo "Press Ctrl+C to exit. Refreshing in 5 seconds..."
    sleep 5
done
EOF

chmod +x /workspace/monitoring/monitor.sh

# Create log aggregator
cat > /workspace/monitoring/view-logs.sh << 'EOF'
#!/bin/bash

# Log viewer for all services

echo "📜 Log Viewer"
echo "============="
echo ""
echo "Select log to view:"
echo "1) Application logs"
echo "2) PostgreSQL logs"
echo "3) System logs"
echo "4) All logs (combined)"
echo "5) Exit"
echo ""
read -p "Choice: " choice

case $choice in
    1)
        echo "Application logs:"
        cd /workspace/manufacturing-analytics-platform
        npm run dev 2>&1 | tail -100
        ;;
    2)
        echo "PostgreSQL logs:"
        sudo tail -100 /var/log/postgresql/postgresql-*.log
        ;;
    3)
        echo "System logs:"
        sudo journalctl -n 100
        ;;
    4)
        echo "All logs:"
        sudo journalctl -f
        ;;
    5)
        exit 0
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
EOF

chmod +x /workspace/monitoring/view-logs.sh

# Create automated alert script
cat > /workspace/monitoring/alerts.sh << 'EOF'
#!/bin/bash

# Automated alerting system

ALERT_LOG="/workspace/monitoring/alerts.log"
THRESHOLD_CPU=80
THRESHOLD_MEM=80
THRESHOLD_DISK=90

log_alert() {
    echo "[$(date)] $1" >> $ALERT_LOG
}

# Check CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')
if [ $CPU_USAGE -gt $THRESHOLD_CPU ]; then
    log_alert "WARNING: High CPU usage: ${CPU_USAGE}%"
fi

# Check Memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt $THRESHOLD_MEM ]; then
    log_alert "WARNING: High memory usage: ${MEM_USAGE}%"
fi

# Check Disk
DISK_USAGE=$(df /workspace | tail -1 | awk '{print int($5)}')
if [ $DISK_USAGE -gt $THRESHOLD_DISK ]; then
    log_alert "WARNING: High disk usage: ${DISK_USAGE}%"
fi

# Check services
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log_alert "ERROR: Application health check failed"
fi

if ! pg_isready > /dev/null 2>&1; then
    log_alert "ERROR: PostgreSQL is not responding"
fi
EOF

chmod +x /workspace/monitoring/alerts.sh

# Create cron job for alerts
echo "*/5 * * * * /workspace/monitoring/alerts.sh" | crontab -

# Create monitoring menu
cat > /workspace/monitoring/menu.sh << 'EOF'
#!/bin/bash

# Monitoring Menu

while true; do
    clear
    echo "🎛️  Monitoring & Management Menu"
    echo "================================"
    echo ""
    echo "1) Run health check"
    echo "2) View live monitor"
    echo "3) View logs"
    echo "4) Check alerts"
    echo "5) Restart services"
    echo "6) Database backup"
    echo "7) Exit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1)
            /workspace/monitoring/health-check.sh
            read -p "Press Enter to continue..."
            ;;
        2)
            /workspace/monitoring/monitor.sh
            ;;
        3)
            /workspace/monitoring/view-logs.sh
            read -p "Press Enter to continue..."
            ;;
        4)
            if [ -f /workspace/monitoring/alerts.log ]; then
                tail -50 /workspace/monitoring/alerts.log
            else
                echo "No alerts logged yet"
            fi
            read -p "Press Enter to continue..."
            ;;
        5)
            echo "Restarting services..."
            service postgresql restart
            cd /workspace/manufacturing-analytics-platform && pm2 restart all
            read -p "Press Enter to continue..."
            ;;
        6)
            echo "Creating database backup..."
            pg_dump manufacturing > /workspace/backup-$(date +%Y%m%d-%H%M%S).sql
            echo "Backup created!"
            read -p "Press Enter to continue..."
            ;;
        7)
            exit 0
            ;;
        *)
            echo "Invalid option"
            sleep 2
            ;;
    esac
done
EOF

chmod +x /workspace/monitoring/menu.sh

echo "✅ Monitoring setup complete!"
echo ""
echo "Available commands:"
echo "  /workspace/monitoring/menu.sh        - Main monitoring menu"
echo "  /workspace/monitoring/health-check.sh - Run health check"
echo "  /workspace/monitoring/monitor.sh     - Live monitoring"
echo "  /workspace/monitoring/view-logs.sh   - View logs"
echo ""
echo "Alerts are automatically checked every 5 minutes"
echo "Alert log: /workspace/monitoring/alerts.log"