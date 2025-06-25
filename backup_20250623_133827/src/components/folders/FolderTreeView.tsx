'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2, Move, Copy, Share2, Lock, Globe, Users } from 'lucide-react';
import { DashboardFolder, FolderTreeNode } from '@/types/folder';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFolderDragDrop } from '@/hooks/useFolderDragDrop';

interface FolderTreeViewProps {
  folders: FolderTreeNode[];
  selectedFolderId?: string;
  expandedFolders?: Set<string>;
  onFolderSelect?: (folder: FolderTreeNode) => void;
  onFolderCreate?: (parentId?: string) => void;
  onFolderEdit?: (folder: FolderTreeNode) => void;
  onFolderDelete?: (folder: FolderTreeNode) => void;
  onFolderMove?: (folderId: string, targetParentId?: string) => void;
  onFolderCopy?: (folder: FolderTreeNode) => void;
  onFolderShare?: (folder: FolderTreeNode) => void;
  onExpandedChange?: (expandedFolders: Set<string>) => void;
  showActions?: boolean;
  showCounts?: boolean;
  allowDragDrop?: boolean;
  className?: string;
}

export function FolderTreeView({
  folders,
  selectedFolderId,
  expandedFolders: controlledExpanded,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
  onFolderCopy,
  onFolderShare,
  onExpandedChange,
  showActions = true,
  showCounts = true,
  allowDragDrop = true,
  className
}: FolderTreeViewProps) {
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const expandedFolders = controlledExpanded || localExpanded;

  const { draggedFolder, dragOverFolder, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = 
    useFolderDragDrop({
      onFolderMove,
      enabled: allowDragDrop
    });

  const toggleExpanded = useCallback((folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setLocalExpanded(newExpanded);
    }
  }, [expandedFolders, onExpandedChange]);

  const handleEditStart = useCallback((folder: FolderTreeNode) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  }, []);

  const handleEditSave = useCallback((folder: FolderTreeNode) => {
    if (editingName.trim() && editingName !== folder.name) {
      onFolderEdit?.({ ...folder, name: editingName.trim() });
    }
    setEditingFolderId(null);
    setEditingName('');
  }, [editingName, onFolderEdit]);

  const handleEditCancel = useCallback(() => {
    setEditingFolderId(null);
    setEditingName('');
  }, []);

  const filterFolders = useCallback((nodes: FolderTreeNode[], query: string): FolderTreeNode[] => {
    if (!query) return nodes;
    
    return nodes.reduce<FolderTreeNode[]>((acc, node) => {
      const children = filterFolders(node.children, query);
      const matches = node.name.toLowerCase().includes(query.toLowerCase());
      
      if (matches || children.length > 0) {
        acc.push({
          ...node,
          children,
          expanded: true // Auto-expand filtered results
        });
      }
      
      return acc;
    }, []);
  }, []);

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'private':
        return <Lock className="h-3 w-3" />;
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'team':
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const renderFolder = (folder: FolderTreeNode, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isEditing = editingFolderId === folder.id;
    const hasChildren = folder.children.length > 0;
    const isDragOver = dragOverFolder === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={cn(
            'group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-muted/50',
            isSelected && 'bg-muted',
            isDragOver && 'bg-primary/10 border-primary',
            'data-[drag-over]:bg-primary/10'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => !isEditing && onFolderSelect?.(folder)}
          draggable={allowDragDrop && !isEditing}
          onDragStart={(e) => handleDragStart(e, folder)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Expand/Collapse Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(folder.id);
            }}
            className={cn(
              'p-0.5 hover:bg-muted rounded transition-transform',
              !hasChildren && 'invisible'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Folder Icon */}
          <div className="flex items-center">
            {folder.icon ? (
              <span className="text-base">{folder.icon}</span>
            ) : isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Folder Name */}
          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditSave(folder);
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              onBlur={() => handleEditSave(folder)}
              onClick={(e) => e.stopPropagation()}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{folder.name}</span>
          )}

          {/* Permission Icon */}
          {getPermissionIcon(folder.permission)}

          {/* System/Default Badges */}
          {folder.isSystem && (
            <Badge variant="secondary" className="h-5 text-xs">
              System
            </Badge>
          )}
          {folder.isDefault && (
            <Badge variant="secondary" className="h-5 text-xs">
              Default
            </Badge>
          )}

          {/* Counts */}
          {showCounts && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {folder.dashboardCount > 0 && (
                <span>{folder.dashboardCount}</span>
              )}
            </div>
          )}

          {/* Actions */}
          {showActions && !isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderCreate?.(folder.id);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditStart(folder)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFolderCopy?.(folder)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFolderShare?.(folder)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onFolderDelete?.(folder)}
                    className="text-destructive"
                    disabled={folder.isSystem}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredFolders = filterFolders(folders, searchQuery);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Search */}
      <div className="px-2">
        <Input
          placeholder="Search folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
      </div>

      {/* Root Create Button */}
      {showActions && (
        <div className="px-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onFolderCreate?.()}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto">
        {filteredFolders.length > 0 ? (
          filteredFolders.map((folder) => renderFolder(folder))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No folders found' : 'No folders yet'}
          </div>
        )}
      </div>
    </div>
  );
}