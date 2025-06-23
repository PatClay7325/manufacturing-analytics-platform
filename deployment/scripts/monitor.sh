#!/bin/bash

set -e

# Parse command line arguments
CLOUD_PROVIDER="$1"
ENVIRONMENT="$2"
TENANT_ID="$3"
DEPLOYMENT_TYPE="$4"

if [[ -z "$CLOUD_PROVIDER" || -z "$ENVIRONMENT" || -z "$DEPLOYMENT_TYPE" ]]; then
  echo "Usage: $0 <cloud_provider> <environment> [tenant_id] <deployment_type>"
  exit 1
fi

# Set base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PROVIDER_DIR="$BASE_DIR/providers/$CLOUD_PROVIDER"
MONITORING_DIR="$BASE_DIR/../monitoring/$ENVIRONMENT"

echo "Setting up monitoring for $CLOUD_PROVIDER in $ENVIRONMENT environment"

# Create monitoring directory
mkdir -p "$MONITORING_DIR"

# Setup Prometheus configuration
mkdir -p "$MONITORING_DIR/prometheus"
cat > "$MONITORING_DIR/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
    - targets: ['localhost:9090']

  - job_name: 'api'
    metrics_path: '/metrics'
    static_configs:
    - targets: ['api:4000']
    
  - job_name: 'node-exporter'
    static_configs:
    - targets: ['node-exporter:9100']
EOF

# Setup Prometheus alert rules
cat > "$MONITORING_DIR/prometheus/alert_rules.yml" << EOF
groups:
- name: manufacturing_platform
  rules:
  - alert: HighCPUUsage
    expr: avg(rate(process_cpu_seconds_total[5m]) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
      description: "CPU usage is above 80% for 5 minutes"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / 1024 / 1024 > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage detected"
      description: "Memory usage is above 1GB for 5 minutes"

  - alert: HighAPILatency
    expr: http_request_duration_seconds{quantile="0.9"} > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High API latency detected"
      description: "90th percentile of API latency is above 1 second for 5 minutes"
EOF

# Setup manufacturingPlatform dashboards
mkdir -p "$MONITORING_DIR/manufacturingPlatform/dashboards"
cat > "$MONITORING_DIR/manufacturingPlatform/dashboards/api_dashboard.json" << EOF
{
  "annotations": {
    "list": []
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          },
          "unit": "reqps"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 1,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "datasource": "Prometheus",
          "editorMode": "code",
          "expr": "sum(rate(http_requests_total[5m])) by (method, route)",
          "legendFormat": "{{method}} {{route}}",
          "range": true,
          "refId": "A"
        }
      ],
      "title": "API Request Rate",
      "type": "timeseries"
    },
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          },
          "unit": "s"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 12,
        "y": 0
      },
      "id": 2,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "single",
          "sort": "none"
        }
      },
      "targets": [
        {
          "datasource": "Prometheus",
          "editorMode": "code",
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))",
          "legendFormat": "{{route}}",
          "range": true,
          "refId": "A"
        }
      ],
      "title": "API Response Time (p95)",
      "type": "timeseries"
    }
  ],
  "refresh": "10s",
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["api", "manufacturing"],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Manufacturing API Dashboard",
  "uid": "manufacturing-api",
  "version": 1,
  "weekStart": ""
}
EOF

# Setup alerting configuration
mkdir -p "$MONITORING_DIR/alertmanager"
cat > "$MONITORING_DIR/alertmanager/alertmanager.yml" << EOF
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'email-notifications'
  routes:
  - match:
      severity: critical
    receiver: 'pager-notifications'
    continue: true

receivers:
- name: 'email-notifications'
  email_configs:
  - to: 'alerts@example.com'
    send_resolved: true

- name: 'pager-notifications'
  webhook_configs:
  - url: 'https://example.pagerduty.com/webhook'
    send_resolved: true
EOF

# Setup logging configuration (ELK stack)
mkdir -p "$MONITORING_DIR/logstash"
cat > "$MONITORING_DIR/logstash/logstash.conf" << EOF
input {
  beats {
    port => 5044
  }
  
  # Direct syslog input
  syslog {
    port => 5014
  }
}

filter {
  if [type] == "manufacturing-api" {
    json {
      source => "message"
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "manufacturing-%{+YYYY.MM.dd}"
  }
}
EOF

# Set up provider-specific monitoring resources
if [[ -f "$PROVIDER_DIR/setup-monitoring.sh" ]]; then
  echo "Setting up $CLOUD_PROVIDER-specific monitoring..."
  bash "$PROVIDER_DIR/setup-monitoring.sh" "$ENVIRONMENT" "$TENANT_ID" "$DEPLOYMENT_TYPE"
else
  # Set up monitoring based on deployment type and cloud provider
  case "$CLOUD_PROVIDER" in
    aws)
      if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        echo "Setting up CloudWatch monitoring for AWS EKS..."
        # AWS-specific monitoring setup would go here
        
        # Copy monitoring templates to the right location
        cp -r "$MONITORING_DIR/prometheus" "$BASE_DIR/providers/aws/prometheus"
        cp -r "$MONITORING_DIR/alertmanager" "$BASE_DIR/providers/aws/alertmanager"
      fi
      ;;
      
    azure)
      if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        echo "Setting up Azure Monitor for AKS..."
        # Azure-specific monitoring setup would go here
        
        # Copy monitoring templates to the right location
        cp -r "$MONITORING_DIR/prometheus" "$BASE_DIR/providers/azure/prometheus"
        cp -r "$MONITORING_DIR/alertmanager" "$BASE_DIR/providers/azure/alertmanager"
      fi
      ;;
      
    gcp)
      if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        echo "Setting up Cloud Monitoring for GKE..."
        # GCP-specific monitoring setup would go here
        
        # Copy monitoring templates to the right location
        cp -r "$MONITORING_DIR/prometheus" "$BASE_DIR/providers/gcp/prometheus"
        cp -r "$MONITORING_DIR/alertmanager" "$BASE_DIR/providers/gcp/alertmanager"
      fi
      ;;
      
    on-premise)
      if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        echo "Setting up monitoring for on-premise Docker deployment..."
        # On-premise-specific monitoring setup
        
        # Copy monitoring templates to the docker-compose location
        cp -r "$MONITORING_DIR/prometheus" "$BASE_DIR/providers/on-premise/prometheus"
        cp -r "$MONITORING_DIR/alertmanager" "$BASE_DIR/providers/on-premise/alertmanager"
        cp -r "$MONITORING_DIR/logstash" "$BASE_DIR/providers/on-premise/logstash"
      fi
      ;;
      
    *)
      echo "Unsupported cloud provider: $CLOUD_PROVIDER"
      exit 1
      ;;
  esac
fi

echo "Monitoring setup completed for $CLOUD_PROVIDER in $ENVIRONMENT environment."