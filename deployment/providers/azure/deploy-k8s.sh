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
AZURE_DIR="$BASE_DIR/providers/azure"

echo "Deploying to Azure AKS in $ENVIRONMENT environment"

# Get AKS cluster info
RESOURCE_GROUP="manufacturing-$ENVIRONMENT-rg"
CLUSTER_NAME="manufacturing-$ENVIRONMENT-aks"

# Update kubeconfig for AKS cluster
echo "Updating kubeconfig for AKS cluster $CLUSTER_NAME..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

# Get ACR repository URL
ACR_NAME="manufacturing${ENVIRONMENT}acr"
ACR_REPO=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query "loginServer" --output tsv 2>/dev/null || echo "")

if [[ -z "$ACR_REPO" ]]; then
  echo "Error: ACR repository not found. Please create it using Terraform."
  exit 1
fi

# Get PostgreSQL server details
PG_SERVER_NAME="manufacturing-$ENVIRONMENT-pg"
PG_FQDN=$(az postgres flexible-server show --name "$PG_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --query "fullyQualifiedDomainName" --output tsv)

# Create Azure-specific secrets
kubectl create namespace manufacturing-$ENVIRONMENT --dry-run=client -o yaml | kubectl apply -f -

# Create database secret
DB_PASSWORD=$(az keyvault secret show --vault-name "manufacturing-kv-$ENVIRONMENT" --name "db-password" --query "value" --output tsv 2>/dev/null || echo "")

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Warning: Database password not found in Key Vault. Using default value."
  DB_PASSWORD="ChangeMeToSecurePassword"
fi

kubectl create secret generic database-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=username=admin \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=url="postgresql://admin:$DB_PASSWORD@$PG_FQDN:5432/manufacturing" \
  --dry-run=client -o yaml | kubectl apply -f -

# Create JWT secret
JWT_SECRET=$(az keyvault secret show --vault-name "manufacturing-kv-$ENVIRONMENT" --name "jwt-secret" --query "value" --output tsv 2>/dev/null || openssl rand -hex 32)

kubectl create secret generic jwt-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=secret="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

# Get Redis cache info
REDIS_HOST=$(az redis show --name "manufacturing-$ENVIRONMENT-redis" --resource-group "$RESOURCE_GROUP" --query "hostName" --output tsv)
REDIS_KEY=$(az redis list-keys --name "manufacturing-$ENVIRONMENT-redis" --resource-group "$RESOURCE_GROUP" --query "primaryKey" --output tsv)

# Create Redis secret
kubectl create secret generic redis-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=url="redis://:$REDIS_KEY@$REDIS_HOST:6380?ssl=true" \
  --dry-run=client -o yaml | kubectl apply -f -

# Set up tenant namespace if tenant ID is provided
if [[ -n "$TENANT_ID" ]]; then
  echo "Setting up tenant namespace for $TENANT_ID..."
  
  # Create tenant namespace from template
  sed "s/\${TENANT_ID}/$TENANT_ID/g" "$TEMPLATES_DIR/tenant-namespace.yaml" | kubectl apply -f -
  
  # Apply tenant-specific configuration
  TENANT_DB_PASSWORD=$(az keyvault secret show --vault-name "manufacturing-kv-$ENVIRONMENT" --name "tenant-$TENANT_ID-db-password" --query "value" --output tsv 2>/dev/null || openssl rand -hex 16)
  
  kubectl create secret generic database-secret \
    --namespace tenant-$TENANT_ID \
    --from-literal=username=tenant_$TENANT_ID \
    --from-literal=password="$TENANT_DB_PASSWORD" \
    --from-literal=url="postgresql://tenant_$TENANT_ID:$TENANT_DB_PASSWORD@$PG_FQDN:5432/manufacturing" \
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
    sed -e "s|\${REGISTRY_URL}|$ACR_REPO|g" \
        -e "s|\${VERSION}|latest|g" \
        -e "s|\${ENVIRONMENT}|$ENVIRONMENT|g" \
        "$file" | kubectl apply -n "$NAMESPACE" -f -
  fi
done

echo "Deployment to Azure AKS completed successfully!"