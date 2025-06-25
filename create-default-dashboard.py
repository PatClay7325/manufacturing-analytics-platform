#!/usr/bin/env python3
"""
Creates a default manufacturing dashboard in Apache Superset
Run this inside the Superset container:
docker exec -it manufacturing-superset python /app/create-default-dashboard.py
"""

import os
import json
from datetime import datetime
from superset import db
from superset.models.core import Database
from superset.connectors.sqla.models import SqlaTable
from superset.models.slice import Slice
from superset.models.dashboard import Dashboard

def create_manufacturing_dashboard():
    # Get the manufacturing database
    manufacturing_db = db.session.query(Database).filter_by(
        database_name='Manufacturing TimescaleDB'
    ).first()
    
    if not manufacturing_db:
        print("Manufacturing database not found!")
        return None
    
    # Create datasets for all views
    views = [
        'dashboard_production_overview',
        'dashboard_equipment_performance',
        'dashboard_realtime_kpis'
    ]
    
    tables = {}
    for view_name in views:
        table = db.session.query(SqlaTable).filter_by(
            table_name=view_name,
            database_id=manufacturing_db.id
        ).first()
        
        if not table:
            table = SqlaTable(
                table_name=view_name,
                database_id=manufacturing_db.id
            )
            db.session.add(table)
            db.session.commit()
            print(f"Created dataset: {view_name}")
        tables[view_name] = table
    
    # Create charts
    charts = []
    
    # 1. Production Trend Chart
    production_chart_params = {
        "viz_type": "line",
        "datasource": f"{tables['dashboard_production_overview'].id}__table",
        "time_range": "Last 24 hours",
        "metrics": [{
            "expressionType": "SIMPLE",
            "column": {
                "column_name": "total_parts",
                "type": "INT"
            },
            "aggregate": "SUM",
            "label": "Total Production"
        }],
        "groupby": ["plantCode"],
        "granularity_sqla": "hour",
        "timeseries_limit_metric": {
            "expressionType": "SIMPLE",
            "column": {
                "column_name": "total_parts",
                "type": "INT"
            },
            "aggregate": "SUM"
        }
    }
    
    production_chart = create_or_get_slice(
        "Production Trend - 24 Hours",
        'line',
        tables['dashboard_production_overview'].id,
        production_chart_params
    )
    charts.append(production_chart)
    
    # 2. OEE Gauge Chart
    oee_chart_params = {
        "viz_type": "big_number_total",
        "datasource": f"{tables['dashboard_realtime_kpis'].id}__table",
        "time_range": "Last hour",
        "metric": {
            "expressionType": "SIMPLE",
            "column": {
                "column_name": "current_oee",
                "type": "FLOAT"
            },
            "aggregate": "AVG",
            "label": "Current OEE %"
        },
        "subheader": "Overall Equipment Effectiveness"
    }
    
    oee_chart = create_or_get_slice(
        "Current OEE",
        'big_number_total',
        tables['dashboard_realtime_kpis'].id,
        oee_chart_params
    )
    charts.append(oee_chart)
    
    # 3. Equipment Performance Table
    equipment_chart_params = {
        "viz_type": "table",
        "datasource": f"{tables['dashboard_equipment_performance'].id}__table",
        "time_range": "Last hour",
        "groupby": ["equipmentId", "plantCode"],
        "metrics": [
            {
                "expressionType": "SIMPLE",
                "column": {"column_name": "avg_oee", "type": "FLOAT"},
                "aggregate": "AVG",
                "label": "OEE %"
            },
            {
                "expressionType": "SIMPLE",
                "column": {"column_name": "total_production", "type": "INT"},
                "aggregate": "SUM",
                "label": "Production"
            }
        ],
        "table_timestamp_format": "%Y-%m-%d %H:%M",
        "page_length": 10
    }
    
    equipment_chart = create_or_get_slice(
        "Equipment Performance",
        'table',
        tables['dashboard_equipment_performance'].id,
        equipment_chart_params
    )
    charts.append(equipment_chart)
    
    # Create dashboard
    dashboard_title = "Manufacturing Overview"
    existing_dashboard = db.session.query(Dashboard).filter_by(
        dashboard_title=dashboard_title
    ).first()
    
    if existing_dashboard:
        print(f"Dashboard already exists with ID: {existing_dashboard.id}")
        return existing_dashboard.id
    
    # Dashboard layout
    position = {
        "ROOT_ID": {
            "type": "ROOT",
            "id": "ROOT_ID",
            "children": ["GRID_ID"]
        },
        "GRID_ID": {
            "type": "GRID",
            "id": "GRID_ID",
            "children": ["ROW-1", "ROW-2"]
        },
        "ROW-1": {
            "type": "ROW",
            "id": "ROW-1",
            "children": ["CHART-prod", "CHART-oee"]
        },
        "ROW-2": {
            "type": "ROW",
            "id": "ROW-2",
            "children": ["CHART-equipment"]
        },
        "CHART-prod": {
            "type": "CHART",
            "id": "CHART-prod",
            "children": [],
            "meta": {
                "width": 8,
                "height": 50,
                "chartId": charts[0].id
            }
        },
        "CHART-oee": {
            "type": "CHART",
            "id": "CHART-oee",
            "children": [],
            "meta": {
                "width": 4,
                "height": 50,
                "chartId": charts[1].id
            }
        },
        "CHART-equipment": {
            "type": "CHART",
            "id": "CHART-equipment",
            "children": [],
            "meta": {
                "width": 12,
                "height": 50,
                "chartId": charts[2].id
            }
        }
    }
    
    dashboard = Dashboard(
        dashboard_title=dashboard_title,
        slug='manufacturing-overview',
        slices=charts,
        position_json=json.dumps(position),
        published=True
    )
    
    db.session.add(dashboard)
    db.session.commit()
    
    print(f"Created dashboard: {dashboard_title}")
    print(f"Dashboard ID: {dashboard.id}")
    print(f"Access at: http://localhost:8088/superset/dashboard/{dashboard.id}/")
    
    return dashboard.id

def create_or_get_slice(name, viz_type, datasource_id, params):
    """Create or get existing slice"""
    existing_slice = db.session.query(Slice).filter_by(
        slice_name=name
    ).first()
    
    if existing_slice:
        return existing_slice
    
    chart = Slice(
        slice_name=name,
        viz_type=viz_type,
        datasource_type='table',
        datasource_id=datasource_id,
        params=json.dumps(params)
    )
    db.session.add(chart)
    db.session.commit()
    print(f"Created chart: {name}")
    return chart

if __name__ == "__main__":
    try:
        dashboard_id = create_manufacturing_dashboard()
        if dashboard_id:
            print(f"\nSuccess! Use dashboard ID: {dashboard_id} in your Next.js app")
    except Exception as e:
        print(f"Error creating dashboard: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()