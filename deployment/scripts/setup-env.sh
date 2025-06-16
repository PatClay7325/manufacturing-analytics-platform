#!/bin/bash

set -e

# Parse command line arguments
CLOUD_PROVIDER="$1"
ENVIRONMENT="$2"
TENANT_ID="$3"

if [[ -z "$CLOUD_PROVIDER" || -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <cloud_provider> <environment> [tenant_id]"
  exit 1
fi

# Set base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PROVIDER_DIR="$BASE_DIR/providers/$CLOUD_PROVIDER"

echo "Setting up environment for $CLOUD_PROVIDER in $ENVIRONMENT environment"

# Create necessary directories
mkdir -p "$BASE_DIR/config/$ENVIRONMENT"
mkdir -p "$BASE_DIR/logs/$ENVIRONMENT"

# Generate configuration based on environment and tenant
CONFIG_FILE="$BASE_DIR/config/$ENVIRONMENT/config.json"

if [[ -n "$TENANT_ID" ]]; then
  echo "Configuring for tenant: $TENANT_ID"
  CONFIG_FILE="$BASE_DIR/config/$ENVIRONMENT/config.$TENANT_ID.json"
fi

# Check for cloud provider-specific setup
if [[ -f "$PROVIDER_DIR/setup-env.sh" ]]; then
  echo "Running $CLOUD_PROVIDER-specific environment setup..."
  bash "$PROVIDER_DIR/setup-env.sh" "$ENVIRONMENT" "$TENANT_ID"
fi

# Cloud provider specific credentials setup
case "$CLOUD_PROVIDER" in
  aws)
    # Check for AWS CLI and credentials
    if ! command -v aws &> /dev/null; then
      echo "AWS CLI is not installed. Please install it and configure credentials."
      exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
      echo "AWS credentials not configured. Please run 'aws configure' first."
      exit 1
    fi
    
    echo "AWS credentials validated successfully"
    ;;
    
  azure)
    # Check for Azure CLI and login
    if ! command -v az &> /dev/null; then
      echo "Azure CLI is not installed. Please install it and login."
      exit 1
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
      echo "Not logged in to Azure. Please run 'az login' first."
      exit 1
    fi
    
    echo "Azure credentials validated successfully"
    ;;
    
  gcp)
    # Check for Google Cloud SDK and credentials
    if ! command -v gcloud &> /dev/null; then
      echo "Google Cloud SDK is not installed. Please install it and configure credentials."
      exit 1
    fi
    
    # Check GCP credentials
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
      echo "Not logged in to GCP. Please run 'gcloud auth login' first."
      exit 1
    fi
    
    echo "GCP credentials validated successfully"
    ;;
    
  on-premise)
    # Check for Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
      echo "Docker is not installed. Please install Docker and Docker Compose."
      exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
      echo "Docker Compose is not installed. Please install Docker Compose."
      exit 1
    fi
    
    echo "Docker and Docker Compose validated successfully"
    ;;
    
  *)
    echo "Unsupported cloud provider: $CLOUD_PROVIDER"
    exit 1
    ;;
esac

# Check for Terraform if needed
if [[ "$CLOUD_PROVIDER" != "on-premise" ]]; then
  if ! command -v terraform &> /dev/null; then
    echo "Terraform is not installed. Please install Terraform."
    exit 1
  fi
  
  echo "Terraform validated successfully"
fi

# Check for kubectl if using Kubernetes
if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
  if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install kubectl."
    exit 1
  fi
  
  echo "kubectl validated successfully"
fi

# Generate or update configuration file
cat > "$CONFIG_FILE" << EOF
{
  "cloud_provider": "$CLOUD_PROVIDER",
  "environment": "$ENVIRONMENT",
  "tenant_id": "$TENANT_ID",
  "deployment_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "app_version": "$(grep '"version"' ../../package.json | cut -d '"' -f 4)"
}
EOF

echo "Environment setup completed. Configuration saved to $CONFIG_FILE"