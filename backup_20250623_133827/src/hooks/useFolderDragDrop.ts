import { useState, useCallback } from 'react';
import { FolderTreeNode } from '@/types/folder';

interface UseFolderDragDropProps {
  onFolderMove?: (folderId: string, targetParentId?: string) => void;
  enabled?: boolean;
}

export function useFolderDragDrop({ onFolderMove, enabled = true }: UseFolderDragDropProps) {
  const [draggedFolder, setDraggedFolder] = useState<FolderTreeNode | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, folder: FolderTreeNode) => {
    if (!enabled) return;
    
    setDraggedFolder(folder);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folder.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, [enabled]);

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    if (!enabled || !draggedFolder) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Don't allow dropping on itself or its children
    if (draggedFolder.id === folderId || isDescendant(draggedFolder, folderId)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    setDragOverFolder(folderId);
  }, [enabled, draggedFolder]);

  const handleDrop = useCallback((e: React.DragEvent, targetFolderId: string) => {
    if (!enabled || !draggedFolder) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Don't allow dropping on itself or its children
    if (draggedFolder.id === targetFolderId || isDescendant(draggedFolder, targetFolderId)) {
      return;
    }
    
    onFolderMove?.(draggedFolder.id, targetFolderId);
    
    setDraggedFolder(null);
    setDragOverFolder(null);
  }, [enabled, draggedFolder, onFolderMove]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (!enabled) return;
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    
    setDraggedFolder(null);
    setDragOverFolder(null);
  }, [enabled]);

  return {
    draggedFolder,
    dragOverFolder,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  };
}

// Helper function to check if a folder is a descendant of another
function isDescendant(parent: FolderTreeNode, childId: string): boolean {
  if (parent.children.some(child => child.id === childId)) {
    return true;
  }
  
  return parent.children.some(child => isDescendant(child, childId));
}