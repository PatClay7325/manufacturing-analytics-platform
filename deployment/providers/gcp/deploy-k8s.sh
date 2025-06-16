#!/bin/bash

set -e

# Parse command line arguments
ENVIRONMENT="$1"
TENANT_ID="$2"

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <environment> [tenant_id]"
  exit 1
fi

# Set base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../.."
TEMPLATES_DIR="$BASE_DIR/templates/kubernetes"
GCP_DIR="$BASE_DIR/providers/gcp"

echo "Deploying to GCP GKE in $ENVIRONMENT environment"

# Get GKE cluster info
PROJECT_ID=$(gcloud config get-value project)
REGION=$(gcloud config get-value compute/region)
CLUSTER_NAME="manufacturing-$ENVIRONMENT-gke"

# Update kubeconfig for GKE cluster
echo "Updating kubeconfig for GKE cluster $CLUSTER_NAME..."
gcloud container clusters get-credentials "$CLUSTER_NAME" --region "$REGION" --project "$PROJECT_ID"

# Get Artifact Registry URL
REGISTRY_REPO="manufacturing-$ENVIRONMENT"
REGISTRY_URL="$REGION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_REPO"

# Get Cloud SQL instance details
SQL_INSTANCE="manufacturing-$ENVIRONMENT-postgres"
DB_HOST=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(ipAddresses.filter(ipType='PRIVATE').map().address.list())")

if [[ -z "$DB_HOST" ]]; then
  echo "Warning: Could not find private IP for Cloud SQL instance. Using public IP instead (not recommended for production)."
  DB_HOST=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(ipAddresses.filter(ipType='PRIMARY').map().address.list())")
fi

# Create GCP-specific secrets
kubectl create namespace manufacturing-$ENVIRONMENT --dry-run=client -o yaml | kubectl apply -f -

# Get database password from Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret="manufacturing-$ENVIRONMENT-db-password" 2>/dev/null || echo "")

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Warning: Database password not found in Secret Manager. Using default value."
  DB_PASSWORD="ChangeMeToSecurePassword"
fi

kubectl create secret generic database-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=username=postgres \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=url="postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/manufacturing" \
  --dry-run=client -o yaml | kubectl apply -f -

# Create JWT secret
JWT_SECRET=$(gcloud secrets versions access latest --secret="manufacturing-$ENVIRONMENT-jwt-secret" 2>/dev/null || openssl rand -hex 32)

kubectl create secret generic jwt-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=secret="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

# Get Redis info
REDIS_HOST=$(gcloud redis instances describe "manufacturing-$ENVIRONMENT-redis" --region="$REGION" --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe "manufacturing-$ENVIRONMENT-redis" --region="$REGION" --format="value(port)")

# Create Redis secret
kubectl create secret generic redis-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=url="redis://$REDIS_HOST:$REDIS_PORT" \
  --dry-run=client -o yaml | kubectl apply -f -

# Set up tenant namespace if tenant ID is provided
if [[ -n "$TENANT_ID" ]]; then
  echo "Setting up tenant namespace for $TENANT_ID..."
  
  # Create tenant namespace from template
  sed "s/\${TENANT_ID}/$TENANT_ID/g" "$TEMPLATES_DIR/tenant-namespace.yaml" | kubectl apply -f -
  
  # Apply tenant-specific configuration
  TENANT_DB_PASSWORD=$(gcloud secrets versions access latest --secret="manufacturing-$ENVIRONMENT-tenant-$TENANT_ID-db-password" 2>/dev/null || openssl rand -hex 16)
  
  kubectl create secret generic database-secret \
    --namespace tenant-$TENANT_ID \
    --from-literal=username=tenant_$TENANT_ID \
    --from-literal=password="$TENANT_DB_PASSWORD" \
    --from-literal=url="postgresql://tenant_$TENANT_ID:$TENANT_DB_PASSWORD@$DB_HOST:5432/manufacturing" \
    --dry-run=client -o yaml | kubectl apply -f -
    
  # Apply tenant-specific labels to deployments
  NAMESPACE="tenant-$TENANT_ID"
else
  NAMESPACE="manufacturing-$ENVIRONMENT"
fi

# Deploy application components
for file in "$TEMPLATES_DIR"/*.yaml; do
  if [[ -f "$file" ]]; then
    echo "Deploying $(basename "$file")..."
    
    # Replace variables in template
    sed -e "s|\${REGISTRY_URL}|$REGISTRY_URL|g" \
        -e "s|\${VERSION}|latest|g" \
        -e "s|\${ENVIRONMENT}|$ENVIRONMENT|g" \
        "$file" | kubectl apply -n "$NAMESPACE" -f -
  fi
done

echo "Deployment to GCP GKE completed successfully!"