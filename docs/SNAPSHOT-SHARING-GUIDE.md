# Dashboard Snapshots and Public Sharing Guide

This guide explains how to use the complete Dashboard Snapshots and Public Sharing system that matches manufacturingPlatform's functionality.

## Overview

The system provides:
- **Snapshot Management**: Create, view, and manage dashboard snapshots
- **Public Sharing**: Generate public URLs with customizable access controls
- **Security**: Password protection and expiration dates for shared content
- **Export Options**: PDF, PNG, and CSV export capabilities

## Components

### 1. ShareModal Component
The main sharing interface that provides multiple sharing options.

```tsx
import { ShareModal } from '@/components/dashboard';

// Usage in dashboard toolbar
<ShareModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  dashboardId={dashboard.id}
  dashboardTitle={dashboard.title}
  currentUrl={window.location.href}
  onShare={(shareConfig) => {
    // Handle share configuration
  }}
/>
```

### 2. SnapshotManager Component
Browse and manage all dashboard snapshots.

```tsx
import { SnapshotManager } from '@/components/dashboard';

// Standalone page or embedded component
<SnapshotManager 
  dashboardId={dashboardId} // Optional: filter by dashboard
  onSelectSnapshot={(snapshot) => {
    // Handle snapshot selection
  }}
/>
```

### 3. PublicDashboardViewer Component
Read-only viewer for public dashboard shares.

```tsx
import { PublicDashboardViewer } from '@/components/dashboard';

// Public share page
<PublicDashboardViewer shareKey={shareKey} />
```

### 4. SnapshotDialog Component
Create new snapshots with options.

```tsx
import { SnapshotDialog } from '@/components/dashboard';

<SnapshotDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  dashboardId={dashboardId}
  dashboardTitle={dashboardTitle}
  onSnapshot={(config) => {
    // Handle snapshot creation
  }}
/>
```

## API Endpoints

### Snapshot Management

**Create Snapshot**
```bash
POST /api/dashboards/{id}/snapshot
{
  "title": "Snapshot Title",
  "description": "Optional description",
  "config": {...}, // Dashboard configuration
  "data": {...},   // Optional data snapshot
  "isPublic": true,
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**List Snapshots**
```bash
GET /api/dashboards/snapshots?page=1&limit=12&search=&filter=all&sort=created
```

**Get Snapshot**
```bash
GET /api/dashboards/snapshots/{id}
```

**Update Snapshot**
```bash
PUT /api/dashboards/snapshots/{id}
{
  "title": "Updated Title",
  "isPublic": false
}
```

**Delete Snapshot**
```bash
DELETE /api/dashboards/snapshots/{id}
```

### Public Sharing

**Create Share Link**
```bash
POST /api/dashboards/{id}/share
{
  "title": "Share Title",
  "snapshotId": "optional-snapshot-id",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxViews": 1000,
  "allowExport": true,
  "allowPrint": true,
  "allowEmbed": false,
  "showTimeRange": true,
  "showVariables": true,
  "showRefresh": false,
  "lockedTimeFrom": "2024-01-01T00:00:00Z",
  "lockedTimeTo": "2024-12-31T23:59:59Z",
  "lockedVariables": {
    "var1": "value1"
  },
  "theme": "light"
}
```

**Access Public Share**
```bash
GET /api/public/share/{shareKey}
Headers:
  X-Share-Password: "password" # If password protected
```

**Track View**
```bash
POST /api/public/share/{shareKey}/view
```

**Export Public Share**
```bash
POST /api/public/share/{shareKey}/export
{
  "format": "pdf" // or "png", "csv"
}
```

## Database Schema

### DashboardSnapshot Model
```prisma
model DashboardSnapshot {
  id          String   @id @default(cuid())
  dashboardId String
  title       String
  description String?
  config      Json     // Dashboard configuration
  data        Json?    // Optional data snapshot
  imageUrl    String?  // Generated image URL
  userId      String
  isPublic    Boolean  @default(false)
  expiresAt   DateTime?
  viewCount   Int      @default(0)
  lastViewedAt DateTime?
  password    String?  // Hashed password
  shareKey    String?  @unique
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### PublicShare Model
```prisma
model PublicShare {
  id              String   @id @default(cuid())
  snapshotId      String?
  dashboardId     String
  shareKey        String   @unique
  title           String
  createdBy       String
  
  // Access Control
  isActive        Boolean  @default(true)
  password        String?
  expiresAt       DateTime?
  maxViews        Int?
  
  // Permissions
  allowExport     Boolean  @default(false)
  allowPrint      Boolean  @default(true)
  allowEmbed      Boolean  @default(false)
  showTimeRange   Boolean  @default(true)
  showVariables   Boolean  @default(true)
  showRefresh     Boolean  @default(false)
  
  // Usage Tracking
  viewCount       Int      @default(0)
  lastViewedAt    DateTime?
  lastViewedBy    String?
  viewHistory     Json?
  
  // Time/Variable Locks
  lockedTimeFrom  DateTime?
  lockedTimeTo    DateTime?
  lockedVariables Json?
  
  // Customization
  theme           String?  @default("light")
  metadata        Json?
}
```

## Usage Examples

### Creating a Snapshot
```typescript
const createSnapshot = async () => {
  const response = await fetch(`/api/dashboards/${dashboardId}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Production Dashboard - January 2024',
      description: 'Monthly production metrics snapshot',
      includeData: true,
      isPublic: true,
      password: 'secure123',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    })
  });
  
  const { snapshot } = await response.json();
  console.log('Snapshot created:', snapshot);
  
  // Share URL
  if (snapshot.shareKey) {
    const shareUrl = `${window.location.origin}/public/dashboard/${snapshot.shareKey}`;
    console.log('Share URL:', shareUrl);
  }
};
```

### Creating a Public Share
```typescript
const createPublicShare = async () => {
  const response = await fetch(`/api/dashboards/${dashboardId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Q1 2024 Production Report',
      allowExport: true,
      allowPrint: true,
      showTimeRange: false,
      showVariables: false,
      lockedTimeFrom: '2024-01-01T00:00:00Z',
      lockedTimeTo: '2024-03-31T23:59:59Z',
      theme: 'light',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    })
  });
  
  const { publicShare, shareUrl } = await response.json();
  console.log('Public share created:', shareUrl);
};
```

### Accessing a Public Share
```typescript
// In a React component
const PublicDashboard = ({ shareKey }) => {
  const [shareData, setShareData] = useState(null);
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  
  const loadShare = async (withPassword) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (withPassword) {
      headers['X-Share-Password'] = withPassword;
    }
    
    const response = await fetch(`/api/public/share/${shareKey}`, {
      headers
    });
    
    if (response.status === 401) {
      const data = await response.json();
      if (data.requiresPassword) {
        setRequiresPassword(true);
        return;
      }
    }
    
    const data = await response.json();
    setShareData(data);
    
    // Track view
    await fetch(`/api/public/share/${shareKey}/view`, {
      method: 'POST'
    });
  };
  
  // Render UI...
};
```

## Security Considerations

1. **Password Protection**: Passwords are hashed using bcrypt before storage
2. **Share Keys**: Generated using nanoid for secure random keys
3. **Access Control**: Each share has granular permissions
4. **Expiration**: Automatic expiration handling
5. **View Limits**: Optional maximum view count
6. **IP Tracking**: Track viewer IPs for security auditing

## Best Practices

1. **Snapshot Naming**: Use descriptive names with dates
2. **Expiration Dates**: Always set expiration for public shares
3. **Password Protection**: Use for sensitive dashboards
4. **Export Permissions**: Limit export access for confidential data
5. **Time Locking**: Lock time ranges for reports
6. **Variable Locking**: Fix variables for consistent views

## Migration from Existing System

If migrating from an existing system:

```bash
# Run migration to add new fields
npx prisma migrate dev --name add_public_shares

# Generate Prisma client
npx prisma generate
```

## Troubleshooting

### Common Issues

1. **Share link not working**: Check if share is active and not expired
2. **Password not accepted**: Ensure correct password and no extra spaces
3. **Export failing**: Verify export permissions are enabled
4. **View count not updating**: Check if tracking endpoint is called
5. **Snapshot not loading**: Verify dashboard configuration is valid

### Debug Mode

Enable debug logging:
```typescript
// In API routes
console.log('Share access attempt:', {
  shareKey,
  hasPassword: !!password,
  clientIp: request.headers.get('x-forwarded-for')
});
```

## Future Enhancements

- **Scheduled Snapshots**: Automatic snapshot creation
- **Snapshot Comparisons**: Compare multiple snapshots
- **Advanced Export**: Custom PDF layouts and branding
- **Analytics**: Detailed share analytics and reporting
- **Collaboration**: Comments and annotations on shares
- **Webhooks**: Notifications for share events