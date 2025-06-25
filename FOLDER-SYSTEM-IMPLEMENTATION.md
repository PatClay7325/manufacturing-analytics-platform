# Dashboard Folder System Implementation

This document describes the comprehensive dashboard folder organization system that has been implemented to match manufacturingPlatform's folder functionality.

## Overview

The folder system provides a hierarchical organization structure for dashboards with unlimited nesting depth, granular permissions, and advanced features like drag-and-drop reorganization, folder templates, and bulk operations.

## Key Features

### 1. Folder Hierarchy System
- **Unlimited nested folder structure** with materialized path optimization
- **Folder CRUD operations** (create, read, update, delete)
- **Drag-and-drop reorganization** with visual feedback
- **Breadcrumb navigation** for easy traversal
- **Folder path tracking** for efficient queries

### 2. Dashboard Organization
- **Move dashboards between folders** with permission checks
- **Folder-based dashboard filtering** and search
- **Dashboard search within folders** with full-text support
- **Bulk operations** on folder contents
- **Folder templates** for standardized structures

### 3. Database Schema
The system includes comprehensive database models:
- `DashboardFolder` - Main folder model with hierarchy support
- `FolderPermission` - Granular access control
- `FolderTemplate` - Reusable folder structures
- `FolderShare` - External sharing capabilities
- `FolderActivity` - Audit trail for all actions
- `FolderAnalytics` - Usage tracking and insights
- `FolderSubscription` - Notification preferences
- `DashboardImportExport` - Bulk operations

### 4. UI Components

#### FolderTreeView
- Hierarchical tree display with expand/collapse
- Drag-and-drop support for reorganization
- Context menu for folder actions
- Search and filtering capabilities
- Visual indicators for permissions and system folders

#### FolderManager
- Complete folder management interface
- Split view with tree navigation and details
- Tab-based organization for different views
- Integrated dialogs for all operations

#### FolderPicker
- Dropdown selector for choosing folders
- Hierarchical display with icons
- Support for root selection
- Real-time loading from API

#### FolderBreadcrumbs
- Path navigation with clickable segments
- Icon support for visual recognition
- Home navigation option

### 5. API Routes

- `GET /api/folders` - Search and list folders
- `POST /api/folders` - Create new folder
- `GET /api/folders/tree` - Get hierarchical tree structure
- `GET /api/folders/[id]` - Get single folder details
- `PATCH /api/folders/[id]` - Update folder
- `DELETE /api/folders/[id]` - Delete folder
- `GET /api/folders/[id]/path` - Get folder breadcrumbs
- `POST /api/folders/[id]/move` - Move folder
- `POST /api/folders/[id]/copy` - Copy folder
- `POST /api/folders/[id]/share` - Create share link
- `POST /api/folders/[id]/permissions` - Update permissions

### 6. Advanced Features

#### Permission System
- Private, team, and public visibility levels
- Granular permissions (view, edit, delete, share, manage)
- Permission inheritance from parent folders
- Role-based access control
- Team-based permissions

#### Folder Templates
- Create reusable folder structures
- Default permissions and settings
- Dashboard defaults per folder
- Template marketplace concept

#### Analytics & Insights
- View count tracking
- Unique viewer metrics
- Dashboard/alert/panel counts
- Average load time tracking
- Usage patterns analysis

#### Bulk Operations
- Move multiple folders
- Delete with contents
- Update permissions in bulk
- Add/remove tags
- Export folder structures

## Implementation Details

### Database Optimizations
- Materialized path for efficient hierarchy queries
- Materialized view for folder tree (`folder_hierarchy_view`)
- Database functions for permission checks
- Triggers for automatic path updates
- Optimized indexes for common queries

### Security Features
- Permission checks at every level
- Audit trail for all actions
- System folder protection
- Secure sharing with expiry
- Password-protected shares

### Performance Considerations
- Lazy loading for large trees
- Virtual scrolling for long lists
- Caching of folder structures
- Optimized path queries
- Batch operations support

## Usage Examples

### Basic Folder Creation
```typescript
const folderService = new FolderService(userId);
const folder = await folderService.createFolder({
  name: 'Production Dashboards',
  description: 'All production-related dashboards',
  permission: 'team',
  icon: '🏭',
  tags: ['production', 'manufacturing']
});
```

### Moving Folders
```typescript
await folderService.moveFolder({
  folderId: 'folder-123',
  targetParentId: 'parent-456',
  position: 2
});
```

### Bulk Operations
```typescript
const result = await folderService.performBulkOperation({
  operation: 'update_permissions',
  folderIds: ['folder-1', 'folder-2', 'folder-3'],
  permissions: [{
    userId: 'user-123',
    role: 'editor',
    canView: true,
    canEdit: true
  }]
});
```

## Demo Pages

1. **Folder Management** - `/dashboards/folders`
   - Full folder management interface
   - Create, edit, delete, move operations
   - Permission management

2. **Interactive Demo** - `/dashboards/folder-demo`
   - Interactive demonstration of all features
   - Mock data for testing
   - Component showcase

## Migration Notes

To apply the folder system to an existing database:

1. Run the migration:
   ```bash
   npx prisma migrate dev --name add_folder_hierarchy
   ```

2. Create default folders:
   ```sql
   INSERT INTO "DashboardFolder" (id, uid, name, permission, path, depth)
   VALUES 
     ('default-1', 'general', 'General', 'public', '/default-1', 0),
     ('default-2', 'production', 'Production', 'team', '/default-2', 0),
     ('default-3', 'maintenance', 'Maintenance', 'team', '/default-3', 0);
   ```

3. Update existing dashboards to use folders:
   ```sql
   UPDATE "Dashboard" 
   SET "folderId" = 'default-1' 
   WHERE "folderId" IS NULL;
   ```

## Future Enhancements

1. **Folder Sync** - Sync folders across environments
2. **Folder Marketplace** - Share folder templates
3. **AI Organization** - Auto-organize dashboards
4. **Advanced Search** - Full-text search with filters
5. **Folder Insights** - ML-based usage insights
6. **Mobile Support** - Touch-friendly interfaces
7. **Folder Backup** - Automated backup/restore
8. **API Extensions** - GraphQL support

## Best Practices

1. **Organize by Domain** - Group dashboards by business domain
2. **Use Templates** - Create templates for common structures
3. **Set Permissions Early** - Configure permissions at creation
4. **Regular Cleanup** - Archive unused folders
5. **Meaningful Names** - Use descriptive folder names
6. **Tag Consistently** - Develop a tagging taxonomy
7. **Monitor Usage** - Review analytics regularly

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check user permissions on parent folder
   - Verify team membership for team folders
   - Check inherited permissions

2. **Cannot Move Folder**
   - Ensure not moving to descendant
   - Check permissions on target
   - Verify no circular references

3. **Slow Tree Loading**
   - Check materialized view refresh
   - Verify database indexes
   - Consider pagination for large trees

## Conclusion

The dashboard folder system provides a robust, scalable solution for organizing dashboards with enterprise-grade features. It matches and extends manufacturingPlatform's folder functionality while maintaining performance and security.