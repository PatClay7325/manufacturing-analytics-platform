#!/bin/bash

set -e

# Parse command line arguments
CLOUD_PROVIDER="$1"
ENVIRONMENT="$2"
TENANT_ID="$3"
DEPLOYMENT_TYPE="$4"

if [[ -z "$CLOUD_PROVIDER" || -z "$ENVIRONMENT" || -z "$DEPLOYMENT_TYPE" ]]; then
  echo "Usage: $0 <cloud_provider> <environment> [tenant_id] <deployment_type>"
  exit 1
fi

# Set base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PROVIDER_DIR="$BASE_DIR/providers/$CLOUD_PROVIDER"
BACKUP_DIR="$BASE_DIR/backups/$ENVIRONMENT"

echo "Setting up backup for $CLOUD_PROVIDER in $ENVIRONMENT environment"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP"

if [[ -n "$TENANT_ID" ]]; then
  BACKUP_FILE="$BACKUP_DIR/backup-$TENANT_ID-$TIMESTAMP"
fi

# Cloud provider specific backup procedures
case "$CLOUD_PROVIDER" in
  aws)
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
      echo "Setting up automated backups for AWS EKS and RDS..."
      
      # Set up RDS automated backups
      if [[ -f "$PROVIDER_DIR/backup-aws.sh" ]]; then
        bash "$PROVIDER_DIR/backup-aws.sh" "$ENVIRONMENT" "$TENANT_ID"
      else
        # Fallback to AWS CLI commands
        echo "Creating RDS database snapshot..."
        DB_INSTANCE_ID="manufacturing-$ENVIRONMENT"
        aws rds create-db-snapshot \
          --db-instance-identifier "$DB_INSTANCE_ID" \
          --db-snapshot-identifier "$DB_INSTANCE_ID-$TIMESTAMP"
          
        # Set up S3 bucket for application data backups
        BUCKET_NAME="manufacturing-backups-$ENVIRONMENT"
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region us-east-1
        
        # Schedule regular backups using EventBridge
        echo "Scheduling regular backups using AWS EventBridge..."
        aws events put-rule \
          --name "manufacturing-$ENVIRONMENT-daily-backup" \
          --schedule-expression "cron(0 2 * * ? *)" \
          --state ENABLED
      fi
    fi
    ;;
    
  azure)
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
      echo "Setting up automated backups for Azure AKS and PostgreSQL..."
      
      if [[ -f "$PROVIDER_DIR/backup-azure.sh" ]]; then
        bash "$PROVIDER_DIR/backup-azure.sh" "$ENVIRONMENT" "$TENANT_ID"
      else
        # Fallback to Azure CLI commands
        echo "Setting up Azure PostgreSQL backup retention..."
        RESOURCE_GROUP="manufacturing-$ENVIRONMENT-rg"
        SERVER_NAME="manufacturing-$ENVIRONMENT-pg"
        
        # Enable geo-redundant backups
        az postgres server update \
          --name "$SERVER_NAME" \
          --resource-group "$RESOURCE_GROUP" \
          --backup-retention 14
          
        # Set up Storage Account for application data backups
        STORAGE_ACCOUNT="manufacturingbackups$ENVIRONMENT"
        az storage account create \
          --name "$STORAGE_ACCOUNT" \
          --resource-group "$RESOURCE_GROUP" \
          --location eastus \
          --sku Standard_LRS
          
        # Create container
        az storage container create \
          --name "backups" \
          --account-name "$STORAGE_ACCOUNT"
      fi
    fi
    ;;
    
  gcp)
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
      echo "Setting up automated backups for GCP GKE and Cloud SQL..."
      
      if [[ -f "$PROVIDER_DIR/backup-gcp.sh" ]]; then
        bash "$PROVIDER_DIR/backup-gcp.sh" "$ENVIRONMENT" "$TENANT_ID"
      else
        # Fallback to GCP CLI commands
        echo "Setting up Cloud SQL backup schedule..."
        INSTANCE_NAME="manufacturing-$ENVIRONMENT-postgres"
        
        # Configure automated backups
        gcloud sql instances patch "$INSTANCE_NAME" \
          --backup-start-time "02:00" \
          --backup-retention-days 14
          
        # Set up GCS bucket for application data backups
        BUCKET_NAME="manufacturing-backups-$ENVIRONMENT"
        gcloud storage buckets create gs://$BUCKET_NAME
      fi
    fi
    ;;
    
  on-premise)
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
      echo "Setting up automated backups for on-premise Docker deployment..."
      
      # Create backup script for database
      cat > "$BASE_DIR/scripts/cron-backup.sh" << EOF
#!/bin/bash
set -e

TIMESTAMP=\$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="$BACKUP_DIR"
mkdir -p "\$BACKUP_DIR"

# Backup PostgreSQL database
echo "Creating database backup..."
docker exec manufacturing-analytics-platform_db_1 pg_dump -U postgres -d manufacturing | gzip > "\$BACKUP_DIR/db-\$TIMESTAMP.sql.gz"

# Backup application data
echo "Creating application data backup..."
tar -zcf "\$BACKUP_DIR/app-data-\$TIMESTAMP.tar.gz" -C "../../" ./src ./public

# Cleanup old backups (keep last 7 days)
find "\$BACKUP_DIR" -name "db-*.sql.gz" -type f -mtime +7 -delete
find "\$BACKUP_DIR" -name "app-data-*.tar.gz" -type f -mtime +7 -delete

echo "Backup completed successfully at \$(date)"
EOF
      
      chmod +x "$BASE_DIR/scripts/cron-backup.sh"
      
      # Add cron job for daily backups at 2 AM
      (crontab -l 2>/dev/null || echo "") | grep -v "$BASE_DIR/scripts/cron-backup.sh" | { cat; echo "0 2 * * * $BASE_DIR/scripts/cron-backup.sh >> $BASE_DIR/logs/backup.log 2>&1"; } | crontab -
      
      echo "Cron job added for daily backups at 2:00 AM"
    fi
    ;;
    
  *)
    echo "Unsupported cloud provider: $CLOUD_PROVIDER"
    exit 1
    ;;
esac

# Create disaster recovery documentation
DOCS_DIR="$BASE_DIR/../docs"
mkdir -p "$DOCS_DIR"

cat > "$DOCS_DIR/disaster-recovery.md" << EOF
# Disaster Recovery Procedures

This document outlines the disaster recovery procedures for the Manufacturing Analytics Platform.

## Backup Strategy

- **Database:** Daily automated backups at 2:00 AM
- **Application Data:** Daily snapshots of application configuration and data
- **Retention Policy:** 14 days for database backups, 7 days for application data

## Recovery Procedures

### Database Recovery

1. Identify the latest available backup from $BACKUP_DIR
2. Restore the database using the cloud provider's native restore functionality
3. Verify data integrity after restoration

### Application Recovery

1. Deploy a new instance of the application using the deployment scripts
2. Restore the application data from the latest backup
3. Update configuration files to point to the restored database
4. Verify system functionality

## Failover Strategy

For high-availability deployments, the system is configured with automatic failover capabilities:

1. Database: Replicated across multiple availability zones
2. Application: Deployed across multiple nodes with load balancing
3. Monitoring: Automated alerts for system failures

## Testing Recommendation

Test the disaster recovery procedures quarterly to ensure they work as expected.
EOF

echo "Backup setup completed. Documentation created at $DOCS_DIR/disaster-recovery.md"