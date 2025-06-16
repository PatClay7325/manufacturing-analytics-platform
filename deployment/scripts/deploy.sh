#!/bin/bash

set -e

# Parse command line arguments
CLOUD_PROVIDER=""
ENVIRONMENT=""
TENANT_ID=""
DEPLOYMENT_TYPE=""

show_usage() {
  echo "Usage: $0 --cloud [aws|azure|gcp|on-premise] --env [dev|staging|prod] --type [kubernetes|docker] [--tenant TENANT_ID]"
  echo ""
  echo "Options:"
  echo "  --cloud       Cloud provider to deploy to (aws, azure, gcp, or on-premise)"
  echo "  --env         Environment to deploy to (dev, staging, prod)"
  echo "  --type        Deployment type (kubernetes or docker)"
  echo "  --tenant      Optional tenant ID for multi-tenant deployments"
  echo ""
  exit 1
}

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --cloud)
      CLOUD_PROVIDER="$2"
      shift
      shift
      ;;
    --env)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    --tenant)
      TENANT_ID="$2"
      shift
      shift
      ;;
    --type)
      DEPLOYMENT_TYPE="$2"
      shift
      shift
      ;;
    -h|--help)
      show_usage
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      ;;
  esac
done

# Validate inputs
if [[ -z "$CLOUD_PROVIDER" || -z "$ENVIRONMENT" || -z "$DEPLOYMENT_TYPE" ]]; then
  echo "Error: Missing required parameters"
  show_usage
fi

if [[ "$CLOUD_PROVIDER" != "aws" && "$CLOUD_PROVIDER" != "azure" && "$CLOUD_PROVIDER" != "gcp" && "$CLOUD_PROVIDER" != "on-premise" ]]; then
  echo "Error: Cloud provider must be one of: aws, azure, gcp, on-premise"
  show_usage
fi

if [[ "$DEPLOYMENT_TYPE" != "kubernetes" && "$DEPLOYMENT_TYPE" != "docker" ]]; then
  echo "Error: Deployment type must be one of: kubernetes, docker"
  show_usage
fi

# Load environment variables
if [[ -f ".env.$ENVIRONMENT" ]]; then
  echo "Loading environment variables from .env.$ENVIRONMENT"
  source ".env.$ENVIRONMENT"
else
  echo "Warning: .env.$ENVIRONMENT not found"
fi

# Set base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PROVIDER_DIR="$BASE_DIR/providers/$CLOUD_PROVIDER"
SCRIPTS_DIR="$BASE_DIR/scripts"

# Source the environment setup script
source "$SCRIPTS_DIR/setup-env.sh" "$CLOUD_PROVIDER" "$ENVIRONMENT" "$TENANT_ID"

# Deploy based on cloud provider and deployment type
if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
  if [[ "$CLOUD_PROVIDER" == "on-premise" ]]; then
    echo "Deploying to on-premise using Docker Compose..."
    docker-compose -f "$BASE_DIR/templates/docker-compose.yml" up -d
  else
    echo "Docker deployment is only supported for on-premise deployment"
    exit 1
  fi
elif [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
  # Run the cloud-specific deployment
  if [[ -f "$PROVIDER_DIR/deploy-k8s.sh" ]]; then
    echo "Running Kubernetes deployment for $CLOUD_PROVIDER..."
    bash "$PROVIDER_DIR/deploy-k8s.sh" "$ENVIRONMENT" "$TENANT_ID"
  else
    echo "Error: Kubernetes deployment script not found for $CLOUD_PROVIDER"
    exit 1
  fi
fi

# Setup monitoring
echo "Setting up monitoring..."
bash "$SCRIPTS_DIR/monitor.sh" "$CLOUD_PROVIDER" "$ENVIRONMENT" "$TENANT_ID" "$DEPLOYMENT_TYPE"

# Create backup schedule
echo "Setting up backup schedule..."
bash "$SCRIPTS_DIR/backup.sh" "$CLOUD_PROVIDER" "$ENVIRONMENT" "$TENANT_ID" "$DEPLOYMENT_TYPE"

echo "Deployment completed successfully!"