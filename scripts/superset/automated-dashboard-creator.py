#!/usr/bin/env python3
"""
Enhanced Automated Superset Dashboard Creator
Creates comprehensive manufacturing dashboards with real data integration
"""

import os
import sys
import json
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

class SupersetDashboardCreator:
    def __init__(self, base_url: str = "http://localhost:8088", username: str = "admin", password: str = "admin"):
        self.base_url = base_url
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.csrf_token = None
        self.access_token = None
        
    def authenticate(self) -> bool:
        """Authenticate with Superset and get access token"""
        try:
            # Get CSRF token
            csrf_response = self.session.get(f"{self.base_url}/api/v1/security/csrf_token/")
            if csrf_response.status_code == 200:
                self.csrf_token = csrf_response.json()["result"]
                self.session.headers.update({"X-CSRFToken": self.csrf_token})
            
            # Login
            login_data = {
                "username": self.username,
                "password": self.password,
                "provider": "db",
                "refresh": True
            }
            
            login_response = self.session.post(
                f"{self.base_url}/api/v1/security/login",
                json=login_data
            )
            
            if login_response.status_code == 200:
                self.access_token = login_response.json()["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {login_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def wait_for_superset(self, max_retries: int = 30) -> bool:
        """Wait for Superset to be ready"""
        for i in range(max_retries):
            try:
                response = self.session.get(f"{self.base_url}/health")
                if response.status_code == 200:
                    print("✅ Superset is ready")
                    return True
            except:
                pass
            
            print(f"⏳ Waiting for Superset... ({i+1}/{max_retries})")
            time.sleep(10)
        
        print("❌ Superset failed to start")
        return False
    
    def get_database_id(self, database_name: str = "Manufacturing TimescaleDB") -> Optional[int]:
        """Get database ID by name"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/database/")
            if response.status_code == 200:
                databases = response.json()["result"]
                for db in databases:
                    if db["database_name"] == database_name:
                        return db["id"]
            return None
        except Exception as e:
            print(f"❌ Error getting database ID: {str(e)}")
            return None
    
    def create_dataset(self, table_name: str, database_id: int) -> Optional[int]:
        """Create a dataset from a table/view"""
        try:
            dataset_data = {
                "database": database_id,
                "table_name": table_name,
                "schema": "public"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/dataset/",
                json=dataset_data
            )
            
            if response.status_code == 201:
                dataset_id = response.json()["id"]
                print(f"✅ Created dataset: {table_name} (ID: {dataset_id})")
                return dataset_id
            else:
                print(f"❌ Failed to create dataset {table_name}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating dataset {table_name}: {str(e)}")
            return None
    
    def create_chart(self, chart_config: Dict[str, Any]) -> Optional[int]:
        """Create a chart with given configuration"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/chart/",
                json=chart_config
            )
            
            if response.status_code == 201:
                chart_id = response.json()["id"]
                print(f"✅ Created chart: {chart_config['slice_name']} (ID: {chart_id})")
                return chart_id
            else:
                print(f"❌ Failed to create chart {chart_config['slice_name']}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating chart {chart_config['slice_name']}: {str(e)}")
            return None
    
    def create_dashboard(self, dashboard_config: Dict[str, Any]) -> Optional[int]:
        """Create a dashboard with given configuration"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/dashboard/",
                json=dashboard_config
            )
            
            if response.status_code == 201:
                dashboard_id = response.json()["id"]
                print(f"✅ Created dashboard: {dashboard_config['dashboard_title']} (ID: {dashboard_id})")
                return dashboard_id
            else:
                print(f"❌ Failed to create dashboard {dashboard_config['dashboard_title']}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating dashboard {dashboard_config['dashboard_title']}: {str(e)}")
            return None
    
    def create_manufacturing_overview_dashboard(self, database_id: int) -> Optional[int]:
        """Create the main manufacturing overview dashboard"""
        
        # Create datasets
        datasets = {}
        dataset_views = [
            "v_realtime_production",
            "v_equipment_status", 
            "v_oee_hourly_trend",
            "v_quality_metrics",
            "v_kpi_summary",
            "v_downtime_analysis"
        ]
        
        for view in dataset_views:
            dataset_id = self.create_dataset(view, database_id)
            if dataset_id:
                datasets[view] = dataset_id
        
        if not datasets:
            print("❌ No datasets created, cannot create dashboard")
            return None
        
        # Chart configurations
        charts = []
        
        # 1. OEE Gauge
        if "v_kpi_summary" in datasets:
            oee_chart = {
                "slice_name": "Current OEE",
                "viz_type": "gauge_chart",
                "datasource_id": datasets["v_kpi_summary"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metric": "oee",
                    "groupby": [],
                    "min_val": 0,
                    "max_val": 100,
                    "value_color": "green"
                })
            }
            chart_id = self.create_chart(oee_chart)
            if chart_id:
                charts.append({
                    "id": chart_id,
                    "type": "CHART",
                    "meta": {"width": 4, "height": 4}
                })
        
        # 2. Production Trend
        if "v_realtime_production" in datasets:
            production_chart = {
                "slice_name": "Production Trend",
                "viz_type": "line",
                "datasource_id": datasets["v_realtime_production"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["production_count"],
                    "groupby": ["timestamp"],
                    "granularity_sqla": "timestamp",
                    "time_range": "Last 24 hours"
                })
            }
            chart_id = self.create_chart(production_chart)
            if chart_id:
                charts.append({
                    "id": chart_id,
                    "type": "CHART", 
                    "meta": {"width": 8, "height": 4}
                })
        
        # 3. Equipment Status Table
        if "v_equipment_status" in datasets:
            equipment_chart = {
                "slice_name": "Equipment Status",
                "viz_type": "table",
                "datasource_id": datasets["v_equipment_status"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": [],
                    "groupby": ["equipment_name", "status", "availability", "last_maintenance"],
                    "row_limit": 10
                })
            }
            chart_id = self.create_chart(equipment_chart)
            if chart_id:
                charts.append({
                    "id": chart_id,
                    "type": "CHART",
                    "meta": {"width": 6, "height": 5}
                })
        
        # 4. Quality Metrics
        if "v_quality_metrics" in datasets:
            quality_chart = {
                "slice_name": "Quality Metrics",
                "viz_type": "big_number_total",
                "datasource_id": datasets["v_quality_metrics"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metric": "first_pass_yield",
                    "granularity_sqla": "timestamp"
                })
            }
            chart_id = self.create_chart(quality_chart)
            if chart_id:
                charts.append({
                    "id": chart_id,
                    "type": "CHART",
                    "meta": {"width": 6, "height": 3}
                })
        
        # Create dashboard
        if charts:
            dashboard_config = {
                "dashboard_title": "Manufacturing Overview",
                "slug": "manufacturing-overview",
                "position_json": json.dumps({
                    "CHART-" + str(chart["id"]): {
                        "id": "CHART-" + str(chart["id"]),
                        "type": chart["type"],
                        "children": [],
                        "meta": {
                            "chartId": chart["id"],
                            "width": chart["meta"]["width"],
                            "height": chart["meta"]["height"]
                        }
                    } for chart in charts
                }),
                "css": "",
                "json_metadata": json.dumps({
                    "refresh_frequency": 30,
                    "timed_refresh_immune_slices": [],
                    "default_filters": {}
                })
            }
            
            return self.create_dashboard(dashboard_config)
        
        return None
    
    def create_production_dashboard(self, database_id: int) -> Optional[int]:
        """Create production-specific dashboard"""
        
        # Create datasets
        datasets = {}
        dataset_views = ["v_realtime_production", "v_shift_performance"]
        
        for view in dataset_views:
            dataset_id = self.create_dataset(view, database_id)
            if dataset_id:
                datasets[view] = dataset_id
        
        charts = []
        
        # Production volume chart
        if "v_realtime_production" in datasets:
            volume_chart = {
                "slice_name": "Production Volume",
                "viz_type": "area",
                "datasource_id": datasets["v_realtime_production"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["production_count", "target_count"],
                    "groupby": ["timestamp"],
                    "granularity_sqla": "timestamp"
                })
            }
            chart_id = self.create_chart(volume_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 12, "height": 6}})
        
        # Shift performance
        if "v_shift_performance" in datasets:
            shift_chart = {
                "slice_name": "Shift Performance",
                "viz_type": "bar",
                "datasource_id": datasets["v_shift_performance"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["shift_oee"],
                    "groupby": ["shift_name"]
                })
            }
            chart_id = self.create_chart(shift_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 6, "height": 4}})
        
        # Create dashboard
        if charts:
            dashboard_config = {
                "dashboard_title": "Production Metrics",
                "slug": "production-metrics",
                "position_json": json.dumps({
                    "CHART-" + str(chart["id"]): {
                        "id": "CHART-" + str(chart["id"]),
                        "type": chart["type"],
                        "children": [],
                        "meta": {
                            "chartId": chart["id"],
                            "width": chart["meta"]["width"],
                            "height": chart["meta"]["height"]
                        }
                    } for chart in charts
                })
            }
            
            return self.create_dashboard(dashboard_config)
        
        return None
    
    def create_quality_dashboard(self, database_id: int) -> Optional[int]:
        """Create quality-specific dashboard"""
        
        # Create datasets
        datasets = {}
        dataset_views = ["v_quality_metrics", "v_scrap_analysis"]
        
        for view in dataset_views:
            dataset_id = self.create_dataset(view, database_id)
            if dataset_id:
                datasets[view] = dataset_id
        
        charts = []
        
        # Quality trend
        if "v_quality_metrics" in datasets:
            quality_chart = {
                "slice_name": "Quality Trend",
                "viz_type": "line",
                "datasource_id": datasets["v_quality_metrics"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["first_pass_yield", "defect_rate"],
                    "groupby": ["timestamp"],
                    "granularity_sqla": "timestamp"
                })
            }
            chart_id = self.create_chart(quality_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 8, "height": 5}})
        
        # Scrap analysis
        if "v_scrap_analysis" in datasets:
            scrap_chart = {
                "slice_name": "Scrap by Reason",
                "viz_type": "pie",
                "datasource_id": datasets["v_scrap_analysis"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["scrap_cost"],
                    "groupby": ["scrap_reason"]
                })
            }
            chart_id = self.create_chart(scrap_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 4, "height": 5}})
        
        # Create dashboard
        if charts:
            dashboard_config = {
                "dashboard_title": "Quality Analytics",
                "slug": "quality-analytics",
                "position_json": json.dumps({
                    "CHART-" + str(chart["id"]): {
                        "id": "CHART-" + str(chart["id"]),
                        "type": chart["type"],
                        "children": [],
                        "meta": {
                            "chartId": chart["id"],
                            "width": chart["meta"]["width"],
                            "height": chart["meta"]["height"]
                        }
                    } for chart in charts
                })
            }
            
            return self.create_dashboard(dashboard_config)
        
        return None
    
    def create_equipment_dashboard(self, database_id: int) -> Optional[int]:
        """Create equipment-specific dashboard"""
        
        # Create datasets
        datasets = {}
        dataset_views = ["v_equipment_status", "v_downtime_analysis", "v_oee_hourly_trend"]
        
        for view in dataset_views:
            dataset_id = self.create_dataset(view, database_id)
            if dataset_id:
                datasets[view] = dataset_id
        
        charts = []
        
        # Equipment OEE heatmap
        if "v_oee_hourly_trend" in datasets:
            oee_chart = {
                "slice_name": "OEE by Equipment",
                "viz_type": "heatmap",
                "datasource_id": datasets["v_oee_hourly_trend"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["oee_score"],
                    "groupby": ["equipment_name"],
                    "columns": ["hour_of_day"]
                })
            }
            chart_id = self.create_chart(oee_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 8, "height": 6}})
        
        # Downtime analysis
        if "v_downtime_analysis" in datasets:
            downtime_chart = {
                "slice_name": "Downtime by Reason",
                "viz_type": "bar",
                "datasource_id": datasets["v_downtime_analysis"],
                "datasource_type": "table",
                "params": json.dumps({
                    "metrics": ["total_downtime_hours"],
                    "groupby": ["downtime_reason"]
                })
            }
            chart_id = self.create_chart(downtime_chart)
            if chart_id:
                charts.append({"id": chart_id, "type": "CHART", "meta": {"width": 4, "height": 6}})
        
        # Create dashboard
        if charts:
            dashboard_config = {
                "dashboard_title": "Equipment Performance",
                "slug": "equipment-performance",
                "position_json": json.dumps({
                    "CHART-" + str(chart["id"]): {
                        "id": "CHART-" + str(chart["id"]),
                        "type": chart["type"],
                        "children": [],
                        "meta": {
                            "chartId": chart["id"],
                            "width": chart["meta"]["width"],
                            "height": chart["meta"]["height"]
                        }
                    } for chart in charts
                })
            }
            
            return self.create_dashboard(dashboard_config)
        
        return None
    
    def create_all_dashboards(self) -> Dict[str, Optional[int]]:
        """Create all manufacturing dashboards"""
        
        print("🚀 Starting Superset dashboard creation...")
        
        # Wait for Superset to be ready
        if not self.wait_for_superset():
            return {}
        
        # Authenticate
        if not self.authenticate():
            return {}
        
        # Get database ID
        database_id = self.get_database_id()
        if not database_id:
            print("❌ Manufacturing database not found")
            return {}
        
        print(f"✅ Found Manufacturing database (ID: {database_id})")
        
        # Create dashboards
        dashboards = {}
        
        print("\n📊 Creating Manufacturing Overview Dashboard...")
        dashboards["overview"] = self.create_manufacturing_overview_dashboard(database_id)
        
        print("\n🏭 Creating Production Dashboard...")
        dashboards["production"] = self.create_production_dashboard(database_id)
        
        print("\n✅ Creating Quality Dashboard...")
        dashboards["quality"] = self.create_quality_dashboard(database_id)
        
        print("\n⚙️ Creating Equipment Dashboard...")
        dashboards["equipment"] = self.create_equipment_dashboard(database_id)
        
        # Print summary
        print("\n" + "="*50)
        print("📈 DASHBOARD CREATION SUMMARY")
        print("="*50)
        
        for name, dashboard_id in dashboards.items():
            if dashboard_id:
                print(f"✅ {name.capitalize()}: Dashboard ID {dashboard_id}")
                print(f"   🔗 URL: {self.base_url}/superset/dashboard/{dashboard_id}/")
            else:
                print(f"❌ {name.capitalize()}: Failed to create")
        
        print("\n🎯 Update your analytics page with these dashboard IDs:")
        print("const dashboards = {")
        for name, dashboard_id in dashboards.items():
            if dashboard_id:
                print(f"  {name}: '{dashboard_id}',")
        print("};")
        
        return dashboards

def main():
    """Main function"""
    creator = SupersetDashboardCreator()
    dashboards = creator.create_all_dashboards()
    
    # Write dashboard IDs to file for integration
    if any(dashboards.values()):
        with open("/tmp/dashboard_ids.json", "w") as f:
            json.dump(dashboards, f, indent=2)
        print(f"\n💾 Dashboard IDs saved to /tmp/dashboard_ids.json")

if __name__ == "__main__":
    main()