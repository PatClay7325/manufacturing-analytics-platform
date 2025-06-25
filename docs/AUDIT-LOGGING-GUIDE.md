# Audit Logging System Guide

## Overview

The Manufacturing Analytics Platform includes a comprehensive audit logging system that tracks all significant user actions, system events, and data access for security, compliance, and monitoring purposes.

## Features

### Core Capabilities
- **Comprehensive Event Tracking**: Logs all CRUD operations, authentication events, permission changes, and system activities
- **Real-time Streaming**: Supports real-time audit log streaming for monitoring dashboards
- **Advanced Search**: Powerful filtering and search capabilities across all audit dimensions
- **Performance Metrics**: Captures response times, query durations, and operation performance
- **Compliance Support**: Built-in support for GDPR, HIPAA, SOX, and other compliance frameworks
- **Export & Reporting**: Generate compliance reports in JSON or CSV formats
- **Analytics Dashboard**: Visualize audit patterns, detect anomalies, and identify trends

### Security Features
- **Tamper-proof Storage**: Audit logs are immutable once written
- **Data Sanitization**: Automatic redaction of sensitive information (passwords, tokens, etc.)
- **IP Tracking**: Records client IP addresses and geolocation data
- **Session Correlation**: Links related events through session and correlation IDs
- **Suspicious Activity Detection**: Flags unusual patterns for security review

## Architecture

### Database Schema

The audit logging system uses a dedicated `AuditLog` table with comprehensive fields:

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  
  // Event Information
  eventType      String   // login, logout, create, read, update, delete, etc.
  eventCategory  String   // auth, dashboard, alert, user, team, datasource, etc.
  eventAction    String   // Specific action (e.g., "dashboard.create")
  eventStatus    String   // success, failure, error, warning
  eventSeverity  String   // info, warning, error, critical
  
  // Resource Information
  resourceType   String?  // Type of resource affected
  resourceId     String?  // ID of the resource
  resourceName   String?  // Human-readable name
  previousValue  Json?    // Previous state (for updates)
  newValue       Json?    // New state (for updates/creates)
  
  // User and Session Information
  userId         String?  // User who performed the action
  userName       String?  // Cached username
  userEmail      String?  // Cached email
  userRole       String?  // User's role at time of action
  sessionId      String?  // Session identifier
  apiKeyId       String?  // If action was performed via API key
  
  // Request Information
  requestId      String?  // Unique request identifier
  requestMethod  String?  // HTTP method
  requestPath    String?  // API endpoint or page path
  requestQuery   Json?    // Query parameters
  requestBody    Json?    // Request body (sanitized)
  
  // Performance Metrics
  responseTime   Int?     // Response time in milliseconds
  queryDuration  Int?     // Database query duration
  totalDuration  Int?     // Total operation duration
  
  // Additional fields...
}
```

## Usage

### Server-Side Logging

#### 1. Using the Audit Service

```typescript
import { auditService } from '@/services/auditService';

// Log a successful login
await auditService.logAuth(
  'login',
  'success',
  {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    sessionId: sessionId,
    requestId: requestId
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    ip: request.ip,
    userAgent: request.headers['user-agent']
  },
  {
    loginMethod: 'password',
    remember: true
  }
);

// Log data modification
await auditService.logDataModification(
  {
    type: 'dashboard',
    id: dashboardId,
    name: dashboardName,
    previousValue: oldDashboard,
    newValue: newDashboard
  },
  'update',
  'success',
  auditContext,
  requestContext
);

// Log permission change
await auditService.logPermissionChange(
  {
    type: 'dashboard',
    id: dashboardId,
    name: dashboardName
  },
  'permission_grant',
  auditContext,
  {
    targetUserId: targetUser.id,
    permissions: ['read', 'write']
  }
);
```

#### 2. Using Audit Middleware

The middleware automatically logs all API requests:

```typescript
// Automatically logged by middleware:
// - Authentication attempts
// - API access with performance metrics
// - Permission denials
// - Request/response details
```

#### 3. Using Helper Functions

```typescript
import { 
  auditDashboardOperation,
  auditAlertOperation,
  auditDataSourceOperation 
} from '@/lib/middleware/auditExamples';

// Log dashboard creation
await auditDashboardOperation(
  'create',
  dashboard.id,
  dashboard.name,
  auditContext,
  requestContext,
  { new: dashboard }
);

// Log alert update
await auditAlertOperation(
  'update',
  alert.id,
  alert.name,
  auditContext,
  { changes: ['threshold', 'conditions'] }
);
```

### Client-Side Logging

#### Using the useAuditLog Hook

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function DashboardComponent() {
  const { logAction, logPageView, logInteraction, logDataExport } = useAuditLog();

  // Log page view
  useEffect(() => {
    logPageView('Dashboard Editor', { dashboardId });
  }, []);

  // Log user interaction
  const handleButtonClick = () => {
    logInteraction('Save Button', 'click', { dashboardId });
  };

  // Log data export
  const handleExport = async () => {
    const data = await exportDashboard();
    logDataExport('dashboard', 'json', data.length);
  };
}
```

## API Endpoints

### Search Audit Logs
```
GET /api/audit-logs
```

Query parameters:
- `eventTypes`: Comma-separated event types
- `eventCategories`: Comma-separated categories
- `eventStatuses`: Comma-separated statuses
- `eventSeverities`: Comma-separated severities
- `userId`: Filter by user ID
- `resourceType`: Filter by resource type
- `resourceId`: Filter by resource ID
- `startDate`: ISO date string
- `endDate`: ISO date string
- `searchTerm`: Search across multiple fields
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50, max: 100)
- `sortBy`: Sort field
- `sortOrder`: 'asc' or 'desc'

### Get Audit Log Details
```
GET /api/audit-logs/:id
```

### Export Audit Logs
```
POST /api/audit-logs/export
```

Request body:
```json
{
  "format": "csv",
  "eventTypes": ["login", "logout"],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

### Get Analytics
```
GET /api/audit-logs/analytics
```

Query parameters:
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)
- `groupBy`: 'hour', 'day', 'week', or 'month'

### Purge Old Logs
```
DELETE /api/audit-logs
```

Request body:
```json
{
  "olderThan": "2023-01-01T00:00:00Z",
  "dryRun": true
}
```

## UI Components

### AuditLogViewer
Main component for viewing and searching audit logs:

```tsx
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';

<AuditLogViewer className="mt-4" />
```

Features:
- Real-time updates
- Advanced filtering
- Export functionality
- Pagination
- Detail view navigation

### AuditLogAnalytics
Analytics dashboard for audit data:

```tsx
import { AuditLogAnalytics } from '@/components/audit/AuditLogAnalytics';

<AuditLogAnalytics />
```

Displays:
- Event timeline
- Category breakdown
- Top users
- Performance metrics
- Error rates
- Suspicious activity patterns

## Retention and Compliance

### Retention Policies
- Default retention: 2 years
- Configurable per event type
- Automatic purging of old logs
- Archive to cold storage option

### Compliance Features
- GDPR: User data export and deletion
- HIPAA: PHI access tracking
- SOX: Financial data audit trail
- PCI DSS: Payment data access logs

### Data Privacy
- Automatic PII redaction
- Configurable data classification
- Role-based access to audit logs
- Encryption at rest and in transit

## Best Practices

1. **Log Meaningful Events**: Focus on security-relevant and compliance-required events
2. **Include Context**: Always provide user context and request details
3. **Use Correlation IDs**: Link related events for better analysis
4. **Monitor Performance**: Track operation durations to identify bottlenecks
5. **Regular Reviews**: Schedule periodic audit log reviews
6. **Set Up Alerts**: Configure alerts for suspicious activities
7. **Test Compliance**: Regularly verify compliance requirements are met

## Troubleshooting

### Common Issues

1. **Missing Audit Logs**
   - Check if audit logging is enabled (`ENABLE_AUDIT_LOGGING`)
   - Verify user has required permissions
   - Check middleware is properly configured

2. **Performance Impact**
   - Adjust batch size (`AUDIT_LOG_BATCH_SIZE`)
   - Increase flush interval (`AUDIT_LOG_FLUSH_INTERVAL`)
   - Enable database indexing

3. **Storage Growth**
   - Implement retention policies
   - Archive old logs to cold storage
   - Compress exported logs

## Security Considerations

1. **Access Control**: Only admins and managers can view audit logs
2. **Immutability**: Audit logs cannot be modified or deleted manually
3. **Encryption**: All audit data is encrypted in transit and at rest
4. **Monitoring**: Set up alerts for unusual access patterns
5. **Regular Audits**: Perform periodic security audits of the audit system itself