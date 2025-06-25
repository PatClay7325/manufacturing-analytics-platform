#!/bin/bash
# Create comprehensive production monitoring dashboard

API_KEY=$(curl -s -X POST http://admin:admin@localhost:3001/api/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"production-dashboard","role":"Admin","secondsToLive":300}' | grep -o '"key":"[^"]*' | cut -d'"' -f4)

curl -s -X POST http://localhost:3001/api/dashboards/db \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "Production Line Real-Time Monitoring",
      "tags": ["manufacturing", "production", "real-time"],
      "timezone": "browser",
      "refresh": "10s",
      "panels": [
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "custom": {
                "align": "auto",
                "cellOptions": {"type": "auto"},
                "inspect": false
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null}
                ]
              }
            },
            "overrides": [
              {
                "matcher": {"id": "byName", "options": "Status"},
                "properties": [{
                  "id": "custom.cellOptions",
                  "value": {
                    "type": "color-background",
                    "mode": "gradient"
                  }
                }]
              },
              {
                "matcher": {"id": "byName", "options": "OEE %"},
                "properties": [
                  {"id": "unit", "value": "percent"},
                  {
                    "id": "custom.cellOptions",
                    "value": {
                      "type": "color-background",
                      "mode": "gradient"
                    }
                  },
                  {
                    "id": "thresholds",
                    "value": {
                      "mode": "absolute",
                      "steps": [
                        {"color": "red", "value": null},
                        {"color": "yellow", "value": 65},
                        {"color": "green", "value": 85}
                      ]
                    }
                  }
                ]
              }
            ]
          },
          "gridPos": {"h": 10, "w": 24, "x": 0, "y": 0},
          "id": 1,
          "options": {
            "cellHeight": "sm",
            "footer": {
              "countRows": false,
              "fields": "",
              "reducer": ["sum"],
              "show": false
            },
            "showHeader": true,
            "sortBy": [{
              "desc": true,
              "displayName": "OEE %"
            }]
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "WITH latest_metrics AS (\n  SELECT DISTINCT ON (\"machineName\")\n    \"machineName\",\n    timestamp,\n    \"oeeScore\" * 100 as oee,\n    COALESCE(\"totalPartsProduced\", \"totalParts\", 0) as parts_produced,\n    \"goodParts\" as good_parts,\n    COALESCE(\"rejectedParts\", \"rejectParts\", 0) as rejected_parts,\n    \"shift\",\n    \"operatorName\",\n    CASE \n      WHEN timestamp > NOW() - INTERVAL '\''5 minutes'\'' THEN '\''Running'\''\n      WHEN timestamp > NOW() - INTERVAL '\''15 minutes'\'' THEN '\''Idle'\''\n      ELSE '\''Stopped'\''\n    END as status\n  FROM \"PerformanceMetric\"\n  WHERE timestamp > NOW() - INTERVAL '\''1 day'\''\n  ORDER BY \"machineName\", timestamp DESC\n)\nSELECT \n  \"machineName\" as \"Machine\",\n  status as \"Status\",\n  ROUND(oee::numeric, 1) as \"OEE %\",\n  parts_produced as \"Parts Produced\",\n  good_parts as \"Good Parts\",\n  rejected_parts as \"Rejects\",\n  \"shift\" as \"Shift\",\n  \"operatorName\" as \"Operator\",\n  to_char(timestamp, '\''HH24:MI:SS'\'') as \"Last Update\"\nFROM latest_metrics\nORDER BY oee DESC",
            "refId": "A"
          }],
          "title": "Production Lines Status",
          "type": "table"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "palette-classic"},
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "Parts/Hour",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 20,
                "gradientMode": "none",
                "hideFrom": {"tooltip": false, "viz": false, "legend": false},
                "insertNulls": false,
                "lineInterpolation": "smooth",
                "lineWidth": 2,
                "pointSize": 5,
                "scaleDistribution": {"type": "linear"},
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {"group": "A", "mode": "none"},
                "thresholdsStyle": {"mode": "off"}
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [{"color": "green", "value": null}]
              }
            }
          },
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 10},
          "id": 2,
          "options": {
            "legend": {
              "calcs": ["mean", "lastNotNull"],
              "displayMode": "table",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {"mode": "multi", "sort": "desc"}
          },
          "targets": [{
            "format": "time_series",
            "rawQuery": true,
            "rawSql": "SELECT \n  timestamp AS time,\n  \"machineName\" as metric,\n  SUM(COALESCE(\"totalPartsProduced\", \"totalParts\", 0)) OVER (PARTITION BY \"machineName\" ORDER BY timestamp ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) * 15 as value\nFROM \"PerformanceMetric\"\nWHERE $__timeFilter(timestamp)\nORDER BY timestamp",
            "refId": "A"
          }],
          "title": "Production Rate by Machine",
          "type": "timeseries"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "continuous-RdYlGr"},
              "custom": {
                "hideFrom": {"tooltip": false, "viz": false, "legend": false}
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [{"color": "green", "value": null}]
              }
            }
          },
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 10},
          "id": 3,
          "options": {
            "displayLabels": ["name", "percent"],
            "legend": {
              "displayMode": "list",
              "placement": "right",
              "showLegend": true,
              "values": ["value"]
            },
            "pieType": "donut",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "tooltip": {"mode": "single", "sort": "none"}
          },
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT \n  \"productType\" as metric,\n  SUM(COALESCE(\"totalPartsProduced\", \"totalParts\", 0)) as value\nFROM \"PerformanceMetric\"\nWHERE timestamp > NOW() - INTERVAL '\''24 hours'\''\n  AND \"productType\" IS NOT NULL\nGROUP BY \"productType\"\nORDER BY value DESC",
            "refId": "A"
          }],
          "title": "Production by Product Type (24h)",
          "type": "piechart"
        },
        {
          "datasource": {"type": "prometheus", "uid": "$prometheus"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [
                {"options": {"0": {"index": 0, "text": "Down"}}, "type": "value"},
                {"options": {"1": {"index": 1, "text": "Up"}}, "type": "value"}
              ],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "red", "value": null},
                  {"color": "green", "value": 1}
                ]
              }
            }
          },
          "gridPos": {"h": 4, "w": 4, "x": 0, "y": 18},
          "id": 4,
          "options": {
            "colorMode": "background",
            "graphMode": "none",
            "justifyMode": "center",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "expr": "up{job=\"prometheus\"}",
            "refId": "A"
          }],
          "title": "Prometheus",
          "type": "stat"
        },
        {
          "datasource": {"type": "prometheus", "uid": "$prometheus"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [
                {"options": {"0": {"index": 0, "text": "Down"}}, "type": "value"},
                {"options": {"1": {"index": 1, "text": "Up"}}, "type": "value"}
              ],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "red", "value": null},
                  {"color": "green", "value": 1}
                ]
              }
            }
          },
          "gridPos": {"h": 4, "w": 4, "x": 4, "y": 18},
          "id": 5,
          "options": {
            "colorMode": "background",
            "graphMode": "none",
            "justifyMode": "center",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "expr": "up{job=\"postgres-exporter\"}",
            "refId": "A"
          }],
          "title": "PostgreSQL",
          "type": "stat"
        },
        {
          "datasource": {"type": "loki", "uid": "$loki"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null},
                  {"color": "yellow", "value": 10},
                  {"color": "red", "value": 50}
                ]
              }
            }
          },
          "gridPos": {"h": 4, "w": 4, "x": 8, "y": 18},
          "id": 6,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "center",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["count"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "expr": "count_over_time({job=\"manufacturing-app\"} |= \"error\" [1h])",
            "queryType": "instant",
            "refId": "A"
          }],
          "title": "Errors (1h)",
          "type": "stat"
        }
      ],
      "schemaVersion": 38,
      "templating": {
        "list": [
          {
            "current": {"selected": false, "text": "Manufacturing PostgreSQL", "value": "Manufacturing PostgreSQL"},
            "hide": 2,
            "includeAll": false,
            "multi": false,
            "name": "postgres",
            "options": [],
            "query": "postgres",
            "queryValue": "",
            "refresh": 1,
            "regex": "",
            "skipUrlSync": false,
            "type": "datasource"
          },
          {
            "current": {"selected": false, "text": "Prometheus", "value": "Prometheus"},
            "hide": 2,
            "includeAll": false,
            "multi": false,
            "name": "prometheus",
            "options": [],
            "query": "prometheus",
            "queryValue": "",
            "refresh": 1,
            "regex": "",
            "skipUrlSync": false,
            "type": "datasource"
          },
          {
            "current": {"selected": false, "text": "Loki", "value": "Loki"},
            "hide": 2,
            "includeAll": false,
            "multi": false,
            "name": "loki",
            "options": [],
            "query": "loki",
            "queryValue": "",
            "refresh": 1,
            "regex": "",
            "skipUrlSync": false,
            "type": "datasource"
          }
        ]
      },
      "time": {"from": "now-3h", "to": "now"},
      "timepicker": {},
      "timezone": "",
      "version": 0
    },
    "folderUid": "manufacturing",
    "overwrite": true
  }'

echo "Production monitoring dashboard created!"