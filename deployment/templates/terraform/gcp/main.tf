provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_compute_network" "vpc" {
  name                    = "manufacturing-${var.environment}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "manufacturing-${var.environment}-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  secondary_ip_range {
    range_name    = "services-range"
    ip_cidr_range = "10.1.0.0/16"
  }
  
  secondary_ip_range {
    range_name    = "pods-range"
    ip_cidr_range = "10.2.0.0/16"
  }
}

resource "google_container_cluster" "primary" {
  name     = "manufacturing-${var.environment}-gke"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
  
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods-range"
    services_secondary_range_name = "services-range"
  }
  
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }
  
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "manufacturing-${var.environment}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    preemptible  = false
    machine_type = "e2-standard-2"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    labels = {
      env = var.environment
    }
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
  }
  
  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }
}

resource "google_sql_database_instance" "postgres" {
  name             = "manufacturing-${var.environment}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier = "db-custom-2-8192"
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
    
    backup_configuration {
      enabled    = true
      start_time = "00:00"
    }
    
    disk_size = 20
    disk_type = "PD_SSD"
  }
  
  deletion_protection = true
}

resource "google_sql_database" "database" {
  name     = "manufacturing"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "user" {
  name     = var.db_username
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

resource "google_redis_instance" "cache" {
  name           = "manufacturing-${var.environment}-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = var.region
  
  authorized_network = google_compute_network.vpc.id
  
  redis_version     = "REDIS_7_0"
  display_name      = "Manufacturing Analytics Redis Cache"
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }
}

resource "google_artifact_registry_repository" "registry" {
  location      = var.region
  repository_id = "manufacturing-${var.environment}"
  format        = "DOCKER"
}