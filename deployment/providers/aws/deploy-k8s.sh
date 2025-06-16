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
AWS_DIR="$BASE_DIR/providers/aws"

echo "Deploying to AWS EKS in $ENVIRONMENT environment"

# Get EKS cluster info
CLUSTER_NAME="manufacturing-$ENVIRONMENT"
REGION=$(aws configure get region)

# Update kubeconfig for EKS cluster
echo "Updating kubeconfig for EKS cluster $CLUSTER_NAME..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"

# Get ECR repository URL
ECR_REPO=$(aws ecr describe-repositories --repository-names "manufacturing-$ENVIRONMENT" --query "repositories[0].repositoryUri" --output text 2>/dev/null || echo "")

if [[ -z "$ECR_REPO" ]]; then
  echo "Creating ECR repository..."
  ECR_REPO=$(aws ecr create-repository --repository-name "manufacturing-$ENVIRONMENT" --query "repository.repositoryUri" --output text)
fi

# Get database connection info
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier "manufacturing-$ENVIRONMENT" --query "DBInstances[0].Endpoint.Address" --output text)
DB_PORT=$(aws rds describe-db-instances --db-instance-identifier "manufacturing-$ENVIRONMENT" --query "DBInstances[0].Endpoint.Port" --output text)

# Create AWS-specific secrets
kubectl create namespace manufacturing-$ENVIRONMENT --dry-run=client -o yaml | kubectl apply -f -

# Create database secret
kubectl create secret generic database-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=username=admin \
  --from-literal=password=$(aws secretsmanager get-secret-value --secret-id "manufacturing-$ENVIRONMENT-db" --query "SecretString" --output text) \
  --from-literal=url="postgresql://admin:$(aws secretsmanager get-secret-value --secret-id "manufacturing-$ENVIRONMENT-db" --query "SecretString" --output text)@$DB_ENDPOINT:$DB_PORT/manufacturing" \
  --dry-run=client -o yaml | kubectl apply -f -

# Create JWT secret
kubectl create secret generic jwt-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=secret=$(openssl rand -hex 32) \
  --dry-run=client -o yaml | kubectl apply -f -

# Get ElastiCache endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id "manufacturing-redis-$ENVIRONMENT" --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text)
REDIS_PORT=$(aws elasticache describe-cache-clusters --cache-cluster-id "manufacturing-redis-$ENVIRONMENT" --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Port" --output text)

# Create Redis secret
kubectl create secret generic redis-secret \
  --namespace manufacturing-$ENVIRONMENT \
  --from-literal=url="redis://$REDIS_ENDPOINT:$REDIS_PORT" \
  --dry-run=client -o yaml | kubectl apply -f -

# Set up tenant namespace if tenant ID is provided
if [[ -n "$TENANT_ID" ]]; then
  echo "Setting up tenant namespace for $TENANT_ID..."
  
  # Create tenant namespace from template
  sed "s/\${TENANT_ID}/$TENANT_ID/g" "$TEMPLATES_DIR/tenant-namespace.yaml" | kubectl apply -f -
  
  # Apply tenant-specific configuration
  kubectl create secret generic database-secret \
    --namespace tenant-$TENANT_ID \
    --from-literal=username=tenant_$TENANT_ID \
    --from-literal=password=$(aws secretsmanager get-secret-value --secret-id "manufacturing-$ENVIRONMENT-tenant-$TENANT_ID-db" --query "SecretString" --output text 2>/dev/null || openssl rand -hex 16) \
    --from-literal=url="postgresql://tenant_$TENANT_ID:$(aws secretsmanager get-secret-value --secret-id "manufacturing-$ENVIRONMENT-tenant-$TENANT_ID-db" --query "SecretString" --output text 2>/dev/null || openssl rand -hex 16)@$DB_ENDPOINT:$DB_PORT/manufacturing" \
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
    sed -e "s|\${REGISTRY_URL}|$ECR_REPO|g" \
        -e "s|\${VERSION}|latest|g" \
        -e "s|\${ENVIRONMENT}|$ENVIRONMENT|g" \
        "$file" | kubectl apply -n "$NAMESPACE" -f -
  fi
done

echo "Deployment to AWS EKS completed successfully!"