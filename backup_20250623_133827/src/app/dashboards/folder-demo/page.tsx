'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderTreeView, FolderPicker, FolderBreadcrumbs, CreateFolderDialog } from '@/components/folders';
import { Plus, FolderTree, Settings, FileText, Shield } from 'lucide-react';
import { FolderTreeNode, CreateFolderRequest } from '@/types/folder';

// Mock data for demonstration
const mockFolders: FolderTreeNode[] = [
  {
    id: '1',
    uid: 'production-folder',
    name: 'Production Dashboards',
    description: 'All production-related dashboards',
    permission: 'team',
    tags: ['production', 'manufacturing'],
    parentId: null,
    path: '/1',
    depth: 0,
    slug: 'production-dashboards',
    icon: '🏭',
    color: '#3b82f6',
    sortOrder: 0,
    isDefault: true,
    isSystem: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'user-1',
    dashboardCount: 12,
    alertRuleCount: 5,
    libraryPanelCount: 8,
    children: [
      {
        id: '2',
        uid: 'oee-folder',
        name: 'OEE Monitoring',
        description: 'Overall Equipment Effectiveness dashboards',
        permission: 'team',
        tags: ['oee', 'performance'],
        parentId: '1',
        path: '/1/2',
        depth: 1,
        slug: 'oee-monitoring',
        icon: '📊',
        sortOrder: 0,
        isDefault: false,
        isSystem: false,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-20'),
        createdBy: 'user-1',
        dashboardCount: 4,
        alertRuleCount: 2,
        libraryPanelCount: 3,
        children: []
      },
      {
        id: '3',
        uid: 'quality-folder',
        name: 'Quality Control',
        description: 'Quality metrics and control charts',
        permission: 'team',
        tags: ['quality', 'spc'],
        parentId: '1',
        path: '/1/3',
        depth: 1,
        slug: 'quality-control',
        icon: '✅',
        sortOrder: 1,
        isDefault: false,
        isSystem: false,
        createdAt: new Date('2024-01-06'),
        updatedAt: new Date('2024-01-18'),
        createdBy: 'user-1',
        dashboardCount: 6,
        alertRuleCount: 3,
        libraryPanelCount: 4,
        children: []
      }
    ]
  },
  {
    id: '4',
    uid: 'maintenance-folder',
    name: 'Maintenance',
    description: 'Maintenance and reliability dashboards',
    permission: 'private',
    tags: ['maintenance', 'reliability'],
    parentId: null,
    path: '/4',
    depth: 0,
    slug: 'maintenance',
    icon: '🔧',
    color: '#10b981',
    sortOrder: 1,
    isDefault: false,
    isSystem: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16'),
    createdBy: 'user-2',
    dashboardCount: 8,
    alertRuleCount: 7,
    libraryPanelCount: 5,
    children: [
      {
        id: '5',
        uid: 'predictive-folder',
        name: 'Predictive Maintenance',
        description: 'ML-based predictive maintenance dashboards',
        permission: 'private',
        tags: ['predictive', 'ml'],
        parentId: '4',
        path: '/4/5',
        depth: 1,
        slug: 'predictive-maintenance',
        icon: '🤖',
        sortOrder: 0,
        isDefault: false,
        isSystem: false,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-25'),
        createdBy: 'user-2',
        dashboardCount: 3,
        alertRuleCount: 4,
        libraryPanelCount: 2,
        children: []
      }
    ]
  },
  {
    id: '6',
    uid: 'system-folder',
    name: 'System Dashboards',
    description: 'System monitoring and administration',
    permission: 'public',
    tags: ['system', 'admin'],
    parentId: null,
    path: '/6',
    depth: 0,
    slug: 'system-dashboards',
    icon: '⚙️',
    sortOrder: 2,
    isDefault: false,
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    dashboardCount: 2,
    alertRuleCount: 1,
    libraryPanelCount: 0,
    children: []
  }
];

export default function FolderDemoPage() {
  const [selectedFolder, setSelectedFolder] = useState<FolderTreeNode | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '4']));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleFolderSelect = (folder: FolderTreeNode) => {
    setSelectedFolder(folder);
  };

  const handleCreateFolder = (parentId?: string) => {
    console.log('Create folder in parent:', parentId);
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = (data: CreateFolderRequest) => {
    console.log('Create folder:', data);
    setCreateDialogOpen(false);
  };

  const handleEditFolder = (folder: FolderTreeNode) => {
    console.log('Edit folder:', folder);
  };

  const handleDeleteFolder = (folder: FolderTreeNode) => {
    console.log('Delete folder:', folder);
  };

  const handleMoveFolder = (folderId: string, targetParentId?: string) => {
    console.log('Move folder:', folderId, 'to:', targetParentId);
  };

  const handleCopyFolder = (folder: FolderTreeNode) => {
    console.log('Copy folder:', folder);
  };

  const handleShareFolder = (folder: FolderTreeNode) => {
    console.log('Share folder:', folder);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Folders</h1>
          <p className="text-muted-foreground mt-1">
            Organize your dashboards with nested folders and permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </div>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="picker">Folder Picker</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Folder Structure</CardTitle>
                <CardDescription>
                  Drag and drop to reorganize folders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FolderTreeView
                  folders={mockFolders}
                  selectedFolderId={selectedFolder?.id}
                  expandedFolders={expandedFolders}
                  onExpandedChange={setExpandedFolders}
                  onFolderSelect={handleFolderSelect}
                  onFolderCreate={handleCreateFolder}
                  onFolderEdit={handleEditFolder}
                  onFolderDelete={handleDeleteFolder}
                  onFolderMove={handleMoveFolder}
                  onFolderCopy={handleCopyFolder}
                  onFolderShare={handleShareFolder}
                  className="h-[400px]"
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Selected Folder Details</CardTitle>
                {selectedFolder && (
                  <FolderBreadcrumbs
                    folderId={selectedFolder.id}
                    onNavigate={(id) => {
                      if (id) {
                        const folder = findFolderInTree(mockFolders, id);
                        if (folder) setSelectedFolder(folder);
                      } else {
                        setSelectedFolder(null);
                      }
                    }}
                  />
                )}
              </CardHeader>
              <CardContent>
                {selectedFolder ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      {selectedFolder.icon && (
                        <span className="text-3xl">{selectedFolder.icon}</span>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{selectedFolder.name}</h3>
                        {selectedFolder.description && (
                          <p className="text-muted-foreground">{selectedFolder.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedFolder.dashboardCount}</div>
                        <div className="text-sm text-muted-foreground">Dashboards</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedFolder.alertRuleCount}</div>
                        <div className="text-sm text-muted-foreground">Alerts</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedFolder.libraryPanelCount}</div>
                        <div className="text-sm text-muted-foreground">Panels</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Permission: {selectedFolder.permission}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Path: {selectedFolder.path}</span>
                      </div>
                      {selectedFolder.isSystem && (
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">System folder (protected)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a folder to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tree View Component</CardTitle>
              <CardDescription>
                Hierarchical folder structure with expand/collapse functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FolderTreeView
                folders={mockFolders}
                selectedFolderId={selectedFolder?.id}
                onFolderSelect={handleFolderSelect}
                showActions={false}
                className="h-[500px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="picker" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Folder Picker Component</CardTitle>
              <CardDescription>
                Dropdown selector for choosing a folder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select a folder for your dashboard:
                </label>
                <FolderPicker
                  value={selectedFolderId}
                  onChange={setSelectedFolderId}
                  placeholder="Choose a folder..."
                />
              </div>
              {selectedFolderId && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    Selected folder ID: <code className="font-mono">{selectedFolderId}</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Folder Hierarchy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li>Unlimited nested folder depth</li>
                <li>Drag-and-drop reorganization</li>
                <li>Breadcrumb navigation</li>
                <li>Materialized path optimization</li>
                <li>Bulk operations support</li>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions & Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li>Private, team, and public folders</li>
                <li>Granular permission control</li>
                <li>Permission inheritance</li>
                <li>Role-based access control</li>
                <li>Folder sharing with expiry</li>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li>Folder templates</li>
                <li>Default folder settings</li>
                <li>Custom icons and colors</li>
                <li>Tag-based categorization</li>
                <li>Search and filtering</li>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li>Activity tracking and audit logs</li>
                <li>Folder analytics and insights</li>
                <li>Bulk import/export</li>
                <li>API for automation</li>
                <li>Webhook notifications</li>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
      />
    </div>
  );
}

// Helper function to find folder in tree
function findFolderInTree(folders: FolderTreeNode[], id: string): FolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    const found = findFolderInTree(folder.children, id);
    if (found) return found;
  }
  return null;
}