# Manufacturing Analytics Platform Deployment

This directory contains all the resources needed for deploying the Manufacturing Analytics Platform in various environments and cloud providers.

## Directory Structure

- `/deployment/templates/` - Contains template files for different deployment methods
  - `/deployment/templates/docker-compose.yml` - For local and single-server deployment
  - `/deployment/templates/kubernetes/` - Kubernetes manifest templates
  - `/deployment/templates/terraform/` - Terraform modules for infrastructure provisioning

- `/deployment/providers/` - Cloud provider-specific resources
  - `/deployment/providers/aws/` - AWS-specific resources
  - `/deployment/providers/azure/` - Azure-specific resources
  - `/deployment/providers/gcp/` - GCP-specific resources
  - `/deployment/providers/on-premise/` - On-premise deployment resources

- `/deployment/scripts/` - Deployment and management scripts
  - `/deployment/scripts/deploy.sh` - Main deployment script
  - `/deployment/scripts/setup-env.sh` - Environment setup script
  - `/deployment/scripts/backup.sh` - Backup script
  - `/deployment/scripts/monitor.sh` - Monitoring setup script

## Quick Start

### Prerequisites

Ensure you have the following tools installed:

- Docker and Docker Compose
- Kubernetes CLI (kubectl) for Kubernetes deployments
- Terraform for cloud deployments
- Cloud provider CLI tools (AWS CLI, Azure CLI, or gcloud CLI)

### Deployment

1. Set up your environment:

```bash
./scripts/setup-env.sh <cloud_provider> <environment> [tenant_id]
```

2. Deploy the application:

```bash
./scripts/deploy.sh --cloud <cloud_provider> --env <environment> --type <deployment_type> [--tenant <tenant_id>]
```

For example:

```bash
# AWS Kubernetes deployment
./scripts/deploy.sh --cloud aws --env dev --type kubernetes

# Azure Kubernetes deployment with tenant
./scripts/deploy.sh --cloud azure --env prod --type kubernetes --tenant tenant1

# On-premise Docker deployment
./scripts/deploy.sh --cloud on-premise --env dev --type docker
```

## Advanced Configuration

For detailed configuration options and advanced deployment scenarios, refer to the comprehensive documentation in `/docs/deployment.md`.

## Multi-Tenancy Support

The deployment supports multi-tenancy through:

1. Namespace isolation in Kubernetes
2. Resource quotas and limits
3. Network policies
4. Database schema separation

To deploy for a specific tenant, use the `--tenant` flag with the deployment script.

## Monitoring and Logging

Monitoring and logging are set up automatically during deployment:

- Prometheus and Analytics for metrics and visualization
- ELK stack for centralized logging
- Cloud provider-specific monitoring integration

## Backup and Disaster Recovery

Automated backup procedures are configured for:

- Database backups
- Application state
- Configuration files

For disaster recovery procedures, refer to the documentation in `/docs/disaster-recovery.md`.

## Security

The deployment follows security best practices:

- HTTPS/TLS encryption
- Network isolation
- Secure secret management
- Least privilege access

## CI/CD Integration

The deployment scripts are designed to integrate with CI/CD pipelines. Sample pipeline configurations are available in the `.github/workflows/` directory.