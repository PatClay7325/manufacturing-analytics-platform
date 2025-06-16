variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region to deploy resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "tenant_ids" {
  description = "List of tenant IDs for multi-tenancy setup"
  type        = list(string)
  default     = ["tenant1", "tenant2", "tenant3"]
}