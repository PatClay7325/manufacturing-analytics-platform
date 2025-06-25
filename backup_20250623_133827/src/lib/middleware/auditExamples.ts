/**
 * Examples of using the audit logging system
 * These are helper functions that can be used throughout the application
 */

import { auditService } from '@/services/auditService';
import type { AuditContext, RequestContext } from '@/services/auditService';

/**
 * Example: Log dashboard operations
 */
export async function auditDashboardOperation(
  operation: 'create' | 'update' | 'delete' | 'share' | 'export',
  dashboardId: string,
  dashboardName: string,
  context: AuditContext,
  request?: RequestContext,
  changes?: { previous?: any; new?: any }
) {
  await auditService.logDataModification(
    {
      type: 'dashboard',
      id: dashboardId,
      name: dashboardName,
      previousValue: changes?.previous,
      newValue: changes?.new
    },
    operation,
    'success',
    context,
    request
  );
}

/**
 * Example: Log alert rule changes
 */
export async function auditAlertOperation(
  operation: 'create' | 'update' | 'delete' | 'silence' | 'acknowledge',
  alertId: string,
  alertName: string,
  context: AuditContext,
  metadata?: Record<string, any>
) {
  await auditService.log({
    eventType: operation,
    eventCategory: 'alert',
    eventAction: `alert.${operation}`,
    eventStatus: 'success',
    eventSeverity: operation === 'delete' ? 'warning' : 'info',
    resource: {
      type: 'alert',
      id: alertId,
      name: alertName
    },
    metadata
  }, context);
}

/**
 * Example: Log data source operations
 */
export async function auditDataSourceOperation(
  operation: 'create' | 'update' | 'delete' | 'test_connection',
  dataSourceId: string,
  dataSourceName: string,
  dataSourceType: string,
  context: AuditContext,
  success: boolean,
  error?: string
) {
  await auditService.log({
    eventType: operation === 'test_connection' ? 'read' : operation,
    eventCategory: 'datasource',
    eventAction: `datasource.${operation}`,
    eventStatus: success ? 'success' : 'failure',
    eventSeverity: !success ? 'error' : operation === 'delete' ? 'warning' : 'info',
    resource: {
      type: 'datasource',
      id: dataSourceId,
      name: dataSourceName
    },
    metadata: {
      dataSourceType,
      ...(error && { error })
    }
  }, context);
}

/**
 * Example: Log query operations
 */
export async function auditQueryOperation(
  dataSourceId: string,
  dataSourceName: string,
  query: string,
  context: AuditContext,
  performance: {
    queryDuration: number;
    resultCount?: number;
    cacheHit?: boolean;
  }
) {
  await auditService.logDataAccess(
    {
      type: 'query',
      id: dataSourceId,
      name: dataSourceName
    },
    'query',
    context,
    undefined,
    {
      queryDuration: performance.queryDuration,
      totalDuration: performance.queryDuration
    }
  );
}

/**
 * Example: Log permission changes
 */
export async function auditPermissionChange(
  resourceType: string,
  resourceId: string,
  resourceName: string,
  action: 'grant' | 'revoke',
  targetUserId: string,
  targetUserEmail: string,
  permissions: string[],
  context: AuditContext
) {
  await auditService.logPermissionChange(
    {
      type: resourceType,
      id: resourceId,
      name: resourceName
    },
    action === 'grant' ? 'permission_grant' : 'permission_revoke',
    context,
    {
      targetUserId,
      targetUserEmail,
      permissions
    }
  );
}

/**
 * Example: Log API key operations
 */
export async function auditApiKeyOperation(
  operation: 'create' | 'delete' | 'regenerate',
  apiKeyId: string,
  apiKeyName: string,
  context: AuditContext,
  metadata?: Record<string, any>
) {
  await auditService.log({
    eventType: `api_key_${operation}`,
    eventCategory: 'auth',
    eventAction: `api_key.${operation}`,
    eventStatus: 'success',
    eventSeverity: operation === 'delete' ? 'warning' : 'info',
    resource: {
      type: 'api_key',
      id: apiKeyId,
      name: apiKeyName
    },
    metadata: {
      ...metadata,
      securityRelevant: true
    },
    complianceFlags: ['security', 'access_control']
  }, context);
}

/**
 * Example: Log system configuration changes
 */
export async function auditSystemConfigChange(
  configSection: string,
  configKey: string,
  previousValue: any,
  newValue: any,
  context: AuditContext
) {
  await auditService.log({
    eventType: 'system_config_change',
    eventCategory: 'system',
    eventAction: `system.config.${configSection}.${configKey}`,
    eventStatus: 'success',
    eventSeverity: 'warning',
    resource: {
      type: 'config',
      id: `${configSection}.${configKey}`,
      name: configKey,
      previousValue,
      newValue
    },
    metadata: {
      configSection,
      configKey
    },
    complianceFlags: ['configuration_management']
  }, context);
}

/**
 * Example: Log export operations
 */
export async function auditExportOperation(
  resourceType: string,
  format: string,
  recordCount: number,
  filters: any,
  context: AuditContext
) {
  await auditService.log({
    eventType: 'export',
    eventCategory: resourceType as any,
    eventAction: `${resourceType}.export`,
    eventStatus: 'success',
    eventSeverity: 'info',
    resource: {
      type: resourceType
    },
    metadata: {
      format,
      recordCount,
      filters,
      exportTime: new Date().toISOString()
    },
    dataClassification: 'internal',
    complianceFlags: ['data_export']
  }, context);
}

/**
 * Example: Log suspicious activity
 */
export async function auditSuspiciousActivity(
  activityType: string,
  description: string,
  context: AuditContext,
  request: RequestContext,
  details?: Record<string, any>
) {
  await auditService.log({
    eventType: 'system_warning',
    eventCategory: 'security',
    eventAction: `security.suspicious.${activityType}`,
    eventStatus: 'warning',
    eventSeverity: 'critical',
    request,
    metadata: {
      activityType,
      description,
      ...details
    },
    tags: ['security', 'suspicious', activityType],
    complianceFlags: ['security_monitoring'],
    securityContext: {
      threat_level: 'high',
      require_investigation: true
    }
  }, context);
}

/**
 * Example: Batch audit log for multiple operations
 */
export async function auditBatchOperation(
  operations: Array<{
    type: string;
    id: string;
    action: 'create' | 'update' | 'delete';
    success: boolean;
    error?: string;
  }>,
  context: AuditContext
) {
  const summary = {
    total: operations.length,
    succeeded: operations.filter(op => op.success).length,
    failed: operations.filter(op => !op.success).length
  };

  await auditService.log({
    eventType: 'batch_operation' as any,
    eventCategory: 'system',
    eventAction: 'system.batch_operation',
    eventStatus: summary.failed > 0 ? 'warning' : 'success',
    eventSeverity: summary.failed > 0 ? 'warning' : 'info',
    metadata: {
      summary,
      operations: operations.map(op => ({
        type: op.type,
        id: op.id,
        action: op.action,
        success: op.success,
        ...(op.error && { error: op.error })
      }))
    },
    tags: ['batch', 'bulk_operation']
  }, context);
}