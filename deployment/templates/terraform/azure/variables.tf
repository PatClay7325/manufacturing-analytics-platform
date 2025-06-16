variable "location" {
  description = "Azure region to deploy resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "kubernetes_version" {
  description = "Version of Kubernetes to use for AKS cluster"
  type        = string
  default     = "1.28.0"
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