'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FolderTreeNode } from '@/types/folder';

interface FolderPickerProps {
  value?: string;
  onChange?: (folderId: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowRoot?: boolean;
}

export function FolderPicker({
  value,
  onChange,
  placeholder = 'Select a folder',
  className,
  disabled,
  allowRoot = true
}: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<FolderTreeNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (value && folders.length > 0) {
      const folder = findFolderById(folders, value);
      setSelectedFolder(folder);
    }
  }, [value, folders]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/folders/tree');
      if (!response.ok) throw new Error('Failed to load folders');
      
      const data = await response.json();
      setFolders(data.tree);
    } catch (error) {
      console.error('Error loading folders:', error);
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

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelect = (folder: FolderTreeNode | null) => {
    setSelectedFolder(folder);
    onChange?.(folder?.id);
    setOpen(false);
  };

  const renderFolder = (folder: FolderTreeNode, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const hasChildren = folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-muted/50',
            isSelected && 'bg-muted'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleSelect(folder)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(folder.id);
            }}
            className={cn(
              'p-0.5 hover:bg-muted rounded',
              !hasChildren && 'invisible'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {folder.icon ? (
            <span className="text-base">{folder.icon}</span>
          ) : isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}

          <span className="flex-1 text-sm truncate">{folder.name}</span>
          
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('justify-between', className)}
        >
          {selectedFolder ? (
            <div className="flex items-center gap-2 truncate">
              {selectedFolder.icon ? (
                <span>{selectedFolder.icon}</span>
              ) : (
                <Folder className="h-4 w-4" />
              )}
              {selectedFolder.name}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="max-h-80 overflow-y-auto">
          {allowRoot && (
            <div
              className={cn(
                'flex items-center gap-2 p-2 cursor-pointer transition-colors',
                'hover:bg-muted/50',
                !selectedFolder && 'bg-muted'
              )}
              onClick={() => handleSelect(null)}
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Root (No folder)</span>
              {!selectedFolder && <Check className="h-4 w-4 text-primary ml-auto" />}
            </div>
          )}
          
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading folders...
            </div>
          ) : folders.length > 0 ? (
            folders.map((folder) => renderFolder(folder))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No folders available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}