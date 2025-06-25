# Dashboard Audit Logging Implementation

## Overview
This document describes the implementation of audit logging for dashboard view actions in the Manufacturing Analytics Platform. The audit logging captures all dashboard access, modifications, and exports for security, compliance, and monitoring purposes.

## Implementation Details

### 1. Updated API Routes

#### Dashboard View/Update/Delete (`/api/dashboards/[uid]/route.ts`)
- **GET**: Logs successful dashboard views with user context, IP address, and response time
- **PUT**: Logs dashboard updates with before/after values for change tracking
- **DELETE**: Logs dashboard deletions with the deleted dashboard data

Key features:
- Tracks failed access attempts (404 errors)
- Records performance metrics (response time)
- Captures request context (IP, user agent, referer)
- Stores user identity and role information

#### Dashboard List/Create (`/api/dashboards/route.ts`)
- **GET**: Logs dashboard list queries with search parameters
- **POST**: Logs new dashboard creation with minimal data (title, tags)

#### Dashboard Export (`/api/dashboards/[uid]/export/route.ts`)
- Logs dashboard exports with export options (shareExternally, includeVariables)
- Tracks who exported which dashboard and when

### 2. Audit Event Types

The following event types are logged for dashboards:

- `read` - Dashboard view
- `query` - Dashboard list query
- `create` - Dashboard creation
- `update` - Dashboard modification
- `delete` - Dashboard deletion
- `export` - Dashboard export

### 3. Security Context

Each audit log entry includes:
- User ID, email, and role
- Site ID (for multi-tenant scenarios)
- IP address (from x-forwarded-for or x-real-ip headers)
- User agent string
- Request method and path
- Timestamp

### 4. Performance Tracking

The implementation tracks:
- Response time for each operation
- Query duration (where applicable)
- Total operation duration

### 5. Error Handling

- Failed operations are logged with error severity
- Error messages and stack traces (in development) are captured
- System errors are logged separately from user errors

## Benefits

1. **Compliance**: Meets audit trail requirements for regulated industries
2. **Security**: Tracks unauthorized access attempts and suspicious activities
3. **Analytics**: Provides data for usage patterns and performance monitoring
4. **Troubleshooting**: Helps diagnose issues with detailed error logs
5. **Accountability**: Creates a complete record of who did what and when

## Usage Examples

### Viewing Audit Logs

```typescript
// Search for all dashboard views by a specific user
const logs = await auditService.search({
  eventTypes: ['read'],
  eventCategories: ['dashboard'],
  userId: 'user-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date()
});

// Find all failed dashboard access attempts
const failedAttempts = await auditService.search({
  eventStatuses: ['error', 'failure'],
  eventCategories: ['dashboard']
});

// Export audit logs for compliance
const exportData = await auditService.export({
  format: 'csv',
  filters: {
    eventCategories: ['dashboard'],
    startDate: new Date('2024-01-01')
  }
});
```

### Analytics and Reporting

The audit service provides analytics capabilities:

```typescript
const analytics = await auditService.getAnalytics({
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  groupBy: 'day'
});

// Returns:
// - Event counts by type
// - Category breakdown
// - Top users by activity
// - Performance metrics
// - Error rates
// - Activity timeline
```

## Configuration

Audit logging can be configured via environment variables:

- `ENABLE_AUDIT_LOGGING` - Enable/disable audit logging (default: true)
- `AUDIT_LOG_BATCH_SIZE` - Number of logs to batch before writing (default: 50)
- `AUDIT_LOG_FLUSH_INTERVAL` - Batch flush interval in ms (default: 5000)

## Database Schema

Audit logs are stored in the `AuditLog` table with the following key fields:

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  timestamp       DateTime @default(now())
  eventType       String
  eventCategory   String
  eventAction     String
  eventStatus     String
  eventSeverity   String
  
  // Resource information
  resourceType    String?
  resourceId      String?
  resourceName    String?
  previousValue   Json?
  newValue        Json?
  
  // User information
  userId          String?
  userName        String?
  userEmail       String?
  userRole        String?
  
  // Request context
  ipAddress       String?
  userAgent       String?
  requestMethod   String?
  requestPath     String?
  
  // Performance metrics
  responseTime    Int?
  
  // Relations
  user            User?    @relation(fields: [userId], references: [id])
  
  @@index([timestamp])
  @@index([userId])
  @@index([eventType])
  @@index([resourceId])
}
```

## Next Steps

1. **Add client-side tracking**: Implement client-side logging for dashboard interactions that don't go through API routes
2. **Retention policies**: Implement automated purging of old audit logs
3. **Real-time alerts**: Set up alerts for suspicious activities
4. **Dashboard for audit logs**: Create a dedicated UI for viewing and analyzing audit logs
5. **Export compliance reports**: Implement pre-built compliance report templates

## Testing

To test the audit logging implementation:

1. View a dashboard and check the audit logs:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/dashboards/dashboard-123
   ```

2. Query audit logs:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/audit/logs?eventCategory=dashboard
   ```

3. Export audit logs:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/audit/export?format=csv
   ```