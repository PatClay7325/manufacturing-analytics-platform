#!/bin/bash

# Simple automated deployment script for RunPod
# This script will help you deploy your manufacturing analytics platform

set -e

echo "🚀 Manufacturing Analytics Platform - RunPod Deployment"
echo "====================================================="

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Configuration
read -p "Enter your Docker Hub username (or press Enter to skip): " DOCKER_USERNAME
read -p "Enter your RunPod API key: " RUNPOD_API_KEY
read -p "Enter your database host (e.g., your-db.amazonaws.com): " DB_HOST
read -p "Enter your database password: " -s DB_PASSWORD
echo

# Set default values
DOCKER_USERNAME=${DOCKER_USERNAME:-"manufacturing-analytics"}
IMAGE_NAME="manufacturing-analytics-platform"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "\n${YELLOW}Building Docker image...${NC}"
docker build -f runpod.Dockerfile -t ${FULL_IMAGE_NAME} .

# Push to Docker Hub if username provided
if [ ! -z "$DOCKER_USERNAME" ]; then
    echo -e "\n${YELLOW}Logging into Docker Hub...${NC}"
    docker login -u ${DOCKER_USERNAME}
    
    echo -e "\n${YELLOW}Pushing image to Docker Hub...${NC}"
    docker push ${FULL_IMAGE_NAME}
fi

# Create RunPod configuration
echo -e "\n${YELLOW}Creating RunPod configuration...${NC}"
cat > runpod-config.json <<EOF
{
  "name": "manufacturing-analytics-platform",
  "imageName": "${FULL_IMAGE_NAME}",
  "gpuTypeId": "CPU",
  "cloudType": "SECURE",
  "containerDiskInGb": 20,
  "volumeInGb": 10,
  "ports": "8080/http",
  "env": [
    {
      "key": "NODE_ENV",
      "value": "production"
    },
    {
      "key": "DATABASE_URL",
      "value": "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:5433/manufacturing?schema=public"
    },
    {
      "key": "DATABASE_HOST",
      "value": "${DB_HOST}"
    },
    {
      "key": "DATABASE_PORT",
      "value": "5433"
    },
    {
      "key": "DATABASE_USER",
      "value": "postgres"
    },
    {
      "key": "DATABASE_PASSWORD",
      "value": "${DB_PASSWORD}"
    },
    {
      "key": "DATABASE_NAME",
      "value": "manufacturing"
    },
    {
      "key": "NEXTAUTH_SECRET",
      "value": "your-secure-secret-here-change-this"
    },
    {
      "key": "NEXTAUTH_URL",
      "value": "https://your-runpod-url.runpod.io"
    },
    {
      "key": "PORT",
      "value": "8080"
    }
  ],
  "dockerArgs": ""
}
EOF

echo -e "\n${GREEN}✅ Deployment preparation complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Go to https://runpod.io/console/pods"
echo "2. Click 'Deploy' or '+ New Pod'"
echo "3. Select 'Deploy Any Model'"
echo "4. Use these settings:"
echo "   - Container Image: ${FULL_IMAGE_NAME}"
echo "   - Container Disk: 20 GB"
echo "   - Volume Disk: 10 GB"
echo "   - Expose HTTP Ports: 8080"
echo "5. Add the environment variables from runpod-config.json"
echo "6. Click 'Deploy'"
echo ""
echo "Your app will be available at the RunPod URL once deployed!"
echo ""
echo -e "${YELLOW}⚠️  Important: Update NEXTAUTH_URL with your actual RunPod URL after deployment${NC}"