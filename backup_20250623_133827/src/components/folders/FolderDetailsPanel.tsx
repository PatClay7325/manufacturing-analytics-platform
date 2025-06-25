'use client';

import React from 'react';
import { DashboardFolder } from '@/types/folder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  Folder, 
  FileText, 
  AlertCircle, 
  BarChart3,
  Lock,
  Globe,
  Users,
  Edit,
  Shield,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface FolderDetailsPanelProps {
  folder: DashboardFolder;
  onEdit?: () => void;
  onManagePermissions?: () => void;
}

export function FolderDetailsPanel({
  folder,
  onEdit,
  onManagePermissions
}: FolderDetailsPanelProps) {
  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'private':
        return <Lock className="h-4 w-4" />;
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'private':
        return 'Private - Only you can access';
      case 'public':
        return 'Public - Everyone can access';
      case 'team':
        return 'Team - Your team members can access';
      default:
        return permission;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {folder.icon ? (
            <span className="text-3xl">{folder.icon}</span>
          ) : (
            <Folder className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-2xl font-semibold">{folder.name}</h2>
            {folder.description && (
              <p className="text-muted-foreground mt-1">{folder.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {onManagePermissions && (
            <Button variant="outline" size="sm" onClick={onManagePermissions}>
              <Shield className="mr-2 h-4 w-4" />
              Permissions
            </Button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {folder.isSystem && (
          <Badge variant="secondary">
            System Folder
          </Badge>
        )}
        {folder.isDefault && (
          <Badge variant="secondary">
            Default Folder
          </Badge>
        )}
        <Badge variant="outline" className="flex items-center gap-1">
          {getPermissionIcon(folder.permission)}
          {folder.permission}
        </Badge>
        {folder.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            <Tag className="mr-1 h-3 w-3" />
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dashboards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folder.dashboardCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folder.alertRuleCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Library Panels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folder.libraryPanelCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility */}
          <div className="flex items-start gap-3">
            {getPermissionIcon(folder.permission)}
            <div className="flex-1">
              <div className="font-medium">Visibility</div>
              <div className="text-sm text-muted-foreground">
                {getPermissionLabel(folder.permission)}
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Created</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(folder.createdAt), 'PPP')} ({formatDistanceToNow(new Date(folder.createdAt), { addSuffix: true })})
              </div>
              {folder.creator && (
                <div className="text-sm text-muted-foreground mt-1">
                  by {folder.creator.name || folder.creator.email}
                </div>
              )}
            </div>
          </div>

          {/* Updated */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Last Updated</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(folder.updatedAt), 'PPP')} ({formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })})
              </div>
              {folder.updater && (
                <div className="text-sm text-muted-foreground mt-1">
                  by {folder.updater.name || folder.updater.email}
                </div>
              )}
            </div>
          </div>

          {/* Path */}
          {folder.path && (
            <div className="flex items-start gap-3">
              <Folder className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Path</div>
                <div className="text-sm text-muted-foreground font-mono">
                  {folder.path}
                </div>
              </div>
            </div>
          )}

          {/* Depth */}
          <div className="flex items-start gap-3">
            <BarChart3 className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Hierarchy Level</div>
              <div className="text-sm text-muted-foreground">
                Level {folder.depth}
              </div>
            </div>
          </div>

          {/* ID */}
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Folder ID</div>
              <div className="text-sm text-muted-foreground font-mono">
                {folder.uid}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {folder.config && Object.keys(folder.config).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Default settings for dashboards in this folder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(folder.config, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}