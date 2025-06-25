'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderTreeView } from './FolderTreeView';
import { FolderBreadcrumbs } from './FolderBreadcrumbs';
import { CreateFolderDialog } from './CreateFolderDialog';
import { EditFolderDialog } from './EditFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { MoveFolderDialog } from './MoveFolderDialog';
import { ShareFolderDialog } from './ShareFolderDialog';
import { FolderPermissionsDialog } from './FolderPermissionsDialog';
import { FolderDetailsPanel } from './FolderDetailsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DashboardFolder, 
  FolderTreeNode, 
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderMoveRequest
} from '@/types/folder';
import { Plus, Search, Settings, FolderTree, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface FolderManagerProps {
  className?: string;
  onFolderSelect?: (folder: DashboardFolder) => void;
  selectedFolderId?: string;
  viewMode?: 'tree' | 'grid' | 'list';
  showDetails?: boolean;
}

export function FolderManager({
  className,
  onFolderSelect,
  selectedFolderId: controlledSelectedId,
  viewMode: controlledViewMode = 'tree',
  showDetails = true
}: FolderManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<FolderTreeNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState(controlledViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  
  // Load folders
  useEffect(() => {
    loadFolders();
  }, []);
  
  // Sync selected folder
  useEffect(() => {
    if (controlledSelectedId) {
      const folder = findFolderById(folders, controlledSelectedId);
      if (folder) {
        setSelectedFolder(folder);
      }
    }
  }, [controlledSelectedId, folders]);
  
  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/folders/tree');
      if (!response.ok) throw new Error('Failed to load folders');
      
      const data = await response.json();
      setFolders(data.tree);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load folders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const findFolderById = (nodes: FolderTreeNode[], id: string): FolderTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findFolderById(node.children, id);
      if (found) return found;
    }
    return null;
  };
  
  // Handlers
  const handleFolderSelect = (folder: FolderTreeNode) => {
    setSelectedFolder(folder);
    onFolderSelect?.(folder);
  };
  
  const handleCreateFolder = (parentId?: string) => {
    setCreateParentId(parentId);
    setCreateDialogOpen(true);
  };
  
  const handleCreateSubmit = async (data: CreateFolderRequest) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, parentId: createParentId })
      });
      
      if (!response.ok) throw new Error('Failed to create folder');
      
      toast({
        title: 'Success',
        description: 'Folder created successfully'
      });
      
      await loadFolders();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive'
      });
    }
  };
  
  const handleEditFolder = (folder: FolderTreeNode) => {
    setSelectedFolder(folder);
    setEditDialogOpen(true);
  };
  
  const handleEditSubmit = async (data: UpdateFolderRequest) => {
    if (!selectedFolder) return;
    
    try {
      const response = await fetch(`/api/folders/${selectedFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to update folder');
      
      toast({
        title: 'Success',
        description: 'Folder updated successfully'
      });
      
      await loadFolders();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update folder',
        variant: 'destructive'
      });
    }
  };
  
  const handleDeleteFolder = (folder: FolderTreeNode) => {
    setSelectedFolder(folder);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async (deleteContents: boolean) => {
    if (!selectedFolder) return;
    
    try {
      const response = await fetch(`/api/folders/${selectedFolder.id}?deleteContents=${deleteContents}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete folder');
      
      toast({
        title: 'Success',
        description: 'Folder deleted successfully'
      });
      
      await loadFolders();
      setDeleteDialogOpen(false);
      setSelectedFolder(null);
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive'
      });
    }
  };
  
  const handleMoveFolder = async (folderId: string, targetParentId?: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetParentId })
      });
      
      if (!response.ok) throw new Error('Failed to move folder');
      
      toast({
        title: 'Success',
        description: 'Folder moved successfully'
      });
      
      await loadFolders();
    } catch (error) {
      console.error('Error moving folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to move folder',
        variant: 'destructive'
      });
    }
  };
  
  const handleCopyFolder = async (folder: FolderTreeNode) => {
    try {
      const response = await fetch(`/api/folders/${folder.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newName: `${folder.name} (Copy)`,
          includeDashboards: true,
          includePermissions: false
        })
      });
      
      if (!response.ok) throw new Error('Failed to copy folder');
      
      toast({
        title: 'Success',
        description: 'Folder copied successfully'
      });
      
      await loadFolders();
    } catch (error) {
      console.error('Error copying folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy folder',
        variant: 'destructive'
      });
    }
  };
  
  const handleShareFolder = (folder: FolderTreeNode) => {
    setSelectedFolder(folder);
    setShareDialogOpen(true);
  };
  
  const handleManagePermissions = () => {
    if (!selectedFolder) return;
    setPermissionsDialogOpen(true);
  };
  
  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Folders</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('tree')}
                className={cn(viewMode === 'tree' && 'bg-muted')}
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn(viewMode === 'grid' && 'bg-muted')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn(viewMode === 'list' && 'bg-muted')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Folder Tree/Grid/List */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading folders...</div>
            </div>
          ) : (
            <>
              {viewMode === 'tree' && (
                <FolderTreeView
                  folders={folders}
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
                  className="h-full"
                />
              )}
              {viewMode === 'grid' && (
                <div className="p-4">
                  {/* Grid view implementation */}
                  <div className="text-muted-foreground">Grid view coming soon...</div>
                </div>
              )}
              {viewMode === 'list' && (
                <div className="p-4">
                  {/* List view implementation */}
                  <div className="text-muted-foreground">List view coming soon...</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumbs */}
        {selectedFolder && (
          <div className="border-b">
            <FolderBreadcrumbs
              folderId={selectedFolder.id}
              onNavigate={(folderId) => {
                const folder = findFolderById(folders, folderId);
                if (folder) handleFolderSelect(folder);
              }}
              className="px-4 py-2"
            />
          </div>
        )}
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedFolder ? (
            <Tabs defaultValue="dashboards" className="h-full">
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="dashboards">
                    Dashboards ({selectedFolder.dashboardCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="dashboards" className="h-full p-4">
                {/* Dashboard list for selected folder */}
                <div className="text-muted-foreground">
                  Dashboard list coming soon...
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="h-full p-4">
                {showDetails && (
                  <FolderDetailsPanel
                    folder={selectedFolder}
                    onEdit={() => handleEditFolder(selectedFolder)}
                    onManagePermissions={handleManagePermissions}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="permissions" className="h-full p-4">
                {/* Permissions management */}
                <div className="text-muted-foreground">
                  Permissions management coming soon...
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="h-full p-4">
                {/* Activity log */}
                <div className="text-muted-foreground">
                  Activity log coming soon...
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Select a folder to view its contents
                </p>
                <Button onClick={() => handleCreateFolder()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Folder
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
      />
      
      {selectedFolder && (
        <>
          <EditFolderDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            folder={selectedFolder}
            onSubmit={handleEditSubmit}
          />
          
          <DeleteFolderDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            folder={selectedFolder}
            onConfirm={handleDeleteConfirm}
          />
          
          <ShareFolderDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            folder={selectedFolder}
          />
          
          <FolderPermissionsDialog
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            folder={selectedFolder}
          />
        </>
      )}
    </div>
  );
}